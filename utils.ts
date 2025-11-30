// --- Утиліти ---
declare var L: any;

export function getLayerIcon(type: string): string {
  if (type === 'План') return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;"><rect width="24" height="24" rx="4" fill="#1976d2"/><path d="M7 17V7l5-2v10l-5 2zM12 5l5 2v10l-5-2V5z" fill="#fff"/></svg>`;
  if (type === 'Ландшафт') return '<i class="fa fa-mountain" style="font-size:22px;color:#1976d2;"></i>';
  if (type === 'Супутник') return '<i class="fa fa-globe" style="font-size:22px;color:#1976d2;"></i>';
  return '';
}

export function createTooltip(element: any, text: string) {
  let tooltip: any = null;
  element.addEventListener('mouseenter', (e: any) => {
    if ((window as any).isDraggingObject) return;
    if (tooltip) {
      document.body.removeChild(tooltip);
    }
    tooltip = document.createElement('div');
    tooltip.className = 'object-tooltip';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - 8;
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    if (top < 10) {
      top = rect.bottom + 8;
    }
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  });
  element.addEventListener('mouseleave', () => {
    if (tooltip) {
      document.body.removeChild(tooltip);
      tooltip = null;
    }
  });
}

export function getObjectType(layer: any): string {
  console.log('getObjectType: перевіряємо layer:', layer);
  console.log('getObjectType: layer.constructor:', layer?.constructor?.name);
  console.log('getObjectType: L.Marker:', L.Marker);
  console.log('getObjectType: layer instanceof L.Marker:', layer instanceof L.Marker);
  
  // Перевірка для текстового об'єкта (має властивість textContent або type === 'text')
  if (layer instanceof L.Marker && !(layer instanceof L.CircleMarker)) {
    const props = layer.properties || (layer.feature && layer.feature.properties) || {};
    if (props.type === 'text' || props.textContent !== undefined) {
      return 'text';
    }
    return 'marker';
  }
  if (layer instanceof L.CircleMarker) return 'circle';
  if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) return 'polygon';
  if (layer instanceof L.Rectangle) return 'rectangle';
  if (layer instanceof L.Polyline) return 'polyline';
  if (layer instanceof L.ImageOverlay) return 'image';
  
  console.log('getObjectType: повертаємо unknown для layer:', layer);
  return 'unknown';
}

export function getObjectProperties(layer: any): any {
  return layer.properties || (layer.feature && layer.feature.properties) || {};
}

export function getColoredMarkerIcon(color: string = "#1976d2", iconName: string = "place"): any {
  console.log('getColoredMarkerIcon: створюємо іконку з параметрами:', { color, iconName });
  
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
  
  return L.divIcon({
    className: 'custom-marker-icon',
    html: iconHtml,
    iconSize: [28, 28],
    iconAnchor: [14, 28]
  });
}

// Додаємо утиліти для роботи з властивостями об'єктів
export function setObjectProperty(layer: any, key: string, value: any): void {
  if (!layer) {
    console.error('setObjectProperty: layer є null або undefined');
    return;
  }
  if (!layer.properties) layer.properties = {};
  layer.properties[key] = value;
}

export function getObjectProperty(layer: any, key: string, defaultValue: any = null): any {
  return layer.properties?.[key] ?? defaultValue;
}

// Утиліта для застосування стилів до об'єктів
export function applyObjectStyle(layer: any, style: any): void {
  if (layer.setStyle) {
    layer.setStyle(style);
  }
  if (layer.options) {
    Object.assign(layer.options, style);
  }
}

// Створення текстового маркера
export function createTextMarker(latlng: any, properties: any = {}): any {
  const textContent = properties.textContent || properties.name || 'Текст';
  const color = properties.color || '#000000';
  const fontSize = properties.fontSize || 16;
  const fontWeight = properties.fontWeight || 'normal';
  const fontStyle = properties.fontStyle || 'normal';
  const rotation = properties.rotation || 0;

  const textId = 'text-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  // Отримуємо поточний рівень зум карти для базового масштабу
  const map = (window as any).map;
  const baseZoom = map ? map.getZoom() : 13;
  
  const html = `
    <div class="text-marker-container" data-text-id="${textId}" style="position: relative; display: inline-block;">
      <div class="text-marker-content" style="
        color: ${color};
        font-size: ${fontSize}px;
        font-weight: ${fontWeight};
        font-style: ${fontStyle};
        white-space: nowrap;
        transform: rotate(${rotation}deg);
        transform-origin: center;
        cursor: move;
        user-select: none;
        pointer-events: auto;
        background: transparent;
        border: none;
        box-shadow: none;
      " data-base-font-size="${fontSize}" data-base-zoom="${baseZoom}">${textContent}</div>
      <div class="text-rotation-handle" style="
        position: absolute;
        right: -15px;
        top: 50%;
        transform: translateY(-50%) rotate(${rotation}deg);
        width: 12px;
        height: 12px;
        background: #1976d2;
        border: 2px solid white;
        border-radius: 50%;
        cursor: grab;
        pointer-events: auto;
        z-index: 1000;
        display: none;
      " title="Обертати"></div>
    </div>
  `;

  const icon = L.divIcon({
    className: 'text-marker-icon',
    html: html,
    iconSize: [null, null],
    iconAnchor: [0, 0]
  });

  const marker = L.marker(latlng, {
    icon: icon,
    draggable: true
  });

  // Зберігаємо ID для подальшого доступу
  marker._textId = textId;
  // Зберігаємо базовий розмір шрифту та зум для масштабування
  marker._baseFontSize = fontSize;
  marker._baseZoom = baseZoom;
  
  // Ініціалізуємо функціонал повороту
  setupTextRotation(marker, textId);
  
  // Додаємо обробку переміщення для збереження позиції
  marker.on('dragend', function() {
    // Оновлюємо координати в feature та properties
    const latlng = marker.getLatLng();
    if (marker.feature && marker.feature.geometry) {
      marker.feature.geometry.coordinates = [latlng.lng, latlng.lat];
    }
    
    // Зберігаємо зміни
    if ((window as any).saveLayersToStorage) {
      (window as any).saveLayersToStorage();
    }
  });
  
  return marker;
}

// Функція для оновлення масштабу тексту при зміні зум карти
export function updateTextMarkersScale(map: any): void {
  if (!map) return;
  
  const currentZoom = map.getZoom();
  
  // Знаходимо всі текстові маркери через customLayers
  const customLayers = (window as any).customLayers || [];
  
  customLayers.forEach((layerObj: any) => {
    if (layerObj.featureGroup) {
      layerObj.featureGroup.eachLayer((layer: any) => {
        if (layer._textId && layer._baseFontSize !== undefined && layer._baseZoom !== undefined) {
          const iconElement = layer.getElement();
          if (iconElement) {
            const content = iconElement.querySelector('.text-marker-content') as HTMLElement;
            if (content) {
              // Обчислюємо коефіцієнт масштабування
              // При збільшенні зум на 1, масштаб збільшується в 2 рази
              const zoomDiff = currentZoom - layer._baseZoom;
              const scale = Math.pow(2, zoomDiff);
              
              // Обчислюємо новий розмір шрифту
              const newFontSize = layer._baseFontSize * scale;
              
              // Отримуємо поточний transform для збереження повороту
              const currentTransform = content.style.transform || '';
              const rotationMatch = currentTransform.match(/rotate\(([^)]+)\)/);
              const rotation = rotationMatch ? rotationMatch[1] : '0deg';
              
              // Застосовуємо новий розмір шрифту та поворот (без scale, щоб уникнути зсуву)
              content.style.fontSize = `${newFontSize}px`;
              content.style.transform = `rotate(${rotation})`;
              content.style.transformOrigin = 'center';
            }
          }
        }
      });
    }
  });
  
  // Також перевіряємо маркери безпосередньо на карті (на випадок, якщо вони не в featureGroup)
  map.eachLayer((layer: any) => {
    if (layer._textId && layer._baseFontSize !== undefined && layer._baseZoom !== undefined) {
      const iconElement = layer.getElement();
      if (iconElement) {
        const content = iconElement.querySelector('.text-marker-content') as HTMLElement;
        if (content) {
          // Обчислюємо коефіцієнт масштабування
          const zoomDiff = currentZoom - layer._baseZoom;
          const scale = Math.pow(2, zoomDiff);
          
          // Обчислюємо новий розмір шрифту
          const newFontSize = layer._baseFontSize * scale;
          
          // Отримуємо поточний transform для збереження повороту
          const currentTransform = content.style.transform || '';
          const rotationMatch = currentTransform.match(/rotate\(([^)]+)\)/);
          const rotation = rotationMatch ? rotationMatch[1] : '0deg';
          
          // Застосовуємо новий розмір шрифту та поворот (без scale, щоб уникнути зсуву)
          content.style.fontSize = `${newFontSize}px`;
          content.style.transform = `rotate(${rotation})`;
          content.style.transformOrigin = 'center';
        }
      }
    }
  });
}

// Налаштування повороту тексту
export function setupTextRotation(marker: any, textId: string): void {
  let isRotating = false;
  let startAngle = 0;
  let initialRotation = 0;

  marker.on('add', function() {
    const iconElement = marker.getElement();
    if (!iconElement) return;
    
    const container = iconElement.querySelector(`[data-text-id="${textId}"]`);
    if (!container) return;
    
    const content = container.querySelector('.text-marker-content') as HTMLElement;
    const handle = container.querySelector('.text-rotation-handle') as HTMLElement;
    
    if (!content || !handle) return;

    // Показуємо ручку при hover
    container.addEventListener('mouseenter', function() {
      if (handle) handle.style.display = 'block';
    });
    
    container.addEventListener('mouseleave', function() {
      if (handle && !isRotating) handle.style.display = 'none';
    });

    // Початок обертання
    handle.addEventListener('mousedown', function(e: MouseEvent) {
      e.stopPropagation();
      e.preventDefault();
      isRotating = true;
      
      const props = marker.properties || (marker.feature && marker.feature.properties) || {};
      initialRotation = props.rotation || 0;
      
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      
      handle.style.cursor = 'grabbing';
      document.body.style.cursor = 'grabbing';
    });

    // Обертання
    const onMouseMove = function(e: MouseEvent) {
      if (!isRotating) return;
      
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      let deltaAngle = currentAngle - startAngle;
      
      let newRotation = initialRotation + deltaAngle;
      // Нормалізуємо кут до 0-360
      newRotation = ((newRotation % 360) + 360) % 360;
      
      // Отримуємо поточний розмір шрифту для збереження масштабу
      const currentFontSize = parseFloat(content.style.fontSize) || layer._baseFontSize || 16;
      const map = (window as any).map;
      let scale = 1;
      if (map && layer._baseZoom !== undefined) {
        const currentZoom = map.getZoom();
        const zoomDiff = currentZoom - layer._baseZoom;
        scale = Math.pow(2, zoomDiff);
      }
      
      // Застосовуємо поворот та оновлюємо розмір шрифту
      content.style.fontSize = `${(layer._baseFontSize || 16) * scale}px`;
      content.style.transform = `rotate(${newRotation}deg)`;
      handle.style.transform = `translateY(-50%) rotate(${newRotation}deg)`;
      
      // Зберігаємо в властивостях
      if (!marker.properties) marker.properties = {};
      marker.properties.rotation = newRotation;
      if (marker.feature && marker.feature.properties) {
        marker.feature.properties.rotation = newRotation;
      }
    };

    // Завершення обертання
    const onMouseUp = function() {
      if (isRotating) {
        isRotating = false;
        handle.style.cursor = 'grab';
        document.body.style.cursor = '';
        
        // Оновлюємо feature
        if (marker.feature && marker.feature.properties) {
          marker.feature.properties.rotation = marker.properties.rotation;
        }
        
        // Зберігаємо зміни
        if ((window as any).saveLayersToStorage) {
          (window as any).saveLayersToStorage();
        }
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Зберігаємо обробники для очищення
    marker._rotationHandlers = { onMouseMove, onMouseUp };
  });

  // Очищення при видаленні маркера
  marker.on('remove', function() {
    if (marker._rotationHandlers) {
      document.removeEventListener('mousemove', marker._rotationHandlers.onMouseMove);
      document.removeEventListener('mouseup', marker._rotationHandlers.onMouseUp);
    }
  });
}
