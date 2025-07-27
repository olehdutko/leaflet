import { BaseService } from '../base/BaseService.js';
import { IStorage } from '../interfaces/IStorage.js';
import { StorageKey } from '../enums/index.js';

export class StorageService extends BaseService implements IStorage {
  private prefix: string = 'lefleat_';
  private version: string = '1.0.0';

  constructor() {
    super('StorageService');
  }

  /**
   * Зберігає дані в localStorage
   */
  async save(key: string, data: any): Promise<void> {
    return this.safeExecute(async () => {
      const fullKey = this.getFullKey(key);
      const storageData = {
        data,
        version: this.version,
        timestamp: Date.now()
      };
      
      localStorage.setItem(fullKey, JSON.stringify(storageData));
      this.logger.debug(`Data saved: ${fullKey}`, data);
    }, 'save');
  }

  /**
   * Завантажує дані з localStorage
   */
  async load<T = any>(key: string): Promise<T | null> {
    return this.safeExecute(async () => {
      const fullKey = this.getFullKey(key);
      const stored = localStorage.getItem(fullKey);
      
      if (!stored) {
        this.logger.debug(`No data found: ${fullKey}`);
        return null;
      }

      try {
        const parsed = JSON.parse(stored);
        
        // Перевіряємо версію
        if (parsed.version !== this.version) {
          this.logger.warn(`Version mismatch for ${fullKey}: expected ${this.version}, got ${parsed.version}`);
        }
        
        this.logger.debug(`Data loaded: ${fullKey}`, parsed.data);
        return parsed.data as T;
      } catch (error) {
        this.logger.error(`Failed to parse stored data: ${fullKey}`, error);
        return null;
      }
    }, 'load');
  }

  /**
   * Видаляє дані з localStorage
   */
  async remove(key: string): Promise<void> {
    return this.safeExecute(async () => {
      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
      this.logger.debug(`Data removed: ${fullKey}`);
    }, 'remove');
  }

  /**
   * Очищує всі дані додатку
   */
  async clear(): Promise<void> {
    return this.safeExecute(async () => {
      const keys = Object.keys(localStorage);
      const appKeys = keys.filter(key => key.startsWith(this.prefix));
      
      appKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      this.logger.info(`Cleared ${appKeys.length} storage items`);
    }, 'clear');
  }

  /**
   * Перевіряє чи існує ключ
   */
  async has(key: string): Promise<boolean> {
    return this.safeExecute(async () => {
      const fullKey = this.getFullKey(key);
      const exists = localStorage.getItem(fullKey) !== null;
      this.logger.debug(`Key exists check: ${fullKey} = ${exists}`);
      return exists;
    }, 'has');
  }

  /**
   * Зберігає об'єкт
   */
  async saveObject(key: string, data: any): Promise<void> {
    return this.save(key, data);
  }

  /**
   * Завантажує об'єкт
   */
  async loadObject<T = any>(key: string): Promise<T | null> {
    return this.load<T>(key);
  }

  /**
   * Зберігає масив
   */
  async saveArray(key: string, data: any[]): Promise<void> {
    return this.save(key, data);
  }

  /**
   * Завантажує масив
   */
  async loadArray<T = any>(key: string): Promise<T[]> {
    const data = await this.load<T[]>(key);
    return data || [];
  }

  /**
   * Зберігає налаштування
   */
  async saveSettings(settings: any): Promise<void> {
    return this.save(StorageKey.SETTINGS, settings);
  }

  /**
   * Завантажує налаштування
   */
  async loadSettings(): Promise<any> {
    const settings = await this.load(StorageKey.SETTINGS);
    return settings || this.getDefaultSettings();
  }

  /**
   * Отримує версію даних
   */
  async getVersion(key: string): Promise<string | null> {
    return this.safeExecute(async () => {
      const fullKey = this.getFullKey(key);
      const stored = localStorage.getItem(fullKey);
      
      if (!stored) {
        return null;
      }

      try {
        const parsed = JSON.parse(stored);
        return parsed.version || null;
      } catch {
        return null;
      }
    }, 'getVersion');
  }

  /**
   * Встановлює версію даних для конкретного ключа
   */
  async setVersion(key: string, version: string): Promise<void> {
    return this.safeExecute(async () => {
      const fullKey = this.getFullKey(key);
      const stored = localStorage.getItem(fullKey);
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.version = version;
          localStorage.setItem(fullKey, JSON.stringify(parsed));
        } catch (error) {
          this.logger.error(`Failed to update version for ${fullKey}`, error);
        }
      }
    }, 'setVersionForKey');
  }

  /**
   * Очищує застарілі дані
   */
  async cleanup(): Promise<void> {
    return this.safeExecute(async () => {
      const keys = Object.keys(localStorage);
      const appKeys = keys.filter(key => key.startsWith(this.prefix));
      let cleanedCount = 0;

      for (const key of appKeys) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            
            // Видаляємо дані старіше 30 днів
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            if (parsed.timestamp && parsed.timestamp < thirtyDaysAgo) {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          // Видаляємо пошкоджені дані
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }

      this.logger.info(`Cleanup completed: removed ${cleanedCount} old items`);
    }, 'cleanup');
  }

  /**
   * Видаляє старі версії даних
   */
  async removeOldVersions(): Promise<void> {
    return this.safeExecute(async () => {
      const keys = Object.keys(localStorage);
      const appKeys = keys.filter(key => key.startsWith(this.prefix));
      let removedCount = 0;

      for (const key of appKeys) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            
            if (parsed.version && parsed.version !== this.version) {
              localStorage.removeItem(key);
              removedCount++;
            }
          }
        } catch (error) {
          // Видаляємо пошкоджені дані
          localStorage.removeItem(key);
          removedCount++;
        }
      }

      this.logger.info(`Old versions cleanup: removed ${removedCount} items`);
    }, 'removeOldVersions');
  }

  /**
   * Отримує повний ключ з префіксом
   */
  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Отримує налаштування за замовчуванням
   */
  private getDefaultSettings(): any {
    return {
      theme: 'light',
      language: 'uk',
      autoSave: true,
      saveInterval: 1000
    };
  }

  /**
   * Встановлює префікс для ключів
   */
  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  /**
   * Встановлює версію даних для сервісу
   */
  setServiceVersion(version: string): void {
    this.version = version;
  }

  /**
   * Отримує статистику збереження
   */
  getStats(): { totalKeys: number; totalSize: number } {
    const keys = Object.keys(localStorage);
    const appKeys = keys.filter(key => key.startsWith(this.prefix));
    
    let totalSize = 0;
    appKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    });

    return {
      totalKeys: appKeys.length,
      totalSize
    };
  }

  protected onInit(): void {
    this.logger.info('StorageService initialized');
    
    // Автоматичне очищення при ініціалізації
    this.cleanup().catch(error => {
      this.logger.error('Failed to cleanup storage during initialization', error);
    });
  }

  protected onDestroy(): void {
    this.logger.info('StorageService destroyed');
  }
} 