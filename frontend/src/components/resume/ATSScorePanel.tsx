"use client";

import React, { useEffect, useState } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import type { ATSScoreData, ATSBreakdownItem } from '@/store/resumeStore';

/* ── Circular Gauge ─────────────────────────────────────────────────────── */
function ScoreGauge({ score, size = 160 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? '#34d399'
    : score >= 60 ? '#fbbf24'
    : score >= 40 ? '#fb923c'
    : '#f87171';

  const glow =
    score >= 80 ? 'rgba(52,211,153,0.35)'
    : score >= 60 ? 'rgba(251,191,36,0.3)'
    : score >= 40 ? 'rgba(251,146,60,0.3)'
    : 'rgba(248,113,113,0.3)';

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 12px ${glow})` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '38px', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {Math.round(score)}
        </span>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
          ATS Score
        </span>
      </div>
    </div>
  );
}

/* ── Horizontal Bar ──────────────────────────────────────────────────────── */
function BreakdownBar({ label, item, icon }: { label: string; item: ATSBreakdownItem; icon: string }) {
  const color =
    item.score >= 70 ? '#34d399'
    : item.score >= 45 ? '#fbbf24'
    : '#f87171';

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>{icon}</span> {label}
          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 400 }}>({item.weight}%)</span>
        </span>
        <span style={{ fontSize: '14px', fontWeight: 700, color }}>{Math.round(item.score)}%</span>
      </div>
      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(item.score, 100)}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          borderRadius: '3px',
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function ATSScorePanel() {
  const {
    atsScore, isCalculatingATS, atsError,
    fetchATSScore, parsedData, jobDescription,
  } = useResumeStore();

  const [expanded, setExpanded] = useState<string | null>(null);

  // Auto-fetch when component mounts if we have data and no score yet
  useEffect(() => {
    if (parsedData?.id && jobDescription && !atsScore && !isCalculatingATS && !atsError) {
      fetchATSScore(true);
    }
  }, [parsedData, jobDescription]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Loading state ── */
  if (isCalculatingATS) {
    return (
      <div className="glass animate-fade-in" style={{ borderRadius: '20px', padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative', width: '72px', height: '72px' }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '4px solid rgba(99,102,241,0.12)',
              borderTop: '4px solid #6366f1',
              animation: 'spin 1s linear infinite',
            }} />
            <div style={{
              position: 'absolute', inset: '8px', borderRadius: '50%',
              border: '4px solid rgba(139,92,246,0.1)',
              borderBottom: '4px solid #8b5cf6',
              animation: 'spin 1.3s linear infinite reverse',
            }} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
              Analyzing ATS Compatibility
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Scoring keywords, skills, experience, education & formatting…
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (atsError) {
    return (
      <div className="glass animate-fade-in" style={{ borderRadius: '16px', padding: '24px', border: '1px solid rgba(239,68,68,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fca5a5', marginBottom: '4px' }}>ATS Scoring Failed</h4>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>{atsError}</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => fetchATSScore(false)} style={{ padding: '8px 18px', fontSize: '13px' }}>
          Retry (without LLM)
        </button>
      </div>
    );
  }

  /* ── No data yet ── */
  if (!atsScore) {
    return (
      <div className="glass animate-fade-in" style={{ borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
        <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>📊</span>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#c7d2fe', marginBottom: '8px' }}>ATS Compatibility Analysis</h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.6 }}>
          Calculate how well your resume matches the job description across five ATS dimensions.
        </p>
        <button className="btn-primary" onClick={() => fetchATSScore(true)} style={{ padding: '10px 24px', fontSize: '14px' }}>
          Calculate ATS Score
        </button>
      </div>
    );
  }

  /* ── Score display ── */
  const { score, breakdown, strengths, weaknesses, skill_gap, llm_enhanced } = atsScore;
  const verdict =
    score >= 80 ? { label: 'Excellent', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' }
    : score >= 60 ? { label: 'Good', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' }
    : score >= 40 ? { label: 'Fair', color: '#fb923c', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.15)' }
    : { label: 'Needs Work', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.15)' };

  return (
    <div className="animate-fade-in">
      {/* ── Top Score Card ── */}
      <div className="glass" style={{ borderRadius: '20px', padding: '32px', marginBottom: '20px', border: `1px solid ${verdict.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
          <ScoreGauge score={score} />

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '18px', fontWeight: 800, color: verdict.color,
              }}>{verdict.label}</span>
              {llm_enhanced && (
                <span className="tag tag-indigo" style={{ fontSize: '10px', padding: '2px 8px' }}>
                  🤖 AI-Enhanced
                </span>
              )}
            </div>

            {/* Breakdown bars */}
            <BreakdownBar label="Keywords" item={breakdown.keyword_match} icon="🔑" />
            <BreakdownBar label="Skills" item={breakdown.skills_match} icon="⚡" />
            <BreakdownBar label="Experience" item={breakdown.experience_relevance} icon="💼" />
            <BreakdownBar label="Education" item={breakdown.education_match} icon="🎓" />
            <BreakdownBar label="Formatting" item={breakdown.formatting} icon="📋" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => fetchATSScore(false)} style={{ padding: '6px 14px', fontSize: '12px' }}>
            ↻ Recalculate (Fast)
          </button>
          <button className="btn-secondary" onClick={() => fetchATSScore(true)} style={{ padding: '6px 14px', fontSize: '12px' }}>
            ↻ Recalculate with AI
          </button>
        </div>
      </div>

      {/* ── Strengths & Weaknesses ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Strengths */}
        <div className="glass" style={{ borderRadius: '16px', padding: '20px 24px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ✓ Strengths
          </h4>
          {strengths.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {strengths.map((s, i) => (
                <li key={i} style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.7, display: 'flex', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ color: '#34d399', flexShrink: 0 }}>•</span>
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '13px', color: '#334155' }}>No notable strengths detected.</p>
          )}
        </div>

        {/* Weaknesses */}
        <div className="glass" style={{ borderRadius: '16px', padding: '20px 24px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⚠ Areas to Improve
          </h4>
          {weaknesses.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {weaknesses.map((w, i) => (
                <li key={i} style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.7, display: 'flex', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ color: '#fbbf24', flexShrink: 0 }}>•</span>
                  {w}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '13px', color: '#334155' }}>No weaknesses detected — great job!</p>
          )}
        </div>
      </div>

      {/* ── Skill Gap Analysis ── */}
      {skill_gap && (skill_gap.matched.length > 0 || skill_gap.missing.length > 0 || skill_gap.recommended_learning.length > 0) && (
        <div className="glass" style={{ borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <span style={{ fontSize: '16px' }}>🎯</span>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#c7d2fe' }}>Skill Gap Analysis</h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            {/* Matched */}
            <div>
              <span style={{ fontSize: '11px', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                ✓ Matched ({skill_gap.matched.length})
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {skill_gap.matched.slice(0, 15).map((s, i) => (
                  <span key={i} className="tag tag-green" style={{ fontSize: '11px', padding: '2px 8px' }}>{s}</span>
                ))}
                {skill_gap.matched.length === 0 && <span style={{ fontSize: '12px', color: '#334155' }}>—</span>}
              </div>
            </div>

            {/* Missing */}
            <div>
              <span style={{ fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                ⚠ Missing ({skill_gap.missing.length})
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {skill_gap.missing.slice(0, 15).map((s, i) => (
                  <span key={i} className="tag tag-amber" style={{ fontSize: '11px', padding: '2px 8px' }}>{s}</span>
                ))}
                {skill_gap.missing.length === 0 && <span style={{ fontSize: '12px', color: '#334155' }}>—</span>}
              </div>
            </div>

            {/* Recommended */}
            <div>
              <span style={{ fontSize: '11px', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                📚 Learn Next ({skill_gap.recommended_learning.length})
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {skill_gap.recommended_learning.slice(0, 10).map((s, i) => (
                  <span key={i} className="tag tag-indigo" style={{ fontSize: '11px', padding: '2px 8px' }}>{s}</span>
                ))}
                {skill_gap.recommended_learning.length === 0 && <span style={{ fontSize: '12px', color: '#334155' }}>—</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Detailed Keyword Breakdown (Expandable) ── */}
      <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <button
          onClick={() => setExpanded(expanded === 'keywords' ? null : 'keywords')}
          style={{
            width: '100%', padding: '16px 24px',
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            color: '#c7d2fe',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔍 Detailed Keyword Breakdown
          </span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded === 'keywords' ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {expanded === 'keywords' && (
          <div style={{ padding: '0 24px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }} className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#34d399', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  ✓ Matched Keywords ({breakdown.keyword_match.matched?.length || 0})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(breakdown.keyword_match.matched || []).map((k, i) => (
                    <span key={i} className="tag tag-green" style={{ fontSize: '10px', padding: '1px 7px' }}>{k}</span>
                  ))}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  ⚠ Missing Keywords ({breakdown.keyword_match.missing?.length || 0})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(breakdown.keyword_match.missing || []).map((k, i) => (
                    <span key={i} className="tag tag-amber" style={{ fontSize: '10px', padding: '1px 7px' }}>{k}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Skills match details */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: '11px', color: '#818cf8', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                ⚡ Your Skills in JD ({breakdown.skills_match.matched?.length || 0})
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {(breakdown.skills_match.matched || []).map((k, i) => (
                  <span key={i} className="tag tag-indigo" style={{ fontSize: '10px', padding: '1px 7px' }}>{k}</span>
                ))}
                {(breakdown.skills_match.matched || []).length === 0 && (
                  <span style={{ fontSize: '12px', color: '#334155' }}>No direct skill matches found</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
