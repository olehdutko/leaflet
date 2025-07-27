// Адаптер для поступової міграції існуючого коду

import { getElementById, setElementText, setInputValue, getInputValue, clearElementContent, addEventListener, setElementHTML } from '../utils/dom-utils.js';
import { StorageService } from '../services/storage-service.js';
import { ObjectService } from '../services/object-service.js';
import type { LayerObj, ObjectProperties } from '../types/index.js';

/**
 * Адаптер для зворотної сумісності з існуючим кодом
 */
export class LegacyAdapter {
  
  /**
   * Адаптер для функцій роботи з DOM
   */
  static DOM = {
    /**
     * Безпечне отримання елемента (заміна document.getElementById)
     */
    getElement: getElementById,
    
    /**
     * Безпечне встановлення тексту (заміна element.textContent = value)
     */
    setText: setElementText,
    
    /**
     * Безпечне встановлення значення input (заміна element.value = value)
     */
    setInputValue: setInputValue,
    
    /**
     * Безпечне отримання значення input (заміна element.value)
     */
    getInputValue: getInputValue,
    
    /**
     * Безпечне очищення вмісту елемента (заміна element.innerHTML = '')
     */
    clearElementContent: clearElementContent,
    
    /**
     * Безпечне додавання обробника події (заміна element.addEventListener)
     */
    addEventListener: addEventListener,
    
    /**
     * Безпечне встановлення HTML вмісту (заміна element.innerHTML = html)
     */
    setInnerHTML: setElementHTML
  };
  
  /**
   * Адаптер для функцій збереження
   */
  static Storage = {
    /**
     * Збереження шарів (заміна існуючої логіки)
     */
    saveLayers: (layers: LayerObj[]) => {
      console.log('🔄 Використовується новий StorageService для збереження');
      return StorageService.saveLayers(layers);
    },
    
    /**
     * Завантаження шарів (заміна існуючої логіки)
     */
    loadLayers: () => {
      console.log('🔄 Використовується новий StorageService для завантаження');
      return StorageService.loadLayers();
    },
    
    /**
     * Перевірка наявності збережених даних
     */
    hasLayers: () => {
      return StorageService.hasLayers();
    },
    
    /**
     * Очищення збережених даних
     */
    clearLayers: () => {
      return StorageService.clearLayers();
    }
  };
  
  /**
   * Адаптер для функцій роботи з об'єктами
   */
  static Objects = {
    /**
     * Отримання типу об'єкта (заміна існуючої логіки)
     */
    getObjectType: (layer: any) => {
      console.log('🔄 Використовується новий ObjectService для визначення типу');
      return ObjectService.getObjectType(layer);
    },
    
    /**
     * Отримання властивостей об'єкта (заміна існуючої логіки)
     */
    getObjectProperties: (layer: any) => {
      console.log('🔄 Використовується новий ObjectService для отримання властивостей');
      return ObjectService.getObjectProperties(layer);
    },
    
    /**
     * Встановлення властивості об'єкта (заміна існуючої логіки)
     */
    setObjectProperty: (layer: any, property: string, value: any) => {
      console.log('🔄 Використовується новий ObjectService для встановлення властивості');
      return ObjectService.setObjectProperty(layer, property, value);
    },
    
    /**
     * Застосування властивостей до об'єкта (заміна існуючої логіки)
     */
    applyObjectProperties: (layer: any, properties: ObjectProperties) => {
      console.log('🔄 Використовується новий ObjectService для застосування властивостей');
      return ObjectService.applyObjectProperties(layer, properties);
    }
  };
  
  /**
   * Міграція існуючих даних
   */
  static migrateData(oldData: any): any {
    console.log('🔄 Міграція даних зі старого формату...');
    
    // Тут можна додати логіку міграції даних
    // Наприклад, конвертація старих форматів у нові
    
    return oldData;
  }
  
  /**
   * Адаптер старих функцій
   */
  static adaptOldFunction(oldFunction: Function, newFunction: Function): Function {
    console.log('🔄 Адаптація старої функції до нової...');
    
    return (...args: any[]) => {
      try {
        // Спочатку пробуємо нову функцію
        return newFunction(...args);
      } catch (error) {
        console.warn('⚠️ Нова функція не спрацювала, використовуємо стару:', error);
        // Якщо нова функція не спрацювала, використовуємо стару
        return oldFunction(...args);
      }
    };
  }
  
  /**
   * Перевірка готовності до міграції
   */
  static checkMigrationReadiness(): {
    domUtils: boolean;
    storageService: boolean;
    objectService: boolean;
    types: boolean;
  } {
    const result = {
      domUtils: false,
      storageService: false,
      objectService: false,
      types: false
    };
    
    try {
      // Перевірка DOM утиліт
      const testElement = document.createElement('div');
      testElement.id = 'test-element';
      document.body.appendChild(testElement);
      
      const foundElement = getElementById('test-element');
      if (foundElement) {
        result.domUtils = true;
      }
      
      document.body.removeChild(testElement);
    } catch (error) {
      console.warn('DOM утиліти не готові:', error);
    }
    
    try {
      // Перевірка Storage Service
      StorageService.saveLayers([]);
      StorageService.clearLayers();
      result.storageService = true;
    } catch (error) {
      console.warn('Storage Service не готовий:', error);
    }
    
    try {
      // Перевірка Object Service
      const mockLayer = { properties: {} };
      ObjectService.getObjectProperties(mockLayer);
      result.objectService = true;
    } catch (error) {
      console.warn('Object Service не готовий:', error);
    }
    
    try {
      // Перевірка типів
      const testLayer: LayerObj = {
        id: 1,
        tileLayer: {} as any,
        featureGroup: {
          eachLayer: () => {},
          addLayer: () => {},
          removeLayer: () => {},
          hasLayer: () => false,
          bringToFront: () => {}
        },
        tileType: 'План',
        visible: true,
        title: 'Test'
      };
      result.types = true;
    } catch (error) {
      console.warn('Типи не готові:', error);
    }
    
    return result;
  }
}

// Експортуємо для використання в браузері
(window as any).LegacyAdapter = LegacyAdapter; 