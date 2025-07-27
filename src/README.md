# Нова архітектура проекту

## 📁 Структура папок

```
src/
├── base/              # Базові класи
│   ├── BaseService.ts
│   └── BaseComponent.ts
├── managers/          # Менеджери
│   ├── AppManager.ts
│   ├── StateManager.ts
│   └── EventManager.ts
├── services/          # Сервіси
│   └── StorageService.ts
├── components/        # UI компоненти
│   └── ModalComponent.ts
├── utils/             # Утиліти
│   ├── Logger.ts
│   └── DOMUtils.ts
├── types/             # Типи
│   └── index.ts
├── enums/             # Enum'и
│   └── index.ts
├── interfaces/        # Інтерфейси
│   ├── ILayer.ts
│   └── IStorage.ts
├── examples/          # Приклади використання
│   └── ArchitectureExample.ts
├── main.ts            # Головний файл ініціалізації
└── index.ts           # Експорт всіх модулів
```

## 🚀 Швидкий старт

### Імпорт модулів

```typescript
import { 
  appManager, 
  StateManager, 
  Logger, 
  DOMUtils 
} from './src/index.js';
```

### Створення сервісу

```typescript
import { BaseService } from './src/base/BaseService.js';

class MyService extends BaseService {
  constructor() {
    super('MyService');
  }

  protected onInit(): void {
    this.logger.info('Service initialized');
  }

  protected onDestroy(): void {
    this.logger.info('Service destroyed');
  }
}
```

### Створення компонента

```typescript
import { BaseComponent } from './src/base/BaseComponent.js';

class MyComponent extends BaseComponent {
  constructor(element: HTMLElement) {
    super(element, 'MyComponent');
  }

  protected onInit(): void {
    this.logger.info('Component initialized');
  }

  protected onDestroy(): void {
    this.logger.info('Component destroyed');
  }

  protected bindEvents(): void {
    // Прив'язка обробників подій
  }
}
```

## 📋 Основні компоненти

### AppManager
Централізоване управління всіма сервісами додатку.

```typescript
// Реєстрація сервісу
appManager.registerService('myService', myService, 0);

// Отримання сервісу
const service = appManager.getService<MyService>('myService');

// Ініціалізація всіх сервісів
await appManager.init();
```

### StateManager
Управління станом додатку з підписками на зміни.

```typescript
const stateManager = new StateManager<AppState>(initialState);

// Підписка на зміни
const unsubscribe = stateManager.subscribe('ui', (state) => {
  console.log('State changed:', state);
});

// Оновлення стану
stateManager.setState({ newField: 'value' });
```

### EventManager
Управління подіями додатку.

```typescript
const eventManager = new EventManager();

// Додавання обробника
eventManager.addHandler('custom-event', (data) => {
  console.log('Event received:', data);
});

// Виклик події
eventManager.emit('custom-event', { message: 'Hello' });
```

### Logger
Структуроване логування з різними рівнями.

```typescript
const logger = new Logger('MyService');
logger.setMinLevel(LogLevel.DEBUG);

logger.info('Service started');
logger.warn('Deprecated method called');
logger.error('Operation failed', error);
logger.debug('Debug info', { data: 'value' });
```

### DOMUtils
Утиліти для роботи з DOM.

```typescript
// Отримання елементів
const button = DOMUtils.getElement<HTMLButtonElement>('#my-button');

// Створення елементів
const div = DOMUtils.createElement<HTMLDivElement>('div', 'container');

// Робота з подіями
DOMUtils.addEventListeners(button, {
  click: () => console.log('Clicked'),
  mouseover: () => console.log('Hovered')
});

// Дебаунс та троттлінг
const debouncedSave = DOMUtils.debounce(() => {
  saveData();
}, 1000);
```

## 🎯 Принципи архітектури

### 1. Single Responsibility Principle (SRP)
Кожен клас має одну відповідальність:
- `BaseService` - базова функціональність сервісів
- `BaseComponent` - базова функціональність компонентів
- `StateManager` - управління станом
- `EventManager` - управління подіями

### 2. Dependency Injection
Сервіси реєструються в `AppManager` та можуть отримуватися за ім'ям:

```typescript
const service = appManager.getService<MyService>('myService');
```

### 3. Observer Pattern
`StateManager` використовує паттерн Observer для підписок на зміни стану.

### 4. Factory Pattern
`AppManager` виступає як фабрика для створення та управління сервісами.

## 🔧 Налаштування

### TypeScript
Проект використовує строгу типізацію TypeScript з наступними налаштуваннями:

```json
{
  "strict": true,
  "noImplicitAny": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

### ESLint
Рекомендовані правила для дотримання стандартів коду:

```json
{
  "extends": ["@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

## 📝 Найкращі практики

### 1. Логування
- Використовуйте `Logger` для всіх важливих операцій
- Встановлюйте відповідний рівень логування
- Додавайте контекст до логів

### 2. Обробка помилок
- Використовуйте `try-catch` блоки
- Логуйте помилки з деталями
- Створюйте специфічні типи помилок

### 3. Типізація
- Використовуйте строгу типізацію
- Створюйте інтерфейси для всіх об'єктів
- Використовуйте enum'и замість рядків

### 4. Тестування
- Тестуйте кожен сервіс окремо
- Використовуйте моки для залежностей
- Покривайте всі сценарії використання

## 🚀 Розширення

### Додавання нового сервісу

1. Створіть клас, що наслідується від `BaseService`
2. Реалізуйте методи `onInit()` та `onDestroy()`
3. Зареєструйте сервіс в `AppManager`

### Додавання нового компонента

1. Створіть клас, що наслідується від `BaseComponent`
2. Реалізуйте методи `onInit()`, `onDestroy()` та `bindEvents()`
3. Використовуйте `DOMUtils` для роботи з DOM

### Додавання нових типів

1. Додайте типи в `src/types/index.ts`
2. Додайте enum'и в `src/enums/index.ts`
3. Оновіть експорти в `src/index.ts`

## 📚 Додаткові ресурси

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Design Patterns](https://en.wikipedia.org/wiki/Design_Patterns)
- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350884) 