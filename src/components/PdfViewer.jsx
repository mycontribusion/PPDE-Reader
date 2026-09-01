import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function PdfViewer({ file }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [fileUrl, setFileUrl] = useState(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset) {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  if (!fileUrl) return <div className="loader-container"><div className="spinner"></div><p>Loading PDF...</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', padding: '1rem' }}>
      <div className="pdf-controls">
        <button type="button" disabled={pageNumber <= 1} onClick={previousPage}>
          Previous
        </button>
        <p>
          Page {pageNumber} of {numPages || '--'}
        </p>
        <button type="button" disabled={pageNumber >= numPages} onClick={nextPage}>
          Next
        </button>
      </div>

      <div style={{ overflow: 'auto', flex: 1, display: 'flex', justifyContent: 'center', width: '100%' }}>
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="loader-container"><div className="spinner"></div><p>Parsing PDF...</p></div>}
        >
          <Page pageNumber={pageNumber} />
        </Document>
      </div>
    </div>
  );
}
