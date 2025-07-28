declare const L: any;

export const center: [number, number] = [49.8397, 24.0297];
export const tileLayerOptions = {
  "План": {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    maxZoom: 19,
    hasLabels: false
  },
  "Ландшафт": {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap',
    maxZoom: 17,
    hasLabels: false
  },
  "Супутник": {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 19,
    hasLabels: false
  }
};

// Перевіряємо наявність елемента map перед створенням карти
let map: any = null;

if (typeof L !== 'undefined' && document.getElementById('map')) {
  map = L.map('map', {
    center: center,
    zoom: 13,
  });

  map.attributionControl.addAttribution('<a href="mailto:oleh.dutko@gmail.com">oleh.dutko@gmail.com</a>');

  // Експортуємо карту в глобальну область для зворотної сумісності
  (window as any).map = map;
} else {
  console.warn('map-init.ts: Leaflet не завантажено або елемент map не знайдено');
}

export { map };
