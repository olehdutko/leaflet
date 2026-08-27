import { map } from './map-init';
import { customLayers } from './layers';
import * as L from 'leaflet';

const globalSearchInput = document.getElementById('global-object-search') as HTMLInputElement | null;
const globalSearchResults = document.getElementById('global-object-search-results') as HTMLElement | null;

if (globalSearchInput && globalSearchResults) {
  globalSearchInput.addEventListener('input', function (this: HTMLInputElement) {
    const query = (this as HTMLInputElement).value.trim().toLowerCase();
    globalSearchResults.innerHTML = '';
    if (!query) return;

    // шукати лише у видимих шарах та об'єктах
    let results: any[] = [];
    customLayers.forEach(layerObj => {
      if (!layerObj.visible) return;
      const fg = layerObj.featureGroup;
      fg.eachLayer((layer: any) => {
        if (layer.visible === false) return; // @ts-ignore
        const name = layer.properties?.name || layer.feature?.properties?.name || '';
        const desc = layer.properties?.description || layer.feature?.properties?.description || '';
        const text = layer.properties?.text || layer.feature?.properties?.text || '';
        if (
          name.toLowerCase().includes(query) ||
          desc.toLowerCase().includes(query) ||
          text.toLowerCase().includes(query)
        ) {
          results.push({
            layer,
            name,
            desc,
            layerObj
          });
        }
      });
      // зображення
      if ((fg as any).images && (fg as any).images.length > 0 && (fg as any).overlays) {
        (fg as any).images.forEach((img: any, idx: number) => {
          const overlay = (fg as any).overlays[idx]; // @ts-ignore
          if (!overlay || overlay.visible === false) return;
          const name = img.properties?.name || '';
          const desc = img.properties?.description || '';
          if (
            name.toLowerCase().includes(query) ||
            desc.toLowerCase().includes(query)
          ) {
            results.push({
              layer: overlay,
              name,
              desc,
              layerObj
            });
          }
        });
      }
    });

    if (results.length === 0) {
      const noRes = document.createElement('div');
      noRes.className = 'global-object-search-item';
      noRes.textContent = 'Нічого не знайдено';
      globalSearchResults.appendChild(noRes);
      return;
    }

    results.forEach(res => {
      const item = document.createElement('div');
      item.className = 'global-object-search-item';
      item.innerHTML = `<span><b>${res.name || '[без назви]'}</b></span>` +
        (res.desc ? `<span style="color:#888;">${res.desc}</span>` : '');
      item.onclick = () => {
        // зняти попереднє виділення
        document.querySelectorAll('.global-object-search-highlight').forEach(el => {
          (el as HTMLElement).classList.remove('global-object-search-highlight');
        });

        // виділити на мапі
        const isLineOrPoly = res.layer instanceof L.Polyline || res.layer instanceof L.Polygon;
        const isMarker = res.layer instanceof L.Marker && !(res.layer instanceof L.CircleMarker);
        if (isLineOrPoly) {
          // зберегти попередній стиль
          const prevStyle = {
            color: res.layer.options.color,
            weight: res.layer.options.weight,
            dashArray: res.layer.options.dashArray,
            opacity: res.layer.options.opacity,
            fillColor: res.layer.options.fillColor,
            fillOpacity: res.layer.options.fillOpacity
          };
          res.layer.setStyle({
            color: '#cd1d1d',
            weight: 8,
            dashArray: '8,4',
            opacity: 1,
            fillColor: '#ffe066',
            fillOpacity: 0.7
          });
          setTimeout(() => {
            res.layer.setStyle(prevStyle);
          }, 2000);
        } else if (isMarker) {
          // зберегти попередню іконку
          const prevIcon = res.layer.getIcon();
          // створити яскраву іконку
          const highlightIcon = L.divIcon({
            className: 'highlight-marker-icon',
            html: '<div style="background:#cd1d1d;width:32px;height:32px;border-radius:50%;border:3px solid #ffe066;box-shadow:0 0 12px #cd1d1d;"></div>',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          });
          res.layer.setIcon(highlightIcon);
          setTimeout(() => {
            res.layer.setIcon(prevIcon);
          }, 2000);
        } else if (res.layer.getElement && res.layer.getElement()) {
          (res.layer.getElement() as HTMLElement).classList.add('global-object-search-highlight');
          setTimeout(() => {
            (res.layer.getElement() as HTMLElement).classList.remove('global-object-search-highlight');
          }, 2000);
        } else if ((res.layer as any)._path) {
          (res.layer as any)._path.classList.add('global-object-search-highlight');
          setTimeout(() => {
            (res.layer as any)._path.classList.remove('global-object-search-highlight');
          }, 2000);
        }

        // приблизити
        if (res.layer.getBounds) {
          (map as any).fitBounds(res.layer.getBounds(), { maxZoom: 17 });
        } else if (res.layer.getLatLng) {
          (map as any).setView(res.layer.getLatLng(), 17);
        }

        globalSearchResults.innerHTML = '';
        globalSearchInput.value = '';
      };
      globalSearchResults.appendChild(item);
    });
  });
}

export function initGlobalObjectSearch(): void { /* IIFE already registered */ }
