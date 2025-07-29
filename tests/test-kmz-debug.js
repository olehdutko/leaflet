// Простий тестовий скрипт для діагностики проблеми з властивостями KMZ
console.log('Тестовий скрипт діагностики KMZ властивостей завантажено');

// Функція для детальної діагностики об'єктів
function debugKmzObjects() {
    console.log('=== ДЕТАЛЬНА ДІАГНОСТИКА KMZ ОБ\'ЄКТІВ ===');
    
    if (!window.customLayers) {
        console.log('customLayers не знайдено');
        return;
    }
    
    window.customLayers.forEach((layer, layerIndex) => {
        console.log(`\n--- Шар ${layerIndex}: "${layer.title}" ---`);
        
        if (!layer.featureGroup) {
            console.log('featureGroup не знайдено');
            return;
        }
        
        const objects = layer.featureGroup.getLayers();
        console.log(`Кількість об'єктів: ${objects.length}`);
        
        objects.forEach((obj, objIndex) => {
            console.log(`\n  Об'єкт ${objIndex + 1}:`);
            console.log(`    Тип: ${obj.constructor.name}`);
            console.log(`    Має feature: ${!!obj.feature}`);
            console.log(`    Має properties: ${!!obj.properties}`);
            
            if (obj.feature) {
                console.log(`    feature.type: ${obj.feature.type}`);
                console.log(`    feature.geometry.type: ${obj.feature.geometry?.type}`);
                console.log(`    feature.properties:`, obj.feature.properties);
            }
            
            if (obj.properties) {
                console.log(`    layer.properties:`, obj.properties);
            }
            
            // Перевіряємо чи є розбіжності
            if (obj.feature && obj.properties) {
                const featureKeys = Object.keys(obj.feature.properties || {});
                const layerKeys = Object.keys(obj.properties || {});
                
                console.log(`    Ключі в feature.properties:`, featureKeys);
                console.log(`    Ключі в layer.properties:`, layerKeys);
                
                if (featureKeys.length === 0 && layerKeys.length > 0) {
                    console.warn(`    ⚠️ ПРОБЛЕМА: feature.properties порожній, але layer.properties має дані!`);
                }
            }
        });
    });
}

// Функція для перевірки localStorage
function debugLocalStorage() {
    console.log('\n=== ПЕРЕВІРКА LOCALSTORAGE ===');
    
    const storedData = localStorage.getItem('lefleat_layers');
    if (!storedData) {
        console.log('Дані в localStorage відсутні');
        return;
    }
    
    try {
        const parsedData = JSON.parse(storedData);
        console.log(`Знайдено ${parsedData.length} шарів в localStorage`);
        
        parsedData.forEach((layer, layerIndex) => {
            console.log(`\n  Шар ${layerIndex}: "${layer.title}"`);
            
            if (layer.geojson && layer.geojson.features) {
                console.log(`    Кількість features: ${layer.geojson.features.length}`);
                
                layer.geojson.features.forEach((feature, featureIndex) => {
                    console.log(`      Feature ${featureIndex + 1}:`);
                    console.log(`        Тип: ${feature.geometry?.type}`);
                    console.log(`        Properties:`, feature.properties);
                    
                    if (!feature.properties || Object.keys(feature.properties).length === 0) {
                        console.warn(`        ⚠️ ПРОБЛЕМА: Properties порожні!`);
                    }
                });
            }
        });
    } catch (error) {
        console.error('Помилка парсингу localStorage:', error);
    }
}

// Функція для примусового збереження та перевірки
function forceSaveAndDebug() {
    console.log('\n=== ПРИМУСОВЕ ЗБЕРЕЖЕННЯ ТА ДІАГНОСТИКА ===');
    
    if (window.saveLayersToStorage) {
        console.log('Викликаємо saveLayersToStorage...');
        window.saveLayersToStorage();
        
        setTimeout(() => {
            console.log('Перевіряємо результат...');
            debugLocalStorage();
        }, 500);
    } else {
        console.log('saveLayersToStorage не знайдено');
    }
}

// Функція для створення тестового об'єкта
function createTestObject() {
    console.log('\n=== СТВОРЕННЯ ТЕСТОВОГО ОБ\'ЄКТА ===');
    
    if (!window.customLayers || window.customLayers.length === 0) {
        console.log('Немає шарів для тестування');
        return;
    }
    
    const layer = window.customLayers[0];
    if (!layer.featureGroup) {
        console.log('featureGroup не знайдено');
        return;
    }
    
    // Створюємо тестовий маркер
    const testMarker = L.marker([49.8397, 24.0297]);
    
    // Встановлюємо властивості як в KMZ сервісі
    const properties = {
        name: "Тестовий об'єкт",
        description: "Опис тестового об'єкта",
        color: "#ff0000",
        icon: "star"
    };
    
    testMarker.feature = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [24.0297, 49.8397]
        },
        properties: properties
    };
    
    testMarker.properties = properties;
    
    console.log('Створено тестовий об\'єкт:', {
        hasFeature: !!testMarker.feature,
        hasProperties: !!testMarker.properties,
        featureProperties: testMarker.feature?.properties,
        layerProperties: testMarker.properties
    });
    
    // Додаємо до шару
    layer.featureGroup.addLayer(testMarker);
    
    console.log('Тестовий об\'єкт додано до шару');
    
    // Зберігаємо
    setTimeout(() => {
        if (window.saveLayersToStorage) {
            window.saveLayersToStorage();
            console.log('Збережено після додавання тестового об\'єкта');
            
            setTimeout(() => {
                debugLocalStorage();
            }, 500);
        }
    }, 100);
}

// Запускаємо діагностику після завантаження
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            debugKmzObjects();
            debugLocalStorage();
            setTimeout(forceSaveAndDebug, 1000);
            setTimeout(createTestObject, 2000);
        }, 3000);
    });
} else {
    setTimeout(() => {
        debugKmzObjects();
        debugLocalStorage();
        setTimeout(forceSaveAndDebug, 1000);
        setTimeout(createTestObject, 2000);
    }, 3000);
}

// Експортуємо функції для використання в консолі
window.debugKmzObjects = debugKmzObjects;
window.debugLocalStorage = debugLocalStorage;
window.forceSaveAndDebug = forceSaveAndDebug;
window.createTestObject = createTestObject; 