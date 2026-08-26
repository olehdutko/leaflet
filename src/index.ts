// Імпорт стилів
import '../style.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-toolbar/dist/leaflet.toolbar.css';
import 'leaflet-distortableimage/dist/leaflet.distortableimage.css';
import 'leaflet.polylinemeasure/Leaflet.PolylineMeasure.css';

// Імпорт бібліотек
import * as L from 'leaflet';
import 'leaflet-draw';
const LeafletGlobal = (window as any).L = L;
import 'leaflet-toolbar';
import 'leaflet-distortableimage';
import 'leaflet.polylinemeasure';
import Sortable from 'sortablejs';
import JSZip from 'jszip';

// Прив'язка глобальних об'єктів для зворотної сумісності
(window as any).L = L;
(window as any).Sortable = Sortable;
(window as any).JSZip = JSZip;

// Локалізація Leaflet.draw
LeafletGlobal.drawLocal = {
  draw: {
    toolbar: {
      actions: {
        title: 'Скасувати малювання',
        text: 'Скасувати'
      },
      finish: {
        title: 'Завершити малювання',
        text: 'Завершити'
      },
      undo: {
        title: 'Видалити останню точку',
        text: 'Видалити останню точку'
      },
      buttons: {
        polyline: 'Намалювати лінію',
        polygon: 'Намалювати полігон',
        rectangle: 'Намалювати прямокутник',
        circle: 'Намалювати коло',
        marker: 'Додати маркер',
        circlemarker: 'Додати круглий маркер'
      }
    },
    handlers: {
      polygon: {
        tooltip: {
          start: 'Клікніть для початку малювання полігону.',
          cont: 'Клікніть для продовження малювання полігону.',
          end: 'Клікніть на першу точку для завершення полігону.'
        },
        error: '<strong>Помилка:</strong> полігон не може сам себе перетинати!'
      },
      polyline: {
        tooltip: {
          start: 'Клікніть для початку малювання лінії.',
          cont: 'Клікніть для продовження малювання лінії.',
          end: 'Клікніть на останню точку для завершення лінії.'
        },
        error: '<strong>Помилка:</strong> лінії не можуть перетинатися!'
      },
      rectangle: {
        tooltip: {
          start: 'Клікніть і тягніть для малювання прямокутника.'
        },
        error: ''
      },
      circle: {
        tooltip: {
          start: 'Клікніть і тягніть для малювання кола.'
        },
        error: ''
      },
      marker: {
        tooltip: {
          start: 'Клікніть для додавання маркера.'
        },
        error: ''
      },
      circlemarker: {
        tooltip: {
          start: 'Клікніть для додавання круглого маркера.'
        },
        error: ''
      }
    }
  },
  edit: {
    toolbar: {
      actions: {
        save: {
          title: 'Зберегти зміни',
          text: 'Зберегти'
        },
        cancel: {
          title: 'Скасувати редагування',
          text: 'Скасувати'
        }
      },
      buttons: {
        edit: 'Редагувати шари',
        editDisabled: 'Немає шарів для редагування',
        remove: 'Видалити шари',
        removeDisabled: 'Немає шарів для видалення'
      }
    },
    handlers: {
      edit: {
        tooltip: {
          text: 'Перетягніть маркери для редагування обʼєкта.',
          subtext: ''
        }
      },
      remove: {
        tooltip: {
          text: 'Клікніть на обʼєкт для видалення.',
          subtext: ''
        }
      }
    }
  }
};

// Історичні підкладки
import { restoreHistoricalOverlays } from './historical-overlay';
restoreHistoricalOverlays();

// Ініціалізація мапи, draw control, UI та AI (side effects)
import './map-init';
import './draw-control';
import './ui';
import './ai-assistant';

// Ініціалізація додаткових модулів
import './main';
