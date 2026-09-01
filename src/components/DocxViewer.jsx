import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import * as docx from 'docx-preview';

export default function DocxViewer({ file, zoom = 1.0, onPageChange }) {
  const outerRef         = useRef(null);
  const containerNodeRef = useRef(null);
  const [containerReady, setContainerReady] = useState(false);

  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [naturalWidth, setNaturalWidth] = useState(816);
  const [contentWidth, setContentWidth] = useState(0);

  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;
  const scrollCleanupRef  = useRef(null);

  const containerCallbackRef = useCallback((node) => {
    containerNodeRef.current = node;
    if (node) setContainerReady(true);
  }, []);

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

  useEffect(() => {
    if (!file || !containerReady || !containerNodeRef.current) return;
    let isMounted = true;

    setLoading(true);
    setError(null);
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

    const setupPageTracking = () => {
      const node = containerNodeRef.current;
      if (!node) return;

      const sections = node.querySelectorAll('section.docx-document, section.docx, .docx-wrapper > section');
      const totalPages = sections.length > 0 ? sections.length : 1;

      if (onPageChangeRef.current) {
        onPageChangeRef.current({ current: 1, total: totalPages });
      }

      let scrollEl = outerRef.current?.parentElement;
      while (scrollEl && !scrollEl.classList.contains('viewer-content')) {
        scrollEl = scrollEl.parentElement;
      }

      if (scrollEl && sections.length > 0) {
        if (scrollCleanupRef.current) {
          scrollCleanupRef.current();
          scrollCleanupRef.current = null;
        }

        const onScroll = () => {
          const scrollRect = scrollEl.getBoundingClientRect();
          const visibleCenter = (scrollRect.top + scrollRect.bottom) / 2;

          let currentPage = 1;
          let closestDist = Infinity;
          sections.forEach((sec, i) => {
            const rect = sec.getBoundingClientRect();
            const secCenter = (rect.top + rect.bottom) / 2;
            const dist = Math.abs(secCenter - visibleCenter);
            if (dist < closestDist) {
              closestDist = dist;
              currentPage = i + 1;
            }
          });

          if (onPageChangeRef.current) {
            onPageChangeRef.current({ current: currentPage, total: totalPages });
          }
        };

        scrollEl.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        scrollCleanupRef.current = () => {
          scrollEl.removeEventListener('scroll', onScroll);
        };
      }
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      if (!isMounted) return;
      const arrayBuffer = e.target.result;
      docx.renderAsync(arrayBuffer, containerNodeRef.current, null, renderOptions)
        .then(() => {
          if (!isMounted) return;
          setLoading(false);

          // Measure initial page width
          const firstSection = containerNodeRef.current.querySelector('section.docx-document, section.docx');
          if (firstSection) {
            const natural = firstSection.offsetWidth || 816;
            if (natural > 0) setNaturalWidth(natural);
          }

          // Initial tracking
          setupPageTracking();

          // Delayed re-check after images/fonts finish layout
          setTimeout(setupPageTracking, 300);
          setTimeout(setupPageTracking, 800);
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

    return () => {
      isMounted = false;
      if (scrollCleanupRef.current) {
        scrollCleanupRef.current();
        scrollCleanupRef.current = null;
      }
    };
  }, [file, containerReady]);

  const baseFit = contentWidth > 0 ? contentWidth / Math.max(1, naturalWidth) : 1;
  const scale   = baseFit * zoom;

  if (error) return (
    <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>{error}</div>
  );

  return (
    <div
      ref={outerRef}
      style={{
        width: contentWidth > 0
          ? `${Math.max(contentWidth, Math.ceil(naturalWidth * scale))}px`
          : `${Math.ceil(naturalWidth * scale)}px`,
        background: '#e2e8f0',
        position: 'relative',
      }}
    >
      {loading && (
        <div className="loader-container" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10,
          background: 'rgba(226,232,240,0.85)',
        }}>
          <div className="spinner" />
          <p>Parsing DOCX...</p>
        </div>
      )}

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
