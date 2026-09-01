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

  useEffect(() => {
    if (file) {
      setLoading(false);

      const timer = setTimeout(() => {
        if (!scrollRef.current) return;
        const slides = scrollRef.current.querySelectorAll('.slide');
        const totalSlides = slides.length > 0 ? slides.length : 1;

        if (onPageChangeRef.current) {
          onPageChangeRef.current({ current: 1, total: totalSlides });
        }

        const scrollEl = scrollRef.current;
        if (scrollEl && totalSlides > 1) {
          const onScroll = () => {
            const totalH = scrollEl.scrollHeight;
            const rowH = totalH / totalSlides;
            if (rowH > 0) {
              const slide = Math.min(totalSlides, Math.max(1, Math.floor((scrollEl.scrollTop + rowH * 0.3) / rowH) + 1));
              if (onPageChangeRef.current) {
                onPageChangeRef.current({ current: slide, total: totalSlides });
              }
            }
          };
          scrollEl.addEventListener('scroll', onScroll, { passive: true });
        }
      }, 500);

      return () => clearTimeout(timer);
    }
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
      {/* Floating micro thumbnail toggle button — visible ONLY when header controls are open */}
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
