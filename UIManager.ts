// UIManager.ts - Централізоване управління UI елементами
export class UIManager {
  private static instance: UIManager;
  
  private constructor() {}
  
  static getInstance(): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager();
    }
    return UIManager.instance;
  }
  
  // Безпечне отримання елемента
  getElement<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
  }
  
  // Безпечне отримання елемента з перевіркою
  getElementRequired<T extends HTMLElement>(id: string): T {
    const element = this.getElement<T>(id);
    if (!element) {
      throw new Error(`Element with id '${id}' not found`);
    }
    return element;
  }
  
  // Встановлення значення для input
  setInputValue(id: string, value: string): void {
    const input = this.getElement<HTMLInputElement>(id);
    if (input) {
      input.value = value;
    }
  }
  
  // Отримання значення з input
  getInputValue(id: string): string {
    const input = this.getElement<HTMLInputElement>(id);
    return input ? input.value : '';
  }
  
  // Показ/приховування елемента
  showElement(id: string): void {
    const element = this.getElement<HTMLElement>(id);
    if (element) {
      element.style.display = 'block';
    }
  }
  
  hideElement(id: string): void {
    const element = this.getElement<HTMLElement>(id);
    if (element) {
      element.style.display = 'none';
    }
  }
  
  // Додавання/видалення класів
  addClass(id: string, className: string): void {
    const element = this.getElement<HTMLElement>(id);
    if (element) {
      element.classList.add(className);
    }
  }
  
  removeClass(id: string, className: string): void {
    const element = this.getElement<HTMLElement>(id);
    if (element) {
      element.classList.remove(className);
    }
  }
  
  // Встановлення тексту
  setText(id: string, text: string): void {
    const element = this.getElement<HTMLElement>(id);
    if (element) {
      element.textContent = text;
    }
  }
  
  // Додавання обробника подій
  addEventListener(id: string, event: string, handler: EventListener): void {
    const element = this.getElement<HTMLElement>(id);
    if (element) {
      element.addEventListener(event, handler);
    }
  }
  
  // Створення елемента
  createElement<T extends HTMLElement>(tag: string, className?: string): T {
    const element = document.createElement(tag) as T;
    if (className) {
      element.className = className;
    }
    return element;
  }
  
  // Пошук елементів за селектором
  querySelector<T extends HTMLElement>(selector: string): T | null {
    return document.querySelector(selector) as T | null;
  }
  
  querySelectorAll<T extends HTMLElement>(selector: string): NodeListOf<T> {
    return document.querySelectorAll(selector) as NodeListOf<T>;
  }
}

export const uiManager = UIManager.getInstance(); 