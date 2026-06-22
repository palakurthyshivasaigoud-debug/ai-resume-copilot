"""
ATS Scoring Engine - Phase 3

Calculates an ATS (Applicant Tracking System) compatibility score by comparing
a parsed resume against a job description across five weighted dimensions:

  - Keyword Match:         40%
  - Skills Match:          25%
  - Experience Relevance:  20%
  - Education Match:       10%
  - Formatting:             5%

The engine works in two tiers:
  1. A fast, deterministic local scorer using text-overlap heuristics.
  2. An optional LLM-enhanced scorer (via Ollama) for deeper semantic analysis.
"""

import json
import re
import logging
from typing import Dict, Any, List, Tuple, Optional
from .ai_service import is_gemini_available, _call_gemini, _clean_llm_json

logger = logging.getLogger(__name__)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    """Lowercase, strip, collapse whitespace."""
    return re.sub(r"\s+", " ", text.lower().strip())


# Common English stop words that are never meaningful ATS keywords
_STOP_WORDS = {
    "and", "or", "the", "a", "an", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "is", "are", "was", "were", "be", "been", "have",
    "has", "had", "do", "does", "will", "would", "can", "could", "should",
    "may", "might", "must", "our", "your", "their", "this", "that", "we",
    "you", "they", "it", "as", "if", "so", "but", "not", "no", "who",
    "what", "when", "where", "how", "all", "any", "both", "each", "more",
    "most", "other", "some", "such", "than", "then", "there", "these",
    "those", "through", "during", "before", "after", "above", "below",
    "between", "into", "through", "during", "strong", "good", "great",
    "excellent", "working", "work", "role", "position", "team", "looking",
    "including", "experience", "preferred", "required", "responsibilities",
    "job", "candidate", "ability", "plus", "bonus", "using", "etc"
}

# Synonyms / alternate forms for common technical terms
_SYNONYMS: Dict[str, List[str]] = {
    "ml": ["machine learning", "machine-learning"],
    "ai": ["artificial intelligence"],
    "dl": ["deep learning"],
    "nlp": ["natural language processing"],
    "cv": ["computer vision"],
    "js": ["javascript"],
    "ts": ["typescript"],
    "py": ["python"],
    "sql": ["structured query language"],
    "nosql": ["mongodb", "dynamodb", "cassandra"],
    "k8s": ["kubernetes"],
    "ci/cd": ["cicd", "continuous integration", "continuous deployment"],
    "oop": ["object oriented", "object-oriented"],
    "rest": ["restful", "rest api"],
    "api": ["application programming interface", "apis"],
    "llm": ["large language model", "language model"],
    "data science": ["data scientist"],
    "data analysis": ["data analyst", "data analytics"],
    "power bi": ["powerbi"],
    "react": ["reactjs", "react.js"],
    "node": ["nodejs", "node.js"],
    "tensorflow": ["tf", "tensor flow"],
}


def _extract_meaningful_phrases(text: str) -> set:
    """
    Extract meaningful keywords from text:
    - All single tokens excluding stop words and very short words
    - All 2-word and 3-word technical phrases
    """
    norm = _normalize(text)
    tokens = re.findall(r"[a-z][a-z0-9+#.\-/]*", norm)

    phrases = set()

    # Add meaningful single tokens
    for t in tokens:
        if len(t) >= 2 and t not in _STOP_WORDS:
            phrases.add(t)

    # Add 2-gram and 3-gram phrases
    for i in range(len(tokens) - 1):
        bigram = f"{tokens[i]} {tokens[i+1]}"
        if tokens[i] not in _STOP_WORDS and tokens[i+1] not in _STOP_WORDS:
            phrases.add(bigram)

    for i in range(len(tokens) - 2):
        trigram = f"{tokens[i]} {tokens[i+1]} {tokens[i+2]}"
        if tokens[i] not in _STOP_WORDS and tokens[i+2] not in _STOP_WORDS:
            phrases.add(trigram)

    return phrases


def _expand_with_synonyms(phrases: set) -> set:
    """Add known synonym forms to a phrase set."""
    expanded = set(phrases)
    for phrase in list(phrases):
        for canonical, alts in _SYNONYMS.items():
            if phrase == canonical:
                expanded.update(alts)
            for alt in alts:
                if phrase == alt:
                    expanded.add(canonical)
    return expanded


def _extract_tokens(text: str) -> set:
    """Backward-compat wrapper — returns meaningful phrases for the given text."""
    return _extract_meaningful_phrases(text)


def _score_keyword_match(resume_tokens: set, jd_tokens: set) -> Tuple[float, List[str], List[str]]:
    """
    Keyword Match (weight: 40%)

    Uses phrase-level matching with synonym expansion.
    Only counts JD keywords that are 'meaningful' (not stop-words, >= 2 chars).
    Matched = resume contains at least one form of the JD keyword.
    """
    if not jd_tokens:
        return 100.0, [], []

    # Expand both sets with synonyms
    resume_expanded = _expand_with_synonyms(resume_tokens)
    jd_expanded = _expand_with_synonyms(jd_tokens)

    matched = resume_expanded & jd_expanded
    missing = jd_tokens - resume_expanded  # show only original JD keywords as missing

    # Score: matched / total JD keywords
    score = (len(matched) / len(jd_expanded)) * 100

    # Return clean sorted lists (single-word or 2-word keywords only for display)
    matched_display = sorted({k for k in matched if 1 <= len(k.split()) <= 2})[:40]
    missing_display = sorted({k for k in missing if 1 <= len(k.split()) <= 2 and k not in _STOP_WORDS and len(k) >= 3})[:40]

    return round(min(score, 100), 1), matched_display, missing_display


def _flatten_resume_text(resume_data: Dict[str, Any]) -> str:
    """Flatten every resume section into a single searchable string."""
    parts: List[str] = []

    pi = resume_data.get("personal_info", {})
    if pi.get("summary"):
        parts.append(pi["summary"])

    for exp in resume_data.get("experience", []):
        parts.append(f"{exp.get('role', '')} {exp.get('company', '')}")
        for bullet in exp.get("description", []) or []:
            parts.append(bullet)

    for proj in resume_data.get("projects", []):
        parts.append(f"{proj.get('name', '')} {proj.get('description', '')}")
        for tech in proj.get("technologies", []) or []:
            parts.append(tech)

    for edu in resume_data.get("education", []):
        parts.append(f"{edu.get('degree', '')} {edu.get('field_of_study', '')} {edu.get('institution', '')}")

    for skill in resume_data.get("skills", []):
        parts.append(skill)

    for cert in resume_data.get("certifications", []):
        parts.append(cert)

    return " ".join(parts)


# ─── Individual Scorers ──────────────────────────────────────────────────────


def _score_skills_match(resume_skills: List[str], jd_text: str) -> Tuple[float, List[str], List[str]]:
    """
    Skills Match (weight: 25%)
    Checks each resume skill against the full JD text.
    """
    if not resume_skills:
        return 0.0, [], []

    jd_lower = _normalize(jd_text)
    matched = []
    missing = []

    for skill in resume_skills:
        if _normalize(skill) in jd_lower:
            matched.append(skill)
        else:
            missing.append(skill)

    # Also find skills mentioned in JD but not in resume (reverse check)
    # Common tech keywords to look for
    score = (len(matched) / max(len(resume_skills), 1)) * 100
    return round(score, 1), matched, missing


def _score_experience_relevance(resume_data: Dict[str, Any], jd_text: str) -> Tuple[float, List[str]]:
    """
    Experience Relevance (weight: 20%)
    Scores how many experience bullet points reference JD keywords.
    """
    jd_tokens = _extract_tokens(jd_text)
    experience = resume_data.get("experience", [])

    if not experience:
        return 0.0, ["No work experience entries found"]

    total_bullets = 0
    matched_bullets = 0
    strengths = []

    for exp in experience:
        bullets = exp.get("description", []) or []
        for bullet in bullets:
            total_bullets += 1
            bullet_tokens = _extract_tokens(bullet)
            overlap = bullet_tokens & jd_tokens
            if len(overlap) >= 2:
                matched_bullets += 1

        role = exp.get("role", "")
        if role and _normalize(role) in _normalize(jd_text):
            strengths.append(f"Role \"{role}\" directly matches JD title")

    if total_bullets == 0:
        return 30.0, ["No bullet points found in experience"]

    score = (matched_bullets / total_bullets) * 100
    return round(score, 1), strengths


def _score_education_match(resume_data: Dict[str, Any], jd_text: str) -> Tuple[float, List[str]]:
    """
    Education Match (weight: 10%)
    Checks if degree level and field of study align with JD requirements.
    """
    education = resume_data.get("education", [])
    jd_lower = _normalize(jd_text)

    if not education:
        return 0.0, ["No education entries found"]

    score = 40.0  # Base score for having any education
    strengths = []

    degree_keywords = {
        "phd": 100, "ph.d": 100, "doctorate": 100,
        "master": 90, "m.s.": 90, "m.sc": 90, "mba": 90,
        "bachelor": 75, "b.s.": 75, "b.sc": 75, "b.tech": 75, "b.e.": 75,
    }

    for edu in education:
        degree = _normalize(edu.get("degree", ""))
        field = _normalize(edu.get("field_of_study", ""))
        institution = _normalize(edu.get("institution", ""))

        # Check degree level match
        for keyword, deg_score in degree_keywords.items():
            if keyword in degree:
                if keyword in jd_lower or degree.split()[0] in jd_lower:
                    score = max(score, deg_score)
                    strengths.append(f"Degree \"{edu.get('degree', '')}\" matches JD requirements")
                else:
                    score = max(score, deg_score * 0.7)
                break

        # Check field of study relevance
        if field and field in jd_lower:
            score = min(100, score + 15)
            strengths.append(f"Field \"{edu.get('field_of_study', '')}\" is relevant")

    return round(score, 1), strengths


def _score_formatting(resume_data: Dict[str, Any]) -> Tuple[float, List[str], List[str]]:
    """
    Formatting Score (weight: 5%)
    Checks resume completeness and structural quality for ATS compatibility.
    """
    score = 0.0
    strengths = []
    weaknesses = []

    # Check section presence (each worth ~12.5 points, 8 checks = 100)
    checks = [
        ("personal_info", "name", "Name is present"),
        ("personal_info", "email", "Email is present"),
        ("personal_info", "phone", "Phone is present"),
    ]
    
    pi = resume_data.get("personal_info", {})
    for _, field, label in checks:
        if pi.get(field):
            score += 10
            strengths.append(label)
        else:
            weaknesses.append(f"Missing {field} in personal info")

    section_checks = [
        ("skills", "Skills section present"),
        ("experience", "Experience section present"),
        ("education", "Education section present"),
        ("projects", "Projects section present"),
    ]

    for section, label in section_checks:
        data = resume_data.get(section, [])
        if data and len(data) > 0:
            score += 15
            strengths.append(label)
        else:
            weaknesses.append(f"Missing or empty {section} section")

    # Bonus for certifications
    if resume_data.get("certifications") and len(resume_data["certifications"]) > 0:
        score += 10
        strengths.append("Certifications present")

    return round(min(score, 100), 1), strengths, weaknesses


# ─── Main Scoring Function ───────────────────────────────────────────────────

def calculate_ats_score(
    resume_data: Dict[str, Any],
    job_description: str,
    job_title: str = "",
) -> Dict[str, Any]:
    """
    Calculate a comprehensive ATS compatibility score.

    Returns a dictionary with:
    - score: overall weighted ATS score (0-100)
    - breakdown: per-category scores and details
    - strengths: list of positive signals
    - weaknesses: list of areas to improve
    - matched_keywords: keywords found in both resume and JD
    - missing_keywords: JD keywords absent from the resume
    """
    full_jd = f"{job_title} {job_description}"
    resume_text = _flatten_resume_text(resume_data)
    resume_tokens = _extract_tokens(resume_text)
    jd_tokens = _extract_tokens(full_jd)
    resume_skills = resume_data.get("skills", [])

    # ── Calculate each dimension ──
    kw_score, kw_matched, kw_missing = _score_keyword_match(resume_tokens, jd_tokens)
    sk_score, sk_matched, sk_not_in_jd = _score_skills_match(resume_skills, full_jd)
    exp_score, exp_strengths = _score_experience_relevance(resume_data, full_jd)
    edu_score, edu_strengths = _score_education_match(resume_data, full_jd)
    fmt_score, fmt_strengths, fmt_weaknesses = _score_formatting(resume_data)

    # ── Weighted total ──
    total_score = (
        kw_score * 0.40 +
        sk_score * 0.25 +
        exp_score * 0.20 +
        edu_score * 0.10 +
        fmt_score * 0.05
    )

    # ── Aggregate strengths & weaknesses ──
    all_strengths = []
    all_weaknesses = []

    if kw_score >= 60:
        all_strengths.append(f"Good keyword coverage ({kw_score:.0f}%)")
    else:
        all_weaknesses.append(f"Low keyword match ({kw_score:.0f}%) — consider adding more JD-relevant terms")

    if sk_score >= 50:
        all_strengths.append(f"Strong skills alignment ({sk_score:.0f}%)")
    else:
        all_weaknesses.append(f"Skills alignment is weak ({sk_score:.0f}%) — tailor your skills section")

    all_strengths.extend(exp_strengths)
    all_strengths.extend(edu_strengths)
    all_strengths.extend(fmt_strengths)
    all_weaknesses.extend(fmt_weaknesses)

    if exp_score < 40:
        all_weaknesses.append("Experience bullet points don't strongly reflect the JD — consider rewriting")

    # ── Skill gap analysis ──
    jd_skill_tokens = _extract_tokens(job_description)
    resume_skill_tokens = set()
    for s in resume_skills:
        resume_skill_tokens.update(_extract_tokens(s))

    skill_gap_matched = sorted(resume_skill_tokens & jd_skill_tokens)
    skill_gap_missing = sorted(jd_skill_tokens - resume_skill_tokens)

    # Filter missing to only meaningful-length items (likely actual skills/tech)
    skill_gap_missing = [s for s in skill_gap_missing if len(s) >= 3]

    return {
        "score": round(total_score, 1),
        "breakdown": {
            "keyword_match": {
                "score": kw_score,
                "weight": 40,
                "matched": kw_matched[:30],  # Cap for response size
                "missing": kw_missing[:30],
            },
            "skills_match": {
                "score": sk_score,
                "weight": 25,
                "matched": sk_matched,
                "not_in_jd": sk_not_in_jd,
            },
            "experience_relevance": {
                "score": exp_score,
                "weight": 20,
                "details": exp_strengths,
            },
            "education_match": {
                "score": edu_score,
                "weight": 10,
                "details": edu_strengths,
            },
            "formatting": {
                "score": fmt_score,
                "weight": 5,
                "strengths": fmt_strengths,
                "weaknesses": fmt_weaknesses,
            },
        },
        "strengths": all_strengths,
        "weaknesses": all_weaknesses,
        "matched_keywords": kw_matched[:50],
        "missing_keywords": kw_missing[:50],
        "skill_gap": {
            "matched": skill_gap_matched[:30],
            "missing": skill_gap_missing[:30],
            "recommended_learning": skill_gap_missing[:10],
        },
    }


def calculate_ats_score_with_llm(
    resume_data: Dict[str, Any],
    job_description: str,
    job_title: str = "",
) -> Dict[str, Any]:
    """
    Enhanced ATS scoring that combines the deterministic scorer with
    an optional Gemini pass for deeper semantic analysis.
    """
    # Always start with the deterministic score
    result = calculate_ats_score(resume_data, job_description, job_title)

    # If Gemini is available, enhance the analysis with LLM insights
    if is_gemini_available():
        try:
            prompt = f"""You are an ATS (Applicant Tracking System) expert.

Given the candidate's resume data and the job description below, provide:
1. A list of 3-5 specific, actionable strengths
2. A list of 3-5 specific, actionable weaknesses/improvements
3. A list of up to 5 recommended skills to learn

Resume JSON:
{json.dumps(resume_data, indent=2)[:3000]}

Job Title: {job_title}
Job Description:
{job_description[:2000]}

Respond ONLY with valid JSON matching this schema:
{{
  "llm_strengths": ["strength1", "strength2"],
  "llm_weaknesses": ["weakness1", "weakness2"],
  "recommended_learning": ["skill1", "skill2"]
}}
Do NOT include markdown code blocks or explanations."""

            content = _clean_llm_json(_call_gemini(prompt, temperature=0.2))
            llm_data = json.loads(content)

            # Merge LLM insights
            if llm_data.get("llm_strengths"):
                result["strengths"].extend(llm_data["llm_strengths"])
            if llm_data.get("llm_weaknesses"):
                result["weaknesses"].extend(llm_data["llm_weaknesses"])
            if llm_data.get("recommended_learning"):
                result["skill_gap"]["recommended_learning"] = llm_data["recommended_learning"]

            result["llm_enhanced"] = True

        except Exception as e:
            logger.warning(f"Gemini-enhanced ATS scoring failed, using deterministic only: {e}")
            result["llm_enhanced"] = False
    else:
        result["llm_enhanced"] = False

    return result

