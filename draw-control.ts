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

    // Генеруємо назву з поточним часом як у шарів
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const objectType = type === 'marker' ? 'Маркер' :
      type === 'polygon' ? 'Полігон' :
        type === 'polyline' ? 'Лінія' :
          type === 'circle' ? 'Коло' : 'Прямокутник';

    let description = '';
    if (type === 'polyline' && layer.getLatLngs) {
      const latlngs = layer.getLatLngs();
      let segments: number[] = [];
      let total = 0;
      for (let i = 1; i < latlngs.length; i++) {
        const dist = L.latLng(latlngs[i - 1]).distanceTo(L.latLng(latlngs[i]));
        segments.push(dist);
        total += dist;
      }
      if (segments.length > 0) {
        description = 'Відрізки: ' + segments.map(m => m.toFixed(1) + ' м').join(', ') + '\nСума: ' + total.toFixed(1) + ' м';
      }
      // Додаю feature вручну для polyline
      const coords = latlngs.map((latlng: any) => [latlng.lng, latlng.lat]);
      layer.feature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coords
        },
        properties: {
          name: `${objectType} ${timeStr}`,
          description: description,
          color: '#1976d2',
          weight: 3,
          opacity: 1,
          style: 'solid'
        }
      };
      if (!layer.properties) layer.properties = {};
      layer.properties.description = description;
      if (layer.feature && typeof layer.feature === 'object') {
        if (!layer.feature.properties) layer.feature.properties = {};
        layer.feature.properties.description = description;
      }
    } else if (type === 'polygon' && layer.getLatLngs) {
      const latlngs = layer.getLatLngs();
      if (!Array.isArray(latlngs) || latlngs.length === 0) {
        description = '';
      } else {
        // Leaflet polygons можуть бути вкладеними масивами (для мультиполігонів), беремо перший контур
        const ring = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
        if (ring.length > 2) {
          try {
            let area = 0;
            if (L.GeometryUtil && L.GeometryUtil.geodesicArea) {
              area = L.GeometryUtil.geodesicArea(ring);
            } else if (L.Polygon && L.Polygon.prototype && L.Polygon.prototype.getArea) {
              area = layer.getArea();
            } else {
              area = Math.abs(L.GeometryUtil.geodesicArea(ring));
            }
            if (area > 1000) {
              description = 'Площа: ' + (area / 1000000).toFixed(3) + ' км²';
            } else {
              description = 'Площа: ' + area.toFixed(1) + ' м²';
            }
          } catch (err) {
            description = '';
          }
        }
      }
      if (!layer.properties) layer.properties = {};
      layer.properties.description = description;
      // Явно створюю feature, якщо його немає
      if (!layer.feature) {
        layer.feature = {
          type: 'Feature',
          geometry: layer.toGeoJSON().geometry,
          properties: {}
        };
      }
      if (!layer.feature.properties) layer.feature.properties = {};
      layer.feature.properties.name = layer.properties.name || `${objectType} ${timeStr}`;
      layer.feature.properties.description = description;
    }

    layer.properties = {
      name: `${objectType} ${timeStr}`,
      description: description,
      color: '#1976d2',
      fillColor: '#1976d2',
      fillOpacity: 0.3,
      opacity: 1,
      weight: 3
    };
    // Явно копіюю description у feature.properties для polygon і polyline
    if ((type === 'polygon' || type === 'polyline') && layer.feature && layer.feature.properties) {
      layer.feature.properties.description = description;
    }

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
  // Завжди показуємо draw control, якщо є активний шар
  const hasActiveLayer = !!(activeLayer && typeof L.FeatureGroup !== 'undefined' && activeLayer instanceof L.FeatureGroup);
  if (hasActiveLayer) {
    if (!drawControl) {
      initDrawControl();
    }
    const drawSection = document.querySelector('.leaflet-draw');
    if (drawSection) {
      (drawSection as HTMLElement).style.display = 'block';
    }
    setDrawButtonsEnabled(true);
  } else {
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