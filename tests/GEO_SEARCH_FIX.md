# Виправлення помилки геопошуку

## Проблема
При кліку на результат пошуку по геоназві виникала помилка:
```
Uncaught TypeError: map.setView is not a function
```

## Причина
Карта не була доступна в контексті виклику функції `handleGeoSearchResult`. Змінна `map` була оголошена як глобальна через `declare const map: any`, але не імпортувалася з `map-init.ts`.

## Рішення

### 1. Правильний імпорт карти
Додано імпорт карти з `map-init.ts`:
```typescript
import { map } from './map-init.js';
```

### 2. Покращена обробка помилок
Додано перевірки доступності карти та її методів:
```typescript
function handleGeoSearchResult(result: any): void {
  // Отримуємо карту з глобальної області або з імпорту
  const mapInstance = (window as any).map || map;
  
  if (!mapInstance || !result.lat || !result.lon) {
    console.error('Карта не доступна або відсутні координати:', { map: !!mapInstance, lat: result.lat, lon: result.lon });
    return;
  }

  // Перевіряємо, чи є метод setView
  if (typeof mapInstance.setView !== 'function') {
    console.error('Метод setView не доступний на об\'єкті карти');
    return;
  }

  // Переміщуємо карту до результату
  mapInstance.setView([parseFloat(result.lat), parseFloat(result.lon)], 16, { animate: true });
  // ...
}
```

### 3. Експорт карти в глобальну область
Додано експорт карти в `window.map` для зворотної сумісності:

**map-init.ts:**
```typescript
// Експортуємо карту в глобальну область для зворотної сумісності
(window as any).map = map;
```

**ui.ts:**
```typescript
// Експортуємо карту в глобальну область для зворотної сумісності
(window as any).map = map;
```

### 4. Оновлена функція destroySearch
Додано безпечне видалення маркера пошуку:
```typescript
export function destroySearch(): void {
  // ...
  if (searchMarker) {
    const mapInstance = (window as any).map || map;
    if (mapInstance && typeof mapInstance.removeLayer === 'function') {
      mapInstance.removeLayer(searchMarker);
    }
    searchMarker = null;
  }
}
```

## Результат

Тепер геопошук працює коректно:
- ✅ Клік на результат пошуку переміщує карту до вибраного місця
- ✅ Додається маркер з попапом з назвою місця
- ✅ Правильна обробка помилок з інформативними повідомленнями
- ✅ Зворотна сумісність з кодом, що використовує `window.map`

## Тестування

1. Відкрийте додаток
2. Введіть назву місця в поле геопошуку
3. Виберіть результат зі списку
4. Перевірте, що карта перемістилася до вибраного місця
5. Перевірте, що з'явився маркер з попапом 