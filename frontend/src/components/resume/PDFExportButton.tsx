"use client";

import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// We dynamically import html2pdf to avoid SSR issues with the window object
const getHtml2Pdf = async () => {
  const html2pdf = (await import('html2pdf.js')).default;
  return html2pdf;
};

interface PDFExportButtonProps {
  markdown: string;
  filename?: string;
  buttonText?: string;
  className?: string;
}

export default function PDFExportButton({
  markdown,
  filename = 'Tailored_Resume.pdf',
  buttonText = 'Export Preserved PDF',
  className = 'btn-primary'
}: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!printRef.current) return;
    
    setIsExporting(true);
    try {
      const html2pdf = await getHtml2Pdf();
      
      const element = printRef.current;
      
      const opt = {
        margin:       [0.4, 0.4, 0.4, 0.4], // inches (matches standard resume margins)
        filename:     filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      // Temporarily make it visible for html2pdf rendering
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';
      
      await html2pdf().set(opt).from(element).save();
      
      // Hide again
      element.style.display = 'none';
      
    } catch (err) {
      console.error("PDF Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button 
        className={className} 
        onClick={handleExport} 
        disabled={isExporting}
        style={{ padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        {isExporting ? (
          <div className="spinner" style={{ width: '14px', height: '14px', borderTopColor: '#fff' }} />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        )}
        {isExporting ? 'Generating PDF...' : buttonText}
      </button>

      {/* Hidden container formatted specifically for ATS standard resume PDF export */}
      <div 
        ref={printRef} 
        style={{ 
          display: 'none', 
          width: '800px', // Standard A4-ish width for accurate text rendering 
          background: 'white', 
          color: 'black', 
          padding: '20px', // Internal padding within the PDF
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
        }}
      >
        <div className="resume-pdf-content" style={{
          color: '#000',
          fontSize: '11pt',
          lineHeight: '1.4'
        }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdown}
          </ReactMarkdown>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .resume-pdf-content h1 {
          font-size: 20pt;
          font-weight: bold;
          text-align: center;
          margin-bottom: 4px;
          border-bottom: none;
          color: #000;
        }
        .resume-pdf-content h2 {
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          border-bottom: 1px solid #000;
          margin-top: 16px;
          margin-bottom: 8px;
          padding-bottom: 2px;
          color: #000;
        }
        .resume-pdf-content h3 {
          font-size: 11.5pt;
          font-weight: bold;
          margin-top: 10px;
          margin-bottom: 2px;
          color: #000;
        }
        .resume-pdf-content p {
          margin-bottom: 6px;
          color: #000;
        }
        .resume-pdf-content ul {
          margin-top: 4px;
          margin-bottom: 8px;
          padding-left: 20px;
          color: #000;
        }
        .resume-pdf-content li {
          margin-bottom: 3px;
        }
        .resume-pdf-content a {
          color: #000;
          text-decoration: none;
        }
        .resume-pdf-content strong {
          font-weight: bold;
        }
      `}} />
    </>
  );
}
