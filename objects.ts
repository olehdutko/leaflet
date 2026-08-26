import { isTextObject, updateTextMarkerIcon } from './text-object.js';
import * as L from 'leaflet';

export function applyObjectProperties(layer: any, properties: any) {
  const type = isTextObject(layer)
    ? 'text'
    : layer && layer instanceof L.Marker && !(layer instanceof L.CircleMarker)
      ? 'marker'
      : layer instanceof L.CircleMarker
        ? 'circle'
        : layer instanceof L.Polygon && !(layer instanceof L.Rectangle)
          ? 'polygon'
          : layer instanceof L.Rectangle
            ? 'rectangle'
            : layer instanceof L.Polyline
              ? 'polyline'
              : layer instanceof L.ImageOverlay
                ? 'image'
                : 'unknown';
  if (!layer.properties) layer.properties = {};
  layer.properties.name = properties.name;
  layer.properties.description = properties.description;
  if (type === 'marker') {
    const iconName = properties.icon || 'place';
    const color = properties.color || '#1976d2'; // Дефолтний синій колір

    layer.setIcon(L.divIcon({
      className: 'custom-marker-icon',
      html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;margin-top:2px;"><i class="material-icons" style="color:#fff;font-size:20px;transform:rotate(45deg);">${iconName}</i></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    }));
    layer.properties.color = color; // Зберігаємо встановлений колір
    layer.properties.icon = iconName;
    layer.options.color = color;
  } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
    const color = properties.color || '#1976d2';
    const fillColor = properties.fillColor || '#1976d2';
    const fillOpacity = properties.fillOpacity ?? 0.2;

    layer.setStyle({
      fillColor: fillColor,
      color: color,
      fillOpacity: fillOpacity,
    });
    layer.properties.color = color;
    layer.properties.fillColor = fillColor;
    layer.properties.fillOpacity = fillOpacity;
    layer.options.color = color;
    layer.options.fillColor = fillColor;
    layer.options.fillOpacity = fillOpacity;
  } else if (type === 'polyline') {
    const color = properties.color || '#1976d2';
    const weight = properties.weight || 3;
    const opacity = properties.opacity ?? 1;

    layer.setStyle({
      color: color,
      weight: weight,
      opacity: opacity,
      dashArray: properties.style === 'dashed' ? '10, 10' : properties.style === 'dotted' ? '2, 8' : null
    });
    layer.properties.color = color;
    layer.properties.weight = weight;
    layer.properties.opacity = opacity;
    layer.properties.style = properties.style;
    layer.options.color = color;
    layer.options.weight = weight;
    layer.options.opacity = opacity;
    layer.options.dashArray = properties.style === 'dashed' ? '10, 10' : properties.style === 'dotted' ? '2, 8' : null;
  } else if (type === 'text') {
    updateTextMarkerIcon(layer, properties);
  }
}
