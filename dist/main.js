var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
import { layerControlsDiv, addLayerBtn, exportAllBtn, importAllBtn, importAllInput } from './ui.js';
import { materialIcons, currentEditingObject } from './state.js';
import { showConfirmDialog } from './ui.js';
// --- глобальний прапорець для drag & drop тултіпів ---
// let isDraggingObject = false; // видалено, бо імпортується з ui.ts
// --- Перенесено: Функція для збереження шарів у localStorage ---
// function saveLayersToStorage() { ... }
// ...
// function loadLayersFromStorage() { ... }
// ...
// function addLayer() { ... }
// ...
// function updateActiveLayerUI() { ... }
// ... existing code ...
import { getObjectType, getObjectProperties } from './utils.js';
// --- оновлена функція createLayerControl ---
import { createLayerControl } from './ui.js';
// --- Автокомпліт для інпуту іконки маркера ---
function setupMarkerIconAutocomplete() {
    var _a;
    let input = document.getElementById('marker-icon');
    const list = document.getElementById('marker-icon-autocomplete');
    const preview = document.getElementById('marker-icon-preview');
    if (!input || !list || !preview)
        return;
    // Клонуємо input, щоб скинути всі старі обробники
    const newInput = input.cloneNode(true);
    (_a = input.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(newInput, input);
    input = newInput;
    let currentFocus = -1;
    input.addEventListener('input', function () {
        const val = input.value.trim().toLowerCase();
        list.innerHTML = '';
        preview.textContent = input.value;
        const matches = materialIcons.filter(name => name.includes(val)).slice(0, 10);
        currentFocus = -1;
        matches.forEach(name => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `<span class="material-icons">${name}</span> ${name}`;
            item.onclick = function () {
                input.value = name;
                preview.textContent = name;
                list.innerHTML = '';
                if (currentEditingObject.value) {
                    currentEditingObject.value.properties = currentEditingObject.value.properties || {};
                    currentEditingObject.value.properties.icon = name;
                    applyObjectProperties(currentEditingObject.value, currentEditingObject.value.properties);
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
// --- Додаю підтримку іконки для маркера ---
function getColoredMarkerIcon(color = "#1976d2", iconName = "place") {
    return L.divIcon({
        className: '',
        html: `<div class="custom-pin">
      <svg width="38" height="51" viewBox="0 0 48 64">
        <path d="M24 0C12 0 0 10 0 24c0 16 24 40 24 40s24-24 24-40C48 10 36 0 24 0z" fill="${color}"/>
      </svg>
      <span class="material-icons">${iconName}</span>
    </div>`,
        iconSize: [38, 51],
        iconAnchor: [19, 48],
        popupAnchor: [0, -44]
    });
}
// Функція для застосування властивостей до об'єкта
function applyObjectProperties(layer, properties) {
    const type = getObjectType(layer);
    // Зберігаємо властивості в layer.properties
    if (!layer.properties)
        layer.properties = {};
    layer.properties.name = properties.name;
    layer.properties.description = properties.description;
    if (type === 'marker') {
        const iconName = properties.icon || 'place';
        layer.setIcon(getColoredMarkerIcon(properties.color, iconName));
        layer.properties.color = properties.color;
        layer.properties.icon = iconName;
        layer.options.color = properties.color;
    }
    else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
        layer.setStyle({
            fillColor: properties.fillColor,
            color: properties.color,
            fillOpacity: properties.fillOpacity,
            opacity: properties.opacity
        });
    }
    else if (type === 'polyline') {
        layer.setStyle({
            color: properties.color,
            weight: properties.weight,
            opacity: properties.opacity
        });
    }
    else if (type === 'image') {
        if (layer._overlay) {
            layer._overlay.setOpacity(properties.opacity);
        }
    }
}
// Функція для показу модального вікна
function showEditModal(layer) {
    currentEditingObject.value = layer;
    const type = getObjectType(layer);
    const properties = getObjectProperties(layer);
    // Оновлюємо заголовок
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Редагування ${type === 'marker' ? 'маркера' : type === 'polygon' ? 'полігону' : type === 'polyline' ? 'полілінії' : type === 'image' ? 'зображення' : 'об\'єкта'}`;
    }
    // Заповнюємо поля
    const objectName = document.getElementById('object-name');
    if (objectName)
        objectName.value = properties.name || '';
    const objectDescription = document.getElementById('object-description');
    if (objectDescription)
        objectDescription.value = properties.description || '';
    // Групи контролів
    const colorPickerGroup = document.getElementById('color-picker-group');
    const lineWidthGroup = document.getElementById('line-width-group');
    const styleGroup = document.getElementById('style-group');
    const opacityGroup = document.getElementById('opacity-group');
    const imageGroup = document.getElementById('image-group');
    const markerIconGroup = document.getElementById('marker-icon-group');
    // Приховуємо всі групи
    [colorPickerGroup, lineWidthGroup, styleGroup, opacityGroup, imageGroup, markerIconGroup].forEach(group => {
        if (group)
            group.style.display = 'none';
    });
    // Показуємо відповідні групи залежно від типу
    if (type === 'marker') {
        if (colorPickerGroup)
            colorPickerGroup.style.display = 'block';
        if (markerIconGroup)
            markerIconGroup.style.display = 'block';
        // Встановити значення інпуту та превʼю
        const markerIconInput = document.getElementById('marker-icon');
        const markerIconPreview = document.getElementById('marker-icon-preview');
        if (markerIconInput && markerIconPreview) {
            markerIconInput.value = properties.icon || 'place';
            markerIconPreview.textContent = markerIconInput.value;
            // не перевизначаю oninput тут, бо це ламає автокомпліт
            // (markerIconInput as HTMLInputElement).oninput = function() {
            //   (markerIconPreview as HTMLElement).textContent = (markerIconInput as HTMLInputElement).value;
            // };
        }
        // Показати/заповнити координати
        const coordsGroup = document.querySelector('.marker-coords-group');
        if (coordsGroup)
            coordsGroup.style.display = '';
        const latInput = document.getElementById('marker-lat');
        const lngInput = document.getElementById('marker-lng');
        if (latInput && lngInput && currentEditingObject.value && currentEditingObject.value.getLatLng) {
            const latlng = currentEditingObject.value.getLatLng();
            latInput.value = latlng.lat.toString();
            lngInput.value = latlng.lng.toString();
        }
        // --- Додаю повторну ініціалізацію автокомпліта ---
        setupMarkerIconAutocomplete();
    }
    else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
        if (colorPickerGroup)
            colorPickerGroup.style.display = 'block';
        if (opacityGroup)
            opacityGroup.style.display = 'block';
        // Приховати координати для не-маркерів
        const coordsGroup = document.querySelector('.marker-coords-group');
        if (coordsGroup)
            coordsGroup.style.display = 'none';
    }
    else if (type === 'polyline') {
        if (colorPickerGroup)
            colorPickerGroup.style.display = 'block';
        if (lineWidthGroup)
            lineWidthGroup.style.display = 'block';
        if (styleGroup)
            styleGroup.style.display = 'block';
        // opacityGroup не показуємо для polyline
        // Приховати координати для не-маркерів
        const coordsGroup = document.querySelector('.marker-coords-group');
        if (coordsGroup)
            coordsGroup.style.display = 'none';
    }
    else if (type === 'image') {
        if (imageGroup)
            imageGroup.style.display = 'block';
        if (opacityGroup)
            opacityGroup.style.display = 'block';
        // Приховати координати для не-маркерів
        const coordsGroup = document.querySelector('.marker-coords-group');
        if (coordsGroup)
            coordsGroup.style.display = 'none';
    }
    // Заповнюємо значення контролів
    // Колір
    const objectColorInput = document.getElementById('object-color');
    if (objectColorInput)
        objectColorInput.value = properties.color || properties.fillColor || '#1976d2';
    // Товщина
    const lineWidth = document.getElementById('line-width');
    const lineWidthValue = document.getElementById('line-width-value');
    if (lineWidth && lineWidthValue && properties.weight) {
        lineWidth.value = properties.weight;
        lineWidthValue.textContent = properties.weight + 'px';
    }
    // Стиль лінії (за замовчуванням solid)
    const lineStyle = document.getElementById('line-style');
    if (lineStyle)
        lineStyle.value = properties.style || 'solid';
    // Прозорість
    const objectOpacity = document.getElementById('object-opacity');
    const opacityValue = document.getElementById('opacity-value');
    if (objectOpacity && opacityValue) {
        let opacity = properties.opacity;
        if (type === 'polygon' || type === 'circle' || type === 'rectangle')
            opacity = properties.fillOpacity;
        objectOpacity.value = opacity !== null && opacity !== void 0 ? opacity : 1;
        opacityValue.textContent = Math.round((opacity !== null && opacity !== void 0 ? opacity : 1) * 100) + '%';
    }
    // --- Додаю інтерактивність для вибору кольору ---
    if (colorPickerGroup && (type === 'polyline' || type === 'marker' || type === 'polygon' || type === 'circle' || type === 'rectangle')) {
        const colorPalette = document.getElementById('color-palette');
        const objectColorInput = document.getElementById('object-color');
        if (colorPalette && objectColorInput) {
            // Клік по swatch
            colorPalette.querySelectorAll('.color-swatch').forEach(swatch => {
                swatch.onclick = function () {
                    colorPalette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                    swatch.classList.add('selected');
                    objectColorInput.value = swatch.dataset.color || '';
                    if (currentEditingObject.value) {
                        currentEditingObject.value.properties = currentEditingObject.value.properties || {};
                        currentEditingObject.value.properties.color = swatch.dataset.color;
                        if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
                            currentEditingObject.value.properties.fillColor = swatch.dataset.color;
                        }
                        applyObjectProperties(currentEditingObject.value, currentEditingObject.value.properties);
                    }
                };
            });
            // Зміна через color picker
            objectColorInput.oninput = function (e) {
                colorPalette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                if (currentEditingObject.value) {
                    currentEditingObject.value.properties = currentEditingObject.value.properties || {};
                    currentEditingObject.value.properties.color = e.target.value;
                    if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
                        currentEditingObject.value.properties.fillColor = e.target.value;
                    }
                    applyObjectProperties(currentEditingObject.value, currentEditingObject.value.properties);
                }
            };
        }
    }
    // --- Додаю інтерактивність для вибору стилю лінії ---
    if (type === 'polyline') {
        const lineStyle = document.getElementById('line-style');
        if (lineStyle && currentEditingObject.value) {
            lineStyle.onchange = function (e) {
                if (!e.target)
                    return;
                const target = e.target;
                let dashArray = undefined;
                if (target && target.value === 'dashed')
                    dashArray = '10, 10';
                else if (target && target.value === 'dotted')
                    dashArray = '2, 8';
                // Оновлюємо властивість
                currentEditingObject.value.options.dashArray = dashArray;
                if (dashArray)
                    currentEditingObject.value.setStyle({ dashArray });
                currentEditingObject.value.properties = currentEditingObject.value.properties || {};
                if (target)
                    currentEditingObject.value.properties.style = target.value;
                saveLayersToStorage(); // одразу зберігаємо стиль
            };
            // Встановити стиль при відкритті модалки
            let dashArray = undefined;
            if (lineStyle.value === 'dashed')
                dashArray = '10, 10';
            else if (lineStyle.value === 'dotted')
                dashArray = '2, 8';
            currentEditingObject.value.setStyle({ dashArray });
            currentEditingObject.value.options.dashArray = dashArray;
        }
    }
    // Показуємо модальне вікно
    const editModal = document.getElementById('edit-object-modal');
    if (editModal)
        editModal.classList.remove('hidden');
    // --- Зображення ---
    const imageInput = document.getElementById('object-image');
    const imagePreviewContainer = document.getElementById('object-image-preview-container');
    const imagePreview = document.getElementById('object-image-preview');
    const imageRemoveBtn = document.getElementById('object-image-remove');
    // показати preview, якщо є
    if (properties.image) {
        imagePreview.src = properties.image;
        imagePreviewContainer.classList.remove('hidden');
        if (imageInput)
            imageInput.classList.add('hidden');
    }
    else {
        imagePreview.src = '';
        imagePreviewContainer.classList.add('hidden');
        if (imageInput)
            imageInput.classList.remove('hidden');
    }
    // вибір нового зображення
    if (imageInput) {
        imageInput.value = '';
        imageInput.onchange = function (e) {
            var _a;
            const file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
            if (!file)
                return;
            const reader = new FileReader();
            reader.onload = function (evt) {
                if (evt.target) {
                    imagePreview.src = evt.target.result;
                }
                imagePreviewContainer.classList.remove('hidden');
                if (imageInput)
                    imageInput.classList.add('hidden');
                if (currentEditingObject.value) {
                    currentEditingObject.value.properties = currentEditingObject.value.properties || {};
                    if (evt.target)
                        currentEditingObject.value.properties.image = evt.target.result;
                }
            };
            reader.readAsDataURL(file);
        };
    }
    // видалення зображення
    if (imageRemoveBtn) {
        imageRemoveBtn.onclick = function () {
            imagePreview.src = '';
            imagePreviewContainer.classList.add('hidden');
            if (imageInput)
                imageInput.classList.remove('hidden');
            if (currentEditingObject.value) {
                currentEditingObject.value.properties = currentEditingObject.value.properties || {};
                delete currentEditingObject.value.properties.image;
            }
        };
    }
}
// Функція для закриття модального вікна
export function closeEditModal() {
    const editModal = document.getElementById('edit-object-modal');
    if (editModal)
        editModal.classList.add('hidden');
    currentEditingObject.value = null;
}
// Функція для збереження змін
function saveObjectChanges() {
    if (!currentEditingObject.value)
        return;
    const type = getObjectType(currentEditingObject.value);
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
        if (latInput && lngInput && currentEditingObject.value && currentEditingObject.value.setLatLng) {
            const lat = parseFloat(latInput.value);
            const lng = parseFloat(lngInput.value);
            if (!isNaN(lat) && !isNaN(lng)) {
                const old = currentEditingObject.value.getLatLng();
                if (lat !== old.lat || lng !== old.lng) {
                    currentEditingObject.value.setLatLng([lat, lng]);
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
    applyObjectProperties(currentEditingObject.value, properties);
    // --- Додаємо копіювання у feature.properties ---
    if (currentEditingObject.value.feature && currentEditingObject.value.properties) {
        currentEditingObject.value.feature.properties = Object.assign({}, currentEditingObject.value.properties);
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
        if (!currentEditingObject.value)
            return;
        const type = getObjectType(currentEditingObject.value);
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
        const properties = getObjectProperties(currentEditingObject.value);
        const objectName = properties.name ? `"${properties.name}"` : typeName;
        closeEditModal();
        showConfirmDialog({
            title: `Видалення об'єкта: ${objectName}`,
            message: `Ви дійсно хочете видалити об'єкт ${objectName}?`,
            onConfirm: function (action) {
                if (!currentEditingObject.value)
                    return;
                const layerObj = customLayers.find(l => l.featureGroup && l.featureGroup.hasLayer(currentEditingObject.value));
                if (layerObj && layerObj.featureGroup) {
                    layerObj.featureGroup.removeLayer(currentEditingObject.value);
                }
                map.removeLayer(currentEditingObject.value);
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
function handleKmzFile(file) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // @ts-ignore
            const zip = yield JSZip.loadAsync(file);
            // знайти перший .kml файл
            const kmlFileName = Object.keys(zip.files).find(name => name.endsWith('.kml'));
            if (!kmlFileName) {
                alert('KMZ файл не містить KML даних');
                return;
            }
            const kmlText = yield zip.files[kmlFileName].async('string');
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
                    layer.properties = Object.assign({}, layer.feature.properties);
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
    });
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
                var _a, _b, _c, _d, _e, _f;
                if (layer.visible === false)
                    return; // @ts-ignore
                const name = ((_a = layer.properties) === null || _a === void 0 ? void 0 : _a.name) || ((_c = (_b = layer.feature) === null || _b === void 0 ? void 0 : _b.properties) === null || _c === void 0 ? void 0 : _c.name) || '';
                const desc = ((_d = layer.properties) === null || _d === void 0 ? void 0 : _d.description) || ((_f = (_e = layer.feature) === null || _e === void 0 ? void 0 : _e.properties) === null || _f === void 0 ? void 0 : _f.description) || '';
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
                    var _a, _b;
                    const overlay = fg.overlays[idx]; // @ts-ignore
                    if (!overlay || overlay.visible === false)
                        return;
                    const name = ((_a = img.properties) === null || _a === void 0 ? void 0 : _a.name) || '';
                    const desc = ((_b = img.properties) === null || _b === void 0 ? void 0 : _b.description) || '';
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
        var _a;
        const file = e.target.files[0];
        if (!file)
            return;
        const ext = (_a = file.name.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
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
