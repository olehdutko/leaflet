# 🔍 **Інструкції для діагностики проблеми з overlay**

## 📋 **Крок за кроком тестування**

### **Крок 1: Запуск додатку**
1. Відкрийте термінал у папці `/Users/013116/projects/leaflet`
2. Запустіть сервер: `python3 -m http.server 8000`
3. Відкрийте браузер: `http://localhost:8000`
4. **ВАЖЛИВО:** Одразу відкрийте Developer Tools (F12) → Console

### **Крок 2: Перевірка завантаження**
У консолі повинні з'явитися логи:
```
🔧 Завантажуємо покращений механізм збереження позицій overlay v2.8
✅ Overlay position fix v2.8 завантажено
🔍 Запуск швидкої діагностики...
=== ШВИДКА ДІАГНОСТИКА OVERLAY ===
📋 Стан компонентів:
   window.overlayPositionFix: object
   window.saveLayersToStorage: function
   window.customLayers: X шарів
```

### **Крок 3: Якщо є помилки**
Якщо замість `object` і `function` ви бачите `undefined`, це означає:
- ❌ Файли не завантажилися
- ❌ Є JavaScript помилки

**Рішення:**
```javascript
// Виконайте в консолі:
quickDebug()
```

### **Крок 4: Створення тестового overlay**
1. Створіть новий шар (кнопка "Додати шар")
2. Натисніть кнопку "галерея" на цьому шарі
3. Виберіть будь-яке зображення з комп'ютера
4. Дочекайтеся логів у консолі:
```
🆕 Додаємо новий overlay через галерею
🔧 Використовуємо покращений edit handler v2.8
✅ Edit обробник підключено з затримкою
```

### **Крок 5: Тест збереження позицій**
1. **НЕ ЧЕКАЙТЕ** - одразу після появи зображення почніть його переміщувати
2. У консолі повинні з'явитися логи:
```
🔧 Edit подія #1 для data:image/png... (перша: true)  
🔧 Збереження запитано: edit#1 (priority: true)
🔧 Виконуємо збереження: edit#1
✅ Пріоритетне збереження: координати знайдено в localStorage
```

### **Крок 6: Перевірка збереження**
1. Запам'ятайте позицію зображення
2. Перевантажте сторінку (F5)
3. Зображення повинно з'явитися в тій самій позиції

## 🚨 **Типові проблеми та рішення**

### **1. Файли не завантажуються**
**Симптоми:** `window.overlayPositionFix: undefined`
**Рішення:**
```bash
# Перевірте чи файли існують
ls -la overlay-position-fix.js quick-debug.js test-overlay-position.js

# Перевірте syntax
node -c overlay-position-fix.js
node -c quick-debug.js
node -c test-overlay-position.js
```

### **2. Edit handlers не працюють**
**Симптоми:** Немає логів при переміщенні overlay
**Рішення:**
```javascript
// У консолі браузера:
overlayPositionFix.checkState()
overlayPositionFix.rebindHandlers()
```

### **3. Збереження не відбувається**
**Симптоми:** Логи edit подій є, але координати не зберігаються
**Рішення:**
```javascript
// Увімкнути детальне логування:
overlayPositionFix.enableDebug()

// Перевірити localStorage:
const stored = localStorage.getItem('lefleat_layers')
console.log(JSON.parse(stored))
```

### **4. Старий код виконується**
**Симптоми:** Логи показують "використовуємо fallback"
**Рішення:**
```javascript
// Перевірити порядок завантаження скриптів
console.log('overlay-position-fix завантажений:', !!window.overlayPositionFix)
console.log('Функція createEditHandler:', !!window.overlayPositionFix?.createEditHandler)
```

## 🧪 **Додаткові команди для діагностики**

```javascript
// Швидка діагностика
quickDebug()

// Тест збереження позицій
testPositionSaving()

// Детальне логування
overlayPositionFix.enableDebug()

// Стан системи
overlayPositionFix.checkState()

// Переприв'язка handlers
overlayPositionFix.rebindHandlers()

// Перевірка localStorage
debugOverlay.localStorage()

// Автоматичне відстеження змін
debugOverlay.autoTrack(30)
```

## 📝 **Що надіслати якщо не працює**

Скопіюйте і надішліть результати цих команд:

```javascript
// 1. Основна діагностика
quickDebug()

// 2. Перевірка завантаження
console.log({
  overlayPositionFix: !!window.overlayPositionFix,
  saveLayersToStorage: !!window.saveLayersToStorage,
  customLayers: window.customLayers?.length,
  debugOverlay: !!window.debugOverlay
})

// 3. Помилки в консолі
// Скопіюйте всі червоні повідомлення про помилки

// 4. Лог Network в Developer Tools
// Подивіться чи всі .js файли завантажуються успішно (статус 200)
```

## 🎯 **Очікувані результати при правильній роботі**

```
🔧 Завантажуємо покращений механізм збереження позицій overlay v2.8
✅ Overlay position fix v2.8 завантажено
🔍 Запуск швидкої діагностики...
=== ШВИДКА ДІАГНОСТИКА OVERLAY ===
📋 Стан компонентів:
   window.overlayPositionFix: object
   window.saveLayersToStorage: function
   window.customLayers: 1 шарів
   window.debugOverlay: object
   window.testOverlayPositions: function
📊 Всього overlay: 1, з edit handlers: 1
💾 localStorage: 1 шарів, 1 overlay
✅ Діагностика завершена

--- При додаванні зображення ---
🆕 Додаємо новий overlay через галерею
🔧 Використовуємо покращений edit handler v2.8
✅ Edit обробник підключено з затримкою

--- При переміщенні ---
🔧 Edit подія #1 для data:image/png... (перша: true)
🔧 Збереження запитано: edit#1 (priority: true)
🔧 Виконуємо збереження: edit#1
🔧 Збереження завершено: 1 → 1 шарів
✅ Пріоритетне збереження: координати знайдено в localStorage
```

**Якщо ви бачите ці логи - система працює правильно! 🎉** 