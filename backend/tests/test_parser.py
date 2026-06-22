import os
from backend.services.parser import parse_resume

def test_parse_resume_extracts_email():
    sample_text = "Hello, my name is John Doe. Contact me at john.doe@example.com."
    result = parse_resume(sample_text)
    assert result["personal_info"]["email"] == "john.doe@example.com"

def test_parse_resume_extracts_phone():
    sample_text = "Call me at (555) 123-4567 for an interview."
    result = parse_resume(sample_text)
    assert result["personal_info"]["phone"] == "(555) 123-4567"

def test_parse_resume_summary_fallback():
    sample_text = "Experienced software engineer with a background in Python and Next.js."
    result = parse_resume(sample_text)
    assert sample_text in result["personal_info"]["summary"]
