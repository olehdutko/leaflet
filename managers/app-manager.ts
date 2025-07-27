// Головний менеджер додатку
import { EventManager, AppEvents } from './event-manager.js';
import { OverlayService } from '../services/overlay-service.js';
import { KmzService } from '../services/kmz-service.js';
import { ModalService } from '../services/modal-service.js';
import { GeoSearchService } from '../services/search-service.js';
import { ObjectSearchService } from '../services/object-search-service.js';

export interface AppConfig {
  version: string;
  debug: boolean;
  storage: {
    prefix: string;
    debounceDelay: number;
  };
  map: {
    center: [number, number];
    zoom: number;
  };
}

export interface AppState {
  isInitialized: boolean;
  isReady: boolean;
  currentLayer: any | null;
  selectedObject: any | null;
  searchQuery: string;
  modalOpen: boolean;
}

export class AppManager {
  private static instance: AppManager;
  private services: Map<string, any> = new Map();
  private eventManager: EventManager;
  private state: AppState = {
    isInitialized: false,
    isReady: false,
    currentLayer: null,
    selectedObject: null,
    searchQuery: '',
    modalOpen: false
  };
  private config: AppConfig;

  private constructor() {
    this.eventManager = EventManager.getInstance();
    this.config = {
      version: '4.0.0',
      debug: false,
      storage: {
        prefix: 'lefleat_',
        debounceDelay: 200
      },
      map: {
        center: [49.8397, 24.0297],
        zoom: 13
      }
    };
  }

  static getInstance(): AppManager {
    if (!AppManager.instance) {
      AppManager.instance = new AppManager();
    }
    return AppManager.instance;
  }

  /**
   * Ініціалізація додатку
   */
  async init(): Promise<void> {
    if (this.state.isInitialized) {
      console.warn('AppManager вже ініціалізовано');
      return;
    }

    try {
      this.state.isInitialized = true;
      this.eventManager.emit(AppEvents.DATA_LOADED, { status: 'initializing' });

      // Ініціалізуємо сервіси
      await this.initializeServices();

      // Налаштовуємо обробники подій
      this.setupEventHandlers();

      this.state.isReady = true;
      this.eventManager.emit(AppEvents.DATA_LOADED, { status: 'ready' });

      console.log('AppManager успішно ініціалізовано');
    } catch (error) {
      console.error('Помилка ініціалізації AppManager:', error);
      this.eventManager.emit(AppEvents.ERROR_OCCURRED, { error, context: 'AppManager.init' });
      throw error;
    }
  }

  /**
   * Ініціалізація сервісів
   */
  private async initializeServices(): Promise<void> {
    // Реєструємо сервіси
    this.registerService('overlay', OverlayService.getInstance());
    this.registerService('kmz', KmzService.getInstance());
    this.registerService('modal', ModalService.getInstance());
    this.registerService('geoSearch', GeoSearchService.getInstance());
    this.registerService('objectSearch', ObjectSearchService.getInstance());

    // Ініціалізуємо модальний сервіс
    const modalService = this.getService<ModalService>('modal');
    modalService.init();

    console.log('Сервіси ініціалізовано');
  }

  /**
   * Налаштування обробників подій
   */
  private setupEventHandlers(): void {
    // Обробник помилок
    this.eventManager.on(AppEvents.ERROR_OCCURRED, (data) => {
      console.error('Помилка додатку:', data.error);
      if (this.config.debug) {
        console.trace('Stack trace:', data.error);
      }
    });

    // Обробник зміни стану
    this.eventManager.on(AppEvents.OBJECT_SELECTED, (data) => {
      this.state.selectedObject = data.object;
    });

    // Обробник модальних вікон
    this.eventManager.on(AppEvents.MODAL_OPENED, () => {
      this.state.modalOpen = true;
    });

    this.eventManager.on(AppEvents.MODAL_CLOSED, () => {
      this.state.modalOpen = false;
    });
  }

  /**
   * Реєстрація сервісу
   */
  registerService(name: string, service: any): void {
    if (this.services.has(name)) {
      console.warn(`Сервіс ${name} вже зареєстрований, перезаписуємо`);
    }
    this.services.set(name, service);
    console.log(`Сервіс ${name} зареєстровано`);
  }

  /**
   * Отримання сервісу
   */
  getService<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Сервіс ${name} не знайдено`);
    }
    return service as T;
  }

  /**
   * Перевірка чи існує сервіс
   */
  hasService(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Отримання списку всіх сервісів
   */
  getServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Отримання стану додатку
   */
  getState(): AppState {
    return { ...this.state };
  }

  /**
   * Оновлення стану додатку
   */
  setState(updates: Partial<AppState>): void {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // Відправляємо подію про зміну стану
    this.eventManager.emit('state:changed', {
      oldState,
      newState: this.state,
      updates
    });
  }

  /**
   * Отримання конфігурації
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Оновлення конфігурації
   */
  setConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
    this.eventManager.emit('config:changed', this.config);
  }

  /**
   * Отримання менеджера подій
   */
  getEventManager(): EventManager {
    return this.eventManager;
  }

  /**
   * Ініціалізація сервісів з залежностями
   */
  initializeServiceDependencies(
    map: any,
    customLayers: any[],
    saveLayersToStorage: () => void,
    createLayerControl: (layer: any) => HTMLElement,
    getNextLayerId: () => string,
    layerControlsDiv: HTMLElement
  ): void {
    // Ініціалізуємо OverlayService
    const overlayService = this.getService<OverlayService>('overlay');
    overlayService.init(map, customLayers, saveLayersToStorage);

    // Ініціалізуємо KmzService
    const kmzService = this.getService<KmzService>('kmz');
    kmzService.init(
      map,
      customLayers,
      saveLayersToStorage,
      createLayerControl,
      getNextLayerId,
      layerControlsDiv
    );

    // Ініціалізуємо ObjectSearchService
    const objectSearchService = this.getService<ObjectSearchService>('objectSearch');
    objectSearchService.setCustomLayers(customLayers);

    console.log('Залежності сервісів ініціалізовано');
  }

  /**
   * Оновлення посилань на шари
   */
  updateLayers(customLayers: any[]): void {
    // Оновлюємо OverlayService
    if (this.hasService('overlay')) {
      const overlayService = this.getService<OverlayService>('overlay');
      overlayService.updateCustomLayers(customLayers);
    }

    // Оновлюємо KmzService
    if (this.hasService('kmz')) {
      const kmzService = this.getService<KmzService>('kmz');
      kmzService.updateCustomLayers(customLayers);
    }

    // Оновлюємо ObjectSearchService
    if (this.hasService('objectSearch')) {
      const objectSearchService = this.getService<ObjectSearchService>('objectSearch');
      objectSearchService.setCustomLayers(customLayers);
    }

    this.eventManager.emit(AppEvents.LAYER_UPDATED, { layers: customLayers });
  }

  /**
   * Оновлення функції збереження
   */
  updateSaveFunction(saveLayersToStorage: () => void): void {
    // Оновлюємо OverlayService
    if (this.hasService('overlay')) {
      const overlayService = this.getService<OverlayService>('overlay');
      overlayService.updateSaveFunction(saveLayersToStorage);
    }

    // Оновлюємо KmzService
    if (this.hasService('kmz')) {
      const kmzService = this.getService<KmzService>('kmz');
      kmzService.updateSaveFunction(saveLayersToStorage);
    }
  }

  /**
   * Знищення додатку
   */
  destroy(): void {
    try {
      // Знищуємо сервіси
      this.services.forEach((service, name) => {
        if (service && typeof service.destroy === 'function') {
          service.destroy();
        }
      });

      // Очищуємо сервіси
      this.services.clear();

      // Скидаємо стан
      this.state = {
        isInitialized: false,
        isReady: false,
        currentLayer: null,
        selectedObject: null,
        searchQuery: '',
        modalOpen: false
      };

      // Видаляємо всі підписки на події
      this.eventManager.offAll();

      console.log('AppManager знищено');
    } catch (error) {
      console.error('Помилка при знищенні AppManager:', error);
    }
  }

  /**
   * Перевірка чи готовий додаток
   */
  isReady(): boolean {
    return this.state.isReady;
  }

  /**
   * Перевірка чи ініціалізований додаток
   */
  isInitialized(): boolean {
    return this.state.isInitialized;
  }
} 