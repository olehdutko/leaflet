import { Logger } from '../utils/Logger.js';
import { DOMUtils } from '../utils/DOMUtils.js';

export abstract class BaseComponent {
  protected element: HTMLElement;
  protected logger: Logger;
  protected eventHandlers: Map<string, EventListener> = new Map();
  protected initialized: boolean = false;
  protected destroyed: boolean = false;

  constructor(element: HTMLElement, componentName: string) {
    this.element = element;
    this.logger = new Logger(componentName);
  }

  /**
   * Ініціалізація компонента
   */
  async init(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Component already initialized');
      return;
    }

    if (this.destroyed) {
      throw new Error('Cannot initialize destroyed component');
    }

    try {
      await this.onInit();
      this.bindEvents();
      this.initialized = true;
      this.logger.info('Component initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize component', error);
      throw error;
    }
  }

  /**
   * Очищення ресурсів компонента
   */
  async destroy(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    try {
      this.unbindEvents();
      await this.onDestroy();
      this.destroyed = true;
      this.initialized = false;
      this.logger.info('Component destroyed successfully');
    } catch (error) {
      this.logger.error('Failed to destroy component', error);
      throw error;
    }
  }

  /**
   * Отримує DOM елемент компонента
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Перевіряє чи компонент ініціалізований
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Перевіряє чи компонент знищений
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Показує компонент
   */
  show(): void {
    DOMUtils.show(this.element);
  }

  /**
   * Приховує компонент
   */
  hide(): void {
    DOMUtils.hide(this.element);
  }

  /**
   * Переключає видимість компонента
   */
  toggle(): void {
    DOMUtils.toggle(this.element);
  }

  /**
   * Додає клас до компонента
   */
  addClass(className: string): void {
    DOMUtils.addClass(this.element, className);
  }

  /**
   * Видаляє клас з компонента
   */
  removeClass(className: string): void {
    DOMUtils.removeClass(this.element, className);
  }

  /**
   * Переключає клас компонента
   */
  toggleClass(className: string): void {
    DOMUtils.toggleClass(this.element, className);
  }

  /**
   * Перевіряє чи має компонент клас
   */
  hasClass(className: string): boolean {
    return DOMUtils.hasClass(this.element, className);
  }

  /**
   * Додає обробник події
   */
  addEventListener(event: string, handler: EventListener): void {
    this.eventHandlers.set(event, handler);
    this.element.addEventListener(event, handler);
  }

  /**
   * Видаляє обробник події
   */
  removeEventListener(event: string): void {
    const handler = this.eventHandlers.get(event);
    if (handler) {
      this.element.removeEventListener(event, handler);
      this.eventHandlers.delete(event);
    }
  }

  /**
   * Додає обробник події з автоматичним видаленням
   */
  addAutoRemovingEventListener(
    event: string, 
    handler: EventListener
  ): () => void {
    const removeHandler = DOMUtils.createAutoRemovingEventListener(
      this.element, 
      event, 
      handler
    );
    
    this.eventHandlers.set(event, handler);
    return removeHandler;
  }

  /**
   * Прив'язує всі обробники подій
   */
  protected bindEvents(): void {
    // Має бути реалізовано в нащадках
  }

  /**
   * Відв'язує всі обробники подій
   */
  protected unbindEvents(): void {
    this.eventHandlers.forEach((handler, event) => {
      this.element.removeEventListener(event, handler);
    });
    this.eventHandlers.clear();
  }

  /**
   * Абстрактний метод для ініціалізації (має бути реалізований в нащадках)
   */
  protected abstract onInit(): Promise<void> | void;

  /**
   * Абстрактний метод для очищення (має бути реалізований в нащадках)
   */
  protected abstract onDestroy(): Promise<void> | void;

  /**
   * Захищений метод для валідації стану компонента
   */
  protected validateState(): void {
    if (!this.initialized) {
      throw new Error('Component not initialized');
    }

    if (this.destroyed) {
      throw new Error('Component is destroyed');
    }
  }

  /**
   * Захищений метод для безпечного виконання операцій
   */
  protected async safeExecute<T>(
    operation: () => Promise<T> | T,
    operationName: string
  ): Promise<T> {
    try {
      this.validateState();
      const result = await operation();
      this.logger.debug(`${operationName} completed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`${operationName} failed`, error);
      throw error;
    }
  }

  /**
   * Захищений метод для оновлення DOM
   */
  protected updateDOM(operation: () => void): void {
    try {
      this.validateState();
      operation();
    } catch (error) {
      this.logger.error('DOM update failed', error);
      throw error;
    }
  }

  /**
   * Захищений метод для створення дочірнього елемента
   */
  protected createChildElement<T extends HTMLElement>(
    tag: string, 
    className?: string
  ): T {
    return DOMUtils.createElement<T>(tag, className);
  }

  /**
   * Захищений метод для додавання дочірнього елемента
   */
  protected appendChild(child: HTMLElement): void {
    DOMUtils.appendChild(this.element, child);
  }

  /**
   * Захищений метод для видалення дочірнього елемента
   */
  protected removeChild(child: HTMLElement): void {
    DOMUtils.removeChild(this.element, child);
  }

  /**
   * Захищений метод для очищення дочірніх елементів
   */
  protected clearChildren(): void {
    DOMUtils.clearChildren(this.element);
  }
} 