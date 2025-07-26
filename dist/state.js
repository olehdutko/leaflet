// Централізований State Manager для управління станом додатку
class StateManager {
    constructor() {
        this.state = {
            customLayers: [],
            activeLayer: null,
            currentEditingObject: null,
            layerId: 1,
            isDraggingObject: false
        };
        this.saveCallbacks = [];
        this.saveTimeout = null;
    }
    // Геттери для доступу до стану
    get customLayers() { return this.state.customLayers; }
    get activeLayer() { return this.state.activeLayer; }
    get currentEditingObject() { return this.state.currentEditingObject; }
    get layerId() { return this.state.layerId; }
    get isDraggingObject() { return this.state.isDraggingObject; }
    // Сеттери з автоматичним збереженням
    set customLayers(layers) {
        this.state.customLayers = layers;
        this.scheduleSave();
    }
    set activeLayer(layer) {
        this.state.activeLayer = layer;
        this.scheduleSave();
    }
    set currentEditingObject(obj) {
        this.state.currentEditingObject = obj;
    }
    set layerId(id) {
        this.state.layerId = id;
    }
    set isDraggingObject(dragging) {
        this.state.isDraggingObject = dragging;
    }
    // Методи для роботи з шарами
    addLayer(layer) {
        this.state.customLayers.push(layer);
        this.scheduleSave();
    }
    removeLayer(layerId) {
        this.state.customLayers = this.state.customLayers.filter(l => l.id !== layerId);
        this.scheduleSave();
    }
    updateLayer(layerId, updates) {
        const layer = this.state.customLayers.find(l => l.id === layerId);
        if (layer) {
            Object.assign(layer, updates);
            this.scheduleSave();
        }
    }
    // Реєстрація callback для збереження
    registerSaveCallback(callback) {
        this.saveCallbacks.push(callback);
    }
    // Планування збереження з дебаунсом
    scheduleSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            this.performSave();
        }, 100);
    }
    // Виконання збереження
    performSave() {
        this.saveCallbacks.forEach(callback => {
            try {
                callback();
            }
            catch (error) {
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
    getState() {
        return Object.assign({}, this.state);
    }
    // Встановлення стану
    setState(newState) {
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
