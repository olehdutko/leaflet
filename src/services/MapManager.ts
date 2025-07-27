import { BaseService } from '../base/BaseService';
import { Logger } from '../utils/Logger';

export interface MapConfig {
  center: [number, number];
  zoom: number;
  minZoom: number;
  maxZoom: number;
  tileLayerUrl: string;
  tileLayerOptions: any;
}

export interface LayerData {
  id: string;
  title: string;
  type: string;
  opacity: number;
  visible: boolean;
  data?: any;
}

export class MapManager extends BaseService {
  protected logger: Logger;
  private map: any = null;
  private config: MapConfig;
  private layers: Map<string, LayerData> = new Map();
  private version: string = 'v3.4';

  constructor() {
    super('MapManager');
    this.logger = new Logger('MapManager');
    
    this.config = {
      center: [49.8397, 24.0297], // Львів
      zoom: 13,
      minZoom: 8,
      maxZoom: 18,
      tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      tileLayerOptions: {
        attribution: '© OpenStreetMap contributors'
      }
    };
  }

  /**
   * Ініціалізація сервісу
   */
  protected onInit(): void {
    this.logger.info('MapManager ініціалізований');
  }

  /**
   * Знищення сервісу
   */
  protected onDestroy(): void {
    this.logger.info('MapManager знищений');
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  /**
   * Ініціалізація карти
   */
  public initializeMap(): void {
    try {
      this.logger.info('Ініціалізація карти');

      // Створити карту
      this.map = (window as any).L.map('map', {
        center: this.config.center,
        zoom: this.config.zoom,
        minZoom: this.config.minZoom,
        maxZoom: this.config.maxZoom
      });

      // Додати базовий tile layer
      (window as any).L.tileLayer(this.config.tileLayerUrl, this.config.tileLayerOptions)
        .addTo(this.map);

      // Зберегти посилання на карту глобально
      (window as any).map = this.map;

      // Оновити title сторінки
      this.updatePageTitle();

      // Експортувати версію
      (window as any).OVERLAY_FIX_VERSION = this.version;

      this.logger.info('Карта успішно ініціалізована');

    } catch (error) {
      this.logger.error('Помилка ініціалізації карти:', error);
    }
  }

  /**
   * Оновлення title сторінки з версією
   */
  public updatePageTitle(baseTitle: string = 'Мапа Львова на Leaflet'): void {
    document.title = `${baseTitle} ${this.version}`;
  }

  /**
   * Додавання шару
   */
  public addLayer(layerData: LayerData): void {
    try {
      this.logger.info('Додавання шару:', layerData.title);

      // Створити feature group
      const featureGroup = new (window as any).L.FeatureGroup();
      
      // Додати до карти
      if (this.map) {
        featureGroup.addTo(this.map);
      }

      // Зберегти дані шару
      this.layers.set(layerData.id, {
        ...layerData,
        data: featureGroup
      });

      // Додати до customLayers
      if (!(window as any).customLayers) {
        (window as any).customLayers = [];
      }

      (window as any).customLayers.push({
        title: layerData.title,
        featureGroup: featureGroup
      });

      this.logger.info('Шар успішно додано:', layerData.title);

    } catch (error) {
      this.logger.error('Помилка додавання шару:', error);
    }
  }

  /**
   * Видалення шару
   */
  public removeLayer(layerId: string): void {
    try {
      const layer = this.layers.get(layerId);
      if (!layer) {
        this.logger.warn('Шар не знайдено:', layerId);
        return;
      }

      this.logger.info('Видалення шару:', layer.title);

      // Видалити з карти
      if (layer.data && this.map) {
        this.map.removeLayer(layer.data);
      }

      // Видалити з layers
      this.layers.delete(layerId);

      // Видалити з customLayers
      if ((window as any).customLayers) {
        const index = (window as any).customLayers.findIndex((l: any) => l.title === layer.title);
        if (index > -1) {
          (window as any).customLayers.splice(index, 1);
        }
      }

      this.logger.info('Шар успішно видалено:', layer.title);

    } catch (error) {
      this.logger.error('Помилка видалення шару:', error);
    }
  }

  /**
   * Отримання всіх шарів
   */
  public getLayers(): LayerData[] {
    return Array.from(this.layers.values());
  }

  /**
   * Отримання шару за ID
   */
  public getLayer(layerId: string): LayerData | undefined {
    return this.layers.get(layerId);
  }

  /**
   * Оновлення видимості шару
   */
  public setLayerVisibility(layerId: string, visible: boolean): void {
    try {
      const layer = this.layers.get(layerId);
      if (!layer) {
        this.logger.warn('Шар не знайдено:', layerId);
        return;
      }

      layer.visible = visible;

      if (layer.data) {
        if (visible) {
          if (this.map) {
            layer.data.addTo(this.map);
          }
        } else {
          if (this.map) {
            this.map.removeLayer(layer.data);
          }
        }
      }

      this.logger.info(`Видимість шару ${layer.title} змінено на: ${visible}`);

    } catch (error) {
      this.logger.error('Помилка зміни видимості шару:', error);
    }
  }

  /**
   * Оновлення прозорості шару
   */
  public setLayerOpacity(layerId: string, opacity: number): void {
    try {
      const layer = this.layers.get(layerId);
      if (!layer) {
        this.logger.warn('Шар не знайдено:', layerId);
        return;
      }

      layer.opacity = opacity;

      if (layer.data) {
        layer.data.setStyle({ opacity: opacity });
      }

      this.logger.info(`Прозорість шару ${layer.title} змінено на: ${opacity}`);

    } catch (error) {
      this.logger.error('Помилка зміни прозорості шару:', error);
    }
  }

  /**
   * Завантаження шарів з localStorage
   */
  public loadLayersFromStorage(): boolean {
    try {
      this.logger.info('Завантаження шарів з localStorage');

      const savedLayers = localStorage.getItem('customLayers');
      if (!savedLayers) {
        this.logger.info('Збережених шарів не знайдено');
        return false;
      }

      const layersData = JSON.parse(savedLayers);
      
      if (!Array.isArray(layersData) || layersData.length === 0) {
        this.logger.info('Немає валідних даних шарів');
        return false;
      }

      // Відновити шари
      layersData.forEach((layerData: any) => {
        if (layerData.title && layerData.featureGroup) {
          this.restoreLayer(layerData);
        }
      });

      this.logger.info(`Відновлено ${layersData.length} шарів`);
      return true;

    } catch (error) {
      this.logger.error('Помилка завантаження шарів:', error);
      return false;
    }
  }

  /**
   * Відновлення шару з даних
   */
  private restoreLayer(layerData: any): void {
    try {
      // Створити feature group
      const featureGroup = new (window as any).L.FeatureGroup();
      
      // Відновити overlay зображення
      if (layerData.featureGroup.images) {
        layerData.featureGroup.images.forEach((imageData: any) => {
          this.restoreOverlay(imageData, featureGroup);
        });
      }

      // Додати до карти
      if (this.map) {
        featureGroup.addTo(this.map);
      }

      // Додати до customLayers
      if (!(window as any).customLayers) {
        (window as any).customLayers = [];
      }

      (window as any).customLayers.push({
        title: layerData.title,
        featureGroup: featureGroup
      });

      this.logger.debug('Відновлено шар:', layerData.title);

    } catch (error) {
      this.logger.error('Помилка відновлення шару:', error);
    }
  }

  /**
   * Відновлення overlay з даних
   */
  private restoreOverlay(imageData: any, featureGroup: any): void {
    try {
      let bounds: any;

      if (imageData.bounds) {
        bounds = (window as any).L.latLngBounds(
          (window as any).L.latLng(imageData.bounds.south, imageData.bounds.west),
          (window as any).L.latLng(imageData.bounds.north, imageData.bounds.east)
        );
      } else if (imageData.corners && imageData.corners.length >= 3) {
        const lats = imageData.corners.map((c: any) => c.lat);
        const lngs = imageData.corners.map((c: any) => c.lng);
        bounds = (window as any).L.latLngBounds(
          (window as any).L.latLng(Math.min(...lats), Math.min(...lngs)),
          (window as any).L.latLng(Math.max(...lats), Math.max(...lngs))
        );
      } else {
        // Використати bounds карти
        bounds = this.map.getBounds();
      }

      // Створити overlay
      const overlay = (window as any).L.imageOverlay(imageData.url, bounds, {
        interactive: true,
        crossOrigin: 'anonymous'
      });

      // Додати до feature group
      overlay.addTo(featureGroup);

      // Додати до overlayInstances
      if (!featureGroup.overlayInstances) {
        featureGroup.overlayInstances = [];
      }
      featureGroup.overlayInstances.push(overlay);

      this.logger.debug('Відновлено overlay:', imageData.url);

    } catch (error) {
      this.logger.error('Помилка відновлення overlay:', error);
    }
  }

  /**
   * Збереження шарів в localStorage
   */
  public saveLayersToStorage(): void {
    try {
      this.logger.debug('Збереження шарів в localStorage');

      if (!(window as any).customLayers) {
        this.logger.debug('Немає шарів для збереження');
        return;
      }

      const layersData = (window as any).customLayers.map((layer: any) => {
        const layerInfo: any = {
          title: layer.title
        };

        if (layer.featureGroup && layer.featureGroup.overlayInstances) {
          layerInfo.featureGroup = {
            images: layer.featureGroup.overlayInstances.map((overlay: any) => {
              const bounds = overlay.getBounds();
              const corners = overlay.getCorners ? overlay.getCorners() : null;
              
              return {
                url: overlay._customUrl || overlay._url || overlay.url,
                bounds: {
                  north: bounds.getNorth(),
                  south: bounds.getSouth(),
                  east: bounds.getEast(),
                  west: bounds.getWest()
                },
                corners: corners ? corners.map((c: any) => ({ lat: c.lat, lng: c.lng })) : null
              };
            })
          };
        }

        return layerInfo;
      });

      localStorage.setItem('customLayers', JSON.stringify(layersData));
      this.logger.debug(`Збережено ${layersData.length} шарів`);

    } catch (error) {
      this.logger.error('Помилка збереження шарів:', error);
    }
  }

  /**
   * Отримання поточної карти
   */
  public getMap(): any {
    return this.map;
  }

  /**
   * Отримання конфігурації карти
   */
  public getConfig(): MapConfig {
    return { ...this.config };
  }

  /**
   * Встановлення конфігурації карти
   */
  public setConfig(config: Partial<MapConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Конфігурація карти оновлена:', this.config);
  }

  /**
   * Отримання версії
   */
  public getVersion(): string {
    return this.version;
  }

  /**
   * Встановлення версії
   */
  public setVersion(version: string): void {
    this.version = version;
    this.updatePageTitle();
    (window as any).OVERLAY_FIX_VERSION = version;
    this.logger.info('Версія оновлена:', version);
  }
} 