# Аналіз фронтенд кодової бази: Lefleat

## 📁 Структура проєкту

Lefleat — це односторінковий браузерний застосунок (SPA) для роботи з інтерактивною картою Львова. Кодова база пласка: весь вихідний код TypeScript лежить у корні репозиторію, що відповідає правилу проєкту «один функціональний блок — один файл».

```text
lefleat/
├── index.html              # Розмітка сторінки, CDN-залежності, точка входу скриптів
├── index.ts                # Точка входу TypeScript (лише імпорти)
├── main.ts                 # Основна логіка застосунку: ініціалізація, імпорт/експорт, вимірювання
├── map-init.ts             # Створення екземпляра Leaflet-карти та базові tile-шари
├── layers.ts               # Керування користувацькими шарами, серіалізація в localStorage
├── draw-control.ts         # Інтеграція Leaflet.Draw + кастомна кнопка тексту
├── text-object.ts          # Текстові об'єкти на мапі
├── objects.ts              # Застосування властивостей (колір, іконка, товщина) до гео-об’єктів
├── ui.ts                   # Рендер панелі шарів, модальних вікон, пошуку, тултипів
├── utils.ts                # Утиліти: типізація шарів Leaflet, тултипи, іконки маркерів
├── state.ts                # Мінімальний глобальний mutable-стейт
├── overlay-transform.ts    # Робота зі спотворюваними image-overlays (leaflet.distortableimage)
├── historical-overlay.ts   # Логіка історичних підкладок (растрові зображення на мапі)
├── historical-overlay-ui.ts # UI для управління історичними підкладками
├── ai-assistant.ts         # AI-панель для пошуку місць через Nominatim
├── api.ts                  # Програмний API LefleatApi для зовнішніх скриптів
├── style.css               # Єдиний файл стилів інтерфейсу
├── package.json            # Залежності та npm-скрипти
├── tsconfig.json           # Конфігурація TypeScript
├── .eslintrc.js            # Правила ESLint
├── .prettierrc             # Форматування Prettier
├── RULES.md                # Правила організації коду
├── README.md               # Документація для користувачів
├── PROJECT_DOC.md          # Короткий огляд проєкту
├── SETUP_INSTRUCTIONS.md   # Інструкції з налаштування
├── OBJECT_IMAGES_FEATURE.md # Документація зображень об'єктів
├── OVERLAY_DELETE_FIX.md   # Документація видалення overlay
├── del/                    # Дебаг-скрипти (не імпортуються продакшеном)
├── tests/                  # Місце для тестів (порожнє)
├── assets/                 # Ресурси
├── hosting/                # Файли хостингу
└── dist/                   # Скомпільований JS (ігнорується git)
```

**Принципи організації коду:**

- **Feature-based розбиття по файлах.** Кожен модуль відповідає за одну функціональну область: карта, шари, малювання, UI, утиліти, історичні підкладки, AI-асистент.
- **Тонка точка входу.** `index.ts` містить лише імпорти та мінімальну ініціалізацію.
- **CDN-first підхід.** Основні бібліотеки (Leaflet, Leaflet.Draw, FontAwesome, Material Icons, SortableJS, JSZip, leaflet-omnivore, Leaflet.PolylineMeasure, leaflet-distortableimage) підключаються через CDN у `index.html`.
- **Mutable shared state.** `state.ts` експортує змінювані змінні (`materialIcons`, `currentEditingObject`), які імпортуються багатьма модулями.

## 🛠 Технологічний стек

| Компонент | Технологія | Версія / Примітка |
|-----------|-----------|-------------------|
| Мова | TypeScript | 5.8.3 (`dependencies`) |
| Карта | Leaflet.js | CDN (`unpkg.com`) |
| Малювання | Leaflet.Draw | CDN (`unpkg.com`) |
| Image overlays | leaflet-distortableimage | CDN + локальна копія `leaflet.distortableimage.js` |
| Вимірювання | Leaflet.PolylineMeasure | CDN |
| Імпорт KMZ | JSZip + leaflet-omnivore | CDN |
| UI-іконки | FontAwesome 6.4.2 + Material Icons | CDN |
| Drag-and-drop шарів | SortableJS | CDN |
| Збірка | TypeScript Compiler (`tsc`) | `target: ES6`, `module: ESNext`, `moduleResolution: bundler` |
| Лінтер | ESLint 8 + @typescript-eslint | extends `recommended` |
| Форматування | Prettier 3 | 2 пробіли, 80 символів, single quotes, trailing commas |
| Зберігання | Browser `localStorage` | Ключі з префіксом `lefleat_` |
| Стилізація | Vanilla CSS | Один файл `style.css`, CSS-змінні, Grid/Flexbox |

### package.json scripts

```json
{
  "build": "tsc",
  "lint": "eslint . --ext .ts,.js",
  "lint:fix": "eslint . --ext .ts,.js --fix",
  "format": "prettier --write .",
  "check-rules": "npm run lint && npm run format --check",
  "dev": "npm run build && npm run check-rules",
  "serve": "python3 -m http.server 8090 --directory ."
}
```

- `dev` не запускає dev-сервер, а лише збирає й перевіряє правила.
- `serve` піднімає локальний HTTP-сервер для відкриття `index.html` у браузері.
- Локальний запуск: `npm run build && npm run serve`, потім `http://localhost:8090`.

## 🏗 Архітектура

### Компонентна модель

Застосунок не використовує React/Vue/Angular. Це **Vanilla TypeScript + DOM API**: рендер UI виконується через `document.createElement`, `element.innerHTML`, `element.textContent` та прямі маніпуляції з DOM.

Приклад рендера списку об’єктів шару (`ui.ts`):

```typescript
export function updateObjectsListForLayer(layerObj: any) {
  const fn = layerIdToRenderObjectsList.get(layerObj.id);
  if (fn) fn();
}
```

Це callback-реєстр: при відкритті панелі шару реєструється функція рендера, і наступні зміни викликають її за `id`.

### Розділення логіки

Логіка розділена через **ES6-модулі з чіткими імпортами**:

- `map-init.ts` — ініціалізація карти (singleton `export const map`).
- `layers.ts` — CRUD шарів, серіалізація/десеріалізація GeoJSON в `localStorage`.
- `draw-control.ts` — обробка подій `draw:created`, створення об’єктів, кастомна кнопка тексту.
- `text-object.ts` — створення та управління текстовими об'єктами.
- `objects.ts` — застосування візуальних властивостей до об’єктів Leaflet.
- `ui.ts` — DOM-UI: панель шарів, модалки, autocomplete, тултипи, пошук об'єктів.
- `historical-overlay.ts` / `historical-overlay-ui.ts` — історичні растрові підкладки.
- `ai-assistant.ts` — AI-пошук через Nominatim.
- `api.ts` — глобальний `LefleatApi`.

Мережа імпортів між TypeScript-модулями:

```text
index -> main, api, ai-assistant, historical-overlay, historical-overlay-ui
main -> draw-control, layers, map-init, state, ui, utils
ui -> draw-control, layers, main, map-init, objects, state, utils
layers -> map-init, objects, state, ui, utils
```

У коді є коментар `// видалено для уникнення циклічного імпорту` у `draw-control.ts`, але деякі циклічні зв’язки між `main/ui/layers` лишаються. TypeScript із `moduleResolution: bundler` справляється з такими циклами, але це ускладнює розуміння потоку даних.

### Управління станом

Центральний стан — це набір **module-level mutable exports**:

```typescript
// state.ts
export let materialIcons: string[] = [];
export const currentEditingObject = { value: null as any };
```

`currentEditingObject` — обгортка для спільного доступу за посиланням.

`layers.ts` містить ще один набір глобальних змінних:

```typescript
export let customLayers: LayerObj[] = [];
export let activeLayer: any = null;
export let layerId = 1;
```

Такий підхід працює для невеликого застосунку, але:

- відсутній єдиний джерело правди;
- налагодження складніше, бо стан розмазано по модулях;
- тестування без monkey-patching модулів утруднене.

### Робота з даними

Дані зберігаються в `localStorage` у форматі GeoJSON FeatureCollection. Кожен шар серіалізується в об’єкт:

```typescript
{
  id, tileType, opacity, showLabels,
  geojson: { type: 'FeatureCollection', features },
  title, visible, collapsed, overlays
}
```

Збереження виконується в `layers.ts`:

```typescript
export function saveLayersToStorage(): void {
  const layersData = customLayers.map(l => { /* ... */ });
  localStorage.setItem('lefleat_layers', JSON.stringify(layersData));
}
```

Завантаження назад (`loadLayersFromStorage`) використовує `L.geoJSON(...)` з колбеками `pointToLayer`, `style`, `onEachFeature`.

Імпорт/експорт підтримує JSON, GeoJSON та KMZ. KMZ розбирається через `JSZip` і `leaflet-omnivore`.

### Роутинг і навігація

Роутингу немає: застосунок односторінкове. Уся навігація відбувається через панель шарів, модальні вікна та карту.

### Обробка помилок і loading-станів

- **Помилки:** `try/catch` навколо парсингу JSON, GeoJSON-операцій та імпорту. Критичні помилки показуються через `alert()`.
- **Loading-станів:** формальних loading-спінерів немає. Тривалі операції (`FileReader.readAsDataURL`) виконуються асинхронно без візуальної індикації.

## 🎨 UI/UX і стилізація

### Підходи до стилізації

- **Один глобальний CSS-файл** `style.css` (~3200 рядків).
- **Немає CSS Modules, Sass, Tailwind або CSS-in-JS.** Усі стилі класичні, на селекторах.
- **CSS-змінні** для дизайн-системи світлого мінімалістичного інтерфейсу:
  - `--bg-canvas: #F7F5F0` — теплий паперовий фон
  - `--bg-surface: #FFFFFF` — білі плаваючі картки
  - `--accent-color: #B85C38` — терракотовий акцент
  - `--text-primary: #2A2825` — основний текст
  - `--text-muted: #6F6B63` — вторинний текст
  - `--border-color: #E3DDD2` — тонкі рамки
- **Медіа-запити** для адаптивності панелі шарів на мобільних екранах.

### Дизайн-система / UI-kit

Повноцінного UI-kit немає, але є повторювані класи:

- `.btn-primary`, `.btn-secondary`, `.btn-danger` — кнопки.
- `.modal`, `.modal-content`, `.modal-header`, `.modal-body`, `.modal-footer` — модальні вікна.
- `.form-group`, `.color-palette`, `.color-swatch` — форми.
- `.layer-card` — картки шарів у бічній панелі.
- `.ai-top-toggle`, `#top-bar`, `#geosearch-bar` — нові елементи top bar.

### Layout

- **Top bar**: фіксована панель зверху з брендом, геопошуком і кнопкою AI. Колись плаваюча AI-кнопка замінена на інтегрований елемент top bar.
- **Панель шарів**: `#layers-panel-drawer` зліва. Містить заголовок, історичні підкладки, пошук об'єктів, список шарів та footer з attribution.
- **Панель інструментів**: Leaflet.Draw + кастомна кнопка тексту, розташовані справа під zoom-кнопками.
- **Attribution**: винесено з мапи в `.layers-panel-footer`.

### Адаптивність

Адаптивність базова. Панель шарів ховається/показується за кнопкою. Більша частина інтерфейсу розрахована на десктоп.

### Темізація

Темізація не реалізована. Інтерфейс світлий, мінімалістичний, з терракотовим акцентом.

### Доступність (a11y)

- Мова сторінки: `<html lang="uk">`.
- У інпутів і кнопок є `title` і `aria-label`.
- Модальні вікна закриваються по Escape.
- Іконки FontAwesome/Material використовуються без прихованих текстових альтернатив, що може бути проблемою для скринрідерів.

## ✅ Якість коду

### Лінтери і форматування

- **ESLint** із `@typescript-eslint/recommended`.
  - `no-console: 'warn'` — консоль активно використовується для логування.
  - `@typescript-eslint/no-explicit-any: 'warn'` — в проєкті багато `any`.
  - `no-restricted-syntax` для `index.ts` забороняє оголошення функцій, змінних і виразів, крім `ImportDeclaration`.
- **Prettier** налаштований стандартно: 2 пробіли, 80 символів, single quotes, trailing commas.

### Узгодження щодо іменування

- Файли: `camelCase.ts`.
- Функції та змінні: `camelCase`.
- CSS-класи: `kebab-case`.
- Коментарі: **українська мова**.

### TypeScript типізація

Типізація **слабка**:

- Багато використань `any`.
- Деякі інтерфейси містять `[key: string]: any`.
- Leaflet типізується через `declare const L: any` або `declare var L: any`.
- `state.ts` містить `as any` і `null as any`.
- `tsconfig.json` включає `strict: true`, але через безліч `any` перевірка фактично послаблена.

**Зони покращення:**

- Використовувати вже встановлений `@types/leaflet` замість `any`.
- Прибрати `[key: string]: any` із ключових інтерфейсів.
- Замінити `any` на конкретні типи в `main.ts`, `ui.ts`, `layers.ts`.

### Тести

**Тестів немає.** Директорія `tests/` містить лише `.DS_Store`. В `package.json` немає тестових скриптів.

### Документація в коді

- Коментарі переважно українською.
- JSDoc використовується рідко.
- Логування в консоль інтенсивне: багато `console.log`/`warn`/`error` у TS-коді.

### Потенційні проблеми безпеки

- Використання `innerHTML` у багатьох місцях (`main.ts`, `ui.ts`, `layers.ts`). Частина — генерація SVG/іконок, але редагування опису об’єкта допускає HTML, що може бути вектором XSS.
- `textContent` використовується в тултипах — це правильно й безпечно.

## 🔧 Ключові компоненти

### 1. `map-init.ts` — ініціалізація карти

Створює глобальний singleton `map`, задає центр Львова та базові tile-шари (План, Ландшафт, Супутник).

```typescript
export const center: [number, number] = [49.8397, 24.0297];
export const map = L.map('map', { center, zoom: 13, zoomControl: false });
```

### 2. `layers.ts` — керування шарами та persistence

Центральний модуль для шарів. Створює шари, зберігає/завантажує їх із `localStorage`, керує видимістю та порядком.

### 3. `draw-control.ts` — створення об’єктів

Ініціалізує `L.Control.Draw`, обробляє подію `draw:created`, створює `feature` для GeoJSON і додає об’єкт в активний шар. Також додає кастомну кнопку «Текст» у панель Leaflet.Draw.

### 4. `text-object.ts` — текстові об'єкти

Створює маркери з HTML-контентом, які масштабуються при зміні zoom і можуть обертатися.

### 5. `ui.ts` — користувацький інтерфейс

Найбільший модуль. Рендерить бічну панель шарів, модальні вікна, autocomplete для іконок і геопошук, тултипи, глобальний пошук об'єктів.

### 6. `historical-overlay.ts` / `historical-overlay-ui.ts` — історичні підкладки

Додають можливість завантажувати растрові зображення, позиціонувати їх на мапі, зберігати в `localStorage` і відновлювати при завантаженні.

### 7. `ai-assistant.ts` — AI-асистент

Пошук місць через Nominatim та автоматичне додавання маркерів. UI інтегрований у top bar, плаваюча кнопка прихована.

### 8. `api.ts` — програмний API

Глобальний об’єкт `LefleatApi` для додавання об'єктів з консолі.

## 📋 Патерни та best practices

### Характерні патерни

1. **Module-level singletons.** `map`, `customLayers`, `activeLayer` — глобальні змінні, експортовані з модулів.
2. **Callback-реєстри.** `layerIdToRenderObjectsList` в `ui.ts` — Map для оновлення UI за `id`.
3. **GeoJSON як canonical формат.** Усі користувацькі об’єкти перетворюються в GeoJSON FeatureCollection для зберігання.
4. **Base64 для зображень.** Прикріплені до об’єктів картинки кодуються в base64 і зберігаються в `localStorage`.

### Оптимізація продуктивності

- Формальної оптимізації немає (немає `requestIdleCallback`, lazy-loading, віртуалізації списків).
- Панель шарів може гальмувати при великій кількості об’єктів.
- Великі base64-зображення в `localStorage` швидко вичерпують квоту сховища.

### Асинхронні операції

- `fetch('material-icons-list.json')` у `state.ts` завантажує список іконок.
- `FileReader` використовується для читання завантажених зображень.
- Ініціалізація історичних підкладок у `index.ts` відбувається асинхронно з очікуванням DOM.

### Валідація даних

- Валідація імпорту мінімальна: `Array.isArray`, `try/catch` на парсинг.
- Немає централізованої схеми валідації.

### Локалізація

- Інтерфейс повністю українською мовою.
- Тексти вбудовані в HTML і TypeScript напряму.

## 🏭 Інфраструктура розробки

### Скрипти

| Скрипт | Призначення |
|--------|-------------|
| `npm run build` | Компіляція TypeScript в `dist/` |
| `npm run lint` | ESLint для `.ts` і `.js` |
| `npm run lint:fix` | Автофікс ESLint |
| `npm run format` | Prettier write |
| `npm run check-rules` | lint + prettier --check |
| `npm run dev` | build + check-rules |
| `npm run serve` | локальний HTTP-сервер на порту 8090 |

### Середовище розробки

- `.cursor/rules/rule1.mdc` порожній.
- `.vscode/`, `.idea/` ігноруються git.

### Pre-commit hooks / CI/CD / Docker

- **Pre-commit hooks немає**.
- **CI/CD немає**.
- **Docker немає**.

### Дебаг-файли

Директорія `del/` містить дебаг-скрипти. Згідно з `RULES.md`, вони не повинні імпортуватися продакшеном. В `index.html` підключені `overlay-position-fix.js` і `drag-save-fix.js` з кореня — це тимчасові workaround-файли.

## 📋 Висновки та рекомендації

### Сильні сторони

1. **Зрозуміла модульна структура.** Кожен файл відповідає за одну область.
2. **Багатий функціонал:** шари, об’єкти, історичні підкладки, імпорт/експорт GeoJSON/KMZ, AI-асистент, вимірювання, спотворювані зображення, кастомні маркери.
3. **Україномовний інтерфейс** — рідкість для open-source гео-інструментів.
4. **Наявність правил розробки** (`RULES.md`) і лінтерів.
5. **Автономність:** працює локально без сервера й бази даних.

### Області для покращення

1. **Типізація.** Використовувати `@types/leaflet`, зменшити кількість `any`, типізувати глобальний стан.
2. **Безпека.** Переглянути використання `innerHTML` для `description`; впровадити санітизацію або `textContent` + Markdown-рендер.
3. **Управління станом.** Розглянути легкий стор або pub/sub замість mutable module-level змінних.
4. **Продуктивність.** Відмовитися від base64-зберігання великих зображень в `localStorage`; використовувати IndexedDB.
5. **Інфраструктура.** Додати `husky` + `lint-staged`, GitHub Actions для перевірки лінтера.
6. **Очищення.** Прибрати `overlay-position-fix.js` і `drag-save-fix.js` з `index.html`, якщо вони більше не потрібні; видалити порожні `.cursor/rules`.

### Рівень складності проєкту

**Junior/Middle friendly.** Застосунок невеликий, без складних абстракцій, але потребує розуміння Leaflet API, GeoJSON і DOM-маніпуляцій.

### Підсумок

Lefleat — це робочий картографічний застосунок на Vanilla TypeScript + Leaflet з явним розбиттям по модулях і свіжим світлим UI. Він добре підходить для швидкого прототипування та особистого використання, але перед масштабуванням потребує доробки типізації, тестів, безпеки й інфраструктури.
