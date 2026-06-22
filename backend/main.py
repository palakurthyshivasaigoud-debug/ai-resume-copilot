from dotenv import load_dotenv
load_dotenv()  # Load .env FIRST before any other imports

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.database import engine, Base
from database import models
from api.routes import resume
from services.ai_service import is_groq_available

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Resume Copilot API", version="2.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to AI Resume Copilot API",
        "ai_provider": "Groq Llama 3.3 70B",
        "groq_ready": is_groq_available(),
    }

@app.get("/health/ai")
def ai_health():
    if is_groq_available():
        return {
            "status": "ok",
            "provider": "Groq Llama 3.3 70B",
            "message": "Groq API key is configured and ready."
        }
    return {
        "status": "error",
        "provider": "None",
        "message": "GROQ_API_KEY not set in backend/.env"
    }

# Keep backward compatibility
@app.get("/health/ollama")
def ollama_health():
    return ai_health()
