import { currentEditingObject } from './state.js';
import { closeEditModal } from './main.js';
import { map } from './map-init.js';
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
        objectName.value = properties.name || '';
    const objectDescription = document.getElementById('object-description');
    if (objectDescription)
        objectDescription.value = properties.description || '';
    // Групи контролів
    const colorPickerGroup = document.getElementById('color-picker-group');
    const lineWidthGroup = document.getElementById('line-width-group');
    const styleGroup = document.getElementById('style-group');
    const opacityGroup = document.getElementById('opacity-group');
    const markerIconGroup = document.getElementById('marker-icon-group');
    const imageGroup = document.getElementById('object-image-group');
    // Приховуємо всі групи
    [colorPickerGroup, lineWidthGroup, styleGroup, opacityGroup, markerIconGroup, imageGroup].forEach(group => {
        if (group)
            group.style.display = 'none';
    });
    // Показуємо відповідні групи залежно від типу
    if (type === 'marker') {
        if (colorPickerGroup)
            colorPickerGroup.style.display = 'block';
        if (markerIconGroup)
            markerIconGroup.style.display = 'block';
        if (imageGroup)
            imageGroup.style.display = 'block';
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
        if (imageGroup)
            imageGroup.style.display = 'block';
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
        if (imageGroup)
            imageGroup.style.display = 'block';
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
    // --- Ініціалізація контролів зображень ---
    if (imageGroup) {
        const imageInput = document.getElementById('object-image');
        const imagePreviewContainer = document.getElementById('object-image-preview-container');
        const imagePreview = document.getElementById('object-image-preview');
        const imageRemoveBtn = document.getElementById('object-image-remove');
        // Показуємо попередній перегляд якщо є зображення
        if (properties.image) {
            if (imagePreviewContainer)
                imagePreviewContainer.classList.remove('hidden');
            if (imagePreview)
                imagePreview.src = properties.image;
        }
        else {
            if (imagePreviewContainer)
                imagePreviewContainer.classList.add('hidden');
        }
        // Обробник вибору файлу
        if (imageInput) {
            imageInput.onchange = function (e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const imageUrl = e.target.result;
                        if (imagePreview)
                            imagePreview.src = imageUrl;
                        if (imagePreviewContainer)
                            imagePreviewContainer.classList.remove('hidden');
                        // Зберігаємо зображення в властивості об'єкта
                        if (currentEditingObject.value) {
                            currentEditingObject.value.properties = currentEditingObject.value.properties || {};
                            currentEditingObject.value.properties.image = imageUrl;
                            // Автоматично зберігаємо зміни
                            import('./layers.js').then(({ saveLayersToStorage }) => {
                                saveLayersToStorage();
                                console.log('💾 Зображення збережено в localStorage');
                            });
                        }
                    };
                    reader.readAsDataURL(file);
                }
            };
        }
        // Обробник видалення зображення
        if (imageRemoveBtn) {
            imageRemoveBtn.onclick = function () {
                if (imagePreview)
                    imagePreview.src = '';
                if (imagePreviewContainer)
                    imagePreviewContainer.classList.add('hidden');
                if (imageInput)
                    imageInput.value = '';
                // Видаляємо зображення з властивостей об'єкта
                if (currentEditingObject.value) {
                    currentEditingObject.value.properties = currentEditingObject.value.properties || {};
                    delete currentEditingObject.value.properties.image;
                    // Автоматично зберігаємо зміни
                    import('./layers.js').then(({ saveLayersToStorage }) => {
                        saveLayersToStorage();
                        console.log('💾 Видалення зображення збережено в localStorage');
                    });
                }
            };
        }
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
    // видалено: imageInput, imagePreviewContainer, imagePreview, imageRemoveBtn, preview, вибір, видалення зображення
    // видалення об'єкта
    const deleteObjectBtn = document.getElementById('delete-object');
    if (deleteObjectBtn) {
        deleteObjectBtn.onclick = function () {
            let typeName = 'обʼєкта';
            if (currentEditingObject.value) {
                const type = getObjectType(currentEditingObject.value);
                if (type === 'marker')
                    typeName = 'маркеру';
                else if (type === 'polygon')
                    typeName = 'полігону';
                else if (type === 'polyline')
                    typeName = 'лінії';
                else if (type === 'rectangle')
                    typeName = 'прямокутника';
                else if (type === 'circle')
                    typeName = 'кола';
            }
            let objectName = typeName;
            if (currentEditingObject.value) {
                const properties = getObjectProperties(currentEditingObject.value);
                if (properties.name)
                    objectName = `"${properties.name}"`;
            }
            showConfirmDialog({
                title: `Видалення ${typeName}: ${objectName}`,
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
                },
                buttons: [
                    { text: 'Видалити', action: 'delete', className: 'btn-danger' },
                    { text: 'Скасувати', action: 'cancel', className: 'btn-secondary' }
                ]
            });
        };
    }
}
export function addDoubleClickToLayer(layer) {
    if (!layer)
        return;
    const type = getObjectType(layer);
    // --- Тултіп функціональність ---
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
        const props = layer.properties || {};
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
        const mapContainer = map.getContainer();
        mapContainer.appendChild(customTooltip);
        // Позиціонуємо тултіп
        if (e.originalEvent && typeof e.originalEvent.clientX === 'number' && typeof e.originalEvent.clientY === 'number') {
            const rect = mapContainer.getBoundingClientRect();
            customTooltip.style.left = (e.originalEvent.clientX - rect.left) + 'px';
            customTooltip.style.top = (e.originalEvent.clientY - rect.top) + 'px';
            customTooltip.style.transform = 'translate(-50%, -120%)';
        }
        else {
            // fallback: над об'єктом
            const point = map.latLngToLayerPoint(e.latlng);
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
    // Підключаємо тултіпи
    layer.on('mouseover', showTooltip);
    layer.on('mouseout', hideTooltip);
    // --- Подвійний клік функціональність ---
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
export function showConfirmDialog({ title = 'Підтвердження', message = '', onConfirm, onCancel, buttons }) {
    const modal = document.getElementById('confirm-modal');
    const backdrop = document.getElementById('confirm-modal-backdrop');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const footer = modal === null || modal === void 0 ? void 0 : modal.querySelector('.modal-footer');
    if (!modal || !titleEl || !msgEl || !footer)
        return;
    modal.classList.remove('hidden');
    modal.style.display = 'block';
    if (backdrop)
        backdrop.classList.remove('hidden');
    titleEl.textContent = title;
    msgEl.textContent = message;
    // Очищаємо футер
    footer.innerHTML = '';
    if (buttons && buttons.length) {
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.text;
            button.className = btn.className || '';
            button.onclick = () => {
                modal.classList.add('hidden');
                modal.style.display = '';
                if (backdrop)
                    backdrop.classList.add('hidden');
                if (btn.action === 'cancel' && onCancel)
                    onCancel();
                if (btn.action !== 'cancel' && onConfirm)
                    onConfirm(btn.action);
            };
            footer.appendChild(button);
        });
    }
    else {
        // Стандартні кнопки
        const okBtn = document.createElement('button');
        okBtn.textContent = 'OK';
        okBtn.className = 'btn-primary';
        okBtn.onclick = () => {
            modal.classList.add('hidden');
            modal.style.display = '';
            if (backdrop)
                backdrop.classList.add('hidden');
            if (onConfirm)
                onConfirm();
        };
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Скасувати';
        cancelBtn.className = 'btn-secondary';
        cancelBtn.onclick = () => {
            modal.classList.add('hidden');
            modal.style.display = '';
            if (backdrop)
                backdrop.classList.add('hidden');
            if (onCancel)
                onCancel();
        };
        footer.appendChild(okBtn);
        footer.appendChild(cancelBtn);
    }
}
export function createLayerControl(layerObj) {
    if (!layerControlsDiv)
        return;
    const layerCard = document.createElement('div');
    layerCard.className = 'layer-card';
    layerCard.dataset.layerId = layerObj.id.toString();
    // Layer card is not draggable by default - only via drag handle
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
    // Drag functionality handled by Sortable.js via handle: '.layer-card-drag-handle'
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
            // Показати overlays
            if (layerObj.featureGroup.overlayInstances && layerObj.featureGroup.overlayInstances.length > 0) {
                layerObj.featureGroup.overlayInstances.forEach((overlay, index) => {
                    if (overlay && !map.hasLayer(overlay)) {
                        try {
                            overlay.addTo(map);
                        }
                        catch (error) {
                            // Ігноруємо помилки додавання
                        }
                    }
                });
            }
            else if (layerObj.featureGroup.images && layerObj.featureGroup.images.length > 0) {
                // overlayInstances відсутні або пусті - відновлюємо з images
                import('./layers.js').then(({ restoreOverlaysForFeatureGroup }) => {
                    restoreOverlaysForFeatureGroup(layerObj.featureGroup);
                });
            }
            visibilityBtn.innerHTML = '<i class="fa fa-eye"></i>';
            visibilityBtn.title = 'Сховати шар';
            visibilityBtn.classList.add('blue');
            layerCard.classList.remove('layer-card-inactive');
        }
        else {
            map.removeLayer(layerObj.tileLayer);
            // Знімаю overlays з карти та очищую overlayInstances
            if (layerObj.featureGroup.overlayInstances) {
                layerObj.featureGroup.overlayInstances.forEach((overlay) => {
                    if (overlay && map.hasLayer(overlay)) {
                        map.removeLayer(overlay);
                    }
                });
                // Очищуємо overlayInstances, щоб при показуванні відновити з images
                layerObj.featureGroup.overlayInstances = [];
            }
            // Видаляємо тільки featureGroup з карти, НЕ очищуючи дані
            map.removeLayer(layerObj.featureGroup);
            // НЕ викликаємо removeFeatureGroupAndOverlays - вона очищає дані!
            // import('./layers.js').then(({ removeFeatureGroupAndOverlays }) => {
            //   removeFeatureGroupAndOverlays(layerObj.featureGroup);
            // });
            visibilityBtn.innerHTML = '<i class="fa fa-eye-slash"></i>';
            visibilityBtn.title = 'Показати шар';
            visibilityBtn.classList.remove('blue');
            layerCard.classList.add('layer-card-inactive');
        }
        // Зберігаємо стан видимості в localStorage
        import('./layers.js').then(({ saveLayersToStorage }) => {
            saveLayersToStorage();
        });
        // Оновлюємо видимість draw control
        updateDrawControlVisibility();
    };
    if (!layerObj.visible) {
        visibilityBtn.classList.remove('blue');
        layerCard.classList.add('layer-card-inactive');
    }
    else {
        visibilityBtn.classList.add('blue');
        layerCard.classList.remove('layer-card-inactive');
    }
    // Trash icon (delete)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'layer-card-icon-btn delete';
    deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
    deleteBtn.title = 'Видалити шар';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        showConfirmDialog({
            title: `Видалення шару: ${layerObj.title}`,
            message: `Ви дійсно хочете видалити шар "${layerObj.title}"?`,
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
            },
            buttons: [
                { text: 'Видалити', action: 'delete', className: 'btn-danger' },
                { text: 'Скасувати', action: 'cancel', className: 'btn-secondary' }
            ]
        });
    };
    // Gallery icon (picture)
    const galleryBtn = document.createElement('button');
    galleryBtn.className = 'layer-card-icon-btn';
    galleryBtn.innerHTML = '<i class="fa fa-image"></i>';
    galleryBtn.title = 'Галерея';
    galleryBtn.onclick = () => {
        // Встановлюємо цей шар як активний
        import('./layers.js').then(({ setActiveLayer }) => {
            setActiveLayer(layerObj.featureGroup);
        });
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file)
                return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                var _a;
                const imgUrl = evt.target.result;
                // Додаємо зображення у центр карти з дефолтними розмірами
                const mapCenter = map.getCenter();
                const bounds = [
                    [mapCenter.lat - 0.005, mapCenter.lng - 0.01],
                    [mapCenter.lat + 0.005, mapCenter.lng + 0.01]
                ];
                // Додаємо overlay на карту
                // @ts-ignore
                const overlay = L.distortableImageOverlay(imgUrl, {
                    bounds: bounds,
                    selected: true
                }).addTo(map);
                // Додаємо унікальний ідентифікатор для overlay
                overlay._overlayId = `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                overlay._customUrl = imgUrl;
                // Ініціалізуємо масиви якщо потрібно
                if (!layerObj.featureGroup.overlays)
                    layerObj.featureGroup.overlays = [];
                if (!layerObj.featureGroup.images)
                    layerObj.featureGroup.images = [];
                if (!layerObj.featureGroup.overlayInstances)
                    layerObj.featureGroup.overlayInstances = [];
                // Перевіряємо, чи не існує вже таке зображення (запобігаємо дублікатам)
                const existingImageIdx = layerObj.featureGroup.images.findIndex((img) => img.url === imgUrl);
                if (existingImageIdx !== -1) {
                    overlay.remove();
                    return;
                }
                const existingOverlayIdx = layerObj.featureGroup.overlays.findIndex((img) => img.url === imgUrl);
                if (existingOverlayIdx !== -1) {
                    overlay.remove();
                    return;
                }
                // Створюємо imageData об'єкт з повними даними включно з corners
                const initialCorners = ((_a = overlay.getCorners) === null || _a === void 0 ? void 0 : _a.call(overlay)) ?
                    overlay.getCorners().map((c) => ({ lat: c.lat, lng: c.lng })) : null;
                const imageData = {
                    url: imgUrl,
                    bounds,
                    opacity: 1,
                    corners: initialCorners
                };
                console.log(`🆕 Додаємо новий overlay через галерею:`);
                console.log(`   URL: ${imgUrl.substring(0, 50)}...`);
                console.log(`   Початкові corners:`, initialCorners);
                // Додаємо в усі масиви
                layerObj.featureGroup.images.push(imageData);
                layerObj.featureGroup.overlays.push(Object.assign({}, imageData)); // Копія для сумісності
                layerObj.featureGroup.overlayInstances.push(overlay);
                console.log(`✅ Додано в масиви: images[${layerObj.featureGroup.images.length - 1}], overlays[${layerObj.featureGroup.overlays.length - 1}], instances[${layerObj.featureGroup.overlayInstances.length - 1}]`);
                // ДІЙСНО СИНХРОННЕ збереження - використовуємо вже завантажену функцію
                console.log(`💾 СПРАВЖНЄ синхронне початкове збереження...`);
                if (window.saveLayersToStorage && typeof window.saveLayersToStorage === 'function') {
                    try {
                        window.saveLayersToStorage();
                        console.log(`✅ Синхронне збереження завершено успішно`);
                    }
                    catch (error) {
                        console.log(`❌ Помилка синхронного збереження:`, error);
                    }
                }
                else {
                    console.log(`⚠️ saveLayersToStorage недоступна, використовуємо async import`);
                    import('./layers.js').then(({ saveLayersToStorage }) => {
                        saveLayersToStorage();
                        console.log(`✅ Async збереження завершено`);
                    });
                }
                // Перевіряємо що overlay дійсно збережено в localStorage
                setTimeout(() => {
                    const stored = localStorage.getItem('lefleat_layers');
                    if (stored) {
                        const data = JSON.parse(stored);
                        const hasNewOverlay = data.some((layer) => layer.overlays && layer.overlays.some((ov) => ov.url === imgUrl));
                        if (hasNewOverlay) {
                            console.log(`✅ ПІДТВЕРДЖЕНО: Новий overlay знайдено в localStorage`);
                        }
                        else {
                            console.log(`❌ ПРОБЛЕМА: Новий overlay НЕ знайдено в localStorage!`);
                        }
                    }
                }, 50);
                // Лічильник edit подій для цього overlay
                let editEventCount = 0;
                // Покращений механізм збереження з особливою увагою до першого edit
                const improvedSave = (isFirstEdit = false) => {
                    console.log(`💾 Збереження викликано (перший edit: ${isFirstEdit})...`);
                    // Для першого edit робимо мінімальну затримку
                    const delay = isFirstEdit ? 25 : 150;
                    setTimeout(() => {
                        console.log(`💾 Виконуємо збереження в localStorage (затримка: ${delay}мс)...`);
                        // Перевіряємо стан до збереження
                        const beforeState = localStorage.getItem('lefleat_layers');
                        console.log(`📋 Стан localStorage ДО збереження: ${beforeState ? JSON.parse(beforeState).length + ' шарів' : 'порожній'}`);
                        if (window.saveLayersToStorage && typeof window.saveLayersToStorage === 'function') {
                            window.saveLayersToStorage();
                            // Перевіряємо стан після збереження з короткою затримкою
                            setTimeout(() => {
                                const afterState = localStorage.getItem('lefleat_layers');
                                console.log(`✅ Стан localStorage ПІСЛЯ збереження: ${afterState ? JSON.parse(afterState).length + ' шарів' : 'порожній'}`);
                                if (isFirstEdit && afterState) {
                                    const data = JSON.parse(afterState);
                                    let foundUpdatedCorners = false;
                                    data.forEach((layer) => {
                                        if (layer.overlays && layer.overlays.length > 0) {
                                            layer.overlays.forEach((ov) => {
                                                if (ov.corners && ov.corners.length > 0) {
                                                    foundUpdatedCorners = true;
                                                    console.log(`🎯 ПЕРШИЙ EDIT: Знайдено оновлені координати!`, ov.corners.slice(0, 2));
                                                }
                                            });
                                        }
                                    });
                                    if (!foundUpdatedCorners) {
                                        console.log(`❌ ПЕРШИЙ EDIT: Координати НЕ знайдено в localStorage!`);
                                    }
                                    else {
                                        console.log(`✅ ПЕРШИЙ EDIT: Координати УСПІШНО збережено!`);
                                    }
                                }
                            }, 25);
                        }
                        else {
                            console.log(`⚠️ saveLayersToStorage недоступна, використовуємо import`);
                            import('./layers.js').then(({ saveLayersToStorage }) => {
                                saveLayersToStorage();
                                console.log(`✅ Збереження виконано через import`);
                            });
                        }
                    }, delay);
                };
                // Функція оновлення стану overlay з додатковими перевірками
                const updateOverlayState = () => {
                    var _a, _b, _c, _d;
                    editEventCount++;
                    const isFirstEdit = editEventCount === 1;
                    const newBounds = overlay.getBounds();
                    const newCorners = ((_a = overlay.getCorners) === null || _a === void 0 ? void 0 : _a.call(overlay)) ?
                        overlay.getCorners().map((c) => ({ lat: c.lat, lng: c.lng })) : null;
                    console.log(`🔄 Edit подія #${editEventCount} для gallery overlay: ${imgUrl.substring(0, 50)}... (перший: ${isFirstEdit})`);
                    console.log(`   Нові bounds:`, newBounds);
                    console.log(`   Нові corners:`, newCorners);
                    // Перевіряємо стан масивів перед оновленням
                    console.log(`🔍 Поточний стан масивів:`);
                    console.log(`   images.length: ${((_b = layerObj.featureGroup.images) === null || _b === void 0 ? void 0 : _b.length) || 0}`);
                    console.log(`   overlays.length: ${((_c = layerObj.featureGroup.overlays) === null || _c === void 0 ? void 0 : _c.length) || 0}`);
                    console.log(`   overlayInstances.length: ${((_d = layerObj.featureGroup.overlayInstances) === null || _d === void 0 ? void 0 : _d.length) || 0}`);
                    // Знаходимо overlay по URL в обох масивах
                    const overlayIdx = layerObj.featureGroup.overlays.findIndex((img) => img.url === imgUrl);
                    const imageIdx = layerObj.featureGroup.images.findIndex((img) => img.url === imgUrl);
                    console.log(`🔍 Пошук по URL: overlayIdx=${overlayIdx}, imageIdx=${imageIdx}`);
                    if (overlayIdx === -1 && imageIdx === -1) {
                        console.log(`❌ КРИТИЧНА ПОМИЛКА: Не знайдено overlay в жодному масиві!`);
                        console.log(`   Шукаємо URL: ${imgUrl.substring(0, 50)}...`);
                        console.log(`   Доступні URLs в images:`, layerObj.featureGroup.images.map((img) => img.url.substring(0, 30)));
                        console.log(`   Доступні URLs в overlays:`, layerObj.featureGroup.overlays.map((img) => img.url.substring(0, 30)));
                        // Спробуємо знайти по _customUrl overlay об'єкта
                        const overlayInstIdx = layerObj.featureGroup.overlayInstances.findIndex((inst) => inst._customUrl === imgUrl);
                        if (overlayInstIdx !== -1) {
                            console.log(`🔍 Знайдено в overlayInstances[${overlayInstIdx}], спробуємо відновити синхронізацію...`);
                            // Можливо масиви розсинхронізувалися, спробуємо виправити
                            return;
                        }
                        return;
                    }
                    // Оновлюємо overlays масив
                    if (overlayIdx !== -1) {
                        const oldBounds = layerObj.featureGroup.overlays[overlayIdx].bounds;
                        const oldCorners = layerObj.featureGroup.overlays[overlayIdx].corners;
                        layerObj.featureGroup.overlays[overlayIdx].bounds = newBounds;
                        if (newCorners) {
                            layerObj.featureGroup.overlays[overlayIdx].corners = newCorners;
                        }
                        console.log(`✅ Оновлено overlays[${overlayIdx}]:`);
                        console.log(`   bounds: ${JSON.stringify(oldBounds)} → ${JSON.stringify(newBounds)}`);
                        console.log(`   corners: ${(oldCorners === null || oldCorners === void 0 ? void 0 : oldCorners.length) || 0} → ${(newCorners === null || newCorners === void 0 ? void 0 : newCorners.length) || 0} точок`);
                    }
                    else {
                        console.log(`⚠️ Не знайдено в overlays масиві для URL: ${imgUrl.substring(0, 50)}...`);
                    }
                    // Оновлюємо images масив
                    if (imageIdx !== -1) {
                        const oldBounds = layerObj.featureGroup.images[imageIdx].bounds;
                        const oldCorners = layerObj.featureGroup.images[imageIdx].corners;
                        layerObj.featureGroup.images[imageIdx].bounds = newBounds;
                        if (newCorners) {
                            layerObj.featureGroup.images[imageIdx].corners = newCorners;
                        }
                        console.log(`✅ Оновлено images[${imageIdx}]:`);
                        console.log(`   bounds: ${JSON.stringify(oldBounds)} → ${JSON.stringify(newBounds)}`);
                        console.log(`   corners: ${(oldCorners === null || oldCorners === void 0 ? void 0 : oldCorners.length) || 0} → ${(newCorners === null || newCorners === void 0 ? void 0 : newCorners.length) || 0} точок`);
                    }
                    else {
                        console.log(`⚠️ Не знайдено в images масиві для URL: ${imgUrl.substring(0, 50)}...`);
                    }
                    console.log(`💾 Викликаємо збереження в localStorage (перший edit: ${isFirstEdit})...`);
                    improvedSave(isFirstEdit);
                };
                // Підписуємося на 'edit' з покращеним механізмом збереження
                console.log(`🎧 Підключаємо ПОКРАЩЕНИЙ edit обробник для нового overlay...`);
                // Додаємо невелику затримку перед підключенням edit обробника
                // щоб переконатися що початкове збереження завершилося
                setTimeout(() => {
                    // Використовуємо покращений edit handler якщо доступний
                    if (window.overlayPositionFix && window.overlayPositionFix.createEditHandler) {
                        console.log(`🔧 Використовуємо покращений edit handler v2.8`);
                        const enhancedHandler = window.overlayPositionFix.createEditHandler(overlay, imgUrl, layerObj.featureGroup);
                        overlay.on('edit', enhancedHandler);
                    }
                    else {
                        console.log(`⚠️ Покращений handler недоступний, використовуємо fallback`);
                        overlay.on('edit', updateOverlayState);
                    }
                    console.log(`✅ Edit обробник підключено з затримкою`);
                }, 100);
                // **Збільшуємо затримку готовності до редагування**
                setTimeout(() => {
                    console.log(`🔓 Overlay повністю готовий до редагування`);
                }, 300);
                // Оновлення opacity при зміні прозорості шару
                overlay.setOpacity(layerObj.tileLayer.options.opacity);
            };
            reader.readAsDataURL(file);
        };
        fileInput.click();
    };
    galleryBtn.classList.add('blue');
    // Export button (upload icon)
    const exportBtn = document.createElement('button');
    exportBtn.className = 'layer-card-icon-btn export';
    exportBtn.innerHTML = '<i class="fa fa-upload"></i>';
    exportBtn.title = 'Експортувати цей шар';
    exportBtn.onclick = () => {
        // Формуємо дані для експорту цього шару
        const l = layerObj;
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
        const layerData = {
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
        const blob = new Blob([JSON.stringify(layerData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Дозволяємо пробіли, кирилицю, але прибираємо заборонені символи
        let safeTitle = l.title ? l.title.replace(/[\\/:*?"<>|]+/g, '') : 'layer';
        a.download = safeTitle + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    };
    exportBtn.classList.add('blue');
    // Add icons to header
    headerIcons.appendChild(dragHandle);
    headerIcons.appendChild(expandBtn);
    headerIcons.appendChild(visibilityBtn);
    headerIcons.appendChild(exportBtn);
    headerIcons.appendChild(deleteBtn);
    headerIcons.appendChild(galleryBtn);
    // Layer title
    const title = document.createElement('h4');
    title.className = 'layer-card-title';
    title.textContent = layerObj.title || `Шар ${layerObj.id}`;
    title.style.cursor = 'pointer';
    title.ondblclick = function () {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = layerObj.title || '';
        input.className = 'layer-card-title-input';
        input.style.fontSize = '14px';
        input.style.fontWeight = '600';
        input.style.width = '90%';
        input.style.margin = '0';
        input.style.padding = '2px 4px';
        input.style.borderRadius = '4px';
        input.style.border = '1px solid #d1d5db';
        input.onblur = save;
        input.onkeydown = function (e) {
            if (e.key === 'Enter') {
                input.blur();
            }
            else if (e.key === 'Escape') {
                title.textContent = layerObj.title || `Шар ${layerObj.id}`;
            }
        };
        title.replaceWith(input);
        input.focus();
        input.select();
        function save() {
            const newTitle = input.value.trim();
            if (newTitle && newTitle !== layerObj.title) {
                // перевірка на унікальність
                if (customLayers.some(l => l.title === newTitle && l.id !== layerObj.id)) {
                    showConfirmDialog({
                        title: 'Помилка',
                        message: 'Шар з такою назвою вже існує. Виберіть іншу назву.',
                        buttons: [
                            { text: 'OK', action: 'ok', className: 'btn-primary' }
                        ],
                        onConfirm: () => {
                            input.focus();
                            input.select();
                        }
                    });
                    return;
                }
                layerObj.title = newTitle;
                saveLayersToStorage();
                // Оновити картку шару (перегенерувати)
                if (layerCard.parentNode) {
                    const newCard = createLayerControl(layerObj);
                    if (newCard && layerCard.parentNode) {
                        layerCard.parentNode.replaceChild(newCard, layerCard);
                    }
                }
            }
            else {
                input.replaceWith(title);
                title.textContent = layerObj.title || `Шар ${layerObj.id}`;
            }
        }
    };
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
    opacitySlider.step = '0.01';
    opacitySlider.value = layerObj.tileLayer.options.opacity;
    opacitySlider.className = 'layer-card-slider';
    opacitySlider.oninput = () => {
        const value = parseFloat(opacitySlider.value);
        layerObj.tileLayer.setOpacity(value);
        // Оновити opacity overlays
        if (layerObj.featureGroup.overlays) {
            layerObj.featureGroup.overlays.forEach((img) => {
                // Знаходимо overlay у featureGroup
                const overlays = layerObj.featureGroup.getLayers().filter((l) => l._url === img.url);
                overlays.forEach((ov) => ov.setOpacity(value));
                img.opacity = value;
            });
        }
        import('./layers.js').then(({ saveLayersToStorage }) => saveLayersToStorage());
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
                    // [dragstart] no dataTransfer', e);
                }
                setTimeout(() => document.body.removeChild(dragImg), 50);
            };
            item.ondragend = (e) => {
                e.stopPropagation();
            };
            item.ondragover = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer)
                    e.dataTransfer.dropEffect = 'move';
                item.classList.add('drag-over');
            };
            item.ondragleave = (e) => {
                e.stopPropagation();
                item.classList.remove('drag-over');
            };
            item.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                item.classList.remove('drag-over');
                if (!e.dataTransfer) {
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
                    return;
                }
                let movedLayer = null;
                fromLayerObj.featureGroup.eachLayer((l) => {
                    if (l._leaflet_id == objectId)
                        movedLayer = l;
                });
                if (!movedLayer) {
                    return;
                }
                fromLayerObj.featureGroup.removeLayer(movedLayer);
                layerObj.featureGroup.addLayer(movedLayer);
                saveLayersToStorage();
                // Оновити UI для обох шарів через setTimeout щоб уникнути конфлікту з Sortable.js
                setTimeout(() => {
                    updateObjectsListForLayer(fromLayerObj);
                    updateObjectsListForLayer(layerObj);
                }, 100);
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
        // --- Відключаємо SortableJS для drag&drop між шарами ---
        if (typeof window !== 'undefined' && window.Sortable && objectsListWrap) {
            if (!window.objectsSortables)
                window.objectsSortables = new Map();
            const sortablesMap = window.objectsSortables;
            if (sortablesMap.has(layerObj.id)) {
                sortablesMap.get(layerObj.id).destroy();
                sortablesMap.delete(layerObj.id);
            }
        }
        // підсвічування source-списку
        objectsListWrap.addEventListener('dragstart', () => {
            objectsListWrap.classList.add('drag-over');
        });
        objectsListWrap.addEventListener('dragend', () => {
            document.querySelectorAll('.layer-objects-list.drag-over, .layer-objects-list-wrap.drag-over').forEach(el => el.classList.remove('drag-over'));
        });
        // drag&drop на контейнер списку (для порожніх місць)
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
                return;
            }
            let movedLayer = null;
            fromLayerObj.featureGroup.eachLayer((l) => {
                if (l._leaflet_id == objectId)
                    movedLayer = l;
            });
            if (!movedLayer) {
                return;
            }
            fromLayerObj.featureGroup.removeLayer(movedLayer);
            layerObj.featureGroup.addLayer(movedLayer);
            saveLayersToStorage();
            // Оновити UI для обох шарів
            setTimeout(() => {
                updateObjectsListForLayer(fromLayerObj);
                updateObjectsListForLayer(layerObj);
            }, 100);
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
    // Layer reordering is handled by Sortable.js in layers.ts
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
                    const newCard = createLayerControl(layerObj);
                    if (newCard && oldCard.parentNode) {
                        oldCard.parentNode.replaceChild(newCard, oldCard);
                    }
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
// Експортуємо для використання в window.requestOverlayDelete після завантаження layers.js
import('./layers.js').then(({ saveLayersToStorage, customLayers }) => {
    window.saveLayersToStorage = saveLayersToStorage;
    window.customLayers = customLayers;
});
// Експортуємо showConfirmDialog для використання в requestOverlayDelete
window.showConfirmDialog = showConfirmDialog;
// Функція для оновлення UI всіх шарів після видалення overlay
function updateObjectsListForAllLayers() {
    import('./layers.js').then(({ customLayers }) => {
        customLayers.forEach(layerObj => {
            const updateFn = layerIdToRenderObjectsList.get(layerObj.id);
            if (updateFn) {
                updateFn();
            }
        });
    });
}
// Експортуємо updateObjectsListForAllLayers для використання в requestOverlayDelete
window.updateObjectsListForAllLayers = updateObjectsListForAllLayers;
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
