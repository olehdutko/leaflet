import { BaseService } from '../base/BaseService.js';
import { EventHandler } from '../types/index.js';
import { EventType } from '../enums/index.js';

export class EventManager extends BaseService {
  private handlers: Map<string, EventHandler[]> = new Map();
  private globalHandlers: Map<string, Function[]> = new Map();
  private elementHandlers: Map<HTMLElement, Map<string, Function[]>> = new Map();
  private debounceTimers: Map<string, number> = new Map();
  private throttleTimers: Map<string, number> = new Map();
  private debounceDelays: Map<string, number> = new Map();
  private throttleDelays: Map<string, number> = new Map();

  constructor() {
    super('EventManager');
  }

  /**
   * Додає обробник події
   */
  addHandler(event: string, handler: Function, element?: HTMLElement): void {
    this.safeExecute(() => {
      if (element) {
        this.addElementHandler(element, event, handler);
      } else {
        this.addGlobalHandler(event, handler);
      }
      
      this.logger.debug(`Handler added for event: ${event}`, { element: element?.tagName });
    }, 'addHandler');
  }

  /**
   * Видаляє обробник події
   */
  removeHandler(event: string, handler: Function, element?: HTMLElement): void {
    this.safeExecute(() => {
      if (element) {
        this.removeElementHandler(element, event, handler);
      } else {
        this.removeGlobalHandler(event, handler);
      }
      
      this.logger.debug(`Handler removed for event: ${event}`, { element: element?.tagName });
    }, 'removeHandler');
  }

  /**
   * Викликає подію
   */
  emit(event: string, data?: any): void {
    this.safeExecute(() => {
      // Викликаємо глобальні обробники
      const globalHandlers = this.globalHandlers.get(event) || [];
      globalHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(`Error in global handler for event: ${event}`, error);
        }
      });

      // Викликаємо обробники для конкретних елементів
      this.elementHandlers.forEach((handlers, element) => {
        const elementHandlers = handlers.get(event) || [];
        elementHandlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            this.logger.error(`Error in element handler for event: ${event}`, error);
          }
        });
      });

      this.logger.debug(`Event emitted: ${event}`, data);
    }, 'emit');
  }

  /**
   * Додає обробник для конкретного елемента
   */
  private addElementHandler(element: HTMLElement, event: string, handler: Function): void {
    if (!this.elementHandlers.has(element)) {
      this.elementHandlers.set(element, new Map());
    }

    const elementHandlers = this.elementHandlers.get(element)!;
    if (!elementHandlers.has(event)) {
      elementHandlers.set(event, []);
    }

    elementHandlers.get(event)!.push(handler);
    element.addEventListener(event, handler as EventListener);
  }

  /**
   * Видаляє обробник для конкретного елемента
   */
  private removeElementHandler(element: HTMLElement, event: string, handler: Function): void {
    const elementHandlers = this.elementHandlers.get(element);
    if (!elementHandlers) return;

    const handlers = elementHandlers.get(event);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      element.removeEventListener(event, handler as EventListener);
    }

    if (handlers.length === 0) {
      elementHandlers.delete(event);
    }

    if (elementHandlers.size === 0) {
      this.elementHandlers.delete(element);
    }
  }

  /**
   * Додає глобальний обробник
   */
  private addGlobalHandler(event: string, handler: Function): void {
    if (!this.globalHandlers.has(event)) {
      this.globalHandlers.set(event, []);
    }

    this.globalHandlers.get(event)!.push(handler);
  }

  /**
   * Видаляє глобальний обробник
   */
  private removeGlobalHandler(event: string, handler: Function): void {
    const handlers = this.globalHandlers.get(event);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }

    if (handlers.length === 0) {
      this.globalHandlers.delete(event);
    }
  }

  /**
   * Очищує всі обробники для елемента
   */
  clearElementHandlers(element: HTMLElement): void {
    this.safeExecute(() => {
      const elementHandlers = this.elementHandlers.get(element);
      if (!elementHandlers) return;

      elementHandlers.forEach((handlers, event) => {
        handlers.forEach(handler => {
          element.removeEventListener(event, handler as EventListener);
        });
      });

      this.elementHandlers.delete(element);
      this.logger.debug(`Cleared all handlers for element`, { element: element.tagName });
    }, 'clearElementHandlers');
  }

  /**
   * Очищує всі обробники для події
   */
  clearEventHandlers(event: string): void {
    this.safeExecute(() => {
      // Очищуємо глобальні обробники
      this.globalHandlers.delete(event);

      // Очищуємо обробники для елементів
      this.elementHandlers.forEach((handlers, element) => {
        const eventHandlers = handlers.get(event);
        if (eventHandlers) {
          eventHandlers.forEach(handler => {
            element.removeEventListener(event, handler as EventListener);
          });
          handlers.delete(event);
        }
      });

      this.logger.debug(`Cleared all handlers for event: ${event}`);
    }, 'clearEventHandlers');
  }

  /**
   * Очищує всі обробники
   */
  clearAllHandlers(): void {
    this.safeExecute(() => {
      // Очищуємо глобальні обробники
      this.globalHandlers.clear();

      // Очищуємо обробники для елементів
      this.elementHandlers.forEach((handlers, element) => {
        handlers.forEach((eventHandlers, event) => {
          eventHandlers.forEach(handler => {
            element.removeEventListener(event, handler as EventListener);
          });
        });
      });
      this.elementHandlers.clear();

      this.logger.info('All event handlers cleared');
    }, 'clearAllHandlers');
  }

  /**
   * Отримує кількість обробників для події
   */
  getHandlerCount(event: string): number {
    let count = 0;

    // Підраховуємо глобальні обробники
    const globalHandlers = this.globalHandlers.get(event);
    if (globalHandlers) {
      count += globalHandlers.length;
    }

    // Підраховуємо обробники для елементів
    this.elementHandlers.forEach(handlers => {
      const eventHandlers = handlers.get(event);
      if (eventHandlers) {
        count += eventHandlers.length;
      }
    });

    return count;
  }

  /**
   * Отримує статистику обробників
   */
  getHandlersStats(): {
    totalGlobalHandlers: number;
    totalElementHandlers: number;
    events: string[];
    elementCount: number;
  } {
    const events = new Set<string>();
    let totalGlobalHandlers = 0;
    let totalElementHandlers = 0;

    // Статистика глобальних обробників
    this.globalHandlers.forEach((handlers, event) => {
      events.add(event);
      totalGlobalHandlers += handlers.length;
    });

    // Статистика обробників для елементів
    this.elementHandlers.forEach(handlers => {
      handlers.forEach((eventHandlers, event) => {
        events.add(event);
        totalElementHandlers += eventHandlers.length;
      });
    });

    return {
      totalGlobalHandlers,
      totalElementHandlers,
      events: Array.from(events),
      elementCount: this.elementHandlers.size
    };
  }

  /**
   * Додає обробник з автоматичним видаленням
   */
  addAutoRemovingHandler(
    event: string, 
    handler: Function, 
    element?: HTMLElement
  ): () => void {
    this.addHandler(event, handler, element);
    
    return () => {
      this.removeHandler(event, handler, element);
    };
  }

  /**
   * Додає обробник з обмеженою кількістю викликів
   */
  addLimitedHandler(
    event: string, 
    handler: Function, 
    maxCalls: number = 1,
    element?: HTMLElement
  ): void {
    let callCount = 0;
    
    const limitedHandler = (...args: any[]) => {
      callCount++;
      if (callCount <= maxCalls) {
        handler(...args);
      }
      
      if (callCount >= maxCalls) {
        this.removeHandler(event, limitedHandler, element);
      }
    };

    this.addHandler(event, limitedHandler, element);
  }

  /**
   * Додає обробник з дебаунсингом
   */
  addDebouncedHandler(
    event: string,
    handler: Function,
    delay: number = 300,
    element?: HTMLElement
  ): void {
    const key = `${event}_${element?.id || 'global'}`;
    this.debounceDelays.set(key, delay);

    const debouncedHandler = (...args: any[]) => {
      const timerKey = key;
      
      if (this.debounceTimers.has(timerKey)) {
        clearTimeout(this.debounceTimers.get(timerKey)!);
      }

      const timer = setTimeout(() => {
        handler(...args);
        this.debounceTimers.delete(timerKey);
      }, delay);

      this.debounceTimers.set(timerKey, timer);
    };

    this.addHandler(event, debouncedHandler, element);
  }

  /**
   * Додає обробник з throttling
   */
  addThrottledHandler(
    event: string,
    handler: Function,
    delay: number = 100,
    element?: HTMLElement
  ): void {
    const key = `${event}_${element?.id || 'global'}`;
    this.throttleDelays.set(key, delay);

    const throttledHandler = (...args: any[]) => {
      const timerKey = key;
      
      if (this.throttleTimers.has(timerKey)) {
        return; // Ігноруємо виклик, якщо throttle активний
      }

      handler(...args);

      const timer = setTimeout(() => {
        this.throttleTimers.delete(timerKey);
      }, delay);

      this.throttleTimers.set(timerKey, timer);
    };

    this.addHandler(event, throttledHandler, element);
  }

  /**
   * Очищує всі дебаунс таймери
   */
  clearDebounceTimers(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  /**
   * Очищує всі throttle таймери
   */
  clearThrottleTimers(): void {
    this.throttleTimers.forEach(timer => clearTimeout(timer));
    this.throttleTimers.clear();
  }

  /**
   * Отримує статистику дебаунс та throttle
   */
  getDebounceThrottleStats(): {
    activeDebounceTimers: number;
    activeThrottleTimers: number;
    debounceDelays: Record<string, number>;
    throttleDelays: Record<string, number>;
  } {
    return {
      activeDebounceTimers: this.debounceTimers.size,
      activeThrottleTimers: this.throttleTimers.size,
      debounceDelays: Object.fromEntries(this.debounceDelays),
      throttleDelays: Object.fromEntries(this.throttleDelays)
    };
  }

  protected onInit(): void {
    this.logger.info('EventManager initialized');
  }

  protected onDestroy(): void {
    this.clearAllHandlers();
    this.clearDebounceTimers();
    this.clearThrottleTimers();
    this.logger.info('EventManager destroyed');
  }
} 