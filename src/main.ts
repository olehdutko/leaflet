// Версія виправлень overlay
export const OVERLAY_FIX_VERSION = 'v3.4';

// Функція для оновлення title сторінки з версією
export function updatePageTitle(baseTitle: string = 'Мапа Львова на Leaflet') {
  document.title = `${baseTitle} ${OVERLAY_FIX_VERSION}`;
  console.log(`🚀 ${baseTitle} ${OVERLAY_FIX_VERSION} завантажено`);
  console.log(`📊 Версія виправлень overlay: ${OVERLAY_FIX_VERSION}`);
}

// Експортуємо версію в глобальну область для debug функцій
(window as any).OVERLAY_FIX_VERSION = OVERLAY_FIX_VERSION;

// --- Domain modules ---
import './overlay-deletion';          // registers window.requestOverlayDelete
import { initGeoSearch } from './geosearch';
import { handleKmzFile } from './kmz-import';
import { initGlobalObjectSearch } from './global-search';
import { observeOverlayOpacity } from './opacity-observer';

import { map } from './map-init';
import { customLayers, loadLayersFromStorage, addLayer } from './layers';
import { layerControlsDiv, addLayerBtn, exportAllBtn, importAllBtn, importAllInput, createLayerControl, showConfirmDialog } from './ui';
import { updateDrawControlVisibility } from './draw-control';
import { applyTextZoomScale, isTextObject } from './text-object';
import { initAiAssistant } from './ai-assistant';
import { initEditModal } from './edit-modal';
import type * as L from 'leaflet';

// Ініціалізація після готового DOM (модуль підключений з defer, тому DOM вже готовий)
(async function initApp() {
  updatePageTitle();

  const loadSuccess = await loadLayersFromStorage();
  if (!loadSuccess || customLayers.length === 0) {
    addLayer();
  }

  // draw control готовий, активний шар встановлено — оновлюємо видимість
  updateDrawControlVisibility();

  // Ініціалізуємо AI-асистента
  initAiAssistant();

  // Ініціалізуємо обробники модального вікна редагування
  initEditModal();
})();

// Ініціалізуємо пошук та спостереження
initGeoSearch();
initGlobalObjectSearch();
observeOverlayOpacity();

// --- Масштабування текстових об'єктів разом із мапою ---
map.on('zoomend', function () {
  const currentZoom = map.getZoom();
  customLayers.forEach(layerObj => {
    layerObj.featureGroup.eachLayer((layer: any) => {
      if (isTextObject(layer)) {
        applyTextZoomScale(layer, currentZoom);
      }
    });
  });
});

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
      handleKmzFile(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = function (evt) {
      if (!evt.target) return;
      try {
        let imported = JSON.parse(evt.target.result as string);
        if (!Array.isArray(imported)) imported = [imported];
        function importLayerObj(obj: any) {
          const existsIdx = customLayers.findIndex(l => l.title === obj.title);
          if (existsIdx !== -1) {
            showConfirmDialog({
              title: `Шар "${obj.title}" вже існує`,
              message: `Шар з назвою "${obj.title}" вже існує. Що зробити?`,
              onConfirm: (action?: string) => {
                if (action === 'duplicate') {
                  let copyTitle = obj.title + ' (копія)';
                  let n = 2;
                  while (customLayers.some(l => l.title === copyTitle)) {
                    copyTitle = obj.title + ` (копія ${n++})`;
                  }
                  obj.title = copyTitle;
                  actuallyImportLayer(obj);
                } else if (action === 'overwrite') {
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
                }
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
          let arr = JSON.parse(localStorage.getItem('lefleat_layers') || '[]');
          if (!Array.isArray(arr)) arr = [arr];
          arr.push(obj);
          localStorage.setItem('lefleat_layers', JSON.stringify(arr));
          location.reload();
        }
        imported.forEach(importLayerObj);
      } catch (err) {
        alert('Помилка імпорту: ' + err);
      }
    };
    reader.readAsText(file);
  });
}

// === Інструмент вимірювання відстані ===
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