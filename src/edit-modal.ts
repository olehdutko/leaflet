import { materialIcons, currentEditingObject } from './state';
import { map } from './map-init';
import { getColoredMarkerIcon, getObjectType, getObjectProperties } from './utils';
import { applyObjectProperties } from './objects';
import { saveLayersToStorage, customLayers } from './layers';
import { showConfirmDialog } from './ui';
import type * as L from 'leaflet';

/**
 * Закрити модальне вікно редагування об'єкта.
 */
export function closeEditModal(): void {
  const editModal = document.getElementById('edit-object-modal');
  if (editModal) (editModal as HTMLElement).classList.add('hidden');
  currentEditingObject.value = null;
}

/**
 * Показати модальне вікно редагування об'єкта.
 * Заповнює поля залежно від типу об'єкта (маркер, полігон, лінія, зображення, текст).
 */
export function showEditModal(layer: L.Layer): void {
  currentEditingObject.value = layer;
  const type = getObjectType(layer);
  const properties = getObjectProperties(layer);

  const modalTitle = document.getElementById('modal-title');
  if (modalTitle) {
    modalTitle.textContent = `Редагування ${type === 'marker' ? 'маркера' : type === 'polygon' ? 'полігону' : type === 'polyline' ? 'полілінії' : type === 'image' ? 'зображення' : type === 'text' ? 'тексту' : 'обʼєкта'}`;
  }

  const objectNameGroup = document.getElementById('object-name-group') as HTMLElement | null;
  const objectName = document.getElementById('object-name') as HTMLInputElement | null;
  if (objectName) objectName.value = properties.name || '';
  const objectDescription = document.getElementById('object-description') as HTMLTextAreaElement | null;
  if (objectDescription) objectDescription.value = properties.description || '';

  const colorPickerGroup = document.getElementById('color-picker-group') as HTMLElement | null;
  const lineWidthGroup = document.getElementById('line-width-group') as HTMLElement | null;
  const styleGroup = document.getElementById('style-group') as HTMLElement | null;
  const opacityGroup = document.getElementById('opacity-group') as HTMLElement | null;
  const objectDescriptionGroup = document.getElementById('object-description-group') as HTMLElement | null;
  const markerIconGroup = document.getElementById('marker-icon-group') as HTMLElement | null;
  const imageGroup = document.getElementById('object-image-group') as HTMLElement | null;

  // Текстові групи
  const textContentGroup = document.getElementById('text-content-group') as HTMLElement | null;
  const textFontSizeGroup = document.getElementById('text-font-size-group') as HTMLElement | null;
  const textRotationGroup = document.getElementById('text-rotation-group') as HTMLElement | null;

  [colorPickerGroup, lineWidthGroup, styleGroup, opacityGroup, markerIconGroup, imageGroup,
    textContentGroup, textFontSizeGroup, textRotationGroup].forEach(group => {
    if (group) (group as HTMLElement).style.display = 'none';
  });

  if (objectNameGroup) objectNameGroup.style.display = type === 'text' ? 'none' : '';
  if (objectDescriptionGroup) objectDescriptionGroup.style.display = type === 'text' ? 'none' : '';

  if (type === 'marker') {
    if (colorPickerGroup) colorPickerGroup.style.display = 'block';
    if (markerIconGroup) markerIconGroup.style.display = 'block';
    if (imageGroup) imageGroup.style.display = 'block';
    const markerIconInput = document.getElementById('marker-icon') as HTMLInputElement | null;
    const markerIconPreview = document.getElementById('marker-icon-preview') as HTMLElement | null;
    if (markerIconInput && markerIconPreview) {
      (markerIconInput as HTMLInputElement).value = properties.icon || 'place';
      (markerIconPreview as HTMLElement).textContent = (markerIconInput as HTMLInputElement).value;
      (markerIconInput as HTMLInputElement).oninput = function () {
        (markerIconPreview as HTMLElement).textContent = (markerIconInput as HTMLInputElement).value;
      };
    }
    const coordsGroup = document.querySelector('.marker-coords-group');
    if (coordsGroup) (coordsGroup as HTMLElement).style.display = '';
    const latInput = document.getElementById('marker-lat');
    const lngInput = document.getElementById('marker-lng');
    if (latInput && lngInput && currentEditingObject.value && currentEditingObject.value.getLatLng) {
      const latlng = (currentEditingObject.value as L.Marker).getLatLng();
      (latInput as HTMLInputElement).value = latlng.lat.toString();
      (lngInput as HTMLInputElement).value = latlng.lng.toString();
    }
  } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
    if (colorPickerGroup) colorPickerGroup.style.display = 'block';
    if (opacityGroup) opacityGroup.style.display = 'block';
    if (imageGroup) imageGroup.style.display = 'block';
    const coordsGroup = document.querySelector('.marker-coords-group');
    if (coordsGroup) (coordsGroup as HTMLElement).style.display = 'none';
  } else if (type === 'polyline') {
    if (colorPickerGroup) colorPickerGroup.style.display = 'block';
    if (lineWidthGroup) lineWidthGroup.style.display = 'block';
    if (styleGroup) styleGroup.style.display = 'block';
    if (imageGroup) imageGroup.style.display = 'block';
    const coordsGroup = document.querySelector('.marker-coords-group');
    if (coordsGroup) (coordsGroup as HTMLElement).style.display = 'none';
  } else if (type === 'image') {
    if (imageGroup) imageGroup.style.display = 'block';
    if (opacityGroup) opacityGroup.style.display = 'block';
    const coordsGroup = document.querySelector('.marker-coords-group');
    if (coordsGroup) (coordsGroup as HTMLElement).style.display = 'none';
  } else if (type === 'text') {
    if (colorPickerGroup) colorPickerGroup.style.display = 'block';
    if (textContentGroup) textContentGroup.style.display = 'block';
    if (textFontSizeGroup) textFontSizeGroup.style.display = 'block';
    if (textRotationGroup) textRotationGroup.style.display = 'block';
    const coordsGroup = document.querySelector('.marker-coords-group');
    if (coordsGroup) (coordsGroup as HTMLElement).style.display = '';
    const latInput = document.getElementById('marker-lat');
    const lngInput = document.getElementById('marker-lng');
    if (latInput && lngInput && currentEditingObject.value && currentEditingObject.value.getLatLng) {
      const latlng = (currentEditingObject.value as any).getLatLng();
      (latInput as HTMLInputElement).value = latlng.lat.toString();
      (lngInput as HTMLInputElement).value = latlng.lng.toString();
    }
  }

  // Колір
  const objectColorInput = document.getElementById('object-color');
  if (objectColorInput) (objectColorInput as HTMLInputElement).value = properties.color || properties.fillColor || '#1976d2';
  // Товщина лінії
  const lineWidth = document.getElementById('line-width');
  const lineWidthValue = document.getElementById('line-width-value');
  if (lineWidth && lineWidthValue && properties.weight) {
    (lineWidth as HTMLInputElement).value = properties.weight;
    (lineWidthValue as HTMLElement).textContent = properties.weight + 'px';
  }
  // Стиль лінії
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

  setupColorPaletteInteractivity(type);
  setupLineStyleInteractivity();
  setupImageInput();

  const editModal = document.getElementById('edit-object-modal');
  if (editModal) (editModal as HTMLElement).classList.remove('hidden');
}

function setupColorPaletteInteractivity(type: string) {
  if (!(type === 'polyline' || type === 'marker' || type === 'polygon' || type === 'circle' || type === 'rectangle')) return;
  const colorPalette = document.getElementById('color-palette');
  const objectColorInput = document.getElementById('object-color');
  if (!colorPalette || !objectColorInput) return;

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

function setupLineStyleInteractivity() {
  const lineStyle = document.getElementById('line-style');
  if (!lineStyle || !currentEditingObject.value) return;
  (lineStyle as HTMLInputElement).onchange = function (e) {
    const target = e.target as HTMLInputElement | null;
    let dashArray: string | undefined = undefined;
    if (target && target.value === 'dashed') dashArray = '10, 10';
    else if (target && target.value === 'dotted') dashArray = '2, 8';
    (currentEditingObject.value as L.Polyline).options.dashArray = dashArray;
    if (dashArray) (currentEditingObject.value as L.Polyline).setStyle({ dashArray });
    (currentEditingObject.value as any).properties = (currentEditingObject.value as any).properties || {};
    if (target) (currentEditingObject.value as any).properties.style = target.value;
    saveLayersToStorage();
  };
  let dashArray: string | undefined = undefined;
  if ((lineStyle as HTMLInputElement).value === 'dashed') dashArray = '10, 10';
  else if ((lineStyle as HTMLInputElement).value === 'dotted') dashArray = '2, 8';
  (currentEditingObject.value as L.Polyline).setStyle({ dashArray });
  (currentEditingObject.value as L.Polyline).options.dashArray = dashArray;
}

function setupImageInput() {
  const imageInput = document.getElementById('object-image') as HTMLInputElement | null;
  const imagePreviewContainer = document.getElementById('object-image-preview-container') as HTMLElement | null;
  const imagePreview = document.getElementById('object-image-preview') as HTMLImageElement | null;
  const imageRemoveBtn = document.getElementById('object-image-remove') as HTMLElement | null;
  const properties = currentEditingObject.value ? (currentEditingObject.value as any).properties || {} : {};

  if (properties.image) {
    (imagePreview as HTMLImageElement).src = properties.image;
    (imagePreviewContainer as HTMLElement).classList.remove('hidden');
    if (imageInput) (imageInput as HTMLInputElement).classList.add('hidden');
  } else {
    (imagePreview as HTMLImageElement).src = '';
    (imagePreviewContainer as HTMLElement).classList.add('hidden');
    if (imageInput) (imageInput as HTMLInputElement).classList.remove('hidden');
  }

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

/**
 * Зберегти зміни з модального вікна редагування.
 */
export function saveObjectChanges(): void {
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
  } else if (type === 'image') {
    const objectOpacity = document.getElementById('object-opacity');
    if (objectOpacity) properties.opacity = parseFloat((objectOpacity as HTMLInputElement).value);
  }

  const imagePreview = document.getElementById('object-image-preview');
  if (imagePreview && (imagePreview as HTMLImageElement).src && !(imagePreview as HTMLElement).classList.contains('hidden')) {
    properties.image = (imagePreview as HTMLImageElement).src;
  }

  applyObjectProperties(currentEditingObject.value as L.Layer, properties);
  if ((currentEditingObject.value as any).feature && (currentEditingObject.value as any).properties) {
    (currentEditingObject.value as any).feature.properties = { ...(currentEditingObject.value as any).properties };
  }
  saveLayersToStorage();
  closeEditModal();
}

/**
 * Ініціалізація обробників подій модального вікна редагування.
 */
export function initEditModal(): void {
  const modalClose = document.getElementById('modal-close');
  const cancelEdit = document.getElementById('cancel-edit');
  const saveObject = document.getElementById('save-object');
  const deleteObject = document.getElementById('delete-object');
  const lineWidth = document.getElementById('line-width') as HTMLInputElement | null;
  const objectOpacity = document.getElementById('object-opacity') as HTMLInputElement | null;
  const editModal = document.getElementById('edit-object-modal');

  if (modalClose) modalClose.addEventListener('click', closeEditModal);
  if (cancelEdit) cancelEdit.addEventListener('click', closeEditModal);
  if (saveObject) saveObject.addEventListener('click', saveObjectChanges);

  if (deleteObject) {
    (deleteObject as HTMLElement).onclick = function () {
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
  }

  if (lineWidth) {
    lineWidth.addEventListener('input', function () {
      (document.getElementById('line-width-value') as HTMLElement).textContent = (this as HTMLInputElement).value;
    });
  }

  if (objectOpacity) {
    objectOpacity.addEventListener('input', function () {
      (document.getElementById('opacity-value') as HTMLElement).textContent = Math.round(Number((this as HTMLInputElement).value) * 100) + '%';
    });
  }

  if (editModal) {
    editModal.addEventListener('click', function (e) {
      if (e.target === this) closeEditModal();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && editModal && editModal.classList.contains('hidden') === false) {
      closeEditModal();
    }
  });
}

/**
 * Автокомпліт для інпуту іконки маркера.
 */
function setupMarkerIconAutocomplete() {
  let input = document.getElementById('marker-icon') as HTMLInputElement | null;
  const list = document.getElementById('marker-icon-autocomplete') as HTMLElement | null;
  const preview = document.getElementById('marker-icon-preview') as HTMLElement | null;
  if (!input || !list || !preview) return;

  const newInput = input.cloneNode(true) as HTMLInputElement;
  input.parentNode?.replaceChild(newInput, input);
  input = newInput;

  let currentFocus = -1;

  input.addEventListener('input', function () {
    const val = input!.value.trim().toLowerCase();
    list.innerHTML = '';
    preview.textContent = input!.value;
    const matches = materialIcons.filter(name => name.includes(val)).slice(0, 10);
    currentFocus = -1;
    matches.forEach(name => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.innerHTML = `<span class="material-icons">${name}</span> ${name}`;
      item.onclick = function () {
        input!.value = name;
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
  document.addEventListener('click', function (e) {
    if (e.target !== input) list.innerHTML = '';
  });
}

(window as any).materialIconsReady = false;

/**
 * Очікувати завантаження списку іконок і ініціалізувати автокомпліт.
 */
export function waitForMaterialIconsAndInitAutocomplete(): void {
  if ((window as any).materialIconsReady) {
    setupMarkerIconAutocomplete();
  } else {
    setTimeout(waitForMaterialIconsAndInitAutocomplete, 100);
  }
}
