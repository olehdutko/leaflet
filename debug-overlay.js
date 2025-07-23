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
    debugLog('- debugOverlay.geojson() - аналіз GeoJSON об\'єктів');
    debugLog('- debugOverlay.colors() - перевірка кольорів об\'єктів');
    debugLog('- debugOverlay.checkCleanup(url) - перевірка очищення overlay');

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

    // Додаємо функцію аналізу GeoJSON об'єктів
    window.debugOverlay.geojson = function () {
        debugLog('=== АНАЛІЗ GEOJSON ОБ\'ЄКТІВ ===');

        if (!window.customLayers || window.customLayers.length === 0) {
            debugLog('❌ customLayers не знайдено або порожній');
            return;
        }

        let totalObjects = 0;
        let visibleObjects = 0;

        window.customLayers.forEach((layer, idx) => {
            const objectCount = layer.featureGroup.getLayers().length;
            const visibleCount = layer.featureGroup.getLayers().filter(l => window.map.hasLayer(l)).length;

            totalObjects += objectCount;
            visibleObjects += visibleCount;

            debugLog(`Шар ${idx} "${layer.title}": ${objectCount} об'єктів, ${visibleCount} видимих, шар видимий: ${layer.visible}`);

            if (objectCount > visibleCount && layer.visible) {
                debugLog(`🚨 ПРОБЛЕМА: У видимому шарі ${idx} не всі об'єкти відображаються!`);
            }

            if (objectCount === 0 && layer.visible) {
                debugLog(`⚠️ Видимий шар ${idx} порожній`);
            }
        });

        debugLog(`📊 Загалом: ${totalObjects} об'єктів, ${visibleObjects} видимих на карті`);

        if (totalObjects > 0 && visibleObjects === 0) {
            debugLog('🚨 КРИТИЧНА ПРОБЛЕМА: Є об\'єкти, але жоден не видимий на карті!');
            debugLog('💡 Можливі причини:');
            debugLog('   - featureGroup не додано на карту');
            debugLog('   - Асинхронна проблема з завантаженням');
            debugLog('   - Конфлікт з іншими шарами');
        }
    };

    // Додаємо функцію аналізу кольорів об'єктів
    window.debugOverlay.colors = function () {
        debugLog('=== АНАЛІЗ КОЛЬОРІВ ОБ\'ЄКТІВ ===');

        if (!window.customLayers || window.customLayers.length === 0) {
            debugLog('❌ customLayers не знайдено або порожній');
            return;
        }

        window.customLayers.forEach((layer, layerIdx) => {
            debugLog(`\n--- Шар ${layerIdx} "${layer.title}" ---`);

            layer.featureGroup.getLayers().forEach((obj, objIdx) => {
                const objType = obj instanceof L.Marker && !(obj instanceof L.CircleMarker) ? 'marker' :
                    obj instanceof L.CircleMarker ? 'circle' :
                        obj instanceof L.Polygon && !(obj instanceof L.Rectangle) ? 'polygon' :
                            obj instanceof L.Rectangle ? 'rectangle' :
                                obj instanceof L.Polyline ? 'polyline' : 'unknown';

                const name = obj.properties?.name || '[без назви]';
                const color = obj.properties?.color || obj.options?.color || 'undefined';
                const fillColor = obj.properties?.fillColor || obj.options?.fillColor;

                if (objType === 'marker') {
                    const iconHtml = obj.getIcon && obj.getIcon().options && obj.getIcon().options.html;
                    const bgColor = iconHtml ? iconHtml.match(/background:([^;]+)/)?.[1] : 'не знайдено';
                    debugLog(`  📍 ${name} (${objType}): колір=${color}, HTML background=${bgColor}`);

                    if (bgColor === 'undefined') {
                        debugLog(`    🚨 ПРОБЛЕМА: HTML містить background:undefined!`);
                    }
                } else {
                    debugLog(`  🎨 ${name} (${objType}): контур=${color}, заливка=${fillColor || 'немає'}`);

                    if (color === 'undefined') {
                        debugLog(`    🚨 ПРОБЛЕМА: Колір контуру undefined!`);
                    }
                }
            });
        });

        debugLog('\n💡 Якщо бачите "undefined" - це проблема з кольорами!');
    };

    // Додаємо функцію для перевірки очищення overlay після видалення
    window.debugOverlay.checkCleanup = function (overlayUrl) {
        debugLog('=== ПЕРЕВІРКА ОЧИЩЕННЯ OVERLAY ===');

        if (!overlayUrl) {
            debugLog('❌ Не вказано URL для перевірки');
            return;
        }

        const shortUrl = overlayUrl.substring(0, 100) + '...';
        debugLog(`🔍 Перевіряємо очищення для: ${shortUrl}`);

        let foundInMemory = 0;
        let foundInStorage = 0;

        // Перевіряємо в пам'яті (customLayers)
        if (window.customLayers && Array.isArray(window.customLayers)) {
            window.customLayers.forEach((layer, layerIdx) => {
                if (layer.featureGroup) {
                    // Перевіряємо images
                    if (layer.featureGroup.images) {
                        const found = layer.featureGroup.images.find(img => img.url === overlayUrl);
                        if (found) {
                            debugLog(`🚨 ЗНАЙДЕНО в пам'яті шар ${layerIdx} images`);
                            foundInMemory++;
                        }
                    }

                    // Перевіряємо overlays
                    if (layer.featureGroup.overlays) {
                        const found = layer.featureGroup.overlays.find(img => img.url === overlayUrl);
                        if (found) {
                            debugLog(`🚨 ЗНАЙДЕНО в пам'яті шар ${layerIdx} overlays`);
                            foundInMemory++;
                        }
                    }

                    // Перевіряємо overlayInstances
                    if (layer.featureGroup.overlayInstances) {
                        const found = layer.featureGroup.overlayInstances.find(inst =>
                            inst._customUrl === overlayUrl ||
                            inst._url === overlayUrl ||
                            inst.src === overlayUrl
                        );
                        if (found) {
                            debugLog(`🚨 ЗНАЙДЕНО в пам'яті шар ${layerIdx} overlayInstances`);
                            foundInMemory++;
                        }
                    }
                }
            });
        }

        // Перевіряємо в localStorage
        const stored = localStorage.getItem('lefleat_layers');
        if (stored) {
            const parsed = JSON.parse(stored);
            parsed.forEach((layer, layerIdx) => {
                if (layer.featureGroup) {
                    // Перевіряємо images
                    if (layer.featureGroup.images) {
                        const found = layer.featureGroup.images.find(img => img.url === overlayUrl);
                        if (found) {
                            debugLog(`🚨 ЗНАЙДЕНО в localStorage шар ${layerIdx} images`);
                            foundInStorage++;
                        }
                    }

                    // Перевіряємо overlays
                    if (layer.featureGroup.overlays) {
                        const found = layer.featureGroup.overlays.find(img => img.url === overlayUrl);
                        if (found) {
                            debugLog(`🚨 ЗНАЙДЕНО в localStorage шар ${layerIdx} overlays`);
                            foundInStorage++;
                        }
                    }
                }
            });
        }

        // Перевіряємо DOM
        const domElements = document.querySelectorAll(`img.leaflet-image-layer[src="${overlayUrl}"]`);

        debugLog(`📊 Результати перевірки:`);
        debugLog(`   Знайдено в пам'яті: ${foundInMemory}`);
        debugLog(`   Знайдено в localStorage: ${foundInStorage}`);
        debugLog(`   Знайдено в DOM: ${domElements.length}`);

        if (foundInMemory === 0 && foundInStorage === 0 && domElements.length === 0) {
            debugLog('✅ УСПІХ: Overlay повністю очищено!');
        } else {
            debugLog('❌ ПРОБЛЕМА: Overlay не повністю очищено!');
            if (foundInMemory > 0) debugLog('   🔧 Потрібно очистити пам\'ять');
            if (foundInStorage > 0) debugLog('   🔧 Потрібно очистити localStorage');
            if (domElements.length > 0) debugLog('   🔧 Потрібно очистити DOM');
        }
    };
} 