// Версія виправлень overlay
export const OVERLAY_FIX_VERSION = 'v2.7';

// Функція для оновлення title сторінки з версією
export function updatePageTitle(baseTitle: string = 'Мапа Львова на Leaflet') {
  document.title = `${baseTitle} ${OVERLAY_FIX_VERSION}`;
  console.log(`🚀 ${baseTitle} ${OVERLAY_FIX_VERSION} завантажено`);
  console.log(`📊 Версія виправлень overlay: ${OVERLAY_FIX_VERSION}`);
}

// Експортуємо версію в глобальну область для debug функцій
(window as any).OVERLAY_FIX_VERSION = OVERLAY_FIX_VERSION;

// Використовуємо глобальну змінну L з CDN
declare const L: any;
import { map } from './map-init.js';
// Центр Львова
const center: [number, number] = [49.8397, 24.0297];
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
import { customLayers, activeLayer, layerId, getNextLayerId, createTileLayer, saveLayersToStorage, loadLayersFromStorage, addLayer, updateActiveLayerUI } from './layers.js';

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

import { getLayerIcon, createTooltip, getObjectType, getObjectProperties } from './utils.js';

// --- оновлена функція createLayerControl ---
import { createLayerControl } from './ui.js';

// --- Автокомпліт для інпуту іконки маркера ---
function setupMarkerIconAutocomplete() {
  let input = document.getElementById('marker-icon') as HTMLInputElement | null;
  const list = document.getElementById('marker-icon-autocomplete') as HTMLElement | null;
  const preview = document.getElementById('marker-icon-preview') as HTMLElement | null;
  if (!input || !list || !preview) return;

  // Клонуємо input, щоб скинути всі старі обробники
  const newInput = input.cloneNode(true) as HTMLInputElement;
  input.parentNode?.replaceChild(newInput, input);
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
          (currentEditingObject.value as any).properties = (currentEditingObject.value as any).properties || {};
          (currentEditingObject.value as any).properties.icon = name;
          applyObjectProperties(currentEditingObject.value, (currentEditingObject.value as any).properties);
        }
      };
      list.appendChild(item);
    });
  });

  input.onkeydown = function (e) {
    const items = list.querySelectorAll('.autocomplete-item');
    if (e.key === 'ArrowDown') {
      currentFocus++;
      if (currentFocus >= items.length) currentFocus = 0;
      items.forEach((el, i) => (el as HTMLElement).classList.toggle('active', i === currentFocus));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      currentFocus--;
      if (currentFocus < 0) currentFocus = items.length - 1;
      items.forEach((el, i) => (el as HTMLElement).classList.toggle('active', i === currentFocus));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (currentFocus > -1 && items[currentFocus]) {
        (items[currentFocus] as HTMLElement).click();
        e.preventDefault();
      }
    }
  };
  input.onfocus = input.oninput;
  input.onkeydown = function (e) {
    const items = list.querySelectorAll('.autocomplete-item');
    if (e.key === 'ArrowDown') {
      currentFocus++;
      if (currentFocus >= items.length) currentFocus = 0;
      items.forEach((el, i) => (el as HTMLElement).classList.toggle('active', i === currentFocus));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      currentFocus--;
      if (currentFocus < 0) currentFocus = items.length - 1;
      items.forEach((el, i) => (el as HTMLElement).classList.toggle('active', i === currentFocus));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (currentFocus > -1 && items[currentFocus]) {
        (items[currentFocus] as HTMLElement).click();
        e.preventDefault();
      }
    }
  };
  document.addEventListener('click', function (e) {
    if (e.target !== input) list.innerHTML = '';
  });
}

// --- Додаю глобальний флаг для готовності іконок ---
(window as any).materialIconsReady = false;

// --- Патч для state.ts: після fetch ---
// (цей код треба додати у state.ts після fetch)
// fetch('material-icons-list.json')
//   .then(res => res.json())
//   .then(list => { materialIcons.splice(0, materialIcons.length, ...list); (window as any).materialIconsReady = true; });

// --- Додаю очікування готовності іконок перед автокомплітом ---
function waitForMaterialIconsAndInitAutocomplete() {
  if ((window as any).materialIconsReady) {
    setupMarkerIconAutocomplete();
  } else {
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
function applyObjectProperties(layer: L.Layer, properties: any) {
  const type = getObjectType(layer);
  // Зберігаємо властивості в layer.properties
  if (!(layer as any).properties) (layer as any).properties = {};
  (layer as any).properties.name = properties.name;
  (layer as any).properties.description = properties.description;
  if (type === 'marker') {
    const iconName = properties.icon || 'place';
    (layer as any).setIcon(getColoredMarkerIcon(properties.color, iconName));
    (layer as any).properties.color = properties.color;
    (layer as any).properties.icon = iconName;
    (layer as any).options.color = properties.color;
  } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
    (layer as any).setStyle({
      fillColor: properties.fillColor,
      color: properties.color,
      fillOpacity: properties.fillOpacity,
      opacity: properties.opacity
    });
  } else if (type === 'polyline') {
    (layer as any).setStyle({
      color: properties.color,
      weight: properties.weight,
      opacity: properties.opacity
    });
  } else if (type === 'image') {
    if ((layer as any)._overlay) {
      (layer as any)._overlay.setOpacity(properties.opacity);
    }
  }
}

// Функція для показу модального вікна
function showEditModal(layer: L.Layer) {
  currentEditingObject.value = layer;
  const type = getObjectType(layer);
  const properties = getObjectProperties(layer);

  // Оновлюємо заголовок
  const modalTitle = document.getElementById('modal-title');
  if (modalTitle) {
    modalTitle.textContent = `Редагування ${type === 'marker' ? 'маркера' : type === 'polygon' ? 'полігону' : type === 'polyline' ? 'полілінії' : type === 'image' ? 'зображення' : 'об\'єкта'}`;
  }

  // Заповнюємо поля
  const objectName = document.getElementById('object-name') as HTMLInputElement | null;
  if (objectName) objectName.value = properties.name || '';
  const objectDescription = document.getElementById('object-description') as HTMLTextAreaElement | null;
  if (objectDescription) objectDescription.value = properties.description || '';

  // Групи контролів
  const colorPickerGroup = document.getElementById('color-picker-group') as HTMLElement | null;
  const lineWidthGroup = document.getElementById('line-width-group') as HTMLElement | null;
  const styleGroup = document.getElementById('style-group') as HTMLElement | null;
  const opacityGroup = document.getElementById('opacity-group') as HTMLElement | null;
  const imageGroup = document.getElementById('image-group') as HTMLElement | null;
  const markerIconGroup = document.getElementById('marker-icon-group') as HTMLElement | null;

  // Приховуємо всі групи
  [colorPickerGroup, lineWidthGroup, styleGroup, opacityGroup, imageGroup, markerIconGroup].forEach(group => {
    if (group) (group as HTMLElement).style.display = 'none';
  });

  // Показуємо відповідні групи залежно від типу
  if (type === 'marker') {
    if (colorPickerGroup) colorPickerGroup.style.display = 'block';
    if (markerIconGroup) markerIconGroup.style.display = 'block';
    // Встановити значення інпуту та превʼю
    const markerIconInput = document.getElementById('marker-icon') as HTMLInputElement | null;
    const markerIconPreview = document.getElementById('marker-icon-preview') as HTMLElement | null;
    if (markerIconInput && markerIconPreview) {
      (markerIconInput as HTMLInputElement).value = properties.icon || 'place';
      (markerIconPreview as HTMLElement).textContent = (markerIconInput as HTMLInputElement).value;
      // не перевизначаю oninput тут, бо це ламає автокомпліт
      // (markerIconInput as HTMLInputElement).oninput = function() {
      //   (markerIconPreview as HTMLElement).textContent = (markerIconInput as HTMLInputElement).value;
      // };
    }
    // Показати/заповнити координати
    const coordsGroup = document.querySelector('.marker-coords-group');
    if (coordsGroup) (coordsGroup as HTMLElement).style.display = '';
    const latInput = document.getElementById('marker-lat');
    const lngInput = document.getElementById('marker-lng');
    if (latInput && lngInput && currentEditingObject.value && currentEditingObject.value.getLatLng) {
      const latlng = (currentEditingObject.value as L.Marker).getLatLng();
      (latInput as HTMLInputElement).value = latlng.lat.toString();
      (lngInput as HTMLInputElement).value = latlng.lng.toString();
    }
    // --- Додаю повторну ініціалізацію автокомпліта ---
    setupMarkerIconAutocomplete();
  } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
    if (colorPickerGroup) colorPickerGroup.style.display = 'block';
    if (opacityGroup) opacityGroup.style.display = 'block';
    // Приховати координати для не-маркерів
    const coordsGroup = document.querySelector('.marker-coords-group');
    if (coordsGroup) (coordsGroup as HTMLElement).style.display = 'none';
  } else if (type === 'polyline') {
    if (colorPickerGroup) colorPickerGroup.style.display = 'block';
    if (lineWidthGroup) lineWidthGroup.style.display = 'block';
    if (styleGroup) styleGroup.style.display = 'block';
    // opacityGroup не показуємо для polyline
    // Приховати координати для не-маркерів
    const coordsGroup = document.querySelector('.marker-coords-group');
    if (coordsGroup) (coordsGroup as HTMLElement).style.display = 'none';
  } else if (type === 'image') {
    if (imageGroup) imageGroup.style.display = 'block';
    if (opacityGroup) opacityGroup.style.display = 'block';
    // Приховати координати для не-маркерів
    const coordsGroup = document.querySelector('.marker-coords-group');
    if (coordsGroup) (coordsGroup as HTMLElement).style.display = 'none';
  }

  // Заповнюємо значення контролів
  // Колір
  const objectColorInput = document.getElementById('object-color');
  if (objectColorInput) (objectColorInput as HTMLInputElement).value = properties.color || properties.fillColor || '#1976d2';
  // Товщина
  const lineWidth = document.getElementById('line-width');
  const lineWidthValue = document.getElementById('line-width-value');
  if (lineWidth && lineWidthValue && properties.weight) {
    (lineWidth as HTMLInputElement).value = properties.weight;
    (lineWidthValue as HTMLElement).textContent = properties.weight + 'px';
  }
  // Стиль лінії (за замовчуванням solid)
  const lineStyle = document.getElementById('line-style');
  if (lineStyle) (lineStyle as HTMLInputElement).value = properties.style || 'solid';
  // Прозорість
  const objectOpacity = document.getElementById('object-opacity');
  const opacityValue = document.getElementById('opacity-value');
  if (objectOpacity && opacityValue) {
    let opacity = properties.opacity;
    if (type === 'polygon' || type === 'circle' || type === 'rectangle') opacity = properties.fillOpacity;
    (objectOpacity as HTMLInputElement).value = opacity ?? 1;
    (opacityValue as HTMLElement).textContent = Math.round((opacity ?? 1) * 100) + '%';
  }

  // --- Додаю інтерактивність для вибору кольору ---
  if (colorPickerGroup && (type === 'polyline' || type === 'marker' || type === 'polygon' || type === 'circle' || type === 'rectangle')) {
    const colorPalette = document.getElementById('color-palette');
    const objectColorInput = document.getElementById('object-color');
    if (colorPalette && objectColorInput) {
      // Клік по swatch
      (colorPalette as HTMLElement).querySelectorAll('.color-swatch').forEach(swatch => {
        (swatch as HTMLElement).onclick = function () {
          (colorPalette as HTMLElement).querySelectorAll('.color-swatch').forEach(s => (s as HTMLElement).classList.remove('selected'));
          (swatch as HTMLElement).classList.add('selected');
          (objectColorInput as HTMLInputElement).value = (swatch as HTMLElement).dataset.color || '';
          if (currentEditingObject.value) {
            (currentEditingObject.value as any).properties = (currentEditingObject.value as any).properties || {};
            (currentEditingObject.value as any).properties.color = (swatch as HTMLElement).dataset.color;
            if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
              (currentEditingObject.value as any).properties.fillColor = (swatch as HTMLElement).dataset.color;
            }
            applyObjectProperties(currentEditingObject.value as L.Layer, (currentEditingObject.value as any).properties);
          }
        };
      });
      // Зміна через color picker
      (objectColorInput as HTMLInputElement).oninput = function (e) {
        (colorPalette as HTMLElement).querySelectorAll('.color-swatch').forEach(s => (s as HTMLElement).classList.remove('selected'));
        if (currentEditingObject.value) {
          (currentEditingObject.value as any).properties = (currentEditingObject.value as any).properties || {};
          (currentEditingObject.value as any).properties.color = (e.target as HTMLInputElement).value;
          if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
            (currentEditingObject.value as any).properties.fillColor = (e.target as HTMLInputElement).value;
          }
          applyObjectProperties(currentEditingObject.value as L.Layer, (currentEditingObject.value as any).properties);
        }
      };
    }
  }

  // --- Додаю інтерактивність для вибору стилю лінії ---
  if (type === 'polyline') {
    const lineStyle = document.getElementById('line-style');
    if (lineStyle && currentEditingObject.value) {
      (lineStyle as HTMLInputElement).onchange = function (e) {
        if (!e.target) return;
        const target = e.target as HTMLInputElement | null;
        let dashArray: string | undefined = undefined;
        if (target && target.value === 'dashed') dashArray = '10, 10';
        else if (target && target.value === 'dotted') dashArray = '2, 8';
        // Оновлюємо властивість
        (currentEditingObject.value as L.Polyline).options.dashArray = dashArray;
        if (dashArray) (currentEditingObject.value as L.Polyline).setStyle({ dashArray });
        (currentEditingObject.value as any).properties = (currentEditingObject.value as any).properties || {};
        if (target) (currentEditingObject.value as any).properties.style = target.value;
        saveLayersToStorage(); // одразу зберігаємо стиль
      };
      // Встановити стиль при відкритті модалки
      let dashArray: string | undefined = undefined;
      if ((lineStyle as HTMLInputElement).value === 'dashed') dashArray = '10, 10';
      else if ((lineStyle as HTMLInputElement).value === 'dotted') dashArray = '2, 8';
      (currentEditingObject.value as L.Polyline).setStyle({ dashArray });
      (currentEditingObject.value as L.Polyline).options.dashArray = dashArray;
    }
  }

  // Показуємо модальне вікно
  const editModal = document.getElementById('edit-object-modal');
  if (editModal) (editModal as HTMLElement).classList.remove('hidden');

  // --- Зображення ---
  const imageInput = document.getElementById('object-image');
  const imagePreviewContainer = document.getElementById('object-image-preview-container');
  const imagePreview = document.getElementById('object-image-preview');
  const imageRemoveBtn = document.getElementById('object-image-remove');
  // показати preview, якщо є
  if (properties.image) {
    (imagePreview as HTMLImageElement).src = properties.image;
    (imagePreviewContainer as HTMLElement).classList.remove('hidden');
    if (imageInput) (imageInput as HTMLInputElement).classList.add('hidden');
  } else {
    (imagePreview as HTMLImageElement).src = '';
    (imagePreviewContainer as HTMLElement).classList.add('hidden');
    if (imageInput) (imageInput as HTMLInputElement).classList.remove('hidden');
  }
  // вибір нового зображення
  if (imageInput) {
    (imageInput as HTMLInputElement).value = '';
    (imageInput as HTMLInputElement).onchange = function (e) {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (evt) {
        if (evt.target) {
          (imagePreview as HTMLImageElement).src = (evt.target as any).result;
        }
        (imagePreviewContainer as HTMLElement).classList.remove('hidden');
        if (imageInput) (imageInput as HTMLInputElement).classList.add('hidden');
        if (currentEditingObject.value) {
          (currentEditingObject.value as any).properties = (currentEditingObject.value as any).properties || {};
          if (evt.target) (currentEditingObject.value as any).properties.image = (evt.target as any).result;
        }
      };
      reader.readAsDataURL(file);
    };
  }
  // видалення зображення
  if (imageRemoveBtn) {
    (imageRemoveBtn as HTMLElement).onclick = function () {
      (imagePreview as HTMLImageElement).src = '';
      (imagePreviewContainer as HTMLElement).classList.add('hidden');
      if (imageInput) (imageInput as HTMLInputElement).classList.remove('hidden');
      if (currentEditingObject.value) {
        (currentEditingObject.value as any).properties = (currentEditingObject.value as any).properties || {};
        delete (currentEditingObject.value as any).properties.image;
      }
    };
  }
}

// Функція для закриття модального вікна
export function closeEditModal() {
  const editModal = document.getElementById('edit-object-modal');
  if (editModal) (editModal as HTMLElement).classList.add('hidden');
  currentEditingObject.value = null;
}

// Функція для збереження змін
function saveObjectChanges() {
  if (!currentEditingObject.value) return;

  const type = getObjectType(currentEditingObject.value as L.Layer);
  const properties: any = {
    name: (document.getElementById('object-name') as HTMLInputElement).value,
    description: (document.getElementById('object-description') as HTMLTextAreaElement).value
  };

  if (type === 'marker') {
    const markerColor = document.getElementById('object-color');
    if (markerColor) properties.color = (markerColor as HTMLInputElement).value;
    const markerIcon = document.getElementById('marker-icon');
    if (markerIcon) properties.icon = (markerIcon as HTMLInputElement).value;
    // --- координати ---
    const latInput = document.getElementById('marker-lat');
    const lngInput = document.getElementById('marker-lng');
    if (latInput && lngInput && currentEditingObject.value && currentEditingObject.value.setLatLng) {
      const lat = parseFloat((latInput as HTMLInputElement).value);
      const lng = parseFloat((lngInput as HTMLInputElement).value);
      if (!isNaN(lat) && !isNaN(lng)) {
        const old = (currentEditingObject.value as L.Marker).getLatLng();
        if (lat !== old.lat || lng !== old.lng) {
          (currentEditingObject.value as L.Marker).setLatLng([lat, lng]);
        }
      }
    }
  } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
    const fillColor = document.getElementById('object-color');
    if (fillColor) properties.fillColor = (fillColor as HTMLInputElement).value;
    // Для полігонів колір рамки та прозорість можна додати за потреби
    properties.color = fillColor ? (fillColor as HTMLInputElement).value : undefined;
    const objectOpacity = document.getElementById('object-opacity');
    if (objectOpacity) properties.fillOpacity = parseFloat((objectOpacity as HTMLInputElement).value);
    properties.opacity = 1;
  } else if (type === 'polyline') {
    const objectColor = document.getElementById('object-color');
    if (objectColor) properties.color = (objectColor as HTMLInputElement).value;
    const lineWidth = document.getElementById('line-width');
    if (lineWidth) properties.weight = parseInt((lineWidth as HTMLInputElement).value);
    const lineStyle = document.getElementById('line-style');
    if (lineStyle) properties.style = (lineStyle as HTMLInputElement).value;
    // opacity не зчитуємо для polyline
  } else if (type === 'image') {
    const objectOpacity = document.getElementById('object-opacity');
    if (objectOpacity) properties.opacity = parseFloat((objectOpacity as HTMLInputElement).value);
  }

  // зображення
  const imagePreview = document.getElementById('object-image-preview');
  if (imagePreview && (imagePreview as HTMLImageElement).src && !(imagePreview as HTMLElement).classList.contains('hidden')) {
    properties.image = (imagePreview as HTMLImageElement).src;
  }

  applyObjectProperties(currentEditingObject.value as L.Layer, properties);
  // --- Додаємо копіювання у feature.properties ---
  if ((currentEditingObject.value as any).feature && (currentEditingObject.value as any).properties) {
    (currentEditingObject.value as any).feature.properties = { ...(currentEditingObject.value as any).properties };
  }
  saveLayersToStorage();
  closeEditModal();
}

// Ініціалізація модального вікна
function initEditModal() {
  // Обробники подій для кнопок
  (document.getElementById('modal-close') as HTMLElement).addEventListener('click', closeEditModal);
  (document.getElementById('cancel-edit') as HTMLElement).addEventListener('click', closeEditModal);
  (document.getElementById('save-object') as HTMLElement).addEventListener('click', saveObjectChanges);

  // --- Додаю підтвердження для видалення об'єкта ---
  (document.getElementById('delete-object') as HTMLElement).onclick = function () {
    if (!currentEditingObject.value) return;
    const type = getObjectType(currentEditingObject.value as L.Layer);
    let typeName = 'обʼєкт';
    if (type === 'marker') typeName = 'маркер';
    else if (type === 'polygon') typeName = 'полігон';
    else if (type === 'polyline') typeName = 'полілінію';
    else if (type === 'rectangle') typeName = 'прямокутник';
    else if (type === 'circle') typeName = 'коло';
    const properties = getObjectProperties(currentEditingObject.value as L.Layer);
    const objectName = properties.name ? `"${properties.name}"` : typeName;
    closeEditModal();
    showConfirmDialog({
      title: `Видалення об'єкта: ${objectName}`,
      message: `Ви дійсно хочете видалити об'єкт ${objectName}?`,
      onConfirm: function (action?: string) {
        if (!currentEditingObject.value) return;
        const layerObj = customLayers.find(l => l.featureGroup && l.featureGroup.hasLayer(currentEditingObject.value as L.Layer));
        if (layerObj && layerObj.featureGroup) {
          layerObj.featureGroup.removeLayer(currentEditingObject.value as L.Layer);
        }
        map.removeLayer(currentEditingObject.value as L.Layer);
        saveLayersToStorage();
      },
      buttons: [
        { text: 'Видалити', action: 'delete', className: 'btn-danger' },
        { text: 'Скасувати', action: 'cancel', className: 'btn-secondary' }
      ]
    });
  };

  // Обробники для range слайдерів
  (document.getElementById('line-width') as HTMLInputElement).addEventListener('input', function () {
    (document.getElementById('line-width-value') as HTMLElement).textContent = (this as HTMLInputElement).value;
  });

  (document.getElementById('object-opacity') as HTMLInputElement).addEventListener('input', function () {
    (document.getElementById('opacity-value') as HTMLElement).textContent = Math.round(Number((this as HTMLInputElement).value) * 100) + '%';
  });

  // Закриття по кліку поза модальним вікном
  (document.getElementById('edit-object-modal') as HTMLElement).addEventListener('click', function (e) {
    if (e.target === this) {
      closeEditModal();
    }
  });

  // Закриття по Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (document.getElementById('edit-object-modal') as HTMLElement).classList.contains('hidden') === false) {
      closeEditModal();
    }
  });
}

// Функція addDoubleClickToLayer перенесена в ui.ts

// --- Геопошук з автокомплітом ---
let searchMarker: any = null;
(function setupGeoSearch() {
  const input = document.getElementById('geosearch-input') as HTMLInputElement | null;
  const list = document.getElementById('geosearch-autocomplete') as HTMLElement | null;
  if (!input || !list) return;
  let timer: number | null = null;
  let results: any[] = [];
  let activeIdx = -1;

  input.addEventListener('input', function () {
    const val = (input as HTMLInputElement).value.trim();
    list.innerHTML = '';
    list.classList.remove('active');
    activeIdx = -1;
    if (!val) return;
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&addressdetails=1&limit=7&accept-language=uk`)
        .then(r => r.json())
        .then((data: any[]) => {
          results = data;
          if (!results.length) return;
          list.innerHTML = '';
          results.forEach((item: any, idx: number) => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.textContent = item.display_name;
            div.addEventListener('mousedown', function (e: MouseEvent) {
              e.preventDefault();
              selectResult(idx);
            });
            list.appendChild(div);
          });
          list.classList.add('active');
        });
    }, 250);
  });

  input.addEventListener('keydown', function (e: KeyboardEvent) {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      activeIdx = Math.min(activeIdx + 1, results.length - 1);
      updateActive();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      activeIdx = Math.max(activeIdx - 1, 0);
      updateActive();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0) {
        selectResult(activeIdx);
        e.preventDefault();
      }
    }
  });

  document.addEventListener('click', function (e: MouseEvent) {
    if (!input.contains(e.target as Node) && !list.contains(e.target as Node)) {
      list.classList.remove('active');
    }
  });

  function updateActive() {
    if (list) Array.from(list.children).forEach((el, idx) => {
      if (idx === activeIdx) (el as HTMLElement).classList.add('active');
      else (el as HTMLElement).classList.remove('active');
    });
  }

  function selectResult(idx: number) {
    const item = results[idx];
    if (!item) return;
    (input as HTMLInputElement).value = item.display_name;
    (list as HTMLElement).classList.remove('active');
    // @ts-ignore
    if ((window as any).map && item.lat && item.lon) {
      // @ts-ignore
      (map as any).setView([parseFloat(item.lat), parseFloat(item.lon)], 16, { animate: true });
      // --- Додаємо тимчасовий маркер ---
      // @ts-ignore
      if ((window as any).searchMarker) {
        // @ts-ignore
        (map as any).removeLayer((window as any).searchMarker);
        // @ts-ignore
        (window as any).searchMarker = null;
      }
      // @ts-ignore
      (window as any).searchMarker = L.marker([parseFloat(item.lat), parseFloat(item.lon)], {
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
        addDoubleClickToLayer((window as any).searchMarker);
      });
      // @ts-ignore
      (window as any).searchMarker.bindPopup(item.display_name).openPopup();
    }
  }
})();

function centerGeoSearchBar() {
  const bar = document.getElementById('geosearch-bar');
  const mapDiv = document.getElementById('map');
  if (!bar || !mapDiv) return;
  const mapRect = mapDiv.getBoundingClientRect();
  // Центр мапи
  const centerX = mapRect.left + mapRect.width / 2;
  (bar as HTMLElement).style.left = centerX + 'px';
  (bar as HTMLElement).style.transform = 'translateX(-50%)';
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
async function handleKmzFile(file: File) {
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
    const kmlLayer = (omnivore as any).kml.parse(kmlText);

    // додати всі об'єкти з KML до featureGroup
    kmlLayer.eachLayer((layer: any) => {
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
        } else if (type === 'polyline') {
          // для ліній з KML
          layer.setStyle({
            color: '#1976d2',
            weight: 3,
            opacity: 1
          });
        } else if (type === 'polygon') {
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
        onConfirm: (action?: string) => {
          if (action === 'duplicate') {
            // Дублювати з новою назвою
            let copyTitle = layerTitle + ' (копія)';
            let n = 2;
            while (customLayers.some(l => l.title === copyTitle)) {
              copyTitle = layerTitle + ` (копія ${n++})`;
            }
            actuallyAddKmzLayer(copyTitle);
          } else if (action === 'overwrite') {
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
    } else {
      actuallyAddKmzLayer(layerTitle);
    }

    function actuallyAddKmzLayer(title: string) {
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
      if (layerControlsDiv) (layerControlsDiv as HTMLElement).appendChild(control as any);
      saveLayersToStorage();
      if (featureGroup.getBounds().isValid()) {
        (map as any).fitBounds(featureGroup.getBounds());
      }
    }

  } catch (error: any) {
    alert('Помилка при імпорті KMZ файлу: ' + error.message); // @ts-ignore
  }
}

// --- Глобальний пошук по об'єктах ---
const globalSearchInput = document.getElementById('global-object-search') as HTMLInputElement | null;
const globalSearchResults = document.getElementById('global-object-search-results') as HTMLElement | null;

if (globalSearchInput && globalSearchResults) {
  globalSearchInput.addEventListener('input', function (this: HTMLInputElement) {
    const query = (this as HTMLInputElement).value.trim().toLowerCase();
    globalSearchResults.innerHTML = '';
    if (!query) return;

    // шукати лише у видимих шарах та об'єктах
    let results: any[] = [];
    customLayers.forEach(layerObj => {
      if (!layerObj.visible) return;
      const fg = layerObj.featureGroup;
      fg.eachLayer((layer: any) => {
        if (layer.visible === false) return; // @ts-ignore
        const name = layer.properties?.name || layer.feature?.properties?.name || '';
        const desc = layer.properties?.description || layer.feature?.properties?.description || '';
        if (
          name.toLowerCase().includes(query) ||
          desc.toLowerCase().includes(query)
        ) {
          results.push({
            layer,
            name,
            desc,
            layerObj
          });
        }
      });
      // зображення
      if ((fg as any).images && (fg as any).images.length > 0 && (fg as any).overlays) {
        (fg as any).images.forEach((img: any, idx: number) => {
          const overlay = (fg as any).overlays[idx]; // @ts-ignore
          if (!overlay || overlay.visible === false) return;
          const name = img.properties?.name || '';
          const desc = img.properties?.description || '';
          if (
            name.toLowerCase().includes(query) ||
            desc.toLowerCase().includes(query)
          ) {
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
          (el as HTMLElement).classList.remove('global-object-search-highlight');
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
        } else if (isMarker) {
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
        } else if (res.layer.getElement && res.layer.getElement()) {
          (res.layer.getElement() as HTMLElement).classList.add('global-object-search-highlight');
          setTimeout(() => {
            (res.layer.getElement() as HTMLElement).classList.remove('global-object-search-highlight');
          }, 2000);
        } else if ((res.layer as any)._path) {
          (res.layer as any)._path.classList.add('global-object-search-highlight');
          setTimeout(() => {
            (res.layer as any)._path.classList.remove('global-object-search-highlight');
          }, 2000);
        }

        // приблизити
        if (res.layer.getBounds) {
          (map as any).fitBounds(res.layer.getBounds(), { maxZoom: 17 });
        } else if (res.layer.getLatLng) {
          (map as any).setView(res.layer.getLatLng(), 17);
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
  let opacityTimeout: number | null = null;
  const debouncedOpacitySave = () => {
    if (opacityTimeout) clearTimeout(opacityTimeout);
    opacityTimeout = window.setTimeout(() => {
      saveLayersToStorage();
      opacityTimeout = null;
    }, 200); // Трохи більший delay для opacity змін
  };

  const observer = new MutationObserver(mutations => {
    let hasChanges = false;
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const img = mutation.target as any;
        if ((img as HTMLElement).classList.contains('leaflet-image-layer')) {
          const opacity = parseFloat((img as HTMLImageElement).style.opacity);
          const src = (img as HTMLImageElement).src;

          // Знаходимо відповідний overlay та шар (не створюємо дублікати!)
          for (const layerObj of customLayers) {
            if (!layerObj.featureGroup || !(layerObj.featureGroup as any).images) continue;
            const idx = (layerObj.featureGroup as any).images.findIndex((imgObj: any) => imgObj.url === src);
            if (idx !== -1) {
              (layerObj.featureGroup as any).images[idx].properties = (layerObj.featureGroup as any).images[idx].properties || {};

              // Перевіряємо, чи справді змінилася прозорість
              if ((layerObj.featureGroup as any).images[idx].properties.opacity !== opacity) {
                (layerObj.featureGroup as any).images[idx].properties.opacity = opacity;
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
    if (!data) return alert('Немає даних для експорту');
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
    (importAllInput as HTMLInputElement).value = '';
    (importAllInput as HTMLInputElement).click();
  });
  (importAllInput as HTMLInputElement).addEventListener('change', (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'kmz' || ext === 'kml') {
      // Імпорт KMZ/KML через leaflet-omnivore
      handleKmzFile(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = function (evt) {
      if (!evt.target) return;
      try {
        let imported = JSON.parse(evt.target.result as string);
        if (!Array.isArray(imported)) imported = [imported];
        // для кожного імпортованого шару перевіряємо на дублікати
        function importLayerObj(obj: any) {
          const existsIdx = customLayers.findIndex(l => l.title === obj.title);
          if (existsIdx !== -1) {
            showConfirmDialog({
              title: `Шар "${obj.title}" вже існує`,
              message: `Шар з назвою "${obj.title}" вже існує. Що зробити?`,
              onConfirm: (action?: string) => {
                if (action === 'duplicate') {
                  // Дублювати з новою назвою
                  let copyTitle = obj.title + ' (копія)';
                  let n = 2;
                  while (customLayers.some(l => l.title === copyTitle)) {
                    copyTitle = obj.title + ` (копія ${n++})`;
                  }
                  obj.title = copyTitle;
                  actuallyImportLayer(obj);
                } else if (action === 'overwrite') {
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
          } else {
            actuallyImportLayer(obj);
          }
        }
        function actuallyImportLayer(obj: any) {
          // Додаємо шар у localStorage
          let arr = JSON.parse(localStorage.getItem('lefleat_layers') || '[]');
          if (!Array.isArray(arr)) arr = [arr];
          arr.push(obj);
          localStorage.setItem('lefleat_layers', JSON.stringify(arr));
          location.reload();
        }
        // імпортуємо всі шари по черзі
        imported.forEach(importLayerObj);
      } catch (err) {
        alert('Помилка імпорту: ' + err);
      }
    };
    reader.readAsText(file);
  });
}

// === Додаю інструмент вимірювання відстані ===
if (
  typeof (window as any).L !== 'undefined' &&
  (map as any) &&
  (window as any).L.Control &&
  typeof (window as any).L.Control.PolylineMeasure === 'function'
) {
  // @ts-ignore
  (map as any).addControl(new (window as any).L.Control.PolylineMeasure({
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