import { map } from './map-init.js';
import {
  customLayers,
  activeLayer,
  saveLayersToStorage,
  updateActiveLayerUI,
} from './layers.js';
import { getObjectType, getColoredMarkerIcon } from './utils.js';
import { createTextMarker, getDefaultTextProperties, TextProperties } from './text-object.js';
import { applyObjectProperties } from './objects.js';
import { updateObjectsListForLayer } from './ui.js';
import * as L from 'leaflet';

let objectIdCounter = 0;

function ensureActiveLayer(): any {
  if (!activeLayer) {
    throw new Error('No active layer selected');
  }
  return activeLayer;
}

function generateObjectId(): string {
  return `obj_${Date.now()}_${++objectIdCounter}`;
}

function findObjectById(id: string): any {
  let found = null;
  customLayers.forEach(layerObj => {
    layerObj.featureGroup.eachLayer((layer: any) => {
      if (layer._lefleatId === id) {
        found = layer;
      }
    });
  });
  return found;
}

function findLayerObjByFeatureGroup(fg: any): any {
  return customLayers.find(layerObj => layerObj.featureGroup === fg) || null;
}

function attachBaseMetadata(layer: any, props: any): void {
  layer._lefleatId = generateObjectId();
  layer.properties = { ...(layer.properties || {}), ...props };
  if (!layer.feature) {
    layer.feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [0, 0] }
    };
  }
  layer.feature.properties = { ...(layer.feature.properties || {}), ...layer.properties };
}

export const LefleatApi = {
  addMarker(lat: number, lng: number, options: any = {}): any {
    const fg = ensureActiveLayer();
    const marker = L.marker([lat, lng], {
      icon: getColoredMarkerIcon(options.color || '#1976d2', options.icon || 'place'),
      draggable: true,
    });
    attachBaseMetadata(marker, {
      name: options.name || '',
      description: options.description || '',
      color: options.color || '#1976d2',
      icon: options.icon || 'place',
      objectType: 'marker',
    });
    marker.feature!.geometry.coordinates = [lng, lat];
    fg.addLayer(marker);
    saveLayersToStorage();
    updateObjectsListForLayer(findLayerObjByFeatureGroup(fg));
    return { id: marker._lefleatId, layer: marker };
  },

  addText(lat: number, lng: number, text: string, options: any = {}): any {
    const fg = ensureActiveLayer();
    const props: TextProperties = {
      ...getDefaultTextProperties(),
      text: text || 'Текст',
      fontSize: options.fontSize ?? 24,
      color: options.color || '#1976d2',
      rotation: options.rotation ?? 0,
      objectType: 'text',
      name: text || 'Текст',
      description: '',
    };
    const marker = createTextMarker([lat, lng], text, props);
    attachBaseMetadata(marker, props);
    marker._textBaseZoom = map.getZoom();
    fg.addLayer(marker);
    saveLayersToStorage();
    updateObjectsListForLayer(findLayerObjByFeatureGroup(fg));
    return { id: marker._lefleatId, layer: marker };
  },

  addPolygon(latLngs: any[], options: any = {}): any {
    const fg = ensureActiveLayer();
    const polygon = L.polygon(latLngs, {
      color: options.color || '#1976d2',
      fillColor: options.fillColor || options.color || '#1976d2',
      fillOpacity: options.fillOpacity ?? 0.2,
      opacity: options.opacity ?? 1,
      weight: options.weight ?? 3,
    });
    attachBaseMetadata(polygon, {
      name: options.name || '',
      description: options.description || '',
      color: options.color || '#1976d2',
      fillColor: options.fillColor || options.color || '#1976d2',
      fillOpacity: options.fillOpacity ?? 0.2,
      opacity: options.opacity ?? 1,
      weight: options.weight ?? 3,
      objectType: 'polygon',
    });
    fg.addLayer(polygon);
    saveLayersToStorage();
    updateObjectsListForLayer(findLayerObjByFeatureGroup(fg));
    return { id: polygon._lefleatId, layer: polygon };
  },

  addPolyline(latLngs: any[], options: any = {}): any {
    const fg = ensureActiveLayer();
    const polyline = L.polyline(latLngs, {
      color: options.color || '#1976d2',
      opacity: options.opacity ?? 1,
      weight: options.weight ?? 3,
    });
    attachBaseMetadata(polyline, {
      name: options.name || '',
      description: options.description || '',
      color: options.color || '#1976d2',
      opacity: options.opacity ?? 1,
      weight: options.weight ?? 3,
      objectType: 'polyline',
    });
    fg.addLayer(polyline);
    saveLayersToStorage();
    updateObjectsListForLayer(findLayerObjByFeatureGroup(fg));
    return { id: polyline._lefleatId, layer: polyline };
  },

  async geocode(query: string): Promise<any[]> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=uk`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Lefleat/1.0' } });
    if (!response.ok) throw new Error('Geocoding failed');
    return await response.json();
  },

  getObjects(): any[] {
    const result: any[] = [];
    customLayers.forEach(layerObj => {
      layerObj.featureGroup.eachLayer((layer: any) => {
        if (layer._lefleatId) {
          const type = getObjectType(layer);
          result.push({
            id: layer._lefleatId,
            type,
            properties: { ...(layer.properties || {}) },
            latLng: layer.getLatLng ? layer.getLatLng() : null,
          });
        }
      });
    });
    return result;
  },

  deleteObject(id: string): boolean {
    const layer = findObjectById(id);
    if (!layer) return false;
    const parent = customLayers.find(layerObj => {
      let found = false;
      layerObj.featureGroup.eachLayer((child: any) => {
        if (child === layer) found = true;
      });
      return found;
    });
    if (parent) {
      parent.featureGroup.removeLayer(layer);
      saveLayersToStorage();
      updateObjectsListForLayer(parent);
      return true;
    }
    return false;
  },
};

(window as any).LefleatApi = LefleatApi;
