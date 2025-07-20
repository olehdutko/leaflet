import { currentEditingObject } from './state.js';
import { closeEditModal } from './main.js';
import { getColoredMarkerIcon, getObjectType, getObjectProperties } from './utils.js';
import { saveLayersToStorage } from './layers.js';
import { applyObjectProperties } from './objects.js';
import { updateActiveLayerUI } from './layers.js';
export const layerIdToRenderObjectsList = new Map();
export function updateObjectsListForLayer(layerObj) {
    const fn = layerIdToRenderObjectsList.get(layerObj.id);
    if (fn)
        fn();
}
export function showEditModal(layer) {
    currentEditingObject.value = layer;
    const type = getObjectType(layer);
    const properties = getObjectProperties(layer);
    // Оновлюємо заголовок
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Редагування ${type === 'marker' ? 'маркера' : type === 'polygon' ? 'полігону' : type === 'polyline' ? 'полілінії' : type === 'image' ? 'зображення' : 'обʼєкта'}`;
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
            showConfirmDialog({
                title: 'Видалення зображення',
                message: 'Ви дійсно хочете видалити це зображення?',
                onConfirm: () => {
                    imagePreview.src = '';
                    imagePreviewContainer.classList.add('hidden');
                    if (imageInput)
                        imageInput.classList.remove('hidden');
                    if (currentEditingObject.value) {
                        currentEditingObject.value.properties = currentEditingObject.value.properties || {};
                        delete currentEditingObject.value.properties.image;
                    }
                }
            });
        };
    }
    // видалення об'єкта
    const deleteObjectBtn = document.getElementById('delete-object');
    if (deleteObjectBtn) {
        deleteObjectBtn.onclick = function () {
            showConfirmDialog({
                title: 'Видалення обʼєкта',
                message: 'Ви дійсно хочете видалити цей обʼєкт?',
                onConfirm: () => {
                    if (!currentEditingObject.value)
                        return;
                    // Знаходимо відповідний customLayer
                    const layerObj = customLayers.find(l => l.featureGroup && l.featureGroup.hasLayer(currentEditingObject.value));
                    if (layerObj && layerObj.featureGroup) {
                        layerObj.featureGroup.removeLayer(currentEditingObject.value);
                    }
                    map.removeLayer(currentEditingObject.value);
                    saveLayersToStorage();
                    updateObjectsListForLayer(layerObj); // оновити список об'єктів після видалення
                    // clean up renderObjectsList reference if no objects left
                    if (layerObj && layerObj.featureGroup.getLayers().length === 0) {
                        layerIdToRenderObjectsList.delete(layerObj.id);
                    }
                    updateActiveLayerUI();
                    closeEditModal();
                }
            });
        };
    }
}
export function addDoubleClickToLayer(layer) {
    if (!layer)
        return;
    // dblclick — модалка
    layer.on('dblclick', function (e) {
        var _a, _b, _c, _d;
        layer._wasDblClicked = true;
        (_b = (_a = e.originalEvent) === null || _a === void 0 ? void 0 : _a.stopPropagation) === null || _b === void 0 ? void 0 : _b.call(_a);
        (_d = (_c = e.originalEvent) === null || _c === void 0 ? void 0 : _c.preventDefault) === null || _d === void 0 ? void 0 : _d.call(_c);
        showEditModal(layer);
    });
    // Для маркерів — явний DOM-обробник
    function addDomDblClickHandler(marker) {
        if (marker._icon) {
            marker._icon.addEventListener('dblclick', (e) => {
                marker._wasDblClicked = true;
                e.stopPropagation();
                e.preventDefault();
                showEditModal(marker);
            });
        }
        else {
            // Якщо іконка ще не створена — повторити через 100мс
            setTimeout(() => addDomDblClickHandler(marker), 100);
        }
    }
    if (layer instanceof L.Marker) {
        addDomDblClickHandler(layer);
        // Дублюючий обробник для leaflet-івенту
        layer.on('dblclick', function (e) {
            var _a, _b, _c, _d;
            layer._wasDblClicked = true;
            (_b = (_a = e.originalEvent) === null || _a === void 0 ? void 0 : _a.stopPropagation) === null || _b === void 0 ? void 0 : _b.call(_a);
            (_d = (_c = e.originalEvent) === null || _c === void 0 ? void 0 : _c.preventDefault) === null || _d === void 0 ? void 0 : _d.call(_c);
            showEditModal(layer);
        });
    }
}
export function showConfirmDialog({ title = 'Підтвердження', message = '', onConfirm, onCancel }) {
    const modal = document.getElementById('confirm-modal');
    const backdrop = document.getElementById('confirm-modal-backdrop');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    if (!modal || !titleEl || !msgEl || !okBtn || !cancelBtn)
        return;
    modal.classList.remove('hidden');
    modal.style.display = 'block';
    if (backdrop)
        backdrop.classList.remove('hidden');
    titleEl.textContent = title;
    msgEl.textContent = message;
    function close(result) {
        modal.classList.add('hidden');
        modal.style.display = '';
        if (backdrop)
            backdrop.classList.add('hidden');
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        if (result && onConfirm)
            onConfirm();
        if (!result && onCancel)
            onCancel();
    }
    okBtn.onclick = () => close(true);
    cancelBtn.onclick = () => close(false);
}
export function createLayerControl(layerObj) {
    if (!layerControlsDiv)
        return;
    const layerCard = document.createElement('div');
    layerCard.className = 'layer-card';
    layerCard.dataset.layerId = layerObj.id.toString();
    // Make layer card draggable
    layerCard.draggable = true;
    // Layer selection functionality
    layerCard.onclick = (e) => {
        // Don't select if clicking on buttons, drag handle, or objects
        if (e.target.closest('.layer-card-icon-btn') ||
            e.target.closest('.layer-object-item') ||
            e.target.closest('.layer-objects-list')) {
            return;
        }
        // Set this layer as active
        import('./layers.js').then(({ setActiveLayer }) => {
            setActiveLayer(layerObj.featureGroup);
        });
    };
    // Header with icons row
    const headerIcons = document.createElement('div');
    headerIcons.className = 'layer-card-header-icons';
    // Drag handle (6 dots) for layer reordering
    const dragHandle = document.createElement('button');
    dragHandle.className = 'layer-card-icon-btn layer-card-drag-handle';
    dragHandle.innerHTML = '<i class="fa fa-grip-vertical"></i>';
    dragHandle.title = 'Перетягнути для зміни порядку';
    // Expand/collapse button
    const expandBtn = document.createElement('button');
    expandBtn.className = 'layer-card-icon-btn layer-card-expand-btn';
    expandBtn.innerHTML = '<i class="fa fa-chevron-up"></i>';
    expandBtn.title = 'Згорнути/розгорнути шар';
    // Eye icon (visibility)
    const visibilityBtn = document.createElement('button');
    visibilityBtn.className = 'layer-card-icon-btn';
    visibilityBtn.innerHTML = layerObj.visible ? '<i class="fa fa-eye"></i>' : '<i class="fa fa-eye-slash"></i>';
    visibilityBtn.title = layerObj.visible ? 'Сховати шар' : 'Показати шар';
    visibilityBtn.onclick = (e) => {
        e.stopPropagation();
        layerObj.visible = !layerObj.visible;
        if (layerObj.visible) {
            layerObj.tileLayer.addTo(map);
            layerObj.featureGroup.addTo(map);
            visibilityBtn.innerHTML = '<i class="fa fa-eye"></i>';
            visibilityBtn.title = 'Сховати шар';
        }
        else {
            map.removeLayer(layerObj.tileLayer);
            map.removeLayer(layerObj.featureGroup);
            visibilityBtn.innerHTML = '<i class="fa fa-eye-slash"></i>';
            visibilityBtn.title = 'Показати шар';
        }
        // Оновлюємо видимість draw control
        updateDrawControlVisibility();
    };
    // Trash icon (delete)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'layer-card-icon-btn delete';
    deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
    deleteBtn.title = 'Видалити шар';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        showConfirmDialog({
            title: 'Видалення шару',
            message: 'Ви дійсно хочете видалити цей шар?',
            onConfirm: () => {
                map.removeLayer(layerObj.tileLayer);
                map.removeLayer(layerObj.featureGroup);
                layerCard.remove();
                const index = customLayers.findIndex(l => l.id === layerObj.id);
                if (index > -1) {
                    customLayers.splice(index, 1);
                    saveLayersToStorage();
                }
                // Clean up renderObjectsList reference
                layerIdToRenderObjectsList.delete(layerObj.id);
                // Оновлюємо видимість draw control
                updateDrawControlVisibility();
            }
        });
    };
    // Gallery icon (picture)
    const galleryBtn = document.createElement('button');
    galleryBtn.className = 'layer-card-icon-btn';
    galleryBtn.innerHTML = '<i class="fa fa-image"></i>';
    galleryBtn.title = 'Галерея';
    // --- Додаю обробник для додавання зображення до шару ---
    galleryBtn.onclick = () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file)
                return;
            const reader = new FileReader();
            reader.onload = function (evt) {
                if (!evt.target)
                    return;
                // Додаємо зображення до масиву images шару
                if (!layerObj.featureGroup.images)
                    layerObj.featureGroup.images = [];
                // --- Додаю overlay на мапу ---
                const bounds = map.getBounds();
                const sw = bounds.getSouthWest();
                const ne = bounds.getNorthEast();
                const overlay = L.distortableImageOverlay(evt.target.result, {
                    bounds: [
                        [sw.lat + (ne.lat - sw.lat) * 0.2, sw.lng + (ne.lng - sw.lng) * 0.2],
                        [ne.lat - (ne.lat - sw.lat) * 0.2, ne.lng - (ne.lng - sw.lng) * 0.2]
                    ],
                    selected: true
                }).addTo(map);
                overlay._customUrl = evt.target.result;
                overlay.properties = { name: file.name };
                if (!layerObj.featureGroup.overlays)
                    layerObj.featureGroup.overlays = [];
                layerObj.featureGroup.overlays.push(overlay);
                // Додаємо у images для збереження
                layerObj.featureGroup.images.push({
                    url: evt.target.result,
                    bounds: overlay.getBounds(),
                    corners: overlay.getCorners ? overlay.getCorners() : undefined,
                    properties: { name: file.name }
                });
                saveLayersToStorage();
                if (typeof renderObjectsList === 'function')
                    renderObjectsList();
            };
            reader.readAsDataURL(file);
        };
        fileInput.click();
    };
    // Add icons to header
    headerIcons.appendChild(dragHandle);
    headerIcons.appendChild(expandBtn);
    headerIcons.appendChild(visibilityBtn);
    headerIcons.appendChild(deleteBtn);
    headerIcons.appendChild(galleryBtn);
    // Layer title with timestamp
    const title = document.createElement('h4');
    title.className = 'layer-card-title';
    const now = new Date();
    const timeString = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    title.textContent = `Шар ${layerObj.id}:${timeString}`;
    // Plan dropdown with blue bookmark icon
    const selectContainer = document.createElement('div');
    selectContainer.className = 'layer-card-select';
    const select = document.createElement('select');
    select.innerHTML = `
    <option value="План" ${layerObj.tileType === 'План' ? 'selected' : ''}>План</option>
    <option value="Ландшафт" ${layerObj.tileType === 'Ландшафт' ? 'selected' : ''}>Ландшафт</option>
    <option value="Супутник" ${layerObj.tileType === 'Супутник' ? 'selected' : ''}>Супутник</option>
  `;
    select.onchange = (e) => {
        const newType = e.target.value;
        const newTileLayer = createTileLayer(newType, layerObj.tileLayer.options.opacity);
        map.removeLayer(layerObj.tileLayer);
        layerObj.tileLayer = newTileLayer;
        layerObj.tileType = newType;
        if (layerObj.visible) {
            newTileLayer.addTo(map);
        }
        saveLayersToStorage();
    };
    // Add bookmark icon to select container
    const bookmarkIcon = document.createElement('i');
    bookmarkIcon.className = 'fa fa-bookmark';
    bookmarkIcon.style.color = '#1976d2';
    bookmarkIcon.style.marginRight = '8px';
    selectContainer.appendChild(bookmarkIcon);
    selectContainer.appendChild(select);
    // Geonames checkbox with note
    const geonamesContainer = document.createElement('div');
    geonamesContainer.className = 'layer-card-checkbox';
    const geonamesCheckbox = document.createElement('input');
    geonamesCheckbox.type = 'checkbox';
    geonamesCheckbox.checked = true;
    geonamesCheckbox.disabled = true;
    const geonamesLabel = document.createElement('label');
    geonamesLabel.textContent = 'Геоназви';
    const geonamesNote = document.createElement('span');
    geonamesNote.className = 'note';
    geonamesNote.textContent = '(неможливо вимкнути для OSM)';
    geonamesContainer.appendChild(geonamesCheckbox);
    geonamesContainer.appendChild(geonamesLabel);
    geonamesContainer.appendChild(geonamesNote);
    // Opacity slider
    const opacityContainer = document.createElement('div');
    opacityContainer.className = 'layer-card-slider-container';
    const opacitySlider = document.createElement('input');
    opacitySlider.type = 'range';
    opacitySlider.min = '0';
    opacitySlider.max = '1';
    opacitySlider.step = '0.1';
    opacitySlider.value = layerObj.tileLayer.options.opacity.toString();
    opacitySlider.className = 'layer-card-slider';
    opacitySlider.oninput = (e) => {
        const opacity = parseFloat(e.target.value);
        layerObj.tileLayer.setOpacity(opacity);
        saveLayersToStorage();
    };
    opacityContainer.appendChild(opacitySlider);
    // Objects section header
    const objectsHeader = document.createElement('div');
    objectsHeader.className = 'layer-objects-header';
    const objectsIcon = document.createElement('i');
    objectsIcon.className = 'fa fa-list';
    const objectsTitle = document.createElement('span');
    objectsTitle.textContent = 'Об\'єкти';
    objectsHeader.appendChild(objectsIcon);
    objectsHeader.appendChild(objectsTitle);
    // список об'єктів шару
    const objectsListWrap = document.createElement('div');
    objectsListWrap.className = 'layer-objects-list';
    function renderObjectsList() {
        objectsListWrap.innerHTML = '';
        const objectItems = [];
        layerObj.featureGroup.eachLayer((layer) => {
            var _a;
            const type = getObjectType(layer);
            const props = layer.properties || ((_a = layer.feature) === null || _a === void 0 ? void 0 : _a.properties) || {};
            const item = document.createElement('div');
            item.className = 'layer-object-item';
            item.title = props.name || type;
            item.innerHTML =
                `<span class="material-icons layer-object-drag-icon">drag_indicator</span>` +
                    (type === 'marker' ? `<span class="material-icons">${props.icon || 'place'}</span>` :
                        type === 'polygon' ? '<i class="fa fa-draw-polygon"></i>' :
                            type === 'polyline' ? '<i class="fa fa-share-alt"></i>' :
                                type === 'circle' ? '<i class="fa fa-circle"></i>' :
                                    type === 'rectangle' ? '<i class="fa fa-square"></i>' :
                                        type === 'image' ? '<i class="fa fa-image"></i>' :
                                            '<i class="fa fa-question"></i>') +
                    ` <span class="layer-object-name">${props.name || '[без назви]'}</span>`;
            item.dataset.objectId = layer._leaflet_id;
            objectItems.push(item);
            // drag&drop
            item.draggable = true;
            item.tabIndex = 0;
            item.onmousedown = (e) => {
            };
            item.onmouseup = (e) => {
            };
            item.ondragstart = (e) => {
                e.stopPropagation();
                // кастомний drag image
                const dragImg = document.createElement('span');
                dragImg.textContent = props.name || '[обʼєкт]';
                dragImg.style.position = 'absolute';
                dragImg.style.top = '-9999px';
                dragImg.style.left = '-9999px';
                dragImg.style.fontSize = '12px';
                dragImg.style.padding = '2px 8px';
                dragImg.style.background = '#fff';
                dragImg.style.border = '1px solid #888';
                dragImg.style.borderRadius = '4px';
                document.body.appendChild(dragImg);
                if (e.dataTransfer) {
                    const dragData = {
                        layerId: layerObj.id,
                        objectId: layer._leaflet_id
                    };
                    e.dataTransfer.setData('application/layer-object', JSON.stringify(dragData));
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setDragImage(dragImg, 0, 16);
                }
                else {
                    console.warn('[dragstart] no dataTransfer', e);
                }
                setTimeout(() => document.body.removeChild(dragImg), 50);
            };
            item.ondragend = (e) => {
                e.stopPropagation();
            };
            item.ondragover = (e) => {
                e.stopPropagation();
            };
            item.ondrop = (e) => {
                e.stopPropagation();
                if (e.dataTransfer) {
                    const data = e.dataTransfer.getData('application/layer-object');
                }
                else {
                    console.warn('[ondrop] no dataTransfer', e);
                }
            };
            // клік — тільки підсвічування
            let wasDragged = false;
            item.addEventListener('mousedown', () => { wasDragged = false; });
            item.addEventListener('dragstart', () => { wasDragged = true; });
            item.addEventListener('click', (e) => {
                if (wasDragged)
                    return;
                if (e.target.closest('.layer-object-drag-icon'))
                    return;
                // підсвічування
                if (layer.setStyle) {
                    const prev = Object.assign({}, (layer.options || {}));
                    layer.setStyle({ color: '#cd1d1d', weight: 8 });
                    setTimeout(() => layer.setStyle(prev), 1500);
                }
                else if (layer.setIcon) {
                    const prevIcon = layer.getIcon();
                    layer.setIcon(getColoredMarkerIcon('#cd1d1d', props.icon || 'place'));
                    setTimeout(() => layer.setIcon(prevIcon), 1500);
                }
                else if (layer.getElement && layer.getElement()) {
                    layer.getElement().classList.add('global-object-search-highlight');
                    setTimeout(() => layer.getElement().classList.remove('global-object-search-highlight'), 1500);
                }
                if (layer.getBounds)
                    map.fitBounds(layer.getBounds(), { maxZoom: 17 });
                else if (layer.getLatLng)
                    map.setView(layer.getLatLng(), 17);
            });
            // drag-іконка не запускає підсвічування
            const dragIcon = item.querySelector('.layer-object-drag-icon');
            if (dragIcon) {
                dragIcon.addEventListener('mousedown', e => { });
                dragIcon.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); });
                dragIcon.addEventListener('dblclick', e => { e.stopPropagation(); e.preventDefault(); });
            }
            // подвійний клік — модалка
            item.addEventListener('dblclick', (e) => {
                if (e.target.closest('.layer-object-drag-icon'))
                    return;
                showEditModal(layer);
            });
            objectsListWrap.appendChild(item);
        });
        // --- SortableJS для drag&drop об'єктів ---
        if (typeof window !== 'undefined' && window.Sortable && objectsListWrap) {
            if (!window.objectsSortables)
                window.objectsSortables = new Map();
            const sortablesMap = window.objectsSortables;
            if (sortablesMap.has(layerObj.id)) {
                sortablesMap.get(layerObj.id).destroy();
            }
            const sortable = new window.Sortable(objectsListWrap, {
                animation: 150,
                handle: '.layer-object-drag-icon',
                preventOnFilter: false,
                onEnd: function (evt) {
                    const newOrder = Array.from(objectsListWrap.children).map((el) => el.dataset.objectId);
                    const layers = [];
                    layerObj.featureGroup.eachLayer((l) => layers.push(l));
                    layers.forEach(l => layerObj.featureGroup.removeLayer(l));
                    newOrder.forEach((id) => {
                        const l = layers.find(x => x._leaflet_id == id);
                        if (l)
                            layerObj.featureGroup.addLayer(l);
                    });
                    saveLayersToStorage();
                    renderObjectsList();
                }
            });
            sortablesMap.set(layerObj.id, sortable);
        }
        // підсвічування source-списку
        objectsListWrap.addEventListener('dragstart', () => {
            objectsListWrap.classList.add('drag-over');
        });
        objectsListWrap.addEventListener('dragend', () => {
            document.querySelectorAll('.layer-objects-list.drag-over, .layer-objects-list-wrap.drag-over').forEach(el => el.classList.remove('drag-over'));
        });
        // підсвічування target-списку
        objectsListWrap.ondragover = (e) => {
            e.preventDefault();
            if (e.dataTransfer)
                e.dataTransfer.dropEffect = 'move';
            objectsListWrap.classList.add('drag-over');
        };
        objectsListWrap.ondragleave = (e) => {
            // Only remove drag-over if we're leaving the entire list area
            const rect = objectsListWrap.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                objectsListWrap.classList.remove('drag-over');
            }
        };
        objectsListWrap.ondrop = (e) => {
            e.preventDefault();
            objectsListWrap.classList.remove('drag-over');
            if (!e.dataTransfer) {
                console.warn('[objectsListWrap.ondrop] no dataTransfer', e);
                return;
            }
            const data = e.dataTransfer.getData('application/layer-object');
            if (!data)
                return;
            const { layerId, objectId } = JSON.parse(data);
            if (layerId == layerObj.id)
                return; // не переносимо у той самий шар
            // знайти старий шар та об'єкт
            const fromLayerObj = customLayers.find(l => l.id == layerId);
            if (!fromLayerObj) {
                console.warn('[objectsListWrap.ondrop] fromLayerObj not found', layerId);
                return;
            }
            let movedLayer = null;
            fromLayerObj.featureGroup.eachLayer((l) => {
                if (l._leaflet_id == objectId)
                    movedLayer = l;
            });
            if (!movedLayer) {
                console.warn('[objectsListWrap.ondrop] movedLayer not found', objectId);
                return;
            }
            fromLayerObj.featureGroup.removeLayer(movedLayer);
            layerObj.featureGroup.addLayer(movedLayer);
            saveLayersToStorage();
            // оновити UI тільки для поточного шару
            renderObjectsList();
        };
    }
    if (layerObj.featureGroup.images && Array.isArray(layerObj.featureGroup.images)) {
        layerObj.featureGroup.images.forEach((img) => {
            var _a, _b;
            const item = document.createElement('div');
            item.className = 'layer-object-item';
            item.title = ((_a = img.properties) === null || _a === void 0 ? void 0 : _a.name) || 'image';
            item.innerHTML = '<i class="fa fa-image"></i> ' + (((_b = img.properties) === null || _b === void 0 ? void 0 : _b.name) || '[зображення]');
            // клік — підсвічування (можна додати для overlay)
            // item.onclick = ...
            // подвійний клік — модалка (можна додати, якщо потрібно)
            objectsListWrap.appendChild(item);
        });
    }
    // Register the renderObjectsList for this layer
    layerIdToRenderObjectsList.set(layerObj.id, renderObjectsList);
    renderObjectsList();
    // --- expand/collapse logic ---
    let expanded = !layerObj.collapsed;
    const expandableElements = [selectContainer, geonamesContainer, opacityContainer, objectsHeader, objectsListWrap];
    function updateExpandCollapse() {
        if (expanded) {
            expandableElements.forEach(el => el.style.display = '');
            expandBtn.innerHTML = '<i class="fa fa-chevron-up"></i>';
            expandBtn.title = 'Згорнути шар';
            layerObj.collapsed = false;
        }
        else {
            expandableElements.forEach(el => el.style.display = 'none');
            expandBtn.innerHTML = '<i class="fa fa-chevron-down"></i>';
            expandBtn.title = 'Розгорнути шар';
            layerObj.collapsed = true;
        }
        saveLayersToStorage();
    }
    expandBtn.onclick = (e) => {
        e.stopPropagation();
        expanded = !expanded;
        updateExpandCollapse();
    };
    updateExpandCollapse();
    // --- порядок додавання у layerCard ---
    layerCard.appendChild(headerIcons);
    layerCard.appendChild(title);
    layerCard.appendChild(selectContainer);
    layerCard.appendChild(geonamesContainer);
    layerCard.appendChild(opacityContainer);
    layerCard.appendChild(objectsHeader);
    layerCard.appendChild(objectsListWrap);
    // Drag & drop event handlers for layer reordering
    layerCard.ondragstart = (e) => {
        var _a;
        (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData('text/plain', layerObj.id.toString());
        e.dataTransfer.effectAllowed = 'move';
        layerCard.classList.add('dragging');
    };
    layerCard.ondragend = () => {
        layerCard.classList.remove('dragging');
    };
    layerCard.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };
    layerCard.ondrop = (e) => {
        var _a;
        e.preventDefault();
        const draggedLayerId = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
        if (draggedLayerId && draggedLayerId !== layerObj.id.toString()) {
            // Reorder layers
            const draggedLayerIndex = customLayers.findIndex(l => l.id.toString() === draggedLayerId);
            const currentLayerIndex = customLayers.findIndex(l => l.id === layerObj.id);
            if (draggedLayerIndex !== -1 && currentLayerIndex !== -1) {
                const [draggedLayer] = customLayers.splice(draggedLayerIndex, 1);
                customLayers.splice(currentLayerIndex, 0, draggedLayer);
                // Re-render all layers to update order
                layerControlsDiv.innerHTML = '';
                customLayers.forEach(layer => {
                    createLayerControl(layer);
                });
                saveLayersToStorage();
            }
        }
    };
    layerControlsDiv.appendChild(layerCard);
    return layerCard;
}
export const layerControlsDiv = document.getElementById('layer-controls');
export const addLayerBtn = document.getElementById('add-layer');
export const exportAllBtn = document.getElementById('export-all');
export const importAllBtn = document.getElementById('import-all');
export const importAllInput = document.getElementById('import-all-input');
export let isDraggingObject = false;
// Function to get currently selected layer
export function getSelectedLayer() {
    const selectedCard = document.querySelector('.layer-card.active');
    if (selectedCard) {
        const layerId = selectedCard.getAttribute('data-layer-id');
        return customLayers.find(layer => layer.id.toString() === layerId);
    }
    return null;
}
// Function to select layer by ID
export function selectLayer(layerId) {
    document.querySelectorAll('.layer-card').forEach(card => {
        card.classList.remove('active');
    });
    const targetCard = document.querySelector(`[data-layer-id="${layerId}"]`);
    if (targetCard) {
        targetCard.classList.add('active');
    }
}
// Додаємо необхідні імпорти
import { customLayers, createTileLayer } from './layers.js';
import { map } from './map-init.js';
import { updateDrawControlVisibility } from './draw-control.js';
// Робимо renderObjectsList глобально доступною
// (window as any).renderObjectsList = renderObjectsList; // більше не потрібно
// --- Додаю оновлення списку об'єктів після збереження змін у модалці ---
const saveObjectBtn = document.getElementById('save-object');
if (saveObjectBtn) {
    saveObjectBtn.addEventListener('click', () => {
        // Оновлюємо картку активного шару після збереження змін
        import('./layers.js').then(({ customLayers, activeLayer }) => {
            const layerObj = customLayers.find((l) => l.featureGroup === activeLayer);
            if (layerObj) {
                // Знаходимо стару картку і замінюємо її новою
                const oldCard = document.querySelector('.layer-card.active');
                if (oldCard && oldCard.parentNode) {
                    import('./ui.js').then(({ createLayerControl }) => {
                        const newCard = createLayerControl(layerObj);
                        if (newCard && oldCard.parentNode) {
                            oldCard.parentNode.replaceChild(newCard, oldCard);
                        }
                    });
                }
            }
        });
    });
}
// Панель шарів: приховування/показ
const layersPanelDrawer = document.getElementById('layers-panel-drawer');
const layersPanelToggle = document.getElementById('layers-panel-toggle');
if (layersPanelDrawer && layersPanelToggle) {
    layersPanelToggle.addEventListener('click', () => {
        const isClosed = layersPanelDrawer.classList.toggle('closed');
        const icon = layersPanelToggle.querySelector('.material-icons');
        if (icon) {
            icon.textContent = isClosed ? 'chevron_right' : 'chevron_left';
        }
        setTimeout(() => { map.invalidateSize(); }, 300); // даємо CSS анімації завершитись
    });
}
window.addDoubleClickToLayer = addDoubleClickToLayer;
// --- Глобальний MutationObserver для маркерів ---
if (typeof window !== 'undefined' && typeof L !== 'undefined') {
    const markerObserver = new MutationObserver(() => {
        // Знаходимо всі leaflet-marker-icon
        document.querySelectorAll('.leaflet-marker-icon').forEach(icon => {
            // Знаходимо відповідний leaflet-обʼєкт
            const marker = Object.values(map._layers).find((l) => l._icon === icon);
            const iconEl = icon;
            if (marker && !iconEl.__dblclickHandlerAttached) {
                iconEl.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    showEditModal(marker);
                });
                iconEl.__dblclickHandlerAttached = true;
            }
        });
    });
    const mapEl = document.getElementById('map');
    if (mapEl)
        markerObserver.observe(mapEl, { childList: true, subtree: true });
}
