import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import * as docx from 'docx-preview';

export default function DocxViewer({ file, zoom = 1.0, onPageChange }) {
  const outerRef         = useRef(null);
  // Use a callback ref so we know the exact moment containerRef is ready in DOM
  const containerNodeRef = useRef(null);
  const [containerReady, setContainerReady] = useState(false);

  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [naturalWidth, setNaturalWidth] = useState(816);
  // Measure the ACTUAL scroll container width (.viewer-content), not window.innerWidth.
  // This matches the working PptxViewer/ExcelViewer pattern and avoids left/right crop
  // caused by scrollbars, mobile safe-areas, or browser chrome.
  const [contentWidth, setContentWidth] = useState(0);

  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

  // Callback ref — fires as soon as the div is mounted
  const containerCallbackRef = useCallback((node) => {
    containerNodeRef.current = node;
    if (node) setContainerReady(true);
  }, []);

  // Watch the .viewer-content ancestor (the real horizontal scroll container)
  // and keep `contentWidth` in sync. This replaces the old window.innerWidth logic.
  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    let el = outer.parentElement;
    while (el && !el.classList.contains('viewer-content')) {
      el = el.parentElement;
    }
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setContentWidth(w);
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Render the document once we have both the file AND the DOM node
  useEffect(() => {
    if (!file || !containerReady || !containerNodeRef.current) return;
    let isMounted = true;

    setLoading(true);
    setError(null);

    // Clear any previous render
    containerNodeRef.current.innerHTML = '';

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
      docx.renderAsync(arrayBuffer, containerNodeRef.current, null, renderOptions)
        .then(() => {
          if (!isMounted) return;
          setLoading(false);

          setTimeout(() => {
            const node = containerNodeRef.current;
            if (!node) return;

            // Measure actual rendered page width from the first <section>
            const firstSection = node.querySelector('section.docx-document, section.docx');
            if (firstSection) {
              const natural = firstSection.offsetWidth || 816;
              if (natural > 0) setNaturalWidth(natural);
            }

            // Page tracking
            const sections = node.querySelectorAll('section.docx-document, section.docx');
            const totalPages = sections.length > 0 ? sections.length : 1;
            if (onPageChangeRef.current) {
              onPageChangeRef.current({ current: 1, total: totalPages });
            }

            // Walk up to .viewer-content for scroll tracking
            let scrollEl = outerRef.current?.parentElement;
            while (scrollEl && !scrollEl.classList.contains('viewer-content')) {
              scrollEl = scrollEl.parentElement;
            }

            if (scrollEl && totalPages > 1) {
              const onScroll = () => {
                const totalH = scrollEl.scrollHeight;
                const rowH = totalH / totalPages;
                if (rowH > 0) {
                  const page = Math.min(totalPages, Math.max(1,
                    Math.floor((scrollEl.scrollTop + rowH * 0.3) / rowH) + 1
                  ));
                  if (onPageChangeRef.current) {
                    onPageChangeRef.current({ current: page, total: totalPages });
                  }
                }
              };
              scrollEl.addEventListener('scroll', onScroll, { passive: true });
            }
          }, 150);
        })
        .catch((err) => {
          if (isMounted) {
            console.error('Error rendering DOCX:', err);
            setError('Failed to render Word document.');
            setLoading(false);
          }
        });
    };

    reader.onerror = () => {
      if (isMounted) { setError('Failed to read file.'); setLoading(false); }
    };

    reader.readAsArrayBuffer(file);
    return () => { isMounted = false; };
  }, [file, containerReady]);

  // Scale is computed against the real .viewer-content width, not window.innerWidth.
  // Fall back to 800 only on the very first paint before the observer has measured.
  const baseFit = contentWidth > 0 ? contentWidth / Math.max(1, naturalWidth) : 1;
  const scale   = baseFit * zoom;

  if (error) return (
    <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>{error}</div>
  );

  return (
    <div
      ref={outerRef}
      style={{
        // Pin the outer wrapper to the actual scroll-container width when fitting,
        // so the page sits flush-left with no horizontal scrollbar at fit-zoom.
        // When zoomed in beyond fit, grow to naturalWidth * scale so the user can scroll.
        width: contentWidth > 0
          ? `${Math.max(contentWidth, Math.ceil(naturalWidth * scale))}px`
          : `${Math.ceil(naturalWidth * scale)}px`,
        background: '#e2e8f0',
        position: 'relative',
      }}
    >
      {/* Loading overlay — shown while docx-preview is rendering */}
      {loading && (
        <div className="loader-container" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10,
          background: 'rgba(226,232,240,0.85)',
        }}>
          <div className="spinner" />
          <p>Parsing DOCX...</p>
        </div>
      )}

      {/* Content div: always in DOM so containerCallbackRef fires immediately */}
      <div
        ref={containerCallbackRef}
        style={{
          width: `${naturalWidth}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          visibility: loading ? 'hidden' : 'visible',
        }}
      />
    </div>
  );
}
