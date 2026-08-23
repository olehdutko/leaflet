# Аналіз фронтенд кодової бази: Lefleat

## 📁 Структура проєкту

Lefleat — це невелике односторінкове браузерне застосунок (SPA) для роботи з інтерактивною картою Львова. Кодова база пласка: майже весь вихідний код лежить у корні репозиторію, що відповідає явному правилу проєкту «один функціональний блок — один файл».

```text
lefleat/
├── index.html              # Розмітка сторінки, CDN-залежності, точка входу скриптів
├── index.ts                # Точка входу TypeScript (лише імпорт main.js)
├── main.ts                 # Основна логіка застосунку: ініціалізація, імпорт/експорт, вимірювання
├── map-init.ts             # Створення екземпляра Leaflet-карти та базові tile-шари
├── layers.ts               # Керування користувацькими шарами, серіалізація в localStorage
├── draw-control.ts         # Інтеграція Leaflet.Draw: створення об’єктів на карті
├── objects.ts              # Застосування властивостей (колір, іконка, товщина) до гео-об’єктів
├── ui.ts                   # Рендер панелі шарів, модальних вікон, пошуку, тултипів
├── utils.ts                # Утиліти: типізація шарів Leaflet, тултипи, іконки маркерів
├── state.ts                # Мінімальний глобальний mutable-стейт
├── overlay-transform.ts    # Робота зі спотворюваними image-overlays (leaflet.distortableimage)
├── style.css               # Єдиний файл стилів інтерфейсу
├── package.json            # Залежності та npm-скрипти
├── tsconfig.json           # Конфігурація TypeScript
├── .eslintrc.js            # Правила ESLint
├── .prettierrc             # Форматування Prettier
├── RULES.md                # Правила організації коду
├── README.md               # Документація для користувачів
├── del/                    # Дебаг-скрипти (не імпортуються продакшеном)
└── dist/                   # Скомпільований JS (ігнорується git)
```

**Принципи організації коду:**

- **Feature-based розбиття по файлах.** Кожен модуль відповідає за одну функціональну область: карта, шари, малювання, UI, утиліти. Це не повноцінна feature-sliced архітектура, а радше «один файл — одна відповідальність».
- **Тонка точка входу.** `index.ts` містить лише імпорт `main.js` та один `console.log`, що закріплено правилами ESLint.
- **CDN-first підхід.** Усі основні бібліотеки (Leaflet, Leaflet.Draw, FontAwesome, Material Icons тощо) підключаються через CDN у `index.html`, а не через npm.
- **Mutable shared state.** `state.ts` експортує змінювані змінні (`materialIcons`, `currentEditingObject`), які імпортуються багатьма модулями. Це спрощена заміна повноцінному стору.

## 🛠 Технологічний стек

| Компонент | Технологія | Версія / Примітка |
|-----------|-----------|-------------------|
| Мова | TypeScript | 5.8.3 (`typescript` у `dependencies`) |
| Карта | Leaflet.js | CDN-версія (`unpkg.com`) |
| Малювання | Leaflet.Draw | CDN (`unpkg.com`) |
| Image overlays | leaflet-distortableimage | CDN + локальна копія `leaflet.distortableimage.js` |
| Вимірювання | Leaflet.PolylineMeasure | CDN |
| Імпорт KMZ | JSZip + leaflet-omnivore | CDN |
| UI-іконки | FontAwesome 6.4.2 + Material Icons | CDN |
| Drag-and-drop шарів | SortableJS | CDN |
| Збірка | TypeScript Compiler (`tsc`) | `target: ES6`, `module: ESNext` |
| Лінтер | ESLint 8 + @typescript-eslint | extends `recommended` |
| Форматування | Prettier 3 | 2 пробіли, 80 символів у рядку, single quotes, trailing commas |
| Зберігання | Browser `localStorage` | Ключі з префіксом `lefleat_` |
| Стилізація | Vanilla CSS | Один файл `style.css`, Grid/Flexbox |

**Важлива заувага:** незважаючи на те, що `PROJECT_DOC.md` згадує Vite, у реальному `package.json` немає `vite` ні в `dependencies`, ні в `devDependencies`. Збірка виконується через `tsc`, а в `index.html` підключається `./dist/index.js`. Це невідповідність між документацією та фактичним стеком.

### package.json scripts

```json
{
  "build": "tsc",
  "lint": "eslint . --ext .ts,.js",
  "lint:fix": "eslint . --ext .ts,.js --fix",
  "format": "prettier --write .",
  "check-rules": "npm run lint && npm run format --check",
  "dev": "npm run build && npm run check-rules"
}
```

- `dev` не запускає сервер розробки, а лише збирає й перевіряє правила. Локальний запуск відбувається відкриттям `index.html` у браузері.

## 🏗 Архітектура

### Компонентна модель

Застосунок не використовує React/Vue/Angular. Це **Vanilla TypeScript + DOM API**: рендер UI виконується через `document.createElement`, `element.innerHTML`, `element.textContent` та прямі маніпуляції з DOM. Можна умовно назвати архітектуру «jQuery-стиль без jQuery»: імперативний DOM-рендер, event-лістенери, глобальні змінні.

Приклад рендера списку об’єктів шару (`ui.ts`):

```typescript
export function updateObjectsListForLayer(layerObj: any) {
  const fn = layerIdToRenderObjectsList.get(layerObj.id);
  if (fn) fn();
}
```

Це callback-реєстр: при відкритті панелі шару реєструється функція рендера, і наступні зміни викликають її за `id`. Паттерн схожий на ручну реалізацію підписки без повноцінного pub/sub.

### Розділення логіки

Логіка розділена не через hooks/HOC, а через **ES6-модулі з чіткими імпортами**:

- `map-init.ts` — ініціалізація карти (singleton `export const map`).
- `layers.ts` — CRUD шарів, серіалізація/десеріалізація GeoJSON в `localStorage`.
- `draw-control.ts` — обробка подій `draw:created`, створення об’єктів.
- `objects.ts` — застосування візуальних властивостей до об’єктів Leaflet.
- `ui.ts` — DOM-UI: панель шарів, модалки, autocomplete, тултипи.
- `utils.ts` — чисті функції для визначення типу шару та генерації іконок.

Мережа імпортів між TypeScript-модулями:

```text
index -> main
main -> draw-control, layers, map-init, state, ui, utils
draw-control -> layers, map-init, ui, utils
layers -> map-init, objects, state, ui, utils
ui -> draw-control, layers, main, map-init, objects, state, utils
```

**Зверніть увагу:** `ui.ts` імпортує `draw-control`, а `draw-control` своєю чергою використовує `ui`. Також `ui -> main` і `main -> ui`. У коді є коментар `// видалено для уникнення циклічного імпорту` у `draw-control.ts`, але циклічні зв’язки між `main/ui/layers` лишаються. TypeScript із `moduleResolution: bundler` і `tsc` зазвичай справляються з такими циклами, але це ускладнює розуміння потоку даних.

### Управління станом

Центральний стан — це набір **module-level mutable exports**:

```typescript
// state.ts
export let materialIcons: string[] = [];
export const currentEditingObject = { value: null as any };
```

`currentEditingObject` — це об’єкт-обгортка, щоб різні модулі могли писати в одне й те саме поле за посиланням. Це спрощена альтернатива React-рефам або глобальному стору.

`layers.ts` містить ще один набір глобальних змінних:

```typescript
export let customLayers: LayerObj[] = [];
export let activeLayer: any = null;
export let layerId = 1;
```

Такий підхід працює для невеликого застосунку, але:

- відсутній єдиний джерело правди;
- налагодження складна, бо стан розмазано по модулях;
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

Завантаження назад (`loadLayersFromStorage`) використовує `L.geoJSON(...)` з колбеками `pointToLayer`, `style`, `onEachFeature`. Це стандартний Leaflet-паттерн.

Імпорт/експорт підтримує JSON, GeoJSON та KMZ. KMZ розбирається через `JSZip` і `leaflet-omnivore`, завантажені з CDN.

### Роутинг і навігація

Роутингу немає: застосунок односторінкове. Уся навігація відбувається через панель шарів, модальні вікна та карту.

### Обробка помилок і loading-станів

- **Помилки:** використовуються `try/catch` навколо парсингу JSON, GeoJSON-операцій та імпорту. Критичні помилки показуються через `alert()` (наприклад, помилка імпорту). Усього `alert()` зустрічається 4 рази, всі — у `main.ts`.
- **Loading-станів:** формальних loading-спінерів немає. Тривалі операції (наприклад, `FileReader.readAsDataURL`) виконуються асинхронно, але без візуальної індикації завантаження.

## 🎨 UI/UX і стилізація

### Підходи до стилізації

- **Один глобальний CSS-файл** `style.css` (~1630 рядків).
- **Немає CSS Modules, Sass, Tailwind або CSS-in-JS.** Усі стилі класичні, на селекторах.
- **4 CSS-змінних** (`--primary-color` тощо) — мінімальний рівень дизайн-системи.
- **2 медіа-запити** — базова адаптивність, переважно для панелі шарів на мобільних екранах.

### Дизайн-система / UI-kit

Повноцінного UI-kit немає, але є повторювані класи:

- `.btn-primary`, `.btn-secondary`, `.btn-danger` — кнопки.
- `.modal`, `.modal-content`, `.modal-header`, `.modal-body`, `.modal-footer` — модальні вікна.
- `.form-group`, `.color-palette`, `.color-swatch` — форми.
- `.layer-card` — картки шарів у бічній панелі.

Кольорова палітра жорстко задана в CSS і в коді: основний `#1976d2` (Material blue).

### Адаптивність

Адаптивність базова. Панель шарів (`#layers-panel-drawer`) ховається/показується за кнопкою. У CSS є `@media` для невеликих екранів, але більша частина інтерфейсу розрахована на десктоп (наприклад, модальне вікно редагування шириною ~520 px).

### Темізація

Темізація не реалізована. В `index.html` закоментований блок перемикача світлої/темної теми.

### Доступність (a11y)

- Мова сторінки задана: `<html lang="uk">`.
- У інпутів і кнопок є `title` і `aria`-подібні текстові підказки через `title`, але **систематичного використання ARIA-атрибутів немає**.
- Модальні вікна закриваються по Escape — цю вимогу задокументовано в `RULES.md`, але потрібно перевіряти вручну, що фокус дійсно trapped.
- Іконки Material Icons і FontAwesome використовуються без прихованих текстових альтернатив, що може погіршити доступність для скринрідерів.

## ✅ Якість коду

### Лінтери і форматування

- **ESLint** із `@typescript-eslint/recommended`. Важливі правила:
  - `no-console: 'warn'` — але консоль активно використовується для логування.
  - `@typescript-eslint/no-explicit-any: 'warn'` — проєкт містить ~301 використання `any`, тому warning-и, ймовірно, присутні.
  - `no-restricted-syntax` для `index.ts` забороняє оголошення функцій, змінних і виразів, крім `ImportDeclaration`.
- **Prettier** налаштований стандартно: 2 пробіли, 80 символів у рядку, single quotes, trailing commas.

### Узгодження щодо іменування

- Файли: `camelCase.ts`.
- Функції та змінні: `camelCase`.
- CSS-класи: `kebab-case`.
- Коментарі: **українська мова** (це явне правило `RULES.md`).

### TypeScript типізація

Типізація **слабка**:

- ~301 використання `any` у 10 TS-файлах.
- Багато інтерфейсів визначені, але з `[key: string]: any` — `ObjectProperties`, `OverlayData`, `OverlayImageMeta`.
- Leaflet типізується через `declare const L: any` або `declare var L: any`, що вимикає перевірку всієї бібліотеки.
- `state.ts` містить `as any` і `null as any`.
- `tsconfig.json` включає `strict: true`, але через безліч `any` і `ts-ignore` перевірка фактично послаблена вручну.

**Сильні сторони:**

- Є інтерфейси для основних сутностей (`LayerObj`, `ObjectProperties`).
- Функції експортуються явно, структура модулів зрозуміла.

**Зони покращення:**

- Встановити `@types/leaflet` і типізувати `L` замість `any`.
- Прибрати `[key: string]: any` із ключових інтерфейсів.
- Замінити `any` на конкретні типи в `main.ts`, `ui.ts`, `layers.ts`.

### Тести

**Тестів немає.** Директорія `tests/` містить лише `.DS_Store`. В `package.json` немає скриптів для тестів і немає тестових фреймворків.

### Документація в коді

- Коментарі переважно українською, часто у вигляді коротких пояснень (`// Виправляємо undefined значення`, `// Fallback до стандартного toGeoJSON`).
- JSDoc використовується рідко; в `layers.ts` є один JSDoc-блок для `createTileLayer`.
- Логування в консоль (`console.log`/`warn`/`error`) використовується дуже інтенсивно: ~159 викликів у TS-коді. Це допомагає налагодженню, але засмічує продакшен.

### Потенційні проблеми безпеки

- Використання `innerHTML` у 29 місцях (11 у `main.ts`, 16 у `ui.ts`, 2 у `layers.ts`). Частина з них — генерація SVG/іконок, але редагування опису об’єкта допускає HTML, що може бути вектором XSS, якщо користувацький ввід не санітизується.
- `textContent` використовується в тултипах — це правильно й безпечно.

## 🔧 Ключові компоненти

### 1. `map-init.ts` — ініціалізація карти

**Призначення:** створює глобальний singleton `map`, задає центр Львова та три базові tile-шари (План, Ландшафт, Супутник).

```typescript
import { map } from './map-init.js';

export const center: [number, number] = [49.8397, 24.0297];
export const tileLayerOptions = {
  "План": {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  },
  // ...
};
export const map = L.map('map', { center, zoom: 13 });
```

**API:** експортує `map`, `center`, `tileLayerOptions`. Усі модулі імпортують `map` звідси.

### 2. `layers.ts` — керування шарами та persistence

**Призначення:** центральний модуль для шарів. Створює шари, зберігає/завантажує їх із `localStorage`, керує видимістю та порядком.

```typescript
export let customLayers: LayerObj[] = [];
export let activeLayer: any = null;

export function saveLayersToStorage(): void {
  const layersData = customLayers.map(l => ({ /* GeoJSON + метадані */ }));
  localStorage.setItem('lefleat_layers', JSON.stringify(layersData));
}

export function loadLayersFromStorage(): boolean {
  const data = localStorage.getItem('lefleat_layers');
  if (!data) return false;
  // Парсинг, валідація, відновлення шарів
}
```

**Інтеграції:** залежить від `map-init`, `ui`, `objects`, `utils`, `state`.

### 3. `draw-control.ts` — створення об’єктів

**Призначення:** ініціалізує `L.Control.Draw`, обробляє подію `draw:created`, створює `feature` для GeoJSON і додає об’єкт в активний шар.

```typescript
map.on('draw:created', function (e: any) {
  const layer = e.layer;
  const type = e.layerType;
  // Генерація імені, розрахунок довжини/площі, створення feature
  layer.feature = {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: { name, description, color, weight, opacity, style }
  };
  activeLayer.addLayer(layer);
  saveLayersToStorage();
});
```

**Інтеграції:** `map-init`, `layers`, `utils`, `ui`.

### 4. `ui.ts` — користувацький інтерфейс

**Призначення:** найбільший модуль (~1509 рядків). Рендерить бічну панель шарів, модальні вікна, autocomplete для іконок і геопошук, тултипи.

```typescript
export function showEditModal(layer: any) {
  currentEditingObject.value = layer;
  const type = getObjectType(layer);
  const properties = getObjectProperties(layer);
  // Заповнення DOM-полів, показ/приховування груп контролів
  // Обробники onchange/onclick для кольору, товщини, іконки, зображення
}
```

**Інтеграції:** практично всі інші модулі (`state`, `map-init`, `utils`, `layers`, `objects`, `main`, `draw-control`).

### 5. `overlay-transform.ts` — спотворювані зображення

**Призначення:** окремий модуль для роботи з `leaflet.distortableimage`. Додає на карту растрові зображення з можливістю трансформації за кутами та зберігає їх в `localStorage`.

```typescript
export function addOverlay(map: L.Map, url: string) {
  const overlay = (window as any).L.distortableImageOverlay(url, {
    bounds, selected: true
  }).addTo(map);
  overlays.push(overlay);
  images.push({ url, bounds, corners: overlay.getCorners?.() });
  saveImages();
}
```

**Примітка:** цей модуль створює **власний екземпляр карти** в `initOverlayMap`, що конфліктує з основною картою з `map-init.ts`. У продакшені цей експорт, ймовірно, не використовується; основна логіка overlays знаходиться в `main.ts` і `layers.ts`.

## 📋 Патерни та best practices

### Характерні патерни

1. **Module-level singletons.** `map`, `customLayers`, `activeLayer` — глобальні змінні, експортовані з модулів.
2. **Callback-реєстри.** `layerIdToRenderObjectsList` в `ui.ts` — Map для оновлення UI за `id` без повноцінного pub/sub.
3. **GeoJSON як canonical формат.** Усі користувацькі об’єкти перетворюються в GeoJSON FeatureCollection для зберігання.
4. **Base64 для зображень.** Прикріплені до об’єктів картинки кодуються в base64 і зберігаються в `localStorage`, що швидко вичерпує квоту сховища.

### Оптимізація продуктивності

- Формальної оптимізації немає (немає `requestIdleCallback`, lazy-loading, віртуалізації списків).
- Панель шарів може гальмувати при великій кількості об’єктів, бо список рендериться повністю.
- `leaflet.distortableimage` — ресурсомістка бібліотека; великі зображення в base64 погіршують проблеми.

### Асинхронні операції

- `fetch('material-icons-list.json')` у `state.ts` завантажує список іконок.
- `FileReader` використовується для читання завантажених зображень.
- `import('./ui.js')` у `main.ts` для динамічного завантаження під час видалення overlay — цікавий патерн, але сумнівно необхідний, враховуючи що `ui` уже статично імпортується.

### Валідація даних

- Валідація імпорту є, але мінімальна: перевірка `Array.isArray`, `try/catch` на парсинг.
- Немає централізованої схеми валідації (zod, yup, jsonschema).
- `currentEditingObject` не типізований, що робить форми вразливими до runtime-помилок.

### Локалізація

- Інтерфейс повністю українською мовою.
- Тексти вбудовані в HTML і TypeScript напряму; немає файлів перекладів. Переклад на інші мови потребуватиме значної переробки.

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

### Середовище розробки

- `.cursor/rules/rule1.mdc` порожній (тільки frontmatter), тому Cursor-правила не задані.
- `.vscode/`, `.idea/` ігноруються git.
- `.opencode/` містить команди агента Opencode (speckit.*), але це інфраструктура агента, не проєкту.

### Pre-commit hooks / CI/CD / Docker

- **Pre-commit hooks немає** (немає `.husky/`, `lint-staged` тощо).
- **CI/CD немає**: у репозиторії немає `.github/workflows/`, `.gitlab-ci.yml` і т.д.
- **Docker немає**.

### Дебаг-файли

Директорія `del/` містить дебаг-скрипти (`debug-overlay.js`, `test-overlay-position.js` тощо). Згідно з `RULES.md`, вони не повинні імпортуватися продакшеном. В `index.html` підключені `overlay-position-fix.js` і `drag-save-fix.js` з кореня — це схоже на тимчасові workaround-файли, які краще перенести в `del/` або видалити.

## 📋 Висновки та рекомендації

### Сильні сторони

1. **Зрозуміла модульна структура.** Кожен файл відповідає за одну область; точка входу `index.ts` дійсно тонка.
2. **Багатий функціонал для картографії:** шари, об’єкти, імпорт/експорт GeoJSON/KMZ, вимірювання, спотворювані зображення, кастомні маркери.
3. **Україномовний інтерфейс** — рідкість для open-source гео-інструментів.
4. **Наявність правил розробки** (`RULES.md`) і лінтерів показує прагнення до порядку.
5. **Автономність:** працює локально без сервера й бази даних.

### Області для покращення

1. **Розбіжність у документації.** `PROJECT_DOC.md` згадує Vite, `vite.config.ts`, `adapters/`, `services/`, `managers/` — але в репозиторії цього немає. Потрібно синхронізувати документацію або видалити застарілі файли.
2. **Відсутність тестів.** Додати хоча б unit-тести на утиліти (`utils.ts`, `objects.ts`) та інтеграційні тести на серіалізацію/десеріалізацію шарів.
3. **Слабка типізація.** ~301 `any` і відсутність `@types/leaflet` знижують надійність. План поетапної типізації: почати з `map-init.ts`, `utils.ts`, `objects.ts`.
4. **Безпека.** Переглянути використання `innerHTML`, особливо для `description`. Впровадити санітизацію (DOMPurify) або перейти на `textContent` + Markdown-рендер.
5. **Управління станом.** Розглянути легкий стор (Zustand / tiny-emitter / власний pub-sub) замість mutable module-level змінних.
6. **Продуктивність.** Відмовитися від base64-зберігання великих зображень в `localStorage`; використовувати IndexedDB або посилання на файли.
7. **Інфраструктура.** Додати `husky` + `lint-staged`, GitHub Actions для перевірки лінтера, скрипт preview-сервера.
8. **Очищення.** Прибрати `overlay-position-fix.js` і `drag-save-fix.js` з `index.html`, якщо вони більше не потрібні; видалити порожні/застарілі `.cursor/rules`.

### Рівень складності проєкту

**Junior/Middle friendly.** Застосунок невеликий, без складних абстракцій, але потребує розуміння Leaflet API, GeoJSON і DOM-маніпуляцій. Для senior-розробника проєкт сприйматиметься як прототип/utility, що потребує технічного боргу за типізацією, тестами й архітектурою стану.

### Підсумок

Lefleat — це робочий картографічний застосунок на Vanilla TypeScript + Leaflet з явним розбиттям по модулях. Він добре підходить для швидкого прототипування та особистого використання, але перед масштабуванням або публікацією потребує доробки типізації, тестів, безпеки й інфраструктури.
