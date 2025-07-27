// LayerDataManager.ts - Управління даними шарів
import { mapManager } from './MapManager.js';
import { storageManager } from './StorageManager.js';
import { objectManager } from './ObjectManager.js';
import { getColoredMarkerIcon } from './utils.js';

export interface LayerObj {
  id: number;
  tileLayer: L.TileLayer;
  featureGroup: any & { overlays?: any[] };
  tileType: string;
  visible: boolean;
  title: string;
  collapsed?: boolean;
}

export interface LayerData {
  id: number;
  tileType: string;
  opacity: number;
  showLabels: boolean;
  geojson: any;
  title?: string;
  visible: boolean;
  collapsed: boolean;
  overlays: any[];
}

export class LayerDataManager {
  private static instance: LayerDataManager;
  private layers: LayerObj[] = [];
  private layerId = 1;
  
  private constructor() {}
  
  static getInstance(): LayerDataManager {
    if (!LayerDataManager.instance) {
      LayerDataManager.instance = new LayerDataManager();
    }
    return LayerDataManager.instance;
  }
  
  // Отримання всіх шарів
  getLayers(): LayerObj[] {
    return this.layers;
  }
  
  // Отримання активного шару
  getActiveLayer(): any {
    return this.layers.find(l => l.featureGroup === this.getActiveLayerRef()) || null;
  }
  
  // Отримання посилання на активний шар
  getActiveLayerRef(): any {
    return (window as any).activeLayer || null;
  }
  
  // Встановлення активного шару
  setActiveLayer(featureGroup: any): void {
    (window as any).activeLayer = featureGroup;
  }
  
  // Отримання наступного ID
  getNextLayerId(): number {
    return this.layerId++;
  }
  
  // Додавання шару
  addLayer(layer: LayerObj): void {
    this.layers.push(layer);
    this.updateLayerId();
  }
  
  // Видалення шару
  removeLayer(layerId: number): void {
    this.layers = this.layers.filter(l => l.id !== layerId);
  }
  
  // Оновлення layerId
  private updateLayerId(): void {
    const maxId = this.layers.length > 0 ? Math.max(...this.layers.map(l => l.id)) : 0;
    this.layerId = maxId + 1;
  }
  
  // Збереження шарів
  saveLayers(): void {
    const layersData = this.layers.map(layer => this.serializeLayer(layer));
    if (layersData.length > 0) {
      storageManager.saveToLocalStorage('lefleat_layers', layersData);
    }
  }
  
  // Завантаження шарів
  loadLayers(): boolean {
    try {
      const data = storageManager.loadFromLocalStorage('lefleat_layers');
      if (!data || !Array.isArray(data)) {
        return false;
      }
      
      this.layers = [];
      
      data.forEach(obj => {
        const layer = this.deserializeLayer(obj);
        if (layer) {
          this.layers.push(layer);
        }
      });
      
      this.updateLayerId();
      this.fixDuplicateIds();
      
      return true;
    } catch (error) {
      console.error('Error loading layers:', error);
      return false;
    }
  }
  
  // Серіалізація шару
  private serializeLayer(layer: LayerObj): LayerData {
    // Підготовка об'єктів для збереження
    layer.featureGroup.eachLayer((layerObj: any) => {
      const type = objectManager.getObjectType(layerObj);
      if (!layerObj.feature) return;
      
      if (!layerObj.feature.properties) layerObj.feature.properties = {};
      if (layerObj.feature && layerObj.properties) {
        Object.assign(layerObj.feature.properties, layerObj.properties);
      }
      Object.assign(layerObj.feature.properties, layerObj.properties || {});
      
      // Застосування властивостей залежно від типу
      this.applyLayerProperties(layerObj, type);
    });
    
    // Створення GeoJSON
    const features: any[] = [];
    layer.featureGroup.eachLayer((layerObj: any) => {
      if (layerObj.feature) {
        features.push(layerObj.feature);
      } else {
        try {
          const layerGeoJSON = layerObj.toGeoJSON();
          if (layerGeoJSON) {
            features.push(layerGeoJSON);
          }
        } catch (error) {
          // Мовчазно обробляємо помилки toGeoJSON
        }
      }
    });
    
    const geojson = {
      type: 'FeatureCollection',
      features: features
    };
    
    // Підготовка overlays
    let overlays: any[] = [];
    const imageData = layer.featureGroup.images || layer.featureGroup.overlays;
    if (imageData && Array.isArray(imageData)) {
      overlays = imageData.map((img: any) => ({
        url: img.url,
        bounds: img.bounds,
        opacity: img.opacity ?? 1,
        corners: img.corners
      }));
    }
    
    return {
      id: layer.id,
      tileType: layer.tileType,
      opacity: layer.tileLayer.options.opacity ?? 1,
      showLabels: (layer.tileLayer as any)._url && (layer.tileLayer as any)._url.includes('nolabels') ? false : true,
      geojson: geojson,
      title: layer.title || undefined,
      visible: layer.visible !== false,
      collapsed: layer.collapsed || false,
      overlays
    };
  }
  
  // Десеріалізація шару
  private deserializeLayer(obj: any): LayerObj | null {
    try {
      // Створення tile layer
      const tileLayer = this.createTileLayer(obj.tileType, obj.opacity, obj.showLabels);
      
      // Створення feature group
      const featureGroup = (window as any).L.featureGroup();
      
      // Відновлення об'єктів
      if (obj.geojson && obj.geojson.features) {
        (window as any).L.geoJSON(obj.geojson, {
          pointToLayer: (feature: any, latlng: any) => {
            const color = feature.properties?.color || '#1976d2';
            const iconName = feature.properties?.icon || 'place';
            return (window as any).L.marker(latlng, {
              icon: getColoredMarkerIcon(color, iconName)
            });
          },
          style: (feature: any) => {
            return {
              color: feature.properties?.color || '#1976d2',
              weight: feature.properties?.weight || 3,
              opacity: feature.properties?.opacity ?? 1,
              fillColor: feature.properties?.fillColor || '#1976d2',
              fillOpacity: feature.properties?.fillOpacity ?? 0.2
            };
          },
          onEachFeature: (feature: any, layerObj: any) => {
            featureGroup.addLayer(layerObj);
            this.setupLayerObject(layerObj, feature, featureGroup);
          }
        });
      }
      
      // Відновлення overlays
      if (obj.overlays && Array.isArray(obj.overlays)) {
        const imageData = obj.overlays.map((img: any) => ({
          url: img.url,
          bounds: img.bounds,
          opacity: img.opacity ?? 1,
          corners: img.corners
        }));
        featureGroup.images = imageData;
        featureGroup.overlays = [];
        
        if (obj.visible !== false) {
          this.restoreOverlaysWithDelay(featureGroup);
        }
      }
      
      const layerObj: LayerObj = {
        id: obj.id,
        tileLayer,
        featureGroup,
        tileType: obj.tileType,
        title: obj.title,
        visible: obj.visible !== false,
        collapsed: obj.hasOwnProperty('collapsed') ? obj.collapsed : false
      };
      
      // Додавання на карту якщо видимий
      if (obj.visible !== false) {
        mapManager.addLayer(tileLayer);
        mapManager.addLayer(featureGroup);
      }
      
      return layerObj;
    } catch (error) {
      console.error('Error deserializing layer:', error);
      return null;
    }
  }
  
  // Застосування властивостей до об'єкта шару
  private applyLayerProperties(layerObj: any, type: string): void {
    if (type === 'marker') {
      layerObj.feature.properties.color = layerObj.properties?.color || '#1976d2';
    } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
      layerObj.feature.properties.fillColor = layerObj.options?.fillColor || '#1976d2';
      layerObj.feature.properties.color = layerObj.options?.color || '#1976d2';
      layerObj.feature.properties.fillOpacity = layerObj.options?.fillOpacity || 0.2;
      layerObj.feature.properties.opacity = layerObj.options?.opacity || 1;
    } else if (type === 'polyline') {
      layerObj.feature.properties.color = layerObj.options?.color || '#1976d2';
      layerObj.feature.properties.weight = layerObj.options?.weight || 3;
      layerObj.feature.properties.opacity = layerObj.options?.opacity || 1;
      let dash = layerObj.options && layerObj.options.dashArray !== undefined && layerObj.options.dashArray !== null ? String(layerObj.options.dashArray) : '';
      if (dash === '10, 10') layerObj.feature.properties.style = 'dashed';
      else if (dash === '2, 8') layerObj.feature.properties.style = 'dotted';
      else layerObj.feature.properties.style = 'solid';
    }
  }
  
  // Налаштування об'єкта шару
  private setupLayerObject(layerObj: any, feature: any, featureGroup: any): void {
    featureGroup.addLayer(layerObj);
    
    if (feature.properties) {
      layerObj.properties = { ...feature.properties };
      
      // Виправлення undefined значень
      if (!layerObj.properties.name || layerObj.properties.name === 'undefined') {
        const type = feature.geometry?.type;
        const objectType = type === 'Point' ? 'Маркер' :
          type === 'Polygon' ? 'Полігон' :
            type === 'LineString' ? 'Лінія' : 'Об\'єкт';
        layerObj.properties.name = `${objectType} [без назви]`;
      }
      
      if (!layerObj.properties.description || layerObj.properties.description === 'undefined') {
        layerObj.properties.description = '';
      }
      
      objectManager.applyObjectProperties(layerObj, layerObj.properties);
      
      // Налаштування стилю для ліній
      if (feature.geometry && feature.geometry.type === 'LineString' && feature.properties.style) {
        let dashArray = null;
        if (feature.properties.style === 'dashed') dashArray = '10, 10';
        else if (feature.properties.style === 'dotted') dashArray = '2, 8';
        layerObj.options.dashArray = dashArray;
        layerObj.setStyle({ dashArray });
      }
    }
  }
  
  // Створення tile layer
  private createTileLayer(type: string, opacity = 1, showLabels = true): L.TileLayer {
    const tileLayerOptions = {
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
    
    const opt = (tileLayerOptions as any)[type];
    if (!opt) throw new Error(`Unknown tile type: ${type}`);
    
    let url = opt.url;
    if (opt.hasLabels && showLabels === false && opt.urlNoLabels) {
      url = opt.urlNoLabels;
    }
    
    return (window as any).L.tileLayer(url, {
      maxZoom: opt.maxZoom,
      attribution: opt.attribution,
      opacity: opacity
    });
  }
  
  // Відновлення overlays
  private restoreOverlays(featureGroup: any): void {
    if (!featureGroup.images || !Array.isArray(featureGroup.images)) return;
    
    // Перевіряємо, чи карта готова
    const map = mapManager.getMap();
    if (!map || !map.getZoom) {
      console.warn('Map not ready for overlay restoration');
      return;
    }
    
    featureGroup.images.forEach((imgData: any) => {
      try {
        const overlay = (window as any).L.distortableImageOverlay(imgData.url, {
          bounds: imgData.bounds,
          opacity: imgData.opacity || 1
        });
        
        overlay._customUrl = imgData.url;
        overlay._overlayId = `restored_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Спочатку додаємо overlay до карти
        mapManager.addLayer(overlay);
        
        // Потім встановлюємо corners (після додавання до карти)
        if (imgData.corners) {
          try {
            overlay.setCorners(imgData.corners);
          } catch (cornersError) {
            console.warn('Error setting corners for overlay:', cornersError);
          }
        }
        
        featureGroup.overlayInstances = featureGroup.overlayInstances || [];
        featureGroup.overlayInstances.push(overlay);
      } catch (error) {
        console.error('Error restoring overlay:', error);
      }
    });
  }
  
  // Відновлення overlays з затримкою для повної ініціалізації карти
  private restoreOverlaysWithDelay(featureGroup: any): void {
    setTimeout(() => {
      this.restoreOverlays(featureGroup);
    }, 100);
  }
  
  // Виправлення дублюючих ID
  private fixDuplicateIds(): void {
    const usedIds = new Set<number>();
    let hasChanges = false;
    
    this.layers.forEach((layer) => {
      if (usedIds.has(layer.id)) {
        while (usedIds.has(this.layerId)) {
          this.layerId++;
        }
        layer.id = this.layerId;
        usedIds.add(this.layerId);
        this.layerId++;
        hasChanges = true;
      } else {
        usedIds.add(layer.id);
      }
    });
    
    if (hasChanges) {
      this.saveLayers();
    }
  }
}

export const layerDataManager = LayerDataManager.getInstance(); 