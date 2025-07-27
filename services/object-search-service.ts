// Сервіс для глобального пошуку об'єктів
declare const L: any; // Leaflet global

export interface SearchableObject {
  id: string;
  name: string;
  description: string;
  type: 'marker' | 'polyline' | 'polygon' | 'image';
  layer: any; // Leaflet layer
  layerName: string;
  coordinates?: { lat: number; lng: number };
  bounds?: { north: number; south: number; east: number; west: number };
}

export interface ObjectSearchResult {
  object: SearchableObject;
  relevance: number;
  matchedFields: string[];
}

export interface ObjectSearchOptions {
  query: string;
  includeHidden?: boolean;
  layerFilter?: string[];
  typeFilter?: string[];
  maxResults?: number;
}

export class ObjectSearchService {
  private static instance: ObjectSearchService;
  private customLayers: any[] = [];

  private constructor() {}

  static getInstance(): ObjectSearchService {
    if (!ObjectSearchService.instance) {
      ObjectSearchService.instance = new ObjectSearchService();
    }
    return ObjectSearchService.instance;
  }

  setCustomLayers(layers: any[]): void {
    this.customLayers = layers;
  }

  search(options: ObjectSearchOptions): ObjectSearchResult[] {
    const query = options.query.toLowerCase().trim();
    if (!query || query.length < 2) return [];

    const results: ObjectSearchResult[] = [];
    const searchableObjects = this.getSearchableObjects(options);

    for (const obj of searchableObjects) {
      const relevance = this.calculateRelevance(obj, query);
      if (relevance > 0) {
        const matchedFields = this.getMatchedFields(obj, query);
        results.push({
          object: obj,
          relevance,
          matchedFields
        });
      }
    }

    // Сортування за релевантністю
    results.sort((a, b) => b.relevance - a.relevance);

    // Обмеження кількості результатів
    const maxResults = options.maxResults || 20;
    return results.slice(0, maxResults);
  }

  private getSearchableObjects(options: ObjectSearchOptions): SearchableObject[] {
    const objects: SearchableObject[] = [];

    for (const layerObj of this.customLayers) {
      // Перевірка фільтра шарів
      if (options.layerFilter && !options.layerFilter.includes(layerObj.name)) {
        continue;
      }

      // Пропускаємо приховані шари
      if (!options.includeHidden && !layerObj.visible) {
        continue;
      }

      const fg = layerObj.featureGroup;
      if (!fg) continue;

      // Пошук по об'єктах шару
      fg.eachLayer((layer: any) => {
        if (!options.includeHidden && layer.visible === false) return;

        const object = this.createSearchableObject(layer, layerObj.name);
        if (object && (!options.typeFilter || options.typeFilter.includes(object.type))) {
          objects.push(object);
        }
      });

      // Пошук по зображеннях
      if ((fg as any).images && (fg as any).images.length > 0 && (fg as any).overlays) {
        (fg as any).images.forEach((img: any, idx: number) => {
          const overlay = (fg as any).overlays[idx];
          if (!options.includeHidden && (!overlay || overlay.visible === false)) return;

          const object = this.createSearchableObjectFromImage(img, overlay, layerObj.name);
          if (object && (!options.typeFilter || options.typeFilter.includes(object.type))) {
            objects.push(object);
          }
        });
      }
    }

    return objects;
  }

  private createSearchableObject(layer: any, layerName: string): SearchableObject | null {
    const name = layer.properties?.name || layer.feature?.properties?.name || '';
    const description = layer.properties?.description || layer.feature?.properties?.description || '';
    
    let type: 'marker' | 'polyline' | 'polygon' | 'image' = 'marker';
    let coordinates: { lat: number; lng: number } | undefined;
    let bounds: { north: number; south: number; east: number; west: number } | undefined;

    if (layer instanceof L.Marker && !(layer instanceof L.CircleMarker)) {
      type = 'marker';
      coordinates = layer.getLatLng();
    } else if (layer instanceof L.Polyline) {
      type = 'polyline';
      bounds = this.getBoundsFromLayer(layer);
    } else if (layer instanceof L.Polygon) {
      type = 'polygon';
      bounds = this.getBoundsFromLayer(layer);
    }

    return {
      id: layer._leaflet_id?.toString() || Math.random().toString(36),
      name,
      description,
      type,
      layer,
      layerName,
      coordinates,
      bounds
    };
  }

  private createSearchableObjectFromImage(img: any, overlay: any, layerName: string): SearchableObject | null {
    const name = img.properties?.name || '';
    const description = img.properties?.description || '';

    return {
      id: overlay?._leaflet_id?.toString() || Math.random().toString(36),
      name,
      description,
      type: 'image',
      layer: overlay,
      layerName,
      bounds: overlay ? this.getBoundsFromLayer(overlay) : undefined
    };
  }

  private getBoundsFromLayer(layer: any): { north: number; south: number; east: number; west: number } | undefined {
    try {
      const bounds = layer.getBounds();
      if (bounds) {
        return {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        };
      }
    } catch (error) {
      console.warn('Не вдалося отримати межі для об\'єкта:', error);
    }
    return undefined;
  }

  private calculateRelevance(obj: SearchableObject, query: string): number {
    let relevance = 0;
    const nameLower = obj.name.toLowerCase();
    const descLower = obj.description.toLowerCase();

    // Пошук по назві (вища вага)
    if (nameLower.includes(query)) {
      relevance += 10;
      // Бонус за точний збіг на початку назви
      if (nameLower.startsWith(query)) {
        relevance += 5;
      }
    }

    // Пошук по опису (менша вага)
    if (descLower.includes(query)) {
      relevance += 3;
    }

    // Бонус за короткі назви (більш точні збіги)
    if (obj.name.length < 20) {
      relevance += 1;
    }

    return relevance;
  }

  private getMatchedFields(obj: SearchableObject, query: string): string[] {
    const matchedFields: string[] = [];
    const nameLower = obj.name.toLowerCase();
    const descLower = obj.description.toLowerCase();

    if (nameLower.includes(query)) {
      matchedFields.push('name');
    }
    if (descLower.includes(query)) {
      matchedFields.push('description');
    }

    return matchedFields;
  }

  // Метод для швидкого пошуку (без детального аналізу)
  quickSearch(query: string, maxResults: number = 10): SearchableObject[] {
    const results = this.search({ query, maxResults });
    return results.map(result => result.object);
  }

  // Метод для пошуку по типу об'єкта
  searchByType(type: string, maxResults: number = 20): SearchableObject[] {
    const results = this.search({ 
      query: '', 
      typeFilter: [type], 
      maxResults,
      includeHidden: true 
    });
    return results.map(result => result.object);
  }
} 