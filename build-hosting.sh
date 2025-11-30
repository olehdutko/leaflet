#!/bin/bash

echo "🚀 Створення production build для хостингу..."

# Очищаємо папку hosting
rm -rf hosting
mkdir hosting

# Збираємо проект
echo "📦 Збірка проекту..."
npx vite build

# Копіюємо зібрані файли
echo "📋 Копіювання файлів..."
cp -r dist/* hosting/
cp index.html hosting/
cp style.css hosting/
cp favicon.ico hosting/
cp leaflet.distortableimage.js hosting/

# Створюємо додаткові файли для хостингу
echo "⚙️ Створення конфігураційних файлів..."

# Service Worker
cat > hosting/sw.js << 'EOF'
const CACHE_NAME = 'lefleat-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/favicon.ico',
  '/leaflet.distortableimage.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
EOF

# Manifest
cat > hosting/manifest.json << 'EOF'
{
  "name": "Мапа Львова на Leaflet",
  "short_name": "Мапа Львова",
  "description": "Інтерактивна мапа Львова з можливістю додавання власних шарів, об'єктів та зображень",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1976d2",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "16x16 32x32",
      "type": "image/x-icon"
    },
    {
      "src": "favicon.ico",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "favicon.ico",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "categories": ["maps", "navigation", "utilities"],
  "lang": "uk",
  "dir": "ltr"
}
EOF

# .htaccess
cat > hosting/.htaccess << 'EOF'
# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Set browser caching
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/ico "access plus 1 year"
    ExpiresByType image/icon "access plus 1 year"
    ExpiresByType text/plain "access plus 1 month"
    ExpiresByType application/x-shockwave-flash "access plus 1 month"
    ExpiresByType text/html "access plus 1 hour"
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Handle SPA routing
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

# MIME types
<IfModule mod_mime.c>
    AddType application/javascript .js
    AddType text/css .css
    AddType image/x-icon .ico
    AddType application/json .json
</IfModule>
EOF

echo "✅ Готово! Папка hosting/ створена успішно."
echo "📁 Файли готові для завантаження на хостинг:"
echo "   - hosting/index.html"
echo "   - hosting/main.js"
echo "   - hosting/style.css"
echo "   - hosting/favicon.ico"
echo "   - hosting/leaflet.distortableimage.js"
echo "   - hosting/sw.js (Service Worker)"
echo "   - hosting/manifest.json (PWA)"
echo "   - hosting/.htaccess (Apache налаштування)"
echo ""
echo "🚀 Інструкції для розміщення дивіться в hosting/README.md" 