// Простий тестовий скрипт для діагностики KMZ властивостей
console.log('Простий тестовий скрипт діагностики KMZ властивостей завантажено');

// Глобальні змінні
let map;
let customLayers = [];
let layerId = 1;

// Ініціалізація карти
function initMap() {
    map = L.map('map').setView([49.8397, 24.0297], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
    
    console.log('Карта ініціалізована');
}

// Простий KMZ сервіс
class SimpleKmzService {
    async handleKmzFile(file) {
        try {
            console.log('Починаємо обробку KMZ файлу:', file.name);
            
            const zip = await JSZip.loadAsync(file);
            
            // Знаходимо KML файл в архіві
            const kmlFile = Object.keys(zip.files).find(name => 
                name.toLowerCase().endsWith('.kml')
            );

            if (!kmlFile) {
                throw new Error('KML файл не знайдено в KMZ архіві');
            }

            console.log('Знайдено KML файл:', kmlFile);

            const kmlContent = await zip.file(kmlFile).async('text');
            const parser = new DOMParser();
            const kmlDoc = parser.parseFromString(kmlContent, 'text/xml');
            
            // Перевіряємо на помилки парсингу
            const parseError = kmlDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error('Помилка парсингу KML файлу');
            }

            // Отримуємо назву шару
            const nameElement = kmlDoc.querySelector('name');
            const layerTitle = nameElement?.textContent?.trim() || 'KMZ шар';

            console.log('Назва шару:', layerTitle);

            // Створюємо feature group для об'єктів
            const featureGroup = L.featureGroup();
            
            // Парсимо Placemarks
            const placemarks = kmlDoc.querySelectorAll('Placemark');
            console.log('Знайдено placemarks:', placemarks.length);
            
            placemarks.forEach((placemark, index) => {
                const geometry = this.parsePlacemarkGeometry(placemark);
                if (geometry) {
                    console.log(`Створено об'єкт ${index + 1}:`, {
                        type: geometry.feature?.geometry?.type,
                        name: geometry.properties?.name,
                        hasFeature: !!geometry.feature,
                        hasProperties: !!geometry.properties,
                        featureProperties: geometry.feature?.properties,
                        layerProperties: geometry.properties
                    });
                    
                    featureGroup.addLayer(geometry);
                }
            });

            // Перевіряємо об'єкти після додавання до featureGroup
            console.log('Перевіряємо об\'єкти після додавання до featureGroup:');
            featureGroup.getLayers().forEach((layer, index) => {
                console.log(`  Об'єкт ${index + 1} після додавання:`, {
                    type: layer.constructor.name,
                    hasFeature: !!layer.feature,
                    hasProperties: !!layer.properties,
                    featureProperties: layer.feature?.properties,
                    layerProperties: layer.properties
                });
            });

            // Додаємо feature group до карти
            featureGroup.addTo(map);
            
            // Центруємо карту на об'єктах
            if (featureGroup.getBounds().isValid()) {
                map.fitBounds(featureGroup.getBounds());
            }

            // Створюємо об'єкт шару
            const layerObj = {
                id: layerId++,
                title: layerTitle,
                featureGroup: featureGroup,
                visible: true
            };

            customLayers.push(layerObj);
            window.customLayers = customLayers;

            console.log('KMZ файл успішно імпортовано!');
            console.log('Кількість об\'єктів:', featureGroup.getLayers().length);
            
            // Зберігаємо в localStorage
            this.saveToLocalStorage(layerObj);
            
            return {
                title: layerTitle,
                featureGroup: featureGroup
            };

        } catch (error) {
            console.error('Помилка при імпорті KMZ файлу:', error);
            throw error;
        }
    }

    parsePlacemarkGeometry(placemark) {
        // Парсимо метадані об'єкта
        let name = '';
        let description = '';
        
        // Спробуємо різні варіанти пошуку назви
        const nameElement = placemark.querySelector('name');
        if (nameElement) {
            name = nameElement.textContent?.trim() || '';
        }
        
        // Парсимо опис
        const descElement = placemark.querySelector('description');
        if (descElement) {
            description = descElement.textContent?.trim() || '';
        }
        
        // Парсимо Point
        const point = placemark.querySelector('Point');
        if (point) {
            const coords = this.parseCoordinates(point.querySelector('coordinates'));
            if (coords && coords.length > 0) {
                const [lng, lat] = coords[0];
                const marker = L.marker([lat, lng]);
                
                // Створюємо feature об'єкт для збереження в localStorage
                const properties = {
                    name: name,
                    description: description,
                    color: '#1976d2',
                    icon: 'place'
                };
                
                console.log('Створюємо Point з властивостями:', properties);
                
                marker.feature = {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    properties: properties
                };
                
                // Додаємо метадані до маркера
                marker.properties = properties;
                
                return marker;
            }
        }

        // Парсимо LineString
        const lineString = placemark.querySelector('LineString');
        if (lineString) {
            const coords = this.parseCoordinates(lineString.querySelector('coordinates'));
            if (coords && coords.length > 1) {
                const latlngs = coords.map(([lng, lat]) => [lat, lng]);
                const polyline = L.polyline(latlngs);
                
                // Створюємо feature об'єкт для збереження в localStorage
                const properties = {
                    name: name,
                    description: description,
                    color: '#1976d2',
                    weight: 3,
                    opacity: 1,
                    style: 'solid'
                };
                
                console.log('Створюємо LineString з властивостями:', properties);
                
                polyline.feature = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: coords
                    },
                    properties: properties
                };
                
                // Додаємо метадані до полілінії
                polyline.properties = properties;
                
                return polyline;
            }
        }

        return null;
    }

    parseCoordinates(coordElement) {
        if (!coordElement || !coordElement.textContent) return null;

        const coordText = coordElement.textContent.trim();
        const coords = [];

        coordText.split(/\s+/).forEach(coord => {
            const parts = coord.split(',');
            if (parts.length >= 2) {
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                if (!isNaN(lng) && !isNaN(lat)) {
                    coords.push([lng, lat]);
                }
            }
        });

        return coords.length > 0 ? coords : null;
    }

    saveToLocalStorage(layerObj) {
        console.log('Зберігаємо в localStorage...');
        
        // Створюємо GeoJSON з feature об'єктів
        const features = [];
        
        layerObj.featureGroup.getLayers().forEach((layer) => {
            if (layer.feature) {
                // Використовуємо наш створений feature об'єкт
                features.push(layer.feature);
                console.log('Зберігаємо feature об\'єкт:', {
                    type: layer.feature.geometry?.type,
                    name: layer.feature.properties?.name,
                    hasName: !!layer.feature.properties?.name,
                    properties: layer.feature.properties
                });
            }
        });
        
        const geojson = {
            type: 'FeatureCollection',
            features: features
        };
        
        // Створюємо об'єкт шару для збереження
        const layerData = {
            id: layerObj.id,
            title: layerObj.title,
            tileType: 'План',
            opacity: 1,
            showLabels: true,
            geojson: geojson,
            visible: true,
            collapsed: false
        };
        
        // Зберігаємо в localStorage
        const existingData = localStorage.getItem('lefleat_layers');
        let layersArray = [];
        
        if (existingData) {
            try {
                layersArray = JSON.parse(existingData);
                if (!Array.isArray(layersArray)) {
                    layersArray = [layersArray];
                }
            } catch (error) {
                console.warn('Помилка парсингу існуючих даних:', error);
                layersArray = [];
            }
        }
        
        layersArray.push(layerData);
        localStorage.setItem('lefleat_layers', JSON.stringify(layersArray));
        
        console.log('Дані збережено в localStorage:', {
            totalLayers: layersArray.length,
            savedLayer: layerData.title,
            featuresCount: features.length
        });
    }
}

// Глобальний екземпляр KMZ сервісу
const kmzService = new SimpleKmzService();

// Функція для імпорту KMZ
function importKmz() {
    const fileInput = document.getElementById('kmz-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Будь ласка, виберіть KMZ файл');
        return;
    }
    
    kmzService.handleKmzFile(file).then(() => {
        console.log('KMZ імпорт завершено');
    }).catch(error => {
        console.error('Помилка імпорту:', error);
        alert('Помилка при імпорті KMZ файлу: ' + error.message);
    });
}

// Функція для діагностики об'єктів
function debugObjects() {
    console.log('=== ДІАГНОСТИКА ОБ\'ЄКТІВ ===');
    
    if (!customLayers || customLayers.length === 0) {
        console.log('Немає шарів для діагностики');
        return;
    }
    
    customLayers.forEach((layer, layerIndex) => {
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

// Функція для діагностики localStorage
function debugStorage() {
    console.log('\n=== ДІАГНОСТИКА LOCALSTORAGE ===');
    
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

// Функція для примусового збереження
function forceSave() {
    console.log('\n=== ПРИМУСОВЕ ЗБЕРЕЖЕННЯ ===');
    
    if (customLayers.length === 0) {
        console.log('Немає шарів для збереження');
        return;
    }
    
    customLayers.forEach(layer => {
        kmzService.saveToLocalStorage(layer);
    });
    
    console.log('Примусове збереження завершено');
}

// Функція для створення тестового об'єкта
function createTestObject() {
    console.log('\n=== СТВОРЕННЯ ТЕСТОВОГО ОБ\'ЄКТА ===');
    
    if (customLayers.length === 0) {
        console.log('Немає шарів для тестування');
        return;
    }
    
    const layer = customLayers[0];
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
        kmzService.saveToLocalStorage(layer);
        console.log('Збережено після додавання тестового об\'єкта');
        
        setTimeout(() => {
            debugStorage();
        }, 500);
    }, 100);
}

// Ініціалізація при завантаженні
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    console.log('Тестовий файл готовий до використання');
});

// Експортуємо функції для використання в консолі
window.debugObjects = debugObjects;
window.debugStorage = debugStorage;
window.forceSave = forceSave;
window.createTestObject = createTestObject;
window.importKmz = importKmz; 