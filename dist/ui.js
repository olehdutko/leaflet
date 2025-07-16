import { currentEditingObject } from './state.js';
import { getColoredMarkerIcon, getObjectType, getObjectProperties } from './utils.js';
import { saveLayersToStorage } from './layers.js';
import { applyObjectProperties } from './objects.js';
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
                    // тут має бути логіка видалення обʼєкта (layer)
                    // (реалізуй згідно з твоєю структурою)
                }
            });
        };
    }
}
export function addDoubleClickToLayer(layer) {
    if (!layer)
        return;
    // click — підсвічування
    layer.on('click', function (e) {
        var _a;
        const type = getObjectType(layer);
        const props = layer.properties || ((_a = layer.feature) === null || _a === void 0 ? void 0 : _a.properties) || {};
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
    // dblclick — модалка
    layer.on('dblclick', function (e) {
        var _a, _b;
        (_b = (_a = e.originalEvent) === null || _a === void 0 ? void 0 : _a.stopPropagation) === null || _b === void 0 ? void 0 : _b.call(_a);
        showEditModal(layer);
    });
}
export function showConfirmDialog({ title = 'Підтвердження', message = '', onConfirm, onCancel }) {
    console.log('showConfirmDialog', title, message);
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    if (!modal || !titleEl || !msgEl || !okBtn || !cancelBtn)
        return;
    modal.classList.remove('hidden');
    modal.style.display = 'block';
    titleEl.textContent = title;
    msgEl.textContent = message;
    function close(result) {
        modal.classList.add('hidden');
        modal.style.display = '';
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
    // назва шару окремим рядком
    const title = document.createElement('h4');
    title.className = 'layer-card-title';
    title.textContent = layerObj.title || `Шар ${layerObj.id}`;
    // drag handle як button
    const dragHandle = document.createElement('button');
    dragHandle.className = 'layer-card-icon-btn layer-card-drag-handle';
    dragHandle.title = 'Перетягнути для зміни порядку';
    dragHandle.innerHTML = '<i class="fa fa-grip-vertical"></i>';
    // expand/collapse button
    const expandBtn = document.createElement('button');
    expandBtn.className = 'layer-card-icon-btn';
    expandBtn.innerHTML = '<i class="fa fa-chevron-up"></i>';
    expandBtn.title = 'Показати/сховати деталі';
    const header = document.createElement('div');
    header.className = 'layer-card-header';
    const actions = document.createElement('div');
    actions.className = 'layer-card-actions';
    // export button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'layer-card-icon-btn primary';
    exportBtn.innerHTML = '<i class="fa fa-download"></i>';
    exportBtn.title = 'Експортувати шар';
    exportBtn.onclick = (e) => {
        e.stopPropagation();
        const data = {
            id: layerObj.id,
            tileType: layerObj.tileType,
            opacity: layerObj.tileLayer.options.opacity,
            geojson: layerObj.featureGroup.toGeoJSON(),
            images: (layerObj.featureGroup.images || []),
            title: layerObj.title,
            visible: layerObj.visible !== false,
            collapsed: layerObj.collapsed || false
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (layerObj.title || `layer_${layerObj.id}`) + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    };
    // visibility
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
    };
    // delete
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
            }
        });
    };
    actions.appendChild(exportBtn);
    actions.appendChild(visibilityBtn);
    actions.appendChild(deleteBtn);
    // порядок: drag, expand, actions (праворуч)
    header.appendChild(dragHandle);
    header.appendChild(expandBtn);
    actions.style.flexGrow = '1';
    actions.style.display = 'flex';
    actions.style.justifyContent = 'flex-end';
    header.appendChild(actions);
    // select type
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
    selectContainer.appendChild(select);
    // opacity
    const opacityContainer = document.createElement('div');
    opacityContainer.className = 'layer-card-checkbox';
    const opacityLabel = document.createElement('label');
    opacityLabel.textContent = 'Прозорість: ';
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
    opacityContainer.appendChild(opacityLabel);
    opacityContainer.appendChild(opacitySlider);
    // список об'єктів шару
    const objectsListWrap = document.createElement('div');
    objectsListWrap.className = 'layer-objects-list-wrap';
    objectsListWrap.setAttribute('data-layer-id', layerObj.id);
    // створити контейнер для sortable
    const objectsList = document.createElement('div');
    objectsList.className = 'layer-objects-list';
    objectsListWrap.appendChild(objectsList);
    function renderObjectsList() {
        console.log('[debug] renderObjectsList called', layerObj);
        objectsList.innerHTML = '';
        const objectItems = [];
        let hasObjects = false;
        layerObj.featureGroup.eachLayer((layer) => {
            var _a;
            hasObjects = true;
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
                console.log('mousedown', e, item);
            };
            item.onmouseup = (e) => {
                console.log('mouseup', e, item);
            };
            item.ondragstart = (e) => {
                console.log('drag start', e, item);
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
                    e.dataTransfer.setData('application/layer-object', JSON.stringify({
                        layerId: layerObj.id,
                        objectId: layer._leaflet_id
                    }));
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setDragImage(dragImg, 0, 16);
                }
                setTimeout(() => document.body.removeChild(dragImg), 50);
            };
            item.ondragend = (e) => {
                console.log('drag end', e, item);
            };
            item.ondragover = (e) => {
                console.log('dragover', e, item);
            };
            item.ondrop = (e) => {
                console.log('drop', e, item);
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
                dragIcon.addEventListener('mousedown', e => { console.log('[drag-icon] mousedown', e, item); });
                dragIcon.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); console.log('[drag-icon] click', e, item); });
                dragIcon.addEventListener('dblclick', e => { e.stopPropagation(); e.preventDefault(); });
            }
            // подвійний клік — модалка
            item.addEventListener('dblclick', (e) => {
                if (e.target.closest('.layer-object-drag-icon'))
                    return;
                showEditModal(layer);
            });
            objectsList.appendChild(item);
        });
        if (!hasObjects) {
            // нічого не додавати у objectsList
        }
        // debug: log window.Sortable
        console.log('[debug] window.Sortable:', typeof window.Sortable, window.Sortable);
        // debug: log objectsList, діти, handle
        console.log('[debug] objectsList:', objectsList, objectsList.children);
        // debug: log для кожного .layer-object-item
        Array.from(objectsList.children).forEach((el, idx) => {
            console.log('[debug] .layer-object-item', idx, el, el.querySelector('.layer-object-drag-icon'));
        });
        // --- SortableJS для drag&drop об'єктів ---
        if (typeof window !== 'undefined' && window.Sortable && objectsList) {
            if (!window.objectsSortables)
                window.objectsSortables = new Map();
            const sortablesMap = window.objectsSortables;
            if (sortablesMap.has(layerObj.id)) {
                sortablesMap.get(layerObj.id).destroy();
            }
            // debug: log window.Sortable
            console.log('[debug] window.Sortable:', typeof window.Sortable, window.Sortable);
            // debug: log objectsList, діти, handle
            console.log('[debug] objectsList:', objectsList, objectsList.children);
            // debug: log для кожного .layer-object-item
            Array.from(objectsList.children).forEach((el, idx) => {
                console.log('[debug] .layer-object-item', idx, el, el.querySelector('.layer-object-drag-icon'));
            });
            const sortable = new window.Sortable(objectsList, {
                animation: 150,
                handle: '.layer-object-drag-icon',
                group: 'objects',
                onStart: function (evt) {
                    console.log('[SortableJS] onStart for layer', layerObj.id, evt);
                },
                onAdd: function (evt) {
                    console.log('[SortableJS] onAdd', evt);
                    // id об'єкта, який переноситься
                    const objectId = evt.item.dataset.objectId;
                    // знайти з якого шару переносили через data-layer-id
                    const fromLayerId = evt.from.getAttribute('data-layer-id');
                    const toLayerId = evt.to.getAttribute('data-layer-id');
                    const fromLayerObj = customLayers.find(l => String(l.id) === fromLayerId);
                    const toLayerObj = customLayers.find(l => String(l.id) === toLayerId);
                    if (!fromLayerObj || !toLayerObj)
                        return;
                    // знайти об'єкт
                    let movedLayer = null;
                    fromLayerObj.featureGroup.eachLayer((l) => {
                        if (l._leaflet_id == objectId)
                            movedLayer = l;
                    });
                    if (!movedLayer)
                        return;
                    fromLayerObj.featureGroup.removeLayer(movedLayer);
                    toLayerObj.featureGroup.addLayer(movedLayer);
                    saveLayersToStorage();
                    // оновити обидва списки
                    const fromCard = document.querySelector(`[data-layer-id="${fromLayerObj.id}"]`);
                    const toCard = document.querySelector(`[data-layer-id="${toLayerObj.id}"]`);
                    if (fromCard)
                        fromCard.dispatchEvent(new Event('rebuild'));
                    if (toCard)
                        toCard.dispatchEvent(new Event('rebuild'));
                },
                onEnd: function (evt) {
                    console.log('[SortableJS] onEnd for layer', layerObj.id, evt);
                    const newOrder = Array.from(objectsList.children).map((el) => el.dataset.objectId);
                    const layers = [];
                    layerObj.featureGroup.eachLayer((l) => layers.push(l));
                    layers.forEach(l => layerObj.featureGroup.removeLayer(l));
                    newOrder.forEach((id) => {
                        const l = layers.find(x => x._leaflet_id == id);
                        if (l)
                            layerObj.featureGroup.addLayer(l);
                    });
                    saveLayersToStorage();
                    // renderObjectsList(); // не викликаємо тут
                }
            });
            // rebuild event для оновлення списку після drop
            objectsList.addEventListener('rebuild', () => renderObjectsList());
            sortablesMap.set(layerObj.id, sortable);
        }
        // drag&drop для списку (drop target)
        objectsList.ondragover = (e) => {
            e.preventDefault();
            if (e.dataTransfer)
                e.dataTransfer.dropEffect = 'move';
        };
        objectsList.ondrop = (e) => {
            e.preventDefault();
            if (!e.dataTransfer)
                return;
            const data = e.dataTransfer.getData('application/layer-object');
            if (!data)
                return;
            const { layerId, objectId } = JSON.parse(data);
            if (layerId == layerObj.id)
                return; // не переносимо у той самий шар
            // знайти старий шар та об'єкт
            const fromLayerObj = customLayers.find(l => l.id == layerId);
            if (!fromLayerObj)
                return;
            let movedLayer = null;
            fromLayerObj.featureGroup.eachLayer((l) => {
                if (l._leaflet_id == objectId)
                    movedLayer = l;
            });
            if (!movedLayer)
                return;
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
            objectsList.appendChild(item);
        });
    }
    renderObjectsList();
    // --- expand/collapse logic ---
    let expanded = true;
    function updateExpandCollapse() {
        if (expanded) {
            selectContainer.style.display = '';
            opacityContainer.style.display = '';
            objectsListWrap.style.display = '';
            expandBtn.innerHTML = '<i class="fa fa-chevron-up"></i>';
        }
        else {
            selectContainer.style.display = 'none';
            opacityContainer.style.display = 'none';
            objectsListWrap.style.display = 'none';
            expandBtn.innerHTML = '<i class="fa fa-chevron-down"></i>';
        }
    }
    expandBtn.onclick = (e) => {
        e.stopPropagation();
        expanded = !expanded;
        updateExpandCollapse();
    };
    updateExpandCollapse();
    // --- порядок додавання у layerCard ---
    layerCard.appendChild(title); // назва першою
    layerCard.appendChild(header); // іконки під назвою
    layerCard.appendChild(selectContainer);
    layerCard.appendChild(opacityContainer);
    layerCard.appendChild(objectsListWrap);
    layerControlsDiv.appendChild(layerCard);
}
export const layerControlsDiv = document.getElementById('layer-controls');
export const addLayerBtn = document.getElementById('add-layer');
export const exportAllBtn = document.getElementById('export-all');
export const importAllBtn = document.getElementById('import-all');
export const importAllInput = document.getElementById('import-all-input');
export let isDraggingObject = false;
// Додаємо необхідні імпорти
import { customLayers, createTileLayer } from './layers.js';
import { map } from './map-init.js';
