import React, { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const ZOOM_STEP = 0.25;
const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 4.0;
// viewer-container has padding: 1rem (16px) on each side
const PADDING   = 32;

function getFitWidth() {
  return window.innerWidth - PADDING;
}

export default function PdfViewer({ file }) {
  const [numPages, setNumPages] = useState(null);
  const [fileUrl, setFileUrl]   = useState(null);
  const [fitWidth, setFitWidth] = useState(getFitWidth);
  const [zoom, setZoom]         = useState(1.0);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const handler = () => setFitWidth(getFitWidth());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const zoomIn    = useCallback(() => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))), []);
  const zoomOut   = useCallback(() => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))), []);
  const resetZoom = useCallback(() => setZoom(1.0), []);

  const isFit     = zoom === 1.0;
  const pageWidth = Math.round(fitWidth * zoom);

  if (!fileUrl) return (
    <div className="loader-container"><div className="spinner"></div><p>Loading PDF...</p></div>
  );

  return (
    // This div's width drives the horizontal scroll in viewer-content when zoomed
    <div style={{ width: pageWidth, minWidth: pageWidth }}>
      {/* Sticky zoom bar — sticks to top of viewer-content scroll */}
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
        loading={<div className="loader-container"><div className="spinner"></div><p>Parsing PDF...</p></div>}
      >
        {numPages && Array.from({ length: numPages }, (_, i) => (
          <div key={i + 1} style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
            <Page pageNumber={i + 1} width={pageWidth} renderAnnotationLayer renderTextLayer />
          </div>
        ))}
      </Document>
    </div>
  );
}
