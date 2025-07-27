// GeoSearchManager.ts - Управління геопошуком
import { mapManager } from './MapManager.js';
import { uiManager } from './UIManager.js';

export interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

export class GeoSearchManager {
  private static instance: GeoSearchManager;
  private searchTimeout: number | null = null;
  private currentResults: SearchResult[] = [];
  private currentFocus = -1;
  private searchMarker: any = null;
  
  private constructor() {}
  
  static getInstance(): GeoSearchManager {
    if (!GeoSearchManager.instance) {
      GeoSearchManager.instance = new GeoSearchManager();
    }
    return GeoSearchManager.instance;
  }
  
  // Ініціалізація геопошуку
  init(): void {
    this.setupSearchBar();
    this.centerSearchBar();
    this.setupEventListeners();
  }
  
  // Налаштування пошукового рядка
  private setupSearchBar(): void {
    const searchBar = uiManager.getElement<HTMLElement>('geosearch-bar');
    if (!searchBar) return;
    
    const input = uiManager.createElement<HTMLInputElement>('input');
    input.type = 'text';
    input.placeholder = 'Пошук місць...';
    input.className = 'geosearch-input';
    
    const resultsList = uiManager.createElement<HTMLElement>('div');
    resultsList.className = 'geosearch-results';
    
    searchBar.appendChild(input);
    searchBar.appendChild(resultsList);
    
    // Зберігаємо посилання для подальшого використання
    (searchBar as any).input = input;
    (searchBar as any).resultsList = resultsList;
  }
  
  // Центрування пошукового рядка
  centerSearchBar(): void {
    const searchBar = uiManager.getElement<HTMLElement>('geosearch-bar');
    const mapDiv = uiManager.getElement<HTMLElement>('map');
    
    if (!searchBar || !mapDiv) return;
    
    const mapRect = mapDiv.getBoundingClientRect();
    const centerX = mapRect.left + mapRect.width / 2;
    
    searchBar.style.left = centerX + 'px';
    searchBar.style.transform = 'translateX(-50%)';
  }
  
  // Налаштування обробників подій
  private setupEventListeners(): void {
    const searchBar = uiManager.getElement<HTMLElement>('geosearch-bar');
    if (!searchBar) return;
    
    const input = (searchBar as any).input;
    const resultsList = (searchBar as any).resultsList;
    
    if (!input || !resultsList) return;
    
    // Обробка введення
    input.addEventListener('input', () => {
      this.handleInput(input.value);
    });
    
    // Обробка клавіатури
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      this.handleKeydown(e, resultsList);
    });
    
    // Обробка фокусу
    input.addEventListener('focus', () => {
      this.handleInput(input.value);
    });
    
    // Обробка кліків поза пошуковим рядком
    document.addEventListener('click', (e: Event) => {
      if (!searchBar.contains(e.target as Node)) {
        this.hideResults(resultsList);
      }
    });
    
    // Обробка зміни розміру вікна
    window.addEventListener('resize', () => {
      this.centerSearchBar();
    });
  }
  
  // Обробка введення
  private handleInput(query: string): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    if (query.length < 3) {
      this.hideResults();
      return;
    }
    
    this.searchTimeout = setTimeout(() => {
      this.performSearch(query);
    }, 300);
  }
  
  // Виконання пошуку
  private async performSearch(query: string): Promise<void> {
    try {
      const results = await this.searchPlaces(query);
      this.displayResults(results);
    } catch (error) {
      console.error('Search error:', error);
      this.hideResults();
    }
  }
  
  // Пошук місць через API
  private async searchPlaces(query: string): Promise<SearchResult[]> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ua&addressdetails=1`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.map((item: any) => ({
      display_name: item.display_name,
      lat: item.lat,
      lon: item.lon,
      type: item.type,
      importance: item.importance
    }));
  }
  
  // Відображення результатів
  private displayResults(results: SearchResult[]): void {
    const searchBar = uiManager.getElement<HTMLElement>('geosearch-bar');
    if (!searchBar) return;
    
    const resultsList = (searchBar as any).resultsList;
    if (!resultsList) return;
    
    this.currentResults = results;
    this.currentFocus = -1;
    
    if (results.length === 0) {
      this.hideResults(resultsList);
      return;
    }
    
    resultsList.innerHTML = '';
    resultsList.classList.add('active');
    
    results.forEach((result, index) => {
      const item = uiManager.createElement<HTMLElement>('div');
      item.className = 'geosearch-item';
      item.textContent = result.display_name;
      
      item.addEventListener('click', () => {
        this.selectResult(index);
      });
      
      item.addEventListener('mouseenter', () => {
        this.currentFocus = index;
        this.updateActive(resultsList);
      });
      
      resultsList.appendChild(item);
    });
  }
  
  // Приховування результатів
  private hideResults(resultsList?: HTMLElement): void {
    if (!resultsList) {
      const searchBar = uiManager.getElement<HTMLElement>('geosearch-bar');
      if (searchBar) {
        resultsList = (searchBar as any).resultsList;
      }
    }
    
    if (resultsList) {
      resultsList.classList.remove('active');
      resultsList.innerHTML = '';
    }
    
    this.currentResults = [];
    this.currentFocus = -1;
  }
  
  // Обробка натискань клавіш
  private handleKeydown(e: KeyboardEvent, resultsList: HTMLElement): void {
    const items = resultsList.querySelectorAll('.geosearch-item');
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.currentFocus++;
        if (this.currentFocus >= items.length) {
          this.currentFocus = 0;
        }
        this.updateActive(resultsList);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.currentFocus--;
        if (this.currentFocus < 0) {
          this.currentFocus = items.length - 1;
        }
        this.updateActive(resultsList);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (this.currentFocus >= 0 && this.currentFocus < this.currentResults.length) {
          this.selectResult(this.currentFocus);
        }
        break;
        
      case 'Escape':
        this.hideResults(resultsList);
        break;
    }
  }
  
  // Оновлення активного елемента
  private updateActive(resultsList: HTMLElement): void {
    const items = resultsList.querySelectorAll('.geosearch-item');
    items.forEach((item, index) => {
      item.classList.toggle('active', index === this.currentFocus);
    });
  }
  
  // Вибір результату
  private selectResult(index: number): void {
    const result = this.currentResults[index];
    if (!result) return;
    
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    if (isNaN(lat) || isNaN(lng)) {
      console.error('Invalid coordinates:', result);
      return;
    }
    
    // Центруємо карту на вибраному місці
    mapManager.setCenter(lat, lng);
    
    // Створюємо маркер
    this.createSearchMarker(lat, lng, result);
    
    // Приховуємо результати
    this.hideResults();
    
    // Очищуємо поле введення
    const searchBar = uiManager.getElement<HTMLElement>('geosearch-bar');
    if (searchBar) {
      const input = (searchBar as any).input;
      if (input) {
        input.value = '';
      }
    }
  }
  
  // Створення маркера пошуку
  private createSearchMarker(lat: number, lng: number, result: SearchResult): void {
    // Видаляємо попередній маркер якщо є
    if (this.searchMarker) {
      mapManager.removeLayer(this.searchMarker);
    }
    
    // Створюємо новий маркер
    this.searchMarker = (window as any).L.marker([lat, lng], {
      icon: (window as any).L.divIcon({
        className: 'search-marker-icon',
        html: '<div style="background:#ff4444;width:20px;height:20px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    });
    
    mapManager.addLayer(this.searchMarker);
    
    // Додаємо popup
    this.searchMarker.bindPopup(result.display_name).openPopup();
    
    // Додаємо обробник подвійного кліку для редагування
    this.searchMarker.on('dblclick', () => {
      // Тут можна додати логіку для редагування маркера
      console.log('Double click on search marker');
    });
  }
  
  // Отримання поточного маркера пошуку
  getSearchMarker(): any {
    return this.searchMarker;
  }
  
  // Видалення маркера пошуку
  removeSearchMarker(): void {
    if (this.searchMarker) {
      mapManager.removeLayer(this.searchMarker);
      this.searchMarker = null;
    }
  }
  
  // Очищення ресурсів
  destroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    
    this.removeSearchMarker();
    this.hideResults();
  }
}

export const geoSearchManager = GeoSearchManager.getInstance(); 