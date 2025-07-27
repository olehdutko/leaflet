// AppManager.ts - Головний менеджер додатку, що інтегрує всі інші менеджери
import { storageManager } from './StorageManager.js';
import { uiManager } from './UIManager.js';
import { mapManager } from './MapManager.js';
import { objectManager } from './ObjectManager.js';
import { modalEditManager } from './ModalEditManager.js';
import { modalManager } from './ModalManager.js';
import { layerDataManager } from './LayerDataManager.js';
import { overlayManager } from './OverlayManager.js';
import { geoSearchManager } from './GeoSearchManager.js';
import { kmzManager } from './KmzManager.js';
import { layerControlManager } from './LayerControlManager.js';
import { eventManager } from './EventManager.js';

export class AppManager {
  private static instance: AppManager;
  
  private constructor() {}
  
  static getInstance(): AppManager {
    if (!AppManager.instance) {
      AppManager.instance = new AppManager();
    }
    return AppManager.instance;
  }
  
  /**
   * Ініціалізація всіх менеджерів
   */
  init(): void {
    console.log('🚀 Ініціалізація AppManager...');
    
    // Ініціалізуємо EventManager першим
    eventManager.initStandardHandlers();
    
    // Ініціалізуємо LayerControlManager
    layerControlManager.init('layer-controls');
    
    // Ініціалізуємо GeoSearchManager
    geoSearchManager.init();
    
    // OverlayManager не потребує ініціалізації
    
    console.log('✅ Всі менеджери ініціалізовані');
  }
  
  /**
   * Отримання менеджерів
   */
  get storage() { return storageManager; }
  get ui() { return uiManager; }
  get map() { return mapManager; }
  get objects() { return objectManager; }
  get modalEdit() { return modalEditManager; }
  get modal() { return modalManager; }
  get layers() { return layerDataManager; }
  get overlays() { return overlayManager; }
  get geoSearch() { return geoSearchManager; }
  get kmz() { return kmzManager; }
  get layerControls() { return layerControlManager; }
  get events() { return eventManager; }
  
  /**
   * Централізоване збереження
   */
  save(): void {
    storageManager.scheduleSave();
  }
  
  /**
   * Централізоване завантаження
   */
  load(): void {
    layerDataManager.loadLayers();
  }
  
  /**
   * Показ модального вікна редагування
   */
  showEditModal(layer: any): void {
    modalEditManager.showEditModal(layer);
  }
  
  /**
   * Закриття модального вікна редагування
   */
  closeEditModal(): void {
    modalEditManager.closeEditModal();
  }
  
  /**
   * Показ діалогу підтвердження
   */
  showConfirmDialog(options: any): void {
    modalManager.showConfirmDialog(options);
  }
  
  /**
   * Додавання об'єкта на карту
   */
  addObject(layer: any): void {
    objectManager.addObject(layer);
  }
  
  /**
   * Видалення об'єкта з карти
   */
  removeObject(layer: any): void {
    objectManager.removeObject(layer);
  }
  
  /**
   * Додавання шару
   */
  addLayer(layer: any): void {
    layerDataManager.addLayer(layer);
  }
  
  /**
   * Видалення шару
   */
  removeLayer(layerId: number): void {
    layerDataManager.removeLayer(layerId);
  }
  
  /**
   * Отримання всіх шарів
   */
  getLayers(): any[] {
    return layerDataManager.getLayers();
  }
  
  /**
   * Отримання активного шару
   */
  getActiveLayer(): any {
    return layerDataManager.getActiveLayer();
  }
  
  /**
   * Встановлення активного шару
   */
  setActiveLayer(featureGroup: any): void {
    layerDataManager.setActiveLayer(featureGroup);
  }
  
  /**
   * Обробка KMZ файлу
   */
  async handleKmzFile(file: File): Promise<void> {
    await kmzManager.handleKmzFile(file);
  }
  
  /**
   * Додавання overlay зображення
   */
  addOverlay(featureGroup: any, url: string): void {
    overlayManager.addOverlayToFeatureGroup(featureGroup, url);
  }
  
  /**
   * Видалення overlay зображення
   */
  removeOverlay(overlay: any): void {
    // TODO: Реалізувати видалення overlay через OverlayManager
    console.warn('removeOverlay: Метод ще не реалізований в OverlayManager');
  }
  
  /**
   * Централізоване логування
   */
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [AppManager] ${message}`;
    
    switch (level) {
      case 'info':
        console.log(logMessage, data);
        break;
      case 'warn':
        console.warn(logMessage, data);
        break;
      case 'error':
        console.error(logMessage, data);
        break;
    }
  }
  
  /**
   * Отримання статистики додатку
   */
  getStats(): any {
    return {
      layers: layerDataManager.getLayers().length,
      events: eventManager.getHandlersStats(),
      storage: {
        hasPendingSaves: false // TODO: Додати метод hasPendingSaves до StorageManager
      }
    };
  }
  
  /**
   * Очищення всіх ресурсів
   */
  cleanup(): void {
    this.log('info', 'Очищення ресурсів додатку...');
    
    // Очищаємо обробники подій
    eventManager.clearAllHandlers();
    
    // Очищаємо контроли шарів
    layerControlManager.clearAllControls();
    
    // Примусово зберігаємо дані
    storageManager.forceSave();
    
    this.log('info', 'Ресурси очищені');
  }
}

// Експортуємо єдиний екземпляр
export const appManager = AppManager.getInstance();

// Експортуємо для зворотної сумісності
export const saveLayersToStorage = () => storageManager.scheduleSave();
export const showEditModal = (layer: any) => modalEditManager.showEditModal(layer);
export const closeEditModal = () => modalEditManager.closeEditModal();
export const showConfirmDialog = (options: any) => modalManager.showConfirmDialog(options); 