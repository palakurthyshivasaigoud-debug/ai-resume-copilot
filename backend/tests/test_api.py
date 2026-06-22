from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest
import os

from backend.main import app
from backend.database.database import Base, get_db
from backend.database import models

from sqlalchemy.pool import StaticPool

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to AI Resume Copilot API"}

# We can add a test for POST /resume/upload here by mocking file upload
from unittest.mock import patch

@patch('backend.services.ai_service.ollama.list')
@patch('backend.services.ai_service.ollama.chat')
def test_upload_and_tailor_resume(mock_chat, mock_list):
    # Mock Ollama status to be available
    mock_list.return_value = {"models": [{"name": "llama3.2"}]}
    
    # Mock chat responses for smart_parse, tailor_resume, and keyword extraction
    mock_chat.side_effect = [
        # First call: smart_parse
        {
            "message": {
                "content": '{"personal_info": {"name": "Test Candidate", "email": "test@example.com"}, "education": [], "skills": ["Python"], "projects": [], "experience": [], "certifications": []}'
            }
        },
        # Second call: tailor_resume (markdown text)
        {
            "message": {
                "content": "# Tailored Resume\n- Strong experience in Python"
            }
        },
        # Third call: keyword comparison
        {
            "message": {
                "content": '{"matched_keywords": ["Python"], "missing_keywords": ["FastAPI"]}'
            }
        }
    ]
    
    # 1. Test resume upload
    file_content = b"Resume text with email test@example.com"
    files = {"file": ("resume.txt", file_content, "text/plain")}
    response = client.post("/resume/upload", files=files)
    assert response.status_code == 200, f"Upload failed: {response.text}"
    res_data = response.json()
    assert res_data["filename"] == "resume.txt"
    assert res_data["parsed_data"]["personal_info"]["email"] == "test@example.com"
    resume_id = res_data["id"]
    
    # 2. Test resume tailoring
    tailor_payload = {
        "resume_id": resume_id,
        "job_title": "Python Developer",
        "job_description": "We need a Python developer skilled in FastAPI"
    }
    tailor_response = client.post("/resume/tailor", json=tailor_payload)
    assert tailor_response.status_code == 200
    tailor_data = tailor_response.json()
    assert "# Tailored Resume" in tailor_data["tailored_resume_md"]
    assert tailor_data["matched_keywords"] == ["Python"]
    assert tailor_data["missing_keywords"] == ["FastAPI"]
    assert "id" in tailor_data

@patch('backend.services.ai_service.ollama.list')
@patch('backend.services.ai_service.ollama.chat')
def test_history_cover_letter_and_deletes(mock_chat, mock_list):
    mock_list.return_value = {"models": [{"name": "llama3.2"}]}
    
    mock_chat.side_effect = [
        # smart_parse
        {
            "message": {
                "content": '{"personal_info": {"name": "History Candidate", "email": "history@example.com"}, "education": [], "skills": ["Python"], "projects": [], "experience": [], "certifications": []}'
            }
        },
        # tailor_resume
        {
            "message": {
                "content": "# Tailored Resume\n- Python Experience"
            }
        },
        # keyword comparison
        {
            "message": {
                "content": '{"matched_keywords": ["Python"], "missing_keywords": ["FastAPI"]}'
            }
        },
        # generate_cover_letter
        {
            "message": {
                "content": "# Cover Letter\nDear Hiring Manager..."
            }
        }
    ]
    
    # 1. Upload a resume
    file_content = b"Resume text with email history@example.com"
    files = {"file": ("history_resume.txt", file_content, "text/plain")}
    response = client.post("/resume/upload", files=files)
    assert response.status_code == 200
    resume_id = response.json()["id"]
    
    # 2. Tailor it to save a tailored version
    tailor_payload = {
        "resume_id": resume_id,
        "job_title": "Python Dev",
        "job_description": "We need a Python developer skilled in FastAPI"
    }
    tailor_response = client.post("/resume/tailor", json=tailor_payload)
    assert tailor_response.status_code == 200
    tailored_id = tailor_response.json()["id"]
    
    # 3. Get History and check if our saved version is there
    history_response = client.get("/resume/history")
    assert history_response.status_code == 200
    history_data = history_response.json()
    assert len(history_data) >= 1
    item = next((h for h in history_data if h["id"] == tailored_id), None)
    assert item is not None
    assert item["job_title"] == "Python Dev"
    assert item["resume_filename"] == "history_resume.txt"
    
    # 4. Generate cover letter
    cl_response = client.post(f"/resume/tailored/{tailored_id}/cover-letter")
    assert cl_response.status_code == 200
    cl_data = cl_response.json()
    assert "# Cover Letter" in cl_data["cover_letter_md"]
    
    # 5. Check history again to ensure cover_letter_md is updated
    history_response2 = client.get("/resume/history")
    history_data2 = history_response2.json()
    item2 = next((h for h in history_data2 if h["id"] == tailored_id), None)
    assert item2 is not None
    assert item2["cover_letter_md"] == "# Cover Letter\nDear Hiring Manager..."
    
    # 6. Delete tailored version
    del_tailored = client.delete(f"/resume/tailored/{tailored_id}")
    assert del_tailored.status_code == 200
    
    # Verify tailored version is gone from history
    history_response3 = client.get("/resume/history")
    history_data3 = history_response3.json()
    assert len(history_data3) == 0 or history_data3[0]["id"] != tailored_id
    
    # 7. Delete master resume
    del_resume = client.delete(f"/resume/{resume_id}")
    assert del_resume.status_code == 200
