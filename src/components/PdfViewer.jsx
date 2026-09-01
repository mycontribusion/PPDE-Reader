import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const PAGE_GAP = 6;
const FAST_DPR = Math.min(window.devicePixelRatio || 1, 1.25);

// Sub-component that uses IntersectionObserver to lazily render PDF pages only when in/near viewport
function PdfPageItem({ pageNumber, pageWidth, FAST_DPR }) {
  const [isVisible, setIsVisible] = useState(pageNumber === 1);
  const containerRef = useRef(null);
  const estimatedHeight = Math.round(pageWidth * 1.414);

  useEffect(() => {
    if (pageNumber === 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        });
      },
      {
        rootMargin: '600px 0px 600px 0px',
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [pageNumber]);

  return (
    <div
      ref={containerRef}
      data-page-number={pageNumber}
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        marginBottom: PAGE_GAP,
        minHeight: `${estimatedHeight}px`,
        width: `${pageWidth}px`,
      }}
    >
      {isVisible ? (
        <Page
          pageNumber={pageNumber}
          width={pageWidth}
          devicePixelRatio={FAST_DPR}
          renderAnnotationLayer={false}
          renderTextLayer={false}
        />
      ) : (
        <div
          style={{
            width: `${pageWidth}px`,
            height: `${estimatedHeight}px`,
            backgroundColor: '#1e293b',
            borderRadius: '4px',
            opacity: 0.3,
          }}
        />
      )}
    </div>
  );
}

export default function PdfViewer({ file, zoom = 1.0, onPageChange }) {
  const [numPages, setNumPages] = useState(null);
  const [fileUrl, setFileUrl]   = useState(null);
  const [fitWidth, setFitWidth] = useState(window.innerWidth);

  const outerRef        = useRef(null);
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setNumPages(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const handleResize = () => {
      setFitWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reliable scroll listener for PDF page tracking
  useEffect(() => {
    if (!numPages || !outerRef.current) return;

    let scrollEl = outerRef.current.parentElement;
    while (scrollEl && !scrollEl.classList.contains('viewer-content')) {
      scrollEl = scrollEl.parentElement;
    }

    if (!scrollEl) return;

    const onScroll = () => {
      const pageItems = outerRef.current?.querySelectorAll('[data-page-number]');
      if (pageItems && pageItems.length > 0) {
        const scrollRect = scrollEl.getBoundingClientRect();
        const visibleCenter = (scrollRect.top + scrollRect.bottom) / 2;

        let currentPage = 1;
        let closestDist = Infinity;

        pageItems.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const pNum = parseInt(el.getAttribute('data-page-number'), 10);
          const elCenter = (rect.top + rect.bottom) / 2;
          const dist = Math.abs(elCenter - visibleCenter);
          if (dist < closestDist) {
            closestDist = dist;
            if (!isNaN(pNum)) currentPage = pNum;
          }
        });

        if (onPageChangeRef.current) {
          onPageChangeRef.current({ current: currentPage, total: numPages });
        }
      } else {
        const totalH = scrollEl.scrollHeight;
        const rowH = totalH / numPages;
        if (rowH > 0) {
          const page = Math.min(numPages, Math.max(1, Math.floor((scrollEl.scrollTop + rowH * 0.3) / rowH) + 1));
          if (onPageChangeRef.current) {
            onPageChangeRef.current({ current: page, total: numPages });
          }
        }
      }
    };

    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      scrollEl.removeEventListener('scroll', onScroll);
    };
  }, [numPages]);

  const handleLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
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
            <PdfPageItem
              key={i + 1}
              pageNumber={i + 1}
              pageWidth={pageWidth}
              FAST_DPR={FAST_DPR}
            />
          ))}
        </Document>
      </div>
    </div>
  );
}
