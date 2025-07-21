declare const L: any;
// Тип для обʼєкта шару
export interface ObjectProperties {
  name?: string;
  description?: string;
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  opacity?: number;
  weight?: number;
  style?: string;
  icon?: string;
  image?: string;
  [key: string]: any;
}

export interface OverlayData {
  // Додайте потрібні поля для overlay, якщо потрібно
  [key: string]: any;
}

export interface LayerObj {
  id: number;
  tileLayer: L.TileLayer;
  featureGroup: any & { overlays?: OverlayData[] };
  tileType: string;
  visible: boolean;
  title: string;
  collapsed?: boolean;
  // images?: ImageOverlayData[]; // Removed as per edit hint
}

export let customLayers: LayerObj[] = [];
export let activeLayer: any = null;
export let layerId = 1;
export function getNextLayerId() { return layerId++; }

/**
 * Створює TileLayer для заданого типу підкладки
 * @param type Тип підкладки ("План", "Ландшафт", "Супутник")
 * @param opacity Прозорість
 * @param showLabels Чи показувати підписи
 */
export function createTileLayer(type: string, opacity = 1, showLabels = true): L.TileLayer {
  const opt = (tileLayerOptions as any)[type];
  if (!opt) throw new Error(`Unknown tile type: ${type}`);
  let url = opt.url;
  if (opt.hasLabels && showLabels === false && opt.urlNoLabels) {
    url = opt.urlNoLabels;
  }
  return L.tileLayer(url, {
    maxZoom: opt.maxZoom,
    attribution: opt.attribution,
    opacity: opacity
  });
}

// --- Тимчасові оголошення для зовнішніх залежностей ---
import { showEditModal, addDoubleClickToLayer, createLayerControl, layerControlsDiv } from './ui.js';
import { getObjectType, getColoredMarkerIcon } from './utils.js';
import { applyObjectProperties } from './objects.js';
import { map, tileLayerOptions } from './map-init.js';
import * as state from './state.js';

// --- Реалізація з main.ts ---
export function saveLayersToStorage(): void {
  customLayers.forEach(l => {
    l.featureGroup.eachLayer((layer: any) => {
      const type = getObjectType(layer);
      if (!layer.feature) return;
      if (!layer.feature.properties) layer.feature.properties = {};
      if (layer.feature && layer.properties) {
        Object.assign(layer.feature.properties, layer.properties);
      }
      Object.assign(layer.feature.properties, layer.properties || {});
      if (type === 'marker') {
        layer.feature.properties.color = layer.properties?.color || '#1976d2';
      } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
        layer.feature.properties.fillColor = layer.options?.fillColor || '#1976d2';
        layer.feature.properties.color = layer.options?.color || '#1976d2';
        layer.feature.properties.fillOpacity = layer.options?.fillOpacity || 0.2;
        layer.feature.properties.opacity = layer.options?.opacity || 1;
      } else if (type === 'polyline') {
        layer.feature.properties.color = layer.options?.color || '#1976d2';
        layer.feature.properties.weight = layer.options?.weight || 3;
        layer.feature.properties.opacity = layer.options?.opacity || 1;
        let dash = layer.options && layer.options.dashArray !== undefined && layer.options.dashArray !== null ? String(layer.options.dashArray) : '';
        if (dash === '10, 10') layer.feature.properties.style = 'dashed';
        else if (dash === '2, 8') layer.feature.properties.style = 'dotted';
        else layer.feature.properties.style = 'solid';
      }
      if (layer.properties && layer.properties.image) {
        // видалено: layer.feature.properties.image = layer.properties.image;
      }
    });
  });
  const layersData = customLayers.map(l => {
    // @ts-ignore
    // видалено: images, imagesWithCorners, images: imagesWithCorners,
    return {
      id: l.id,
      tileType: l.tileType,
      opacity: l.tileLayer.options.opacity,
      // @ts-ignore
      showLabels: (l.tileLayer as any)._url && (l.tileLayer as any)._url.includes('nolabels') ? false : true,
      geojson: l.featureGroup.toGeoJSON(),
      // @ts-ignore
      title: l.title || undefined,
      visible: l.visible !== false,
      collapsed: l.collapsed || false
    };
  });
  localStorage.setItem('lefleat_layers', JSON.stringify(layersData));
}

export function loadLayersFromStorage(): boolean {
  const data = localStorage.getItem('lefleat_layers');
  if (!data) return false;
  try {
    let arr = JSON.parse(data);
    if (!Array.isArray(arr)) arr = [arr];
    customLayers.forEach(l => {
      map.removeLayer(l.tileLayer);
      map.removeLayer(l.featureGroup);
    });
    customLayers = [];
    if (layerControlsDiv) {
      layerControlsDiv.innerHTML = '';
    }
    arr.forEach((obj: any) => {
      const tileLayer = createTileLayer(obj.tileType, obj.opacity, obj.showLabels);
      const featureGroup = new L.FeatureGroup();
      tileLayer.addTo(map);
      featureGroup.addTo(map);
      if (obj.geojson) {
        L.geoJSON(obj.geojson, {
          pointToLayer: function(feature: any, latlng: any) {
            if (feature.properties && feature.properties.color) {
              return L.marker(latlng, { icon: getColoredMarkerIcon(feature.properties.color) });
            }
            return L.marker(latlng);
          },
          style: function(feature: any) {
            return {
              color: feature.properties?.color || '#1976d2',
              weight: feature.properties?.weight || 3,
              opacity: feature.properties?.opacity ?? 1,
              fillColor: feature.properties?.fillColor || '#1976d2',
              fillOpacity: feature.properties?.fillOpacity ?? 0.2
            };
          },
          onEachFeature: function(feature: any, layer: any) {
            featureGroup.addLayer(layer);
            addDoubleClickToLayer(layer);
            if (feature.properties) {
              layer.properties = { ...feature.properties };
              applyObjectProperties(layer, feature.properties);
              if (feature.geometry && feature.geometry.type === 'LineString' && feature.properties.style) {
                let dashArray = null;
                if (feature.properties.style === 'dashed') dashArray = '10, 10';
                else if (feature.properties.style === 'dotted') dashArray = '2, 8';
                layer.options.dashArray = dashArray;
                layer.setStyle({ dashArray });
              }
              if (feature.properties.image) {
                // видалено: layer.properties.image = feature.properties.image;
              }
            }
          }
        });
      }
      if (obj.images && Array.isArray(obj.images)) {
        // видалено: images, overlays, distortableImageOverlay, overlay, push, addEventListener, select, savedData, overlays
      }
      const layerObj = { id: obj.id, tileLayer, featureGroup, tileType: obj.tileType, title: obj.title, visible: obj.visible !== false, collapsed: obj.hasOwnProperty('collapsed') ? obj.collapsed : false };
      customLayers.push(layerObj);
      createLayerControl(layerObj);
      featureGroup.bringToFront();
    });
    const firstVisible = customLayers.find(l => l.visible);
    if (firstVisible) {
      setActiveLayer(firstVisible.featureGroup);
    } else {
      activeLayer = null;
      updateActiveLayerUI();
    }
    if ((window as any).Sortable && layerControlsDiv) {
      if ((window as any).layerControlsSortable) (window as any).layerControlsSortable.destroy();
      (window as any).layerControlsSortable = new (window as any).Sortable(layerControlsDiv, {
        animation: 150,
        handle: '.layer-card-drag-handle',
        onEnd: function (evt: any) {
          if (layerControlsDiv) {
            const newOrder = Array.from(layerControlsDiv.children).map((card: any) => +card.dataset.layerId);
            customLayers.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
            saveLayersToStorage();
          }
        }
      });
    }
    return true;
  } catch (e) {
    saveLayersToStorage();
    return false;
  }
}

export function addLayer(): void {
  const tileType = "План";
  const tileLayer = createTileLayer(tileType, 1);
  const featureGroup = new L.FeatureGroup();
  tileLayer.addTo(map);
  featureGroup.addTo(map);
  // Додаю дефолтну назву шару
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const layerObj = { id: layerId, tileLayer, featureGroup, tileType, visible: true, title: `Шар ${timeStr}` };
  customLayers.push(layerObj);
  createLayerControl(layerObj);
  layerId++;
  setActiveLayer(featureGroup);
  featureGroup.bringToFront();
  saveLayersToStorage();
  
  // Оновлюємо видимість draw control
  import('./draw-control.js').then(({ updateDrawControlVisibility }) => {
    updateDrawControlVisibility();
  });
}

export function setActiveLayer(featureGroup: any): void {
  activeLayer = featureGroup;
  if (state.currentEditingObject) {
    state.currentEditingObject.value = activeLayer;
  }
  updateActiveLayerUI();
  
  // Оновлюємо draw control для нового активного шару
  import('./draw-control.js').then(({ updateDrawControlForActiveLayer, updateDrawControlVisibility }) => {
    updateDrawControlForActiveLayer();
    updateDrawControlVisibility();
  });
}

export function updateActiveLayerUI(): void {
  if (layerControlsDiv) {
    document.querySelectorAll('.layer-card').forEach((card: any) => {
      const id = +card.dataset.layerId;
      const layer = customLayers.find(l => l.id === id);
      if (layer && layer.featureGroup === activeLayer) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }
  customLayers.forEach(l => {
    l.featureGroup.eachLayer((layer: any) => {
      const type = getObjectType(layer);
      if (!layer.feature) return;
      if (!layer.feature.properties) layer.feature.properties = {};
      if (layer.feature && layer.properties)
        Object.assign(layer.feature.properties, layer.properties);
      Object.assign(layer.feature.properties, layer.properties || {});
      if (type === 'marker') {
        layer.feature.properties.color = layer.properties?.color || '#1976d2';
      } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
        layer.feature.properties.fillColor = layer.options?.fillColor || '#1976d2';
        layer.feature.properties.color = layer.options?.color || '#1976d2';
        layer.feature.properties.fillOpacity = layer.options?.fillOpacity || 0.2;
        layer.feature.properties.opacity = layer.options?.opacity || 1;
      } else if (type === 'polyline') {
        layer.feature.properties.color = layer.options?.color || '#1976d2';
        layer.feature.properties.weight = layer.options?.weight || 3;
        layer.feature.properties.opacity = layer.options?.opacity || 1;
        let dash = layer.options && layer.options.dashArray !== undefined && layer.options.dashArray !== null ? String(layer.options.dashArray) : '';
        if (dash === '10, 10') layer.feature.properties.style = 'dashed';
        else if (dash === '2, 8') layer.feature.properties.style = 'dotted';
        else layer.feature.properties.style = 'solid';
      }
    });
  });
  const layersData = customLayers.map(l => {
    // @ts-ignore
    // видалено: images, imagesWithCorners, images: imagesWithCorners,
    return {
      id: l.id,
      tileType: l.tileType,
      opacity: l.tileLayer.options.opacity,
      // @ts-ignore
      showLabels: (l.tileLayer as any)._url && (l.tileLayer as any)._url.includes('nolabels') ? false : true,
      geojson: l.featureGroup.toGeoJSON(),
      // @ts-ignore
      title: l.title || undefined,
      visible: l.visible !== false,
      collapsed: l.collapsed || false
    };
  });
  localStorage.setItem('lefleat_layers', JSON.stringify(layersData));
}

// ... інші функції, повʼязані з шарами ...

// Додаю глобальне оголошення для L.distortableImageOverlay
declare global {
  interface LeafletGlobal {
    distortableImageOverlay: (url: string, options: any) => any;
  }
}
