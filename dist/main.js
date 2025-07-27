// Версія виправлень overlay
export const OVERLAY_FIX_VERSION = 'v3.4';
import { applyObjectProperties } from './objects.js';
// Функція для оновлення title сторінки з версією
export function updatePageTitle(baseTitle = 'Мапа Львова на Leaflet') {
    document.title = `${baseTitle} ${OVERLAY_FIX_VERSION}`;
}
// Експортуємо версію в глобальну область для debug функцій
window.OVERLAY_FIX_VERSION = OVERLAY_FIX_VERSION;
// Функція для видалення overlay (потрібна для leaflet.distortableimage.js)
window.requestOverlayDelete = function (overlay) {
    if (!overlay) {
        return;
    }
    // Показуємо діалог підтвердження перед видаленням
    import('./ui.js').then(({ showConfirmDialog }) => {
        showConfirmDialog({
            title: 'Видалення зображення',
            message: 'Ви дійсно хочете видалити це зображення?',
            onConfirm: () => {
                // Виконуємо видалення після підтвердження
                performOverlayDeletion(overlay);
            },
            buttons: [
                { text: 'Видалити', action: 'delete', className: 'btn-danger' },
                { text: 'Скасувати', action: 'cancel', className: 'btn-secondary' }
            ]
        });
    });
};
// Функція для очищення стану виділення overlay
function clearOverlaySelection() {
    try {
        // Приховуємо панель редагування зображення - різні варіанти селекторів
        const editToolbars = [
            '.leaflet-toolbar',
            '.leaflet-toolbar-container',
            '.leaflet-toolbar-group',
            '.leaflet-toolbar-section',
            '.leaflet-toolbar-section a',
            '.leaflet-toolbar-section button',
            '.leaflet-edit-toolbar',
            '.leaflet-edit-mode',
            '.leaflet-selection',
            '.leaflet-editing',
            '[class*="toolbar"]',
            '[class*="edit"]',
            '[id*="toolbar"]',
            '[id*="edit"]'
        ];
        // Видаляємо точки кутів (corners) зображення
        const cornerSelectors = [
            '.leaflet-marker-icon.leaflet-marker-draggable',
            '.leaflet-marker-icon[src*="corner"]',
            '.leaflet-marker-icon[src*="handle"]',
            '.leaflet-marker-icon[src*="resize"]'
        ];
        cornerSelectors.forEach(selector => {
            const cornerMarkers = document.querySelectorAll(selector);
            cornerMarkers.forEach(marker => {
                if (marker.parentNode) {
                    marker.parentNode.removeChild(marker);
                }
            });
        });
        // Видаляємо рамку виділення
        const selectionSelectors = [
            '.leaflet-overlay-pane svg',
            '.leaflet-overlay-pane path',
            '.leaflet-overlay-pane rect',
            '.leaflet-overlay-pane circle'
        ];
        selectionSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const el = element;
                if (el && (el.style.stroke === 'blue' || el.style.fill === 'blue' || el.classList.contains('selection'))) {
                    if (el.parentNode) {
                        el.parentNode.removeChild(el);
                    }
                }
            });
        });
        // Видаляємо додаткові елементи виділення
        const selectionElements = document.querySelectorAll('.leaflet-interactive');
        selectionElements.forEach(element => {
            const elementStyle = element.style;
            if (elementStyle && (elementStyle.stroke === 'blue' || elementStyle.fill === 'blue')) {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }
        });
        // Очищуємо активний стан overlay
        if (window.L && window.L.DistortableImageOverlay) {
            // Скидаємо активний overlay якщо він є
            if (window.L.DistortableImageOverlay._activeOverlay) {
                window.L.DistortableImageOverlay._activeOverlay = null;
            }
        }
        // Агресивне очищення: приховуємо всі знайдені елементи редагування
        // Додатково: приховуємо всі елементи з класами, пов'язаними з редагуванням
        const editClasses = [
            '.leaflet-edit-toolbar',
            '.leaflet-edit-mode',
            '.leaflet-selection',
            '.leaflet-editing'
        ];
        editClasses.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const el = element;
                if (el) {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                }
            });
        });
        // Фінальне очищення: приховуємо всі елементи в області карти
        const mapContainer = document.querySelector('#map');
        if (mapContainer) {
            const mapElements = mapContainer.querySelectorAll('*');
            mapElements.forEach(element => {
                const el = element;
                const className = String(el.className || '');
                const id = String(el.id || '');
                if (className.includes('toolbar') ||
                    className.includes('edit') ||
                    className.includes('selection') ||
                    id.includes('toolbar') ||
                    id.includes('edit')) {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                    el.style.opacity = '0';
                }
            });
        }
        // Додаємо CSS стилі для приховування елементів редагування
        const style = document.createElement('style');
        style.id = 'overlay-cleanup-styles';
        style.textContent = `
        .leaflet-toolbar,
        .leaflet-toolbar *,
        .leaflet-edit-toolbar,
        .leaflet-edit-toolbar *,
        .leaflet-selection,
        .leaflet-selection *,
        .leaflet-editing,
        .leaflet-editing *,
        [class*="toolbar"],
        [class*="edit"],
        [id*="toolbar"],
        [id*="edit"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
    `;
        // Видаляємо попередній стиль якщо він є
        const existingStyle = document.getElementById('overlay-cleanup-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
        document.head.appendChild(style);
    }
    catch (error) {
        // Мовчазно обробляємо помилки очищення
    }
}
// Функція для виконання видалення overlay
function performOverlayDeletion(overlay) {
    // Отримуємо URL overlay для пошуку - додаємо підтримку різних структур
    let overlayUrl = overlay._customUrl || overlay._url || overlay.url;
    // Якщо overlay має властивість _overlay, спробуємо отримати URL з неї
    if (!overlayUrl && overlay._overlay) {
        overlayUrl = overlay._overlay._customUrl || overlay._overlay._url || overlay._overlay.url;
    }
    // Якщо все ще немає URL, спробуємо знайти в DOM елементі
    if (!overlayUrl && overlay._image) {
        overlayUrl = overlay._image.src;
    }
    // Знаходимо overlay в системі шарів
    if (window.customLayers) {
        for (const layer of window.customLayers) {
            if (!layer || !layer.featureGroup) {
                continue;
            }
            // Спочатку шукаємо за посиланням на об'єкт
            let overlayIdx = layer.featureGroup.overlayInstances?.indexOf(overlay);
            // Якщо не знайдено за прямим посиланням, шукаємо за вкладеним _overlay
            if (overlayIdx === -1 && overlay._overlay) {
                overlayIdx = layer.featureGroup.overlayInstances?.findIndex((inst) => {
                    return inst === overlay._overlay || inst._overlay === overlay._overlay;
                });
            }
            // Якщо не знайдено, шукаємо за URL
            if (overlayIdx === -1 && overlayUrl) {
                overlayIdx = layer.featureGroup.images?.findIndex((img) => {
                    return img.url === overlayUrl;
                });
            }
            // Додатково шукаємо за _overlayId
            if (overlayIdx === -1 && overlay._overlayId) {
                overlayIdx = layer.featureGroup.images?.findIndex((img) => {
                    return img._overlayId === overlay._overlayId;
                });
            }
            // Якщо все ще не знайдено, шукаємо за всіма можливими властивостями
            if (overlayIdx === -1) {
                // Шукаємо в overlayInstances
                overlayIdx = layer.featureGroup.overlayInstances?.findIndex((inst) => {
                    const instUrl = inst._customUrl || inst._url || inst.url;
                    const overlayUrl = overlay._customUrl || overlay._url || overlay.url;
                    // Порівнюємо URL
                    if (instUrl && overlayUrl && instUrl === overlayUrl) {
                        return true;
                    }
                    // Порівнюємо _overlayId
                    if (inst._overlayId && overlay._overlayId && inst._overlayId === overlay._overlayId) {
                        return true;
                    }
                    return false;
                });
                // Якщо не знайдено в overlayInstances, шукаємо в images
                if (overlayIdx === -1) {
                    overlayIdx = layer.featureGroup.images?.findIndex((img) => {
                        const imgUrl = img._customUrl || img._url || img.url;
                        const overlayUrl = overlay._customUrl || overlay._url || overlay.url;
                        // Порівнюємо URL
                        if (imgUrl && overlayUrl && imgUrl === overlayUrl) {
                            return true;
                        }
                        // Порівнюємо _overlayId
                        if (img._overlayId && overlay._overlayId && img._overlayId === overlay._overlayId) {
                            return true;
                        }
                        return false;
                    });
                }
            }
            if (overlayIdx !== -1) {
                // Видаляємо з усіх масивів
                if (layer.featureGroup.overlayInstances && layer.featureGroup.overlayInstances[overlayIdx]) {
                    layer.featureGroup.overlayInstances.splice(overlayIdx, 1);
                }
                if (layer.featureGroup.images && layer.featureGroup.images[overlayIdx]) {
                    layer.featureGroup.images.splice(overlayIdx, 1);
                }
                if (layer.featureGroup.overlays && layer.featureGroup.overlays[overlayIdx]) {
                    layer.featureGroup.overlays.splice(overlayIdx, 1);
                }
                // Видаляємо з карти
                try {
                    if (map.hasLayer(overlay)) {
                        map.removeLayer(overlay);
                    }
                }
                catch (error) {
                    // Мовчазно обробляємо помилки видалення
                }
                // Зберігаємо зміни
                import('./layers.js').then(({ saveLayersToStorage }) => {
                    saveLayersToStorage();
                });
                // Очищуємо DOM елементи, пов'язані з overlay
                if (overlayUrl) {
                    const imgElements = document.querySelectorAll(`img.leaflet-image-layer[src="${overlayUrl}"]`);
                    imgElements.forEach(el => {
                        el.remove();
                    });
                }
                // Очищуємо стан виділення після видалення з невеликою затримкою
                setTimeout(() => {
                    clearOverlaySelection();
                }, 100);
                return;
            }
        }
    }
    // Якщо overlay не знайдено в системі, але він присутній на карті, видаляємо його напряму
    if (overlay) {
        try {
            if (map.hasLayer(overlay)) {
                map.removeLayer(overlay);
            }
            // Також видаляємо вкладений overlay якщо він є
            if (overlay._overlay && map.hasLayer(overlay._overlay)) {
                map.removeLayer(overlay._overlay);
            }
            // Зберігаємо зміни
            import('./layers.js').then(({ saveLayersToStorage }) => {
                saveLayersToStorage();
            });
            // Очищуємо DOM елементи, пов'язані з overlay
            if (overlayUrl) {
                const imgElements = document.querySelectorAll(`img.leaflet-image-layer[src="${overlayUrl}"]`);
                imgElements.forEach(el => {
                    el.remove();
                });
            }
        }
        catch (error) {
            // Мовчазно обробляємо помилки видалення
        }
        // Очищуємо стан виділення після резервного видалення з невеликою затримкою
        setTimeout(() => {
            clearOverlaySelection();
        }, 100);
    }
}
;
import { map } from './map-init.js';
// Центр Львова
const center = [49.8397, 24.0297];
// Доступні підкладки для шарів
const tileLayerOptions = {
    "План": {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap',
        maxZoom: 19,
        hasLabels: false
    },
    "Ландшафт": {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© OpenTopoMap',
        maxZoom: 17,
        hasLabels: false
    },
    "Супутник": {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles © Esri',
        maxZoom: 19,
        hasLabels: false
    }
};
// Видаляю створення карти та attributionControl з main.ts
// const map = L.map('map', {
//   center: center,
//   zoom: 13,
//   // layers: [baseMap] // прибрано
// });
// ... після створення map ...
// map.attributionControl.addAttribution('<a href="mailto:oleh.dutko@gmail.com">oleh.dutko@gmail.com</a>');
// ... existing code ...
// --- Користувацькі шари ---
import { customLayers, getNextLayerId, createTileLayer, saveLayersToStorage, loadLayersFromStorage, addLayer } from './layers.js';
import { layerControlsDiv, addLayerBtn, exportAllBtn, importAllBtn, importAllInput, showConfirmDialog, createLayerControl } from './ui.js';
import { state } from './state.js';
import { filterMaterialIcons } from './material-icons.js';
// --- глобальний прапорець для drag & drop тултіпів ---
// let isDraggingObject = false; // видалено, бо імпортується з ui.ts
// ... existing code ...
import { getObjectType, getObjectProperties } from './utils.js';
// --- Автокомпліт для інпуту іконки маркера ---
function setupMarkerIconAutocomplete() {
    let input = document.getElementById('marker-icon');
    const list = document.getElementById('marker-icon-autocomplete');
    const preview = document.getElementById('marker-icon-preview');
    if (!input || !list || !preview)
        return;
    // Клонуємо input, щоб скинути всі старі обробники
    const newInput = input.cloneNode(true);
    input.parentNode?.replaceChild(newInput, input);
    input = newInput;
    let currentFocus = -1;
    input.addEventListener('input', function () {
        const val = input.value.trim().toLowerCase();
        list.innerHTML = '';
        preview.textContent = input.value;
        const matches = filterMaterialIcons(val);
        currentFocus = -1;
        matches.forEach((name) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `<span class="material-icons">${name}</span> ${name}`;
            item.onclick = function () {
                input.value = name;
                preview.textContent = name;
                list.innerHTML = '';
                if (state.currentEditingObject.value) {
                    state.currentEditingObject.value.properties = state.currentEditingObject.value.properties || {};
                    state.currentEditingObject.value.properties.icon = name;
                    applyObjectProperties(state.currentEditingObject.value, state.currentEditingObject.value.properties);
                }
            };
            list.appendChild(item);
        });
    });
    input.onkeydown = function (e) {
        const items = list.querySelectorAll('.autocomplete-item');
        if (e.key === 'ArrowDown') {
            currentFocus++;
            if (currentFocus >= items.length)
                currentFocus = 0;
            items.forEach((el, i) => el.classList.toggle('active', i === currentFocus));
            e.preventDefault();
        }
        else if (e.key === 'ArrowUp') {
            currentFocus--;
            if (currentFocus < 0)
                currentFocus = items.length - 1;
            items.forEach((el, i) => el.classList.toggle('active', i === currentFocus));
            e.preventDefault();
        }
        else if (e.key === 'Enter') {
            if (currentFocus > -1 && items[currentFocus]) {
                items[currentFocus].click();
                e.preventDefault();
            }
        }
    };
    input.onfocus = input.oninput;
    document.addEventListener('click', function (e) {
        if (e.target !== input)
            list.innerHTML = '';
    });
}
// --- Додаю глобальний флаг для готовності іконок ---
window.materialIconsReady = false;
// --- Патч для state.ts: після fetch ---
// (цей код треба додати у state.ts після fetch)
// fetch('material-icons-list.json')
//   .then(res => res.json())
//   .then(list => { materialIcons.splice(0, materialIcons.length, ...list); (window as any).materialIconsReady = true; });
// --- Додаю очікування готовності іконок перед автокомплітом ---
function waitForMaterialIconsAndInitAutocomplete() {
    if (window.materialIconsReady) {
        setupMarkerIconAutocomplete();
    }
    else {
        setTimeout(waitForMaterialIconsAndInitAutocomplete, 100);
    }
}
// Використовуємо getColoredMarkerIcon з utils.ts замість дублікату
// Використовуємо applyObjectProperties з objects.ts замість дублікату
// Використовуємо showEditModal з ui.ts замість дублікату
// Функція для закриття модального вікна
export function closeEditModal() {
    const editModal = document.getElementById('edit-object-modal');
    if (editModal)
        editModal.classList.add('hidden');
    state.currentEditingObject.value = null;
}
// Функція для збереження змін
function saveObjectChanges() {
    if (!state.currentEditingObject.value)
        return;
    const type = getObjectType(state.currentEditingObject.value);
    const properties = {
        name: document.getElementById('object-name').value,
        description: document.getElementById('object-description').value
    };
    if (type === 'marker') {
        const markerColor = document.getElementById('object-color');
        if (markerColor)
            properties.color = markerColor.value;
        const markerIcon = document.getElementById('marker-icon');
        if (markerIcon)
            properties.icon = markerIcon.value;
        // --- координати ---
        const latInput = document.getElementById('marker-lat');
        const lngInput = document.getElementById('marker-lng');
        if (latInput && lngInput && state.currentEditingObject.value && state.currentEditingObject.value.setLatLng) {
            const lat = parseFloat(latInput.value);
            const lng = parseFloat(lngInput.value);
            if (!isNaN(lat) && !isNaN(lng)) {
                const old = state.currentEditingObject.value.getLatLng();
                if (lat !== old.lat || lng !== old.lng) {
                    state.currentEditingObject.value.setLatLng([lat, lng]);
                }
            }
        }
    }
    else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
        const fillColor = document.getElementById('object-color');
        if (fillColor)
            properties.fillColor = fillColor.value;
        // Для полігонів колір рамки та прозорість можна додати за потреби
        properties.color = fillColor ? fillColor.value : undefined;
        const objectOpacity = document.getElementById('object-opacity');
        if (objectOpacity)
            properties.fillOpacity = parseFloat(objectOpacity.value);
        properties.opacity = 1;
    }
    else if (type === 'polyline') {
        const objectColor = document.getElementById('object-color');
        if (objectColor)
            properties.color = objectColor.value;
        const lineWidth = document.getElementById('line-width');
        if (lineWidth)
            properties.weight = parseInt(lineWidth.value);
        const lineStyle = document.getElementById('line-style');
        if (lineStyle)
            properties.style = lineStyle.value;
        // opacity не зчитуємо для polyline
    }
    else if (type === 'image') {
        const objectOpacity = document.getElementById('object-opacity');
        if (objectOpacity)
            properties.opacity = parseFloat(objectOpacity.value);
    }
    // зображення
    const imagePreview = document.getElementById('object-image-preview');
    if (imagePreview && imagePreview.src && !imagePreview.classList.contains('hidden')) {
        properties.image = imagePreview.src;
    }
    applyObjectProperties(state.currentEditingObject.value, properties);
    // --- Додаємо копіювання у feature.properties ---
    if (state.currentEditingObject.value.feature && state.currentEditingObject.value.properties) {
        state.currentEditingObject.value.feature.properties = { ...state.currentEditingObject.value.properties };
    }
    saveLayersToStorage();
    closeEditModal();
}
// Ініціалізація модального вікна
function initEditModal() {
    // Обробники подій для кнопок
    document.getElementById('modal-close').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    document.getElementById('save-object').addEventListener('click', saveObjectChanges);
    // --- Додаю підтвердження для видалення об'єкта ---
    document.getElementById('delete-object').onclick = function () {
        if (!state.currentEditingObject.value)
            return;
        const type = getObjectType(state.currentEditingObject.value);
        let typeName = 'обʼєкт';
        if (type === 'marker')
            typeName = 'маркер';
        else if (type === 'polygon')
            typeName = 'полігон';
        else if (type === 'polyline')
            typeName = 'полілінію';
        else if (type === 'rectangle')
            typeName = 'прямокутник';
        else if (type === 'circle')
            typeName = 'коло';
        const properties = getObjectProperties(state.currentEditingObject.value);
        const objectName = properties.name ? `"${properties.name}"` : typeName;
        closeEditModal();
        showConfirmDialog({
            title: `Видалення об'єкта: ${objectName}`,
            message: `Ви дійсно хочете видалити об'єкт ${objectName}?`,
            onConfirm: function (action) {
                if (!state.currentEditingObject.value)
                    return;
                const layerObj = customLayers.find(l => l.featureGroup && l.featureGroup.hasLayer(state.currentEditingObject.value));
                if (layerObj && layerObj.featureGroup) {
                    layerObj.featureGroup.removeLayer(state.currentEditingObject.value);
                }
                map.removeLayer(state.currentEditingObject.value);
                saveLayersToStorage();
            },
            buttons: [
                { text: 'Видалити', action: 'delete', className: 'btn-danger' },
                { text: 'Скасувати', action: 'cancel', className: 'btn-secondary' }
            ]
        });
    };
    // Обробники для range слайдерів
    document.getElementById('line-width').addEventListener('input', function () {
        document.getElementById('line-width-value').textContent = this.value;
    });
    document.getElementById('object-opacity').addEventListener('input', function () {
        document.getElementById('opacity-value').textContent = Math.round(Number(this.value) * 100) + '%';
    });
    // Закриття по кліку поза модальним вікном
    document.getElementById('edit-object-modal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeEditModal();
        }
    });
    // Закриття по Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.getElementById('edit-object-modal').classList.contains('hidden') === false) {
            closeEditModal();
        }
    });
}
// Функція addDoubleClickToLayer перенесена в ui.ts
// --- Геопошук з автокомплітом ---
let searchMarker = null;
(function setupGeoSearch() {
    const input = document.getElementById('geosearch-input');
    const list = document.getElementById('geosearch-autocomplete');
    if (!input || !list)
        return;
    let timer = null;
    let results = [];
    let activeIdx = -1;
    input.addEventListener('input', function () {
        const val = input.value.trim();
        list.innerHTML = '';
        list.classList.remove('active');
        activeIdx = -1;
        if (!val)
            return;
        if (timer)
            clearTimeout(timer);
        timer = window.setTimeout(() => {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&addressdetails=1&limit=7&accept-language=uk`)
                .then(r => r.json())
                .then((data) => {
                results = data;
                if (!results.length)
                    return;
                list.innerHTML = '';
                results.forEach((item, idx) => {
                    const div = document.createElement('div');
                    div.className = 'autocomplete-item';
                    div.textContent = item.display_name;
                    div.addEventListener('mousedown', function (e) {
                        e.preventDefault();
                        selectResult(idx);
                    });
                    list.appendChild(div);
                });
                list.classList.add('active');
            });
        }, 250);
    });
    input.addEventListener('keydown', function (e) {
        if (!results.length)
            return;
        if (e.key === 'ArrowDown') {
            activeIdx = Math.min(activeIdx + 1, results.length - 1);
            updateActive();
            e.preventDefault();
        }
        else if (e.key === 'ArrowUp') {
            activeIdx = Math.max(activeIdx - 1, 0);
            updateActive();
            e.preventDefault();
        }
        else if (e.key === 'Enter') {
            if (activeIdx >= 0) {
                selectResult(activeIdx);
                e.preventDefault();
            }
        }
    });
    document.addEventListener('click', function (e) {
        if (!input.contains(e.target) && !list.contains(e.target)) {
            list.classList.remove('active');
        }
    });
    function updateActive() {
        if (list)
            Array.from(list.children).forEach((el, idx) => {
                if (idx === activeIdx)
                    el.classList.add('active');
                else
                    el.classList.remove('active');
            });
    }
    function selectResult(idx) {
        const item = results[idx];
        if (!item)
            return;
        input.value = item.display_name;
        list.classList.remove('active');
        // @ts-ignore
        if (window.map && item.lat && item.lon) {
            // @ts-ignore
            map.setView([parseFloat(item.lat), parseFloat(item.lon)], 16, { animate: true });
            // --- Додаємо тимчасовий маркер ---
            // @ts-ignore
            if (window.searchMarker) {
                // @ts-ignore
                map.removeLayer(window.searchMarker);
                // @ts-ignore
                window.searchMarker = null;
            }
            // @ts-ignore
            window.searchMarker = L.marker([parseFloat(item.lat), parseFloat(item.lon)], {
                icon: L.icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
                    shadowSize: [41, 41]
                })
            }).addTo(map);
            // додати обробник подвійного кліку та тултіпів
            import('./ui.js').then(({ addDoubleClickToLayer }) => {
                addDoubleClickToLayer(window.searchMarker);
            });
            // @ts-ignore
            window.searchMarker.bindPopup(item.display_name).openPopup();
        }
    }
})();
function centerGeoSearchBar() {
    const bar = document.getElementById('geosearch-bar');
    const mapDiv = document.getElementById('map');
    if (!bar || !mapDiv)
        return;
    const mapRect = mapDiv.getBoundingClientRect();
    // Центр мапи
    const centerX = mapRect.left + mapRect.width / 2;
    bar.style.left = centerX + 'px';
    bar.style.transform = 'translateX(-50%)';
}
window.addEventListener('resize', centerGeoSearchBar);
document.addEventListener('DOMContentLoaded', () => {
    // Оновлюємо title сторінки з версією
    updatePageTitle();
    const loadSuccess = loadLayersFromStorage();
    // Якщо завантаження не вдалося, створюємо початковий шар
    if (!loadSuccess) {
        addLayer();
    }
    waitForMaterialIconsAndInitAutocomplete();
    initEditModal();
    centerGeoSearchBar();
});
// --- функція для обробки KMZ файлів ---
async function handleKmzFile(file) {
    try {
        // @ts-ignore
        const zip = await JSZip.loadAsync(file);
        // знайти перший .kml файл
        const kmlFileName = Object.keys(zip.files).find(name => name.endsWith('.kml'));
        if (!kmlFileName) {
            alert('KMZ файл не містить KML даних');
            return;
        }
        const kmlText = await zip.files[kmlFileName].async('string');
        // створити новий шар для KMZ
        const tileType = 'План';
        const tileLayer = createTileLayer(tileType, 1);
        const featureGroup = new L.FeatureGroup();
        tileLayer.addTo(map);
        featureGroup.addTo(map);
        // парсити KML через omnivore
        // @ts-ignore
        const kmlLayer = omnivore.kml.parse(kmlText);
        // додати всі об'єкти з KML до featureGroup
        kmlLayer.eachLayer((layer) => {
            featureGroup.addLayer(layer);
            import('./ui.js').then(({ addDoubleClickToLayer }) => {
                addDoubleClickToLayer(layer);
            });
            // зберегти властивості з KML
            if (layer.feature && layer.feature.properties) {
                layer.properties = { ...layer.feature.properties };
                // Виправляємо undefined значення для назви та опису
                if (!layer.properties.name || layer.properties.name === 'undefined') {
                    const type = getObjectType(layer);
                    const objectType = type === 'marker' ? 'Маркер' :
                        type === 'polygon' ? 'Полігон' :
                            type === 'polyline' ? 'Лінія' : 'Об\'єкт';
                    layer.properties.name = `${objectType} [з KML]`;
                }
                if (!layer.properties.description || layer.properties.description === 'undefined') {
                    layer.properties.description = '';
                }
                // застосувати стилі для різних типів об'єктів
                const type = getObjectType(layer);
                if (type === 'marker') {
                    // для маркерів з KML
                    if (layer.feature.properties.name) {
                        layer.bindPopup(layer.feature.properties.name);
                    }
                    if (layer.feature.properties.description) {
                        layer.bindTooltip(layer.feature.properties.description);
                    }
                }
                else if (type === 'polyline') {
                    // для ліній з KML
                    layer.setStyle({
                        color: '#1976d2',
                        weight: 3,
                        opacity: 1
                    });
                }
                else if (type === 'polygon') {
                    // для полігонів з KML
                    layer.setStyle({
                        color: '#1976d2',
                        weight: 2,
                        opacity: 1,
                        fillColor: '#1976d2',
                        fillOpacity: 0.2
                    });
                }
            }
        });
        // створити ім'я шару за іменем файлу
        const layerTitle = file.name.replace(/\.(kmz|kml)$/i, '');
        // перевірити, чи вже є шар з таким ім'ям
        const existsIdx = customLayers.findIndex(l => l.title === layerTitle);
        if (existsIdx !== -1) {
            showConfirmDialog({
                title: `Шар "${layerTitle}" вже існує`,
                message: `Шар з назвою "${layerTitle}" вже існує. Що зробити?`,
                onConfirm: (action) => {
                    if (action === 'duplicate') {
                        // Дублювати з новою назвою
                        let copyTitle = layerTitle + ' (копія)';
                        let n = 2;
                        while (customLayers.some(l => l.title === copyTitle)) {
                            copyTitle = layerTitle + ` (копія ${n++})`;
                        }
                        actuallyAddKmzLayer(copyTitle);
                    }
                    else if (action === 'overwrite') {
                        // Перезаписати: видалити старий і додати новий
                        const oldLayer = customLayers[existsIdx];
                        if (oldLayer && oldLayer.featureGroup) {
                            map.removeLayer(oldLayer.featureGroup);
                        }
                        customLayers.splice(existsIdx, 1);
                        if (layerControlsDiv) {
                            layerControlsDiv.innerHTML = '';
                            customLayers.forEach(layer => createLayerControl(layer));
                        }
                        actuallyAddKmzLayer(layerTitle);
                    } // cancel — нічого не робити
                },
                buttons: [
                    { text: 'Дублювати', action: 'duplicate', className: 'btn-primary' },
                    { text: 'Перезаписати', action: 'overwrite', className: 'btn-danger' },
                    { text: 'Скасувати', action: 'cancel', className: 'btn-secondary' }
                ]
            });
            return;
        }
        else {
            actuallyAddKmzLayer(layerTitle);
        }
        function actuallyAddKmzLayer(title) {
            const layerObj = {
                id: getNextLayerId(),
                tileLayer,
                featureGroup,
                tileType,
                title,
                visible: true
            };
            customLayers.push(layerObj);
            const control = createLayerControl(layerObj);
            if (layerControlsDiv)
                layerControlsDiv.appendChild(control);
            saveLayersToStorage();
            if (featureGroup.getBounds().isValid()) {
                map.fitBounds(featureGroup.getBounds());
            }
        }
    }
    catch (error) {
        alert('Помилка при імпорті KMZ файлу: ' + error.message); // @ts-ignore
    }
}
// --- Глобальний пошук по об'єктах ---
const globalSearchInput = document.getElementById('global-object-search');
const globalSearchResults = document.getElementById('global-object-search-results');
if (globalSearchInput && globalSearchResults) {
    globalSearchInput.addEventListener('input', function () {
        const query = this.value.trim().toLowerCase();
        globalSearchResults.innerHTML = '';
        if (!query)
            return;
        // шукати лише у видимих шарах та об'єктах
        let results = [];
        customLayers.forEach(layerObj => {
            if (!layerObj.visible)
                return;
            const fg = layerObj.featureGroup;
            fg.eachLayer((layer) => {
                if (layer.visible === false)
                    return; // @ts-ignore
                const name = layer.properties?.name || layer.feature?.properties?.name || '';
                const desc = layer.properties?.description || layer.feature?.properties?.description || '';
                if (name.toLowerCase().includes(query) ||
                    desc.toLowerCase().includes(query)) {
                    results.push({
                        layer,
                        name,
                        desc,
                        layerObj
                    });
                }
            });
            // зображення
            if (fg.images && fg.images.length > 0 && fg.overlays) {
                fg.images.forEach((img, idx) => {
                    const overlay = fg.overlays[idx]; // @ts-ignore
                    if (!overlay || overlay.visible === false)
                        return;
                    const name = img.properties?.name || '';
                    const desc = img.properties?.description || '';
                    if (name.toLowerCase().includes(query) ||
                        desc.toLowerCase().includes(query)) {
                        results.push({
                            layer: overlay,
                            name,
                            desc,
                            layerObj
                        });
                    }
                });
            }
        });
        if (results.length === 0) {
            const noRes = document.createElement('div');
            noRes.className = 'global-object-search-item';
            noRes.textContent = 'Нічого не знайдено';
            globalSearchResults.appendChild(noRes);
            return;
        }
        results.forEach(res => {
            const item = document.createElement('div');
            item.className = 'global-object-search-item';
            item.innerHTML = `<span><b>${res.name || '[без назви]'}</b></span>` +
                (res.desc ? `<span style="color:#888;">${res.desc}</span>` : '');
            item.onclick = () => {
                // зняти попереднє виділення
                document.querySelectorAll('.global-object-search-highlight').forEach(el => {
                    el.classList.remove('global-object-search-highlight');
                });
                // виділити на мапі
                const isLineOrPoly = res.layer instanceof L.Polyline || res.layer instanceof L.Polygon;
                const isMarker = res.layer instanceof L.Marker && !(res.layer instanceof L.CircleMarker);
                if (isLineOrPoly) {
                    // зберегти попередній стиль
                    const prevStyle = {
                        color: res.layer.options.color,
                        weight: res.layer.options.weight,
                        dashArray: res.layer.options.dashArray,
                        opacity: res.layer.options.opacity,
                        fillColor: res.layer.options.fillColor,
                        fillOpacity: res.layer.options.fillOpacity
                    };
                    res.layer.setStyle({
                        color: '#cd1d1d',
                        weight: 8,
                        dashArray: '8,4',
                        opacity: 1,
                        fillColor: '#ffe066',
                        fillOpacity: 0.7
                    });
                    setTimeout(() => {
                        res.layer.setStyle(prevStyle);
                    }, 2000);
                }
                else if (isMarker) {
                    // зберегти попередню іконку
                    const prevIcon = res.layer.getIcon();
                    // створити яскраву іконку
                    const highlightIcon = L.divIcon({
                        className: 'highlight-marker-icon',
                        html: '<div style="background:#cd1d1d;width:32px;height:32px;border-radius:50%;border:3px solid #ffe066;box-shadow:0 0 12px #cd1d1d;"></div>',
                        iconSize: [32, 32],
                        iconAnchor: [16, 32]
                    });
                    res.layer.setIcon(highlightIcon);
                    setTimeout(() => {
                        res.layer.setIcon(prevIcon);
                    }, 2000);
                }
                else if (res.layer.getElement && res.layer.getElement()) {
                    res.layer.getElement().classList.add('global-object-search-highlight');
                    setTimeout(() => {
                        res.layer.getElement().classList.remove('global-object-search-highlight');
                    }, 2000);
                }
                else if (res.layer._path) {
                    res.layer._path.classList.add('global-object-search-highlight');
                    setTimeout(() => {
                        res.layer._path.classList.remove('global-object-search-highlight');
                    }, 2000);
                }
                // приблизити
                if (res.layer.getBounds) {
                    map.fitBounds(res.layer.getBounds(), { maxZoom: 17 });
                }
                else if (res.layer.getLatLng) {
                    map.setView(res.layer.getLatLng(), 17);
                }
                globalSearchResults.innerHTML = '';
                globalSearchInput.value = '';
            };
            globalSearchResults.appendChild(item);
        });
    });
}
// ... після ініціалізації карти і customLayers ...
// --- Слідкуємо за зміною opacity у leaflet-image-layer і зберігаємо у localStorage ---
const observeOverlayOpacity = () => {
    // Debounced збереження для opacity observer
    let opacityTimeout = null;
    const debouncedOpacitySave = () => {
        if (opacityTimeout)
            clearTimeout(opacityTimeout);
        opacityTimeout = window.setTimeout(() => {
            saveLayersToStorage();
            opacityTimeout = null;
        }, 200); // Трохи більший delay для opacity змін
    };
    const observer = new MutationObserver(mutations => {
        let hasChanges = false;
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const img = mutation.target;
                if (img.classList.contains('leaflet-image-layer')) {
                    const opacity = parseFloat(img.style.opacity);
                    const src = img.src;
                    // Знаходимо відповідний overlay та шар (не створюємо дублікати!)
                    for (const layerObj of customLayers) {
                        if (!layerObj.featureGroup || !layerObj.featureGroup.images)
                            continue;
                        const idx = layerObj.featureGroup.images.findIndex((imgObj) => imgObj.url === src);
                        if (idx !== -1) {
                            layerObj.featureGroup.images[idx].properties = layerObj.featureGroup.images[idx].properties || {};
                            // Перевіряємо, чи справді змінилася прозорість
                            if (layerObj.featureGroup.images[idx].properties.opacity !== opacity) {
                                layerObj.featureGroup.images[idx].properties.opacity = opacity;
                                hasChanges = true;
                            }
                            break;
                        }
                    }
                }
            }
        });
        // Зберігаємо тільки якщо справді були зміни
        if (hasChanges) {
            debouncedOpacitySave();
        }
    });
    // спостерігати за всіма leaflet-image-layer
    const addObservers = () => {
        document.querySelectorAll('img.leaflet-image-layer').forEach(img => {
            observer.observe(img, { attributes: true, attributeFilter: ['style'] });
        });
    };
    addObservers();
    // також додавати спостерігачі при додаванні нових зображень
    const imgAddObserver = new MutationObserver(() => addObservers());
    imgAddObserver.observe(document.body, { childList: true, subtree: true });
};
observeOverlayOpacity();
// Ініціалізація видалена - все відбувається в DOMContentLoaded
// loadLayersFromStorage(); // ВИДАЛЕНО - подвійний виклик спричиняв дублікати!
// waitForMaterialIconsAndInitAutocomplete();
// initEditModal();
// centerGeoSearchBar();
// Імпортуємо draw control функції
import { initDrawControl, updateDrawControlVisibility } from './draw-control.js';
// Ініціалізуємо draw control
initDrawControl();
updateDrawControlVisibility();
// Додаємо обробники подій для кнопок
if (addLayerBtn) {
    addLayerBtn.addEventListener('click', addLayer);
}
if (exportAllBtn) {
    exportAllBtn.addEventListener('click', () => {
        const data = localStorage.getItem('lefleat_layers');
        if (!data)
            return alert('Немає даних для експорту');
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lefleat_layers.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    });
}
if (importAllBtn && importAllInput) {
    importAllBtn.addEventListener('click', () => {
        importAllInput.value = '';
        importAllInput.click();
    });
    importAllInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file)
            return;
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'kmz' || ext === 'kml') {
            // Імпорт KMZ/KML через leaflet-omnivore
            handleKmzFile(file);
            return;
        }
        const reader = new FileReader();
        reader.onload = function (evt) {
            if (!evt.target)
                return;
            try {
                let imported = JSON.parse(evt.target.result);
                if (!Array.isArray(imported))
                    imported = [imported];
                // для кожного імпортованого шару перевіряємо на дублікати
                function importLayerObj(obj) {
                    const existsIdx = customLayers.findIndex(l => l.title === obj.title);
                    if (existsIdx !== -1) {
                        showConfirmDialog({
                            title: `Шар "${obj.title}" вже існує`,
                            message: `Шар з назвою "${obj.title}" вже існує. Що зробити?`,
                            onConfirm: (action) => {
                                if (action === 'duplicate') {
                                    // Дублювати з новою назвою
                                    let copyTitle = obj.title + ' (копія)';
                                    let n = 2;
                                    while (customLayers.some(l => l.title === copyTitle)) {
                                        copyTitle = obj.title + ` (копія ${n++})`;
                                    }
                                    obj.title = copyTitle;
                                    actuallyImportLayer(obj);
                                }
                                else if (action === 'overwrite') {
                                    // Перезаписати: видалити старий і додати новий
                                    const oldLayer = customLayers[existsIdx];
                                    if (oldLayer && oldLayer.featureGroup) {
                                        map.removeLayer(oldLayer.featureGroup);
                                    }
                                    customLayers.splice(existsIdx, 1);
                                    if (layerControlsDiv) {
                                        layerControlsDiv.innerHTML = '';
                                        customLayers.forEach(layer => createLayerControl(layer));
                                    }
                                    actuallyImportLayer(obj);
                                } // cancel — нічого не робити
                            },
                            buttons: [
                                { text: 'Дублювати', action: 'duplicate', className: 'btn-primary' },
                                { text: 'Перезаписати', action: 'overwrite', className: 'btn-danger' },
                                { text: 'Скасувати', action: 'cancel', className: 'btn-secondary' }
                            ]
                        });
                    }
                    else {
                        actuallyImportLayer(obj);
                    }
                }
                function actuallyImportLayer(obj) {
                    // Додаємо шар у localStorage
                    let arr = JSON.parse(localStorage.getItem('lefleat_layers') || '[]');
                    if (!Array.isArray(arr))
                        arr = [arr];
                    arr.push(obj);
                    localStorage.setItem('lefleat_layers', JSON.stringify(arr));
                    location.reload();
                }
                // імпортуємо всі шари по черзі
                imported.forEach(importLayerObj);
            }
            catch (err) {
                alert('Помилка імпорту: ' + err);
            }
        };
        reader.readAsText(file);
    });
}
// === Додаю інструмент вимірювання відстані ===
if (typeof window.L !== 'undefined' &&
    map &&
    window.L.Control &&
    typeof window.L.Control.PolylineMeasure === 'function') {
    // @ts-ignore
    map.addControl(new window.L.Control.PolylineMeasure({
        position: 'topright',
        unit: 'metres',
        showBearings: true,
        clearMeasurementsOnStop: false,
        showClearControl: true,
        showUnitControl: true,
        measureControlTitleOn: 'Увімкнути вимірювання',
        measureControlTitleOff: 'Вимкнути вимірювання',
        measureControlLabel: '⟷',
        measureControlLabelOn: '⟷',
        measureControlLabelOff: '⟷',
        tooltipTextFinish: 'Подвійний клік — завершити вимірювання',
        tooltipTextDelete: 'Клік для видалення точки',
        tooltipTextMove: 'Перетягніть для зміни положення',
        tooltipTextResume: 'Клік для продовження вимірювання',
        tooltipTextAdd: 'Клік для додавання точки',
        startLabel: 'Старт',
        language: 'uk',
    }));
}
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
                window.saveLayersToStorage?.();
                // Перевіряємо результат
                setTimeout(() => {
                    const afterState = localStorage.getItem('lefleat_layers');
                    const afterCount = afterState ? JSON.parse(afterState).length : 0;
                    debugLog(`Збереження завершено: ${beforeCount} → ${afterCount} шарів`);
                    // Для пріоритетних збережень перевіряємо наявність corners
                    if (priority && afterState) {
                        const data = JSON.parse(afterState);
                        let foundCorners = false;
                        data.forEach((layer) => {
                            if (layer.overlays && layer.overlays.length > 0) {
                                layer.overlays.forEach((ov) => {
                                    if (ov.corners && ov.corners.length > 0) {
                                        foundCorners = true;
                                    }
                                });
                            }
                        });
                    }
                }, 25);
            }
            catch (error) {
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
            if (!layer || !layer.featureGroup)
                return;
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
        window.customLayers.forEach((layer) => {
            if (layer && layer.featureGroup) {
                const { overlayInstances, images } = layer.featureGroup;
                if (overlayInstances) {
                    totalOverlays += overlayInstances.length;
                    overlayInstances.forEach((overlay) => {
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
                data.forEach((layer) => {
                    if (layer.overlays) {
                        storedOverlays += layer.overlays.length;
                        layer.overlays.forEach((ov) => {
                            if (ov.corners && ov.corners.length > 0) {
                                overlaysWithCorners++;
                            }
                        });
                    }
                });
            }
            catch (e) {
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
                    overlayIdx = layer.featureGroup.overlayInstances?.findIndex((inst) => {
                        return inst === overlay._overlay || inst._overlay === overlay._overlay;
                    });
                }
                if (overlayIdx === -1 && overlayUrl) {
                    overlayIdx = layer.featureGroup.images?.findIndex((img) => img.url === overlayUrl);
                }
                if (overlayIdx === -1 && overlay._overlayId) {
                    overlayIdx = layer.featureGroup.images?.findIndex((img) => img._overlayId === overlay._overlayId);
                }
                if (overlayIdx === -1) {
                    overlayIdx = layer.featureGroup.overlayInstances?.findIndex((inst) => {
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
                        overlayIdx = layer.featureGroup.images?.findIndex((img) => {
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
                if (overlayIdx !== -1 && overlayIdx !== undefined) {
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
                    }
                    catch (error) {
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
            }
            catch (error) {
                // Мовчазно обробляємо помилки видалення
            }
        }
    }
    // Перевіряємо наявність overlay без edit handlers
    function checkForOrphanedOverlays() {
        if (!window.customLayers) {
            return;
        }
        window.customLayers.forEach((layer) => {
            if (layer && layer.featureGroup && layer.featureGroup.overlayInstances) {
                layer.featureGroup.overlayInstances.forEach((overlay) => {
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
                if (!layer || !layer.featureGroup)
                    continue;
                let overlayIdx = layer.featureGroup.overlayInstances?.indexOf(overlay);
                if (overlayIdx === -1 && overlay._overlay) {
                    overlayIdx = layer.featureGroup.overlayInstances?.findIndex((inst) => {
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
                    }
                    catch (error) {
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
        }
        else {
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
//# sourceMappingURL=main.js.map