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
    // console.log("[InspectorEffectsUI] Module initialized.");
}

// --- Knob UI ---
export function createKnob(options) {
    const container = document.createElement('div');
    container.className = 'knob-container flex flex-col items-center mx-1 my-1 min-w-[60px]';

    const label = document.createElement('label');
    label.className = 'text-xs text-slate-400 mb-1';
    label.textContent = options.label;

    const knobWrapper = document.createElement('div');
    knobWrapper.className = 'relative w-10 h-10';

    const knobEl = document.createElement('div');
    knobEl.className = 'knob w-full h-full bg-slate-600 border-2 border-slate-500 rounded-full cursor-pointer';

    const indicator = document.createElement('div');
    indicator.className = 'indicator absolute top-1 left-1/2 w-px h-2 bg-blue-400 transform -translate-x-1/2';
    knobEl.appendChild(indicator);
    
    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'value-display text-xs mt-1 text-center w-full';
    
    knobWrapper.appendChild(knobEl);
    container.appendChild(label);
    container.appendChild(knobWrapper);
    container.appendChild(valueDisplay);

    let currentValue = options.defaultValue;

    const updateIndicator = () => {
        const min = options.min;
        const max = options.max;
        const totalRange = 270; // Degrees of rotation
        const startAngle = -135;
        const percentage = (currentValue - min) / (max - min);
        const angle = startAngle + percentage * totalRange;
        knobEl.style.transform = `rotate(${angle}deg)`;
        
        let displayValue = Number(currentValue).toFixed(options.decimals || 2);
        if (options.unit) {
            displayValue += ` ${options.unit}`;
        }
        valueDisplay.textContent = displayValue;
    };

    const handleInteraction = (e) => {
        e.preventDefault();
        const startY = e.clientY || e.touches[0].clientY;
        const startValue = currentValue;

        const onMouseMove = (moveEvent) => {
            const currentY = moveEvent.clientY || moveEvent.touches[0].clientY;
            const deltaY = startY - currentY;
            const sensitivity = (options.max - options.min) / 200; // Adjust sensitivity
            
            let newValue = startValue + deltaY * sensitivity;
            newValue = Math.max(options.min, Math.min(options.max, newValue));
            
            if (options.step) {
                newValue = Math.round(newValue / options.step) * options.step;
            }
            
            currentValue = newValue;
            updateIndicator();
            if (options.onChange) {
                options.onChange(currentValue);
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onMouseMove);
            document.removeEventListener('touchend', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchmove', onMouseMove);
        document.addEventListener('touchend', onMouseUp);
    };

    knobEl.addEventListener('mousedown', handleInteraction);
    knobEl.addEventListener('touchstart', handleInteraction);

    updateIndicator();

    return {
        element: container,
        setValue: (val) => {
            currentValue = val;
            updateIndicator();
        }
    };
}


// --- Inspector Window ---
export function openTrackInspectorWindow(trackId, savedState = null) {
    if (!localAppServices || !localAppServices.getTrackById) {
        console.error("[InspectorEffectsUI openTrackInspectorWindow] appServices not ready.");
        return;
    }
    const track = localAppServices.getTrackById(trackId);
    if (!track) {
        console.error(`[InspectorEffectsUI openTrackInspectorWindow] Track with ID ${trackId} not found.`);
        return;
    }

    const windowId = `inspector_${trackId}`;
    if (localAppServices.getWindowById(windowId)) {
        const win = localAppServices.getWindowById(windowId);
        if (win) win.focus();
        return;
    }
    
    let content = `
        <div class="h-full flex flex-col bg-slate-800 text-sm text-slate-300">
            <div id="inspector-header-${trackId}" class="p-2 border-b border-slate-700">
                 </div>
            <div id="inspector-content-${trackId}" class="flex-grow overflow-y-auto p-2">
                </div>
        </div>`;

    const inspectorWindow = new SnugWindow(windowId, `Inspector: ${track.name}`, content, {
        width: 320,
        height: 500,
        x: 100 + Math.random() * 100,
        y: 100 + Math.random() * 50,
        initialContentKey: `inspector_${track.type}`,
        onCloseCallback: () => { /* any cleanup if needed */ }
    }, localAppServices);
    
    renderTrackInspectorContent(track);
    return inspectorWindow;
}
function renderTrackInspectorContent(track) {
    if (!track || !track.id) return;
    const headerContainer = document.getElementById(`inspector-header-${track.id}`);
    const contentContainer = document.getElementById(`inspector-content-${track.id}`);
    
    if (!headerContainer || !contentContainer) {
        // console.warn(`Inspector containers for track ${track.id} not found. Retrying...`);
        // setTimeout(() => renderTrackInspectorContent(track), 50); // Retry after a short delay
        return;
    }
    
    // Render Header (common controls)
    const soloedTrackId = localAppServices.getSoloedTrackId ? localAppServices.getSoloedTrackId() : null;
    const armedTrackId = localAppServices.getArmedTrackId ? localAppServices.getArmedTrackId() : null;

    headerContainer.innerHTML = `
        <div class="flex items-center space-x-2">
            <input type="text" value="${track.name}" data-track-id="${track.id}" class="track-name-input flex-grow bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-base font-bold">
            <button data-action="mute" title="Mute" class="track-control-btn ${track.isMuted ? 'bg-blue-600' : 'bg-slate-600'} w-8 h-8 rounded-md">M</button>
            <button data-action="solo" title="Solo" class="track-control-btn ${soloedTrackId === track.id ? 'bg-yellow-500' : 'bg-slate-600'} w-8 h-8 rounded-md">S</button>
            <button data-action="arm" title="Arm for Recording" class="track-control-btn ${armedTrackId === track.id ? 'bg-red-600' : 'bg-slate-600'} w-8 h-8 rounded-md">R</button>
        </div>
        <div class="flex items-center space-x-2 mt-2">
             <label class="flex-grow text-slate-400">Volume</label>
             <input type="range" min="-60" max="6" step="0.1" value="${track.volume.value}" class="track-volume-slider w-3/5">
             <span class="track-volume-display text-xs w-12 text-right">${Number(track.volume.value).toFixed(1)} dB</span>
        </div>
         <div class="flex items-center space-x-2 mt-1">
             <label class="flex-grow text-slate-400">Pan</label>
             <input type="range" min="-1" max="1" step="0.01" value="${track.pan.value}" class="track-pan-slider w-3/5">
             <span class="track-pan-display text-xs w-12 text-right">${Number(track.pan.value).toFixed(2)}</span>
        </div>
    `;

    // Render Content (type-specific)
    contentContainer.innerHTML = ''; // Clear previous content
    if (track.type === 'Synth') {
        renderSynthControls(track, contentContainer);
    } else if (track.type === 'DrumSampler') {
        renderDrumSamplerPads(track, contentContainer);
        updateDrumPadControlsUI(track); // Initial render of controls
    } else if (track.type === 'Audio') {
        drawWaveform(track, contentContainer);
    }

    // Attach event listeners
    attachInspectorEventListeners(headerContainer, track);
}
function attachInspectorEventListeners(container, track) {
    container.querySelector('.track-name-input').addEventListener('change', (e) => {
        track.name = e.target.value;
        // Also update the window title if it exists
        const inspectorWindow = localAppServices.getWindowById(`inspector_${track.id}`);
        if(inspectorWindow) inspectorWindow.setTitle(`Inspector: ${track.name}`);
        // Optional: update other UI parts like mixer or arrangement view
        if(localAppServices.updateArrangementView) localAppServices.updateArrangementView();
    });

    container.querySelector('.track-volume-slider').addEventListener('input', (e) => {
        const newDb = parseFloat(e.target.value);
        track.volume.value = newDb;
        container.querySelector('.track-volume-display').textContent = `${newDb.toFixed(1)} dB`;
    });
    
    container.querySelector('.track-pan-slider').addEventListener('input', (e) => {
        const newPan = parseFloat(e.target.value);
        track.pan.value = newPan;
        container.querySelector('.track-pan-display').textContent = newPan.toFixed(2);
    });

    container.querySelectorAll('.track-control-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            switch(action) {
                case 'mute': 
                    if(handleTrackMute) handleTrackMute(track.id);
                    break;
                case 'solo': 
                    if(handleTrackSolo) handleTrackSolo(track.id);
                    break;
                case 'arm':
                    if(handleTrackArm) handleTrackArm(track.id);
                    break;
            }
            // Re-render to reflect state changes
            renderTrackInspectorContent(track);
            if(localAppServices.updateArrangementView) localAppServices.updateArrangementView();
        });
    });
}
function renderSynthControls(track, container) {
    if (!track.synth) {
        container.innerHTML = '<p class="text-slate-500">Synth not initialized.</p>';
        return;
    }
    const synthControlDefs = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[track.synth.name];
    if (!synthControlDefs) {
        container.innerHTML = `<p class="text-slate-500">No controls defined for ${track.synth.name}.</p>`;
        return;
    }

    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-2 sm:grid-cols-3 gap-2 p-1';

    synthControlDefs.forEach(paramDef => {
        const controlWrapper = document.createElement('div');
        controlWrapper.className = 'flex flex-col items-center';

        if (paramDef.type === 'knob') {
            const knob = createKnob({
                label: paramDef.label,
                min: paramDef.min,
                max: paramDef.max,
                step: paramDef.step,
                defaultValue: track.getSynthParam(paramDef.path),
                decimals: paramDef.decimals,
                onChange: (val) => {
                    track.setSynthParam(paramDef.path, val);
                }
            });
            controlWrapper.appendChild(knob.element);
        } else if (paramDef.type === 'select') {
            const label = document.createElement('label');
            label.className = 'text-xs text-slate-400 mb-1 w-full text-center';
            label.textContent = paramDef.label;
            
            const select = document.createElement('select');
            select.className = 'bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-xs w-full';
            paramDef.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                if (track.getSynthParam(paramDef.path) === opt) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            select.addEventListener('change', (e) => {
                track.setSynthParam(paramDef.path, e.target.value);
            });
            controlWrapper.appendChild(label);
            controlWrapper.appendChild(select);
        }
        gridContainer.appendChild(controlWrapper);
    });

    container.innerHTML = '';
    container.appendChild(gridContainer);
}


// --- Effects Rack UI ---
function renderEffectsRack(owner, ownerType, containerElement) {
    if (!owner || !containerElement) return;

    const effects = (ownerType === 'track') ? owner.effects : (localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);
    const ownerName = (ownerType === 'track') ? owner.name : 'Master';

    containerElement.innerHTML = '';

    const listContainer = document.createElement('div');
    listContainer.className = 'effects-list-container space-y-2';

    effects.forEach((effect, index) => {
        const effectItem = createEffectItemUI(effect, index, owner, ownerType);
        listContainer.appendChild(effectItem);
    });
    containerElement.appendChild(listContainer);

    const addEffectButton = document.createElement('button');
    addEffectButton.className = 'w-full mt-3 p-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm';
    addEffectButton.innerHTML = '<i class="fas fa-plus mr-2"></i>Add Effect';
    addEffectButton.addEventListener('click', () => {
        if (localAppServices.showAddEffectModal) {
            localAppServices.showAddEffectModal(owner, ownerType, ownerName);
        }
    });
    containerElement.appendChild(addEffectButton);

    // Make the list sortable
    // setupSortableEffects(listContainer, owner, ownerType);
}
function createEffectItemUI(effect, index, owner, ownerType) {
    const effectDef = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS?.[effect.type];
    if (!effectDef) return document.createElement('div');

    const item = document.createElement('div');
    item.className = 'effect-item bg-slate-700 rounded-lg p-2 border border-slate-600';
    item.dataset.effectId = effect.id;
    item.dataset.index = index;

    item.innerHTML = `
        <div class="effect-header flex justify-between items-center cursor-pointer">
            <span class="font-bold text-slate-300">${effectDef.displayName}</span>
            <div class="flex items-center space-x-2">
                <button data-action="toggle-power" class="w-6 h-6 rounded-md ${effect.isBypassed ? 'bg-slate-500' : 'bg-green-500'} hover:opacity-80"></button>
                <button data-action="remove" class="w-6 h-6 rounded-md bg-red-600 hover:bg-red-500"><i class="fas fa-times"></i></button>
            </div>
        </div>
        <div class="effect-controls-panel mt-2 overflow-hidden" style="display: block;">
             </div>
    `;

    renderEffectControls(effect, owner, ownerType, item.querySelector('.effect-controls-panel'));

    // Event listeners for header buttons
    item.querySelector('[data-action="toggle-power"]').addEventListener('click', (e) => {
        e.stopPropagation();
        if(ownerType === 'track') owner.toggleBypassEffect(effect.id);
        else if (localAppServices.toggleBypassMasterEffect) localAppServices.toggleBypassMasterEffect(effect.id);
        
        // Re-render the rack to show updated state
        const rackContainer = item.closest('.effects-rack-content');
        if(rackContainer) renderEffectsRack(owner, ownerType, rackContainer);
    });

    item.querySelector('[data-action="remove"]').addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirmationDialog(`Remove ${effectDef.displayName}?`, () => {
             if(ownerType === 'track') owner.removeEffect(effect.id);
             else if (localAppServices.removeMasterEffect) localAppServices.removeMasterEffect(effect.id);
             // Re-render
             const rackContainer = item.closest('.effects-rack-content');
             if(rackContainer) renderEffectsRack(owner, ownerType, rackContainer);
        });
    });
    return item;
}

function renderEffectControls(effect, owner, ownerType, controlsContainer) {
    const effectId = effect.id;
    const effectType = effect.type;
    const effectDef = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS?.[effectType];
    const paramDefs = localAppServices.effectsRegistryAccess?.getEffectParamDefinitions(effectType) || [];
    
    if (!effectDef) {
        controlsContainer.innerHTML = 'Error: Effect definition not found.';
        return;
    }
    controlsContainer.innerHTML = ''; // Clear existing

    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-3 p-1';

    if (paramDefs.length === 0) {
        gridContainer.innerHTML = '<p class="text-xs text-slate-500 col-span-full text-center">No configurable parameters.</p>';
    } else {
        paramDefs.forEach(paramDef => {
            const controlWrapper = document.createElement('div');
            controlWrapper.className = 'flex flex-col items-center';

            const currentValue = ownerType === 'track' 
                ? owner.getEffectParamValue(effectId, paramDef.key)
                : localAppServices.getMasterEffectParamValue(effectId, paramDef.key);

            if (paramDef.type === 'knob') {
                const knob = createKnob({
                    label: paramDef.label,
                    min: paramDef.min,
                    max: paramDef.max,
                    step: paramDef.step,
                    defaultValue: currentValue,
                    decimals: paramDef.decimals,
                    unit: paramDef.unit || '',
                    onChange: (val) => {
                        if (ownerType === 'track') owner.updateEffectParam(effectId, paramDef.key, val);
                        else if (ownerType === 'master' && localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, val);
                    }
                });
                controlWrapper.appendChild(knob.element);
            } else if (paramDef.type === 'select') {
                // ... (select creation logic from response #30) ...
            } else if (paramDef.type === 'toggle') {
                // ... (toggle creation logic from response #30) ...
            }
            gridContainer.appendChild(controlWrapper);
        });
    }
    controlsContainer.appendChild(gridContainer);
    // console.log(`[InspectorEffectsUI renderEffectControls] Finished rendering controls for ${effectDef.displayName}.`);
}

export function openTrackEffectsRackWindow(trackId, savedState = null) { 
    if (!localAppServices || !localAppServices.getTrackById) return;
    const track = localAppServices.getTrackById(trackId);
    if (!track) return;

    const windowId = `effects-rack_${trackId}`;
    if (localAppServices.getWindowById(windowId)) {
        localAppServices.getWindowById(windowId).focus();
        return;
    }

    const content = `<div class="effects-rack-content h-full overflow-y-auto p-3 bg-slate-800"></div>`;
    const rackWindow = new SnugWindow(windowId, `Effects: ${track.name}`, content, {
        width: 450,
        height: 400,
        x: 150 + Math.random() * 100,
        y: 150 + Math.random() * 50
    }, localAppServices);

    const rackContainer = rackWindow.element.querySelector('.effects-rack-content');
    renderEffectsRack(track, 'track', rackContainer);

    // Subscribe to track changes to re-render the rack
    // This is a simplified observer pattern. A more robust solution might use a dedicated event bus.
    const originalAddEffect = track.addEffect.bind(track);
    track.addEffect = (effectType) => {
        originalAddEffect(effectType);
        renderEffectsRack(track, 'track', rackContainer);
    };
     const originalRemoveEffect = track.removeEffect.bind(track);
    track.removeEffect = (effectId) => {
        originalRemoveEffect(effectId);
        renderEffectsRack(track, 'track', rackContainer);
    };


    return rackWindow;
}
export function openMasterEffectsRackWindow(savedState = null) { /* ... same as response #30 ... */ }
export function drawWaveform(track) { /* ... same as response #30 ... */ }
export function drawInstrumentWaveform(track) { /* ... same as response #30 ... */ }
export function renderSamplePads(track) { /* ... same as response #30 ... */ }
export function updateSliceEditorUI(track) { /* ... same as response #30 ... */ }
export function renderDrumSamplerPads(track) { /* ... same as response #30 ... */ }
export function updateDrumPadControlsUI(track) { /* ... same as response #30 ... */ }
