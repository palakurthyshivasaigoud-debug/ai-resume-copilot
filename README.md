# 🚀 AI Resume Copilot

> An AI-powered resume tailoring tool that optimizes your resume for ATS (Applicant Tracking Systems) using Groq's ultra-fast LLM API — runs entirely on your machine with zero cloud storage of your data.

![Tech Stack](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-Frontend-black?style=flat-square&logo=next.js)
![Groq](https://img.shields.io/badge/Groq-AI%20Engine-orange?style=flat-square)
![Llama](https://img.shields.io/badge/Llama%203.3%2070B-Model-blue?style=flat-square)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📄 **PDF Upload** | Upload your existing resume PDF |
| 🤖 **AI Tailoring** | Groq + Llama 3.3 70B rewrites your resume for a specific job description |
| 🎯 **ATS Score** | Phrase-level keyword scoring with synonym expansion |
| 💡 **Interactive Keywords** | Click missing keywords → AI injects them into your resume |
| 👁️ **PDF Preview** | See highlighted changes on your original template |
| 📥 **PDF Download** | Download clean, ATS-optimized resume in your original format |
| 📝 **Cover Letter** | AI-generated cover letter tailored to the job |
| 📊 **Template Recommendations** | Get ATS-friendly template suggestions |
| ⚡ **Automatic Fallback** | If one model rate-limits, automatically switches to next available |

---

## 🛠️ Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — Python web framework
- [SQLAlchemy](https://www.sqlalchemy.org/) — ORM with SQLite
- [PyMuPDF](https://pymupdf.readthedocs.io/) — PDF manipulation
- [ReportLab](https://www.reportlab.com/) — PDF generation
- [Groq API](https://console.groq.com/) — Ultra-fast LLM inference (300+ tokens/sec)

**Frontend**
- [Next.js 14](https://nextjs.org/) — React framework
- [Zustand](https://zustand-demo.pmnd.rs/) — State management
- Vanilla CSS with glassmorphism design

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/ai-resume-copilot.git
cd ai-resume-copilot
```

### 2. Backend setup
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt

# Create your .env file
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

### 3. Frontend setup
```bash
cd frontend
npm install
```

### 4. Run the app
**Terminal 1 — Backend:**
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** 🎉

---

## 🔑 Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Your Groq API key (free at console.groq.com) |
| `GROQ_MODEL` | Model to use (default: `llama-3.3-70b-versatile`) |

---

## 📂 Project Structure

```
ai-resume-copilot/
├── backend/
│   ├── api/routes/        # FastAPI route handlers
│   ├── database/          # SQLAlchemy models & DB setup
│   ├── models/            # Pydantic request/response models
│   ├── services/
│   │   ├── ai_service.py  # Groq API integration + fallback logic
│   │   ├── ats_scoring.py # ATS keyword scoring engine
│   │   ├── parser.py      # PDF/DOCX text extraction
│   │   └── pdf_generator.py # PDF preview & download generation
│   ├── main.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/           # Next.js app router
    │   ├── components/    # React components
    │   └── store/         # Zustand state management
    └── package.json
```

---

## ⚠️ Notes

- Your resume data stays on your machine — nothing is stored in the cloud
- The free Groq tier has a daily token limit; upgrade at [console.groq.com/settings/billing](https://console.groq.com/settings/billing) for higher limits
- If one model rate-limits, the app automatically tries fallback models

---

## 📄 License

MIT License — feel free to use, modify and distribute.
