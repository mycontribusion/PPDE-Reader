import React, { useState, useEffect, useCallback } from 'react';
import FileUploader from './components/FileUploader';
import ViewerContainer from './components/ViewerContainer';
import { saveActiveFile, getActiveFile, clearActiveFile } from './utils/fileStore';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // On initial mount, attempt to restore the active file if on a viewer route
  useEffect(() => {
    async function restoreSession() {
      const pathname = window.location.pathname;
      if (pathname !== '/') {
        const cachedFile = await getActiveFile();
        if (cachedFile) {
          setSelectedFile(cachedFile);
        } else {
          // If no stored file is found, redirect to home
          window.history.replaceState(null, '', '/');
        }
      }
      setIsInitializing(false);
    }

    restoreSession();
  }, []);

  // Lock body scroll when a document is open to prevent homepage scrolling
  useEffect(() => {
    if (selectedFile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedFile]);

  // Open a file: persist to IndexedDB & update history state
  const openFile = useCallback(async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    await saveActiveFile(file);
    window.history.pushState({ viewer: true }, '', `/${ext}`);
    setSelectedFile(file);
  }, []);

  // Close the viewer: clear IndexedDB & reset history
  const closeViewer = useCallback(async () => {
    await clearActiveFile();
    window.history.replaceState(null, '', '/');
    setSelectedFile(null);
  }, []);

  // Handle browser back / forward buttons
  useEffect(() => {
    const onPopState = async () => {
      if (window.location.pathname === '/') {
        await clearActiveFile();
        setSelectedFile(null);
      } else {
        const cachedFile = await getActiveFile();
        if (cachedFile) {
          setSelectedFile(cachedFile);
        } else {
          window.history.replaceState(null, '', '/');
          setSelectedFile(null);
        }
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (isInitializing) {
    return (
      <div className="loader-container" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
        <p>Loading application...</p>
      </div>
    );
  }

  // Active viewer mode: render ONLY ViewerContainer in full-screen mode
  if (selectedFile) {
    return (
      <ViewerContainer
        file={selectedFile}
        onClose={closeViewer}
      />
    );
  }

  // Home mode: render homepage with title & uploader/history
  return (
    <>
      <header className="app-header">
        <h1>Offline Document Viewer</h1>
        <p>Securely read your PDF, Word, Excel, and PowerPoint files completely offline in your browser.</p>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <FileUploader onFileSelect={openFile} />
      </main>
    </>
  );
}

export default App;
