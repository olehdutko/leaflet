declare const L: any;
import { map } from './map-init.js';
import { customLayers, activeLayer, saveLayersToStorage, updateActiveLayerUI } from './layers.js';
import { getColoredMarkerIcon } from './utils.js';
// import { addDoubleClickToLayer } from './ui.js'; // видалено для уникнення циклічного імпорту

let drawControl: any = null;

export function initDrawControl() {
  if (drawControl) {
    map.removeControl(drawControl);
  }

  // Створюємо feature group для draw control (тимчасовий)
  const drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  // Створюємо draw control
  drawControl = new L.Control.Draw({
    position: 'topright',
    draw: {
      polygon: {
        allowIntersection: false,
        drawError: {
          color: '#e1e100',
          message: '<strong>Ой!<strong> форма не може перетинатися сама з собою'
        },
        shapeOptions: {
          color: '#1976d2',
          fillColor: '#1976d2',
          fillOpacity: 0.3
        }
      },
      polyline: {
        shapeOptions: {
          color: '#1976d2',
          weight: 3
        }
      },
      circle: {
        shapeOptions: {
          color: '#1976d2',
          fillColor: '#1976d2',
          fillOpacity: 0.3
        }
      },
      rectangle: {
        shapeOptions: {
          color: '#1976d2',
          fillColor: '#1976d2',
          fillOpacity: 0.3
        }
      },
      marker: {
        icon: getColoredMarkerIcon('#1976d2', 'place')
      }
    },
    edit: {
      featureGroup: drawnItems,
      remove: true
    }
  });

  // Додаємо draw control до карти
  map.addControl(drawControl);

  // Обробники подій для draw control
  map.on('draw:created', function (e: any) {
    const layer = e.layer;
    const type = e.layerType;

    // Додаємо властивості за замовчуванням
    // Генеруємо назву з поточним часом як у шарів
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const objectType = type === 'marker' ? 'Маркер' :
      type === 'polygon' ? 'Полігон' :
        type === 'polyline' ? 'Лінія' :
          type === 'circle' ? 'Коло' : 'Прямокутник';

    layer.properties = {
      name: `${objectType} ${timeStr}`,
      description: '',
      color: '#1976d2',
      fillColor: '#1976d2',
      fillOpacity: 0.3,
      opacity: 1,
      weight: 3
    };

    // Додаємо до активного шару
    if (activeLayer instanceof L.FeatureGroup) {
      activeLayer.addLayer(layer);
      if ((window as any).addDoubleClickToLayer) {
        (window as any).addDoubleClickToLayer(layer);
      }
      saveLayersToStorage();

      // Оновлюємо UI
      updateActiveLayerUI();
    }
  });

  map.on('draw:edited', function (e: any) {
    // Зберігаємо зміни в активному шарі
    if (activeLayer) {
      saveLayersToStorage();
    }
  });

  map.on('draw:deleted', function (e: any) {
    // Зберігаємо зміни в активному шарі
    if (activeLayer) {
      saveLayersToStorage();
    }
  });
}

export function setDrawButtonsEnabled(enabled: boolean) {
  // disable/enable all draw buttons
  const drawBtns = document.querySelectorAll('.leaflet-draw-toolbar a');
  drawBtns.forEach(btn => {
    (btn as HTMLElement).style.pointerEvents = enabled ? 'auto' : 'none';
    (btn as HTMLElement).style.opacity = enabled ? '1' : '0.5';
    if (!enabled) {
      btn.setAttribute('title', 'Створення обʼєктів можливе лише для активного шару');
    } else {
      btn.removeAttribute('title');
    }
  });
}

export function updateDrawControlVisibility() {
  const hasVisibleLayers = customLayers.some(layer => layer.visible);
  // виправлена перевірка: activeLayer має бути FeatureGroup
  const hasActiveLayer = !!(activeLayer && typeof L.FeatureGroup !== 'undefined' && activeLayer instanceof L.FeatureGroup);
  if (hasVisibleLayers) {
    if (!drawControl) {
      initDrawControl();
    }
    // Draw control вже доданий, показуємо його
    const drawSection = document.querySelector('.leaflet-draw');
    if (drawSection) {
      (drawSection as HTMLElement).style.display = 'block';
    }
    setDrawButtonsEnabled(hasActiveLayer);
  } else {
    // Приховуємо draw control
    const drawSection = document.querySelector('.leaflet-draw');
    if (drawSection) {
      (drawSection as HTMLElement).style.display = 'none';
    }
    setDrawButtonsEnabled(false);
  }
}

export function updateDrawControlForActiveLayer() {
  // виправлена перевірка: activeLayer має бути FeatureGroup
  if (drawControl && activeLayer && typeof L.FeatureGroup !== 'undefined' && activeLayer instanceof L.FeatureGroup) {
    // Оновлюємо feature group для редагування на активний шар
    drawControl.options.edit.featureGroup = activeLayer;
    setDrawButtonsEnabled(true);
  }
} 