// OverlayManager.ts - Управління overlay зображеннями
import { mapManager } from './MapManager.js';
import { storageManager } from './StorageManager.js';
import { modalManager } from './ModalManager.js';

export interface Overlay {
  getBounds(): L.LatLngBounds;
  getCorners?(): L.LatLng[];
  off(event: string): void;
  on(event: string, handler: Function): void;
  _customUrl?: string;
  _url?: string;
  url?: string;
  _overlay?: Overlay;
  _image?: HTMLImageElement;
  _overlayId?: string;
  _hasEditHandler?: boolean;
  remove(): void;
}

export interface ImageData {
  url: string;
  bounds?: L.LatLngBounds;
  corners?: Array<{ lat: number; lng: number }>;
  opacity?: number;
  _customUrl?: string;
  _url?: string;
  _overlayId?: string;
}

export interface OverlayData {
  url: string;
  bounds?: L.LatLngBounds;
  corners?: Array<{ lat: number; lng: number }>;
}

export interface FeatureGroup {
  overlayInstances?: Overlay[];
  images?: ImageData[];
  overlays?: OverlayData[];
}

export interface CustomLayer {
  featureGroup?: FeatureGroup;
}

export class OverlayManager {
  private static instance: OverlayManager;
  private debugMode = false;
  
  private constructor() {}
  
  static getInstance(): OverlayManager {
    if (!OverlayManager.instance) {
      OverlayManager.instance = new OverlayManager();
    }
    return OverlayManager.instance;
  }
  
  // Включення/виключення debug режиму
  enableDebug(): void {
    this.debugMode = true;
    console.log('🔧 OverlayManager debug mode enabled');
  }
  
  disableDebug(): void {
    this.debugMode = false;
  }
  
  // Логування debug повідомлень
  private debugLog(message: string, data: any = null): void {
    if (this.debugMode) {
      console.log(`🔧 OverlayManager: ${message}`, data);
    }
  }
  
  // Запит на видалення overlay
  requestOverlayDelete(overlay: Overlay): void {
    if (!overlay) {
      this.debugLog('Attempted to delete null overlay');
      return;
    }
    
    this.debugLog('Requesting overlay deletion', overlay);
    
    modalManager.showConfirmDialog({
      title: 'Видалення зображення',
      message: 'Ви дійсно хочете видалити це зображення?',
      onConfirm: () => {
        this.performOverlayDeletion(overlay);
      },
      buttons: [
        { text: 'Видалити', action: 'delete', className: 'btn-danger' },
        { text: 'Скасувати', action: 'cancel', className: 'btn-secondary' }
      ]
    });
  }
  
  // Виконання видалення overlay
  private performOverlayDeletion(overlay: Overlay): void {
    this.debugLog('Performing overlay deletion', overlay);
    
    // Отримуємо URL overlay для пошуку
    let overlayUrl = overlay._customUrl || overlay._url || overlay.url;
    
    // Якщо overlay має властивість _overlay, спробуємо отримати URL з неї
    if (!overlayUrl && overlay._overlay) {
      overlayUrl = overlay._overlay._customUrl || overlay._overlay._url || overlay._overlay.url;
    }
    
    // Якщо все ще немає URL, спробуємо знайти в DOM елементі
    if (!overlayUrl && overlay._image) {
      overlayUrl = overlay._image.src;
    }
    
    this.debugLog('Overlay URL for deletion', overlayUrl);
    
    // Знаходимо overlay в системі шарів
    const customLayers = (window as any).customLayers;
    if (customLayers) {
      for (const layer of customLayers) {
        if (!layer || !layer.featureGroup) {
          continue;
        }
        
        // Спочатку шукаємо за посиланням на об'єкт
        let overlayIdx = layer.featureGroup.overlayInstances?.indexOf(overlay);
        
        // Якщо не знайдено за прямим посиланням, шукаємо за вкладеним _overlay
        if (overlayIdx === -1 && overlay._overlay) {
          overlayIdx = layer.featureGroup.overlayInstances?.findIndex((inst: Overlay) => {
            return inst === overlay._overlay || inst._overlay === overlay._overlay;
          });
        }
        
        // Якщо не знайдено, шукаємо за URL
        if (overlayIdx === -1 && overlayUrl) {
          overlayIdx = layer.featureGroup.images?.findIndex((img: ImageData) => {
            return img.url === overlayUrl;
          });
        }
        
        // Додатково шукаємо за _overlayId
        if (overlayIdx === -1 && overlay._overlayId) {
          overlayIdx = layer.featureGroup.images?.findIndex((img: ImageData) => {
            return img._overlayId === overlay._overlayId;
          });
        }
        
        // Якщо все ще не знайдено, шукаємо за всіма можливими властивостями
        if (overlayIdx === -1) {
          overlayIdx = layer.featureGroup.overlayInstances?.findIndex((inst: Overlay) => {
            const instUrl = inst._customUrl || inst._url || inst.url;
            const overlayUrl = overlay._customUrl || overlay._url || overlay.url;
            
            if (instUrl && overlayUrl && instUrl === overlayUrl) {
              return true;
            }
            
            return false;
          });
        }
        
        // Якщо знайдено, видаляємо
        if (overlayIdx !== undefined && overlayIdx !== -1) {
          this.debugLog('Found overlay at index', overlayIdx);
          
          // Видаляємо з overlayInstances
          if (layer.featureGroup.overlayInstances && layer.featureGroup.overlayInstances[overlayIdx]) {
            const overlayToRemove = layer.featureGroup.overlayInstances[overlayIdx];
            layer.featureGroup.overlayInstances.splice(overlayIdx, 1);
            
            // Видаляємо з карти
            if (mapManager.hasLayer(overlayToRemove)) {
              mapManager.removeLayer(overlayToRemove);
            }
          }
          
          // Видаляємо з images
          if (layer.featureGroup.images && layer.featureGroup.images[overlayIdx]) {
            layer.featureGroup.images.splice(overlayIdx, 1);
          }
          
          // Видаляємо з overlays
          if (layer.featureGroup.overlays && layer.featureGroup.overlays[overlayIdx]) {
            layer.featureGroup.overlays.splice(overlayIdx, 1);
          }
          
          // Зберігаємо зміни
          storageManager.scheduleSave();
          
          this.debugLog('Overlay deleted successfully');
          return;
        }
      }
    }
    
    this.debugLog('Overlay not found in any layer');
  }
  
  // Очищення стану виділення overlay
  clearOverlaySelection(): void {
    try {
      this.debugLog('Clearing overlay selection');
      
      // Приховуємо панель редагування зображення
      const editToolbars = [
        '.leaflet-toolbar',
        '.leaflet-toolbar-container',
        '.leaflet-toolbar-group',
        '.leaflet-toolbar-section',
        '.leaflet-toolbar-section a',
        '.leaflet-toolbar-section button',
        '.leaflet-edit-toolbar',
        '.leaflet-edit-mode',
        '.leaflet-selection',
        '.leaflet-editing',
        '[class*="toolbar"]',
        '[class*="edit"]',
        '[id*="toolbar"]',
        '[id*="edit"]'
      ];
      
      editToolbars.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const el = element as HTMLElement;
          if (el) {
            el.style.display = 'none';
          }
        });
      });
      
      // Видаляємо точки кутів (corners) зображення
      const cornerSelectors = [
        '.leaflet-marker-icon.leaflet-marker-draggable',
        '.leaflet-marker-icon[src*="corner"]',
        '.leaflet-marker-icon[src*="handle"]',
        '.leaflet-marker-icon[src*="resize"]'
      ];
      
      cornerSelectors.forEach(selector => {
        const cornerMarkers = document.querySelectorAll(selector);
        cornerMarkers.forEach(marker => {
          if (marker.parentNode) {
            marker.parentNode.removeChild(marker);
          }
        });
      });
      
      // Видаляємо рамку виділення
      const selectionSelectors = [
        '.leaflet-overlay-pane svg',
        '.leaflet-overlay-pane path',
        '.leaflet-overlay-pane rect',
        '.leaflet-overlay-pane circle'
      ];
      
      selectionSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const el = element as HTMLElement;
          if (el && (el.style.stroke === 'blue' || el.style.fill === 'blue' || el.classList.contains('selection'))) {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          }
        });
      });
      
      // Видаляємо додаткові елементи виділення
      const selectionElements = document.querySelectorAll('.leaflet-interactive');
      selectionElements.forEach(element => {
        const el = element as HTMLElement;
        if (el && (el.style.stroke === 'blue' || el.style.fill === 'blue')) {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        }
      });
      
      this.debugLog('Overlay selection cleared successfully');
    } catch (error) {
      this.debugLog('Error clearing overlay selection', error);
    }
  }
  
  // Додавання overlay до feature group
  addOverlayToFeatureGroup(featureGroup: FeatureGroup, url: string): void {
    this.debugLog('Adding overlay to feature group', { url });
    
    try {
      // Створюємо overlay
      const overlay = (window as any).L.distortableImageOverlay(url, {
        bounds: mapManager.getBounds(),
        selected: true
      });
      
      // Додаємо унікальний ідентифікатор
      overlay._overlayId = `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      overlay._customUrl = url;
      
      // Додаємо на карту
      mapManager.addLayer(overlay);
      
      // Отримуємо bounds
      const bounds = overlay.getBounds();
      
      // Створюємо imageData з повними даними
      const initialCorners = overlay.getCorners?.() ?
        overlay.getCorners().map((c: any) => ({ lat: c.lat, lng: c.lng })) : null;
      const imageData: ImageData = {
        url,
        bounds,
        corners: initialCorners,
        opacity: 1
      };
      
      // Ініціалізуємо масиви якщо потрібно
      if (!featureGroup.images) featureGroup.images = [];
      if (!featureGroup.overlays) featureGroup.overlays = [];
      if (!featureGroup.overlayInstances) featureGroup.overlayInstances = [];
      
      // Додаємо метадані
      featureGroup.images.push(imageData);
      featureGroup.overlays.push({ ...imageData });
      featureGroup.overlayInstances.push(overlay);
      
      // Зберігаємо зміни
      storageManager.scheduleSave();
      
      this.debugLog('Overlay added successfully');
    } catch (error) {
      this.debugLog('Error adding overlay', error);
    }
  }
  
  // Видалення всіх overlay з feature group
  removeAllOverlaysFromFeatureGroup(featureGroup: FeatureGroup): void {
    this.debugLog('Removing all overlays from feature group');
    
    if (featureGroup.overlayInstances) {
      featureGroup.overlayInstances.forEach(overlay => {
        if (mapManager.hasLayer(overlay)) {
          mapManager.removeLayer(overlay);
        }
      });
      featureGroup.overlayInstances = [];
    }
    
    if (featureGroup.images) {
      featureGroup.images = [];
    }
    
    if (featureGroup.overlays) {
      featureGroup.overlays = [];
    }
    
    storageManager.scheduleSave();
    this.debugLog('All overlays removed successfully');
  }
  
  // Відновлення overlay для feature group
  restoreOverlaysForFeatureGroup(featureGroup: FeatureGroup): void {
    this.debugLog('Restoring overlays for feature group');
    
    if (!featureGroup.images || !Array.isArray(featureGroup.images)) {
      this.debugLog('No images to restore');
      return;
    }
    
    featureGroup.images.forEach((imgData: ImageData) => {
      try {
        const overlay = (window as any).L.distortableImageOverlay(imgData.url, {
          bounds: imgData.bounds,
          opacity: imgData.opacity || 1
        });
        
        overlay._customUrl = imgData.url;
        overlay._overlayId = `restored_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        if (imgData.corners) {
          overlay.setCorners(imgData.corners);
        }
        
        mapManager.addLayer(overlay);
        
        if (!featureGroup.overlayInstances) {
          featureGroup.overlayInstances = [];
        }
        featureGroup.overlayInstances.push(overlay);
        
        this.debugLog('Overlay restored', imgData.url);
      } catch (error) {
        this.debugLog('Error restoring overlay', error);
      }
    });
  }
  
  // Створення обробника редагування
  createEditHandler(overlay: Overlay, imageUrl: string, featureGroup: FeatureGroup, isFirstMove: boolean = false): Function {
    this.debugLog('Creating edit handler', { imageUrl, isFirstMove });
    
    return function handleEdit(): void {
      // Логіка обробки редагування overlay
      storageManager.scheduleSave();
    };
  }
  
  // Переприв'язка обробників редагування
  rebindEditHandlers(): void {
    this.debugLog('Rebinding edit handlers');
    
    const customLayers = (window as any).customLayers;
    if (!customLayers) return;
    
    customLayers.forEach((layer: CustomLayer) => {
      if (!layer.featureGroup || !layer.featureGroup.overlayInstances) return;
      
      layer.featureGroup.overlayInstances.forEach((overlay: Overlay) => {
        if (!overlay._hasEditHandler) {
          // Додаємо обробник якщо його немає
          overlay._hasEditHandler = true;
        }
      });
    });
  }
  
  // Перевірка стану overlay
  checkOverlayState(): void {
    this.debugLog('Checking overlay state');
    
    const customLayers = (window as any).customLayers;
    if (!customLayers) return;
    
    customLayers.forEach((layer: CustomLayer) => {
      if (!layer.featureGroup) return;
      
      // Перевіряємо синхронізацію між різними масивами
      const imagesCount = layer.featureGroup.images?.length || 0;
      const overlaysCount = layer.featureGroup.overlays?.length || 0;
      const instancesCount = layer.featureGroup.overlayInstances?.length || 0;
      
      if (imagesCount !== overlaysCount || imagesCount !== instancesCount) {
        this.debugLog('Overlay state inconsistency detected', {
          imagesCount,
          overlaysCount,
          instancesCount
        });
      }
    });
  }
  
  // Перевірка на сиротські overlay
  checkForOrphanedOverlays(): void {
    this.debugLog('Checking for orphaned overlays');
    
    const customLayers = (window as any).customLayers;
    if (!customLayers) return;
    
    customLayers.forEach((layer: CustomLayer) => {
      if (!layer.featureGroup || !layer.featureGroup.overlayInstances) return;
      
      layer.featureGroup.overlayInstances.forEach((overlay: Overlay) => {
        if (!mapManager.hasLayer(overlay)) {
          this.debugLog('Found orphaned overlay', overlay);
          // Можна додати логіку для відновлення або видалення
        }
      });
    });
  }
}

export const overlayManager = OverlayManager.getInstance(); 