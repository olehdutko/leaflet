import { map } from './map-init';
import * as L from 'leaflet';

let searchMarker: any = null;
(function setupGeoSearch() {
  const input = document.getElementById('geosearch-input') as HTMLInputElement | null;
  const list = document.getElementById('geosearch-autocomplete') as HTMLElement | null;
  if (!input || !list) return;
  let timer: number | null = null;
  let results: any[] = [];
  let activeIdx = -1;

  input.addEventListener('input', function () {
    const val = (input as HTMLInputElement).value.trim();
    list.innerHTML = '';
    list.classList.remove('active');
    activeIdx = -1;
    if (!val) return;
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&addressdetails=1&limit=7&accept-language=uk`)
        .then(r => r.json())
        .then((data: any[]) => {
          results = data;
          if (!results.length) return;
          list.innerHTML = '';
          results.forEach((item: any, idx: number) => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.textContent = item.display_name;
            div.addEventListener('mousedown', function (e: MouseEvent) {
              e.preventDefault();
              selectResult(idx);
            });
            list.appendChild(div);
          });
          list.classList.add('active');
        });
    }, 250);
  });

  input.addEventListener('keydown', function (e: KeyboardEvent) {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      activeIdx = Math.min(activeIdx + 1, results.length - 1);
      updateActive();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      activeIdx = Math.max(activeIdx - 1, 0);
      updateActive();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0) {
        selectResult(activeIdx);
        e.preventDefault();
      }
    }
  });

  document.addEventListener('click', function (e: MouseEvent) {
    if (!input.contains(e.target as Node) && !list.contains(e.target as Node)) {
      list.classList.remove('active');
    }
  });

  function updateActive() {
    if (list) Array.from(list.children).forEach((el, idx) => {
      if (idx === activeIdx) (el as HTMLElement).classList.add('active');
      else (el as HTMLElement).classList.remove('active');
    });
  }

  function selectResult(idx: number) {
    const item = results[idx];
    if (!item) return;
    (input as HTMLInputElement).value = item.display_name;
    (list as HTMLElement).classList.remove('active');
    // @ts-ignore
    if ((window as any).map && item.lat && item.lon) {
      // @ts-ignore
      (map as any).setView([parseFloat(item.lat), parseFloat(item.lon)], 16, { animate: true });
      // --- Додаємо тимчасовий маркер ---
      // @ts-ignore
      if ((window as any).searchMarker) {
        // @ts-ignore
        (map as any).removeLayer((window as any).searchMarker);
        // @ts-ignore
        (window as any).searchMarker = null;
      }
      // @ts-ignore
      const pinSvg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='28' height='38' viewBox='0 0 24 34' fill='none'>
        <path d='M12 0C5.373 0 0 5.373 0 12c0 9 12 22 12 22s12-13 12-22C24 5.373 18.627 0 12 0z' fill='%23B85C38'/>
        <circle cx='12' cy='12' r='5' fill='white'/>
      </svg>`);
      // @ts-ignore
      (window as any).searchMarker = L.marker([parseFloat(item.lat), parseFloat(item.lon)], {
        icon: L.icon({
          iconUrl: 'data:image/svg+xml,' + pinSvg,
          iconSize: [28, 38],
          iconAnchor: [14, 36],
          popupAnchor: [0, -32]
        })
      }).addTo(map);
      // додати обробник подвійного кліку та тултіпів
      import('./ui').then(({ addDoubleClickToLayer }) => {
        addDoubleClickToLayer((window as any).searchMarker);
      });
      // @ts-ignore
      (window as any).searchMarker.bindPopup(item.display_name).openPopup();
    }
  }
})();

export function initGeoSearch(): void { /* IIFE already registered */ }
