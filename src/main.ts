import { AppManager } from './managers/AppManager';
import { OverlayManager } from './services/OverlayManager';
import { KmzManager } from './services/KmzManager';
import { GeoSearchManager } from './services/GeoSearchManager';
import { ModalManager } from './services/ModalManager';
import { MapManager } from './services/MapManager';
import { Logger } from './utils/Logger';

// Глобальний логер
const logger = new Logger('Main');

// Експорт версії
export const OVERLAY_FIX_VERSION = 'v3.4';

// Глобальні функції для зворотної сумісності
(window as any).OVERLAY_FIX_VERSION = OVERLAY_FIX_VERSION;

/**
 * Головна функція ініціалізації додатку
 */
export async function initializeApplication(): Promise<void> {
  try {
    logger.info('Ініціалізація додатку...');

    // Створити AppManager
    const appManager = new AppManager();
    
    // Зареєструвати сервіси
    appManager.registerService('mapManager', new MapManager());
    appManager.registerService('overlayManager', new OverlayManager());
    appManager.registerService('kmzManager', new KmzManager());
    appManager.registerService('geoSearchManager', new GeoSearchManager());
    appManager.registerService('modalManager', new ModalManager());

    // Ініціалізувати сервіси
    await appManager.init();

    // Отримати сервіси
    const mapManager = appManager.getService('mapManager') as MapManager;
    const overlayManager = appManager.getService('overlayManager') as OverlayManager;
    const kmzManager = appManager.getService('kmzManager') as KmzManager;
    const geoSearchManager = appManager.getService('geoSearchManager') as GeoSearchManager;
    const modalManager = appManager.getService('modalManager') as ModalManager;

    // Ініціалізувати карту
    mapManager.initializeMap();

    // Ініціалізувати overlay менеджер
    overlayManager.initialize();

    // Ініціалізувати геопошук
    geoSearchManager.initialize();

    // Ініціалізувати модальні вікна
    modalManager.initEditModal();

    // Завантажити шари
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

    // Налаштувати глобальні функції
    setupGlobalFunctions(mapManager, overlayManager, kmzManager, modalManager);

    // Налаштувати обробники подій
    setupEventHandlers();

    logger.info('Додаток успішно ініціалізований');

  } catch (error) {
    logger.error('Помилка ініціалізації додатку:', error);
  }
}

/**
 * Налаштування глобальних функцій
 */
function setupGlobalFunctions(
  mapManager: MapManager,
  overlayManager: OverlayManager,
  kmzManager: KmzManager,
  modalManager: ModalManager
): void {
  // Функція для оновлення title
  (window as any).updatePageTitle = (baseTitle: string = 'Мапа Львова на Leaflet') => {
    mapManager.updatePageTitle(baseTitle);
  };

  // Функція для закриття модального вікна редагування
  (window as any).closeEditModal = () => {
    modalManager.closeEditModal();
  };

  // Функція для збереження шарів
  (window as any).saveLayersToStorage = () => {
    mapManager.saveLayersToStorage();
  };

  // Функція для обробки KMZ файлів
  (window as any).handleKmzFile = async (file: File) => {
    await kmzManager.handleKmzFile(file);
  };

  // Функція для центрування панелі пошуку
  (window as any).centerGeoSearchBar = () => {
    const geoSearchManager = (window as any).appManager?.getService('geoSearchManager');
    if (geoSearchManager) {
      geoSearchManager.centerSearchBar();
    }
  };
}

/**
 * Налаштування обробників подій
 */
function setupEventHandlers(): void {
  // Обробник зміни розміру вікна
  window.addEventListener('resize', () => {
    const geoSearchManager = (window as any).appManager?.getService('geoSearchManager');
    if (geoSearchManager) {
      geoSearchManager.centerSearchBar();
    }
  });

  // Обробник завантаження DOM
  document.addEventListener('DOMContentLoaded', () => {
    // Оновити title сторінки
    (window as any).updatePageTitle();

    // Центрувати панель пошуку
    (window as any).centerGeoSearchBar();
  });
}

/**
 * Функція для додавання шару (для зворотної сумісності)
 */
export function addLayer(): void {
  try {
    const mapManager = (window as any).appManager?.getService('mapManager');
    if (mapManager) {
      mapManager.addLayer({
        id: `layer-${Date.now()}`,
        title: `Шар ${Date.now()}`,
        type: 'custom',
        opacity: 1,
        visible: true
      });
    }
  } catch (error) {
    logger.error('Помилка додавання шару:', error);
  }
}

/**
 * Функція для завантаження шарів (для зворотної сумісності)
 */
export function loadLayersFromStorage(): boolean {
  try {
    const mapManager = (window as any).appManager?.getService('mapManager');
    if (mapManager) {
      return mapManager.loadLayersFromStorage();
    }
    return false;
  } catch (error) {
    logger.error('Помилка завантаження шарів:', error);
    return false;
  }
}

// Експорт для глобального використання
(window as any).addLayer = addLayer;
(window as any).loadLayersFromStorage = loadLayersFromStorage;

// Автоматична ініціалізація при завантаженні
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
  initializeApplication();
} 