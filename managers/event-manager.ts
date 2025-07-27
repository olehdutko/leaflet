// Менеджер подій для централізованого управління подіями
export type EventHandler = (data?: any) => void | Promise<void>;

export interface EventSubscription {
  event: string;
  handler: EventHandler;
  id: string;
}

export class EventManager {
  private static instance: EventManager;
  private listeners: Map<string, EventSubscription[]> = new Map();
  private subscriptionCounter = 0;

  private constructor() {}

  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  /**
   * Підписується на подію
   * @param event Назва події
   * @param handler Обробник події
   * @returns ID підписки для можливості відписки
   */
  on(event: string, handler: EventHandler): string {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const subscriptionId = `sub_${++this.subscriptionCounter}`;
    const subscription: EventSubscription = {
      event,
      handler,
      id: subscriptionId
    };

    this.listeners.get(event)!.push(subscription);
    return subscriptionId;
  }

  /**
   * Відписується від події за ID підписки
   * @param subscriptionId ID підписки
   */
  off(subscriptionId: string): boolean {
    for (const [event, subscriptions] of this.listeners.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        
        // Видаляємо порожній масив підписок
        if (subscriptions.length === 0) {
          this.listeners.delete(event);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Відписується від події за обробником
   * @param event Назва події
   * @param handler Обробник події
   */
  offHandler(event: string, handler: EventHandler): boolean {
    const subscriptions = this.listeners.get(event);
    if (!subscriptions) return false;

    const index = subscriptions.findIndex(sub => sub.handler === handler);
    if (index !== -1) {
      subscriptions.splice(index, 1);
      
      // Видаляємо порожній масив підписок
      if (subscriptions.length === 0) {
        this.listeners.delete(event);
      }
      return true;
    }
    return false;
  }

  /**
   * Відписується від всіх подій
   */
  offAll(): void {
    this.listeners.clear();
  }

  /**
   * Відправляє подію
   * @param event Назва події
   * @param data Дані події
   */
  emit(event: string, data?: any): void {
    const subscriptions = this.listeners.get(event);
    if (!subscriptions) return;

    // Викликаємо всі обробники
    subscriptions.forEach(subscription => {
      try {
        subscription.handler(data);
      } catch (error) {
        console.error(`Помилка в обробнику події ${event}:`, error);
      }
    });
  }

  /**
   * Відправляє подію асинхронно
   * @param event Назва події
   * @param data Дані події
   */
  async emitAsync(event: string, data?: any): Promise<void> {
    const subscriptions = this.listeners.get(event);
    if (!subscriptions) return;

    // Викликаємо всі обробники асинхронно
    const promises = subscriptions.map(subscription => {
      return new Promise<void>((resolve, reject) => {
                 try {
           const result = subscription.handler(data);
           if (result && typeof result === 'object' && 'then' in result) {
             (result as Promise<any>).then(() => resolve()).catch(reject);
           } else {
             resolve();
           }
        } catch (error) {
          console.error(`Помилка в обробнику події ${event}:`, error);
          reject(error);
        }
      });
    });

    await Promise.all(promises);
  }

  /**
   * Отримує кількість підписників на подію
   * @param event Назва події
   */
  getListenerCount(event: string): number {
    const subscriptions = this.listeners.get(event);
    return subscriptions ? subscriptions.length : 0;
  }

  /**
   * Отримує список всіх подій
   */
  getEvents(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Перевіряє чи є підписники на подію
   * @param event Назва події
   */
  hasListeners(event: string): boolean {
    return this.getListenerCount(event) > 0;
  }

  /**
   * Отримує всі підписки на подію
   * @param event Назва події
   */
  getSubscriptions(event: string): EventSubscription[] {
    return this.listeners.get(event) || [];
  }

  /**
   * Видаляє всі підписки на конкретну подію
   * @param event Назва події
   */
  removeAllListeners(event: string): boolean {
    return this.listeners.delete(event);
  }
}

// Попередньо визначені події
export const AppEvents = {
  // Події шарів
  LAYER_ADDED: 'layer:added',
  LAYER_REMOVED: 'layer:removed',
  LAYER_UPDATED: 'layer:updated',
  LAYER_VISIBILITY_CHANGED: 'layer:visibility:changed',

  // Події об'єктів
  OBJECT_ADDED: 'object:added',
  OBJECT_REMOVED: 'object:removed',
  OBJECT_UPDATED: 'object:updated',
  OBJECT_SELECTED: 'object:selected',

  // Події overlay
  OVERLAY_ADDED: 'overlay:added',
  OVERLAY_REMOVED: 'overlay:removed',
  OVERLAY_UPDATED: 'overlay:updated',

  // Події пошуку
  SEARCH_STARTED: 'search:started',
  SEARCH_COMPLETED: 'search:completed',
  SEARCH_RESULT_SELECTED: 'search:result:selected',

  // Події модальних вікон
  MODAL_OPENED: 'modal:opened',
  MODAL_CLOSED: 'modal:closed',

  // Події збереження
  DATA_SAVED: 'data:saved',
  DATA_LOADED: 'data:loaded',

  // Події карти
  MAP_ZOOM_CHANGED: 'map:zoom:changed',
  MAP_CENTER_CHANGED: 'map:center:changed',
  MAP_BOUNDS_CHANGED: 'map:bounds:changed',

  // Події помилок
  ERROR_OCCURRED: 'error:occurred',
  WARNING_SHOWN: 'warning:shown'
} as const;

// Типи для типізованих подій
export interface LayerEventData {
  layerId: string;
  layer: any;
}

export interface ObjectEventData {
  objectId: string;
  object: any;
  layerId?: string;
}

export interface SearchEventData {
  query: string;
  results: any[];
}

export interface ModalEventData {
  modalId: string;
  data?: any;
}

export interface MapEventData {
  zoom?: number;
  center?: [number, number];
  bounds?: any;
}

export interface ErrorEventData {
  error: Error;
  context?: string;
} 