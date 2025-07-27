import { Logger } from '../utils/Logger.js';

export abstract class BaseService {
  protected logger: Logger;
  protected initialized: boolean = false;
  protected destroyed: boolean = false;

  constructor(serviceName: string) {
    this.logger = new Logger(serviceName);
  }

  /**
   * Ініціалізація сервісу
   */
  async init(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Service already initialized');
      return;
    }

    if (this.destroyed) {
      throw new Error('Cannot initialize destroyed service');
    }

    try {
      await this.onInit();
      this.initialized = true;
      this.logger.info('Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize service', error);
      throw error;
    }
  }

  /**
   * Очищення ресурсів сервісу
   */
  async destroy(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    try {
      await this.onDestroy();
      this.destroyed = true;
      this.initialized = false;
      this.logger.info('Service destroyed successfully');
    } catch (error) {
      this.logger.error('Failed to destroy service', error);
      throw error;
    }
  }

  /**
   * Перевіряє чи сервіс ініціалізований
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Перевіряє чи сервіс знищений
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Отримує логер сервісу
   */
  getLogger(): Logger {
    return this.logger;
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
   * Захищений метод для валідації стану сервісу
   */
  protected validateState(): void {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    if (this.destroyed) {
      throw new Error('Service is destroyed');
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
   * Захищений метод для повторних спроб операцій
   */
  protected async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Attempt ${attempt} failed, retrying...`, error);

        if (attempt < maxRetries) {
          await this.delay(delay * attempt); // Експоненціальна затримка
        }
      }
    }

    throw lastError!;
  }

  /**
   * Захищений метод для затримки
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 