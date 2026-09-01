import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ReactPptxViewer } from '@extend-ai/react-pptx';
import { LayoutGrid, ChevronLeft } from 'lucide-react';
import '@extend-ai/react-pptx/styles.css';

export default function PptxViewer({ file, zoom = 1.0, onPageChange, showControls = false }) {
  const [loading, setLoading]               = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [fitWidth, setFitWidth]             = useState(window.innerWidth);

  const scrollRef       = useRef(null);
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
    return () => clearTimeout(timer);
  }, [showControls]);

  useLayoutEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;

    const measureWidth = () => {
      if (el.clientWidth > 0) {
        setFitWidth(el.clientWidth);
      }
    };

    measureWidth();
    const observer = new ResizeObserver(measureWidth);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  // Poll for PPTX slide elements once loaded and attach center-based scroll tracking
  useEffect(() => {
    if (!file) return;
    setLoading(false);

    let scrollCleanup = null;
    let pollInterval = null;

    const setupSlideTracking = () => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return false;

      // Match all possible pptx slide wrapper selectors
      const slides = scrollEl.querySelectorAll('.slide, [class*="slide-wrapper"], [class*="Slide"], div[data-slide-index]');
      if (!slides || slides.length === 0) return false;

      const totalSlides = slides.length;
      if (onPageChangeRef.current) {
        onPageChangeRef.current({ current: 1, total: totalSlides });
      }

      const onScroll = () => {
        const scrollRect = scrollEl.getBoundingClientRect();
        const visibleCenter = (scrollRect.top + scrollRect.bottom) / 2;

        let currentSlide = 1;
        let closestDist = Infinity;

        slides.forEach((slideEl, idx) => {
          const rect = slideEl.getBoundingClientRect();
          const slideCenter = (rect.top + rect.bottom) / 2;
          const dist = Math.abs(slideCenter - visibleCenter);
          if (dist < closestDist) {
            closestDist = dist;
            currentSlide = idx + 1;
          }
        });

        if (onPageChangeRef.current) {
          onPageChangeRef.current({ current: currentSlide, total: totalSlides });
        }
      };

      scrollEl.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      scrollCleanup = () => {
        scrollEl.removeEventListener('scroll', onScroll);
      };

      return true;
    };

    // Retry polling until slides are rendered by WASM
    let attempts = 0;
    pollInterval = setInterval(() => {
      attempts++;
      const success = setupSlideTracking();
      if (success || attempts > 20) {
        clearInterval(pollInterval);
      }
    }, 250);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (scrollCleanup) scrollCleanup();
    };
  }, [file]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading Presentation...</p>
      </div>
    );
  }

  const slideWidth = Math.round(fitWidth * zoom);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {showControls && (
        <button 
          className="pptx-thumbnail-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setShowThumbnails(prev => !prev);
          }}
          title={showThumbnails ? 'Hide slide thumbnails' : 'Show slide thumbnails'}
          aria-label="Toggle slide thumbnails"
        >
          {showThumbnails ? <ChevronLeft size={12} /> : <LayoutGrid size={12} />}
        </button>
      )}

      <div 
        ref={scrollRef}
        style={{ 
          flex: 1, 
          height: '100%',
          overflow: 'auto', 
          backgroundColor: '#0f172a',
          display: 'flex',
          justifyContent: 'center',
          padding: 0
        }}
      >
        <div 
          style={{ 
            width: `${slideWidth}px`,
            minWidth: `${slideWidth}px`,
            height: '100%',
            transition: 'width 0.15s ease'
          }}
        >
          <ReactPptxViewer 
            source={file}
            mode="continuous"
            showThumbnails={showThumbnails}
            showToolbar={false}
          />
        </div>
      </div>
    </div>
  );
}
