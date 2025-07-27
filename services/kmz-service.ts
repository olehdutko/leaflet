// Сервіс для обробки KMZ файлів
declare const L: any; // Leaflet global
declare const JSZip: any; // JSZip library

export interface KmzLayerConfig {
  title: string;
  tileLayer: any;
  featureGroup: any;
  tileType: string;
}

export interface KmzImportOptions {
  onLayerExists?: (title: string, existingIndex: number) => Promise<string>;
  onSuccess?: (layerConfig: KmzLayerConfig) => void;
  onError?: (error: Error) => void;
}

export class KmzService {
  private static instance: KmzService;
  private map: any;
  private customLayers: any[] = [];
  private saveLayersToStorage: (() => void) | null = null;
  private createLayerControl: ((layer: any) => HTMLElement | undefined) | null = null;
  private getNextLayerId: (() => number) | null = null;
  private layerControlsDiv: HTMLElement | null = null;

  private constructor() {}

  static getInstance(): KmzService {
    if (!KmzService.instance) {
      KmzService.instance = new KmzService();
    }
    return KmzService.instance;
  }

  init(
    map: any,
    customLayers: any[],
    saveLayersToStorage: () => void,
    createLayerControl: (layer: any) => HTMLElement | undefined,
    getNextLayerId: () => number,
    layerControlsDiv: HTMLElement
  ): void {
    this.map = map;
    this.customLayers = customLayers;
    this.saveLayersToStorage = saveLayersToStorage;
    this.createLayerControl = createLayerControl;
    this.getNextLayerId = getNextLayerId;
    this.layerControlsDiv = layerControlsDiv;
  }

  async handleKmzFile(file: File, options: KmzImportOptions = {}): Promise<void> {
    try {
      const zip = await JSZip.loadAsync(file);
      
      // Знаходимо KML файл в архіві
      const kmlFile = Object.keys(zip.files).find(name => 
        name.toLowerCase().endsWith('.kml')
      );

      if (!kmlFile) {
        throw new Error('KML файл не знайдено в KMZ архіві');
      }

      const kmlContent = await zip.file(kmlFile)!.async('text');
      const parser = new DOMParser();
      const kmlDoc = parser.parseFromString(kmlContent, 'text/xml');

      // Перевіряємо на помилки парсингу
      const parseError = kmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('Помилка парсингу KML файлу');
      }

      // Отримуємо назву шару
      const nameElement = kmlDoc.querySelector('name');
      const layerTitle = nameElement?.textContent?.trim() || 'KMZ шар';

      // Перевіряємо чи існує шар з такою назвою
      const existsIdx = this.customLayers.findIndex(l => l.title === layerTitle);
      
      if (existsIdx !== -1) {
        if (options.onLayerExists) {
          const newTitle = await options.onLayerExists(layerTitle, existsIdx);
          if (newTitle) {
            await this.processKmzLayer(kmlDoc, newTitle, options);
          }
        } else {
          // За замовчуванням додаємо копію
          const copyTitle = this.generateUniqueTitle(layerTitle);
          await this.processKmzLayer(kmlDoc, copyTitle, options);
        }
      } else {
        await this.processKmzLayer(kmlDoc, layerTitle, options);
      }

    } catch (error: any) {
      console.error('Помилка при імпорті KMZ файлу:', error);
      options.onError?.(error);
    }
  }

  private async processKmzLayer(
    kmlDoc: Document,
    layerTitle: string,
    options: KmzImportOptions
  ): Promise<void> {
    // Створюємо feature group для об'єктів
    const featureGroup = L.featureGroup();
    
    // Парсимо Placemarks
    const placemarks = kmlDoc.querySelectorAll('Placemark');
    placemarks.forEach(placemark => {
      const geometry = this.parsePlacemarkGeometry(placemark);
      if (geometry) {
        featureGroup.addLayer(geometry);
      }
    });

    // Створюємо tile layer (можна налаштувати)
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    });

    const layerConfig: KmzLayerConfig = {
      title: layerTitle,
      tileLayer,
      featureGroup,
      tileType: 'План'
    };

    // Додаємо шар до системи
    this.addKmzLayer(layerConfig);
    
    options.onSuccess?.(layerConfig);
  }

  private parsePlacemarkGeometry(placemark: Element): any {
    // Парсимо Point
    const point = placemark.querySelector('Point');
    if (point) {
      const coords = this.parseCoordinates(point.querySelector('coordinates'));
      if (coords && coords.length > 0) {
        const [lng, lat] = coords[0];
        return L.marker([lat, lng]);
      }
    }

    // Парсимо LineString
    const lineString = placemark.querySelector('LineString');
    if (lineString) {
      const coords = this.parseCoordinates(lineString.querySelector('coordinates'));
      if (coords && coords.length > 1) {
        const latlngs = coords.map(([lng, lat]) => [lat, lng]);
        return L.polyline(latlngs);
      }
    }

    // Парсимо Polygon
    const polygon = placemark.querySelector('Polygon');
    if (polygon) {
      const outerBoundary = polygon.querySelector('outerBoundaryIs');
      if (outerBoundary) {
        const coords = this.parseCoordinates(outerBoundary.querySelector('coordinates'));
        if (coords && coords.length > 2) {
          const latlngs = coords.map(([lng, lat]) => [lat, lng]);
          return L.polygon(latlngs);
        }
      }
    }

    return null;
  }

  private parseCoordinates(coordElement: Element | null): Array<[number, number]> | null {
    if (!coordElement || !coordElement.textContent) return null;

    const coordText = coordElement.textContent.trim();
    const coords: Array<[number, number]> = [];

    coordText.split(/\s+/).forEach(coord => {
      const parts = coord.split(',');
      if (parts.length >= 2) {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (!isNaN(lng) && !isNaN(lat)) {
          coords.push([lng, lat]);
        }
      }
    });

    return coords.length > 0 ? coords : null;
  }

  private generateUniqueTitle(baseTitle: string): string {
    let title = baseTitle + ' (копія)';
    let counter = 2;
    
    while (this.customLayers.some(l => l.title === title)) {
      title = `${baseTitle} (копія ${counter++})`;
    }
    
    return title;
  }

  private addKmzLayer(layerConfig: KmzLayerConfig): void {
    if (!this.getNextLayerId || !this.createLayerControl || !this.layerControlsDiv) {
      console.error('KmzService не ініціалізовано повністю');
      return;
    }

    const layerObj = {
      id: this.getNextLayerId(),
      tileLayer: layerConfig.tileLayer,
      featureGroup: layerConfig.featureGroup,
      tileType: layerConfig.tileType,
      title: layerConfig.title,
      visible: true
    };

    this.customLayers.push(layerObj);
    
    const control = this.createLayerControl(layerObj);
    if (control && this.layerControlsDiv) {
      this.layerControlsDiv.appendChild(control);
    }
    
    this.saveLayersToStorage?.();

    // Центруємо карту на новому шарі якщо він має валідні межі
    if (layerConfig.featureGroup.getBounds().isValid()) {
      this.map.fitBounds(layerConfig.featureGroup.getBounds());
    }
  }

  // Оновлення посилань
  updateCustomLayers(customLayers: any[]): void {
    this.customLayers = customLayers;
  }

  updateSaveFunction(saveLayersToStorage: () => void): void {
    this.saveLayersToStorage = saveLayersToStorage;
  }

  updateLayerControlFunction(createLayerControl: (layer: any) => HTMLElement): void {
    this.createLayerControl = createLayerControl;
  }

  updateGetNextLayerIdFunction(getNextLayerId: () => number): void {
    this.getNextLayerId = getNextLayerId;
  }

  updateLayerControlsDiv(layerControlsDiv: HTMLElement): void {
    this.layerControlsDiv = layerControlsDiv;
  }
} 