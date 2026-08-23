// text-object.ts - Ізольований модуль для текстових об'єктів на мапі
// Відповідає за створення, оновлення та розпізнавання текстових маркерів.
// Не імпортує UI/шари/контроли, щоб уникнути циклічних залежностей.

declare const L: any;

export interface TextProperties {
  name?: string;
  description?: string;
  text?: string;
  fontSize?: number;
  color?: string;
  rotation?: number;
  objectType?: 'text';
}

const DEFAULT_TEXT = 'Текст';
const DEFAULT_FONT_SIZE = 24;
const DEFAULT_COLOR = '#1976d2';
const DEFAULT_ROTATION = 0;

interface TextLayout {
  html: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

export function getDefaultTextProperties(): Required<TextProperties> {
  return {
    name: DEFAULT_TEXT,
    description: '',
    text: DEFAULT_TEXT,
    fontSize: DEFAULT_FONT_SIZE,
    color: DEFAULT_COLOR,
    rotation: DEFAULT_ROTATION,
    objectType: 'text'
  };
}

export function isTextObject(layer: any): boolean {
  if (!layer) return false;
  const props = layer.properties || layer.feature?.properties || {};
  return props.objectType === 'text' || (props.text !== undefined && props.text !== '');
}

function getScaleForZoom(currentZoom: number, baseZoom: number): number {
  return Math.pow(2, currentZoom - baseZoom);
}

export function applyTextZoomScale(layer: any, currentZoom: number): void {
  if (!layer || !isTextObject(layer)) return;
  const baseZoom = layer._textBaseZoom;
  if (baseZoom === undefined) return;

  // Зберігаємо базові властивості окремо; при зміні зуму генеруємо
  // тимчасово масштабовану іконку, не змінюючи оригінальні властивості.
  const baseProps = layer._textBaseProperties || layer.properties || getDefaultTextProperties();
  const scale = getScaleForZoom(currentZoom, baseZoom);
  const scaledProps = {
    ...baseProps,
    fontSize: Math.max(8, Math.round((baseProps.fontSize ?? DEFAULT_FONT_SIZE) * scale))
  };

  if (layer.setIcon) {
    layer.setIcon(getTextObjectIcon(scaledProps));
  }
}

function storeTextBaseZoom(layer: any, zoom: number): void {
  layer._textBaseZoom = zoom;
  layer._textBaseProperties = { ...(layer.properties || getDefaultTextProperties()) };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildCurvedTextSvg(props: TextProperties, uniqueId?: string): TextLayout {
  const text = props.text || DEFAULT_TEXT;
  const fontSize = props.fontSize ?? DEFAULT_FONT_SIZE;
  const color = props.color || DEFAULT_COLOR;
  const rotation = props.rotation ?? DEFAULT_ROTATION;

  const idSuffix = uniqueId || ('_' + Math.random().toString(36).slice(2, 9));

  const approxCharWidth = fontSize * 0.6;
  const width = Math.max(200, text.length * approxCharWidth + 40);
  const height = Math.max(120, fontSize + 60);
  const centerX = width / 2;
  const centerY = height / 2;

  const safeText = escapeHtml(text);

  // Обертання на 180° можливе через властивість rotation (0 або 180).
  // Об'єкт обертається навколо свого центру.
  const html = (
    `<div style="width:${width}px;height:${height}px;transform:rotate(${rotation}deg);transform-origin:center center;">
      <svg xmlns="http://www.w3.org/2000/svg"
           width="${width}" height="${height}"
           viewBox="0 0 ${width} ${height}"
           style="overflow:visible;pointer-events:none;">
        <text x="${centerX}" y="${centerY + fontSize / 3}"
              fill="${color}"
              font-size="${fontSize}px"
              font-weight="600"
              font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
              text-anchor="middle"
              dominant-baseline="middle"
              style="pointer-events:auto;">${safeText}</text>
      </svg>
    </div>`
  ).trim();

  return {
    html,
    width,
    height,
    anchorX: centerX,
    anchorY: centerY
  };
}

export function getTextObjectIcon(props: TextProperties): any {
  const uniqueId = '_' + Math.random().toString(36).slice(2, 9);
  const layout = buildCurvedTextSvg(props, uniqueId);
  return L.divIcon({
    className: 'leaflet-text-object',
    html: layout.html,
    iconSize: [layout.width, layout.height],
    iconAnchor: [layout.anchorX, layout.anchorY]
  });
}

export function createTextMarker(latlng: any, text?: string, options?: TextProperties): any {
  const props = { ...getDefaultTextProperties(), ...options };
  if (text !== undefined) props.text = text;

  const uniqueId = '_' + Math.random().toString(36).slice(2, 9);
  const layout = buildCurvedTextSvg(props, uniqueId);
  const marker = L.marker(latlng, {
    icon: L.divIcon({
      className: 'leaflet-text-object',
      html: layout.html,
      iconSize: [layout.width, layout.height],
      iconAnchor: [layout.anchorX, layout.anchorY]
    }),
    draggable: true,
    isTextObject: true
  });

  marker.properties = { ...props };
  marker.feature = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [latlng.lng, latlng.lat]
    },
    properties: { ...props }
  };

  // Зберігаємо базовий зум для масштабування тексту разом із мапою
  if (typeof marker._map !== 'undefined' && marker._map) {
    storeTextBaseZoom(marker, marker._map.getZoom());
  }

  return marker;
}

export function updateTextMarkerIcon(layer: any, properties: TextProperties): void {
  if (!layer) return;
  const merged = { ...getDefaultTextProperties(), ...(layer.properties || {}), ...properties };
  layer.properties = merged;
  layer.feature = layer.feature || {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [layer.getLatLng().lng, layer.getLatLng().lat] },
    properties: {}
  };
  layer.feature.properties = { ...layer.feature.properties, ...merged };

  if (layer.setIcon) {
    layer.setIcon(getTextObjectIcon(merged));
  }

  if (layer._map && layer._map.getZoom) {
    storeTextBaseZoom(layer, layer._map.getZoom());
    applyTextZoomScale(layer, layer._map.getZoom());
  }
}

export function startTextMouseRotation(layer: any, mapInstance: any, onDone?: () => void): void {
  if (!layer || !isTextObject(layer) || !mapInstance) return;

  const container = mapInstance.getContainer();
  if (!container) return;

  // Закриваємо модалку, якщо відкрита
  container.style.cursor = 'crosshair';

  let isRotating = true;
  const center = layer.getLatLng();
  const centerPoint = mapInstance.latLngToContainerPoint(center);

  function updateRotationFromMouse(e: MouseEvent) {
    if (!isRotating) return;
    const dx = e.clientX - centerPoint.x;
    const dy = e.clientY - centerPoint.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    updateTextMarkerIcon(layer, { rotation: angle });
  }

  function stopRotation() {
    if (!isRotating) return;
    isRotating = false;
    container.style.cursor = '';
    document.removeEventListener('mousemove', updateRotationFromMouse);
    document.removeEventListener('mouseup', stopRotation);
    if (onDone) onDone();
  }

  document.addEventListener('mousemove', updateRotationFromMouse);
  document.addEventListener('mouseup', stopRotation);

  // Початкове оновлення за поточним положенням миші
  updateRotationFromMouse({ clientX: centerPoint.x, clientY: centerPoint.y - 50 } as MouseEvent);
}
