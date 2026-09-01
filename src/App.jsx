import React, { useState } from 'react';
import FileUploader from './components/FileUploader';
import ViewerContainer from './components/ViewerContainer';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);

  return (
    <>
      <header className="app-header">
        <h1>Offline Document Viewer</h1>
        <p>Securely read your PDF, Word, Excel, and PowerPoint files completely offline in your browser.</p>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {!selectedFile ? (
          <FileUploader onFileSelect={setSelectedFile} />
        ) : (
          <ViewerContainer 
            file={selectedFile} 
            onClose={() => setSelectedFile(null)} 
          />
        )}
      </main>
    </>
  );
}

export default App;
