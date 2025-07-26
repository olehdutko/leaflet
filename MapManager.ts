// MapManager.ts - Централізоване управління картою
import { map } from './map-init.js';

export class MapManager {
  private static instance: MapManager;
  
  private constructor() {}
  
  static getInstance(): MapManager {
    if (!MapManager.instance) {
      MapManager.instance = new MapManager();
    }
    return MapManager.instance;
  }
  
  // Методи для роботи з картою
  getMap() {
    return map;
  }
  
  getCenter(): [number, number] {
    return [map.getCenter().lat, map.getCenter().lng];
  }
  
  setCenter(lat: number, lng: number): void {
    map.setView([lat, lng], map.getZoom());
  }
  
  addLayer(layer: any): void {
    map.addLayer(layer);
  }
  
  removeLayer(layer: any): void {
    map.removeLayer(layer);
  }
  
  hasLayer(layer: any): boolean {
    return map.hasLayer(layer);
  }
  
  invalidateSize(): void {
    map.invalidateSize();
  }
  
  // Методи для роботи з bounds
  getBounds(): L.LatLngBounds {
    return map.getBounds();
  }
  
  fitBounds(bounds: L.LatLngBounds): void {
    map.fitBounds(bounds);
  }
}

export const mapManager = MapManager.getInstance(); 