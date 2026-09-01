import React, { useState, useEffect } from 'react';
import { ReactPptxViewer } from '@extend-ai/react-pptx';
import '@extend-ai/react-pptx/styles.css';

export default function PptxViewer({ file, zoom = 1.0 }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (file) {
      setLoading(false);
    }
  }, [file]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading Presentation...</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div 
        style={{ 
          flex: 1, 
          overflow: 'auto', 
          backgroundColor: '#0f172a',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <div 
          style={{ 
            width: '100%', 
            transform: `scale(${zoom})`, 
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease'
          }}
        >
          <ReactPptxViewer 
            source={file}
            mode="continuous"
            showThumbnails={true}
            showToolbar={true}
          />
        </div>
      </div>
    </div>
  );
}
