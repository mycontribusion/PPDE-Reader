import React, { useState, useEffect, useCallback } from 'react';
import FileUploader from './components/FileUploader';
import ViewerContainer from './components/ViewerContainer';
import { saveActiveFile, getActiveFile, clearActiveFile } from './utils/fileStore';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Open a file: persist to IndexedDB & update history state
  const openFile = useCallback(async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    await saveActiveFile(file);
    window.history.pushState({ viewer: true }, '', `/${ext}`);
    setSelectedFile(file);
  }, []);

  // Helper to convert base64 payload from Android Intent to JS File object
  const processAndroidFilePayload = useCallback((fileName, mimeType, base64Data) => {
    try {
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const file = new File([blob], fileName, { type: mimeType });
      openFile(file);
    } catch (err) {
      console.error('Error processing Android file intent:', err);
    }
  }, [openFile]);

  // Setup Android intent file receiver handler
  useEffect(() => {
    window.handleAndroidOpenFile = (name, mime, base64) => {
      processAndroidFilePayload(name, mime, base64);
    };

    // Process any file that was received before React finished mounting
    if (window._pendingAndroidFile) {
      const { name, mime, base64 } = window._pendingAndroidFile;
      delete window._pendingAndroidFile;
      processAndroidFilePayload(name, mime, base64);
    }

    return () => {
      delete window.handleAndroidOpenFile;
    };
  }, [processAndroidFilePayload]);

  // On initial mount, attempt to restore the active file if on a viewer route
  useEffect(() => {
    async function restoreSession() {
      const pathname = window.location.pathname;
      if (pathname !== '/' && !window._pendingAndroidFile) {
        const cachedFile = await getActiveFile();
        if (cachedFile) {
          setSelectedFile(cachedFile);
        } else {
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
