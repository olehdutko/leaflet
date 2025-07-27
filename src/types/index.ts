// Базові типи для проекту

// Використовуємо enum'и замість type

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LatLngBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface ObjectProperties {
  name?: string;
  description?: string;
  color?: string;
  fillColor?: string;
  weight?: number;
  opacity?: number;
  icon?: string;
  style?: string;
  imageUrl?: string;
}

import { LayerType, ObjectType } from '../enums/index.js';

export interface LayerData {
  id: number;
  name: string;
  type: LayerType;
  visible: boolean;
  objects: MapObject[];
  featureGroup?: any; // Leaflet FeatureGroup
}

export interface MapObject {
  id: string;
  type: ObjectType;
  properties: ObjectProperties;
  position?: LatLng;
  bounds?: LatLngBounds;
  corners?: LatLng[];
  layer?: any; // Leaflet layer
}

export interface OverlayData {
  url: string;
  bounds?: LatLngBounds;
  corners?: LatLng[];
  opacity?: number;
  _customUrl?: string;
  _url?: string;
  _overlayId?: string;
}

export interface ModalOptions {
  title?: string;
  message?: string;
  onConfirm?: (action?: string) => void;
  onCancel?: () => void;
  buttons?: ModalButton[];
}

export interface ModalButton {
  text: string;
  action: string;
  className?: string;
}

export interface EventHandler {
  event: string;
  handler: Function;
  element?: HTMLElement;
}

export interface SaveCallback {
  id: string;
  callback: () => void;
  priority?: boolean;
}

// Типи для Leaflet
export interface LeafletMap {
  addLayer(layer: any): void;
  removeLayer(layer: any): void;
  getBounds(): LatLngBounds;
  setView(center: LatLng, zoom: number): void;
  on(event: string, handler: Function): void;
  off(event: string, handler?: Function): void;
}

export interface LeafletLayer {
  addTo(map: LeafletMap): void;
  remove(): void;
  getBounds(): LatLngBounds;
  getLatLng(): LatLng;
  setLatLng(latlng: LatLng): void;
  on(event: string, handler: Function): void;
  off(event: string, handler?: Function): void;
}

export interface LeafletMarker extends LeafletLayer {
  setIcon(icon: any): void;
  getIcon(): any;
}

export interface LeafletPolygon extends LeafletLayer {
  setStyle(style: any): void;
  getStyle(): any;
}

export interface LeafletPolyline extends LeafletLayer {
  setStyle(style: any): void;
  getStyle(): any;
}

export interface LeafletImageOverlay extends LeafletLayer {
  setOpacity(opacity: number): void;
  getOpacity(): number;
  setBounds(bounds: LatLngBounds): void;
  getBounds(): LatLngBounds;
}

// Типи для конфігурації
export interface AppConfig {
  map: {
    center: LatLng;
    zoom: number;
    minZoom: number;
    maxZoom: number;
  };
  storage: {
    key: string;
    autoSave: boolean;
    saveInterval: number;
  };
  ui: {
    theme: 'light' | 'dark';
    language: 'uk' | 'en';
  };
}

// Типи для помилок
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

import { LogLevel } from '../enums/index.js';

// Типи для логування
export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
  context: string;
} 