from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    file_path = Column(String)
    content_type = Column(String)
    parsed_data = Column(JSON)          # Structured resume JSON
    raw_text = Column(Text, nullable=True)  # Original extracted plain text (for layout preservation)
    original_resume_path = Column(String, nullable=True)  # Path to the original uploaded file
    template_name = Column(String, nullable=True)         # Detected or user-chosen template name
    template_metadata_json = Column(JSON, nullable=True)  # Section order, formatting hints, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tailored_versions = relationship("TailoredVersion", back_populates="resume", cascade="all, delete-orphan")


class TailoredVersion(Base):
    __tablename__ = "tailored_versions"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"))
    job_title = Column(String)
    job_description = Column(Text)
    tailored_resume_md = Column(Text)
    matched_keywords = Column(JSON, nullable=True)
    missing_keywords = Column(JSON, nullable=True)
    cover_letter_md = Column(Text, nullable=True)
    preserve_design = Column(Boolean, default=True)        # Was layout preservation enabled?
    template_recommendations = Column(JSON, nullable=True) # Stored template recommendation results
    
    ats_score = Column(Integer, nullable=True)
    ats_feedback_json = Column(JSON, nullable=True)
    
    # New fields for Original PDF Preservation Engine
    layout_metadata_json = Column(JSON, nullable=True)
    preview_pdf_path = Column(String(500), nullable=True)
    generated_pdf_path = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    resume = relationship("Resume", back_populates="tailored_versions")
