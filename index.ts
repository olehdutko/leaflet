// index.ts - Тільки імпорти та ініціалізація
// Всі інші функції та логіка перенесені в окремі модулі

import './main.js';
import './api.js';
import './ai-assistant.js';

// Історичні підкладки
import { restoreHistoricalOverlays } from './historical-overlay.js';
import { initHistoricalOverlayUI } from './historical-overlay-ui.js';

(async () => {
  // Wait for map initialization
  let attempts = 0;
  while (attempts < 50) {
    const mapEl = document.getElementById('map');
    if (mapEl && (window as any).L && mapEl.children.length > 0) {
      try {
        await restoreHistoricalOverlays();
        initHistoricalOverlayUI();
        console.log('✅ Історичні підкладки ініціалізовано');
      } catch (e) {
        console.error('❌ Помилка ініціалізації історичних підкладок:', e);
      }
      break;
    }
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }
})();

// Ініціалізація додатку відбувається в main.ts
console.log('🚀 Lefleat додаток ініціалізовано через index.ts'); 