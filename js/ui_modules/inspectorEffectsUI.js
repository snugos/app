// js/ui_modules/inspectorEffectsUI.js
import { SnugWindow } from '../SnugWindow.js';
import { showNotification, createDropZoneHTML, setupGenericDropZoneListeners, showCustomModal, createContextMenu, showConfirmationDialog } from '../utils.js';
import * as Constants from '../constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from '../eventHandlers.js';

let localAppServices = {};

export function initializeInspectorEffectsUI(appServicesFromMain) {
    localAppServices = appServicesFromMain;
    if (!localAppServices.effectsRegistryAccess) {
        console.warn("[InspectorEffectsUI Module] effectsRegistryAccess not found in appServices. Effect-related UI might be limited.");
        localAppServices.effectsRegistryAccess = {
            AVAILABLE_EFFECTS: {},
            getEffectParamDefinitions: () => [],
            getEffectDefaultParams: () => ({}),
            synthEngineControlDefinitions: {}
        };
    }
     if (!localAppServices.effectsRegistryAccess.synthEngineControlDefinitions) {
        localAppServices.effectsRegistryAccess.synthEngineControlDefinitions = {};
    }
}

// --- Knob UI ---
export function createKnob(options) { /* ... same as response #30 ... */ }

// --- Specific Inspector DOM Builders ---
function buildSynthSpecificInspectorDOM(track) { /* ... same as response #30 ... */ }
function buildSamplerSpecificInspectorDOM(track) { /* ... same as response #30 ... */ }
function buildDrumSamplerSpecificInspectorDOM(track) { /* ... same as response #30 ... */ }
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... same as response #30 ... */ }

// --- Specific Inspector Control Initializers ---
function initializeSynthSpecificControls(track, winEl) { /* ... same as response #30 ... */ }
function setupSamplerInteractDropzone(dropZoneElement, trackId, targetType, padIndex = null) { /* ... same as response #30 ... */ }
function initializeSamplerSpecificControls(track, winEl) { /* ... same as response #30 ... */ }
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... same as response #30 ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... same as response #30 ... */ }

// --- Track Inspector Window (Entry Point) ---
function buildTrackInspectorContentDOM(track) { /* ... same as response #30 ... */ }
export function openTrackInspectorWindow(trackId, savedState = null) { /* ... same as response #30 ... */ }
function initializeCommonInspectorControls(track, winEl) { /* ... same as response #30 ... */ }
function initializeTypeSpecificInspectorControls(track, winEl) { /* ... same as response #30 ... */ }


// --- Modular Effects Rack UI ---
export function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    // ... (same as response #30)
    const ownerId = (ownerType === 'track' && owner) ? owner.id : 'master';
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    return `<div id="effectsRackContent-${ownerId}" class="p-3 space-y-3 overflow-y-auto h-full bg-gray-800 text-slate-200 dark:bg-slate-800 dark:text-slate-200">
        <h3 class="text-base font-semibold text-slate-100 dark:text-slate-100">Effects Rack: ${ownerName}</h3>
        <div id="effectsList-${ownerId}" class="space-y-1 min-h-[60px] border border-gray-700 dark:border-slate-600 rounded p-2 bg-gray-700 dark:bg-slate-700/50"></div>
        <button id="addEffectBtn-${ownerId}" class="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-150 w-full">Add Effect</button>
        <div id="effectControlsContainer-${ownerId}" class="mt-3 space-y-3"></div>
    </div>`;
}

export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    console.log(`[InspectorEffectsUI renderEffectsList] Called for: ${ownerName} (Owner ID: ${owner?.id || 'master'}, Type: ${ownerType}). ListDiv: ${listDiv ? 'found' : 'MISSING'}, ControlsContainer: ${controlsContainer ? 'found' : 'MISSING'}`);

    if (!listDiv) {
        console.error(`[InspectorEffectsUI renderEffectsList] listDiv is null for ${ownerName}. Cannot render effects list.`);
        return;
    }
    listDiv.innerHTML = ''; // Clear previous list

    const effectsArray = (ownerType === 'track' && owner && Array.isArray(owner.activeEffects))
        ? owner.activeEffects
        : ((ownerType === 'master' && localAppServices.getMasterEffects && typeof localAppServices.getMasterEffects === 'function')
            ? localAppServices.getMasterEffects()
            : []);

    console.log(`[InspectorEffectsUI renderEffectsList] Effects array for ${ownerName} (length ${effectsArray.length}):`, effectsArray.map(e => ({id: e.id, type: e.type})));


    if (!effectsArray || effectsArray.length === 0) {
        listDiv.innerHTML = '<p class="text-xs text-gray-400 dark:text-slate-400 italic">No effects added.</p>';
        if (controlsContainer) controlsContainer.innerHTML = ''; // Clear controls if no effects
        console.log(`[InspectorEffectsUI renderEffectsList] No effects to render for ${ownerName}.`);
        return;
    }

    const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};

    effectsArray.forEach((effect, index) => {
        if (!effect || !effect.type || !effect.id) {
            console.warn(`[InspectorEffectsUI renderEffectsList] Invalid effect object in array for ${ownerName} at index ${index}:`, effect);
            return; // Skip this invalid effect object
        }
        const effectDef = AVAILABLE_EFFECTS_LOCAL[effect.type];
        const displayName = effectDef ? effectDef.displayName : effect.type;
        // console.log(`[InspectorEffectsUI renderEffectsList] Rendering effect item: ${displayName} (ID: ${effect.id}) for ${ownerName}`);

        const item = document.createElement('div');
        item.className = 'effect-item flex justify-between items-center p-2 border-b border-gray-700 dark:border-slate-600 bg-gray-750 dark:bg-slate-700 rounded-sm shadow-sm text-xs';
        item.innerHTML = `<span class="effect-name flex-grow cursor-pointer hover:text-blue-400 dark:hover:text-blue-300 text-slate-200 dark:text-slate-200" title="Edit ${displayName}">${displayName}</span>
            <div class="effect-actions space-x-1">
                <button class="up-btn text-xs px-1 py-0.5 rounded ${index === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 dark:hover:bg-slate-500'} text-slate-400 dark:text-slate-400" ${index === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                <button class="down-btn text-xs px-1 py-0.5 rounded ${index === effectsArray.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 dark:hover:bg-slate-500'} text-slate-400 dark:text-slate-400" ${index === effectsArray.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                <button class="remove-btn text-xs px-1.5 py-0.5 rounded text-red-400 hover:text-red-300 hover:bg-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remove Effect">✕</button>
            </div>`;

        const effectNameSpan = item.querySelector('.effect-name');
        if (effectNameSpan) {
            effectNameSpan.addEventListener('click', () => {
                console.log(`[InspectorEffectsUI] Effect name clicked: ${displayName} (ID: ${effect.id}). Calling renderEffectControls.`);
                renderEffectControls(owner, ownerType, effect.id, controlsContainer);
                // Highlight selected effect
                listDiv.querySelectorAll('.bg-blue-600,.dark\\:bg-blue-600').forEach(el => el.classList.remove('bg-blue-600', 'dark:bg-blue-600'));
                item.classList.add('bg-blue-600', 'dark:bg-blue-600');
            });
        }

        const upBtn = item.querySelector('.up-btn');
        if (upBtn) {
            upBtn.addEventListener('click', () => {
                if (localAppServices.captureStateForUndo && typeof localAppServices.captureStateForUndo === 'function') localAppServices.captureStateForUndo(`Reorder effect on ${ownerName}`);
                else console.warn("[InspectorEffectsUI] captureStateForUndo service not available for effect reorder.");

                if (ownerType === 'track' && owner && typeof owner.reorderEffect === 'function') owner.reorderEffect(effect.id, index - 1);
                else if (ownerType === 'master' && localAppServices.reorderMasterEffect && typeof localAppServices.reorderMasterEffect === 'function') localAppServices.reorderMasterEffect(effect.id, index - 1);
                else console.warn(`[InspectorEffectsUI] Cannot reorder effect up: owner.reorderEffect or appServices.reorderMasterEffect is missing.`);
            });
        }

        const downBtn = item.querySelector('.down-btn');
        if (downBtn) {
            downBtn.addEventListener('click', () => {
                if (localAppServices.captureStateForUndo && typeof localAppServices.captureStateForUndo === 'function') localAppServices.captureStateForUndo(`Reorder effect on ${ownerName}`);
                else console.warn("[InspectorEffectsUI] captureStateForUndo service not available for effect reorder.");

                if (ownerType === 'track' && owner && typeof owner.reorderEffect === 'function') owner.reorderEffect(effect.id, index + 1);
                else if (ownerType === 'master' && localAppServices.reorderMasterEffect && typeof localAppServices.reorderMasterEffect === 'function') localAppServices.reorderMasterEffect(effect.id, index + 1);
                else console.warn(`[InspectorEffectsUI] Cannot reorder effect down: owner.reorderEffect or appServices.reorderMasterEffect is missing.`);
            });
        }

        const removeBtn = item.querySelector('.remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                if (localAppServices.captureStateForUndo && typeof localAppServices.captureStateForUndo === 'function') localAppServices.captureStateForUndo(`Remove ${effect.type} from ${ownerName}`);
                else console.warn("[InspectorEffectsUI] captureStateForUndo service not available for effect removal.");

                if (ownerType === 'track' && owner && typeof owner.removeEffect === 'function') owner.removeEffect(effect.id);
                else if (ownerType === 'master' && localAppServices.removeMasterEffect && typeof localAppServices.removeMasterEffect === 'function') localAppServices.removeMasterEffect(effect.id);
                else console.warn(`[InspectorEffectsUI] Cannot remove effect: owner.removeEffect or appServices.removeMasterEffect is missing.`);
            });
        }
        listDiv.appendChild(item);
    });
    console.log(`[InspectorEffectsUI renderEffectsList] Finished rendering ${effectsArray.length} effects for ${ownerName}.`);
}

export function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    console.log(`[InspectorEffectsUI renderEffectControls] Called for ${ownerName}, Effect ID: ${effectId}. ControlsContainer: ${controlsContainer ? 'found' : 'MISSING'}`);

    if (!controlsContainer) {
        console.error(`[InspectorEffectsUI renderEffectControls] controlsContainer is null for ${ownerName}. Cannot render controls.`);
        return;
    }
    controlsContainer.innerHTML = ''; // Clear previous controls

    const effectsArray = (ownerType === 'track' && owner && Array.isArray(owner.activeEffects))
        ? owner.activeEffects
        : ((ownerType === 'master' && localAppServices.getMasterEffects && typeof localAppServices.getMasterEffects === 'function')
            ? localAppServices.getMasterEffects()
            : []);
    const effectWrapper = effectsArray.find(e => e.id === effectId);

    if (!effectWrapper) {
        controlsContainer.innerHTML = '<p class="text-xs text-gray-400 dark:text-slate-400 italic">Select an effect to see its controls.</p>';
        console.log(`[InspectorEffectsUI renderEffectControls] Effect with ID ${effectId} not found in effectsArray for ${ownerName}.`);
        return;
    }

    const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
    const effectDef = AVAILABLE_EFFECTS_LOCAL[effectWrapper.type];

    if (!effectDef) {
        controlsContainer.innerHTML = `<p class="text-xs text-red-500 dark:text-red-400">Error: Definition for "${effectWrapper.type}" not found.</p>`;
        console.error(`[InspectorEffectsUI renderEffectControls] Effect definition for type "${effectWrapper.type}" not found.`);
        return;
    }
    // console.log(`[InspectorEffectsUI renderEffectControls] Rendering controls for: ${effectDef.displayName}`);

    const titleEl = document.createElement('h4');
    titleEl.className = 'text-sm font-semibold mb-2 text-slate-100 dark:text-slate-100'; titleEl.textContent = `Controls: ${effectDef.displayName}`;
    controlsContainer.appendChild(titleEl);
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 p-2 border border-gray-700 dark:border-slate-600 rounded bg-gray-750 dark:bg-slate-700 text-xs';

    if (!effectDef.params || effectDef.params.length === 0) {
        gridContainer.innerHTML = '<p class="text-xs text-gray-400 dark:text-slate-400 italic col-span-full">No adjustable parameters for this effect.</p>';
    } else {
        effectDef.params.forEach(paramDef => {
            // console.log(`[InspectorEffectsUI renderEffectControls] Creating control for param: ${paramDef.label} (${paramDef.key}) for effect ${effectDef.displayName}`);
            const controlWrapper = document.createElement('div');
            controlWrapper.className = 'flex flex-col space-y-1';

            let currentValue; const pathKeys = paramDef.key.split('.'); let tempVal = effectWrapper.params;
            for (const key of pathKeys) { if (tempVal && typeof tempVal === 'object' && key in tempVal) tempVal = tempVal[key]; else { tempVal = undefined; break; } }
            currentValue = (tempVal !== undefined) ? tempVal : paramDef.defaultValue;

            if (paramDef.type === 'knob') {
                const knob = createKnob({ /* ... knob options ... */ });
                controlWrapper.appendChild(knob.element);
            } else if (paramDef.type === 'select') {
                // ... (select creation logic from response #30)
            } else if (paramDef.type === 'toggle') {
                // ... (toggle button creation logic from response #30)
            }
            gridContainer.appendChild(controlWrapper);
        });
    }
    controlsContainer.appendChild(gridContainer);
    // console.log(`[InspectorEffectsUI renderEffectControls] Finished rendering controls for ${effectDef.displayName}.`);
}

// ... (openTrackEffectsRackWindow, openMasterEffectsRackWindow as per response #30)
// ... (drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI, renderDrumSamplerPads, updateDrumPadControlsUI as per response #30)
export function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... same as response #30 ... */ }
export function openMasterEffectsRackWindow(savedState = null) { /* ... same as response #30 ... */ }
export function drawWaveform(track) { /* ... same as response #30 ... */ }
export function drawInstrumentWaveform(track) { /* ... same as response #30 ... */ }
export function renderSamplePads(track) { /* ... same as response #30 ... */ }
export function updateSliceEditorUI(track) { /* ... same as response #30 ... */ }
export function renderDrumSamplerPads(track) { /* ... same as response #30 ... */ }
export function updateDrumPadControlsUI(track) { /* ... same as response #30 ... */ }
