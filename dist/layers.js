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
import { isTextObject, getTextObjectIcon, applyTextZoomScale } from './text-object.js';
// --- Реалізація з main.ts ---
export function saveLayersToStorage() {
    customLayers.forEach(l => {
        l.featureGroup.eachLayer((layer) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
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
            else if (type === 'text') {
                layer.feature.properties.text = ((_j = layer.properties) === null || _j === void 0 ? void 0 : _j.text) || '';
                layer.feature.properties.fontSize = (_l = (_k = layer.properties) === null || _k === void 0 ? void 0 : _k.fontSize) !== null && _l !== void 0 ? _l : 24;
                layer.feature.properties.color = ((_m = layer.properties) === null || _m === void 0 ? void 0 : _m.color) || '#1976d2';
                layer.feature.properties.rotation = (_p = (_o = layer.properties) === null || _o === void 0 ? void 0 : _o.rotation) !== null && _p !== void 0 ? _p : 0;
                layer.feature.properties.objectType = 'text';
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
        }
        // Створюємо GeoJSON вручну, щоб зберегти наші feature об'єкти
        const features = [];
        l.featureGroup.eachLayer((layer) => {
            var _a, _b;
            if (layer.feature) {
                // Використовуємо наш створений feature об'єкт
                features.push(layer.feature);
                console.log(`💾 Зберігаємо feature об'єкт: ${layer.feature.geometry.type} для ${((_a = layer.properties) === null || _a === void 0 ? void 0 : _a.name) || 'об\'єкта'}`);
            }
            else {
                // Fallback до стандартного toGeoJSON для об'єктів без feature
                try {
                    const layerGeoJSON = layer.toGeoJSON();
                    if (layerGeoJSON) {
                        features.push(layerGeoJSON);
                        console.log(`💾 Fallback toGeoJSON: ${layerGeoJSON.geometry.type} для ${((_b = layer.properties) === null || _b === void 0 ? void 0 : _b.name) || 'об\'єкта'}`);
                    }
                }
                catch (error) {
                    console.warn('Помилка toGeoJSON для об\'єкта:', error);
                }
            }
        });
        const geojson = {
            type: 'FeatureCollection',
            features: features
        };
        console.log(`📊 Збережено ${features.length} об'єктів для шару "${l.title}"`);
        return {
            id: l.id,
            tileType: l.tileType,
            opacity: l.tileLayer.options.opacity,
            showLabels: l.tileLayer._url && l.tileLayer._url.includes('nolabels') ? false : true,
            geojson: geojson,
            title: l.title || undefined,
            visible: l.visible !== false,
            collapsed: l.collapsed || false,
            overlays
        };
    });
    // Перевіряємо, що дані не порожні перед збереженням
    if (layersData.length > 0) {
        localStorage.setItem('lefleat_layers', JSON.stringify(layersData));
    }
}
export function loadLayersFromStorage() {
    const data = localStorage.getItem('lefleat_layers');
    if (!data) {
        return false;
    }
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
            // Додаємо на карту тільки якщо шар видимий
            if (obj.visible !== false) {
                tileLayer.addTo(map);
                featureGroup.addTo(map);
            }
            if (obj.geojson) {
                L.geoJSON(obj.geojson, {
                    pointToLayer: function (feature, latlng) {
                        const props = feature.properties || {};
                        if (props.objectType === 'text' || props.text !== undefined) {
                            return L.marker(latlng, { icon: getTextObjectIcon(props), draggable: true });
                        }
                        const color = props.color || '#1976d2';
                        const iconName = props.icon || 'place';
                        return L.marker(latlng, {
                            icon: getColoredMarkerIcon(color, iconName)
                        });
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
                        var _a;
                        featureGroup.addLayer(layer);
                        addDoubleClickToLayer(layer);
                        if (feature.properties) {
                            layer.properties = Object.assign({}, feature.properties);
                            // Виправляємо undefined значення для назви та опису
                            if (!layer.properties.name || layer.properties.name === 'undefined') {
                                const type = (_a = feature.geometry) === null || _a === void 0 ? void 0 : _a.type;
                                const objectType = type === 'Point' ? 'Маркер' :
                                    type === 'Polygon' ? 'Полігон' :
                                        type === 'LineString' ? 'Лінія' : 'Об\'єкт';
                                layer.properties.name = `${objectType} [без назви]`;
                            }
                            if (!layer.properties.description || layer.properties.description === 'undefined') {
                                layer.properties.description = '';
                            }
                            // Встановити objectType для текстових об'єктів
                            if (isTextObject(layer)) {
                                layer.properties.objectType = 'text';
                                layer._textBaseZoom = map.getZoom();
                                applyTextZoomScale(layer, map.getZoom());
                            }
                            applyObjectProperties(layer, layer.properties);
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
                // Відновлюємо overlay тільки для видимих шарів
                if (obj.visible !== false) {
                    restoreOverlaysForFeatureGroup(featureGroup);
                }
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
        // Автоматичне виправлення проблем з видимістю об'єктів
        const totalObjects = customLayers.reduce((sum, layer) => sum + layer.featureGroup.getLayers().length, 0);
        // Перевірка та автоматичне виправлення через затримку
        setTimeout(() => {
            const visibleObjectsCount = customLayers.reduce((sum, layer) => {
                if (!layer.visible)
                    return sum;
                return sum + layer.featureGroup.getLayers().filter((l) => map.hasLayer(l)).length;
            }, 0);
            if (visibleObjectsCount === 0 && totalObjects > 0) {
                // Спроба повторної ініціалізації видимих шарів
                customLayers.forEach(layer => {
                    if (layer.visible && layer.featureGroup.getLayers().length > 0) {
                        if (!map.hasLayer(layer.featureGroup)) {
                            layer.featureGroup.addTo(map);
                        }
                        layer.featureGroup.bringToFront();
                    }
                });
            }
        }, 100);
        // Оновлюємо layerId до максимального існуючого ID + 1
        const maxId = customLayers.length > 0 ? Math.max(...customLayers.map(l => l.id)) : 0;
        layerId = maxId + 1;
        // Перевіряємо та виправляємо дублюючі ID
        const usedIds = new Set();
        let hasChanges = false;
        customLayers.forEach((layer, index) => {
            if (usedIds.has(layer.id)) {
                // Знайшли дублікат - присвоюємо новий унікальний ID
                while (usedIds.has(layerId)) {
                    layerId++;
                }
                layer.id = layerId;
                usedIds.add(layerId);
                layerId++;
                hasChanges = true;
                // Оновлюємо data-layer-id в DOM
                const layerCard = document.querySelector(`[data-layer-id="${layer.id}"]`);
                if (!layerCard) {
                    // Шукаємо картку по інших ознаках та оновлюємо
                    const allCards = document.querySelectorAll('.layer-card');
                    if (allCards[index]) {
                        allCards[index].dataset.layerId = layer.id.toString();
                    }
                }
            }
            else {
                usedIds.add(layer.id);
            }
        });
        // Якщо були зміни, зберігаємо оновлені дані
        if (hasChanges) {
            saveLayersToStorage();
            // Перегенеровуємо UI щоб оновити всі data-layer-id
            if (layerControlsDiv) {
                layerControlsDiv.innerHTML = '';
                customLayers.forEach(layer => {
                    createLayerControl(layer);
                });
            }
        }
        return true;
    }
    catch (e) {
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
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
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
            else if (type === 'text') {
                layer.feature.properties.text = ((_j = layer.properties) === null || _j === void 0 ? void 0 : _j.text) || '';
                layer.feature.properties.fontSize = (_l = (_k = layer.properties) === null || _k === void 0 ? void 0 : _k.fontSize) !== null && _l !== void 0 ? _l : 24;
                layer.feature.properties.color = ((_m = layer.properties) === null || _m === void 0 ? void 0 : _m.color) || '#1976d2';
                layer.feature.properties.rotation = (_p = (_o = layer.properties) === null || _o === void 0 ? void 0 : _o.rotation) !== null && _p !== void 0 ? _p : 0;
                layer.feature.properties.objectType = 'text';
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
    var _a;
    const center = map.getCenter();
    const bounds = [
        [center.lat - 0.005, center.lng - 0.01],
        [center.lat + 0.005, center.lng + 0.01]
    ];
    const overlay = window.L.distortableImageOverlay(url, { bounds, selected: true }).addTo(map);
    overlay._customUrl = url;
    overlay._overlayId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🆕 Додаємо overlay через addOverlayToFeatureGroup:`);
    console.log(`   URL: ${url.substring(0, 50)}...`);
    // Ініціалізуємо масиви якщо потрібно
    if (!featureGroup.images)
        featureGroup.images = [];
    if (!featureGroup.overlays)
        featureGroup.overlays = [];
    if (!featureGroup.overlayInstances)
        featureGroup.overlayInstances = [];
    // Створюємо imageData з повними даними включно з corners
    const initialCorners = ((_a = overlay.getCorners) === null || _a === void 0 ? void 0 : _a.call(overlay)) ?
        overlay.getCorners().map((c) => ({ lat: c.lat, lng: c.lng })) : null;
    const imageData = {
        url,
        bounds,
        corners: initialCorners,
        opacity: 1
    };
    console.log(`   Початкові corners:`, initialCorners);
    // Додаємо метадані
    featureGroup.images.push(imageData);
    featureGroup.overlays.push(Object.assign({}, imageData)); // Копія для сумісності
    featureGroup.overlayInstances.push(overlay); // Leaflet об'єкт окремо
    console.log(`✅ Додано в масиви: images[${featureGroup.images.length - 1}], overlays[${featureGroup.overlays.length - 1}], instances[${featureGroup.overlayInstances.length - 1}]`);
    // Debounced збереження
    let saveTimeout = null;
    const debouncedSave = () => {
        if (saveTimeout)
            clearTimeout(saveTimeout);
        saveTimeout = window.setTimeout(() => {
            console.log(`💾 Збереження в localStorage через manual debounced save...`);
            saveLayersToStorage();
            saveTimeout = null;
        }, 100);
    };
    console.log(`🎧 Підключаємо ПОКРАЩЕНИЙ edit обробник для manual overlay...`);
    // Використовуємо покращений edit handler якщо доступний
    if (window.overlayPositionFix && window.overlayPositionFix.createEditHandler) {
        console.log(`🔧 Використовуємо покращений edit handler v2.8`);
        const enhancedHandler = window.overlayPositionFix.createEditHandler(overlay, url, featureGroup);
        overlay.on('edit', enhancedHandler);
    }
    else {
        console.log(`⚠️ Покращений handler недоступний, використовуємо fallback`);
        overlay.on('edit', () => {
            var _a;
            const overlayUrl = overlay._customUrl || url;
            console.log(`🔄 Edit подія для manual overlay: ${overlayUrl === null || overlayUrl === void 0 ? void 0 : overlayUrl.substring(0, 50)}...`);
            const newBounds = overlay.getBounds();
            const newCorners = ((_a = overlay.getCorners) === null || _a === void 0 ? void 0 : _a.call(overlay)) ?
                overlay.getCorners().map((c) => ({ lat: c.lat, lng: c.lng })) : null;
            console.log(`   Нові bounds:`, newBounds);
            console.log(`   Нові corners:`, newCorners);
            const idx = featureGroup.images.findIndex((img) => img.url === url);
            const overlayIdx = featureGroup.overlays.findIndex((img) => img.url === url);
            console.log(`🔍 Пошук по URL: imageIdx=${idx}, overlayIdx=${overlayIdx}`);
            if (idx !== -1) {
                featureGroup.images[idx].bounds = newBounds;
                featureGroup.images[idx].corners = newCorners;
                console.log(`✅ Оновлено images[${idx}] bounds і corners`);
            }
            else {
                console.log(`⚠️ Не знайдено в images масиві для URL: ${url.substring(0, 50)}...`);
            }
            if (overlayIdx !== -1) {
                featureGroup.overlays[overlayIdx].bounds = newBounds;
                featureGroup.overlays[overlayIdx].corners = newCorners;
                console.log(`✅ Оновлено overlays[${overlayIdx}] bounds і corners`);
            }
            else {
                console.log(`⚠️ Не знайдено в overlays масиві для URL: ${url.substring(0, 50)}...`);
            }
            console.log(`💾 Викликаємо збереження в localStorage через ${100}мс...`);
            debouncedSave();
        });
    }
    // Синхронне початкове збереження
    console.log(`💾 Початкове синхронне збереження manual overlay...`);
    saveLayersToStorage();
    console.log(`✅ Початкове збереження manual overlay завершено`);
}
export function removeAllOverlaysFromFeatureGroup(featureGroup) {
    // Захист від очищення під час відновлення 
    if (featureGroup._restoringOverlays && featureGroup._cleaningInProgress) {
        return;
    }
    featureGroup._cleaningInProgress = true;
    // Видаляємо Leaflet overlay об'єкти з карти через overlayInstances
    if (featureGroup.overlayInstances && Array.isArray(featureGroup.overlayInstances)) {
        featureGroup.overlayInstances.forEach((ov, idx) => {
            try {
                if (ov && typeof ov.remove === 'function') {
                    ov.remove();
                }
                else if (ov) {
                    map.removeLayer(ov);
                }
            }
            catch (error) {
                // Ігноруємо помилки видалення
            }
        });
    }
    // Видаляємо усі DOM елементи leaflet-image-layer, що відповідають нашим зображенням
    if (featureGroup.images && Array.isArray(featureGroup.images)) {
        featureGroup.images.forEach((img) => {
            const imgElements = document.querySelectorAll(`img.leaflet-image-layer[src="${img.url}"]`);
            imgElements.forEach(el => {
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
                try {
                    if (typeof layer.remove === 'function') {
                        layer.remove();
                    }
                    else {
                        featureGroup.removeLayer(layer);
                    }
                }
                catch (error) {
                    // Ігноруємо помилки видалення
                }
            }
        });
    }
    // Повністю очищуємо масиви
    featureGroup.overlayInstances = [];
    featureGroup.overlays = [];
    // НЕ очищуємо featureGroup.images - це наші метадані для відновлення
    featureGroup._cleaningInProgress = false;
}
export function restoreOverlaysForFeatureGroup(featureGroup) {
    // Захист від повторних викликів
    if (featureGroup._restoringOverlays) {
        return;
    }
    featureGroup._restoringOverlays = true;
    // Повністю очищуємо всі overlay структури
    removeAllOverlaysFromFeatureGroup(featureGroup);
    if (!featureGroup.images || !Array.isArray(featureGroup.images) || featureGroup.images.length === 0) {
        featureGroup._restoringOverlays = false;
        return;
    }
    // Ініціалізуємо порожні масиви
    featureGroup.overlays = [];
    featureGroup.overlayInstances = [];
    // Глобальний debounced save (один для всіх overlay)
    let globalSaveTimeout = null;
    const globalDebouncedSave = () => {
        if (globalSaveTimeout)
            clearTimeout(globalSaveTimeout);
        globalSaveTimeout = window.setTimeout(() => {
            saveLayersToStorage();
            globalSaveTimeout = null;
        }, 200); // Більший delay для групування змін
    };
    featureGroup.images.forEach((img, originalIndex) => {
        var _a;
        // Перевіряємо, чи overlay вже існує в DOM
        const existingImg = document.querySelector(`img.leaflet-image-layer[src="${img.url}"]`);
        if (existingImg) {
            return;
        }
        // Створюємо overlay
        let overlay;
        try {
            if (img.corners && img.corners.length === 4) {
                overlay = window.L.distortableImageOverlay(img.url, {
                    corners: img.corners,
                    selected: false
                });
            }
            else {
                overlay = window.L.distortableImageOverlay(img.url, {
                    bounds: img.bounds,
                    selected: false
                });
            }
        }
        catch (error) {
            return; // В forEach потрібно використовувати return замість continue
        }
        // Додаємо метадані
        overlay._customUrl = img.url;
        overlay._overlayId = `restored_${Date.now()}_${originalIndex}_${Math.random().toString(36).substr(2, 6)}`;
        // Додаємо overlay на карту тільки якщо featureGroup також на карті
        if (map.hasLayer(featureGroup)) {
            overlay.addTo(map);
        }
        // Зберігаємо в масивах (НЕ перевіряємо дублікати, бо ми щойно очистили)
        featureGroup.overlayInstances.push(overlay);
        featureGroup.overlays.push({
            url: img.url,
            bounds: img.bounds,
            opacity: (_a = img.opacity) !== null && _a !== void 0 ? _a : 1,
            corners: img.corners
        });
        // Використовуємо покращений edit handler якщо доступний
        if (window.overlayPositionFix && window.overlayPositionFix.createEditHandler) {
            console.log(`🔧 Використовуємо покращений edit handler v2.8 для відновленого overlay`);
            const enhancedHandler = window.overlayPositionFix.createEditHandler(overlay, img.url, featureGroup);
            overlay.on('edit', enhancedHandler);
        }
        else {
            console.log(`⚠️ Покращений handler недоступний для відновленого overlay`);
            // Обробник подій edit - використовуємо URL для пошуку замість індексу
            overlay.on('edit', () => {
                var _a;
                const newBounds = overlay.getBounds();
                const newCorners = ((_a = overlay.getCorners()) === null || _a === void 0 ? void 0 : _a.map((c) => ({ lat: c.lat, lng: c.lng }))) || null;
                const overlayUrl = overlay._customUrl || img.url;
                console.log(`🔄 Edit подія для overlay: ${overlayUrl === null || overlayUrl === void 0 ? void 0 : overlayUrl.substring(0, 50)}...`);
                // Оновлюємо в images (основний масив) - шукаємо по URL
                const imageIdx = featureGroup.images.findIndex((image) => image.url === overlayUrl);
                if (imageIdx !== -1) {
                    featureGroup.images[imageIdx].bounds = newBounds;
                    featureGroup.images[imageIdx].corners = newCorners;
                    console.log(`✅ Оновлено images[${imageIdx}] bounds і corners`);
                }
                else {
                    console.log(`⚠️ Не знайдено в images масиві для URL: ${overlayUrl}`);
                }
                // Оновлюємо в overlays (запасний масив) - шукаємо по URL
                const overlayIdx = featureGroup.overlays.findIndex((o) => o.url === overlayUrl);
                if (overlayIdx !== -1) {
                    featureGroup.overlays[overlayIdx].bounds = newBounds;
                    featureGroup.overlays[overlayIdx].corners = newCorners;
                    console.log(`✅ Оновлено overlays[${overlayIdx}] bounds і corners`);
                }
                else {
                    console.log(`⚠️ Не знайдено в overlays масиві для URL: ${overlayUrl}`);
                }
                console.log(`💾 Викликаємо збереження в localStorage через ${200}мс...`);
                globalDebouncedSave();
            });
        }
    });
    // Знімаємо прапорець відновлення
    featureGroup._restoringOverlays = false;
}
// Експортуємо customLayers та saveLayersToStorage в глобальну область для requestOverlayDelete
window.customLayers = customLayers;
window.saveLayersToStorage = saveLayersToStorage;
