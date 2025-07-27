// Централізовані типи та інтерфейси для проекту

// Базові типи для об'єктів
export interface ObjectProperties {
  name?: string;
  description?: string;
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  opacity?: number;
  weight?: number;
  style?: string;
  icon?: string;
  image?: string;
  [key: string]: any;
}

// Типи для overlay
export interface OverlayData {
  url: string;
  bounds?: L.LatLngBounds;
  corners?: Array<{ lat: number; lng: number }>;
  opacity?: number;
  [key: string]: any;
}

export interface ImageData {
  url: string;
  bounds?: L.LatLngBounds;
  corners?: Array<{ lat: number; lng: number }>;
  _customUrl?: string;
  _url?: string;
  _overlayId?: string;
}

export interface Overlay {
  getBounds(): L.LatLngBounds;
  getCorners?(): L.LatLng[];
  off(event: string): void;
  on(event: string, handler: Function): void;
  _customUrl?: string;
  _url?: string;
  url?: string;
  _overlay?: Overlay;
  _image?: HTMLImageElement;
  _overlayId?: string;
  _hasEditHandler?: boolean;
}

// Типи для шарів
export interface LayerObj {
  id: number;
  tileLayer: L.TileLayer;
  featureGroup: FeatureGroup;
  tileType: string;
  visible: boolean;
  title: string;
  collapsed?: boolean;
}

export interface FeatureGroup {
  overlayInstances?: Overlay[];
  images?: ImageData[];
  overlays?: OverlayData[];
  eachLayer(callback: (layer: any) => void): void;
  addLayer(layer: any): void;
  removeLayer(layer: any): void;
  hasLayer(layer: any): boolean;
  bringToFront(): void;
}

// Типи для UI
export interface ModalConfig {
  title: string;
  message?: string;
  onConfirm?: (action?: string) => void;
  onCancel?: () => void;
  buttons?: Array<{
    text: string;
    action: string;
    className?: string;
  }>;
}

export interface ConfirmDialogConfig extends ModalConfig {
  title: string;
  message: string;
  onConfirm: () => void;
  buttons?: Array<{
    text: string;
    action: string;
    className?: string;
  }>;
}

// Типи для стану додатку
export interface AppState {
  currentEditingObject: {
    value: any;
  };
  layers: LayerObj[];
  activeLayer: any;
  layerId: number;
}

// Типи для конфігурації
export interface TileLayerConfig {
  url: string;
  urlNoLabels?: string;
  maxZoom: number;
  attribution: string;
  hasLabels?: boolean;
}

export interface TileLayerOptions {
  [key: string]: TileLayerConfig;
}

// Глобальні типи для window
export interface Window {
  overlayPositionFixLoaded?: boolean;
  enableOverlayDebug?: () => void;
  saveLayersToStorage?: () => void;
  customLayers?: LayerObj[];
  map?: L.Map;
  overlayPositionFix?: OverlayPositionFix;
  OVERLAY_FIX_VERSION?: string;
  requestOverlayDelete?: (overlay: Overlay) => void;
}

export interface OverlayPositionFix {
  createEditHandler: (overlay: Overlay, imageUrl: string, featureGroup: FeatureGroup, isFirstMove?: boolean) => Function;
  rebindEditHandlers: () => void;
  checkOverlayState: () => void;
  deleteOverlay: (overlay: Overlay) => void;
  universalSave: (reason?: string, priority?: boolean) => void;
  checkForOrphanedOverlays: () => void;
}

export interface DragOverlay extends Overlay {
  _dragSaveHandlerBound?: boolean;
}

export interface DragSaveFix {
  bindHandlers: () => void;
  test: () => void;
  enableDebug: () => void;
} 