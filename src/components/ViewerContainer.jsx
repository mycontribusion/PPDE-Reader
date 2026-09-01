import React, { useState, useCallback } from 'react';
import { X, FileText, FileSpreadsheet, Presentation, File as FileIcon, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import PdfViewer from './PdfViewer';
import DocxViewer from './DocxViewer';
import ExcelViewer from './ExcelViewer';
import PptxViewer from './PptxViewer';

const ZOOM_STEP = 0.25;
const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 4.0;

export default function ViewerContainer({ file, onClose }) {
  if (!file) return null;

  const [showControls, setShowControls] = useState(false);
  const [zoom, setZoom]                 = useState(1.0);
  const [pageInfo, setPageInfo]         = useState({ current: 1, total: 0 });

  const fileName = file.name;
  const extension = fileName.split('.').pop().toLowerCase();
  const fullPath = file.path || file.webkitRelativePath || file.fullPath || fileName;

  const getFileIcon = () => {
    switch (extension) {
      case 'pdf':   return <FileText color="#ef4444" size={18} />;
      case 'docx':  return <FileText color="#3b82f6" size={18} />;
      case 'xlsx':  return <FileSpreadsheet color="#22c55e" size={18} />;
      case 'pptx':  return <Presentation color="#f97316" size={18} />;
      default:      return <FileIcon color="#94a3b8" size={18} />;
    }
  };

  const zoomIn    = useCallback(() => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))), []);
  const zoomOut   = useCallback(() => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))), []);
  const resetZoom = useCallback(() => setZoom(1.0), []);

  const handlePageChange = useCallback((info) => {
    if (info && info.total) {
      setPageInfo(info);
    }
  }, []);

  const isFit = zoom === 1.0;

  const renderViewer = () => {
    switch (extension) {
      case 'pdf':  return <PdfViewer file={file} zoom={zoom} onPageChange={handlePageChange} />;
      case 'docx': return <DocxViewer file={file} zoom={zoom} onPageChange={handlePageChange} />;
      case 'xlsx': return <ExcelViewer file={file} zoom={zoom} onPageChange={handlePageChange} />;
      case 'pptx': return <PptxViewer file={file} zoom={zoom} onPageChange={handlePageChange} showControls={showControls} />;
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
        <div className="viewer-header-panel" onClick={(e) => e.stopPropagation()}>
          {/* Header info & Smaller Close button */}
          <div className="viewer-header">
            <div className="viewer-header-info">
              <span style={{ flexShrink: 0 }}>{getFileIcon()}</span>
              <div className="viewer-title-scroll">
                <span className="file-name" title={fullPath}>{fullPath}</span>
                <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            </div>

            <button className="btn-close" onClick={handleClose} aria-label="Close document">
              <X size={14} /> Close
            </button>
          </div>

          {/* Attached Action Panel (Zoom Toolbar & Page Indicator) */}
          <div className="viewer-action-panel">
            <div className="zoom-controls">
              <button className="pdf-zoom-btn" onClick={zoomOut} disabled={zoom <= ZOOM_MIN} title="Zoom out (−)">
                <ZoomOut size={15} />
              </button>
              <button className={`pdf-zoom-reset${isFit ? ' active' : ''}`} onClick={resetZoom} title="Fit to width">
                <Maximize2 size={13} />
                <span>{isFit ? 'Fit' : `${Math.round(zoom * 100)}%`}</span>
              </button>
              <button className="pdf-zoom-btn" onClick={zoomIn} disabled={zoom >= ZOOM_MAX} title="Zoom in (+)">
                <ZoomIn size={15} />
              </button>
            </div>

            {pageInfo.total > 0 && (
              <div className="page-indicator-badge">
                Page {pageInfo.current} / {pageInfo.total}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="viewer-content">
        {renderViewer()}
      </div>
    </div>
  );
}
