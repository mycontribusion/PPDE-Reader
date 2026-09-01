import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function ExcelViewer({ file }) {
  const [workbook, setWorkbook] = useState(null);
  const [activeSheet, setActiveSheet] = useState(null);
  const [sheetData, setSheetData] = useState([]);
  const [loading, setLoading] = useState(true);

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
        }
        setLoading(false);
      };

      reader.readAsArrayBuffer(file);
    }

    return () => {
      isMounted = false;
    };
  }, [file]);

  const handleSheetChange = (sheetName) => {
    setActiveSheet(sheetName);
    const ws = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
    setSheetData(json);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem' }}>
      <div className="excel-tabs">
        {workbook.SheetNames.map(name => (
          <button
            key={name}
            className={`excel-tab ${activeSheet === name ? 'active' : ''}`}
            onClick={() => handleSheetChange(name)}
          >
            {name}
          </button>
        ))}
      </div>
      
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="excel-table">
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
  );
}
