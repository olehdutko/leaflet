// Мінімальний робочий приклад для overlay (distortable image) як у main.js
// Потрібно підключити leaflet, leaflet.distortableimage та створити <div id="map"></div> у HTML

const map = L.map('map', {
  center: [49.8397, 24.0297],
  zoom: 13
});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

// Масив для метаданих зображень
let images = [];
// Масив для overlay-об'єктів
let overlays = [];

function addOverlay(url) {
  // bounds для прикладу
  const center = map.getCenter();
  const bounds = [
    [center.lat - 0.005, center.lng - 0.01],
    [center.lat + 0.005, center.lng + 0.01]
  ];
  const overlay = L.distortableImageOverlay(url, { bounds, selected: true }).addTo(map);
  overlay._customUrl = url;
  overlays.push(overlay);
  images.push({ url, bounds, corners: overlay.getCorners() });
  overlay.on('edit', () => {
    const idx = images.findIndex(img => img.url === url);
    if (idx !== -1) {
      images[idx].bounds = overlay.getBounds();
      images[idx].corners = overlay.getCorners();
      saveImages();
    }
  });
  saveImages();
}

function removeAllOverlays() {
  overlays.forEach(ov => map.removeLayer(ov));
  overlays = [];
}

function saveImages() {
  localStorage.setItem('demo_overlays', JSON.stringify(images));
}

function loadImages() {
  removeAllOverlays();
  images = JSON.parse(localStorage.getItem('demo_overlays') || '[]');
  images.forEach(img => {
    let overlay;
    if (img.corners && img.corners.length === 4) {
      overlay = L.distortableImageOverlay(img.url, { corners: img.corners, selected: false }).addTo(map);
    } else {
      overlay = L.distortableImageOverlay(img.url, { bounds: img.bounds, selected: false }).addTo(map);
    }
    overlay._customUrl = img.url;
    overlays.push(overlay);
    overlay.on('edit', () => {
      const idx = images.findIndex(i => i.url === img.url);
      if (idx !== -1) {
        images[idx].bounds = overlay.getBounds();
        images[idx].corners = overlay.getCorners();
        saveImages();
      }
    });
  });
}

// --- Демо: додати кнопку для додавання зображення ---
const btn = document.createElement('button');
btn.textContent = 'Додати зображення';
btn.style.position = 'absolute';
btn.style.top = '10px';
btn.style.left = '10px';
btn.onclick = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = e => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      addOverlay(evt.target.result);
    };
    reader.readAsDataURL(file);
  };
  input.click();
};
document.body.appendChild(btn);

// --- При завантаженні сторінки ---
loadImages(); 