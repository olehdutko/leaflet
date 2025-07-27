// Ініціалізація пошукових функцій
import { GeoSearchUI } from './ui/geo-search-ui.js';
import { ObjectSearchUI } from './ui/object-search-ui.js';
import { GeoSearchService } from './services/search-service.js';
import { ObjectSearchService } from './services/object-search-service.js';

declare const L: any; // Leaflet global
declare const map: any; // Map instance

let geoSearchUI: GeoSearchUI | null = null;
let objectSearchUI: ObjectSearchUI | null = null;
let searchMarker: any = null;

export function initializeSearch(customLayers: any[]): void {
  initializeGeoSearch();
  initializeObjectSearch(customLayers);
  centerGeoSearchBar();
}

function initializeGeoSearch(): void {
  try {
    geoSearchUI = new GeoSearchUI({
      inputId: 'geosearch-input',
      resultsId: 'geosearch-autocomplete',
      onResultSelect: handleGeoSearchResult,
      onSearchStart: () => {
        // Можна додати індикатор завантаження
      },
      onSearchEnd: () => {
        // Приховуємо індикатор завантаження
      },
      debounceMs: 300,
      minQueryLength: 2,
      maxResults: 7
    });
  } catch (error) {
    console.error('Помилка ініціалізації геопошуку:', error);
  }
}

function initializeObjectSearch(customLayers: any[]): void {
  try {
    // Оновлюємо шари в сервісі
    const objectSearchService = ObjectSearchService.getInstance();
    objectSearchService.setCustomLayers(customLayers);

    objectSearchUI = new ObjectSearchUI({
      inputId: 'global-object-search',
      resultsId: 'global-object-search-results',
      onResultSelect: handleObjectSearchResult,
      onSearchStart: () => {
        // Можна додати індикатор завантаження
      },
      onSearchEnd: () => {
        // Приховуємо індикатор завантаження
      },
      debounceMs: 250,
      minQueryLength: 2,
      maxResults: 15,
      highlightDuration: 3000
    });
  } catch (error) {
    console.error('Помилка ініціалізації пошуку об\'єктів:', error);
  }
}

function handleGeoSearchResult(result: any): void {
  if (!map || !result.lat || !result.lon) return;

  // Переміщуємо карту до результату
  map.setView([parseFloat(result.lat), parseFloat(result.lon)], 16, { animate: true });

  // Видаляємо попередній маркер пошуку
  if (searchMarker) {
    map.removeLayer(searchMarker);
    searchMarker = null;
  }

  // Створюємо новий маркер пошуку
  searchMarker = L.marker([parseFloat(result.lat), parseFloat(result.lon)], {
    icon: L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      shadowSize: [41, 41]
    })
  }).addTo(map);

  // Додаємо обробник подвійного кліку та тултіпів
  import('./ui.js').then(({ addDoubleClickToLayer }) => {
    addDoubleClickToLayer(searchMarker);
  });

  // Відкриваємо попап з назвою
  searchMarker.bindPopup(result.display_name).openPopup();
}

function handleObjectSearchResult(object: any): void {
  // Обробка вибору об'єкта вже реалізована в ObjectSearchUI
  // Тут можна додати додаткову логіку, якщо потрібно
}

export function centerGeoSearchBar(): void {
  const bar = document.getElementById('geosearch-bar');
  const mapDiv = document.getElementById('map');
  if (!bar || !mapDiv) return;
  
  const mapRect = mapDiv.getBoundingClientRect();
  // Центр мапи
  const centerX = mapRect.left + mapRect.width / 2;
  (bar as HTMLElement).style.left = centerX + 'px';
  (bar as HTMLElement).style.transform = 'translateX(-50%)';
}

export function updateObjectSearchLayers(customLayers: any[]): void {
  if (objectSearchUI) {
    objectSearchUI.updateLayers(customLayers);
  }
}

export function destroySearch(): void {
  if (geoSearchUI) {
    geoSearchUI.destroy();
    geoSearchUI = null;
  }
  if (objectSearchUI) {
    objectSearchUI.destroy();
    objectSearchUI = null;
  }
  if (searchMarker) {
    map?.removeLayer(searchMarker);
    searchMarker = null;
  }
}

// Додаємо обробник зміни розміру вікна
window.addEventListener('resize', centerGeoSearchBar); 