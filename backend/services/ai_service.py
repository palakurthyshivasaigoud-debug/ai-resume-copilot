import json
import logging
import os
import re
import difflib
from typing import Dict, Any, Tuple, Optional, List

from groq import Groq
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

# ─── Configure Groq ────────────────────────────────────────────────────────────

_GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
_GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

if _GROQ_API_KEY:
    logger.info(f"Groq configured with model: {_GROQ_MODEL}")
else:
    logger.warning("GROQ_API_KEY not set — AI features will return fallback data.")


def _get_client() -> Groq:
    """Return a configured Groq client."""
    return Groq(api_key=_GROQ_API_KEY)


def is_groq_available() -> bool:
    """Check if the Groq API key is configured."""
    return bool(_GROQ_API_KEY)


# Backward-compat aliases used elsewhere in the codebase
def is_gemini_available() -> bool:
    return is_groq_available()

def is_ollama_available() -> bool:
    return is_groq_available()


# ─── System Prompts ────────────────────────────────────────────────────────────

PARSE_PROMPT = """You are an expert resume parser. I will provide raw text extracted from a resume document.
Extract the information into a structured JSON format exactly matching the schema below.
Do NOT include any explanations, markdown code blocks, or extra text. ONLY output valid JSON.

Schema:
{
  "personal_info": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "linkedin": "string",
    "github": "string",
    "summary": "string"
  },
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field_of_study": "string",
      "start_date": "string",
      "end_date": "string"
    }
  ],
  "skills": ["string"],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["string"]
    }
  ],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "start_date": "string",
      "end_date": "string",
      "description": ["string"]
    }
  ],
  "certifications": ["string"]
}

If any field is not found in the text, omit it or use null/empty array/empty string as appropriate.
"""

TAILOR_PROMPT_PRESERVE = """You are an expert ATS optimization specialist and resume content writer.
You are strictly a CONTENT OPTIMIZER. You are NOT a designer.

CORE REQUIREMENT:
The user's uploaded resume design, structure, and section ordering is the absolute SOURCE OF TRUTH.
We are using a TRUE PDF TEXT REPLACEMENT ENGINE. You must provide EXACT text replacements.

ALLOWED CHANGES:
- Rewrite Professional Summary to include ATS keywords.
- Rewrite Experience descriptions and bullet points to highlight relevant achievements.
- Rewrite Project descriptions.
- Update Skills wording to match job description exactly.

NOT ALLOWED UNDER ANY CIRCUMSTANCES:
- DO NOT create a new template or layout.
- DO NOT reorder sections.
- DO NOT change heading names or add new headings.
- DO NOT change the formatting or bullet styles.
- DO NOT remove sections that were in the original.

CRITICAL CONTENT PRESERVATION RULE (NO EMPTY SPACE):
The tailored resume must NOT become shorter, emptier, or less impressive than the original resume.
You must maintain 85%-100% of the original page utilization.

ACHIEVEMENT PRESERVATION RULE:
Never remove achievements simply because they lack JD keywords.
ALWAYS retain: Hackathon wins, publications, scholarships, academic ranks, open-source contributions,
leadership roles, student council roles, team management, national competitions, and major project achievements.

Here is the Job Title: {job_title}
Here is the Job Description:
{job_description}

Here is the Original Resume Parsed Data:
{resume_data}

OUTPUT FORMAT:
You MUST return ONLY a JSON array of text replacements. Do not use markdown code blocks, just raw JSON.
Each object in the array must have exactly four keys: "original_text", "updated_text", "reason", and "expected_impact".

Example:
[
  {{
    "original_text": "Developed web app using React.",
    "updated_text": "Engineered a scalable web application using React, improving efficiency by 25%.",
    "reason": "Achievement lacked measurable impact.",
    "expected_impact": "+3 Recruiter Score"
  }}
]

ONLY return valid JSON. No explanations.
"""

TAILOR_PROMPT_FREE = """You are an expert career coach and ATS optimization specialist.
I will provide the candidate's master resume data (JSON) and the target job title and job description.

Your task is to tailor the resume to maximize ATS match score and recruiter appeal.

Guidelines:
1. Rewrite bullet points in the experience and projects sections to highlight relevant keywords.
2. Use impactful action verbs and quantifiable results.
3. You may reorder, reformat, or restructure as needed for best ATS fit.
4. Output ONLY the tailored resume in Markdown. No introductory or concluding remarks.

CRITICAL: The tailored resume must be equally impressive and equally complete as the original.
Never remove: Hackathon wins, publications, scholarships, academic ranks, leadership roles, or major achievements.
"""

COVER_LETTER_PROMPT = """You are an expert career coach and professional writer.
Write a highly professional, compelling cover letter that highlights the candidate's alignment with the role.

Guidelines:
1. Write a professional, personalized cover letter.
2. Keep it concise, engaging, and professional (around 300-400 words).
3. Use a standard business cover letter format.
4. Output ONLY the cover letter in Markdown format. No introductory or concluding remarks.
"""

KEYWORD_PROMPT = """You are an ATS keyword analyzer.
Compare the resume data and the job description, then return a JSON object containing:
- "matched_keywords": key technical skills/keywords from the JD that the candidate already has.
- "missing_keywords": key technical skills/keywords from the JD that are missing.

Output ONLY valid JSON matching this schema:
{
  "matched_keywords": ["keyword1", "keyword2"],
  "missing_keywords": ["keyword3", "keyword4"]
}
Do NOT include markdown block wrappers, explanations, or any other text.
"""

TEMPLATE_RECOMMENDATION_PROMPT = """You are an expert ATS resume consultant.
Analyze the candidate's experience level, domain, and job requirements, then recommend ATS-friendly templates.

Return ONLY valid JSON matching this exact schema:
{
  "recommendations": [
    {
      "template_name": "string",
      "reason": "string",
      "ats_improvement_estimate": "string",
      "best_for": "string",
      "key_features": ["feature1", "feature2"]
    }
  ],
  "current_format_assessment": "string"
}

Recommend exactly 3-5 templates from: Modern ATS, Minimal ATS, Corporate ATS, Executive ATS,
Software Engineer ATS, Data Science ATS, Product Manager ATS.
Do NOT include markdown code blocks or explanations outside the JSON.
"""


# ─── Core Helper ──────────────────────────────────────────────────────────────

def _clean_llm_json(content: str) -> str:
    """Strip markdown code fences that models sometimes emit."""
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    return content.strip()


_FALLBACK_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",  # Fast, good quality
    "qwen/qwen3-32b",                              # 32B, strong quality
    "llama-3.1-8b-instant",                        # Smallest, last resort
]


def _call_groq(
    system_prompt: str,
    user_content: str,
    temperature: float = 0.4,
    max_tokens: int = 8192,
    model: Optional[str] = None,
) -> str:
    """
    Send a prompt to Groq and return the text response.
    Automatically falls back to alternative models if primary hits rate limits.
    """
    if not is_groq_available():
        raise RuntimeError(
            "GROQ_API_KEY not configured. "
            "Please set it in backend/.env — "
            "get a free key at https://console.groq.com"
        )
    client = _get_client()
    primary = model or _GROQ_MODEL
    models_to_try = [primary] + [m for m in _FALLBACK_MODELS if m != primary]

    last_error = None
    for attempt_model in models_to_try:
        try:
            completion = client.chat.completions.create(
                model=attempt_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_content},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            if attempt_model != primary:
                logger.info(f"Used fallback model: {attempt_model} (primary {primary} was rate-limited)")
            return completion.choices[0].message.content
        except Exception as e:
            err_str = str(e)
            # Only retry on rate-limit errors (429); re-raise anything else immediately
            if "429" in err_str or "rate_limit" in err_str.lower():
                logger.warning(f"Model {attempt_model} rate-limited, trying next fallback...")
                last_error = e
                continue
            raise

    # All models exhausted
    raise RuntimeError(
        f"All Groq models are currently rate-limited. "
        f"Please wait a few minutes and try again. Last error: {last_error}"
    )


# Keep alias for ats_scoring.py import
def _call_gemini(prompt: str, temperature: float = 0.4) -> str:
    """Alias so ats_scoring.py doesn't need changes — routes to Groq."""
    return _call_groq("You are a helpful AI assistant.", prompt, temperature)

def _get_lightweight_resume(resume_data: Dict[str, Any]) -> str:
    """Strips heavy text fields from resume data to save tokens for background AI tasks."""
    import copy
    light = copy.deepcopy(resume_data)
    if "personal_info" in light and "summary" in light["personal_info"]:
        light["personal_info"]["summary"] = "[TRUNCATED TO SAVE TOKENS]"
    
    # Also truncate descriptions slightly if they are huge
    for exp in light.get("experience", []):
        if "description" in exp and isinstance(exp["description"], list):
            exp["description"] = [d[:200] + ("..." if len(d)>200 else "") for d in exp["description"]]
    
    for proj in light.get("projects", []):
        if "description" in proj and isinstance(proj["description"], str):
            proj["description"] = proj["description"][:200] + ("..." if len(proj["description"])>200 else "")
            
    return json.dumps(light)

# ─── Core AI Functions ─────────────────────────────────────────────────────────

def smart_parse(raw_text: str) -> Dict[str, Any]:
    """Uses Groq / Llama to parse raw resume text into structured JSON."""
    try:
        content = _clean_llm_json(
            _call_groq(
                system_prompt=PARSE_PROMPT,
                user_content=f"Resume Text:\n{raw_text}",
                temperature=0.0,
                max_tokens=4096,
            )
        )
        return json.loads(content)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Groq output as JSON: {e}")
        return {}
    except Exception as e:
        logger.error(f"Error during smart_parse: {e}")
        return {}


def tailor_resume(
    resume_data: Dict[str, Any],
    job_title: str,
    job_description: str,
    original_text: Optional[str] = None,
    preserve_design: bool = True,
    force_keywords: Optional[List[str]] = None,
) -> Tuple[str, list, list, list]:
    """
    Uses Groq to rewrite the resume tailored to the job description.

    Returns:
        Tuple of (tailored_markdown, matched_keywords, missing_keywords, text_replacements).
    """
    if not is_groq_available():
        raise Exception("GROQ_API_KEY not configured. Please add it to backend/.env")

    text_replacements = []
    tailored_md = ""

    if preserve_design:
        system_content = TAILOR_PROMPT_PRESERVE.format(
            job_title=job_title,
            job_description=job_description,
            resume_data=json.dumps(resume_data, indent=2),
        )
        if force_keywords:
            system_content += f"\n\nCRITICAL REQUIREMENT: You MUST organically incorporate the following keywords into the resume text: {', '.join(force_keywords)}."
            
        user_content = f"""ORIGINAL RESUME TEXT:
{original_text or ''}

---
REMINDER: Output ONLY a JSON array with "original_text" and "updated_text" fields. Nothing else."""

        try:
            raw_output = _call_groq(system_content, user_content, temperature=0.4)
            cleaned_json = _clean_llm_json(raw_output)
            text_replacements = json.loads(cleaned_json)
            if not isinstance(text_replacements, list):
                text_replacements = []

            tailored_md = original_text or ""
            for rep in text_replacements:
                old_t = rep.get("original_text", "").strip()
                new_t = rep.get("updated_text", "").strip()
                if not old_t or not new_t:
                    continue

                # 1. Try exact match first
                if old_t in tailored_md:
                    tailored_md = tailored_md.replace(old_t, new_t, 1)
                    continue

                # 2. Fuzzy match: normalize whitespace and try again
                normalized_old = re.sub(r'\s+', ' ', old_t)
                normalized_md  = re.sub(r'\s+', ' ', tailored_md)
                if normalized_old in normalized_md:
                    tailored_md = re.sub(re.escape(normalized_old), new_t, normalized_md, count=1)
                    continue

                # 3. Find best fuzzy match using difflib (handles slight AI rewording)
                lines = tailored_md.split('\n')
                best_ratio = 0.0
                best_idx = -1
                for i, line in enumerate(lines):
                    ratio = difflib.SequenceMatcher(None, old_t.lower(), line.strip().lower()).ratio()
                    if ratio > best_ratio:
                        best_ratio = ratio
                        best_idx = i
                if best_ratio >= 0.65 and best_idx >= 0:
                    lines[best_idx] = new_t
                    tailored_md = '\n'.join(lines)
                    logger.info(f"Fuzzy match applied (ratio={best_ratio:.2f}) on line {best_idx}")
        except Exception as e:
            logger.error(f"Failed to parse JSON replacements: {e}")
            tailored_md = original_text or ""
    else:
        # Free-form redesign
        system_content = TAILOR_PROMPT_FREE
        if force_keywords:
            system_content += f"\n\nCRITICAL REQUIREMENT: You MUST organically incorporate the following keywords into the resume text: {', '.join(force_keywords)}."
            
        user_content = f"""Candidate's Resume JSON:
{json.dumps(resume_data, indent=2)}

Target Job Title: {job_title}
Target Job Description:
{job_description}
"""
        tailored_md = _call_groq(system_content, user_content, temperature=0.5).strip()

    # Extract matched/missing keywords
    matched_keywords: List[str] = []
    missing_keywords: List[str] = []
    try:
        kw_user = f"""Resume Data:
{_get_lightweight_resume(resume_data)}

Job Description:
{job_description}
"""
        kw_raw = _clean_llm_json(_call_groq(KEYWORD_PROMPT, kw_user, temperature=0.0))
        keyword_data = json.loads(kw_raw)
        matched_keywords = keyword_data.get("matched_keywords", [])
        missing_keywords = keyword_data.get("missing_keywords", [])
    except Exception as e:
        logger.error(f"Failed to parse keywords JSON: {e}")

    return tailored_md, matched_keywords, missing_keywords, text_replacements


def generate_pickup_score(
    resume_data: Dict[str, Any], job_title: str, job_description: str
) -> Dict[str, Any]:
    """Generates Resume Pickup Score with 7 sub-metrics via Groq."""
    fallback = {
        "overall_score": 75,
        "metrics": {
            "ATS Compatibility": 75, "Keyword Match": 75, "Skills Relevance": 75,
            "Project Strength": 75, "Achievement Impact": 75,
            "Recruiter Readability": 75, "Formatting Quality": 75,
        },
    }
    try:
        system_prompt = """You are an expert ATS engineer and Senior Technical Recruiter.
Score 7 components out of 100 and output ONLY raw JSON:
{
  "overall_score": 85,
  "metrics": {
    "ATS Compatibility": 85, "Keyword Match": 80, "Skills Relevance": 88,
    "Project Strength": 82, "Achievement Impact": 90,
    "Recruiter Readability": 95, "Formatting Quality": 90
  }
}
No markdown, no explanation."""
        user_content = f"""Job Title: {job_title}
JD: {job_description}

Resume JSON:
{_get_lightweight_resume(resume_data)}
"""
        raw = _call_groq(system_prompt, user_content, temperature=0.1)
        return json.loads(_clean_llm_json(raw))
    except Exception as e:
        logger.error(f"Error generating pickup score: {e}")
        return fallback


def generate_improvement_recommendations(
    resume_data: Dict[str, Any], job_title: str, job_description: str
) -> List[Dict[str, Any]]:
    """Generates actionable improvement recommendations via Groq."""
    try:
        system_prompt = """You are an ATS optimization engine.
Analyze the resume against the JD and generate actionable recommendations.
Output ONLY a JSON array:
[
  {
    "type": "Keyword",
    "title": "Docker",
    "category": "Skills",
    "current": "",
    "improved": "Suggested insertion points: Project 1",
    "impact": "+3 ATS Score",
    "difficulty": "Low"
  }
]
No markdown, no explanation."""
        user_content = f"""Job Title: {job_title}
JD: {job_description}

Resume JSON:
{_get_lightweight_resume(resume_data)}
"""
        raw = _call_groq(system_prompt, user_content, temperature=0.2)
        data = json.loads(_clean_llm_json(raw))
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        return []


def generate_cover_letter(
    tailored_resume_md: str, job_title: str, job_description: str
) -> str:
    """Uses Groq to generate a tailored cover letter."""
    user_content = f"""Tailored Resume (Markdown):
{tailored_resume_md}

Target Job Title: {job_title}
Target Job Description:
{job_description}
"""
    try:
        return _call_groq(COVER_LETTER_PROMPT, user_content, temperature=0.7).strip()
    except Exception as e:
        logger.error(f"Error during generate_cover_letter: {e}")
        raise


def generate_template_recommendations(
    resume_data: Dict[str, Any],
    job_title: str,
    job_description: str,
) -> Dict[str, Any]:
    """Uses Groq to generate ATS template recommendations."""
    fallback = _static_template_recommendations(resume_data, job_title)
    if not is_groq_available():
        return fallback
    try:
        user_content = f"""Resume Data:
{_get_lightweight_resume(resume_data)}

Target Job Title: {job_title}
Target Job Description:
{job_description[:2000]}
"""
        raw = _clean_llm_json(_call_groq(TEMPLATE_RECOMMENDATION_PROMPT, user_content, temperature=0.3))
        data = json.loads(raw)
        if "recommendations" in data and isinstance(data["recommendations"], list):
            return data
        return fallback
    except Exception as e:
        logger.warning(f"Template recommendation failed: {e} — using static fallback.")
        return fallback


def _static_template_recommendations(
    resume_data: Dict[str, Any], job_title: str
) -> Dict[str, Any]:
    """Static fallback template recommendations based on heuristics."""
    title_lower = job_title.lower()
    experience_count = len(resume_data.get("experience", []))
    recs = []

    if any(k in title_lower for k in ["engineer", "developer", "software", "sde", "swe", "backend", "frontend"]):
        recs.append({
            "template_name": "Software Engineer ATS",
            "reason": "Optimized for technical roles with skills-forward layout.",
            "ats_improvement_estimate": "+15% ATS score improvement",
            "best_for": "Software Engineers, Backend/Frontend Developers",
            "key_features": ["Skills prominently at top", "Projects before experience", "GitHub link emphasized"],
        })
    if any(k in title_lower for k in ["data", "ml", "machine learning", "analyst", "scientist"]):
        recs.append({
            "template_name": "Data Science ATS",
            "reason": "Highlights technical skills, publications, and model results.",
            "ats_improvement_estimate": "+12% ATS score improvement",
            "best_for": "Data Scientists, ML Engineers, Analysts",
            "key_features": ["Publications/research section", "Tools prominently listed", "Results-driven bullets"],
        })
    if any(k in title_lower for k in ["product", "pm", "manager"]):
        recs.append({
            "template_name": "Product Manager ATS",
            "reason": "Emphasizes cross-functional leadership and product outcomes.",
            "ats_improvement_estimate": "+10% ATS score improvement",
            "best_for": "Product Managers, Product Owners",
            "key_features": ["KPI-first bullet points", "Cross-functional collaboration", "Roadmap ownership"],
        })
    recs.append({
        "template_name": "Modern ATS",
        "reason": "Clean single-column format that passes all major ATS parsers.",
        "ats_improvement_estimate": "+8% ATS score improvement",
        "best_for": "All roles",
        "key_features": ["Single-column layout", "Standard section headings", "No tables or graphics"],
    })
    recs.append({
        "template_name": "Minimal ATS",
        "reason": "Ultra-simple formatting maximizes ATS readability.",
        "ats_improvement_estimate": "+6% ATS score improvement",
        "best_for": "Corporate, Finance, Legal, Government",
        "key_features": ["Plain text friendly", "No special characters", "Consistent date formats"],
    })
    if experience_count >= 8:
        recs.append({
            "template_name": "Executive ATS",
            "reason": "Two-column header with prominent leadership highlights.",
            "ats_improvement_estimate": "+9% ATS score improvement",
            "best_for": "Directors, VPs, C-Suite",
            "key_features": ["Leadership summary upfront", "Board/advisory section", "Strategic focus"],
        })
    return {
        "recommendations": recs[:5],
        "current_format_assessment": (
            "Your current resume was analyzed. "
            "The templates below are recommended based on your target role and experience level."
        ),
    }


def _extract_template_metadata(raw_text: str, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract lightweight formatting metadata from original resume text."""
    lines = raw_text.split("\n")
    sections = []
    uses_bullets = False
    bullet_chars = set()

    for line in lines:
        stripped = line.strip()
        for prefix, level in [("### ", 3), ("## ", 2), ("# ", 1)]:
            if stripped.startswith(prefix):
                sections.append({"heading": stripped[len(prefix):], "level": level})
                break
        if stripped.startswith(("- ", "* ")) or re.match(r"^[•●◦▪]", stripped):
            uses_bullets = True
            bullet_chars.add(stripped[0])

    experience_bullet_counts = [
        len(exp.get("description", []) or [])
        for exp in parsed_data.get("experience", [])
    ]

    return {
        "section_order": [s["heading"] for s in sections],
        "uses_bullets": uses_bullets,
        "bullet_chars": list(bullet_chars),
        "experience_bullet_counts": experience_bullet_counts,
        "total_lines": len(lines),
        "estimated_pages": max(1, len(lines) // 55),
    }
