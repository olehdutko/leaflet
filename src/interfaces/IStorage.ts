export interface IStorage {
  // Базові методи
  save(key: string, data: any): Promise<void>;
  load<T = any>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  
  // Методи для роботи з об'єктами
  saveObject(key: string, data: any): Promise<void>;
  loadObject<T = any>(key: string): Promise<T | null>;
  
  // Методи для роботи з масивами
  saveArray(key: string, data: any[]): Promise<void>;
  loadArray<T = any>(key: string): Promise<T[]>;
  
  // Методи для роботи з налаштуваннями
  saveSettings(settings: any): Promise<void>;
  loadSettings(): Promise<any>;
  
  // Методи для роботи з версіями
  getVersion(key: string): Promise<string | null>;
  setVersion(key: string, version: string): Promise<void>;
  
  // Методи для очищення застарілих даних
  cleanup(): Promise<void>;
  removeOldVersions(): Promise<void>;
}

export interface IStorageManager {
  // Реєстрація callback'ів для збереження
  registerSaveCallback(id: string, callback: () => void, priority?: boolean): void;
  unregisterSaveCallback(id: string): void;
  
  // Планування збереження
  scheduleSave(priority?: boolean): void;
  forceSave(): Promise<void>;
  
  // Статус збереження
  hasPendingSaves(): boolean;
  getSaveQueue(): string[];
  
  // Налаштування
  setAutoSave(enabled: boolean): void;
  setSaveInterval(interval: number): void;
  
  // Події
  onSaveStarted(callback: () => void): void;
  onSaveCompleted(callback: () => void): void;
  onSaveError(callback: (error: Error) => void): void;
} 