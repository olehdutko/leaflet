import { BaseService } from '../base/BaseService';
import { Logger } from '../utils/Logger';
import * as L from 'leaflet';

export interface GeoSearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

export interface GeoSearchConfig {
  apiUrl: string;
  limit: number;
  language: string;
  debounceTime: number;
}

export class GeoSearchManager extends BaseService {
  protected logger: Logger;
  private config: GeoSearchConfig;
  private searchTimer: number | null = null;
  private results: GeoSearchResult[] = [];
  private activeIndex: number = -1;
  private _isInitialized: boolean = false;

  constructor() {
    super('GeoSearchManager');
    this.logger = new Logger('GeoSearchManager');
    
    this.config = {
      apiUrl: 'https://nominatim.openstreetmap.org/search',
      limit: 7,
      language: 'uk',
      debounceTime: 250
    };
  }

  /**
   * Ініціалізація сервісу
   */
  protected onInit(): void {
    this.logger.info('GeoSearchManager ініціалізований');
  }

  /**
   * Знищення сервісу
   */
  protected onDestroy(): void {
    this.logger.info('GeoSearchManager знищений');
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  /**
   * Ініціалізація геопошуку
   */
  public initialize(): void {
    if (this._isInitialized) {
      this.logger.warn('GeoSearchManager вже ініціалізований');
      return;
    }

    try {
      this.setupSearchInput();
      this.setupKeyboardNavigation();
      this.setupClickOutside();
      this.centerSearchBar();
      
      this._isInitialized = true;
      this.logger.info('GeoSearchManager успішно ініціалізований');

    } catch (error) {
      this.logger.error('Помилка ініціалізації GeoSearchManager:', error);
    }
  }

  /**
   * Налаштування поля пошуку
   */
  private setupSearchInput(): void {
    const input = document.getElementById('geosearch-input') as HTMLInputElement | null;
    const list = document.getElementById('geosearch-autocomplete') as HTMLElement | null;
    
    if (!input || !list) {
      this.logger.error('Не знайдено елементи геопошуку');
      return;
    }

    input.addEventListener('input', () => {
      this.handleSearchInput(input, list);
    });
  }

  /**
   * Обробка введення в поле пошуку
   */
  private handleSearchInput(input: HTMLInputElement, list: HTMLElement): void {
    const query = input.value.trim();
    
    // Очистити попередні результати
    list.innerHTML = '';
    list.classList.remove('active');
    this.activeIndex = -1;
    
    if (!query) {
      return;
    }

    // Скасувати попередній таймер
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    // Встановити новий таймер для debounce
    this.searchTimer = window.setTimeout(() => {
      this.performSearch(query, list);
    }, this.config.debounceTime);
  }

  /**
   * Виконання пошуку
   */
  private async performSearch(query: string, list: HTMLElement): Promise<void> {
    try {
      this.logger.debug('Виконуємо пошук:', query);

      const url = new URL(this.config.apiUrl);
      url.searchParams.set('format', 'json');
      url.searchParams.set('q', query);
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('limit', this.config.limit.toString());
      url.searchParams.set('accept-language', this.config.language);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GeoSearchResult[] = await response.json();
      this.results = data;

      if (!this.results.length) {
        this.logger.debug('Результатів пошуку не знайдено');
        return;
      }

      this.displayResults(list);

    } catch (error) {
      this.logger.error('Помилка виконання пошуку:', error);
      this.showSearchError(list);
    }
  }

  /**
   * Відображення результатів пошуку
   */
  private displayResults(list: HTMLElement): void {
    list.innerHTML = '';
    
    this.results.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'autocomplete-item';
      div.textContent = item.display_name;
      
      div.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        this.selectResult(index);
      });
      
      list.appendChild(div);
    });
    
    list.classList.add('active');
    this.logger.debug(`Відображено ${this.results.length} результатів пошуку`);
  }

  /**
   * Показ помилки пошуку
   */
  private showSearchError(list: HTMLElement): void {
    list.innerHTML = '<div class="autocomplete-error">Помилка пошуку</div>';
    list.classList.add('active');
  }

  /**
   * Налаштування навігації з клавіатури
   */
  private setupKeyboardNavigation(): void {
    const input = document.getElementById('geosearch-input') as HTMLInputElement | null;
    const list = document.getElementById('geosearch-autocomplete') as HTMLElement | null;
    
    if (!input || !list) return;

    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.results.length) return;

      switch (e.key) {
        case 'ArrowDown':
          this.activeIndex = Math.min(this.activeIndex + 1, this.results.length - 1);
          this.updateActiveItem(list);
          e.preventDefault();
          break;

        case 'ArrowUp':
          this.activeIndex = Math.max(this.activeIndex - 1, 0);
          this.updateActiveItem(list);
          e.preventDefault();
          break;

        case 'Enter':
          if (this.activeIndex >= 0) {
            this.selectResult(this.activeIndex);
            e.preventDefault();
          }
          break;

        case 'Escape':
          list.classList.remove('active');
          this.activeIndex = -1;
          e.preventDefault();
          break;
      }
    });
  }

  /**
   * Оновлення активного елемента
   */
  private updateActiveItem(list: HTMLElement): void {
    Array.from(list.children).forEach((el, index) => {
      if (index === this.activeIndex) {
        (el as HTMLElement).classList.add('active');
      } else {
        (el as HTMLElement).classList.remove('active');
      }
    });
  }

  /**
   * Налаштування закриття при кліку поза пошуком
   */
  private setupClickOutside(): void {
    const input = document.getElementById('geosearch-input') as HTMLInputElement | null;
    const list = document.getElementById('geosearch-autocomplete') as HTMLElement | null;
    
    if (!input || !list) return;

    document.addEventListener('click', (e: MouseEvent) => {
      if (!input.contains(e.target as Node) && !list.contains(e.target as Node)) {
        list.classList.remove('active');
        this.activeIndex = -1;
      }
    });
  }

  /**
   * Вибір результату пошуку
   */
  private selectResult(index: number): void {
    const item = this.results[index];
    if (!item) return;

    const input = document.getElementById('geosearch-input') as HTMLInputElement | null;
    const list = document.getElementById('geosearch-autocomplete') as HTMLElement | null;
    
    if (input && list) {
      input.value = item.display_name;
      list.classList.remove('active');
    }

    this.navigateToLocation(item);
    this.logger.info('Вибрано локацію:', item.display_name);
  }

  /**
   * Навігація до локації
   */
  private async navigateToLocation(item: GeoSearchResult): Promise<void> {
    try {
      const map = (window as any).map;
      if (!map || !item.lat || !item.lon) {
        this.logger.error('Карта недоступна або відсутні координати');
        return;
      }

      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      // Перемістити карту
      map.setView([lat, lon], 16, { animate: true });

      // Видалити попередній маркер пошуку
      if ((window as any).searchMarker) {
        map.removeLayer((window as any).searchMarker);
        (window as any).searchMarker = null;
      }

      // Створити новий маркер
      (window as any).searchMarker = L.marker([lat, lon], {
        icon: L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
          shadowSize: [41, 41]
        })
      }).addTo(map);

      // Додати обробник подвійного кліку
      try {
        const { addDoubleClickToLayer } = await import('../../ui.js');
        addDoubleClickToLayer((window as any).searchMarker);
      } catch (error) {
        this.logger.warn('Не вдалося додати обробник подвійного кліку:', error);
      }

      // Показати popup
      (window as any).searchMarker.bindPopup(item.display_name).openPopup();

    } catch (error) {
      this.logger.error('Помилка навігації до локації:', error);
    }
  }

  /**
   * Центрування панелі пошуку
   */
  public centerSearchBar(): void {
    const bar = document.getElementById('geosearch-bar');
    const mapDiv = document.getElementById('map');
    
    if (!bar || !mapDiv) {
      this.logger.warn('Не знайдено елементи для центрування пошуку');
      return;
    }

    const mapRect = mapDiv.getBoundingClientRect();
    const centerX = mapRect.left + mapRect.width / 2;
    
    (bar as HTMLElement).style.left = centerX + 'px';
    (bar as HTMLElement).style.transform = 'translateX(-50%)';
  }

  /**
   * Отримання поточної конфігурації
   */
  public getConfig(): GeoSearchConfig {
    return { ...this.config };
  }

  /**
   * Встановлення конфігурації
   */
  public setConfig(config: Partial<GeoSearchConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Конфігурація оновлена:', this.config);
  }

  /**
   * Очищення результатів пошуку
   */
  public clearResults(): void {
    this.results = [];
    this.activeIndex = -1;
    
    const list = document.getElementById('geosearch-autocomplete') as HTMLElement | null;
    if (list) {
      list.innerHTML = '';
      list.classList.remove('active');
    }
  }

  /**
   * Отримання останніх результатів
   */
  public getLastResults(): GeoSearchResult[] {
    return [...this.results];
  }

  /**
   * Перевірка чи ініціалізований сервіс
   */
  public isServiceInitialized(): boolean {
    return this._isInitialized;
  }
} 