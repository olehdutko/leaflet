import { BaseComponent } from '../base/BaseComponent.js';
import { DOMUtils } from '../utils/DOMUtils.js';
import { ModalOptions, ModalButton } from '../types/index.js';
import { ModalAction } from '../enums/index.js';

export class ModalComponent extends BaseComponent {
  private modalElement: HTMLElement | null = null;
  private backdropElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private onConfirm?: (action?: string) => void;
  private onCancel?: () => void;

  constructor(element: HTMLElement) {
    super(element, 'ModalComponent');
  }

  /**
   * Показує модальне вікно
   */
  showModal(options: ModalOptions): void {
    this.safeExecute(() => {
      this.onConfirm = options.onConfirm;
      this.onCancel = options.onCancel;
      
      this.createModal(options);
      this.displayModal();
    }, 'showModal');
  }

  /**
   * Приховує модальне вікно
   */
  hide(): void {
    this.safeExecute(() => {
      this.hideModal();
    }, 'hideModal');
  }

  /**
   * Перевіряє чи модальне вікно відкрите
   */
  isModalOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Створює модальне вікно
   */
  private createModal(options: ModalOptions): void {
    // Створюємо backdrop
    this.backdropElement = DOMUtils.createElement<HTMLElement>('div', 'modal-backdrop');
    
    // Створюємо модальне вікно
    this.modalElement = DOMUtils.createElement<HTMLElement>('div', 'modal');
    
    // Заголовок
    if (options.title) {
      const titleElement = DOMUtils.createElement<HTMLElement>('h2', 'modal-title');
      DOMUtils.setText(titleElement, options.title);
      this.modalElement.appendChild(titleElement);
    }
    
    // Повідомлення
    if (options.message) {
      const messageElement = DOMUtils.createElement<HTMLElement>('p', 'modal-message');
      DOMUtils.setText(messageElement, options.message);
      this.modalElement.appendChild(messageElement);
    }
    
    // Кнопки
    if (options.buttons && options.buttons.length > 0) {
      const buttonsContainer = DOMUtils.createElement<HTMLElement>('div', 'modal-buttons');
      
      options.buttons.forEach(button => {
        const buttonElement = this.createButton(button);
        buttonsContainer.appendChild(buttonElement);
      });
      
      this.modalElement.appendChild(buttonsContainer);
    } else {
      // Кнопки за замовчуванням
      const buttonsContainer = DOMUtils.createElement<HTMLElement>('div', 'modal-buttons');
      
      const confirmButton = this.createButton({
        text: 'OK',
        action: ModalAction.CONFIRM,
        className: 'btn-primary'
      });
      
      const cancelButton = this.createButton({
        text: 'Скасувати',
        action: ModalAction.CANCEL,
        className: 'btn-secondary'
      });
      
      buttonsContainer.appendChild(confirmButton);
      buttonsContainer.appendChild(cancelButton);
      this.modalElement.appendChild(buttonsContainer);
    }
    
    // Додаємо до DOM
    document.body.appendChild(this.backdropElement);
    document.body.appendChild(this.modalElement);
  }

  /**
   * Створює кнопку
   */
  private createButton(button: ModalButton): HTMLElement {
    const buttonElement = DOMUtils.createElement<HTMLButtonElement>('button', `btn ${button.className || ''}`);
    DOMUtils.setText(buttonElement, button.text);
    
    DOMUtils.addEventListeners(buttonElement, {
      click: () => this.handleButtonClick(button.action)
    });
    
    return buttonElement;
  }

  /**
   * Обробляє клік по кнопці
   */
  private handleButtonClick(action: string): void {
    if (action === ModalAction.CONFIRM || action === ModalAction.SAVE) {
      if (this.onConfirm) {
        this.onConfirm(action);
      }
    } else if (action === ModalAction.CANCEL || action === ModalAction.CLOSE) {
      if (this.onCancel) {
        this.onCancel();
      }
    }
    
    this.hide();
  }

  /**
   * Показує модальне вікно
   */
  private displayModal(): void {
    if (this.backdropElement && this.modalElement) {
      DOMUtils.addClass(this.backdropElement, 'show');
      DOMUtils.addClass(this.modalElement, 'show');
      this.isOpen = true;
    }
  }

  /**
   * Приховує модальне вікно
   */
  private hideModal(): void {
    if (this.backdropElement && this.modalElement) {
      DOMUtils.removeClass(this.backdropElement, 'show');
      DOMUtils.removeClass(this.modalElement, 'show');
      this.isOpen = false;
      
      // Видаляємо елементи після анімації
      setTimeout(() => {
        if (this.backdropElement && this.backdropElement.parentNode) {
          this.backdropElement.parentNode.removeChild(this.backdropElement);
        }
        if (this.modalElement && this.modalElement.parentNode) {
          this.modalElement.parentNode.removeChild(this.modalElement);
        }
        this.backdropElement = null;
        this.modalElement = null;
      }, 300);
    }
  }

  protected bindEvents(): void {
    // Обробка кліку по backdrop для закриття
    this.addEventListener('click', (e) => {
      if (e.target === this.backdropElement) {
        this.hide();
      }
    });
    
    // Обробка клавіші Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.hide();
      }
    });
  }

  protected onInit(): void {
    this.logger.info('ModalComponent initialized');
  }

  protected onDestroy(): void {
    if (this.isOpen) {
      this.hide();
    }
    this.logger.info('ModalComponent destroyed');
  }
} 