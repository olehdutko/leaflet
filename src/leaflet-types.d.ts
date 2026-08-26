// leaflet-types.d.ts - global L for runtime + type augmentations for internal fields

import * as Leaflet from 'leaflet';

declare global {
  const L: typeof Leaflet & Record<string, any>;
}

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
    _layers?: Record<number, any>;
  }

  interface Polygon {
    getArea?: () => number;
  }

  interface MarkerOptions {
    isTextObject?: boolean;
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
