// KmzManager.ts - Централізоване управління KMZ файлами
import { mapManager } from './MapManager.js';
import { storageManager } from './StorageManager.js';
import { uiManager } from './UIManager.js';
import { layerDataManager } from './LayerDataManager.js';

export interface KmzLayerData {
  title: string;
  featureGroup: any;
  overlays: any[];
}

export class KmzManager {
  private static instance: KmzManager;
  
  private constructor() {}
  
  static getInstance(): KmzManager {
    if (!KmzManager.instance) {
      KmzManager.instance = new KmzManager();
    }
    return KmzManager.instance;
  }
  
  /**
   * Обробка KMZ файлу
   */
  async handleKmzFile(file: File): Promise<void> {
    try {
      const kmlContent = await this.extractKmlFromKmz(file);
      const layers = await this.parseKmlContent(kmlContent);
      await this.addKmzLayers(layers);
      
      uiManager.showNotification('KMZ файл успішно завантажено', 'success');
    } catch (error) {
      console.error('Error handling KMZ file:', error);
      uiManager.showNotification('Помилка при обробці KMZ файлу', 'error');
    }
  }
  
  /**
   * Видобування KML контенту з KMZ файлу
   */
  private async extractKmlFromKmz(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const zip = await this.loadZip(arrayBuffer);
          const kmlFile = zip.file('doc.kml');
          
          if (!kmlFile) {
            throw new Error('KML файл не знайдено в KMZ архіві');
          }
          
          const kmlContent = await kmlFile.async('text');
          resolve(kmlContent);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Помилка читання файлу'));
      reader.readAsArrayBuffer(file);
    });
  }
  
  /**
   * Завантаження ZIP архіву
   */
  private async loadZip(arrayBuffer: ArrayBuffer): Promise<any> {
    // Тут потрібно використовувати бібліотеку JSZip
    // Для простоти поки що повертаємо заглушку
    throw new Error('JSZip бібліотека не підключена');
  }
  
  /**
   * Парсинг KML контенту
   */
  private async parseKmlContent(kmlContent: string): Promise<KmzLayerData[]> {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlContent, 'text/xml');
    
    const layers: KmzLayerData[] = [];
    const placemarks = xmlDoc.querySelectorAll('Placemark');
    
    placemarks.forEach((placemark, index) => {
      const title = placemark.querySelector('name')?.textContent || `Об'єкт ${index + 1}`;
      const featureGroup = this.createFeatureGroup(title);
      const overlays = this.parsePlacemarkOverlays(placemark);
      
      layers.push({ title, featureGroup, overlays });
    });
    
    return layers;
  }
  
  /**
   * Створення FeatureGroup для шару
   */
  private createFeatureGroup(title: string): any {
    const L = (window as any).L;
    const featureGroup = L.featureGroup();
    featureGroup.title = title;
    return featureGroup;
  }
  
  /**
   * Парсинг overlay з Placemark
   */
  private parsePlacemarkOverlays(placemark: Element): any[] {
    const overlays: any[] = [];
    
    // Парсинг GroundOverlay
    const groundOverlays = placemark.querySelectorAll('GroundOverlay');
    groundOverlays.forEach(overlay => {
      const url = overlay.querySelector('href')?.textContent;
      const bounds = this.parseBounds(overlay);
      
      if (url && bounds) {
        overlays.push({ url, bounds, type: 'ground' });
      }
    });
    
    return overlays;
  }
  
  /**
   * Парсинг bounds з KML
   */
  private parseBounds(overlay: Element): any {
    const latLonBox = overlay.querySelector('LatLonBox');
    if (!latLonBox) return null;
    
    const north = parseFloat(latLonBox.querySelector('north')?.textContent || '0');
    const south = parseFloat(latLonBox.querySelector('south')?.textContent || '0');
    const east = parseFloat(latLonBox.querySelector('east')?.textContent || '0');
    const west = parseFloat(latLonBox.querySelector('west')?.textContent || '0');
    
    const L = (window as any).L;
    return L.latLngBounds([south, west], [north, east]);
  }
  
  /**
   * Додавання KMZ шарів на карту
   */
  private async addKmzLayers(layers: KmzLayerData[]): Promise<void> {
    for (const layer of layers) {
      await this.addKmzLayer(layer);
    }
  }
  
  /**
   * Додавання одного KMZ шару
   */
  private async addKmzLayer(layerData: KmzLayerData): Promise<void> {
    const { title, featureGroup, overlays } = layerData;
    
    // Додаємо overlay зображення
    for (const overlay of overlays) {
      if (overlay.type === 'ground') {
        await this.addGroundOverlay(featureGroup, overlay.url, overlay.bounds);
      }
    }
    
    // Додаємо шар на карту
    mapManager.addLayer(featureGroup);
    
    // Зберігаємо в storage
    storageManager.scheduleSave();
  }
  
  /**
   * Додавання GroundOverlay
   */
  private async addGroundOverlay(featureGroup: any, url: string, bounds: any): Promise<void> {
    const L = (window as any).L;
    
    // Перевіряємо чи доступне зображення
    const imageExists = await this.checkImageExists(url);
    if (!imageExists) {
      console.warn(`Зображення недоступне: ${url}`);
      return;
    }
    
    const overlay = L.imageOverlay(url, bounds);
    featureGroup.addLayer(overlay);
  }
  
  /**
   * Перевірка доступності зображення
   */
  private async checkImageExists(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }
  
  /**
   * Отримання списку KMZ шарів
   */
  getKmzLayers(): any[] {
    return layerDataManager.getLayers().filter(layer => 
      layer.title && layer.title.includes('KMZ')
    );
  }
  
  /**
   * Видалення KMZ шару
   */
  removeKmzLayer(layerId: number): void {
    layerDataManager.removeLayer(layerId);
    storageManager.scheduleSave();
  }
}

export const kmzManager = KmzManager.getInstance(); 