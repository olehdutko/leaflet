import { map } from './map-init.js';

const DB_NAME = 'LefleatHistoricalOverlaysDB';
const STORE_NAME = 'historicalOverlays';
const DB_VERSION = 1;
let dbPromise: IDBDatabase | null = null;

interface OverlayData {
  id: string;
  name: string;
  year?: string;
  opacity?: number;
  visible?: boolean;
  corners?: Array<{ lat: number; lng: number }>;
  bounds?: L.LatLngBounds | [[number, number], [number, number]];
}

interface OverlayRecord {
  id: string;
  data: OverlayData;
  imageBase64: string;
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return Promise.resolve(dbPromise);
  try {
    localStorage.removeItem('lefleat_historical_overlays');
  } catch (e) { /* ignore */ }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbPromise = request.result;
      resolve(dbPromise);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveHistoricalOverlay(id: string, data: OverlayData, imageBase64: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.put({ id, data, imageBase64 });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getHistoricalOverlay(id: string): Promise<OverlayRecord | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve((request.result as OverlayRecord) || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteHistoricalOverlay(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllHistoricalOverlayIds(): Promise<string[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.getAllKeys();
    request.onsuccess = () => resolve((request.result as string[]).map(k => String(k)));
    request.onerror = () => reject(request.error);
  });
}

const activeOverlays = new Map<string, any>();

function generateOverlayId(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function addHistoricalOverlay(data: OverlayData, imageBase64: string): Promise<any> {
  if (!imageBase64) {
    throw new Error('Зображення підкладки обов\'язкове');
  }
  const id = data.id || generateOverlayId();
  removeHistoricalOverlay(id);

  const options: any = { opacity: data.opacity ?? 0.7, selected: false };
  if (data.corners && data.corners.length === 4) {
    options.corners = data.corners;
  } else if (data.bounds) {
    options.bounds = data.bounds;
  } else {
    const center = map.getCenter();
    options.bounds = [
      [center.lat - 0.005, center.lng - 0.01],
      [center.lat + 0.005, center.lng + 0.01]
    ];
  }

  const overlay = (window as any).L.distortableImageOverlay(imageBase64, options).addTo(map);
  overlay._historicalOverlayId = id;
  overlay._historicalOverlayName = data.name || 'Історична карта';
  overlay._historicalOverlayOpacity = data.opacity ?? 0.7;
  overlay._historicalOverlayVisible = data.visible !== false;
  overlay.setOpacity(data.visible !== false ? (data.opacity ?? 0.7) : 0);

  overlay.on('edit', () => {
    const stored: OverlayData = { ...data, id };
    try {
      stored.corners = overlay.getCorners?.();
      stored.bounds = overlay.getBounds?.();
      saveHistoricalOverlay(id, stored, imageBase64);
    } catch (e) {
      console.warn('⚠️ Не вдалося зчитати bounds/corners:', e);
    }
  });

  activeOverlays.set(id, overlay);
  await saveHistoricalOverlay(id, { ...data, id }, imageBase64);
  return overlay;
}

export function removeHistoricalOverlay(id: string): boolean {
  const overlay = activeOverlays.get(id);
  if (overlay) {
    map.removeLayer(overlay);
    activeOverlays.delete(id);
  }
  deleteHistoricalOverlay(id).catch(e => console.error('❌ Не вдалося видалити з IndexedDB:', e));
  return !!overlay;
}

export async function setHistoricalOverlayOpacity(id: string, opacity: number): Promise<void> {
  const overlay = activeOverlays.get(id);
  if (overlay) {
    overlay.setOpacity(opacity);
    overlay._historicalOverlayOpacity = opacity;
  }
  const stored = await getHistoricalOverlay(id);
  if (stored) {
    stored.data.opacity = opacity;
    await saveHistoricalOverlay(id, stored.data, stored.imageBase64);
  }
}

export async function setHistoricalOverlayVisible(id: string, visible: boolean): Promise<void> {
  const overlay = activeOverlays.get(id);
  const stored = await getHistoricalOverlay(id);
  const opacity = stored?.data.opacity ?? overlay?._historicalOverlayOpacity ?? 0.7;
  if (overlay) {
    overlay.setOpacity(visible ? opacity : 0);
    overlay._historicalOverlayVisible = visible;
    if (visible) overlay._historicalOverlayOpacity = opacity;
  }
  if (stored) {
    stored.data.visible = visible;
    await saveHistoricalOverlay(id, stored.data, stored.imageBase64);
  }
}

export async function restoreHistoricalOverlays(): Promise<void> {
  try {
    const ids = await getAllHistoricalOverlayIds();
    for (const id of ids) {
      const record = await getHistoricalOverlay(id);
      if (record) {
        addHistoricalOverlay(record.data, record.imageBase64).catch(e =>
          console.error('❌ Не вдалося відновити підкладку', id, e)
        );
      }
    }
    console.log('✅ Відновлено', ids.length, 'історичних підкладок');
  } catch (e) {
    console.error('❌ Помилка відновлення підкладок:', e);
  }
}
