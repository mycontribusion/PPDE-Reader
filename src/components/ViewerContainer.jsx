import React from 'react';
import { X, FileText, FileSpreadsheet, Presentation, File as FileIcon } from 'lucide-react';
import PdfViewer from './PdfViewer';
import DocxViewer from './DocxViewer';
import ExcelViewer from './ExcelViewer';
import PptxViewer from './PptxViewer';

export default function ViewerContainer({ file, onClose }) {
  if (!file) return null;

  const fileName = file.name;
  const extension = fileName.split('.').pop().toLowerCase();

  const getFileIcon = () => {
    switch (extension) {
      case 'pdf': return <FileText color="#ef4444" size={24} />;
      case 'docx': return <FileText color="#3b82f6" size={24} />;
      case 'xlsx': return <FileSpreadsheet color="#22c55e" size={24} />;
      case 'pptx': return <Presentation color="#f97316" size={24} />;
      default: return <FileIcon color="#94a3b8" size={24} />;
    }
  };

  const renderViewer = () => {
    switch (extension) {
      case 'pdf':
        return <PdfViewer file={file} />;
      case 'docx':
        return <DocxViewer file={file} />;
      case 'xlsx':
        return <ExcelViewer file={file} />;
      case 'pptx':
        return <PptxViewer file={file} />;
      default:
        return (
          <div className="loader-container">
            <p>Unsupported file format: .{extension}</p>
          </div>
        );
    }
  };

  return (
    <div className="viewer-container glass-panel">
      <div className="viewer-header">
        <div className="viewer-header-info">
          {getFileIcon()}
          <span className="file-name">{fileName}</span>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </span>
        </div>
        <button className="btn-close" onClick={onClose}>
          <X size={18} /> Close
        </button>
      </div>
      
      <div className="viewer-content">
        {renderViewer()}
      </div>
    </div>
  );
}
