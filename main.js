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
}

// --- Оновлюю saveLayersToStorage ---
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
  
  return properties;
}

// SVG-іконка маркера з кастомним кольором
function getColoredMarkerIcon(color = "#1976d2") {
  const svg = encodeURIComponent(`
    <svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 11.046 16 32 16 32s16-20.954 16-32C32 7.163 24.837 0 16 0z" fill="${color}"/>
      <circle cx="16" cy="16" r="7" fill="#fff"/>
    </svg>
  `);
  return L.icon({
    iconUrl: "data:image/svg+xml;utf8," + svg,
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [0, -40]
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
    layer.setIcon(getColoredMarkerIcon(properties.color));
    layer.properties.color = properties.color;
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
  document.getElementById('modal-title').textContent = `Редагування ${type === 'marker' ? 'маркера' : type === 'polygon' ? 'полігону' : type === 'polyline' ? 'полілінії' : type === 'image' ? 'зображення' : 'об\'єкта'}`;
  
  // Заповнюємо поля
  document.getElementById('object-name').value = properties.name;
  document.getElementById('object-description').value = properties.description;
  
  // Показуємо/приховуємо відповідні групи полів
  const lineColorGroup = document.getElementById('line-color-group');
  const fillColorGroup = document.getElementById('fill-color-group');
  const borderColorGroup = document.getElementById('border-color-group');
  const markerColorGroup = document.getElementById('marker-color-group');
  const lineWidthGroup = document.getElementById('line-width-group');
  const opacityGroup = document.getElementById('opacity-group');
  
  // Приховуємо всі групи
  [lineColorGroup, fillColorGroup, borderColorGroup, markerColorGroup, lineWidthGroup, opacityGroup].forEach(group => {
    group.style.display = 'none';
  });
  
  // Показуємо відповідні групи залежно від типу
  if (type === 'marker') {
    markerColorGroup.style.display = 'block';
    document.getElementById('marker-color').value = properties.color;
  } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
    fillColorGroup.style.display = 'block';
    borderColorGroup.style.display = 'block';
    opacityGroup.style.display = 'block';
    document.getElementById('fill-color').value = properties.fillColor;
    document.getElementById('border-color').value = properties.color;
    document.getElementById('object-opacity').value = properties.fillOpacity;
    document.getElementById('opacity-value').textContent = Math.round(properties.fillOpacity * 100) + '%';
  } else if (type === 'polyline') {
    lineColorGroup.style.display = 'block';
    lineWidthGroup.style.display = 'block';
    opacityGroup.style.display = 'block';
    document.getElementById('line-color').value = properties.color;
    document.getElementById('line-width').value = properties.weight;
    document.getElementById('line-width-value').textContent = properties.weight;
    document.getElementById('object-opacity').value = properties.opacity;
    document.getElementById('opacity-value').textContent = Math.round(properties.opacity * 100) + '%';
  } else if (type === 'image') {
    opacityGroup.style.display = 'block';
    document.getElementById('object-opacity').value = properties.opacity;
    document.getElementById('opacity-value').textContent = Math.round(properties.opacity * 100) + '%';
  }
  
  // Показуємо модальне вікно
  document.getElementById('edit-object-modal').style.display = 'flex';
}

// Функція для закриття модального вікна
function closeEditModal() {
  document.getElementById('edit-object-modal').style.display = 'none';
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
    properties.color = document.getElementById('marker-color').value;
  } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
    properties.fillColor = document.getElementById('fill-color').value;
    properties.color = document.getElementById('border-color').value;
    properties.fillOpacity = parseFloat(document.getElementById('object-opacity').value);
    properties.opacity = 1;
  } else if (type === 'polyline') {
    properties.color = document.getElementById('line-color').value;
    properties.weight = parseInt(document.getElementById('line-width').value);
    properties.opacity = parseFloat(document.getElementById('object-opacity').value);
  } else if (type === 'image') {
    properties.opacity = parseFloat(document.getElementById('object-opacity').value);
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
    if (e.key === 'Escape' && document.getElementById('edit-object-modal').style.display === 'flex') {
      closeEditModal();
    }
  });
}

// Функція для додавання подвійного кліку до об'єктів
function addDoubleClickToLayer(layer) {
  const type = getObjectType(layer);
  if (type === 'marker') {
    // Для маркера — на icon
    layer.on('add', function() {
      const el = layer.getElement && layer.getElement();
      if (el) {
        el.addEventListener('dblclick', function(e) {
          e.stopPropagation();
          showEditModal(layer);
        });
      }
    });
    // Якщо вже доданий на карту
    const el = layer.getElement && layer.getElement();
    if (el) {
      el.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        showEditModal(layer);
      });
    }
  } else {
    // Для всіх інших — на шар
    layer.on('dblclick', function(e) {
      if (e.originalEvent) e.originalEvent.stopPropagation();
      showEditModal(layer);
    });
  }
}