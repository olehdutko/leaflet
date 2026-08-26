// leaflet-extensions.d.ts - Leaflet runtime extensions used by Lefleat

import * as Leaflet from 'leaflet';

declare module 'leaflet' {
  interface Layer {
    feature?: GeoJSON.Feature;
    properties?: Record<string, any>;
    _lefleatId?: string;
    _wasDblClicked?: boolean;
    isTextObject?: boolean;
    _textBaseZoom?: number;
  }

  interface FeatureGroup {
    images?: any[];
    overlays?: any[];
    overlayInstances?: any[];
    _restoringOverlays?: boolean;
    _cleaningInProgress?: boolean;
  }

  interface Map {
    _layers?: Record<number, Layer>;
  }

  interface Polygon {
    getArea?: () => number;
  }

  namespace Control {
    interface DrawConstructor {
      new (options?: any): Control;
    }
    const Draw: DrawConstructor;
  }

  namespace GeometryUtil {
    function geodesicArea(latlngs: LatLng[]): number;
  }
}


export {};
