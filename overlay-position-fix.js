// Універсальний механізм збереження позицій overlay - v2.8
console.log('🔧 Завантажуємо покращений механізм збереження позицій overlay v2.8');

(function () {
    'use strict';

    // Флаг для попередження повторних викликів
    if (window.overlayPositionFixLoaded) {
        console.log('⚠️ Overlay position fix уже завантажено');
        return;
    }
    window.overlayPositionFixLoaded = true;

    let saveQueue = [];
    let saveTimeout = null;
    let isDebugMode = false;

    // Увімкнути debug режим
    window.enableOverlayDebug = function () {
        isDebugMode = true;
        console.log('🐛 Debug режим overlay позицій увімкнено');
    };

    function debugLog(message, data = null) {
        if (isDebugMode) {
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            console.log(`[${timestamp}] 🔧 ${message}`, data || '');
        }
    }

    // Універсальна функція збереження
    function universalSave(reason = 'unknown', priority = false) {
        debugLog(`Збереження запитано: ${reason} (priority: ${priority})`);

        if (!window.saveLayersToStorage) {
            console.warn('⚠️ saveLayersToStorage недоступна');
            return;
        }

        // Для пріоритетних збережень (перше переміщення) - зменшена затримка
        const delay = priority ? 50 : 150;

        // Очищуємо попередній timeout
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }

        saveTimeout = setTimeout(() => {
            debugLog(`Виконуємо збереження: ${reason}`);

            try {
                // Зберігаємо стан ПЕРЕД збереженням для порівняння
                const beforeState = localStorage.getItem('lefleat_layers');
                const beforeCount = beforeState ? JSON.parse(beforeState).length : 0;

                // Виконуємо збереження
                window.saveLayersToStorage();

                // Перевіряємо результат
                setTimeout(() => {
                    const afterState = localStorage.getItem('lefleat_layers');
                    const afterCount = afterState ? JSON.parse(afterState).length : 0;

                    debugLog(`Збереження завершено: ${beforeCount} → ${afterCount} шарів`);

                    // Для пріоритетних збережень перевіряємо наявність corners
                    if (priority && afterState) {
                        const data = JSON.parse(afterState);
                        let foundCorners = false;

                        data.forEach(layer => {
                            if (layer.overlays && layer.overlays.length > 0) {
                                layer.overlays.forEach(ov => {
                                    if (ov.corners && ov.corners.length > 0) {
                                        foundCorners = true;
                                    }
                                });
                            }
                        });

                        if (foundCorners) {
                            console.log('✅ Пріоритетне збереження: координати знайдено в localStorage');
                        } else {
                            console.log('❌ Пріоритетне збереження: координати НЕ знайдено!');
                        }
                    }
                }, 25);

            } catch (error) {
                console.error('❌ Помилка збереження:', error);
            }

            saveTimeout = null;
        }, delay);
    }

    // Покращений wrapper для edit подій
    function createEditHandler(overlay, imageUrl, featureGroup, isFirstMove = false) {
        let editCount = 0;

        return function handleEdit() {
            editCount++;
            const isFirstEdit = editCount === 1;

            debugLog(`Edit подія #${editCount} для ${imageUrl.substring(0, 30)}... (перша: ${isFirstEdit})`);

            try {
                // Отримуємо нові координати
                const newBounds = overlay.getBounds();
                const newCorners = overlay.getCorners?.() ?
                    overlay.getCorners().map(c => ({ lat: c.lat, lng: c.lng })) : null;

                debugLog('Нові координати:', {
                    bounds: newBounds,
                    corners: newCorners ? newCorners.length : 0
                });

                // Оновлюємо в обох масивах
                let updated = false;

                // Оновлюємо images
                if (featureGroup.images) {
                    const imageIdx = featureGroup.images.findIndex(img => img.url === imageUrl);
                    if (imageIdx !== -1) {
                        featureGroup.images[imageIdx].bounds = newBounds;
                        if (newCorners) {
                            featureGroup.images[imageIdx].corners = newCorners;
                        }
                        debugLog(`✅ Оновлено images[${imageIdx}]`);
                        updated = true;
                    }
                }

                // Оновлюємо overlays
                if (featureGroup.overlays) {
                    const overlayIdx = featureGroup.overlays.findIndex(img => img.url === imageUrl);
                    if (overlayIdx !== -1) {
                        featureGroup.overlays[overlayIdx].bounds = newBounds;
                        if (newCorners) {
                            featureGroup.overlays[overlayIdx].corners = newCorners;
                        }
                        debugLog(`✅ Оновлено overlays[${overlayIdx}]`);
                        updated = true;
                    }
                }

                if (!updated) {
                    console.warn(`⚠️ Не вдалося знайти overlay для оновлення: ${imageUrl.substring(0, 30)}...`);
                    return;
                }

                // Зберігаємо з пріоритетом для першого edit
                universalSave(`edit#${editCount}`, isFirstEdit);

            } catch (error) {
                console.error('❌ Помилка в edit handler:', error);
            }
        };
    }

    // Функція для переприв'язки edit handlers
    function rebindEditHandlers() {
        debugLog('Переприв\'язуємо edit handlers...');

        if (!window.customLayers) {
            console.warn('⚠️ customLayers недоступні');
            return;
        }

        let rebound = 0;

        window.customLayers.forEach((layer, layerIdx) => {
            if (!layer.featureGroup || !layer.featureGroup.overlayInstances) {
                return;
            }

            layer.featureGroup.overlayInstances.forEach((overlay, overlayIdx) => {
                // Перевіряємо чи вже є edit handler
                if (overlay._events && overlay._events.edit && overlay._events.edit.length > 0) {
                    debugLog(`Overlay ${layerIdx}.${overlayIdx} вже має edit handler`);
                    return;
                }

                // Знаходимо URL для цього overlay
                let imageUrl = overlay._customUrl;
                if (!imageUrl && layer.featureGroup.images && layer.featureGroup.images[overlayIdx]) {
                    imageUrl = layer.featureGroup.images[overlayIdx].url;
                }

                if (!imageUrl) {
                    console.warn(`⚠️ Не вдалося знайти URL для overlay ${layerIdx}.${overlayIdx}`);
                    return;
                }

                // Створюємо і прив'язуємо handler
                const handler = createEditHandler(overlay, imageUrl, layer.featureGroup);
                overlay.on('edit', handler);

                debugLog(`✅ Прив'язано edit handler для overlay ${layerIdx}.${overlayIdx}`);
                rebound++;
            });
        });

        console.log(`🔧 Переприв'язано ${rebound} edit handlers`);
        return rebound;
    }

    // Функція для перевірки стану overlay
    function checkOverlayState() {
        console.log('🔍 Перевіряємо стан overlay...');

        if (!window.customLayers) {
            console.log('❌ customLayers недоступні');
            return;
        }

        let totalOverlays = 0;
        let overlaysWithHandlers = 0;
        let overlaysWithData = 0;

        window.customLayers.forEach((layer, layerIdx) => {
            if (layer.featureGroup && layer.featureGroup.overlayInstances) {
                const count = layer.featureGroup.overlayInstances.length;
                totalOverlays += count;

                layer.featureGroup.overlayInstances.forEach((overlay, overlayIdx) => {
                    if (overlay._events && overlay._events.edit) {
                        overlaysWithHandlers++;
                    }
                });

                if (layer.featureGroup.images) {
                    overlaysWithData += layer.featureGroup.images.length;
                }
            }
        });

        console.log(`📊 Стан overlay:`);
        console.log(`   Всього на карті: ${totalOverlays}`);
        console.log(`   З edit handlers: ${overlaysWithHandlers}`);
        console.log(`   З даними в images: ${overlaysWithData}`);

        const stored = localStorage.getItem('lefleat_layers');
        if (stored) {
            const data = JSON.parse(stored);
            let storedOverlays = 0;
            let overlaysWithCorners = 0;

            data.forEach(layer => {
                if (layer.overlays) {
                    storedOverlays += layer.overlays.length;
                    layer.overlays.forEach(ov => {
                        if (ov.corners && ov.corners.length > 0) {
                            overlaysWithCorners++;
                        }
                    });
                }
            });

            console.log(`   В localStorage: ${storedOverlays} overlay, ${overlaysWithCorners} з corners`);
        }

        return {
            totalOverlays,
            overlaysWithHandlers,
            overlaysWithData
        };
    }

    // Публічне API
    window.overlayPositionFix = {
        save: universalSave,
        rebindHandlers: rebindEditHandlers,
        checkState: checkOverlayState,
        enableDebug: () => { isDebugMode = true; },
        createEditHandler: createEditHandler
    };

    // Автоматично перевіряємо стан через 2 секунди після завантаження
    setTimeout(() => {
        const state = checkOverlayState();

        if (state.totalOverlays > 0 && state.overlaysWithHandlers < state.totalOverlays) {
            console.log('🔧 Виявлено overlay без edit handlers, переприв\'язуємо...');
            rebindEditHandlers();
        }
    }, 2000);

    console.log('✅ Overlay position fix v2.8 завантажено');
})(); 