// Тест інтеграції сервісів після рефакторингу
import { AppManager } from './managers/app-manager.js';
import { EventManager } from './managers/event-manager.js';
import { OverlayService } from './services/overlay-service.js';
import { KmzService } from './services/kmz-service.js';
import { ModalService } from './services/modal-service.js';
import { GeoSearchService } from './services/search-service.js';
import { ObjectSearchService } from './services/object-search-service.js';

console.log('🧪 Початок тестування інтеграції сервісів...');

// Тест 1: Перевірка створення AppManager
try {
  const appManager = AppManager.getInstance();
  console.log('✅ AppManager створено успішно');
  
  // Тест 2: Перевірка ініціалізації AppManager
  await appManager.init();
  console.log('✅ AppManager ініціалізовано успішно');
  
  // Тест 3: Перевірка наявності сервісів
  const services = ['overlay', 'kmz', 'modal', 'geosearch', 'objectsearch'];
  for (const serviceName of services) {
    if (appManager.hasService(serviceName)) {
      console.log(`✅ Сервіс ${serviceName} доступний`);
    } else {
      console.log(`❌ Сервіс ${serviceName} НЕ доступний`);
    }
  }
  
  // Тест 4: Перевірка EventManager
  const eventManager = appManager.getEventManager();
  if (eventManager) {
    console.log('✅ EventManager доступний');
  } else {
    console.log('❌ EventManager НЕ доступний');
  }
  
  // Тест 5: Перевірка стану AppManager
  if (appManager.isInitialized()) {
    console.log('✅ AppManager ініціалізовано');
  } else {
    console.log('❌ AppManager НЕ ініціалізовано');
  }
  
  if (appManager.isReady()) {
    console.log('✅ AppManager готовий до роботи');
  } else {
    console.log('❌ AppManager НЕ готовий до роботи');
  }
  
} catch (error) {
  console.error('❌ Помилка при тестуванні AppManager:', error);
}

// Тест 6: Перевірка окремих сервісів
try {
  // OverlayService
  const overlayService = OverlayService.getInstance();
  console.log('✅ OverlayService створено');
  
  // KmzService
  const kmzService = KmzService.getInstance();
  console.log('✅ KmzService створено');
  
  // ModalService
  const modalService = ModalService.getInstance();
  console.log('✅ ModalService створено');
  
  // GeoSearchService
  const geoSearchService = GeoSearchService.getInstance();
  console.log('✅ GeoSearchService створено');
  
  // ObjectSearchService
  const objectSearchService = ObjectSearchService.getInstance();
  console.log('✅ ObjectSearchService створено');
  
} catch (error) {
  console.error('❌ Помилка при тестуванні сервісів:', error);
}

// Тест 7: Перевірка EventManager
try {
  const eventManager = EventManager.getInstance();
  
  // Тест підписки на події
  const subscriptionId = eventManager.on('test', (data) => {
    console.log('✅ Подія test отримана:', data);
  });
  
  // Тест емісії події
  eventManager.emit('test', { message: 'Тестова подія' });
  
  // Тест відписки
  eventManager.off(subscriptionId);
  console.log('✅ EventManager працює коректно');
  
} catch (error) {
  console.error('❌ Помилка при тестуванні EventManager:', error);
}

console.log('🎉 Тестування інтеграції завершено!'); 