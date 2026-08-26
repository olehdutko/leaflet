import {
  addHistoricalOverlay,
  removeHistoricalOverlay,
  setHistoricalOverlayOpacity,
  setHistoricalOverlayVisible,
  getAllHistoricalOverlayIds,
  getHistoricalOverlay,
} from './historical-overlay';

const fileInput = document.getElementById('historical-overlay-input') as HTMLInputElement | null;
const addBtn = document.getElementById('add-historical-overlay') as HTMLButtonElement | null;
const listEl = document.getElementById('historical-overlays-list') as HTMLElement | null;

export function initHistoricalOverlayUI(): void {
  if (!addBtn || !listEl || !fileInput) {
    console.warn('⚠️ Елементи UI історичних підкладок не знайдено');
    return;
  }

  addBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const name = file.name.replace(/\.[^/.]+$/, '');
      try {
        await addHistoricalOverlay({ id: '', name, opacity: 0.7, visible: true }, base64);
        await renderList();
      } catch (err: any) {
        console.error('❌ Помилка додавання підкладки:', err);
        alert('Не вдалося додати історичну підкладку: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });

  renderList();
}

async function renderList(): Promise<void> {
  if (!listEl) return;
  listEl.innerHTML = '';
  const ids = await getAllHistoricalOverlayIds();
  if (ids.length === 0) {
    listEl.innerHTML = '';
    return;
  }

  for (const id of ids) {
    const record = await getHistoricalOverlay(id);
    if (!record) continue;
    const data = record.data;

    const item = document.createElement('div');
    item.className = 'historical-overlay-item';

    const row = document.createElement('div');
    row.className = 'historical-overlay-row';

    const name = document.createElement('span');
    name.className = 'historical-overlay-name';
    name.title = data.name;
    name.textContent = data.name;

    const year = document.createElement('span');
    year.className = 'historical-overlay-year';
    year.textContent = data.year || '—';

    const actions = document.createElement('div');
    actions.className = 'historical-overlay-actions';

    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = `<i class="fa ${data.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>`;
    toggleBtn.title = data.visible ? 'Приховати' : 'Показати';
    toggleBtn.onclick = async () => {
      await setHistoricalOverlayVisible(id, !data.visible);
      await renderList();
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
    deleteBtn.title = 'Видалити';
    deleteBtn.onclick = async () => {
      removeHistoricalOverlay(id);
      await renderList();
    };

    actions.appendChild(toggleBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(name);
    row.appendChild(year);
    row.appendChild(actions);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = String(data.opacity ?? 0.7);
    slider.className = 'historical-overlay-slider';
    slider.oninput = async () => {
      const value = parseFloat(slider.value);
      await setHistoricalOverlayOpacity(id, value);
      if (value > 0 && !data.visible) {
        await setHistoricalOverlayVisible(id, true);
      }
    };

    item.appendChild(row);
    item.appendChild(slider);
    listEl.appendChild(item);
  }
}
