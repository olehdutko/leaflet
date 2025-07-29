// Тестовий скрипт для перевірки збереження KMZ в основному додатку
console.log('Тестовий скрипт збереження KMZ завантажено');

// Функція для перевірки збереження в localStorage
function checkStorageAfterImport() {
    console.log('=== ПЕРЕВІРКА ЗБЕРЕЖЕННЯ В LOCALSTORAGE ===');
    
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
                            properties: feature.properties
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

// Функція для тестування перезавантаження
function testPageReload() {
    console.log('=== ТЕСТ ПЕРЕЗАВАНТАЖЕННЯ СТОРІНКИ ===');
    
    const storedData = localStorage.getItem('lefleat_layers');
    if (!storedData) {
        console.log('Немає даних для тестування перезавантаження');
        return;
    }
    
    try {
        const parsedData = JSON.parse(storedData);
        console.log(`Готово до тестування перезавантаження. Знайдено ${parsedData.length} шарів в localStorage.`);
        console.log('Перезавантажте сторінку (F5) і перевірте, чи відновляться об\'єкти з іменами.');
        
        // Показуємо що збережено
        parsedData.forEach((layer, index) => {
            const names = layer.geojson?.features?.map(f => f.properties?.name).filter(Boolean) || [];
            console.log(`Шар ${index + 1}: "${layer.title}" - імена: ${names.join(', ') || 'Без імен'}`);
        });
        
    } catch (error) {
        console.error('Помилка аналізу даних для тестування:', error);
    }
}

// Функція для очищення localStorage
function clearLocalStorage() {
    if (confirm('Ви дійсно хочете очистити localStorage?')) {
        localStorage.removeItem('lefleat_layers');
        alert('localStorage очищено! Перезавантажте сторінку.');
    }
}

// Функція для перевірки localStorage
function checkLocalStorage() {
    const savedData = localStorage.getItem('lefleat_layers');
    if (!savedData) {
        alert('localStorage порожній');
        return;
    }
    
    try {
        const layersArray = JSON.parse(savedData);
        let message = `Знайдено ${layersArray.length} шарів:\n\n`;
        
        layersArray.forEach((layer, index) => {
            const featuresCount = layer.geojson?.features?.length || 0;
            const names = layer.geojson?.features?.map(f => f.properties?.name).filter(Boolean) || [];
            message += `${index + 1}. "${layer.title}" (${featuresCount} об'єктів)\n`;
            message += `   Імена: ${names.join(', ') || 'Без імен'}\n\n`;
        });
        
        alert(message);
    } catch (error) {
        alert('Помилка парсингу localStorage: ' + error.message);
    }
}

// Запускаємо тести після завантаження сторінки
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            checkStorageAfterImport();
            setTimeout(compareMemoryAndStorage, 1000);
            setTimeout(testPageReload, 2000);
        }, 3000);
    });
} else {
    setTimeout(() => {
        checkStorageAfterImport();
        setTimeout(compareMemoryAndStorage, 1000);
        setTimeout(testPageReload, 2000);
    }, 3000);
}

// Експортуємо функції для використання в консолі
window.checkStorageAfterImport = checkStorageAfterImport;
window.compareMemoryAndStorage = compareMemoryAndStorage;
window.testPageReload = testPageReload;
window.clearLocalStorage = clearLocalStorage;
window.checkLocalStorage = checkLocalStorage; 