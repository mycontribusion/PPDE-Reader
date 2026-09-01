import React, { useState } from 'react';
import { X, FileText, FileSpreadsheet, Presentation, File as FileIcon } from 'lucide-react';
import PdfViewer from './PdfViewer';
import DocxViewer from './DocxViewer';
import ExcelViewer from './ExcelViewer';
import PptxViewer from './PptxViewer';

export default function ViewerContainer({ file, onClose }) {
  if (!file) return null;

  // Default to false for full screen viewing experience; tap anywhere to toggle controls
  const [showControls, setShowControls] = useState(false);

  const fileName = file.name;
  const extension = fileName.split('.').pop().toLowerCase();
  const fullPath = file.path || file.webkitRelativePath || fileName;

  const getFileIcon = () => {
    switch (extension) {
      case 'pdf':   return <FileText color="#ef4444" size={20} />;
      case 'docx':  return <FileText color="#3b82f6" size={20} />;
      case 'xlsx':  return <FileSpreadsheet color="#22c55e" size={20} />;
      case 'pptx':  return <Presentation color="#f97316" size={20} />;
      default:      return <FileIcon color="#94a3b8" size={20} />;
    }
  };

  const renderViewer = () => {
    switch (extension) {
      case 'pdf':  return <PdfViewer file={file} showControls={showControls} />;
      case 'docx': return <DocxViewer file={file} />;
      case 'xlsx': return <ExcelViewer file={file} />;
      case 'pptx': return <PptxViewer file={file} />;
      default:
        return (
          <div className="loader-container">
            <p>Unsupported file format: .{extension}</p>
          </div>
        );
    }
  };

  const toggleControls = () => {
    setShowControls(prev => !prev);
  };

  const handleClose = (e) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      className={`viewer-container glass-panel ${!showControls ? 'controls-hidden' : ''}`}
      onClick={toggleControls}
    >
      {showControls && (
        <div className="viewer-header" onClick={(e) => e.stopPropagation()}>
          {/* Scrollable title with complete full path */}
          <div className="viewer-header-info">
            <span style={{ flexShrink: 0 }}>{getFileIcon()}</span>
            <div className="viewer-title-scroll">
              <span className="file-name" title={fullPath}>{fullPath}</span>
              <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
          </div>

          {/* Close button */}
          <button className="btn-close" onClick={handleClose} aria-label="Close document">
            <X size={18} /> Close
          </button>
        </div>
      )}

      <div className="viewer-content">
        {renderViewer()}
      </div>
    </div>
  );
}
