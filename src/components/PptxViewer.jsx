import React, { useState, useEffect } from 'react';
import { ReactPptxViewer } from '@extend-ai/react-pptx';
import '@extend-ai/react-pptx/styles.css';

export default function PptxViewer({ file }) {
  const [loading, setLoading] = useState(true);

  // `@extend-ai/react-pptx` natively accepts a File object in its `source` prop, 
  // but we can add a small delay to simulate parsing readiness or ensure it's loaded.
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ReactPptxViewer 
        source={file}
        mode="continuous"
        showThumbnails={true}
        showToolbar={true}
      />
    </div>
  );
}
