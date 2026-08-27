// Імпорт стилів
import '../style.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-toolbar/dist/leaflet.toolbar.css';
import 'leaflet-distortableimage/dist/leaflet.distortableimage.css';
import 'leaflet.polylinemeasure/Leaflet.PolylineMeasure.css';

import { initHistoricalOverlayUI } from './historical-overlay-ui';
import { restoreHistoricalOverlays } from './historical-overlay';
import './map-init';
import './ui';
import './ai-assistant';
import './main';          // static: button handlers + async layer loading
import { initDrawControl, updateDrawControlVisibility } from './draw-control';

initHistoricalOverlayUI();
restoreHistoricalOverlays();

// Wait for CDN Leaflet plugins before initializing draw control
function waitForPluginsAndInit() {
  if (
    typeof (window as any).L !== 'undefined' &&
    (window as any).L.Control &&
    typeof (window as any).L.Control.Draw === 'function'
  ) {
    initDrawControl();
    updateDrawControlVisibility(); // ensure visibility reflects active layer
  } else {
    setTimeout(waitForPluginsAndInit, 50);
  }
}
waitForPluginsAndInit();
