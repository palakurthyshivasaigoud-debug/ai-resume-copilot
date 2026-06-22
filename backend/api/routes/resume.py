import os
import shutil
import asyncio
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database.database import get_db
from database import models
from models.resume import (
    ResumeResponse, TailoredVersionResponse, HistoryItemResponse,
    ATSScoreResponse, ATSScoreRequest,
    TailorRequestV2, TailorResponseV2,
    TemplateRecommendation, TemplateRecommendationsResponse,
)
from services.parser import extract_text, parse_resume
from services.ai_service import (
    tailor_resume,
    generate_cover_letter,
    generate_pickup_score,
    generate_improvement_recommendations,
    generate_template_recommendations,
    _extract_template_metadata,
)
from services.ats_scoring import calculate_ats_score, calculate_ats_score_with_llm
from services.pdf_generator import generate_preserved_pdf, get_download_pdf_path
from fastapi.responses import FileResponse

router = APIRouter(prefix="/resume", tags=["resume"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/resumes"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ─── Legacy models kept for backward-compat ────────────────────────────────────

class TailorRequest(BaseModel):
    """Legacy tailor request — preserve_design defaults True."""
    resume_id: int
    job_title: str
    job_description: str

class TailorResponse(BaseModel):
    id: int
    tailored_resume_md: str
    matched_keywords: List[str]
    missing_keywords: List[str]


# ─── Upload ─────────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=ResumeResponse)
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        raw_text = extract_text(file_path, file.filename)
        parsed_data, raw_text = parse_resume(raw_text)

        # Extract lightweight template metadata for layout preservation
        template_meta = _extract_template_metadata(raw_text, parsed_data)

        db_resume = models.Resume(
            filename=file.filename,
            file_path=file_path,
            original_resume_path=file_path,
            content_type=file.content_type,
            parsed_data=parsed_data,
            raw_text=raw_text,
            template_metadata_json=template_meta,
        )
        db.add(db_resume)
        db.commit()
        db.refresh(db_resume)
        return db_resume

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Tailor (legacy endpoint — kept for backward compat) ──────────────────────

@router.post("/tailor", response_model=TailorResponse)
async def tailor_resume_endpoint(req: TailorRequest, db: Session = Depends(get_db)):
    db_resume = db.query(models.Resume).filter(models.Resume.id == req.resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    try:
        tailored_md, matched_keywords, missing_keywords = tailor_resume(
            db_resume.parsed_data,
            req.job_title,
            req.job_description,
            original_text=db_resume.raw_text,
            preserve_design=True,  # always preserve on legacy endpoint
        )

        db_tailored = models.TailoredVersion(
            resume_id=req.resume_id,
            job_title=req.job_title,
            job_description=req.job_description,
            tailored_resume_md=tailored_md,
            matched_keywords=matched_keywords,
            missing_keywords=missing_keywords,
            cover_letter_md=None,
            preserve_design=True,
        )
        db.add(db_tailored)
        db.commit()
        db.refresh(db_tailored)

        return TailorResponse(
            id=db_tailored.id,
            tailored_resume_md=tailored_md,
            matched_keywords=matched_keywords,
            missing_keywords=missing_keywords,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Tailor V2 (with preserve_design + recommend_templates) ──────────────────

@router.post("/tailor-v2", response_model=TailorResponseV2)
async def tailor_resume_v2(req: TailorRequestV2, db: Session = Depends(get_db)):
    db_resume = db.query(models.Resume).filter(models.Resume.id == req.resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    try:
        tasks = [
            asyncio.to_thread(
                tailor_resume,
                resume_data=db_resume.parsed_data,
                job_title=req.job_title,
                job_description=req.job_description,
                original_text=db_resume.raw_text,
                preserve_design=req.preserve_design,
                force_keywords=req.force_keywords,
            ),
            asyncio.to_thread(
                generate_pickup_score,
                resume_data=db_resume.parsed_data,
                job_title=req.job_title,
                job_description=req.job_description
            ),
            asyncio.to_thread(
                generate_improvement_recommendations,
                resume_data=db_resume.parsed_data,
                job_title=req.job_title,
                job_description=req.job_description
            )
        ]

        if req.recommend_templates:
            tasks.append(asyncio.to_thread(
                generate_template_recommendations,
                db_resume.parsed_data,
                req.job_title,
                req.job_description
            ))

        results = await asyncio.gather(*tasks)

        tailored_md, matched_keywords, missing_keywords, text_replacements = results[0]
        pickup_data = results[1]
        recommendations = results[2]
        recs_data = results[3] if req.recommend_templates else None
        
        overall_score = pickup_data.get("overall_score", 0)

        template_recs_raw: Optional[dict] = recs_data
        template_recs_response: Optional[TemplateRecommendationsResponse] = None

        if req.recommend_templates and recs_data:
            template_recs_response = TemplateRecommendationsResponse(
                recommendations=[
                    TemplateRecommendation(**r)
                    for r in recs_data.get("recommendations", [])
                ],
                current_format_assessment=recs_data.get("current_format_assessment", ""),
            )

        db_tailored = models.TailoredVersion(
            resume_id=req.resume_id,
            job_title=req.job_title,
            job_description=req.job_description,
            tailored_resume_md=tailored_md,
            matched_keywords=matched_keywords,
            missing_keywords=missing_keywords,
            ats_score=overall_score,
            ats_feedback_json=pickup_data,
            cover_letter_md=None,
            preserve_design=req.preserve_design,
            template_recommendations=recommendations,
            layout_metadata_json=text_replacements if req.preserve_design else None,
        )
        db.add(db_tailored)
        db.commit()
        db.refresh(db_tailored)

        return TailorResponseV2(
            id=db_tailored.id,
            tailored_resume_md=tailored_md,
            matched_keywords=matched_keywords,
            missing_keywords=missing_keywords,
            preserve_design=req.preserve_design,
            template_recommendations=template_recs_response,
            preview_url=None,
            generated_pdf_url=None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── PDF Generation & Preview ──────────────────────────────────────────────────

@router.post("/{tailored_id}/generate-pdf")
async def generate_pdf_endpoint(tailored_id: int, db: Session = Depends(get_db)):
    db_tailored = db.query(models.TailoredVersion).filter(models.TailoredVersion.id == tailored_id).first()
    if not db_tailored:
        raise HTTPException(status_code=404, detail="Tailored resume not found.")
    
    db_resume = db_tailored.resume

    try:
        preview_path = generate_preserved_pdf(
            tailored_markdown=db_tailored.tailored_resume_md,
            original_pdf_path=db_resume.original_resume_path,
            layout_metadata=db_tailored.layout_metadata_json
        )
        download_path = get_download_pdf_path(preview_path)

        db_tailored.preview_pdf_path = preview_path
        db_tailored.generated_pdf_path = download_path
        db.commit()
        
        return {
            "status": "success",
            "preview_url": f"http://localhost:8000/resume/{tailored_id}/preview",
            "download_url": f"http://localhost:8000/resume/{tailored_id}/download"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{tailored_id}/preview")
async def preview_pdf_endpoint(tailored_id: int, db: Session = Depends(get_db)):
    db_tailored = db.query(models.TailoredVersion).filter(models.TailoredVersion.id == tailored_id).first()
    if not db_tailored or not db_tailored.preview_pdf_path:
        raise HTTPException(status_code=404, detail="Preview PDF not found.")
    return FileResponse(db_tailored.preview_pdf_path, media_type="application/pdf")

@router.get("/{tailored_id}/download")
async def download_pdf_endpoint(tailored_id: int, db: Session = Depends(get_db)):
    db_tailored = db.query(models.TailoredVersion).filter(models.TailoredVersion.id == tailored_id).first()
    if not db_tailored or not db_tailored.generated_pdf_path:
        raise HTTPException(status_code=404, detail="Generated PDF not found.")
    filename = f"Tailored_Resume_{tailored_id}.pdf"
    return FileResponse(
        db_tailored.generated_pdf_path, 
        media_type="application/pdf", 
        filename=filename
    )


# ─── Template Recommendations (standalone) ────────────────────────────────────

@router.post("/template-recommendations", response_model=TemplateRecommendationsResponse)
async def get_template_recommendations(req: TailorRequest, db: Session = Depends(get_db)):
    """Get ATS template recommendations without tailoring the resume."""
    db_resume = db.query(models.Resume).filter(models.Resume.id == req.resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    try:
        recs_data = generate_template_recommendations(
            db_resume.parsed_data, req.job_title, req.job_description
        )
        return TemplateRecommendationsResponse(
            recommendations=[TemplateRecommendation(**r) for r in recs_data.get("recommendations", [])],
            current_format_assessment=recs_data.get("current_format_assessment", ""),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Resumes list ──────────────────────────────────────────────────────────────

@router.get("/", response_model=List[ResumeResponse])
def get_resumes(db: Session = Depends(get_db)):
    resumes = db.query(models.Resume).all()
    return resumes


# ─── History ──────────────────────────────────────────────────────────────────

@router.get("/history", response_model=List[HistoryItemResponse])
def get_history(db: Session = Depends(get_db)):
    history_items = db.query(models.TailoredVersion).order_by(
        models.TailoredVersion.created_at.desc()
    ).all()
    result = []
    for h in history_items:
        resume_filename = h.resume.filename if h.resume else "Unknown Resume"
        result.append(HistoryItemResponse(
            id=h.id,
            resume_id=h.resume_id,
            resume_filename=resume_filename,
            job_title=h.job_title,
            job_description=h.job_description,
            tailored_resume_md=h.tailored_resume_md,
            matched_keywords=h.matched_keywords or [],
            missing_keywords=h.missing_keywords or [],
            cover_letter_md=h.cover_letter_md,
            created_at=h.created_at,
        ))
    return result


# ─── Cover Letter ─────────────────────────────────────────────────────────────

class CoverLetterResponse(BaseModel):
    cover_letter_md: str

@router.post("/tailored/{tailored_id}/cover-letter", response_model=CoverLetterResponse)
async def generate_cover_letter_endpoint(tailored_id: int, db: Session = Depends(get_db)):
    db_tailored = db.query(models.TailoredVersion).filter(
        models.TailoredVersion.id == tailored_id
    ).first()
    if not db_tailored:
        raise HTTPException(status_code=404, detail="Tailored version not found.")
    try:
        cover_letter_md = generate_cover_letter(
            db_tailored.tailored_resume_md,
            db_tailored.job_title,
            db_tailored.job_description,
        )
        db_tailored.cover_letter_md = cover_letter_md
        db.commit()
        db.refresh(db_tailored)
        return CoverLetterResponse(cover_letter_md=cover_letter_md)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Delete tailored version ──────────────────────────────────────────────────

@router.delete("/tailored/{tailored_id}")
def delete_tailored_version(tailored_id: int, db: Session = Depends(get_db)):
    db_tailored = db.query(models.TailoredVersion).filter(
        models.TailoredVersion.id == tailored_id
    ).first()
    if not db_tailored:
        raise HTTPException(status_code=404, detail="Tailored version not found.")
    db.delete(db_tailored)
    db.commit()
    return {"status": "ok", "message": "Tailored version deleted."}


# ─── Delete master resume ──────────────────────────────────────────────────────

@router.delete("/{resume_id}")
def delete_master_resume(resume_id: int, db: Session = Depends(get_db)):
    db_resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if db_resume.file_path and os.path.exists(db_resume.file_path):
        try:
            os.remove(db_resume.file_path)
        except Exception:
            pass
    db.delete(db_resume)
    db.commit()
    return {"status": "ok", "message": "Master resume deleted."}


# ─── ATS Score ────────────────────────────────────────────────────────────────

@router.post("/ats-score", response_model=ATSScoreResponse)
async def get_ats_score(req: ATSScoreRequest, db: Session = Depends(get_db)):
    """Calculate ATS compatibility score for a resume against a job description."""
    db_resume = db.query(models.Resume).filter(models.Resume.id == req.resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    try:
        if req.use_llm:
            result = calculate_ats_score_with_llm(
                db_resume.parsed_data, req.job_description, req.job_title
            )
        else:
            result = calculate_ats_score(
                db_resume.parsed_data, req.job_description, req.job_title
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
