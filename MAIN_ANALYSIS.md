# Аналіз DOM операцій в `main.ts`

## 📊 Загальна статистика файлу:

- **Розмір**: 72KB, 1918 рядків
- **DOM операцій**: Велика кількість
- **Складність**: Висока для DOM інтеграції
- **Типізація**: Хороша

## 🔍 Знайдені DOM операції:

### 1. **getElementById операції** (25+ випадків):
```typescript
// Рядок 182: overlay-cleanup-styles
const existingStyle = document.getElementById('overlay-cleanup-styles');

// Рядок 414-416: marker-icon, marker-icon-autocomplete, marker-icon-preview
let input = document.getElementById('marker-icon') as HTMLInputElement | null;
const list = document.getElementById('marker-icon-autocomplete') as HTMLElement | null;
const preview = document.getElementById('marker-icon-preview') as HTMLElement | null;

// Рядок 501: edit-object-modal
const editModal = document.getElementById('edit-object-modal');

// Рядок 512-513: object-name, object-description
name: (document.getElementById('object-name') as HTMLInputElement).value,
description: (document.getElementById('object-description') as HTMLTextAreaElement).value

// Рядок 517-519: object-color, marker-icon
const markerColor = document.getElementById('object-color');
const markerIcon = document.getElementById('marker-icon');

// Рядок 522-523: marker-lat, marker-lng
const latInput = document.getElementById('marker-lat');
const lngInput = document.getElementById('marker-lng');

// Рядок 535: object-color
const fillColor = document.getElementById('object-color');

// Рядок 539: object-opacity
const objectOpacity = document.getElementById('object-opacity');

// Рядок 543: object-color
const objectColor = document.getElementById('object-color');

// Рядок 545: line-width
const lineWidth = document.getElementById('line-width');

// Рядок 547: line-style
const lineStyle = document.getElementById('line-style');

// Рядок 551: object-opacity
const objectOpacity = document.getElementById('object-opacity');

// Рядок 556: object-image-preview
const imagePreview = document.getElementById('object-image-preview');

// Рядок 573-575: modal-close, cancel-edit, save-object
(document.getElementById('modal-close') as HTMLElement).addEventListener('click', closeEditModal);
(document.getElementById('cancel-edit') as HTMLElement).addEventListener('click', closeEditModal);
(document.getElementById('save-object') as HTMLElement).addEventListener('click', saveObjectChanges);

// Рядок 578: delete-object
(document.getElementById('delete-object') as HTMLElement).onclick = function () {

// Рядок 610-611: line-width, line-width-value
(document.getElementById('line-width') as HTMLInputElement).addEventListener('input', function () {
(document.getElementById('line-width-value') as HTMLElement).textContent = (this as HTMLInputElement).value;

// Рядок 614-615: object-opacity, opacity-value
(document.getElementById('object-opacity') as HTMLInputElement).addEventListener('input', function () {
(document.getElementById('opacity-value') as HTMLElement).textContent = Math.round(Number((this as HTMLInputElement).value) * 100) + '%';

// Рядок 619: edit-object-modal
(document.getElementById('edit-object-modal') as HTMLElement).addEventListener('click', function (e) {

// Рядок 627: edit-object-modal
if (e.key === 'Escape' && (document.getElementById('edit-object-modal') as HTMLElement).classList.contains('hidden') === false) {

// Рядок 638-639: geosearch-input, geosearch-autocomplete
const input = document.getElementById('geosearch-input') as HTMLInputElement | null;
const list = document.getElementById('geosearch-autocomplete') as HTMLElement | null;

// Рядок 744-745: geosearch-bar, map
const bar = document.getElementById('geosearch-bar');
const mapDiv = document.getElementById('map');

// Рядок 915-916: global-object-search, global-object-search-results
const globalSearchInput = document.getElementById('global-object-search') as HTMLInputElement | null;
const globalSearchResults = document.getElementById('global-object-search-results') as HTMLElement | null;
```

### 2. **textContent операції** (6 випадків):
```typescript
// Рядок 161: style.textContent
style.textContent = `...`;

// Рядок 429: preview.textContent
preview.textContent = input.value;

// Рядок 438: preview.textContent
preview.textContent = name;

// Рядок 611: line-width-value.textContent
(document.getElementById('line-width-value') as HTMLElement).textContent = (this as HTMLInputElement).value;

// Рядок 615: opacity-value.textContent
(document.getElementById('opacity-value') as HTMLElement).textContent = Math.round(Number((this as HTMLInputElement).value) * 100) + '%';

// Рядок 662: div.textContent
div.textContent = item.display_name;

// Рядок 970: noRes.textContent
noRes.textContent = 'Нічого не знайдено';
```

### 3. **value операції** (5 випадків):
```typescript
// Рядок 437: input.value
input.value = name;

// Рядок 503: state.currentEditingObject.value (НЕ DOM)
state.currentEditingObject.value = null;

// Рядок 708: input.value
(input as HTMLInputElement).value = item.display_name;

// Рядок 1044: globalSearchInput.value
globalSearchInput.value = '';

// Рядок 1149: importAllInput.value
(importAllInput as HTMLInputElement).value = '';
```

### 4. **innerHTML операції** (12 випадків):
```typescript
// Рядок 428: list.innerHTML
list.innerHTML = '';

// Рядок 435: item.innerHTML
item.innerHTML = `<span class="material-icons">${name}</span> ${name}`;

// Рядок 439: list.innerHTML
list.innerHTML = '';

// Рядок 471: list.innerHTML
if (e.target !== input) list.innerHTML = '';

// Рядок 647: list.innerHTML
list.innerHTML = '';

// Рядок 658: list.innerHTML
list.innerHTML = '';

// Рядок 874: layerControlsDiv.innerHTML
layerControlsDiv.innerHTML = '';

// Рядок 921: globalSearchResults.innerHTML
globalSearchResults.innerHTML = '';

// Рядок 978: item.innerHTML
item.innerHTML = `<span><b>${res.name || '[без назви]'}</b></span>` + ...;

// Рядок 1043: globalSearchResults.innerHTML
globalSearchResults.innerHTML = '';

// Рядок 1192: layerControlsDiv.innerHTML
layerControlsDiv.innerHTML = '';
```

### 5. **addEventListener операції** (15+ випадків):
```typescript
// Рядок 426: input.addEventListener
input.addEventListener('input', function () {

// Рядок 470: document.addEventListener
document.addEventListener('click', function (e) {

// Рядок 573-575: modal-close, cancel-edit, save-object
(document.getElementById('modal-close') as HTMLElement).addEventListener('click', closeEditModal);
(document.getElementById('cancel-edit') as HTMLElement).addEventListener('click', closeEditModal);
(document.getElementById('save-object') as HTMLElement).addEventListener('click', saveObjectChanges);

// Рядок 610: line-width.addEventListener
(document.getElementById('line-width') as HTMLInputElement).addEventListener('input', function () {

// Рядок 614: object-opacity.addEventListener
(document.getElementById('object-opacity') as HTMLInputElement).addEventListener('input', function () {

// Рядок 619: edit-object-modal.addEventListener
(document.getElementById('edit-object-modal') as HTMLElement).addEventListener('click', function (e) {

// Рядок 626: document.addEventListener
document.addEventListener('keydown', function (e) {

// Рядок 645: input.addEventListener
input.addEventListener('input', function () {

// Рядок 663: div.addEventListener
div.addEventListener('mousedown', function (e: MouseEvent) {

// Рядок 674: input.addEventListener
input.addEventListener('keydown', function (e: KeyboardEvent) {

// Рядок 692: document.addEventListener
document.addEventListener('click', function (e: MouseEvent) {

// Рядок 754: window.addEventListener
window.addEventListener('resize', centerGeoSearchBar);

// Рядок 756: document.addEventListener
document.addEventListener('DOMContentLoaded', () => {

// Рядок 919: globalSearchInput.addEventListener
globalSearchInput.addEventListener('input', function (this: HTMLInputElement) {

// Рядок 1126: addLayerBtn.addEventListener
addLayerBtn.addEventListener('click', addLayer);

// Рядок 1130: exportAllBtn.addEventListener
exportAllBtn.addEventListener('click', () => {

// Рядок 1148: importAllBtn.addEventListener
importAllBtn.addEventListener('click', () => {

// Рядок 1152: importAllInput.addEventListener
(importAllInput as HTMLInputElement).addEventListener('change', (e: any) => {
```

## 📋 Детальний аналіз:

### ✅ Операції, які МОЖНА замінити:

#### 1. **getElementById операції** (25+ випадків):
- **Заміна**: `LegacyAdapter.DOM.getElement`
- **Примітка**: Всі випадки можна замінити

#### 2. **textContent операції** (6 випадків):
- **Заміна**: `LegacyAdapter.DOM.setText`
- **Примітка**: Всі випадки можна замінити

#### 3. **value операції** (4 з 5 випадків):
- **Заміна**: `LegacyAdapter.DOM.setInputValue`
- **Виняток**: `state.currentEditingObject.value` - це не DOM елемент

#### 4. **innerHTML операції** (12 випадків):
- **Заміна**: `LegacyAdapter.DOM.clearElementContent` (для очищення)
- **Примітка**: Для встановлення HTML потрібен окремий метод

#### 5. **addEventListener операції** (15+ випадків):
- **Заміна**: `LegacyAdapter.DOM.addEventListener`
- **Примітка**: Потрібно додати цей метод до LegacyAdapter

### ⚠️ Операції, які НЕ ПОВИННІ замінюватися:

#### 1. **state.value присвоєння**:
- **Рядок 503**: `state.currentEditingObject.value = null;`
- **Причина**: Це не DOM елемент, а властивість об'єкта

#### 2. **Складні innerHTML операції**:
- **Рядок 435**: `item.innerHTML = '<span class="material-icons">${name}</span> ${name}';`
- **Рядок 978**: `item.innerHTML = '<span><b>${res.name || '[без назви]'}</b></span>' + ...;`
- **Причина**: Потрібен окремий метод для встановлення HTML

## 🎯 План інтеграції:

### Етап 1: Підготовка
- [ ] Додати `addEventListener` до LegacyAdapter
- [ ] Додати `setInnerHTML` до LegacyAdapter (для складних випадків)
- [ ] Додати імпорт LegacyAdapter в main.ts

### Етап 2: Поступова заміна (по групах)
- [ ] Замінити прості `getElementById` операції
- [ ] Замінити `textContent` операції
- [ ] Замінити `value` операції
- [ ] Замінити прості `innerHTML` операції (очищення)
- [ ] Замінити `addEventListener` операції

### Етап 3: Складні випадки
- [ ] Обробити складні `innerHTML` операції
- [ ] Обробити `state.value` присвоєння
- [ ] Обробити глобальні event listeners

### Етап 4: Тестування
- [ ] Компіляція проекту
- [ ] Функціональне тестування
- [ ] Перевірка на регресії

## 📊 Очікувані результати:

### До інтеграції:
- ❌ 25+ небезпечних getElementById операцій
- ❌ 6 небезпечних textContent операцій
- ❌ 4 небезпечних value операцій
- ❌ 12 небезпечних innerHTML операцій
- ❌ 15+ небезпечних addEventListener операцій

### Після інтеграції:
- ✅ 25+ безпечних getElement операцій
- ✅ 6 безпечних setText операцій
- ✅ 4 безпечних setInputValue операцій
- ✅ 12 безпечних clearElementContent/setInnerHTML операцій
- ✅ 15+ безпечних addEventListener операцій

## 🚀 Готовність до інтеграції:

### ✅ Переваги:
- Велика кількість DOM операцій для покращення
- Чіткі патерни використання
- Можливість значного покращення безпеки

### ⚠️ Особливості:
- Висока складність через кількість операцій
- Потрібно розширити LegacyAdapter
- Складні випадки потребують особливої уваги

---

**Статус**: ГОТОВО ДО ІНТЕГРАЦІЇ  
**Складність**: Висока  
**Очікуваний час**: 60-90 хвилин  
**Ризик**: Середній 