import L from 'leaflet';
// @ts-ignore
import 'leaflet.distortableimage';

// Тип для метаданих зображення
interface OverlayImageMeta {
  url: string;
  bounds: L.LatLngBoundsExpression;
  corners?: L.LatLng[];
  opacity?: number;
  [key: string]: any;
}

// Масив для метаданих зображень
let images: OverlayImageMeta[] = [];
// Масив для overlay-об'єктів
let overlays: L.Layer[] = [];

// Додаю декларацію для L.distortableImageOverlay
declare global {
  interface Window {
    L: any;
  }
  interface LeafletGlobal {
    distortableImageOverlay: (url: string, options: any) => any;
  }
}

// Ініціалізація карти
export function initOverlayMap(mapId: string = 'map') {
  const map = L.map(mapId, {
    center: [49.8397, 24.0297],
    zoom: 13
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);
  loadImages(map);
  return map;
}

// Додає overlay на карту та у масиви
export function addOverlay(map: L.Map, url: string) {
  const center = map.getCenter();
  const bounds: L.LatLngBoundsExpression = [
    [center.lat - 0.005, center.lng - 0.01],
    [center.lat + 0.005, center.lng + 0.01]
  ];
  // @ts-ignore
  const overlay = (window as any).L.distortableImageOverlay(url, { bounds, selected: true }).addTo(map);
  (overlay as any)._customUrl = url;
  overlays.push(overlay);
  images.push({ url, bounds, corners: (overlay as any).getCorners?.() });
  overlay.on('edit', () => {
    const idx = images.findIndex(img => img.url === url);
    if (idx !== -1) {
      images[idx].bounds = (overlay as any).getBounds();
      images[idx].corners = (overlay as any).getCorners?.();
      saveImages();
    }
  });
  saveImages();
}

// Видаляє всі overlay з карти
export function removeAllOverlays(map: L.Map) {
  overlays.forEach(ov => map.removeLayer(ov));
  overlays = [];
}

// Зберігає images у localStorage
function saveImages() {
  localStorage.setItem('ts_demo_overlays', JSON.stringify(images));
}

// Відновлює images та overlay з localStorage
export function loadImages(map: L.Map) {
  removeAllOverlays(map);
  images = JSON.parse(localStorage.getItem('ts_demo_overlays') || '[]');
  images.forEach(img => {
    let overlay: any;
    if (img.corners && img.corners.length === 4) {
      overlay = (window as any).L.distortableImageOverlay(img.url, { corners: img.corners, selected: false }).addTo(map);
    } else {
      overlay = (window as any).L.distortableImageOverlay(img.url, { bounds: img.bounds, selected: false }).addTo(map);
    }
    overlay._customUrl = img.url;
    overlays.push(overlay);
    overlay.on('edit', () => {
      const idx = images.findIndex(i => i.url === img.url);
      if (idx !== -1) {
        images[idx].bounds = overlay.getBounds();
        images[idx].corners = overlay.getCorners?.();
        saveImages();
      }
    });
  });
} 