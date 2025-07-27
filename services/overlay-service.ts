// Сервіс для роботи з overlay (зображеннями на карті)
import { LegacyAdapter } from '../adapters/legacy-adapter.js';

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
}

export interface ImageData {
  url: string;
  bounds?: L.LatLngBounds;
  corners?: Array<{ lat: number; lng: number }>;
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

export interface OverlayPositionFix {
  createEditHandler: (overlay: Overlay, imageUrl: string, featureGroup: FeatureGroup, isFirstMove?: boolean) => Function;
  rebindEditHandlers: () => void;
  checkOverlayState: () => void;
  deleteOverlay: (overlay: Overlay) => void;
  universalSave: (reason?: string, priority?: boolean) => void;
  checkForOrphanedOverlays: () => void;
}

export interface DragOverlay extends Overlay {
  _dragSaveHandlerBound?: boolean;
}

export interface DragSaveFix {
  bindHandlers: () => void;
  test: () => void;
  enableDebug: () => void;
}

export class OverlayService {
  private static instance: OverlayService;
  private map: any;
  private customLayers: CustomLayer[] = [];
  private saveLayersToStorage: (() => void) | null = null;

  private constructor() {}

  static getInstance(): OverlayService {
    if (!OverlayService.instance) {
      OverlayService.instance = new OverlayService();
    }
    return OverlayService.instance;
  }

  init(map: any, customLayers: CustomLayer[], saveLayersToStorage: () => void): void {
    this.map = map;
    this.customLayers = customLayers;
    this.saveLayersToStorage = saveLayersToStorage;
    this.setupGlobalFunctions();
  }

  private setupGlobalFunctions(): void {
    // Глобальна функція для видалення overlay
    (window as any).requestOverlayDelete = (overlay: Overlay) => {
      this.requestOverlayDelete(overlay);
    };

    // Глобальна функція для збереження
    (window as any).saveLayersToStorage = () => {
      this.saveLayersToStorage?.();
    };
  }

  // Функція для очищення стану виділення overlay
  clearOverlaySelection(): void {
    try {
      // Приховуємо панель редагування зображення - різні варіанти селекторів
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
        elements.forEach(el => {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
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
      selectionElements.forEach(el => {
        const element = el as HTMLElement;
        if (element.style.stroke === 'blue' || element.style.fill === 'blue') {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        }
      });

      // Видаляємо елементи редагування
      const editSelectors = [
        '.leaflet-edit-toolbar',
        '.leaflet-edit-mode',
        '.leaflet-selection',
        '.leaflet-editing'
      ];

      editSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
      });

    } catch (error) {
      console.warn('Помилка при очищенні виділення overlay:', error);
    }
  }

  // Функція для видалення overlay
  performOverlayDeletion(overlay: Overlay): void {
    if (!overlay) return;

    const overlayUrl = overlay._customUrl || overlay._url || overlay.url;
    let overlayDeleted = false;

    // Шукаємо overlay в системі шарів
    for (const layerObj of this.customLayers) {
      if (!layerObj.featureGroup || !(layerObj.featureGroup as any).overlayInstances) continue;

      const overlayInstances = (layerObj.featureGroup as any).overlayInstances;
      const overlayIndex = overlayInstances.findIndex((inst: Overlay) => 
        inst === overlay || inst._overlay === overlay
      );

      if (overlayIndex !== -1) {
        // Видаляємо з масиву overlayInstances
        overlayInstances.splice(overlayIndex, 1);

        // Видаляємо з масиву images якщо є
        if ((layerObj.featureGroup as any).images && overlayUrl) {
          const imageIndex = (layerObj.featureGroup as any).images.findIndex((img: ImageData) => 
            img.url === overlayUrl || img._customUrl === overlayUrl || img._url === overlayUrl
          );
          if (imageIndex !== -1) {
            (layerObj.featureGroup as any).images.splice(imageIndex, 1);
          }
        }

        // Видаляємо з масиву overlays якщо є
        if ((layerObj.featureGroup as any).overlays && overlayUrl) {
          const overlayDataIndex = (layerObj.featureGroup as any).overlays.findIndex((ovl: OverlayData) => 
            ovl.url === overlayUrl
          );
          if (overlayDataIndex !== -1) {
            (layerObj.featureGroup as any).overlays.splice(overlayDataIndex, 1);
          }
        }

        // Видаляємо з карти
        if (this.map.hasLayer(overlay)) {
          this.map.removeLayer(overlay);
        }

        // Видаляємо вкладений overlay якщо він є
        if (overlay._overlay && this.map.hasLayer(overlay._overlay)) {
          this.map.removeLayer(overlay._overlay);
        }

        overlayDeleted = true;

        // Зберігаємо зміни
        this.saveLayersToStorage?.();

        // Очищуємо DOM елементи, пов'язані з overlay
        if (overlayUrl) {
          const imgElements = document.querySelectorAll(`img.leaflet-image-layer[src="${overlayUrl}"]`);
          imgElements.forEach(el => {
            el.remove();
          });
        }

        // Очищуємо стан виділення після видалення з невеликою затримкою
        setTimeout(() => {
          this.clearOverlaySelection();
        }, 100);

        return;
      }
    }

    // Якщо overlay не знайдено в системі, але він присутній на карті, видаляємо його напряму
    if (!overlayDeleted && overlay) {
      try {
        if (this.map.hasLayer(overlay)) {
          this.map.removeLayer(overlay);
        }

        // Також видаляємо вкладений overlay якщо він є
        if (overlay._overlay && this.map.hasLayer(overlay._overlay)) {
          this.map.removeLayer(overlay._overlay);
        }

        // Зберігаємо зміни
        this.saveLayersToStorage?.();

        // Очищуємо DOM елементи, пов'язані з overlay
        if (overlayUrl) {
          const imgElements = document.querySelectorAll(`img.leaflet-image-layer[src="${overlayUrl}"]`);
          imgElements.forEach(el => {
            el.remove();
          });
        }
      } catch (error) {
        // Мовчазно обробляємо помилки видалення
      }

      // Очищуємо стан виділення після резервного видалення з невеликою затримкою
      setTimeout(() => {
        this.clearOverlaySelection();
      }, 100);
    }
  }

  // Запит на видалення overlay з підтвердженням
  requestOverlayDelete(overlay: Overlay): void {
    if (!overlay) return;

    // Показуємо діалог підтвердження перед видаленням
    import('../ui.js').then(({ showConfirmDialog }) => {
      showConfirmDialog({
        title: 'Видалення зображення',
        message: 'Ви дійсно хочете видалити це зображення?',
        onConfirm: () => {
          // Виконуємо видалення після підтвердження
          this.performOverlayDeletion(overlay);
        },
        buttons: [
          { text: 'Видалити', action: 'delete', className: 'btn-danger' },
          { text: 'Скасувати', action: 'cancel', className: 'btn-secondary' }
        ]
      });
    });
  }

  // Оновлення посилань на шари
  updateCustomLayers(customLayers: CustomLayer[]): void {
    this.customLayers = customLayers;
  }

  // Оновлення функції збереження
  updateSaveFunction(saveLayersToStorage: () => void): void {
    this.saveLayersToStorage = saveLayersToStorage;
  }
} 