import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const ZOOM_STEP = 0.25;
const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 4.0;

export default function PdfViewer({ file }) {
  const [numPages, setNumPages]             = useState(null);
  const [fileUrl, setFileUrl]               = useState(null);
  const [containerWidth, setContainerWidth] = useState(null);
  const [zoom, setZoom]                     = useState(1.0);
  const scrollRef = useRef(null); // ref on the SCROLL div, not outer

  // --- file URL ---
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // --- measure the SCROLL container's client width (excludes scrollbar) ---
  useEffect(() => {
    if (!scrollRef.current) return;
    const measure = () => {
      if (scrollRef.current) {
        setContainerWidth(scrollRef.current.clientWidth);
      }
    };
    const ro = new ResizeObserver(measure);
    ro.observe(scrollRef.current);
    measure(); // initial
    return () => ro.disconnect();
  }, []);

  // --- keyboard shortcuts ---
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
      if (e.key === '-')                  { e.preventDefault(); zoomOut(); }
      if (e.key === '0')                  { e.preventDefault(); resetZoom(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const zoomIn    = useCallback(() => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))), []);
  const zoomOut   = useCallback(() => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))), []);
  const resetZoom = useCallback(() => setZoom(1.0), []);

  const isFit    = zoom === 1.0;
  // At fit (zoom=1) use exactly clientWidth; zoomed uses zoom multiplier
  const pageWidth = containerWidth ? Math.round(containerWidth * zoom) : undefined;

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
    <div className="pdf-outer">
      {/* Zoom toolbar */}
      <div className="pdf-zoom-bar">
        <button
          className="pdf-zoom-btn"
          onClick={zoomOut}
          disabled={zoom <= ZOOM_MIN}
          title="Zoom out (−)"
          aria-label="Zoom out"
        >
          <ZoomOut size={16} />
        </button>

        <button
          className={`pdf-zoom-reset ${isFit ? 'active' : ''}`}
          onClick={resetZoom}
          title="Reset to fit width (0)"
          aria-label="Fit to width"
        >
          <Maximize2 size={14} />
          <span>{isFit ? 'Fit' : `${Math.round(zoom * 100)}%`}</span>
        </button>

        <button
          className="pdf-zoom-btn"
          onClick={zoomIn}
          disabled={zoom >= ZOOM_MAX}
          title="Zoom in (+)"
          aria-label="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      {/* Scrollable page area — ref is HERE so we measure visible width */}
      <div ref={scrollRef} className="pdf-scroll">
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
              style={{
                display: 'flex',
                // Left-align when zoomed in (avoids left-crop on overflow)
                // Centre when at fit width
                justifyContent: zoom > 1 ? 'flex-start' : 'center',
                marginBottom: '4px',
              }}
            >
              <Page
                pageNumber={i + 1}
                width={pageWidth}
                renderAnnotationLayer
                renderTextLayer
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
