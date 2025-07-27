import { BaseComponent } from '../base/BaseComponent';
import { Logger } from '../utils/Logger';

export interface LayerData {
  id: string;
  title: string;
  visible: boolean;
  featureGroup: any;
  tileLayer: any;
  objects?: any[];
}

export interface LayerControlConfig {
  containerId: string;
  addLayerBtnId: string;
  exportAllBtnId: string;
  importAllBtnId: string;
  importAllInputId: string;
  layerCardClass: string;
  layerCardActiveClass: string;
  layerCardInactiveClass: string;
}

export class LayerControlComponent extends BaseComponent {
  protected logger: Logger;
  private config: LayerControlConfig;
  private layers: Map<string, LayerData> = new Map();
  private layerIdToRenderObjectsList: Map<string, () => void> = new Map();

  constructor(config: LayerControlConfig) {
    const containerElement = document.getElementById(config.containerId) || document.createElement('div');
    super(containerElement, 'LayerControlComponent');
    this.logger = new Logger('LayerControlComponent');
    this.config = config;
  }

  protected onInit(): void {
    this.logger.info('Ініціалізація LayerControlComponent');
    this.setupEventHandlers();
  }

  protected onDestroy(): void {
    this.logger.info('Знищення LayerControlComponent');
    this.clearEventHandlers();
  }

  /**
   * Створити картку шару
   */
  public createLayerControl(layerObj: LayerData): HTMLElement {
    try {
      const layerCard = document.createElement('div');
      layerCard.className = this.config.layerCardClass;
      layerCard.dataset.layerId = layerObj.id.toString();

      // Заголовок з іконками
      const headerIcons = this.createHeaderIcons(layerObj);
      layerCard.appendChild(headerIcons);

      // Заголовок шару
      const titleElement = this.createTitleElement(layerObj);
      layerCard.appendChild(titleElement);

      // Список об'єктів
      const objectsList = this.createObjectsList(layerObj);
      layerCard.appendChild(objectsList);

      // Налаштування подій
      this.setupLayerCardEvents(layerCard, layerObj);

      this.logger.debug('Створено картку шару:', layerObj.id);
      return layerCard;
    } catch (error) {
      this.logger.error('Помилка створення картки шару:', error);
      return document.createElement('div');
    }
  }

  /**
   * Створити заголовок з іконками
   */
  private createHeaderIcons(layerObj: LayerData): HTMLElement {
    const headerIcons = document.createElement('div');
    headerIcons.className = 'layer-card-header-icons';

    // Drag handle
    const dragHandle = this.createIconButton('fa fa-grip-vertical', 'Перетягнути для зміни порядку');
    dragHandle.className += ' layer-card-drag-handle';

    // Expand/collapse button
    const expandBtn = this.createIconButton('fa fa-chevron-up', 'Згорнути/розгорнути шар');
    expandBtn.className += ' layer-card-expand-btn';

    // Visibility button
    const visibilityBtn = this.createVisibilityButton(layerObj);

    // Delete button
    const deleteBtn = this.createIconButton('fa fa-trash', 'Видалити шар');
    deleteBtn.className += ' delete';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      this.deleteLayer(layerObj.id);
    };

    headerIcons.appendChild(dragHandle);
    headerIcons.appendChild(expandBtn);
    headerIcons.appendChild(visibilityBtn);
    headerIcons.appendChild(deleteBtn);

    return headerIcons;
  }

  /**
   * Створити кнопку видимості
   */
  private createVisibilityButton(layerObj: LayerData): HTMLElement {
    const visibilityBtn = document.createElement('button');
    visibilityBtn.className = 'layer-card-icon-btn';
    visibilityBtn.innerHTML = layerObj.visible ? '<i class="fa fa-eye"></i>' : '<i class="fa fa-eye-slash"></i>';
    visibilityBtn.title = layerObj.visible ? 'Сховати шар' : 'Показати шар';
    visibilityBtn.onclick = (e) => {
      e.stopPropagation();
      this.toggleLayerVisibility(layerObj);
    };

    if (layerObj.visible) {
      visibilityBtn.classList.add('blue');
    }

    return visibilityBtn;
  }

  /**
   * Створити заголовок шару
   */
  private createTitleElement(layerObj: LayerData): HTMLElement {
    const titleElement = document.createElement('div');
    titleElement.className = 'layer-card-title';
    titleElement.textContent = layerObj.title;
    return titleElement;
  }

  /**
   * Створити список об'єктів
   */
  private createObjectsList(layerObj: LayerData): HTMLElement {
    const objectsList = document.createElement('div');
    objectsList.className = 'layer-objects-list';

    const renderObjectsList = () => {
      objectsList.innerHTML = '';
      
      if (layerObj.featureGroup && layerObj.featureGroup.getLayers) {
        const layers = layerObj.featureGroup.getLayers();
        layers.forEach((layer: any) => {
          const objectItem = this.createObjectItem(layer);
          objectsList.appendChild(objectItem);
        });
      }
    };

    // Зберігаємо функцію для оновлення
    this.layerIdToRenderObjectsList.set(layerObj.id, renderObjectsList);
    
    // Початковий рендеринг
    renderObjectsList();

    return objectsList;
  }

  /**
   * Створити елемент об'єкта
   */
  private createObjectItem(layer: any): HTMLElement {
    const objectItem = document.createElement('div');
    objectItem.className = 'layer-object-item';
    
    const properties = this.getObjectProperties(layer);
    const type = this.getObjectType(layer);
    
    objectItem.innerHTML = `
      <span class="object-icon">${this.getObjectIcon(type)}</span>
      <span class="object-name">${properties.name || 'Без назви'}</span>
      <button class="object-edit-btn" title="Редагувати">
        <i class="fa fa-edit"></i>
      </button>
    `;

    // Обробник подвійного кліку для редагування
    objectItem.addEventListener('dblclick', () => {
      this.editObject(layer);
    });

    return objectItem;
  }

  /**
   * Створити іконку кнопки
   */
  private createIconButton(iconClass: string, title: string): HTMLElement {
    const button = document.createElement('button');
    button.className = 'layer-card-icon-btn';
    button.innerHTML = `<i class="${iconClass}"></i>`;
    button.title = title;
    return button;
  }

  /**
   * Налаштувати події картки шару
   */
  private setupLayerCardEvents(layerCard: HTMLElement, layerObj: LayerData): void {
    // Клік для вибору шару
    layerCard.onclick = (e) => {
      if ((e.target as HTMLElement).closest('.layer-card-icon-btn') ||
          (e.target as HTMLElement).closest('.layer-object-item') ||
          (e.target as HTMLElement).closest('.layer-objects-list')) {
        return;
      }
      this.selectLayer(layerObj.id);
    };

    // Expand/collapse
    const expandBtn = layerCard.querySelector('.layer-card-expand-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleLayerExpansion(layerCard);
      });
    }
  }

  /**
   * Переключити видимість шару
   */
  private toggleLayerVisibility(layerObj: LayerData): void {
    try {
      layerObj.visible = !layerObj.visible;
      
      if (layerObj.visible) {
        this.showLayer(layerObj);
      } else {
        this.hideLayer(layerObj);
      }

      // Оновити UI
      this.updateLayerCardVisibility(layerObj);
      
      // Зберегти стан
      this.saveLayersState();
      
      this.logger.debug('Переключено видимість шару:', { id: layerObj.id, visible: layerObj.visible });
    } catch (error) {
      this.logger.error('Помилка переключення видимості шару:', error);
    }
  }

  /**
   * Показати шар
   */
  private showLayer(layerObj: LayerData): void {
    const map = (window as any).map;
    if (map && layerObj.tileLayer) {
      layerObj.tileLayer.addTo(map);
    }
    if (map && layerObj.featureGroup) {
      layerObj.featureGroup.addTo(map);
    }
  }

  /**
   * Приховати шар
   */
  private hideLayer(layerObj: LayerData): void {
    const map = (window as any).map;
    if (map && layerObj.tileLayer) {
      map.removeLayer(layerObj.tileLayer);
    }
    if (map && layerObj.featureGroup) {
      map.removeLayer(layerObj.featureGroup);
    }
  }

  /**
   * Оновити видимість картки шару
   */
  private updateLayerCardVisibility(layerObj: LayerData): void {
    const layerCard = document.querySelector(`[data-layer-id="${layerObj.id}"]`);
    if (layerCard) {
      const visibilityBtn = layerCard.querySelector('.layer-card-icon-btn') as HTMLElement;
      if (visibilityBtn) {
        if (layerObj.visible) {
          visibilityBtn.innerHTML = '<i class="fa fa-eye"></i>';
          visibilityBtn.title = 'Сховати шар';
          visibilityBtn.classList.add('blue');
          layerCard.classList.remove(this.config.layerCardInactiveClass);
        } else {
          visibilityBtn.innerHTML = '<i class="fa fa-eye-slash"></i>';
          visibilityBtn.title = 'Показати шар';
          visibilityBtn.classList.remove('blue');
          layerCard.classList.add(this.config.layerCardInactiveClass);
        }
      }
    }
  }

  /**
   * Вибрати шар
   */
  public selectLayer(layerId: string): void {
    // Зняти виділення з усіх карток
    document.querySelectorAll(`.${this.config.layerCardClass}`).forEach(card => {
      card.classList.remove(this.config.layerCardActiveClass);
    });

    // Виділити обрану картку
    const targetCard = document.querySelector(`[data-layer-id="${layerId}"]`);
    if (targetCard) {
      targetCard.classList.add(this.config.layerCardActiveClass);
    }

    this.logger.debug('Вибрано шар:', layerId);
  }

  /**
   * Видалити шар
   */
  private deleteLayer(layerId: string): void {
    try {
      const layerObj = this.layers.get(layerId);
      if (!layerObj) {
        this.logger.warn('Шар не знайдено для видалення:', layerId);
        return;
      }

      // Показати діалог підтвердження
      this.showDeleteConfirmation(layerObj);
    } catch (error) {
      this.logger.error('Помилка видалення шару:', error);
    }
  }

  /**
   * Показати діалог підтвердження видалення
   */
  private showDeleteConfirmation(layerObj: LayerData): void {
    const message = `Ви дійсно хочете видалити шар "${layerObj.title}"?`;
    
    // Використовуємо глобальну функцію showConfirmDialog
    (window as any).showConfirmDialog?.({
      title: 'Видалення шару',
      message,
      onConfirm: () => this.performLayerDeletion(layerObj),
      buttons: [
        { text: 'Видалити', action: 'delete', className: 'btn-danger' },
        { text: 'Скасувати', action: 'cancel', className: 'btn-secondary' }
      ]
    });
  }

  /**
   * Виконати видалення шару
   */
  private performLayerDeletion(layerObj: LayerData): void {
    try {
      // Видалити з карти
      this.hideLayer(layerObj);
      
      // Видалити картку
      const layerCard = document.querySelector(`[data-layer-id="${layerObj.id}"]`);
      if (layerCard && layerCard.parentNode) {
        layerCard.parentNode.removeChild(layerCard);
      }

      // Видалити з колекції
      this.layers.delete(layerObj.id);
      this.layerIdToRenderObjectsList.delete(layerObj.id);

      // Зберегти стан
      this.saveLayersState();
      
      this.logger.info('Видалено шар:', layerObj.id);
    } catch (error) {
      this.logger.error('Помилка виконання видалення шару:', error);
    }
  }

  /**
   * Переключити розгортання шару
   */
  private toggleLayerExpansion(layerCard: HTMLElement): void {
    const objectsList = layerCard.querySelector('.layer-objects-list') as HTMLElement;
    const expandBtn = layerCard.querySelector('.layer-card-expand-btn i') as HTMLElement;
    
    if (objectsList && expandBtn) {
      const isExpanded = objectsList.style.display !== 'none';
      
      if (isExpanded) {
        objectsList.style.display = 'none';
        expandBtn.className = 'fa fa-chevron-down';
      } else {
        objectsList.style.display = 'block';
        expandBtn.className = 'fa fa-chevron-up';
      }
    }
  }

  /**
   * Редагувати об'єкт
   */
  private editObject(layer: any): void {
    // Використовуємо глобальну функцію showEditModal
    (window as any).showEditModal?.(layer);
  }

  /**
   * Оновити список об'єктів для шару
   */
  public updateObjectsListForLayer(layerId: string): void {
    const updateFn = this.layerIdToRenderObjectsList.get(layerId);
    if (updateFn) {
      updateFn();
    }
  }

  /**
   * Додати шар
   */
  public addLayer(layerObj: LayerData): void {
    try {
      this.layers.set(layerObj.id, layerObj);
      
      const layerCard = this.createLayerControl(layerObj);
      this.element.appendChild(layerCard);
      
      this.logger.info('Додано шар:', layerObj.id);
    } catch (error) {
      this.logger.error('Помилка додавання шару:', error);
    }
  }

  /**
   * Отримати всі шари
   */
  public getLayers(): LayerData[] {
    return Array.from(this.layers.values());
  }

  /**
   * Отримати шар за ID
   */
  public getLayer(layerId: string): LayerData | undefined {
    return this.layers.get(layerId);
  }

  /**
   * Зберегти стан шарів
   */
  private saveLayersState(): void {
    try {
      (window as any).saveLayersToStorage?.();
    } catch (error) {
      this.logger.error('Помилка збереження стану шарів:', error);
    }
  }

  /**
   * Налаштувати обробники подій
   */
  private setupEventHandlers(): void {
    // Кнопка додавання шару
    const addLayerBtn = document.getElementById(this.config.addLayerBtnId);
    if (addLayerBtn) {
      addLayerBtn.addEventListener('click', () => this.addNewLayer());
    }

    // Кнопка експорту
    const exportAllBtn = document.getElementById(this.config.exportAllBtnId);
    if (exportAllBtn) {
      exportAllBtn.addEventListener('click', () => this.exportAllLayers());
    }

    // Кнопка імпорту
    const importAllBtn = document.getElementById(this.config.importAllBtnId);
    if (importAllBtn) {
      importAllBtn.addEventListener('click', () => this.importAllLayers());
    }
  }

  /**
   * Очистити обробники подій
   */
  private clearEventHandlers(): void {
    // Очищення обробників подій
  }

  /**
   * Додати новий шар
   */
  private addNewLayer(): void {
    // Логіка додавання нового шару
    this.logger.debug('Додавання нового шару');
  }

  /**
   * Експортувати всі шари
   */
  private exportAllLayers(): void {
    // Логіка експорту шарів
    this.logger.debug('Експорт всіх шарів');
  }

  /**
   * Імпортувати шари
   */
  private importAllLayers(): void {
    // Логіка імпорту шарів
    this.logger.debug('Імпорт шарів');
  }

  /**
   * Отримати властивості об'єкта
   */
  private getObjectProperties(layer: any): any {
    return (window as any).getObjectProperties?.(layer) || {};
  }

  /**
   * Отримати тип об'єкта
   */
  private getObjectType(layer: any): string {
    return (window as any).getObjectType?.(layer) || 'unknown';
  }

  /**
   * Отримати іконку об'єкта
   */
  private getObjectIcon(type: string): string {
    const icons: { [key: string]: string } = {
      marker: '📍',
      polygon: '⬜',
      polyline: '➖',
      image: '🖼️',
      circle: '⭕',
      rectangle: '⬜'
    };
    return icons[type] || '❓';
  }
} 