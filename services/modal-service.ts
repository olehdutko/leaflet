// Сервіс для роботи з модальними вікнами
declare const L: any; // Leaflet global
import { LegacyAdapter } from '../adapters/legacy-adapter.js';
import { state } from '../state.js';

export interface ObjectProperties {
  name: string;
  description: string;
  color?: string;
  weight?: number;
  opacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  style?: string;
  icon?: string;
}

export class ModalService {
  private static instance: ModalService;

  private constructor() {}

  static getInstance(): ModalService {
    if (!ModalService.instance) {
      ModalService.instance = new ModalService();
    }
    return ModalService.instance;
  }

  init(): void {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Обробники подій для кнопок
    LegacyAdapter.DOM.addEventListener<HTMLElement>('modal-close', 'click', () => {
      this.closeEditModal();
    });
    
    LegacyAdapter.DOM.addEventListener<HTMLElement>('cancel-edit', 'click', () => {
      this.closeEditModal();
    });
    
    LegacyAdapter.DOM.addEventListener<HTMLElement>('save-object', 'click', () => {
      this.saveObjectChanges();
    });

    // Обробник для видалення об'єкта
    const deleteButton = LegacyAdapter.DOM.getElement<HTMLElement>('delete-object');
    if (deleteButton) {
      deleteButton.onclick = () => {
        this.handleDeleteObject();
      };
    }

    // Обробники для range слайдерів
    const lineWidthInput = document.getElementById('line-width') as HTMLInputElement;
    if (lineWidthInput) {
      lineWidthInput.addEventListener('input', function () {
        const valueElement = document.getElementById('line-width-value') as HTMLElement;
        if (valueElement) {
          valueElement.textContent = (this as HTMLInputElement).value;
        }
      });
    }

    const opacityInput = document.getElementById('object-opacity') as HTMLInputElement;
    if (opacityInput) {
      opacityInput.addEventListener('input', function () {
        const valueElement = document.getElementById('opacity-value') as HTMLElement;
        if (valueElement) {
          valueElement.textContent = Math.round(Number((this as HTMLInputElement).value) * 100) + '%';
        }
      });
    }

    // Закриття по кліку поза модальним вікном
    const modalElement = document.getElementById('edit-object-modal') as HTMLElement;
    if (modalElement) {
      modalElement.addEventListener('click', function (e) {
        if (e.target === this) {
          ModalService.getInstance().closeEditModal();
        }
      });
    }

    // Закриття по Escape
    document.addEventListener('keydown', function (e) {
      const modalElement = document.getElementById('edit-object-modal') as HTMLElement;
      if (e.key === 'Escape' && modalElement && !modalElement.classList.contains('hidden')) {
        ModalService.getInstance().closeEditModal();
      }
    });
  }

  showEditModal(object: any): void {
    console.log('ModalService: showEditModal викликано з об\'єктом:', object);
    
    if (!object) {
      console.error('ModalService: showEditModal отримав null або undefined об\'єкт');
      return;
    }
    
    state.currentEditingObject.value = object;
    console.log('ModalService: currentEditingObject встановлено:', state.currentEditingObject.value);
    
    // Імпортуємо функцію показу модального вікна
    import('../ui.js').then(({ showEditModal }) => {
      showEditModal(object);
    }).catch(error => {
      console.error('ModalService: Помилка при імпорті ui.js:', error);
    });
  }

  closeEditModal(): void {
    state.currentEditingObject.value = null;
    
    const modalElement = document.getElementById('edit-object-modal') as HTMLElement;
    if (modalElement) {
      modalElement.classList.add('hidden');
    }
  }

  private saveObjectChanges(): void {
    console.log('ModalService: saveObjectChanges викликано');
    
    if (!state.currentEditingObject.value) {
      console.error('ModalService: currentEditingObject не встановлено');
      return;
    }

    console.log('ModalService: Отримуємо властивості з форми...');
    const properties = this.getObjectPropertiesFromForm();
    console.log('ModalService: Властивості з форми:', properties);

    // Імпортуємо функцію застосування властивостей
    import('../objects.js').then(({ applyObjectProperties }) => {
      console.log('ModalService: Застосовуємо властивості до об\'єкта...');
      console.log('ModalService: Об\'єкт до застосування:', state.currentEditingObject.value);
      console.log('ModalService: Властивості для застосування:', properties);
      
      if (!state.currentEditingObject.value) {
        console.error('ModalService: currentEditingObject.value є null або undefined');
        return;
      }
      
      applyObjectProperties(state.currentEditingObject.value, properties);
      console.log('ModalService: Властивості застосовано. Об\'єкт після застосування:', state.currentEditingObject.value);
      
      // Додаємо копіювання у feature.properties
      if ((state.currentEditingObject.value as any).feature && (state.currentEditingObject.value as any).properties) {
        (state.currentEditingObject.value as any).feature.properties = { 
          ...(state.currentEditingObject.value as any).properties 
        };
        console.log('ModalService: Оновлено feature.properties');
        console.log('ModalService: feature.properties після копіювання:', (state.currentEditingObject.value as any).feature.properties);
      }

      // Зберігаємо зміни
      console.log('ModalService: Перевіряємо наявність saveLayersToStorage...');
      if ((window as any).saveLayersToStorage) {
        console.log('ModalService: Викликаємо saveLayersToStorage...');
        (window as any).saveLayersToStorage();
        console.log('ModalService: saveLayersToStorage викликано');
      } else {
        console.error('ModalService: saveLayersToStorage не знайдено в window');
      }

      // Оновлюємо UI після збереження змін
      console.log('ModalService: Викликаємо updateUIAfterSave...');
      this.updateUIAfterSave();
      console.log('ModalService: updateUIAfterSave завершено');

      this.closeEditModal();
    }).catch(error => {
      console.error('ModalService: Помилка при імпорті objects.js:', error);
    });
  }

  private handleDeleteObject(): void {
    if (!state.currentEditingObject.value) return;

    const type = this.getObjectType(state.currentEditingObject.value);
    let typeName = 'обʼєкт';
    
    if (type === 'marker') typeName = 'маркер';
    else if (type === 'polygon') typeName = 'полігон';
    else if (type === 'polyline') typeName = 'полілінію';
    else if (type === 'rectangle') typeName = 'прямокутник';
    else if (type === 'circle') typeName = 'коло';

    const properties = this.getObjectProperties(state.currentEditingObject.value);
    const objectName = properties.name ? `"${properties.name}"` : typeName;

    this.closeEditModal();

    // Показуємо діалог підтвердження
    import('../ui.js').then(({ showConfirmDialog }) => {
      showConfirmDialog({
        title: `Видалення об'єкта: ${objectName}`,
        message: `Ви дійсно хочете видалити об'єкт ${objectName}?`,
        onConfirm: (action?: string) => {
          this.performObjectDeletion();
        },
        buttons: [
          { text: 'Видалити', action: 'delete', className: 'btn-danger' },
          { text: 'Скасувати', action: 'cancel', className: 'btn-secondary' }
        ]
      });
    });
  }

  private performObjectDeletion(): void {
    if (!state.currentEditingObject.value) return;

    const customLayers = (window as any).customLayers || [];
    const map = (window as any).map;

    const layerObj = customLayers.find((l: any) => 
      l.featureGroup && l.featureGroup.hasLayer(state.currentEditingObject.value)
    );

    if (layerObj && layerObj.featureGroup) {
      layerObj.featureGroup.removeLayer(state.currentEditingObject.value);
    }

    if (map) {
      map.removeLayer(state.currentEditingObject.value);
    }

    if ((window as any).saveLayersToStorage) {
      (window as any).saveLayersToStorage();
    }
  }

  private getObjectPropertiesFromForm(): ObjectProperties {
    console.log('ModalService: getObjectPropertiesFromForm викликано');
    
    const nameInput = document.getElementById('object-name') as HTMLInputElement;
    const descInput = document.getElementById('object-description') as HTMLTextAreaElement;
    const colorInput = document.getElementById('object-color') as HTMLInputElement;
    const weightInput = document.getElementById('line-width') as HTMLInputElement;
    const opacityInput = document.getElementById('object-opacity') as HTMLInputElement;
    const fillColorInput = document.getElementById('fill-color') as HTMLInputElement;
    const fillOpacityInput = document.getElementById('fill-opacity') as HTMLInputElement;
    const styleSelect = document.getElementById('line-style') as HTMLSelectElement;
    const iconInput = document.getElementById('marker-icon') as HTMLInputElement;

    console.log('ModalService: Знайдені елементи форми:', {
      nameInput: !!nameInput,
      descInput: !!descInput,
      colorInput: !!colorInput,
      weightInput: !!weightInput,
      opacityInput: !!opacityInput,
      fillColorInput: !!fillColorInput,
      fillOpacityInput: !!fillOpacityInput,
      styleSelect: !!styleSelect,
      iconInput: !!iconInput
    });

    const properties = {
      name: nameInput?.value || '',
      description: descInput?.value || '',
      color: colorInput?.value,
      weight: weightInput ? parseInt(weightInput.value) : undefined,
      opacity: opacityInput ? parseFloat(opacityInput.value) : undefined,
      fillColor: fillColorInput?.value,
      fillOpacity: fillOpacityInput ? parseFloat(fillOpacityInput.value) : undefined,
      style: styleSelect?.value,
      icon: iconInput?.value
    };

    console.log('ModalService: Властивості з форми:', properties);
    return properties;
  }

  private getObjectType(layer: any): string {
    if (layer instanceof L.Marker && !(layer instanceof L.CircleMarker)) {
      return 'marker';
    } else if (layer instanceof L.Polyline) {
      return 'polyline';
    } else if (layer instanceof L.Polygon) {
      return 'polygon';
    } else if (layer instanceof L.Rectangle) {
      return 'rectangle';
    } else if (layer instanceof L.Circle) {
      return 'circle';
    }
    return 'unknown';
  }

  private getObjectProperties(layer: any): ObjectProperties {
    const properties = layer.properties || layer.feature?.properties || {};
    
    return {
      name: properties.name || '',
      description: properties.description || '',
      color: properties.color,
      weight: properties.weight,
      opacity: properties.opacity,
      fillColor: properties.fillColor,
      fillOpacity: properties.fillOpacity,
      style: properties.style,
      icon: properties.icon
    };
  }

  getCurrentEditingObject(): any | null {
    return state.currentEditingObject.value;
  }

  private updateUIAfterSave(): void {
    console.log('ModalService: updateUIAfterSave викликано');
    
    // Оновлюємо список об'єктів для шару, до якого належить об'єкт, що редагується
    const customLayers = (window as any).customLayers || [];
    
    console.log('ModalService: customLayers:', customLayers.length);
    console.log('ModalService: currentEditingObject:', state.currentEditingObject.value);
    
    if (state.currentEditingObject.value) {
      // Знаходимо шар, до якого належить об'єкт, що редагується
      let layerObj = null;
      
      // Спробуємо знайти за hasLayer
      layerObj = customLayers.find((l: any) => 
        l.featureGroup && l.featureGroup.hasLayer(state.currentEditingObject.value)
      );
      
      // Якщо не знайдено, спробуємо знайти за _leaflet_id
      if (!layerObj) {
        const objectId = (state.currentEditingObject.value as any)._leaflet_id;
        if (objectId) {
          layerObj = customLayers.find((l: any) => {
            if (!l.featureGroup) return false;
            let found = false;
            l.featureGroup.eachLayer((layer: any) => {
              if (layer._leaflet_id === objectId) {
                found = true;
              }
            });
            return found;
          });
        }
      }
      
      console.log('ModalService: Знайдений layerObj для об\'єкта:', layerObj);
      
      if (layerObj && (window as any).updateObjectsListForLayer) {
        console.log('ModalService: Викликаємо updateObjectsListForLayer...');
        (window as any).updateObjectsListForLayer(layerObj);
        console.log('ModalService: updateObjectsListForLayer викликано');
      } else {
        console.warn('ModalService: updateObjectsListForLayer не знайдено або layerObj не знайдено');
        // Якщо не знайшли конкретний шар, оновлюємо всі шари
        if ((window as any).updateObjectsListForAllLayers) {
          console.log('ModalService: Викликаємо updateObjectsListForAllLayers...');
          (window as any).updateObjectsListForAllLayers();
          console.log('ModalService: updateObjectsListForAllLayers викликано');
        }
      }
    } else {
      console.warn('ModalService: currentEditingObject не встановлено');
    }

    // Оновлюємо активний шар UI
    if ((window as any).updateActiveLayerUI) {
      console.log('ModalService: Викликаємо updateActiveLayerUI...');
      (window as any).updateActiveLayerUI();
      console.log('ModalService: updateActiveLayerUI викликано');
    } else {
      console.warn('ModalService: updateActiveLayerUI не знайдено');
    }
  }
} 