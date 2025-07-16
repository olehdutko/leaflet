import { materialIcons, currentEditingObject } from './state.js';
declare const L: any;

export function showEditModal(layer: any) {
  // TODO: перенести повну реалізацію з main.ts (поки що заглушка)
  // ...
}

export function addDoubleClickToLayer(layer: any) {
  // TODO: перенести повну реалізацію з main.ts (поки що заглушка)
  // ...
}

export function createLayerControl(layerObj: any) {
  // TODO: перенести повну реалізацію з main.ts (поки що заглушка)
  // ...
}

export const layerControlsDiv = document.getElementById('layer-controls');
export const addLayerBtn = document.getElementById('add-layer');
export const exportAllBtn = document.getElementById('export-all');
export const importAllBtn = document.getElementById('import-all');
export const importAllInput = document.getElementById('import-all-input');
export let isDraggingObject = false;
