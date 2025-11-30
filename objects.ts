declare const L: any;
import { getObjectType, setObjectProperty, applyObjectStyle } from './utils.js';

export function applyObjectProperties(layer: any, properties: any) {
  console.log('applyObjectProperties: Викликано з layer:', layer);
  console.log('applyObjectProperties: properties:', properties);
  
  if (!layer) {
    console.error('applyObjectProperties: layer є null або undefined');
    return;
  }
  
  const type = getObjectType(layer);
  console.log('applyObjectProperties: тип об\'єкта:', type);
  
  // Встановлюємо базові властивості
  setObjectProperty(layer, 'name', properties.name);
  setObjectProperty(layer, 'description', properties.description);
  
  if (type === 'marker') {
    console.log('applyObjectProperties: properties.icon =', properties.icon, 'тип:', typeof properties.icon);
    const iconName = properties.icon || 'place';
    const color = properties.color || '#1976d2';
    console.log('applyObjectProperties: встановлюємо іконку маркера:', iconName, 'колір:', color);

    // Перевіряємо, чи це цифра (0-9)
    const isDigit = /^\d$/.test(iconName);
    
    let iconHtml: string;
    if (isDigit) {
      // Для цифр використовуємо текст замість Material Icons
      // Використовуємо span з transform для компенсації повороту контейнера (який застосовується через CSS)
      iconHtml = `<div style="background:${color};width:28px;height:28px;display:flex;align-items:center;justify-content:center;margin-top:2px;"><span style="color:#fff;font-size:18px;font-weight:bold;font-family:Arial,sans-serif;transform:rotate(45deg);">${iconName}</span></div>`;
    } else {
      // Для Material Icons використовуємо стандартний формат
      iconHtml = `<div style="background:${color};width:28px;height:28px;display:flex;align-items:center;justify-content:center;margin-top:2px;"><i class="material-icons" style="color:#fff;font-size:20px;">${iconName}</i></div>`;
    }

    const icon = L.divIcon({
      className: 'custom-marker-icon',
      html: iconHtml,
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    });
    
    console.log('applyObjectProperties: встановлюємо іконку:', icon);
    layer.setIcon(icon);
    
    setObjectProperty(layer, 'color', color);
    setObjectProperty(layer, 'icon', iconName);
    layer.options.color = color;
    console.log('applyObjectProperties: іконка маркера встановлена. layer.properties:', layer.properties);
    
  } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
    const color = properties.color || '#1976d2';
    const fillColor = properties.fillColor || '#1976d2';
    const fillOpacity = properties.fillOpacity ?? 0.2;

    applyObjectStyle(layer, {
      fillColor: fillColor,
      color: color,
      fillOpacity: fillOpacity,
    });
    
    setObjectProperty(layer, 'color', color);
    setObjectProperty(layer, 'fillColor', fillColor);
    setObjectProperty(layer, 'fillOpacity', fillOpacity);
    
  } else if (type === 'polyline') {
    const color = properties.color || '#1976d2';
    const weight = properties.weight || 3;
    const opacity = properties.opacity ?? 1;
    const dashArray = properties.style === 'dashed' ? '10, 10' : 
                     properties.style === 'dotted' ? '2, 8' : null;

    applyObjectStyle(layer, {
      color: color,
      weight: weight,
      opacity: opacity,
      dashArray: dashArray
    });
    
    setObjectProperty(layer, 'color', color);
    setObjectProperty(layer, 'weight', weight);
    setObjectProperty(layer, 'opacity', opacity);
    setObjectProperty(layer, 'style', properties.style);
  } else if (type === 'text') {
    // Оновлюємо текстовий об'єкт
    const textContent = properties.textContent !== undefined ? properties.textContent : (properties.name || 'Текст');
    const color = properties.color || '#000000';
    const fontSize = properties.fontSize || 16;
    const fontWeight = properties.fontWeight || 'normal';
    const fontStyle = properties.fontStyle || 'normal';
    
    // Зберігаємо поточний кут повороту, якщо він не переданий в properties
    const currentProps = layer.properties || (layer.feature && layer.feature.properties) || {};
    const rotation = properties.rotation !== undefined ? properties.rotation : (currentProps.rotation !== undefined ? currentProps.rotation : 0);

    // Зберігаємо властивості
    setObjectProperty(layer, 'textContent', textContent);
    setObjectProperty(layer, 'color', color);
    setObjectProperty(layer, 'fontSize', fontSize);
    setObjectProperty(layer, 'fontWeight', fontWeight);
    setObjectProperty(layer, 'fontStyle', fontStyle);
    setObjectProperty(layer, 'rotation', rotation);
    setObjectProperty(layer, 'type', 'text');
    
    // Також зберігаємо в feature.properties для збереження в localStorage
    if (layer.feature && layer.feature.properties) {
      layer.feature.properties.rotation = rotation;
      layer.feature.properties.textContent = textContent;
      layer.feature.properties.color = color;
      layer.feature.properties.fontSize = fontSize;
      layer.feature.properties.fontWeight = fontWeight;
      layer.feature.properties.fontStyle = fontStyle;
      layer.feature.properties.type = 'text';
    }

    // Оновлюємо HTML елемент напряму
    const iconElement = layer.getElement();
    if (iconElement) {
      const container = iconElement.querySelector('.text-marker-container');
      if (container) {
        const content = container.querySelector('.text-marker-content') as HTMLElement;
        const handle = container.querySelector('.text-rotation-handle') as HTMLElement;
        
        if (content) {
          content.textContent = textContent;
          content.style.color = color;
          content.style.fontSize = fontSize + 'px';
          content.style.fontWeight = fontWeight;
          content.style.fontStyle = fontStyle;
          
          // Оновлюємо базовий розмір шрифту для масштабування
          if (layer._baseFontSize !== undefined) {
            layer._baseFontSize = fontSize;
          }
          
          // Обчислюємо поточний масштаб на основі зум
          const map = (window as any).map;
          let scale = 1;
          if (map && layer._baseZoom !== undefined) {
            const currentZoom = map.getZoom();
            const zoomDiff = currentZoom - layer._baseZoom;
            scale = Math.pow(2, zoomDiff);
          }
          
          // Застосовуємо новий розмір шрифту та поворот (без scale, щоб уникнути зсуву)
          content.style.fontSize = `${fontSize * scale}px`;
          content.style.transform = `rotate(${rotation}deg)`;
          content.style.transformOrigin = 'center';
          content.style.background = 'transparent';
          content.style.border = 'none';
          content.style.boxShadow = 'none';
        }
        
        if (handle) {
          handle.style.transform = `translateY(-50%) rotate(${rotation}deg)`;
        }
      }
    }

    // Якщо немає _textId, створюємо новий маркер
    if (!layer._textId) {
      import('./utils.js').then(({ createTextMarker, setupTextRotation }) => {
        const latlng = layer.getLatLng();
        const newMarker = createTextMarker(latlng, {
          textContent,
          color,
          fontSize,
          fontWeight,
          fontStyle,
          rotation
        });
        layer._textId = newMarker._textId;
        layer.setIcon(newMarker.options.icon);
        
        // Ініціалізуємо поворот
        setupTextRotation(layer, layer._textId);
      });
    }
  }
}
