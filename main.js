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
    const exportData = {
      title: layerObj.title || `Шар ${id}`,
      geojson
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
      }).addTo(activeLayer);
      if (!activeLayer.images) activeLayer.images = [];
      activeLayer.images.push({ url: imgUrl, bounds });
      saveLayersToStorage();
      overlay.on('edit', () => {
        const idx = activeLayer.images.findIndex(img => img.url === imgUrl);
        if (idx !== -1) {
          activeLayer.images[idx].bounds = overlay.getBounds();
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
  const layersData = customLayers.map(l => {
    const images = l.featureGroup.images || [];
    return {
      id: l.id,
      tileType: l.tileType,
      opacity: l.tileLayer.options.opacity,
      showLabels: l.tileLayer._url && l.tileLayer._url.includes('nolabels') ? false : true,
      geojson: l.featureGroup.toGeoJSON(),
      images,
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
        L.geoJSON(obj.geojson).eachLayer(l => featureGroup.addLayer(l));
      }
      // Відновлюємо зображення
      if (obj.images && Array.isArray(obj.images)) {
        featureGroup.images = [];
        obj.images.forEach(img => {
          let bounds = img.bounds;
          if (!bounds && img.corners && img.corners.length === 4) {
            // Якщо старий формат (corners), конвертуємо у bounds
            const lats = img.corners.map(c => c[0]);
            const lngs = img.corners.map(c => c[1]);
            const southWest = [Math.min(...lats), Math.min(...lngs)];
            const northEast = [Math.max(...lats), Math.max(...lngs)];
            bounds = [southWest, northEast];
          }
          if (!bounds) return;
          const overlay = L.distortableImageOverlay(img.url, { bounds, selected: false }).addTo(featureGroup);
          featureGroup.images.push({ url: img.url, bounds });
          overlay.on('edit', () => {
            const idx = featureGroup.images.findIndex(i => i.url === img.url);
            if (idx !== -1) {
              featureGroup.images[idx].bounds = overlay.getBounds();
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

map.on(L.Draw.Event.CREATED, function (e) {
  if (activeLayer) {
    activeLayer.addLayer(e.layer);
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
            L.geoJSON(obj.geojson).eachLayer(l => featureGroup.addLayer(l));
          }
          // Відновлюємо зображення
          if (obj.images && Array.isArray(obj.images)) {
            featureGroup.images = [];
            obj.images.forEach(img => {
              let bounds = img.bounds;
              if (!bounds && img.corners && img.corners.length === 4) {
                // Якщо старий формат (corners), конвертуємо у bounds
                const lats = img.corners.map(c => c[0]);
                const lngs = img.corners.map(c => c[1]);
                const southWest = [Math.min(...lats), Math.min(...lngs)];
                const northEast = [Math.max(...lats), Math.max(...lngs)];
                bounds = [southWest, northEast];
              }
              if (!bounds) return;
              const overlay = L.distortableImageOverlay(img.url, { bounds, selected: false }).addTo(featureGroup);
              featureGroup.images.push({ url: img.url, bounds });
              overlay.on('edit', () => {
                const idx = featureGroup.images.findIndex(i => i.url === img.url);
                if (idx !== -1) {
                  featureGroup.images[idx].bounds = overlay.getBounds();
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