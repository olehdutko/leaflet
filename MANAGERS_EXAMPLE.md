# 🎯 Приклад використання нових менеджерів

## 📋 **Огляд створених менеджерів**

### **1. MapManager - Управління картою**
```typescript
import { mapManager } from './MapManager.js';

// Отримання центру карти
const center = mapManager.getCenter();

// Встановлення центру
mapManager.setCenter(49.8397, 24.0297);

// Додавання/видалення шарів
mapManager.addLayer(layer);
mapManager.removeLayer(layer);

// Перевірка наявності шару
if (mapManager.hasLayer(layer)) {
  // ...
}
```

### **2. StorageManager - Управління збереженням**
```typescript
import { storageManager } from './StorageManager.js';

// Реєстрація callback для збереження
storageManager.registerSaveCallback(() => {
  // Логіка збереження
  saveLayersToStorage();
});

// Планування збереження (з дебаунсом)
storageManager.scheduleSave();

// Примусове збереження
storageManager.forceSave();

// Робота з localStorage
storageManager.saveToLocalStorage('key', data);
const data = storageManager.loadFromLocalStorage('key');
```

### **3. UIManager - Управління UI елементами**
```typescript
import { uiManager } from './UIManager.js';

// Безпечне отримання елементів
const input = uiManager.getElement<HTMLInputElement>('object-name');
const element = uiManager.getElementRequired<HTMLElement>('modal');

// Встановлення значень
uiManager.setInputValue('object-name', 'Назва об\'єкта');
uiManager.getInputValue('object-name');

// Показ/приховування
uiManager.showElement('modal');
uiManager.hideElement('modal');

// Робота з класами
uiManager.addClass('element', 'active');
uiManager.removeClass('element', 'hidden');

// Встановлення тексту
uiManager.setText('title', 'Новий заголовок');

// Створення елементів
const button = uiManager.createElement<HTMLButtonElement>('button', 'btn-primary');
```

### **4. ObjectManager - Управління об'єктами**
```typescript
import { objectManager } from './ObjectManager.js';

// Отримання типу та властивостей
const type = objectManager.getObjectType(layer);
const properties = objectManager.getObjectProperties(layer);

// Застосування властивостей
objectManager.applyObjectProperties(layer, {
  name: 'Назва',
  color: '#ff0000',
  icon: 'place'
});

// Встановлення окремих властивостей
objectManager.setObjectProperty(layer, 'name', 'Назва');
objectManager.applyObjectStyle(layer, { color: '#ff0000' });

// Додавання/видалення об'єктів
objectManager.addObject(layer);
objectManager.removeObject(layer);
```

### **5. ModalManager - Управління модальними вікнами**
```typescript
import { modalManager } from './ModalManager.js';

// Показ звичайного модального вікна
modalManager.show({
  id: 'my-modal',
  title: 'Заголовок',
  content: '<p>Контент</p>',
  buttons: [
    { text: 'OK', action: 'confirm', className: 'btn-primary' },
    { text: 'Скасувати', action: 'cancel', className: 'btn-secondary' }
  ],
  onConfirm: () => console.log('Підтверджено'),
  onClose: () => console.log('Закрито')
});

// Показ діалогу підтвердження
modalManager.showConfirmDialog({
  title: 'Видалення',
  message: 'Ви дійсно хочете видалити цей об\'єкт?',
  onConfirm: () => deleteObject(),
  onCancel: () => console.log('Скасовано')
});

// Показ модального вікна редагування
modalManager.showEditModal(layer);

// Закриття модальних вікон
modalManager.hide('modal-id');
modalManager.hideActive();
```

---

## 🔄 **Міграція існуючого коду**

### **До міграції:**
```typescript
// Старий код
const input = document.getElementById('object-name') as HTMLInputElement;
if (input) input.value = 'Назва';

saveLayersToStorage();

const center = map.getCenter();
map.setView([lat, lng], zoom);

if (layer) {
  layer.setStyle({ color: '#ff0000' });
  layer.properties = layer.properties || {};
  layer.properties.name = 'Назва';
}
```

### **Після міграції:**
```typescript
// Новий код
uiManager.setInputValue('object-name', 'Назва');

storageManager.scheduleSave();

const center = mapManager.getCenter();
mapManager.setCenter(lat, lng);

if (layer) {
  objectManager.applyObjectProperties(layer, {
    name: 'Назва',
    color: '#ff0000'
  });
}
```

---

## 📈 **Переваги нової архітектури**

### **1. Централізація логіки:**
- ✅ Вся логіка роботи з картою в одному місці
- ✅ Централізоване збереження з дебаунсом
- ✅ Єдиний інтерфейс для роботи з UI

### **2. Зменшення дублювання:**
- ✅ Немає повторюваного коду для роботи з DOM
- ✅ Єдиний спосіб збереження даних
- ✅ Перевикористання логіки роботи з об'єктами

### **3. Покращення типізації:**
- ✅ Типізовані методи менеджерів
- ✅ Безпечні операції з DOM
- ✅ Чіткі інтерфейси

### **4. Легше тестування:**
- ✅ Кожен менеджер можна тестувати окремо
- ✅ Можна мокати менеджери для тестів
- ✅ Ізольована логіка

---

## 🚀 **Наступні кроки**

### **1. Інтеграція в існуючий код:**
- [ ] Замінити прямі виклики на менеджери
- [ ] Оновити імпорти
- [ ] Протестувати функціональність

### **2. Розширення функціональності:**
- [ ] Додати нові методи до менеджерів
- [ ] Створити додаткові менеджери за потреби
- [ ] Оптимізувати продуктивність

### **3. Документація:**
- [ ] Створити JSDoc для всіх методів
- [ ] Написати приклади використання
- [ ] Оновити README 