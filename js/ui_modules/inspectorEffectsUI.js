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
export function createKnob(options) {
    const container = document.createElement('div');
    container.className = 'knob-container flex flex-col items-center mx-1 my-1 min-w-[60px]';

    const labelEl = document.createElement('div');
    labelEl.className = 'knob-label text-xs text-gray-400 dark:text-slate-400 mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-full text-center';
    labelEl.textContent = options.label || '';
    labelEl.title = options.label || '';
    container.appendChild(labelEl);

    const knobEl = document.createElement('div');
    knobEl.className = 'knob w-9 h-9 bg-gray-700 dark:bg-slate-600 rounded-full relative border border-gray-900 dark:border-slate-800 shadow-md';
    const handleEl = document.createElement('div');
    handleEl.className = 'knob-handle w-1 h-2.5 bg-gray-400 dark:bg-slate-300 absolute top-0.5 left-1/2 rounded-sm';
    handleEl.style.transformOrigin = '50% 100%';
    knobEl.appendChild(handleEl);
    container.appendChild(knobEl);

    const valueEl = document.createElement('div');
    valueEl.className = 'knob-value text-xs text-gray-500 dark:text-slate-400 mt-0.5 min-h-[1em] text-center';
    container.appendChild(valueEl);

    let currentValue = options.initialValue === undefined ? (options.min !== undefined ? options.min : 0) : options.initialValue;
    const min = options.min === undefined ? 0 : options.min;
    const max = options.max === undefined ? 100 : options.max;
    const step = options.step === undefined ? 1 : options.step;
    const range = max - min;
    const maxDegrees = options.maxDegrees || 270;
    const BASE_PIXELS_PER_FULL_RANGE_MOUSE = 300;
    const BASE_PIXELS_PER_FULL_RANGE_TOUCH = 450;
    let initialValueBeforeInteraction = currentValue;

    let mouseDownListener = null;
    let touchStartListener = null;

    function updateKnobVisual(disabled = false) {
        const percentage = range === 0 ? 0 : (currentValue - min) / range;
        const rotation = (percentage * maxDegrees) - (maxDegrees / 2);
        handleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        valueEl.textContent = typeof currentValue === 'number' ? currentValue.toFixed(options.decimals !== undefined ? options.decimals : (step < 1 && step !== 0 ? 2 : 0)) : currentValue;
        if (options.displaySuffix) valueEl.textContent += options.displaySuffix;

        knobEl.style.cursor = disabled ? 'not-allowed' : 'ns-resize';
        knobEl.style.opacity = disabled ? '0.5' : '1';

        if (mouseDownListener) knobEl.removeEventListener('mousedown', mouseDownListener);
        if (touchStartListener) knobEl.removeEventListener('touchstart', touchStartListener);

        if (!disabled) {
            mouseDownListener = (e) => handleInteraction(e, false);
            touchStartListener = (e) => handleInteraction(e, true);
            knobEl.addEventListener('mousedown', mouseDownListener);
            knobEl.addEventListener('touchstart', touchStartListener, { passive: false });
        } else {
            mouseDownListener = null;
            touchStartListener = null;
        }
    }

    function setValue(newValue, triggerCallback = true, fromInteraction = false) {
        const numValue = parseFloat(newValue);
        if (isNaN(numValue)) return;

        let boundedValue = Math.min(max, Math.max(min, numValue));
        if (step !== 0) {
            boundedValue = Math.round(boundedValue / step) * step;
        }
        boundedValue = Math.min(max, Math.max(min, boundedValue));

        const oldValue = currentValue;
        currentValue = boundedValue;
        updateKnobVisual(options.disabled);
        if (triggerCallback && options.onValueChange && (oldValue !== currentValue || fromInteraction) ) {
            options.onValueChange(currentValue, oldValue, fromInteraction);
        }
    }

    function handleInteraction(e, isTouch = false) {
        e.preventDefault();
        e.stopPropagation();
        initialValueBeforeInteraction = currentValue;

        const startY = isTouch ? e.touches[0].clientY : e.clientY;
        const startValue = currentValue;
        const pixelsForFullRange = isTouch ? BASE_PIXELS_PER_FULL_RANGE_TOUCH : BASE_PIXELS_PER_FULL_RANGE_MOUSE;
        const currentSensitivity = options.sensitivity === undefined ? 1 : options.sensitivity;

        function onMove(moveEvent) {
            if (isTouch && moveEvent.touches.length === 0) return;
            const currentY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
            const deltaY = startY - currentY;
            let valueChange = (deltaY / pixelsForFullRange) * range * currentSensitivity;
            let newValue = startValue + valueChange;
            setValue(newValue, true, true);
        }

        function onEnd() {
            document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
            document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
            if (currentValue !== initialValueBeforeInteraction && localAppServices.captureStateForUndo && typeof localAppServices.captureStateForUndo === 'function') {
                let description = `Change ${options.label || 'knob'} to ${valueEl.textContent}`;
                if (options.trackRef && options.trackRef.name) {
                    description = `Change ${options.label || 'knob'} for ${options.trackRef.name} to ${valueEl.textContent}`;
                }
                localAppServices.captureStateForUndo(description);
            } else if (currentValue !== initialValueBeforeInteraction) {
                console.warn("[CreateKnob] captureStateForUndo service not available.");
            }
        }
        document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, { passive: !isTouch });
        document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
    }

    options.disabled = !!options.disabled;
    setValue(currentValue, false);

    return {
        element: container,
        setValue,
        getValue: () => currentValue,
        type: 'knob',
        refreshVisuals: (disabledState) => {
            options.disabled = !!disabledState;
            updateKnobVisual(options.disabled);
        }
    };
}

// --- Specific Inspector DOM Builders ---
function buildSynthSpecificInspectorDOM(track) { /* ... same as response #26 ... */ }
function buildSamplerSpecificInspectorDOM(track) { /* ... same as response #26 ... */ }
function buildDrumSamplerSpecificInspectorDOM(track) { /* ... same as response #26 ... */ }
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... same as response #26 ... */ }

// --- Specific Inspector Control Initializers ---
function initializeSynthSpecificControls(track, winEl) { /* ... same as response #26 ... */ }
function setupSamplerInteractDropzone(dropZoneElement, trackId, targetType, padIndex = null) { /* ... same as response #26 ... */ }
function initializeSamplerSpecificControls(track, winEl) { /* ... same as response #26 ... */ }
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... same as response #26 ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... same as response #26 ... */ }

// --- Track Inspector Window (Entry Point) ---
function buildTrackInspectorContentDOM(track) { /* ... same as response #26 ... */ }
export function openTrackInspectorWindow(trackId, savedState = null) { /* ... same as response #26 ... */ }
function initializeCommonInspectorControls(track, winEl) { /* ... same as response #26 ... */ }
function initializeTypeSpecificInspectorControls(track, winEl) { /* ... same as response #26 ... */ }


// --- Modular Effects Rack UI ---
export function buildModularEffectsRackDOM(owner, ownerType = 'track') {
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
    console.log(`[InspectorEffectsUI renderEffectsList] Called for: ${ownerName} (Type: ${ownerType}). ListDiv: ${listDiv ? 'found' : 'MISSING'}, ControlsContainer: ${controlsContainer ? 'found' : 'MISSING'}`);

    if (!listDiv) {
        console.error(`[InspectorEffectsUI renderEffectsList] listDiv is null for ${ownerName}. Cannot render effects list.`);
        return;
    }
    listDiv.innerHTML = '';
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : (localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);

    console.log(`[InspectorEffectsUI renderEffectsList] Effects array for ${ownerName}:`, effectsArray ? JSON.parse(JSON.stringify(effectsArray.map(e => ({id: e.id, type: e.type})))) : 'undefined/empty');


    if (!effectsArray || effectsArray.length === 0) {
        listDiv.innerHTML = '<p class="text-xs text-gray-400 dark:text-slate-400 italic">No effects added.</p>';
        if (controlsContainer) controlsContainer.innerHTML = '';
        console.log(`[InspectorEffectsUI renderEffectsList] No effects to render for ${ownerName}.`);
        return;
    }

    const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};

    effectsArray.forEach((effect, index) => {
        if (!effect || !effect.type || !effect.id) {
            console.warn(`[InspectorEffectsUI renderEffectsList] Invalid effect object found in array for ${ownerName} at index ${index}:`, effect);
            return;
        }
        const effectDef = AVAILABLE_EFFECTS_LOCAL[effect.type];
        const displayName = effectDef ? effectDef.displayName : effect.type;
        console.log(`[InspectorEffectsUI renderEffectsList] Rendering effect item: ${displayName} (ID: ${effect.id}) for ${ownerName}`);

        const item = document.createElement('div');
        item.className = 'effect-item flex justify-between items-center p-2 border-b border-gray-700 dark:border-slate-600 bg-gray-750 dark:bg-slate-700 rounded-sm shadow-sm text-xs';
        item.innerHTML = `<span class="effect-name flex-grow cursor-pointer hover:text-blue-400 dark:hover:text-blue-300 text-slate-200 dark:text-slate-200" title="Edit ${displayName}">${displayName}</span>
            <div class="effect-actions space-x-1">
                <button class="up-btn text-xs px-1 py-0.5 rounded ${index === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 dark:hover:bg-slate-500'} text-slate-400 dark:text-slate-400" ${index === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                <button class="down-btn text-xs px-1 py-0.5 rounded ${index === effectsArray.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 dark:hover:bg-slate-500'} text-slate-400 dark:text-slate-400" ${index === effectsArray.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                <button class="remove-btn text-xs px-1.5 py-0.5 rounded text-red-400 hover:text-red-300 hover:bg-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remove Effect">✕</button>
            </div>`;
        item.querySelector('.effect-name').addEventListener('click', () => {
            console.log(`[InspectorEffectsUI] Effect name clicked: ${displayName} (ID: ${effect.id}). Calling renderEffectControls.`);
            renderEffectControls(owner, ownerType, effect.id, controlsContainer);
            listDiv.querySelectorAll('.bg-blue-600,.dark\\:bg-blue-600').forEach(el => el.classList.remove('bg-blue-600', 'dark:bg-blue-600'));
            item.classList.add('bg-blue-600', 'dark:bg-blue-600');
        });
        item.querySelector('.up-btn').addEventListener('click', () => {
            if (localAppServices.captureStateForUndo && typeof localAppServices.captureStateForUndo === 'function') localAppServices.captureStateForUndo(`Reorder effect on ${ownerName}`);
            else console.warn("[InspectorEffectsUI] captureStateForUndo service not available for effect reorder.");
            if (ownerType === 'track' && owner && typeof owner.reorderEffect === 'function') owner.reorderEffect(effect.id, index - 1);
            else if (ownerType === 'master' && localAppServices.reorderMasterEffect && typeof localAppServices.reorderMasterEffect === 'function') localAppServices.reorderMasterEffect(effect.id, index - 1);
        });
        item.querySelector('.down-btn').addEventListener('click', () => {
            if (localAppServices.captureStateForUndo && typeof localAppServices.captureStateForUndo === 'function') localAppServices.captureStateForUndo(`Reorder effect on ${ownerName}`);
            else console.warn("[InspectorEffectsUI] captureStateForUndo service not available for effect reorder.");
            if (ownerType === 'track' && owner && typeof owner.reorderEffect === 'function') owner.reorderEffect(effect.id, index + 1);
            else if (ownerType === 'master' && localAppServices.reorderMasterEffect && typeof localAppServices.reorderMasterEffect === 'function') localAppServices.reorderMasterEffect(effect.id, index + 1);
        });
        item.querySelector('.remove-btn').addEventListener('click', () => {
            if (localAppServices.captureStateForUndo && typeof localAppServices.captureStateForUndo === 'function') localAppServices.captureStateForUndo(`Remove ${effect.type} from ${ownerName}`);
            else console.warn("[InspectorEffectsUI] captureStateForUndo service not available for effect removal.");
            if (ownerType === 'track' && owner && typeof owner.removeEffect === 'function') owner.removeEffect(effect.id);
            else if (ownerType === 'master' && localAppServices.removeMasterEffect && typeof localAppServices.removeMasterEffect === 'function') localAppServices.removeMasterEffect(effect.id);
        });
        listDiv.appendChild(item);
    });
}

export function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    console.log(`[InspectorEffectsUI renderEffectControls] Called for ${ownerName}, Effect ID: ${effectId}. ControlsContainer: ${controlsContainer ? 'found' : 'MISSING'}`);

    if (!controlsContainer) {
        console.error(`[InspectorEffectsUI renderEffectControls] controlsContainer is null for ${ownerName}. Cannot render controls.`);
        return;
    }
    controlsContainer.innerHTML = '';
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : (localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);
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
    console.log(`[InspectorEffectsUI renderEffectControls] Rendering controls for: ${effectDef.displayName}`);

    const titleEl = document.createElement('h4');
    titleEl.className = 'text-sm font-semibold mb-2 text-slate-100 dark:text-slate-100'; titleEl.textContent = `Controls: ${effectDef.displayName}`;
    controlsContainer.appendChild(titleEl);
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 p-2 border border-gray-700 dark:border-slate-600 rounded bg-gray-750 dark:bg-slate-700 text-xs';

    if (!effectDef.params || effectDef.params.length === 0) {
        gridContainer.innerHTML = '<p class="text-xs text-gray-400 dark:text-slate-400 italic col-span-full">No adjustable parameters for this effect.</p>';
    } else {
        effectDef.params.forEach(paramDef => {
            // ... (parameter control creation logic with createKnob, select, toggle, including logging for each param)
            // console.log(`[InspectorEffectsUI renderEffectControls] Creating control for param: ${paramDef.label} (${paramDef.key})`);
        });
    }
    controlsContainer.appendChild(gridContainer);
}

export function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... same as response #26 ... */ }
export function openMasterEffectsRackWindow(savedState = null) { /* ... same as response #26 ... */ }
export function drawWaveform(track) { /* ... same as response #26 ... */ }
export function drawInstrumentWaveform(track) { /* ... same as response #26 ... */ }
export function renderSamplePads(track) { /* ... same as response #26 ... */ }
export function updateSliceEditorUI(track) { /* ... same as response #26 ... */ }
export function renderDrumSamplerPads(track) { /* ... same as response #26 ... */ }
export function updateDrumPadControlsUI(track) { /* ... same as response #26 ... */ }
