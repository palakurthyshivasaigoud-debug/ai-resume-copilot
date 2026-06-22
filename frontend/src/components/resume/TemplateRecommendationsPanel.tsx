"use client";

import React from 'react';
import { useResumeStore, TemplateRecommendation } from '@/store/resumeStore';

const TEMPLATE_ICONS: Record<string, string> = {
  'Modern ATS': '⚡',
  'Minimal ATS': '🎯',
  'Corporate ATS': '🏢',
  'Executive ATS': '👔',
  'Software Engineer ATS': '💻',
  'Data Science ATS': '📊',
  'Product Manager ATS': '🗺️',
};

const TEMPLATE_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  'Modern ATS':           { bg: 'rgba(99,102,241,0.06)',  border: 'rgba(99,102,241,0.25)',  accent: '#818cf8' },
  'Minimal ATS':          { bg: 'rgba(52,211,153,0.06)',  border: 'rgba(52,211,153,0.25)',  accent: '#34d399' },
  'Corporate ATS':        { bg: 'rgba(251,191,36,0.06)',  border: 'rgba(251,191,36,0.2)',   accent: '#fbbf24' },
  'Executive ATS':        { bg: 'rgba(139,92,246,0.06)',  border: 'rgba(139,92,246,0.25)',  accent: '#a78bfa' },
  'Software Engineer ATS':{ bg: 'rgba(56,189,248,0.06)',  border: 'rgba(56,189,248,0.2)',   accent: '#38bdf8' },
  'Data Science ATS':     { bg: 'rgba(244,114,182,0.06)', border: 'rgba(244,114,182,0.2)',  accent: '#f472b6' },
  'Product Manager ATS':  { bg: 'rgba(251,146,60,0.06)',  border: 'rgba(251,146,60,0.2)',   accent: '#fb923c' },
};

function TemplateCard({ rec, index }: { rec: TemplateRecommendation; index: number }) {
  const colors = TEMPLATE_COLORS[rec.template_name] || {
    bg: 'rgba(99,102,241,0.06)',
    border: 'rgba(99,102,241,0.2)',
    accent: '#818cf8',
  };
  const icon = TEMPLATE_ICONS[rec.template_name] || '📄';

  return (
    <div
      className="animate-fade-in"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '22px 24px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        animationDelay: `${index * 0.08}s`,
        animationFillMode: 'both',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${colors.bg}`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
          background: colors.border, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: colors.accent, lineHeight: 1.3 }}>
            {rec.template_name}
          </h4>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Best for: {rec.best_for}</span>
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px',
          background: colors.border, color: colors.accent, flexShrink: 0,
        }}>
          {rec.ats_improvement_estimate}
        </span>
      </div>

      {/* Reason */}
      <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.65, marginBottom: '12px' }}>
        {rec.reason}
      </p>

      {/* Key Features */}
      {rec.key_features && rec.key_features.length > 0 && (
        <div>
          <p style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            Key Features
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {rec.key_features.map((feature, i) => (
              <li key={i} style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <span style={{ color: colors.accent, flexShrink: 0, marginTop: '1px' }}>›</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action note */}
      <div style={{
        marginTop: '14px', padding: '8px 12px', borderRadius: '8px',
        background: 'rgba(0,0,0,0.2)', fontSize: '11px', color: '#475569',
      }}>
        ℹ️ This is a recommendation only — your resume design is unchanged.
      </div>
    </div>
  );
}

export default function TemplateRecommendationsPanel() {
  const { templateRecommendations, parsedData, jobTitle, jobDescription, isLoadingTemplates } = useResumeStore();

  if (isLoadingTemplates) {
    return (
      <div className="glass animate-fade-in" style={{ borderRadius: '20px', padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            border: '3px solid rgba(99,102,241,0.1)',
            borderTop: '3px solid #6366f1',
            animation: 'spin 0.9s linear infinite',
          }} />
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>Generating template recommendations…</p>
        </div>
      </div>
    );
  }

  if (!templateRecommendations || templateRecommendations.recommendations.length === 0) {
    return (
      <div className="glass animate-fade-in" style={{ borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
        <span style={{ fontSize: '40px', display: 'block', marginBottom: '16px' }}>🎨</span>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#c7d2fe', marginBottom: '10px' }}>
          No Template Recommendations Yet
        </h3>
        <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.7 }}>
          Enable the <strong style={{ color: '#a5b4fc' }}>Recommend ATS Templates</strong> toggle on the Job Details step
          and re-generate to receive personalised template suggestions.
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '10px 20px', borderRadius: '10px',
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          fontSize: '13px', color: '#a5b4fc',
        }}>
          ← Go to Step 2 and enable the toggle
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="glass" style={{ borderRadius: '16px', padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🎨</span>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
              ATS Template Recommendations
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Based on your profile and target role. These are suggestions only — your resume design remains unchanged.
            </p>
          </div>
        </div>

        {/* Current format assessment */}
        {templateRecommendations.current_format_assessment && (
          <div style={{
            marginTop: '14px', padding: '12px 16px', borderRadius: '10px',
            background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)',
            fontSize: '13px', color: '#7dd3fc', lineHeight: 1.6,
          }}>
            <strong>Current Format Assessment:</strong> {templateRecommendations.current_format_assessment}
          </div>
        )}
      </div>

      {/* Template cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '16px',
      }}>
        {templateRecommendations.recommendations.map((rec, i) => (
          <TemplateCard key={rec.template_name} rec={rec} index={i} />
        ))}
      </div>

      {/* Footer note */}
      <div className="glass-light" style={{
        borderRadius: '12px', padding: '14px 18px', marginTop: '20px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <span style={{ fontSize: '16px', flexShrink: 0 }}>ℹ️</span>
        <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
          Selecting a template here does <strong style={{ color: '#64748b' }}>not</strong> automatically apply it.
          These recommendations guide what format could further improve your ATS score in future resume versions.
          PDF export using your preserved original design is always available.
        </p>
      </div>
    </div>
  );
}
