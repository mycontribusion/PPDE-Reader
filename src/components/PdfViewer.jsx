import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function PdfViewer({ file }) {
  const [numPages, setNumPages] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [containerWidth, setContainerWidth] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  if (!fileUrl) return (
    <div className="loader-container">
      <div className="spinner"></div>
      <p>Loading PDF...</p>
    </div>
  );

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden', background: '#fff' }}
    >
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Parsing PDF...</p>
          </div>
        }
      >
        {numPages && Array.from({ length: numPages }, (_, i) => (
          <div
            key={i + 1}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}
          >
            <Page
              pageNumber={i + 1}
              width={containerWidth ? containerWidth - 2 : undefined}
              renderAnnotationLayer
              renderTextLayer
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
