/* Local-only incident persistence for the offline-first demo. */
const OfflineStore = (() => {
  const databaseName = 'resqmesh-offline-demo';
  const storeName = 'incidents';
  const fallbackKey = 'resqmesh.offline.incidents.v1';
  let databasePromise;

  function openDatabase() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB is unavailable'));
        return;
      }
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName)) {
          request.result.createObjectStore(storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local incident storage'));
    });
    return databasePromise;
  }

  function readFallback() {
    try {
      return JSON.parse(localStorage.getItem(fallbackKey) || '[]');
    } catch {
      return [];
    }
  }

  function writeFallback(incident) {
    const incidents = readFallback().filter(item => item.id !== incident.id);
    incidents.push(incident);
    localStorage.setItem(fallbackKey, JSON.stringify(incidents));
  }

  async function getAllIncidents() {
    const byId = new Map(readFallback().map(incident => [incident.id, incident]));
    try {
      const database = await openDatabase();
      const stored = await new Promise((resolve, reject) => {
        const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error || new Error('Could not read local incidents'));
      });
      stored.forEach(incident => byId.set(incident.id, incident));
    } catch {
      // Use localStorage fallback if IndexedDB is unavailable.
    }
    return [...byId.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async function saveIncident(incident) {
    try {
      const database = await openDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        transaction.objectStore(storeName).put(incident);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('Could not save local incident'));
        transaction.onabort = () => reject(transaction.error || new Error('Local incident save was aborted'));
      });
      return 'IndexedDB';
    } catch (error) {
      try {
        writeFallback(incident);
        return 'localStorage';
      } catch {
        throw error;
      }
    }
  }

  return { getAllIncidents, saveIncident };
})();

window.OfflineStore = OfflineStore;
