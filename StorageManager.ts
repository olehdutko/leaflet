// StorageManager.ts - Централізоване управління збереженням
import { stateManager } from './state.js';

export class StorageManager {
  private static instance: StorageManager;
  private saveTimeout: number | null = null;
  private saveCallbacks: (() => void)[] = [];
  
  private constructor() {}
  
  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }
  
  // Реєстрація callback для збереження
  registerSaveCallback(callback: () => void): void {
    this.saveCallbacks.push(callback);
  }
  
  // Планування збереження з дебаунсом
  scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.performSave();
    }, 100);
  }
  
  // Виконання збереження
  private performSave(): void {
    this.saveCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in save callback:', error);
      }
    });
    this.saveTimeout = null;
  }
  
  // Примусове збереження
  forceSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.performSave();
  }
  
  // Збереження в localStorage
  saveToLocalStorage(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
  
  // Завантаження з localStorage
  loadFromLocalStorage(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return null;
    }
  }
  
  // Очищення localStorage
  clearLocalStorage(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
}

export const storageManager = StorageManager.getInstance(); 