// Тестовий скрипт для перевірки KMZ імпорту та збереження в localStorage
console.log('Тестовий скрипт KMZ імпорту завантажено');

// Функція для тестування KMZ імпорту
function testKmzImport() {
    console.log('=== ТЕСТ KMZ ІМПОРТУ ===');
    
    // Перевіряємо наявність необхідних функцій
    console.log('Перевіряємо наявність функцій:');
    console.log('- customLayers:', typeof window.customLayers);
    console.log('- saveLayersToStorage:', typeof window.saveLayersToStorage);
    console.log('- layerIdToRenderObjectsList:', typeof window.layerIdToRenderObjectsList);
    
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
                        featureName: obj.feature?.properties?.name
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
                            hasName: !!feature.properties?.name
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
function compareMemoryAndStorage() {
    console.log('=== ПОРІВНЯННЯ ПАМ\'ЯТІ ТА LOCALSTORAGE ===');
    
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
                
                // Перевіряємо імена об'єктів
                const memoryNames = memoryObjects.map((obj) => 
                    obj.properties?.name || obj.feature?.properties?.name
                ).filter(Boolean);
                
                const storageNames = storageFeatures.map((feature) => 
                    feature.properties?.name
                ).filter(Boolean);
                
                console.log(`  Імен в пам'яті: ${memoryNames.length}`, memoryNames);
                console.log(`  Імен в localStorage: ${storageNames.length}`, storageNames);
                
                // Перевіряємо розбіжності
                const missingInStorage = memoryNames.filter(name => !storageNames.includes(name));
                const missingInMemory = storageNames.filter(name => !memoryNames.includes(name));
                
                if (missingInStorage.length > 0) {
                    console.warn(`  Імена відсутні в localStorage:`, missingInStorage);
                }
                
                if (missingInMemory.length > 0) {
                    console.warn(`  Імена відсутні в пам'яті:`, missingInMemory);
                }
                
                if (missingInStorage.length === 0 && missingInMemory.length === 0) {
                    console.log(`  ✅ Всі імена синхронізовані`);
                }
            } else {
                console.warn(`Шар "${memoryLayer.title}" не знайдено в localStorage`);
            }
        });
    } catch (error) {
        console.error('Помилка порівняння:', error);
    }
}

// Запускаємо тест після завантаження сторінки
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            testKmzImport();
            setTimeout(compareMemoryAndStorage, 1000); // Додаткова затримка для порівняння
        }, 3000); // Даємо час на ініціалізацію
    });
} else {
    setTimeout(() => {
        testKmzImport();
        setTimeout(compareMemoryAndStorage, 1000);
    }, 3000);
}

// Експортуємо функції для використання в консолі
window.testKmzImport = testKmzImport;
window.compareMemoryAndStorage = compareMemoryAndStorage; 