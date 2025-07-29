// Ініціалізуємо змінні з перевіркою
let _customLayers = [];
let _activeLayer = null;
let _layerId = 1;
export let customLayers = _customLayers;
export let activeLayer = _activeLayer;
export let layerId = _layerId;
// Безпечна функція для логування об'єктів без циклічних посилань
function safeLog(obj, label = 'Object') {
    try {
        if (obj === null || obj === undefined) {
            console.log(`${label}:`, obj);
            return;
        }
        // Для Leaflet об'єктів виводимо тільки основні властивості
        if (obj._leaflet_id !== undefined) {
            console.log(`${label}: Leaflet object (id: ${obj._leaflet_id})`);
            return;
        }
        // Для featureGroup виводимо тільки кількість шарів
        if (obj.getLayers && typeof obj.getLayers === 'function') {
            console.log(`${label}: FeatureGroup (layers: ${obj.getLayers().length})`);
            return;
        }
        // Для звичайних об'єктів виводимо JSON
        console.log(`${label}:`, JSON.stringify(obj, null, 2));
    }
    catch (error) {
        console.log(`${label}: [Object with circular references]`);
    }
}
// Функції для безпечного доступу до змінних
export function getCustomLayers() {
    if (typeof _customLayers === 'undefined') {
        _customLayers = [];
    }
    return _customLayers;
}
export function getActiveLayer() {
    if (typeof _activeLayer === 'undefined') {
        _activeLayer = null;
    }
    return _activeLayer;
}
export function getLayerId() {
    if (typeof _layerId === 'undefined' || _layerId === null) {
        _layerId = 1;
    }
    return _layerId;
}
// Функції для встановлення значень
export function setCustomLayers(layers) {
    _customLayers = layers;
    customLayers = _customLayers;
}
export function setActiveLayerValue(layer) {
    _activeLayer = layer;
    activeLayer = _activeLayer;
}
export function setLayerId(id) {
    _layerId = id;
    layerId = _layerId;
}
export function getNextLayerId() {
    const currentId = getLayerId();
    setLayerId(currentId + 1);
    return currentId;
}
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
import { state } from './state.js';
import { LegacyAdapter } from './adapters/legacy-adapter.js';
// --- Реалізація з main.ts ---
export function saveLayersToStorage() {
    const currentCustomLayers = getCustomLayers();
    console.log('layers.ts: saveLayersToStorage викликано');
    console.log('layers.ts: Кількість шарів:', currentCustomLayers.length);
    currentCustomLayers.forEach(l => {
        l.featureGroup.eachLayer((layer) => {
            const type = getObjectType(layer);
            if (!layer.feature)
                return;
            if (!layer.feature.properties)
                layer.feature.properties = {};
            console.log('layers.ts: Обробляємо об\'єкт:', {
                type: type,
                hasFeature: !!layer.feature,
                hasLayerProperties: !!layer.properties,
                featureProperties: layer.feature.properties ? Object.keys(layer.feature.properties) : [],
                layerProperties: layer.properties ? Object.keys(layer.properties) : []
            });
            // Завжди оновлюємо властивості з layer.properties, якщо вони є
            if (layer.properties) {
                console.log('layers.ts: Оновлюємо властивості з layer.properties до layer.feature.properties');
                Object.assign(layer.feature.properties, layer.properties);
            }
            // Додаємо дефолтні властивості тільки якщо вони відсутні
            if (type === 'marker') {
                if (!layer.feature.properties.color) {
                    layer.feature.properties.color = layer.properties?.color || '#1976d2';
                }
                if (!layer.feature.properties.icon) {
                    layer.feature.properties.icon = layer.properties?.icon || 'place';
                }
                console.log('layers.ts: Властивості маркера після обробки:', {
                    color: layer.feature.properties.color,
                    icon: layer.feature.properties.icon,
                    name: layer.feature.properties.name,
                    propertiesKeys: Object.keys(layer.feature.properties)
                });
            }
            else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
                if (!layer.feature.properties.fillColor) {
                    layer.feature.properties.fillColor = layer.options?.fillColor || '#1976d2';
                }
                if (!layer.feature.properties.color) {
                    layer.feature.properties.color = layer.options?.color || '#1976d2';
                }
                if (!layer.feature.properties.fillOpacity) {
                    layer.feature.properties.fillOpacity = layer.options?.fillOpacity || 0.2;
                }
                if (!layer.feature.properties.opacity) {
                    layer.feature.properties.opacity = layer.options?.opacity || 1;
                }
            }
            else if (type === 'polyline') {
                if (!layer.feature.properties.color) {
                    layer.feature.properties.color = layer.options?.color || '#1976d2';
                }
                if (!layer.feature.properties.weight) {
                    layer.feature.properties.weight = layer.options?.weight || 3;
                }
                if (!layer.feature.properties.opacity) {
                    layer.feature.properties.opacity = layer.options?.opacity || 1;
                }
                if (!layer.feature.properties.style) {
                    let dash = layer.options && layer.options.dashArray !== undefined && layer.options.dashArray !== null ? String(layer.options.dashArray) : '';
                    if (dash === '10, 10')
                        layer.feature.properties.style = 'dashed';
                    else if (dash === '2, 8')
                        layer.feature.properties.style = 'dotted';
                    else
                        layer.feature.properties.style = 'solid';
                }
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
            overlays = imageData.map((img) => ({
                url: img.url,
                bounds: img.bounds,
                opacity: img.opacity ?? 1,
                corners: img.corners // Додаємо corners для збереження трансформацій
            }));
        }
        // Створюємо GeoJSON вручну, щоб зберегти наші feature об'єкти
        const features = [];
        let featureCount = 0;
        let fallbackCount = 0;
        l.featureGroup.eachLayer((layer) => {
            if (layer.feature) {
                // Використовуємо наш створений feature об'єкт
                console.log('layers.ts: Перед збереженням у features, properties:', layer.feature.properties);
                features.push(layer.feature);
                featureCount++;
                console.log('layers.ts: Зберігаємо feature об\'єкт:', {
                    type: layer.feature.geometry?.type,
                    name: layer.feature.properties?.name,
                    hasName: !!layer.feature.properties?.name,
                    icon: layer.feature.properties?.icon
                });
            }
            else {
                // Fallback до стандартного toGeoJSON для об'єктів без feature
                try {
                    const layerGeoJSON = layer.toGeoJSON();
                    if (layerGeoJSON) {
                        features.push(layerGeoJSON);
                        fallbackCount++;
                        console.log('layers.ts: Зберігаємо fallback GeoJSON:', {
                            type: layerGeoJSON.geometry?.type,
                            name: layerGeoJSON.properties?.name,
                            hasName: !!layerGeoJSON.properties?.name
                        });
                    }
                }
                catch (error) {
                    // Мовчазно обробляємо помилки toGeoJSON
                }
            }
        });
        console.log('layers.ts: Підсумок збереження для шару:', {
            layerId: l.id,
            layerTitle: l.title,
            featureCount,
            fallbackCount,
            totalFeatures: features.length
        });
        const geojson = {
            type: 'FeatureCollection',
            features: features
        };
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
        console.log('layers.ts: Зберігаємо дані в localStorage:', layersData.length, 'шарів');
        // Додаткове логування для перевірки збереження іконок
        layersData.forEach((layerData, index) => {
            if (layerData.geojson && layerData.geojson.features) {
                layerData.geojson.features.forEach((feature, featureIndex) => {
                    if (feature.properties && feature.properties.icon) {
                        console.log(`layers.ts: Зберігаємо іконку в шарі ${index}, об'єкт ${featureIndex}:`, feature.properties.icon);
                    }
                });
            }
        });
        localStorage.setItem('lefleat_layers', JSON.stringify(layersData));
        console.log('layers.ts: Дані збережено в localStorage');
    }
    else {
        console.warn('layers.ts: Немає даних для збереження');
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
        const currentCustomLayers = getCustomLayers();
        currentCustomLayers.forEach(l => {
            map.removeLayer(l.tileLayer);
            map.removeLayer(l.featureGroup);
        });
        setCustomLayers([]);
        if (layerControlsDiv) {
            LegacyAdapter.DOM.clearElementContent('layer-controls');
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
                        const color = feature.properties?.color || '#1976d2'; // Дефолтний колір
                        const iconName = feature.properties?.icon || 'place';
                        console.log('layers.ts: Завантажуємо маркер з іконкою:', {
                            iconName: iconName,
                            color: color,
                            name: feature.properties?.name,
                            allProperties: feature.properties
                        });
                        return L.marker(latlng, {
                            icon: getColoredMarkerIcon(color, iconName)
                        });
                    },
                    style: function (feature) {
                        return {
                            color: feature.properties?.color || '#1976d2',
                            weight: feature.properties?.weight || 3,
                            opacity: feature.properties?.opacity ?? 1,
                            fillColor: feature.properties?.fillColor || '#1976d2',
                            fillOpacity: feature.properties?.fillOpacity ?? 0.2
                        };
                    },
                    onEachFeature: function (feature, layer) {
                        featureGroup.addLayer(layer);
                        addDoubleClickToLayer(layer);
                        if (feature.properties) {
                            layer.properties = { ...feature.properties };
                            console.log('layers.ts: onEachFeature - feature.properties:', feature.properties);
                            console.log('layers.ts: onEachFeature - layer.properties після копіювання:', layer.properties);
                            // Виправляємо undefined значення для назви та опису
                            if (!layer.properties.name || layer.properties.name === 'undefined') {
                                const type = feature.geometry?.type;
                                const objectType = type === 'Point' ? 'Маркер' :
                                    type === 'Polygon' ? 'Полігон' :
                                        type === 'LineString' ? 'Лінія' : 'Об\'єкт';
                                layer.properties.name = `${objectType} [без назви]`;
                            }
                            if (!layer.properties.description || layer.properties.description === 'undefined') {
                                layer.properties.description = '';
                            }
                            console.log('layers.ts: onEachFeature - викликаємо applyObjectProperties з:', layer.properties);
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
                const imageData = obj.overlays.map((img) => ({
                    url: img.url,
                    bounds: img.bounds,
                    opacity: img.opacity ?? 1,
                    corners: img.corners
                }));
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
        // Оновлюємо AppManager про завантажені шари
        import('./managers/app-manager.js').then(({ AppManager }) => {
            const appManager = AppManager.getInstance();
            if (appManager.isInitialized()) {
                appManager.updateLayers(customLayers);
            }
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
                LegacyAdapter.DOM.clearElementContent('layer-controls');
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
    // Використовуємо безпечні геттери
    const currentLayerId = getLayerId();
    const currentCustomLayers = getCustomLayers();
    const tileType = "План";
    const tileLayer = createTileLayer(tileType, 1);
    const featureGroup = new L.FeatureGroup();
    tileLayer.addTo(map);
    featureGroup.addTo(map);
    // Додаю дефолтну назву шару
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const layerObj = { id: currentLayerId, tileLayer, featureGroup, tileType, visible: true, title: `Шар ${timeStr}` };
    currentCustomLayers.push(layerObj);
    setCustomLayers(currentCustomLayers);
    createLayerControl(layerObj);
    setLayerId(currentLayerId + 1);
    setActiveLayer(featureGroup);
    featureGroup.bringToFront();
    saveLayersToStorage();
    // Оновлюємо AppManager про зміни в шарах
    import('./managers/app-manager.js').then(({ AppManager }) => {
        const appManager = AppManager.getInstance();
        if (appManager.isInitialized()) {
            appManager.updateLayers(customLayers);
        }
    });
    // Оновлюємо видимість draw control
    import('./draw-control.js').then(({ updateDrawControlVisibility }) => {
        updateDrawControlVisibility();
    });
}
export function setActiveLayer(featureGroup) {
    // Використовуємо безпечний сеттер
    setActiveLayerValue(featureGroup);
    window.activeLayer = featureGroup; // Експортуємо в window для ModalService
    if (state.currentEditingObject) {
        state.currentEditingObject.value = featureGroup;
    }
    updateActiveLayerUI();
    // Оновлюємо draw control для нового активного шару
    import('./draw-control.js').then(({ updateDrawControlForActiveLayer, updateDrawControlVisibility }) => {
        updateDrawControlForActiveLayer();
        updateDrawControlVisibility();
    });
}
export function updateActiveLayerUI() {
    // Використовуємо безпечні геттери
    const currentActiveLayer = getActiveLayer();
    const currentCustomLayers = getCustomLayers();
    console.log('layers.ts: updateActiveLayerUI викликано');
    console.log('layers.ts: activeLayer:', currentActiveLayer ? 'знайдено' : 'не знайдено');
    console.log('layers.ts: layerControlsDiv:', !!layerControlsDiv);
    if (layerControlsDiv) {
        document.querySelectorAll('.layer-card').forEach((card) => {
            const id = +card.dataset.layerId;
            const layer = currentCustomLayers.find(l => l.id === id);
            if (layer && layer.featureGroup === currentActiveLayer) {
                card.classList.add('active');
            }
            else {
                card.classList.remove('active');
            }
        });
    }
    currentCustomLayers.forEach(l => {
        l.featureGroup.eachLayer((layer) => {
            const type = getObjectType(layer);
            if (!layer.feature)
                return;
            if (!layer.feature.properties)
                layer.feature.properties = {};
            if (layer.feature && layer.properties)
                Object.assign(layer.feature.properties, layer.properties);
            Object.assign(layer.feature.properties, layer.properties || {});
            if (type === 'marker') {
                layer.feature.properties.color = layer.properties?.color || '#1976d2';
            }
            else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
                layer.feature.properties.fillColor = layer.options?.fillColor || '#1976d2';
                layer.feature.properties.color = layer.options?.color || '#1976d2';
                layer.feature.properties.fillOpacity = layer.options?.fillOpacity || 0.2;
                layer.feature.properties.opacity = layer.options?.opacity || 1;
            }
            else if (type === 'polyline') {
                layer.feature.properties.color = layer.options?.color || '#1976d2';
                layer.feature.properties.weight = layer.options?.weight || 3;
                layer.feature.properties.opacity = layer.options?.opacity || 1;
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
    // Створюємо imageData з повними даними включно з corners
    const initialCorners = overlay.getCorners?.() ?
        overlay.getCorners().map((c) => ({ lat: c.lat, lng: c.lng })) : null;
    const imageData = {
        url,
        bounds,
        corners: initialCorners,
        opacity: 1
    };
    // Додаємо метадані
    featureGroup.images.push(imageData);
    featureGroup.overlays.push({ ...imageData }); // Копія для сумісності
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
    // Використовуємо покращений edit handler якщо доступний
    if (window.overlayPositionFix && window.overlayPositionFix.createEditHandler) {
        const enhancedHandler = window.overlayPositionFix.createEditHandler(overlay, url, featureGroup);
        overlay.on('edit', enhancedHandler);
    }
    else {
        overlay.on('edit', () => {
            const overlayUrl = overlay._customUrl || url;
            const newBounds = overlay.getBounds();
            const newCorners = overlay.getCorners?.() ?
                overlay.getCorners().map((c) => ({ lat: c.lat, lng: c.lng })) : null;
            const idx = featureGroup.images.findIndex((img) => img.url === url);
            const overlayIdx = featureGroup.overlays.findIndex((img) => img.url === url);
            if (idx !== -1) {
                featureGroup.images[idx].bounds = newBounds;
                featureGroup.images[idx].corners = newCorners;
            }
            if (overlayIdx !== -1) {
                featureGroup.overlays[overlayIdx].bounds = newBounds;
                featureGroup.overlays[overlayIdx].corners = newCorners;
            }
            debouncedSave();
        });
    }
    // Синхронне початкове збереження
    saveLayersToStorage();
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
            opacity: img.opacity ?? 1,
            corners: img.corners
        });
        // Використовуємо покращений edit handler якщо доступний
        if (window.overlayPositionFix && window.overlayPositionFix.createEditHandler) {
            const enhancedHandler = window.overlayPositionFix.createEditHandler(overlay, img.url, featureGroup);
            overlay.on('edit', enhancedHandler);
        }
        else {
            // Обробник подій edit - використовуємо URL для пошуку замість індексу
            overlay.on('edit', () => {
                const newBounds = overlay.getBounds();
                const newCorners = overlay.getCorners()?.map((c) => ({ lat: c.lat, lng: c.lng })) || null;
                const overlayUrl = overlay._customUrl || img.url;
                // Оновлюємо в images (основний масив) - шукаємо по URL
                const imageIdx = featureGroup.images.findIndex((image) => image.url === overlayUrl);
                if (imageIdx !== -1) {
                    featureGroup.images[imageIdx].bounds = newBounds;
                    featureGroup.images[imageIdx].corners = newCorners;
                }
                // Оновлюємо в overlays (запасний масив) - шукаємо по URL
                const overlayIdx = featureGroup.overlays.findIndex((o) => o.url === overlayUrl);
                if (overlayIdx !== -1) {
                    featureGroup.overlays[overlayIdx].bounds = newBounds;
                    featureGroup.overlays[overlayIdx].corners = newCorners;
                }
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
// Оновлюємо AppManager про зміни в шарах
import('./managers/app-manager.js').then(({ AppManager }) => {
    const appManager = AppManager.getInstance();
    if (appManager.isInitialized()) {
        appManager.updateLayers(customLayers);
    }
});
window.activeLayer = activeLayer; // Експортуємо activeLayer для ModalService
//# sourceMappingURL=layers.js.map