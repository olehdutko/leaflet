import { AppManager } from './managers/AppManager';
import { OverlayManager } from './services/OverlayManager';
import { KmzManager } from './services/KmzManager';
import { GeoSearchManager } from './services/GeoSearchManager';
import { ModalManager } from './services/ModalManager';
import { MapManager } from './services/MapManager';
import { Logger } from './utils/Logger';
import { legacyAdapter } from './adapters/LegacyAdapter';
import { integrationManager } from './integration/IntegrationManager';

// Глобальний логер для додатку
const logger = new Logger('Main');

// Ініціалізація додатку
async function initializeApp(): Promise<void> {
  try {
    logger.info('Початок ініціалізації додатку');

    // Створення менеджерів
    const appManager = AppManager.getInstance();
    const mapManager = new MapManager();
    const overlayManager = new OverlayManager();
    const kmzManager = new KmzManager();
    const geoSearchManager = new GeoSearchManager();
    const modalManager = new ModalManager();

    // Реєстрація сервісів в AppManager
    appManager.registerService('map', mapManager);
    appManager.registerService('overlay', overlayManager);
    appManager.registerService('kmz', kmzManager);
    appManager.registerService('geoSearch', geoSearchManager);
    appManager.registerService('modal', modalManager);

    // Ініціалізація сервісів
    await appManager.init();

    // Ініціалізація адаптера для зворотної сумісності
    legacyAdapter.initialize(appManager);

    // Ініціалізація інтеграції з існуючим кодом
    await integrationManager.initialize(appManager);

    // Ініціалізація карти
    mapManager.initializeMap();

    // Ініціалізація геопошуку
    geoSearchManager.initialize();

    // Налаштування глобальних обробників
    setupGlobalHandlers();

    logger.info('Додаток успішно ініціалізований');

  } catch (error) {
    logger.error('Помилка ініціалізації додатку:', error);
    throw error;
  }
}

// Налаштування глобальних обробників
function setupGlobalHandlers(): void {
  try {
    // Обробник завантаження сторінки
    window.addEventListener('load', () => {
      logger.info('Сторінка завантажена');
    });

    // Обробник помилок
    window.addEventListener('error', (event) => {
      logger.error('Глобальна помилка:', event.error);
    });

    // Обробник необроблених відхилень
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Необроблене відхилення:', event.reason);
    });

    logger.info('Глобальні обробники налаштовані');

  } catch (error) {
    logger.error('Помилка налаштування глобальних обробників:', error);
  }
}

// Експорт для використання в інших модулях
export { initializeApp };

// Автоматична ініціалізація при завантаженні модуля
if (typeof window !== 'undefined') {
  initializeApp().catch((error) => {
    console.error('Критична помилка ініціалізації:', error);
  });
} 