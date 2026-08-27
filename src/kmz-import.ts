import { map } from './map-init';
import { customLayers, getNextLayerId, createTileLayer, saveLayersToStorage } from './layers';
import { layerControlsDiv, createLayerControl, showConfirmDialog } from './ui';
import { getObjectType } from './utils';
import * as L from 'leaflet';

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
      import('./ui').then(({ addDoubleClickToLayer }) => {
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

export { handleKmzFile };
