import React, { useEffect, useRef, useState } from 'react';
import * as docx from 'docx-preview';

export default function DocxViewer({ file, zoom = 1.0 }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    if (file && containerRef.current) {
      setLoading(true);
      setError(null);
      
      const renderOptions = {
        className: 'docx-document',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        experimental: false,
        trimXmlDeclaration: true,
        debug: false,
      };

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
        style={{
          flex: 1,
          overflow: 'auto',
          display: loading || error ? 'none' : 'block',
          backgroundColor: '#e2e8f0',
          padding: '10px 0'
        }}
      >
        <div 
          ref={containerRef}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        />
      </div>
    </div>
  );
}
