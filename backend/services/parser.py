import os
import re
from typing import Dict, Any, Tuple
from services.ai_service import smart_parse, is_ollama_available

def extract_text_from_pdf(file_path: str) -> str:
    import pdfplumber
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def extract_text_from_docx(file_path: str) -> str:
    import docx
    doc = docx.Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs])

def extract_text_from_txt(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

def extract_text(file_path: str, filename: str) -> str:
    """Extracts raw text from a file (PDF, DOCX, TXT, MD)."""
    ext = os.path.splitext(filename)[1].lower()
    if ext == '.pdf':
        return extract_text_from_pdf(file_path)
    elif ext == '.docx':
        return extract_text_from_docx(file_path)
    elif ext in ['.txt', '.md']:
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file extension: {ext}")

def parse_resume(raw_text: str) -> Tuple[Dict[str, Any], str]:
    """
    Attempts to parse raw resume text.
    Returns a tuple: (parsed_data_dict, raw_text).
    - If Ollama is available, uses the smart LLM parser for full structure.
    - Otherwise falls back to basic regex extraction.
    The raw_text is preserved for layout-preservation during tailoring.
    """
    # 1. Try AI Smart Parse first if Ollama is running
    if is_ollama_available():
        structured_data = smart_parse(raw_text)
        if structured_data:
            if "personal_info" not in structured_data:
                structured_data["personal_info"] = {}
            if not structured_data["personal_info"].get("summary"):
                structured_data["personal_info"]["summary"] = (
                    raw_text[:1000] + "..." if len(raw_text) > 1000 else raw_text
                )
            return structured_data, raw_text

    # 2. Fallback to basic Regex Parser
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?<!\.)'
    phone_pattern = r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'

    email_match = re.search(email_pattern, raw_text)
    phone_match = re.search(phone_pattern, raw_text)

    parsed = {
        "personal_info": {
            "email": email_match.group(0) if email_match else None,
            "phone": phone_match.group(0) if phone_match else None,
            "summary": raw_text[:1000] + "..." if len(raw_text) > 1000 else raw_text
        },
        "education": [],
        "skills": [],
        "projects": [],
        "experience": [],
        "certifications": []
    }
    return parsed, raw_text
