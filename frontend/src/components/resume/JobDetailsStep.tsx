"use client";

import { useResumeStore } from '@/store/resumeStore';

/* ── Toggle Component ── */
function Toggle({
  id, checked, onChange, label, sublabel,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel: string;
}) {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        cursor: 'pointer', userSelect: 'none',
        padding: '14px 18px', borderRadius: '12px',
        background: checked ? 'rgba(79,70,229,0.1)' : 'rgba(15,23,42,0.5)',
        border: `1px solid ${checked ? 'rgba(99,102,241,0.4)' : 'rgba(51,65,85,0.4)'}`,
        transition: 'all 0.2s',
      }}
    >
      {/* Track */}
      <div
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative', width: '40px', height: '22px',
          borderRadius: '11px', flexShrink: 0, marginTop: '1px',
          background: checked
            ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
            : 'rgba(51,65,85,0.8)',
          transition: 'background 0.25s',
          boxShadow: checked ? '0 0 12px rgba(79,70,229,0.4)' : 'none',
        }}
      >
        <div style={{
          position: 'absolute', top: '3px',
          left: checked ? '21px' : '3px',
          width: '16px', height: '16px',
          borderRadius: '50%', background: '#fff',
          transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
        />
      </div>

      <div>
        <p style={{ fontSize: '14px', fontWeight: 600, color: checked ? '#c7d2fe' : '#94a3b8', lineHeight: 1.3 }}>
          {label}
        </p>
        <p style={{ fontSize: '12px', color: '#475569', marginTop: '3px', lineHeight: 1.5 }}>
          {sublabel}
        </p>
      </div>
    </label>
  );
}

/* ── Main Component ── */
export default function JobDetailsStep() {
  const {
    uploadedFileName, parsedData,
    jobTitle, jobDescription,
    setJobTitle, setJobDescription,
    setCurrentStep,
    preserveDesign, setPreserveDesign,
    recommendTemplates, setRecommendTemplates,
    tailorWithOptions,
    isTailoring,
  } = useResumeStore();

  const canProceed = jobTitle.trim().length > 2 && jobDescription.trim().length > 20;
  const charCount = jobDescription.length;

  const handleGenerate = async () => {
    if (!parsedData?.id || !canProceed || isTailoring) return;
    await tailorWithOptions();
  };

  return (
    <div className="animate-fade-in">
      {/* Uploaded file confirmation banner */}
      {uploadedFileName && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 20px', borderRadius: '14px', marginBottom: '24px',
          background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'rgba(52,211,153,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#34d399' }}>Resume uploaded successfully</p>
            <p style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{uploadedFileName}</p>
          </div>
          {parsedData?.parsed_data?.personal_info?.email && (
            <span className="tag tag-green">{parsedData.parsed_data.personal_info.email}</span>
          )}
        </div>
      )}

      {/* Main card */}
      <div className="glass" style={{ borderRadius: '20px', padding: '40px', marginBottom: '20px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
            Target Job Details
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Tell us what role you're applying for. The more detail you provide, the better the tailored output.
          </p>
        </div>

        {/* Job Title */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Job Title *
          </label>
          <input
            className="input-field"
            type="text"
            placeholder="e.g. Senior Frontend Engineer at Stripe"
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            maxLength={120}
          />
        </div>

        {/* Job Description */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Job Description *
            </label>
            <span style={{ fontSize: '12px', color: charCount > 100 ? '#64748b' : '#334155' }}>
              {charCount.toLocaleString()} chars
              {charCount > 100 && <span style={{ color: '#34d399', marginLeft: '6px' }}>✓ Good length</span>}
            </span>
          </div>
          <textarea
            className="input-field"
            placeholder="Paste the full job description here — responsibilities, requirements, nice-to-haves, tech stack, company info..."
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            rows={12}
            style={{ minHeight: '280px', lineHeight: 1.7 }}
          />
          <p style={{ fontSize: '12px', color: '#334155', marginTop: '8px' }}>
            💡 Tip: Include the full JD with requirements and tech stack for the best results.
          </p>
        </div>
      </div>

      {/* ── AI Behaviour Toggles ─────────────────────────────────────────── */}
      <div className="glass" style={{ borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
          AI Tailoring Options
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Toggle
            id="preserve-design"
            checked={preserveDesign}
            onChange={setPreserveDesign}
            label="✓ Preserve Original Resume Design"
            sublabel="AI will only update text content — no layout, section order, or formatting changes."
          />
          <Toggle
            id="recommend-templates"
            checked={recommendTemplates}
            onChange={setRecommendTemplates}
            label="□ Suggest ATS Templates"
            sublabel="AI will suggest alternative ATS-friendly templates. Does not replace your resume design."
          />
        </div>

        {preserveDesign && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)',
            fontSize: '12px', color: '#34d399',
          }}>
            🔒 Layout Preserved — AI will only update: Summary, experience bullets, project descriptions, skills wording.
          </div>
        )}
        {!preserveDesign && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
            fontSize: '12px', color: '#fbbf24',
          }}>
            ⚠ Free Redesign Mode — AI may restructure, reorder, and reformat your resume for maximum ATS fit.
          </div>
        )}
      </div>

      {/* Quick tips */}
      <div className="glass-light" style={{ borderRadius: '16px', padding: '20px 24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          What happens next
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { icon: '🔍', text: 'Keyword extraction from JD' },
            { icon: '🎯', text: 'Match your skills to requirements' },
            { icon: preserveDesign ? '🔒' : '✍️', text: preserveDesign ? 'Text-only updates (layout locked)' : 'Rewrite bullets for ATS' },
            { icon: recommendTemplates ? '🎨' : '📄', text: recommendTemplates ? 'Generate template recommendations' : 'Generate tailored resume' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px' }}>{item.icon}</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
        <button className="btn-secondary" onClick={() => setCurrentStep(1)}>
          ← Back
        </button>
        <button
          className="btn-primary"
          disabled={!canProceed || isTailoring}
          onClick={handleGenerate}
          style={{ flex: 1, maxWidth: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {isTailoring ? (
            <>
              <div className="spinner" style={{ width: '16px', height: '16px' }} />
              Tailoring...
            </>
          ) : canProceed ? (
            <>
              {preserveDesign ? '🔒' : '✍️'} Analyze & Generate
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </>
          ) : 'Fill in title & description →'}
        </button>
      </div>
    </div>
  );
}
