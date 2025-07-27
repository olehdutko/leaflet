import { BaseService } from '../base/BaseService';
import { Logger } from '../utils/Logger';

export interface ModalConfig {
  title: string;
  content: string | HTMLElement;
  buttons?: Array<{
    text: string;
    action: string;
    className?: string;
  }>;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
}

export interface EditModalData {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  position: {
    lat: number;
    lng: number;
  };
}

export class ModalManager extends BaseService {
  protected logger: Logger;
  private currentModal: HTMLElement | null = null;
  private modalOverlay: HTMLElement | null = null;
  private isEditModalInitialized: boolean = false;

  constructor() {
    super('ModalManager');
    this.logger = new Logger('ModalManager');
  }

  /**
   * Ініціалізація сервісу
   */
  protected onInit(): void {
    this.logger.info('ModalManager ініціалізований');
  }

  /**
   * Знищення сервісу
   */
  protected onDestroy(): void {
    this.logger.info('ModalManager знищений');
    this.closeCurrentModal();
  }

  /**
   * Показ діалогу підтвердження
   */
  public showConfirmDialog(config: ModalConfig): void {
    try {
      this.logger.debug('Показ діалогу підтвердження:', config.title);

      const modal = this.createModal(config);
      this.showModal(modal);

    } catch (error) {
      this.logger.error('Помилка показу діалогу підтвердження:', error);
    }
  }

  /**
   * Показ модального вікна
   */
  public showModal(modal: HTMLElement): void {
    try {
      // Закрити попереднє модальне вікно
      this.closeCurrentModal();

      // Створити overlay
      this.createModalOverlay();

      // Додати модальне вікно
      if (this.modalOverlay) {
        this.modalOverlay.appendChild(modal);
        this.currentModal = modal;
        
        // Показати з анімацією
        setTimeout(() => {
          modal.classList.add('modal-show');
        }, 10);
      }

    } catch (error) {
      this.logger.error('Помилка показу модального вікна:', error);
    }
  }

  /**
   * Закриття поточного модального вікна
   */
  public closeCurrentModal(): void {
    try {
      if (this.currentModal) {
        this.currentModal.classList.remove('modal-show');
        
        setTimeout(() => {
          if (this.currentModal && this.currentModal.parentNode) {
            this.currentModal.parentNode.removeChild(this.currentModal);
          }
          this.currentModal = null;
        }, 300);
      }

      if (this.modalOverlay) {
        this.modalOverlay.classList.remove('modal-overlay-show');
        
        setTimeout(() => {
          if (this.modalOverlay && this.modalOverlay.parentNode) {
            this.modalOverlay.parentNode.removeChild(this.modalOverlay);
          }
          this.modalOverlay = null;
        }, 300);
      }

    } catch (error) {
      this.logger.error('Помилка закриття модального вікна:', error);
    }
  }

  /**
   * Створення модального вікна
   */
  private createModal(config: ModalConfig): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${config.title}</h3>
        <button class="modal-close" type="button">&times;</button>
      </div>
      <div class="modal-body">
        ${typeof config.content === 'string' ? config.content : ''}
      </div>
      ${config.buttons ? `
        <div class="modal-footer">
          ${config.buttons.map(button => `
            <button class="btn ${button.className || 'btn-secondary'}" data-action="${button.action}">
              ${button.text}
            </button>
          `).join('')}
        </div>
      ` : ''}
    `;

    // Додати контент як HTMLElement
    if (config.content instanceof HTMLElement) {
      const body = modal.querySelector('.modal-body');
      if (body) {
        body.innerHTML = '';
        body.appendChild(config.content);
      }
    }

    // Додати обробники подій
    this.addModalEventHandlers(modal, config);

    return modal;
  }

  /**
   * Додавання обробників подій для модального вікна
   */
  private addModalEventHandlers(modal: HTMLElement, config: ModalConfig): void {
    // Кнопка закриття
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeCurrentModal();
        if (config.onClose) config.onClose();
      });
    }

    // Кнопки дій
    const actionButtons = modal.querySelectorAll('[data-action]');
    actionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).getAttribute('data-action');
        
        switch (action) {
          case 'confirm':
            if (config.onConfirm) config.onConfirm();
            break;
          case 'cancel':
            if (config.onCancel) config.onCancel();
            break;
          case 'delete':
            if (config.onConfirm) config.onConfirm();
            break;
        }
        
        this.closeCurrentModal();
      });
    });

    // Закриття при кліку поза модальним вікном
    if (config.closeOnOutsideClick !== false) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeCurrentModal();
          if (config.onClose) config.onClose();
        }
      });
    }

    // Закриття при натисканні Escape
    if (config.closeOnEscape !== false) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', handleEscape);
          this.closeCurrentModal();
          if (config.onClose) config.onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
    }
  }

  /**
   * Створення overlay для модального вікна
   */
  private createModalOverlay(): void {
    this.modalOverlay = document.createElement('div');
    this.modalOverlay.className = 'modal-overlay';
    document.body.appendChild(this.modalOverlay);
    
    // Показати з анімацією
    setTimeout(() => {
      if (this.modalOverlay) {
        this.modalOverlay.classList.add('modal-overlay-show');
      }
    }, 10);
  }

  /**
   * Ініціалізація модального вікна редагування
   */
  public initEditModal(): void {
    if (this.isEditModalInitialized) {
      this.logger.warn('Модальне вікно редагування вже ініціалізоване');
      return;
    }

    try {
      this.setupEditModalHandlers();
      this.isEditModalInitialized = true;
      this.logger.info('Модальне вікно редагування ініціалізоване');

    } catch (error) {
      this.logger.error('Помилка ініціалізації модального вікна редагування:', error);
    }
  }

  /**
   * Налаштування обробників модального вікна редагування
   */
  private setupEditModalHandlers(): void {
    // Обробник збереження змін
    const saveBtn = document.getElementById('save-object-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveObjectChanges();
      });
    }

    // Обробник закриття
    const closeBtn = document.getElementById('close-edit-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeEditModal();
      });
    }

    // Обробник клавіші Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeEditModal();
      }
    });
  }

  /**
   * Закриття модального вікна редагування
   */
  public closeEditModal(): void {
    try {
      const modal = document.getElementById('edit-modal');
      if (modal) {
        modal.style.display = 'none';
        this.clearEditForm();
      }
    } catch (error) {
      this.logger.error('Помилка закриття модального вікна редагування:', error);
    }
  }

  /**
   * Збереження змін об'єкта
   */
  private saveObjectChanges(): void {
    try {
      const form = document.getElementById('edit-object-form') as HTMLFormElement;
      if (!form) {
        this.logger.error('Форма редагування не знайдена');
        return;
      }

      const formData = new FormData(form);
      const objectData: EditModalData = {
        id: formData.get('id') as string,
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        icon: formData.get('icon') as string,
        color: formData.get('color') as string,
        position: {
          lat: parseFloat(formData.get('lat') as string),
          lng: parseFloat(formData.get('lng') as string)
        }
      };

      // Викликати зовнішню функцію збереження
      if ((window as any).saveObjectChanges) {
        (window as any).saveObjectChanges(objectData);
      }

      this.closeEditModal();
      this.logger.info('Зміни об\'єкта збережено:', objectData);

    } catch (error) {
      this.logger.error('Помилка збереження змін об\'єкта:', error);
    }
  }

  /**
   * Очищення форми редагування
   */
  private clearEditForm(): void {
    try {
      const form = document.getElementById('edit-object-form') as HTMLFormElement;
      if (form) {
        form.reset();
      }
    } catch (error) {
      this.logger.error('Помилка очищення форми редагування:', error);
    }
  }

  /**
   * Показ модального вікна редагування
   */
  public showEditModal(objectData: EditModalData): void {
    try {
      const modal = document.getElementById('edit-modal');
      if (!modal) {
        this.logger.error('Модальне вікно редагування не знайдено');
        return;
      }

      // Заповнити форму даними
      this.fillEditForm(objectData);

      // Показати модальне вікно
      modal.style.display = 'block';

    } catch (error) {
      this.logger.error('Помилка показу модального вікна редагування:', error);
    }
  }

  /**
   * Заповнення форми редагування даними
   */
  private fillEditForm(objectData: EditModalData): void {
    try {
      const form = document.getElementById('edit-object-form') as HTMLFormElement;
      if (!form) return;

      // Заповнити поля форми
      const fields = ['id', 'name', 'description', 'icon', 'color', 'lat', 'lng'];
      fields.forEach(field => {
        const input = form.querySelector(`[name="${field}"]`) as HTMLInputElement;
        if (input) {
          if (field === 'lat' || field === 'lng') {
            input.value = objectData.position[field as 'lat' | 'lng'].toString();
          } else {
            input.value = objectData[field as keyof EditModalData] as string;
          }
        }
      });

    } catch (error) {
      this.logger.error('Помилка заповнення форми редагування:', error);
    }
  }

  /**
   * Перевірка чи відкрите модальне вікно
   */
  public isModalOpen(): boolean {
    return this.currentModal !== null || this.modalOverlay !== null;
  }

  /**
   * Отримання поточного модального вікна
   */
  public getCurrentModal(): HTMLElement | null {
    return this.currentModal;
  }
} 