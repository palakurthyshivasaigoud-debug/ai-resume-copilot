"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useResumeStore } from '@/store/resumeStore';
import ATSScorePanel from './ATSScorePanel';
import PickupScorePanel from './PickupScorePanel';
import RecommendationEngine from './RecommendationEngine';
import TemplateRecommendationsPanel from './TemplateRecommendationsPanel';
import PDFPreviewPanel from './PDFPreviewPanel';

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="result-card" style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#c7d2fe' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function renderMarkdownToHtml(markdown: string) {
  if (!markdown) return '';
  
  // Escape HTML tags to prevent rendering glitches
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Replace headings: #, ##, ###
  html = html.replace(/^# (.*?)$/gm, '<h1 class="md-h1">$1</h1>');
  html = html.replace(/^## (.*?)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^### (.*?)$/gm, '<h3 class="md-h3">$1</h3>');
  
  // Replace bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Bullet points
  html = html.replace(/^[-\*]\s+(.*?)$/gm, '<li class="md-li">$1</li>');
  
  // Inline code `code`
  html = html.replace(/`(.*?)`/g, '<code class="md-code">$1</code>');
  
  // Group list items into <ul>...</ul>
  const lines = html.split('\n');
  let inList = false;
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    const isLi = trimmed.startsWith('<li');
    
    if (isLi && !inList) {
      inList = true;
      return '<ul class="md-ul">' + line;
    } else if (!isLi && inList) {
      inList = false;
      return '</ul>' + line;
    }
    
    // Add standard paragraphs for non-tag non-empty lines
    if (!trimmed.startsWith('<h') && !trimmed.startsWith('<l') && !trimmed.startsWith('<u') && !trimmed.startsWith('</u') && trimmed.length > 0) {
      return `<p class="md-p">${line}</p>`;
    }
    
    return line;
  });
  
  if (inList) {
    processedLines.push('</ul>');
  }
  
  return processedLines.join('\n');
}

export default function ResultsStep() {
  const {
    parsedData,
    jobTitle,
    jobDescription,
    setCurrentStep,
    uploadedFileName,
    isTailoring,
    tailorError,
    tailoredResume,
    matchedKeywords,
    missingKeywords,
    activeTailoredId,
    coverLetter,
    isGeneratingCoverLetter,
    coverLetterError,
    setTailoring,
    setTailorError,
    setTailoredResume,
    setKeywords,
    setActiveTailoredId,
    generateCoverLetter,
    preserveDesign,
    templateRecommendations,
    textReplacements,
    tailorWithOptions,
  } = useResumeStore();

  const [activeTab, setActiveTab] = useState<'tailored' | 'ats-score' | 'cover-letter' | 'templates' | 'preview'>('ats-score');
  const [loadingStep, setLoadingStep] = useState(0);
  const [copiedResume, setCopiedResume] = useState(false);
  const [copiedLetter, setCopiedLetter] = useState(false);
  const [viewChanges, setViewChanges] = useState(true);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  const handleKeywordToggle = (kw: string) => {
    setSelectedKeywords(prev => 
      prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw]
    );
  };

  const handleInjectKeywords = async () => {
    if (selectedKeywords.length === 0) return;
    setSelectedKeywords([]);
    await tailorWithOptions(selectedKeywords);
    setActiveTab('tailored');
  };

  const renderHighlightedMarkdown = (markdown: string) => {
    let html = renderMarkdownToHtml(markdown);
    if (viewChanges && textReplacements && textReplacements.length > 0) {
      textReplacements.forEach(rep => {
        if (rep.updated_text) {
          // Escape string for regex
          const safeText = rep.updated_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(${safeText})`, 'g');
          const titleText = `Reason: ${rep.reason || 'Improved for ATS'} | Impact: ${rep.expected_impact || 'Positive'}`;
          // Replace occurrences with a styled span
          html = html.replace(regex, `<span class="highlight-change" title="${titleText}" style="background-color: rgba(253, 224, 71, 0.2); border-bottom: 2px solid #fde047; padding: 0 4px; border-radius: 2px; cursor: help;">$1</span>`);
        }
      });
    }
    return html;
  };

  const loadingMessages = [
    "Reading job description requirements...",
    "Extracting key technical skills and qualifications...",
    "Scanning your master resume database entry...",
    "Aligning skills with target job description...",
    "Rewriting experience bullet points for maximum impact (via Llama 3.2)...",
    "Running ATS keyword gap analysis...",
    "Polishing Markdown layout...",
    "Almost finished..."
  ];

  useEffect(() => {
    if (!isTailoring) return;
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % loadingMessages.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isTailoring]);

  // If there's tailored resume and no tab is selected, focus on it
  useEffect(() => {
    if (tailoredResume) {
      setActiveTab('tailored');
    } else {
      setActiveTab('ats-score');
    }
  }, [tailoredResume]);

  if (!parsedData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ color: '#475569' }}>No data yet. Go back to Step 1.</p>
        <button className="btn-secondary" onClick={() => setCurrentStep(1)} style={{ marginTop: '16px' }}>← Start Over</button>
      </div>
    );
  }

  const handleRetry = async () => {
    if (!parsedData?.id) return;
    setTailoring(true);
    setTailorError(null);
    setTailoredResume(null);
    try {
      const response = await axios.post('http://localhost:8000/resume/tailor', {
        resume_id: parsedData.id,
        job_title: jobTitle,
        job_description: jobDescription,
      });
      setTailoredResume(response.data.tailored_resume_md);
      setActiveTailoredId(response.data.id);
      setKeywords(response.data.matched_keywords || [], response.data.missing_keywords || []);
    } catch (err: any) {
      setTailorError(err.response?.data?.detail || err.message || 'AI Tailoring failed.');
    } finally {
      setTailoring(false);
    }
  };

  const handleCopyResume = () => {
    if (!tailoredResume) return;
    navigator.clipboard.writeText(tailoredResume);
    setCopiedResume(true);
    setTimeout(() => setCopiedResume(false), 2000);
  };

  const handleCopyLetter = () => {
    if (!coverLetter) return;
    navigator.clipboard.writeText(coverLetter);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 2000);
  };

  const handleDownloadResume = () => {
    if (!tailoredResume) return;
    const blob = new Blob([tailoredResume], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const cleanJobTitle = jobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute("download", `tailored_resume_${cleanJobTitle || 'ai'}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadLetter = () => {
    if (!coverLetter) return;
    const blob = new Blob([coverLetter], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const cleanJobTitle = jobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute("download", `cover_letter_${cleanJobTitle || 'ai'}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading Screen
  if (isTailoring) {
    return (
      <div className="glass animate-fade-in" style={{ borderRadius: '20px', padding: '60px 40px', textAlign: 'center', maxWidth: '640px', margin: '40px auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <div style={{ position: 'relative', width: '80px', height: '80px' }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '4px solid rgba(99, 102, 241, 0.15)',
              borderTop: '4px solid #6366f1',
              animation: 'spin 1s linear infinite',
            }} />
            <div style={{
              position: 'absolute', inset: '10px', borderRadius: '50%',
              border: '4px solid rgba(139, 92, 246, 0.1)',
              borderBottom: '4px solid #8b5cf6',
              animation: 'spin 1.4s linear infinite reverse',
            }} />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.05)',
              animation: 'pulse-slow 2s infinite',
            }} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>
              Local AI Tailoring Active
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Powered by local Ollama & Llama 3.2 (Offline, Private)
            </p>
          </div>
          
          <div style={{
            background: 'rgba(0,0,0,0.2)', padding: '16px 24px', borderRadius: '12px',
            width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.05)',
            minHeight: '76px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <p style={{ color: '#a5b4fc', fontSize: '14px', fontWeight: 500, transition: 'all 0.3s' }}>
              ⚡ {loadingMessages[loadingStep]}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error Screen
  if (tailorError) {
    return (
      <div className="glass animate-fade-in" style={{ borderRadius: '20px', padding: '40px', maxWidth: '640px', margin: '40px auto' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fca5a5', marginBottom: '6px' }}>Tailoring Failed</h2>
            <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6 }}>{tailorError}</p>
          </div>
        </div>
        
        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px 20px', borderRadius: '12px', marginBottom: '28px', border: '1px solid rgba(255,255,255,0.03)' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>Troubleshooting steps:</h4>
          <ol style={{ fontSize: '13px', color: '#64748b', paddingLeft: '20px', lineHeight: 1.7 }}>
            <li>If you see <code style={{ color: '#818cf8' }}>429 Rate Limit</code> — you've hit Groq's free tier daily limit. Wait a few minutes or try again tomorrow.</li>
            <li>Check that your <code style={{ color: '#818cf8' }}>GROQ_API_KEY</code> is set correctly in <code style={{ color: '#818cf8' }}>backend/.env</code>.</li>
            <li>Get a free Groq API key at <code style={{ color: '#818cf8' }}>console.groq.com</code> if you don't have one.</li>
            <li>Make sure the backend server is running on <code style={{ color: '#818cf8' }}>localhost:8000</code>.</li>
          </ol>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={() => setCurrentStep(2)}>← Edit Job Details</button>
          <button className="btn-primary" style={{ padding: '10px 24px', fontSize: '14px' }} onClick={handleRetry}>Retry AI Analysis</button>
        </div>
      </div>
    );
  }

  const { parsed_data } = parsedData;
  const { personal_info, skills, experience, education, projects, certifications } = parsed_data;
  
  const hasKeywords = matchedKeywords.length > 0 || missingKeywords.length > 0;
  const matchRate = matchedKeywords.length + missingKeywords.length > 0 
    ? Math.round((matchedKeywords.length / (matchedKeywords.length + missingKeywords.length)) * 100) 
    : 0;

  return (
    <div className="animate-fade-in">
      <style dangerouslySetInnerHTML={{__html: `
        .md-h1 { font-size: 20px; font-weight: 700; color: #f8fafc; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; }
        .md-h2 { font-size: 16px; font-weight: 600; color: #e2e8f0; margin-top: 20px; margin-bottom: 10px; }
        .md-h3 { font-size: 14px; font-weight: 600; color: #cbd5e1; margin-top: 16px; margin-bottom: 8px; }
        .md-ul { margin-left: 20px; margin-bottom: 12px; list-style-type: disc; }
        .md-li { margin-bottom: 6px; font-size: 14px; color: #cbd5e1; line-height: 1.6; }
        .md-li strong { color: #f8fafc; }
        .md-code { font-family: monospace; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #a5b4fc; font-size: 13px; }
        .md-p { margin-bottom: 12px; line-height: 1.6; font-size: 14px; color: #cbd5e1; }
        
        .tab-btn {
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn.active {
          color: #a5b4fc;
          border-bottom-color: #6366f1;
        }
      `}} />

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
            Resume Customization Workspace
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>{uploadedFileName}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => setCurrentStep(2)}>← Edit Job Details</button>
          <button className="btn-secondary" onClick={() => setCurrentStep(1)}>Upload Different Resume</button>
        </div>
      </div>

      {/* ATS Keyword Check & Match Score */}
      {hasKeywords && (
        <div className="glass" style={{ padding: '24px', borderRadius: '16px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#c7d2fe', marginBottom: '4px' }}>ATS Keyword Analysis</h3>
              <p style={{ fontSize: '13px', color: '#64748b' }}>Estimated ATS keywords match index</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: matchRate > 70 ? '#34d399' : matchRate > 40 ? '#fbbf24' : '#f87171' }}>{matchRate}%</span>
                <span style={{ fontSize: '11px', color: '#475569', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Keywords Match</span>
              </div>
              <div style={{ width: '120px', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${matchRate}%`, height: '100%',
                  background: matchRate > 70 ? '#34d399' : matchRate > 40 ? '#fbbf24' : '#f87171',
                  borderRadius: '4px', transition: 'width 0.5s ease-in-out'
                }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flexWrap: 'wrap' }}>
            {/* Matched Keywords */}
            <div>
              <span style={{ fontSize: '11px', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                ✓ Matched Keywords ({matchedKeywords.length})
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {matchedKeywords.map((kw, i) => (
                  <span key={i} className="tag tag-green" style={{ fontSize: '11px' }}>{kw}</span>
                ))}
                {matchedKeywords.length === 0 && <span style={{ fontSize: '12px', color: '#334155' }}>No matched keywords found</span>}
              </div>
            </div>

            {/* Missing Keywords */}
            <div>
              <span style={{ fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                ⚠ Missing Recommended Keywords ({missingKeywords.length})
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {missingKeywords.map((kw, i) => {
                  const isSelected = selectedKeywords.includes(kw);
                  return (
                    <button
                      key={i}
                      onClick={() => handleKeywordToggle(kw)}
                      className={`tag ${isSelected ? 'tag-green' : 'tag-amber'}`}
                      style={{ 
                        fontSize: '11px', 
                        cursor: 'pointer', 
                        border: isSelected ? '1px solid #34d399' : '1px solid transparent',
                        transition: 'all 0.2s ease',
                        background: isSelected ? 'rgba(52, 211, 153, 0.15)' : undefined
                      }}
                      title="Click to select for injection"
                    >
                      {isSelected ? '✓ ' : '+ '} {kw}
                    </button>
                  );
                })}
                {missingKeywords.length === 0 && <span style={{ fontSize: '12px', color: '#334155' }}>No missing keywords</span>}
              </div>
              {selectedKeywords.length > 0 && (
                <button 
                  className="btn-primary animate-fade-in" 
                  onClick={handleInjectKeywords}
                  style={{ marginTop: '12px', padding: '6px 14px', fontSize: '12px' }}
                >
                  ✨ Inject {selectedKeywords.length} Selected Keywords
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px', overflowX: 'auto' }}>
        {tailoredResume && (
          <button
            className={`tab-btn ${activeTab === 'tailored' ? 'active' : ''}`}
            onClick={() => setActiveTab('tailored')}
          >
            1. Tailored Resume
          </button>
        )}
        <button
          className={`tab-btn ${activeTab === 'ats-score' ? 'active' : ''}`}
          onClick={() => setActiveTab('ats-score')}
        >
          2. ATS Score
        </button>
        {activeTailoredId && (
          <button
            className={`tab-btn ${activeTab === 'cover-letter' ? 'active' : ''}`}
            onClick={() => setActiveTab('cover-letter')}
          >
            3. Cover Letter
          </button>
        )}
        <button
          className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
          style={templateRecommendations ? { borderColor: 'rgba(139,92,246,0.4)', color: '#a78bfa' } : {}}
        >
          4. Template Recommendations
        </button>
        <button
          className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
          style={{ color: activeTab === 'preview' ? '#34d399' : '', borderBottomColor: activeTab === 'preview' ? '#10b981' : '' }}
        >
          5. PDF Preview
        </button>
      </div>

      {/* Tailored tab content */}
      {activeTab === 'tailored' && tailoredResume && (
        <div className="glass animate-fade-in" style={{ borderRadius: '16px', padding: '28px', border: '1px solid rgba(99,102,241,0.2)' }}>
          {/* Action header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Optimized Tailored Output</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <p style={{ fontSize: '12px', color: '#64748b' }}>Tailored bullet points aligned to the requirements</p>
                {preserveDesign ? (
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                    background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)',
                    color: '#34d399', fontWeight: 600,
                  }}>🔒 Layout Preserved</span>
                ) : (
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                    background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                    color: '#fbbf24', fontWeight: 600,
                  }}>✍️ Free Redesign</span>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8', cursor: 'pointer', marginRight: '10px' }}>
                <input 
                  type="checkbox" 
                  checked={viewChanges} 
                  onChange={e => setViewChanges(e.target.checked)}
                  style={{ width: '14px', height: '14px', accentColor: '#fde047' }}
                />
                View AI Changes
              </label>
              
              <button className="btn-secondary" onClick={handleCopyResume} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {copiedResume ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span style={{ color: '#34d399' }}>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Markdown renderer */}
          <div 
            dangerouslySetInnerHTML={{ __html: renderHighlightedMarkdown(tailoredResume) }}
            style={{
              padding: '24px',
              borderRadius: '12px',
              background: 'rgba(5, 8, 17, 0.4)',
              border: '1px solid rgba(71, 85, 105, 0.15)',
              maxHeight: '680px',
              overflowY: 'auto',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          />
        </div>
      )}

      {/* ATS Score tab content */}
      {activeTab === 'ats-score' && (
        <div className="animate-fade-in">
          <PickupScorePanel />
          <ATSScorePanel />
          <RecommendationEngine />
        </div>
      )}

      {/* Template Recommendations tab content */}
      {activeTab === 'templates' && (
        <div className="animate-fade-in">
          <TemplateRecommendationsPanel />
        </div>
      )}

      {/* PDF Preview tab content */}
      {activeTab === 'preview' && (
        <PDFPreviewPanel />
      )}

      {/* Cover Letter tab content */}
      {activeTab === 'cover-letter' && activeTailoredId && (
        <div className="animate-fade-in">
          {isGeneratingCoverLetter ? (
            <div className="glass" style={{ borderRadius: '20px', padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  border: '3px solid rgba(139, 92, 246, 0.15)',
                  borderTop: '3px solid #8b5cf6',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <p style={{ color: '#a5b4fc', fontWeight: 500 }}>Generating Cover Letter via Local LLM...</p>
                <p style={{ color: '#475569', fontSize: '13px' }}>Formatting structural layout</p>
              </div>
            </div>
          ) : coverLetterError ? (
            <div className="glass" style={{ borderRadius: '16px', padding: '24px', border: '1px solid rgba(239,68,68,0.2)' }}>
              <h4 style={{ color: '#fca5a5', fontWeight: 700, marginBottom: '8px' }}>Cover Letter Generation Failed</h4>
              <p style={{ color: '#cbd5e1', fontSize: '13px', marginBottom: '16px' }}>{coverLetterError}</p>
              <button className="btn-primary" onClick={generateCoverLetter} style={{ padding: '8px 16px', fontSize: '12px' }}>
                Retry Generation
              </button>
            </div>
          ) : coverLetter ? (
            <div className="glass animate-fade-in" style={{ borderRadius: '16px', padding: '28px', border: '1px solid rgba(139,92,246,0.2)' }}>
              {/* Action header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Custom Cover Letter</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Tailored to the job description</p>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" onClick={handleCopyLetter} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {copiedLetter ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span style={{ color: '#34d399' }}>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <span>Copy Markdown</span>
                      </>
                    )}
                  </button>
                  
                  <button className="btn-secondary" onClick={handleDownloadLetter} style={{ padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download .md
                  </button>
                </div>
              </div>

              {/* Markdown renderer */}
              <div 
                dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(coverLetter) }}
                style={{
                  padding: '24px',
                  borderRadius: '12px',
                  background: 'rgba(5, 8, 17, 0.4)',
                  border: '1px solid rgba(71, 85, 105, 0.15)',
                  maxHeight: '680px',
                  overflowY: 'auto',
                  lineHeight: 1.7,
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
              />
            </div>
          ) : (
            <div className="glass" style={{ borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
              <span style={{ fontSize: '28px', display: 'block', marginBottom: '12px' }}>✉️</span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#c7d2fe', marginBottom: '8px' }}>Generate Customized Cover Letter</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', maxWidth: '460px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                Use local AI to write a customized, high-impact cover letter mapping your tailored qualifications directly to this job description.
              </p>
              <button className="btn-primary" onClick={generateCoverLetter} style={{ padding: '10px 24px', fontSize: '14px' }}>
                Generate Cover Letter Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Original tab content */}
      {activeTab === 'original' && (
        <div className="animate-fade-in">
          {/* Job target card */}
          <div style={{
            padding: '18px 24px', borderRadius: '14px', marginBottom: '24px',
            background: 'linear-gradient(135deg, rgba(79,70,229,0.12), rgba(139,92,246,0.08))',
            border: '1px solid rgba(99,102,241,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target Role</span>
            </div>
            <p style={{ fontWeight: 700, color: '#c7d2fe', fontSize: '16px', marginBottom: '8px' }}>{jobTitle || 'No job title entered'}</p>
            {jobDescription && (
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                {jobDescription.substring(0, 200)}{jobDescription.length > 200 ? '…' : ''}
              </p>
            )}
            {!jobDescription && (
              <p style={{ fontSize: '13px', color: '#334155' }}>No job description entered. <button onClick={() => setCurrentStep(2)} style={{ background:'none', border:'none', color:'#818cf8', cursor:'pointer', textDecoration:'underline', fontSize:'13px'}}>Add one →</button></p>
            )}
          </div>

          {/* Trigger Tailoring Banner if not tailored yet */}
          {!tailoredResume && (
            <div style={{
              padding: '20px 24px', borderRadius: '14px', marginBottom: '28px',
              background: 'rgba(99,102,241,0.08)', border: '1px dashed rgba(99,102,241,0.3)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '24px' }}>🤖</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#a5b4fc', marginBottom: '2px' }}>AI Resume Tailoring Ready</p>
                  <p style={{ fontSize: '13px', color: '#64748b' }}>
                    Use local Ollama & Llama 3.2 to tailor this resume for your target role.
                  </p>
                </div>
              </div>
              <button className="btn-primary" style={{ padding: '10px 20px', fontSize: '13px' }} onClick={handleRetry}>
                Tailor Resume Now
              </button>
            </div>
          )}

          {/* Personal Info */}
          <Section title="Personal Information" icon="👤">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {[
                { label: 'Email', value: personal_info?.email },
                { label: 'Phone', value: personal_info?.phone },
                { label: 'LinkedIn', value: personal_info?.linkedin },
                { label: 'GitHub', value: personal_info?.github },
              ].map(item => (
                <div key={item.label}>
                  <span style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{item.label}</span>
                  <p style={{ fontSize: '14px', color: item.value ? '#e2e8f0' : '#334155', marginTop: '3px' }}>
                    {item.value || '—'}
                  </p>
                </div>
              ))}
            </div>
            {personal_info?.summary && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(51,65,85,0.4)' }}>
                <span style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Extracted Text Preview</span>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', lineHeight: 1.7, fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                  {personal_info.summary}
                </p>
              </div>
            )}
          </Section>

          {/* Skills */}
          {skills && skills.length > 0 && (
            <Section title={`Skills (${skills.length})`} icon="⚡">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {skills.map((s: string, i: number) => (
                  <span key={i} className="tag tag-indigo">{s}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Experience */}
          {experience && experience.length > 0 && (
            <Section title={`Work Experience (${experience.length})`} icon="💼">
              {experience.map((exp: any, i: number) => (
                <div key={i} style={{ paddingBottom: i < experience.length - 1 ? '16px' : 0, marginBottom: i < experience.length - 1 ? '16px' : 0, borderBottom: i < experience.length - 1 ? '1px solid rgba(51,65,85,0.3)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                    <div>
                      <p style={{ fontWeight: 600, color: '#c7d2fe', fontSize: '15px' }}>{exp.role}</p>
                      <p style={{ color: '#64748b', fontSize: '13px' }}>{exp.company}</p>
                    </div>
                    {(exp.start_date || exp.end_date) && (
                      <span className="tag tag-indigo" style={{ fontSize: '11px', alignSelf: 'flex-start' }}>
                        {exp.start_date} {exp.end_date ? `→ ${exp.end_date}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* Education */}
          {education && education.length > 0 && (
            <Section title={`Education (${education.length})`} icon="🎓">
              {education.map((edu: any, i: number) => (
                <div key={i} style={{ marginBottom: i < education.length - 1 ? '12px' : 0 }}>
                  <p style={{ fontWeight: 600, color: '#c7d2fe', fontSize: '14px' }}>{edu.degree} {edu.field_of_study ? `in ${edu.field_of_study}` : ''}</p>
                  <p style={{ color: '#64748b', fontSize: '13px' }}>{edu.institution}</p>
                </div>
              ))}
            </Section>
          )}

          {/* Projects */}
          {projects && projects.length > 0 && (
            <Section title={`Projects (${projects.length})`} icon="🚀">
              {projects.map((proj: any, i: number) => (
                <div key={i} style={{ marginBottom: i < projects.length - 1 ? '14px' : 0 }}>
                  <p style={{ fontWeight: 600, color: '#c7d2fe', fontSize: '14px' }}>{proj.name}</p>
                  {proj.description && <p style={{ color: '#64748b', fontSize: '13px', marginTop: '3px' }}>{proj.description}</p>}
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {proj.technologies.map((t: string, j: number) => <span key={j} className="tag tag-indigo" style={{ fontSize: '11px' }}>{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Certifications */}
          {certifications && certifications.length > 0 && (
            <Section title={`Certifications (${certifications.length})`} icon="🏆">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {certifications.map((c: string, i: number) => (
                  <span key={i} className="tag tag-amber">{c}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Empty state for all sections */}
          {!experience?.length && !education?.length && !skills?.length && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#334155' }}>
              <p style={{ fontSize: '14px', marginBottom: '8px' }}>📄 Basic extraction complete (Phase 1)</p>
              <p style={{ fontSize: '13px' }}>The Phase 1 parser extracts email, phone, and raw text only.<br/>Phase 2 will use Ollama to fully structure all sections.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
