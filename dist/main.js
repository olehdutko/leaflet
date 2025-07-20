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
import { customLayers, layerId, createTileLayer, saveLayersToStorage, loadLayersFromStorage, addLayer } from './layers.js';
import { layerControlsDiv, addLayerBtn } from './ui.js';
import { materialIcons, currentEditingObject } from './state.js';
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
    const input = document.getElementById('marker-icon');
    const list = document.getElementById('marker-icon-autocomplete');
    const preview = document.getElementById('marker-icon-preview');
    if (!input || !list || !preview)
        return;
    let currentFocus = -1;
    input.oninput = function () {
        const val = input.value.trim().toLowerCase();
        list.innerHTML = '';
        if (!val)
            return;
        const matches = materialIcons.filter(name => name.includes(val)).slice(0, 10);
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
        objectName.value = properties.name;
    const objectDescription = document.getElementById('object-description');
    if (objectDescription)
        objectDescription.value = properties.description;
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
            markerIconInput.oninput = function () {
                markerIconPreview.textContent = markerIconInput.value;
            };
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
        closeEditModal(); // закриваємо модалку перед діалогом
        showConfirmDialog({
            title: 'Видалити?',
            message: `Ви дійсно хочете видалити ${typeName}?`,
            onConfirm: function () {
                if (!currentEditingObject.value)
                    return;
                // Знаходимо відповідний customLayer
                const layerObj = customLayers.find(l => l.featureGroup && l.featureGroup.hasLayer(currentEditingObject.value));
                if (layerObj && layerObj.featureGroup) {
                    layerObj.featureGroup.removeLayer(currentEditingObject.value);
                }
                map.removeLayer(currentEditingObject.value);
                saveLayersToStorage();
            }
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
// Функція для додавання подвійного кліку до об'єктів
function addDoubleClickToLayer(layer) {
    const type = getObjectType(layer);
    // --- тултіп ---
    function getTooltipHtml(properties) {
        let html = '';
        if (properties.name)
            html += `<div class='tooltip-title'>${properties.name}</div>`;
        if (properties.description) {
            // Автоматично замінюємо посилання на <a>
            const descWithLinks = properties.description.replace(/(https?:\/\/[^\s]+)/g, function (url) {
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
            });
            html += `<div class='tooltip-desc'>${descWithLinks}</div>`;
        }
        if (properties.image)
            html += `<div class='tooltip-img-wrap'><img src='${properties.image}' class='tooltip-img' /></div>`;
        // можна додати ще інші властивості
        return html || '<span class="tooltip-empty">(немає даних)</span>';
    }
    let customTooltip = null;
    let tooltipTimer = null;
    function showTooltip(e) {
        // Зупиняємо попередній таймер
        if (tooltipTimer) {
            clearTimeout(tooltipTimer);
            tooltipTimer = null;
        }
        // Видаляємо попередній тултіп, якщо він є
        if (customTooltip) {
            customTooltip.remove();
            customTooltip = null;
        }
        const props = layer.properties || {}; // @ts-ignore
        const html = getTooltipHtml(props);
        // Створюємо власний тултіп
        customTooltip = document.createElement('div');
        customTooltip.className = 'custom-tooltip';
        customTooltip.innerHTML = html;
        customTooltip.style.position = 'absolute';
        customTooltip.style.zIndex = '1000';
        customTooltip.style.pointerEvents = 'auto';
        customTooltip.style.cursor = 'default';
        // Додаємо тултіп до карти
        const mapContainer = map.getContainer(); // @ts-ignore
        mapContainer.appendChild(customTooltip);
        // Позиціонуємо тултіп
        if (e.originalEvent && typeof e.originalEvent.clientX === 'number' && typeof e.originalEvent.clientY === 'number') {
            const mapContainer = map.getContainer(); // @ts-ignore
            const rect = mapContainer.getBoundingClientRect();
            customTooltip.style.left = (e.originalEvent.clientX - rect.left) + 'px';
            customTooltip.style.top = (e.originalEvent.clientY - rect.top) + 'px';
            customTooltip.style.transform = 'translate(-50%, -120%)';
        }
        else {
            // fallback: над об'єктом
            const point = map.latLngToLayerPoint(e.latlng); // @ts-ignore
            customTooltip.style.left = point.x + 'px';
            customTooltip.style.top = point.y + 'px';
            customTooltip.style.transform = 'translate(-60%, -120%)';
        }
        // Обробники подій для тултіпа
        customTooltip.addEventListener('mouseenter', function () {
            if (tooltipTimer) {
                clearTimeout(tooltipTimer);
                tooltipTimer = null;
            }
        });
        customTooltip.addEventListener('mouseleave', function () {
            hideTooltip();
        });
    }
    function hideTooltip() {
        if (tooltipTimer) {
            clearTimeout(tooltipTimer);
        }
        tooltipTimer = setTimeout(() => {
            if (customTooltip) {
                customTooltip.remove();
                customTooltip = null;
            }
            tooltipTimer = null;
        }, 100);
    }
    layer.on('mouseover', showTooltip);
    layer.on('mouseout', hideTooltip);
    // --- подвійний клік ---
    if (type === 'marker') {
        layer.on('add', function () {
            const el = layer.getElement && layer.getElement(); // @ts-ignore
            if (el) {
                el.addEventListener('dblclick', function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    showEditModal(layer);
                });
            }
        });
        const el = layer.getElement && layer.getElement(); // @ts-ignore
        if (el) {
            el.addEventListener('dblclick', function (e) {
                e.stopPropagation();
                e.preventDefault();
                showEditModal(layer);
            });
        }
    }
    else {
        layer.on('dblclick', function (e) {
            if (e.originalEvent) {
                e.originalEvent.stopPropagation();
                e.originalEvent.preventDefault();
            }
            showEditModal(layer);
        });
    }
}
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
            // додати обробник подвійного кліку
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
    console.log('Initializing application...');
    loadLayersFromStorage();
    console.log('[main.ts] customLayers after load:', customLayers);
    setupMarkerIconAutocomplete();
    initEditModal();
    centerGeoSearchBar();
    console.log('Application initialized successfully');
});
function showConfirmDialog({ title = 'Підтвердження', message = '', onConfirm, onCancel }) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    if (!modal || !titleEl || !msgEl || !okBtn || !cancelBtn)
        return;
    titleEl.textContent = title;
    msgEl.textContent = message;
    modal.classList.remove('hidden');
    document.body.classList.add('blurred'); // Додаємо розмиття
    function close(result) {
        modal.classList.add('hidden');
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        document.body.classList.remove('blurred'); // Прибираємо розмиття
        if (result && typeof onConfirm === 'function')
            onConfirm();
        if (!result && typeof onCancel === 'function')
            onCancel();
    }
    okBtn.onclick = () => close(true);
    cancelBtn.onclick = () => close(false);
}
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
                addDoubleClickToLayer(layer);
                // зберегти властивості з KML
                if (layer.feature && layer.feature.properties) {
                    layer.properties = Object.assign({}, layer.feature.properties);
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
            // створити об'єкт шару
            const layerObj = {
                id: layerId++, // @ts-ignore
                tileLayer,
                featureGroup,
                tileType,
                title: `KMZ: ${file.name.replace('.kmz', '')}`,
                visible: true
            };
            customLayers.push(layerObj);
            // додати контроль шару
            const control = createLayerControl(layerObj);
            if (layerControlsDiv)
                layerControlsDiv.appendChild(control); // @ts-ignore
            // зберегти в localStorage
            saveLayersToStorage();
            // центрувати карту на об'єктах з KMZ
            if (featureGroup.getBounds().isValid()) {
                map.fitBounds(featureGroup.getBounds());
            }
            console.log(`KMZ файл "${file.name}" успішно імпортовано`);
        }
        catch (error) {
            console.error('Помилка при імпорті KMZ:', error);
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
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const img = mutation.target; // @ts-ignore
                if (img.classList.contains('leaflet-image-layer')) {
                    const opacity = parseFloat(img.style.opacity); // @ts-ignore
                    const src = img.src; // @ts-ignore
                    // знайти відповідний overlay та шар
                    for (const layerObj of customLayers) {
                        if (!layerObj.featureGroup || !layerObj.featureGroup.images)
                            continue;
                        const idx = layerObj.featureGroup.images.findIndex((imgObj) => imgObj.url === src);
                        if (idx !== -1) {
                            layerObj.featureGroup.images[idx].properties = layerObj.featureGroup.images[idx].properties || {};
                            layerObj.featureGroup.images[idx].properties.opacity = opacity;
                            saveLayersToStorage();
                            break;
                        }
                    }
                }
            }
        });
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
// Ініціалізація
console.log('Initializing application...');
loadLayersFromStorage();
console.log('[main.ts] customLayers after load:', customLayers);
setupMarkerIconAutocomplete();
initEditModal();
centerGeoSearchBar();
// Імпортуємо draw control функції
import { initDrawControl, updateDrawControlVisibility } from './draw-control.js';
// Ініціалізуємо draw control
initDrawControl();
updateDrawControlVisibility();
// Додаємо обробники подій для кнопок
if (addLayerBtn) {
    addLayerBtn.addEventListener('click', addLayer);
}
console.log('Application initialized successfully');
