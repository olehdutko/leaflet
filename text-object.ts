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
  curveAngle?: number;
  curveRadius?: number;
  objectType?: 'text';
}

const DEFAULT_TEXT = 'Текст';
const DEFAULT_FONT_SIZE = 24;
const DEFAULT_COLOR = '#1976d2';
const DEFAULT_CURVE_ANGLE = 0;
const DEFAULT_CURVE_RADIUS = 100;

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
    curveAngle: DEFAULT_CURVE_ANGLE,
    curveRadius: DEFAULT_CURVE_RADIUS,
    objectType: 'text'
  };
}

export function isTextObject(layer: any): boolean {
  if (!layer) return false;
  const props = layer.properties || layer.feature?.properties || {};
  return props.objectType === 'text' || (props.text !== undefined && props.text !== '');
}

function getScaleForZoom(currentZoom: number, baseZoom: number): number {
  // Масштабування пропорційне до зміни масштабу мапи
  // Leaflet використовує ступінь 2 між зумами
  return Math.pow(2, currentZoom - baseZoom);
}

export function applyTextZoomScale(layer: any, currentZoom: number): void {
  if (!layer || !isTextObject(layer)) return;
  const baseZoom = layer._textBaseZoom;
  if (baseZoom === undefined) return;
  const scale = getScaleForZoom(currentZoom, baseZoom);
  const icon = layer._icon;
  if (icon) {
    icon.style.transformOrigin = 'bottom center';
    icon.style.transform = `scale(${scale})`;
  }
}

function storeTextBaseZoom(layer: any, zoom: number): void {
  layer._textBaseZoom = zoom;
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
  const angle = props.curveAngle ?? DEFAULT_CURVE_ANGLE;
  const radius = props.curveRadius ?? DEFAULT_CURVE_RADIUS;

  const idSuffix = uniqueId || ('_' + Math.random().toString(36).slice(2, 9));
  const pathId = 'text-curve-path' + idSuffix;

  let width: number;
  let height: number;
  let pathD: string;

  if (angle <= 0) {
    // Прямий текст: розмір залежить від довжини тексту і шрифту
    const approxCharWidth = fontSize * 0.6;
    width = Math.max(200, text.length * approxCharWidth + 40);
    height = Math.max(120, fontSize + 60);
    const centerX = width / 2;
    const centerY = height / 2;
    pathD = 'M 20,' + centerY + ' L ' + (width - 20) + ',' + centerY;
  } else {
    // Дуговий текст: розмір SVG адаптується під радіус
    const clampedAngle = Math.max(0, Math.min(180, angle));
    // Крайні точки дуги: x = ±radius*sin(angle/2), y відносно центру
    const halfRad = (clampedAngle / 2) * Math.PI / 180;
    const arcHalfWidth = radius * Math.sin(halfRad);
    const arcTopOffset = radius * (1 - Math.cos(halfRad));

    width = Math.max(400, arcHalfWidth * 2 + 80 + fontSize * 2);
    height = Math.max(300, arcTopOffset + 160 + fontSize * 2);

    const centerX = width / 2;
    // Розташовуємо центр кола нижче SVG, щоб дуга йшла знизу вгору
    const centerY = height - 40 + arcTopOffset * 0.3;

    const startAngle = -clampedAngle / 2;
    const endAngle = clampedAngle / 2;

    const startX = centerX + radius * Math.cos(startAngle * Math.PI / 180 + Math.PI / 2);
    const startY = centerY + radius * Math.sin(startAngle * Math.PI / 180 + Math.PI / 2) * -1;
    const endX = centerX + radius * Math.cos(endAngle * Math.PI / 180 + Math.PI / 2);
    const endY = centerY + radius * Math.sin(endAngle * Math.PI / 180 + Math.PI / 2) * -1;

    const largeArcFlag = clampedAngle > 180 ? 1 : 0;
    const sweepFlag = 1;

    pathD = 'M ' + startX + ',' + startY + ' A ' + radius + ',' + radius + ' 0 ' + largeArcFlag + ',' + sweepFlag + ' ' + endX + ',' + endY;
  }

  const safeText = escapeHtml(text);

  const html = (
    `<svg xmlns="http://www.w3.org/2000/svg"
         width="${width}" height="${height}"
         viewBox="0 0 ${width} ${height}"
         style="overflow:visible;pointer-events:none;">
      <defs>
        <path id="${pathId}" d="${pathD}" />
      </defs>
      <text fill="${color}"
            font-size="${fontSize}px"
            font-weight="600"
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
            text-anchor="middle"
            style="pointer-events:auto;white-space:pre;">
        <textPath href="#${pathId}" startOffset="50%">${safeText}</textPath>
      </text>
    </svg>`
  ).trim();

  // Якорь: точка на дні дуги (середина нижньої частини), щоб текст "сидів" на координаті
  return {
    html,
    width,
    height,
    anchorX: width / 2,
    anchorY: height - 40
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

  // Після оновлення іконки відновлюємо масштабування відносно поточного зуму мапи
  if (layer._map && layer._map.getZoom) {
    layer._textBaseZoom = layer._map.getZoom();
    applyTextZoomScale(layer, layer._map.getZoom());
  }
}
