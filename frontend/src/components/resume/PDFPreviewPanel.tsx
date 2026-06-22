"use client";

import React from 'react';
import { useResumeStore } from '@/store/resumeStore';

export default function PDFPreviewPanel() {
  const { 
    previewUrl, 
    downloadUrl, 
    isGeneratingPDF, 
    pdfError, 
    generatePDFPreview 
  } = useResumeStore();

  return (
    <div className="animate-fade-in glass" style={{ borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>High-Fidelity PDF Preview</h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Verify your layout and text before downloading the final ATS-optimized PDF.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {!previewUrl ? (
            <button 
              className="btn-primary" 
              onClick={generatePDFPreview} 
              disabled={isGeneratingPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isGeneratingPDF ? (
                <>
                  <div className="spinner" style={{ width: '14px', height: '14px', borderTopColor: '#fff' }} />
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  Generate PDF Preview
                </>
              )}
            </button>
          ) : (
            <>
              <button 
                className="btn-secondary" 
                onClick={generatePDFPreview} 
                disabled={isGeneratingPDF}
              >
                Regenerate
              </button>
              <a 
                href={downloadUrl || '#'} 
                download
                className="btn-primary" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Approve & Download PDF
              </a>
            </>
          )}
        </div>
      </div>

      {pdfError && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '13px' }}>
          <strong>Error: </strong> {pdfError}
        </div>
      )}

      {/* PDF Viewer */}
      <div style={{ 
        width: '100%', 
        height: '75vh', 
        minHeight: '600px',
        backgroundColor: '#1e293b', 
        borderRadius: '12px', 
        overflow: 'hidden',
        border: '1px solid rgba(148,163,184,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {!previewUrl && !isGeneratingPDF && (
          <div style={{ textAlign: 'center', color: '#64748b' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p>Click "Generate PDF Preview" to render your preserved document.</p>
          </div>
        )}

        {isGeneratingPDF && (
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 16px', borderTopColor: '#6366f1' }} />
            <p>Processing High-Fidelity PDF...</p>
          </div>
        )}

        {previewUrl && !isGeneratingPDF && (
          <iframe 
            src={`${previewUrl}#toolbar=1&navpanes=0&scrollbar=1`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="PDF Preview"
          />
        )}
      </div>
    </div>
  );
}
