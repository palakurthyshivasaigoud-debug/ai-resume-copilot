import { useState } from 'react';
import { useResumeStore } from '@/store/resumeStore';

export default function RecommendationEngine() {
  const { recommendations, isTailoring } = useResumeStore();
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Normalize: backend may return an object or null instead of an array
  const recsArray = Array.isArray(recommendations) ? recommendations : [];

  if (!recsArray || recsArray.length === 0) return null;

  const toggleSelection = (idx: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedIndices(newSet);
  };

  const handleApply = () => {
    // Future expansion: call the apply-recommendations backend API
    alert("Applying selected recommendations... (This will trigger the AI to re-tailor with the selected improvements)");
  };

  return (
    <div className="glass" style={{ padding: '24px', marginTop: '20px', borderRadius: '16px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' }}>
        Recommended ATS Improvements
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
        {recsArray.map((rec, idx) => (
          <div 
            key={idx} 
            style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '8px', 
              padding: '16px',
              display: 'flex',
              gap: '12px',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onClick={() => toggleSelection(idx)}
            className="hover-highlight"
          >
            <div style={{ paddingTop: '2px' }}>
              <input 
                type="checkbox" 
                checked={selectedIndices.has(idx)} 
                onChange={() => {}} 
                style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{rec.title}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                  {rec.impact}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                <span style={{ display: 'inline-block', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginRight: '8px' }}>{rec.type}</span>
                {rec.category}
              </div>
              
              {rec.current && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(248,113,113,0.05)', borderLeft: '2px solid #f87171', fontSize: '12px', color: '#cbd5e1' }}>
                  <span style={{ color: '#f87171', display: 'block', marginBottom: '2px', fontSize: '10px', textTransform: 'uppercase' }}>Current</span>
                  {rec.current}
                </div>
              )}
              {rec.improved && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(52,211,153,0.05)', borderLeft: '2px solid #34d399', fontSize: '12px', color: '#cbd5e1' }}>
                  <span style={{ color: '#34d399', display: 'block', marginBottom: '2px', fontSize: '10px', textTransform: 'uppercase' }}>Improved / Suggestion</span>
                  {rec.improved}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
          {selectedIndices.size} of {recsArray.length} selected
        </span>
        <button 
          className="btn-primary" 
          disabled={selectedIndices.size === 0 || isTailoring}
          onClick={handleApply}
          style={{ padding: '10px 20px', fontSize: '13px' }}
        >
          {isTailoring ? 'Applying...' : 'Apply Selected Improvements'}
        </button>
      </div>
    </div>
  );
}
