// Альтернативний механізм збереження позицій на основі drag подій
console.log('🔄 Завантажуємо альтернативний механізм збереження drag v2.9');

(function () {
    'use strict';

    if (window.dragSaveFixLoaded) {
        console.log('⚠️ Drag save fix уже завантажено');
        return;
    }
    window.dragSaveFixLoaded = true;

    let saveTimeout = null;
    let isDebugMode = false;

    function debugLog(message, data = null) {
        if (isDebugMode) {
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            console.log(`[${timestamp}] 🔄 ${message}`, data || '');
        }
    }

    // Функція збереження позицій
    function saveDragPosition(overlay, reason = 'drag') {
        debugLog(`Збереження позиції: ${reason}`);

        if (!window.saveLayersToStorage) {
            console.warn('⚠️ saveLayersToStorage недоступна');
            return;
        }

        const newBounds = overlay.getBounds();
        const newCorners = overlay.getCorners?.() ?
            overlay.getCorners().map(c => ({ lat: c.lat, lng: c.lng })) : null;

        console.log(`🔄 DRAG ЗБЕРЕЖЕННЯ позиції overlay:`);
        console.log(`   Bounds: ${JSON.stringify(newBounds)}`);
        console.log(`   Corners: ${newCorners ? newCorners.length : 0} точок`);

        // Знаходимо overlay в системі шарів
        let found = false;
        if (window.customLayers) {
            window.customLayers.forEach((layer, layerIdx) => {
                if (layer.featureGroup && layer.featureGroup.overlayInstances) {
                    layer.featureGroup.overlayInstances.forEach((inst, overlayIdx) => {
                        if (inst === overlay) {
                            debugLog(`Знайдено overlay в шарі ${layerIdx}.${overlayIdx}`);

                            // Оновлюємо в images
                            if (layer.featureGroup.images && layer.featureGroup.images[overlayIdx]) {
                                layer.featureGroup.images[overlayIdx].bounds = newBounds;
                                if (newCorners) {
                                    layer.featureGroup.images[overlayIdx].corners = newCorners;
                                }
                                console.log(`✅ Оновлено images[${overlayIdx}]`);
                            }

                            // Оновлюємо в overlays
                            if (layer.featureGroup.overlays && layer.featureGroup.overlays[overlayIdx]) {
                                layer.featureGroup.overlays[overlayIdx].bounds = newBounds;
                                if (newCorners) {
                                    layer.featureGroup.overlays[overlayIdx].corners = newCorners;
                                }
                                console.log(`✅ Оновлено overlays[${overlayIdx}]`);
                            }

                            found = true;
                        }
                    });
                }
            });
        }

        if (!found) {
            console.warn('⚠️ Overlay не знайдено в системі шарів');
            return;
        }

        // Збереження з debounce
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }

        saveTimeout = setTimeout(() => {
            debugLog('Виконуємо збереження в localStorage...');

            try {
                window.saveLayersToStorage();
                console.log('✅ DRAG ЗБЕРЕЖЕННЯ: Позиція збережена в localStorage');

                // Перевіряємо результат
                setTimeout(() => {
                    const stored = localStorage.getItem('lefleat_layers');
                    if (stored) {
                        const data = JSON.parse(stored);
                        console.log(`✅ localStorage оновлено: ${data.length} шарів`);
                    }
                }, 50);

            } catch (error) {
                console.error('❌ Помилка drag збереження:', error);
            }

            saveTimeout = null;
        }, 100);
    }

    // Функція для прив'язки drag handlers
    function bindDragHandlers() {
        console.log('🔄 Прив\'язуємо drag handlers для збереження позицій...');

        if (!window.customLayers) {
            console.warn('⚠️ customLayers недоступні');
            return;
        }

        let bound = 0;

        window.customLayers.forEach((layer, layerIdx) => {
            if (layer.featureGroup && layer.featureGroup.overlayInstances) {
                layer.featureGroup.overlayInstances.forEach((overlay, overlayIdx) => {
                    const overlayId = `${layerIdx}.${overlayIdx}`;

                    // Перевіряємо чи вже прив'язано
                    if (overlay._dragSaveHandlerBound) {
                        debugLog(`Overlay ${overlayId} вже має drag save handler`);
                        return;
                    }

                    const element = overlay.getElement();
                    if (!element) {
                        debugLog(`Overlay ${overlayId} не має DOM element`);
                        return;
                    }

                    debugLog(`Прив'язуємо drag save handler для overlay ${overlayId}`);

                    let isDragging = false;
                    let initialBounds = null;

                    // Mouse down - початок drag
                    const onMouseDown = (e) => {
                        isDragging = true;
                        initialBounds = overlay.getBounds();
                        debugLog(`Drag розпочато для overlay ${overlayId}`);
                    };

                    // Mouse up - кінець drag
                    const onMouseUp = (e) => {
                        if (isDragging) {
                            isDragging = false;

                            const finalBounds = overlay.getBounds();

                            // Перевіряємо чи змінилася позиція
                            const boundsChanged = !initialBounds ||
                                JSON.stringify(initialBounds) !== JSON.stringify(finalBounds);

                            if (boundsChanged) {
                                console.log(`🔄 DRAG ЗАВЕРШЕНО для overlay ${overlayId} - позиція змінилася`);
                                console.log(`   Було: ${JSON.stringify(initialBounds)}`);
                                console.log(`   Стало: ${JSON.stringify(finalBounds)}`);

                                saveDragPosition(overlay, `drag-end-${overlayId}`);
                            } else {
                                debugLog(`Drag завершено для overlay ${overlayId} - позиція не змінилася`);
                            }
                        }
                    };

                    element.addEventListener('mousedown', onMouseDown);
                    document.addEventListener('mouseup', onMouseUp);

                    // Позначаємо що handler прив'язано
                    overlay._dragSaveHandlerBound = true;
                    overlay._dragSaveCleanup = () => {
                        element.removeEventListener('mousedown', onMouseDown);
                        document.removeEventListener('mouseup', onMouseUp);
                    };

                    bound++;
                });
            }
        });

        console.log(`✅ Прив'язано drag save handlers для ${bound} overlay`);
        return bound;
    }

    // Функція для увімкнення debug режиму
    function enableDebugMode() {
        isDebugMode = true;
        console.log('🐛 Debug режим drag save увімкнено');
    }

    // Функція тестування
    function testDragSave() {
        console.log('🧪 ТЕСТ DRAG SAVE МЕХАНІЗМУ...');

        if (!window.customLayers || window.customLayers.length === 0) {
            console.log('❌ Немає шарів для тестування');
            return;
        }

        let testCount = 0;
        window.customLayers.forEach((layer, layerIdx) => {
            if (layer.featureGroup && layer.featureGroup.overlayInstances) {
                layer.featureGroup.overlayInstances.forEach((overlay, overlayIdx) => {
                    testCount++;
                    console.log(`📍 Overlay ${layerIdx}.${overlayIdx}:`);
                    console.log(`   Bounds: ${JSON.stringify(overlay.getBounds())}`);
                    console.log(`   Drag handler: ${overlay._dragSaveHandlerBound ? '✅' : '❌'}`);
                });
            }
        });

        if (testCount === 0) {
            console.log('❌ Немає overlay для тестування');
        } else {
            console.log('🎯 Переміщуйте overlay і дивіться на логи збереження!');
        }
    }

    // Публічне API
    window.dragSaveFix = {
        bind: bindDragHandlers,
        test: testDragSave,
        enableDebug: enableDebugMode,
        save: saveDragPosition
    };

    // Автоматично прив'язуємо handlers через 2 секунди
    setTimeout(() => {
        const bound = bindDragHandlers();
        if (bound > 0) {
            console.log('✅ Drag save механізм v2.9 активований');
            console.log('💡 Команди: dragSaveFix.test(), dragSaveFix.enableDebug()');
        }
    }, 2000);

})(); 