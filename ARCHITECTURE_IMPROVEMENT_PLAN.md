# План покращення архітектури проекту

## 🎯 Цілі оптимізації

- Дотримання принципів SOLID, DRY, KISS
- Покращення читабельності та підтримуваності коду
- Зменшення дублювання коду
- Покращення типізації
- Модульна архітектура

## 📋 Поточні проблеми

### 1. Порушення Single Responsibility Principle (SRP)

**main.ts (1926 рядків)** містить:
- Логіку overlay
- Обробку KMZ файлів
- Геопошук
- Модальні вікна
- Збереження даних
- Debug функції

**ui.ts (1415 рядків)** містить:
- UI компоненти
- Бізнес-логіку
- Обробку подій
- DOM маніпуляції

### 2. Порушення DRY (Don't Repeat Yourself)

- Дублювання DOM селекторів
- Повторювана логіка збереження
- Дублювання обробників подій
- Схожі функції в різних файлах

### 3. Порушення KISS (Keep It Simple, Stupid)

- Складні вкладені функції
- Важко читати код
- Відсутність чіткої структури

## 🏗️ План рефакторингу

### Етап 1: Розбиття монолітних файлів

#### 1.1 Розбиття main.ts

```
main.ts → розбити на:
├── overlay/
│   ├── OverlayService.ts
│   ├── OverlayEditHandler.ts
│   └── OverlayPositionFix.ts
├── kmz/
│   ├── KmzService.ts
│   └── KmzParser.ts
├── geo-search/
│   ├── GeoSearchService.ts
│   └── GeoSearchUI.ts
├── debug/
│   ├── DebugService.ts
│   └── DebugUI.ts
└── main.ts (тільки ініціалізація)
```

#### 1.2 Розбиття ui.ts

```
ui.ts → розбити на:
├── components/
│   ├── ModalComponent.ts
│   ├── LayerControlComponent.ts
│   ├── ObjectListComponent.ts
│   └── TooltipComponent.ts
├── services/
│   ├── UIService.ts
│   └── DOMService.ts
└── ui.ts (тільки експорти)
```

### Етап 2: Створення базових класів та інтерфейсів

#### 2.1 Базові інтерфейси

```typescript
// interfaces/ILayer.ts
interface ILayer {
  id: number;
  name: string;
  type: LayerType;
  visible: boolean;
  objects: IMapObject[];
}

// interfaces/IMapObject.ts
interface IMapObject {
  id: string;
  type: ObjectType;
  properties: ObjectProperties;
  position: LatLng;
}

// interfaces/IStorage.ts
interface IStorage {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  remove(key: string): Promise<void>;
}
```

#### 2.2 Базові класи

```typescript
// base/BaseService.ts
abstract class BaseService {
  protected logger: Logger;
  
  constructor() {
    this.logger = new Logger(this.constructor.name);
  }
  
  protected abstract init(): void;
  protected abstract cleanup(): void;
}

// base/BaseComponent.ts
abstract class BaseComponent {
  protected element: HTMLElement;
  protected eventManager: EventManager;
  
  constructor(element: HTMLElement) {
    this.element = element;
    this.eventManager = new EventManager();
  }
  
  protected abstract render(): void;
  protected abstract bindEvents(): void;
}
```

### Етап 3: Покращення типізації

#### 3.1 Строга типізація

```typescript
// types/index.ts
export type LayerType = 'marker' | 'polygon' | 'polyline' | 'image';
export type ObjectType = 'marker' | 'polygon' | 'polyline' | 'circle' | 'rectangle' | 'image';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ObjectProperties {
  name?: string;
  description?: string;
  color?: string;
  weight?: number;
  opacity?: number;
  icon?: string;
}
```

#### 3.2 Enum'и замість рядків

```typescript
// enums/index.ts
export enum LayerType {
  MARKER = 'marker',
  POLYGON = 'polygon',
  POLYLINE = 'polyline',
  IMAGE = 'image'
}

export enum ObjectType {
  MARKER = 'marker',
  POLYGON = 'polygon',
  POLYLINE = 'polyline',
  CIRCLE = 'circle',
  RECTANGLE = 'rectangle',
  IMAGE = 'image'
}
```

### Етап 4: Створення утилітних класів

#### 4.1 DOM утиліти

```typescript
// utils/DOMUtils.ts
export class DOMUtils {
  static getElement<T extends HTMLElement>(selector: string): T | null {
    return document.querySelector(selector) as T;
  }
  
  static getElements<T extends HTMLElement>(selector: string): T[] {
    return Array.from(document.querySelectorAll(selector)) as T[];
  }
  
  static createElement<T extends HTMLElement>(tag: string, className?: string): T {
    const element = document.createElement(tag) as T;
    if (className) element.className = className;
    return element;
  }
  
  static addEventListeners(element: HTMLElement, events: Record<string, EventListener>): void {
    Object.entries(events).forEach(([event, listener]) => {
      element.addEventListener(event, listener);
    });
  }
}
```

#### 4.2 Логування

```typescript
// utils/Logger.ts
export class Logger {
  constructor(private context: string) {}
  
  info(message: string, data?: any): void {
    console.log(`[${this.context}] ${message}`, data);
  }
  
  warn(message: string, data?: any): void {
    console.warn(`[${this.context}] ${message}`, data);
  }
  
  error(message: string, data?: any): void {
    console.error(`[${this.context}] ${message}`, data);
  }
}
```

### Етап 5: Покращення менеджерів

#### 5.1 Рефакторинг AppManager

```typescript
// managers/AppManager.ts
export class AppManager {
  private services: Map<string, BaseService> = new Map();
  
  registerService(name: string, service: BaseService): void {
    this.services.set(name, service);
  }
  
  getService<T extends BaseService>(name: string): T {
    return this.services.get(name) as T;
  }
  
  async init(): Promise<void> {
    for (const [name, service] of this.services) {
      try {
        await service.init();
        this.logger.info(`Service ${name} initialized`);
      } catch (error) {
        this.logger.error(`Failed to initialize service ${name}`, error);
      }
    }
  }
}
```

#### 5.2 Покращення StateManager

```typescript
// managers/StateManager.ts
export class StateManager<T> {
  private state: T;
  private subscribers: Set<(state: T) => void> = new Set();
  
  constructor(initialState: T) {
    this.state = initialState;
  }
  
  getState(): T {
    return { ...this.state };
  }
  
  setState(updates: Partial<T>): void {
    this.state = { ...this.state, ...updates };
    this.notifySubscribers();
  }
  
  subscribe(callback: (state: T) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.state));
  }
}
```

## 📁 Нова структура проекту

```
src/
├── components/
│   ├── ModalComponent.ts
│   ├── LayerControlComponent.ts
│   ├── ObjectListComponent.ts
│   └── TooltipComponent.ts
├── services/
│   ├── OverlayService.ts
│   ├── KmzService.ts
│   ├── GeoSearchService.ts
│   ├── UIService.ts
│   └── StorageService.ts
├── managers/
│   ├── AppManager.ts
│   ├── StateManager.ts
│   └── EventManager.ts
├── interfaces/
│   ├── ILayer.ts
│   ├── IMapObject.ts
│   └── IStorage.ts
├── types/
│   └── index.ts
├── enums/
│   └── index.ts
├── utils/
│   ├── DOMUtils.ts
│   ├── Logger.ts
│   └── ValidationUtils.ts
├── base/
│   ├── BaseService.ts
│   └── BaseComponent.ts
└── main.ts
```

## 🎯 Очікувані результати

1. **Покращена читабельність**: Кожен файл має одну відповідальність
2. **Легше тестування**: Модульна структура дозволяє тестувати компоненти окремо
3. **Зменшення дублювання**: Спільна логіка винесена в утиліти
4. **Краща типізація**: Строга типізація зменшує помилки
5. **Легше розширення**: Нова функціональність додається в окремі модулі

## 📅 Графік реалізації

1. **Тиждень 1**: Створення базових інтерфейсів та утиліт
2. **Тиждень 2**: Рефакторинг main.ts
3. **Тиждень 3**: Рефакторинг ui.ts
4. **Тиждень 4**: Покращення менеджерів та тестування
5. **Тиждень 5**: Фінальне тестування та документація

## 🔧 Інструменти для рефакторингу

- TypeScript для строгої типізації
- ESLint для дотримання стандартів коду
- Prettier для форматування
- Jest для тестування
- JSDoc для документації 