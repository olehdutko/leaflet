import { AppManager } from '../managers/AppManager';
import { MapManager } from '../services/MapManager';
import { OverlayManager } from '../services/OverlayManager';
import { KmzManager } from '../services/KmzManager';
import { GeoSearchManager } from '../services/GeoSearchManager';
import { ModalManager } from '../services/ModalManager';
import { Logger } from '../utils/Logger';

/**
 * Менеджер інтеграції для зв'язку нового коду з існуючим
 */
export class IntegrationManager {
  private static instance: IntegrationManager;
  private appManager: AppManager | null = null;
  private logger: Logger;
  private isIntegrated: boolean = false;

  private constructor() {
    this.logger = new Logger('IntegrationManager');
  }

  static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  /**
   * Ініціалізація інтеграції
   */
  async initialize(appManager: AppManager): Promise<void> {
    try {
      this.appManager = appManager;
      this.logger.info('Початок інтеграції з існуючим кодом');

      // Інтеграція з існуючими функціями
      await this.integrateWithExistingCode();

      // Налаштування обробників подій
      this.setupEventHandlers();

      this.isIntegrated = true;
      this.logger.info('Інтеграція успішно завершена');

    } catch (error) {
      this.logger.error('Помилка інтеграції:', error);
      throw error;
    }
  }

  /**
   * Інтеграція з існуючим кодом
   */
  private async integrateWithExistingCode(): Promise<void> {
    if (!this.appManager) {
      throw new Error('AppManager не ініціалізований');
    }

    // Отримання сервісів
    const mapManager = this.appManager.getService<MapManager>('map');
    const overlayManager = this.appManager.getService<OverlayManager>('overlay');
    const kmzManager = this.appManager.getService<KmzManager>('kmz');
    const geoSearchManager = this.appManager.getService<GeoSearchManager>('geoSearch');
    const modalManager = this.appManager.getService<ModalManager>('modal');

    // Завантаження збережених шарів
    const loadSuccess = mapManager.loadLayersFromStorage();
    if (!loadSuccess) {
      // Створити початковий шар
      mapManager.addLayer({
        id: 'default-layer',
        title: 'Основний шар',
        type: 'default',
        opacity: 1,
        visible: true
      });
    }

    // Ініціалізація overlay менеджера
    overlayManager.initialize();

    // Ініціалізація модальних вікон
    modalManager.initEditModal();

    this.logger.info('Інтеграція з існуючим кодом завершена');
  }

  /**
   * Налаштування обробників подій
   */
  private setupEventHandlers(): void {
    // Обробник зміни розміру вікна
    window.addEventListener('resize', () => {
      try {
        const geoSearchManager = this.appManager?.getService<GeoSearchManager>('geoSearch');
        if (geoSearchManager) {
          geoSearchManager.centerSearchBar();
        }
      } catch (error) {
        this.logger.error('Помилка обробки зміни розміру вікна:', error);
      }
    });

    // Обробник завантаження DOM
    document.addEventListener('DOMContentLoaded', () => {
      try {
        // Оновити title сторінки
        if ((window as any).updatePageTitle) {
          (window as any).updatePageTitle();
        }

        // Центрувати панель пошуку
        if ((window as any).centerGeoSearchBar) {
          (window as any).centerGeoSearchBar();
        }
      } catch (error) {
        this.logger.error('Помилка обробки DOMContentLoaded:', error);
      }
    });

    this.logger.info('Обробники подій налаштовані');
  }

  /**
   * Перевірка чи інтеграція завершена
   */
  isIntegrationComplete(): boolean {
    return this.isIntegrated;
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
  getService<T>(name: string): T | null {
    if (!this.appManager) {
      return null;
    }
    try {
      return this.appManager.getService(name) as T;
    } catch (error) {
      this.logger.error(`Помилка отримання сервісу ${name}:`, error);
      return null;
    }
  }

  /**
   * Виконання операції з перевіркою інтеграції
   */
  async executeWithIntegration<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.isIntegrated) {
      throw new Error('Інтеграція не завершена');
    }
    return operation();
  }
}

// Експорт глобального екземпляра
export const integrationManager = IntegrationManager.getInstance(); 