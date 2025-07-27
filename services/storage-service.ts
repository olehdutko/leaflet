// Сервіс для збереження та завантаження даних

import type { LayerObj, ObjectProperties } from '../types/index.js';

/**
 * Сервіс для роботи з localStorage
 */
export class StorageService {
  private static readonly LAYERS_KEY = 'lefleat_layers';
  private static readonly CUSTOM_LAYERS_KEY = 'customLayers';
  
  /**
   * Збереження шарів у localStorage
   */
  static saveLayers(layers: LayerObj[]): void {
    try {
      const layersData = layers.map(layer => this.serializeLayer(layer));
      localStorage.setItem(this.LAYERS_KEY, JSON.stringify(layersData));
    } catch (error) {
      console.error('Помилка збереження шарів:', error);
    }
  }
  
  /**
   * Завантаження шарів з localStorage
   */
  static loadLayers(): LayerObj[] {
    try {
      const data = localStorage.getItem(this.LAYERS_KEY);
      if (!data) {
        return [];
      }
      
      const layersData = JSON.parse(data);
      return layersData.map((layerData: any) => this.deserializeLayer(layerData));
    } catch (error) {
      console.error('Помилка завантаження шарів:', error);
      return [];
    }
  }
  
  /**
   * Очищення збережених даних
   */
  static clearLayers(): void {
    try {
      localStorage.removeItem(this.LAYERS_KEY);
      localStorage.removeItem(this.CUSTOM_LAYERS_KEY);
    } catch (error) {
      console.error('Помилка очищення даних:', error);
    }
  }
  
  /**
   * Перевірка чи є збережені дані
   */
  static hasLayers(): boolean {
    return !!localStorage.getItem(this.LAYERS_KEY);
  }
  
  /**
   * Серіалізація шару для збереження
   */
  private static serializeLayer(layer: LayerObj): any {
    return {
      id: layer.id,
      tileType: layer.tileType,
      opacity: layer.tileLayer?.options?.opacity ?? 1,
      showLabels: this.getShowLabelsFromLayer(layer),
      geojson: this.extractGeoJSON(layer),
      title: layer.title || undefined,
      visible: layer.visible !== false,
      collapsed: layer.collapsed || false,
      overlays: this.extractOverlays(layer)
    };
  }
  
  /**
   * Десеріалізація шару з збережених даних
   */
  private static deserializeLayer(layerData: any): LayerObj {
    // Це заглушка - реальна реалізація буде в layers.ts
    return layerData as LayerObj;
  }
  
  /**
   * Отримання інформації про підписи з шару
   */
  private static getShowLabelsFromLayer(layer: LayerObj): boolean {
    const tileLayer = layer.tileLayer as any;
    if (tileLayer?._url && tileLayer._url.includes('nolabels')) {
      return false;
    }
    return true;
  }
  
  /**
   * Витяг GeoJSON даних з шару
   */
  private static extractGeoJSON(layer: LayerObj): any {
    const features: any[] = [];
    
    if (layer.featureGroup?.eachLayer) {
      layer.featureGroup.eachLayer((layerObj: any) => {
        if (layerObj.feature) {
          features.push(layerObj.feature);
        }
      });
    }
    
    return {
      type: 'FeatureCollection',
      features: features
    };
  }
  
  /**
   * Витяг overlay даних з шару
   */
  private static extractOverlays(layer: LayerObj): any[] {
    const imageData = layer.featureGroup?.images || layer.featureGroup?.overlays;
    if (imageData && Array.isArray(imageData)) {
      return imageData.map((img: any) => ({
        url: img.url,
        bounds: img.bounds,
        opacity: img.opacity ?? 1,
        corners: img.corners
      }));
    }
    return [];
  }
  
  /**
   * Збереження об'єкта з debounce
   */
  static debouncedSave(callback: () => void, delay: number = 200): () => void {
    let timeoutId: number | null = null;
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = window.setTimeout(() => {
        callback();
        timeoutId = null;
      }, delay);
    };
  }
  
  /**
   * Експорт даних у файл
   */
  static exportData(data: any, filename: string): void {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Помилка експорту даних:', error);
    }
  }
  
  /**
   * Імпорт даних з файлу
   */
  static async importData(file: File): Promise<any> {
    try {
      const text = await file.text();
      return JSON.parse(text);
    } catch (error) {
      console.error('Помилка імпорту даних:', error);
      throw new Error('Неправильний формат файлу');
    }
  }
} 