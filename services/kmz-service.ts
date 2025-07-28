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
    
    // Парсимо глобальні стилі
    const styles = this.parseGlobalStyles(kmlDoc);
    
    // Парсимо Placemarks
    const placemarks = kmlDoc.querySelectorAll('Placemark');
    console.log('KmzService: Знайдено placemarks:', placemarks.length);
    
            placemarks.forEach((placemark, index) => {
          const geometry = this.parsePlacemarkGeometry(placemark, styles);
          if (geometry) {
            console.log(`KmzService: Створено об'єкт ${index + 1}:`, {
              type: geometry.feature?.geometry?.type,
              name: geometry.properties?.name,
              hasFeature: !!geometry.feature,
              hasProperties: !!geometry.properties,
              featureProperties: geometry.feature?.properties,
              layerProperties: geometry.properties
            });
            
            featureGroup.addLayer(geometry);
            
            // Додаємо обробник подвійного кліку для редагування
            if (geometry.on) {
              geometry.on('dblclick', () => {
                // Імпортуємо функцію showEditModal динамічно
                import('../ui.js').then(({ showEditModal }) => {
                  showEditModal(geometry);
                });
              });
            }
            
            // Застосовуємо стилі до об'єкта
            if (geometry.properties) {
              import('../objects.js').then(({ applyObjectProperties }) => {
                applyObjectProperties(geometry, geometry.properties);
              });
            }
          }
        });
        
        // Перевіряємо об'єкти після додавання до featureGroup
        console.log('KmzService: Перевіряємо об\'єкти після додавання до featureGroup:');
        featureGroup.getLayers().forEach((layer: any, index: number) => {
          console.log(`  Об'єкт ${index + 1} після додавання:`, {
            type: layer.constructor.name,
            hasFeature: !!layer.feature,
            hasProperties: !!layer.properties,
            featureProperties: layer.feature?.properties,
            layerProperties: layer.properties
          });
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

  private parsePlacemarkGeometry(placemark: Element, globalStyles?: Map<string, any>): any {
    // Парсимо метадані об'єкта
    const name = placemark.querySelector('name')?.textContent?.trim() || '';
    const description = placemark.querySelector('description')?.textContent?.trim() || '';
    
    // Парсимо стилі з KML
    const styleUrl = placemark.querySelector('styleUrl')?.textContent?.trim();
    let style = this.parsePlacemarkStyle(placemark);
    
    // Якщо є styleUrl, спробуємо знайти глобальний стиль
    if (styleUrl && globalStyles && globalStyles.has(styleUrl)) {
      const globalStyle = globalStyles.get(styleUrl);
      if (globalStyle && typeof globalStyle === 'object' && !globalStyle.key) {
        // Об'єднуємо локальні та глобальні стилі
        style = { ...globalStyle, ...style };
      }
    }
    
    // Парсимо Point
    const point = placemark.querySelector('Point');
    if (point) {
      const coords = this.parseCoordinates(point.querySelector('coordinates'));
      if (coords && coords.length > 0) {
        const [lng, lat] = coords[0];
        const marker = L.marker([lat, lng]);
        
        // Створюємо feature об'єкт для збереження в localStorage
        const properties = {
          name: name,
          description: description,
          color: style.color || '#1976d2',
          icon: style.icon || 'place'
        };
        
        console.log('KmzService: Створюємо Point з властивостями:', properties);
        
        marker.feature = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          properties: properties
        };
        
        // Додаємо метадані до маркера
        marker.properties = properties;
        
        return marker;
      }
    }

    // Парсимо LineString
    const lineString = placemark.querySelector('LineString');
    if (lineString) {
      const coords = this.parseCoordinates(lineString.querySelector('coordinates'));
      if (coords && coords.length > 1) {
        const latlngs = coords.map(([lng, lat]) => [lat, lng]);
        const polyline = L.polyline(latlngs);
        
        // Створюємо feature об'єкт для збереження в localStorage
        const properties = {
          name: name,
          description: description,
          color: style.color || '#1976d2',
          weight: style.weight || 3,
          opacity: style.opacity ?? 1,
          style: 'solid' // Завжди встановлюємо 'solid' як дефолтний стиль
        };
        
        console.log('KmzService: Створюємо LineString з властивостями:', properties);
        
        polyline.feature = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coords
          },
          properties: properties
        };
        
        // Додаємо метадані до полілінії
        polyline.properties = properties;
        
        return polyline;
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
          const polygonLayer = L.polygon(latlngs);
          
          // Створюємо feature об'єкт для збереження в localStorage
          const properties = {
            name: name,
            description: description,
            color: style.color || '#1976d2',
            fillColor: style.fillColor || style.color || '#1976d2',
            fillOpacity: style.fillOpacity ?? 0.2,
            weight: style.weight || 3,
            opacity: style.opacity ?? 1
          };
          
          console.log('KmzService: Створюємо Polygon з властивостями:', properties);
          
          polygonLayer.feature = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [coords] // Polygon потребує масив масивів координат
            },
            properties: properties
          };
          
          // Додаємо метадані до полігону
          polygonLayer.properties = properties;
          
          return polygonLayer;
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

    console.log('KmzService: Додаємо шар:', {
      id: layerObj.id,
      title: layerObj.title,
      objectsCount: layerConfig.featureGroup.getLayers().length
    });

    // Додаємо шари до карти
    layerConfig.tileLayer.addTo(this.map);
    layerConfig.featureGroup.addTo(this.map);

    this.customLayers.push(layerObj);
    
    const control = this.createLayerControl(layerObj);
    if (control && this.layerControlsDiv) {
      this.layerControlsDiv.appendChild(control);
    }
    
    console.log('KmzService: Викликаємо saveLayersToStorage...');
    // Додаємо невелику затримку, щоб об'єкти повністю ініціалізувалися
    setTimeout(() => {
      this.saveLayersToStorage?.();
      console.log('KmzService: saveLayersToStorage викликано');
    }, 100);

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

  private parseGlobalStyles(kmlDoc: Document): Map<string, any> {
    const styles = new Map<string, any>();
    
    // Парсимо StyleMap елементи
    const styleMaps = kmlDoc.querySelectorAll('StyleMap');
    styleMaps.forEach(styleMap => {
      const id = styleMap.getAttribute('id');
      if (id) {
        const pairs = styleMap.querySelectorAll('Pair');
        pairs.forEach(pair => {
          const key = pair.querySelector('key')?.textContent?.trim();
          const styleUrl = pair.querySelector('styleUrl')?.textContent?.trim();
          if (key && styleUrl) {
            styles.set(styleUrl, { key, styleUrl });
          }
        });
      }
    });
    
    // Парсимо Style елементи
    const styleElements = kmlDoc.querySelectorAll('Style');
    styleElements.forEach((style: Element) => {
      const id = style.getAttribute('id');
      if (id) {
        const styleData = this.parseStyleElement(style);
        styles.set(`#${id}`, styleData);
      }
    });
    
    return styles;
  }

  private parseStyleElement(style: Element): any {
    const styleData: any = {};
    
    // Парсимо IconStyle
    const iconStyle = style.querySelector('IconStyle');
    if (iconStyle) {
      const color = iconStyle.querySelector('color')?.textContent?.trim();
      if (color) {
        styleData.color = this.convertKmlColor(color);
      }
      
      const icon = iconStyle.querySelector('Icon');
      if (icon) {
        const href = icon.querySelector('href')?.textContent?.trim();
        if (href) {
          styleData.icon = href;
        }
      }
    }
    
    // Парсимо LineStyle
    const lineStyle = style.querySelector('LineStyle');
    if (lineStyle) {
      const color = lineStyle.querySelector('color')?.textContent?.trim();
      if (color) {
        styleData.color = this.convertKmlColor(color);
      }
      
      const width = lineStyle.querySelector('width')?.textContent?.trim();
      if (width) {
        styleData.weight = parseFloat(width);
      }
    }
    
    // Парсимо PolyStyle
    const polyStyle = style.querySelector('PolyStyle');
    if (polyStyle) {
      const color = polyStyle.querySelector('color')?.textContent?.trim();
      if (color) {
        styleData.fillColor = this.convertKmlColor(color);
      }
      
      const fill = polyStyle.querySelector('fill')?.textContent?.trim();
      if (fill !== undefined) {
        styleData.fillOpacity = fill === '1' ? 1 : 0;
      }
    }
    
    return styleData;
  }

  private parsePlacemarkStyle(placemark: Element): any {
    const style: any = {};
    
    // Парсимо вбудовані стилі
    const iconStyle = placemark.querySelector('IconStyle');
    if (iconStyle) {
      const color = iconStyle.querySelector('color')?.textContent?.trim();
      if (color) {
        // Конвертуємо KML color (AABBGGRR) в hex
        style.color = this.convertKmlColor(color);
      }
      
      const icon = iconStyle.querySelector('Icon');
      if (icon) {
        const href = icon.querySelector('href')?.textContent?.trim();
        if (href) {
          style.icon = href;
        }
      }
    }
    
    // Парсимо стилі ліній
    const lineStyle = placemark.querySelector('LineStyle');
    if (lineStyle) {
      const color = lineStyle.querySelector('color')?.textContent?.trim();
      if (color) {
        style.color = this.convertKmlColor(color);
      }
      
      const width = lineStyle.querySelector('width')?.textContent?.trim();
      if (width) {
        style.weight = parseFloat(width);
      }
    }
    
    // Парсимо стилі полігонів
    const polyStyle = placemark.querySelector('PolyStyle');
    if (polyStyle) {
      const color = polyStyle.querySelector('color')?.textContent?.trim();
      if (color) {
        style.fillColor = this.convertKmlColor(color);
      }
      
      const fill = polyStyle.querySelector('fill')?.textContent?.trim();
      if (fill !== undefined) {
        style.fillOpacity = fill === '1' ? 1 : 0;
      }
      
      const outline = polyStyle.querySelector('outline')?.textContent?.trim();
      if (outline !== undefined) {
        style.outline = outline === '1';
      }
    }
    
    return style;
  }

  private convertKmlColor(kmlColor: string): string {
    // KML використовує формат AABBGGRR (Alpha, Blue, Green, Red)
    if (kmlColor.length === 8) {
      const alpha = parseInt(kmlColor.substring(0, 2), 16) / 255;
      const blue = parseInt(kmlColor.substring(2, 4), 16);
      const green = parseInt(kmlColor.substring(4, 6), 16);
      const red = parseInt(kmlColor.substring(6, 8), 16);
      
      return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
    }
    
    return '#1976d2'; // Дефолтний колір
  }
} 