// Швидка діагностика overlay проблем
console.log('🔍 Запуск швидкої діагностики...');

// Функція для швидкої діагностики
function quickDebug() {
    console.log('=== ШВИДКА ДІАГНОСТИКА OVERLAY ===');

    // 1. Перевіряємо наявність основних компонентів
    console.log('📋 Стан компонентів:');
    console.log('   window.overlayPositionFix:', typeof window.overlayPositionFix);
    console.log('   window.saveLayersToStorage:', typeof window.saveLayersToStorage);
    console.log('   window.customLayers:', window.customLayers ? `${window.customLayers.length} шарів` : 'не знайдено');
    console.log('   window.debugOverlay:', typeof window.debugOverlay);
    console.log('   window.testOverlayPositions:', typeof window.testOverlayPositions);

    // 2. Перевіряємо помилки JavaScript
    const errors = [];
    if (typeof window.overlayPositionFix === 'undefined') {
        errors.push('❌ overlay-position-fix.js не завантажився');
    }
    if (typeof window.testOverlayPositions === 'undefined') {
        errors.push('❌ test-overlay-position.js не завантажився');
    }
    if (typeof window.saveLayersToStorage === 'undefined') {
        errors.push('❌ saveLayersToStorage не доступна');
    }

    if (errors.length > 0) {
        console.log('🚨 ЗНАЙДЕНІ ПРОБЛЕМИ:');
        errors.forEach(error => console.log(`   ${error}`));
        return false;
    }

    // 3. Перевіряємо overlay на карті
    if (window.customLayers) {
        let totalOverlays = 0;
        let overlaysWithHandlers = 0;

        window.customLayers.forEach((layer, idx) => {
            if (layer.featureGroup && layer.featureGroup.overlayInstances) {
                const count = layer.featureGroup.overlayInstances.length;
                totalOverlays += count;

                layer.featureGroup.overlayInstances.forEach((overlay, overlayIdx) => {
                    if (overlay._events && overlay._events.edit) {
                        overlaysWithHandlers++;
                    }
                });

                if (count > 0) {
                    console.log(`   Шар ${idx}: ${count} overlay`);
                }
            }
        });

        console.log(`📊 Всього overlay: ${totalOverlays}, з edit handlers: ${overlaysWithHandlers}`);

        if (totalOverlays > 0 && overlaysWithHandlers < totalOverlays) {
            console.log('⚠️ Виявлено overlay без edit handlers!');
            console.log('💡 Спробуйте: overlayPositionFix.rebindHandlers()');
        }
    }

    // 4. Перевіряємо localStorage
    const stored = localStorage.getItem('lefleat_layers');
    if (stored) {
        const data = JSON.parse(stored);
        let storedOverlays = 0;
        data.forEach(layer => {
            if (layer.overlays) {
                storedOverlays += layer.overlays.length;
            }
        });
        console.log(`💾 localStorage: ${data.length} шарів, ${storedOverlays} overlay`);
    } else {
        console.log('💾 localStorage порожній');
    }

    console.log('✅ Діагностика завершена');
    return true;
}

// Простий тест збереження позицій
function testPositionSaving() {
    console.log('🧪 Тест збереження позицій...');

    if (!window.customLayers || window.customLayers.length === 0) {
        console.log('❌ Немає шарів для тестування');
        console.log('💡 Створіть шар і додайте зображення через галерею');
        return;
    }

    let foundOverlay = null;
    window.customLayers.forEach(layer => {
        if (layer.featureGroup && layer.featureGroup.overlayInstances && layer.featureGroup.overlayInstances.length > 0) {
            foundOverlay = layer.featureGroup.overlayInstances[0];
        }
    });

    if (!foundOverlay) {
        console.log('❌ Немає overlay для тестування');
        console.log('💡 Додайте зображення через кнопку "галерея"');
        return;
    }

    console.log('✅ Знайдено overlay для тестування');
    console.log('📋 Поточні координати:', foundOverlay.getBounds());

    if (foundOverlay._events && foundOverlay._events.edit) {
        console.log('✅ Edit handler присутній');
    } else {
        console.log('❌ Edit handler відсутній!');
        console.log('💡 Спробуйте: overlayPositionFix.rebindHandlers()');
    }

    console.log('🎯 Спробуйте перемістити overlay і подивіться на логи в консолі');
}

// Автоматичний запуск через 2 секунди
setTimeout(() => {
    const success = quickDebug();
    if (success) {
        console.log('💡 Додаткові команди:');
        console.log('   quickDebug() - повторити діагностику');
        console.log('   testPositionSaving() - тест збереження позицій');
        console.log('   overlayPositionFix.enableDebug() - увімкнути детальне логування');
    }
}, 2000);

// Експортуємо функції у window
window.quickDebug = quickDebug;
window.testPositionSaving = testPositionSaving; 