import { LogEntry } from '../types/index.js';
import { LogLevel } from '../enums/index.js';

export class Logger {
  private context: string;
  private logHistory: LogEntry[] = [];
  private maxHistorySize: number = 1000;
  private enabled: boolean = true;
  private minLevel: LogLevel = LogLevel.INFO;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Встановлює мінімальний рівень логування
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Включає/виключає логування
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Логує повідомлення рівня DEBUG
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Логує повідомлення рівня INFO
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Логує повідомлення рівня WARN
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Логує повідомлення рівня ERROR
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Основний метод логування
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.enabled || !this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
      context: this.context
    };

    this.addToHistory(entry);
    this.outputToConsole(entry);
  }

  /**
   * Перевіряє чи потрібно логувати на даному рівні
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minLevelIndex = levels.indexOf(this.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    
    return currentLevelIndex >= minLevelIndex;
  }

  /**
   * Додає запис до історії логів
   */
  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);
    
    // Обмежуємо розмір історії
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  /**
   * Виводить лог в консоль
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.context}]`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`${prefix} ${entry.message}`, entry.data);
        break;
      case LogLevel.INFO:
        console.log(`${prefix} ${entry.message}`, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(`${prefix} ${entry.message}`, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(`${prefix} ${entry.message}`, entry.data);
        break;
    }
  }

  /**
   * Отримує історію логів
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Очищує історію логів
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Фільтрує логи за рівнем
   */
  filterByLevel(level: LogLevel): LogEntry[] {
    return this.logHistory.filter(entry => entry.level === level);
  }

  /**
   * Фільтрує логи за контекстом
   */
  filterByContext(context: string): LogEntry[] {
    return this.logHistory.filter(entry => entry.context === context);
  }

  /**
   * Експортує логи в JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }

  /**
   * Створює дочірній логер з додатковим контекстом
   */
  createChild(childContext: string): Logger {
    const childLogger = new Logger(`${this.context}.${childContext}`);
    childLogger.setMinLevel(this.minLevel);
    childLogger.setEnabled(this.enabled);
    return childLogger;
  }
}

// Глобальний логер для додатку
export const appLogger = new Logger('App'); 