const DB_NAME = 'ppde_doc_store';
const STORE_NAME = 'active_doc';
const HISTORY_STORE = 'recent_history';
const DB_VERSION = 2;
const MAX_HISTORY = 10;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Active File API ──────────────────────────────────────────────────────────

export async function saveActiveFile(file) {
  try {
    const db = await openDB();
    const fullPath = file.webkitRelativePath || file.path || file.name;
    const fileId = `${file.name}_${file.size}_${file.lastModified}`;

    // 1. Save as current active doc
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        fullPath: fullPath,
        blob: file
      };
      const req = store.put(record, 'current');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // 2. Add to Recent History (keep top 10)
    await new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const historyItem = {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        fullPath: fullPath,
        timestamp: Date.now(),
        blob: file
      };

      store.put(historyItem);

      // Prune down to MAX_HISTORY entries
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const items = getAllReq.result || [];
        if (items.length > MAX_HISTORY) {
          // Sort ascending by timestamp
          items.sort((a, b) => a.timestamp - b.timestamp);
          // Delete oldest items beyond limit
          const toDelete = items.slice(0, items.length - MAX_HISTORY);
          toDelete.forEach((item) => store.delete(item.id));
        }
        resolve();
      };
      getAllReq.onerror = () => reject(getAllReq.error);
    });
  } catch (err) {
    console.error('Failed to save file to IndexedDB:', err);
  }
}

export async function getActiveFile() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('current');
      req.onsuccess = () => {
        const record = req.result;
        if (!record || !record.blob) {
          resolve(null);
          return;
        }
        const restoredFile = new File([record.blob], record.name, {
          type: record.type,
          lastModified: record.lastModified
        });
        if (record.fullPath) {
          Object.defineProperty(restoredFile, 'path', { value: record.fullPath, writable: false });
        }
        resolve(restoredFile);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to retrieve active file from IndexedDB:', err);
    return null;
  }
}

export async function clearActiveFile() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete('current');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to clear active file from IndexedDB:', err);
  }
}

// ── Recent History API ───────────────────────────────────────────────────────

export async function getRecentFiles() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readonly');
      const store = tx.objectStore(HISTORY_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        // Sort descending by timestamp (most recent first)
        items.sort((a, b) => b.timestamp - a.timestamp);
        // Exclude raw blob in list response to keep memory low
        const summaries = items.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          size: item.size,
          lastModified: item.lastModified,
          fullPath: item.fullPath,
          timestamp: item.timestamp
        }));
        resolve(summaries);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to fetch recent files:', err);
    return [];
  }
}

export async function loadRecentFile(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readonly');
      const store = tx.objectStore(HISTORY_STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        const record = req.result;
        if (!record || !record.blob) {
          resolve(null);
          return;
        }
        const file = new File([record.blob], record.name, {
          type: record.type,
          lastModified: record.lastModified
        });
        if (record.fullPath) {
          Object.defineProperty(file, 'path', { value: record.fullPath, writable: false });
        }
        resolve(file);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to load recent file by id:', err);
    return null;
  }
}

export async function removeRecentFile(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to remove recent file:', err);
  }
}

export async function clearAllRecentFiles() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to clear recent files:', err);
  }
}
