# Документація компонентів пошуку

## Огляд

Система пошуку в lefleat складається з двох основних компонентів:

1. **Геопошук** - пошук географічних об'єктів через OpenStreetMap Nominatim API
2. **Глобальний пошук об'єктів** - пошук по об'єктах, створених користувачем на карті

## Архітектура

### Принципи SOLID

- **Single Responsibility**: Кожен сервіс відповідає за одну функціональність
- **Open/Closed**: Легко розширювати без зміни існуючого коду
- **Liskov Substitution**: Інтерфейси дозволяють заміну реалізацій
- **Interface Segregation**: Розділені інтерфейси для різних типів пошуку
- **Dependency Inversion**: Залежності через абстракції

### Модульна структура

```
services/
├── search-service.ts          # Геопошук через Nominatim API
└── object-search-service.ts   # Пошук по об'єктах карти

ui/
├── geo-search-ui.ts           # UI компонент геопошуку
└── object-search-ui.ts        # UI компонент пошуку об'єктів

search-init.ts                 # Головний менеджер пошуку
```

## Компоненти

### 1. GeoSearchService

**Призначення**: Пошук географічних об'єктів через OpenStreetMap Nominatim API

**Основні методи**:
- `search(options)` - загальний пошук
- `searchInLviv(query, limit)` - пошук в межах Львова
- `searchWithAutocomplete(query)` - пошук з автодоповненням

**Приклад використання**:
```typescript
const geoService = GeoSearchService.getInstance();
const results = await geoService.searchInLviv('Площа Ринок', 5);
```

### 2. ObjectSearchService

**Призначення**: Пошук по об'єктах, створених користувачем

**Основні методи**:
- `search(options)` - пошук з фільтрами
- `quickSearch(query, maxResults)` - швидкий пошук
- `searchByType(type, maxResults)` - пошук по типу об'єкта

**Підтримувані типи об'єктів**:
- `marker` - маркери
- `polyline` - лінії
- `polygon` - полігони
- `image` - зображення

### 3. GeoSearchUI

**Призначення**: UI компонент для геопошуку

**Особливості**:
- Автодоповнення з debounce
- Навігація клавішами (стрілки, Enter, Escape)
- Групування результатів за типами
- Локалізація типів об'єктів

**Конфігурація**:
```typescript
const geoSearchUI = new GeoSearchUI({
  inputId: 'geosearch-input',
  resultsId: 'geosearch-autocomplete',
  debounceMs: 300,
  minQueryLength: 2,
  maxResults: 7,
  onResultSelect: (result) => {
    // Обробка вибору результату
  }
});
```

### 4. ObjectSearchUI

**Призначення**: UI компонент для пошуку об'єктів

**Особливості**:
- Групування результатів за типами
- Виділення знайдених об'єктів на карті
- Показ релевантності результатів
- Автоматичне центрування на об'єкті

**Конфігурація**:
```typescript
const objectSearchUI = new ObjectSearchUI({
  inputId: 'global-object-search',
  resultsId: 'global-object-search-results',
  debounceMs: 250,
  minQueryLength: 2,
  maxResults: 15,
  highlightDuration: 3000,
  onResultSelect: (object) => {
    // Обробка вибору об'єкта
  }
});
```

### 5. SearchManager

**Призначення**: Головний менеджер, що координує всі компоненти пошуку

**Основні методи**:
- `init(config)` - ініціалізація пошуку
- `updateLayers(layers)` - оновлення списку шарів
- `clearAllSearches()` - очищення всіх пошуків
- `focusGeoSearch()` / `focusObjectSearch()` - фокус на полях пошуку

## Інтеграція

### Ініціалізація

```typescript
// В main.ts
import { searchManager } from './search-init.js';

searchManager.init({
  geoSearch: {
    enabled: true,
    debounceMs: 300,
    minQueryLength: 2,
    maxResults: 7
  },
  objectSearch: {
    enabled: true,
    debounceMs: 250,
    minQueryLength: 2,
    maxResults: 15,
    highlightDuration: 3000
  }
});
```

### Оновлення шарів

```typescript
// При додаванні/видаленні/зміні шарів
searchManager.updateLayers(customLayers);
```

### Програмний доступ

```typescript
// Пошук геолокації
const geoResults = await searchManager.searchGeoLocation('Львів');

// Пошук об'єктів
const objectResults = searchManager.searchObjects('парк');

// Фокус на полях пошуку
searchManager.focusGeoSearch();
searchManager.focusObjectSearch();
```

## Стилізація

### CSS класи

**Геопошук**:
- `#geosearch-bar` - контейнер геопошуку
- `#geosearch-input` - поле введення
- `#geosearch-autocomplete` - список результатів
- `.autocomplete-item` - елемент результату
- `.result-main-text` - основний текст
- `.result-details` - деталі результату
- `.result-type` - тип об'єкта
- `.result-location` - локація

**Пошук об'єктів**:
- `#global-object-search-wrap` - контейнер пошуку
- `#global-object-search` - поле введення
- `#global-object-search-results` - список результатів
- `.search-result-group` - група результатів
- `.search-result-group-header` - заголовок групи
- `.global-object-search-item` - елемент результату
- `.result-name` - назва об'єкта
- `.result-layer` - назва шару
- `.result-description` - опис
- `.result-relevance` - релевантність

**Виділення на карті**:
- `.global-object-search-highlight` - виділення об'єкта
- `.highlight-marker-icon` - виділення маркера

## Особливості реалізації

### Дебаунсинг

Всі пошуки використовують дебаунсинг для оптимізації продуктивності:
- Геопошук: 300ms
- Пошук об'єктів: 250ms

### Кешування

Результати геопошуку кешуються в пам'яті протягом сесії.

### Обробка помилок

Всі компоненти мають вбудовану обробку помилок з інформативними повідомленнями.

### Адаптивність

UI компоненти адаптивні та працюють на мобільних пристроях.

## Розширення

### Додавання нових типів пошуку

1. Створіть новий сервіс, що наслідує базовий інтерфейс
2. Додайте UI компонент
3. Інтегруйте в SearchManager

### Додавання нових фільтрів

```typescript
// В ObjectSearchOptions
interface ObjectSearchOptions {
  // ... існуючі поля
  customFilter?: (object: SearchableObject) => boolean;
}
```

### Кастомізація стилів

Додайте CSS правила для нових класів або перевизначте існуючі.

## Відлагодження

### Глобальні об'єкти

```javascript
// В консолі браузера
window.searchManager // Доступ до менеджера пошуку
window.OVERLAY_FIX_VERSION // Версія виправлень
```

### Логування

Всі компоненти мають детальне логування для відлагодження.

### Тестування

Створіть тестові файли для перевірки функціональності пошуку. 