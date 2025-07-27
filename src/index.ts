// Головний індексний файл для експорту всіх модулів

// Базові класи
export { BaseService } from './base/BaseService.js';
export { BaseComponent } from './base/BaseComponent.js';

// Менеджери
export { AppManager, appManager } from './managers/AppManager.js';
export { StateManager } from './managers/StateManager.js';
export { EventManager } from './managers/EventManager.js';

// Сервіси
export { StorageService } from './services/StorageService.js';

// Компоненти
export { ModalComponent } from './components/ModalComponent.js';

// Утиліти
export { Logger } from './utils/Logger.js';
export { DOMUtils } from './utils/DOMUtils.js';

// Типи
export * from './types/index.js';

// Enum'и
export * from './enums/index.js';

// Інтерфейси
export * from './interfaces/ILayer.js';
export * from './interfaces/IStorage.js';

// Приклади
export * from './examples/ArchitectureExample.js';

// Головний файл
export * from './main.js'; 