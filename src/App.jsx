import React, { useState, useEffect, useCallback } from 'react';
import FileUploader from './components/FileUploader';
import ViewerContainer from './components/ViewerContainer';

// If the app is loaded directly on a viewer route (e.g. after a hard refresh
// while viewing), there's no file in memory — redirect to home cleanly.
if (window.location.pathname !== '/') {
  window.history.replaceState(null, '', '/');
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);

  // Open a file: push a viewer route so the browser back button can close it
  const openFile = useCallback((file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    // Push e.g. /pdf, /docx, /xlsx, /pptx into the history stack
    window.history.pushState({ viewer: true }, '', `/${ext}`);
    setSelectedFile(file);
  }, []);

  // Close the viewer: use replaceState so we don't push another entry
  const closeViewer = useCallback(() => {
    window.history.replaceState(null, '', '/');
    setSelectedFile(null);
  }, []);

  // Handle browser back / forward buttons
  useEffect(() => {
    const onPopState = (e) => {
      if (window.location.pathname === '/') {
        // User pressed back from /pdf → close viewer without leaving the app
        setSelectedFile(null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <>
      <header className="app-header">
        <h1>Offline Document Viewer</h1>
        <p>Securely read your PDF, Word, Excel, and PowerPoint files completely offline in your browser.</p>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {!selectedFile ? (
          <FileUploader onFileSelect={openFile} />
        ) : (
          <ViewerContainer
            file={selectedFile}
            onClose={closeViewer}
          />
        )}
      </main>
    </>
  );
}

export default App;
