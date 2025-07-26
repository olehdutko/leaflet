// Універсальний механізм збереження позицій overlay - v2.8
// Завантажуємо покращений механізм збереження позицій overlay v2.8

(function () {
    'use strict';

    // Флаг для попередження повторних викликів
    if (window.overlayPositionFixLoaded) {
        return;
    }
    window.overlayPositionFixLoaded = true;

    let saveQueue = [];
    let saveTimeout = null;
    let isDebugMode = false;

    // Увімкнути debug режим
    window.enableOverlayDebug = function () {
        isDebugMode = true;
    };

    function debugLog(message, data = null) {
        // Debug логування вимкнено для production
    }

    // Універсальна функція збереження
    function universalSave(reason = 'unknown', priority = false) {
        debugLog(`Збереження запитано: ${reason} (priority: ${priority})`);

        if (!window.saveLayersToStorage) {
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
                    }
                }, 25);

            } catch (error) {
                // Мовчазно обробляємо помилки збереження
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

            const newBounds = overlay.getBounds();
            const newCorners = overlay.getCorners?.() ?
                overlay.getCorners().map(c => ({ lat: c.lat, lng: c.lng })) : null;

            debugLog(`Edit подія #${editCount} для overlay: ${imageUrl?.substring(0, 30)}...`);

            // Оновлюємо дані в масивах
            if (featureGroup && featureGroup.images) {
                const imageIdx = featureGroup.images.findIndex(img => img.url === imageUrl);
                if (imageIdx !== -1) {
                    featureGroup.images[imageIdx].bounds = newBounds;
                    if (newCorners) {
                        featureGroup.images[imageIdx].corners = newCorners;
                    }
                }
            }

            if (featureGroup && featureGroup.overlays) {
                const overlayIdx = featureGroup.overlays.findIndex(img => img.url === imageUrl);
                if (overlayIdx !== -1) {
                    featureGroup.overlays[overlayIdx].bounds = newBounds;
                    if (newCorners) {
                        featureGroup.overlays[overlayIdx].corners = newCorners;
                    }
                }
            }

            // Зберігаємо зміни
            universalSave(`edit_${editCount}`, isFirstEdit);
        };
    }

    // Функція для переприв'язування edit handlers
    function rebindEditHandlers() {
        if (!window.customLayers) {
            return;
        }

        let rebound = 0;

        window.customLayers.forEach((layer, layerIdx) => {
            if (!layer || !layer.featureGroup) return;

            const { overlayInstances, images } = layer.featureGroup;

            if (overlayInstances && images) {
                overlayInstances.forEach((overlay, overlayIdx) => {
                    if (overlay && overlay.getCorners) {
                        const imageUrl = images[overlayIdx]?.url;
                        if (imageUrl) {
                            // Видаляємо старі обробники
                            overlay.off('edit');
                            
                            // Додаємо новий обробник
                            const handler = createEditHandler(overlay, imageUrl, layer.featureGroup);
                            overlay.on('edit', handler);
                            
                            rebound++;
                        }
                    }
                });
            }
        });

        debugLog(`Переприв'язано ${rebound} edit handlers`);
    }

    // Функція для перевірки стану overlay
    function checkOverlayState() {
        if (!window.customLayers) {
            return;
        }

        let totalOverlays = 0;
        let overlaysWithHandlers = 0;
        let overlaysWithData = 0;

        window.customLayers.forEach(layer => {
            if (layer && layer.featureGroup) {
                const { overlayInstances, images } = layer.featureGroup;
                
                if (overlayInstances) {
                    totalOverlays += overlayInstances.length;
                    
                    overlayInstances.forEach(overlay => {
                        if (overlay && overlay.getCorners) {
                            overlaysWithHandlers++;
                        }
                    });
                }
                
                if (images) {
                    overlaysWithData += images.length;
                }
            }
        });

        // Перевіряємо localStorage
        const stored = localStorage.getItem('lefleat_layers');
        let storedOverlays = 0;
        let overlaysWithCorners = 0;

        if (stored) {
            try {
                const data = JSON.parse(stored);
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
            } catch (e) {
                // Мовчазно обробляємо помилки парсингу
            }
        }

        debugLog(`Стан overlay: ${totalOverlays} на карті, ${overlaysWithHandlers} з handlers, ${overlaysWithData} з даними, ${storedOverlays} в localStorage, ${overlaysWithCorners} з corners`);
    }

    // Функція для видалення overlay
    function deleteOverlay(overlay) {
        if (!overlay) {
            return;
        }

        let overlayUrl = overlay._customUrl || overlay._url || overlay.url;
        
        if (!overlayUrl && overlay._overlay) {
            overlayUrl = overlay._overlay._customUrl || overlay._overlay._url || overlay._overlay.url;
        }
        
        if (!overlayUrl && overlay._image) {
            overlayUrl = overlay._image.src;
        }

        if (window.customLayers) {
            for (const layer of window.customLayers) {
                if (!layer || !layer.featureGroup) {
                    continue;
                }
                
                let overlayIdx = layer.featureGroup.overlayInstances?.indexOf(overlay);
                
                if (overlayIdx === -1 && overlay._overlay) {
                    overlayIdx = layer.featureGroup.overlayInstances?.findIndex(inst => {
                        return inst === overlay._overlay || inst._overlay === overlay._overlay;
                    });
                }
                
                if (overlayIdx === -1 && overlayUrl) {
                    overlayIdx = layer.featureGroup.images?.findIndex(img => img.url === overlayUrl);
                }
                
                if (overlayIdx === -1 && overlay._overlayId) {
                    overlayIdx = layer.featureGroup.images?.findIndex(img => img._overlayId === overlay._overlayId);
                }
                
                if (overlayIdx === -1) {
                    overlayIdx = layer.featureGroup.overlayInstances?.findIndex(inst => {
                        const instUrl = inst._customUrl || inst._url || inst.url;
                        const overlayUrl = overlay._customUrl || overlay._url || overlay.url;
                        
                        if (instUrl && overlayUrl && instUrl === overlayUrl) {
                            return true;
                        }
                        
                        if (inst._overlayId && overlay._overlayId && inst._overlayId === overlay._overlayId) {
                            return true;
                        }
                        
                        return false;
                    });
                    
                    if (overlayIdx === -1) {
                        overlayIdx = layer.featureGroup.images?.findIndex(img => {
                            const imgUrl = img._customUrl || img._url || img.url;
                            const overlayUrl = overlay._customUrl || overlay._url || overlay.url;
                            
                            if (imgUrl && overlayUrl && imgUrl === overlayUrl) {
                                return true;
                            }
                            
                            if (img._overlayId && overlay._overlayId && img._overlayId === overlay._overlayId) {
                                return true;
                            }
                            
                            return false;
                        });
                    }
                }
                
                if (overlayIdx !== -1) {
                    if (layer.featureGroup.overlayInstances && layer.featureGroup.overlayInstances[overlayIdx]) {
                        layer.featureGroup.overlayInstances.splice(overlayIdx, 1);
                    }
                    if (layer.featureGroup.images && layer.featureGroup.images[overlayIdx]) {
                        layer.featureGroup.images.splice(overlayIdx, 1);
                    }
                    if (layer.featureGroup.overlays && layer.featureGroup.overlays[overlayIdx]) {
                        layer.featureGroup.overlays.splice(overlayIdx, 1);
                    }
                    
                    try {
                        if (window.map && window.map.hasLayer(overlay)) {
                            window.map.removeLayer(overlay);
                        }
                    } catch (error) {
                        // Мовчазно обробляємо помилки видалення
                    }
                    
                    if (window.saveLayersToStorage) {
                        window.saveLayersToStorage();
                    }
                    
                    if (overlayUrl) {
                        const imgElements = document.querySelectorAll(`img.leaflet-image-layer[src="${overlayUrl}"]`);
                        imgElements.forEach(el => el.remove());
                    }
                    
                    return;
                }
            }
        }
        
        if (overlay) {
            try {
                if (window.map && window.map.hasLayer(overlay)) {
                    window.map.removeLayer(overlay);
                }
                
                if (overlay._overlay && window.map && window.map.hasLayer(overlay._overlay)) {
                    window.map.removeLayer(overlay._overlay);
                }
                
                if (window.saveLayersToStorage) {
                    window.saveLayersToStorage();
                }
                
                if (overlayUrl) {
                    const imgElements = document.querySelectorAll(`img.leaflet-image-layer[src="${overlayUrl}"]`);
                    imgElements.forEach(el => el.remove());
                }
            } catch (error) {
                // Мовчазно обробляємо помилки видалення
            }
        }
    }

    // Перевіряємо наявність overlay без edit handlers
    function checkForOrphanedOverlays() {
        if (!window.customLayers) {
            return;
        }

        window.customLayers.forEach(layer => {
            if (layer && layer.featureGroup && layer.featureGroup.overlayInstances) {
                layer.featureGroup.overlayInstances.forEach(overlay => {
                    if (overlay && overlay.getCorners && !overlay._hasEditHandler) {
                        debugLog('Виявлено overlay без edit handlers, переприв\'язуємо...');
                        rebindEditHandlers();
                        return;
                    }
                });
            }
        });
    }

    // Експортуємо функції
    window.overlayPositionFix = {
        createEditHandler,
        rebindEditHandlers,
        checkOverlayState,
        deleteOverlay,
        universalSave,
        checkForOrphanedOverlays
    };

    // Ініціалізація
    setTimeout(() => {
        rebindEditHandlers();
        checkOverlayState();
        checkForOrphanedOverlays();
    }, 1000);

    // Періодична перевірка
    setInterval(() => {
        checkForOrphanedOverlays();
    }, 5000);

})(); 