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
const ICON_WIDTH = 400;
const ICON_HEIGHT = 200;

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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildCurvedTextSvg(props: TextProperties): string {
  const text = props.text || DEFAULT_TEXT;
  const fontSize = props.fontSize ?? DEFAULT_FONT_SIZE;
  const color = props.color || DEFAULT_COLOR;
  const angle = props.curveAngle ?? DEFAULT_CURVE_ANGLE;
  const radius = props.curveRadius ?? DEFAULT_CURVE_RADIUS;

  const width = ICON_WIDTH;
  const height = ICON_HEIGHT;
  const centerX = width / 2;
  const centerY = height / 2;

  let pathD: string;
  if (angle <= 0) {
    pathD = 'M 20,' + centerY + ' L ' + (width - 20) + ',' + centerY;
  } else {
    const clampedAngle = Math.max(0, Math.min(180, angle));
    const startAngle = -clampedAngle / 2;
    const endAngle = clampedAngle / 2;
    const radStart = (startAngle * Math.PI) / 180;
    const radEnd = (endAngle * Math.PI) / 180;

    const startX = centerX + radius * Math.cos(radStart);
    const startY = centerY + radius * Math.sin(radStart) * -1;
    const endX = centerX + radius * Math.cos(radEnd);
    const endY = centerY + radius * Math.sin(radEnd) * -1;

    const largeArcFlag = clampedAngle > 180 ? 1 : 0;
    const sweepFlag = 0;

    pathD = 'M ' + startX + ',' + startY + ' A ' + radius + ',' + radius + ' 0 ' + largeArcFlag + ',' + sweepFlag + ' ' + endX + ',' + endY;
  }

  const safeText = escapeHtml(text);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg"
         width="${width}" height="${height}"
         viewBox="0 0 ${width} ${height}"
         style="overflow:visible;pointer-events:none;">
      <defs>
        <path id="text-curve-path" d="${pathD}" />
      </defs>
      <text fill="${color}"
            font-size="${fontSize}px"
            font-weight="600"
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
            text-anchor="middle"
            style="pointer-events:auto;white-space:pre;">
        <textPath href="#text-curve-path" startOffset="50%">${safeText}</textPath>
      </text>
    </svg>`
  ).trim();
}

export function getTextObjectIcon(props: TextProperties): any {
  return L.divIcon({
    className: 'leaflet-text-object',
    html: buildCurvedTextSvg(props),
    iconSize: [ICON_WIDTH, ICON_HEIGHT],
    iconAnchor: [ICON_WIDTH / 2, ICON_HEIGHT / 2]
  });
}

export function createTextMarker(latlng: any, text?: string, options?: TextProperties): any {
  const props = { ...getDefaultTextProperties(), ...options };
  if (text !== undefined) props.text = text;

  const marker = L.marker(latlng, {
    icon: getTextObjectIcon(props),
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
}
