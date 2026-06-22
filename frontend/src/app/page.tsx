"use client";

import React, { useState, useEffect } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import UploadStep from '@/components/resume/UploadStep';
import JobDetailsStep from '@/components/resume/JobDetailsStep';
import ResultsStep from '@/components/resume/ResultsStep';

const STEPS = [
  { id: 1, label: "Upload Resume" },
  { id: 2, label: "Job Details" },
  { id: 3, label: "Results" },
];

export default function Home() {
  const [activeView, setActiveView] = useState<'new' | 'history'>('new');
  const { currentStep, reset, fetchHistory, history, deleteHistoryItem, selectHistoryItem } = useResumeStore();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSelectHistory = (item: any) => {
    selectHistoryItem(item);
    setActiveView('new');
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-mesh min-h-screen">
      {/* Ambient blobs */}
      <div style={{
        position: 'fixed', top: '-10%', left: '-5%', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: '-10%', right: '-5%', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '860px', margin: '0 auto', padding: '0 24px 80px' }}>

        {/* ── Header ── */}
        <header style={{ textAlign: 'center', paddingTop: '50px', paddingBottom: '32px' }} className="animate-fade-up">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(79,70,229,0.4)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#a5b4fc', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              AI Resume Copilot
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '16px', letterSpacing: '-0.02em' }}>
            <span className="gradient-text">Tailor Your Resume</span>
            <br />
            <span style={{ color: '#e2e8f0' }}>to Any Job, Instantly</span>
          </h1>
          
          {/* Navigation segment controls */}
          <div style={{ 
            display: 'inline-flex', 
            background: 'rgba(15, 23, 42, 0.6)', 
            border: '1px solid rgba(255,255,255,0.05)', 
            padding: '4px', 
            borderRadius: '12px',
            marginTop: '24px'
          }}>
            <button 
              onClick={() => setActiveView('new')}
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                color: activeView === 'new' ? '#ffffff' : '#64748b',
                background: activeView === 'new' ? 'rgba(79, 70, 229, 0.4)' : 'none',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeView === 'new' ? '0 4px 12px rgba(79,70,229,0.2)' : 'none'
              }}
            >
              🚀 Tailoring Workspace
            </button>
            <button 
              onClick={() => {
                fetchHistory();
                setActiveView('history');
              }}
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                color: activeView === 'history' ? '#ffffff' : '#64748b',
                background: activeView === 'history' ? 'rgba(79, 70, 229, 0.4)' : 'none',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeView === 'history' ? '0 4px 12px rgba(79,70,229,0.2)' : 'none'
              }}
            >
              📂 Saved Applications ({history.length})
            </button>
          </div>
        </header>

        {activeView === 'history' ? (
          <div className="glass animate-fade-in" style={{ borderRadius: '20px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0' }}>Saved Job Applications</h2>
              <span className="tag tag-indigo">{history.length} Applications</span>
            </div>

            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569' }}>
                <p style={{ fontSize: '14px', marginBottom: '16px' }}>No saved applications found yet.</p>
                <button className="btn-primary" onClick={() => setActiveView('new')} style={{ padding: '8px 20px', fontSize: '13px' }}>
                  Create New Tailored Resume
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {history.map((item) => {
                  const totalKeywords = (item.matched_keywords?.length || 0) + (item.missing_keywords?.length || 0);
                  const matchRate = totalKeywords > 0 
                    ? Math.round(((item.matched_keywords?.length || 0) / totalKeywords) * 100)
                    : 0;

                  return (
                    <div 
                      key={item.id} 
                      className="glass-light" 
                      style={{ 
                        borderRadius: '16px', 
                        padding: '18px 22px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        flexWrap: 'wrap', 
                        gap: '16px',
                        border: '1px solid rgba(255,255,255,0.03)'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#c7d2fe' }}>{item.job_title}</h3>
                          {item.cover_letter_md && (
                            <span className="tag tag-green" style={{ fontSize: '10px', padding: '1px 6px' }}>Cover Letter</span>
                          )}
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b' }}>
                          File: <span style={{ color: '#94a3b8' }}>{item.resume_filename}</span> · {formatDate(item.created_at)}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {totalKeywords > 0 && (
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '18px', fontWeight: 800, color: matchRate > 70 ? '#34d399' : matchRate > 40 ? '#fbbf24' : '#f87171' }}>{matchRate}%</span>
                            <span style={{ fontSize: '10px', color: '#475569', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Match</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-primary" onClick={() => handleSelectHistory(item)} style={{ padding: '6px 14px', fontSize: '12px' }}>
                            Open
                          </button>
                          <button 
                            className="btn-secondary" 
                            onClick={() => deleteHistoryItem(item.id)}
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* ── Step Indicator ── */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }} className="animate-fade-up-delay">
              {STEPS.map((step, i) => {
                const isDone = currentStep > step.id;
                const isActive = currentStep === step.id;
                return (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'unset' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className={`step-badge ${isActive ? 'step-active' : isDone ? 'step-done' : 'step-inactive'}`}>
                        {isDone ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : step.id}
                      </div>
                      <span style={{
                        fontSize: '13px', fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#c7d2fe' : isDone ? '#34d399' : '#475569',
                        whiteSpace: 'nowrap',
                      }}>
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{
                        flex: 1, height: '1px', margin: '0 12px',
                        background: isDone
                          ? 'linear-gradient(90deg, rgba(52,211,153,0.4), rgba(52,211,153,0.1))'
                          : 'rgba(51,65,85,0.5)',
                        transition: 'background 0.4s',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Step Content ── */}
            <div className="animate-fade-up-delay-2">
              {currentStep === 1 && <UploadStep />}
              {currentStep === 2 && <JobDetailsStep />}
              {currentStep === 3 && <ResultsStep />}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <footer style={{ textAlign: 'center', marginTop: '60px' }}>
          <p style={{ fontSize: '13px', color: '#334155' }}>
            AI Resume Copilot · Runs entirely on your machine · Built with FastAPI + Next.js
          </p>
          {currentStep > 1 && activeView === 'new' && (
            <button
              onClick={reset}
              style={{ marginTop: '12px', background: 'none', border: 'none', color: '#475569', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Start over
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
