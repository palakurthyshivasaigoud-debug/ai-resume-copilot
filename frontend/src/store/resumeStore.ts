import { create } from 'zustand';
import axios from 'axios';

export interface ATSBreakdownItem {
  score: number;
  weight: number;
  matched?: string[];
  missing?: string[];
  not_in_jd?: string[];
  details?: string[];
  strengths?: string[];
  weaknesses?: string[];
}

export interface ATSBreakdown {
  keyword_match: ATSBreakdownItem;
  skills_match: ATSBreakdownItem;
  experience_relevance: ATSBreakdownItem;
  education_match: ATSBreakdownItem;
  formatting: ATSBreakdownItem;
}

export interface SkillGap {
  matched: string[];
  missing: string[];
  recommended_learning: string[];
}

export interface ATSScoreData {
  score: number;
  breakdown: ATSBreakdown;
  strengths: string[];
  weaknesses: string[];
  matched_keywords: string[];
  missing_keywords: string[];
  skill_gap: SkillGap;
  llm_enhanced: boolean;
}

export interface ParsedResumeData {
  id: number;
  filename: string;
  parsed_data: {
    personal_info: {
      name?: string;
      email?: string;
      phone?: string;
      linkedin?: string;
      github?: string;
      summary?: string;
    };
    education: Array<{
      institution: string;
      degree: string;
      field_of_study?: string;
      start_date?: string;
      end_date?: string;
    }>;
    skills: string[];
    projects: Array<{
      name: string;
      description?: string;
      technologies?: string[];
    }>;
    experience: Array<{
      company: string;
      role: string;
      start_date?: string;
      end_date?: string;
      description?: string[];
    }>;
    certifications: string[];
  };
}

export interface PickupScoreData {
  overall_score: number;
  metrics: {
    "ATS Compatibility": number;
    "Keyword Match": number;
    "Skills Relevance": number;
    "Project Strength": number;
    "Achievement Impact": number;
    "Recruiter Readability": number;
    "Formatting Quality": number;
  };
}

export interface TextReplacement {
  original_text: string;
  updated_text: string;
  reason: string;
  expected_impact: string;
}

export interface ImprovementRecommendation {
  type: string;
  title: string;
  category: string;
  current: string;
  improved: string;
  impact: string;
  difficulty: string;
}

export interface TemplateRecommendation {
  template_name: string;
  reason: string;
  ats_improvement_estimate: string;
  best_for: string;
  key_features: string[];
}

export interface TemplateRecommendationsData {
  recommendations: TemplateRecommendation[];
  current_format_assessment: string;
}

interface ResumeState {
  // Step tracking
  currentStep: 1 | 2 | 3;

  // Step 1: Upload
  isUploading: boolean;
  uploadError: string | null;
  parsedData: ParsedResumeData | null;
  uploadedFileName: string | null;

  // Step 2: Job details
  jobTitle: string;
  jobDescription: string;

  // Step 3: Tailored result
  isTailoring: boolean;
  tailorError: string | null;
  tailoredResume: string | null;
  matchedKeywords: string[];
  missingKeywords: string[];

  // History & Saved versions
  history: Array<{
    id: number;
    resume_id: number;
    resume_filename: string;
    job_title: string;
    job_description: string;
    tailored_resume_md: string;
    matched_keywords: string[];
    missing_keywords: string[];
    ats_score: number;
    ats_feedback_json: any;
    layout_metadata_json: any;
    cover_letter_md: string | null;
    created_at: string;
  }>;
  savedResumes: ParsedResumeData[];
  activeTailoredId: number | null;
  coverLetter: string | null;
  isGeneratingCoverLetter: boolean;
  coverLetterError: string | null;

  // Pickup Score & Recommendations
  pickupScore: PickupScoreData | null;
  textReplacements: TextReplacement[];
  recommendations: ImprovementRecommendation[];

  // ATS Score
  atsScore: ATSScoreData | null;
  isCalculatingATS: boolean;
  atsError: string | null;

  // Layout Preservation Toggles
  preserveDesign: boolean;
  recommendTemplates: boolean;
  templateRecommendations: TemplateRecommendationsData | null;
  isLoadingTemplates: boolean;

  // PDF Preview & Generation
  previewUrl: string | null;
  downloadUrl: string | null;
  isGeneratingPDF: boolean;
  pdfError: string | null;

  // Actions
  setUploading: (status: boolean) => void;
  setError: (error: string | null) => void;
  setParsedData: (data: ParsedResumeData | null, filename?: string) => void;
  setJobTitle: (title: string) => void;
  setJobDescription: (desc: string) => void;
  setCurrentStep: (step: 1 | 2 | 3) => void;
  setTailoring: (status: boolean) => void;
  setTailorError: (error: string | null) => void;
  setTailoredResume: (resume: string | null) => void;
  setKeywords: (matched: string[], missing: string[]) => void;
  setActiveTailoredId: (id: number | null) => void;
  setCoverLetter: (cl: string | null) => void;
  setGeneratingCoverLetter: (status: boolean) => void;
  setCoverLetterError: (error: string | null) => void;

  fetchHistory: () => Promise<void>;
  fetchSavedResumes: () => Promise<void>;
  generateCoverLetter: () => Promise<void>;
  selectHistoryItem: (item: any) => void;
  deleteHistoryItem: (id: number) => Promise<void>;
  deleteSavedResume: (id: number) => Promise<void>;
  fetchATSScore: (useLlm?: boolean) => Promise<void>;
  setPickupScore: (data: PickupScoreData | null) => void;
  setPreserveDesign: (val: boolean) => void;
  setRecommendTemplates: (val: boolean) => void;
  tailorWithOptions: (forceKeywords?: string[]) => Promise<void>;
  generatePDFPreview: () => Promise<void>;
  reset: () => void;
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  currentStep: 1,
  isUploading: false,
  uploadError: null,
  parsedData: null,
  uploadedFileName: null,
  jobTitle: '',
  jobDescription: '',
  isTailoring: false,
  tailorError: null,
  tailoredResume: null,
  matchedKeywords: [],
  missingKeywords: [],
  history: [],
  savedResumes: [],
  activeTailoredId: null,
  coverLetter: null,
  isGeneratingCoverLetter: false,
  coverLetterError: null,

  pickupScore: null,
  textReplacements: [],
  recommendations: [],
  isCalculatingATS: false,
  atsError: null,

  preserveDesign: true,
  recommendTemplates: false,
  templateRecommendations: null,
  isLoadingTemplates: false,

  previewUrl: null,
  downloadUrl: null,
  isGeneratingPDF: false,
  pdfError: null,

  setUploading: (status) => set({ isUploading: status }),
  setError: (error) => set({ uploadError: error }),
  setParsedData: (data, filename) => set({
    parsedData: data,
    uploadedFileName: filename ?? (data ? data.filename : null),
    currentStep: data ? 2 : 1,
  }),
  setJobTitle: (title) => set({ jobTitle: title }),
  setJobDescription: (desc) => set({ jobDescription: desc }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setTailoring: (status) => set({ isTailoring: status }),
  setTailorError: (error) => set({ tailorError: error }),
  setTailoredResume: (resume) => set({ tailoredResume: resume }),
  setKeywords: (matched, missing) => set({ matchedKeywords: matched, missingKeywords: missing }),
  setActiveTailoredId: (id) => set({ activeTailoredId: id }),
  setCoverLetter: (cl) => set({ coverLetter: cl }),
  setGeneratingCoverLetter: (status) => set({ isGeneratingCoverLetter: status }),
  setCoverLetterError: (error) => set({ coverLetterError: error }),
  setPickupScore: (data) => set({ pickupScore: data }),
  setPreserveDesign: (val) => set({ preserveDesign: val }),
  setRecommendTemplates: (val) => set({ recommendTemplates: val }),

  fetchHistory: async () => {
    try {
      const res = await axios.get('http://localhost:8000/resume/history');
      set({ history: res.data });
    } catch (err: any) {
      console.error("Failed to fetch history:", err);
    }
  },

  fetchSavedResumes: async () => {
    try {
      const res = await axios.get('http://localhost:8000/resume/');
      set({ savedResumes: res.data });
    } catch (err: any) {
      console.error("Failed to fetch saved resumes:", err);
    }
  },

  generateCoverLetter: async () => {
    const { activeTailoredId } = get();
    if (!activeTailoredId) return;

    set({ isGeneratingCoverLetter: true, coverLetterError: null });
    try {
      const res = await axios.post(`http://localhost:8000/resume/tailored/${activeTailoredId}/cover-letter`);
      set({ coverLetter: res.data.cover_letter_md });
    } catch (err: any) {
      set({ coverLetterError: err.response?.data?.detail || err.message || "Failed to generate cover letter." });
    } finally {
      set({ isGeneratingCoverLetter: false });
    }
  },

  selectHistoryItem: (item) => {
    const parsedShell: ParsedResumeData = {
      id: item.resume_id,
      filename: item.resume_filename,
      parsed_data: {
        personal_info: { email: "" },
        education: [],
        skills: [],
        projects: [],
        experience: [],
        certifications: []
      }
    };

    set({
      parsedData: parsedShell,
      uploadedFileName: item.resume_filename,
      jobTitle: item.job_title,
      jobDescription: item.job_description,
      tailoredResume: item.tailored_resume_md,
      matchedKeywords: item.matched_keywords,
      missingKeywords: item.missing_keywords,
      coverLetter: item.cover_letter_md,
      activeTailoredId: item.id,
      previewUrl: item.preview_url || null,
      downloadUrl: item.generated_pdf_url || null,
      currentStep: 3
    });
  },

  deleteHistoryItem: async (id) => {
    try {
      await axios.delete(`http://localhost:8000/resume/tailored/${id}`);
      const res = await axios.get('http://localhost:8000/resume/history');
      set({ history: res.data });
      if (get().activeTailoredId === id) {
        set({ activeTailoredId: null, tailoredResume: null, coverLetter: null });
      }
    } catch (err: any) {
      console.error("Failed to delete history item:", err);
    }
  },

  deleteSavedResume: async (id) => {
    try {
      await axios.delete(`http://localhost:8000/resume/${id}`);
      const res = await axios.get('http://localhost:8000/resume/');
      set({ savedResumes: res.data });
      if (get().parsedData?.id === id) {
        set({ parsedData: null, uploadedFileName: null, currentStep: 1 });
      }
    } catch (err: any) {
      console.error("Failed to delete master resume:", err);
    }
  },

  tailorWithOptions: async (forceKeywords?: string[]) => {
    const { parsedData, jobTitle, jobDescription, preserveDesign, recommendTemplates } = get();
    if (!parsedData?.id) return;

    set({ isTailoring: true, tailorError: null, tailoredResume: null, templateRecommendations: null });
    set({ currentStep: 3 });

    try {
      const response = await axios.post('http://localhost:8000/resume/tailor-v2', {
        resume_id: parsedData.id,
        job_title: jobTitle,
        job_description: jobDescription,
        preserve_design: preserveDesign,
        recommend_templates: recommendTemplates,
        force_keywords: forceKeywords || undefined,
      });
      set({
        tailoredResume: response.data.tailored_resume_md,
        matchedKeywords: response.data.matched_keywords || [],
        missingKeywords: response.data.missing_keywords || [],
        activeTailoredId: response.data.id,
        templateRecommendations: null, // deprecated in favor of recommendations
        recommendations: response.data.template_recommendations || [],
        pickupScore: response.data.ats_feedback_json || null,
        textReplacements: response.data.layout_metadata_json || [],
        previewUrl: null,
        downloadUrl: null,
        pdfError: null,
      });
    } catch (err: any) {
      set({
        tailorError: err.response?.data?.detail || err.message || 'AI Tailoring failed.',
      });
    } finally {
      set({ isTailoring: false });
    }
  },

  fetchATSScore: async (useLlm = true) => {
    const { parsedData, jobTitle, jobDescription } = get();
    if (!parsedData?.id || !jobDescription) return;

    set({ isCalculatingATS: true, atsError: null, atsScore: null });
    try {
      const res = await axios.post('http://localhost:8000/resume/ats-score', {
        resume_id: parsedData.id,
        job_title: jobTitle,
        job_description: jobDescription,
        use_llm: useLlm,
      });
      set({ atsScore: res.data });
    } catch (err: any) {
      set({ atsError: err.response?.data?.detail || err.message || 'ATS scoring failed.' });
    } finally {
      set({ isCalculatingATS: false });
    }
  },

  generatePDFPreview: async () => {
    const { activeTailoredId } = get();
    if (!activeTailoredId) return;

    set({ isGeneratingPDF: true, pdfError: null });
    try {
      const response = await axios.post(`http://localhost:8000/resume/${activeTailoredId}/generate-pdf`);
      set({
        previewUrl: response.data.preview_url,
        downloadUrl: response.data.download_url,
      });
    } catch (err: any) {
      set({
        pdfError: err.response?.data?.detail || err.message || 'PDF Generation failed.',
      });
    } finally {
      set({ isGeneratingPDF: false });
    }
  },

  reset: () => set({
    currentStep: 1,
    isUploading: false,
    uploadError: null,
    parsedData: null,
    uploadedFileName: null,
    jobTitle: '',
    jobDescription: '',
    isTailoring: false,
    tailorError: null,
    tailoredResume: null,
    matchedKeywords: [],
    missingKeywords: [],
    activeTailoredId: null,
    coverLetter: null,
    isGeneratingCoverLetter: false,
    coverLetterError: null,
    atsScore: null,
    isCalculatingATS: false,
    atsError: null,
    preserveDesign: true,
    recommendTemplates: false,
    templateRecommendations: null,
    isLoadingTemplates: false,
    previewUrl: null,
    downloadUrl: null,
    isGeneratingPDF: false,
    pdfError: null,
  }),
}));
