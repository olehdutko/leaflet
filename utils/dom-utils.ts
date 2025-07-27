// Утиліти для роботи з DOM елементами

/**
 * Безпечне отримання елемента за ID
 */
export function getElementById<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Безпечне отримання елемента за ID з викиданням помилки
 */
export function getRequiredElementById<T extends HTMLElement>(id: string): T {
  const element = getElementById<T>(id);
  if (!element) {
    throw new Error(`Element with id '${id}' not found`);
  }
  return element;
}

/**
 * Отримання всіх елементів за селектором
 */
export function querySelectorAll<T extends HTMLElement>(selector: string): T[] {
  return Array.from(document.querySelectorAll(selector)) as T[];
}

/**
 * Безпечне встановлення значення для input елемента
 */
export function setInputValue(id: string, value: string): void {
  const element = getElementById<HTMLInputElement>(id);
  if (element) {
    element.value = value;
  }
}

/**
 * Безпечне отримання значення з input елемента
 */
export function getInputValue(id: string): string {
  const element = getElementById<HTMLInputElement>(id);
  return element?.value || '';
}

/**
 * Безпечне встановлення тексту для елемента
 */
export function setElementText(id: string, text: string): void {
  const element = getElementById<HTMLElement>(id);
  if (element) {
    element.textContent = text;
  }
}

/**
 * Безпечне показування/приховування елемента
 */
export function setElementVisibility(id: string, visible: boolean): void {
  const element = getElementById<HTMLElement>(id);
  if (element) {
    element.style.display = visible ? 'block' : 'none';
  }
}

/**
 * Безпечне додавання/видалення класу
 */
export function toggleElementClass(id: string, className: string, add: boolean): void {
  const element = getElementById<HTMLElement>(id);
  if (element) {
    if (add) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  }
}

/**
 * Створення елемента з атрибутами
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  className?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  
  if (className) {
    element.className = className;
  }
  
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  
  return element;
}

/**
 * Безпечне додавання обробника події
 */
export function addEventListener<T extends HTMLElement>(
  id: string,
  event: string,
  handler: EventListener
): void {
  const element = getElementById<T>(id);
  if (element) {
    element.addEventListener(event, handler);
  }
}

/**
 * Безпечне видалення обробника події
 */
export function removeEventListener<T extends HTMLElement>(
  id: string,
  event: string,
  handler: EventListener
): void {
  const element = getElementById<T>(id);
  if (element) {
    element.removeEventListener(event, handler);
  }
}

/**
 * Отримання всіх дочірніх елементів з певним класом
 */
export function getChildrenByClass(parent: HTMLElement, className: string): HTMLElement[] {
  return Array.from(parent.querySelectorAll(`.${className}`)) as HTMLElement[];
}

/**
 * Перевірка чи елемент видимий
 */
export function isElementVisible(element: HTMLElement): boolean {
  return element.style.display !== 'none' && 
         element.style.visibility !== 'hidden' && 
         element.offsetParent !== null;
}

/**
 * Безпечне видалення елемента з DOM
 */
export function removeElement(id: string): void {
  const element = getElementById<HTMLElement>(id);
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

/**
 * Безпечне очищення вмісту елемента
 */
export function clearElementContent(id: string): void {
  const element = getElementById<HTMLElement>(id);
  if (element) {
    element.innerHTML = '';
  }
}

/**
 * Безпечне встановлення HTML вмісту елемента
 */
export function setElementHTML(id: string, html: string): void {
  const element = getElementById<HTMLElement>(id);
  if (element) {
    element.innerHTML = html;
  }
} 