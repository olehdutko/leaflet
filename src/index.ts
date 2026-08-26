// Імпорт стилів
import '../style.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-toolbar/dist/leaflet.toolbar.css';
import 'leaflet-distortableimage/dist/leaflet.distortableimage.css';
import 'leaflet.polylinemeasure/Leaflet.PolylineMeasure.css';

// Імпорт власних модулів (глобальні L, Sortable, JSZip тощо надані через CDN у index.html)
import { initHistoricalOverlayUI } from './historical-overlay-ui';
import { restoreHistoricalOverlays } from './historical-overlay';
import './map-init';

initHistoricalOverlayUI();
restoreHistoricalOverlays();
import { initDrawControl } from './draw-control';
initDrawControl();
import './ui';
import './ai-assistant';
import './main';
