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

const map = L.map('map', {
  center: center,
  zoom: 13,
  // layers: [baseMap] // прибрано
});

// --- Користувацькі шари ---
let layerId = 1;
let customLayers = [];
let activeLayer = null;
let drawControl = null; // оголошуємо глобально

const layerControlsDiv = document.getElementById('layer-controls');
const addLayerBtn = document.getElementById('add-layer');

// --- Перенесено: Функція для збереження шарів у localStorage ---
function saveLayersToStorage() {
  customLayers.forEach(l => {
    l.featureGroup.eachLayer(layer => {
      const type = getObjectType(layer);
      if (!layer.feature) return; // тільки geojson-обʼєкти
      if (!layer.feature.properties) layer.feature.properties = {};
      // Копіюємо властивості з layer.properties у feature.properties
      if (layer.feature && layer.properties) {
        Object.assign(layer.feature.properties, layer.properties);
      }
      Object.assign(layer.feature.properties, layer.properties || {});
      // Додаємо стилі
      if (type === 'marker') {
        layer.feature.properties.color = layer.properties?.color || '#1976d2';
      } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
        layer.feature.properties.fillColor = layer.options?.fillColor || '#1976d2';
        layer.feature.properties.color = layer.options?.color || '#1976d2';
        layer.feature.properties.fillOpacity = layer.options?.fillOpacity || 0.2;
        layer.feature.properties.opacity = layer.options?.opacity || 1;
      } else if (type === 'polyline') {
        layer.feature.properties.color = layer.options?.color || '#1976d2';
        layer.feature.properties.weight = layer.options?.weight || 3;
        layer.feature.properties.opacity = layer.options?.opacity || 1;
        // Додаю збереження стилю лінії з захистом
        let dash = layer.options && layer.options.dashArray !== undefined && layer.options.dashArray !== null ? String(layer.options.dashArray) : '';
        if (dash === '10, 10') layer.feature.properties.style = 'dashed';
        else if (dash === '2, 8') layer.feature.properties.style = 'dotted';
        else layer.feature.properties.style = 'solid';
      }
      // --- додаю image ---
      if (layer.properties && layer.properties.image) {
        layer.feature.properties.image = layer.properties.image;
      }
    });
  });
  const layersData = customLayers.map(l => {
    const images = l.featureGroup.images || [];
    // Зберігаємо corners замість bounds для збереження трансформації
    const imagesWithCorners = images.map(img => {
      // Знаходимо відповідний overlay для отримання corners
      const overlay = l.featureGroup.overlays?.find(o => 
        o._customUrl === img.url || o._url === img.url || o._image?.src === img.url
      );
      if (overlay && overlay.getCorners) {
        return {
          ...img,
          corners: overlay.getCorners(),
          bounds: overlay.getBounds(),
          properties: overlay.properties || {} // Зберігаємо властивості зображень
        };
      }
      return {
        ...img,
        properties: img.properties || {} // Зберігаємо властивості зображень
      };
    });
    return {
      id: l.id,
      tileType: l.tileType,
      opacity: l.tileLayer.options.opacity,
      showLabels: l.tileLayer._url && l.tileLayer._url.includes('nolabels') ? false : true,
      geojson: l.featureGroup.toGeoJSON(), // GeoJSON вже містить властивості об'єктів
      images: imagesWithCorners,
      title: l.title || undefined,
      visible: l.visible !== false
    };
  });
  localStorage.setItem('lefleat_layers', JSON.stringify(layersData));
}

function createTileLayer(type, opacity=1, showLabels=true) {
  const opt = tileLayerOptions[type];
  let url = opt.url;
  if (opt.hasLabels && showLabels === false && opt.urlNoLabels) {
    url = opt.urlNoLabels;
  }
  return L.tileLayer(url, {
    maxZoom: opt.maxZoom,
    attribution: opt.attribution,
    opacity: opacity
  });
}

function getLayerIcon(type) {
  if (type === 'План') return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;"><rect width="24" height="24" rx="4" fill="#1976d2"/><path d="M7 17V7l5-2v10l-5 2zM12 5l5 2v10l-5-2V5z" fill="#fff"/></svg>`;
  if (type === 'Ландшафт') return '<i class="fa fa-mountain" style="font-size:22px;color:#1976d2;"></i>';
  if (type === 'Супутник') return '<i class="fa fa-globe" style="font-size:22px;color:#1976d2;"></i>';
  return '';
}

function createLayerControl(layerObj) {
  const { id, tileLayer, featureGroup } = layerObj;
  let collapsed = false;
  let showLabels = true;
  if (layerObj.visible === undefined) layerObj.visible = true;
  const opt = tileLayerOptions[layerObj.tileType];

  // Назва шару — тепер з часом створення
  if (!layerObj.title) {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    layerObj.title = `Шар ${timeStr}`;
  }

  const div = document.createElement('div');
  div.className = 'layer-card';

  // --- Заголовок ---
  const titleRow = document.createElement('div');
  titleRow.className = 'layer-card-title-row';
  const titleWrap = document.createElement('span');
  titleWrap.className = 'layer-card-title';
  titleWrap.style.display = 'block';
  titleWrap.style.width = '100%';
  titleWrap.style.boxSizing = 'border-box';
  titleWrap.style.paddingLeft = '5px';
  titleWrap.style.paddingRight = '16px';
  titleWrap.style.overflow = 'hidden';
  titleWrap.style.textOverflow = 'ellipsis';
  titleWrap.textContent = layerObj.title;
  titleWrap.contentEditable = true;
  titleWrap.spellcheck = false;
  titleWrap.addEventListener('blur', () => {
    layerObj.title = titleWrap.textContent.trim() || `Шар ${id}`;
    saveLayersToStorage();
  });
  titleWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleWrap.blur();
    }
  });
  titleRow.appendChild(titleWrap);
  div.appendChild(titleRow);

  // --- Верхній рядок: іконки ---
  const header = document.createElement('div');
  header.className = 'layer-card-header';
  header.style.display = 'flex';
  header.style.justifyContent = 'flex-end';
  header.style.alignItems = 'center';
  header.style.gap = '8px';

  // Око (показати/приховати)
  const eyeBtn = document.createElement('button');
  eyeBtn.className = 'layer-card-icon-btn';
  eyeBtn.innerHTML = layerObj.visible ? '<i class="fa fa-eye"></i>' : '<i class="fa fa-eye-slash"></i>';
  eyeBtn.title = layerObj.visible ? 'Приховати шар' : 'Показати шар';
  header.appendChild(eyeBtn);

  // --- Експорт шару ---
  const exportBtn = document.createElement('button');
  exportBtn.className = 'layer-card-icon-btn';
  exportBtn.innerHTML = '<i class="fa fa-arrow-up"></i>';
  exportBtn.title = 'Експортувати шар';
  header.appendChild(exportBtn);

  exportBtn.onclick = (e) => {
    e.stopPropagation();
    const geojson = layerObj.featureGroup.toGeoJSON();
    const images = layerObj.featureGroup.images || [];
    const exportData = {
      title: layerObj.title || `Шар ${id}`,
      geojson,
      images
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (layerObj.title || `layer-${id}`) + '.geojson';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Видалити (дозволити для всіх шарів)
  let removeBtn = null;
  removeBtn = document.createElement('button');
  removeBtn.className = 'layer-card-icon-btn delete';
  removeBtn.innerHTML = '<i class="fa fa-trash"></i>';
  removeBtn.title = 'Видалити';
  header.appendChild(removeBtn);

  // --- Додаю кнопку "Додати зображення" у header панелі шарів ---
  const addImageBtn = document.createElement('button');
  addImageBtn.className = 'layers-panel-btn';
  addImageBtn.id = 'add-image';
  addImageBtn.title = 'Додати зображення';
  addImageBtn.innerHTML = '<i class="fa fa-image"></i>';
  header.appendChild(addImageBtn);

  const addImageInput = document.createElement('input');
  addImageInput.type = 'file';
  addImageInput.accept = 'image/*';
  addImageInput.style.display = 'none';
  addImageBtn.onclick = () => addImageInput.click();
  addImageInput.onchange = e => {
    const file = addImageInput.files[0];
    if (!file || !activeLayer) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const imgUrl = evt.target.result;
      // Додаємо зображення у центр карти з дефолтними розмірами через bounds
      const mapCenter = map.getCenter();
      const bounds = [
        [mapCenter.lat - 0.005, mapCenter.lng - 0.01], // southWest
        [mapCenter.lat + 0.005, mapCenter.lng + 0.01]  // northEast
      ];
      const overlay = L.distortableImageOverlay(imgUrl, {
        bounds: bounds,
        selected: true
      }).addTo(map);
      // overlay.options.url = imgUrl; // обовʼязково!
      overlay._customUrl = imgUrl;
      const el = overlay.getElement();
      if (el) {
        el.addEventListener('click', function(e) {
          e.stopPropagation();
          overlay.select();
        });
        // Додаємо подвійний клік для редагування
        el.addEventListener('dblclick', function(e) {
          e.stopPropagation();
          showEditModal(overlay);
        });
      }
      overlay.select(); // одразу показати тулбар
      if (!activeLayer.images) activeLayer.images = [];
              // Зберігаємо і corners, і bounds, і властивості
        const imageData = {
          url: imgUrl,
          bounds: overlay.getBounds(),
          corners: overlay.getCorners ? overlay.getCorners() : null,
          properties: {} // Порожні властивості для нового зображення
        };
      activeLayer.images.push(imageData);
      // --- Додаю збереження overlay у масив overlays ---
      if (!activeLayer.overlays) activeLayer.overlays = [];
      activeLayer.overlays.push(overlay);
      saveLayersToStorage();
      overlay.on('edit', () => {
        const idx = activeLayer.images.findIndex(img => img.url === imgUrl);
        if (idx !== -1) {
          activeLayer.images[idx].bounds = overlay.getBounds();
          activeLayer.images[idx].corners = overlay.getCorners ? overlay.getCorners() : null;
          saveLayersToStorage();
        }
      });
    };
    reader.readAsDataURL(file);
  };

  div.appendChild(header);

  // --- Контент картки ---
  const content = document.createElement('div');
  content.className = 'layer-card-content';

  // Select з іконкою
  const selectWrap = document.createElement('div');
  selectWrap.className = 'layer-card-select';
  selectWrap.innerHTML = getLayerIcon(layerObj.tileType);
  const select = document.createElement('select');
  select.innerHTML = Object.keys(tileLayerOptions).map(k => `<option value="${k}">${k}</option>`).join('');
  select.value = layerObj.tileType;
  selectWrap.appendChild(select);
  content.appendChild(selectWrap);

  // Чекбокс геоназви
  const checkboxWrap = document.createElement('label');
  checkboxWrap.className = 'layer-card-checkbox';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;
  checkbox.disabled = !tileLayerOptions[layerObj.tileType].hasLabels;
  checkboxWrap.appendChild(checkbox);
  const cbText = document.createElement('span');
  cbText.textContent = 'Геоназви';
  checkboxWrap.appendChild(cbText);
  if (!tileLayerOptions[layerObj.tileType].hasLabels) {
    const note = document.createElement('span');
    note.className = 'note';
    note.textContent = ' (неможливо вимкнути для OSM)';
    checkboxWrap.appendChild(note);
  }
  content.appendChild(checkboxWrap);

  // Слайдер прозорості
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.01';
  slider.value = tileLayer.options.opacity;
  slider.className = 'layer-card-slider';
  content.appendChild(slider);

  div.appendChild(content);

  // --- Логіка ---
  // Показати/приховати шар
  eyeBtn.onclick = () => {
    layerObj.visible = !layerObj.visible;
    if (layerObj.visible) {
      map.addLayer(layerObj.tileLayer);
      map.addLayer(layerObj.featureGroup);

      // --- Видалити старі overlays ---
      if (featureGroup.overlays) {
        featureGroup.overlays.forEach(ov => map.removeLayer(ov));
      }
      featureGroup.overlays = [];

      // --- Створити нові overlays з images ---
      if (featureGroup.images) {
        featureGroup.images.forEach(img => {
          let overlay;
          if (img.corners && img.corners.length === 4) {
            // Використовуємо corners для відновлення трансформації
            overlay = L.distortableImageOverlay(img.url, { 
              corners: img.corners, 
              selected: false 
            }).addTo(map);
          } else {
            // Fallback на bounds
            overlay = L.distortableImageOverlay(img.url, { 
              bounds: img.bounds, 
              selected: false 
            }).addTo(map);
          }
          overlay._customUrl = img.url;
          // Відновлюємо властивості зображення
          if (img.properties) {
            overlay.properties = img.properties;
            applyObjectProperties(overlay, img.properties);
          }
          const el = overlay.getElement();
          if (el) {
            el.addEventListener('click', function(e) {
              e.stopPropagation();
              overlay.select();
            });
          }
          overlay.select();
          featureGroup.overlays.push(overlay);
          overlay.on('edit', () => {
            const idx = featureGroup.images.findIndex(i => i.url === img.url);
            if (idx !== -1) {
              featureGroup.images[idx].bounds = overlay.getBounds();
              featureGroup.images[idx].corners = overlay.getCorners ? overlay.getCorners() : null;
              saveLayersToStorage();
            }
          });
        });
      }

      eyeBtn.innerHTML = '<i class="fa fa-eye"></i>';
      eyeBtn.title = 'Приховати шар';
      div.classList.remove('layer-card-disabled');
      select.disabled = false;
      slider.disabled = false;
      checkbox.disabled = !tileLayerOptions[layerObj.tileType].hasLabels;
      removeBtn.disabled = false;
    } else {
      map.removeLayer(layerObj.tileLayer);
      map.removeLayer(layerObj.featureGroup);
      // --- Приховати всі overlay і очистити overlays ---
      if (featureGroup.overlays) {
        featureGroup.overlays.forEach(ov => map.removeLayer(ov));
        featureGroup.overlays = [];
      }
      eyeBtn.innerHTML = '<i class="fa fa-eye-slash"></i>';
      eyeBtn.title = 'Показати шар';
      div.classList.add('layer-card-disabled');
      select.disabled = true;
      slider.disabled = true;
      checkbox.disabled = true;
      removeBtn.disabled = false;
    }
    saveLayersToStorage();
  };

  // Видалити (дозволити для всіх шарів)
  if (removeBtn) {
    removeBtn.onclick = () => {
      map.removeLayer(layerObj.tileLayer);
      map.removeLayer(featureGroup);
      layerControlsDiv.removeChild(div);

      // Знаходимо індекс видаленого шару
      const idx = customLayers.findIndex(l => l.id === layerObj.id);
      customLayers = customLayers.filter(l => l.id !== layerObj.id);

      // Визначаємо новий активний шар
      let newActive = null;
      if (customLayers.length > 0) {
        if (idx < customLayers.length) {
          newActive = customLayers[idx].featureGroup; // наступний
        } else {
          newActive = customLayers[0].featureGroup; // перший, якщо видаляли останній
        }
      }

      activeLayer = newActive;
      updateActiveLayerUI();

      if (drawControl) {
        map.removeControl(drawControl);
      }
      if (activeLayer) {
        drawControl = new L.Control.Draw({
          edit: { featureGroup: activeLayer },
          draw: {
            polygon: true,
            polyline: true,
            rectangle: true,
            circle: true,
            marker: true,
            circlemarker: false
          }
        });
        map.addControl(drawControl);
      } else {
        drawControl = null;
      }

      saveLayersToStorage();
    };
  }
  // Select підкладки
  select.onchange = () => {
    map.removeLayer(layerObj.tileLayer);
    layerObj.tileType = select.value;
    selectWrap.innerHTML = getLayerIcon(layerObj.tileType);
    selectWrap.appendChild(select);
    showLabels = true;
    layerObj.tileLayer = createTileLayer(layerObj.tileType, slider.value, showLabels);
    layerObj.tileLayer.addTo(map);
    featureGroup.bringToFront();
    checkbox.disabled = !tileLayerOptions[layerObj.tileType].hasLabels || !layerObj.visible;
    if (!tileLayerOptions[layerObj.tileType].hasLabels) {
      cbText.nextSibling?.remove();
      const note = document.createElement('span');
      note.className = 'note';
      note.textContent = ' (неможливо вимкнути для OSM)';
      checkboxWrap.appendChild(note);
    } else {
      cbText.nextSibling?.remove();
    }
    checkbox.checked = true;
    saveLayersToStorage();
  };
  checkbox.onchange = () => {
    if (!tileLayerOptions[layerObj.tileType].hasLabels || !layerObj.visible) return;
    showLabels = checkbox.checked;
    map.removeLayer(layerObj.tileLayer);
    layerObj.tileLayer = createTileLayer(layerObj.tileType, slider.value, showLabels);
    layerObj.tileLayer.addTo(map);
    featureGroup.bringToFront();
    saveLayersToStorage();
  };
  slider.oninput = () => {
    layerObj.tileLayer.setOpacity(+slider.value);
    saveLayersToStorage();
  };
  // Додаємо data-id для підсвічування
  div.dataset.layerId = layerObj.id;

  // --- Активувати шар по кліку на картку ---
  div.addEventListener('click', function(e) {
    // Не активуємо, якщо клік по кнопці (іконці)
    if (e.target.closest('button')) return;
    if (!layerObj.visible) return;
    activeLayer = featureGroup;
    // Видаляємо старий drawControl
    if (drawControl) {
      map.removeControl(drawControl);
    }
    // Додаємо новий drawControl з новим featureGroup
    drawControl = new L.Control.Draw({
      edit: {
        featureGroup: activeLayer
      },
      draw: {
        polygon: true,
        polyline: true,
        rectangle: true,
        circle: true,
        marker: true,
        circlemarker: false
      }
    });
    map.addControl(drawControl);
    updateActiveLayerUI();
  });

  // Дизейблити картку якщо невидима
  if (!layerObj.visible) {
    div.classList.add('layer-card-disabled');
    select.disabled = true;
    slider.disabled = true;
    checkbox.disabled = true;
    removeBtn.disabled = true;
  }

  return div;
}

function updateActiveLayerUI() {
  // Підсвічуємо тільки одну активну картку (по справжньому id)
  document.querySelectorAll('.layer-card').forEach(card => {
    const id = +card.dataset.layerId;
    const layer = customLayers.find(l => l.id === id);
    if (layer && layer.featureGroup === activeLayer) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
  customLayers.forEach(l => {
    l.featureGroup.eachLayer(layer => {
      const type = getObjectType(layer);
      if (!layer.feature) return; // тільки geojson-обʼєкти
      if (!layer.feature.properties) layer.feature.properties = {};
      // Копіюємо властивості з layer.properties у feature.properties
      if (layer.feature && layer.properties) {
        Object.assign(layer.feature.properties, layer.properties);
      }
      Object.assign(layer.feature.properties, layer.properties || {});
      // Додаємо стилі
      if (type === 'marker') {
        layer.feature.properties.color = layer.properties?.color || '#1976d2';
      } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
        layer.feature.properties.fillColor = layer.options?.fillColor || '#1976d2';
        layer.feature.properties.color = layer.options?.color || '#1976d2';
        layer.feature.properties.fillOpacity = layer.options?.fillOpacity || 0.2;
        layer.feature.properties.opacity = layer.options?.opacity || 1;
      } else if (type === 'polyline') {
        layer.feature.properties.color = layer.options?.color || '#1976d2';
        layer.feature.properties.weight = layer.options?.weight || 3;
        layer.feature.properties.opacity = layer.options?.opacity || 1;
        // Додаю збереження стилю лінії з захистом
        let dash = layer.options && layer.options.dashArray !== undefined && layer.options.dashArray !== null ? String(layer.options.dashArray) : '';
        if (dash === '10, 10') layer.feature.properties.style = 'dashed';
        else if (dash === '2, 8') layer.feature.properties.style = 'dotted';
        else layer.feature.properties.style = 'solid';
      }
    });
  });
  const layersData = customLayers.map(l => {
    const images = l.featureGroup.images || [];
    // Зберігаємо corners замість bounds для збереження трансформації
    const imagesWithCorners = images.map(img => {
      // Знаходимо відповідний overlay для отримання corners
      const overlay = l.featureGroup.overlays?.find(o => 
        o._customUrl === img.url || o._url === img.url || o._image?.src === img.url
      );
      if (overlay && overlay.getCorners) {
        return {
          ...img,
          corners: overlay.getCorners(),
          bounds: overlay.getBounds(),
          properties: overlay.properties || {} // Зберігаємо властивості зображень
        };
      }
      return {
        ...img,
        properties: img.properties || {} // Зберігаємо властивості зображень
      };
    });
    return {
      id: l.id,
      tileType: l.tileType,
      opacity: l.tileLayer.options.opacity,
      showLabels: l.tileLayer._url && l.tileLayer._url.includes('nolabels') ? false : true,
      geojson: l.featureGroup.toGeoJSON(), // GeoJSON вже містить властивості об'єктів
      images: imagesWithCorners,
      title: l.title || undefined,
      visible: l.visible !== false
    };
  });
  localStorage.setItem('lefleat_layers', JSON.stringify(layersData));
}

// --- Оновлюю loadLayersFromStorage ---
function loadLayersFromStorage() {
  const data = localStorage.getItem('lefleat_layers');
  if (!data) return false;
  try {
    const arr = JSON.parse(data);
    customLayers.forEach(l => {
      map.removeLayer(l.tileLayer);
      map.removeLayer(l.featureGroup);
    });
    customLayers = [];
    layerControlsDiv.innerHTML = '';
    arr.forEach(obj => {
      const tileLayer = createTileLayer(obj.tileType, obj.opacity, obj.showLabels);
      const featureGroup = new L.FeatureGroup();
      tileLayer.addTo(map);
      featureGroup.addTo(map);
      if (obj.geojson) {
        L.geoJSON(obj.geojson, {
          pointToLayer: function(feature, latlng) {
            if (feature.properties && feature.properties.color) {
              return L.marker(latlng, { icon: getColoredMarkerIcon(feature.properties.color) });
            }
            return L.marker(latlng);
          },
          style: function(feature) {
            return {
              color: feature.properties?.color || '#1976d2',
              weight: feature.properties?.weight || 3,
              opacity: feature.properties?.opacity ?? 1,
              fillColor: feature.properties?.fillColor || '#1976d2',
              fillOpacity: feature.properties?.fillOpacity ?? 0.2
            };
          },
          onEachFeature: function(feature, layer) {
            featureGroup.addLayer(layer);
            addDoubleClickToLayer(layer);
            if (feature.properties) {
              layer.properties = { ...feature.properties };
              applyObjectProperties(layer, feature.properties);
              // --- Додаю застосування стилю лінії при завантаженні ---
              if (feature.geometry && feature.geometry.type === 'LineString' && feature.properties.style) {
                let dashArray = null;
                if (feature.properties.style === 'dashed') dashArray = '10, 10';
                else if (feature.properties.style === 'dotted') dashArray = '2, 8';
                layer.options.dashArray = dashArray;
                layer.setStyle({ dashArray });
              }
              // --- image ---
              if (feature.properties.image) {
                layer.properties.image = feature.properties.image;
              }
            }
          }
        });
      }
      // Відновлюємо зображення
      if (obj.images && Array.isArray(obj.images)) {
        featureGroup.images = [];
        obj.images.forEach(img => {
          let overlay;
          if (img.corners && img.corners.length === 4) {
            // Використовуємо corners для відновлення трансформації
            overlay = L.distortableImageOverlay(img.url, { 
              corners: img.corners, 
              selected: false 
            }).addTo(map);
          } else if (img.bounds) {
            // Fallback на bounds якщо corners немає
            overlay = L.distortableImageOverlay(img.url, { 
              bounds: img.bounds, 
              selected: false 
            }).addTo(map);
          } else {
            return; // Пропускаємо якщо немає ні corners, ні bounds
          }
          
          overlay._customUrl = img.url;
          // Відновлюємо властивості зображення
          if (img.properties) {
            overlay.properties = img.properties;
            applyObjectProperties(overlay, img.properties);
          }
          const el = overlay.getElement();
          if (el) {
            el.addEventListener('click', function(e) {
              e.stopPropagation();
              overlay.select();
            });
            // Додаємо подвійний клік для редагування
            el.addEventListener('dblclick', function(e) {
              e.stopPropagation();
              showEditModal(overlay);
            });
          }
          overlay.select();
          
          // Зберігаємо і corners, і bounds, і властивості
          const savedData = {
            url: img.url,
            bounds: overlay.getBounds(),
            corners: overlay.getCorners ? overlay.getCorners() : img.corners,
            properties: img.properties || {}
          };
          featureGroup.images.push(savedData);
          
          // --- Додаю overlay у масив overlays для відновлення ---
          if (!featureGroup.overlays) featureGroup.overlays = [];
          featureGroup.overlays.push(overlay);
          
          overlay.on('edit', () => {
            const idx = featureGroup.images.findIndex(i => i.url === img.url);
            if (idx !== -1) {
              featureGroup.images[idx].bounds = overlay.getBounds();
              featureGroup.images[idx].corners = overlay.getCorners ? overlay.getCorners() : null;
              saveLayersToStorage();
            }
          });
        });
      }
      const layerObj = { id: obj.id, tileLayer, featureGroup, tileType: obj.tileType, title: obj.title, visible: obj.visible !== false };
      customLayers.push(layerObj);
      const control = createLayerControl(layerObj);
      layerControlsDiv.appendChild(control);
      featureGroup.bringToFront();
    });
    // Активувати перший видимий шар
    const firstVisible = customLayers.find(l => l.visible);
    if (firstVisible) {
      activeLayer = firstVisible.featureGroup;
      if (drawControl && drawControl.options && drawControl.options.edit) {
        drawControl.options.edit.featureGroup = activeLayer;
      }
    } else {
      activeLayer = null;
    }
    updateActiveLayerUI();
    return true;
  } catch (e) {
    return false;
  }
}

function addLayer() {
  const tileType = "План";
  const tileLayer = createTileLayer(tileType, 1);
  const featureGroup = new L.FeatureGroup();
  tileLayer.addTo(map);
  featureGroup.addTo(map);
  const layerObj = { id: layerId, tileLayer, featureGroup, tileType, visible: true };
  customLayers.push(layerObj);
  const control = createLayerControl(layerObj);
  layerControlsDiv.appendChild(control);
  layerId++;
  // Явно активуємо новий шар
  activeLayer = featureGroup;
  // --- Додаємо drawControl, якщо його ще нема ---
  if (!drawControl) {
    drawControl = new L.Control.Draw({
      edit: {
        featureGroup: activeLayer
      },
      draw: {
        polygon: true,
        polyline: true,
        rectangle: true,
        circle: true,
        marker: true,
        circlemarker: false
      }
    });
    map.addControl(drawControl);
  } else {
    // Якщо drawControl вже є — онови featureGroup
    drawControl.options.edit.featureGroup = activeLayer;
  }
  updateActiveLayerUI();
  // Підняти малюнки над підкладкою
  featureGroup.bringToFront();
  saveLayersToStorage();
}
addLayerBtn.onclick = addLayer;

const loaded = loadLayersFromStorage();
if (!loaded || customLayers.length === 0) {
  addLayer();
}

// Ініціалізуємо модальне вікно редагування
initEditModal();

map.on(L.Draw.Event.CREATED, function (e) {
  if (activeLayer) {
    activeLayer.addLayer(e.layer);
    addDoubleClickToLayer(e.layer);
    // --- Додаємо дефолтні властивості ---
    const type = getObjectType(e.layer);
    e.layer.properties = e.layer.properties || {};
    if (type === 'marker') {
      e.layer.properties.color = '#1976d2';
    }
    e.layer.properties.name = '';
    e.layer.properties.description = '';
    if (e.layer.feature && e.layer.properties) {
      e.layer.feature.properties = { ...e.layer.properties };
    }
    saveLayersToStorage(); // Зберігаємо після додавання об'єкта
  } else {
    alert('Оберіть шар для малювання!');
  }
});

map.on('draw:editstart', function() {
  if (drawControl.options.edit) {
    drawControl.options.edit.featureGroup = activeLayer;
  }
});

map.on('draw:drawstart', function() {
  if (drawControl.options.edit) {
    drawControl.options.edit.featureGroup = activeLayer;
  }
});

// Зберігаємо після редагування об'єктів
map.on('draw:edited', function() {
  saveLayersToStorage();
});

// Зберігаємо після видалення об'єктів
map.on('draw:deleted', function() {
  saveLayersToStorage();
});

// --- Експорт/Імпорт всіх шарів ---
const exportAllBtn = document.getElementById('export-all');
const importAllBtn = document.getElementById('import-all');
const importAllInput = document.getElementById('import-all-input');

// Встановлюю іконки: експорт — fa-upload (⬆️), імпорт — fa-download (⬇️)
if (importAllBtn) {
  importAllBtn.innerHTML = '<i class="fa fa-download"></i>';
}
if (exportAllBtn) {
  exportAllBtn.innerHTML = '<i class="fa fa-upload"></i>';
}

exportAllBtn.onclick = () => {
  const all = customLayers.map(l => ({
    id: l.id,
    tileType: l.tileType,
    opacity: l.tileLayer.options.opacity,
    showLabels: l.tileLayer._url && l.tileLayer._url.includes('nolabels') ? false : true,
    geojson: l.featureGroup.toGeoJSON(),
    title: l.title || undefined,
    visible: l.visible !== false
  }));
  const blob = new Blob([JSON.stringify(all, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'layers.geojson';
  a.click();
  URL.revokeObjectURL(url);
};

importAllBtn.onclick = () => importAllInput.click();
importAllInput.onchange = e => {
  const file = importAllInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const data = JSON.parse(evt.target.result);
      if (Array.isArray(data)) {
        // старий варіант — масив шарів
        customLayers.forEach(l => {
          map.removeLayer(l.tileLayer);
          map.removeLayer(l.featureGroup);
        });
        customLayers = [];
        layerControlsDiv.innerHTML = '';
        data.forEach(obj => {
          const tileLayer = createTileLayer(obj.tileType, obj.opacity, obj.showLabels);
          const featureGroup = new L.FeatureGroup();
          tileLayer.addTo(map);
          featureGroup.addTo(map);
          if (obj.geojson) {
            L.geoJSON(obj.geojson, {
              pointToLayer: function(feature, latlng) {
                if (feature.properties && feature.properties.color) {
                  return L.marker(latlng, { icon: getColoredMarkerIcon(feature.properties.color) });
                }
                return L.marker(latlng);
              },
              style: function(feature) {
                return {
                  color: feature.properties?.color || '#1976d2',
                  weight: feature.properties?.weight || 3,
                  opacity: feature.properties?.opacity ?? 1,
                  fillColor: feature.properties?.fillColor || '#1976d2',
                  fillOpacity: feature.properties?.fillOpacity ?? 0.2
                };
              },
              onEachFeature: function(feature, layer) {
                featureGroup.addLayer(layer);
                addDoubleClickToLayer(layer);
                if (feature.properties) {
                  layer.properties = { ...feature.properties };
                  applyObjectProperties(layer, feature.properties);
                  // --- Додаю застосування стилю лінії при завантаженні ---
                  if (feature.geometry && feature.geometry.type === 'LineString' && feature.properties.style) {
                    let dashArray = null;
                    if (feature.properties.style === 'dashed') dashArray = '10, 10';
                    else if (feature.properties.style === 'dotted') dashArray = '2, 8';
                    layer.options.dashArray = dashArray;
                    layer.setStyle({ dashArray });
                  }
                  // --- image ---
                  if (feature.properties.image) {
                    layer.properties.image = feature.properties.image;
                  }
                }
              }
            });
          }
          // Відновлюємо зображення
          if (obj.images && Array.isArray(obj.images)) {
            featureGroup.images = [];
            obj.images.forEach(img => {
              let overlay;
              if (img.corners && img.corners.length === 4) {
                // Використовуємо corners для відновлення трансформації
                overlay = L.distortableImageOverlay(img.url, { 
                  corners: img.corners, 
                  selected: false 
                }).addTo(map);
              } else if (img.bounds) {
                // Fallback на bounds якщо corners немає
                overlay = L.distortableImageOverlay(img.url, { 
                  bounds: img.bounds, 
                  selected: false 
                }).addTo(map);
              } else {
                return; // Пропускаємо якщо немає ні corners, ні bounds
              }
              
              overlay._customUrl = img.url;
              // Відновлюємо властивості зображення
              if (img.properties) {
                overlay.properties = img.properties;
                applyObjectProperties(overlay, img.properties);
              }
              const el = overlay.getElement();
              if (el) {
                el.addEventListener('click', function(e) {
                  e.stopPropagation();
                  overlay.select();
                });
                // Додаємо подвійний клік для редагування
                el.addEventListener('dblclick', function(e) {
                  e.stopPropagation();
                  showEditModal(overlay);
                });
              }
              overlay.select();
              
              // Зберігаємо і corners, і bounds, і властивості
              const savedData = {
                url: img.url,
                bounds: overlay.getBounds(),
                corners: overlay.getCorners ? overlay.getCorners() : img.corners,
                properties: img.properties || {}
              };
              featureGroup.images.push(savedData);
              
              if (!featureGroup.overlays) featureGroup.overlays = [];
              featureGroup.overlays.push(overlay);
              
              overlay.on('edit', () => {
                const idx = featureGroup.images.findIndex(i => i.url === img.url);
                if (idx !== -1) {
                  featureGroup.images[idx].bounds = overlay.getBounds();
                  featureGroup.images[idx].corners = overlay.getCorners ? overlay.getCorners() : null;
                  saveLayersToStorage();
                }
              });
            });
          }
          const layerObj = { id: obj.id, tileLayer, featureGroup, tileType: obj.tileType, title: obj.title, visible: true };
          customLayers.push(layerObj);
        });
        customLayers.forEach(l => l.visible = true);
        layerControlsDiv.innerHTML = '';
        customLayers.forEach(l => {
          const control = createLayerControl(l);
          layerControlsDiv.appendChild(control);
        });
        if (customLayers.length === 0) {
          layerId = 1;
          addLayer();
        }
        saveLayersToStorage();
      } else if (
        data && typeof data === 'object' &&
        data.geojson && data.geojson.type &&
        (data.geojson.type === 'FeatureCollection' || data.geojson.type === 'Feature')
      ) {
        // імпорт з файлу з title + geojson
        const tileType = 'План';
        const tileLayer = createTileLayer(tileType, 1);
        const featureGroup = new L.FeatureGroup();
        tileLayer.addTo(map);
        featureGroup.addTo(map);
        L.geoJSON(data.geojson).eachLayer(l => featureGroup.addLayer(l));
        // --- Додаю імпорт зображень (images) ---
        if (data.images && Array.isArray(data.images)) {
          featureGroup.images = [];
          data.images.forEach(img => {
            let overlay;
            if (img.corners && img.corners.length === 4) {
              // Використовуємо corners для відновлення трансформації
              overlay = L.distortableImageOverlay(img.url, { 
                corners: img.corners, 
                selected: false 
              }).addTo(map);
            } else if (img.bounds) {
              // Fallback на bounds якщо corners немає
              overlay = L.distortableImageOverlay(img.url, { 
                bounds: img.bounds, 
                selected: false 
              }).addTo(map);
            } else {
              return; // Пропускаємо якщо немає ні corners, ні bounds
            }
            
            overlay._customUrl = img.url;
            // Відновлюємо властивості зображення
            if (img.properties) {
              overlay.properties = img.properties;
              applyObjectProperties(overlay, img.properties);
            }
            const el = overlay.getElement();
            if (el) {
              el.addEventListener('click', function(e) {
                e.stopPropagation();
                overlay.select();
              });
              // Додаємо подвійний клік для редагування
              el.addEventListener('dblclick', function(e) {
                e.stopPropagation();
                showEditModal(overlay);
              });
            }
            overlay.select();
            
            // Зберігаємо і corners, і bounds, і властивості
            const savedData = {
              url: img.url,
              bounds: overlay.getBounds(),
              corners: overlay.getCorners ? overlay.getCorners() : img.corners,
              properties: img.properties || {}
            };
            featureGroup.images.push(savedData);
            
            if (!featureGroup.overlays) featureGroup.overlays = [];
            featureGroup.overlays.push(overlay);
            
            overlay.on('edit', () => {
              const idx = featureGroup.images.findIndex(i => i.url === img.url);
              if (idx !== -1) {
                featureGroup.images[idx].bounds = overlay.getBounds();
                featureGroup.images[idx].corners = overlay.getCorners ? overlay.getCorners() : null;
                saveLayersToStorage();
              }
            });
          });
        }
        const layerObj = { id: layerId, tileLayer, featureGroup, tileType, title: data.title, visible: true };
        customLayers.push(layerObj);
        const control = createLayerControl(layerObj);
        layerControlsDiv.appendChild(control);
        layerId++;
        activeLayer = featureGroup;
        updateActiveLayerUI();
        if (drawControl) {
          map.removeControl(drawControl);
        }
        drawControl = new L.Control.Draw({
          edit: { featureGroup: activeLayer },
          draw: {
            polygon: true,
            polyline: true,
            rectangle: true,
            circle: true,
            marker: true,
            circlemarker: false
          }
        });
        map.addControl(drawControl);
        featureGroup.bringToFront();
        saveLayersToStorage();
      } else if (data && data.type && (data.type === 'FeatureCollection' || data.type === 'Feature')) {
        // новий варіант — один GeoJSON
        const tileType = 'План';
        const tileLayer = createTileLayer(tileType, 1);
        const featureGroup = new L.FeatureGroup();
        tileLayer.addTo(map);
        featureGroup.addTo(map);
        L.geoJSON(data).eachLayer(l => featureGroup.addLayer(l));
        // --- Додаю імпорт зображень (images) ---
        if (data.images && Array.isArray(data.images)) {
          featureGroup.images = [];
          data.images.forEach(img => {
            let overlay;
            if (img.corners && img.corners.length === 4) {
              // Використовуємо corners для відновлення трансформації
              overlay = L.distortableImageOverlay(img.url, { 
                corners: img.corners, 
                selected: false 
              }).addTo(map);
            } else if (img.bounds) {
              // Fallback на bounds якщо corners немає
              overlay = L.distortableImageOverlay(img.url, { 
                bounds: img.bounds, 
                selected: false 
              }).addTo(map);
            } else {
              return; // Пропускаємо якщо немає ні corners, ні bounds
            }
            
            overlay._customUrl = img.url;
            // Відновлюємо властивості зображення
            if (img.properties) {
              overlay.properties = img.properties;
              applyObjectProperties(overlay, img.properties);
            }
            const el = overlay.getElement();
            if (el) {
              el.addEventListener('click', function(e) {
                e.stopPropagation();
                overlay.select();
              });
              // Додаємо подвійний клік для редагування
              el.addEventListener('dblclick', function(e) {
                e.stopPropagation();
                showEditModal(overlay);
              });
            }
            overlay.select();
            
            // Зберігаємо і corners, і bounds, і властивості
            const savedData = {
              url: img.url,
              bounds: overlay.getBounds(),
              corners: overlay.getCorners ? overlay.getCorners() : img.corners,
              properties: img.properties || {}
            };
            featureGroup.images.push(savedData);
            
            if (!featureGroup.overlays) featureGroup.overlays = [];
            featureGroup.overlays.push(overlay);
            
            overlay.on('edit', () => {
              const idx = featureGroup.images.findIndex(i => i.url === img.url);
              if (idx !== -1) {
                featureGroup.images[idx].bounds = overlay.getBounds();
                featureGroup.images[idx].corners = overlay.getCorners ? overlay.getCorners() : null;
                saveLayersToStorage();
              }
            });
          });
        }
        const layerObj = { id: layerId, tileLayer, featureGroup, tileType, visible: true };
        customLayers.push(layerObj);
        const control = createLayerControl(layerObj);
        layerControlsDiv.appendChild(control);
        layerId++;
        activeLayer = featureGroup;
        updateActiveLayerUI();
        if (drawControl) {
          map.removeControl(drawControl);
        }
        drawControl = new L.Control.Draw({
          edit: { featureGroup: activeLayer },
          draw: {
            polygon: true,
            polyline: true,
            rectangle: true,
            circle: true,
            marker: true,
            circlemarker: false
          }
        });
        map.addControl(drawControl);
        featureGroup.bringToFront();
        saveLayersToStorage();
      } else {
        alert('Невідомий формат файлу');
      }
    } catch (err) {
      alert('Помилка імпорту шарів');
    }
  };
  reader.readAsText(file);
}; 

window._customConfirm = function(msg) {
  return new Promise(resolve => {
    // overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(30, 41, 59, 0.35)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;
    overlay.style.backdropFilter = 'blur(2px)';

    // dialog
    const dialog = document.createElement('div');
    dialog.style.background = '#fff';
    dialog.style.padding = '32px 36px 24px 36px';
    dialog.style.borderRadius = '14px';
    dialog.style.boxShadow = '0 4px 32px rgba(30,41,59,0.18)';
    dialog.style.textAlign = 'center';
    dialog.style.minWidth = '320px';
    dialog.style.maxWidth = '90vw';
    dialog.style.fontFamily = 'system-ui, Arial, sans-serif';
    dialog.innerHTML = `
      <div style="font-size:1.15em; color:#1e293b; margin-bottom: 22px; font-weight: 500;">${msg}</div>
      <div style="display:flex; gap:18px; justify-content:center;">
        <button id="confirm-yes" style="background:#1976d2;color:#fff;border:none;padding:8px 28px;border-radius:6px;font-size:1em;cursor:pointer;box-shadow:0 1px 4px #1976d222;transition:background 0.15s;">Так</button>
        <button id="confirm-no" style="background:#e3eaf5;color:#1976d2;border:none;padding:8px 28px;border-radius:6px;font-size:1em;cursor:pointer;transition:background 0.15s;">Скасувати</button>
      </div>
    `;
    dialog.querySelector('#confirm-yes').onmouseover = () => dialog.querySelector('#confirm-yes').style.background = '#1565c0';
    dialog.querySelector('#confirm-yes').onmouseout = () => dialog.querySelector('#confirm-yes').style.background = '#1976d2';
    dialog.querySelector('#confirm-no').onmouseover = () => dialog.querySelector('#confirm-no').style.background = '#cfd8dc';
    dialog.querySelector('#confirm-no').onmouseout = () => dialog.querySelector('#confirm-no').style.background = '#e3eaf5';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    dialog.querySelector('#confirm-yes').onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
    };
    dialog.querySelector('#confirm-no').onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };
    overlay.tabIndex = -1;
    overlay.focus();
    overlay.onkeydown = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        resolve(false);
      }
    };
    setTimeout(() => overlay.focus(), 10);
  });
};

window.requestOverlayDelete = function(overlay) {
  window._customConfirm('Ви впевнені? Зображення буде повністю видалене з мапи.').then(confirmed => {
    if (!confirmed) return;

    // знайти потрібний layer (featureGroup)
    let foundLayer = null;
    for (const l of customLayers) {
      if (
        l.featureGroup &&
        l.featureGroup.overlays &&
        l.featureGroup.overlays.some(ov => ov._url === overlay._overlay._url)
      ) {
        foundLayer = l.featureGroup;
        break;
      }
    }

    // видалити overlay з карти
    const ovUrl = overlay._overlay._url;
    const realOverlay = foundLayer.overlays.find(ov => (ov._url) === ovUrl);
    if (realOverlay) {
      map.removeLayer(realOverlay);
    }

    // видалити overlay з overlays
    if (foundLayer && foundLayer.overlays) {
      foundLayer.overlays = foundLayer.overlays.filter(ov => ov._url !== overlay._overlay._url);
    }

    // видалити з images (по url, _url або _image.src)
    if (foundLayer && foundLayer.images) {
      const ovUrl = overlay._overlay._url;
      foundLayer.images = foundLayer.images.filter(img => img.url !== ovUrl);
    }

    // оновити localStorage
    saveLayersToStorage();
  });
};

// --- Функції для роботи з модальним вікном редагування об'єктів ---
let currentEditingObject = null;

// Функція для отримання типу об'єкта
function getObjectType(layer) {
  if (layer instanceof L.Marker) return 'marker';
  if (layer instanceof L.Polygon) return 'polygon';
  if (layer instanceof L.Polyline) return 'polyline';
  if (layer instanceof L.Circle) return 'circle';
  if (layer instanceof L.Rectangle) return 'rectangle';
  if (layer._overlay && layer._overlay._image) return 'image';
  return 'unknown';
}

// Функція для отримання властивостей об'єкта
function getObjectProperties(layer) {
  const type = getObjectType(layer);
  const properties = {
    name: layer.properties?.name || '',
    description: layer.properties?.description || ''
  };
  
  if (type === 'marker') {
    properties.color = layer.options?.color || '#1976d2';
    properties.icon = layer.properties?.icon || 'place';
  } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
    properties.fillColor = layer.options?.fillColor || '#1976d2';
    properties.color = layer.options?.color || '#1976d2';
    properties.fillOpacity = layer.options?.fillOpacity || 0.2;
    properties.opacity = layer.options?.opacity || 1;
  } else if (type === 'polyline') {
    properties.color = layer.options?.color || '#1976d2';
    properties.weight = layer.options?.weight || 3;
    properties.opacity = layer.options?.opacity || 1;
  } else if (type === 'image') {
    properties.opacity = layer._overlay?.options?.opacity || 1;
  }
  
  if (layer.properties?.image) properties.image = layer.properties.image;
  
  return properties;
}

// --- Масив Material Icons для автокомпліту ---
const materialIcons = [
  'place','home','star','flag','search','person','location_on','directions_bike','restaurant','local_cafe','school','park','favorite','work','email','phone','event','alarm','build','camera','chat','check','close','cloud','delete','done','edit','explore','face','help','info','lock','map','menu','pets','print','save','send','settings','shopping_cart','visibility','warning','wifi','zoom_in','zoom_out','youtube_searched_for','directions_car','directions_bus','directions_walk','directions_run','directions_boat','directions_railway','directions_subway','directions_transit','directions_ferry','directions','account_circle','account_box','add','remove','arrow_forward','arrow_back','arrow_upward','arrow_downward','attach_money','attach_file','battery_full','brightness_7','brightness_4','calendar_today','call','check_circle','chevron_left','chevron_right','clear','code','compare','create','credit_card','dashboard','data_usage','delete_forever','desktop_mac','directions_railway_filled','directions_subway_filled','directions_transit_filled','directions_bike','directions_boat_filled','directions_bus_filled','directions_car_filled','directions_ferry_filled','directions_run_filled','directions_walk_filled','edit_location','emoji_emotions','emoji_events','emoji_flags','emoji_food_beverage','emoji_nature','emoji_objects','emoji_people','emoji_symbols','emoji_transportation','engineering','expand_less','expand_more','explore_off','extension','face_retouching_natural','fast_forward','fast_rewind','favorite_border','feedback','file_copy','filter_list','find_in_page','find_replace','fingerprint','fitness_center','flight','folder','folder_open','format_align_center','format_align_justify','format_align_left','format_align_right','format_bold','format_clear','format_color_fill','format_color_reset','format_color_text','format_indent_decrease','format_indent_increase','format_italic','format_line_spacing','format_list_bulleted','format_list_numbered','format_paint','format_quote','format_shapes','format_size','format_strikethrough','format_textdirection_l_to_r','format_textdirection_r_to_l','format_underlined','forum','forward','free_breakfast','fullscreen','fullscreen_exit','functions','g_translate','gamepad','games','gavel','gesture','get_app','gif','golf_course','gps_fixed','gps_not_fixed','gps_off','grade','gradient','grain','graphic_eq','grid_off','grid_on','group','group_add','group_work','hd','hdr_off','hdr_on','hdr_strong','hdr_weak','headset','headset_mic','healing','hearing','help_outline','highlight','high_quality','history','home_work','horizontal_split','hot_tub','hotel','hourglass_empty','hourglass_full','how_to_reg','how_to_vote','http','https','image','image_aspect_ratio','image_search','import_contacts','import_export','important_devices','inbox','indeterminate_check_box','info_outline','input','insert_chart','insert_chart_outlined','insert_comment','insert_drive_file','insert_emoticon','insert_invitation','insert_link','insert_photo','invert_colors','iso','keyboard','keyboard_arrow_down','keyboard_arrow_left','keyboard_arrow_right','keyboard_arrow_up','keyboard_backspace','keyboard_capslock','keyboard_hide','keyboard_return','keyboard_tab','keyboard_voice','kitchen','label','label_important','label_off','landscape','language','laptop','laptop_chromebook','laptop_mac','laptop_windows','last_page','launch','layers','layers_clear','leak_add','leak_remove','lens','library_add','library_books','library_music','lightbulb','line_style','line_weight','linear_scale','link','link_off','list','live_help','live_tv','local_activity','local_airport','local_atm','local_bar','local_cafe','local_car_wash','local_convenience_store','local_dining','local_drink','local_florist','local_gas_station','local_grocery_store','local_hospital','local_hotel','local_laundry_service','local_library','local_mall','local_movies','local_offer','local_parking','local_pharmacy','local_phone','local_pizza','local_play','local_post_office','local_printshop','local_see','local_shipping','local_taxi','location_city','location_disabled','location_off','location_on','location_searching','lock_open','lock_outline','looks','looks_3','looks_4','looks_5','looks_6','looks_one','looks_two','loop','loupe','low_priority','loyalty','mail','mail_outline','map','markunread','markunread_mailbox','maximize','meeting_room','memory','menu_book','merge_type','message','mic','mic_none','mic_off','minimize','missed_video_call','mms','mobile_friendly','mobile_off','mobile_screen_share','money','money_off','monochrome_photos','mood','mood_bad','more','more_horiz','more_vert','motorcycle','mouse','move_to_inbox','movie','movie_creation','movie_filter','multiline_chart','music_note','music_off','music_video','my_location','nature','nature_people','navigate_before','navigate_next','navigation','near_me','network_cell','network_check','network_locked','network_wifi','new_releases','next_week','nfc','nights_stay','no_encryption','no_meeting_room','no_sim','not_interested','note','note_add','notes','notification_important','notifications','notifications_active','notifications_none','notifications_off','notifications_paused','offline_bolt','offline_pin','ondemand_video','opacity','open_in_browser','open_in_new','open_with','outdoor_grill','outlined_flag','pages','pageview','palette','pan_tool','panorama','panorama_fish_eye','panorama_horizontal','panorama_vertical','panorama_wide_angle','party_mode','pause','pause_circle_filled','pause_circle_outline','payment','people','people_alt','people_outline','perm_camera_mic','perm_contact_calendar','perm_data_setting','perm_device_information','perm_identity','perm_media','perm_phone_msg','perm_scan_wifi','person_add','person_add_disabled','person_outline','person_pin','person_pin_circle','person_remove','person_remove_alt_1','person_search','pets','phone','phone_android','phone_bluetooth_speaker','phone_callback','phone_disabled','phone_enabled','phone_forwarded','phone_in_talk','phone_iphone','phone_locked','phone_missed','phone_paused','phonelink','phonelink_erase','phonelink_lock','phonelink_off','phonelink_ring','phonelink_setup','photo','photo_album','photo_camera','photo_filter','photo_library','photo_size_select_actual','photo_size_select_large','photo_size_select_small','picture_as_pdf','picture_in_picture','picture_in_picture_alt','pie_chart','pin_drop','place','play_arrow','play_circle_filled','play_circle_outline','play_for_work','playlist_add','playlist_add_check','playlist_play','plus_one','poll','polymer','pool','portable_wifi_off','portrait','post_add','power','power_input','power_off','power_settings_new','pregnant_woman','present_to_all','print','priority_high','public','publish','query_builder','question_answer','queue','queue_music','queue_play_next','radio','radio_button_checked','radio_button_unchecked','rate_review','receipt','recent_actors','record_voice_over','redeem','redo','refresh','remove','remove_circle','remove_circle_outline','remove_from_queue','remove_red_eye','remove_shopping_cart','reorder','repeat','repeat_one','replay','replay_10','replay_30','replay_5','reply','reply_all','report','report_off','report_problem','restaurant','restaurant_menu','restore','restore_from_trash','restore_page','ring_volume','room','rotate_90_degrees_ccw','rotate_left','rotate_right','rounded_corner','router','rowing','rss_feed','rv_hookup','satellite','save','save_alt','scanner','scatter_plot','schedule','school','score','screen_lock_landscape','screen_lock_portrait','screen_lock_rotation','screen_rotation','screen_share','sd_card','sd_storage','search','security','select_all','send','sentiment_dissatisfied','sentiment_neutral','sentiment_satisfied','sentiment_very_dissatisfied','sentiment_very_satisfied','settings','settings_applications','settings_backup_restore','settings_bluetooth','settings_brightness','settings_cell','settings_ethernet','settings_input_antenna','settings_input_component','settings_input_composite','settings_input_hdmi','settings_input_svideo','settings_overscan','settings_phone','settings_power','settings_remote','settings_system_daydream','settings_voice','share','shop','shop_two','shopping_basket','shopping_cart','short_text','show_chart','shuffle','signal_cellular_4_bar','signal_cellular_connected_no_internet_4_bar','signal_cellular_no_sim','signal_cellular_null','signal_cellular_off','signal_wifi_4_bar','signal_wifi_4_bar_lock','signal_wifi_off','sim_card','skip_next','skip_previous','slideshow','slow_motion_video','smartphone','smoke_free','smoking_rooms','sms','sms_failed','snooze','sort','sort_by_alpha','spa','space_bar','speaker','speaker_group','speaker_notes','speaker_notes_off','speaker_phone','spellcheck','star','star_border','star_half','stars','stay_current_landscape','stay_current_portrait','stay_primary_landscape','stay_primary_portrait','stop','stop_screen_share','storage','store','store_mall_directory','straighten','streetview','strikethrough_s','style','subdirectory_arrow_left','subdirectory_arrow_right','subject','subscriptions','subtitles','subway','supervised_user_circle','supervisor_account','surround_sound','swap_calls','swap_horiz','swap_vert','swap_vertical_circle','switch_camera','switch_video','sync','sync_disabled','sync_problem','system_update','tab','tab_unselected','table_chart','tablet','tablet_android','tablet_mac','tag_faces','tap_and_play','terrain','text_fields','text_format','text_rotate_up','text_rotate_vertical','text_rotation_angledown','text_rotation_angleup','text_rotation_down','text_rotation_none','textsms','texture','theaters','thumb_down','thumb_up','thumbs_up_down','time_to_leave','timelapse','timeline','timer','timer_10','timer_3','timer_off','title','toc','today','toggle_off','toggle_on','toll','tonality','touch_app','toys','track_changes','traffic','train','tram','transfer_within_a_station','transform','transit_enterexit','translate','trending_down','trending_flat','trending_up','trip_origin','tune','turned_in','turned_in_not','tv','unarchive','undo','unfold_less','unfold_more','universal_access','unsubscribe','update','usb','verified_user','vertical_align_bottom','vertical_align_center','vertical_align_top','vibration','video_call','video_label','video_library','videocam','videocam_off','videogame_asset','view_agenda','view_array','view_carousel','view_column','view_comfy','view_compact','view_day','view_headline','view_list','view_module','view_quilt','view_stream','view_week','vignette','visibility','visibility_off','voice_chat','voicemail','volume_down','volume_mute','volume_off','volume_up','vpn_key','vpn_lock','wallpaper','warning','watch','watch_later','wb_auto','wb_cloudy','wb_incandescent','wb_iridescent','wb_sunny','wc','web','web_asset','weekend','whatshot','where_to_vote','widgets','wifi','wifi_lock','wifi_tethering','work','work_off','work_outline','wrap_text','youtube_searched_for','zoom_in','zoom_out'];

// --- Автокомпліт для інпуту іконки маркера ---
function setupMarkerIconAutocomplete() {
  const input = document.getElementById('marker-icon');
  const list = document.getElementById('marker-icon-autocomplete');
  const preview = document.getElementById('marker-icon-preview');
  if (!input || !list || !preview) return;
  let currentFocus = -1;
  input.oninput = function() {
    const val = input.value.trim().toLowerCase();
    list.innerHTML = '';
    if (!val) return;
    const matches = materialIcons.filter(name => name.includes(val)).slice(0, 10);
    matches.forEach(name => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.innerHTML = `<span class="material-icons">${name}</span> ${name}`;
      item.onclick = function() {
        input.value = name;
        preview.textContent = name;
        list.innerHTML = '';
        if (currentEditingObject) {
          currentEditingObject.properties = currentEditingObject.properties || {};
          currentEditingObject.properties.icon = name;
          applyObjectProperties(currentEditingObject, currentEditingObject.properties);
        }
      };
      list.appendChild(item);
    });
  };
  input.onfocus = input.oninput;
  input.onkeydown = function(e) {
    const items = list.querySelectorAll('.autocomplete-item');
    if (e.key === 'ArrowDown') {
      currentFocus++;
      if (currentFocus >= items.length) currentFocus = 0;
      items.forEach((el, i) => el.classList.toggle('active', i === currentFocus));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      currentFocus--;
      if (currentFocus < 0) currentFocus = items.length - 1;
      items.forEach((el, i) => el.classList.toggle('active', i === currentFocus));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (currentFocus > -1 && items[currentFocus]) {
        items[currentFocus].click();
        e.preventDefault();
      }
    }
  };
  document.addEventListener('click', function(e) {
    if (e.target !== input) list.innerHTML = '';
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
  if (!layer.properties) layer.properties = {};
  layer.properties.name = properties.name;
  layer.properties.description = properties.description;
  if (type === 'marker') {
    const iconName = properties.icon || 'place';
    layer.setIcon(getColoredMarkerIcon(properties.color, iconName));
    layer.properties.color = properties.color;
    layer.properties.icon = iconName;
    layer.options.color = properties.color;
  } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
    layer.setStyle({
      fillColor: properties.fillColor,
      color: properties.color,
      fillOpacity: properties.fillOpacity,
      opacity: properties.opacity
    });
  } else if (type === 'polyline') {
    layer.setStyle({
      color: properties.color,
      weight: properties.weight,
      opacity: properties.opacity
    });
  } else if (type === 'image') {
    if (layer._overlay) {
      layer._overlay.setOpacity(properties.opacity);
    }
  }
}

// Функція для показу модального вікна
function showEditModal(layer) {
  currentEditingObject = layer;
  const type = getObjectType(layer);
  const properties = getObjectProperties(layer);
  
  // Оновлюємо заголовок
  const modalTitle = document.getElementById('modal-title');
  if (modalTitle) {
    modalTitle.textContent = `Редагування ${type === 'marker' ? 'маркера' : type === 'polygon' ? 'полігону' : type === 'polyline' ? 'полілінії' : type === 'image' ? 'зображення' : 'об\'єкта'}`;
  }
  
  // Заповнюємо поля
  const objectName = document.getElementById('object-name');
  if (objectName) objectName.value = properties.name;
  const objectDescription = document.getElementById('object-description');
  if (objectDescription) objectDescription.value = properties.description;

  // Групи контролів
  const colorPickerGroup = document.getElementById('color-picker-group');
  const lineWidthGroup = document.getElementById('line-width-group');
  const styleGroup = document.getElementById('style-group');
  const opacityGroup = document.getElementById('opacity-group');
  const imageGroup = document.getElementById('image-group');
  const markerIconGroup = document.getElementById('marker-icon-group');
  
  // Приховуємо всі групи
  [colorPickerGroup, lineWidthGroup, styleGroup, opacityGroup, imageGroup, markerIconGroup].forEach(group => {
    if (group) group.style.display = 'none';
  });
  
  // Показуємо відповідні групи залежно від типу
  if (type === 'marker') {
    if (colorPickerGroup) colorPickerGroup.style.display = 'block';
    if (markerIconGroup) markerIconGroup.style.display = 'block';
    // Встановити значення інпуту та превʼю
    const markerIconInput = document.getElementById('marker-icon');
    const markerIconPreview = document.getElementById('marker-icon-preview');
    if (markerIconInput && markerIconPreview) {
      markerIconInput.value = properties.icon || 'place';
      markerIconPreview.textContent = markerIconInput.value;
      markerIconInput.oninput = function() {
        markerIconPreview.textContent = markerIconInput.value;
        if (currentEditingObject) {
          currentEditingObject.properties = currentEditingObject.properties || {};
          currentEditingObject.properties.icon = markerIconInput.value;
          applyObjectProperties(currentEditingObject, currentEditingObject.properties);
        }
      };
      setupMarkerIconAutocomplete();
    }
  } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
    if (colorPickerGroup) colorPickerGroup.style.display = 'block';
    if (opacityGroup) opacityGroup.style.display = 'block';
  } else if (type === 'polyline') {
    if (colorPickerGroup) colorPickerGroup.style.display = 'block';
    if (lineWidthGroup) lineWidthGroup.style.display = 'block';
    if (styleGroup) styleGroup.style.display = 'block';
    // opacityGroup не показуємо для polyline
  } else if (type === 'image') {
    if (imageGroup) imageGroup.style.display = 'block';
    if (opacityGroup) opacityGroup.style.display = 'block';
  }

  // Заповнюємо значення контролів
  // Колір
  const objectColorInput = document.getElementById('object-color');
  if (objectColorInput) objectColorInput.value = properties.color || properties.fillColor || '#1976d2';
  // Товщина
  const lineWidth = document.getElementById('line-width');
  const lineWidthValue = document.getElementById('line-width-value');
  if (lineWidth && lineWidthValue && properties.weight) {
    lineWidth.value = properties.weight;
    lineWidthValue.textContent = properties.weight + 'px';
  }
  // Стиль лінії (за замовчуванням solid)
  const lineStyle = document.getElementById('line-style');
  if (lineStyle) lineStyle.value = properties.style || 'solid';
  // Прозорість
  const objectOpacity = document.getElementById('object-opacity');
  const opacityValue = document.getElementById('opacity-value');
  if (objectOpacity && opacityValue) {
    let opacity = properties.opacity;
    if (type === 'polygon' || type === 'circle' || type === 'rectangle') opacity = properties.fillOpacity;
    objectOpacity.value = opacity ?? 1;
    opacityValue.textContent = Math.round((opacity ?? 1) * 100) + '%';
  }

  // --- Додаю інтерактивність для вибору кольору ---
  if (colorPickerGroup && (type === 'polyline' || type === 'marker' || type === 'polygon' || type === 'circle' || type === 'rectangle')) {
    const colorPalette = document.getElementById('color-palette');
    const objectColorInput = document.getElementById('object-color');
    if (colorPalette && objectColorInput) {
      // Клік по swatch
      colorPalette.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.onclick = function() {
          colorPalette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
          swatch.classList.add('selected');
          objectColorInput.value = swatch.dataset.color;
          if (currentEditingObject) {
            currentEditingObject.properties = currentEditingObject.properties || {};
            currentEditingObject.properties.color = swatch.dataset.color;
            if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
              currentEditingObject.properties.fillColor = swatch.dataset.color;
            }
            applyObjectProperties(currentEditingObject, currentEditingObject.properties);
          }
        };
      });
      // Зміна через color picker
      objectColorInput.oninput = function(e) {
        colorPalette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        if (currentEditingObject) {
          currentEditingObject.properties = currentEditingObject.properties || {};
          currentEditingObject.properties.color = e.target.value;
          if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
            currentEditingObject.properties.fillColor = e.target.value;
          }
          applyObjectProperties(currentEditingObject, currentEditingObject.properties);
        }
      };
    }
  }

  // --- Додаю інтерактивність для вибору стилю лінії ---
  if (type === 'polyline') {
    const lineStyle = document.getElementById('line-style');
    if (lineStyle && currentEditingObject) {
      lineStyle.onchange = function(e) {
        let dashArray = null;
        if (e.target.value === 'dashed') dashArray = '10, 10';
        else if (e.target.value === 'dotted') dashArray = '2, 8';
        // Оновлюємо властивість
        currentEditingObject.options.dashArray = dashArray;
        currentEditingObject.setStyle({ dashArray });
        currentEditingObject.properties = currentEditingObject.properties || {};
        currentEditingObject.properties.style = e.target.value;
        saveLayersToStorage(); // одразу зберігаємо стиль
      };
      // Встановити стиль при відкритті модалки
      let dashArray = null;
      if (lineStyle.value === 'dashed') dashArray = '10, 10';
      else if (lineStyle.value === 'dotted') dashArray = '2, 8';
      currentEditingObject.setStyle({ dashArray });
      currentEditingObject.options.dashArray = dashArray;
    }
  }
  
  // Показуємо модальне вікно
  const editModal = document.getElementById('edit-object-modal');
  if (editModal) editModal.classList.remove('hidden');

  // --- Зображення ---
  const imageInput = document.getElementById('object-image');
  const imagePreviewContainer = document.getElementById('object-image-preview-container');
  const imagePreview = document.getElementById('object-image-preview');
  const imageRemoveBtn = document.getElementById('object-image-remove');
  // показати preview, якщо є
  if (properties.image) {
    imagePreview.src = properties.image;
    imagePreviewContainer.classList.remove('hidden');
    if (imageInput) imageInput.classList.add('hidden');
  } else {
    imagePreview.src = '';
    imagePreviewContainer.classList.add('hidden');
    if (imageInput) imageInput.classList.remove('hidden');
  }
  // вибір нового зображення
  if (imageInput) {
    imageInput.value = '';
    imageInput.onchange = function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        imagePreview.src = evt.target.result;
        imagePreviewContainer.classList.remove('hidden');
        if (imageInput) imageInput.classList.add('hidden');
        if (currentEditingObject) {
          currentEditingObject.properties = currentEditingObject.properties || {};
          currentEditingObject.properties.image = evt.target.result;
        }
      };
      reader.readAsDataURL(file);
    };
  }
  // видалення зображення
  if (imageRemoveBtn) {
    imageRemoveBtn.onclick = function() {
      imagePreview.src = '';
      imagePreviewContainer.classList.add('hidden');
      if (imageInput) imageInput.classList.remove('hidden');
      if (currentEditingObject) {
        currentEditingObject.properties = currentEditingObject.properties || {};
        delete currentEditingObject.properties.image;
      }
    };
  }
}

// Функція для закриття модального вікна
function closeEditModal() {
  const editModal = document.getElementById('edit-object-modal');
  if (editModal) editModal.classList.add('hidden');
  currentEditingObject = null;
}

// Функція для збереження змін
function saveObjectChanges() {
  if (!currentEditingObject) return;
  
  const type = getObjectType(currentEditingObject);
  const properties = {
    name: document.getElementById('object-name').value,
    description: document.getElementById('object-description').value
  };
  
  if (type === 'marker') {
    const markerColor = document.getElementById('object-color');
    if (markerColor) properties.color = markerColor.value;
    const markerIcon = document.getElementById('marker-icon');
    if (markerIcon) properties.icon = markerIcon.value;
  } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
    const fillColor = document.getElementById('object-color');
    if (fillColor) properties.fillColor = fillColor.value;
    // Для полігонів колір рамки та прозорість можна додати за потреби
    properties.color = fillColor ? fillColor.value : undefined;
    const objectOpacity = document.getElementById('object-opacity');
    if (objectOpacity) properties.fillOpacity = parseFloat(objectOpacity.value);
    properties.opacity = 1;
  } else if (type === 'polyline') {
    const objectColor = document.getElementById('object-color');
    if (objectColor) properties.color = objectColor.value;
    const lineWidth = document.getElementById('line-width');
    if (lineWidth) properties.weight = parseInt(lineWidth.value);
    const lineStyle = document.getElementById('line-style');
    if (lineStyle) properties.style = lineStyle.value;
    // opacity не зчитуємо для polyline
  } else if (type === 'image') {
    const objectOpacity = document.getElementById('object-opacity');
    if (objectOpacity) properties.opacity = parseFloat(objectOpacity.value);
  }
  
  // зображення
  const imagePreview = document.getElementById('object-image-preview');
  if (imagePreview && imagePreview.src && !imagePreview.classList.contains('hidden')) {
    properties.image = imagePreview.src;
  }
  
  applyObjectProperties(currentEditingObject, properties);
  // --- Додаємо копіювання у feature.properties ---
  if (currentEditingObject.feature && currentEditingObject.properties) {
    currentEditingObject.feature.properties = { ...currentEditingObject.properties };
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
  
  // Обробники для range слайдерів
  document.getElementById('line-width').addEventListener('input', function() {
    document.getElementById('line-width-value').textContent = this.value;
  });
  
  document.getElementById('object-opacity').addEventListener('input', function() {
    document.getElementById('opacity-value').textContent = Math.round(this.value * 100) + '%';
  });
  
  // Закриття по кліку поза модальним вікном
  document.getElementById('edit-object-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeEditModal();
    }
  });
  
  // Закриття по Escape
  document.addEventListener('keydown', function(e) {
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
    if (properties.name) html += `<div class='tooltip-title'>${properties.name}</div>`;
    if (properties.description) html += `<div class='tooltip-desc'>${properties.description}</div>`;
    if (properties.image) html += `<div class='tooltip-img-wrap'><img src='${properties.image}' class='tooltip-img' /></div>`;
    // можна додати ще інші властивості
    return html || '<span class="tooltip-empty">(немає даних)</span>';
  }
  function showTooltip(e) {
    const props = layer.properties || {};
    const html = getTooltipHtml(props);
    layer.bindTooltip(html, {direction:'top', sticky:true, className:'custom-tooltip', opacity:1}).openTooltip(e.latlng || undefined);
  }
  function hideTooltip() {
    layer.closeTooltip();
  }
  layer.on('mouseover', showTooltip);
  layer.on('mouseout', hideTooltip);
  // --- подвійний клік ---
  if (type === 'marker') {
    layer.on('add', function() {
      const el = layer.getElement && layer.getElement();
      if (el) {
        el.addEventListener('dblclick', function(e) {
          e.stopPropagation();
          showEditModal(layer);
        });
      }
    });
    const el = layer.getElement && layer.getElement();
    if (el) {
      el.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        showEditModal(layer);
      });
    }
  } else {
    layer.on('dblclick', function(e) {
      if (e.originalEvent) e.originalEvent.stopPropagation();
      showEditModal(layer);
    });
  }
}