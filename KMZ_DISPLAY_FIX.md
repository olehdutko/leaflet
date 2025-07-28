# Виправлення відображення об'єктів KMZ на карті

## Проблема
Об'єкти з KMZ файлів імпортувалися правильно (з метаданими), але не відображалися на карті.

## Рішення
Виправлено метод `addKmzLayer` в `KmzService` для правильного додавання об'єктів до карти.

### Основні зміни

#### 1. Додавання шарів до карти
- Додано `layerConfig.tileLayer.addTo(this.map)` - додає tile layer до карти
- Додано `layerConfig.featureGroup.addTo(this.map)` - додає feature group з об'єктами до карти

#### 2. Обробка подій для об'єктів
- Додано обробник подвійного кліку для редагування об'єктів
- Імпорт функції `showEditModal` динамічно для уникнення циклічних залежностей

#### 3. Застосування стилів
- Додано автоматичне застосування стилів до імпортованих об'єктів
- Використання `applyObjectProperties` для правильного відображення кольорів та стилів

### Код змін

```typescript
private addKmzLayer(layerConfig: KmzLayerConfig): void {
  // ... існуючий код ...
  
  // Додаємо шари до карти
  layerConfig.tileLayer.addTo(this.map);
  layerConfig.featureGroup.addTo(this.map);
  
  // ... існуючий код ...
}

// В processKmzLayer:
placemarks.forEach(placemark => {
  const geometry = this.parsePlacemarkGeometry(placemark, styles);
  if (geometry) {
    featureGroup.addLayer(geometry);
    
    // Додаємо обробник подвійного кліку для редагування
    if (geometry.on) {
      geometry.on('dblclick', () => {
        import('../ui.js').then(({ showEditModal }) => {
          showEditModal(geometry);
        });
      });
    }
    
    // Застосовуємо стилі до об'єкта
    if (geometry.properties) {
      import('../objects.js').then(({ applyObjectProperties }) => {
        applyObjectProperties(geometry, geometry.properties);
      });
    }
  }
});
```

### Результат

Тепер при імпорті KMZ файлів:
- ✅ Об'єкти відображаються на карті
- ✅ Правильно застосовуються стилі (кольори, товщина ліній)
- ✅ Працює подвійний клік для редагування
- ✅ Зберігаються метадані (імена, описи)
- ✅ Автоматичне центрування карти на імпортованих об'єктах

### Тестування

1. Відкрийте основний додаток або `test-kmz-import.html`
2. Імпортуйте KMZ файл
3. Перевірте, що об'єкти відображаються на карті
4. Спробуйте подвійний клік на об'єкті для редагування
5. Перевірте, що стилі застосовані правильно 