import { MapObject, LatLngBounds } from '../types/index.js';
import { LayerType } from '../enums/index.js';

export interface ILayer {
  id: number;
  name: string;
  type: LayerType;
  visible: boolean;
  objects: MapObject[];
  featureGroup?: any; // Leaflet FeatureGroup
  
  // Методи для роботи з об'єктами
  addObject(object: MapObject): void;
  removeObject(objectId: string): void;
  getObject(objectId: string): MapObject | undefined;
  updateObject(objectId: string, updates: Partial<MapObject>): void;
  
  // Методи для роботи з видимістю
  show(): void;
  hide(): void;
  toggle(): void;
  
  // Методи для роботи з межами
  getBounds(): LatLngBounds | null;
  fitBounds(): void;
  
  // Методи для збереження/завантаження
  toJSON(): any;
  fromJSON(data: any): void;
  
  // Методи для очищення
  clear(): void;
  destroy(): void;
}

export interface ILayerManager {
  // Методи для роботи з шарами
  createLayer(name: string, type: LayerType): ILayer;
  addLayer(layer: ILayer): void;
  removeLayer(layerId: number): void;
  getLayer(layerId: number): ILayer | undefined;
  getAllLayers(): ILayer[];
  
  // Методи для роботи з активним шаром
  setActiveLayer(layerId: number): void;
  getActiveLayer(): ILayer | null;
  
  // Методи для збереження/завантаження
  saveLayers(): void;
  loadLayers(): void;
  
  // Методи для очищення
  clearAllLayers(): void;
  
  // Події
  onLayerAdded(callback: (layer: ILayer) => void): void;
  onLayerRemoved(callback: (layerId: number) => void): void;
  onActiveLayerChanged(callback: (layer: ILayer | null) => void): void;
} 