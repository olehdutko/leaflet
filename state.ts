// Централізований State Manager для управління станом додатку

export interface AppState {
  customLayers: any[];
  activeLayer: any;
  currentEditingObject: any;
  layerId: number;
  isDraggingObject: boolean;
}

class StateManager {
  private state: AppState = {
    customLayers: [],
    activeLayer: null,
    currentEditingObject: null,
    layerId: 1,
    isDraggingObject: false
  };

  private saveCallbacks: (() => void)[] = [];
  private saveTimeout: number | null = null;

  // Геттери для доступу до стану
  get customLayers() { return this.state.customLayers; }
  get activeLayer() { return this.state.activeLayer; }
  get currentEditingObject() { return this.state.currentEditingObject; }
  get layerId() { return this.state.layerId; }
  get isDraggingObject() { return this.state.isDraggingObject; }

  // Сеттери з автоматичним збереженням
  set customLayers(layers: any[]) {
    this.state.customLayers = layers;
    this.scheduleSave();
  }

  set activeLayer(layer: any) {
    this.state.activeLayer = layer;
    this.scheduleSave();
  }

  set currentEditingObject(obj: any) {
    this.state.currentEditingObject = obj;
  }

  set layerId(id: number) {
    this.state.layerId = id;
  }

  set isDraggingObject(dragging: boolean) {
    this.state.isDraggingObject = dragging;
  }

  // Методи для роботи з шарами
  addLayer(layer: any) {
    this.state.customLayers.push(layer);
    this.scheduleSave();
  }

  removeLayer(layerId: number) {
    this.state.customLayers = this.state.customLayers.filter(l => l.id !== layerId);
    this.scheduleSave();
  }

  updateLayer(layerId: number, updates: any) {
    const layer = this.state.customLayers.find(l => l.id === layerId);
    if (layer) {
      Object.assign(layer, updates);
      this.scheduleSave();
    }
  }

  // Реєстрація callback для збереження
  registerSaveCallback(callback: () => void) {
    this.saveCallbacks.push(callback);
  }

  // Планування збереження з дебаунсом
  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.performSave();
    }, 100);
  }

  // Виконання збереження
  private performSave() {
    this.saveCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in save callback:', error);
      }
    });
    this.saveTimeout = null;
  }

  // Примусове збереження
  forceSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.performSave();
  }

  // Отримання повного стану
  getState(): AppState {
    return { ...this.state };
  }

  // Встановлення стану
  setState(newState: Partial<AppState>) {
    Object.assign(this.state, newState);
    this.scheduleSave();
  }
}

// Експортуємо єдиний екземпляр
export const stateManager = new StateManager();

// Експортуємо для зворотної сумісності
export const state = {
  currentEditingObject: { value: null }
}; 