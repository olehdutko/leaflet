import { map } from './map-init.js';
import { LefleatApi } from './api.js';
import { closeEditModal } from './main.js';
import { updateObjectsListForLayer } from './ui.js';

const ASSISTANT_ID = 'ai-assistant-panel';
const MESSAGES_ID = 'ai-assistant-messages';
const INPUT_ID = 'ai-assistant-input';
const SEND_ID = 'ai-assistant-send';
const TOGGLE_ID = 'ai-assistant-top-toggle';
const FLOATING_TOGGLE_ID = 'ai-assistant-toggle';

let panel: HTMLElement | null = null;
let messagesEl: HTMLElement | null = null;
let inputEl: HTMLInputElement | null = null;
let sendBtn: HTMLButtonElement | null = null;
let toggleBtn: HTMLButtonElement | null = null;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function addMessage(text: string, type: 'user' | 'assistant' | 'error' = 'assistant'): void {
  if (!messagesEl) return;
  const msg = document.createElement('div');
  msg.className = `ai-message ai-message-${type}`;
  msg.innerHTML = escapeHtml(text);
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function clearMessages(): void {
  if (!messagesEl) return;
  messagesEl.innerHTML = '';
}

function togglePanel(forceOpen?: boolean): void {
  if (!panel) return;
  const isCollapsed = panel.classList.contains('collapsed');
  const shouldOpen = forceOpen !== undefined ? forceOpen : isCollapsed;
  if (shouldOpen) {
    panel.classList.remove('collapsed');
    setTimeout(() => inputEl?.focus(), 100);
  } else {
    panel.classList.add('collapsed');
  }
}

function extractPlaceName(query: string): string | null {
  const patterns = [
    /(?:знайди|познач|покажи|де|на мапі)\s+(.+?)(?:\s+у\s+\w+)?$/i,
    /(?:додай|постав|маркер|текст)\s+(.+?)(?:\s+у\s+\w+)?$/i,
  ];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/[?.!,;]$/, '');
    }
  }
  return query.trim();
}

async function handleUserQuery(rawQuery: string): Promise<void> {
  const query = rawQuery.trim();
  if (!query) return;

  addMessage(query, 'user');
  if (inputEl) inputEl.value = '';

  const placeName = extractPlaceName(query);
  if (!placeName) {
    addMessage('Не зрозумів, що саме позначити. Спробуй: "Познач Чорну кам\'яницю у Львові".', 'error');
    return;
  }

  const searchQuery = placeName.toLowerCase().includes('львів') ? placeName : `${placeName}, Львів`;
  addMessage(`Шукаю: ${searchQuery}...`, 'assistant');

  try {
    const results = await LefleatApi.geocode(searchQuery);
    if (!results || results.length === 0) {
      addMessage('Нічого не знайшов за цим запитом.', 'error');
      return;
    }

    const best = results[0];
    const lat = parseFloat(best.lat);
    const lon = parseFloat(best.lon);
    const displayName = best.display_name || placeName;

    addMessage(`Знайшов ${displayName}. Створюю маркер...`, 'assistant');

    const result = LefleatApi.addMarker(lat, lon, {
      name: placeName,
      description: displayName,
      icon: 'place',
      color: '#1976d2',
    });

    if (result && result.layer && result.layer.featureGroup) {
      updateObjectsListForLayer(result.layer.featureGroup);
    } else if ((window as any).activeLayer) {
      updateObjectsListForLayer((window as any).activeLayer);
    }

    map.flyTo([lat, lon], 17, { duration: 1.2 });

    addMessage(`Готово! Маркер "${placeName}" додано на мапу.`, 'assistant');
  } catch (error: any) {
    addMessage(`Помилка: ${error?.message || 'Не вдалося виконати запит'}`, 'error');
  }
}

export function initAiAssistant(): void {
  panel = document.getElementById(ASSISTANT_ID);
  messagesEl = document.getElementById(MESSAGES_ID);
  inputEl = document.getElementById(INPUT_ID) as HTMLInputElement | null;
  sendBtn = document.getElementById(SEND_ID) as HTMLButtonElement | null;
  toggleBtn = document.getElementById(TOGGLE_ID) as HTMLButtonElement | null;
  const floatingToggleBtn = document.getElementById(FLOATING_TOGGLE_ID) as HTMLButtonElement | null;

  if (!panel || !messagesEl || !inputEl || !sendBtn) {
    console.warn('AI assistant DOM elements not found');
    return;
  }

  // Початкове привітання
  clearMessages();
  addMessage('Привіт! Скажи, що позначити на мапі. Наприклад: "Познач Чорну кам\'яницю".', 'assistant');

  if (toggleBtn) toggleBtn.addEventListener('click', () => togglePanel());
  if (floatingToggleBtn) floatingToggleBtn.addEventListener('click', () => togglePanel());

  sendBtn.addEventListener('click', () => {
    if (inputEl && inputEl.value.trim()) handleUserQuery(inputEl.value);
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && inputEl && inputEl.value.trim()) {
      handleUserQuery(inputEl.value);
    }
  });

  (window as any).LefleatAiAssistant = {
    ask: handleUserQuery,
    open: () => togglePanel(true),
    close: () => togglePanel(false),
  };
}
