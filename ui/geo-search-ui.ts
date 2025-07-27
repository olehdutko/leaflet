// UI компонент для геопошуку
import { GeoSearchService, GeoSearchResult } from '../services/search-service.js';

export interface GeoSearchUIConfig {
  inputId: string;
  resultsId: string;
  onResultSelect?: (result: GeoSearchResult) => void;
  onSearchStart?: () => void;
  onSearchEnd?: () => void;
  debounceMs?: number;
  minQueryLength?: number;
  maxResults?: number;
}

export class GeoSearchUI {
  private service: GeoSearchService;
  private config: GeoSearchUIConfig;
  private input: HTMLInputElement | null = null;
  private resultsContainer: HTMLElement | null = null;
  private debounceTimer: number | null = null;
  private currentResults: GeoSearchResult[] = [];
  private activeIndex: number = -1;
  private isSearching: boolean = false;

  constructor(config: GeoSearchUIConfig) {
    this.service = GeoSearchService.getInstance();
    this.config = {
      debounceMs: 300,
      minQueryLength: 2,
      maxResults: 7,
      ...config
    };
    this.init();
  }

  private init(): void {
    this.input = document.getElementById(this.config.inputId) as HTMLInputElement;
    this.resultsContainer = document.getElementById(this.config.resultsId) as HTMLElement;

    if (!this.input || !this.resultsContainer) {
      console.error('Не знайдено елементи для геопошуку');
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

  private async performSearch(query: string): Promise<void> {
    if (this.isSearching) return;

    this.isSearching = true;
    this.config.onSearchStart?.();

    try {
      // Спочатку шукаємо в межах Львова
      let results = await this.service.searchInLviv(query, this.config.maxResults);
      
      // Якщо результатів мало, шукаємо ширше
      if (results.length < 3) {
        const globalResults = await this.service.searchWithAutocomplete(query);
        // Об'єднуємо результати, уникаючи дублікатів
        const existingNames = new Set(results.map(r => r.display_name));
        const additionalResults = globalResults.filter(r => !existingNames.has(r.display_name));
        results = [...results, ...additionalResults].slice(0, this.config.maxResults);
      }

      this.currentResults = results;
      this.renderResults();
    } catch (error) {
      console.error('Помилка пошуку:', error);
      this.showError('Помилка пошуку. Спробуйте ще раз.');
    } finally {
      this.isSearching = false;
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

    this.currentResults.forEach((result, index) => {
      const item = this.createResultItem(result, index);
      this.resultsContainer!.appendChild(item);
    });

    this.showResults();
  }

  private createResultItem(result: GeoSearchResult, index: number): HTMLElement {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.dataset.index = index.toString();

    // Створюємо структуру результату
    const mainText = document.createElement('div');
    mainText.className = 'result-main-text';
    mainText.textContent = result.display_name;

    const details = document.createElement('div');
    details.className = 'result-details';
    
    const typeText = this.getTypeText(result.type);
    const locationText = this.getLocationText(result.address);
    
    details.innerHTML = `
      <span class="result-type">${typeText}</span>
      ${locationText ? `<span class="result-location">${locationText}</span>` : ''}
    `;

    item.appendChild(mainText);
    item.appendChild(details);

    // Обробник кліку
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.selectResult(index);
    });

    return item;
  }

  private getTypeText(type: string): string {
    const typeMap: Record<string, string> = {
      'city': 'Місто',
      'town': 'Містечко',
      'village': 'Село',
      'suburb': 'Район',
      'neighbourhood': 'Квартал',
      'street': 'Вулиця',
      'house': 'Будинок',
      'amenity': 'Об\'єкт',
      'shop': 'Магазин',
      'restaurant': 'Ресторан',
      'cafe': 'Кафе',
      'bar': 'Бар',
      'hotel': 'Готель',
      'bank': 'Банк',
      'pharmacy': 'Аптека',
      'hospital': 'Лікарня',
      'school': 'Школа',
      'university': 'Університет',
      'library': 'Бібліотека',
      'museum': 'Музей',
      'theatre': 'Театр',
      'cinema': 'Кінотеатр',
      'park': 'Парк',
      'place_of_worship': 'Храм',
      'bus_station': 'Автобусна зупинка',
      'train_station': 'Залізнична станція',
      'airport': 'Аеропорт'
    };

    return typeMap[type] || type;
  }

  private getLocationText(address?: any): string {
    if (!address) return '';

    const parts: string[] = [];
    if (address.city) parts.push(address.city);
    else if (address.town) parts.push(address.town);
    else if (address.village) parts.push(address.village);

    if (address.country) parts.push(address.country);

    return parts.join(', ');
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
    const items = this.resultsContainer?.querySelectorAll('.autocomplete-item');
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

    if (this.input) {
      this.input.value = result.display_name;
    }

    this.clearResults();
    this.config.onResultSelect?.(result);
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
    noResults.className = 'autocomplete-item no-results';
    noResults.textContent = 'Нічого не знайдено';
    this.resultsContainer.appendChild(noResults);
    this.showResults();
  }

  private showError(message: string): void {
    if (!this.resultsContainer) return;

    const error = document.createElement('div');
    error.className = 'autocomplete-item error';
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
  }

  public destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    // Видаляємо обробники подій
    this.input?.removeEventListener('input', this.handleInput);
    this.input?.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('click', this.handleOutsideClick);
  }
} 