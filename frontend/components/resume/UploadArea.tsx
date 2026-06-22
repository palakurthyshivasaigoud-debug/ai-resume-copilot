"use client";

import React, { useCallback, useState } from 'react';
import axios from 'axios';
import { UploadCloud, File, AlertCircle } from 'lucide-react';
import { useResumeStore } from '@/store/resumeStore';

export default function UploadArea() {
  const [dragActive, setDragActive] = useState(false);
  const { setUploading, setError, setParsedData, isUploading, uploadError } = useResumeStore();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setParsedData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
      <div 
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <UploadCloud className={`w-16 h-16 mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
        <h3 className="text-xl font-semibold mb-2">Upload your Master Resume</h3>
        <p className="text-gray-500 mb-6 text-center">Drag and drop your PDF, DOCX, or Markdown file here, or click to browse.</p>
        
        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
          Browse Files
          <input 
            type="file" 
            className="hidden" 
            accept=".pdf,.docx,.md,.txt" 
            onChange={handleChange}
            disabled={isUploading}
          />
        </label>
        
        {isUploading && (
          <div className="mt-4 text-blue-600 animate-pulse flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Uploading and parsing...</span>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{uploadError}</p>
        </div>
      )}
    </div>
  );
}
