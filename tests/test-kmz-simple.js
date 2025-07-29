// Простий тестовий скрипт для KMZ імпорту
console.log('Простий тестовий скрипт KMZ імпорту завантажено');

// Ініціалізуємо карту
const map = L.map('map').setView([49.8397, 24.0297], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Простий KMZ сервіс для тестування
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
            console.log('KML контент (перші 500 символів):', kmlContent.substring(0, 500));
            
            const parser = new DOMParser();
            const kmlDoc = parser.parseFromString(kmlContent, 'text/xml');
            
            // Аналізуємо структуру KML файлу
            this.analyzeKmlStructure(kmlDoc);

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
                        hasProperties: !!geometry.properties
                    });
                    
                    featureGroup.addLayer(geometry);
                }
            });

            // Додаємо feature group до карти
            featureGroup.addTo(map);
            
            // Центруємо карту на об'єктах
            if (featureGroup.getBounds().isValid()) {
                map.fitBounds(featureGroup.getBounds());
            }

            console.log('KMZ файл успішно імпортовано!');
            console.log('Кількість об\'єктів:', featureGroup.getLayers().length);
            
            // Зберігаємо в localStorage
            this.saveToLocalStorage(layerTitle, featureGroup);
            
            // Показуємо результати
            this.showResults(layerTitle, featureGroup.getLayers());
            
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
        // Парсимо метадані об'єкта - покращений парсинг
        let name = '';
        let description = '';
        
        // Спробуємо різні варіанти пошуку назви
        const nameElement = placemark.querySelector('name');
        if (nameElement) {
            name = nameElement.textContent?.trim() || '';
        }
        
        // Якщо назва порожня, спробуємо знайти в інших місцях
        if (!name) {
            // Спробуємо знайти в ExtendedData
            const extendedData = placemark.querySelector('ExtendedData');
            if (extendedData) {
                const nameData = extendedData.querySelector('Data[name="name"]');
                if (nameData) {
                    const valueElement = nameData.querySelector('value');
                    if (valueElement) {
                        name = valueElement.textContent?.trim() || '';
                    }
                }
            }
        }
        
        // Якщо назва все ще порожня, спробуємо знайти в description
        if (!name) {
            const descElement = placemark.querySelector('description');
            if (descElement) {
                const descText = descElement.textContent?.trim() || '';
                // Спробуємо витягнути назву з опису
                const nameMatch = descText.match(/^([^<>\n]+)/);
                if (nameMatch) {
                    name = nameMatch[1].trim();
                }
            }
        }
        
        // Якщо назва все ще порожня, спробуємо знайти в різних місцях
        if (!name) {
            // Спробуємо знайти в SimpleData
            const simpleDataElements = placemark.querySelectorAll('SimpleData');
            for (const simpleData of simpleDataElements) {
                const dataName = simpleData.getAttribute('name');
                if (dataName && (dataName.toLowerCase().includes('name') || dataName.toLowerCase().includes('title'))) {
                    const value = simpleData.textContent?.trim();
                    if (value) {
                        name = value;
                        break;
                    }
                }
            }
        }
        
        // Якщо назва все ще порожня, спробуємо знайти в будь-якому атрибуті
        if (!name) {
            // Шукаємо в усіх дочірніх елементах
            const allElements = placemark.querySelectorAll('*');
            for (const element of allElements) {
                const text = element.textContent?.trim();
                if (text && text.length > 0 && text.length < 100 && !text.includes('<') && !text.includes('>')) {
                    // Перевіряємо, чи це схоже на назву
                    if (text.match(/^[A-Za-zА-Яа-я0-9\s\-\.\(\)]+$/)) {
                        name = text;
                        break;
                    }
                }
            }
        }
        
        // Парсимо опис
        const descElement = placemark.querySelector('description');
        if (descElement) {
            description = descElement.textContent?.trim() || '';
        }
        
        // Додаємо детальну діагностику
        console.log('Парсимо placemark:', {
            name,
            description,
            hasNameElement: !!placemark.querySelector('name'),
            hasExtendedData: !!placemark.querySelector('ExtendedData'),
            hasDescription: !!placemark.querySelector('description'),
            placemarkHTML: placemark.outerHTML.substring(0, 200) + '...'
        });
        
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

        // Парсимо Polygon
        const polygon = placemark.querySelector('Polygon');
        if (polygon) {
            const outerBoundary = polygon.querySelector('outerBoundaryIs');
            if (outerBoundary) {
                const coords = this.parseCoordinates(outerBoundary.querySelector('coordinates'));
                if (coords && coords.length > 2) {
                    const latlngs = coords.map(([lng, lat]) => [lat, lng]);
                    const polygonLayer = L.polygon(latlngs);
                    
                    // Створюємо feature об'єкт для збереження в localStorage
                    const properties = {
                        name: name,
                        description: description,
                        color: '#1976d2',
                        fillColor: '#1976d2',
                        fillOpacity: 0.2,
                        weight: 3,
                        opacity: 1
                    };
                    
                    polygonLayer.feature = {
                        type: 'Feature',
                        geometry: {
                            type: 'Polygon',
                            coordinates: [coords] // Polygon потребує масив масивів координат
                        },
                        properties: properties
                    };
                    
                    // Додаємо метадані до полігону
                    polygonLayer.properties = properties;
                    
                    return polygonLayer;
                }
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

    analyzeKmlStructure(kmlDoc) {
        console.log('=== АНАЛІЗ СТРУКТУРИ KML ФАЙЛУ ===');
        
        // Знаходимо всі Placemark елементи
        const placemarks = kmlDoc.querySelectorAll('Placemark');
        console.log('Загальна кількість Placemark елементів:', placemarks.length);
        
        // Аналізуємо перші кілька Placemark елементів
        const sampleCount = Math.min(5, placemarks.length);
        for (let i = 0; i < sampleCount; i++) {
            const placemark = placemarks[i];
            console.log(`\n--- Placemark ${i + 1} ---`);
            
            // Перевіряємо наявність різних елементів
            const nameElement = placemark.querySelector('name');
            const descriptionElement = placemark.querySelector('description');
            const extendedDataElement = placemark.querySelector('ExtendedData');
            const pointElement = placemark.querySelector('Point');
            const lineStringElement = placemark.querySelector('LineString');
            const polygonElement = placemark.querySelector('Polygon');
            
            console.log('Елементи в Placemark:');
            console.log('- name:', !!nameElement, nameElement?.textContent?.trim());
            console.log('- description:', !!descriptionElement, descriptionElement?.textContent?.substring(0, 100));
            console.log('- ExtendedData:', !!extendedDataElement);
            console.log('- Point:', !!pointElement);
            console.log('- LineString:', !!lineStringElement);
            console.log('- Polygon:', !!polygonElement);
            
            // Якщо є ExtendedData, аналізуємо його
            if (extendedDataElement) {
                const dataElements = extendedDataElement.querySelectorAll('Data');
                console.log('ExtendedData елементи:', dataElements.length);
                dataElements.forEach((data, index) => {
                    const name = data.getAttribute('name');
                    const value = data.querySelector('value')?.textContent?.trim();
                    console.log(`  Data[${index}]: name="${name}", value="${value}"`);
                });
            }
            
            // Показуємо повну структуру першого Placemark
            if (i === 0) {
                console.log('Повна структура першого Placemark:');
                console.log(placemark.outerHTML);
            }
        }
    }

    async analyzeKmlFileOnly(file) {
        try {
            console.log('=== АНАЛІЗ KML ФАЙЛУ БЕЗ ІМПОРТУ ===');
            
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
            console.log('KML контент (перші 1000 символів):', kmlContent.substring(0, 1000));
            
            const parser = new DOMParser();
            const kmlDoc = parser.parseFromString(kmlContent, 'text/xml');
            
            // Аналізуємо структуру KML файлу
            this.analyzeKmlStructure(kmlDoc);
            
        } catch (error) {
            console.error('Помилка при аналізі KML файлу:', error);
        }
    }

    saveToLocalStorage(layerTitle, featureGroup) {
        console.log('Зберігаємо в localStorage...');
        
        // Створюємо GeoJSON з feature об'єктів
        const features = [];
        let featureCount = 0;
        let fallbackCount = 0;
        
        featureGroup.getLayers().forEach((layer) => {
            if (layer.feature) {
                // Використовуємо наш створений feature об'єкт
                features.push(layer.feature);
                featureCount++;
                console.log('Зберігаємо feature об\'єкт:', {
                    type: layer.feature.geometry?.type,
                    name: layer.feature.properties?.name,
                    hasName: !!layer.feature.properties?.name
                });
            } else {
                // Fallback до стандартного toGeoJSON для об'єктів без feature
                try {
                    const layerGeoJSON = layer.toGeoJSON();
                    if (layerGeoJSON) {
                        features.push(layerGeoJSON);
                        fallbackCount++;
                        console.log('Зберігаємо fallback GeoJSON:', {
                            type: layerGeoJSON.geometry?.type,
                            name: layerGeoJSON.properties?.name,
                            hasName: !!layerGeoJSON.properties?.name
                        });
                    }
                } catch (error) {
                    console.warn('Помилка toGeoJSON для об\'єкта:', error);
                }
            }
        });
        
        console.log('Підсумок збереження:', {
            layerTitle,
            featureCount,
            fallbackCount,
            totalFeatures: features.length
        });
        
        const geojson = {
            type: 'FeatureCollection',
            features: features
        };
        
        // Створюємо об'єкт шару для збереження
        const layerData = {
            id: Date.now(), // Унікальний ID
            title: layerTitle,
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

    showResults(layerTitle, layers) {
        const resultsDiv = document.getElementById('results');
        let results = `Шар "${layerTitle}" імпортовано успішно!\n\n`;
        results += `Кількість об'єктів: ${layers.length}\n\n`;
        
        layers.forEach((layer, index) => {
            results += `Об'єкт ${index + 1}:\n`;
            results += `  Тип: ${layer.constructor.name}\n`;
            results += `  Назва: ${layer.properties?.name || 'Без назви'}\n`;
            results += `  Опис: ${layer.properties?.description || 'Без опису'}\n`;
            results += `  Має feature: ${!!layer.feature}\n`;
            results += `  Має properties: ${!!layer.properties}\n`;
            if (layer.feature) {
                results += `  Feature properties: ${JSON.stringify(layer.feature.properties)}\n`;
            }
            results += '\n';
        });
        
        resultsDiv.textContent = results;
    }
}

// Створюємо екземпляр сервісу
const kmzService = new SimpleKmzService();

// Завантажуємо збережені шари при ініціалізації
function loadSavedLayers() {
    console.log('Завантажуємо збережені шари...');
    
    const savedData = localStorage.getItem('lefleat_layers');
    if (!savedData) {
        console.log('Збережених шарів не знайдено');
        return;
    }
    
    try {
        const layersArray = JSON.parse(savedData);
        if (!Array.isArray(layersArray)) {
            console.log('Неправильний формат даних в localStorage');
            return;
        }
        
        console.log('Знайдено збережених шарів:', layersArray.length);
        
        layersArray.forEach((layerData, index) => {
            console.log(`Завантажуємо шар ${index + 1}:`, {
                title: layerData.title,
                featuresCount: layerData.geojson?.features?.length || 0
            });
            
            if (layerData.geojson && layerData.geojson.features) {
                const featureGroup = L.featureGroup();
                
                layerData.geojson.features.forEach((feature, featureIndex) => {
                    console.log(`Feature ${featureIndex + 1}:`, {
                        type: feature.geometry?.type,
                        name: feature.properties?.name,
                        hasName: !!feature.properties?.name
                    });
                    
                    let layer = null;
                    
                    if (feature.geometry.type === 'Point') {
                        const [lng, lat] = feature.geometry.coordinates;
                        layer = L.marker([lat, lng]);
                    } else if (feature.geometry.type === 'LineString') {
                        const latlngs = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                        layer = L.polyline(latlngs);
                    } else if (feature.geometry.type === 'Polygon') {
                        const latlngs = feature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
                        layer = L.polygon(latlngs);
                    }
                    
                    if (layer) {
                        // Відновлюємо properties
                        layer.properties = feature.properties || {};
                        layer.feature = feature;
                        featureGroup.addLayer(layer);
                    }
                });
                
                featureGroup.addTo(map);
                
                if (featureGroup.getBounds().isValid()) {
                    map.fitBounds(featureGroup.getBounds());
                }
                
                console.log(`Шар "${layerData.title}" відновлено:`, {
                    objectsCount: featureGroup.getLayers().length,
                    names: featureGroup.getLayers().map(l => l.properties?.name).filter(Boolean)
                });
            }
        });
        
    } catch (error) {
        console.error('Помилка завантаження збережених шарів:', error);
    }
}

// Завантажуємо збережені шари при завантаженні сторінки
loadSavedLayers();

// Глобальні функції для тестування
window.importKmz = async function() {
    const fileInput = document.getElementById('kmz-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Будь ласка, виберіть KMZ файл');
        return;
    }

    const resultsDiv = document.getElementById('results');
    resultsDiv.textContent = 'Імпортування...';

    try {
        await kmzService.handleKmzFile(file);
    } catch (error) {
        console.error('Помилка:', error);
        resultsDiv.textContent = `Помилка: ${error.message}`;
    }
};

window.clearLocalStorage = function() {
    if (confirm('Ви дійсно хочете очистити localStorage?')) {
        localStorage.removeItem('lefleat_layers');
        alert('localStorage очищено! Перезавантажте сторінку.');
    }
};

window.checkLocalStorage = function() {
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
};

window.analyzeCurrentKml = function() {
    const fileInput = document.getElementById('kmz-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Будь ласка, спочатку виберіть KMZ файл');
        return;
    }
    
    // Створюємо тимчасовий сервіс для аналізу
    const tempService = new SimpleKmzService();
    tempService.analyzeKmlFileOnly(file);
}; 