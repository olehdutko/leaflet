import { BaseComponent } from '../base/BaseComponent';
import { Logger } from '../utils/Logger';
import { getObjectType, getObjectProperties } from '../../utils.js';
import { applyObjectProperties } from '../../objects.js';

export interface EditModalData {
  layer: any;
  type: string;
  properties: any;
}

export interface ObjectEditConfig {
  modalId: string;
  titleId: string;
  nameInputId: string;
  descriptionInputId: string;
  colorInputId: string;
  lineWidthInputId: string;
  lineWidthValueId: string;
  opacityInputId: string;
  markerIconInputId: string;
  markerIconPreviewId: string;
  markerLatInputId: string;
  markerLngInputId: string;
  saveButtonId: string;
  cancelButtonId: string;
}

export class ObjectEditComponent extends BaseComponent {
  protected logger: Logger;
  private config: ObjectEditConfig;
  private currentEditingObject: any = null;

  constructor(config: ObjectEditConfig) {
    const modalElement = document.getElementById(config.modalId) || document.createElement('div');
    super(modalElement, 'ObjectEditComponent');
    this.logger = new Logger('ObjectEditComponent');
    this.config = config;
  }

  protected onInit(): void {
    this.logger.info('Ініціалізація ObjectEditComponent');
    this.setupEventHandlers();
  }

  protected onDestroy(): void {
    this.logger.info('Знищення ObjectEditComponent');
    this.clearEventHandlers();
  }

  /**
   * Показати модальне вікно редагування об'єкта
   */
  public showEditModal(layer: any): void {
    try {
      this.currentEditingObject = layer;
      const type = getObjectType(layer);
      const properties = getObjectProperties(layer);

      this.updateModalTitle(type);
      this.fillFormFields(properties, type);
      this.showHideControlGroups(type);
      this.showModal();

      this.logger.debug('Показано модальне вікно редагування:', { type, properties });
    } catch (error) {
      this.logger.error('Помилка показу модального вікна:', error);
    }
  }

  /**
   * Закрити модальне вікно редагування
   */
  public closeEditModal(): void {
    try {
      const modal = document.getElementById(this.config.modalId);
      if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      }
      this.currentEditingObject = null;
      this.clearForm();
      this.logger.debug('Закрито модальне вікно редагування');
    } catch (error) {
      this.logger.error('Помилка закриття модального вікна:', error);
    }
  }

  /**
   * Зберегти зміни об'єкта
   */
  public saveObjectChanges(): void {
    try {
      if (!this.currentEditingObject) {
        this.logger.warn('Немає об\'єкта для збереження');
        return;
      }

      const properties = this.collectFormData();
      applyObjectProperties(this.currentEditingObject, properties);
      
      this.closeEditModal();
      this.logger.info('Збережено зміни об\'єкта:', properties);
    } catch (error) {
      this.logger.error('Помилка збереження об\'єкта:', error);
    }
  }

  /**
   * Оновити заголовок модального вікна
   */
  private updateModalTitle(type: string): void {
    const modalTitle = document.getElementById(this.config.titleId);
    if (modalTitle) {
      const typeNames: { [key: string]: string } = {
        marker: 'маркера',
        polygon: 'полігону',
        polyline: 'полілінії',
        image: 'зображення',
        circle: 'кола',
        rectangle: 'прямокутника'
      };
      const typeName = typeNames[type] || 'об\'єкта';
      modalTitle.textContent = `Редагування ${typeName}`;
    }
  }

  /**
   * Заповнити поля форми
   */
  private fillFormFields(properties: any, type: string): void {
    // Основні поля
    this.setInputValue(this.config.nameInputId, properties.name || '');
    this.setInputValue(this.config.descriptionInputId, properties.description || '');
    this.setInputValue(this.config.colorInputId, properties.color || properties.fillColor || '#1976d2');

    // Специфічні поля для різних типів
    if (type === 'marker') {
      this.setInputValue(this.config.markerIconInputId, properties.icon || 'place');
      this.setInputValue(this.config.markerIconPreviewId, properties.icon || 'place');
      
      // Координати маркера
      if (this.currentEditingObject && this.currentEditingObject.getLatLng) {
        const latlng = this.currentEditingObject.getLatLng();
        this.setInputValue(this.config.markerLatInputId, latlng.lat.toString());
        this.setInputValue(this.config.markerLngInputId, latlng.lng.toString());
      }
    }

    if (type === 'polyline') {
      this.setInputValue(this.config.lineWidthInputId, properties.weight || '3');
      this.setInputValue(this.config.lineWidthValueId, (properties.weight || '3') + 'px');
    }

    if (type === 'polygon' || type === 'circle' || type === 'rectangle' || type === 'image') {
      this.setInputValue(this.config.opacityInputId, properties.opacity || '1');
    }
  }

  /**
   * Показати/приховати групи контролів залежно від типу
   */
  private showHideControlGroups(type: string): void {
    const groups = {
      colorPicker: document.getElementById('color-picker-group'),
      lineWidth: document.getElementById('line-width-group'),
      style: document.getElementById('style-group'),
      opacity: document.getElementById('opacity-group'),
      markerIcon: document.getElementById('marker-icon-group'),
      image: document.getElementById('object-image-group'),
      coords: document.querySelector('.marker-coords-group')
    };

    // Приховати всі групи
    Object.values(groups).forEach(group => {
      if (group) (group as HTMLElement).style.display = 'none';
    });

    // Показати відповідні групи
    switch (type) {
      case 'marker':
        if (groups.colorPicker) groups.colorPicker.style.display = 'block';
        if (groups.markerIcon) groups.markerIcon.style.display = 'block';
        if (groups.image) groups.image.style.display = 'block';
        if (groups.coords) (groups.coords as HTMLElement).style.display = '';
        break;
      case 'polygon':
      case 'circle':
      case 'rectangle':
        if (groups.colorPicker) groups.colorPicker.style.display = 'block';
        if (groups.opacity) groups.opacity.style.display = 'block';
        if (groups.image) groups.image.style.display = 'block';
        break;
      case 'polyline':
        if (groups.colorPicker) groups.colorPicker.style.display = 'block';
        if (groups.lineWidth) groups.lineWidth.style.display = 'block';
        if (groups.style) groups.style.style.display = 'block';
        if (groups.image) groups.image.style.display = 'block';
        break;
      case 'image':
        if (groups.image) groups.image.style.display = 'block';
        if (groups.opacity) groups.opacity.style.display = 'block';
        break;
    }
  }

  /**
   * Показати модальне вікно
   */
  private showModal(): void {
    const modal = document.getElementById(this.config.modalId);
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'block';
    }
  }

  /**
   * Зібрати дані з форми
   */
  private collectFormData(): any {
    const properties: any = {};

    // Основні поля
    properties.name = this.getInputValue(this.config.nameInputId);
    properties.description = this.getInputValue(this.config.descriptionInputId);
    properties.color = this.getInputValue(this.config.colorInputId);

    // Специфічні поля
    const type = getObjectType(this.currentEditingObject);
    
    if (type === 'marker') {
      properties.icon = this.getInputValue(this.config.markerIconInputId);
    }

    if (type === 'polyline') {
      properties.weight = parseInt(this.getInputValue(this.config.lineWidthInputId)) || 3;
    }

    if (type === 'polygon' || type === 'circle' || type === 'rectangle' || type === 'image') {
      properties.opacity = parseFloat(this.getInputValue(this.config.opacityInputId)) || 1;
    }

    return properties;
  }

  /**
   * Очистити форму
   */
  private clearForm(): void {
    this.setInputValue(this.config.nameInputId, '');
    this.setInputValue(this.config.descriptionInputId, '');
    this.setInputValue(this.config.colorInputId, '#1976d2');
    this.setInputValue(this.config.lineWidthInputId, '3');
    this.setInputValue(this.config.opacityInputId, '1');
    this.setInputValue(this.config.markerIconInputId, 'place');
  }

  /**
   * Налаштувати обробники подій
   */
  private setupEventHandlers(): void {
    // Кнопка збереження
    const saveBtn = document.getElementById(this.config.saveButtonId);
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveObjectChanges());
    }

    // Кнопка скасування
    const cancelBtn = document.getElementById(this.config.cancelButtonId);
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeEditModal());
    }

    // Оновлення превью іконки маркера
    const markerIconInput = document.getElementById(this.config.markerIconInputId) as HTMLInputElement;
    const markerIconPreview = document.getElementById(this.config.markerIconPreviewId);
    if (markerIconInput && markerIconPreview) {
      markerIconInput.addEventListener('input', () => {
        markerIconPreview.textContent = markerIconInput.value;
      });
    }

    // Оновлення значення товщини лінії
    const lineWidthInput = document.getElementById(this.config.lineWidthInputId) as HTMLInputElement;
    const lineWidthValue = document.getElementById(this.config.lineWidthValueId);
    if (lineWidthInput && lineWidthValue) {
      lineWidthInput.addEventListener('input', () => {
        lineWidthValue.textContent = lineWidthInput.value + 'px';
      });
    }
  }

  /**
   * Очистити обробники подій
   */
  private clearEventHandlers(): void {
    const saveBtn = document.getElementById(this.config.saveButtonId);
    const cancelBtn = document.getElementById(this.config.cancelButtonId);
    
    if (saveBtn) {
      saveBtn.removeEventListener('click', () => this.saveObjectChanges());
    }
    if (cancelBtn) {
      cancelBtn.removeEventListener('click', () => this.closeEditModal());
    }
  }

  /**
   * Встановити значення input
   */
  private setInputValue(inputId: string, value: string): void {
    const input = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement;
    if (input) {
      input.value = value;
    }
  }

  /**
   * Отримати значення input
   */
  private getInputValue(inputId: string): string {
    const input = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement;
    return input ? input.value : '';
  }

  /**
   * Отримати поточний об'єкт, що редагується
   */
  public getCurrentEditingObject(): any {
    return this.currentEditingObject;
  }

  /**
   * Перевірити, чи відкрите модальне вікно
   */
  public isModalOpen(): boolean {
    const modal = document.getElementById(this.config.modalId);
    return modal ? !modal.classList.contains('hidden') : false;
  }
} 