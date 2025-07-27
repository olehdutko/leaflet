import { BaseService } from '../base/BaseService.js';
import { Logger } from '../utils/Logger.js';

export class AppManager extends BaseService {
  private services: Map<string, BaseService> = new Map();
  private initializationOrder: string[] = [];

  constructor() {
    super('AppManager');
    this.logger = new Logger('AppManager');
  }

  /**
   * Реєструє сервіс
   */
  registerService(name: string, service: BaseService, initOrder?: number): void {
    if (this.services.has(name)) {
      this.logger.warn(`Service ${name} is already registered`);
      return;
    }

    this.services.set(name, service);
    
    if (initOrder !== undefined) {
      this.initializationOrder.splice(initOrder, 0, name);
    } else {
      this.initializationOrder.push(name);
    }

    this.logger.info(`Service ${name} registered`);
  }

  /**
   * Отримує сервіс за ім'ям
   */
  getService<T extends BaseService>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service as T;
  }

  /**
   * Перевіряє чи сервіс зареєстрований
   */
  hasService(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Видаляє сервіс
   */
  async unregisterService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) {
      this.logger.warn(`Service ${name} not found for unregistration`);
      return;
    }

    try {
      await service.destroy();
      this.services.delete(name);
      this.initializationOrder = this.initializationOrder.filter(n => n !== name);
      this.logger.info(`Service ${name} unregistered`);
    } catch (error) {
      this.logger.error(`Failed to unregister service ${name}`, error);
      throw error;
    }
  }

  /**
   * Отримує список всіх сервісів
   */
  getAllServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Отримує порядок ініціалізації сервісів
   */
  getInitializationOrder(): string[] {
    return [...this.initializationOrder];
  }

  /**
   * Встановлює порядок ініціалізації сервісів
   */
  setInitializationOrder(order: string[]): void {
    // Перевіряємо чи всі сервіси існують
    const missingServices = order.filter(name => !this.services.has(name));
    if (missingServices.length > 0) {
      throw new Error(`Services not found: ${missingServices.join(', ')}`);
    }

    this.initializationOrder = [...order];
    this.logger.info('Initialization order updated', order);
  }

  /**
   * Ініціалізує всі сервіси в правильному порядку
   */
  async init(): Promise<void> {
    await super.init();

    this.logger.info('Initializing all services...');

    for (const serviceName of this.initializationOrder) {
      const service = this.services.get(serviceName);
      if (!service) {
        this.logger.warn(`Service ${serviceName} not found during initialization`);
        continue;
      }

      try {
        await service.init();
        this.logger.info(`Service ${serviceName} initialized successfully`);
      } catch (error) {
        this.logger.error(`Failed to initialize service ${serviceName}`, error);
        throw error;
      }
    }

    this.logger.info('All services initialized successfully');
  }

  /**
   * Знищує всі сервіси в зворотному порядку
   */
  async destroy(): Promise<void> {
    this.logger.info('Destroying all services...');

    // Знищуємо сервіси в зворотному порядку
    const reverseOrder = [...this.initializationOrder].reverse();

    for (const serviceName of reverseOrder) {
      const service = this.services.get(serviceName);
      if (!service) {
        continue;
      }

      try {
        await service.destroy();
        this.logger.info(`Service ${serviceName} destroyed successfully`);
      } catch (error) {
        this.logger.error(`Failed to destroy service ${serviceName}`, error);
        // Продовжуємо знищення інших сервісів
      }
    }

    this.services.clear();
    this.initializationOrder = [];

    await super.destroy();
  }

  /**
   * Отримує статус всіх сервісів
   */
  getServicesStatus(): Record<string, { initialized: boolean; destroyed: boolean }> {
    const status: Record<string, { initialized: boolean; destroyed: boolean }> = {};

    this.services.forEach((service, name) => {
      status[name] = {
        initialized: service.isInitialized(),
        destroyed: service.isDestroyed()
      };
    });

    return status;
  }

  /**
   * Перевіряє чи всі сервіси ініціалізовані
   */
  areAllServicesInitialized(): boolean {
    return Array.from(this.services.values()).every(service => service.isInitialized());
  }

  /**
   * Перевіряє чи всі сервіси знищені
   */
  areAllServicesDestroyed(): boolean {
    return Array.from(this.services.values()).every(service => service.isDestroyed());
  }

  /**
   * Отримує статистику додатку
   */
  getStats(): {
    totalServices: number;
    initializedServices: number;
    destroyedServices: number;
    services: string[];
  } {
    const services = Array.from(this.services.values());
    
    return {
      totalServices: services.length,
      initializedServices: services.filter(s => s.isInitialized()).length,
      destroyedServices: services.filter(s => s.isDestroyed()).length,
      services: this.getAllServices()
    };
  }

  /**
   * Виконує операцію на всіх сервісах
   */
  async forEachService(operation: (service: BaseService, name: string) => Promise<void>): Promise<void> {
    const promises = Array.from(this.services.entries()).map(([name, service]) => 
      operation(service, name)
    );

    await Promise.all(promises);
  }

  /**
   * Знаходить сервіси за типом
   */
  findServicesByType<T extends BaseService>(type: new (...args: any[]) => T): T[] {
    const found: T[] = [];

    this.services.forEach(service => {
      if (service instanceof type) {
        found.push(service as T);
      }
    });

    return found;
  }

  /**
   * Отримує сервіс за типом (перший знайдений)
   */
  getServiceByType<T extends BaseService>(type: new (...args: any[]) => T): T | null {
    const services = this.findServicesByType(type);
    return services.length > 0 ? services[0] : null;
  }

  /**
   * Ініціалізація AppManager
   */
  protected onInit(): void {
    this.logger.info('AppManager initialized');
  }

  /**
   * Очищення AppManager
   */
  protected onDestroy(): void {
    this.logger.info('AppManager destroyed');
  }
}

// Експортуємо єдиний екземпляр
export const appManager = new AppManager(); 