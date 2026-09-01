import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText, FileSpreadsheet, Presentation, FileIcon } from 'lucide-react';

export default function FileUploader({ onFileSelect }) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`glass-panel file-uploader ${isDragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-upload').click()}
    >
      <input 
        id="file-upload" 
        type="file" 
        style={{ display: 'none' }} 
        onChange={handleChange}
        accept=".pdf,.docx,.xlsx,.pptx"
      />
      
      <UploadCloud />
      <h3>Drop your document here</h3>
      <p>or click to browse from your device</p>
      
      <div className="supported-formats">
        <span className="format-badge" style={{ color: '#ef4444' }}>PDF</span>
        <span className="format-badge" style={{ color: '#3b82f6' }}>DOCX</span>
        <span className="format-badge" style={{ color: '#22c55e' }}>XLSX</span>
        <span className="format-badge" style={{ color: '#f97316' }}>PPTX</span>
      </div>
    </div>
  );
}
