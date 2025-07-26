// ObjectManager.ts - Централізоване управління об'єктами на карті
import { getObjectType, getObjectProperties, setObjectProperty, applyObjectStyle } from './utils.js';
import { mapManager } from './MapManager.js';
import { storageManager } from './StorageManager.js';

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

export class ObjectManager {
  private static instance: ObjectManager;
  
  private constructor() {}
  
  static getInstance(): ObjectManager {
    if (!ObjectManager.instance) {
      ObjectManager.instance = new ObjectManager();
    }
    return ObjectManager.instance;
  }
  
  // Отримання типу об'єкта
  getObjectType(layer: any): string {
    return getObjectType(layer);
  }
  
  // Отримання властивостей об'єкта
  getObjectProperties(layer: any): ObjectProperties {
    return getObjectProperties(layer);
  }
  
  // Встановлення властивості об'єкта
  setObjectProperty(layer: any, key: string, value: any): void {
    setObjectProperty(layer, key, value);
  }
  
  // Застосування стилю до об'єкта
  applyObjectStyle(layer: any, style: any): void {
    applyObjectStyle(layer, style);
  }
  
  // Застосування властивостей до об'єкта
  applyObjectProperties(layer: any, properties: ObjectProperties): void {
    const type = this.getObjectType(layer);
    
    // Встановлюємо базові властивості
    this.setObjectProperty(layer, 'name', properties.name);
    this.setObjectProperty(layer, 'description', properties.description);
    
    switch (type) {
      case 'marker':
        this.applyMarkerProperties(layer, properties);
        break;
      case 'polygon':
      case 'circle':
      case 'rectangle':
        this.applyPolygonProperties(layer, properties);
        break;
      case 'polyline':
        this.applyPolylineProperties(layer, properties);
        break;
      case 'image':
        this.applyImageProperties(layer, properties);
        break;
    }
  }
  
  // Застосування властивостей маркера
  private applyMarkerProperties(layer: any, properties: ObjectProperties): void {
    const iconName = properties.icon || 'place';
    const color = properties.color || '#1976d2';
    
    // Створюємо іконку
    const icon = this.createMarkerIcon(color, iconName);
    layer.setIcon(icon);
    
    this.setObjectProperty(layer, 'color', color);
    this.setObjectProperty(layer, 'icon', iconName);
    layer.options.color = color;
  }
  
  // Застосування властивостей полігону
  private applyPolygonProperties(layer: any, properties: ObjectProperties): void {
    const color = properties.color || '#1976d2';
    const fillColor = properties.fillColor || '#1976d2';
    const fillOpacity = properties.fillOpacity ?? 0.2;
    
    this.applyObjectStyle(layer, {
      fillColor: fillColor,
      color: color,
      fillOpacity: fillOpacity,
    });
    
    this.setObjectProperty(layer, 'color', color);
    this.setObjectProperty(layer, 'fillColor', fillColor);
    this.setObjectProperty(layer, 'fillOpacity', fillOpacity);
  }
  
  // Застосування властивостей лінії
  private applyPolylineProperties(layer: any, properties: ObjectProperties): void {
    const color = properties.color || '#1976d2';
    const weight = properties.weight || 3;
    const opacity = properties.opacity ?? 1;
    const dashArray = this.getDashArray(properties.style);
    
    this.applyObjectStyle(layer, {
      color: color,
      weight: weight,
      opacity: opacity,
      dashArray: dashArray
    });
    
    this.setObjectProperty(layer, 'color', color);
    this.setObjectProperty(layer, 'weight', weight);
    this.setObjectProperty(layer, 'opacity', opacity);
    this.setObjectProperty(layer, 'style', properties.style);
  }
  
  // Застосування властивостей зображення
  private applyImageProperties(layer: any, properties: ObjectProperties): void {
    const opacity = properties.opacity ?? 1;
    
    this.applyObjectStyle(layer, {
      opacity: opacity
    });
    
    this.setObjectProperty(layer, 'opacity', opacity);
  }
  
  // Створення іконки маркера
  private createMarkerIcon(color: string, iconName: string): any {
    return (window as any).L.divIcon({
      className: 'custom-marker-icon',
      html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;margin-top:2px;"><i class="material-icons" style="color:#fff;font-size:20px;transform:rotate(45deg);">${iconName}</i></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    });
  }
  
  // Отримання dashArray для стилю лінії
  private getDashArray(style?: string): string | null {
    switch (style) {
      case 'dashed': return '10, 10';
      case 'dotted': return '2, 8';
      default: return null;
    }
  }
  
  // Видалення об'єкта
  removeObject(layer: any): void {
    mapManager.removeLayer(layer);
    storageManager.scheduleSave();
  }
  
  // Додавання об'єкта
  addObject(layer: any): void {
    mapManager.addLayer(layer);
    storageManager.scheduleSave();
  }
}

export const objectManager = ObjectManager.getInstance(); 