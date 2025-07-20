export let materialIcons = [];
export const currentEditingObject = { value: null };
// Load Material Icons list dynamically
fetch('material-icons-list.json')
    .then(res => res.json())
    .then(list => { materialIcons.splice(0, materialIcons.length, ...list); window.materialIconsReady = true; });
