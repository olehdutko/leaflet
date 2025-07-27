import { Logger } from '../utils/Logger.js';
import { BaseService } from '../base/BaseService.js';

export class StateManager<T> extends BaseService {
  private state: T;
  private subscribers: Map<string, (state: T) => void> = new Map();
  private saveCallbacks: Map<string, () => void> = new Map();
  private saveTimeout: number | null = null;
  private autoSave: boolean = true;
  private saveInterval: number = 100;

  constructor(initialState: T, serviceName: string = 'StateManager') {
    super(serviceName);
    this.state = { ...initialState };
  }

  /**
   * Отримує поточний стан
   */
  getState(): T {
    return { ...this.state };
  }

  /**
   * Встановлює новий стан
   */
  setState(updates: Partial<T>): void {
    this.state = { ...this.state, ...updates };
    this.notifySubscribers();
    this.scheduleSave();
  }

  /**
   * Оновлює конкретне поле стану
   */
  updateField<K extends keyof T>(field: K, value: T[K]): void {
    this.setState({ [field]: value } as unknown as Partial<T>);
  }

  /**
   * Отримує конкретне поле стану
   */
  getField<K extends keyof T>(field: K): T[K] {
    return this.state[field];
  }

  /**
   * Підписується на зміни стану
   */
  subscribe(id: string, callback: (state: T) => void): () => void {
    this.subscribers.set(id, callback);
    
    // Викликаємо callback одразу з поточним станом
    callback(this.getState());
    
    // Повертаємо функцію для відписки
    return () => {
      this.subscribers.delete(id);
    };
  }

  /**
   * Відписується від змін стану
   */
  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  /**
   * Реєструє callback для збереження
   */
  registerSaveCallback(id: string, callback: () => void): void {
    this.saveCallbacks.set(id, callback);
  }

  /**
   * Видаляє callback для збереження
   */
  unregisterSaveCallback(id: string): void {
    this.saveCallbacks.delete(id);
  }

  /**
   * Планує збереження з дебаунсом
   */
  scheduleSave(): void {
    if (!this.autoSave) {
      return;
    }

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.performSave();
    }, this.saveInterval);
  }

  /**
   * Примусово зберігає дані
   */
  async forceSave(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    
    await this.performSave();
  }

  /**
   * Виконує збереження
   */
  private async performSave(): Promise<void> {
    try {
      this.logger.debug('Performing save...');
      
      const promises = Array.from(this.saveCallbacks.values()).map(callback => {
        try {
          return Promise.resolve(callback());
        } catch (error) {
          this.logger.error('Save callback failed', error);
          return Promise.reject(error);
        }
      });

      await Promise.all(promises);
      this.logger.debug('Save completed successfully');
    } catch (error) {
      this.logger.error('Save failed', error);
      throw error;
    }
  }

  /**
   * Повідомляє всіх підписників про зміни
   */
  private notifySubscribers(): void {
    const currentState = this.getState();
    
    this.subscribers.forEach((callback, id) => {
      try {
        callback(currentState);
      } catch (error) {
        this.logger.error(`Subscriber ${id} callback failed`, error);
      }
    });
  }

  /**
   * Встановлює налаштування автозбереження
   */
  setAutoSave(enabled: boolean): void {
    this.autoSave = enabled;
  }

  /**
   * Встановлює інтервал збереження
   */
  setSaveInterval(interval: number): void {
    this.saveInterval = interval;
  }

  /**
   * Перевіряє чи є очікуючі збереження
   */
  hasPendingSaves(): boolean {
    return this.saveTimeout !== null;
  }

  /**
   * Отримує список callback'ів для збереження
   */
  getSaveCallbacks(): string[] {
    return Array.from(this.saveCallbacks.keys());
  }

  /**
   * Отримує кількість підписників
   */
  getSubscribersCount(): number {
    return this.subscribers.size;
  }

  /**
   * Очищує всі підписки
   */
  clearSubscriptions(): void {
    this.subscribers.clear();
  }

  /**
   * Очищує всі callback'і збереження
   */
  clearSaveCallbacks(): void {
    this.saveCallbacks.clear();
  }

  /**
   * Експортує стан в JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Імпортує стан з JSON
   */
  importFromJSON(json: string): void {
    try {
      const newState = JSON.parse(json);
      this.setState(newState);
      this.logger.info('State imported successfully');
    } catch (error) {
      this.logger.error('Failed to import state', error);
      throw error;
    }
  }

  /**
   * Створює снапшот стану
   */
  createSnapshot(): T {
    return this.getState();
  }

  /**
   * Відновлює стан зі снапшоту
   */
  restoreFromSnapshot(snapshot: T): void {
    this.setState(snapshot);
  }

  /**
   * Ініціалізація сервісу
   */
  protected onInit(): void {
    this.logger.info('StateManager initialized');
  }

  /**
   * Очищення сервісу
   */
  protected onDestroy(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.clearSubscriptions();
    this.clearSaveCallbacks();
    
    this.logger.info('StateManager destroyed');
  }
} 