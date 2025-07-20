export let customLayers = [];
export let activeLayer = null;
export let layerId = 1;
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
import { showEditModal, addDoubleClickToLayer, createLayerControl, layerControlsDiv } from './ui.js';
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
                layer.feature.properties.image = layer.properties.image;
            }
        });
    });
    const layersData = customLayers.map(l => {
        // @ts-ignore
        const images = l.featureGroup.images || [];
        const imagesWithCorners = images.map((img) => {
            var _a;
            // @ts-ignore
            const overlay = (_a = l.featureGroup.overlays) === null || _a === void 0 ? void 0 : _a.find((o) => { var _a; return o._customUrl === img.url || o._url === img.url || ((_a = o._image) === null || _a === void 0 ? void 0 : _a.src) === img.url; });
            if (overlay && overlay.getCorners) {
                return Object.assign(Object.assign({}, img), { corners: overlay.getCorners(), bounds: overlay.getBounds(), properties: overlay.properties || {} });
            }
            return Object.assign(Object.assign({}, img), { properties: img.properties || {} });
        });
        return {
            id: l.id,
            tileType: l.tileType,
            opacity: l.tileLayer.options.opacity,
            // @ts-ignore
            showLabels: l.tileLayer._url && l.tileLayer._url.includes('nolabels') ? false : true,
            geojson: l.featureGroup.toGeoJSON(),
            images: imagesWithCorners,
            title: l.title || undefined,
            visible: l.visible !== false,
            collapsed: l.collapsed || false
        };
    });
    localStorage.setItem('lefleat_layers', JSON.stringify(layersData));
}
export function loadLayersFromStorage() {
    const data = localStorage.getItem('lefleat_layers');
    if (!data)
        return false;
    try {
        const arr = JSON.parse(data);
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
                                layer.properties.image = feature.properties.image;
                            }
                        }
                    }
                });
            }
            if (obj.images && Array.isArray(obj.images)) {
                // @ts-ignore
                featureGroup.images = [];
                obj.images.forEach((img) => {
                    let overlay;
                    if (img.corners && img.corners.length === 4) {
                        overlay = L.distortableImageOverlay(img.url, {
                            corners: img.corners,
                            selected: false
                        }).addTo(map);
                    }
                    else if (img.bounds) {
                        overlay = L.distortableImageOverlay(img.url, {
                            bounds: img.bounds,
                            selected: false
                        }).addTo(map);
                    }
                    else {
                        return;
                    }
                    overlay._customUrl = img.url;
                    if (img.properties) {
                        overlay.properties = img.properties;
                        applyObjectProperties(overlay, img.properties);
                        if (typeof img.properties.opacity === 'number') {
                            overlay.setOpacity(img.properties.opacity);
                        }
                    }
                    const el = overlay.getElement();
                    if (el) {
                        el.addEventListener('click', function (e) {
                            e.stopPropagation();
                            overlay.select();
                        });
                        el.addEventListener('dblclick', function (e) {
                            e.stopPropagation();
                            showEditModal(overlay);
                        });
                    }
                    overlay.select();
                    const savedData = {
                        url: img.url,
                        bounds: overlay.getBounds(),
                        corners: overlay.getCorners ? overlay.getCorners() : img.corners,
                        properties: img.properties || {}
                    };
                    // @ts-ignore
                    featureGroup.images.push(savedData);
                    if (!(featureGroup.overlays))
                        (featureGroup.overlays = []);
                    (featureGroup.overlays).push(overlay);
                    overlay.on('edit', () => {
                        // @ts-ignore
                        const idx = featureGroup.images.findIndex((i) => i.url === img.url);
                        if (idx !== -1) {
                            // @ts-ignore
                            featureGroup.images[idx].bounds = overlay.getBounds();
                            // @ts-ignore
                            featureGroup.images[idx].corners = overlay.getCorners ? overlay.getCorners() : null;
                            saveLayersToStorage();
                        }
                    });
                });
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
        return true;
    }
    catch (e) {
        console.error('[loadLayersFromStorage] error:', e);
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
    const layersData = customLayers.map(l => {
        // @ts-ignore
        const images = l.featureGroup.images || [];
        const imagesWithCorners = images.map((img) => {
            var _a;
            // @ts-ignore
            const overlay = (_a = l.featureGroup.overlays) === null || _a === void 0 ? void 0 : _a.find((o) => { var _a; return o._customUrl === img.url || o._url === img.url || ((_a = o._image) === null || _a === void 0 ? void 0 : _a.src) === img.url; });
            if (overlay && overlay.getCorners) {
                return Object.assign(Object.assign({}, img), { corners: overlay.getCorners(), bounds: overlay.getBounds(), properties: overlay.properties || {} });
            }
            return Object.assign(Object.assign({}, img), { properties: img.properties || {} });
        });
        return {
            id: l.id,
            tileType: l.tileType,
            opacity: l.tileLayer.options.opacity,
            // @ts-ignore
            showLabels: l.tileLayer._url && l.tileLayer._url.includes('nolabels') ? false : true,
            geojson: l.featureGroup.toGeoJSON(),
            images: imagesWithCorners,
            title: l.title || undefined,
            visible: l.visible !== false,
            collapsed: l.collapsed || false
        };
    });
    localStorage.setItem('lefleat_layers', JSON.stringify(layersData));
}
