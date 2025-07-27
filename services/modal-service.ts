// Сервіс для роботи з модальними вікнами
declare const L: any; // Leaflet global
import { LegacyAdapter } from '../adapters/legacy-adapter.js';

export interface ModalState {
  currentEditingObject: any | null;
}

export interface ObjectProperties {
  name: string;
  description: string;
  color?: string;
  weight?: number;
  opacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  style?: string;
}

export class ModalService {
  private static instance: ModalService;
  private state: ModalState = {
    currentEditingObject: null
  };

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
    this.state.currentEditingObject = object;
    
    // Імпортуємо функцію показу модального вікна
    import('../ui.js').then(({ showEditModal }) => {
      showEditModal(object);
    });
  }

  closeEditModal(): void {
    this.state.currentEditingObject = null;
    
    const modalElement = document.getElementById('edit-object-modal') as HTMLElement;
    if (modalElement) {
      modalElement.classList.add('hidden');
    }
  }

  private saveObjectChanges(): void {
    if (!this.state.currentEditingObject) return;

    // Імпортуємо функцію застосування властивостей
    import('../objects.js').then(({ applyObjectProperties }) => {
      const properties = this.getObjectPropertiesFromForm();
      applyObjectProperties(this.state.currentEditingObject, properties);
      
      // Додаємо копіювання у feature.properties
      if ((this.state.currentEditingObject as any).feature && (this.state.currentEditingObject as any).properties) {
        (this.state.currentEditingObject as any).feature.properties = { 
          ...(this.state.currentEditingObject as any).properties 
        };
      }

      // Зберігаємо зміни
      if ((window as any).saveLayersToStorage) {
        (window as any).saveLayersToStorage();
      }

      this.closeEditModal();
    });
  }

  private handleDeleteObject(): void {
    if (!this.state.currentEditingObject) return;

    const type = this.getObjectType(this.state.currentEditingObject);
    let typeName = 'обʼєкт';
    
    if (type === 'marker') typeName = 'маркер';
    else if (type === 'polygon') typeName = 'полігон';
    else if (type === 'polyline') typeName = 'полілінію';
    else if (type === 'rectangle') typeName = 'прямокутник';
    else if (type === 'circle') typeName = 'коло';

    const properties = this.getObjectProperties(this.state.currentEditingObject);
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
    if (!this.state.currentEditingObject) return;

    const customLayers = (window as any).customLayers || [];
    const map = (window as any).map;

    const layerObj = customLayers.find((l: any) => 
      l.featureGroup && l.featureGroup.hasLayer(this.state.currentEditingObject)
    );

    if (layerObj && layerObj.featureGroup) {
      layerObj.featureGroup.removeLayer(this.state.currentEditingObject);
    }

    if (map) {
      map.removeLayer(this.state.currentEditingObject);
    }

    if ((window as any).saveLayersToStorage) {
      (window as any).saveLayersToStorage();
    }
  }

  private getObjectPropertiesFromForm(): ObjectProperties {
    const nameInput = document.getElementById('object-name') as HTMLInputElement;
    const descInput = document.getElementById('object-description') as HTMLTextAreaElement;
    const colorInput = document.getElementById('object-color') as HTMLInputElement;
    const weightInput = document.getElementById('line-width') as HTMLInputElement;
    const opacityInput = document.getElementById('object-opacity') as HTMLInputElement;
    const fillColorInput = document.getElementById('fill-color') as HTMLInputElement;
    const fillOpacityInput = document.getElementById('fill-opacity') as HTMLInputElement;
    const styleSelect = document.getElementById('line-style') as HTMLSelectElement;

    return {
      name: nameInput?.value || '',
      description: descInput?.value || '',
      color: colorInput?.value,
      weight: weightInput ? parseInt(weightInput.value) : undefined,
      opacity: opacityInput ? parseFloat(opacityInput.value) : undefined,
      fillColor: fillColorInput?.value,
      fillOpacity: fillOpacityInput ? parseFloat(fillOpacityInput.value) : undefined,
      style: styleSelect?.value
    };
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
      style: properties.style
    };
  }

  getCurrentEditingObject(): any | null {
    return this.state.currentEditingObject;
  }
} 