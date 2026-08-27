import { customLayers, saveLayersToStorage } from './layers';

const observeOverlayOpacity = () => {
  // Debounced збереження для opacity observer
  let opacityTimeout: number | null = null;
  const debouncedOpacitySave = () => {
    if (opacityTimeout) clearTimeout(opacityTimeout);
    opacityTimeout = window.setTimeout(() => {
      saveLayersToStorage();
      opacityTimeout = null;
    }, 200); // Трохи більший delay для opacity змін
  };

  const observer = new MutationObserver(mutations => {
    let hasChanges = false;
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const img = mutation.target as any;
        if ((img as HTMLElement).classList.contains('leaflet-image-layer')) {
          const opacity = parseFloat((img as HTMLImageElement).style.opacity);
          const src = (img as HTMLImageElement).src;

          // Знаходимо відповідний overlay та шар (не створюємо дублікати!)
          for (const layerObj of customLayers) {
            if (!layerObj.featureGroup || !(layerObj.featureGroup as any).images) continue;
            const idx = (layerObj.featureGroup as any).images.findIndex((imgObj: any) => imgObj.url === src);
            if (idx !== -1) {
              (layerObj.featureGroup as any).images[idx].properties = (layerObj.featureGroup as any).images[idx].properties || {};

              // Перевіряємо, чи справді змінилася прозорість
              if ((layerObj.featureGroup as any).images[idx].properties.opacity !== opacity) {
                (layerObj.featureGroup as any).images[idx].properties.opacity = opacity;
                hasChanges = true;
              }
              break;
            }
          }
        }
      }
    });

    // Зберігаємо тільки якщо справді були зміни
    if (hasChanges) {
      debouncedOpacitySave();
    }
  });
  // спостерігати за всіма leaflet-image-layer
  const addObservers = () => {
    document.querySelectorAll('img.leaflet-image-layer').forEach(img => {
      observer.observe(img, { attributes: true, attributeFilter: ['style'] });
    });
  };
  addObservers();
  // також додавати спостерігачі при додаванні нових зображень
  const imgAddObserver = new MutationObserver(() => addObservers());
  imgAddObserver.observe(document.body, { childList: true, subtree: true });
};

export { observeOverlayOpacity };
