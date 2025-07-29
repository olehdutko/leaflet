// Тестовий скрипт для перевірки оновлення списку об'єктів
console.log('Тестовий скрипт завантажено');

// Функція для тестування оновлення списку об'єктів
function testObjectListUpdate() {
    console.log('=== ТЕСТ ОНОВЛЕННЯ СПИСКУ ОБ\'ЄКТІВ ===');
    
    // Перевіряємо наявність необхідних функцій
    console.log('Перевіряємо наявність функцій:');
    console.log('- updateObjectsListForLayer:', typeof window.updateObjectsListForLayer);
    console.log('- updateObjectsListForAllLayers:', typeof window.updateObjectsListForAllLayers);
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
        });
    } else {
        console.log('Шари не знайдено');
    }
    
    // Перевіряємо наявність layerIdToRenderObjectsList
    if (window.layerIdToRenderObjectsList) {
        console.log('layerIdToRenderObjectsList розмір:', window.layerIdToRenderObjectsList.size);
        console.log('Доступні ключі:', Array.from(window.layerIdToRenderObjectsList.keys()));
    } else {
        console.log('layerIdToRenderObjectsList не знайдено');
    }
}

// Запускаємо тест після завантаження сторінки
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(testObjectListUpdate, 2000); // Даємо час на ініціалізацію
    });
} else {
    setTimeout(testObjectListUpdate, 2000);
}

// Експортуємо функцію для використання в консолі
window.testObjectListUpdate = testObjectListUpdate; 