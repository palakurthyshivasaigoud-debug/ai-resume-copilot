"use client";

import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useResumeStore } from '@/store/resumeStore';

const ACCEPTED = ['.pdf', '.docx', '.md', '.txt'];

export default function UploadStep() {
  const [dragActive, setDragActive] = useState(false);
  const { 
    isUploading, uploadError, setUploading, setError, setParsedData,
    savedResumes, fetchSavedResumes, deleteSavedResume 
  } = useResumeStore();

  useEffect(() => {
    fetchSavedResumes();
  }, [fetchSavedResumes]);

  const processFile = useCallback(async (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      setError(`Unsupported file type "${ext}". Please upload a PDF, DOCX, MD, or TXT file.`);
      return;
    }
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('http://localhost:8000/resume/upload', formData);
      setParsedData(res.data, file.name);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Upload failed. Is the backend running?');
    } finally {
      setUploading(false);
    }
  }, [setUploading, setError, setParsedData]);

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  return (
    <div className="animate-fade-in">
      {/* Main card */}
      <div className="glass" style={{ borderRadius: '20px', padding: '40px', marginBottom: '24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
            Upload Your Master Resume
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            This is your comprehensive resume. We'll parse and store all your experience, skills, and achievements.
          </p>
        </div>

        {/* Drop zone */}
        <label
          className={`upload-zone ${dragActive ? 'active' : ''}`}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '56px 24px', cursor: isUploading ? 'not-allowed' : 'pointer',
          }}
          onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
        >
          <input
            type="file"
            accept={ACCEPTED.join(',')}
            style={{ display: 'none' }}
            onChange={onChange}
            disabled={isUploading}
          />

          {isUploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                border: '3px solid rgba(79,70,229,0.2)',
                borderTop: '3px solid #6366f1',
                animation: 'spin 0.8s linear infinite',
              }} />
              <p style={{ color: '#a5b4fc', fontWeight: 500 }}>Parsing your resume…</p>
              <p style={{ color: '#475569', fontSize: '13px' }}>Extracting text and structure</p>
            </div>
          ) : (
            <>
              {/* Upload icon with glow */}
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '20px', transition: 'all 0.3s',
                boxShadow: dragActive ? '0 0 40px rgba(79,70,229,0.3)' : 'none',
              }} className={dragActive ? 'animate-float' : ''}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                  stroke={dragActive ? '#818cf8' : '#6366f1'} strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>

              <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#c7d2fe', marginBottom: '8px' }}>
                {dragActive ? 'Drop it here!' : 'Drag & drop your resume'}
              </h3>
              <p style={{ color: '#475569', fontSize: '14px', marginBottom: '20px' }}>
                or click to browse your files
              </p>

              <div className="btn-primary" style={{ pointerEvents: 'none', padding: '10px 24px', fontSize: '14px' }}>
                Browse Files
              </div>

              <p style={{ color: '#334155', fontSize: '12px', marginTop: '16px' }}>
                Supports PDF, DOCX, Markdown, TXT
              </p>
            </>
          )}
        </label>

        {/* Error */}
        {uploadError && (
          <div style={{
            marginTop: '16px', padding: '14px 18px', borderRadius: '12px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'flex-start', gap: '12px',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ color: '#fca5a5', fontSize: '14px' }}>{uploadError}</p>
          </div>
        )}
      </div>

      {/* Previously Uploaded Master Resumes List */}
      {savedResumes && savedResumes.length > 0 && (
        <div className="glass animate-fade-in" style={{ borderRadius: '20px', padding: '24px 32px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Select from saved master resumes:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {savedResumes.map((resume) => (
              <div 
                key={resume.id} 
                className="glass-light hover-glow" 
                style={{ 
                  borderRadius: '12px', 
                  padding: '12px 18px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  border: '1px solid rgba(255,255,255,0.02)',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ flex: 1, minWidth: '0', marginRight: '16px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#c7d2fe', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    📄 {resume.filename}
                  </p>
                  {resume.parsed_data?.personal_info?.email && (
                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {resume.parsed_data.personal_info.email}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button 
                    className="btn-primary" 
                    onClick={() => setParsedData(resume, resume.filename)}
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    Select
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={() => deleteSavedResume(resume.id)}
                    style={{ 
                      padding: '6px 12px', 
                      fontSize: '12px',
                      borderColor: 'rgba(239,68,68,0.2)',
                      color: '#fca5a5',
                      background: 'rgba(239,68,68,0.05)'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { icon: '🔒', title: 'Fully Private', desc: 'Files stay on your machine' },
          { icon: '⚡', title: 'Instant Parse', desc: 'Email, phone & text extracted' },
          { icon: '🤖', title: 'AI-Ready', desc: 'Ollama integration in Phase 2' },
        ].map(card => (
          <div key={card.title} className="glass-light" style={{ borderRadius: '14px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{card.icon}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#c7d2fe', marginBottom: '4px' }}>{card.title}</div>
            <div style={{ fontSize: '12px', color: '#475569' }}>{card.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
