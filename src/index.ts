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
import { initDrawControl } from './draw-control';

initHistoricalOverlayUI();
restoreHistoricalOverlays();
initDrawControl();

// main.ts relies on ui.ts DOM element exports being defined
import('./main');
