// Новий main.ts з ініціалізацією нової архітектури

import { appManager } from './managers/AppManager.js';
import { StateManager } from './managers/StateManager.js';
import { EventManager } from './managers/EventManager.js';
import { StorageService } from './services/StorageService.js';
import { Logger } from './utils/Logger.js';
import { LogLevel } from './enums/index.js';

// Інтерфейс для стану додатку
interface AppState {
  layers: any[];
  activeLayer: any | null;
  currentEditingObject: any | null;
  layerId: number;
  isDraggingObject: boolean;
  settings: {
    theme: 'light' | 'dark';
    language: 'uk' | 'en';
    autoSave: boolean;
    saveInterval: number;
  };
}

// Глобальний логер для додатку
const appLogger = new Logger('Main');
appLogger.setMinLevel(LogLevel.INFO);

/**
 * Ініціалізація додатку
 */
async function initializeApp(): Promise<void> {
  try {
    appLogger.info('🚀 Початок ініціалізації додатку...');

    // Створюємо початковий стан
    const initialState: AppState = {
      layers: [],
      activeLayer: null,
      currentEditingObject: null,
      layerId: 1,
      isDraggingObject: false,
      settings: {
        theme: 'light',
        language: 'uk',
        autoSave: true,
        saveInterval: 1000
      }
    };

    // Створюємо сервіси
    const storageService = new StorageService();
    const eventManager = new EventManager();
    const stateManager = new StateManager<AppState>(initialState, 'AppState');

    // Реєструємо сервіси в AppManager
    appManager.registerService('storage', storageService, 0);
    appManager.registerService('events', eventManager, 1);
    appManager.registerService('state', stateManager, 2);

    // Ініціалізуємо всі сервіси
    await appManager.init();

    // Завантажуємо збережені дані
    await loadSavedData();

    // Налаштовуємо обробники подій
    setupEventHandlers();

    // Оновлюємо UI
    updateUI();

    appLogger.info('✅ Додаток успішно ініціалізований');

  } catch (error) {
    appLogger.error('❌ Помилка ініціалізації додатку', error);
    throw error;
  }
}

/**
 * Завантаження збережених даних
 */
async function loadSavedData(): Promise<void> {
  try {
    const storageService = appManager.getService<StorageService>('storage');
    const stateManager = appManager.getService<StateManager<AppState>>('state');

    // Завантажуємо налаштування
    const settings = await storageService.loadSettings();
    if (settings) {
      stateManager.updateField('settings', settings);
    }

    // Завантажуємо шари
    const layers = await storageService.loadArray('layers');
    if (layers && layers.length > 0) {
      stateManager.updateField('layers', layers);
    }

    appLogger.info('📦 Збережені дані завантажені');

  } catch (error) {
    appLogger.error('❌ Помилка завантаження даних', error);
  }
}

/**
 * Налаштування обробників подій
 */
function setupEventHandlers(): void {
  const eventManager = appManager.getService<EventManager>('events');
  const stateManager = appManager.getService<StateManager<AppState>>('state');

  // Обробник зміни стану
  stateManager.subscribe('ui', (state) => {
    appLogger.debug('State changed', state);
    updateUI();
  });

  // Обробник збереження
  stateManager.registerSaveCallback('main', async () => {
    const storageService = appManager.getService<StorageService>('storage');
    const currentState = stateManager.getState();
    
    await storageService.saveSettings(currentState.settings);
    await storageService.saveArray('layers', currentState.layers);
  });

  // Глобальні обробники подій
  eventManager.addHandler('app:layer-added', (layer: any) => {
    appLogger.info('Layer added', layer);
  });

  eventManager.addHandler('app:layer-removed', (layerId: number) => {
    appLogger.info('Layer removed', { layerId });
  });

  eventManager.addHandler('app:object-selected', (object: any) => {
    appLogger.info('Object selected', object);
  });

  appLogger.info('🎯 Обробники подій налаштовані');
}

/**
 * Оновлення UI
 */
function updateUI(): void {
  try {
    const stateManager = appManager.getService<StateManager<AppState>>('state');
    const state = stateManager.getState();

    // Оновлюємо заголовок сторінки
    updatePageTitle();

    // Оновлюємо тему
    updateTheme(state.settings.theme);

    // Оновлюємо мову
    updateLanguage(state.settings.language);

    appLogger.debug('UI updated');

  } catch (error) {
    appLogger.error('❌ Помилка оновлення UI', error);
  }
}

/**
 * Оновлення заголовка сторінки
 */
function updatePageTitle(): void {
  const stateManager = appManager.getService<StateManager<AppState>>('state');
  const state = stateManager.getState();
  const layerCount = state.layers.length;
  
  document.title = `Мапа Львова на Leaflet (${layerCount} шарів)`;
}

/**
 * Оновлення теми
 */
function updateTheme(theme: 'light' | 'dark'): void {
  document.body.className = document.body.className.replace(/theme-\w+/g, '');
  document.body.classList.add(`theme-${theme}`);
}

/**
 * Оновлення мови
 */
function updateLanguage(language: 'uk' | 'en'): void {
  document.documentElement.lang = language;
}

/**
 * Очищення ресурсів при закритті
 */
function cleanup(): void {
  try {
    appLogger.info('🧹 Очищення ресурсів...');
    appManager.destroy();
    appLogger.info('✅ Ресурси очищені');
  } catch (error) {
    appLogger.error('❌ Помилка очищення ресурсів', error);
  }
}

/**
 * Обробка помилок
 */
function handleError(error: Error): void {
  appLogger.error('❌ Необроблена помилка', error);
  
  // Показуємо користувачу повідомлення про помилку
  const errorMessage = document.createElement('div');
  errorMessage.className = 'error-message';
  errorMessage.textContent = 'Сталася помилка. Перезавантажте сторінку.';
  document.body.appendChild(errorMessage);
  
  // Видаляємо повідомлення через 5 секунд
  setTimeout(() => {
    if (errorMessage.parentNode) {
      errorMessage.parentNode.removeChild(errorMessage);
    }
  }, 5000);
}

// Глобальні обробники подій
window.addEventListener('error', (event) => {
  handleError(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  handleError(new Error(event.reason));
});

window.addEventListener('beforeunload', () => {
  cleanup();
});

// Експортуємо функції для використання
export {
  initializeApp,
  cleanup,
  handleError
};

// Автоматична ініціалізація при завантаженні сторінки
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
} 