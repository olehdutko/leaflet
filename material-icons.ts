// Управління Material Icons

export let materialIcons: string[] = [];

// Завантаження списку Material Icons
export function loadMaterialIcons(): Promise<void> {
  return fetch('material-icons-list.json')
    .then(res => res.json())
    .then(list => { 
      materialIcons.splice(0, materialIcons.length, ...list); 
      (window as any).materialIconsReady = true; 
    })
    .catch(error => {
      console.error('Failed to load material icons:', error);
      materialIcons = ['place', 'location_on', 'my_location', 'home', 'business']; // fallback
    });
}

// Фільтрація іконок за пошуковим запитом
export function filterMaterialIcons(query: string): string[] {
  const val = query.trim().toLowerCase();
  return materialIcons.filter(name => name.includes(val)).slice(0, 10);
}

// Отримання іконки за індексом
export function getMaterialIcon(index: number): string {
  return materialIcons[index] || 'place';
}

// Перевірка чи іконки завантажені
export function isMaterialIconsReady(): boolean {
  return materialIcons.length > 0;
} 