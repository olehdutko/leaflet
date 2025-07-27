import { BaseService } from '../base/BaseService';
import { Logger } from '../utils/Logger';

// Інтерфейси для overlay
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

export interface DragOverlay extends Overlay {
  _dragSaveHandlerBound?: boolean;
}

export class OverlayManager extends BaseService {
  protected logger: Logger;
  private isDebugMode: boolean = false;
  private customLayers: CustomLayer[] = [];

  constructor() {
    super('OverlayManager');
    this.logger = new Logger('OverlayManager');
  }

  /**
   * Ініціалізація сервісу
   */
  protected onInit(): void {
    this.initialize();
  }

  /**
   * Знищення сервісу
   */
  protected onDestroy(): void {
    this.logger.info('OverlayManager знищений');
  }

  /**
   * Ініціалізація менеджера overlay
   */
  public initialize(): void {
    this.logger.info('Ініціалізація OverlayManager');
    this.setupGlobalFunctions();
    this.setupOverlayPositionFix();
    this.setupDragSaveFix();
  }

  /**
   * Налаштування глобальних функцій для overlay
   */
  private setupGlobalFunctions(): void {
    // Функція для видалення overlay
    (window as any).requestOverlayDelete = (overlay: any) => {
      if (!overlay) return;
      
      this.showDeleteConfirmation(overlay);
    };

    // Функція для очищення стану виділення overlay
    (window as any).clearOverlaySelection = () => {
      this.clearOverlaySelection();
    };
  }

  /**
   * Показ діалогу підтвердження видалення
   */
  private async showDeleteConfirmation(overlay: any): Promise<void> {
    try {
      const { showConfirmDialog } = await import('../../ui.js');
      showConfirmDialog({
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
    } catch (error) {
      this.logger.error('Помилка при показі діалогу підтвердження:', error);
    }
  }

  /**
   * Виконання видалення overlay
   */
  private performOverlayDeletion(overlay: any): void {
    try {
      this.logger.info('Видалення overlay:', overlay);
      
      // Очищаємо виділення
      this.clearOverlaySelection();
      
      // Видаляємо overlay з карти
      if ((window as any).map && overlay) {
        (window as any).map.removeLayer(overlay);
      }
      
      // Видаляємо з feature group
      if (this.customLayers) {
        this.customLayers.forEach(layer => {
          if (layer.featureGroup?.overlayInstances) {
            const index = layer.featureGroup.overlayInstances.indexOf(overlay);
            if (index > -1) {
              layer.featureGroup.overlayInstances.splice(index, 1);
            }
          }
        });
      }
      
      // Зберігаємо зміни
      this.universalSave('overlay_deletion');
      
    } catch (error) {
      this.logger.error('Помилка при видаленні overlay:', error);
    }
  }

  /**
   * Очищення стану виділення overlay
   */
  private clearOverlaySelection(): void {
    try {
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
        elements.forEach(el => {
          (el as HTMLElement).style.display = 'none';
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
      
    } catch (error) {
      this.logger.error('Помилка при очищенні виділення overlay:', error);
    }
  }

  /**
   * Налаштування фіксу позиції overlay
   */
  private setupOverlayPositionFix(): void {
    const debugLog = (message: string, data: any = null): void => {
      if (this.isDebugMode) {
        this.logger.debug(message, data);
      }
    };

    const universalSave = (reason: string = 'unknown', priority: boolean = false): void => {
      try {
        if ((window as any).saveLayersToStorage) {
          (window as any).saveLayersToStorage();
        }
        debugLog(`Збережено стан (${reason})`);
      } catch (error) {
        this.logger.error('Помилка збереження:', error);
      }
    };

    const createEditHandler = (overlay: Overlay, imageUrl: string, featureGroup: FeatureGroup, isFirstMove: boolean = false): Function => {
      return function handleEdit(): void {
        try {
          debugLog('Edit handler викликано для overlay');
          
          // Очищаємо попереднє виділення
          (window as any).clearOverlaySelection();
          
          // Зберігаємо стан
          universalSave('edit_handler');
          
        } catch (error) {
          console.error('Помилка в edit handler:', error);
        }
      };
    };

    const rebindEditHandlers = (): void => {
      try {
        debugLog('Переприв\'язуємо edit handlers...');
        
        if (!(window as any).customLayers) return;
        
        let bound = 0;
        
        (window as any).customLayers.forEach((layer: CustomLayer, layerIdx: number) => {
          if (!layer?.featureGroup?.overlayInstances) return;
          
          layer.featureGroup.overlayInstances.forEach((overlay: Overlay, overlayIdx: number) => {
            if (!overlay || overlay._hasEditHandler) return;
            
            const imageUrl = overlay._customUrl || overlay._url || overlay.url || '';
            const handler = createEditHandler(overlay, imageUrl, layer.featureGroup!);
            
            overlay.on('click', handler);
            overlay._hasEditHandler = true;
            bound++;
          });
        });
        
        debugLog(`Прив'язано edit handlers для ${bound} overlay`);
        
      } catch (error) {
        this.logger.error('Помилка при переприв\'язуванні edit handlers:', error);
      }
    };

    const checkOverlayState = (): void => {
      try {
        debugLog('Перевіряємо стан overlay...');
        
        if (!(window as any).customLayers) return;
        
        let totalOverlays = 0;
        let overlaysWithHandlers = 0;
        
        (window as any).customLayers.forEach((layer: CustomLayer, layerIdx: number) => {
          if (layer?.featureGroup?.overlayInstances) {
            layer.featureGroup.overlayInstances.forEach((overlay: Overlay, overlayIdx: number) => {
              totalOverlays++;
              
              if (overlay._hasEditHandler) {
                overlaysWithHandlers++;
              }
            });
          }
        });
        
        debugLog(`Стан overlay: ${overlaysWithHandlers}/${totalOverlays} мають handlers`);
        
        if (overlaysWithHandlers < totalOverlays) {
          rebindEditHandlers();
        }
        
      } catch (error) {
        this.logger.error('Помилка при перевірці стану overlay:', error);
      }
    };

    const deleteOverlay = (overlay: Overlay): void => {
      this.performOverlayDeletion(overlay);
    };

    const checkForOrphanedOverlays = (): void => {
      try {
        debugLog('Перевіряємо на orphaned overlay...');
        
        if (!(window as any).customLayers) return;
        
        let orphaned = 0;
        
        (window as any).customLayers.forEach((layer: CustomLayer, layerIdx: number) => {
          if (layer?.featureGroup?.overlayInstances) {
            layer.featureGroup.overlayInstances = layer.featureGroup.overlayInstances.filter(overlay => {
              if (!overlay || !overlay.getBounds) {
                orphaned++;
                return false;
              }
              return true;
            });
          }
        });
        
        if (orphaned > 0) {
          debugLog(`Видалено ${orphaned} orphaned overlay`);
          universalSave('orphaned_cleanup');
        }
        
      } catch (error) {
        this.logger.error('Помилка при перевірці orphaned overlay:', error);
      }
    };

    // Експортуємо функції
    (window as any).overlayPositionFix = {
      createEditHandler,
      rebindEditHandlers,
      checkOverlayState,
      deleteOverlay,
      universalSave,
      checkForOrphanedOverlays
    };

    // Ініціалізація
    setTimeout(() => {
      rebindEditHandlers();
      checkOverlayState();
    }, 1000);

    // Періодична перевірка
    setInterval(() => {
      checkOverlayState();
      checkForOrphanedOverlays();
    }, 10000);
  }

  /**
   * Налаштування фіксу збереження при drag
   */
  private setupDragSaveFix(): void {
    const debugLog = (message: string, data: any = null): void => {
      if (this.isDebugMode) {
        this.logger.debug(message, data);
      }
    };

    const saveOverlayPosition = (overlay: DragOverlay, overlayId: string): void => {
      try {
        const bounds = overlay.getBounds();
        const corners = overlay.getCorners ? overlay.getCorners() : null;
        
        debugLog(`Зберігаємо позицію overlay ${overlayId}:`, { bounds, corners });
        
        // Зберігаємо в localStorage
        const key = `overlay_position_${overlayId}`;
        const data = {
          bounds: {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
          },
          corners: corners ? corners.map(c => ({ lat: c.lat, lng: c.lng })) : null,
          timestamp: Date.now()
        };
        
        localStorage.setItem(key, JSON.stringify(data));
        
        // Зберігаємо загальний стан
        if ((window as any).saveLayersToStorage) {
          (window as any).saveLayersToStorage();
        }
        
      } catch (error) {
        this.logger.error('Помилка збереження позиції overlay:', error);
      }
    };

    const bindDragSaveHandlers = (): void => {
      try {
        debugLog('Прив\'язуємо drag handlers для збереження позицій...');
        
        if (!(window as any).customLayers) return;
        
        let bound = 0;
        
        (window as any).customLayers.forEach((layer: CustomLayer, layerIdx: number) => {
          if (!layer?.featureGroup?.overlayInstances) return;
          
          layer.featureGroup.overlayInstances.forEach((overlay: DragOverlay, overlayIdx: number) => {
            if (!overlay?.getCorners || overlay._dragSaveHandlerBound) return;
            
            const overlayId = `${layerIdx}.${overlayIdx}`;
            let initialBounds: L.LatLngBounds | null = null;
            let isDragging = false;
            
            const dragStartHandler = (): void => {
              initialBounds = overlay.getBounds();
              isDragging = true;
              debugLog(`DRAG ПОЧАТОК для overlay ${overlayId}`);
            };
            
            const dragEndHandler = (): void => {
              if (isDragging && initialBounds) {
                const finalBounds = overlay.getBounds();
                
                if (JSON.stringify(initialBounds) !== JSON.stringify(finalBounds)) {
                  debugLog(`DRAG ЗАВЕРШЕНО для overlay ${overlayId} - позиція змінилася`);
                  saveOverlayPosition(overlay, overlayId);
                }
              }
              
              isDragging = false;
              initialBounds = null;
            };
            
            overlay.on('dragstart', dragStartHandler);
            overlay.on('dragend', dragEndHandler);
            overlay._dragSaveHandlerBound = true;
            bound++;
          });
        });
        
        debugLog(`Прив'язано drag save handlers для ${bound} overlay`);
        
      } catch (error) {
        this.logger.error('Помилка при прив\'язуванні drag handlers:', error);
      }
    };

    const testDragSaveMechanism = (): void => {
      debugLog('ТЕСТ DRAG SAVE МЕХАНІЗМУ...');
      
      if (!(window as any).customLayers || (window as any).customLayers.length === 0) {
        debugLog('Немає шарів для тестування');
        return;
      }
      
      let totalOverlays = 0;
      let overlaysWithHandlers = 0;
      
      (window as any).customLayers.forEach((layer: CustomLayer, layerIdx: number) => {
        if (layer?.featureGroup?.overlayInstances) {
          layer.featureGroup.overlayInstances.forEach((overlay: DragOverlay, overlayIdx: number) => {
            totalOverlays++;
            
            if (overlay._dragSaveHandlerBound) {
              overlaysWithHandlers++;
            }
          });
        }
      });
      
      debugLog(`Drag save тест: ${overlaysWithHandlers}/${totalOverlays} overlay мають handlers`);
    };

    // Експортуємо функції
    (window as any).dragSaveFix = {
      bindHandlers: bindDragSaveHandlers,
      test: testDragSaveMechanism,
      enableDebug: () => { this.isDebugMode = true; }
    };

    // Ініціалізація
    setTimeout(() => {
      bindDragSaveHandlers();
    }, 1000);

    // Періодична перевірка
    setInterval(() => {
      bindDragSaveHandlers();
    }, 5000);
  }

  /**
   * Універсальне збереження
   */
  private universalSave(reason: string = 'unknown', priority: boolean = false): void {
    try {
      if ((window as any).saveLayersToStorage) {
        (window as any).saveLayersToStorage();
      }
      this.logger.debug(`Збережено стан (${reason})`);
    } catch (error) {
      this.logger.error('Помилка збереження:', error);
    }
  }

  /**
   * Отримання кастомних шарів
   */
  public getCustomLayers(): CustomLayer[] {
    return this.customLayers;
  }

  /**
   * Встановлення кастомних шарів
   */
  public setCustomLayers(layers: CustomLayer[]): void {
    this.customLayers = layers;
  }

  /**
   * Увімкнення/вимкнення debug режиму
   */
  public setDebugMode(enabled: boolean): void {
    this.isDebugMode = enabled;
    this.logger.info(`Debug режим ${enabled ? 'увімкнено' : 'вимкнено'}`);
  }
} 