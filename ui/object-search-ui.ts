// UI компонент для глобального пошуку об'єктів
declare const L: any; // Leaflet global
import { ObjectSearchService, SearchableObject, ObjectSearchResult } from '../services/object-search-service.js';

export interface ObjectSearchUIConfig {
  inputId: string;
  resultsId: string;
  onResultSelect?: (object: SearchableObject) => void;
  onSearchStart?: () => void;
  onSearchEnd?: () => void;
  debounceMs?: number;
  minQueryLength?: number;
  maxResults?: number;
  highlightDuration?: number;
}

export class ObjectSearchUI {
  private service: ObjectSearchService;
  private config: ObjectSearchUIConfig;
  private input: HTMLInputElement | null = null;
  private resultsContainer: HTMLElement | null = null;
  private debounceTimer: number | null = null;
  private currentResults: ObjectSearchResult[] = [];
  private activeIndex: number = -1;
  private highlightTimeouts: Map<string, number> = new Map();

  constructor(config: ObjectSearchUIConfig) {
    this.service = ObjectSearchService.getInstance();
    this.config = {
      debounceMs: 250,
      minQueryLength: 2,
      maxResults: 15,
      highlightDuration: 3000,
      ...config
    };
    this.init();
  }

  private init(): void {
    this.input = document.getElementById(this.config.inputId) as HTMLInputElement;
    this.resultsContainer = document.getElementById(this.config.resultsId) as HTMLElement;

    if (!this.input || !this.resultsContainer) {
      console.error('Не знайдено елементи для пошуку об\'єктів');
      return;
    }

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.input || !this.resultsContainer) return;

    // Пошук при введенні
    this.input.addEventListener('input', (e) => {
      this.handleInput(e);
    });

    // Навігація клавішами
    this.input.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });

    // Закриття при кліку поза елементами
    document.addEventListener('click', (e) => {
      this.handleOutsideClick(e);
    });

    // Фокус на полі введення
    this.input.addEventListener('focus', () => {
      this.showResultsIfHasQuery();
    });
  }

  private handleInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    const query = target.value.trim();

    this.clearResults();
    this.activeIndex = -1;

    if (query.length < this.config.minQueryLength!) {
      return;
    }

    this.debounceSearch(query);
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (!this.currentResults.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.navigateResults(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.navigateResults(-1);
        break;
      case 'Enter':
        e.preventDefault();
        this.selectActiveResult();
        break;
      case 'Escape':
        e.preventDefault();
        this.clearResults();
        break;
    }
  }

  private handleOutsideClick(e: Event): void {
    const target = e.target as HTMLElement;
    if (!this.input?.contains(target) && !this.resultsContainer?.contains(target)) {
      this.clearResults();
    }
  }

  private debounceSearch(query: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.performSearch(query);
    }, this.config.debounceMs);
  }

  private performSearch(query: string): void {
    this.config.onSearchStart?.();

    try {
      const results = this.service.search({
        query,
        maxResults: this.config.maxResults
      });

      this.currentResults = results;
      this.renderResults();
    } catch (error) {
      console.error('Помилка пошуку об\'єктів:', error);
      this.showError('Помилка пошуку. Спробуйте ще раз.');
    } finally {
      this.config.onSearchEnd?.();
    }
  }

  private renderResults(): void {
    if (!this.resultsContainer) return;

    this.resultsContainer.innerHTML = '';

    if (this.currentResults.length === 0) {
      this.showNoResults();
      return;
    }

    // Групуємо результати за типами
    const groupedResults = this.groupResultsByType();
    
    Object.entries(groupedResults).forEach(([type, results]) => {
      const groupElement = this.createResultGroup(type, results);
      this.resultsContainer!.appendChild(groupElement);
    });

    this.showResults();
  }

  private groupResultsByType(): Record<string, ObjectSearchResult[]> {
    const grouped: Record<string, ObjectSearchResult[]> = {};
    
    this.currentResults.forEach(result => {
      const type = result.object.type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(result);
    });

    return grouped;
  }

  private createResultGroup(type: string, results: ObjectSearchResult[]): HTMLElement {
    const group = document.createElement('div');
    group.className = 'search-result-group';

    const groupHeader = document.createElement('div');
    groupHeader.className = 'search-result-group-header';
    groupHeader.textContent = this.getTypeDisplayName(type);
    group.appendChild(groupHeader);

    results.forEach((result, index) => {
      const item = this.createResultItem(result, index);
      group.appendChild(item);
    });

    return group;
  }

  private getTypeDisplayName(type: string): string {
    const typeNames: Record<string, string> = {
      'marker': 'Маркери',
      'polyline': 'Лінії',
      'polygon': 'Полігони',
      'image': 'Зображення'
    };
    return typeNames[type] || type;
  }

  private createResultItem(result: ObjectSearchResult, index: number): HTMLElement {
    const item = document.createElement('div');
    item.className = 'global-object-search-item';
    item.dataset.index = index.toString();

    const nameElement = document.createElement('div');
    nameElement.className = 'result-name';
    nameElement.textContent = result.object.name || '[без назви]';

    const detailsElement = document.createElement('div');
    detailsElement.className = 'result-details';

    const layerInfo = document.createElement('span');
    layerInfo.className = 'result-layer';
    layerInfo.textContent = result.object.layerName;

    detailsElement.appendChild(layerInfo);

    if (result.object.description) {
      const descElement = document.createElement('div');
      descElement.className = 'result-description';
      descElement.textContent = result.object.description;
      detailsElement.appendChild(descElement);
    }

    const relevanceElement = document.createElement('div');
    relevanceElement.className = 'result-relevance';
    relevanceElement.textContent = `${Math.round(result.relevance)}%`;

    item.appendChild(nameElement);
    item.appendChild(detailsElement);
    item.appendChild(relevanceElement);

    // Обробник кліку
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.selectResult(index);
    });

    return item;
  }

  private navigateResults(direction: number): void {
    if (this.currentResults.length === 0) return;

    this.activeIndex += direction;
    
    if (this.activeIndex >= this.currentResults.length) {
      this.activeIndex = 0;
    } else if (this.activeIndex < 0) {
      this.activeIndex = this.currentResults.length - 1;
    }

    this.updateActiveItem();
  }

  private updateActiveItem(): void {
    const items = this.resultsContainer?.querySelectorAll('.global-object-search-item');
    if (!items) return;

    items.forEach((item, index) => {
      if (index === this.activeIndex) {
        item.classList.add('active');
        this.scrollToItem(item as HTMLElement);
      } else {
        item.classList.remove('active');
      }
    });
  }

  private scrollToItem(item: HTMLElement): void {
    if (!this.resultsContainer) return;

    const containerRect = this.resultsContainer.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    if (itemRect.bottom > containerRect.bottom) {
      item.scrollIntoView({ block: 'end' });
    } else if (itemRect.top < containerRect.top) {
      item.scrollIntoView({ block: 'start' });
    }
  }

  private selectActiveResult(): void {
    if (this.activeIndex >= 0 && this.activeIndex < this.currentResults.length) {
      this.selectResult(this.activeIndex);
    }
  }

  private selectResult(index: number): void {
    const result = this.currentResults[index];
    if (!result) return;

    this.clearResults();
    this.highlightObject(result.object);
    this.config.onResultSelect?.(result.object);
  }

  private highlightObject(object: SearchableObject): void {
    const layer = object.layer;
    if (!layer) return;

    // Очищаємо попередні виділення
    this.clearHighlights();

    const isLineOrPoly = layer instanceof L.Polyline || layer instanceof L.Polygon;
    const isMarker = layer instanceof L.Marker && !(layer instanceof L.CircleMarker);

    if (isLineOrPoly) {
      this.highlightLineOrPoly(layer);
    } else if (isMarker) {
      this.highlightMarker(layer);
    } else if (layer.getElement && layer.getElement()) {
      this.highlightElement(layer);
    } else if ((layer as any)._path) {
      this.highlightPath(layer);
    }

    // Центруємо карту на об'єкті
    this.centerOnObject(object);
  }

  private highlightLineOrPoly(layer: any): void {
    const prevStyle = {
      color: layer.options.color,
      weight: layer.options.weight,
      dashArray: layer.options.dashArray,
      opacity: layer.options.opacity,
      fillColor: layer.options.fillColor,
      fillOpacity: layer.options.fillOpacity
    };

    layer.setStyle({
      color: '#cd1d1d',
      weight: 8,
      dashArray: '8,4',
      opacity: 1,
      fillColor: '#ffe066',
      fillOpacity: 0.7
    });

    const timeoutId = window.setTimeout(() => {
      layer.setStyle(prevStyle);
    }, this.config.highlightDuration);

    this.highlightTimeouts.set(layer._leaflet_id?.toString() || 'unknown', timeoutId);
  }

  private highlightMarker(layer: any): void {
    const prevIcon = layer.getIcon();
    const highlightIcon = L.divIcon({
      className: 'highlight-marker-icon',
      html: '<div style="background:#cd1d1d;width:32px;height:32px;border-radius:50%;border:3px solid #ffe066;box-shadow:0 0 12px #cd1d1d;"></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    layer.setIcon(highlightIcon);

    const timeoutId = window.setTimeout(() => {
      layer.setIcon(prevIcon);
    }, this.config.highlightDuration);

    this.highlightTimeouts.set(layer._leaflet_id?.toString() || 'unknown', timeoutId);
  }

  private highlightElement(layer: any): void {
    const element = layer.getElement();
    if (element) {
      element.classList.add('global-object-search-highlight');
      
      const timeoutId = window.setTimeout(() => {
        element.classList.remove('global-object-search-highlight');
      }, this.config.highlightDuration);

      this.highlightTimeouts.set(layer._leaflet_id?.toString() || 'unknown', timeoutId);
    }
  }

  private highlightPath(layer: any): void {
    const path = (layer as any)._path;
    if (path) {
      path.classList.add('global-object-search-highlight');
      
      const timeoutId = window.setTimeout(() => {
        path.classList.remove('global-object-search-highlight');
      }, this.config.highlightDuration);

      this.highlightTimeouts.set(layer._leaflet_id?.toString() || 'unknown', timeoutId);
    }
  }

  private clearHighlights(): void {
    // Очищаємо таймаути
    this.highlightTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.highlightTimeouts.clear();

    // Очищаємо CSS класи
    document.querySelectorAll('.global-object-search-highlight').forEach(el => {
      (el as HTMLElement).classList.remove('global-object-search-highlight');
    });
  }

  private centerOnObject(object: SearchableObject): void {
    const map = (window as any).map;
    if (!map) return;

    if (object.bounds) {
      const bounds = L.latLngBounds([
        [object.bounds.south, object.bounds.west],
        [object.bounds.north, object.bounds.east]
      ]);
      map.fitBounds(bounds, { maxZoom: 17 });
    } else if (object.coordinates) {
      map.setView(object.coordinates, 17);
    }
  }

  private showResults(): void {
    if (this.resultsContainer) {
      this.resultsContainer.classList.add('active');
    }
  }

  private showResultsIfHasQuery(): void {
    if (this.input && this.input.value.trim().length >= this.config.minQueryLength!) {
      this.showResults();
    }
  }

  private clearResults(): void {
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = '';
      this.resultsContainer.classList.remove('active');
    }
    this.currentResults = [];
    this.activeIndex = -1;
  }

  private showNoResults(): void {
    if (!this.resultsContainer) return;

    const noResults = document.createElement('div');
    noResults.className = 'global-object-search-item no-results';
    noResults.textContent = 'Нічого не знайдено';
    this.resultsContainer.appendChild(noResults);
    this.showResults();
  }

  private showError(message: string): void {
    if (!this.resultsContainer) return;

    const error = document.createElement('div');
    error.className = 'global-object-search-item error';
    error.textContent = message;
    this.resultsContainer.appendChild(error);
    this.showResults();
  }

  // Публічні методи
  public setValue(value: string): void {
    if (this.input) {
      this.input.value = value;
    }
  }

  public getValue(): string {
    return this.input?.value || '';
  }

  public focus(): void {
    this.input?.focus();
  }

  public clear(): void {
    this.setValue('');
    this.clearResults();
    this.clearHighlights();
  }

  public updateLayers(layers: any[]): void {
    this.service.setCustomLayers(layers);
  }

  public destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.clearHighlights();
    // Видаляємо обробники подій
    this.input?.removeEventListener('input', this.handleInput);
    this.input?.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('click', this.handleOutsideClick);
  }
} 