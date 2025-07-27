# Гід по рефакторингу проекту

## 🎯 Мета рефакторингу

Цей гід допоможе вам перейти від монолітної архітектури до модульної, що дотримується принципів SOLID, DRY та KISS.

## 📋 Поточні проблеми

### 1. Порушення Single Responsibility Principle (SRP)
- `main.ts` (1926 рядків) містить логіку overlay, KMZ, геопошуку, модальні вікна, збереження даних
- `ui.ts` (1415 рядків) містить UI компоненти, бізнес-логіку, обробку подій, DOM маніпуляції

### 2. Порушення DRY (Don't Repeat Yourself)
- Дублювання DOM селекторів та обробників подій
- Повторювана логіка збереження в різних місцях
- Схожі функції в різних файлах

### 3. Порушення KISS (Keep It Simple, Stupid)
- Складні вкладені функції
- Важко читати та підтримувати код
- Відсутність чіткої структури

## 🏗️ Нова архітектура

### Структура проекту

```
src/
├── components/          # UI компоненти
│   ├── ModalComponent.ts
│   ├── LayerControlComponent.ts
│   ├── ObjectListComponent.ts
│   └── TooltipComponent.ts
├── services/           # Бізнес-логіка
│   ├── OverlayService.ts
│   ├── KmzService.ts
│   ├── GeoSearchService.ts
│   ├── UIService.ts
│   └── StorageService.ts
├── managers/           # Менеджери
│   ├── AppManager.ts
│   ├── StateManager.ts
│   └── EventManager.ts
├── interfaces/         # Інтерфейси
│   ├── ILayer.ts
│   ├── IMapObject.ts
│   └── IStorage.ts
├── types/             # Типи
│   └── index.ts
├── enums/             # Enum'и
│   └── index.ts
├── utils/             # Утиліти
│   ├── DOMUtils.ts
│   ├── Logger.ts
│   └── ValidationUtils.ts
├── base/              # Базові класи
│   ├── BaseService.ts
│   └── BaseComponent.ts
└── main.ts            # Тільки ініціалізація
```

## 🚀 Початок роботи

### 1. Встановлення залежностей

```bash
npm install
```

### 2. Компіляція TypeScript

```bash
npm run build
```

### 3. Перевірка коду

```bash
npm run lint
npm run format
```

## 📖 Використання нової архітектури

### Створення сервісу

```typescript
import { BaseService } from './base/BaseService.js';
import { LayerType } from './enums/index.js';

class LayerService extends BaseService {
  private layers: any[] = [];

  constructor() {
    super('LayerService');
  }

  async addLayer(name: string, type: LayerType): Promise<any> {
    return this.safeExecute(async () => {
      const layer = {
        id: Date.now(),
        name,
        type,
        visible: true,
        objects: []
      };

      this.layers.push(layer);
      this.logger.info(`Layer added: ${name} (${type})`);
      return layer;
    }, 'addLayer');
  }

  protected onInit(): void {
    this.logger.info('LayerService initialized');
  }

  protected onDestroy(): void {
    this.layers = [];
    this.logger.info('LayerService destroyed');
  }
}
```

### Створення UI компонента

```typescript
import { BaseComponent } from './base/BaseComponent.js';
import { DOMUtils } from './utils/DOMUtils.js';

class LayerListComponent extends BaseComponent {
  private layers: any[] = [];

  constructor(element: HTMLElement) {
    super(element, 'LayerListComponent');
  }

  setLayers(layers: any[]): void {
    this.layers = layers;
    this.render();
  }

  private render(): void {
    this.updateDOM(() => {
      this.clearChildren();
      
      this.layers.forEach(layer => {
        const layerElement = this.createLayerElement(layer);
        this.appendChild(layerElement);
      });
    });
  }

  protected bindEvents(): void {
    this.addEventListener('click', (e) => {
      // Обробка кліків
    });
  }

  protected onInit(): void {
    this.logger.info('LayerListComponent initialized');
  }

  protected onDestroy(): void {
    this.logger.info('LayerListComponent destroyed');
  }
}
```

### Використання AppManager

```typescript
import { appManager } from './managers/AppManager.js';
import { LayerService } from './services/LayerService.js';

// Реєстрація сервісу
const layerService = new LayerService();
appManager.registerService('layers', layerService, 0);

// Ініціалізація всіх сервісів
await appManager.init();

// Отримання сервісу
const layers = appManager.getService<LayerService>('layers');
```

### Використання StateManager

```typescript
import { StateManager } from './managers/StateManager.js';

interface AppState {
  layers: any[];
  activeLayer: any | null;
  settings: {
    theme: 'light' | 'dark';
    autoSave: boolean;
  };
}

const initialState: AppState = {
  layers: [],
  activeLayer: null,
  settings: {
    theme: 'light',
    autoSave: true
  }
};

const stateManager = new StateManager<AppState>(initialState, 'AppState');

// Підписка на зміни
const unsubscribe = stateManager.subscribe('ui', (state) => {
  console.log('State changed:', state);
});

// Оновлення стану
stateManager.setState({
  layers: newLayers,
  activeLayer: selectedLayer
});

// Оновлення конкретного поля
stateManager.updateField('settings', { theme: 'dark', autoSave: false });
```

### Використання Logger

```typescript
import { Logger } from './utils/Logger.js';
import { LogLevel } from './enums/index.js';

const logger = new Logger('MyService');
logger.setMinLevel(LogLevel.DEBUG);

logger.info('Service started');
logger.warn('Deprecated method called');
logger.error('Operation failed', error);
logger.debug('Debug info', { data: 'value' });
```

### Використання DOMUtils

```typescript
import { DOMUtils } from './utils/DOMUtils.js';

// Отримання елементів
const button = DOMUtils.getElement<HTMLButtonElement>('#my-button');
const inputs = DOMUtils.getElements<HTMLInputElement>('.form-input');

// Створення елементів
const div = DOMUtils.createElement<HTMLDivElement>('div', 'container');
const button = DOMUtils.createElementWithAttributes<HTMLButtonElement>('button', {
  type: 'submit',
  class: 'btn-primary'
});

// Робота з подіями
DOMUtils.addEventListeners(button, {
  click: () => console.log('Clicked'),
  mouseover: () => console.log('Hovered')
});

// Робота з класами
DOMUtils.addClass(element, 'active');
DOMUtils.removeClass(element, 'disabled');
DOMUtils.toggleClass(element, 'selected');

// Дебаунс та троттлінг
const debouncedSave = DOMUtils.debounce(() => {
  saveData();
}, 1000);

const throttledUpdate = DOMUtils.throttle(() => {
  updateUI();
}, 100);
```

## 🔄 Міграція існуючого коду

### Етап 1: Створення базової структури

1. Створіть папки `src/`, `src/components/`, `src/services/`, тощо
2. Скопіюйте базові класи та утиліти
3. Налаштуйте TypeScript конфігурацію

### Етап 2: Розбиття main.ts

1. Визначте основні функціональності:
   - Overlay логіка → `services/OverlayService.ts`
   - KMZ обробка → `services/KmzService.ts`
   - Геопошук → `services/GeoSearchService.ts`
   - Debug функції → `services/DebugService.ts`

2. Створіть відповідні сервіси
3. Перенесіть логіку з `main.ts`

### Етап 3: Розбиття ui.ts

1. Визначте UI компоненти:
   - Модальні вікна → `components/ModalComponent.ts`
   - Контроли шарів → `components/LayerControlComponent.ts`
   - Список об'єктів → `components/ObjectListComponent.ts`

2. Створіть відповідні компоненти
3. Перенесіть логіку з `ui.ts`

### Етап 4: Інтеграція

1. Створіть новий `main.ts` з ініціалізацією
2. Реєструйте сервіси в AppManager
3. Налаштуйте StateManager
4. Протестуйте функціональність

## 🧪 Тестування

### Створення тестів

```typescript
import { LayerService } from './services/LayerService.js';
import { LayerType } from './enums/index.js';

describe('LayerService', () => {
  let service: LayerService;

  beforeEach(async () => {
    service = new LayerService();
    await service.init();
  });

  afterEach(async () => {
    await service.destroy();
  });

  it('should add layer', async () => {
    const layer = await service.addLayer('Test Layer', LayerType.MARKER);
    
    expect(layer.name).toBe('Test Layer');
    expect(layer.type).toBe(LayerType.MARKER);
  });
});
```

### Запуск тестів

```bash
npm test
```

## 📝 Найкращі практики

### 1. Принцип Single Responsibility
- Кожен клас має одну відповідальність
- Розділяйте логіку на менші функції
- Використовуйте інтерфейси для абстракції

### 2. Принцип DRY
- Використовуйте базові класи для спільної функціональності
- Створюйте утиліти для повторюваних операцій
- Використовуйте шаблони проектування

### 3. Принцип KISS
- Пишіть простий та зрозумілий код
- Уникайте складних вкладень
- Використовуйте змістовні імена

### 4. Типізація
- Використовуйте строгу типізацію
- Створюйте інтерфейси для всіх об'єктів
- Використовуйте enum'и замість рядків

### 5. Логування
- Логуйте всі важливі операції
- Використовуйте різні рівні логування
- Додавайте контекст до логів

### 6. Обробка помилок
- Використовуйте try-catch блоки
- Створюйте специфічні типи помилок
- Логуйте помилки з деталями

## 🔧 Інструменти

### ESLint
```json
{
  "extends": [
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

### Prettier
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80
}
```

### TypeScript
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## 📚 Додаткові ресурси

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350884)
- [Design Patterns](https://en.wikipedia.org/wiki/Design_Patterns)

## 🤝 Підтримка

Якщо у вас виникли питання або проблеми:

1. Перевірте документацію
2. Подивіться на приклади в `src/examples/`
3. Створіть issue в репозиторії
4. Зверніться до команди розробки 