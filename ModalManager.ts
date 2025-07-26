// ModalManager.ts - Централізоване управління модальними вікнами
import { uiManager } from './UIManager.js';
import { objectManager, ObjectProperties } from './ObjectManager.js';
import { state } from './state.js';

export interface ModalConfig {
  id: string;
  title?: string;
  content?: string;
  buttons?: Array<{
    text: string;
    action: string;
    className?: string;
    onClick?: () => void;
  }>;
  onClose?: () => void;
  onConfirm?: () => void;
}

export class ModalManager {
  private static instance: ModalManager;
  private activeModal: string | null = null;
  
  private constructor() {}
  
  static getInstance(): ModalManager {
    if (!ModalManager.instance) {
      ModalManager.instance = new ModalManager();
    }
    return ModalManager.instance;
  }
  
  // Показ модального вікна
  show(config: ModalConfig): void {
    const modal = uiManager.getElement<HTMLElement>(config.id);
    if (!modal) {
      console.error(`Modal with id '${config.id}' not found`);
      return;
    }
    
    // Встановлюємо заголовок
    if (config.title) {
      const titleElement = modal.querySelector('.modal-title');
      if (titleElement) {
        titleElement.textContent = config.title;
      }
    }
    
    // Встановлюємо контент
    if (config.content) {
      const contentElement = modal.querySelector('.modal-content');
      if (contentElement) {
        contentElement.innerHTML = config.content;
      }
    }
    
    // Налаштовуємо кнопки
    if (config.buttons) {
      this.setupButtons(modal, config.buttons, config);
    }
    
    // Показуємо модальне вікно
    modal.classList.remove('hidden');
    this.activeModal = config.id;
    
    // Додаємо обробник закриття
    this.setupCloseHandlers(modal, config);
  }
  
  // Приховування модального вікна
  hide(id: string): void {
    const modal = uiManager.getElement<HTMLElement>(id);
    if (modal) {
      modal.classList.add('hidden');
      if (this.activeModal === id) {
        this.activeModal = null;
      }
    }
  }
  
  // Приховування активного модального вікна
  hideActive(): void {
    if (this.activeModal) {
      this.hide(this.activeModal);
    }
  }
  
  // Налаштування кнопок
  private setupButtons(modal: HTMLElement, buttons: ModalConfig['buttons'], config: ModalConfig): void {
    const buttonContainer = modal.querySelector('.modal-buttons');
    if (!buttonContainer) return;
    
    buttonContainer.innerHTML = '';
    
    buttons?.forEach(buttonConfig => {
      const button = uiManager.createElement<HTMLButtonElement>('button', buttonConfig.className);
      button.textContent = buttonConfig.text;
      button.onclick = () => {
        if (buttonConfig.onClick) {
          buttonConfig.onClick();
        }
        
        switch (buttonConfig.action) {
          case 'confirm':
            if (config.onConfirm) config.onConfirm();
            this.hide(config.id);
            break;
          case 'cancel':
          case 'close':
            this.hide(config.id);
            break;
        }
      };
      
      buttonContainer.appendChild(button);
    });
  }
  
  // Налаштування обробників закриття
  private setupCloseHandlers(modal: HTMLElement, config: ModalConfig): void {
    // Кнопка закриття
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (config.onClose) config.onClose();
        this.hide(config.id);
      });
    }
    
    // Клік поза модальним вікном
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (config.onClose) config.onClose();
        this.hide(config.id);
      }
    });
    
    // ESC клавіша
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (config.onClose) config.onClose();
        this.hide(config.id);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
  
  // Показ діалогу підтвердження
  showConfirmDialog(config: {
    title?: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    buttons?: Array<{ text: string; action: string; className?: string }>;
  }): void {
    const modalId = 'confirm-dialog';
    
    // Створюємо модальне вікно якщо його немає
    let modal = uiManager.getElement<HTMLElement>(modalId);
    if (!modal) {
      modal = this.createConfirmDialog();
    }
    
    this.show({
      id: modalId,
      title: config.title || 'Підтвердження',
      content: `<p>${config.message}</p>`,
      buttons: config.buttons || [
        { text: 'Підтвердити', action: 'confirm', className: 'btn-primary' },
        { text: 'Скасувати', action: 'cancel', className: 'btn-secondary' }
      ],
      onConfirm: config.onConfirm,
      onClose: config.onCancel
    });
  }
  
  // Створення діалогу підтвердження
  private createConfirmDialog(): HTMLElement {
    const modal = uiManager.createElement<HTMLElement>('div', 'modal hidden');
    modal.id = 'confirm-dialog';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title"></h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body"></div>
        <div class="modal-footer">
          <div class="modal-buttons"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
  }
  
  // Показ модального вікна редагування об'єкта
  showEditModal(layer: any): void {
    if (!layer) return;
    
    state.currentEditingObject.value = layer;
    const type = objectManager.getObjectType(layer);
    const properties = objectManager.getObjectProperties(layer);
    
    // Оновлюємо заголовок
    const typeNames = {
      marker: 'маркера',
      polygon: 'полігону',
      polyline: 'полілінії',
      image: 'зображення',
      circle: 'кола',
      rectangle: 'прямокутника'
    };
    
    const typeName = typeNames[type as keyof typeof typeNames] || 'обʼєкта';
    uiManager.setText('modal-title', `Редагування ${typeName}`);
    
    // Заповнюємо поля
    uiManager.setInputValue('object-name', properties.name || '');
    uiManager.setInputValue('object-description', properties.description || '');
    
    // Налаштовуємо контроли залежно від типу
    this.setupEditControls(type, properties);
    
    // Показуємо модальне вікно
    uiManager.removeClass('edit-object-modal', 'hidden');
  }
  
  // Налаштування контролів редагування
  private setupEditControls(type: string, properties: ObjectProperties): void {
    const controlGroups = {
      colorPicker: 'color-picker-group',
      lineWidth: 'line-width-group',
      style: 'style-group',
      opacity: 'opacity-group',
      markerIcon: 'marker-icon-group',
      image: 'object-image-group'
    };
    
    // Приховуємо всі групи
    Object.values(controlGroups).forEach(groupId => {
      uiManager.hideElement(groupId);
    });
    
    // Показуємо відповідні групи
    switch (type) {
      case 'marker':
        uiManager.showElement(controlGroups.colorPicker);
        uiManager.showElement(controlGroups.markerIcon);
        uiManager.showElement(controlGroups.image);
        this.setupMarkerControls(properties);
        break;
      case 'polygon':
      case 'circle':
      case 'rectangle':
        uiManager.showElement(controlGroups.colorPicker);
        uiManager.showElement(controlGroups.opacity);
        uiManager.showElement(controlGroups.image);
        break;
      case 'polyline':
        uiManager.showElement(controlGroups.colorPicker);
        uiManager.showElement(controlGroups.lineWidth);
        uiManager.showElement(controlGroups.style);
        uiManager.showElement(controlGroups.image);
        this.setupPolylineControls(properties);
        break;
      case 'image':
        uiManager.showElement(controlGroups.image);
        uiManager.showElement(controlGroups.opacity);
        break;
    }
    
    // Заповнюємо загальні поля
    this.fillCommonFields(properties);
  }
  
  // Налаштування контролів маркера
  private setupMarkerControls(properties: ObjectProperties): void {
    uiManager.setInputValue('marker-icon', properties.icon || 'place');
    
    // Показуємо координати
    const coordsGroup = uiManager.querySelector<HTMLElement>('.marker-coords-group');
    if (coordsGroup) {
      coordsGroup.style.display = '';
    }
    
    // Заповнюємо координати
    if (state.currentEditingObject.value && (state.currentEditingObject.value as any).getLatLng) {
      const latlng = (state.currentEditingObject.value as any).getLatLng();
      uiManager.setInputValue('marker-lat', latlng.lat.toString());
      uiManager.setInputValue('marker-lng', latlng.lng.toString());
    }
  }
  
  // Налаштування контролів лінії
  private setupPolylineControls(properties: ObjectProperties): void {
    uiManager.setInputValue('line-width', (properties.weight || 3).toString());
    uiManager.setInputValue('line-style', properties.style || 'solid');
  }
  
  // Заповнення загальних полів
  private fillCommonFields(properties: ObjectProperties): void {
    uiManager.setInputValue('object-color', properties.color || properties.fillColor || '#1976d2');
  }
  
  // Закриття модального вікна редагування
  closeEditModal(): void {
    uiManager.addClass('edit-object-modal', 'hidden');
    state.currentEditingObject.value = null;
  }
}

export const modalManager = ModalManager.getInstance(); 