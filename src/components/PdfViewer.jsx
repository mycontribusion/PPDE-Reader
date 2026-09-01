import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const PAGE_GAP = 8;
const HD_DPR   = Math.max(window.devicePixelRatio || 1, 2.0);

export default function PdfViewer({ file, zoom = 1.0, onPageChange }) {
  const [numPages, setNumPages] = useState(null);
  const [fileUrl, setFileUrl]   = useState(null);
  const [fitWidth, setFitWidth] = useState(window.innerWidth - 17);

  const outerRef = useRef(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setNumPages(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useLayoutEffect(() => {
    if (!outerRef.current) return;
    let el = outerRef.current.parentElement;
    while (el && el.classList && !el.classList.contains('viewer-content')) {
      el = el.parentElement;
    }

    const measureWidth = () => {
      const targetEl = (el && el.clientWidth > 0) ? el : document.documentElement;
      if (targetEl && targetEl.clientWidth > 0) {
        setFitWidth(targetEl.clientWidth);
      }
    };

    measureWidth();
    const observer = new ResizeObserver(measureWidth);
    if (el) observer.observe(el);

    // Track active page on scroll
    const onScroll = () => {
      if (!el || !numPages) return;
      const totalH = el.scrollHeight;
      const rowH = totalH / numPages;
      if (rowH > 0) {
        const page = Math.min(numPages, Math.max(1, Math.floor((el.scrollTop + rowH * 0.3) / rowH) + 1));
        if (onPageChange) onPageChange({ current: page, total: numPages });
      }
    };

    if (el) el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      if (el) el.removeEventListener('scroll', onScroll);
    };
  }, [numPages, onPageChange]);

  const handleLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    if (onPageChange) onPageChange({ current: 1, total: numPages });
  };

  const pageWidth = Math.round(fitWidth * zoom);

  if (!fileUrl) return (
    <div className="loader-container"><div className="spinner"/><p>Loading...</p></div>
  );

  return (
    <div ref={outerRef} style={{ width: '100%', position: 'relative' }}>
      <div className="pdf-pages-wrapper" style={{ width: pageWidth, minWidth: pageWidth, margin: '0 auto', paddingBottom: '2rem' }}>
        <Document
          file={fileUrl}
          onLoadSuccess={handleLoadSuccess}
          loading={<div className="loader-container"><div className="spinner"/><p>Parsing PDF…</p></div>}
          error={<div className="loader-container"><p>⚠ Failed to load PDF.</p></div>}
        >
          {numPages && Array.from({ length: numPages }, (_, i) => (
            <div
              key={i}
              style={{ display: 'flex', justifyContent: 'center', marginBottom: PAGE_GAP }}
            >
              <Page
                pageNumber={i + 1}
                width={pageWidth}
                devicePixelRatio={HD_DPR}
                renderAnnotationLayer={true}
                renderTextLayer={true}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
