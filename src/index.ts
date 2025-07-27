// Експорт менеджерів
export { AppManager } from './managers/AppManager';
export { StateManager } from './managers/StateManager';
export { EventManager } from './managers/EventManager';

// Експорт сервісів
export { MapManager } from './services/MapManager';
export { OverlayManager } from './services/OverlayManager';
export { KmzManager } from './services/KmzManager';
export { GeoSearchManager } from './services/GeoSearchManager';
export { ModalManager } from './services/ModalManager';
export { StorageService } from './services/StorageService';

// Експорт компонентів
export { ModalComponent } from './components/ModalComponent';
export { LayerControlComponent } from './components/LayerControlComponent';
export { ObjectEditComponent } from './components/ObjectEditComponent';
export { SearchComponent } from './components/SearchComponent';
export { SettingsComponent } from './components/SettingsComponent';

// Експорт базових класів
export { BaseService } from './base/BaseService';
export { BaseComponent } from './base/BaseComponent';

// Експорт утиліт
export { Logger } from './utils/Logger';
export { DOMUtils } from './utils/DOMUtils';

// Експорт інтерфейсів
export { ILayer } from './interfaces/ILayer';
export { IStorage } from './interfaces/IStorage';

// Експорт типів
export * from './types/index';

// Експорт enum'ів
export * from './enums/index';

// Експорт адаптерів
export { LegacyAdapter, legacyAdapter } from './adapters/LegacyAdapter';

// Експорт інтеграції
export { IntegrationManager, integrationManager } from './integration/IntegrationManager';

// Експорт головної функції ініціалізації
export { initializeApp } from './main';

// Версія архітектури
export const ARCHITECTURE_VERSION = 'v4.0.0'; 