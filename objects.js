// objects.js
// Робота з об'єктами шару: geojson, images, drag&drop, show/hide, редагування
import { map } from './map-init.js';
import { getObjectType, getObjectProperties } from './utils.js';
import { createTooltip, showEditModal } from './ui.js';

export function createImageOverlay(img, map, onEdit) {
  // ... код з main.js ...
}

export function updateObjectsList(featureGroup) {
  // ... код з main.js ...
}

export function addImageToFeatureGroup(featureGroup, img, map) {
  // ... код з main.js ...
}

export function removeImageFromFeatureGroup(featureGroup, img) {
  // ... код з main.js ...
}

export function applyObjectProperties(layer, properties) {
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