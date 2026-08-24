declare const L: any;
import { map } from './map-init.js';
import { customLayers, activeLayer, saveLayersToStorage, updateActiveLayerUI } from './layers.js';
import { getColoredMarkerIcon } from './utils.js';
import { createTextMarker, getDefaultTextProperties, applyTextZoomScale } from './text-object.js';
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

  // Додаємо кастомну кнопку "Текст" до панелі Leaflet.Draw
  addTextDrawButton();

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
      // Обробка для полігону
      console.log('🎯 Створюю полігон з розрахунком площі...');
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
            console.log('📐 Площа полігону:', description);
          } catch (err) {
            description = '';
            console.warn('Помилка розрахунку площі полігону:', err);
          }
        }
      }
      if (!layer.properties) layer.properties = {};
      layer.properties.description = description;
      // Явно створюю feature для polygon
      if (!layer.feature) {
        console.log('🔍 latlngs для полігону:', latlngs);
        
        // Правильна обробка координат для полігону
        let coords: number[][] = [];
        
        if (Array.isArray(latlngs)) {
          if (Array.isArray(latlngs[0])) {
            // Якщо latlngs - це масив масивів
            coords = latlngs[0].map((latlng: any) => [latlng.lng, latlng.lat]);
          } else {
            // Якщо latlngs - це простий масив
            coords = latlngs.map((latlng: any) => [latlng.lng, latlng.lat]);
          }
        }
        
        // Перевіряємо, чи координати валідні
        const validCoords = coords.filter(coord => 
          coord[0] !== null && coord[1] !== null && 
          !isNaN(coord[0]) && !isNaN(coord[1])
        );
        
        if (validCoords.length > 2) {
          layer.feature = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [validCoords]
            },
            properties: {}
          };
          console.log('✅ Полігон створено як Polygon з', validCoords.length, 'точками');
          console.log('🎨 Геометрія полігону:', layer.feature.geometry);
          console.log('📍 Координати:', validCoords);
        } else {
          console.error('❌ Недостатньо валідних координат для полігону:', validCoords);
        }
      }
      if (!layer.feature.properties) layer.feature.properties = {};
      layer.feature.properties.name = `${objectType} ${timeStr}`;
      layer.feature.properties.description = description;
      layer.feature.properties.color = '#1976d2';
      layer.feature.properties.fillColor = '#1976d2';
      layer.feature.properties.fillOpacity = 0.3;
    } else if (type === 'circle' && layer.getLatLng && layer.getRadius) {
      // Обробка для кола
      console.log('🎯 Створюю коло з полігонною геометрією...');
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      console.log('📍 Центр кола:', center, 'Радіус:', radius);
      try {
        const area = Math.PI * radius * radius;
        if (area > 1000) {
          description = 'Площа: ' + (area / 1000000).toFixed(3) + ' км²';
        } else {
          description = 'Площа: ' + area.toFixed(1) + ' м²';
        }
      } catch (err) {
        description = '';
      }
      if (!layer.properties) layer.properties = {};
      layer.properties.description = description;
      // Явно створюю feature для circle як Polygon
      if (!layer.feature) {
        // Створюємо полігонну геометрію кола
        const points = [];
        const numPoints = 32; // кількість точок для апроксимації кола
        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * 2 * Math.PI;
          const lat = center.lat + (radius / 111320) * Math.cos(angle);
          const lng = center.lng + (radius / (111320 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
          points.push([lng, lat]);
        }
        // Замикаємо коло
        points.push(points[0]);
        
        layer.feature = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [points]
          },
          properties: {}
        };
        console.log('✅ Коло створено як Polygon з', points.length, 'точками');
        console.log('🎨 Геометрія:', layer.feature.geometry);
      }
      if (!layer.feature.properties) layer.feature.properties = {};
      layer.feature.properties.name = `${objectType} ${timeStr}`;
      layer.feature.properties.description = description;
      layer.feature.properties.color = '#1976d2';
      layer.feature.properties.fillColor = '#1976d2';
      layer.feature.properties.fillOpacity = 0.3;
    } else if (type === 'rectangle' && layer.getLatLngs) {
      // Обробка для прямокутника
      console.log('🎯 Створюю прямокутник з розрахунком площі...');
      const latlngs = layer.getLatLngs();
      if (!Array.isArray(latlngs) || latlngs.length === 0) {
        description = '';
      } else {
        // Для прямокутника беремо перший контур
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
            console.log('📐 Площа прямокутника:', description);
          } catch (err) {
            description = '';
            console.warn('Помилка розрахунку площі прямокутника:', err);
          }
        }
      }
      if (!layer.properties) layer.properties = {};
      layer.properties.description = description;
      
      // Явно створюю feature для rectangle як Polygon
      if (!layer.feature) {
        console.log('🔍 latlngs для прямокутника:', latlngs);
        
        // Правильна обробка координат для прямокутника
        let coords: number[][] = [];
        
        if (Array.isArray(latlngs)) {
          if (Array.isArray(latlngs[0])) {
            // Якщо latlngs - це масив масивів
            coords = latlngs[0].map((latlng: any) => [latlng.lng, latlng.lat]);
          } else {
            // Якщо latlngs - це простий масив
            coords = latlngs.map((latlng: any) => [latlng.lng, latlng.lat]);
          }
        }
        
        // Перевіряємо, чи координати валідні
        const validCoords = coords.filter(coord => 
          coord[0] !== null && coord[1] !== null && 
          !isNaN(coord[0]) && !isNaN(coord[1])
        );
        
        if (validCoords.length > 2) {
          layer.feature = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [validCoords]
            },
            properties: {}
          };
          console.log('✅ Прямокутник створено як Polygon з', validCoords.length, 'точками');
          console.log('🎨 Геометрія прямокутника:', layer.feature.geometry);
          console.log('📍 Координати:', validCoords);
        } else {
          console.error('❌ Недостатньо валідних координат для прямокутника:', validCoords);
        }
      }
      if (!layer.feature.properties) layer.feature.properties = {};
      layer.feature.properties.name = `${objectType} ${timeStr}`;
      layer.feature.properties.description = description;
      layer.feature.properties.color = '#1976d2';
      layer.feature.properties.fillColor = '#1976d2';
      layer.feature.properties.fillOpacity = 0.3;
    }

    // Встановлюємо властивості для всіх типів об'єктів
    layer.properties = {
      name: `${objectType} ${timeStr}`,
      description: description,
      color: '#1976d2',
      fillColor: '#1976d2',
      fillOpacity: 0.3,
      opacity: 1,
      weight: 3
    };
    
    // Копіюємо властивості в feature.properties для всіх типів
    if (layer.feature && layer.feature.properties) {
      Object.assign(layer.feature.properties, layer.properties);
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
    setTextDrawButtonEnabled(true);
  } else {
    setTextDrawButtonEnabled(false);
  }
}

function setTextDrawButtonEnabled(enabled: boolean) {
  const textBtn = document.querySelector('.leaflet-draw-text-tool');
  if (textBtn) {
    (textBtn as HTMLElement).style.pointerEvents = enabled ? 'auto' : 'none';
    (textBtn as HTMLElement).style.opacity = enabled ? '1' : '0.5';
    if (!enabled) {
      textBtn.setAttribute('title', 'Створення тексту можливе лише для активного шару');
    } else {
      textBtn.removeAttribute('title');
    }
  }
}

function addTextDrawButton() {
  const toolbarTop = document.querySelector('.leaflet-draw-toolbar-top');
  if (!toolbarTop) return;
  // Якщо кнопка вже є — не додавати повторно
  if (toolbarTop.querySelector('.leaflet-draw-text-tool')) return;

  const textBtn = document.createElement('a');
  textBtn.className = 'leaflet-draw-text-tool';
  textBtn.href = '#';
  textBtn.title = 'Додати текст';
  textBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h16v2"></path><path d="M9 20h6"></path><path d="M12 4v16"></path></svg>';
  textBtn.style.cssText = '';

  textBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    activateTextTool();
  });

  toolbarTop.appendChild(textBtn);
  setTextDrawButtonEnabled(!!(activeLayer && activeLayer instanceof L.FeatureGroup));
}

export function activateTextTool() {
  if (!activeLayer || !(activeLayer instanceof L.FeatureGroup)) {
    alert('Спочатку оберіть або створіть шар для тексту');
    return;
  }
  map.getContainer().style.cursor = 'crosshair';
  const clickHandler = function (e: any) {
    map.getContainer().style.cursor = '';
    map.off('click', clickHandler);
    const marker = createTextMarker(e.latlng, 'Текст', getDefaultTextProperties());
    activeLayer.addLayer(marker);
    marker._textBaseZoom = map.getZoom();
    applyTextZoomScale(marker, map.getZoom());
    if ((window as any).addDoubleClickToLayer) {
      (window as any).addDoubleClickToLayer(marker);
    }
    saveLayersToStorage();
    updateActiveLayerUI();
    import('./ui.js').then(({ showEditModal }) => {
      showEditModal(marker);
    });
  };
  map.on('click', clickHandler);
} 