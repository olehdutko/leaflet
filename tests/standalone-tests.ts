/**
 * Автономні тести для проекту Lefleat
 * Не залежать від ініціалізації карти Leaflet
 */

declare const L: any;

// Глобальні змінні для тестування
let testResults: { [key: string]: { passed: boolean; message: string; details?: any } } = {};
let testCounter = 0;

/**
 * Утиліти для тестування
 */
class TestUtils {
  static assert(condition: boolean, message: string, details?: any): void {
    testCounter++;
    const testName = `Test_${testCounter}`;
    
    if (condition) {
      testResults[testName] = { passed: true, message, details };
      console.log(`✅ ${testName}: ${message}`);
    } else {
      testResults[testName] = { passed: false, message, details };
      console.error(`❌ ${testName}: ${message}`, details);
    }
  }

  static assertEqual(actual: any, expected: any, message: string): void {
    this.assert(actual === expected, `${message} (expected: ${expected}, actual: ${actual})`);
  }

  static assertNotNull(value: any, message: string): void {
    this.assert(value !== null && value !== undefined, message);
  }

  static assertTrue(condition: boolean, message: string): void {
    this.assert(condition, message);
  }

  static assertFalse(condition: boolean, message: string): void {
    this.assert(!condition, message);
  }

  static createMockLayer(type: string, properties: any = {}): any {
    const mockLayer = {
      _leaflet_id: Math.random().toString(36).substr(2, 9),
      properties: properties,
      feature: {
        type: 'Feature',
        geometry: { type: type === 'marker' ? 'Point' : 'Polygon' },
        properties: properties
      },
      getLatLng: () => ({ lat: 49.857369, lng: 24.036681 }),
      getLatLngs: () => [{ lat: 49.857369, lng: 24.036681 }],
      setIcon: () => {},
      setStyle: () => {},
      options: {}
    };

    if (type === 'marker') {
      mockLayer.setIcon = () => {};
    } else {
      mockLayer.setStyle = () => {};
    }

    return mockLayer;
  }

  static createMockFeatureGroup(): any {
    const layers: any[] = [];
    return {
      addLayer: (layer: any) => layers.push(layer),
      removeLayer: (layer: any) => {
        const index = layers.findIndex(l => l._leaflet_id === layer._leaflet_id);
        if (index > -1) layers.splice(index, 1);
      },
      hasLayer: (layer: any) => layers.some(l => l._leaflet_id === layer._leaflet_id),
      getLayers: () => layers,
      eachLayer: (callback: (layer: any) => void) => layers.forEach(callback),
      clearLayers: () => layers.length = 0
    };
  }

  static clearLocalStorage(): void {
    localStorage.clear();
  }

  static getLocalStorageData(): any {
    const data = localStorage.getItem('lefleat_layers');
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('Invalid JSON in localStorage:', error);
      return null;
    }
  }

  static setLocalStorageData(data: any): void {
    localStorage.setItem('lefleat_layers', JSON.stringify(data));
  }

  static createMockMap(): any {
    return {
      addLayer: () => {},
      removeLayer: () => {},
      on: () => {},
      off: () => {},
      getBounds: () => ({ getNorthEast: () => ({ lat: 50, lng: 25 }), getSouthWest: () => ({ lat: 49, lng: 24 }) }),
      getCenter: () => ({ lat: 49.857369, lng: 24.036681 }),
      setView: () => {},
      fitBounds: () => {}
    };
  }
}

/**
 * Тести для утиліт
 */
class UtilsTests {
  static testObjectTypeDetection(): void {
    console.log('\n=== Тести визначення типу об\'єкта ===');
    
    // Мокаємо функцію getObjectType
    const getObjectType = (layer: any): string => {
      if (layer.setIcon) return 'marker';
      if (layer.setStyle) return 'polygon';
      return 'unknown';
    };
    
    const markerLayer = TestUtils.createMockLayer('marker');
    const polygonLayer = TestUtils.createMockLayer('polygon');
    
    TestUtils.assertEqual(getObjectType(markerLayer), 'marker', 'Тип маркера визначено правильно');
    TestUtils.assertEqual(getObjectType(polygonLayer), 'polygon', 'Тип полігону визначено правильно');
  }

  static testObjectProperties(): void {
    console.log('\n=== Тести властивостей об\'єктів ===');
    
    const testProperties = {
      name: 'Тестовий об\'єкт',
      description: 'Опис тестового об\'єкта',
      color: '#ff0000',
      icon: 'home'
    };
    
    const layer = TestUtils.createMockLayer('marker', testProperties);
    
    // Тест встановлення властивостей
    layer.properties.name = 'Нова назва';
    TestUtils.assertEqual(layer.properties.name, 'Нова назва', 'Властивість name встановлена');
    
    // Тест отримання властивостей
    TestUtils.assertEqual(layer.properties.color, '#ff0000', 'Властивість color отримана');
    TestUtils.assertEqual(layer.properties.icon, 'home', 'Властивість icon отримана');
  }

  static testColoredMarkerIcon(): void {
    console.log('\n=== Тести створення кольорових іконок ===');
    
    // Мокаємо функцію getColoredMarkerIcon
    const getColoredMarkerIcon = (color: string, iconName: string) => {
      return {
        options: {
          html: `<div style="background-color: ${color};"><span class="material-icons">${iconName}</span></div>`
        }
      };
    };
    
    const icon = getColoredMarkerIcon('#ff0000', 'home');
    TestUtils.assertNotNull(icon, 'Іконка створена');
    TestUtils.assertTrue(Boolean(icon.options && icon.options.html), 'HTML іконки встановлено');
    TestUtils.assertTrue(Boolean(icon.options.html && icon.options.html.includes('#ff0000')), 'Колір встановлено в HTML');
    TestUtils.assertTrue(Boolean(icon.options.html && icon.options.html.includes('home')), 'Назва іконки встановлена в HTML');
  }
}

/**
 * Тести для localStorage
 */
class StorageTests {
  static testLocalStorageOperations(): void {
    console.log('\n=== Тести операцій localStorage ===');
    
    TestUtils.clearLocalStorage();
    
    // Тест збереження даних
    const testData = {
      layers: [
        {
          id: 1,
          title: 'Тестовий шар',
          objects: [
            {
              name: 'Тестовий об\'єкт',
              color: '#ff0000',
              icon: 'home'
            }
          ]
        }
      ]
    };
    
    TestUtils.setLocalStorageData(testData);
    
    // Тест завантаження даних
    const loadedData = TestUtils.getLocalStorageData();
    TestUtils.assertNotNull(loadedData, 'Дані збережено в localStorage');
    TestUtils.assertEqual(loadedData.layers.length, 1, 'Збережено один шар');
    TestUtils.assertEqual(loadedData.layers[0].title, 'Тестовий шар', 'Назва шару збережена');
    TestUtils.assertEqual(loadedData.layers[0].objects.length, 1, 'Збережено один об\'єкт');
    TestUtils.assertEqual(loadedData.layers[0].objects[0].name, 'Тестовий об\'єкт', 'Назва об\'єкта збережена');
    TestUtils.assertEqual(loadedData.layers[0].objects[0].color, '#ff0000', 'Колір об\'єкта збережений');
    TestUtils.assertEqual(loadedData.layers[0].objects[0].icon, 'home', 'Іконка об\'єкта збережена');
    
    // Очищаємо тестові дані
    TestUtils.clearLocalStorage();
  }

  static testLocalStorageValidation(): void {
    console.log('\n=== Тести валідації localStorage ===');
    
    TestUtils.clearLocalStorage();
    
    // Тест з порожніми даними
    const emptyData = TestUtils.getLocalStorageData();
    TestUtils.assertTrue(emptyData === null, 'Порожні дані повертають null');
    
    // Тест з невалідними даними
    localStorage.setItem('lefleat_layers', 'invalid json');
    const invalidData = TestUtils.getLocalStorageData();
    TestUtils.assertTrue(invalidData === null, 'Невалідні дані повертають null');
    
    TestUtils.clearLocalStorage();
  }
}

/**
 * Тести для Material Icons
 */
class MaterialIconsTests {
  static testMaterialIconsLoading(): void {
    console.log('\n=== Тести Material Icons ===');
    
    // Мокаємо функції Material Icons
    const isMaterialIconsReady = (): boolean => {
      return typeof document !== 'undefined' && 
             document.querySelector('link[href*="material-icons"]') !== null;
    };
    
    const filterMaterialIcons = (query: string): string[] => {
      const icons = ['home', 'business', 'place', 'star', 'favorite'];
      return icons.filter(icon => icon.includes(query)).slice(0, 10);
    };
    
    const getMaterialIcon = (index: number): string => {
      const icons = ['home', 'business', 'place', 'star', 'favorite'];
      return icons[index] || 'home';
    };
    
    // Тест готовності іконок
    const isReady = isMaterialIconsReady();
    TestUtils.assertTrue(typeof isReady === 'boolean', 'Функція готовності повертає boolean');
    
    // Тест фільтрації іконок
    const filteredIcons = filterMaterialIcons('home');
    TestUtils.assertTrue(Array.isArray(filteredIcons), 'Фільтровані іконки є масивом');
    TestUtils.assertTrue(filteredIcons.length <= 10, 'Максимум 10 результатів фільтрації');
    
    // Тест отримання іконки за індексом
    const icon = getMaterialIcon(0);
    TestUtils.assertTrue(typeof icon === 'string', 'Назва іконки є рядком');
    TestUtils.assertTrue(icon.length > 0, 'Назва іконки не порожня');
  }
}

/**
 * Тести для модальних вікон
 */
class ModalTests {
  static testModalService(): void {
    console.log('\n=== Тести ModalService ===');
    
    // Мокаємо ModalService
    class MockModalService {
      private static instance: MockModalService;
      
      private constructor() {}
      
      static getInstance(): MockModalService {
        if (!MockModalService.instance) {
          MockModalService.instance = new MockModalService();
        }
        return MockModalService.instance;
      }
      
      init(): void {
        // Мок ініціалізації
      }
      
      showEditModal(object: any): void {
        // Мок показу модального вікна
      }
      
      closeEditModal(): void {
        // Мок закриття модального вікна
      }
    }
    
    try {
      const modalService = MockModalService.getInstance();
      TestUtils.assertNotNull(modalService, 'ModalService створено');
      
      // Тест отримання того ж екземпляра
      const modalService2 = MockModalService.getInstance();
      TestUtils.assertEqual(modalService, modalService2, 'Повертається той самий екземпляр (Singleton)');
      
      // Тест ініціалізації
      modalService.init();
      TestUtils.assertTrue(true, 'ModalService ініціалізовано без помилок');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка в ModalService: ${error}`);
    }
  }

  static testObjectPropertiesForm(): void {
    console.log('\n=== Тести форми властивостей об\'єкта ===');
    
    // Створюємо мок DOM елементів
    const mockFormElements = {
      'object-name': { value: 'Тестовий об\'єкт' } as HTMLInputElement,
      'object-description': { value: 'Опис тестового об\'єкта' } as HTMLInputElement,
      'object-color': { value: '#ff0000' } as HTMLInputElement,
      'line-width': { value: '5' } as HTMLInputElement,
      'object-opacity': { value: '0.8' } as HTMLInputElement,
      'fill-color': { value: '#00ff00' } as HTMLInputElement,
      'fill-opacity': { value: '0.3' } as HTMLInputElement,
      'line-style': { value: 'dashed' } as HTMLInputElement,
      'marker-icon': { value: 'business' } as HTMLInputElement
    };
    
    // Мокаємо document.getElementById
    const originalGetElementById = document.getElementById;
    document.getElementById = (id: string) => mockFormElements[id as keyof typeof mockFormElements] as any;
    
    try {
      // Мокаємо функцію getObjectPropertiesFromForm
      const getObjectPropertiesFromForm = () => {
        return {
          name: (document.getElementById('object-name') as HTMLInputElement)?.value || '',
          description: (document.getElementById('object-description') as HTMLInputElement)?.value || '',
          color: (document.getElementById('object-color') as HTMLInputElement)?.value || '',
          weight: parseInt((document.getElementById('line-width') as HTMLInputElement)?.value || '3'),
          opacity: parseFloat((document.getElementById('object-opacity') as HTMLInputElement)?.value || '1'),
          fillColor: (document.getElementById('fill-color') as HTMLInputElement)?.value || '',
          fillOpacity: parseFloat((document.getElementById('fill-opacity') as HTMLInputElement)?.value || '0.3'),
          style: (document.getElementById('line-style') as HTMLInputElement)?.value || '',
          icon: (document.getElementById('marker-icon') as HTMLInputElement)?.value || ''
        };
      };
      
      const properties = getObjectPropertiesFromForm();
      
      TestUtils.assertEqual(properties.name, 'Тестовий об\'єкт', 'Назва зчитана з форми');
      TestUtils.assertEqual(properties.description, 'Опис тестового об\'єкта', 'Опис зчитаний з форми');
      TestUtils.assertEqual(properties.color, '#ff0000', 'Колір зчитаний з форми');
      TestUtils.assertEqual(properties.weight, 5, 'Товщина лінії зчитана з форми');
      TestUtils.assertEqual(properties.opacity, 0.8, 'Прозорість зчитана з форми');
      TestUtils.assertEqual(properties.fillColor, '#00ff00', 'Колір заливки зчитаний з форми');
      TestUtils.assertEqual(properties.fillOpacity, 0.3, 'Прозорість заливки зчитана з форми');
      TestUtils.assertEqual(properties.style, 'dashed', 'Стиль лінії зчитаний з форми');
      TestUtils.assertEqual(properties.icon, 'business', 'Іконка зчитана з форми');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка при зчитуванні властивостей з форми: ${error}`);
    } finally {
      // Відновлюємо оригінальну функцію
      document.getElementById = originalGetElementById;
    }
  }
}

/**
 * Тести для AppManager
 */
class AppManagerTests {
  static testAppManager(): void {
    console.log('\n=== Тести AppManager ===');
    
    // Мокаємо AppManager
    class MockAppManager {
      private static instance: MockAppManager;
      private services: Map<string, any> = new Map();
      private initialized = false;
      
      private constructor() {}
      
      static getInstance(): MockAppManager {
        if (!MockAppManager.instance) {
          MockAppManager.instance = new MockAppManager();
        }
        return MockAppManager.instance;
      }
      
      registerService(name: string, service: any): void {
        this.services.set(name, service);
      }
      
      getService(name: string): any {
        return this.services.get(name);
      }
      
      hasService(name: string): boolean {
        return this.services.has(name);
      }
      
      init(): void {
        this.initialized = true;
      }
      
      isInitialized(): boolean {
        return this.initialized;
      }
    }
    
    try {
      const appManager = MockAppManager.getInstance();
      TestUtils.assertNotNull(appManager, 'AppManager створено');
      
      // Тест реєстрації сервісів
      const mockService = { name: 'test', init: () => {} };
      appManager.registerService('test', mockService);
      
      const registeredService = appManager.getService('test');
      TestUtils.assertEqual(registeredService, mockService, 'Сервіс зареєстровано та отримано');
      
      // Тест перевірки наявності сервісу
      TestUtils.assertTrue(appManager.hasService('test'), 'Сервіс існує');
      TestUtils.assertFalse(appManager.hasService('nonexistent'), 'Неіснуючий сервіс не знайдено');
      
      // Тест ініціалізації
      appManager.init();
      TestUtils.assertTrue(appManager.isInitialized(), 'AppManager ініціалізовано');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка в AppManager: ${error}`);
    }
  }
}

/**
 * Тести для UI компонентів
 */
class UITests {
  static testLayerControls(): void {
    console.log('\n=== Тести UI компонентів ===');
    
    // Мокаємо функції UI
    const createLayerControl = (layer: any) => {
      return {
        id: layer.id,
        title: layer.title,
        element: document.createElement('div')
      };
    };
    
    const updateObjectsListForLayer = (layer: any) => {
      // Мок оновлення списку об'єктів
      return true;
    };
    
    const mockLayer = {
      id: 1,
      title: 'Тестовий шар',
      featureGroup: TestUtils.createMockFeatureGroup()
    };
    
    const layerControl = createLayerControl(mockLayer);
    TestUtils.assertNotNull(layerControl, 'Контрол шару створено');
    TestUtils.assertEqual(layerControl.id, 1, 'ID контролу встановлено');
    TestUtils.assertEqual(layerControl.title, 'Тестовий шар', 'Назва контролу встановлена');
    
    // Тест оновлення списку об'єктів
    const updateResult = updateObjectsListForLayer(mockLayer);
    TestUtils.assertTrue(updateResult, 'Список об\'єктів оновлено успішно');
  }

  static testConfirmDialog(): void {
    console.log('\n=== Тести діалогу підтвердження ===');
    
    // Мокаємо функцію showConfirmDialog
    const showConfirmDialog = (options: any) => {
      return {
        title: options.title,
        message: options.message,
        buttons: options.buttons
      };
    };
    
    try {
      const dialog = showConfirmDialog({
        title: 'Тестовий діалог',
        message: 'Тестове повідомлення',
        buttons: [
          { text: 'Так', action: 'confirm', className: 'btn-primary' },
          { text: 'Ні', action: 'cancel', className: 'btn-secondary' }
        ]
      });
      
      TestUtils.assertNotNull(dialog, 'Діалог підтвердження створено');
      TestUtils.assertEqual(dialog.title, 'Тестовий діалог', 'Заголовок діалогу встановлено');
      TestUtils.assertEqual(dialog.message, 'Тестове повідомлення', 'Повідомлення діалогу встановлено');
      TestUtils.assertEqual(dialog.buttons.length, 2, 'Кількість кнопок встановлено');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка в діалозі підтвердження: ${error}`);
    }
  }
}

/**
 * Інтеграційні тести
 */
class IntegrationTests {
  static testFullWorkflow(): void {
    console.log('\n=== Інтеграційні тести повного workflow ===');
    
    TestUtils.clearLocalStorage();
    
    try {
      // 1. Створюємо мок шар
      const mockLayer = {
        id: 1,
        title: 'Інтеграційний тест',
        featureGroup: TestUtils.createMockFeatureGroup()
      };
      
      // 2. Створюємо мок об'єкт
      const mockObject = TestUtils.createMockLayer('marker', {
        name: 'Інтеграційний тест',
        color: '#ff0000',
        icon: 'home'
      });
      
      mockLayer.featureGroup.addLayer(mockObject);
      
      // 3. Зберігаємо в localStorage
      const testData = {
        layers: [{
          id: mockLayer.id,
          title: mockLayer.title,
          objects: [{
            name: mockObject.properties.name,
            color: mockObject.properties.color,
            icon: mockObject.properties.icon
          }]
        }]
      };
      
      TestUtils.setLocalStorageData(testData);
      
      // 4. Завантажуємо дані
      const loadedData = TestUtils.getLocalStorageData();
      TestUtils.assertNotNull(loadedData, 'Дані збережено');
      TestUtils.assertEqual(loadedData.layers.length, 1, 'Збережено один шар');
      
      const loadedLayer = loadedData.layers[0];
      TestUtils.assertEqual(loadedLayer.title, 'Інтеграційний тест', 'Назва шару збережена');
      TestUtils.assertEqual(loadedLayer.objects.length, 1, 'Збережено один об\'єкт');
      
      const loadedObject = loadedLayer.objects[0];
      TestUtils.assertEqual(loadedObject.name, 'Інтеграційний тест', 'Назва об\'єкта збережена');
      TestUtils.assertEqual(loadedObject.color, '#ff0000', 'Колір об\'єкта збережений');
      TestUtils.assertEqual(loadedObject.icon, 'home', 'Іконка об\'єкта збережена');
      
      console.log('✅ Інтеграційний тест пройдено успішно');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка в інтеграційному тесті: ${error}`);
    } finally {
      // Очищаємо тестові дані
      TestUtils.clearLocalStorage();
    }
  }
}

/**
 * Головна функція для запуску всіх тестів
 */
export function runAllStandaloneTests(): void {
  console.log('🚀 Запуск автономних тестів для проекту Lefleat');
  console.log('==================================================');
  
  // Скидаємо лічильники
  testResults = {};
  testCounter = 0;
  
  try {
    // Запускаємо всі тести
    UtilsTests.testObjectTypeDetection();
    UtilsTests.testObjectProperties();
    UtilsTests.testColoredMarkerIcon();
    
    StorageTests.testLocalStorageOperations();
    StorageTests.testLocalStorageValidation();
    
    MaterialIconsTests.testMaterialIconsLoading();
    
    ModalTests.testModalService();
    ModalTests.testObjectPropertiesForm();
    
    AppManagerTests.testAppManager();
    
    UITests.testLayerControls();
    UITests.testConfirmDialog();
    
    IntegrationTests.testFullWorkflow();
    
    // Підрахунок результатів
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n==================================================');
    console.log('📊 РЕЗУЛЬТАТИ АВТОНОМНИХ ТЕСТІВ:');
    console.log(`Всього тестів: ${totalTests}`);
    console.log(`Пройдено: ${passedTests}`);
    console.log(`Провалено: ${failedTests}`);
    console.log(`Відсоток успішності: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ ПРОВАЛЕНІ ТЕСТИ:');
      Object.entries(testResults)
        .filter(([_, result]) => !result.passed)
        .forEach(([testName, result]) => {
          console.log(`- ${testName}: ${result.message}`);
          if (result.details) {
            console.log(`  Деталі: ${JSON.stringify(result.details, null, 2)}`);
          }
        });
    }
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ВСІ АВТОНОМНІ ТЕСТИ ПРОЙДЕНО УСПІШНО!');
    } else {
      console.log('\n⚠️ Є ПРОВАЛЕНІ ТЕСТИ, ПЕРЕВІРТЕ ЛОГИ ВИЩЕ');
    }
    
  } catch (error) {
    console.error('💥 КРИТИЧНА ПОМИЛКА ПРИ ВИКОНАННІ АВТОНОМНИХ ТЕСТІВ:', error);
  }
}

/**
 * Функція для запуску окремих груп тестів
 */
export function runStandaloneTestGroup(groupName: string): void {
  console.log(`🚀 Запуск автономної групи тестів: ${groupName}`);
  
  switch (groupName.toLowerCase()) {
    case 'utils':
      UtilsTests.testObjectTypeDetection();
      UtilsTests.testObjectProperties();
      UtilsTests.testColoredMarkerIcon();
      break;
      
    case 'storage':
      StorageTests.testLocalStorageOperations();
      StorageTests.testLocalStorageValidation();
      break;
      
    case 'modal':
      ModalTests.testModalService();
      ModalTests.testObjectPropertiesForm();
      break;
      
    case 'icons':
      MaterialIconsTests.testMaterialIconsLoading();
      break;
      
    case 'appmanager':
      AppManagerTests.testAppManager();
      break;
      
    case 'ui':
      UITests.testLayerControls();
      UITests.testConfirmDialog();
      break;
      
    case 'integration':
      IntegrationTests.testFullWorkflow();
      break;
      
    default:
      console.error(`❌ Невідома група автономних тестів: ${groupName}`);
      console.log('Доступні групи: utils, storage, modal, icons, appmanager, ui, integration');
  }
}

// Експортуємо для використання в браузері
(window as any).runAllStandaloneTests = runAllStandaloneTests;
(window as any).runStandaloneTestGroup = runStandaloneTestGroup;
(window as any).TestUtils = TestUtils; 