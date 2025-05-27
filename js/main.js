// js/main.js
// ... (existing imports)
import {
    // ... other UI imports
    openMasterEffectsRackWindow // NEW
} from './ui.js';
import {
    // ... other audio imports
    addMasterEffect, removeMasterEffect, updateMasterEffectParam, reorderMasterEffect // NEW
} from './audio.js';
import { AVAILABLE_EFFECTS } from './effectsRegistry.js'; // NEW

// --- Global Variables & Initialization ---
// ...
window.masterEffectsChain = []; // Already declared in audio.js, ensure consistency or single source of truth

// --- Exposing functions globally ---
// ...
window.openMasterEffectsRackWindow = openMasterEffectsRackWindow; // NEW
window.addMasterEffect = addMasterEffect; // NEW
window.removeMasterEffect = removeMasterEffect; // NEW
window.updateMasterEffectParam = updateMasterEffectParam; // NEW
window.reorderMasterEffect = reorderMasterEffect; // NEW
window.AVAILABLE_EFFECTS = AVAILABLE_EFFECTS; // Make available for dynamic UI if needed

// In initializePrimaryEventListeners(appContext):
// Add a menu item for the Master Effects Rack
// document.getElementById('menuOpenMasterEffects')?.addEventListener('click', () => { 
//     if(typeof openMasterEffectsRackWindow === 'function') openMasterEffectsRackWindow(); 
//     startMenu?.classList.add('hidden'); 
// });

// ... (rest of main.js)
