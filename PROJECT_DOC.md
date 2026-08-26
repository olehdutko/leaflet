# lefleat

## Короткий опис

Lefleat — це інтерактивна мапа Львова на базі Leaflet.js. Користувач може ставити маркери, малювати лінії, полігони та текстові позначки, додавати історичні підкладки, зберігати дані в `localStorage`. Проєкт написаний на TypeScript, зібраний через TypeScript Compiler (`tsc`), має пласку модульну архітектуру.

## Розташування на MacBook

```
~/projects/lefleat/
├── README.md                 # детальна документація проєкту
├── RULES.md                  # правила розробки
├── OBJECT_IMAGES_FEATURE.md  # документація зображень об'єктів
├── OVERLAY_DELETE_FIX.md     # документація видалення overlay
├── PROJECT_DOC.md            # цей файл
├── SETUP_INSTRUCTIONS.md     # інструкції з налаштування
├── package.json              # залежності та npm-скрипти
├── tsconfig.json             # конфігурація TypeScript
├── index.html                # головна сторінка
├── index.ts                  # точка входу (тільки імпорти)
├── main.ts                   # основний код додатку
├── map-init.ts               # ініціалізація карти
├── layers.ts                 # управління шарами
├── objects.ts                # об'єкти карти
├── ui.ts                     # UI компоненти
├── draw-control.ts           # контроль малювання
├── text-object.ts            # текстові об'єкти на мапі
├── ai-assistant.ts           # AI-асистент
├── api.ts                    # програмний API
├── historical-overlay.ts     # історичні підкладки
├── historical-overlay-ui.ts  # UI для історичних підкладок
├── overlay-transform.ts      # трансформація overlay
├── state.ts                  # глобальний стан
├── utils.ts                  # утиліти
├── style.css                 # стилі
├── material-icons-list.json  # список іконок Material
├── favicon.*                 # favicon різних розмірів
├── build-hosting.sh          # скрипт збірки для хостингу
├── del/                      # дебаг-скрипти
├── tests/                    # місце для тестів (зараз порожнє)
├── assets/                   # ресурси
├── hosting/                  # файли хостингу
└── dist/                     # збірка (ігнорується git)
```

## Стек технологій

| Компонент | Технологія |
|-----------|-----------|
| Карта | Leaflet.js |
| Мова | TypeScript 5 |
| Збірка | TypeScript Compiler (`tsc`) |
| Лінтер | ESLint + Prettier |
| Зображення | Leaflet.DistortableImage (кастомна копія в корені) |
| Зберігання | Browser `localStorage` |
| Іконки | FontAwesome 6, Material Icons |

## Команди для запуску

```bash
cd ~/projects/lefleat
npm install        # якщо node_modules відсутні
npm run build      # зібрати TypeScript
npm run serve      # python3 http.server 8090 --directory .
```

Після цього відкрий `http://localhost:8090` у браузері.

### Інші корисні команди

```bash
npm run build              # скомпілювати TypeScript в dist/
npm run lint               # eslint
npm run lint:fix           # eslint --fix
npm run format             # prettier --write .
npm run check-rules        # lint + prettier --check
npm run dev                # build + check-rules
npm run serve              # локальний HTTP-сервер на порту 8090
```

## Основні можливості

- **Мапа Львова** на Leaflet з кількома типами базових підкладок.
- **Шари користувача**: створення, видимість, порядок, збереження в `localStorage`.
- **Гео-об'єкти**: маркери, лінії, полігони, кола, прямокутники, текст на мапі.
- **Історичні підкладки**: завантаження зображень, позиціонування на мапі, трансформація, збереження.
- **AI-асистент**: пошук місць через Nominatim і автоматичне додавання маркерів.
- **Геопошук**: пошук місць за назвою через OpenStreetMap / Nominatim.
- **Глобальний пошук об'єктів**: пошук серед усіх об'єктів у шарах.
- **Вимірювання**: інструменти для вимірювання відстаней.
- **Імпорт / Експорт**: GeoJSON, KMZ, JSON.
- **Зображення об'єктів**: прикріплення base64-зображень до об'єктів.
- **Програмний API**: глобальний `LefleatApi` для керування мапою з консолі.

## Важливі нотатки

- Проєкт має власні правила розробки в `RULES.md`.
- Всі дані користувача зберігаються в `localStorage` — для локального запуску не потрібен сервер/база даних.
- `index.ts` містить тільки імпорти та мінімальну ініціалізацію.
- Компільовані файли потрапляють у `dist/` і не комітяться в git (див. `.gitignore`).
