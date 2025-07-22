// Додаємо до консолі браузера для дебагінгу проблеми з overlay
console.log('🔍 Debug overlay script loaded - VERSION 2.0 (Fixed double loading)');

// Лічильник викликів функцій
window.debugCallCounts = {
    loadLayersFromStorage: 0,
    restoreOverlaysForFeatureGroup: 0,
    removeAllOverlaysFromFeatureGroup: 0
};

// Функція для детального логування
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] 🐛 ${message}`, data || '');
}

// Перехоплюємо всі overlay на карті
function analyzeOverlays() {
    debugLog('=== АНАЛІЗ OVERLAY НА КАРТІ ===');

    // Шукаємо всі leaflet-image-layer елементи
    const imageElements = document.querySelectorAll('img.leaflet-image-layer');
    debugLog(`Знайдено DOM елементів зображень: ${imageElements.length}`);

    // Групуємо за src
    const srcCounts = {};
    imageElements.forEach(img => {
        const src = img.src.substring(0, 100) + '...';
        srcCounts[src] = (srcCounts[src] || 0) + 1;
    });

    Object.keys(srcCounts).forEach(src => {
        if (srcCounts[src] > 1) {
            debugLog(`🚨 ДУБЛІКАТ DOM елементу: ${srcCounts[src]} копій`, src);
        } else {
            debugLog(`✅ Унікальний DOM елемент`, src);
        }
    });

    // Аналізуємо Leaflet шари
    if (typeof customLayers !== 'undefined') {
        debugLog(`Кількість шарів: ${customLayers.length}`);
        customLayers.forEach((layer, idx) => {
            const overlaysCount = layer.featureGroup?.overlays?.length || 0;
            const imagesCount = layer.featureGroup?.images?.length || 0;
            const instancesCount = layer.featureGroup?.overlayInstances?.length || 0;

            debugLog(`Шар ${idx}: overlays=${overlaysCount}, images=${imagesCount}, instances=${instancesCount}`);

            if (layer.featureGroup?.overlays) {
                const overlayUrls = layer.featureGroup.overlays.map(o => o.url?.substring(0, 50) + '...');
                const uniqueUrls = new Set(overlayUrls);
                if (overlayUrls.length !== uniqueUrls.size) {
                    debugLog(`🚨 ДУБЛІКАТИ в overlays шару ${idx}:`, overlayUrls);
                }
            }
        });
    }
}

// Функція для моніторингу подій edit
function monitorEditEvents() {
    debugLog('=== МОНІТОРИНГ EDIT ПОДІЙ ===');

    // Перехоплюємо створення нових overlay
    const originalDistortableImageOverlay = L.distortableImageOverlay;
    let overlayCounter = 0;

    L.distortableImageOverlay = function (url, options) {
        overlayCounter++;
        const overlay = originalDistortableImageOverlay.call(this, url, options);
        const overlayId = `debug_${overlayCounter}_${Date.now()}`;
        overlay._debugId = overlayId;

        debugLog(`➕ Створено overlay ${overlayId}`, { url: url?.substring(0, 50) + '...', options });

        // Перехоплюємо події edit
        const originalOn = overlay.on;
        overlay.on = function (type, fn, context) {
            if (type === 'edit') {
                debugLog(`🎧 Підписка на edit для overlay ${overlayId}`);
                const wrappedFn = function (...args) {
                    debugLog(`🔄 Edit подія для overlay ${overlayId}`, {
                        bounds: overlay.getBounds?.(),
                        corners: overlay.getCorners?.()?.length
                    });
                    return fn.apply(this, args);
                };
                return originalOn.call(this, type, wrappedFn, context);
            }
            return originalOn.call(this, type, fn, context);
        };

        return overlay;
    };

    // Копіюємо всі властивості
    Object.setPrototypeOf(L.distortableImageOverlay, originalDistortableImageOverlay);
    Object.keys(originalDistortableImageOverlay).forEach(key => {
        L.distortableImageOverlay[key] = originalDistortableImageOverlay[key];
    });
}

// Функція для аналізу localStorage
function analyzeLocalStorage() {
    debugLog('=== АНАЛІЗ LOCAL STORAGE ===');

    const data = localStorage.getItem('lefleat_layers');
    if (data) {
        const parsed = JSON.parse(data);
        debugLog(`LocalStorage містить ${parsed.length} шарів`);

        parsed.forEach((layer, idx) => {
            const overlaysCount = layer.overlays?.length || 0;
            debugLog(`LocalStorage шар ${idx}: ${overlaysCount} overlay`);

            if (layer.overlays && overlaysCount > 0) {
                const urls = layer.overlays.map(o => o.url?.substring(0, 50) + '...');
                const uniqueUrls = new Set(urls);
                if (urls.length !== uniqueUrls.size) {
                    debugLog(`🚨 ДУБЛІКАТИ в localStorage шар ${idx}:`, urls);
                }
            }
        });
    } else {
        debugLog('LocalStorage порожній');
    }
}

// Запускаємо дебагінг
if (typeof window !== 'undefined') {
    // Додаємо глобальні функції для дебагу
    window.debugOverlay = {
        analyze: analyzeOverlays,
        monitorEvents: monitorEditEvents,
        localStorage: analyzeLocalStorage,
        full: function () {
            analyzeOverlays();
            analyzeLocalStorage();

            // Аналіз через 2 секунди для перевірки динамічних змін
            setTimeout(() => {
                debugLog('=== ПОВТОРНИЙ АНАЛІЗ ЧЕРЕЗ 2 СЕКУНДИ ===');
                analyzeOverlays();
            }, 2000);
        }
    };

    // Запускаємо моніторинг одразу
    monitorEditEvents();

    debugLog('✅ Debug overlay tools available at window.debugOverlay');
    debugLog('Використовуйте:');
    debugLog('- debugOverlay.analyze() - аналіз overlay на карті');
    debugLog('- debugOverlay.localStorage() - аналіз localStorage');
    debugLog('- debugOverlay.full() - повний аналіз');
    debugLog('- debugOverlay.callCounts() - лічильник викликів функцій');

    // Додаємо функцію показу лічильників
    window.debugOverlay.callCounts = function () {
        debugLog('=== ЛІЧИЛЬНИКИ ВИКЛИКІВ ФУНКЦІЙ ===');
        Object.keys(window.debugCallCounts).forEach(funcName => {
            const count = window.debugCallCounts[funcName];
            if (count > 1) {
                debugLog(`🚨 ${funcName}: ${count} викликів (можливо дублювання!)`);
            } else {
                debugLog(`✅ ${funcName}: ${count} виклик`);
            }
        });
    };
} 