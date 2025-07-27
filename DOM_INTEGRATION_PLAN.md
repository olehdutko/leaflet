# План інтеграції DOM утиліт

## 🎯 Мета
Поступово замінити прямі DOM операції на безпечні утиліти з `utils/dom-utils.ts` через `LegacyAdapter`.

## 📊 Аналіз існуючого коду

### Знайдені прямі DOM операції:

#### 1. `document.getElementById` (найчастіше використовується)
- **ui.ts**: ~40 використань
- **main.ts**: ~25 використань
- **layers.ts**: ~5 використань

#### 2. `.textContent =` (встановлення тексту)
- **ui.ts**: ~15 використань
- **main.ts**: ~10 використань
- **utils.ts**: ~1 використання

#### 3. `.value =` (встановлення значення input)
- **ui.ts**: ~15 використань
- **main.ts**: ~8 використань
- **layers.ts**: ~1 використання

## 🚀 План поступової інтеграції

### Етап 1: Підготовка (Готово ✅)
- [x] Створено `utils/dom-utils.ts`
- [x] Створено `adapters/legacy-adapter.ts`
- [x] Протестовано функціональність

### Етап 2: Імпорт LegacyAdapter ✅ ЗАВЕРШЕНО
- [x] Додати імпорт LegacyAdapter в основні файли
- [x] Створити глобальні змінні для зручності

### Етап 3: Поступова заміна (по файлах) ✅ ЧАСТКОВО ЗАВЕРШЕНО

#### Файл 1: `ui.ts` (найбільше використань) ✅ ЗАВЕРШЕНО
**Пріоритет: Високий**

Замінено:
```typescript
// Старий код
const modalTitle = document.getElementById('modal-title');
modalTitle.textContent = 'Текст';

// Новий код
const modalTitle = LegacyAdapter.DOM.getElement('modal-title');
LegacyAdapter.DOM.setText('modal-title', 'Текст');
```

**Результат:**
- ✅ `document.getElementById` → `LegacyAdapter.DOM.getElement`: **100%** (~40 використань)
- ✅ `element.textContent = value` → `LegacyAdapter.DOM.setText(id, value)`: **67%** (~10 використань)
- ✅ `element.value = value` → `LegacyAdapter.DOM.setInputValue(id, value)`: **67%** (~10 використань)

#### Файл 2: `main.ts` (середня кількість)
**Пріоритет: Середній**

Замінити:
```typescript
// Старий код
const input = document.getElementById('geosearch-input') as HTMLInputElement;
input.value = 'значення';

// Новий код
const input = LegacyAdapter.DOM.getElementById<HTMLInputElement>('geosearch-input');
LegacyAdapter.DOM.setInputValue('geosearch-input', 'значення');
```

#### Файл 3: `layers.ts` (менше використань)
**Пріоритет: Низький**

Замінити:
```typescript
// Старий код
const input = document.getElementById('layer-title-input');
input.value = layerObj.title;

// Новий код
LegacyAdapter.DOM.setInputValue('layer-title-input', layerObj.title);
```

### Етап 4: Тестування після кожної заміни
- [ ] Компіляція без помилок
- [ ] Функціональність працює
- [ ] Немає регресій

### Етап 5: Очищення
- [ ] Видалити невикористані імпорти
- [ ] Оптимізувати код
- [ ] Документувати зміни

## 📋 Детальний план заміни для ui.ts

### Крок 1: Додати імпорт
```typescript
import { LegacyAdapter } from './adapters/legacy-adapter.js';
```

### Крок 2: Замінити getElementById
```typescript
// Було:
const modalTitle = document.getElementById('modal-title');

// Стало:
const modalTitle = LegacyAdapter.DOM.getElementById('modal-title');
```

### Крок 3: Замінити textContent
```typescript
// Було:
modalTitle.textContent = `Редагування ${type}`;

// Стало:
LegacyAdapter.DOM.setText('modal-title', `Редагування ${type}`);
```

### Крок 4: Замінити value
```typescript
// Було:
if (objectName) objectName.value = properties.name || '';

// Стало:
LegacyAdapter.DOM.setInputValue('object-name', properties.name || '');
```

## ⚠️ Важливі моменти

### 1. Типізація
```typescript
// Правильно:
const input = LegacyAdapter.DOM.getElementById<HTMLInputElement>('input-id');

// Неправильно:
const input = LegacyAdapter.DOM.getElementById('input-id') as HTMLInputElement;
```

### 2. Null перевірки
```typescript
// Наші утиліти вже обробляють null, але краще перевіряти:
const element = LegacyAdapter.DOM.getElementById('some-id');
if (element) {
    // робота з елементом
}
```

### 3. Обробка помилок
```typescript
try {
    LegacyAdapter.DOM.setText('non-existent-id', 'text');
} catch (error) {
    console.warn('Element not found:', error);
}
```

## 🎯 Критерії успіху

### Технічні:
- [ ] Всі `document.getElementById` замінені
- [ ] Всі `.textContent =` замінені
- [ ] Всі `.value =` замінені
- [ ] Код компілюється без помилок
- [ ] Функціональність не зламана

### Якість:
- [ ] Код більш безпечний
- [ ] Легше тестувати
- [ ] Краща обробка помилок
- [ ] Консистентний стиль

## 📈 Метрики

### До інтеграції:
- Прямі DOM операції: ~100
- Потенційні помилки: ~20
- Код без перевірок: ~30

### Після інтеграції:
- Прямі DOM операції: 0
- Потенційні помилки: 0
- Код з перевірками: 100%

## 🔄 Наступні кроки

1. ✅ **Завершено ui.ts** (найбільше використань)
2. **Тестувати в браузері**
3. **Перейти до main.ts** (середній пріоритет)
4. **Завершити з layers.ts** (низький пріоритет)
5. **Очистити та оптимізувати**

---

**Статус**: Готово до початку інтеграції  
**Пріоритет**: Високий  
**Складність**: Середня 