// Тест для діагностики проблем з збереженням позицій overlay
console.log('🧪 Запускаємо тест overlay позицій...');

function testOverlayPositionSaving() {
    console.log('=== ДІАГНОСТИКА OVERLAY ПОЗИЦІЙ ===');

    // 1. Перевіряємо наявність необхідних функцій
    const hasDebugOverlay = typeof window !== 'undefined' && window.debugOverlay;
    const hasSaveFunction = typeof window !== 'undefined' && window.saveLayersToStorage;
    const hasCustomLayers = typeof window !== 'undefined' && window.customLayers;

    console.log('📋 Стан системи:');
    console.log(`   debugOverlay: ${hasDebugOverlay ? '✅' : '❌'}`);
    console.log(`   saveLayersToStorage: ${hasSaveFunction ? '✅' : '❌'}`);
    console.log(`   customLayers: ${hasCustomLayers ? '✅' : '❌'}`);

    if (!hasCustomLayers) {
        console.log('❌ Система шарів не завантажена!');
        return;
    }

    // 2. Аналізуємо поточні overlay
    let totalOverlays = 0;
    let overlaysWithEditHandlers = 0;

    window.customLayers.forEach((layer, layerIdx) => {
        if (layer.featureGroup && layer.featureGroup.overlayInstances) {
            const overlayCount = layer.featureGroup.overlayInstances.length;
            totalOverlays += overlayCount;

            console.log(`📊 Шар ${layerIdx}: ${overlayCount} overlay`);

            layer.featureGroup.overlayInstances.forEach((overlay, overlayIdx) => {
                // Перевіряємо наявність edit handlers
                if (overlay._events && overlay._events.edit) {
                    overlaysWithEditHandlers++;
                    console.log(`   ✅ Overlay ${overlayIdx}: має edit handler`);
                } else {
                    console.log(`   ❌ Overlay ${overlayIdx}: НЕМАЄ edit handler!`);
                }
            });
        }
    });

    console.log(`🔍 Всього overlay: ${totalOverlays}, з edit handlers: ${overlaysWithEditHandlers}`);

    // 3. Перевіряємо localStorage
    const stored = localStorage.getItem('lefleat_layers');
    if (stored) {
        try {
            const data = JSON.parse(stored);
            let totalStoredOverlays = 0;
            let overlaysWithCorners = 0;

            data.forEach((layer, idx) => {
                if (layer.overlays && layer.overlays.length > 0) {
                    totalStoredOverlays += layer.overlays.length;
                    layer.overlays.forEach(ov => {
                        if (ov.corners && ov.corners.length > 0) {
                            overlaysWithCorners++;
                        }
                    });
                }
            });

            console.log(`💾 localStorage: ${data.length} шарів, ${totalStoredOverlays} overlay, ${overlaysWithCorners} з corners`);
        } catch (e) {
            console.log('❌ Помилка парсингу localStorage:', e);
        }
    } else {
        console.log('💾 localStorage порожній');
    }

    // 4. Рекомендації
    console.log('📋 РЕКОМЕНДАЦІЇ:');
    if (totalOverlays === 0) {
        console.log('   ⚠️ На карті немає overlay - додайте зображення через галерею');
    } else if (overlaysWithEditHandlers < totalOverlays) {
        console.log('   ❌ ПРОБЛЕМА: Не всі overlay мають edit handlers!');
        console.log('   💡 Спробуйте: debugOverlay.analyze() для детального аналізу');
    } else {
        console.log('   ✅ Edit handlers в порядку');
        console.log('   💡 Спробуйте перемістити overlay і перевірте чи з\'являються логи edit подій');
    }
}

// Запускаємо тест після завантаження сторінки
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(testOverlayPositionSaving, 1000);
        });
    } else {
        setTimeout(testOverlayPositionSaving, 1000);
    }

    // Додаємо в window для ручного виклику
    window.testOverlayPositions = testOverlayPositionSaving;
} else {
    // Якщо запускається в Node.js
    testOverlayPositionSaving();
} 