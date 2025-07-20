export let materialIcons: string[] = [];
export const currentEditingObject = { value: null as any };

// Load Material Icons list dynamically
fetch('material-icons-list.json')
  .then(res => res.json())
  .then(list => { materialIcons.splice(0, materialIcons.length, ...list); (window as any).materialIconsReady = true; }); 