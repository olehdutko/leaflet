// Альтернативний механізм збереження позицій overlay при drag - v2.9
// Завантажуємо альтернативний механізм збереження drag v2.9

(function () {
    'use strict';

    // Флаг для попередження повторних викликів
    if (window.dragSaveFixLoaded) {
        return;
    }
    window.dragSaveFixLoaded = true;

    let isDebugMode = false;

    // Увімкнути debug режим
    window.enableDragSaveDebug = function () {
        isDebugMode = true;
    };

    function debugLog(message, data = null) {
        // Debug логування вимкнено для production
    }

    // Функція збереження позиції overlay
    function saveOverlayPosition(overlay, overlayId) {
        if (!window.saveLayersToStorage) {
            return;
        }

        const newBounds = overlay.getBounds();
        const newCorners = overlay.getCorners?.() ?
            overlay.getCorners().map(c => ({ lat: c.lat, lng: c.lng })) : null;

        debugLog(`DRAG ЗБЕРЕЖЕННЯ позиції overlay:`, {
            bounds: newBounds,
            corners: newCorners ? newCorners.length : 0
        });

        // Знаходимо overlay в системі шарів
        if (window.customLayers) {
            for (const layer of window.customLayers) {
                if (!layer || !layer.featureGroup) continue;

                let overlayIdx = layer.featureGroup.overlayInstances?.indexOf(overlay);
                
                if (overlayIdx === -1 && overlay._overlay) {
                    overlayIdx = layer.featureGroup.overlayInstances?.findIndex(inst => {
                        return inst === overlay._overlay || inst._overlay === overlay._overlay;
                    });
                }

                if (overlayIdx !== -1) {
                    // Оновлюємо в images масиві
                    if (layer.featureGroup.images && layer.featureGroup.images[overlayIdx]) {
                        layer.featureGroup.images[overlayIdx].bounds = newBounds;
                        if (newCorners) {
                            layer.featureGroup.images[overlayIdx].corners = newCorners;
                        }
                    }

                    // Оновлюємо в overlays масиві
                    if (layer.featureGroup.overlays && layer.featureGroup.overlays[overlayIdx]) {
                        layer.featureGroup.overlays[overlayIdx].bounds = newBounds;
                        if (newCorners) {
                            layer.featureGroup.overlays[overlayIdx].corners = newCorners;
                        }
                    }

                    // Зберігаємо зміни
                    try {
                        window.saveLayersToStorage();
                        debugLog('DRAG ЗБЕРЕЖЕННЯ: Позиція збережена в localStorage');
                    } catch (error) {
                        // Мовчазно обробляємо помилки збереження
                    }

                    return;
                }
            }
        }
    }

    // Функція для прив'язування drag handlers
    function bindDragSaveHandlers() {
        debugLog('Прив\'язуємо drag handlers для збереження позицій...');

        if (!window.customLayers) {
            return;
        }

        let bound = 0;

        window.customLayers.forEach((layer, layerIdx) => {
            if (!layer || !layer.featureGroup || !layer.featureGroup.overlayInstances) {
                return;
            }

            layer.featureGroup.overlayInstances.forEach((overlay, overlayIdx) => {
                if (!overlay || !overlay.getCorners || overlay._dragSaveHandlerBound) {
                    return;
                }

                const overlayId = `${layerIdx}.${overlayIdx}`;
                let initialBounds = null;
                let isDragging = false;

                // Обробник початку drag
                const dragStartHandler = () => {
                    initialBounds = overlay.getBounds();
                    isDragging = true;
                    debugLog(`DRAG ПОЧАТОК для overlay ${overlayId}`);
                };

                // Обробник кінця drag
                const dragEndHandler = () => {
                    if (isDragging && initialBounds) {
                        const finalBounds = overlay.getBounds();
                        
                        // Перевіряємо чи позиція дійсно змінилася
                        if (JSON.stringify(initialBounds) !== JSON.stringify(finalBounds)) {
                            debugLog(`DRAG ЗАВЕРШЕНО для overlay ${overlayId} - позиція змінилася`, {
                                було: initialBounds,
                                стало: finalBounds
                            });
                            
                            // Зберігаємо нову позицію
                            saveOverlayPosition(overlay, overlayId);
                        }
                    }
                    
                    isDragging = false;
                    initialBounds = null;
                };

                // Прив'язуємо обробники
                overlay.on('dragstart', dragStartHandler);
                overlay.on('dragend', dragEndHandler);
                
                // Позначаємо що handler вже прив'язаний
                overlay._dragSaveHandlerBound = true;
                bound++;
            });
        });

        debugLog(`Прив'язано drag save handlers для ${bound} overlay`);
    }

    // Функція для тестування
    function testDragSaveMechanism() {
        debugLog('ТЕСТ DRAG SAVE МЕХАНІЗМУ...');

        if (!window.customLayers || window.customLayers.length === 0) {
            debugLog('Немає шарів для тестування');
            return;
        }

        let totalOverlays = 0;
        let overlaysWithHandlers = 0;

        window.customLayers.forEach((layer, layerIdx) => {
            if (layer && layer.featureGroup && layer.featureGroup.overlayInstances) {
                layer.featureGroup.overlayInstances.forEach((overlay, overlayIdx) => {
                    totalOverlays++;
                    
                    if (overlay && overlay._dragSaveHandlerBound) {
                        overlaysWithHandlers++;
                        debugLog(`Overlay ${layerIdx}.${overlayIdx}:`, {
                            bounds: overlay.getBounds(),
                            dragHandler: overlay._dragSaveHandlerBound ? '✅' : '❌'
                        });
                    }
                });
            }
        });

        if (totalOverlays === 0) {
            debugLog('Немає overlay для тестування');
        } else {
            debugLog('Переміщуйте overlay і дивіться на логи збереження!');
        }
    }

    // Експортуємо функції
    window.dragSaveFix = {
        bindHandlers: bindDragSaveHandlers,
        test: testDragSaveMechanism,
        enableDebug: () => { isDebugMode = true; }
    };

    // Ініціалізація
    setTimeout(() => {
        bindDragSaveHandlers();
    }, 1000);

    // Періодична перевірка
    setInterval(() => {
        bindDragSaveHandlers();
    }, 5000);

})(); 