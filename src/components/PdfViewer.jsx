import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const ZOOM_STEP    = 0.25;
const ZOOM_MIN     = 0.5;
const ZOOM_MAX     = 4.0;
const PAGE_GAP     = 4;       // px gap between pages
const BUFFER_PAGES = 3;       // pages to keep rendered above/below visible area
const MAX_DPR      = Math.min(window.devicePixelRatio || 1, 1.5);

export default function PdfViewer({ file, showControls }) {
  const [numPages, setNumPages]     = useState(null);
  const [fileUrl, setFileUrl]       = useState(null);
  const [fitWidth, setFitWidth]     = useState(window.innerWidth - 17);
  const [zoom, setZoom]             = useState(1.0);
  const [pageHeight, setPageHeight] = useState(null);
  const [visibleRange, setVisibleRange] = useState([0, 8]);

  const outerRef = useRef(null);
  const scrollElRef = useRef(null);

  // ── File URL ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setNumPages(null);
    setPageHeight(null);
    setVisibleRange([0, 8]);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── Find scroll container (.viewer-content) & measure exact clientWidth ───
  useLayoutEffect(() => {
    if (!outerRef.current) return;
    let el = outerRef.current.parentElement;
    while (el && el.classList && !el.classList.contains('viewer-content')) {
      el = el.parentElement;
    }
    if (!el) return;
    scrollElRef.current = el;

    const measureWidth = () => {
      if (el.clientWidth > 0) {
        setFitWidth(el.clientWidth);
      }
    };

    measureWidth();
    const observer = new ResizeObserver(measureWidth);
    observer.observe(el);

    const onScroll = () => updateVisibleRange();
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  // ── Recompute visible range on scroll ────────────────────────────────────
  const updateVisibleRange = useCallback(() => {
    const sc = scrollElRef.current;
    if (!sc || !pageHeight || !numPages) return;

    const rowH      = pageHeight + PAGE_GAP;
    const scrollTop = Math.max(0, sc.scrollTop);
    const start     = Math.max(0, Math.floor(scrollTop / rowH) - BUFFER_PAGES);
    const end       = Math.min(
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

  useEffect(() => {
    setPageHeight(null);
    setVisibleRange([0, 8]);
    if (scrollElRef.current) scrollElRef.current.scrollTop = 0;
  }, [zoom]);

  const isFit     = zoom === 1.0;
  const pageWidth = Math.round(fitWidth * zoom);

  if (!fileUrl) return (
    <div className="loader-container"><div className="spinner"/><p>Loading...</p></div>
  );

  return (
    <div ref={outerRef} style={{ width: '100%', position: 'relative' }}>
      {/* Sticky zoom bar — isolated from page zooming width */}
      {showControls && (
        <div className="pdf-zoom-bar" onClick={(e) => e.stopPropagation()}>
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
      )}

      {/* Pages container — width expands only when zoomed */}
      <div className="pdf-pages-wrapper" style={{ width: pageWidth, minWidth: pageWidth, margin: '0 auto' }}>
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="loader-container"><div className="spinner"/><p>Parsing PDF…</p></div>}
          error={<div className="loader-container"><p>⚠ Failed to load PDF.</p></div>}
        >
          {numPages && Array.from({ length: numPages }, (_, i) => {
            const isVisible = i >= visibleRange[0] && i <= visibleRange[1];

            if (!isVisible && pageHeight) {
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
                    if (!pageHeight) {
                      const canvas = document.querySelector('.react-pdf__Page__canvas');
                      if (canvas) {
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
    </div>
  );
}
