import { BaseService } from '../base/BaseService';
import { Logger } from '../utils/Logger';
import * as L from 'leaflet';

export interface KmzLayerData {
  title: string;
  bounds?: any; // L.LatLngBounds
  overlays: Array<{
    url: string;
    bounds?: any; // L.LatLngBounds
    corners?: Array<{ lat: number; lng: number }>;
  }>;
}

export class KmzManager extends BaseService {
  protected logger: Logger;

  constructor() {
    super('KmzManager');
    this.logger = new Logger('KmzManager');
  }

  /**
   * Ініціалізація сервісу
   */
  protected onInit(): void {
    this.logger.info('KmzManager ініціалізований');
  }

  /**
   * Знищення сервісу
   */
  protected onDestroy(): void {
    this.logger.info('KmzManager знищений');
  }

  /**
   * Обробка KMZ файлу
   */
  public async handleKmzFile(file: File): Promise<void> {
    try {
      this.logger.info('Обробка KMZ файлу:', file.name);

      // @ts-ignore - JSZip завантажується динамічно
      const zip = await JSZip.loadAsync(file);

      // Знайти перший .kml файл
      const kmlFileName = Object.keys(zip.files).find(name => name.endsWith('.kml'));
      if (!kmlFileName) {
        throw new Error('KMZ файл не містить KML даних');
      }

      const kmlText = await zip.files[kmlFileName].async('string');
      const layerData = this.parseKmlData(kmlText);

      // Створити новий шар для KMZ
      await this.createKmzLayer(layerData);

    } catch (error) {
      this.logger.error('Помилка обробки KMZ файлу:', error);
      alert(`Помилка обробки KMZ файлу: ${error instanceof Error ? error.message : 'Невідома помилка'}`);
    }
  }

  /**
   * Парсинг KML даних
   */
  private parseKmlData(kmlText: string): KmzLayerData {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
      
      // Отримати назву шара
      const nameElement = xmlDoc.querySelector('name');
      const title = nameElement?.textContent || 'KMZ Шар';

      // Знайти всі GroundOverlay елементи
      const groundOverlays = xmlDoc.querySelectorAll('GroundOverlay');
      const overlays: KmzLayerData['overlays'] = [];

      groundOverlays.forEach((overlay, index) => {
        const iconElement = overlay.querySelector('Icon');
        const href = iconElement?.querySelector('href')?.textContent;
        
        if (href) {
          const bounds = this.parseKmlBounds(overlay);
          overlays.push({
            url: href,
            bounds: bounds,
            corners: bounds ? this.boundsToCorners(bounds) : undefined
          });
        }
      });

      return {
        title,
        overlays
      };

    } catch (error) {
      this.logger.error('Помилка парсингу KML:', error);
      throw new Error('Неправильний формат KML файлу');
    }
  }

  /**
   * Парсинг bounds з KML
   */
  private parseKmlBounds(overlay: Element): L.LatLngBounds | undefined {
    try {
      const latLonBox = overlay.querySelector('LatLonBox');
      if (!latLonBox) return undefined;

      const north = parseFloat(latLonBox.querySelector('north')?.textContent || '0');
      const south = parseFloat(latLonBox.querySelector('south')?.textContent || '0');
      const east = parseFloat(latLonBox.querySelector('east')?.textContent || '0');
      const west = parseFloat(latLonBox.querySelector('west')?.textContent || '0');

      if (north && south && east && west) {
        return (window as any).L.latLngBounds(
          (window as any).L.latLng(south, west),
          (window as any).L.latLng(north, east)
        );
      }

      return undefined;
    } catch (error) {
      this.logger.error('Помилка парсингу bounds:', error);
      return undefined;
    }
  }

  /**
   * Конвертація bounds в corners
   */
  private boundsToCorners(bounds: L.LatLngBounds): Array<{ lat: number; lng: number }> {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    return [
      { lat: sw.lat, lng: sw.lng }, // Південно-західний кут
      { lat: sw.lat, lng: ne.lng }, // Південно-східний кут
      { lat: ne.lat, lng: ne.lng }, // Північно-східний кут
      { lat: ne.lat, lng: sw.lng }  // Північно-західний кут
    ];
  }

  /**
   * Створення KMZ шару
   */
  private async createKmzLayer(layerData: KmzLayerData): Promise<void> {
    try {
      this.logger.info('Створення KMZ шару:', layerData.title);

      // Створити tile layer
      const tileType = 'План';
      const tileLayer = this.createTileLayer(tileType, 1);
      
      // Створити feature group
      const featureGroup = new (window as any).L.FeatureGroup();
      
      // Додати до карти
      if ((window as any).map) {
        tileLayer.addTo((window as any).map);
        featureGroup.addTo((window as any).map);
      }

      // Додати overlay зображення
      await this.addKmzOverlays(layerData, featureGroup);

      // Зберегти шар
      this.saveKmzLayer(layerData.title, tileLayer, featureGroup);

    } catch (error) {
      this.logger.error('Помилка створення KMZ шару:', error);
      throw error;
    }
  }

  /**
   * Додавання overlay зображень
   */
  private async addKmzOverlays(layerData: KmzLayerData, featureGroup: L.FeatureGroup): Promise<void> {
    try {
      for (const overlayData of layerData.overlays) {
        await this.addSingleOverlay(overlayData, featureGroup);
      }
    } catch (error) {
      this.logger.error('Помилка додавання overlay:', error);
      throw error;
    }
  }

  /**
   * Додавання одного overlay
   */
  private async addSingleOverlay(overlayData: KmzLayerData['overlays'][0], featureGroup: L.FeatureGroup): Promise<void> {
    try {
      // Створити bounds
      let bounds: L.LatLngBounds;
      
      if (overlayData.bounds) {
        bounds = overlayData.bounds;
      } else if (overlayData.corners && overlayData.corners.length >= 3) {
        // Створити bounds з corners
        const lats = overlayData.corners.map(c => c.lat);
        const lngs = overlayData.corners.map(c => c.lng);
        bounds = (window as any).L.latLngBounds(
          (window as any).L.latLng(Math.min(...lats), Math.min(...lngs)),
          (window as any).L.latLng(Math.max(...lats), Math.max(...lngs))
        );
      } else {
        // Використати bounds карти
        bounds = (window as any).map.getBounds();
      }

      // Створити overlay
      const overlay = (window as any).L.imageOverlay(overlayData.url, bounds, {
        interactive: true,
        crossOrigin: 'anonymous'
      });

      // Додати до feature group
      overlay.addTo(featureGroup);

      // Додати до overlayInstances
      if (!(featureGroup as any).overlayInstances) {
        (featureGroup as any).overlayInstances = [];
      }
      (featureGroup as any).overlayInstances.push(overlay as any);

      this.logger.info('Додано overlay:', overlayData.url);

    } catch (error) {
      this.logger.error('Помилка додавання overlay:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Створення tile layer
   */
  private createTileLayer(tileType: string, opacity: number): L.TileLayer {
    // Це заглушка - в реальному коді тут буде логіка створення tile layer
    return L.tileLayer('', {
      opacity: opacity
    });
  }

  /**
   * Збереження KMZ шару
   */
  private saveKmzLayer(title: string, tileLayer: L.TileLayer, featureGroup: L.FeatureGroup): void {
    try {
      // Додати до customLayers
      if (!(window as any).customLayers) {
        (window as any).customLayers = [];
      }

      (window as any).customLayers.push({
        title: title,
        tileLayer: tileLayer,
        featureGroup: featureGroup
      });

      // Зберегти в localStorage
      if ((window as any).saveLayersToStorage) {
        (window as any).saveLayersToStorage();
      }

      this.logger.info('KMZ шар збережено:', title);

    } catch (error) {
      this.logger.error('Помилка збереження KMZ шару:', error);
    }
  }

  /**
   * Валідація KMZ файлу
   */
  public validateKmzFile(file: File): boolean {
    // Перевірити розширення
    if (!file.name.toLowerCase().endsWith('.kmz')) {
      return false;
    }

    // Перевірити розмір (максимум 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return false;
    }

    return true;
  }

  /**
   * Отримання інформації про KMZ файл
   */
  public async getKmzInfo(file: File): Promise<{ title: string; overlayCount: number } | null> {
    try {
      // @ts-ignore
      const zip = await JSZip.loadAsync(file);
      
      const kmlFileName = Object.keys(zip.files).find(name => name.endsWith('.kml'));
      if (!kmlFileName) {
        return null;
      }

      const kmlText = await zip.files[kmlFileName].async('string');
      const layerData = this.parseKmlData(kmlText);

      return {
        title: layerData.title,
        overlayCount: layerData.overlays.length
      };

    } catch (error) {
      this.logger.error('Помилка отримання інформації про KMZ:', error);
      return null;
    }
  }
} 