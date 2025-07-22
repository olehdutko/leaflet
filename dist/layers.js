export let customLayers = [];
export let activeLayer = null;
export let layerId = 1;
export function getNextLayerId() { return layerId++; }
/**
 * Створює TileLayer для заданого типу підкладки
 * @param type Тип підкладки ("План", "Ландшафт", "Супутник")
 * @param opacity Прозорість
 * @param showLabels Чи показувати підписи
 */
export function createTileLayer(type, opacity = 1, showLabels = true) {
    const opt = tileLayerOptions[type];
    if (!opt)
        throw new Error(`Unknown tile type: ${type}`);
    let url = opt.url;
    if (opt.hasLabels && showLabels === false && opt.urlNoLabels) {
        url = opt.urlNoLabels;
    }
    return L.tileLayer(url, {
        maxZoom: opt.maxZoom,
        attribution: opt.attribution,
        opacity: opacity
    });
}
// --- Тимчасові оголошення для зовнішніх залежностей ---
import { addDoubleClickToLayer, createLayerControl, layerControlsDiv } from './ui.js';
import { getObjectType, getColoredMarkerIcon } from './utils.js';
import { applyObjectProperties } from './objects.js';
import { map, tileLayerOptions } from './map-init.js';
import * as state from './state.js';
// --- Реалізація з main.ts ---
export function saveLayersToStorage() {
    customLayers.forEach(l => {
        l.featureGroup.eachLayer((layer) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const type = getObjectType(layer);
            if (!layer.feature)
                return;
            if (!layer.feature.properties)
                layer.feature.properties = {};
            if (layer.feature && layer.properties) {
                Object.assign(layer.feature.properties, layer.properties);
            }
            Object.assign(layer.feature.properties, layer.properties || {});
            if (type === 'marker') {
                layer.feature.properties.color = ((_a = layer.properties) === null || _a === void 0 ? void 0 : _a.color) || '#1976d2';
            }
            else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
                layer.feature.properties.fillColor = ((_b = layer.options) === null || _b === void 0 ? void 0 : _b.fillColor) || '#1976d2';
                layer.feature.properties.color = ((_c = layer.options) === null || _c === void 0 ? void 0 : _c.color) || '#1976d2';
                layer.feature.properties.fillOpacity = ((_d = layer.options) === null || _d === void 0 ? void 0 : _d.fillOpacity) || 0.2;
                layer.feature.properties.opacity = ((_e = layer.options) === null || _e === void 0 ? void 0 : _e.opacity) || 1;
            }
            else if (type === 'polyline') {
                layer.feature.properties.color = ((_f = layer.options) === null || _f === void 0 ? void 0 : _f.color) || '#1976d2';
                layer.feature.properties.weight = ((_g = layer.options) === null || _g === void 0 ? void 0 : _g.weight) || 3;
                layer.feature.properties.opacity = ((_h = layer.options) === null || _h === void 0 ? void 0 : _h.opacity) || 1;
                let dash = layer.options && layer.options.dashArray !== undefined && layer.options.dashArray !== null ? String(layer.options.dashArray) : '';
                if (dash === '10, 10')
                    layer.feature.properties.style = 'dashed';
                else if (dash === '2, 8')
                    layer.feature.properties.style = 'dotted';
                else
                    layer.feature.properties.style = 'solid';
            }
            if (layer.properties && layer.properties.image) {
                // видалено: layer.feature.properties.image = layer.properties.image;
            }
        });
    });
    const layersData = customLayers.map(l => {
        // Зберігаємо overlays (зображення)  
        let overlays = [];
        // Перевіряємо і в overlays, і в images для сумісності
        const imageData = l.featureGroup.images || l.featureGroup.overlays;
        if (imageData && Array.isArray(imageData)) {
            overlays = imageData.map((img) => {
                var _a;
                return ({
                    url: img.url,
                    bounds: img.bounds,
                    opacity: (_a = img.opacity) !== null && _a !== void 0 ? _a : 1,
                    corners: img.corners // Додаємо corners для збереження трансформацій
                });
            });
            console.log(`Шар ${l.title}: зберігаємо ${overlays.length} зображень (знайдено в ${l.featureGroup.images ? 'images' : 'overlays'})`);
        }
        return {
            id: l.id,
            tileType: l.tileType,
            opacity: l.tileLayer.options.opacity,
            showLabels: l.tileLayer._url && l.tileLayer._url.includes('nolabels') ? false : true,
            geojson: l.featureGroup.toGeoJSON(),
            title: l.title || undefined,
            visible: l.visible !== false,
            collapsed: l.collapsed || false,
            overlays
        };
    });
    // Перевіряємо, що дані не порожні перед збереженням
    if (layersData.length > 0) {
        localStorage.setItem('lefleat_layers', JSON.stringify(layersData));
        console.log(`Збережено ${layersData.length} шарів у localStorage`);
    }
    else {
        console.warn('Не зберігаємо порожній масив шарів у localStorage');
    }
}
export function loadLayersFromStorage() {
    const data = localStorage.getItem('lefleat_layers');
    if (!data) {
        console.log('localStorage порожній, створюємо новий шар');
        return false;
    }
    console.log('Завантажуємо дані з localStorage:', data.length, 'символів');
    try {
        let arr = JSON.parse(data);
        if (!Array.isArray(arr))
            arr = [arr];
        customLayers.forEach(l => {
            map.removeLayer(l.tileLayer);
            map.removeLayer(l.featureGroup);
        });
        customLayers = [];
        if (layerControlsDiv) {
            layerControlsDiv.innerHTML = '';
        }
        arr.forEach((obj) => {
            const tileLayer = createTileLayer(obj.tileType, obj.opacity, obj.showLabels);
            const featureGroup = new L.FeatureGroup();
            tileLayer.addTo(map);
            featureGroup.addTo(map);
            if (obj.geojson) {
                L.geoJSON(obj.geojson, {
                    pointToLayer: function (feature, latlng) {
                        if (feature.properties && feature.properties.color) {
                            return L.marker(latlng, { icon: getColoredMarkerIcon(feature.properties.color) });
                        }
                        return L.marker(latlng);
                    },
                    style: function (feature) {
                        var _a, _b, _c, _d, _e, _f, _g;
                        return {
                            color: ((_a = feature.properties) === null || _a === void 0 ? void 0 : _a.color) || '#1976d2',
                            weight: ((_b = feature.properties) === null || _b === void 0 ? void 0 : _b.weight) || 3,
                            opacity: (_d = (_c = feature.properties) === null || _c === void 0 ? void 0 : _c.opacity) !== null && _d !== void 0 ? _d : 1,
                            fillColor: ((_e = feature.properties) === null || _e === void 0 ? void 0 : _e.fillColor) || '#1976d2',
                            fillOpacity: (_g = (_f = feature.properties) === null || _f === void 0 ? void 0 : _f.fillOpacity) !== null && _g !== void 0 ? _g : 0.2
                        };
                    },
                    onEachFeature: function (feature, layer) {
                        featureGroup.addLayer(layer);
                        addDoubleClickToLayer(layer);
                        if (feature.properties) {
                            layer.properties = Object.assign({}, feature.properties);
                            applyObjectProperties(layer, feature.properties);
                            if (feature.geometry && feature.geometry.type === 'LineString' && feature.properties.style) {
                                let dashArray = null;
                                if (feature.properties.style === 'dashed')
                                    dashArray = '10, 10';
                                else if (feature.properties.style === 'dotted')
                                    dashArray = '2, 8';
                                layer.options.dashArray = dashArray;
                                layer.setStyle({ dashArray });
                            }
                            if (feature.properties.image) {
                                // видалено: layer.properties.image = feature.properties.image;
                            }
                        }
                    }
                });
            }
            // Відновлюємо overlays (зображення)
            if (obj.overlays && Array.isArray(obj.overlays)) {
                const imageData = obj.overlays.map((img) => {
                    var _a;
                    return ({
                        url: img.url,
                        bounds: img.bounds,
                        opacity: (_a = img.opacity) !== null && _a !== void 0 ? _a : 1,
                        corners: img.corners
                    });
                });
                // Зберігаємо в обох форматах для сумісності
                featureGroup.images = imageData;
                featureGroup.overlays = [];
                console.log(`Відновлюємо ${imageData.length} зображень для шару ${obj.title}`);
                restoreOverlaysForFeatureGroup(featureGroup);
            }
            const layerObj = { id: obj.id, tileLayer, featureGroup, tileType: obj.tileType, title: obj.title, visible: obj.visible !== false, collapsed: obj.hasOwnProperty('collapsed') ? obj.collapsed : false };
            customLayers.push(layerObj);
            createLayerControl(layerObj);
            featureGroup.bringToFront();
        });
        const firstVisible = customLayers.find(l => l.visible);
        if (firstVisible) {
            setActiveLayer(firstVisible.featureGroup);
        }
        else {
            activeLayer = null;
            updateActiveLayerUI();
        }
        if (window.Sortable && layerControlsDiv) {
            if (window.layerControlsSortable)
                window.layerControlsSortable.destroy();
            window.layerControlsSortable = new window.Sortable(layerControlsDiv, {
                animation: 150,
                handle: '.layer-card-drag-handle',
                onEnd: function (evt) {
                    if (layerControlsDiv) {
                        const newOrder = Array.from(layerControlsDiv.children).map((card) => +card.dataset.layerId);
                        customLayers.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
                        saveLayersToStorage();
                    }
                }
            });
        }
        console.log(`Успішно завантажено ${customLayers.length} шарів з localStorage`);
        return true;
    }
    catch (e) {
        console.error('Помилка завантаження з localStorage:', e);
        // НЕ викликаємо saveLayersToStorage(), щоб не перезаписати дані!
        return false;
    }
}
export function addLayer() {
    const tileType = "План";
    const tileLayer = createTileLayer(tileType, 1);
    const featureGroup = new L.FeatureGroup();
    tileLayer.addTo(map);
    featureGroup.addTo(map);
    // Додаю дефолтну назву шару
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const layerObj = { id: layerId, tileLayer, featureGroup, tileType, visible: true, title: `Шар ${timeStr}` };
    customLayers.push(layerObj);
    createLayerControl(layerObj);
    layerId++;
    setActiveLayer(featureGroup);
    featureGroup.bringToFront();
    saveLayersToStorage();
    // Оновлюємо видимість draw control
    import('./draw-control.js').then(({ updateDrawControlVisibility }) => {
        updateDrawControlVisibility();
    });
}
export function setActiveLayer(featureGroup) {
    activeLayer = featureGroup;
    if (state.currentEditingObject) {
        state.currentEditingObject.value = activeLayer;
    }
    updateActiveLayerUI();
    // Оновлюємо draw control для нового активного шару
    import('./draw-control.js').then(({ updateDrawControlForActiveLayer, updateDrawControlVisibility }) => {
        updateDrawControlForActiveLayer();
        updateDrawControlVisibility();
    });
}
export function updateActiveLayerUI() {
    if (layerControlsDiv) {
        document.querySelectorAll('.layer-card').forEach((card) => {
            const id = +card.dataset.layerId;
            const layer = customLayers.find(l => l.id === id);
            if (layer && layer.featureGroup === activeLayer) {
                card.classList.add('active');
            }
            else {
                card.classList.remove('active');
            }
        });
    }
    customLayers.forEach(l => {
        l.featureGroup.eachLayer((layer) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const type = getObjectType(layer);
            if (!layer.feature)
                return;
            if (!layer.feature.properties)
                layer.feature.properties = {};
            if (layer.feature && layer.properties)
                Object.assign(layer.feature.properties, layer.properties);
            Object.assign(layer.feature.properties, layer.properties || {});
            if (type === 'marker') {
                layer.feature.properties.color = ((_a = layer.properties) === null || _a === void 0 ? void 0 : _a.color) || '#1976d2';
            }
            else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
                layer.feature.properties.fillColor = ((_b = layer.options) === null || _b === void 0 ? void 0 : _b.fillColor) || '#1976d2';
                layer.feature.properties.color = ((_c = layer.options) === null || _c === void 0 ? void 0 : _c.color) || '#1976d2';
                layer.feature.properties.fillOpacity = ((_d = layer.options) === null || _d === void 0 ? void 0 : _d.fillOpacity) || 0.2;
                layer.feature.properties.opacity = ((_e = layer.options) === null || _e === void 0 ? void 0 : _e.opacity) || 1;
            }
            else if (type === 'polyline') {
                layer.feature.properties.color = ((_f = layer.options) === null || _f === void 0 ? void 0 : _f.color) || '#1976d2';
                layer.feature.properties.weight = ((_g = layer.options) === null || _g === void 0 ? void 0 : _g.weight) || 3;
                layer.feature.properties.opacity = ((_h = layer.options) === null || _h === void 0 ? void 0 : _h.opacity) || 1;
                let dash = layer.options && layer.options.dashArray !== undefined && layer.options.dashArray !== null ? String(layer.options.dashArray) : '';
                if (dash === '10, 10')
                    layer.feature.properties.style = 'dashed';
                else if (dash === '2, 8')
                    layer.feature.properties.style = 'dotted';
                else
                    layer.feature.properties.style = 'solid';
            }
        });
    });
}
// Перед видаленням featureGroup або шару — видаляю всі overlay з featureGroup і з карти
export function removeFeatureGroupAndOverlays(featureGroup) {
    if (featureGroup && featureGroup.overlays) {
        featureGroup.getLayers().forEach((l) => {
            if (l._url && featureGroup.overlays.some((img) => img.url === l._url)) {
                l.off(); // Відписуємо всі події
                featureGroup.removeLayer(l);
            }
        });
        featureGroup.overlays = [];
    }
}
// --- Overlay logic ---
export function addOverlayToFeatureGroup(featureGroup, url) {
    const center = map.getCenter();
    const bounds = [
        [center.lat - 0.005, center.lng - 0.01],
        [center.lat + 0.005, center.lng + 0.01]
    ];
    const overlay = window.L.distortableImageOverlay(url, { bounds, selected: true }).addTo(map);
    overlay._customUrl = url;
    overlay._overlayId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Ініціалізуємо масиви якщо потрібно
    if (!featureGroup.images)
        featureGroup.images = [];
    if (!featureGroup.overlays)
        featureGroup.overlays = [];
    if (!featureGroup.overlayInstances)
        featureGroup.overlayInstances = [];
    // Додаємо метадані (не Leaflet об'єкти)
    const imageData = { url, bounds, corners: overlay.getCorners() };
    featureGroup.images.push(imageData);
    featureGroup.overlays.push(imageData); // Метадані, не Leaflet об'єкт!
    featureGroup.overlayInstances.push(overlay); // Leaflet об'єкт окремо
    // Debounced збереження
    let saveTimeout = null;
    const debouncedSave = () => {
        if (saveTimeout)
            clearTimeout(saveTimeout);
        saveTimeout = window.setTimeout(() => {
            saveLayersToStorage();
            saveTimeout = null;
        }, 100);
    };
    overlay.on('edit', () => {
        const idx = featureGroup.images.findIndex((img) => img.url === url);
        const overlayIdx = featureGroup.overlays.findIndex((img) => img.url === url);
        if (idx !== -1) {
            featureGroup.images[idx].bounds = overlay.getBounds();
            featureGroup.images[idx].corners = overlay.getCorners();
        }
        if (overlayIdx !== -1) {
            featureGroup.overlays[overlayIdx].bounds = overlay.getBounds();
            featureGroup.overlays[overlayIdx].corners = overlay.getCorners();
        }
        console.log(`Додатковий overlay ${overlay._overlayId} оновлено`);
        debouncedSave();
    });
    debouncedSave();
}
export function removeAllOverlaysFromFeatureGroup(featureGroup) {
    var _a, _b, _c;
    // Захист від очищення під час відновлення 
    if (featureGroup._restoringOverlays && featureGroup._cleaningInProgress) {
        console.log(`🔒 Очищення пропущено - вже відбувається відновлення`);
        return;
    }
    featureGroup._cleaningInProgress = true;
    console.log(`🗑️ Очищення overlay з featureGroup`, {
        instances: ((_a = featureGroup.overlayInstances) === null || _a === void 0 ? void 0 : _a.length) || 0,
        overlays: ((_b = featureGroup.overlays) === null || _b === void 0 ? void 0 : _b.length) || 0,
        images: ((_c = featureGroup.images) === null || _c === void 0 ? void 0 : _c.length) || 0
    });
    // Видаляємо Leaflet overlay об'єкти з карти через overlayInstances
    if (featureGroup.overlayInstances && Array.isArray(featureGroup.overlayInstances)) {
        console.log(`🗑️ Видаляємо ${featureGroup.overlayInstances.length} overlay instances`);
        featureGroup.overlayInstances.forEach((ov, idx) => {
            try {
                if (ov && ov._overlayId) {
                    console.log(`🗑️ Видаляємо overlay ${ov._overlayId} (${idx})`);
                }
                if (ov && typeof ov.remove === 'function') {
                    ov.remove();
                }
                else if (ov) {
                    map.removeLayer(ov);
                }
            }
            catch (error) {
                console.warn(`⚠️ Помилка при видаленні overlay ${idx}:`, error);
            }
        });
    }
    // Видаляємо усі DOM елементи leaflet-image-layer, що відповідають нашим зображенням
    if (featureGroup.images && Array.isArray(featureGroup.images)) {
        featureGroup.images.forEach((img) => {
            const imgElements = document.querySelectorAll(`img.leaflet-image-layer[src="${img.url}"]`);
            imgElements.forEach(el => {
                console.log(`🗑️ Видаляємо DOM елемент img для ${img.url.substring(0, 50)}...`);
                el.remove();
            });
        });
    }
    // Видаляємо overlay об'єкти з Leaflet featureGroup._layers
    if (featureGroup._layers) {
        const layerIds = Object.keys(featureGroup._layers);
        layerIds.forEach(layerId => {
            const layer = featureGroup._layers[layerId];
            // Перевіряємо, чи це distortable image overlay
            if (layer && (layer._url || layer._image || layer.constructor.name.includes('Distortable'))) {
                console.log(`🗑️ Видаляємо layer ${layerId} з featureGroup._layers`);
                try {
                    if (typeof layer.remove === 'function') {
                        layer.remove();
                    }
                    else {
                        featureGroup.removeLayer(layer);
                    }
                }
                catch (error) {
                    console.warn(`⚠️ Помилка при видаленні layer ${layerId}:`, error);
                }
            }
        });
    }
    // Повністю очищуємо масиви
    featureGroup.overlayInstances = [];
    featureGroup.overlays = [];
    // НЕ очищуємо featureGroup.images - це наші метадані для відновлення
    console.log(`✅ Очищення завершено`);
    featureGroup._cleaningInProgress = false;
}
export function restoreOverlaysForFeatureGroup(featureGroup) {
    var _a;
    // Захист від повторних викликів
    if (featureGroup._restoringOverlays) {
        console.warn(`⚠️ restoreOverlaysForFeatureGroup вже виконується для цього featureGroup, пропускаємо`);
        return;
    }
    featureGroup._restoringOverlays = true;
    console.log(`🔄 Відновлення overlay для featureGroup`, { imagesCount: (_a = featureGroup.images) === null || _a === void 0 ? void 0 : _a.length });
    // Повністю очищуємо всі overlay структури
    removeAllOverlaysFromFeatureGroup(featureGroup);
    if (!featureGroup.images || !Array.isArray(featureGroup.images) || featureGroup.images.length === 0) {
        console.log('📭 Немає зображень для відновлення');
        featureGroup._restoringOverlays = false;
        return;
    }
    // Ініціалізуємо порожні масиви
    featureGroup.overlays = [];
    featureGroup.overlayInstances = [];
    console.log(`📦 Відновлюємо ${featureGroup.images.length} зображень`);
    featureGroup.images.forEach((img, imgIndex) => {
        var _a, _b;
        console.log(`🖼️ Створюємо overlay ${imgIndex + 1}/${featureGroup.images.length}`, {
            url: ((_a = img.url) === null || _a === void 0 ? void 0 : _a.substring(0, 50)) + '...',
            hasCorners: !!(img.corners && img.corners.length === 4)
        });
        // Перевіряємо, чи overlay вже існує в DOM
        const existingImg = document.querySelector(`img.leaflet-image-layer[src="${img.url}"]`);
        if (existingImg) {
            console.warn(`⚠️ Overlay вже існує в DOM, пропускаємо створення для ${img.url.substring(0, 50)}...`);
            return;
        }
        // Створюємо overlay
        let overlay;
        try {
            if (img.corners && img.corners.length === 4) {
                overlay = window.L.distortableImageOverlay(img.url, {
                    corners: img.corners,
                    selected: false
                }).addTo(map);
            }
            else {
                overlay = window.L.distortableImageOverlay(img.url, {
                    bounds: img.bounds,
                    selected: false
                }).addTo(map);
            }
        }
        catch (error) {
            console.error(`❌ Помилка створення overlay ${imgIndex}:`, error);
            return; // В forEach потрібно використовувати return замість continue
        }
        // Додаємо метадані
        overlay._customUrl = img.url;
        overlay._overlayId = `restored_${Date.now()}_${imgIndex}_${Math.random().toString(36).substr(2, 6)}`;
        console.log(`✅ Створено overlay ${overlay._overlayId}`);
        // Зберігаємо в масивах (НЕ перевіряємо дублікати, бо ми щойно очистили)
        featureGroup.overlayInstances.push(overlay);
        featureGroup.overlays.push({
            url: img.url,
            bounds: img.bounds,
            opacity: (_b = img.opacity) !== null && _b !== void 0 ? _b : 1,
            corners: img.corners
        });
        // Глобальний debounced save (один для всіх overlay)
        let globalSaveTimeout = null;
        const globalDebouncedSave = () => {
            if (globalSaveTimeout)
                clearTimeout(globalSaveTimeout);
            globalSaveTimeout = window.setTimeout(() => {
                console.log(`💾 Глобальне збереження після редагування overlay`);
                saveLayersToStorage();
                globalSaveTimeout = null;
            }, 200); // Більший delay для групування змін
        };
        // Обробник подій edit (тільки один!)
        overlay.on('edit', () => {
            console.log(`🎯 Edit event для overlay ${overlay._overlayId}`);
            const newBounds = overlay.getBounds();
            const newCorners = overlay.getCorners();
            // Оновлюємо ТІЛЬКИ в images (основний масив)
            if (featureGroup.images[imgIndex]) {
                featureGroup.images[imgIndex].bounds = newBounds;
                featureGroup.images[imgIndex].corners = newCorners;
                console.log(`📝 Оновлено images[${imgIndex}] для overlay ${overlay._overlayId}`);
            }
            // Оновлюємо в overlays по URL (запасний масив)
            const overlayIdx = featureGroup.overlays.findIndex((o) => o.url === img.url);
            if (overlayIdx !== -1) {
                featureGroup.overlays[overlayIdx].bounds = newBounds;
                featureGroup.overlays[overlayIdx].corners = newCorners;
                console.log(`📝 Оновлено overlays[${overlayIdx}] для overlay ${overlay._overlayId}`);
            }
            else {
                console.warn(`⚠️ Не знайдено overlay в overlays масиві для ${overlay._overlayId}`);
            }
            globalDebouncedSave();
        });
    });
    console.log(`🎉 Відновлення завершено:`, {
        images: featureGroup.images.length,
        overlays: featureGroup.overlays.length,
        instances: featureGroup.overlayInstances.length
    });
    // Знімаємо прапорець відновлення
    featureGroup._restoringOverlays = false;
}
