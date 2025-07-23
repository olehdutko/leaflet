// Детальний debug для відстеження edit подій overlay
console.log('🕵️ Завантажуємо детальний debug для edit подій...');

function setupDetailedEditMonitoring() {
    console.log('🔍 Налаштовуємо детальний моніторинг edit подій...');

    if (!window.customLayers) {
        console.log('❌ customLayers недоступні');
        return;
    }

    // Функція для моніторингу конкретного overlay
    function monitorOverlay(overlay, layerIdx, overlayIdx) {
        const overlayId = `${layerIdx}.${overlayIdx}`;

        console.log(`🎯 Налаштовуємо моніторинг overlay ${overlayId}`);
        console.log(`   URL: ${overlay._customUrl?.substring(0, 30) || 'немає'}...`);
        console.log(`   Bounds: ${JSON.stringify(overlay.getBounds())}`);

        // Перевіряємо чи є edit handlers
        if (overlay._events && overlay._events.edit) {
            console.log(`   ✅ Edit handlers: ${overlay._events.edit.length}`);
        } else {
            console.log(`   ❌ Edit handlers відсутні!`);
        }

        // Додаємо власний edit handler для моніторингу
        overlay.on('edit', function () {
            console.log(`🚨 EDIT ПОДІЯ ЗАФІКСОВАНА для overlay ${overlayId}!`);
            console.log(`   Нові bounds: ${JSON.stringify(overlay.getBounds())}`);
            console.log(`   Нові corners: ${overlay.getCorners()?.length || 0} точок`);
            console.log(`   Час: ${new Date().toISOString().split('T')[1]}`);
        });

        // Моніторинг drag подій
        const element = overlay.getElement();
        if (element) {
            ['mousedown', 'mousemove', 'mouseup', 'dragstart', 'drag', 'dragend'].forEach(eventType => {
                element.addEventListener(eventType, function (e) {
                    if (eventType === 'mousedown' || eventType === 'dragstart') {
                        console.log(`🖱️ ${eventType.toUpperCase()} на overlay ${overlayId}`);
                    }
                    if (eventType === 'dragend' || eventType === 'mouseup') {
                        console.log(`🖱️ ${eventType.toUpperCase()} на overlay ${overlayId} - перевіряємо edit...`);
                        setTimeout(() => {
                            console.log(`   Bounds після ${eventType}: ${JSON.stringify(overlay.getBounds())}`);
                        }, 50);
                    }
                });
            });
        }
    }

    // Моніторимо всі overlay
    let totalMonitored = 0;
    window.customLayers.forEach((layer, layerIdx) => {
        if (layer.featureGroup && layer.featureGroup.overlayInstances) {
            layer.featureGroup.overlayInstances.forEach((overlay, overlayIdx) => {
                monitorOverlay(overlay, layerIdx, overlayIdx);
                totalMonitored++;
            });
        }
    });

    console.log(`✅ Налаштовано моніторинг для ${totalMonitored} overlay`);
    console.log('🎯 Тепер переміщуйте overlay і дивіться на логи!');
}

// Функція для тестування збереження позицій
function testPositionPersistence() {
    console.log('🧪 ТЕСТ ЗБЕРЕЖЕННЯ ПОЗИЦІЙ...');

    if (!window.customLayers || window.customLayers.length === 0) {
        console.log('❌ Немає шарів для тестування');
        return;
    }

    let testOverlay = null;
    let testLayer = null;

    // Знаходимо перший доступний overlay
    for (let layer of window.customLayers) {
        if (layer.featureGroup && layer.featureGroup.overlayInstances && layer.featureGroup.overlayInstances.length > 0) {
            testOverlay = layer.featureGroup.overlayInstances[0];
            testLayer = layer;
            break;
        }
    }

    if (!testOverlay) {
        console.log('❌ Немає overlay для тестування');
        return;
    }

    console.log('📍 Знайдено overlay для тестування');

    // Записуємо початкові координати
    const initialBounds = testOverlay.getBounds();
    const initialCorners = testOverlay.getCorners();

    console.log('📋 Початкові координати:');
    console.log(`   Bounds: ${JSON.stringify(initialBounds)}`);
    console.log(`   Corners: ${initialCorners?.length || 0} точок`);

    // Перевіряємо дані в localStorage
    const stored = localStorage.getItem('lefleat_layers');
    if (stored) {
        const data = JSON.parse(stored);
        console.log('💾 Дані в localStorage:');

        let foundInStorage = false;
        data.forEach((layer, idx) => {
            if (layer.overlays && layer.overlays.length > 0) {
                layer.overlays.forEach((ov, ovIdx) => {
                    console.log(`   Шар ${idx}, overlay ${ovIdx}:`);
                    console.log(`     URL: ${ov.url?.substring(0, 30)}...`);
                    console.log(`     Bounds: ${JSON.stringify(ov.bounds)}`);
                    console.log(`     Corners: ${ov.corners?.length || 0} точок`);

                    // Порівнюємо з поточними координатами
                    const currentBounds = JSON.stringify(initialBounds);
                    const storedBounds = JSON.stringify(ov.bounds);

                    if (currentBounds === storedBounds) {
                        console.log(`     ✅ Координати СПІВПАДАЮТЬ з поточними`);
                        foundInStorage = true;
                    } else {
                        console.log(`     ⚠️ Координати ВІДРІЗНЯЮТЬСЯ від поточних`);
                        console.log(`       Поточні:  ${currentBounds}`);
                        console.log(`       Збережені: ${storedBounds}`);
                    }
                });
            }
        });

        if (!foundInStorage) {
            console.log('❌ ПРОБЛЕМА: Поточні координати overlay НЕ знайдено в localStorage!');
        }
    }

    console.log('🎯 Тепер переміщуйте overlay і викличте testPositionPersistence() знову для порівняння');
}

// Функція для принудового збереження
function forceSave() {
    console.log('💾 ПРИНУДОВЕ ЗБЕРЕЖЕННЯ...');

    if (window.overlayPositionFix && window.overlayPositionFix.save) {
        window.overlayPositionFix.save('manual-force', true);
        console.log('✅ Викликано принудове збереження через overlayPositionFix');
    } else if (window.saveLayersToStorage) {
        window.saveLayersToStorage();
        console.log('✅ Викликано пряме збережння через saveLayersToStorage');
    } else {
        console.log('❌ Функції збереження недоступні');
    }

    // Перевіряємо результат через 100мс
    setTimeout(() => {
        console.log('🔍 Перевірка результату збереження...');
        const stored = localStorage.getItem('lefleat_layers');
        if (stored) {
            const data = JSON.parse(stored);
            console.log(`✅ localStorage оновлено: ${data.length} шарів`);
        } else {
            console.log('❌ localStorage порожній після збереження');
        }
    }, 100);
}

// Автоматичний запуск
setTimeout(() => {
    setupDetailedEditMonitoring();

    console.log('💡 Додаткові команди для debugging:');
    console.log('   testPositionPersistence() - тест збереження позицій');
    console.log('   forceSave() - принудове збереження');
    console.log('   overlayPositionFix.enableDebug() - детальне логування');

}, 1000);

// Експортуємо функції
window.setupDetailedEditMonitoring = setupDetailedEditMonitoring;
window.testPositionPersistence = testPositionPersistence;
window.forceSave = forceSave; 