import { BaseComponent } from '../base/BaseComponent';
import { Logger } from '../utils/Logger';

export interface SearchConfig {
  searchInputId: string;
  searchResultsId: string;
  searchContainerId: string;
  debounceDelay: number;
}

export interface SearchResult {
  id: string;
  name: string;
  type: string;
  layer: any;
  properties: any;
}

export class SearchComponent extends BaseComponent {
  protected logger: Logger;
  private config: SearchConfig;
  private searchTimer: number | null = null;
  private searchResults: SearchResult[] = [];
  private isSearchActive: boolean = false;

  constructor(config: SearchConfig) {
    const containerElement = document.getElementById(config.searchContainerId) || document.createElement('div');
    super(containerElement, 'SearchComponent');
    this.logger = new Logger('SearchComponent');
    this.config = config;
  }

  protected onInit(): void {
    this.logger.info('Ініціалізація SearchComponent');
    this.setupEventHandlers();
  }

  protected onDestroy(): void {
    this.logger.info('Знищення SearchComponent');
    this.clearEventHandlers();
  }

  /**
   * Додати подвійний клік до шару для редагування
   */
  public addDoubleClickToLayer(layer: any): void {
    try {
      if (layer instanceof (window as any).L.Marker) {
        this.setupMarkerDoubleClick(layer);
      } else if (layer instanceof (window as any).L.Polygon || 
                 layer instanceof (window as any).L.Polyline ||
                 layer instanceof (window as any).L.Circle ||
                 layer instanceof (window as any).L.Rectangle) {
        this.setupShapeDoubleClick(layer);
      }

      this.logger.debug('Додано подвійний клік до шару:', layer);
    } catch (error) {
      this.logger.error('Помилка додавання подвійного кліку:', error);
    }
  }

  /**
   * Налаштувати подвійний клік для маркера
   */
  private setupMarkerDoubleClick(layer: any): void {
    // Дублюючий обробник для leaflet-івенту
    layer.on('dblclick', (e: any) => {
      layer._wasDblClicked = true;
      e.originalEvent?.stopPropagation?.();
      e.originalEvent?.preventDefault?.();
      this.showEditModal(layer);
    });

    // Додатковий обробник для DOM елемента
    this.addDomDblClickHandler(layer);
  }

  /**
   * Налаштувати подвійний клік для форми
   */
  private setupShapeDoubleClick(layer: any): void {
    layer.on('dblclick', (e: any) => {
      e.originalEvent?.stopPropagation?.();
      e.originalEvent?.preventDefault?.();
      this.showEditModal(layer);
    });
  }

  /**
   * Додати DOM обробник подвійного кліку
   */
  private addDomDblClickHandler(marker: any): void {
    const checkIcon = () => {
      const icon = marker._icon;
      if (icon) {
        const iconEl = icon as HTMLElement & { __dblclickHandlerAttached?: boolean };
        if (!iconEl.__dblclickHandlerAttached) {
          iconEl.addEventListener('dblclick', (e: any) => {
            e.stopPropagation();
            e.preventDefault();
            this.showEditModal(marker);
          });
          iconEl.__dblclickHandlerAttached = true;
        }
      } else {
        // Якщо іконка ще не створена — повторити через 100мс
        setTimeout(() => this.addDomDblClickHandler(marker), 100);
      }
    };

    checkIcon();
  }

  /**
   * Показати модальне вікно редагування
   */
  private showEditModal(layer: any): void {
    try {
      (window as any).showEditModal?.(layer);
    } catch (error) {
      this.logger.error('Помилка показу модального вікна:', error);
    }
  }

  /**
   * Виконати пошук по об'єктах
   */
  public performSearch(query: string): void {
    try {
      if (!query.trim()) {
        this.clearSearchResults();
        return;
      }

      this.searchResults = this.searchObjects(query);
      this.displaySearchResults();
      
      this.logger.debug('Виконано пошук:', { query, resultsCount: this.searchResults.length });
    } catch (error) {
      this.logger.error('Помилка пошуку:', error);
    }
  }

  /**
   * Пошук об'єктів по запиту
   */
  private searchObjects(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    try {
      // Отримати всі шари
      const customLayers = (window as any).customLayers || [];
      
      customLayers.forEach((layerObj: any) => {
        if (layerObj.featureGroup && layerObj.featureGroup.getLayers) {
          const layers = layerObj.featureGroup.getLayers();
          
          layers.forEach((layer: any) => {
            const properties = this.getObjectProperties(layer);
            const type = this.getObjectType(layer);
            
            // Пошук по назві
            if (properties.name && properties.name.toLowerCase().includes(searchTerm)) {
              results.push({
                id: this.generateObjectId(layer),
                name: properties.name,
                type,
                layer,
                properties
              });
            }
            
            // Пошук по опису
            if (properties.description && properties.description.toLowerCase().includes(searchTerm)) {
              results.push({
                id: this.generateObjectId(layer),
                name: properties.name || 'Без назви',
                type,
                layer,
                properties
              });
            }
          });
        }
      });
    } catch (error) {
      this.logger.error('Помилка пошуку об\'єктів:', error);
    }

    return results;
  }

  /**
   * Показати результати пошуку
   */
  private displaySearchResults(): void {
    const resultsContainer = document.getElementById(this.config.searchResultsId);
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';

    if (this.searchResults.length === 0) {
      resultsContainer.innerHTML = '<div class="search-no-results">Нічого не знайдено</div>';
      return;
    }

    this.searchResults.forEach((result, index) => {
      const resultElement = this.createSearchResultElement(result, index);
      resultsContainer.appendChild(resultElement);
    });

    this.showSearchResults();
  }

  /**
   * Створити елемент результату пошуку
   */
  private createSearchResultElement(result: SearchResult, index: number): HTMLElement {
    const resultElement = document.createElement('div');
    resultElement.className = 'search-result-item';
    resultElement.dataset.index = index.toString();
    
    resultElement.innerHTML = `
      <span class="result-icon">${this.getObjectIcon(result.type)}</span>
      <span class="result-name">${result.name}</span>
      <span class="result-type">${this.getTypeName(result.type)}</span>
    `;

    // Обробник кліку
    resultElement.addEventListener('click', () => {
      this.selectSearchResult(result);
    });

    // Обробник подвійного кліку
    resultElement.addEventListener('dblclick', () => {
      this.showEditModal(result.layer);
    });

    return resultElement;
  }

  /**
   * Вибрати результат пошуку
   */
  private selectSearchResult(result: SearchResult): void {
    try {
      // Центрувати карту на об'єкті
      const map = (window as any).map;
      if (map && result.layer) {
        if (result.layer.getBounds) {
          map.fitBounds(result.layer.getBounds());
        } else if (result.layer.getLatLng) {
          map.setView(result.layer.getLatLng(), map.getZoom());
        }
      }

      // Підсвітити об'єкт
      this.highlightObject(result.layer);

      // Закрити результати пошуку
      this.hideSearchResults();

      this.logger.debug('Вибрано результат пошуку:', result);
    } catch (error) {
      this.logger.error('Помилка вибору результату пошуку:', error);
    }
  }

  /**
   * Підсвітити об'єкт
   */
  private highlightObject(layer: any): void {
    try {
      // Тимчасово змінити стиль для підсвічування
      const originalStyle = { ...layer.options };
      
      if (layer.setStyle) {
        layer.setStyle({
          color: '#ff0000',
          weight: 3,
          opacity: 1
        });

        // Повернути оригінальний стиль через 2 секунди
        setTimeout(() => {
          layer.setStyle(originalStyle);
        }, 2000);
      }
    } catch (error) {
      this.logger.error('Помилка підсвічування об\'єкта:', error);
    }
  }

  /**
   * Показати результати пошуку
   */
  private showSearchResults(): void {
    const resultsContainer = document.getElementById(this.config.searchResultsId);
    if (resultsContainer) {
      resultsContainer.style.display = 'block';
      this.isSearchActive = true;
    }
  }

  /**
   * Приховати результати пошуку
   */
  private hideSearchResults(): void {
    const resultsContainer = document.getElementById(this.config.searchResultsId);
    if (resultsContainer) {
      resultsContainer.style.display = 'none';
      this.isSearchActive = false;
    }
  }

  /**
   * Очистити результати пошуку
   */
  private clearSearchResults(): void {
    this.searchResults = [];
    this.hideSearchResults();
  }

  /**
   * Налаштувати обробники подій
   */
  private setupEventHandlers(): void {
    const searchInput = document.getElementById(this.config.searchInputId) as HTMLInputElement;
    if (searchInput) {
      // Обробник введення
      searchInput.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value;
        this.handleSearchInput(query);
      });

      // Обробник фокусу
      searchInput.addEventListener('focus', () => {
        if (this.searchResults.length > 0) {
          this.showSearchResults();
        }
      });

      // Обробник клавіш
      searchInput.addEventListener('keydown', (e) => {
        this.handleSearchKeydown(e);
      });
    }

    // Обробник кліку поза результатами пошуку
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`#${this.config.searchContainerId}`)) {
        this.hideSearchResults();
      }
    });
  }

  /**
   * Обробка введення в поле пошуку
   */
  private handleSearchInput(query: string): void {
    // Очистити попередній таймер
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    // Встановити новий таймер для debounce
    this.searchTimer = window.setTimeout(() => {
      this.performSearch(query);
    }, this.config.debounceDelay);
  }

  /**
   * Обробка натискань клавіш в полі пошуку
   */
  private handleSearchKeydown(e: KeyboardEvent): void {
    if (!this.isSearchActive || this.searchResults.length === 0) return;

    const resultsContainer = document.getElementById(this.config.searchResultsId);
    if (!resultsContainer) return;

    const currentActive = resultsContainer.querySelector('.search-result-item.active');
    const items = resultsContainer.querySelectorAll('.search-result-item');

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.updateActiveSearchItem(items, currentActive, 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.updateActiveSearchItem(items, currentActive, -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (currentActive) {
          const index = parseInt(currentActive.getAttribute('data-index') || '0');
          this.selectSearchResult(this.searchResults[index]);
        }
        break;
      case 'Escape':
        this.hideSearchResults();
        break;
    }
  }

  /**
   * Оновити активний елемент пошуку
   */
  private updateActiveSearchItem(items: NodeListOf<Element>, currentActive: Element | null, direction: number): void {
    let nextIndex = 0;

    if (currentActive) {
      const currentIndex = parseInt(currentActive.getAttribute('data-index') || '0');
      nextIndex = (currentIndex + direction + items.length) % items.length;
      currentActive.classList.remove('active');
    }

    const nextItem = items[nextIndex] as HTMLElement;
    if (nextItem) {
      nextItem.classList.add('active');
      nextItem.scrollIntoView({ block: 'nearest' });
    }
  }

  /**
   * Очистити обробники подій
   */
  private clearEventHandlers(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
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
   * Згенерувати ID об'єкта
   */
  private generateObjectId(layer: any): string {
    return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  /**
   * Отримати назву типу
   */
  private getTypeName(type: string): string {
    const typeNames: { [key: string]: string } = {
      marker: 'Маркер',
      polygon: 'Полігон',
      polyline: 'Полілінія',
      image: 'Зображення',
      circle: 'Коло',
      rectangle: 'Прямокутник'
    };
    return typeNames[type] || 'Об\'єкт';
  }

  /**
   * Отримати результати пошуку
   */
  public getSearchResults(): SearchResult[] {
    return [...this.searchResults];
  }

  /**
   * Перевірити, чи активний пошук
   */
  public getSearchActiveState(): boolean {
    return this.isSearchActive;
  }

  /**
   * Очистити пошук
   */
  public clearSearch(): void {
    const searchInput = document.getElementById(this.config.searchInputId) as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }
    this.clearSearchResults();
  }
} 