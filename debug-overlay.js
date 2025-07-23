// Додаємо до консолі браузера для дебагінгу проблеми з overlay
console.log('🔍 Debug overlay script loaded - VERSION ' + (window.OVERLAY_FIX_VERSION || 'v2.6'));
console.log('📊 Overlay fix version:', window.OVERLAY_FIX_VERSION || 'v2.6');

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

    // Додаємо функцію для перевірки оновлень localStorage
    window.debugOverlay.trackEdits = function () {
        debugLog('=== ВІДСТЕЖЕННЯ EDIT ПОДІЙ ===');
        debugLog('Починаємо відстеження змін overlay...');

        // Зберігаємо поточний стан для порівняння
        const initialState = JSON.parse(localStorage.getItem('lefleat_layers') || '[]');
        debugLog('Початковий стан localStorage:', initialState.length + ' шарів');

        // Функція для порівняння станів
        window.debugOverlay.compareState = function () {
            const currentState = JSON.parse(localStorage.getItem('lefleat_layers') || '[]');

            debugLog('=== ПОРІВНЯННЯ СТАНІВ ===');
            debugLog('Початкових шарів:', initialState.length);
            debugLog('Поточних шарів:', currentState.length);

            currentState.forEach((layer, layerIdx) => {
                if (layer.overlays && layer.overlays.length > 0) {
                    layer.overlays.forEach((overlay, overlayIdx) => {
                        const initial = initialState[layerIdx]?.overlays?.[overlayIdx];
                        if (initial) {
                            const boundsChanged = JSON.stringify(initial.bounds) !== JSON.stringify(overlay.bounds);
                            const cornersChanged = JSON.stringify(initial.corners) !== JSON.stringify(overlay.corners);

                            if (boundsChanged || cornersChanged) {
                                debugLog(`🔄 Шар ${layerIdx}, overlay ${overlayIdx} ЗМІНЕНО:`);
                                if (boundsChanged) debugLog('  - bounds змінено');
                                if (cornersChanged) debugLog('  - corners змінено');
                            } else {
                                debugLog(`✅ Шар ${layerIdx}, overlay ${overlayIdx} без змін`);
                            }
                        }
                    });
                }
            });
        };

        debugLog('Тепер перемістіть overlay і викличте debugOverlay.compareState()');
    };

    // Функція для автоматичного відстеження
    window.debugOverlay.autoTrack = function (seconds = 10) {
        debugLog(`=== АВТОМАТИЧНЕ ВІДСТЕЖЕННЯ ${seconds}с ===`);

        const initialState = JSON.parse(localStorage.getItem('lefleat_layers') || '[]');
        let changeCount = 0;

        const interval = setInterval(() => {
            const currentState = JSON.parse(localStorage.getItem('lefleat_layers') || '[]');

            // Швидка перевірка на зміни
            const currentHash = JSON.stringify(currentState);
            const initialHash = JSON.stringify(initialState);

            if (currentHash !== initialHash) {
                changeCount++;
                debugLog(`📊 Зміна #${changeCount} виявлена в localStorage`);
            }

        }, 500); // Перевіряємо кожні 0.5 секунди

        setTimeout(() => {
            clearInterval(interval);
            debugLog(`🏁 Відстеження завершено. Всього змін: ${changeCount}`);
            if (changeCount === 0) {
                debugLog('⚠️ ПРОБЛЕМА: localStorage не оновлювався!');
                debugLog('Перевірте логи edit подій в консолі');
            } else {
                debugLog('✅ localStorage оновлюється правильно');
            }
        }, seconds * 1000);

        debugLog('Тепер переміщайте overlay - я відстежую зміни...');
    };

    // Функція для перевірки edit обробників
    window.debugOverlay.checkEditHandlers = function () {
        debugLog('=== ПЕРЕВІРКА EDIT ОБРОБНИКІВ ===');

        if (!window.customLayers) {
            debugLog('❌ customLayers недоступні');
            return;
        }

        let totalOverlays = 0;
        let overlaysWithHandlers = 0;

        window.customLayers.forEach((layer, layerIdx) => {
            if (layer.featureGroup && layer.featureGroup.overlayInstances) {
                layer.featureGroup.overlayInstances.forEach((overlay, overlayIdx) => {
                    totalOverlays++;

                    // Перевіряємо чи є edit обробники
                    if (overlay._events && overlay._events.edit) {
                        overlaysWithHandlers++;
                        debugLog(`✅ Шар ${layerIdx}, overlay ${overlayIdx}: є edit обробник`);
                    } else {
                        debugLog(`❌ Шар ${layerIdx}, overlay ${overlayIdx}: НЕМАЄ edit обробника!`);
                    }
                });
            }
        });

        debugLog(`📊 Підсумок: ${overlaysWithHandlers}/${totalOverlays} overlay мають edit обробники`);

        if (totalOverlays === 0) {
            debugLog('⚠️ На карті немає overlay');
        } else if (overlaysWithHandlers < totalOverlays) {
            debugLog('⚠️ ПРОБЛЕМА: Деякі overlay не мають edit обробників!');
        } else {
            debugLog('✅ Всі overlay мають edit обробники');
        }
    };

    // Оновлюємо список доступних команд
    window.debugOverlay.help = function () {
        debugLog('=== ДОСТУПНІ КОМАНДИ DEBUG OVERLAY ===');
        debugLog(`📊 Версія виправлень: ${window.OVERLAY_FIX_VERSION || 'v2.6'}`);
        debugLog('');
        debugLog('debugOverlay.full() - повний аналіз системи');
        debugLog('debugOverlay.analyze() - аналіз поточних overlay');
        debugLog('debugOverlay.localStorage() - стан localStorage');
        debugLog('debugOverlay.callCounts() - лічильники функцій');
        debugLog('debugOverlay.checkCleanup(url) - перевірка очищення');
        debugLog('');
        debugLog('=== НОВІ КОМАНДИ ДЛЯ LOCALSTORAGE ===');
        debugLog('debugOverlay.trackEdits() - відстеження edit подій');
        debugLog('debugOverlay.compareState() - порівняння з початковим станом');
        debugLog('debugOverlay.autoTrack(10) - автоматичне відстеження 10 секунд');
        debugLog('debugOverlay.checkEditHandlers() - перевірка edit обробників');
        debugLog('');
        debugLog('🔍 Для перевірки localStorage: перемістіть overlay і викличте trackEdits()');
    };

    // Функція для детального тестування першого переміщення з координатами
    window.debugOverlay.testFirstMoveDetailed = function () {
        debugLog('=== ДЕТАЛЬНИЙ ТЕСТ ПЕРШОГО ПЕРЕМІЩЕННЯ ===');
        debugLog('Перевіряємо збереження координат одразу після додавання overlay');

        // Записуємо початковий стан з деталями
        const beforeAdd = JSON.parse(localStorage.getItem('lefleat_layers') || '[]');

        debugLog('📊 Початковий детальний стан localStorage:');
        beforeAdd.forEach((layer, idx) => {
            if (layer.overlays && layer.overlays.length > 0) {
                debugLog(`  Шар ${idx}: ${layer.overlays.length} overlay`);
                layer.overlays.forEach((ov, ovIdx) => {
                    debugLog(`    Overlay ${ovIdx}:`);
                    debugLog(`      bounds: ${JSON.stringify(ov.bounds)}`);
                    debugLog(`      corners: ${ov.corners ? ov.corners.length + ' точок' : 'немає'}`);
                });
            } else {
                debugLog(`  Шар ${idx}: немає overlay`);
            }
        });

        // Встановлюємо timestamp
        window.debugOverlay._testStartTime = Date.now();
        window.debugOverlay._beforeState = beforeAdd;

        debugLog('');
        debugLog('🔧 ІНСТРУКЦІЇ:');
        debugLog('1. Натисніть кнопку "Галерея"');
        debugLog('2. Виберіть зображення');
        debugLog('3. Дочекайтесь логу "✅ ПІДТВЕРДЖЕНО: Новий overlay знайдено в localStorage"');
        debugLog('4. ОДРАЗУ переміститьте зображення (перетягніть)');
        debugLog('5. Викличте debugOverlay.checkFirstMoveDetailed()');

        // Функція детальної перевірки
        window.debugOverlay.checkFirstMoveDetailed = function () {
            debugLog('=== ДЕТАЛЬНИЙ РЕЗУЛЬТАТ ТЕСТУ ===');

            const afterMove = JSON.parse(localStorage.getItem('lefleat_layers') || '[]');
            const testDuration = Date.now() - window.debugOverlay._testStartTime;

            debugLog(`⏱️ Тривалість тесту: ${testDuration}мс`);

            let foundNewOverlays = false;
            let coordinatesChanged = false;

            afterMove.forEach((layer, layerIdx) => {
                const beforeLayer = window.debugOverlay._beforeState[layerIdx];

                if (layer.overlays && layer.overlays.length > 0) {
                    const beforeCount = beforeLayer?.overlays?.length || 0;

                    if (layer.overlays.length > beforeCount) {
                        foundNewOverlays = true;
                        debugLog(`📈 Шар ${layerIdx}: додано ${layer.overlays.length - beforeCount} нових overlay`);

                        // Перевіряємо детально кожний новий overlay
                        layer.overlays.slice(beforeCount).forEach((newOverlay, newIdx) => {
                            const actualIdx = beforeCount + newIdx;
                            debugLog(`🔍 Детальний аналіз нового overlay ${actualIdx}:`);
                            debugLog(`   URL: ${newOverlay.url?.substring(0, 40)}...`);
                            debugLog(`   bounds: ${JSON.stringify(newOverlay.bounds)}`);
                            debugLog(`   corners: ${newOverlay.corners ? newOverlay.corners.length + ' точок' : 'НЕМАЄ!'}`);

                            if (newOverlay.corners && newOverlay.corners.length > 0) {
                                debugLog(`   corners детально:`, newOverlay.corners);
                                coordinatesChanged = true;
                            }

                            debugLog(`   opacity: ${newOverlay.opacity || 'немає'}`);
                        });
                    }

                    // Також перевіряємо чи змінилися координати існуючих overlay
                    if (beforeLayer?.overlays) {
                        layer.overlays.slice(0, beforeLayer.overlays.length).forEach((overlay, idx) => {
                            const beforeOverlay = beforeLayer.overlays[idx];

                            const boundsChanged = JSON.stringify(overlay.bounds) !== JSON.stringify(beforeOverlay.bounds);
                            const cornersChanged = JSON.stringify(overlay.corners) !== JSON.stringify(beforeOverlay.corners);

                            if (boundsChanged || cornersChanged) {
                                debugLog(`🔄 Overlay ${idx} змінено:`);
                                if (boundsChanged) {
                                    debugLog(`   bounds: ${JSON.stringify(beforeOverlay.bounds)} → ${JSON.stringify(overlay.bounds)}`);
                                }
                                if (cornersChanged) {
                                    debugLog(`   corners: ${beforeOverlay.corners?.length || 0} → ${overlay.corners?.length || 0} точок`);
                                }
                                coordinatesChanged = true;
                            }
                        });
                    }
                }
            });

            // Підсумок результатів
            debugLog('');
            debugLog('📊 ПІДСУМОК ТЕСТУ:');

            if (!foundNewOverlays) {
                debugLog('❌ ПОМИЛКА: Не знайдено нових overlay');
                debugLog('   Можливо ви не додали зображення або воно не збереглося');
            } else if (!coordinatesChanged) {
                debugLog('❌ КРИТИЧНА ПРОБЛЕМА: Нові overlay НЕ МАЮТЬ координат!');
                debugLog('   Це означає що перше переміщення НЕ зберігається');
                debugLog('');
                debugLog('🔧 РЕКОМЕНДАЦІЇ:');
                debugLog('   1. Перевірте чи з\'являються логи edit подій');
                debugLog('   2. Перевірте чи спрацьовує синхронне збереження');
                debugLog('   3. Викличте debugOverlay.checkEditHandlers()');
            } else {
                debugLog('✅ УСПІХ: Перше переміщення збереглося правильно!');
                debugLog('   Координати знайдено в localStorage');
            }

            debugLog('');
            debugLog('💡 Додаткова діагностика:');
            debugLog('   debugOverlay.localStorage() - повний localStorage');
            debugLog('   debugOverlay.analyze() - стан overlay на карті');
            debugLog('   debugOverlay.checkEditHandlers() - перевірка обробників');
        };

        debugLog('⏳ Детальний тест розпочато...');
    };

    // Функція для автоматичної перевірки localStorage під час edit події
    window.debugOverlay.monitorFirstEdit = function () {
        debugLog('=== МОНІТОРИНГ ПЕРШОЇ EDIT ПОДІЇ ===');

        let editEventCount = 0;
        let isMonitoring = false;

        // Перехопити edit події
        const originalConsoleLog = console.log;
        console.log = function (...args) {
            // Відловлюємо наші edit логи
            if (args[0] && typeof args[0] === 'string' && args[0].includes('🔄 Edit подія для gallery overlay')) {
                editEventCount++;
                debugLog(`🎯 ЗАФІКСОВАНА EDIT ПОДІЯ #${editEventCount}`);

                if (editEventCount === 1) {
                    // Перша edit подія - перевіряємо localStorage через невелику затримку
                    setTimeout(() => {
                        const stored = localStorage.getItem('lefleat_layers');
                        if (stored) {
                            const data = JSON.parse(stored);
                            debugLog('📊 localStorage після ПЕРШОЇ edit події:');

                            let foundUpdatedCoords = false;
                            data.forEach((layer, idx) => {
                                if (layer.overlays && layer.overlays.length > 0) {
                                    layer.overlays.forEach((ov, ovIdx) => {
                                        if (ov.corners && ov.corners.length > 0) {
                                            debugLog(`✅ Шар ${idx}, overlay ${ovIdx}: corners оновлено`);
                                            foundUpdatedCoords = true;
                                        } else {
                                            debugLog(`⚠️ Шар ${idx}, overlay ${ovIdx}: corners відсутні`);
                                        }
                                    });
                                }
                            });

                            if (foundUpdatedCoords) {
                                debugLog('✅ ПЕРША EDIT ПОДІЯ: Координати збережено в localStorage!');
                            } else {
                                debugLog('❌ ПЕРША EDIT ПОДІЯ: Координати НЕ збережено!');
                            }
                        }
                    }, 200); // Затримка для debounced save
                }
            }

            // Викликаємо оригінальний console.log
            originalConsoleLog.apply(console, args);
        };

        debugLog('🎧 Моніторинг edit подій активовано');
        debugLog('Додайте overlay і переміститьте його - я відстежую збереження');

        // Автоматично зупиняємо через 30 секунд
        setTimeout(() => {
            console.log = originalConsoleLog;
            debugLog(`🏁 Моніторинг завершено. Зафіксовано ${editEventCount} edit подій`);
        }, 30000);
    };

    // Оновлюємо help з новими командами
    const originalHelp = window.debugOverlay.help;
    window.debugOverlay.help = function () {
        originalHelp();
        debugLog('');
        debugLog('=== ТЕСТИ ДЛЯ ПЕРШОГО ПЕРЕМІЩЕННЯ (v2.7) ===');
        debugLog('debugOverlay.testFirstMoveV27() - новий покращений тест (рекомендується)');
        debugLog('debugOverlay.checkFirstMoveV27() - перевірка результатів v2.7');
        debugLog('');
        debugLog('=== СТАРІ ТЕСТИ (v2.6) ===');
        debugLog('debugOverlay.testFirstMoveDetailed() - детальний тест першого переміщення');
        debugLog('debugOverlay.checkFirstMoveDetailed() - детальна перевірка результату');
        debugLog('debugOverlay.monitorFirstEdit() - моніторинг edit подій в реальному часі');
        debugLog('');
        debugLog('🎯 РЕКОМЕНДОВАНИЙ ПОРЯДОК ТЕСТУВАННЯ v2.7:');
        debugLog('1. debugOverlay.testFirstMoveV27() - запустити новий тест');
        debugLog('2. Додати зображення через галерею');
        debugLog('3. Дочекатися підтвердження збереження в localStorage');
        debugLog('4. ОДРАЗУ перемістити зображення');
        debugLog('5. debugOverlay.checkFirstMoveV27() - перевірити результат');
        debugLog('');
        debugLog('💡 v2.7 має покращений механізм збереження з мінімальними затримками!');
    };

    // Функція для детального тестування першого переміщення v2.7
    window.debugOverlay.testFirstMoveV27 = function () {
        debugLog('=== ТЕСТ ПЕРШОГО ПЕРЕМІЩЕННЯ v2.7 ===');

        // Очищаємо попередні дані
        localStorage.removeItem('lefleat_layers');
        debugLog('📋 localStorage очищено');

        // Зберігаємо початковий стан
        const initialState = {
            timestamp: Date.now(),
            beforeAdd: localStorage.getItem('lefleat_layers'),
            overlaysCount: 0
        };

        debugLog('🎯 Готово до тестування. Тепер:');
        debugLog('1. Додайте зображення через галерею');
        debugLog('2. Дочекайтеся всіх логів про збереження');
        debugLog('3. ОДРАЗУ перемістіть зображення');
        debugLog('4. Викличте debugOverlay.checkFirstMoveV27() для перевірки');

        // Зберігаємо стан для перевірки
        window.debugFirstMoveState = initialState;

        // Автоматичне відстеження edit подій
        let editCount = 0;
        const originalConsoleLog = console.log;

        console.log = function (...args) {
            if (args[0] && typeof args[0] === 'string') {
                // Відстежуємо створення overlay
                if (args[0].includes('🔄 Edit подія #1 для gallery overlay')) {
                    debugLog('🎯 ПЕРША EDIT ПОДІЯ ВИЯВЛЕНА!');

                    // Перевіряємо localStorage через кілька затримок
                    [50, 100, 200, 500].forEach(delay => {
                        setTimeout(() => {
                            const stored = localStorage.getItem('lefleat_layers');
                            if (stored) {
                                const data = JSON.parse(stored);
                                let foundCorners = false;
                                data.forEach(layer => {
                                    if (layer.overlays) {
                                        layer.overlays.forEach(ov => {
                                            if (ov.corners && ov.corners.length > 0) {
                                                foundCorners = true;
                                            }
                                        });
                                    }
                                });
                                debugLog(`📊 Перевірка через ${delay}мс: координати ${foundCorners ? '✅ ЗНАЙДЕНО' : '❌ НЕ ЗНАЙДЕНО'}`);
                            }
                        }, delay);
                    });
                }

                // Відстежуємо повідомлення про успішне збереження першого edit
                if (args[0].includes('ПЕРШИЙ EDIT: Координати УСПІШНО збережено')) {
                    debugLog('🎉 ПЕРШИЙ EDIT УСПІШНО ЗБЕРЕЖЕНО!');
                }

                if (args[0].includes('ПЕРШИЙ EDIT: Координати НЕ знайдено')) {
                    debugLog('❌ ПЕРШИЙ EDIT НЕ ЗБЕРЕЖЕНО!');
                }
            }

            originalConsoleLog.apply(console, args);
        };

        // Відновлюємо console.log через 30 секунд
        setTimeout(() => {
            console.log = originalConsoleLog;
            debugLog('🔄 Автоматичне відстеження завершено');
        }, 30000);
    };

    // Функція для перевірки результатів тестування v2.7
    window.debugOverlay.checkFirstMoveV27 = function () {
        debugLog('=== ПЕРЕВІРКА РЕЗУЛЬТАТІВ ПЕРШОГО ПЕРЕМІЩЕННЯ v2.7 ===');

        const stored = localStorage.getItem('lefleat_layers');
        if (!stored) {
            debugLog('❌ localStorage порожній!');
            return;
        }

        const data = JSON.parse(stored);
        debugLog(`📊 Знайдено ${data.length} шарів у localStorage`);

        let totalOverlays = 0;
        let overlaysWithCorners = 0;

        data.forEach((layer, layerIdx) => {
            debugLog(`📋 Шар ${layerIdx}:`);
            debugLog(`   images: ${layer.images?.length || 0}`);
            debugLog(`   overlays: ${layer.overlays?.length || 0}`);

            if (layer.overlays) {
                layer.overlays.forEach((overlay, ovIdx) => {
                    totalOverlays++;
                    debugLog(`   📸 Overlay ${ovIdx}:`);
                    debugLog(`      URL: ${overlay.url ? overlay.url.substring(0, 50) + '...' : 'немає'}`);
                    debugLog(`      bounds: ${overlay.bounds ? 'є' : 'немає'}`);
                    debugLog(`      corners: ${overlay.corners ? overlay.corners.length + ' точок' : 'немає'}`);

                    if (overlay.corners && overlay.corners.length > 0) {
                        overlaysWithCorners++;
                        debugLog(`      🎯 Перші 2 координати:`, overlay.corners.slice(0, 2));
                    }
                });
            }
        });

        debugLog('');
        debugLog('=== ПІДСУМОК ===');
        debugLog(`📊 Всього overlay: ${totalOverlays}`);
        debugLog(`🎯 З координатами: ${overlaysWithCorners}`);

        if (overlaysWithCorners > 0) {
            debugLog('✅ УСПІХ: Координати першого переміщення збережено!');
        } else {
            debugLog('❌ ПРОБЛЕМА: Координати першого переміщення НЕ збережено!');
        }

        return {
            totalOverlays,
            overlaysWithCorners,
            success: overlaysWithCorners > 0
        };
    };
} 