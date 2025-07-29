// Тест збереження в основній аплікації
import { AppManager } from './managers/app-manager.js';
import { KmzService } from './services/kmz-service.js';
import { saveLayersToStorage, loadLayersFromStorage, customLayers } from './layers.js';

// Глобальні змінні
let map = null;
let appManager = null;
let kmzService = null;

// Ініціалізація
async function init() {
    try {
        log('Ініціалізація тесту...');
        
        // Створюємо карту
        map = L.map('map').setView([49.8397, 24.0297], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);
        
        log('✅ Карта створена');
        
        // Ініціалізуємо AppManager
        appManager = AppManager.getInstance();
        await appManager.init();
        
        log('✅ AppManager ініціалізовано');
        
        // Завантажуємо збережені шари
        const loaded = loadLayersFromStorage();
        if (loaded) {
            log('✅ Збережені шари завантажено');
        } else {
            log('ℹ️ Збережених шарів не знайдено');
        }
        
        // Ініціалізуємо залежності сервісів
        const layerControlsDiv = document.createElement('div');
        appManager.initializeServiceDependencies(
            map,
            customLayers,
            saveLayersToStorage,
            createLayerControl,
            getNextLayerId,
            layerControlsDiv
        );
        
        // Оновлюємо функцію збереження
        appManager.updateSaveFunction(saveLayersToStorage);
        
        log('✅ Залежності сервісів ініціалізовано');
        
        // Отримуємо KmzService
        kmzService = appManager.getService('kmz');
        
        log('✅ Тест готовий до використання');
        
    } catch (error) {
        log('❌ Помилка ініціалізації: ' + error.message);
        console.error(error);
    }
}

// Допоміжні функції
function createLayerControl(layer) {
    // Проста реалізація для тесту
    const control = document.createElement('div');
    control.textContent = `Шар: ${layer.title}`;
    return control;
}

function getNextLayerId() {
    return customLayers.length + 1;
}

function log(message) {
    const results = document.getElementById('results');
    const timestamp = new Date().toLocaleTimeString();
    results.textContent += `[${timestamp}] ${message}\n`;
    results.scrollTop = results.scrollHeight;
    console.log(message);
}

// Глобальні функції для кнопок
window.importKmzFile = async function() {
    const fileInput = document.getElementById('kmz-file');
    const file = fileInput.files[0];
    
    if (!file) {
        log('❌ Будь ласка, спочатку виберіть KMZ файл');
        return;
    }
    
    if (!kmzService) {
        log('❌ KmzService не ініціалізовано');
        return;
    }
    
    try {
        log('🔄 Імпортуємо KMZ файл...');
        
        await kmzService.handleKmzFile(file, {
            onSuccess: (layerConfig) => {
                log(`✅ Шар "${layerConfig.title}" імпортовано успішно!`);
                log(`📊 Кількість об'єктів: ${layerConfig.featureGroup.getLayers().length}`);
                
                // Перевіряємо localStorage після імпорту
                setTimeout(() => {
                    checkLocalStorage();
                }, 1000);
            },
            onError: (error) => {
                log('❌ Помилка імпорту: ' + error.message);
            }
        });
        
    } catch (error) {
        log('❌ Помилка імпорту: ' + error.message);
        console.error(error);
    }
};

window.clearLocalStorage = function() {
    localStorage.removeItem('lefleat_layers');
    log('🗑️ localStorage очищено');
};

window.checkLocalStorage = function() {
    const savedData = localStorage.getItem('lefleat_layers');
    if (!savedData) {
        log('ℹ️ localStorage порожній');
        return;
    }
    
    try {
        const layersArray = JSON.parse(savedData);
        log(`📦 Знайдено ${layersArray.length} шарів в localStorage:`);
        
        layersArray.forEach((layer, index) => {
            const featuresCount = layer.geojson?.features?.length || 0;
            const names = layer.geojson?.features?.map(f => f.properties?.name).filter(Boolean) || [];
            log(`  ${index + 1}. "${layer.title}" (${featuresCount} об'єктів)`);
            log(`     Імена: ${names.join(', ') || 'Без імен'}`);
        });
        
    } catch (error) {
        log('❌ Помилка парсингу localStorage: ' + error.message);
    }
};

window.testAppManager = function() {
    if (!appManager) {
        log('❌ AppManager не ініціалізовано');
        return;
    }
    
    log('🔍 Тестуємо AppManager...');
    log(`  Ініціалізовано: ${appManager.isInitialized()}`);
    log(`  Сервіси: ${appManager.getServices().join(', ')}`);
    log(`  Стан: ${JSON.stringify(appManager.getState())}`);
};

window.testKmzService = function() {
    if (!kmzService) {
        log('❌ KmzService не ініціалізовано');
        return;
    }
    
    log('🔍 Тестуємо KmzService...');
    log(`  Тип: ${kmzService.constructor.name}`);
    log(`  Ініціалізовано: ${!!kmzService}`);
};

window.testSaveFunction = function() {
    log('🔍 Тестуємо функцію збереження...');
    
    // Перевіряємо глобальну функцію
    if (window.saveLayersToStorage) {
        log('✅ Глобальна функція saveLayersToStorage доступна');
    } else {
        log('❌ Глобальна функція saveLayersToStorage відсутня');
    }
    
    // Перевіряємо імпортовану функцію
    if (typeof saveLayersToStorage === 'function') {
        log('✅ Імпортована функція saveLayersToStorage доступна');
    } else {
        log('❌ Імпортована функція saveLayersToStorage відсутня');
    }
    
    // Тестуємо збереження
    try {
        saveLayersToStorage();
        log('✅ Функція збереження викликана успішно');
    } catch (error) {
        log('❌ Помилка при виклику функції збереження: ' + error.message);
    }
};

window.reloadPage = function() {
    log('🔄 Перезавантажуємо сторінку...');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
};

// Обробник вибору файлу
document.getElementById('kmz-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const selectedFileDiv = document.getElementById('selected-file');
    
    if (file) {
        selectedFileDiv.textContent = `Обрано файл: ${file.name}`;
        selectedFileDiv.style.display = 'block';
        log(`📁 Обрано файл: ${file.name}`);
    } else {
        selectedFileDiv.style.display = 'none';
    }
});

// Запускаємо ініціалізацію
init(); 