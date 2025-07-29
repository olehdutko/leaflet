# План покращень проекту

## 🎯 Мета
Перетворити проект на модульну, легко зрозумілу архітектуру, що дотримується принципів SOLID, DRY, KISS.

## 📊 Поточний стан

### Проблеми:
1. **Порушення SRP (Single Responsibility Principle)**:
   - `main.ts` (1918 рядків) - містить логіку overlay, UI, геопошуку, KMZ імпорт
   - `ui.ts` (1415 рядків) - містить модальні вікна, контроли шарів, тултіпи
   - `layers.ts` (703 рядки) - містить управління шарами, збереження, overlay

2. **Порушення DRY (Don't Repeat Yourself)**:
   - Дублювання логіки збереження в різних місцях
   - Повторювані селектори DOM елементів
   - Дублювання типів та інтерфейсів

3. **Порушення KISS (Keep It Simple, Stupid)**:
   - Складні функції з багатьма рівнями вкладеності
   - Змішування логіки UI та бізнес-логіки

4. **Проблеми з модульністю**:
   - Циклічні імпорти між файлами
   - Глобальні змінні та функції
   - Тісне зв'язування компонентів

## 🚀 План покращень

### Етап 1: Створення базової інфраструктури ✅

- [x] **Централізовані типи** (`types/index.ts`)
- [x] **DOM утиліти** (`utils/dom-utils.ts`)
- [x] **Сервіс збереження** (`services/storage-service.ts`)
- [x] **Сервіс об'єктів** (`services/object-service.ts`)

### Етап 2: Розділення відповідальностей

#### 2.1 Розбиття main.ts на модулі:
- [ ] **OverlayService** - логіка роботи з overlay
- [ ] **GeoSearchService** - геопошук
- [ ] **KmzService** - імпорт KMZ файлів
- [ ] **ModalService** - модальні вікна
- [ ] **EventService** - обробка подій

#### 2.2 Розбиття ui.ts на модулі:
- [ ] **LayerControlService** - контроли шарів
- [ ] **TooltipService** - тултіпи
- [ ] **ModalService** - модальні вікна
- [ ] **AutocompleteService** - автодоповнення

#### 2.3 Розбиття layers.ts на модулі:
- [ ] **LayerManager** - управління шарами
- [ ] **LayerStorageService** - збереження шарів
- [ ] **LayerUIService** - UI для шарів

### Етап 3: Створення менеджерів

#### 3.1 AppManager - головний менеджер:
```typescript
class AppManager {
  private services: Map<string, any> = new Map();
  
  registerService(name: string, service: any): void
  getService<T>(name: string): T
  init(): Promise<void>
  destroy(): void
}
```

#### 3.2 EventManager - управління подіями:
```typescript
class EventManager {
  private listeners: Map<string, Function[]> = new Map();
  
  on(event: string, handler: Function): void
  off(event: string, handler: Function): void
  emit(event: string, data?: any): void
}
```

#### 3.3 StateManager - управління станом:
```typescript
class StateManager {
  private state: AppState;
  
  getState(): AppState
  setState(updates: Partial<AppState>): void
  subscribe(callback: (state: AppState) => void): void
}
```

### Етап 4: Рефакторинг існуючого коду

#### 4.1 Поступове заміщення:
1. **Не видаляти існуючий код одразу**
2. **Створювати нові сервіси паралельно**
3. **Поступово мігрувати функціональність**
4. **Тестувати кожен крок**

#### 4.2 Створення адаптерів:
```typescript
// Адаптер для зворотної сумісності
class LegacyAdapter {
  static adaptOldFunction(oldFunction: Function): Function
  static migrateData(oldData: any): any
}
```

### Етап 5: Покращення структури проекту

#### 5.1 Нова структура папок:
```
src/
├── types/           # Типи та інтерфейси
├── services/        # Бізнес-логіка
├── managers/        # Менеджери
├── utils/           # Утиліти
├── components/      # UI компоненти
├── adapters/        # Адаптери для сумісності
└── main.ts          # Точка входу
```

#### 5.2 Конфігурація:
```typescript
// config/app.config.ts
export const AppConfig = {
  version: '4.0.0',
  debug: false,
  storage: {
    prefix: 'lefleat_',
    debounceDelay: 200
  },
  map: {
    center: [49.8397, 24.0297],
    zoom: 13
  }
}
```

### Етап 6: Тестування та валідація

#### 6.1 Критерії успіху:
- [ ] **Функціональність не зламана**
- [ ] **Код легше читати та підтримувати**
- [ ] **Менше дублювання**
- [ ] **Чіткі відповідальності**
- [ ] **Легше додавати нові функції**

#### 6.2 Тестування:
- [ ] **Мануальне тестування всіх функцій**
- [ ] **Перевірка імпорту KMZ**
- [ ] **Перевірка роботи з шарами**
- [ ] **Перевірка модальних вікон**

## 🔧 Інструменти для рефакторингу

### 1. Поступова міграція:
```typescript
// Замість одразу видаляти старий код
export function newFunction() {
  // Нова логіка
}

// Експортуємо стару функцію для сумісності
export const oldFunction = newFunction;
```

### 2. Dependency Injection:
```typescript
class Service {
  constructor(
    private storageService: StorageService,
    private eventManager: EventManager
  ) {}
}
```

### 3. Фасади для складних операцій:
```typescript
class LayerFacade {
  static createLayer(config: LayerConfig): LayerObj
  static saveLayer(layer: LayerObj): void
  static deleteLayer(layerId: string): void
}
```

## 📋 Чек-лист виконання

### Етап 1 (Базова інфраструктура): ✅ ЗАВЕРШЕНО
- [x] Створено `types/index.ts` (3.35 KB)
- [x] Створено `utils/dom-utils.ts` (4.31 KB)
- [x] Створено `services/storage-service.ts` (4.93 KB)
- [x] Створено `services/object-service.ts` (7.65 KB)
- [x] Створено `adapters/legacy-adapter.ts` (6.96 KB)
- [x] Створено тестові файли та інтерфейси
- [x] Протестовано компіляцію та функціональність

### Етап 2 (Розділення відповідальностей):
- [x] **Інтеграція DOM утиліт в `ui.ts`** ✅ ЗАВЕРШЕНО
- [x] **Інтеграція DOM утиліт в `layers.ts`** ✅ ЗАВЕРШЕНО
- [ ] Розбити `main.ts` на сервіси

### Етап 3 (Менеджери):
- [ ] Створити `AppManager`
- [ ] Створити `EventManager`
- [ ] Створити `StateManager`

### Етап 4 (Рефакторинг):
- [ ] Поступова міграція функцій
- [ ] Створення адаптерів
- [ ] Тестування функціональності

### Етап 5 (Структура):
- [ ] Реорганізація папок
- [ ] Конфігурація
- [ ] Документація

## 🎯 Очікувані результати

### До покращень:
- ❌ Великі файли (1000+ рядків)
- ❌ Дублювання коду
- ❌ Складні залежності
- ❌ Важко тестувати

### Після покращень:
- ✅ Малі, фокусовані модулі
- ✅ DRY принцип
- ✅ Чіткі інтерфейси
- ✅ Легко тестувати
- ✅ Легко розширювати

## ⚠️ Важливі зауваження

1. **Не ламати існуючий функціонал**
2. **Поступова міграція**
3. **Тестування на кожному етапі**
4. **Збереження зворотної сумісності**
5. **Документування змін**

## 📝 Наступні кроки

1. **Завершити Етап 1** ✅
2. **Почати Етап 2** - розбиття main.ts
3. **Створити перші сервіси**
4. **Протестувати функціональність**
5. **Продовжити міграцію** 