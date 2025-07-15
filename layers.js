// layers.js
// Робота з шарами: створення, видалення, експорт, імпорт, збереження, відновлення
import { map, tileLayerOptions } from './map-init.js';
import { createImageOverlay } from './objects.js';
import { getLayerIcon } from './utils.js';

export function createLayerControl(layerObj) {
  // ... код з main.js ...
}

export function saveLayersToStorage() {
  // ... код з main.js ...
}

export function loadLayersFromStorage() {
  // ... код з main.js ...
}

export function exportLayer(layerObj) {
  const data = {
    title: layerObj.title,
    geojson: layerObj.featureGroup.toGeoJSON(),
    images: (layerObj.featureGroup.images || [])
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (layerObj.title || 'layer') + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
} 