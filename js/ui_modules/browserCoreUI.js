// js/ui_modules/browserCoreUI.js
import { SnugWindow } from '../SnugWindow.js';
import { showNotification, createDropZoneHTML, setupGenericDropZoneListeners, showCustomModal, createContextMenu, showConfirmationDialog } from '../utils.js'; // Assuming showNotification is correctly used or via appServices
import * as Constants from '../constants.js';

import { initializeInspectorEffectsUI } from './inspectorEffectsUI.js';
import { initializeArrangementMixingUI } from './arrangementMixingUI.js';

let localAppServices = {};
let selectedSoundForPreviewData = null;

export function initializeUIModule(appServicesFromMain) {
    localAppServices = { ...localAppServices, ...appServicesFromMain };
    initializeInspectorEffectsUI(appServicesFromMain);
    initializeArrangementMixingUI(appServicesFromMain);
    if (!localAppServices.getSelectedSoundForPreview) {
        localAppServices.getSelectedSoundForPreview = () => selectedSoundForPreviewData;
    }
    if (!localAppServices.setSelectedSoundForPreview) {
        localAppServices.setSelectedSoundForPreview = (data) => { selectedSoundForPreviewData = data; };
    }
     if (!localAppServices.effectsRegistryAccess) {
        localAppServices.effectsRegistryAccess = { AVAILABLE_EFFECTS: {} };
    }
    // console.log('[BrowserCoreUI] UI Module initialized.');
}

// --- Sound Browser UI ---
// ... (openSoundBrowserWindow, updateSoundBrowserDisplayForLibrary, renderSoundBrowserDirectory remain the same as response #21)
export function openSoundBrowserWindow(savedState = null) { /* ... */ }
export function updateSoundBrowserDisplayForLibrary(libraryName, isLoading = false, hasError = false) { /* ... */ }
export function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... */ }


// --- Add Effect Modal ---
export function showAddEffectModal(owner, ownerType) {
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    console.log(`[BrowserCoreUI showAddEffectModal] Called for: ${ownerName} (Type: ${ownerType})`); // LOG ADDED

    let modalContentHTML = `<div class="max-h-72 overflow-y-auto rounded-md bg-gray-700 dark:bg-slate-700/80 shadow-inner"><ul class="list-none p-0 m-0">`;
    const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};

    if (Object.keys(AVAILABLE_EFFECTS_LOCAL).length === 0) {
        console.warn("[BrowserCoreUI showAddEffectModal] No effects available in registry!");
        modalContentHTML += `<li class="p-2 text-sm text-slate-300 dark:text-slate-400 italic">No effects available to add.</li>`;
    }

    const sortedEffectKeys = Object.keys(AVAILABLE_EFFECTS_LOCAL).sort((a, b) => {
        const nameA = AVAILABLE_EFFECTS_LOCAL[a]?.displayName?.toLowerCase() || a.toLowerCase();
        const nameB = AVAILABLE_EFFECTS_LOCAL[b]?.displayName?.toLowerCase() || b.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    for (const effectKey of sortedEffectKeys) {
        const displayName = AVAILABLE_EFFECTS_LOCAL[effectKey]?.displayName || effectKey;
        modalContentHTML += `<li class="p-2 hover:bg-blue-600 dark:hover:bg-blue-500 cursor-pointer border-b border-gray-600 dark:border-slate-600 text-sm text-slate-100 dark:text-slate-200 last:border-b-0" data-effect-type="${effectKey}">${displayName}</li>`;
    }
    modalContentHTML += `</ul></div>`;

    const modal = showCustomModal(`Add Effect to ${ownerName}`, modalContentHTML, [], 'add-effect-modal');

    if (modal?.contentDiv) {
        modal.contentDiv.querySelectorAll('li[data-effect-type]').forEach(item => {
            item.addEventListener('click', () => {
                const effectType = item.dataset.effectType;
                console.log(`[BrowserCoreUI showAddEffectModal] Effect selected: ${effectType} for ${ownerName}`); // LOG ADDED

                if (ownerType === 'track' && owner && typeof owner.addEffect === 'function') {
                    console.log(`[BrowserCoreUI showAddEffectModal] Calling owner.addEffect ('${effectType}')`); // LOG ADDED
                    owner.addEffect(effectType);
                } else if (ownerType === 'master' && localAppServices.addMasterEffect && typeof localAppServices.addMasterEffect === 'function') {
                    console.log(`[BrowserCoreUI showAddEffectModal] Calling appServices.addMasterEffect ('${effectType}')`); // LOG ADDED
                    localAppServices.addMasterEffect(effectType);
                } else {
                    console.warn("[BrowserCoreUI showAddEffectModal] Could not add effect. Owner/method missing. Owner:", owner, "ownerType:", ownerType, "addMasterEffect exists:", !!localAppServices.addMasterEffect);
                    const utilShowNotification = localAppServices.showNotification || showNotification;
                    utilShowNotification("Error: Could not add effect (internal error).", 3000);
                }
                if (modal.overlay && typeof modal.overlay.remove === 'function') modal.overlay.remove();
            });
        });
    } else {
        console.error("[BrowserCoreUI showAddEffectModal] Modal contentDiv not found after creating modal.");
    }
}
