// EventManager.ts - Централізоване управління подіями
import { mapManager } from './MapManager.js';
import { storageManager } from './StorageManager.js';
import { uiManager } from './UIManager.js';
import { objectManager } from './ObjectManager.js';
import { layerDataManager } from './LayerDataManager.js';

export interface EventHandler {
  event: string;
  handler: Function;
  target?: EventTarget;
  options?: AddEventListenerOptions;
}

export class EventManager {
  private static instance: EventManager;
  private handlers: Map<string, EventHandler[]> = new Map();
  private globalHandlers: EventHandler[] = [];
  
  private constructor() {}
  
  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }
  
  /**
   * Реєстрація обробника події
   */
  registerHandler(handler: EventHandler): void {
    const key = this.getHandlerKey(handler);
    if (!this.handlers.has(key)) {
      this.handlers.set(key, []);
    }
    this.handlers.get(key)!.push(handler);
    
    // Додаємо обробник до DOM
    this.addEventListener(handler);
  }
  
  /**
   * Реєстрація глобального обробника
   */
  registerGlobalHandler(handler: EventHandler): void {
    this.globalHandlers.push(handler);
    this.addEventListener(handler);
  }
  
  /**
   * Видалення обробника події
   */
  unregisterHandler(handler: EventHandler): void {
    const key = this.getHandlerKey(handler);
    const handlers = this.handlers.get(key);
    if (handlers) {
      const index = handlers.findIndex(h => h.handler === handler.handler);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.removeEventListener(handler);
      }
    }
  }
  
  /**
   * Видалення глобального обробника
   */
  unregisterGlobalHandler(handler: EventHandler): void {
    const index = this.globalHandlers.findIndex(h => h.handler === handler.handler);
    if (index !== -1) {
      this.globalHandlers.splice(index, 1);
      this.removeEventListener(handler);
    }
  }
  
  /**
   * Додавання обробника події до DOM
   */
  private addEventListener(handler: EventHandler): void {
    const target = handler.target || window;
    target.addEventListener(handler.event, handler.handler as EventListener, handler.options);
  }
  
  /**
   * Видалення обробника події з DOM
   */
  private removeEventListener(handler: EventHandler): void {
    const target = handler.target || window;
    target.removeEventListener(handler.event, handler.handler as EventListener, handler.options);
  }
  
  /**
   * Генерація ключа для обробника
   */
  private getHandlerKey(handler: EventHandler): string {
    const targetId = handler.target ? (handler.target as any).id || 'window' : 'window';
    return `${targetId}:${handler.event}`;
  }
  
  /**
   * Ініціалізація стандартних обробників подій
   */
  initStandardHandlers(): void {
    this.initMapHandlers();
    this.initUIHandlers();
    this.initStorageHandlers();
  }
  
  /**
   * Ініціалізація обробників подій карти
   */
  private initMapHandlers(): void {
    const map = mapManager.getMap();
    
    // Обробник кліку по карті
    this.registerHandler({
      event: 'click',
      handler: this.handleMapClick.bind(this),
      target: map
    });
    
    // Обробник подвійного кліку по карті
    this.registerHandler({
      event: 'dblclick',
      handler: this.handleMapDoubleClick.bind(this),
      target: map
    });
    
    // Обробник зміни масштабу
    this.registerHandler({
      event: 'zoomend',
      handler: this.handleMapZoom.bind(this),
      target: map
    });
    
    // Обробник переміщення карти
    this.registerHandler({
      event: 'moveend',
      handler: this.handleMapMove.bind(this),
      target: map
    });
  }
  
  /**
   * Ініціалізація обробників подій UI
   */
  private initUIHandlers(): void {
    // Обробник завантаження сторінки
    this.registerGlobalHandler({
      event: 'load',
      handler: this.handlePageLoad.bind(this),
      target: window
    });
    
    // Обробник перед виходом зі сторінки
    this.registerGlobalHandler({
      event: 'beforeunload',
      handler: this.handleBeforeUnload.bind(this),
      target: window
    });
    
    // Обробник зміни розміру вікна
    this.registerGlobalHandler({
      event: 'resize',
      handler: this.handleWindowResize.bind(this),
      target: window
    });
  }
  
  /**
   * Ініціалізація обробників збереження
   */
  private initStorageHandlers(): void {
    // Автоматичне збереження при зміні даних
    this.registerGlobalHandler({
      event: 'storage-change',
      handler: this.handleStorageChange.bind(this),
      target: window
    });
  }
  
  /**
   * Обробник кліку по карті
   */
  private handleMapClick(e: any): void {
    // Відмічаємо взаємодію користувача
    this.markUserInteraction();
    
    // Логіка обробки кліку по карті
    console.log('Map clicked at:', e.latlng);
  }
  
  /**
   * Обробник подвійного кліку по карті
   */
  private handleMapDoubleClick(e: any): void {
    // Відмічаємо взаємодію користувача
    this.markUserInteraction();
    
    // Логіка обробки подвійного кліку по карті
    console.log('Map double-clicked at:', e.latlng);
  }
  
  /**
   * Обробник зміни масштабу карти
   */
  private handleMapZoom(e: any): void {
    // Відмічаємо взаємодію користувача
    this.markUserInteraction();
    
    const zoom = mapManager.getMap().getZoom();
    console.log('Map zoom changed to:', zoom);
    
    // Зберігаємо поточний масштаб
    storageManager.saveToLocalStorage('map_zoom', zoom);
  }
  
  /**
   * Обробник переміщення карти
   */
  private handleMapMove(e: any): void {
    // Відмічаємо взаємодію користувача
    this.markUserInteraction();
    
    const center = mapManager.getCenter();
    console.log('Map moved to:', center);
    
    // Зберігаємо поточну позицію
    storageManager.saveToLocalStorage('map_center', center);
  }
  
  /**
   * Обробник завантаження сторінки
   */
  private handlePageLoad(): void {
    console.log('Page loaded');
    
    // Відновлюємо стан карти
    this.restoreMapState();
    
    // Завантажуємо збережені шари
    layerDataManager.loadLayers();
  }
  
  /**
   * Обробник перед виходом зі сторінки
   */
  private handleBeforeUnload(e: any): void {
    // Зберігаємо дані перед виходом
    storageManager.forceSave();
    
    // Показуємо повідомлення про збереження тільки якщо була взаємодія користувача
    if (this.hasUserInteraction) {
      e.preventDefault();
      e.returnValue = '';
    }
  }
  
  // Прапорець для відстеження взаємодії користувача
  private hasUserInteraction = false;
  
  /**
   * Відмічаємо взаємодію користувача
   */
  private markUserInteraction(): void {
    this.hasUserInteraction = true;
  }
  
  /**
   * Обробник зміни розміру вікна
   */
  private handleWindowResize(): void {
    // Оновлюємо розмір карти
    mapManager.invalidateSize();
  }
  
  /**
   * Обробник зміни збереження
   */
  private handleStorageChange(): void {
    // Автоматично зберігаємо дані
    storageManager.scheduleSave();
  }
  
  /**
   * Відновлення стану карти
   */
  private restoreMapState(): void {
    const map = mapManager.getMap();
    
    // Відновлюємо масштаб
    const savedZoom = storageManager.loadFromLocalStorage('map_zoom');
    if (savedZoom && typeof savedZoom === 'number') {
      map.setZoom(savedZoom);
    }
    
    // Відновлюємо позицію
    const savedCenter = storageManager.loadFromLocalStorage('map_center');
    if (savedCenter && Array.isArray(savedCenter) && savedCenter.length === 2) {
      map.setView(savedCenter, map.getZoom());
    }
  }
  
  /**
   * Емісія кастомної події
   */
  emit(event: string, data?: any): void {
    const customEvent = new CustomEvent(event, { detail: data });
    window.dispatchEvent(customEvent);
  }
  
  /**
   * Підписка на кастомну подію
   */
  on(event: string, handler: Function): void {
    this.registerGlobalHandler({
      event: event,
      handler: handler,
      target: window
    });
  }
  
  /**
   * Відписка від кастомної події
   */
  off(event: string, handler: Function): void {
    const globalHandler = this.globalHandlers.find(h => 
      h.event === event && h.handler === handler
    );
    if (globalHandler) {
      this.unregisterGlobalHandler(globalHandler);
    }
  }
  
  /**
   * Очищення всіх обробників
   */
  clearAllHandlers(): void {
    // Видаляємо всі зареєстровані обробники
    this.handlers.forEach(handlers => {
      handlers.forEach(handler => {
        this.removeEventListener(handler);
      });
    });
    this.handlers.clear();
    
    // Видаляємо всі глобальні обробники
    this.globalHandlers.forEach(handler => {
      this.removeEventListener(handler);
    });
    this.globalHandlers = [];
  }
  
  /**
   * Отримання статистики обробників
   */
  getHandlersStats(): { total: number; global: number; byEvent: Record<string, number> } {
    const byEvent: Record<string, number> = {};
    
    this.handlers.forEach((handlers, key) => {
      byEvent[key] = handlers.length;
    });
    
    return {
      total: this.globalHandlers.length + Array.from(this.handlers.values()).reduce((sum, handlers) => sum + handlers.length, 0),
      global: this.globalHandlers.length,
      byEvent
    };
  }
}

export const eventManager = EventManager.getInstance(); 