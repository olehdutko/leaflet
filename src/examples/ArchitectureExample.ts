// Приклад використання нової архітектури

import { appManager } from '../managers/AppManager.js';
import { StateManager } from '../managers/StateManager.js';
import { Logger } from '../utils/Logger.js';
import { DOMUtils } from '../utils/DOMUtils.js';
import { BaseService } from '../base/BaseService.js';
import { BaseComponent } from '../base/BaseComponent.js';
import { LatLng } from '../types/index.js';
import { LayerType, ObjectType, LogLevel } from '../enums/index.js';

// Приклад стану додатку
interface AppState {
  layers: any[];
  activeLayer: any | null;
  currentEditingObject: any | null;
  layerId: number;
  isDraggingObject: boolean;
  settings: {
    theme: 'light' | 'dark';
    language: 'uk' | 'en';
    autoSave: boolean;
  };
}

// Приклад сервісу для роботи з шарами
class LayerService extends BaseService {
  private layers: any[] = [];

  constructor() {
    super('LayerService');
  }

  async addLayer(name: string, type: LayerType): Promise<any> {
    return this.safeExecute(async () => {
      const layer = {
        id: Date.now(),
        name,
        type,
        visible: true,
        objects: []
      };

      this.layers.push(layer);
      this.logger.info(`Layer added: ${name} (${type})`);
      return layer;
    }, 'addLayer');
  }

  async removeLayer(layerId: number): Promise<void> {
    return this.safeExecute(async () => {
      this.layers = this.layers.filter(l => l.id !== layerId);
      this.logger.info(`Layer removed: ${layerId}`);
    }, 'removeLayer');
  }

  getLayers(): any[] {
    return [...this.layers];
  }

  protected onInit(): void {
    this.logger.info('LayerService initialized');
  }

  protected onDestroy(): void {
    this.layers = [];
    this.logger.info('LayerService destroyed');
  }
}

// Приклад сервісу для роботи з об'єктами
class ObjectService extends BaseService {
  private objects: Map<string, any> = new Map();

  constructor() {
    super('ObjectService');
  }

  async addObject(type: ObjectType, position: LatLng, properties: any): Promise<any> {
    return this.safeExecute(async () => {
      const object = {
        id: `obj_${Date.now()}`,
        type,
        position,
        properties,
        createdAt: new Date()
      };

      this.objects.set(object.id, object);
      this.logger.info(`Object added: ${object.id} (${type})`);
      return object;
    }, 'addObject');
  }

  async removeObject(objectId: string): Promise<void> {
    return this.safeExecute(async () => {
      this.objects.delete(objectId);
      this.logger.info(`Object removed: ${objectId}`);
    }, 'removeObject');
  }

  getObject(objectId: string): any | undefined {
    return this.objects.get(objectId);
  }

  getAllObjects(): any[] {
    return Array.from(this.objects.values());
  }

  protected onInit(): void {
    this.logger.info('ObjectService initialized');
  }

  protected onDestroy(): void {
    this.objects.clear();
    this.logger.info('ObjectService destroyed');
  }
}

// Приклад UI компонента
class LayerListComponent extends BaseComponent {
  private layers: any[] = [];
  private onLayerSelect?: (layer: any) => void;

  constructor(element: HTMLElement) {
    super(element, 'LayerListComponent');
  }

  setLayers(layers: any[]): void {
    this.layers = layers;
    this.render();
  }

  setOnLayerSelect(callback: (layer: any) => void): void {
    this.onLayerSelect = callback;
  }

  private render(): void {
    this.updateDOM(() => {
      this.clearChildren();
      
      this.layers.forEach(layer => {
        const layerElement = this.createLayerElement(layer);
        this.appendChild(layerElement);
      });
    });
  }

  private createLayerElement(layer: any): HTMLElement {
    const element = this.createChildElement<HTMLElement>('div', 'layer-item');
    
    const nameElement = this.createChildElement<HTMLElement>('span', 'layer-name');
    DOMUtils.setText(nameElement, layer.name);
    
    const typeElement = this.createChildElement<HTMLElement>('span', 'layer-type');
    DOMUtils.setText(typeElement, layer.type);
    
    element.appendChild(nameElement);
    element.appendChild(typeElement);
    
    return element;
  }

  protected bindEvents(): void {
    this.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const layerItem = target.closest('.layer-item');
      
      if (layerItem && this.onLayerSelect) {
        const layerName = layerItem.querySelector('.layer-name')?.textContent;
        const layer = this.layers.find(l => l.name === layerName);
        if (layer) {
          this.onLayerSelect(layer);
        }
      }
    });
  }

  protected onInit(): void {
    this.logger.info('LayerListComponent initialized');
  }

  protected onDestroy(): void {
    this.logger.info('LayerListComponent destroyed');
  }
}

// Приклад використання
async function exampleUsage() {
  const logger = new Logger('Example');
  logger.setMinLevel(LogLevel.DEBUG);

  try {
    // Ініціалізуємо AppManager
    await appManager.init();

    // Створюємо сервіси
    const layerService = new LayerService();
    const objectService = new ObjectService();

    // Реєструємо сервіси в AppManager
    appManager.registerService('layers', layerService, 0);
    appManager.registerService('objects', objectService, 1);

    // Створюємо StateManager
    const initialState: AppState = {
      layers: [],
      activeLayer: null,
      currentEditingObject: null,
      layerId: 1,
      isDraggingObject: false,
      settings: {
        theme: 'light',
        language: 'uk',
        autoSave: true
      }
    };

    const stateManager = new StateManager<AppState>(initialState, 'AppState');

    // Реєструємо StateManager
    appManager.registerService('state', stateManager, 2);

    // Підписуємося на зміни стану
    const unsubscribe = stateManager.subscribe('ui', (state) => {
      logger.info('State changed', state);
    });

    // Додаємо шар
    const layer = await layerService.addLayer('Мій шар', LayerType.MARKER);
    
    // Додаємо об'єкт
    const object = await objectService.addObject(
      ObjectType.MARKER,
      { lat: 49.8397, lng: 24.0297 },
      { name: 'Львів', description: 'Місто Лева' }
    );

    // Оновлюємо стан
    stateManager.setState({
      layers: layerService.getLayers(),
      currentEditingObject: object
    });

    // Створюємо UI компонент
    const layerListElement = DOMUtils.getElement<HTMLElement>('#layer-list');
    if (layerListElement) {
      const layerListComponent = new LayerListComponent(layerListElement);
      await layerListComponent.init();

      layerListComponent.setLayers(layerService.getLayers());
      layerListComponent.setOnLayerSelect((layer) => {
        logger.info('Layer selected', layer);
        stateManager.updateField('activeLayer', layer);
      });
    }

    // Отримуємо статистику
    const stats = appManager.getStats();
    logger.info('App stats', stats);

    // Приклад роботи з DOM утилітами
    const button = DOMUtils.createElement<HTMLButtonElement>('button', 'btn-primary');
    DOMUtils.setText(button, 'Додати шар');
    DOMUtils.addEventListeners(button, {
      click: async () => {
        const newLayer = await layerService.addLayer('Новий шар', LayerType.POLYGON);
        stateManager.updateField('layers', layerService.getLayers());
      }
    });

    // Приклад дебаунсу
    const debouncedSave = DOMUtils.debounce(() => {
      logger.info('Saving data...');
    }, 1000);

    // Приклад троттлінгу
    const throttledUpdate = DOMUtils.throttle(() => {
      logger.info('Updating UI...');
    }, 100);

    logger.info('Example completed successfully');

  } catch (error) {
    logger.error('Example failed', error);
  }
}

// Експортуємо для використання
export {
  LayerService,
  ObjectService,
  LayerListComponent,
  exampleUsage
}; 