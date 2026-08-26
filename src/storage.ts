// storage.ts - persistence layer using IndexedDB with localStorage fallback/migration

const DB_NAME = 'lefleat_db';
const DB_VERSION = 1;
const LAYERS_STORE = 'layers';
const HISTORICAL_STORE = 'historical_overlays';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(LAYERS_STORE)) {
        db.createObjectStore(LAYERS_STORE);
      }
      if (!db.objectStoreNames.contains(HISTORICAL_STORE)) {
        db.createObjectStore(HISTORICAL_STORE);
      }
    };
  });
  return dbPromise;
}

function getValue<T>(storeName: string, key: string): Promise<T | undefined> {
  return openDb().then(
    db =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

function setValue<T>(storeName: string, key: string, value: T): Promise<void> {
  return openDb().then(
    db =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
  );
}

function removeValue(storeName: string, key: string): Promise<void> {
  return openDb().then(
    db =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
  );
}

// --- Public API ---

export async function getLayersData(): Promise<any[] | undefined> {
  try {
    return await getValue<any[]>(LAYERS_STORE, 'layers');
  } catch (e) {
    console.warn('⚠️ IndexedDB getLayersData failed, falling back to localStorage', e);
    const legacy = localStorage.getItem('lefleat_layers');
    return legacy ? JSON.parse(legacy) : undefined;
  }
}

export async function setLayersData(data: any[]): Promise<void> {
  try {
    await setValue(LAYERS_STORE, 'layers', data);
  } catch (e) {
    console.warn('⚠️ IndexedDB setLayersData failed, falling back to localStorage', e);
    localStorage.setItem('lefleat_layers', JSON.stringify(data));
  }
}

export async function getHistoricalOverlays(): Promise<any[] | undefined> {
  try {
    return await getValue<any[]>(HISTORICAL_STORE, 'overlays');
  } catch (e) {
    console.warn('⚠️ IndexedDB getHistoricalOverlays failed, falling back to localStorage', e);
    const legacy = localStorage.getItem('lefleat_historical_overlays');
    return legacy ? JSON.parse(legacy) : undefined;
  }
}

export async function setHistoricalOverlays(data: any[]): Promise<void> {
  try {
    await setValue(HISTORICAL_STORE, 'overlays', data);
  } catch (e) {
    console.warn('⚠️ IndexedDB setHistoricalOverlays failed, falling back to localStorage', e);
    localStorage.setItem('lefleat_historical_overlays', JSON.stringify(data));
  }
}

export async function clearAllStorage(): Promise<void> {
  try {
    await Promise.all([
      removeValue(LAYERS_STORE, 'layers'),
      removeValue(HISTORICAL_STORE, 'overlays')
    ]);
  } catch (e) {
    console.warn('⚠️ IndexedDB clear failed, clearing localStorage keys', e);
  }
  localStorage.removeItem('lefleat_layers');
  localStorage.removeItem('lefleat_historical_overlays');
}

// Migrate legacy localStorage data into IndexedDB once
export async function migrateLegacyStorage(): Promise<void> {
  const layersLegacy = localStorage.getItem('lefleat_layers');
  const historicalLegacy = localStorage.getItem('lefleat_historical_overlays');
  let migrated = false;
  if (layersLegacy) {
    try {
      const data = JSON.parse(layersLegacy);
      if (Array.isArray(data) && data.length > 0) {
        const existing = await getValue<any[]>(LAYERS_STORE, 'layers');
        if (!existing) {
          await setValue(LAYERS_STORE, 'layers', data);
          console.log('✅ Migrated legacy layers from localStorage to IndexedDB');
          migrated = true;
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed to migrate legacy layers', e);
    }
  }
  if (historicalLegacy) {
    try {
      const data = JSON.parse(historicalLegacy);
      if (Array.isArray(data) && data.length > 0) {
        const existing = await getValue<any[]>(HISTORICAL_STORE, 'overlays');
        if (!existing) {
          await setValue(HISTORICAL_STORE, 'overlays', data);
          console.log('✅ Migrated legacy historical overlays from localStorage to IndexedDB');
          migrated = true;
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed to migrate legacy historical overlays', e);
    }
  }
  if (migrated) {
    // Keep localStorage as backup; do not delete immediately
    console.log('ℹ️ Legacy localStorage data kept as backup');
  }
}
