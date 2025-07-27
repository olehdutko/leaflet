// ModalEditManager.ts - Централізоване управління модальними вікнами редагування
import { uiManager } from './UIManager.js';
import { objectManager } from './ObjectManager.js';
import { state } from './state.js';

export interface ObjectTypeHandler {
  setupControls: (layer: any, properties: any) => void;
  updateProperties: (layer: any, formData: any) => void;
  getControlGroups: () => string[];
}

export class ModalEditManager {
  private static instance: ModalEditManager;
  private typeHandlers: Map<string, ObjectTypeHandler> = new Map();
  
  private constructor() {
    this.initTypeHandlers();
  }
  
  static getInstance(): ModalEditManager {
    if (!ModalEditManager.instance) {
      ModalEditManager.instance = new ModalEditManager();
    }
    return ModalEditManager.instance;
  }
  
  /**
   * Ініціалізація обробників типів об'єктів
   */
  private initTypeHandlers(): void {
    this.typeHandlers.set('marker', new MarkerHandler());
    this.typeHandlers.set('polygon', new PolygonHandler());
    this.typeHandlers.set('polyline', new PolylineHandler());
    this.typeHandlers.set('image', new ImageHandler());
    this.typeHandlers.set('circle', new PolygonHandler());
    this.typeHandlers.set('rectangle', new PolygonHandler());
  }
  
  /**
   * Показ модального вікна редагування
   */
  showEditModal(layer: any): void {
    state.currentEditingObject.value = layer;
    
    const type = objectManager.getObjectType(layer);
    const properties = objectManager.getObjectProperties(layer);
    const handler = this.typeHandlers.get(type);
    
    if (!handler) {
      console.error(`No handler found for object type: ${type}`);
      return;
    }
    
    // Налаштовуємо заголовок
    this.setupModalHeader(type);
    
    // Приховуємо всі групи контролів
    this.hideAllControlGroups();
    
    // Показуємо відповідні групи для типу об'єкта
    this.showControlGroups(handler.getControlGroups());
    
    // Налаштовуємо контроли для конкретного типу
    handler.setupControls(layer, properties);
    
    // Показуємо модальне вікно
    this.showModal();
  }
  
  /**
   * Налаштування заголовка модального вікна
   */
  private setupModalHeader(type: string): void {
    const modalTitle = uiManager.getElement<HTMLElement>('modal-title');
    if (modalTitle) {
      const typeLabels = {
        marker: 'маркера',
        polygon: 'полігону',
        polyline: 'полілінії',
        image: 'зображення',
        circle: 'кола',
        rectangle: 'прямокутника'
      };
      
      const label = typeLabels[type as keyof typeof typeLabels] || 'обʼєкта';
      modalTitle.textContent = `Редагування ${label}`;
    }
  }
  
  /**
   * Приховування всіх груп контролів
   */
  private hideAllControlGroups(): void {
    const controlGroups = [
      'color-picker-group',
      'line-width-group',
      'style-group',
      'opacity-group',
      'marker-icon-group',
      'object-image-group'
    ];
    
    controlGroups.forEach(groupId => {
      uiManager.hideElement(groupId);
    });
    
    // Приховуємо групу координат
    const coordsGroup = document.querySelector('.marker-coords-group') as HTMLElement;
    if (coordsGroup) {
      coordsGroup.style.display = 'none';
    }
  }
  
  /**
   * Показ груп контролів
   */
  private showControlGroups(groups: string[]): void {
    groups.forEach(groupId => {
      uiManager.showElement(groupId);
    });
  }
  
  /**
   * Показ модального вікна
   */
  private showModal(): void {
    const modal = uiManager.getElement<HTMLElement>('edit-modal');
    if (modal) {
      modal.style.display = 'block';
    }
  }
  
  /**
   * Закриття модального вікна
   */
  closeEditModal(): void {
    const modal = uiManager.getElement<HTMLElement>('edit-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    state.currentEditingObject.value = null;
  }
  
  /**
   * Збереження змін об'єкта
   */
  saveObjectChanges(): void {
    const layer = state.currentEditingObject.value;
    if (!layer) return;
    
    const type = objectManager.getObjectType(layer);
    const handler = this.typeHandlers.get(type);
    
    if (!handler) return;
    
    // Збираємо дані з форми
    const formData = this.collectFormData();
    
    // Оновлюємо властивості об'єкта
    handler.updateProperties(layer, formData);
    
    // Закриваємо модальне вікно
    this.closeEditModal();
  }
  
  /**
   * Збір даних з форми
   */
  private collectFormData(): any {
    const formData: any = {};
    
    // Базові поля
    formData.name = uiManager.getInputValue('object-name');
    formData.description = uiManager.getInputValue('object-description');
    
    // Колір
    const colorInput = uiManager.getElement<HTMLInputElement>('object-color');
    if (colorInput) {
      formData.color = colorInput.value;
    }
    
    // Товщина лінії
    const lineWidthInput = uiManager.getElement<HTMLInputElement>('line-width');
    if (lineWidthInput) {
      formData.weight = parseInt(lineWidthInput.value) || 3;
    }
    
    // Стиль лінії
    const styleSelect = uiManager.getElement<HTMLSelectElement>('line-style');
    if (styleSelect) {
      formData.style = styleSelect.value;
    }
    
    // Прозорість
    const opacityInput = uiManager.getElement<HTMLInputElement>('object-opacity');
    if (opacityInput) {
      formData.opacity = parseFloat(opacityInput.value) || 1;
    }
    
    // Іконка маркера
    const iconInput = uiManager.getElement<HTMLInputElement>('marker-icon');
    if (iconInput) {
      formData.icon = iconInput.value;
    }
    
    // Координати маркера
    const latInput = uiManager.getElement<HTMLInputElement>('marker-lat');
    const lngInput = uiManager.getElement<HTMLInputElement>('marker-lng');
    if (latInput && lngInput) {
      formData.lat = parseFloat(latInput.value);
      formData.lng = parseFloat(lngInput.value);
    }
    
    return formData;
  }
}

// Обробник для маркерів
class MarkerHandler implements ObjectTypeHandler {
  setupControls(layer: any, properties: any): void {
    // Налаштовуємо іконку
    const iconInput = uiManager.getElement<HTMLInputElement>('marker-icon');
    const iconPreview = uiManager.getElement<HTMLElement>('marker-icon-preview');
    
    if (iconInput && iconPreview) {
      iconInput.value = properties.icon || 'place';
      iconPreview.textContent = iconInput.value;
      
      iconInput.oninput = function() {
        iconPreview.textContent = iconInput.value;
      };
    }
    
    // Налаштовуємо координати
    const coordsGroup = document.querySelector('.marker-coords-group') as HTMLElement;
    if (coordsGroup) {
      coordsGroup.style.display = 'block';
    }
    
    const latInput = uiManager.getElement<HTMLInputElement>('marker-lat');
    const lngInput = uiManager.getElement<HTMLInputElement>('marker-lng');
    
    if (latInput && lngInput && layer.getLatLng) {
      const latlng = layer.getLatLng();
      latInput.value = latlng.lat.toString();
      lngInput.value = latlng.lng.toString();
    }
  }
  
  updateProperties(layer: any, formData: any): void {
    // Оновлюємо властивості
    objectManager.applyObjectProperties(layer, formData);
    
    // Оновлюємо позицію якщо змінилися координати
    if (formData.lat && formData.lng && layer.setLatLng) {
      layer.setLatLng([formData.lat, formData.lng]);
    }
  }
  
  getControlGroups(): string[] {
    return ['color-picker-group', 'marker-icon-group', 'object-image-group'];
  }
}

// Обробник для полігонів
class PolygonHandler implements ObjectTypeHandler {
  setupControls(layer: any, properties: any): void {
    // Налаштовуємо колір заливки
    const colorInput = uiManager.getElement<HTMLInputElement>('object-color');
    if (colorInput) {
      colorInput.value = properties.fillColor || properties.color || '#1976d2';
    }
  }
  
  updateProperties(layer: any, formData: any): void {
    // Встановлюємо колір заливки
    if (formData.color) {
      formData.fillColor = formData.color;
    }
    
    objectManager.applyObjectProperties(layer, formData);
  }
  
  getControlGroups(): string[] {
    return ['color-picker-group', 'opacity-group', 'object-image-group'];
  }
}

// Обробник для поліліній
class PolylineHandler implements ObjectTypeHandler {
  setupControls(layer: any, properties: any): void {
    // Налаштовуємо товщину лінії
    const lineWidthInput = uiManager.getElement<HTMLInputElement>('line-width');
    const lineWidthValue = uiManager.getElement<HTMLElement>('line-width-value');
    
    if (lineWidthInput && lineWidthValue && properties.weight) {
      lineWidthInput.value = properties.weight.toString();
      lineWidthValue.textContent = properties.weight + 'px';
    }
    
    // Налаштовуємо стиль лінії
    const styleSelect = uiManager.getElement<HTMLSelectElement>('line-style');
    if (styleSelect && properties.style) {
      styleSelect.value = properties.style;
    }
  }
  
  updateProperties(layer: any, formData: any): void {
    objectManager.applyObjectProperties(layer, formData);
  }
  
  getControlGroups(): string[] {
    return ['color-picker-group', 'line-width-group', 'style-group', 'object-image-group'];
  }
}

// Обробник для зображень
class ImageHandler implements ObjectTypeHandler {
  setupControls(layer: any, properties: any): void {
    // Налаштовуємо прозорість
    const opacityInput = uiManager.getElement<HTMLInputElement>('object-opacity');
    if (opacityInput && properties.opacity !== undefined) {
      opacityInput.value = properties.opacity.toString();
    }
  }
  
  updateProperties(layer: any, formData: any): void {
    objectManager.applyObjectProperties(layer, formData);
  }
  
  getControlGroups(): string[] {
    return ['opacity-group', 'object-image-group'];
  }
}

export const modalEditManager = ModalEditManager.getInstance(); 