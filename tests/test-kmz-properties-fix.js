// Тестовий скрипт для перевірки виправлення проблеми з властивостями KMZ об'єктів
console.log('Тестовий скрипт виправлення властивостей KMZ завантажено');

// Функція для тестування KMZ імпорту та перевірки властивостей
function testKmzPropertiesFix() {
    console.log('=== ТЕСТ ВИПРАВЛЕННЯ ВЛАСТИВОСТЕЙ KMZ ===');
    
    // Перевіряємо наявність необхідних функцій
    console.log('Перевіряємо наявність функцій:');
    console.log('- customLayers:', typeof window.customLayers);
    console.log('- saveLayersToStorage:', typeof window.saveLayersToStorage);
    
    // Перевіряємо наявність шарів
    if (window.customLayers && window.customLayers.length > 0) {
        console.log('Знайдено шарів:', window.customLayers.length);
        window.customLayers.forEach((layer, index) => {
            console.log(`Шар ${index}:`, {
                id: layer.id,
                title: layer.title,
                objectsCount: layer.featureGroup ? layer.featureGroup.getLayers().length : 0
            });
            
            // Перевіряємо об'єкти в шарі
            if (layer.featureGroup) {
                const objects = layer.featureGroup.getLayers();
                console.log(`Об'єкти в шарі "${layer.title}":`, objects.length);
                
                objects.forEach((obj, objIndex) => {
                    console.log(`  Об'єкт ${objIndex + 1}:`, {
                        type: obj.constructor.name,
                        hasFeature: !!obj.feature,
                        hasProperties: !!obj.properties,
                        name: obj.properties?.name || obj.feature?.properties?.name,
                        featureName: obj.feature?.properties?.name,
                        featureProperties: obj.feature?.properties || {},
                        layerProperties: obj.properties || {}
                    });
                });
            }
        });
    } else {
        console.log('Шари не знайдено');
    }
    
    // Перевіряємо localStorage
    const storedData = localStorage.getItem('lefleat_layers');
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData);
            console.log('Дані в localStorage:', parsedData.length, 'шарів');
            
            parsedData.forEach((layer, index) => {
                console.log(`Шар ${index} в localStorage:`, {
                    id: layer.id,
                    title: layer.title,
                    featuresCount: layer.geojson?.features?.length || 0
                });
                
                if (layer.geojson && layer.geojson.features) {
                    layer.geojson.features.forEach((feature, featureIndex) => {
                        console.log(`  Feature ${featureIndex + 1}:`, {
                            type: feature.geometry?.type,
                            name: feature.properties?.name,
                            hasName: !!feature.properties?.name,
                            properties: feature.properties || {}
                        });
                    });
                }
            });
        } catch (error) {
            console.error('Помилка парсингу localStorage:', error);
        }
    } else {
        console.log('Дані в localStorage відсутні');
    }
}

// Функція для порівняння даних в пам'яті та localStorage
function compareMemoryAndStorageProperties() {
    console.log('=== ПОРІВНЯННЯ ВЛАСТИВОСТЕЙ В ПАМ\'ЯТІ ТА LOCALSTORAGE ===');
    
    if (!window.customLayers) {
        console.log('customLayers не знайдено');
        return;
    }
    
    const storedData = localStorage.getItem('lefleat_layers');
    if (!storedData) {
        console.log('Дані в localStorage відсутні');
        return;
    }
    
    try {
        const parsedData = JSON.parse(storedData);
        
        window.customLayers.forEach((memoryLayer, index) => {
            const storageLayer = parsedData.find((l) => l.id === memoryLayer.id);
            
            if (storageLayer) {
                const memoryObjects = memoryLayer.featureGroup ? memoryLayer.featureGroup.getLayers() : [];
                const storageFeatures = storageLayer.geojson?.features || [];
                
                console.log(`Шар "${memoryLayer.title}" (ID: ${memoryLayer.id}):`);
                console.log(`  Об'єктів в пам'яті: ${memoryObjects.length}`);
                console.log(`  Features в localStorage: ${storageFeatures.length}`);
                
                // Перевіряємо властивості об'єктів
                memoryObjects.forEach((obj, objIndex) => {
                    const storageFeature = storageFeatures[objIndex];
                    
                    if (storageFeature) {
                        const memoryProps = obj.feature?.properties || obj.properties || {};
                        const storageProps = storageFeature.properties || {};
                        
                        console.log(`  Об'єкт ${objIndex + 1}:`);
                        console.log(`    Властивості в пам'яті:`, memoryProps);
                        console.log(`    Властивості в localStorage:`, storageProps);
                        
                        // Перевіряємо розбіжності
                        const memoryKeys = Object.keys(memoryProps);
                        const storageKeys = Object.keys(storageProps);
                        
                        const missingInStorage = memoryKeys.filter(key => !storageKeys.includes(key));
                        const missingInMemory = storageKeys.filter(key => !memoryKeys.includes(key));
                        
                        if (missingInStorage.length > 0) {
                            console.warn(`    Властивості відсутні в localStorage:`, missingInStorage);
                        }
                        
                        if (missingInMemory.length > 0) {
                            console.warn(`    Властивості відсутні в пам'яті:`, missingInMemory);
                        }
                        
                        if (missingInStorage.length === 0 && missingInMemory.length === 0) {
                            console.log(`    ✅ Всі властивості синхронізовані`);
                        }
                    }
                });
            } else {
                console.warn(`Шар "${memoryLayer.title}" не знайдено в localStorage`);
            }
        });
    } catch (error) {
        console.error('Помилка порівняння:', error);
    }
}

// Функція для примусового збереження та перевірки
function forceSaveAndCheck() {
    console.log('=== ПРИМУСОВЕ ЗБЕРЕЖЕННЯ ТА ПЕРЕВІРКА ===');
    
    if (window.saveLayersToStorage) {
        console.log('Викликаємо saveLayersToStorage...');
        window.saveLayersToStorage();
        
        setTimeout(() => {
            console.log('Перевіряємо результат збереження...');
            compareMemoryAndStorageProperties();
        }, 1000);
    } else {
        console.log('saveLayersToStorage не знайдено');
    }
}

// Запускаємо тест після завантаження сторінки
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            testKmzPropertiesFix();
            setTimeout(compareMemoryAndStorageProperties, 1000);
            setTimeout(forceSaveAndCheck, 2000);
        }, 3000); // Даємо час на ініціалізацію
    });
} else {
    setTimeout(() => {
        testKmzPropertiesFix();
        setTimeout(compareMemoryAndStorageProperties, 1000);
        setTimeout(forceSaveAndCheck, 2000);
    }, 3000);
}

// Експортуємо функції для використання в консолі
window.testKmzPropertiesFix = testKmzPropertiesFix;
window.compareMemoryAndStorageProperties = compareMemoryAndStorageProperties;
window.forceSaveAndCheck = forceSaveAndCheck; 