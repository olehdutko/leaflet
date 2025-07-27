// Enum'и для проекту

export enum LayerType {
  MARKER = 'marker',
  POLYGON = 'polygon',
  POLYLINE = 'polyline',
  IMAGE = 'image'
}

export enum ObjectType {
  MARKER = 'marker',
  POLYGON = 'polygon',
  POLYLINE = 'polyline',
  CIRCLE = 'circle',
  RECTANGLE = 'rectangle',
  IMAGE = 'image'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export enum EventType {
  CLICK = 'click',
  DOUBLE_CLICK = 'dblclick',
  MOUSE_OVER = 'mouseover',
  MOUSE_OUT = 'mouseout',
  DRAG_START = 'dragstart',
  DRAG_END = 'dragend',
  MOVE_END = 'moveend',
  ZOOM_END = 'zoomend'
}

export enum ModalAction {
  CONFIRM = 'confirm',
  CANCEL = 'cancel',
  DELETE = 'delete',
  SAVE = 'save',
  CLOSE = 'close'
}

export enum StorageKey {
  LAYERS = 'customLayers',
  SETTINGS = 'appSettings',
  STATE = 'appState'
}

export enum UITheme {
  LIGHT = 'light',
  DARK = 'dark'
}

export enum Language {
  UKRAINIAN = 'uk',
  ENGLISH = 'en'
}

export enum SavePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum ValidationRule {
  REQUIRED = 'required',
  EMAIL = 'email',
  URL = 'url',
  NUMBER = 'number',
  MIN_LENGTH = 'minLength',
  MAX_LENGTH = 'maxLength',
  PATTERN = 'pattern'
} 