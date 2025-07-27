# Гід по інтеграції менеджерів

## Завершені інтеграції

### ✅ StorageManager
Всі виклики `saveLayersToStorage()` замінені на `storageManager.scheduleSave()`:

**Файли:**
- `main.ts` ✅
- `ui.ts` ✅  
- `draw-control.ts` ✅
- `layers.ts` ✅

**Приклад заміни:**
```typescript
// Було:
saveLayersToStorage();

// Стало:
storageManager.scheduleSave();
```

### ✅ AppManager
Створено централізований менеджер додатку `AppManager.ts` з усіма інтегрованими менеджерами.

**Використання:**
```typescript
import { appManager } from './AppManager.js';

// Замість прямих викликів:
appManager.save();           // замість saveLayersToStorage()
appManager.showEditModal();  // замість showEditModal()
appManager.closeEditModal(); // замість closeEditModal()
```

## Наступні кроки інтеграції

### 🔄 UIManager - заміна DOM операцій
**Замінити:**
```typescript
// Було:
document.getElementById('element-id')
element.addEventListener('click', handler)

// Стало:
uiManager.getElement('element-id')
uiManager.addEventListener('element-id', 'click', handler)
```

### 🔄 ModalEditManager - заміна showEditModal
**Замінити:**
```typescript
// Було:
showEditModal(layer)

// Стало:
modalEditManager.showEditModal(layer)
```

### 🔄 EventManager - централізація подій
**Замінити:**
```typescript
// Було:
map.on('click', handler)
document.addEventListener('keydown', handler)

// Стало:
eventManager.registerHandler({
  target: 'map',
  event: 'click',
  handler: handler
})
```

## Файли для інтеграції

### Пріоритет 1 (КРИТИЧНО):
- `main.ts` - замінити DOM операції на UIManager
- `ui.ts` - замінити showEditModal на ModalEditManager
- `draw-control.ts` - інтегрувати з менеджерами

### Пріоритет 2 (ВАЖЛИВО):
- `layers.ts` - замінити прямі виклики на менеджери
- `map-init.ts` - інтегрувати з MapManager

### Пріоритет 3 (БАЖАНО):
- Всі інші файли - поступова інтеграція

## Приклади замін

### DOM операції:
```typescript
// Було:
const element = document.getElementById('my-element');
element.classList.add('hidden');
element.textContent = 'New text';

// Стало:
uiManager.hideElement('my-element');
uiManager.setText('my-element', 'New text');
```

### Обробка подій:
```typescript
// Було:
document.getElementById('save-btn').addEventListener('click', saveHandler);

// Стало:
uiManager.addEventListener('save-btn', 'click', saveHandler);
```

### Модальні вікна:
```typescript
// Було:
showEditModal(layer);
closeEditModal();

// Стало:
modalEditManager.showEditModal(layer);
modalEditManager.closeEditModal();
```

### Збереження даних:
```typescript
// Було:
saveLayersToStorage();

// Стало:
storageManager.scheduleSave();
// або
appManager.save();
```

## Переваги інтеграції

1. **Централізація** - всі операції через менеджери
2. **Тестування** - легше тестувати окремі менеджери
3. **Підтримка** - менше дублювання коду
4. **Розширення** - легше додавати нові функції
5. **Відлагодження** - централізоване логування

## Статус інтеграції

- ✅ StorageManager - 100%
- ✅ AppManager - 100%
- 🔄 UIManager - 30%
- 🔄 ModalEditManager - 20%
- 🔄 EventManager - 10%
- ⏳ Інші менеджери - 0% 