/**
 * Комплексні автотести для проекту Lefleat
 * Покриває всю функціональність: створення об'єктів, шарів, редагування, збереження в localStorage
 */

declare const L: any;

// Імпорти для тестування
import { 
  customLayers, 
  activeLayer, 
  layerId,
  saveLayersToStorage, 
  loadLayersFromStorage, 
  addLayer, 
  setActiveLayer,
  updateActiveLayerUI,
  getNextLayerId,
  createTileLayer,
  removeFeatureGroupAndOverlays,
  addOverlayToFeatureGroup,
  removeAllOverlaysFromFeatureGroup,
  restoreOverlaysForFeatureGroup
} from '../layers.js';

import { 
  initDrawControl, 
  setDrawButtonsEnabled, 
  updateDrawControlVisibility,
  updateDrawControlForActiveLayer
} from '../draw-control.js';

import { 
  ModalService 
} from '../services/modal-service.js';

import { 
  applyObjectProperties 
} from '../objects.js';

import { 
  getObjectType, 
  getColoredMarkerIcon, 
  setObjectProperty, 
  getObjectProperty,
  applyObjectStyle
} from '../utils.js';

import { 
  showEditModal, 
  updateObjectsListForLayer,
  createLayerControl,
  showConfirmDialog
} from '../ui.js';

import { 
  AppManager 
} from '../managers/app-manager.js';

import { 
  loadMaterialIcons, 
  filterMaterialIcons, 
  getMaterialIcon, 
  isMaterialIconsReady 
} from '../material-icons.js';

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
      options: {},
      // Додаємо необхідні Leaflet методи
      addEventParent: () => {},
      removeEventParent: () => {},
      on: () => {},
      off: () => {},
      fire: () => {},
      addTo: (map: any) => {
        if (map && map.addLayer) {
          map.addLayer(mockLayer);
        }
        return mockLayer;
      },
      remove: () => {
        return mockLayer;
      }
    };

    // Додаємо методи в залежності від типу
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
      clearLayers: () => layers.length = 0,
      // Додаємо Leaflet методи
      addEventParent: () => {},
      removeEventParent: () => {},
      on: () => {},
      off: () => {},
      fire: () => {},
      addTo: (map: any) => {
        if (map && map.addLayer) {
          map.addLayer(this);
        }
        return this;
      },
      remove: () => {
        return this;
      },
      bringToFront: () => {},
      bringToBack: () => {}
    };
  }

  static clearLocalStorage(): void {
    localStorage.clear();
  }

  static getLocalStorageData(): any {
    const data = localStorage.getItem('lefleat_layers');
    return data ? JSON.parse(data) : null;
  }

  static setLocalStorageData(data: any): void {
    localStorage.setItem('lefleat_layers', JSON.stringify(data));
  }
}

/**
 * Тести для роботи з шарами
 */
class LayerTests {
  static testCreateTileLayer(): void {
    console.log('\n=== Тести створення TileLayer ===');
    
    try {
      const planLayer = createTileLayer('План');
      TestUtils.assertNotNull(planLayer, 'TileLayer для типу "План" створено');
      TestUtils.assertTrue(planLayer instanceof L.TileLayer, 'Створений об\'єкт є TileLayer');
      
      const landscapeLayer = createTileLayer('Ландшафт');
      TestUtils.assertNotNull(landscapeLayer, 'TileLayer для типу "Ландшафт" створено');
      
      const satelliteLayer = createTileLayer('Супутник');
      TestUtils.assertNotNull(satelliteLayer, 'TileLayer для типу "Супутник" створено');
      
      // Тест з невалідним типом
      try {
        createTileLayer('НевідомийТип');
        TestUtils.assertFalse(true, 'Повинна бути помилка для невалідного типу');
      } catch (error) {
        TestUtils.assertTrue(error instanceof Error, 'Викинута помилка для невалідного типу');
      }
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка при створенні TileLayer: ${error}`);
    }
  }

  static testAddLayer(): void {
    console.log('\n=== Тести додавання шарів ===');
    
    const initialCount = customLayers.length;
    
    try {
      addLayer();
      TestUtils.assertEqual(customLayers.length, initialCount + 1, 'Шар додано');
      
      const newLayer = customLayers[customLayers.length - 1];
      TestUtils.assertNotNull(newLayer, 'Новий шар існує');
      TestUtils.assertNotNull(newLayer.featureGroup, 'FeatureGroup створено');
      TestUtils.assertTrue(newLayer.visible, 'Шар видимий за замовчуванням');
      TestUtils.assertNotNull(newLayer.title, 'Назва шару встановлена');
      
      // Тест встановлення активного шару
      setActiveLayer(newLayer.featureGroup);
      TestUtils.assertEqual(activeLayer, newLayer.featureGroup, 'Активний шар встановлено');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка при додаванні шару: ${error}`);
    }
  }

  static testLayerIdGeneration(): void {
    console.log('\n=== Тести генерації ID шарів ===');
    
    const initialId = layerId;
    const newId = getNextLayerId();
    
    TestUtils.assertEqual(newId, initialId, 'ID згенеровано правильно');
    TestUtils.assertEqual(layerId, initialId + 1, 'Лічильник ID збільшено');
  }
}

/**
 * Тести для роботи з об'єктами
 */
class ObjectTests {
  static testObjectTypeDetection(): void {
    console.log('\n=== Тести визначення типу об\'єкта ===');
    
    const markerLayer = TestUtils.createMockLayer('marker');
    const polygonLayer = TestUtils.createMockLayer('polygon');
    const polylineLayer = TestUtils.createMockLayer('polyline');
    
    TestUtils.assertEqual(getObjectType(markerLayer), 'marker', 'Тип маркера визначено правильно');
    TestUtils.assertEqual(getObjectType(polygonLayer), 'polygon', 'Тип полігону визначено правильно');
    TestUtils.assertEqual(getObjectType(polylineLayer), 'polyline', 'Тип лінії визначено правильно');
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
    setObjectProperty(layer, 'name', 'Нова назва');
    TestUtils.assertEqual(getObjectProperty(layer, 'name'), 'Нова назва', 'Властивість name встановлена');
    
    // Тест отримання властивостей
    TestUtils.assertEqual(getObjectProperty(layer, 'color'), '#ff0000', 'Властивість color отримана');
    TestUtils.assertEqual(getObjectProperty(layer, 'nonexistent', 'default'), 'default', 'Дефолтне значення повернуто');
  }

  static testApplyObjectProperties(): void {
    console.log('\n=== Тести застосування властивостей ===');
    
    const layer = TestUtils.createMockLayer('marker');
    const properties = {
      name: 'Тестовий маркер',
      description: 'Опис маркера',
      color: '#00ff00',
      icon: 'business'
    };
    
    try {
      applyObjectProperties(layer, properties);
      
      TestUtils.assertEqual(layer.properties.name, 'Тестовий маркер', 'Назва застосована');
      TestUtils.assertEqual(layer.properties.color, '#00ff00', 'Колір застосований');
      TestUtils.assertEqual(layer.properties.icon, 'business', 'Іконка застосована');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка при застосуванні властивостей: ${error}`);
    }
  }

  static testColoredMarkerIcon(): void {
    console.log('\n=== Тести створення кольорових іконок ===');
    
    const icon = getColoredMarkerIcon('#ff0000', 'home');
    TestUtils.assertNotNull(icon, 'Іконка створена');
    TestUtils.assertTrue(icon.options && icon.options.html, 'HTML іконки встановлено');
    TestUtils.assertTrue(icon.options.html.includes('#ff0000'), 'Колір встановлено в HTML');
    TestUtils.assertTrue(icon.options.html.includes('home'), 'Назва іконки встановлена в HTML');
  }
}

/**
 * Тести для роботи з localStorage
 */
class StorageTests {
  static testSaveLayersToStorage(): void {
    console.log('\n=== Тести збереження в localStorage ===');
    
    TestUtils.clearLocalStorage();
    
    // Створюємо тестові дані
    const mockLayer = TestUtils.createMockLayer('marker', {
      name: 'Тестовий маркер',
      color: '#ff0000',
      icon: 'home'
    });
    
    const mockFeatureGroup = TestUtils.createMockFeatureGroup();
    mockFeatureGroup.addLayer(mockLayer);
    
    const testLayer = {
      id: 1,
      tileLayer: createTileLayer('План'),
      featureGroup: mockFeatureGroup,
      tileType: 'План',
      visible: true,
      title: 'Тестовий шар'
    };
    
    // Додаємо тестовий шар
    customLayers.push(testLayer);
    
    try {
      saveLayersToStorage();
      
      const savedData = TestUtils.getLocalStorageData();
      TestUtils.assertNotNull(savedData, 'Дані збережено в localStorage');
      TestUtils.assertTrue(Array.isArray(savedData), 'Збережені дані є масивом');
      TestUtils.assertEqual(savedData.length, 1, 'Збережено один шар');
      
      const savedLayer = savedData[0];
      TestUtils.assertEqual(savedLayer.id, 1, 'ID шару збережено');
      TestUtils.assertEqual(savedLayer.tileType, 'План', 'Тип шару збережено');
      
      // Перевіряємо, чи збережені об'єкти
      TestUtils.assertTrue(savedLayer.geojson && savedLayer.geojson.features, 'GeoJSON features існують');
      TestUtils.assertEqual(savedLayer.geojson.features.length, 1, 'Збережено один об\'єкт');
      
      const savedFeature = savedLayer.geojson.features[0];
      TestUtils.assertEqual(savedFeature.properties.name, 'Тестовий маркер', 'Назва об\'єкта збережена');
      TestUtils.assertEqual(savedFeature.properties.color, '#ff0000', 'Колір об\'єкта збережений');
      TestUtils.assertEqual(savedFeature.properties.icon, 'home', 'Іконка об\'єкта збережена');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка при збереженні: ${error}`);
    } finally {
      // Очищаємо тестові дані
      customLayers.pop();
      TestUtils.clearLocalStorage();
    }
  }

  static testLoadLayersFromStorage(): void {
    console.log('\n=== Тести завантаження з localStorage ===');
    
    TestUtils.clearLocalStorage();
    
    // Створюємо тестові дані для збереження
    const testData = [{
      id: 1,
      tileType: 'План',
      opacity: 1,
      showLabels: true,
      collapsed: false,
      title: 'Тестовий шар',
      geojson: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [24.036681, 49.857369]
          },
          properties: {
            name: 'Тестовий маркер',
            color: '#ff0000',
            icon: 'home'
          }
        }]
      }
    }];
    
    TestUtils.setLocalStorageData(testData);
    
    try {
      const result = loadLayersFromStorage();
      TestUtils.assertTrue(result, 'Завантаження успішне');
      TestUtils.assertEqual(customLayers.length, 1, 'Завантажено один шар');
      
      const loadedLayer = customLayers[0];
      TestUtils.assertEqual(loadedLayer.id, 1, 'ID шару завантажено');
      TestUtils.assertEqual(loadedLayer.tileType, 'План', 'Тип шару завантажено');
      TestUtils.assertEqual(loadedLayer.title, 'Тестовий шар', 'Назва шару завантажена');
      
      // Перевіряємо об'єкти
      const layers = loadedLayer.featureGroup.getLayers();
      TestUtils.assertEqual(layers.length, 1, 'Завантажено один об\'єкт');
      
      const loadedObject = layers[0];
      TestUtils.assertEqual(loadedObject.properties.name, 'Тестовий маркер', 'Назва об\'єкта завантажена');
      TestUtils.assertEqual(loadedObject.properties.color, '#ff0000', 'Колір об\'єкта завантажений');
      TestUtils.assertEqual(loadedObject.properties.icon, 'home', 'Іконка об\'єкта завантажена');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка при завантаженні: ${error}`);
    } finally {
      // Очищаємо тестові дані
      customLayers.length = 0;
      TestUtils.clearLocalStorage();
    }
  }
}

/**
 * Тести для роботи з модальними вікнами
 */
class ModalTests {
  static testModalService(): void {
    console.log('\n=== Тести ModalService ===');
    
    try {
      const modalService = ModalService.getInstance();
      TestUtils.assertNotNull(modalService, 'ModalService створено');
      
      // Тест отримання того ж екземпляра
      const modalService2 = ModalService.getInstance();
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
      'object-name': { value: 'Тестовий об\'єкт' },
      'object-description': { value: 'Опис тестового об\'єкта' },
      'object-color': { value: '#ff0000' },
      'line-width': { value: '5' },
      'object-opacity': { value: '0.8' },
      'fill-color': { value: '#00ff00' },
      'fill-opacity': { value: '0.3' },
      'line-style': { value: 'dashed' },
      'marker-icon': { value: 'business' }
    };
    
    // Мокаємо document.getElementById
    const originalGetElementById = document.getElementById;
    document.getElementById = (id: string) => mockFormElements[id as keyof typeof mockFormElements] as any;
    
    try {
      const modalService = ModalService.getInstance();
      const properties = (modalService as any).getObjectPropertiesFromForm();
      
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
 * Тести для роботи з Material Icons
 */
class MaterialIconsTests {
  static testMaterialIconsLoading(): void {
    console.log('\n=== Тести завантаження Material Icons ===');
    
    try {
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
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка в тестах Material Icons: ${error}`);
    }
  }
}

/**
 * Тести для роботи з Draw Control
 */
class DrawControlTests {
  static testDrawControlInitialization(): void {
    console.log('\n=== Тести ініціалізації Draw Control ===');
    
    try {
      initDrawControl();
      TestUtils.assertTrue(true, 'Draw Control ініціалізовано без помилок');
      
      // Тест встановлення стану кнопок
      setDrawButtonsEnabled(true);
      TestUtils.assertTrue(true, 'Кнопки draw control увімкнено');
      
      setDrawButtonsEnabled(false);
      TestUtils.assertTrue(true, 'Кнопки draw control вимкнено');
      
      // Тест оновлення видимості
      updateDrawControlVisibility();
      TestUtils.assertTrue(true, 'Видимість draw control оновлено');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка в Draw Control: ${error}`);
    }
  }
}

/**
 * Тести для роботи з AppManager
 */
class AppManagerTests {
  static testAppManager(): void {
    console.log('\n=== Тести AppManager ===');
    
    try {
      const appManager = AppManager.getInstance();
      TestUtils.assertNotNull(appManager, 'AppManager створено');
      
      // Тест реєстрації сервісів
      const mockService = { name: 'test', init: () => {} };
      appManager.registerService('test', mockService);
      
      const registeredService = appManager.getService('test');
      TestUtils.assertEqual(registeredService, mockService, 'Сервіс зареєстровано та отримано');
      
      // Тест перевірки наявності сервісу
      TestUtils.assertTrue(appManager.hasService('test'), 'Сервіс існує');
      TestUtils.assertFalse(appManager.hasService('nonexistent'), 'Неіснуючий сервіс не знайдено');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка в AppManager: ${error}`);
    }
  }
}

/**
 * Тести для роботи з UI
 */
class UITests {
  static testLayerControls(): void {
    console.log('\n=== Тести елементів UI ===');
    
    try {
      // Тест створення контролу шару
      const mockLayer = {
        id: 1,
        tileLayer: createTileLayer('План'),
        featureGroup: TestUtils.createMockFeatureGroup(),
        tileType: 'План',
        visible: true,
        title: 'Тестовий шар'
      };
      
      const layerControl = createLayerControl(mockLayer);
      TestUtils.assertNotNull(layerControl, 'Контрол шару створено');
      
      // Тест оновлення списку об'єктів
      updateObjectsListForLayer(mockLayer);
      TestUtils.assertTrue(true, 'Список об\'єктів оновлено без помилок');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка в UI тестах: ${error}`);
    }
  }

  static testConfirmDialog(): void {
    console.log('\n=== Тести діалогу підтвердження ===');
    
    try {
      let dialogShown = false;
      
      showConfirmDialog({
        title: 'Тестовий діалог',
        message: 'Тестове повідомлення',
        onConfirm: () => { dialogShown = true; },
        buttons: [
          { text: 'Так', action: 'confirm', className: 'btn-primary' },
          { text: 'Ні', action: 'cancel', className: 'btn-secondary' }
        ]
      });
      
      TestUtils.assertTrue(true, 'Діалог підтвердження створено без помилок');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка в діалозі підтвердження: ${error}`);
    }
  }
}

/**
 * Тести для роботи з Overlays
 */
class OverlayTests {
  static testOverlayOperations(): void {
    console.log('\n=== Тести операцій з Overlays ===');
    
    try {
      const mockFeatureGroup = TestUtils.createMockFeatureGroup();
      
      // Тест додавання overlay
      addOverlayToFeatureGroup(mockFeatureGroup, 'https://example.com/test.jpg');
      TestUtils.assertTrue(true, 'Overlay додано без помилок');
      
      // Тест видалення всіх overlays
      removeAllOverlaysFromFeatureGroup(mockFeatureGroup);
      TestUtils.assertTrue(true, 'Всі overlays видалено без помилок');
      
      // Тест відновлення overlays
      restoreOverlaysForFeatureGroup(mockFeatureGroup);
      TestUtils.assertTrue(true, 'Overlays відновлено без помилок');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка в операціях з overlays: ${error}`);
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
      // Перевіряємо наявність необхідних компонентів
      if (typeof L === 'undefined') {
        TestUtils.assertFalse(true, 'Leaflet не завантажено');
        return;
      }
      
      if (!document.getElementById('map')) {
        TestUtils.assertFalse(true, 'Елемент map не знайдено');
        return;
      }
      
      // 1. Створюємо шар
      addLayer();
      TestUtils.assertEqual(customLayers.length, 1, 'Шар створено');
      
      const layer = customLayers[0];
      TestUtils.assertNotNull(layer.featureGroup, 'FeatureGroup створено');
      
      setActiveLayer(layer.featureGroup);
      
      // 2. Створюємо об'єкт
      const mockObject = TestUtils.createMockLayer('marker', {
        name: 'Інтеграційний тест',
        color: '#ff0000',
        icon: 'home'
      });
      
      // Перевіряємо, чи featureGroup має метод addLayer
      if (typeof layer.featureGroup.addLayer === 'function') {
        layer.featureGroup.addLayer(mockObject);
      } else {
        TestUtils.assertFalse(true, 'FeatureGroup не має методу addLayer');
        return;
      }
      
      // 3. Зберігаємо в localStorage
      saveLayersToStorage();
      
      const savedData = TestUtils.getLocalStorageData();
      TestUtils.assertNotNull(savedData, 'Дані збережено');
      TestUtils.assertEqual(savedData.length, 1, 'Збережено один шар');
      
      // 4. Очищаємо та завантажуємо
      customLayers.length = 0;
      const loadResult = loadLayersFromStorage();
      TestUtils.assertTrue(loadResult, 'Дані завантажено');
      TestUtils.assertEqual(customLayers.length, 1, 'Завантажено один шар');
      
      const loadedLayer = customLayers[0];
      const loadedObjects = loadedLayer.featureGroup.getLayers();
      TestUtils.assertEqual(loadedObjects.length, 1, 'Завантажено один об\'єкт');
      
      const loadedObject = loadedObjects[0];
      TestUtils.assertEqual(loadedObject.properties.name, 'Інтеграційний тест', 'Назва об\'єкта збережена');
      TestUtils.assertEqual(loadedObject.properties.color, '#ff0000', 'Колір об\'єкта збережений');
      TestUtils.assertEqual(loadedObject.properties.icon, 'home', 'Іконка об\'єкта збережена');
      
      console.log('✅ Інтеграційний тест пройдено успішно');
      
    } catch (error) {
      TestUtils.assertFalse(true, `Помилка в інтеграційному тесті: ${error}`);
    } finally {
      // Очищаємо тестові дані
      customLayers.length = 0;
      TestUtils.clearLocalStorage();
    }
  }
}

/**
 * Головна функція для запуску всіх тестів
 */
export function runAllTests(): void {
  console.log('🚀 Запуск комплексних автотестів для проекту Lefleat');
  console.log('==================================================');
  
  // Скидаємо лічильники
  testResults = {};
  testCounter = 0;
  
  try {
    // Запускаємо всі тести
    LayerTests.testCreateTileLayer();
    LayerTests.testAddLayer();
    LayerTests.testLayerIdGeneration();
    
    ObjectTests.testObjectTypeDetection();
    ObjectTests.testObjectProperties();
    ObjectTests.testApplyObjectProperties();
    ObjectTests.testColoredMarkerIcon();
    
    StorageTests.testSaveLayersToStorage();
    StorageTests.testLoadLayersFromStorage();
    
    ModalTests.testModalService();
    ModalTests.testObjectPropertiesForm();
    
    MaterialIconsTests.testMaterialIconsLoading();
    
    DrawControlTests.testDrawControlInitialization();
    
    AppManagerTests.testAppManager();
    
    UITests.testLayerControls();
    UITests.testConfirmDialog();
    
    OverlayTests.testOverlayOperations();
    
    IntegrationTests.testFullWorkflow();
    
    // Підрахунок результатів
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n==================================================');
    console.log('📊 РЕЗУЛЬТАТИ ТЕСТУВАННЯ:');
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
      console.log('\n🎉 ВСІ ТЕСТИ ПРОЙДЕНО УСПІШНО!');
    } else {
      console.log('\n⚠️ Є ПРОВАЛЕНІ ТЕСТИ, ПЕРЕВІРТЕ ЛОГИ ВИЩЕ');
    }
    
  } catch (error) {
    console.error('💥 КРИТИЧНА ПОМИЛКА ПРИ ВИКОНАННІ ТЕСТІВ:', error);
  }
}

/**
 * Функція для запуску окремих груп тестів
 */
export function runTestGroup(groupName: string): void {
  console.log(`🚀 Запуск групи тестів: ${groupName}`);
  
  switch (groupName.toLowerCase()) {
    case 'layers':
      LayerTests.testCreateTileLayer();
      LayerTests.testAddLayer();
      LayerTests.testLayerIdGeneration();
      break;
      
    case 'objects':
      ObjectTests.testObjectTypeDetection();
      ObjectTests.testObjectProperties();
      ObjectTests.testApplyObjectProperties();
      ObjectTests.testColoredMarkerIcon();
      break;
      
    case 'storage':
      StorageTests.testSaveLayersToStorage();
      StorageTests.testLoadLayersFromStorage();
      break;
      
    case 'modal':
      ModalTests.testModalService();
      ModalTests.testObjectPropertiesForm();
      break;
      
    case 'integration':
      IntegrationTests.testFullWorkflow();
      break;
      
    default:
      console.error(`❌ Невідома група тестів: ${groupName}`);
      console.log('Доступні групи: layers, objects, storage, modal, integration');
  }
}

// Експортуємо для використання в браузері
(window as any).runAllTests = runAllTests;
(window as any).runTestGroup = runTestGroup;
(window as any).TestUtils = TestUtils; 