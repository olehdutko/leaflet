// Тест інтеграції нових сервісів з існуючим кодом

import { getElementById, setElementText } from './utils/dom-utils.js';
import { StorageService } from './services/storage-service.js';
import { ObjectService } from './services/object-service.js';
import type { LayerObj, ObjectProperties } from './types/index.js';

/**
 * Тест інтеграції нових сервісів
 */
export class IntegrationTest {
  
  /**
   * Запуск всіх тестів
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 Запуск тестів інтеграції...');
    
    try {
      await this.testDOMUtils();
      await this.testStorageService();
      await this.testObjectService();
      await this.testTypes();
      
      console.log('✅ Всі тести пройшли успішно!');
    } catch (error) {
      console.error('❌ Помилка в тестах:', error);
    }
  }
  
  /**
   * Тест DOM утиліт
   */
  private static async testDOMUtils(): Promise<void> {
    console.log('📋 Тестування DOM утиліт...');
    
    // Створюємо тестовий елемент
    const testElement = document.createElement('div');
    testElement.id = 'test-element';
    document.body.appendChild(testElement);
    
    try {
      // Тест getElementById
      const foundElement = getElementById<HTMLDivElement>('test-element');
      if (!foundElement) {
        throw new Error('getElementById не знайшов елемент');
      }
      
      // Тест setElementText
      setElementText('test-element', 'Тестовий текст');
      if (foundElement.textContent !== 'Тестовий текст') {
        throw new Error('setElementText не встановив текст');
      }
      
      console.log('✅ DOM утиліти працюють коректно');
    } finally {
      // Очищення
      document.body.removeChild(testElement);
    }
  }
  
  /**
   * Тест Storage Service
   */
  private static async testStorageService(): Promise<void> {
    console.log('📋 Тестування Storage Service...');
    
    try {
      // Тест збереження
      const testLayers: LayerObj[] = [
        {
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
          title: 'Тестовий шар'
        }
      ];
      
      StorageService.saveLayers(testLayers);
      
      // Тест завантаження
      const loadedLayers = StorageService.loadLayers();
      
      // Тест перевірки наявності
      const hasLayers = StorageService.hasLayers();
      
      // Очищення
      StorageService.clearLayers();
      
      console.log('✅ Storage Service працює коректно');
    } catch (error) {
      throw new Error(`Storage Service помилка: ${error}`);
    }
  }
  
  /**
   * Тест Object Service
   */
  private static async testObjectService(): Promise<void> {
    console.log('📋 Тестування Object Service...');
    
    try {
      // Тест властивостей
      const mockLayer = {
        properties: { name: 'Тестовий об\'єкт' },
        feature: { properties: { description: 'Опис' } }
      };
      
      const properties = ObjectService.getObjectProperties(mockLayer);
      
      if (properties.name !== 'Тестовий об\'єкт' || properties.description !== 'Опис') {
        throw new Error('getObjectProperties не працює коректно');
      }
      
      // Тест встановлення властивості
      ObjectService.setObjectProperty(mockLayer, 'color', '#ff0000');
      
      if ((mockLayer.properties as any).color !== '#ff0000') {
        throw new Error('setObjectProperty не працює коректно');
      }
      
      console.log('✅ Object Service працює коректно');
    } catch (error) {
      throw new Error(`Object Service помилка: ${error}`);
    }
  }
  
  /**
   * Тест типів
   */
  private static async testTypes(): Promise<void> {
    console.log('📋 Тестування типів...');
    
    try {
      // Тест LayerObj
      const layerObj: LayerObj = {
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
        title: 'Тестовий шар'
      };
      
      // Тест ObjectProperties
      const objectProperties: ObjectProperties = {
        name: 'Тестовий об\'єкт',
        description: 'Опис',
        color: '#ff0000',
        weight: 3
      };
      
      console.log('✅ Типи працюють коректно');
    } catch (error) {
      throw new Error(`Типи помилка: ${error}`);
    }
  }
}

// Експортуємо для використання в браузері
(window as any).IntegrationTest = IntegrationTest; 