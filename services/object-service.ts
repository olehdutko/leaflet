// Сервіс для роботи з об'єктами на карті

import type { ObjectProperties } from '../types/index.js';
import { getColoredMarkerIcon } from '../utils.js';

declare const L: any;

/**
 * Сервіс для роботи з об'єктами на карті
 */
export class ObjectService {
  
  /**
   * Отримання типу об'єкта
   */
  static getObjectType(layer: any): string {
    if (layer instanceof L.Marker) return 'marker';
    if (layer instanceof L.Polygon) return 'polygon';
    if (layer instanceof L.Polyline) return 'polyline';
    if (layer instanceof L.Circle) return 'circle';
    if (layer instanceof L.Rectangle) return 'rectangle';
    if (layer instanceof L.ImageOverlay) return 'image';
    return 'unknown';
  }
  
  /**
   * Отримання властивостей об'єкта
   */
  static getObjectProperties(layer: any): ObjectProperties {
    const properties: ObjectProperties = {};
    
    if (layer.properties) {
      Object.assign(properties, layer.properties);
    }
    
    if (layer.feature && layer.feature.properties) {
      Object.assign(properties, layer.feature.properties);
    }
    
    return properties;
  }
  
  /**
   * Встановлення властивості об'єкта
   */
  static setObjectProperty(layer: any, property: string, value: any): void {
    if (!layer.properties) {
      layer.properties = {};
    }
    layer.properties[property] = value;
  }
  
  /**
   * Застосування стилів до об'єкта
   */
  static applyObjectStyle(layer: any, style: any): void {
    if (layer.setStyle) {
      layer.setStyle(style);
    }
  }
  
  /**
   * Застосування властивостей до об'єкта
   */
  static applyObjectProperties(layer: any, properties: ObjectProperties): void {
    const type = this.getObjectType(layer);
    
    // Встановлюємо базові властивості
    this.setObjectProperty(layer, 'name', properties.name);
    this.setObjectProperty(layer, 'description', properties.description);
    
    if (type === 'marker') {
      this.applyMarkerProperties(layer, properties);
    } else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
      this.applyPolygonProperties(layer, properties);
    } else if (type === 'polyline') {
      this.applyPolylineProperties(layer, properties);
    }
  }
  
  /**
   * Застосування властивостей до маркера
   */
  private static applyMarkerProperties(layer: any, properties: ObjectProperties): void {
    const iconName = properties.icon || 'place';
    const color = properties.color || '#1976d2';

    // Перевіряємо, чи це цифра (0-9)
    const isDigit = /^\d$/.test(iconName);
    
    let iconHtml: string;
    if (isDigit) {
      // Для цифр використовуємо текст замість Material Icons
      iconHtml = `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;margin-top:2px;"><span style="color:#fff;font-size:18px;font-weight:bold;font-family:Arial,sans-serif;transform:rotate(45deg);">${iconName}</span></div>`;
    } else {
      // Для Material Icons використовуємо стандартний формат
      iconHtml = `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;margin-top:2px;"><i class="material-icons" style="color:#fff;font-size:20px;transform:rotate(45deg);">${iconName}</i></div>`;
    }

    layer.setIcon(L.divIcon({
      className: 'custom-marker-icon',
      html: iconHtml,
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    }));
    
    this.setObjectProperty(layer, 'color', color);
    this.setObjectProperty(layer, 'icon', iconName);
    layer.options.color = color;
  }
  
  /**
   * Застосування властивостей до полігону
   */
  private static applyPolygonProperties(layer: any, properties: ObjectProperties): void {
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
  
  /**
   * Застосування властивостей до лінії
   */
  private static applyPolylineProperties(layer: any, properties: ObjectProperties): void {
    const color = properties.color || '#1976d2';
    const weight = properties.weight || 3;
    const opacity = properties.opacity ?? 1;
    const dashArray = this.getDashArrayFromStyle(properties.style);

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
  
  /**
   * Отримання dashArray з стилю
   */
  private static getDashArrayFromStyle(style?: string): string | null {
    switch (style) {
      case 'dashed': return '10, 10';
      case 'dotted': return '2, 8';
      case 'solid':
      default: return null;
    }
  }
  
  /**
   * Створення маркера з властивостями
   */
  static createMarker(latlng: L.LatLng, properties: ObjectProperties): L.Marker {
    const color = properties.color || '#1976d2';
    const iconName = properties.icon || 'place';
    
    const marker = L.marker(latlng, {
      icon: getColoredMarkerIcon(color, iconName)
    });
    
    this.applyObjectProperties(marker, properties);
    return marker;
  }
  
  /**
   * Створення полігону з властивостями
   */
  static createPolygon(latlngs: L.LatLng[], properties: ObjectProperties): L.Polygon {
    const polygon = L.polygon(latlngs);
    this.applyObjectProperties(polygon, properties);
    return polygon;
  }
  
  /**
   * Створення лінії з властивостями
   */
  static createPolyline(latlngs: L.LatLng[], properties: ObjectProperties): L.Polyline {
    const polyline = L.polyline(latlngs);
    this.applyObjectProperties(polyline, properties);
    return polyline;
  }
  
  /**
   * Створення кола з властивостями
   */
  static createCircle(center: L.LatLng, radius: number, properties: ObjectProperties): L.Circle {
    const circle = L.circle(center, { radius });
    this.applyObjectProperties(circle, properties);
    return circle;
  }
  
  /**
   * Створення прямокутника з властивостями
   */
  static createRectangle(bounds: L.LatLngBounds, properties: ObjectProperties): L.Rectangle {
    const rectangle = L.rectangle(bounds);
    this.applyObjectProperties(rectangle, properties);
    return rectangle;
  }
  
  /**
   * Отримання координат об'єкта
   */
  static getObjectCoordinates(layer: any): L.LatLng | L.LatLng[] | null {
    const type = this.getObjectType(layer);
    
    switch (type) {
      case 'marker':
        return layer.getLatLng();
      case 'polygon':
      case 'polyline':
        return layer.getLatLngs();
      case 'circle':
        return layer.getLatLng();
      case 'rectangle':
        return layer.getBounds();
      default:
        return null;
    }
  }
  
  /**
   * Встановлення координат об'єкта
   */
  static setObjectCoordinates(layer: any, coordinates: L.LatLng | L.LatLng[]): void {
    const type = this.getObjectType(layer);
    
    switch (type) {
      case 'marker':
        layer.setLatLng(coordinates as L.LatLng);
        break;
      case 'polygon':
      case 'polyline':
        layer.setLatLngs(coordinates as L.LatLng[]);
        break;
      case 'circle':
        layer.setLatLng(coordinates as L.LatLng);
        break;
      case 'rectangle':
        if (Array.isArray(coordinates)) {
          layer.setLatLngs(coordinates);
        } else {
          layer.setLatLng(coordinates);
        }
        break;
    }
  }
} 