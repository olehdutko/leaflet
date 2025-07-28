// Версія виправлень overlay
export const OVERLAY_FIX_VERSION = 'v3.4';
import { applyObjectProperties } from './objects.js';
import { LegacyAdapter } from './adapters/legacy-adapter.js';
import { AppManager } from './managers/app-manager.js';
// Функція для оновлення title сторінки з версією
export function updatePageTitle(baseTitle = 'Мапа Львова на Leaflet') {
    document.title = `${baseTitle} ${OVERLAY_FIX_VERSION}`;
}
// Експортуємо версію в глобальну область для debug функцій
window.OVERLAY_FIX_VERSION = OVERLAY_FIX_VERSION;
// Функція для видалення overlay (потрібна для leaflet.distortableimage.js)
// Тепер використовується OverlayService через AppManager
window.requestOverlayDelete = function (overlay) {
    if (!overlay) {
        return;
    }
    // Використовуємо OverlayService через AppManager
    const appManager = AppManager.getInstance();
    if (appManager.hasService('overlay')) {
        const overlayService = appManager.getService('overlay');
        overlayService.requestOverlayDelete(overlay);
    }
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
        const existingStyle = LegacyAdapter.DOM.getElement('overlay-cleanup-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
        document.head.appendChild(style);
    }
    catch (error) {
        // Мовчазно обробляємо помилки очищення
    }
}
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
//   center: center,
//   zoom: 13,
//   // layers: [baseMap] // прибрано
// });
// ... після створення map ...
// map.attributionControl.addAttribution('<a href="mailto:oleh.dutko@gmail.com">oleh.dutko@gmail.com</a>');
// ... existing code ...
// --- Користувацькі шари ---
import { customLayers, getNextLayerId, saveLayersToStorage, loadLayersFromStorage, addLayer } from './layers.js';
import { layerControlsDiv, addLayerBtn, exportAllBtn, importAllBtn, importAllInput, showConfirmDialog, createLayerControl } from './ui.js';
import { state } from './state.js';
import { filterMaterialIcons } from './material-icons.js';
// --- глобальний прапорець для drag & drop тултіпів ---
// --- Автокомпліт для інпуту іконки маркера ---
function setupMarkerIconAutocomplete() {
    let input = LegacyAdapter.DOM.getElement('marker-icon');
    const list = LegacyAdapter.DOM.getElement('marker-icon-autocomplete');
    const preview = LegacyAdapter.DOM.getElement('marker-icon-preview');
    if (!input || !list || !preview)
        return;
    // Клонуємо input, щоб скинути всі старі обробники
    const newInput = input.cloneNode(true);
    input.parentNode?.replaceChild(newInput, input);
    input = newInput;
    let currentFocus = -1;
    input.addEventListener('input', function () {
        const val = input.value.trim().toLowerCase();
        LegacyAdapter.DOM.clearElementContent('marker-icon-autocomplete');
        LegacyAdapter.DOM.setText('marker-icon-preview', input.value);
        const matches = filterMaterialIcons(val);
        currentFocus = -1;
        matches.forEach((name) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `<span class="material-icons">${name}</span> ${name}`;
            item.onclick = function () {
                LegacyAdapter.DOM.setInputValue('marker-icon', name);
                LegacyAdapter.DOM.setText('marker-icon-preview', name);
                LegacyAdapter.DOM.clearElementContent('marker-icon-autocomplete');
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
            LegacyAdapter.DOM.clearElementContent('marker-icon-autocomplete');
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
    const editModal = LegacyAdapter.DOM.getElement('edit-object-modal');
    if (editModal)
        editModal.classList.add('hidden');
    state.currentEditingObject.value = null;
}
// Імпорт модуля ініціалізації пошуку
import { initializeSearch, updateObjectSearchLayers } from './search-init.js';
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Оновлюємо title сторінки з версією
        updatePageTitle();
        // Ініціалізуємо AppManager
        const appManager = AppManager.getInstance();
        await appManager.init();
        // Завантажуємо шари
        const loadSuccess = loadLayersFromStorage();
        if (!loadSuccess) {
            addLayer();
        }
        // Ініціалізуємо залежності сервісів
        if (layerControlsDiv) {
            appManager.initializeServiceDependencies(map, customLayers, saveLayersToStorage, createLayerControl, getNextLayerId, layerControlsDiv);
            // Оновлюємо функцію збереження в сервісах
            appManager.updateSaveFunction(saveLayersToStorage);
        }
        // Ініціалізуємо додаткові функції
        waitForMaterialIconsAndInitAutocomplete();
        // Ініціалізуємо нову систему пошуку
        initializeSearch(customLayers);
        console.log('Додаток успішно ініціалізовано з AppManager');
    }
    catch (error) {
        console.error('Помилка ініціалізації додатку:', error);
    }
});
// Глобальний пошук об'єктів тепер обробляється через ObjectSearchUI в search-init.ts
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
            // Оновлюємо пошук об'єктів після зміни прозорості
            updateObjectSearchLayers(customLayers);
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
            // Імпорт KMZ/KML через KmzService
            const appManager = AppManager.getInstance();
            if (appManager.hasService('kmz')) {
                const kmzService = appManager.getService('kmz');
                kmzService.handleKmzFile(file, {
                    onLayerExists: async (title, existingIndex) => {
                        return new Promise((resolve) => {
                            showConfirmDialog({
                                title: `Шар "${title}" вже існує`,
                                message: `Шар з назвою "${title}" вже існує. Що зробити?`,
                                onConfirm: (action) => {
                                    if (action === 'duplicate') {
                                        // Дублювати з новою назвою
                                        let copyTitle = title + ' (копія)';
                                        let n = 2;
                                        while (customLayers.some(l => l.title === copyTitle)) {
                                            copyTitle = title + ` (копія ${n++})`;
                                        }
                                        resolve(copyTitle);
                                    }
                                    else if (action === 'overwrite') {
                                        // Перезаписати: видалити старий і додати новий
                                        const oldLayer = customLayers[existingIndex];
                                        if (oldLayer && oldLayer.featureGroup && map) {
                                            map.removeLayer(oldLayer.featureGroup);
                                        }
                                        customLayers.splice(existingIndex, 1);
                                        if (layerControlsDiv) {
                                            layerControlsDiv.innerHTML = '';
                                            customLayers.forEach(layer => createLayerControl(layer));
                                        }
                                        resolve(title);
                                    }
                                    else {
                                        // cancel — нічого не робити
                                        resolve('');
                                    }
                                },
                                buttons: [
                                    { text: 'Дублювати', action: 'duplicate', className: 'btn-primary' },
                                    { text: 'Перезаписати', action: 'overwrite', className: 'btn-danger' },
                                    { text: 'Скасувати', action: 'cancel', className: 'btn-secondary' }
                                ]
                            });
                        });
                    },
                    onSuccess: (layerConfig) => {
                        // Оновлюємо пошук об'єктів після додавання KMZ шару
                        updateObjectSearchLayers(customLayers);
                        console.log('KMZ файл успішно імпортовано:', layerConfig.title);
                    },
                    onError: (error) => {
                        alert('Помилка при імпорті KMZ файлу: ' + error.message);
                    }
                });
            }
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
                                    if (oldLayer && oldLayer.featureGroup && map) {
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