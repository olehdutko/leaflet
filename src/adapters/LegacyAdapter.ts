import { AppManager } from '../managers/AppManager';
import { MapManager } from '../services/MapManager';
import { OverlayManager } from '../services/OverlayManager';
import { KmzManager } from '../services/KmzManager';
import { GeoSearchManager } from '../services/GeoSearchManager';
import { ModalManager } from '../services/ModalManager';
import { Logger } from '../utils/Logger';
import { BaseService } from '../base/BaseService';

/**
 * Адаптер для зворотної сумісності зі старим кодом
 * Забезпечує доступ до нових менеджерів через глобальні функції
 */
export class LegacyAdapter {
  private static instance: LegacyAdapter;
  private appManager: AppManager | null = null;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('LegacyAdapter');
  }

  static getInstance(): LegacyAdapter {
    if (!LegacyAdapter.instance) {
      LegacyAdapter.instance = new LegacyAdapter();
    }
    return LegacyAdapter.instance;
  }

  /**
   * Ініціалізація адаптера
   */
  initialize(appManager: AppManager): void {
    this.appManager = appManager;
    this.setupGlobalFunctions();
    this.logger.info('LegacyAdapter ініціалізований');
  }

  /**
   * Налаштування глобальних функцій для зворотної сумісності
   */
  private setupGlobalFunctions(): void {
    if (!this.appManager) {
      this.logger.error('AppManager не ініціалізований');
      return;
    }

    // Функція для оновлення title сторінки
    (window as any).updatePageTitle = (baseTitle: string = 'Мапа Львова на Leaflet') => {
      try {
        const mapManager = this.appManager!.getService<MapManager>('map');
        mapManager.updatePageTitle(baseTitle);
      } catch (error) {
        this.logger.error('Помилка оновлення title:', error);
      }
    };

    // Функція для закриття модального вікна редагування
    (window as any).closeEditModal = () => {
      try {
        const modalManager = this.appManager!.getService<ModalManager>('modal');
        modalManager.closeEditModal();
      } catch (error) {
        this.logger.error('Помилка закриття модального вікна:', error);
      }
    };

    // Функція для збереження шарів
    (window as any).saveLayersToStorage = () => {
      try {
        const mapManager = this.appManager!.getService<MapManager>('map');
        mapManager.saveLayersToStorage();
      } catch (error) {
        this.logger.error('Помилка збереження шарів:', error);
      }
    };

    // Функція для обробки KMZ файлів
    (window as any).handleKmzFile = async (file: File) => {
      try {
        const kmzManager = this.appManager!.getService<KmzManager>('kmz');
        await kmzManager.handleKmzFile(file);
      } catch (error) {
        this.logger.error('Помилка обробки KMZ файлу:', error);
      }
    };

    // Функція для центрування панелі пошуку
    (window as any).centerGeoSearchBar = () => {
      try {
        const geoSearchManager = this.appManager!.getService<GeoSearchManager>('geoSearch');
        geoSearchManager.centerSearchBar();
      } catch (error) {
        this.logger.error('Помилка центрування панелі пошуку:', error);
      }
    };

    // Функція для додавання шару
    (window as any).addLayer = () => {
      try {
        const mapManager = this.appManager!.getService<MapManager>('map');
        mapManager.addLayer({
          id: `layer-${Date.now()}`,
          title: `Шар ${Date.now()}`,
          type: 'custom',
          opacity: 1,
          visible: true
        });
      } catch (error) {
        this.logger.error('Помилка додавання шару:', error);
      }
    };

    // Функція для завантаження шарів
    (window as any).loadLayersFromStorage = (): boolean => {
      try {
        const mapManager = this.appManager!.getService<MapManager>('map');
        return mapManager.loadLayersFromStorage();
      } catch (error) {
        this.logger.error('Помилка завантаження шарів:', error);
        return false;
      }
    };

    // Функція для показу модального вікна редагування
    (window as any).showEditModal = (layer: any) => {
      try {
        const modalManager = this.appManager!.getService<ModalManager>('modal');
        modalManager.showEditModal(layer);
      } catch (error) {
        this.logger.error('Помилка показу модального вікна:', error);
      }
    };

    // Експорт версії
    (window as any).OVERLAY_FIX_VERSION = 'v3.4';

    this.logger.info('Глобальні функції налаштовані');
  }

  /**
   * Отримання AppManager
   */
  getAppManager(): AppManager | null {
    return this.appManager;
  }

  /**
   * Отримання сервісу за ім'ям
   */
  getService<T extends BaseService>(name: string): T | null {
    if (!this.appManager) {
      return null;
    }
    try {
      return this.appManager.getService<T>(name);
    } catch (error) {
      this.logger.error(`Помилка отримання сервісу ${name}:`, error);
      return null;
    }
  }
}

// Експорт глобального екземпляра
export const legacyAdapter = LegacyAdapter.getInstance(); 