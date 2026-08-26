import { currentEditingObject } from './state';

/**
 * Закрити модальне вікно редагування об'єкта.
 * Видаляє поточне редаговане значення і приховує DOM-елемент.
 */
export function closeEditModal(): void {
  const editModal = document.getElementById('edit-object-modal');
  if (editModal) (editModal as HTMLElement).classList.add('hidden');
  currentEditingObject.value = null;
}
