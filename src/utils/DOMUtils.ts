import { EventHandler } from '../types/index.js';

export class DOMUtils {
  /**
   * Отримує елемент за селектором з типізацією
   */
  static getElement<T extends HTMLElement>(selector: string): T | null {
    return document.querySelector(selector) as T;
  }

  /**
   * Отримує всі елементи за селектором з типізацією
   */
  static getElements<T extends HTMLElement>(selector: string): T[] {
    return Array.from(document.querySelectorAll(selector)) as T[];
  }

  /**
   * Створює елемент з класом
   */
  static createElement<T extends HTMLElement>(tag: string, className?: string): T {
    const element = document.createElement(tag) as T;
    if (className) {
      element.className = className;
    }
    return element;
  }

  /**
   * Створює елемент з атрибутами
   */
  static createElementWithAttributes<T extends HTMLElement>(
    tag: string, 
    attributes: Record<string, string> = {}
  ): T {
    const element = document.createElement(tag) as T;
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  }

  /**
   * Додає обробники подій до елемента
   */
  static addEventListeners(
    element: HTMLElement, 
    events: Record<string, EventListener>
  ): void {
    Object.entries(events).forEach(([event, listener]) => {
      element.addEventListener(event, listener);
    });
  }

  /**
   * Видаляє обробники подій з елемента
   */
  static removeEventListeners(
    element: HTMLElement, 
    events: Record<string, EventListener>
  ): void {
    Object.entries(events).forEach(([event, listener]) => {
      element.removeEventListener(event, listener);
    });
  }

  /**
   * Показує елемент
   */
  static show(element: HTMLElement): void {
    element.style.display = '';
  }

  /**
   * Приховує елемент
   */
  static hide(element: HTMLElement): void {
    element.style.display = 'none';
  }

  /**
   * Переключає видимість елемента
   */
  static toggle(element: HTMLElement): void {
    if (element.style.display === 'none') {
      this.show(element);
    } else {
      this.hide(element);
    }
  }

  /**
   * Додає клас до елемента
   */
  static addClass(element: HTMLElement, className: string): void {
    element.classList.add(className);
  }

  /**
   * Видаляє клас з елемента
   */
  static removeClass(element: HTMLElement, className: string): void {
    element.classList.remove(className);
  }

  /**
   * Переключає клас елемента
   */
  static toggleClass(element: HTMLElement, className: string): void {
    element.classList.toggle(className);
  }

  /**
   * Перевіряє чи має елемент клас
   */
  static hasClass(element: HTMLElement, className: string): boolean {
    return element.classList.contains(className);
  }

  /**
   * Встановлює стилі елемента
   */
  static setStyles(element: HTMLElement, styles: Record<string, string>): void {
    Object.entries(styles).forEach(([property, value]) => {
      element.style.setProperty(property, value);
    });
  }

  /**
   * Отримує значення CSS властивості
   */
  static getStyle(element: HTMLElement, property: string): string {
    return getComputedStyle(element).getPropertyValue(property);
  }

  /**
   * Встановлює текст елемента
   */
  static setText(element: HTMLElement, text: string): void {
    element.textContent = text;
  }

  /**
   * Встановлює HTML елемента
   */
  static setHTML(element: HTMLElement, html: string): void {
    element.innerHTML = html;
  }

  /**
   * Отримує текст елемента
   */
  static getText(element: HTMLElement): string {
    return element.textContent || '';
  }

  /**
   * Отримує HTML елемента
   */
  static getHTML(element: HTMLElement): string {
    return element.innerHTML;
  }

  /**
   * Встановлює значення input елемента
   */
  static setValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    element.value = value;
  }

  /**
   * Отримує значення input елемента
   */
  static getValue(element: HTMLInputElement | HTMLTextAreaElement): string {
    return element.value;
  }

  /**
   * Додає дочірній елемент
   */
  static appendChild(parent: HTMLElement, child: HTMLElement): void {
    parent.appendChild(child);
  }

  /**
   * Видаляє дочірній елемент
   */
  static removeChild(parent: HTMLElement, child: HTMLElement): void {
    if (parent.contains(child)) {
      parent.removeChild(child);
    }
  }

  /**
   * Очищує всі дочірні елементи
   */
  static clearChildren(element: HTMLElement): void {
    element.innerHTML = '';
  }

  /**
   * Клонує елемент
   */
  static cloneElement<T extends HTMLElement>(element: T, deep: boolean = true): T {
    return element.cloneNode(deep) as T;
  }

  /**
   * Перевіряє чи існує елемент
   */
  static exists(selector: string): boolean {
    return document.querySelector(selector) !== null;
  }

  /**
   * Очікує появи елемента
   */
  static waitForElement(selector: string, timeout: number = 5000): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Створює обробник події з автоматичним видаленням
   */
  static createAutoRemovingEventListener(
    element: HTMLElement,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): () => void {
    element.addEventListener(event, handler, options);
    
    return () => {
      element.removeEventListener(event, handler, options);
    };
  }

  /**
   * Дебаунс функція для обробки подій
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: number;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Троттлінг функція для обробки подій
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }
} 