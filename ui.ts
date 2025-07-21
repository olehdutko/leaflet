import { materialIcons, currentEditingObject } from './state.js';
import { closeEditModal } from './main.js';
declare const L: any;
import { getColoredMarkerIcon, getObjectType, getObjectProperties } from './utils.js';
import { saveLayersToStorage } from './layers.js';
import { applyObjectProperties } from './objects.js';
import { updateActiveLayerUI } from './layers.js';

export const layerIdToRenderObjectsList = new Map();

export function updateObjectsListForLayer(layerObj: any) {
  const fn = layerIdToRenderObjectsList.get(layerObj.id);
  if (fn) fn();
}

export function showEditModal(layer: any) {
  currentEditingObject.value = layer;
  const type = getObjectType(layer);
  const properties = getObjectProperties(layer);
  // Оновлюємо заголовок
  const modalTitle = document.getElementById('modal-title');
  if (modalTitle) {
    modalTitle.textContent = `Редагування ${type === 'marker' ? 'маркера' : type === 'polygon' ? 'полігону' : type === 'polyline' ? 'полілінії' : type === 'image' ? 'зображення' : 'обʼєкта'}`;
  }
  // Заповнюємо поля
  const objectName = document.getElementById('object-name') as HTMLInputElement | null;
  if (objectName) objectName.value = properties.name;
  const objectDescription = document.getElementById('object-description') as HTMLTextAreaElement | null;
  if (objectDescription) objectDescription.value = properties.description;
  // Групи контролів
  const colorPickerGroup = document.getElementById('color-picker-group') as HTMLElement | null;
  const lineWidthGroup = document.getElementById('line-width-group') as HTMLElement | null;
  const styleGroup = document.getElementById('style-group') as HTMLElement | null;
  const opacityGroup = document.getElementById('opacity-group') as HTMLElement | null;
  const markerIconGroup = document.getElementById('marker-icon-group') as HTMLElement | null;
  // Приховуємо всі групи
  [colorPickerGroup, lineWidthGroup, styleGroup, opacityGroup, markerIconGroup].forEach(group => {
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
      (markerIconInput as HTMLInputElement).oninput = function() {
        (markerIconPreview as HTMLElement).textContent = (markerIconInput as HTMLInputElement).value;
      };
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
    // видалено: логіка для imageGroup, opacityGroup, coordsGroup
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
        (swatch as HTMLElement).onclick = function() {
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
      (objectColorInput as HTMLInputElement).oninput = function(e) {
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
      (lineStyle as HTMLInputElement).onchange = function(e) {
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
  // видалено: imageInput, imagePreviewContainer, imagePreview, imageRemoveBtn, preview, вибір, видалення зображення
  // видалення об'єкта
  const deleteObjectBtn = document.getElementById('delete-object');
  if (deleteObjectBtn) {
    deleteObjectBtn.onclick = function() {
      let typeName = 'обʼєкта';
      if (currentEditingObject.value) {
        const type = getObjectType(currentEditingObject.value as L.Layer);
        if (type === 'marker') typeName = 'маркеру';
        else if (type === 'polygon') typeName = 'полігону';
        else if (type === 'polyline') typeName = 'лінії';
        else if (type === 'rectangle') typeName = 'прямокутника';
        else if (type === 'circle') typeName = 'кола';
      }
      let objectName = typeName;
      if (currentEditingObject.value) {
        const properties = getObjectProperties(currentEditingObject.value as L.Layer);
        if (properties.name) objectName = `"${properties.name}"`;
      }
      showConfirmDialog({
        title: `Видалення ${typeName}: ${objectName}`,
        message: 'Ви дійсно хочете видалити цей обʼєкт?',
        onConfirm: () => {
          if (!currentEditingObject.value) return;
          // Знаходимо відповідний customLayer
          const layerObj = customLayers.find(l => l.featureGroup && l.featureGroup.hasLayer(currentEditingObject.value as L.Layer));
          if (layerObj && layerObj.featureGroup) {
            layerObj.featureGroup.removeLayer(currentEditingObject.value as L.Layer);
          }
          map.removeLayer(currentEditingObject.value as L.Layer);
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

export function addDoubleClickToLayer(layer: any) {
  if (!layer) return;
  // dblclick — модалка
  layer.on('dblclick', function(e: any) {
    layer._wasDblClicked = true;
    e.originalEvent?.stopPropagation?.();
    e.originalEvent?.preventDefault?.();
    showEditModal(layer);
  });
  // Для маркерів — явний DOM-обробник
  function addDomDblClickHandler(marker: any) {
    if (marker._icon) {
      marker._icon.addEventListener('dblclick', (e: any) => {
        marker._wasDblClicked = true;
        e.stopPropagation();
        e.preventDefault();
        showEditModal(marker);
      });
    } else {
      // Якщо іконка ще не створена — повторити через 100мс
      setTimeout(() => addDomDblClickHandler(marker), 100);
    }
  }
  if (layer instanceof L.Marker) {
    addDomDblClickHandler(layer);
    // Дублюючий обробник для leaflet-івенту
    layer.on('dblclick', function(e: any) {
      layer._wasDblClicked = true;
      e.originalEvent?.stopPropagation?.();
      e.originalEvent?.preventDefault?.();
      showEditModal(layer);
    });
  }
}

export function showConfirmDialog({title = 'Підтвердження', message = '', onConfirm, onCancel, buttons}: {title?: string, message?: string, onConfirm?: (action?: string) => void, onCancel?: () => void, buttons?: {text: string, action: string, className?: string}[]}) {
  const modal = document.getElementById('confirm-modal');
  const backdrop = document.getElementById('confirm-modal-backdrop');
  const titleEl = document.getElementById('confirm-modal-title');
  const msgEl = document.getElementById('confirm-modal-message');
  const footer = modal?.querySelector('.modal-footer');
  if (!modal || !titleEl || !msgEl || !footer) return;
  modal.classList.remove('hidden');
  modal.style.display = 'block';
  if (backdrop) backdrop.classList.remove('hidden');
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
        if (backdrop) backdrop.classList.add('hidden');
        if (btn.action === 'cancel' && onCancel) onCancel();
        if (btn.action !== 'cancel' && onConfirm) onConfirm(btn.action);
      };
      footer.appendChild(button);
    });
  } else {
    // Стандартні кнопки
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.className = 'btn-primary';
    okBtn.onclick = () => {
      modal.classList.add('hidden');
      modal.style.display = '';
      if (backdrop) backdrop.classList.add('hidden');
      if (onConfirm) onConfirm();
    };
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Скасувати';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.onclick = () => {
      modal.classList.add('hidden');
      modal.style.display = '';
      if (backdrop) backdrop.classList.add('hidden');
      if (onCancel) onCancel();
    };
    footer.appendChild(okBtn);
    footer.appendChild(cancelBtn);
  }
}

export function createLayerControl(layerObj: any) {
  if (!layerControlsDiv) return;

  const layerCard = document.createElement('div');
  layerCard.className = 'layer-card';
  layerCard.dataset.layerId = layerObj.id.toString();
  
  // Make layer card draggable
  layerCard.draggable = true;
  
  // Layer selection functionality
  layerCard.onclick = (e) => {
    // Don't select if clicking on buttons, drag handle, or objects
    if ((e.target as HTMLElement).closest('.layer-card-icon-btn') || 
        (e.target as HTMLElement).closest('.layer-object-item') ||
        (e.target as HTMLElement).closest('.layer-objects-list')) {
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
      visibilityBtn.classList.add('blue');
      layerCard.classList.remove('layer-card-inactive');
    } else {
      map.removeLayer(layerObj.tileLayer);
      map.removeLayer(layerObj.featureGroup);
      visibilityBtn.innerHTML = '<i class="fa fa-eye-slash"></i>';
      visibilityBtn.title = 'Показати шар';
      visibilityBtn.classList.remove('blue');
      layerCard.classList.add('layer-card-inactive');
    }
    // Оновлюємо видимість draw control
    updateDrawControlVisibility();
  };
  if (!layerObj.visible) {
    visibilityBtn.classList.remove('blue');
    layerCard.classList.add('layer-card-inactive');
  } else {
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
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      // видалено: додавання зображення до шару, overlay, images, distortableImageOverlay
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
    const images = (l.featureGroup as any).images || [];
    const imagesWithCorners = images.map((img: any) => {
      // @ts-ignore
      const overlay = (l.featureGroup as any).overlays?.find((o: any) => 
        o._customUrl === img.url || o._url === img.url || o._image?.src === img.url
      );
      if (overlay && overlay.getCorners) {
        return {
          ...img,
          corners: overlay.getCorners(),
          bounds: overlay.getBounds(),
          properties: overlay.properties || {}
        };
      }
      return {
        ...img,
        properties: img.properties || {}
      };
    });
    const layerData = {
      id: l.id,
      tileType: l.tileType,
      opacity: l.tileLayer.options.opacity,
      // @ts-ignore
      showLabels: (l.tileLayer as any)._url && (l.tileLayer as any)._url.includes('nolabels') ? false : true,
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
    input.onkeydown = function(e) {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
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
      } else {
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
    const newType = (e.target as HTMLSelectElement).value;
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
    const opacity = parseFloat((e.target as HTMLInputElement).value);
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
    const objectItems: HTMLElement[] = [];
    layerObj.featureGroup.eachLayer((layer: any) => {
      const type = getObjectType(layer);
      const props = layer.properties || layer.feature?.properties || {};
      const item = document.createElement('div');
      item.className = 'layer-object-item';
      item.title = props.name || type;
      item.innerHTML =
        `<span class="material-icons layer-object-drag-icon">drag_indicator</span>` +
        (
          type === 'marker' ? `<span class="material-icons">${props.icon || 'place'}</span>` :
          type === 'polygon' ? '<i class="fa fa-draw-polygon"></i>' :
          type === 'polyline' ? '<i class="fa fa-share-alt"></i>' :
          type === 'circle' ? '<i class="fa fa-circle"></i>' :
          type === 'rectangle' ? '<i class="fa fa-square"></i>' :
          type === 'image' ? '<i class="fa fa-image"></i>' :
          '<i class="fa fa-question"></i>'
        ) +
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
        } else {
          // [dragstart] no dataTransfer', e);
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
        } else {
          // [ondrop] no dataTransfer', e);
        }
      };
      // клік — тільки підсвічування
      let wasDragged = false;
      item.addEventListener('mousedown', () => { wasDragged = false; });
      item.addEventListener('dragstart', () => { wasDragged = true; });
      item.addEventListener('click', (e) => {
        if (wasDragged) return;
        if ((e.target as HTMLElement).closest('.layer-object-drag-icon')) return;
        // підсвічування
        if (layer.setStyle) {
          const prev = { ...(layer.options || {}) };
          layer.setStyle({ color: '#cd1d1d', weight: 8 });
          setTimeout(() => layer.setStyle(prev), 1500);
        } else if (layer.setIcon) {
          const prevIcon = layer.getIcon();
          layer.setIcon(getColoredMarkerIcon('#cd1d1d', props.icon || 'place'));
          setTimeout(() => layer.setIcon(prevIcon), 1500);
        } else if (layer.getElement && layer.getElement()) {
          (layer.getElement() as HTMLElement).classList.add('global-object-search-highlight');
          setTimeout(() => (layer.getElement() as HTMLElement).classList.remove('global-object-search-highlight'), 1500);
        }
        if (layer.getBounds) map.fitBounds(layer.getBounds(), { maxZoom: 17 });
        else if (layer.getLatLng) map.setView(layer.getLatLng(), 17);
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
        if ((e.target as HTMLElement).closest('.layer-object-drag-icon')) return;
        showEditModal(layer);
      });
      objectsListWrap.appendChild(item);
    });
    // --- SortableJS для drag&drop об'єктів ---
    if (typeof window !== 'undefined' && (window as any).Sortable && objectsListWrap) {
      if (!(window as any).objectsSortables) (window as any).objectsSortables = new Map();
      const sortablesMap = (window as any).objectsSortables as Map<string, any>;
      if (sortablesMap.has(layerObj.id)) {
        sortablesMap.get(layerObj.id).destroy();
      }
      const sortable = new (window as any).Sortable(objectsListWrap, {
        animation: 150,
        handle: '.layer-object-drag-icon',
        preventOnFilter: false,
        onEnd: function (evt: any) {
          const newOrder = Array.from(objectsListWrap.children).map((el: any) => el.dataset.objectId);
          const layers: any[] = [];
          layerObj.featureGroup.eachLayer((l: any) => layers.push(l));
          layers.forEach(l => layerObj.featureGroup.removeLayer(l));
          newOrder.forEach((id: string) => {
            const l = layers.find(x => x._leaflet_id == id);
            if (l) layerObj.featureGroup.addLayer(l);
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
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
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
        // [objectsListWrap.ondrop] no dataTransfer', e);
        return;
      }
      const data = e.dataTransfer.getData('application/layer-object');
      if (!data) return;
      const { layerId, objectId } = JSON.parse(data);
      if (layerId == layerObj.id) return; // не переносимо у той самий шар
      // знайти старий шар та об'єкт
      const fromLayerObj = customLayers.find(l => l.id == layerId);
      if (!fromLayerObj) {
        // [objectsListWrap.ondrop] fromLayerObj not found', layerId);
        return;
      }
      let movedLayer = null;
      fromLayerObj.featureGroup.eachLayer((l: any) => {
        if (l._leaflet_id == objectId) movedLayer = l;
      });
      if (!movedLayer) {
        // [objectsListWrap.ondrop] movedLayer not found', objectId);
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
    layerObj.featureGroup.images.forEach((img: any) => {
      const item = document.createElement('div');
      item.className = 'layer-object-item';
      item.title = img.properties?.name || 'image';
      item.innerHTML = '<i class="fa fa-image"></i> ' + (img.properties?.name || '[зображення]');
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
    } else {
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
    e.dataTransfer?.setData('text/plain', layerObj.id.toString());
    e.dataTransfer!.effectAllowed = 'move';
    layerCard.classList.add('dragging');
  };
  
  layerCard.ondragend = () => {
    layerCard.classList.remove('dragging');
  };
  
  layerCard.ondragover = (e) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  };
  
  layerCard.ondrop = (e) => {
    e.preventDefault();
    const draggedLayerId = e.dataTransfer?.getData('text/plain');
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
export function selectLayer(layerId: string) {
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
      const layerObj = customLayers.find((l: any) => l.featureGroup === activeLayer);
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

(window as any).addDoubleClickToLayer = addDoubleClickToLayer;

// --- Глобальний MutationObserver для маркерів ---
if (typeof window !== 'undefined' && typeof L !== 'undefined') {
  const markerObserver = new MutationObserver(() => {
    // Знаходимо всі leaflet-marker-icon
    document.querySelectorAll('.leaflet-marker-icon').forEach(icon => {
      // Знаходимо відповідний leaflet-обʼєкт
      const marker = Object.values(map._layers).find((l: any) => l._icon === icon);
      const iconEl = icon as HTMLElement & { __dblclickHandlerAttached?: boolean };
      if (marker && !iconEl.__dblclickHandlerAttached) {
        iconEl.addEventListener('dblclick', (e: any) => {
          e.stopPropagation();
          e.preventDefault();
          showEditModal(marker);
        });
        iconEl.__dblclickHandlerAttached = true;
      }
    });
  });
  const mapEl = document.getElementById('map');
  if (mapEl) markerObserver.observe(mapEl, { childList: true, subtree: true });
}
