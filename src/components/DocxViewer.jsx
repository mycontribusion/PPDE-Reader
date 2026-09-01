import React, { useEffect, useRef, useState } from 'react';
import * as docx from 'docx-preview';

export default function DocxViewer({ file }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    if (file && containerRef.current) {
      setLoading(true);
      setError(null);
      
      const renderOptions = {
        className: 'docx-document', // class name/prefix for default and document style classes
        inWrapper: true, // enables rendering of wrapper around document content
        ignoreWidth: false, // disables rendering width of page
        ignoreHeight: false, // disables rendering height of page
        ignoreFonts: false, // disables fonts rendering
        breakPages: true, // enables page breaking as in word
        ignoreLastRenderedPageBreak: true, // disables page breaking on lastRenderedPageBreak elements
        experimental: false, // enables experimental features
        trimXmlDeclaration: true, // if true, xml declaration will be removed from xml documents before parsing
        debug: false, // enables additional logging
      };

      // Read file as ArrayBuffer
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!isMounted) return;
        const arrayBuffer = e.target.result;
        docx.renderAsync(arrayBuffer, containerRef.current, null, renderOptions)
          .then(() => {
            if (isMounted) setLoading(false);
          })
          .catch((err) => {
            if (isMounted) {
              console.error('Error rendering DOCX:', err);
              setError('Failed to render Word document. It might be corrupted or in an unsupported format.');
              setLoading(false);
            }
          });
      };
      
      reader.onerror = () => {
        if (isMounted) {
          setError('Failed to read file.');
          setLoading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    }

    return () => {
      isMounted = false;
    };
  }, [file]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {loading && (
        <div className="loader-container">
          <div className="spinner"></div>
          <p>Parsing DOCX...</p>
        </div>
      )}
      {error && (
        <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>
          {error}
        </div>
      )}
      <div 
        ref={containerRef} 
        style={{ 
          flex: 1, 
          overflow: 'auto', 
          display: loading || error ? 'none' : 'block',
          backgroundColor: '#f1f5f9',
          padding: '20px'
        }}
      />
    </div>
  );
}
