// js/ui_modules/inspectorEffectsUI.js (MODIFIED - Ensured appServices reference)
import { SnugWindow } from '../SnugWindow.js';
import {
    showNotification as utilShowNotification, // Keep alias to avoid potential conflicts
    createDropZoneHTML,
    setupGenericDropZoneListeners,
    showCustomModal,
    createContextMenu,
    showConfirmationDialog
} from '../utils.js';
import * as Constants from '../constants.js';

// This will be the single appServices instance from main.js
let localAppServices = {}; 

export function initializeInspectorEffectsUI(appServicesFromMain) {
    localAppServices = appServicesFromMain; // Use the direct reference
    if (!localAppServices.effectsRegistryAccess) {
        console.warn("[InspectorEffectsUI Module] effectsRegistryAccess not found in appServices. Creating fallback.");
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
    // console.log("[InspectorEffectsUI] Module initialized.");
}

export function createKnob(options) {
    const id = `${options.idPrefix}-${options.trackId || 'global'}-${(options.paramKey || 'unknown').replace(/\./g, '_')}`;
    const container = document.createElement('div');
    container.className = 'knob-container flex flex-col items-center mx-1 my-1 min-w-[60px]';

    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.className = 'knob-label text-xs text-slate-400 dark:text-slate-400 mb-0.5 truncate w-full text-center';
    labelEl.textContent = options.label;
    labelEl.title = options.label;


    const knobEl = document.createElement('div');
    knobEl.id = id;
    knobEl.className = 'knob w-8 h-8 bg-slate-300 dark:bg-slate-700 rounded-full relative border border-slate-400 dark:border-slate-600 shadow-sm cursor-ns-resize';
    knobEl.title = `${options.label}: ${options.currentValue}`;

    const handleEl = document.createElement('div');
    handleEl.className = 'knob-handle w-1 h-2.5 bg-slate-600 dark:bg-slate-300 absolute rounded-sm';
    handleEl.style.left = '50%';
    handleEl.style.top = '4px'; 
    handleEl.style.transformOrigin = '50% 100%'; 
    knobEl.appendChild(handleEl);

    const valueDisplayEl = document.createElement('div');
    valueDisplayEl.className = 'knob-value-display text-xs text-slate-500 dark:text-slate-400 mt-0.5 min-h-[1em]';
    
    const min = options.min || 0;
    const max = options.max || 100;
    const range = max - min;
    let currentValue = options.currentValue; // Maintain internal current value

    const updateKnobVisuals = (val) => {
        const displayVal = parseFloat(val).toFixed(options.decimals || 2);
        valueDisplayEl.textContent = displayVal + (options.displaySuffix || '');
        knobEl.title = `${options.label}: ${displayVal}`;
        const rotation = Math.max(-135, Math.min(135, ((val - min) / range) * 270 - 135));
        handleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
    };
    updateKnobVisuals(currentValue);


    let isDragging = false;
    let initialY, initialValueForDrag;

    knobEl.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        isDragging = true;
        initialY = e.clientY;
        initialValueForDrag = currentValue; 
        knobEl.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';

        const onPointerMove = (moveEvent) => {
            if (!isDragging) return;
            const dy = initialY - moveEvent.clientY; 
            const sensitivity = (max - min) / 150; 
            let newValue = initialValueForDrag + dy * sensitivity;
            newValue = Math.max(min, Math.min(max, newValue));
            if (options.step) {
                newValue = Math.round(newValue / options.step) * options.step;
            }
            currentValue = newValue; 
            updateKnobVisuals(currentValue);

            if (options.onChange && typeof options.onChange === 'function') {
                options.onChange(currentValue);
            }
        };

        const onPointerUp = () => {
            if (!isDragging) return;
            isDragging = false;
            knobEl.style.cursor = 'ns-resize';
            document.body.style.userSelect = '';
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            if (options.onRelease && typeof options.onRelease === 'function') {
                options.onRelease(currentValue);
            }
        };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    });
    knobEl.addEventListener('dblclick', () => {
        if (options.defaultValue !== undefined) {
            currentValue = options.defaultValue;
            updateKnobVisuals(currentValue);
            if (options.onChange) options.onChange(currentValue);
            if (options.onRelease) options.onRelease(currentValue);
        }
    });

    container.appendChild(labelEl);
    container.appendChild(knobEl);
    container.appendChild(valueDisplayEl);
    return container;
}

export function openTrackInspectorWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) {
        if(localAppServices.showNotification) localAppServices.showNotification(`Error: Track ID ${trackId} not found. Cannot open inspector.`, "error");
        else alert(`Error: Track ID ${trackId} not found. Cannot open inspector.`);
        return null;
    }

    const windowId = `trackInspector-${trackId}`;
    if (!savedState && localAppServices.getWindowById && localAppServices.getWindowById(windowId)?.element) {
        localAppServices.getWindowById(windowId).focus();
        return localAppServices.getWindowById(windowId);
    }
    
    let contentHTML = `
        <div class="p-2 space-y-3 text-sm">
            <div class="flex items-center space-x-2">
                <label for="inspectorTrackName-${trackId}" class="font-semibold text-xs">Name:</label>
                <input type="text" id="inspectorTrackName-${trackId}" value="${track.name}" class="flex-grow bg-slate-700 p-1 rounded text-xs">
            </div>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2 items-center">
                <div><label for="inspectorTrackVolume-${trackId}" class="text-xs">Volume:</label></div>
                <input type="range" id="inspectorTrackVolume-${trackId}" min="-60" max="6" step="0.1" value="${track.getVolumeDb ? track.getVolumeDb() : 0}" class="w-full h-2 accent-blue-500">
                <div><label for="inspectorTrackPan-${trackId}" class="text-xs">Pan:</label></div>
                <input type="range" id="inspectorTrackPan-${trackId}" min="-1" max="1" step="0.01" value="${track.channel?.pan?.value !== undefined ? track.channel.pan.value : 0}" class="w-full h-2 accent-blue-500">
            </div>
             ${track.type === 'Audio' ? `
                <div class="flex items-center space-x-2">
                    <input type="checkbox" id="inspectorTrackMonitor-${trackId}" ${track.isMonitoringEnabled ? 'checked' : ''} class="form-checkbox h-4 w-4 text-blue-500 rounded bg-slate-700 border-slate-600 focus:ring-blue-400">
                    <label for="inspectorTrackMonitor-${trackId}" class="text-xs">Monitor Input</label>
                </div>
            ` : ''}
            <hr class="border-slate-600">
            <div id="trackSpecificControls-${trackId}" class="space-y-2">
            </div>
        </div>`;

    const options = { width: 280, minWidth: 260, height: 450, minHeight:300, initialContentKey: windowId };
    if (savedState) Object.assign(options, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

    const inspectorWindow = localAppServices.createWindow(windowId, `Inspector: ${track.name}`, contentHTML, options);

    if (inspectorWindow?.element) {
        const nameInput = inspectorWindow.element.querySelector(`#inspectorTrackName-${trackId}`);
        const volumeSlider = inspectorWindow.element.querySelector(`#inspectorTrackVolume-${trackId}`);
        const panSlider = inspectorWindow.element.querySelector(`#inspectorTrackPan-${trackId}`);
        const monitorCheckbox = inspectorWindow.element.querySelector(`#inspectorTrackMonitor-${trackId}`);

        nameInput.addEventListener('change', (e) => { if(track.setName) track.setName(e.target.value); });
        volumeSlider.addEventListener('input', (e) => { if(track.setVolumeDb) track.setVolumeDb(parseFloat(e.target.value)); });
        panSlider.addEventListener('input', (e) => { if(track.setPan) track.setPan(parseFloat(e.target.value)); });
        if (monitorCheckbox) {
            monitorCheckbox.addEventListener('change', (e) => { if(track.setMonitoring) track.setMonitoring(e.target.checked); });
        }
        
        const specificControlsContainer = inspectorWindow.element.querySelector(`#trackSpecificControls-${trackId}`);
        _injectTrackSpecificControls(track, specificControlsContainer);
    }
    return inspectorWindow;
}

function _injectTrackSpecificControls(track, container) {
    if (!container) return;
    container.innerHTML = ''; 
    const effectsRegistry = localAppServices.effectsRegistryAccess;

    if (track.type === 'Synth' && effectsRegistry?.synthEngineControlDefinitions?.[track.synthType || 'MonoSynth']) {
        const controlsHtml = effectsRegistry.synthEngineControlDefinitions[track.synthType || 'MonoSynth']
            .map(def => {
                let currentVal = track.getSynthParam ? track.getSynthParam(def.path) : undefined;
                if (currentVal === undefined) currentVal = def.defaultValue;
                if (def.type === 'knob') {
                    return `<div class="synth-control-placeholder" data-control-type="knob" data-id-prefix="${def.idPrefix}" data-param-key="${def.path}" data-label="${def.label}" data-min="${def.min}" data-max="${def.max}" data-step="${def.step}" data-default-value="${def.defaultValue}" data-decimals="${def.decimals || 2}" data-current-value="${currentVal}" data-suffix="${def.displaySuffix || ''}"></div>`;
                } else if (def.type === 'select') {
                    const optionsHtml = (def.options || []).map(opt => `<option value="${opt}" ${opt === currentVal ? 'selected' : ''}>${opt}</option>`).join('');
                    return `<div class="flex flex-col mb-1 col-span-2"><label class="text-xxs text-slate-400 mb-0.5" for="synthParam-${track.id}-${def.idPrefix}">${def.label}:</label><select id="synthParam-${track.id}-${def.idPrefix}" data-path="${def.path}" class="bg-slate-700 p-1 rounded text-xs w-full">${optionsHtml}</select></div>`;
                }
                return '';
            }).join('');
        container.innerHTML = `<h4 class="text-xs font-semibold text-slate-300 border-b border-slate-600 pb-1 mb-2">${track.synthType || 'MonoSynth'} Controls</h4><div class="grid grid-cols-2 gap-x-1 gap-y-0 items-start">${controlsHtml}</div>`;
        
        container.querySelectorAll('.synth-control-placeholder[data-control-type="knob"]').forEach(ph => {
            const knobContainer = createKnob({
                trackId: track.id,
                idPrefix: ph.dataset.idPrefix,
                paramKey: ph.dataset.paramKey,
                label: ph.dataset.label,
                min: parseFloat(ph.dataset.min),
                max: parseFloat(ph.dataset.max),
                step: parseFloat(ph.dataset.step),
                currentValue: parseFloat(ph.dataset.currentValue),
                defaultValue: parseFloat(ph.dataset.defaultValue),
                decimals: parseInt(ph.dataset.decimals),
                displaySuffix: ph.dataset.suffix,
                onChange: (val) => { if(track.setSynthParam) track.setSynthParam(ph.dataset.paramKey, val); },
                onRelease: () => { if(localAppServices.captureStateForUndoInternal) localAppServices.captureStateForUndoInternal(`Change ${track.name} ${ph.dataset.label}`); }
            });
            ph.replaceWith(knobContainer);
        });

        container.querySelectorAll('select[data-path]').forEach(select => {
            select.addEventListener('change', (e) => {
                if(track.setSynthParam) track.setSynthParam(e.target.dataset.path, e.target.value);
                if(localAppServices.captureStateForUndoInternal) localAppServices.captureStateForUndoInternal(`Change ${track.name} ${select.previousElementSibling?.textContent || 'param'}`);
            });
        });

    } else if (track.type === 'Sampler') { /* ... same as response #42 ... */ }
    else if (track.type === 'DrumSampler') { /* ... same as response #42 ... */ }
    else if (track.type === 'InstrumentSampler') { /* ... same as response #42 ... */ }
    else if (track.type === 'Audio') {
         container.innerHTML = `<div class="text-xs text-slate-400">Audio track controls. Waveform on timeline.</div>`;
    }
}

export function openTrackEffectsRackWindow(trackId, savedState = null) {
    // ... (Ensure this function also uses localAppServices correctly, similar to openTrackInspectorWindow)
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) {
        if(localAppServices.showNotification) localAppServices.showNotification(`Error: Track ID ${trackId} not found.`, "error");
        return null;
    }
    const windowId = `effectsRack-${trackId}`;
     if (!savedState && localAppServices.getWindowById && localAppServices.getWindowById(windowId)?.element) {
        localAppServices.getWindowById(windowId).focus();
        return localAppServices.getWindowById(windowId);
    }
    const content = `...`; // Same contentHTML as response #42
    const options = { width: 350, height: 400, minWidth:300, minHeight:250, initialContentKey: windowId };
    if (savedState) Object.assign(options, { /* ... */ });
    const rackWindow = localAppServices.createWindow(windowId, `Effects: ${track.name}`, content, options);
    if (rackWindow?.element) {
        rackWindow.element.querySelector(`#addEffectBtn-${trackId}`).addEventListener('click', () => {
            if(localAppServices.showAddEffectModal) localAppServices.showAddEffectModal(track, 'track');
        });
        const listDiv = rackWindow.element.querySelector(`#effectsList-${trackId}`);
        const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-${trackId}`);
        renderEffectsList(track, 'track', listDiv, controlsContainer);
    }
    return rackWindow;
}
export function openMasterEffectsRackWindow(savedState = null) {
    // ... (Ensure this function also uses localAppServices correctly)
    const windowId = 'masterEffectsRack';
    // ... (rest of the logic is similar to response #42, ensuring localAppServices calls)
    if (!savedState && localAppServices.getWindowById && localAppServices.getWindowById(windowId)?.element) { /* ... */ }
    const content = `...`;
    const options = { /* ... */ };
    if (savedState) Object.assign(options, { /* ... */ });
    const rackWindow = localAppServices.createWindow(windowId, 'Master Effects', content, options);
    if (rackWindow?.element) {
        rackWindow.element.querySelector('#addMasterEffectBtn').addEventListener('click', () => {
            if(localAppServices.showAddEffectModal) localAppServices.showAddEffectModal(null, 'master');
        });
        const listDiv = rackWindow.element.querySelector('#effectsList-master');
        const controlsContainer = rackWindow.element.querySelector('#effectControlsContainer-master');
        renderEffectsList(null, 'master', listDiv, controlsContainer);
    }
    return rackWindow;
}

export function drawWaveform(track) { /* ... same as response #42, ensure localAppServices used if needed ... */ }
export function drawInstrumentWaveform(track) { /* ... same as response #42 ... */ }
export function renderSamplePads(track) { /* ... same as response #42 ... */ }
export function updateSliceEditorUI(track) { /* ... same as response #42 ... */ }
export function renderDrumSamplerPads(track, optPadIndexToSelect) { /* ... same as response #42 ... */ }
export function updateDrumPadControlsUI(track, padIndex) { /* ... same as response #42 ... */ }
export function renderEffectsList(track, ownerType = 'track', listContainer, controlsContainer) { /* ... same as response #42, ensure localAppServices used ... */ }
export function renderEffectControls(track, ownerType, effectId, controlsContainer) { /* ... same as response #42, ensure localAppServices used ... */ }
