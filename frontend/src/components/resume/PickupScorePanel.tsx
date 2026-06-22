import { useResumeStore } from '@/store/resumeStore';

export default function PickupScorePanel() {
  const { pickupScore, isCalculatingATS } = useResumeStore();

  if (isCalculatingATS) {
    return (
      <div className="glass" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', borderRadius: '16px' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        Calculating Resume Pickup Score...
      </div>
    );
  }

  if (!pickupScore) return null;

  return (
    <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em' }}>
            Resume Pickup Score
          </h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Combined probability of ATS and Recruiter shortlist.
          </p>
        </div>
        <div style={{
          fontSize: '32px', fontWeight: 800, color: pickupScore.overall_score >= 80 ? '#34d399' : pickupScore.overall_score >= 60 ? '#fbbf24' : '#f87171',
        }}>
          {pickupScore.overall_score}
          <span style={{ fontSize: '16px', color: '#64748b' }}>/100</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.entries(pickupScore.metrics).map(([key, value]) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
              <span style={{ color: '#cbd5e1' }}>{key}</span>
              <span style={{ fontWeight: 600, color: value >= 80 ? '#34d399' : value >= 60 ? '#fbbf24' : '#f87171' }}>
                {value}/100
              </span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${value}%`,
                  background: value >= 80 ? '#34d399' : value >= 60 ? '#fbbf24' : '#f87171',
                  transition: 'width 1s ease-in-out'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
