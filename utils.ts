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
  if (layer instanceof L.Marker && !(layer instanceof L.CircleMarker)) return 'marker';
  if (layer instanceof L.CircleMarker) return 'circle';
  if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) return 'polygon';
  if (layer instanceof L.Rectangle) return 'rectangle';
  if (layer instanceof L.Polyline) return 'polyline';
  if (layer instanceof L.ImageOverlay) return 'image';
  return 'unknown';
}

export function getObjectProperties(layer: any): any {
  return layer.properties || (layer.feature && layer.feature.properties) || {};
}

export function getColoredMarkerIcon(color: string = "#1976d2", iconName: string = "place"): any {
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;"><i class="material-icons" style="color:#fff;font-size:20px;">${iconName}</i></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28]
  });
}

// Додаємо утиліти для роботи з властивостями об'єктів
export function setObjectProperty(layer: any, key: string, value: any): void {
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
