# Мапа Львова - Інструкції для розміщення

Цей проект представляє інтерактивну мапу Львова, створену на основі Leaflet з можливістю додавання власних шарів, об'єктів та зображень.

## 📁 Структура файлів

```
hosting/
├── index.html              # Головна сторінка
├── style.css               # Стилі додатку
├── main.js                 # Основна логіка (зібрана Vite)
├── favicon.ico             # Іконка сайту
├── leaflet.distortableimage.js # Плагін для деформації зображень
├── sw.js                   # Service Worker для PWA
├── manifest.json           # PWA маніфест
├── .htaccess               # Налаштування Apache
└── README.md               # Цей файл
```

## 🚀 Розміщення на хостингу

### Варіант 1: Звичайний веб-хостинг (Apache/Nginx)

1. **Завантажте всі файли** з папки `hosting/` на ваш хостинг
2. **Розмістіть файли** в кореневій папці вашого домену або в підпапці
3. **Переконайтеся**, що сервер підтримує:
   - JavaScript (ES6 modules)
   - HTTPS (для PWA функціональності)
   - MIME типи для .js, .css, .ico файлів

### Варіант 2: GitHub Pages

1. **Створіть репозиторій** на GitHub
2. **Завантажте файли** з папки `hosting/` в репозиторій
3. **Увімкніть GitHub Pages** в налаштуваннях репозиторію
4. **Виберіть гілку** (зазвичай `main` або `gh-pages`)

### Варіант 3: Netlify/Vercel

1. **Створіть акаунт** на Netlify або Vercel
2. **Підключіть GitHub репозиторій** або завантажте файли
3. **Налаштуйте домен** (опціонально)

## ⚙️ Налаштування

### Для Apache серверів
Файл `.htaccess` вже налаштований для:
- Стиснення файлів (gzip)
- Кешування браузера
- Безпечних заголовків
- Обробки SPA маршрутизації

### Для Nginx серверів
Додайте в конфігурацію:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}

# Gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Cache static files
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 📱 PWA функціональність

Проект підтримує PWA (Progressive Web App):
- **Service Worker** (`sw.js`) - для кешування та офлайн роботи
- **Web App Manifest** (`manifest.json`) - для встановлення на пристрій
- **Responsive дизайн** - адаптивний для мобільних пристроїв

## 🔧 Технічні вимоги

### Браузери
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

### Сервер
- Підтримка HTTPS (для PWA)
- MIME типи для JavaScript модулів
- Мінімум 50MB вільного місця

## 📊 Оптимізація

Проект вже оптимізований:
- **Мініфікований JavaScript** (через Vite)
- **Стиснення файлів** (gzip)
- **Кешування браузера**
- **Lazy loading** для зображень
- **Preload критичних ресурсів**

## 🐛 Вирішення проблем

### Проблема: "Module not found"
**Рішення:** Переконайтеся, що сервер правильно обробляє JavaScript модулі

### Проблема: "Service Worker not registered"
**Рішення:** Сайт повинен працювати через HTTPS

### Проблема: "Map not loading"
**Рішення:** Перевірте доступ до зовнішніх ресурсів (Leaflet CDN)

## 📞 Підтримка

Якщо у вас виникли проблеми:
1. Перевірте консоль браузера на помилки
2. Переконайтеся, що всі файли завантажені
3. Перевірте налаштування сервера

**Контакт:** oleh.dutko@gmail.com

## 📄 Ліцензія

Цей проект розповсюджується під ліцензією MIT. 