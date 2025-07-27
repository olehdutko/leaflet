// LayerControlManager.ts - Централізоване управління контролями шарів
import { uiManager } from './UIManager.js';
import { storageManager } from './StorageManager.js';
import { layerDataManager } from './LayerDataManager.js';
import { objectManager } from './ObjectManager.js';
import { mapManager } from './MapManager.js';

export interface LayerControlOptions {
  layerId: number;
  title: string;
  visible: boolean;
  collapsed?: boolean;
  onToggle?: (visible: boolean) => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export class LayerControlManager {
  private static instance: LayerControlManager;
  private controlsContainer: HTMLElement | null = null;
  private layerControls: Map<number, HTMLElement> = new Map();
  
  private constructor() {}
  
  static getInstance(): LayerControlManager {
    if (!LayerControlManager.instance) {
      LayerControlManager.instance = new LayerControlManager();
    }
    return LayerControlManager.instance;
  }
  
  /**
   * Ініціалізація менеджера
   */
  init(containerId: string): void {
    this.controlsContainer = uiManager.getElement<HTMLElement>(containerId);
    if (!this.controlsContainer) {
      console.error(`Container with id '${containerId}' not found`);
    }
  }
  
  /**
   * Створення контролю для шару
   */
  createLayerControl(options: LayerControlOptions): HTMLElement {
    const control = this.createControlElement(options);
    this.layerControls.set(options.layerId, control);
    
    if (this.controlsContainer) {
      this.controlsContainer.appendChild(control);
    }
    
    return control;
  }
  
  /**
   * Створення елемента контролю
   */
  private createControlElement(options: LayerControlOptions): HTMLElement {
    const control = uiManager.createElement<HTMLDivElement>('div', 'layer-control');
    
    // Створюємо структуру контролю
    control.innerHTML = `
      <div class="layer-header">
        <div class="layer-info">
          <input type="checkbox" class="layer-visibility" ${options.visible ? 'checked' : ''}>
          <span class="layer-title">${options.title}</span>
        </div>
        <div class="layer-actions">
          <button class="layer-edit-btn" title="Редагувати шар">
            <i class="material-icons">edit</i>
          </button>
          <button class="layer-delete-btn" title="Видалити шар">
            <i class="material-icons">delete</i>
          </button>
          <button class="layer-collapse-btn" title="Згорнути/розгорнути">
            <i class="material-icons">${options.collapsed ? 'expand_more' : 'expand_less'}</i>
          </button>
        </div>
      </div>
      <div class="layer-content" style="display: ${options.collapsed ? 'none' : 'block'}">
        <div class="objects-list"></div>
      </div>
    `;
    
    // Додаємо обробники подій
    this.addControlEventListeners(control, options);
    
    return control;
  }
  
  /**
   * Додавання обробників подій для контролю
   */
  private addControlEventListeners(control: HTMLElement, options: LayerControlOptions): void {
    // Обробник видимості
    const visibilityCheckbox = control.querySelector('.layer-visibility') as HTMLInputElement;
    if (visibilityCheckbox) {
      visibilityCheckbox.addEventListener('change', (e) => {
        const visible = (e.target as HTMLInputElement).checked;
        this.handleVisibilityChange(options.layerId, visible);
        if (options.onToggle) {
          options.onToggle(visible);
        }
      });
    }
    
    // Обробник редагування
    const editBtn = control.querySelector('.layer-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        if (options.onEdit) {
          options.onEdit();
        }
      });
    }
    
    // Обробник видалення
    const deleteBtn = control.querySelector('.layer-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.handleLayerDelete(options.layerId, options.title);
        if (options.onDelete) {
          options.onDelete();
        }
      });
    }
    
    // Обробник згортання
    const collapseBtn = control.querySelector('.layer-collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        this.handleLayerCollapse(control, options.layerId);
      });
    }
  }
  
  /**
   * Обробка зміни видимості шару
   */
  private handleVisibilityChange(layerId: number, visible: boolean): void {
    const layers = layerDataManager.getLayers();
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      layer.visible = visible;
      if (layer.tileLayer) {
        if (visible) {
          mapManager.addLayer(layer.tileLayer);
        } else {
          mapManager.removeLayer(layer.tileLayer);
        }
      }
      storageManager.scheduleSave();
    }
  }
  
  /**
   * Обробка видалення шару
   */
  private handleLayerDelete(layerId: number, layerTitle: string): void {
    // Показуємо діалог підтвердження
    this.showDeleteConfirmation(layerTitle, () => {
      layerDataManager.removeLayer(layerId);
      this.removeLayerControl(layerId);
      storageManager.scheduleSave();
    });
  }
  
  /**
   * Показ діалогу підтвердження видалення
   */
  private showDeleteConfirmation(layerTitle: string, onConfirm: () => void): void {
    const message = `Ви дійсно хочете видалити шар "${layerTitle}"?`;
    
    // Створюємо модальне вікно
    const modal = uiManager.createElement<HTMLDivElement>('div', 'modal-overlay');
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Підтвердження видалення</h3>
        <p>${message}</p>
        <div class="modal-actions">
          <button class="btn btn-danger" id="confirm-delete">Видалити</button>
          <button class="btn btn-secondary" id="cancel-delete">Скасувати</button>
        </div>
      </div>
    `;
    
    // Додаємо стилі
    Object.assign(modal.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000'
    });
    
    const modalContent = modal.querySelector('.modal-content') as HTMLElement;
    if (modalContent) {
      Object.assign(modalContent.style, {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '400px',
        width: '90%'
      });
    }
    
    // Додаємо обробники
    const confirmBtn = modal.querySelector('#confirm-delete');
    const cancelBtn = modal.querySelector('#cancel-delete');
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        onConfirm();
        this.removeModal(modal);
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.removeModal(modal);
      });
    }
    
    // Додаємо на сторінку
    document.body.appendChild(modal);
  }
  
  /**
   * Видалення модального вікна
   */
  private removeModal(modal: HTMLElement): void {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }
  
  /**
   * Обробка згортання шару
   */
  private handleLayerCollapse(control: HTMLElement, layerId: number): void {
    const content = control.querySelector('.layer-content') as HTMLElement;
    const collapseBtn = control.querySelector('.layer-collapse-btn i') as HTMLElement;
    
    if (content && collapseBtn) {
      const isCollapsed = content.style.display === 'none';
      
      content.style.display = isCollapsed ? 'block' : 'none';
      collapseBtn.textContent = isCollapsed ? 'expand_less' : 'expand_more';
      
      // Оновлюємо стан в менеджері
      const layers = layerDataManager.getLayers();
      const layer = layers.find(l => l.id === layerId);
      if (layer) {
        layer.collapsed = !isCollapsed;
      }
    }
  }
  
  /**
   * Видалення контролю шару
   */
  removeLayerControl(layerId: number): void {
    const control = this.layerControls.get(layerId);
    if (control && control.parentNode) {
      control.parentNode.removeChild(control);
      this.layerControls.delete(layerId);
    }
  }
  
  /**
   * Оновлення контролю шару
   */
  updateLayerControl(layerId: number, updates: Partial<LayerControlOptions>): void {
    const control = this.layerControls.get(layerId);
    if (!control) return;
    
    // Оновлюємо заголовок
    if (updates.title) {
      const titleElement = control.querySelector('.layer-title');
      if (titleElement) {
        titleElement.textContent = updates.title;
      }
    }
    
    // Оновлюємо видимість
    if (updates.visible !== undefined) {
      const checkbox = control.querySelector('.layer-visibility') as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = updates.visible;
      }
    }
    
    // Оновлюємо згорнутий стан
    if (updates.collapsed !== undefined) {
      const content = control.querySelector('.layer-content') as HTMLElement;
      const collapseBtn = control.querySelector('.layer-collapse-btn i') as HTMLElement;
      
      if (content && collapseBtn) {
        content.style.display = updates.collapsed ? 'none' : 'block';
        collapseBtn.textContent = updates.collapsed ? 'expand_more' : 'expand_less';
      }
    }
  }
  
  /**
   * Отримання контролю шару
   */
  getLayerControl(layerId: number): HTMLElement | undefined {
    return this.layerControls.get(layerId);
  }
  
  /**
   * Очищення всіх контролів
   */
  clearAllControls(): void {
    this.layerControls.clear();
    if (this.controlsContainer) {
      this.controlsContainer.innerHTML = '';
    }
  }
  
  /**
   * Оновлення списку об'єктів для шару
   */
  updateObjectsList(layerId: number, objects: any[]): void {
    const control = this.layerControls.get(layerId);
    if (!control) return;
    
    const objectsList = control.querySelector('.objects-list');
    if (!objectsList) return;
    
    // Очищаємо список
    objectsList.innerHTML = '';
    
    // Додаємо об'єкти
    objects.forEach(obj => {
      const objectElement = this.createObjectElement(obj);
      objectsList.appendChild(objectElement);
    });
  }
  
  /**
   * Створення елемента об'єкта
   */
  private createObjectElement(obj: any): HTMLElement {
    const element = uiManager.createElement<HTMLDivElement>('div', 'object-item');
    
    const objectType = objectManager.getObjectType(obj);
    const properties = objectManager.getObjectProperties(obj);
    
    element.innerHTML = `
      <div class="object-info">
        <span class="object-type">${this.getObjectTypeLabel(objectType)}</span>
        <span class="object-name">${properties.name || 'Без назви'}</span>
      </div>
      <button class="object-edit-btn" title="Редагувати об'єкт">
        <i class="material-icons">edit</i>
      </button>
    `;
    
    // Додаємо обробник редагування
    const editBtn = element.querySelector('.object-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        // Викликаємо функцію редагування з ui.ts
        (window as any).showEditModal?.(obj);
      });
    }
    
    return element;
  }
  
  /**
   * Отримання лейбла типу об'єкта
   */
  private getObjectTypeLabel(type: string): string {
    const labels = {
      marker: '📍',
      polygon: '🔷',
      polyline: '➖',
      circle: '⭕',
      rectangle: '⬜',
      image: '🖼️'
    };
    return labels[type as keyof typeof labels] || '❓';
  }
}

export const layerControlManager = LayerControlManager.getInstance(); 