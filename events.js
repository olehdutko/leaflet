// events.js
// Обробники подій: map.on(...), кнопки, drag&drop, інші глобальні події
import { map } from './map-init.js';
import { createLayerControl, saveLayersToStorage, loadLayersFromStorage } from './layers.js';
import { createImageOverlay, updateObjectsList } from './objects.js';
import { showEditModal } from './ui.js';

export function setupMapEvents() {
  // ... map.on(...) з main.js ...
}

export function setupButtonEvents() {
  // ... кнопки, drag&drop з main.js ...
} 