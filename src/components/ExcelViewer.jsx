import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import * as XLSX from 'xlsx';

export default function ExcelViewer({ file, zoom = 1.0, onPageChange }) {
  const [workbook, setWorkbook] = useState(null);
  const [activeSheet, setActiveSheet] = useState(null);
  const [sheetData, setSheetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fitWidth, setFitWidth] = useState(window.innerWidth);

  const scrollRef = useRef(null);
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

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
    let isMounted = true;

    if (file) {
      setLoading(true);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (!isMounted) return;
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        
        setWorkbook(wb);
        if (wb.SheetNames.length > 0) {
          const firstSheetName = wb.SheetNames[0];
          setActiveSheet(firstSheetName);
          const ws = wb.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
          setSheetData(json);

          if (onPageChangeRef.current) {
            onPageChangeRef.current({ current: 1, total: wb.SheetNames.length });
          }
        }
        setLoading(false);
      };

      reader.readAsArrayBuffer(file);
    }

    return () => {
      isMounted = false;
    };
  }, [file]);

  const handleSheetChange = (sheetName, index) => {
    setActiveSheet(sheetName);
    const ws = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
    setSheetData(json);

    if (onPageChangeRef.current && workbook) {
      onPageChangeRef.current({ current: index + 1, total: workbook.SheetNames.length });
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Parsing Excel file...</p>
      </div>
    );
  }

  if (!workbook || !activeSheet) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>No data found.</div>;
  }

  const tableWidth = Math.max(fitWidth, Math.round(fitWidth * zoom));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative', background: '#fff' }}>
      {/* Sheet Tabs */}
      <div className="excel-tabs" onClick={(e) => e.stopPropagation()}>
        {workbook.SheetNames.map((name, idx) => (
          <button
            key={name}
            className={`excel-tab ${activeSheet === name ? 'active' : ''}`}
            onClick={() => handleSheetChange(name, idx)}
          >
            {name}
          </button>
        ))}
      </div>
      
      {/* Excel Table Container */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', background: '#fff', padding: 0, margin: 0, width: '100%', height: '100%' }}>
        <div 
          style={{ 
            width: `${tableWidth}px`,
            minWidth: '100%',
            transition: 'width 0.15s ease'
          }}
        >
          <table className="excel-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {sheetData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell !== undefined && cell !== null ? cell.toString() : ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
