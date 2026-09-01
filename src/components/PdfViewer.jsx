import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const ZOOM_STEP    = 0.25;
const ZOOM_MIN     = 0.5;
const ZOOM_MAX     = 4.0;
const PADDING      = 32;      // viewer-container left+right padding (2 × 1rem)
const PAGE_GAP     = 4;       // px gap between pages
const BUFFER_PAGES = 3;       // pages to keep rendered above/below visible area
// Cap canvas DPR to 1.5 – halves memory vs native 3× on high-DPI phones
const MAX_DPR      = Math.min(window.devicePixelRatio || 1, 1.5);

function getFitWidth() {
  return window.innerWidth - PADDING;
}

export default function PdfViewer({ file }) {
  const [numPages, setNumPages]     = useState(null);
  const [fileUrl, setFileUrl]       = useState(null);
  const [fitWidth, setFitWidth]     = useState(getFitWidth);
  const [zoom, setZoom]             = useState(1.0);
  // Height (px) of a rendered page — measured from first page render
  const [pageHeight, setPageHeight] = useState(null);
  const [visibleRange, setVisibleRange] = useState([0, 8]);

  const outerRef = useRef(null);
  // Cache the scroll container so we don't re-query every scroll
  const scrollElRef = useRef(null);

  // ── File URL ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    // Reset state when file changes
    setNumPages(null);
    setPageHeight(null);
    setVisibleRange([0, 8]);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── Window resize → update fitWidth ──────────────────────────────────────
  useEffect(() => {
    const handler = () => setFitWidth(getFitWidth());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── Find scroll container (.viewer-content) and listen to scroll ──────────
  useEffect(() => {
    if (!outerRef.current) return;
    // Walk up the DOM to find the overflow:auto ancestor
    let el = outerRef.current.parentElement;
    while (el && el.classList && !el.classList.contains('viewer-content')) {
      el = el.parentElement;
    }
    if (!el) return;
    scrollElRef.current = el;

    const onScroll = () => updateVisibleRange();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []); // runs once on mount

  // ── Recompute visible range on scroll / pageHeight / numPages change ──────
  const updateVisibleRange = useCallback(() => {
    const sc = scrollElRef.current;
    if (!sc || !pageHeight || !numPages) return;

    const rowH    = pageHeight + PAGE_GAP;
    // Account for the sticky zoom bar height (approx 40px)
    const scrollTop = Math.max(0, sc.scrollTop - 40);
    const start   = Math.max(0, Math.floor(scrollTop / rowH) - BUFFER_PAGES);
    const end     = Math.min(
      numPages - 1,
      Math.ceil((scrollTop + sc.clientHeight) / rowH) + BUFFER_PAGES
    );
    setVisibleRange([start, end]);
  }, [pageHeight, numPages]);

  useEffect(() => {
    updateVisibleRange();
  }, [updateVisibleRange]);

  // ── Zoom callbacks ────────────────────────────────────────────────────────
  const zoomIn    = useCallback(() => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))), []);
  const zoomOut   = useCallback(() => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))), []);
  const resetZoom = useCallback(() => setZoom(1.0), []);

  // When zoom changes, re-measure and reset scroll-based range
  useEffect(() => {
    setPageHeight(null);       // will be re-measured on next page render
    setVisibleRange([0, 8]);   // show top of document
    if (scrollElRef.current) scrollElRef.current.scrollTop = 0;
  }, [zoom]);

  const isFit     = zoom === 1.0;
  const pageWidth = Math.round(fitWidth * zoom);
  // Estimated row height used for placeholder divs before first page renders
  const estimatedRowH = pageHeight ? pageHeight + PAGE_GAP : Math.round(pageWidth * 1.414);

  if (!fileUrl) return (
    <div className="loader-container"><div className="spinner"/><p>Loading...</p></div>
  );

  return (
    <div ref={outerRef} style={{ width: pageWidth, minWidth: pageWidth }}>
      {/* Sticky zoom bar */}
      <div className="pdf-zoom-bar">
        <button className="pdf-zoom-btn" onClick={zoomOut} disabled={zoom <= ZOOM_MIN} title="Zoom out (−)">
          <ZoomOut size={16} />
        </button>
        <button className={`pdf-zoom-reset${isFit ? ' active' : ''}`} onClick={resetZoom} title="Fit to width">
          <Maximize2 size={14} />
          <span>{isFit ? 'Fit' : `${Math.round(zoom * 100)}%`}</span>
        </button>
        <button className="pdf-zoom-btn" onClick={zoomIn} disabled={zoom >= ZOOM_MAX} title="Zoom in (+)">
          <ZoomIn size={16} />
        </button>
      </div>

      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<div className="loader-container"><div className="spinner"/><p>Parsing PDF…</p></div>}
        error={<div className="loader-container"><p>⚠ Failed to load PDF.</p></div>}
      >
        {numPages && Array.from({ length: numPages }, (_, i) => {
          const isVisible = i >= visibleRange[0] && i <= visibleRange[1];

          if (!isVisible && pageHeight) {
            // Lightweight placeholder — no canvas, no memory
            return (
              <div
                key={i}
                style={{
                  width: pageWidth,
                  height: pageHeight,
                  marginBottom: PAGE_GAP,
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                }}
              />
            );
          }

          return (
            <div
              key={i}
              style={{ display: 'flex', justifyContent: 'center', marginBottom: PAGE_GAP }}
            >
              <Page
                pageNumber={i + 1}
                width={pageWidth}
                devicePixelRatio={MAX_DPR}
                renderAnnotationLayer
                renderTextLayer
                onRenderSuccess={() => {
                  // Measure page height from first successful render
                  if (!pageHeight) {
                    const canvas = document.querySelector('.react-pdf__Page__canvas');
                    if (canvas) {
                      // canvas.style.height is in px (CSS pixels, not device pixels)
                      setPageHeight(canvas.offsetHeight);
                    }
                  }
                }}
              />
            </div>
          );
        })}
      </Document>
    </div>
  );
}
