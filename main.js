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

  // Назва шару — просто "Шар N"
  if (!layerObj.title) {
    layerObj.title = `Шар ${id}`;
  }

  const div = document.createElement('div');
  div.className = 'layer-card';

  // --- Верхній рядок: заголовок + іконки ---
  const header = document.createElement('div');
  header.className = 'layer-card-header';

  // Заголовок
  const titleWrap = document.createElement('span');
  titleWrap.className = 'layer-card-title';
  titleWrap.style.minWidth = '180px';
  titleWrap.style.maxWidth = '220px';
  titleWrap.style.display = 'inline-block';
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

  // Дії справа
  const actions = document.createElement('span');
  actions.className = 'layer-card-actions';

  // Око (показати/приховати)
  const eyeBtn = document.createElement('button');
  eyeBtn.className = 'layer-card-icon-btn';
  eyeBtn.innerHTML = layerObj.visible ? '<i class="fa fa-eye"></i>' : '<i class="fa fa-eye-slash"></i>';
  eyeBtn.title = layerObj.visible ? 'Приховати шар' : 'Показати шар';
  actions.appendChild(eyeBtn);

  // Видалити (дозволити для всіх шарів)
  let removeBtn = null;
  removeBtn = document.createElement('button');
  removeBtn.className = 'layer-card-icon-btn delete';
  removeBtn.innerHTML = '<i class="fa fa-trash"></i>';
  removeBtn.title = 'Видалити';
  actions.appendChild(removeBtn);

  header.appendChild(titleWrap);
  header.appendChild(actions);
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
      // Якщо прихований активний шар — активувати перший видимий
      if (activeLayer === layerObj.featureGroup) {
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
      }
    }
    saveLayersToStorage();
  };

  // Видалити (дозволити для всіх шарів)
  if (removeBtn) {
    removeBtn.onclick = () => {
      map.removeLayer(layerObj.tileLayer);
      map.removeLayer(featureGroup);
      layerControlsDiv.removeChild(div);
      customLayers = customLayers.filter(l => l.id !== id);
      if (activeLayer === featureGroup) activeLayer = null;
      updateActiveLayerUI();
      saveLayersToStorage();
      if (customLayers.length === 0 && drawControl) {
        map.removeControl(drawControl);
        drawControl = null;
      }
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
  div.dataset.layerId = id;

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
  // Підсвічуємо активний шар
  document.querySelectorAll('.layer-card').forEach(card => {
    const id = +card.dataset.layerId;
    if (customLayers[id-1] && customLayers[id-1].featureGroup === activeLayer) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

function saveLayersToStorage() {
  const layersData = customLayers.map(l => ({
    id: l.id,
    tileType: l.tileType,
    opacity: l.tileLayer.options.opacity,
    showLabels: l.tileLayer._url && l.tileLayer._url.includes('nolabels') ? false : true,
    geojson: l.featureGroup.toGeoJSON(),
    title: l.title || undefined,
    visible: l.visible !== false
  }));
  localStorage.setItem('lefleat_layers', JSON.stringify(layersData));
}

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

const loaded = loadLayersFromStorage();

addLayerBtn.onclick = () => {
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
};

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
      const arr = JSON.parse(evt.target.result);
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
        addLayerBtn.onclick();
      }
      saveLayersToStorage();
    } catch (err) {
      alert('Помилка імпорту шарів');
    }
  };
  reader.readAsText(file);
}; 