import React, { useCallback, useState, useEffect } from 'react';
import { UploadCloud, FileText, FileSpreadsheet, Presentation, FileIcon, Clock, Trash2, FolderOpen } from 'lucide-react';
import { getRecentFiles, loadRecentFile, removeRecentFile, clearAllRecentFiles } from '../utils/fileStore';

export default function FileUploader({ onFileSelect }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [recents, setRecents] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  const loadHistory = useCallback(async () => {
    const list = await getRecentFiles();
    setRecents(list);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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

  const handleOpenRecent = async (e, item) => {
    e.stopPropagation();
    setLoadingId(item.id);
    const file = await loadRecentFile(item.id);
    setLoadingId(null);
    if (file) {
      onFileSelect(file);
    }
  };

  const handleRemoveRecent = async (e, id) => {
    e.stopPropagation();
    await removeRecentFile(id);
    await loadHistory();
  };

  const handleClearAll = async (e) => {
    e.stopPropagation();
    await clearAllRecentFiles();
    await loadHistory();
  };

  const getFormatIcon = (ext) => {
    switch (ext) {
      case 'pdf':  return <FileText color="#ef4444" size={18} />;
      case 'docx': return <FileText color="#3b82f6" size={18} />;
      case 'xlsx': return <FileSpreadsheet color="#22c55e" size={18} />;
      case 'pptx': return <Presentation color="#f97316" size={18} />;
      default:     return <FileIcon color="#94a3b8" size={18} />;
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="uploader-wrapper">
      {/* Main Upload Box */}
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
        
        <UploadCloud size={48} />
        <h3>Drop your document here</h3>
        <p>or click to browse from your device</p>
        
        <div className="supported-formats">
          <span className="format-badge" style={{ color: '#ef4444' }}>PDF</span>
          <span className="format-badge" style={{ color: '#3b82f6' }}>DOCX</span>
          <span className="format-badge" style={{ color: '#22c55e' }}>XLSX</span>
          <span className="format-badge" style={{ color: '#f97316' }}>PPTX</span>
        </div>
      </div>

      {/* Recent Documents History (Last 10 Files) */}
      {recents.length > 0 && (
        <div className="glass-panel recent-panel">
          <div className="recent-header">
            <div className="recent-title">
              <Clock size={18} color="#94a3b8" />
              <h4>Recent Documents ({recents.length})</h4>
            </div>
            <button className="btn-clear-history" onClick={handleClearAll} title="Clear history">
              Clear All
            </button>
          </div>

          <div className="recent-list">
            {recents.map((item) => {
              const ext = item.name.split('.').pop().toLowerCase();
              const fullPath = item.fullPath || item.name;

              return (
                <div
                  key={item.id}
                  className="recent-item"
                  onClick={(e) => handleOpenRecent(e, item)}
                >
                  <div className="recent-item-icon">
                    {getFormatIcon(ext)}
                  </div>
                  
                  <div className="recent-item-info">
                    <span className="recent-item-path" title={fullPath}>{fullPath}</span>
                    <span className="recent-item-meta">
                      {(item.size / 1024 / 1024).toFixed(2)} MB • {formatDate(item.timestamp)}
                    </span>
                  </div>

                  <div className="recent-item-actions">
                    <button
                      className="btn-icon-action"
                      onClick={(e) => handleRemoveRecent(e, item.id)}
                      title="Remove from history"
                      aria-label="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
