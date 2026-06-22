from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any

class PersonalInfo(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    summary: Optional[str] = None

class Education(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class Experience(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[List[str]] = None

    @field_validator('description', mode='before')
    def force_list(cls, v):
        if isinstance(v, str):
            if not v.strip():
                return []
            return [v]
        return v

class Project(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    technologies: Optional[List[str]] = None

class ResumeData(BaseModel):
    personal_info: PersonalInfo = PersonalInfo()
    education: List[Education] = []
    skills: List[str] = []
    projects: List[Project] = []
    experience: List[Experience] = []
    certifications: List[str] = []

class ResumeResponse(BaseModel):
    id: int
    filename: str
    parsed_data: ResumeData

    class Config:
        from_attributes = True

class TailoredVersionResponse(BaseModel):
    id: int
    resume_id: int
    job_title: str
    job_description: str
    tailored_resume_md: str
    matched_keywords: List[str]
    missing_keywords: List[str]
    cover_letter_md: Optional[str] = None
    created_at: Any

    class Config:
        from_attributes = True

class HistoryItemResponse(BaseModel):
    id: int
    resume_id: int
    resume_filename: str
    job_title: str
    job_description: str
    tailored_resume_md: str
    matched_keywords: List[str]
    missing_keywords: List[str]
    cover_letter_md: Optional[str] = None
    created_at: Any

    class Config:
        from_attributes = True


class ATSBreakdownItem(BaseModel):
    score: float
    weight: int
    matched: Optional[List[str]] = None
    missing: Optional[List[str]] = None
    not_in_jd: Optional[List[str]] = None
    details: Optional[List[str]] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None

class ATSBreakdown(BaseModel):
    keyword_match: ATSBreakdownItem
    skills_match: ATSBreakdownItem
    experience_relevance: ATSBreakdownItem
    education_match: ATSBreakdownItem
    formatting: ATSBreakdownItem

class SkillGap(BaseModel):
    matched: List[str] = []
    missing: List[str] = []
    recommended_learning: List[str] = []

class ATSScoreResponse(BaseModel):
    score: float
    breakdown: ATSBreakdown
    strengths: List[str] = []
    weaknesses: List[str] = []
    matched_keywords: List[str] = []
    missing_keywords: List[str] = []
    skill_gap: SkillGap = SkillGap()
    llm_enhanced: bool = False

class ATSScoreRequest(BaseModel):
    resume_id: int
    job_title: str
    job_description: str
    use_llm: bool = True


# ── Layout Preservation & Template Recommendation Models ──────────────────────

class TailorRequestV2(BaseModel):
    """Extended tailor request supporting layout preservation and template mode."""
    resume_id: int
    job_title: str
    job_description: str
    preserve_design: bool = True           # Default ON: preserve original layout
    recommend_templates: bool = False      # Default OFF: do not generate template suggestions
    force_keywords: Optional[List[str]] = None

class TemplateRecommendation(BaseModel):
    template_name: str
    reason: str
    ats_improvement_estimate: str
    best_for: str
    key_features: List[str] = []

class TemplateRecommendationsResponse(BaseModel):
    recommendations: List[TemplateRecommendation] = []
    current_format_assessment: str = ""

class TailorResponseV2(BaseModel):
    id: int
    tailored_resume_md: str
    matched_keywords: List[str]
    missing_keywords: List[str]
    preserve_design: bool
    ats_score: Optional[int] = None
    ats_feedback_json: Optional[Any] = None
    layout_metadata_json: Optional[Any] = None
    template_recommendations: Optional[Any] = None
    preview_url: Optional[str] = None
    generated_pdf_url: Optional[str] = None
