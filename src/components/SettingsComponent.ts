import { BaseComponent } from '../base/BaseComponent';
import { Logger } from '../utils/Logger';

export interface SettingsConfig {
  confirmModalId: string;
  confirmModalBackdropId: string;
  confirmModalTitleId: string;
  confirmModalMessageId: string;
  confirmModalFooterId: string;
  layersPanelDrawerId: string;
  layersPanelToggleId: string;
}

export interface ConfirmDialogOptions {
  title?: string;
  message?: string;
  onConfirm?: (action?: string) => void;
  onCancel?: () => void;
  buttons?: ConfirmButton[];
}

export interface ConfirmButton {
  text: string;
  action: string;
  className?: string;
}

export class SettingsComponent extends BaseComponent {
  protected logger: Logger;
  private config: SettingsConfig;

  constructor(config: SettingsConfig) {
    const containerElement = document.getElementById(config.confirmModalId) || document.createElement('div');
    super(containerElement, 'SettingsComponent');
    this.logger = new Logger('SettingsComponent');
    this.config = config;
  }

  protected onInit(): void {
    this.logger.info('Ініціалізація SettingsComponent');
    this.setupEventHandlers();
  }

  protected onDestroy(): void {
    this.logger.info('Знищення SettingsComponent');
    this.clearEventHandlers();
  }

  /**
   * Показати діалог підтвердження
   */
  public showConfirmDialog(options: ConfirmDialogOptions): void {
    try {
      const modal = document.getElementById(this.config.confirmModalId);
      const backdrop = document.getElementById(this.config.confirmModalBackdropId);
      const titleEl = document.getElementById(this.config.confirmModalTitleId);
      const msgEl = document.getElementById(this.config.confirmModalMessageId);
      const footer = modal?.querySelector('.modal-footer');

      if (!modal || !titleEl || !msgEl || !footer) {
        this.logger.error('Не знайдено елементи модального вікна');
        return;
      }

      // Показати модальне вікно
      modal.classList.remove('hidden');
      modal.style.display = 'block';
      if (backdrop) backdrop.classList.remove('hidden');

      // Встановити заголовок та повідомлення
      titleEl.textContent = options.title || 'Підтвердження';
      msgEl.textContent = options.message || '';

      // Очистити футер
      footer.innerHTML = '';

      // Додати кнопки
      if (options.buttons && options.buttons.length > 0) {
        this.createCustomButtons(footer, options);
      } else {
        this.createDefaultButtons(footer, options);
      }

      this.logger.debug('Показано діалог підтвердження:', options);
    } catch (error) {
      this.logger.error('Помилка показу діалогу підтвердження:', error);
    }
  }

  /**
   * Створити кастомні кнопки
   */
  private createCustomButtons(footer: Element, options: ConfirmDialogOptions): void {
    if (!options.buttons) return;

    options.buttons.forEach(btn => {
      const button = document.createElement('button');
      button.textContent = btn.text;
      button.className = btn.className || 'btn-secondary';
      
      button.onclick = () => {
        this.closeConfirmDialog();
        if (btn.action === 'cancel' && options.onCancel) {
          options.onCancel();
        } else if (btn.action !== 'cancel' && options.onConfirm) {
          options.onConfirm(btn.action);
        }
      };
      
      footer.appendChild(button);
    });
  }

  /**
   * Створити стандартні кнопки
   */
  private createDefaultButtons(footer: Element, options: ConfirmDialogOptions): void {
    // Кнопка OK
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.className = 'btn-primary';
    okBtn.onclick = () => {
      this.closeConfirmDialog();
      if (options.onConfirm) {
        options.onConfirm();
      }
    };

    // Кнопка Скасувати
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Скасувати';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.onclick = () => {
      this.closeConfirmDialog();
      if (options.onCancel) {
        options.onCancel();
      }
    };

    footer.appendChild(okBtn);
    footer.appendChild(cancelBtn);
  }

  /**
   * Закрити діалог підтвердження
   */
  public closeConfirmDialog(): void {
    try {
      const modal = document.getElementById(this.config.confirmModalId);
      const backdrop = document.getElementById(this.config.confirmModalBackdropId);

      if (modal) {
        modal.classList.add('hidden');
        modal.style.display = '';
      }
      if (backdrop) {
        backdrop.classList.add('hidden');
      }

      this.logger.debug('Закрито діалог підтвердження');
    } catch (error) {
      this.logger.error('Помилка закриття діалогу підтвердження:', error);
    }
  }

  /**
   * Налаштувати панель шарів
   */
  public setupLayersPanel(): void {
    try {
      const layersPanelDrawer = document.getElementById(this.config.layersPanelDrawerId);
      const layersPanelToggle = document.getElementById(this.config.layersPanelToggleId);

      if (layersPanelDrawer && layersPanelToggle) {
        layersPanelToggle.addEventListener('click', () => {
          this.toggleLayersPanel(layersPanelDrawer, layersPanelToggle);
        });

        this.logger.debug('Налаштовано панель шарів');
      }
    } catch (error) {
      this.logger.error('Помилка налаштування панелі шарів:', error);
    }
  }

  /**
   * Переключити панель шарів
   */
  private toggleLayersPanel(drawer: HTMLElement, toggle: HTMLElement): void {
    try {
      const isClosed = drawer.classList.toggle('closed');
      const icon = toggle.querySelector('.material-icons');
      
      if (icon) {
        icon.textContent = isClosed ? 'chevron_right' : 'chevron_left';
      }

      // Оновити розмір карти після анімації
      setTimeout(() => {
        const map = (window as any).map;
        if (map && map.invalidateSize) {
          map.invalidateSize();
        }
      }, 300);

      this.logger.debug('Переключено панель шарів:', { isClosed });
    } catch (error) {
      this.logger.error('Помилка переключення панелі шарів:', error);
    }
  }

  /**
   * Показати повідомлення користувачу
   */
  public showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    try {
      // Створити елемент повідомлення
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.innerHTML = `
        <div class="notification-content">
          <span class="notification-message">${message}</span>
          <button class="notification-close">&times;</button>
        </div>
      `;

      // Додати стилі
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        padding: 12px 16px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
      `;

      // Встановити колір залежно від типу
      const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
      };
      notification.style.backgroundColor = colors[type];

      // Додати до DOM
      document.body.appendChild(notification);

      // Обробник закриття
      const closeBtn = notification.querySelector('.notification-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.removeNotification(notification);
        });
      }

      // Автоматично закрити через 5 секунд
      setTimeout(() => {
        this.removeNotification(notification);
      }, 5000);

      this.logger.debug('Показано повідомлення:', { message, type });
    } catch (error) {
      this.logger.error('Помилка показу повідомлення:', error);
    }
  }

  /**
   * Видалити повідомлення
   */
  private removeNotification(notification: HTMLElement): void {
    try {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    } catch (error) {
      this.logger.error('Помилка видалення повідомлення:', error);
    }
  }

  /**
   * Показати індикатор завантаження
   */
  public showLoadingIndicator(message: string = 'Завантаження...'): void {
    try {
      // Створити індикатор завантаження
      const loader = document.createElement('div');
      loader.id = 'loading-indicator';
      loader.innerHTML = `
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-message">${message}</div>
        </div>
      `;

      // Додати стилі
      loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      `;

      // Додати до DOM
      document.body.appendChild(loader);

      this.logger.debug('Показано індикатор завантаження:', message);
    } catch (error) {
      this.logger.error('Помилка показу індикатора завантаження:', error);
    }
  }

  /**
   * Приховати індикатор завантаження
   */
  public hideLoadingIndicator(): void {
    try {
      const loader = document.getElementById('loading-indicator');
      if (loader && loader.parentNode) {
        loader.parentNode.removeChild(loader);
      }

      this.logger.debug('Приховано індикатор завантаження');
    } catch (error) {
      this.logger.error('Помилка приховування індикатора завантаження:', error);
    }
  }

  /**
   * Показати помилку
   */
  public showError(message: string, details?: string): void {
    try {
      const fullMessage = details ? `${message}\n\nДеталі: ${details}` : message;
      this.showNotification(fullMessage, 'error');
      this.logger.error('Показано помилку:', { message, details });
    } catch (error) {
      this.logger.error('Помилка показу помилки:', error);
    }
  }

  /**
   * Показати успіх
   */
  public showSuccess(message: string): void {
    try {
      this.showNotification(message, 'success');
      this.logger.debug('Показано успіх:', message);
    } catch (error) {
      this.logger.error('Помилка показу успіху:', error);
    }
  }

  /**
   * Показати попередження
   */
  public showWarning(message: string): void {
    try {
      this.showNotification(message, 'warning');
      this.logger.debug('Показано попередження:', message);
    } catch (error) {
      this.logger.error('Помилка показу попередження:', error);
    }
  }

  /**
   * Показати інформацію
   */
  public showInfo(message: string): void {
    try {
      this.showNotification(message, 'info');
      this.logger.debug('Показано інформацію:', message);
    } catch (error) {
      this.logger.error('Помилка показу інформації:', error);
    }
  }

  /**
   * Налаштувати обробники подій
   */
  private setupEventHandlers(): void {
    // Налаштувати панель шарів
    this.setupLayersPanel();

    // Обробник кліку поза модальним вікном
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const modal = document.getElementById(this.config.confirmModalId);
      
      if (modal && target === modal) {
        this.closeConfirmDialog();
      }
    });

    // Обробник клавіші Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeConfirmDialog();
      }
    });
  }

  /**
   * Очистити обробники подій
   */
  private clearEventHandlers(): void {
    // Очищення обробників подій
  }

  /**
   * Перевірити, чи відкрите модальне вікно
   */
  public isModalOpen(): boolean {
    const modal = document.getElementById(this.config.confirmModalId);
    return modal ? !modal.classList.contains('hidden') : false;
  }

  /**
   * Отримати поточні налаштування
   */
  public getSettings(): any {
    try {
      const settings = localStorage.getItem('app-settings');
      return settings ? JSON.parse(settings) : {};
    } catch (error) {
      this.logger.error('Помилка отримання налаштувань:', error);
      return {};
    }
  }

  /**
   * Зберегти налаштування
   */
  public saveSettings(settings: any): void {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settings));
      this.logger.debug('Збережено налаштування:', settings);
    } catch (error) {
      this.logger.error('Помилка збереження налаштувань:', error);
    }
  }

  /**
   * Скинути налаштування до значень за замовчуванням
   */
  public resetSettings(): void {
    try {
      const defaultSettings = {
        theme: 'light',
        language: 'uk',
        autoSave: true,
        notifications: true
      };
      
      this.saveSettings(defaultSettings);
      this.showSuccess('Налаштування скинуто до значень за замовчуванням');
      
      this.logger.info('Скинуто налаштування до значень за замовчуванням');
    } catch (error) {
      this.logger.error('Помилка скидання налаштувань:', error);
    }
  }
} 