import { map } from './map-init';
import { showConfirmDialog } from './ui';

function clearOverlaySelection() {
    try {
        console.log('🧹 Починаємо очищення стану виділення overlay...');
    
    // Діагностика: знаходимо всі елементи, які можуть бути панеллю редагування
    console.log('🔍 Діагностика елементів редагування:');
    const allElements = document.querySelectorAll('*');
    const editElements = Array.from(allElements).filter(el => {
        const className = String(el.className || '');
        const id = String(el.id || '');
        return className.includes('toolbar') || 
               className.includes('edit') || 
               className.includes('selection') ||
               id.includes('toolbar') ||
               id.includes('edit');
    });
    
    console.log(`🔍 Знайдено ${editElements.length} потенційних елементів редагування:`);
    editElements.forEach((el, idx) => {
        const element = el as HTMLElement;
        console.log(`   ${idx + 1}. ${element.tagName}.${element.className} #${element.id}`);
    });
    
    // Приховуємо панель редагування зображення - різні варіанти селекторів
    const editToolbars = [
        '.leaflet-toolbar',
        '.leaflet-toolbar-container',
        '.leaflet-toolbar-group',
        '.leaflet-toolbar-section',
        '.leaflet-toolbar-section a',
        '.leaflet-toolbar-section button',
        '.leaflet-edit-toolbar',
        '.leaflet-edit-mode',
        '.leaflet-selection',
        '.leaflet-editing',
        '[class*="toolbar"]',
        '[class*="edit"]',
        '[id*="toolbar"]',
        '[id*="edit"]'
    ];
    
    // Видаляємо точки кутів (corners) зображення
    const cornerSelectors = [
        '.leaflet-marker-icon.leaflet-marker-draggable',
        '.leaflet-marker-icon[src*="corner"]',
        '.leaflet-marker-icon[src*="handle"]',
        '.leaflet-marker-icon[src*="resize"]'
    ];
    
    cornerSelectors.forEach(selector => {
        const cornerMarkers = document.querySelectorAll(selector);
        cornerMarkers.forEach(marker => {
            if (marker.parentNode) {
                marker.parentNode.removeChild(marker);
                console.log(`🧹 Видалено точку кутів: ${selector}`);
            }
        });
    });
    
    // Видаляємо рамку виділення
    const selectionSelectors = [
        '.leaflet-overlay-pane svg',
        '.leaflet-overlay-pane path',
        '.leaflet-overlay-pane rect',
        '.leaflet-overlay-pane circle'
    ];
    
    selectionSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            const el = element as HTMLElement;
            if (el && (el.style.stroke === 'blue' || el.style.fill === 'blue' || el.classList.contains('selection'))) {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                    console.log(`🧹 Видалено елемент виділення: ${selector}`);
                }
            }
        });
    });
    
    // Видаляємо додаткові елементи виділення
    const selectionElements = document.querySelectorAll('.leaflet-interactive');
    selectionElements.forEach(element => {
        const elementStyle = (element as HTMLElement).style;
        if (elementStyle && (elementStyle.stroke === 'blue' || elementStyle.fill === 'blue')) {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
                console.log('🧹 Видалено інтерактивний елемент виділення');
            }
        }
    });
    
    // Очищуємо активний стан overlay
    if ((window as any).L && (window as any).L.DistortableImageOverlay) {
        // Скидаємо активний overlay якщо він є
        if ((window as any).L.DistortableImageOverlay._activeOverlay) {
            (window as any).L.DistortableImageOverlay._activeOverlay = null;
            console.log('🧹 Скинуто активний overlay');
        }
    }
    
    // Агресивне очищення: приховуємо всі знайдені елементи редагування
    editElements.forEach((element, idx) => {
        const el = element as HTMLElement;
        if (el) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
            console.log(`🧹 Приховано елемент редагування ${idx + 1}: ${el.tagName}.${el.className}`);
        }
    });
    
    // Додатково: приховуємо всі елементи з класами, пов'язаними з редагуванням
    const editClasses = [
        '.leaflet-edit-toolbar',
        '.leaflet-edit-mode',
        '.leaflet-selection',
        '.leaflet-editing'
    ];
    
    editClasses.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            const el = element as HTMLElement;
            if (el) {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                console.log(`🧹 Приховано елемент редагування: ${selector}`);
            }
        });
    });
    
    // Фінальне очищення: приховуємо всі елементи в області карти
    const mapContainer = document.querySelector('#map');
    if (mapContainer) {
        const mapElements = mapContainer.querySelectorAll('*');
        mapElements.forEach(element => {
            const el = element as HTMLElement;
            const className = String(el.className || '');
            const id = String(el.id || '');
            
            if (className.includes('toolbar') || 
                className.includes('edit') || 
                className.includes('selection') ||
                id.includes('toolbar') ||
                id.includes('edit')) {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                console.log(`🧹 Приховано елемент в області карти: ${el.tagName}.${className}`);
            }
        });
    }
    
    // Додаємо CSS стилі для приховування елементів редагування
    const style = document.createElement('style');
    style.id = 'overlay-cleanup-styles';
    style.textContent = `
        .leaflet-toolbar,
        .leaflet-toolbar *,
        .leaflet-edit-toolbar,
        .leaflet-edit-toolbar *,
        .leaflet-selection,
        .leaflet-selection *,
        .leaflet-editing,
        .leaflet-editing *,
        [class*="toolbar"],
        [class*="edit"],
        [id*="toolbar"],
        [id*="edit"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
    `;
    
    // Видаляємо попередній стиль якщо він є
    const existingStyle = document.getElementById('overlay-cleanup-styles');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    document.head.appendChild(style);
    console.log('🧹 Додано CSS стилі для приховування елементів редагування');
    
    console.log('🧹 Завершено очищення стану виділення overlay');
    } catch (error) {
        console.error('❌ Помилка при очищенні стану виділення:', error);
    }
}

// Функція для виконання видалення overlay
function performOverlayDeletion(overlay: any) {

    // Отримуємо URL overlay для пошуку - додаємо підтримку різних структур
    let overlayUrl = overlay._customUrl || overlay._url || overlay.url;
    
    // Якщо overlay має властивість _overlay, спробуємо отримати URL з неї
    if (!overlayUrl && overlay._overlay) {
        overlayUrl = overlay._overlay._customUrl || overlay._overlay._url || overlay._overlay.url;
    }
    
    // Якщо все ще немає URL, спробуємо знайти в DOM елементі
    if (!overlayUrl && overlay._image) {
        overlayUrl = overlay._image.src;
    }
    
    console.log('🔍 Шукаємо overlay з URL:', overlayUrl?.substring(0, 50) + '...');
    console.log('🔍 Повний URL overlay:', overlayUrl);
    console.log('🔍 Властивості overlay:', {
        _customUrl: overlay._customUrl,
        _url: overlay._url,
        url: overlay.url,
        _overlayId: overlay._overlayId,
        _overlay: !!overlay._overlay,
        _image: !!overlay._image
    });

    // Знаходимо overlay в системі шарів
    if ((window as any).customLayers) {
        console.log('🔍 Знайдено customLayers:', (window as any).customLayers.length);
        
        for (const layer of (window as any).customLayers) {
            if (!layer || !layer.featureGroup) {
                console.log('⚠️ Шар або featureGroup відсутній');
                continue;
            }
            
            console.log('🔍 Перевіряємо шар:', {
                overlayInstances: layer.featureGroup.overlayInstances?.length || 0,
                images: layer.featureGroup.images?.length || 0,
                overlays: layer.featureGroup.overlays?.length || 0
            });
            
            // Спочатку шукаємо за посиланням на об'єкт
            let overlayIdx = layer.featureGroup.overlayInstances?.indexOf(overlay);
            console.log('🔍 Пошук за посиланням на об\'єкт:', overlayIdx);
            
            // Якщо не знайдено за прямим посиланням, шукаємо за вкладеним _overlay
            if (overlayIdx === -1 && overlay._overlay) {
                overlayIdx = layer.featureGroup.overlayInstances?.findIndex((inst: any) => {
                    return inst === overlay._overlay || inst._overlay === overlay._overlay;
                });
                console.log('🔍 Пошук за вкладеним _overlay:', overlayIdx);
            }
            
            // Якщо не знайдено, показуємо деталі для діагностики
            if (overlayIdx === -1 && layer.featureGroup.overlayInstances?.length > 0) {
                console.log('🔍 Деталі overlayInstances:');
                layer.featureGroup.overlayInstances.forEach((inst: any, idx: number) => {
                    console.log(`   [${idx}]`, {
                        url: inst._customUrl || inst._url || inst.url,
                        _overlayId: inst._overlayId,
                        isSameObject: inst === overlay,
                        hasOverlay: !!inst._overlay,
                        overlayUrl: overlayUrl
                    });
                });
            }
            
            // Якщо не знайдено, шукаємо за URL
            if (overlayIdx === -1 && overlayUrl) {
                overlayIdx = layer.featureGroup.images?.findIndex((img: any) => {
                    console.log('🔍 Порівнюємо URL:', {
                        шукаємо: overlayUrl,
                        маємо: img.url,
                        співпадає: img.url === overlayUrl
                    });
                    return img.url === overlayUrl;
                });
                console.log('🔍 Пошук за URL:', overlayIdx);
            }
            
            // Якщо не знайдено за URL, показуємо деталі images
            if (overlayIdx === -1 && layer.featureGroup.images?.length > 0) {
                console.log('🔍 Деталі images:');
                layer.featureGroup.images.forEach((img: any, idx: number) => {
                    console.log(`   [${idx}]`, {
                        url: img.url,
                        _overlayId: img._overlayId,
                        overlayUrl: overlayUrl
                    });
                });
            }
            
            // Додатково шукаємо за _overlayId
            if (overlayIdx === -1 && overlay._overlayId) {
                overlayIdx = layer.featureGroup.images?.findIndex((img: any) => {
                    return img._overlayId === overlay._overlayId;
                });
                console.log('🔍 Пошук за _overlayId:', overlayIdx);
            }
            
            // Якщо все ще не знайдено, шукаємо за всіма можливими властивостями
            if (overlayIdx === -1) {
                console.log('🔍 Розширений пошук за всіма властивостями...');
                
                // Шукаємо в overlayInstances
                overlayIdx = layer.featureGroup.overlayInstances?.findIndex((inst: any) => {
                    const instUrl = inst._customUrl || inst._url || inst.url;
                    const overlayUrl = overlay._customUrl || overlay._url || overlay.url;
                    
                    // Порівнюємо URL
                    if (instUrl && overlayUrl && instUrl === overlayUrl) {
                        console.log('✅ Знайдено за URL в overlayInstances');
                        return true;
                    }
                    
                    // Порівнюємо _overlayId
                    if (inst._overlayId && overlay._overlayId && inst._overlayId === overlay._overlayId) {
                        console.log('✅ Знайдено за _overlayId в overlayInstances');
                        return true;
                    }
                    
                    return false;
                });
                
                // Якщо не знайдено в overlayInstances, шукаємо в images
                if (overlayIdx === -1) {
                    overlayIdx = layer.featureGroup.images?.findIndex((img: any) => {
                        const imgUrl = img._customUrl || img._url || img.url;
                        const overlayUrl = overlay._customUrl || overlay._url || overlay.url;
                        
                        // Порівнюємо URL
                        if (imgUrl && overlayUrl && imgUrl === overlayUrl) {
                            console.log('✅ Знайдено за URL в images');
                            return true;
                        }
                        
                        // Порівнюємо _overlayId
                        if (img._overlayId && overlay._overlayId && img._overlayId === overlay._overlayId) {
                            console.log('✅ Знайдено за _overlayId в images');
                            return true;
                        }
                        
                        return false;
                    });
                }
                
                console.log('🔍 Результат розширеного пошуку:', overlayIdx);
            }
            
            if (overlayIdx !== -1) {
                console.log(`✅ Знайдено overlay в шарі для видалення (індекс: ${overlayIdx})`);
                
                // Видаляємо з усіх масивів
                if (layer.featureGroup.overlayInstances && layer.featureGroup.overlayInstances[overlayIdx]) {
                    layer.featureGroup.overlayInstances.splice(overlayIdx, 1);
                    console.log('✅ Видалено з overlayInstances');
                }
                if (layer.featureGroup.images && layer.featureGroup.images[overlayIdx]) {
                    layer.featureGroup.images.splice(overlayIdx, 1);
                    console.log('✅ Видалено з images');
                }
                if (layer.featureGroup.overlays && layer.featureGroup.overlays[overlayIdx]) {
                    layer.featureGroup.overlays.splice(overlayIdx, 1);
                    console.log('✅ Видалено з overlays');
                }
                
                // Видаляємо з карти
                try {
                    if (map.hasLayer(overlay)) {
                        map.removeLayer(overlay);
                        console.log('✅ Видалено з карти');
                    } else {
                        console.log('⚠️ Overlay не присутній на карті');
                    }
                } catch (error) {
                    console.error('❌ Помилка при видаленні з карти:', error);
                }
                
                // Зберігаємо зміни
                import('./layers').then(({ saveLayersToStorage }) => {
                    saveLayersToStorage();
                    console.log('✅ Збережено зміни в localStorage');
                });
            
            // Очищуємо DOM елементи, пов'язані з overlay
            if (overlayUrl) {
                const imgElements = document.querySelectorAll(`img.leaflet-image-layer[src="${overlayUrl}"]`);
                imgElements.forEach(el => {
                    el.remove();
                    console.log('✅ Видалено DOM елемент зображення');
                });
            }
            
            console.log('✅ Overlay успішно видалено');
            
            // Очищуємо стан виділення після видалення з невеликою затримкою
            setTimeout(() => {
                clearOverlaySelection();
            }, 100);
            
            return;
            }
        }
    }
    
    console.warn('⚠️ Overlay не знайдено в системі шарів');
    console.log('🔍 Доступні шари:', (window as any).customLayers?.length || 0);
    if ((window as any).customLayers) {
        (window as any).customLayers.forEach((layer: any, idx: number) => {
            console.log(`   Шар ${idx}:`, {
                overlayInstances: layer.featureGroup?.overlayInstances?.length || 0,
                images: layer.featureGroup?.images?.length || 0,
                overlays: layer.featureGroup?.overlays?.length || 0
            });
        });
    }
    
    // Якщо overlay не знайдено в системі, але він присутній на карті, видаляємо його напряму
    if (overlay) {
        console.log('🔄 Спроба прямого видалення overlay з карти...');
        try {
            if (map.hasLayer(overlay)) {
                map.removeLayer(overlay);
                console.log('✅ Overlay видалено з карти напряму');
            } else {
                console.log('⚠️ Overlay не присутній на карті при прямому видаленні');
            }
            
            // Також видаляємо вкладений overlay якщо він є
            if (overlay._overlay && map.hasLayer(overlay._overlay)) {
                map.removeLayer(overlay._overlay);
                console.log('✅ Вкладений overlay видалено з карти');
            }
            
            // Зберігаємо зміни
            import('./layers').then(({ saveLayersToStorage }) => {
                saveLayersToStorage();
                console.log('✅ Збережено зміни в localStorage');
            });
            
            // Очищуємо DOM елементи, пов'язані з overlay
            if (overlayUrl) {
                const imgElements = document.querySelectorAll(`img.leaflet-image-layer[src="${overlayUrl}"]`);
                imgElements.forEach(el => {
                    el.remove();
                    console.log('✅ Видалено DOM елемент зображення при прямому видаленні');
                });
            }
        } catch (error) {
            console.error('❌ Помилка при прямому видаленні overlay:', error);
        }
        
        // Очищуємо стан виділення після резервного видалення з невеликою затримкою
        setTimeout(() => {
            clearOverlaySelection();
        }, 100);
    }
};


export { clearOverlaySelection, performOverlayDeletion };
