# lefleat

## Короткий опис

Інтерактивна мапа Львова на базі Leaflet.js з можливістю ставити власні позначки, малювати лінії та полігони, зберігати дані в `localStorage`. Проєкт написаний на TypeScript, зібраний через Vite, має модульну архітектуру.

## Розташування на MacBook

```
~/projects/lefleat/
├── README.md                 # детальна документація проєкту
├── RULES.md                  # правила розробки
├── SEARCH_DOCUMENTATION.md   # документація пошуку
├── package.json              # Vite + TypeScript
├── vite.config.ts
├── tsconfig.json
├── index.html                # головна сторінка
├── index.ts                  # точка входу (тільки імпорти)
├── main.ts                   # основний код додатку
├── map-init.ts               # ініціалізація карти
├── layers.ts                 # управління шарами
├── objects.ts                # об'єкти карти
├── ui.ts                     # UI компоненти
├── state.ts                  # глобальний стан
├── utils.ts                  # утиліти
├── draw-control.ts           # контроль малювання
├── search-init.ts            # менеджер пошуку
├── style.css                 # стилі
├── build-hosting.sh          # скрипт збірки для хостингу
├── adapters/                 # адаптери
├── hosting/                  # файли хостингу
├── managers/                 # менеджери
├── services/                 # сервіси
│   ├── search-service.ts
│   └── object-search-service.ts
├── ui/                       # UI компоненти
│   ├── geo-search-ui.ts
│   └── object-search-ui.ts
├── utils/                    # додаткові утиліти
├── types/                    # TypeScript типи
├── tests/                    # тести
├── assets/                   # ресурси
└── dist/                     # збірка
```

## Стек технологій

| Компонент | Технологія |
|-----------|-----------|
| Карта | Leaflet.js |
| Мова | TypeScript 5 |
| Збірка | Vite |
| Лінтер | ESLint + Prettier |
| Зображення | Leaflet.DistortableImage (кастомна копія в корені) |
| Зберігання | Local Storage браузера |

## Команди для запуску

```bash
cd ~/projects/lefleat
npm install        # якщо node_modules відсутні
npm run dev        # vite dev server
```

### Інші корисні команди

```bash
npm run build              # зібрати TypeScript
npm run build:hosting      # ./build-hosting.sh — збірка для хостингу
npm run preview            # vite preview
npm run lint             # eslint
npm run lint:fix           # eslint --fix
npm run format             # prettier --write .
npm run check-rules        # lint + format check
npm run dev:build          # build + check-rules
```

## Важливі нотатки

- Проєкт має власні правила розробки в `RULES.md`.
- Пошук реалізований через `search-init.ts`, `services/search-service.ts`, `services/object-search-service.ts` — деталі в `SEARCH_DOCUMENTATION.md`.
- Є підтримка імпорту/експорту KMZ та GeoJSON.
- Всі дані користувача зберігаються в `localStorage` — для локального запуску не потрібен сервер/база даних.
- Проєкт має власну структуру з розділенням на сервіси, UI, менеджери та адаптери.

## Статус

- Інспектовано: 2026-06-17
- Запускався локально: невідомо, буде перевірено за запитом.

---

*Проєкт розташовано на MacBook `odutko@192.168.1.215` у `~/projects/lefleat`*
