import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const PAGE_GAP = 4;
const FAST_DPR = Math.min(window.devicePixelRatio || 1, 1.5);

export default function PdfViewer({ file, zoom = 1.0, onPageChange }) {
  const [numPages, setNumPages] = useState(null);
  const [fileUrl, setFileUrl]   = useState(null);
  const [fitWidth, setFitWidth] = useState(window.innerWidth);

  const outerRef        = useRef(null);
  const numPagesRef     = useRef(null);
  const onPageChangeRef = useRef(onPageChange);

  // Keep refs up-to-date without triggering effect dependency changes
  numPagesRef.current = numPages;
  onPageChangeRef.current = onPageChange;

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setNumPages(null);
    numPagesRef.current = null;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Window resize handler to maintain exact fit width without scrollbar measurement races
  useEffect(() => {
    const handleResize = () => {
      setFitWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useLayoutEffect(() => {
    if (!outerRef.current) return;
    let el = outerRef.current.parentElement;
    while (el && el.classList && !el.classList.contains('viewer-content')) {
      el = el.parentElement;
    }

    // Fast scroll-based page number tracking
    const onScroll = () => {
      if (!el || !numPagesRef.current) return;
      const totalH = el.scrollHeight;
      const pagesCount = numPagesRef.current;
      const rowH = totalH / pagesCount;
      if (rowH > 0) {
        const page = Math.min(pagesCount, Math.max(1, Math.floor((el.scrollTop + rowH * 0.3) / rowH) + 1));
        if (onPageChangeRef.current) {
          onPageChangeRef.current({ current: page, total: pagesCount });
        }
      }
    };

    if (el) el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (el) el.removeEventListener('scroll', onScroll);
    };
  }, []);

  const handleLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    numPagesRef.current = numPages;
    if (onPageChangeRef.current) {
      onPageChangeRef.current({ current: 1, total: numPages });
    }
  };

  const pageWidth = Math.round(fitWidth * zoom);

  if (!fileUrl) return (
    <div className="loader-container"><div className="spinner"/><p>Loading...</p></div>
  );

  return (
    <div ref={outerRef} style={{ width: '100%', position: 'relative', background: '#0f172a' }}>
      <div className="pdf-pages-wrapper" style={{ width: pageWidth, minWidth: pageWidth, margin: 0, paddingBottom: '2rem' }}>
        <Document
          file={fileUrl}
          onLoadSuccess={handleLoadSuccess}
          loading={<div className="loader-container"><div className="spinner"/><p>Parsing PDF…</p></div>}
          error={<div className="loader-container"><p>⚠ Failed to load PDF.</p></div>}
        >
          {numPages && Array.from({ length: numPages }, (_, i) => (
            <div
              key={i}
              style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: PAGE_GAP }}
            >
              <Page
                pageNumber={i + 1}
                width={pageWidth}
                devicePixelRatio={FAST_DPR}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
