// js/ui_modules/inspectorEffectsUI.js

import { SnugWindow } from '../SnugWindow.js';
import {
    showNotification as utilShowNotification,
    createDropZoneHTML,
    setupGenericDropZoneListeners,
    showCustomModal,
    createContextMenu,
    showConfirmationDialog
} from '../utils.js';
import * as Constants from '../constants.js';

let localAppServices = {};

export function initializeInspectorEffectsUI(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    if (!localAppServices.effectsRegistryAccess) {
        console.warn("[InspectorEffectsUI Module] effectsRegistryAccess not found. Using fallback.");
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

export function createKnob(options) {
    // ... (content of createKnob from your uploaded file)
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
    let currentValue = options.currentValue; 

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

    knobEl.addEventListener('pointerdown', (e) => { /* ... content from your file ... */ });
    knobEl.addEventListener('dblclick', () => { /* ... content from your file ... */ });

    container.appendChild(labelEl);
    container.appendChild(knobEl);
    container.appendChild(valueDisplayEl);
    return container;
}

// Ensure all build...DOM and initialize...Controls functions are present and correct from your file
function buildSynthSpecificInspectorDOM(track) { /* ... content from your file ... */
    const engineType = track.synthType || 'MonoSynth'; 
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    let controlsHTML = `<div id="synthEngineControls-${track.id}" class="grid grid-cols-2 md:grid-cols-3 gap-2 p-1">`;
    definitions.forEach(def => { controlsHTML += `<div id="${def.idPrefix}-${track.id}-placeholder"></div>`; });
    controlsHTML += `</div>`;
    return controlsHTML;
}

function buildSamplerSpecificInspectorDOM(track) { /* ... content from your file ... */ 
    return `<div class="sampler-controls p-1 space-y-2">
        <div id="dropZoneContainer-${track.id}-sampler" class="mb-2"></div>
        <div class="waveform-section border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600">
            <canvas id="waveformCanvas-${track.id}" class="w-full h-24 bg-white dark:bg-slate-800 rounded shadow-inner"></canvas>
        </div>
        <div class="slice-editor-controls mt-2 p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1">
            <h4 class="text-xs font-semibold dark:text-slate-200">Slice Editor (Selected: <span id="selectedSliceInfo-${track.id}">1</span>)</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1 items-center text-xs">
                <div id="sliceVolumeSlider-${track.id}-placeholder"></div>
                <div id="slicePitchKnob-${track.id}-placeholder"></div>
                <button id="sliceLoopToggle-${track.id}" class="px-1.5 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Loop: OFF</button>
                <button id="sliceReverseToggle-${track.id}" class="px-1.5 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Rev: OFF</button>
            </div>
            <div class="text-xs font-medium mt-1 dark:text-slate-300">Envelope:</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                <div id="sliceEnvAttackSlider-${track.id}-placeholder"></div>
                <div id="sliceEnvDecaySlider-${track.id}-placeholder"></div>
                <div id="sliceEnvSustainSlider-${track.id}-placeholder"></div>
                <div id="sliceEnvReleaseSlider-${track.id}-placeholder"></div>
            </div>
            </div>
        <div id="samplePadsContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
        <div><button id="slicerPolyphonyToggle-${track.id}" class="text-xs px-2 py-1 border rounded mt-1 dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Mode: Poly</button></div>
    </div>`;
}
function buildDrumSamplerSpecificInspectorDOM(track) { /* ... content from your file ... */ 
    return `<div class="drum-sampler-controls p-1 space-y-2">
        <div class="selected-pad-controls p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1">
            <h4 class="text-xs font-semibold dark:text-slate-200">Edit Pad: <span id="selectedDrumPadInfo-${track.id}">1</span></h4>
            <div id="drumPadDropZoneContainer-${track.id}-${track.selectedDrumPadForEdit}" class="mb-1 text-xs"></div>
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 items-center text-xs">
                <div id="drumPadVolumeKnob-${track.id}-placeholder"></div>
                <div id="drumPadPitchKnob-${track.id}-placeholder"></div>
            </div>
            <div class="text-xs font-medium mt-1 dark:text-slate-300">Envelope:</div>
             <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                <div id="drumPadEnvAttack-${track.id}-placeholder"></div>
                <div id="drumPadEnvDecay-${track.id}-placeholder"></div>
                <div id="drumPadEnvSustain-${track.id}-placeholder"></div>
                <div id="drumPadEnvRelease-${track.id}-placeholder"></div>
            </div>
         </div>
        <div id="drumPadsGridContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
    </div>`;
}
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... content from your file ... */ 
    return `<div class="instrument-sampler-controls p-1 space-y-2">
        <div id="dropZoneContainer-${track.id}-instrumentsampler" class="mb-2"></div>
        <div class="waveform-section border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600">
           <canvas id="instrumentWaveformCanvas-${track.id}" class="w-full h-24 bg-white dark:bg-slate-800 rounded shadow-inner"></canvas>
        </div>
        <div class="instrument-params-controls mt-2 p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1 text-xs">
            <div class="grid grid-cols-2 gap-2 items-center">
                <div>
                    <label for="instrumentRootNote-${track.id}" class="block text-xs font-medium dark:text-slate-300">Root Note:</label>
                    <select id="instrumentRootNote-${track.id}" class="w-full p-1 border rounded text-xs bg-gray-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500"></select>
                </div>
                <div>
                    <label for="instrumentLoopToggle-${track.id}" class="block text-xs font-medium dark:text-slate-300">Loop:</label>
                    <button id="instrumentLoopToggle-${track.id}" class="px-2 py-1 text-xs border rounded w-full dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Loop: OFF</button>
                </div>
                <div>
                    <label for="instrumentLoopStart-${track.id}" class="block text-xs font-medium dark:text-slate-300">Loop Start (s):</label>
                    <input type="number" id="instrumentLoopStart-${track.id}" step="0.001" class="w-full p-1 border rounded text-xs dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
                </div>
                <div>
                    <label for="instrumentLoopEnd-${track.id}" class="block text-xs font-medium dark:text-slate-300">Loop End (s):</label>
                    <input type="number" id="instrumentLoopEnd-${track.id}" step="0.001" class="w-full p-1 border rounded text-xs dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
                </div>
            </div>
             <div class="text-xs font-medium mt-1 dark:text-slate-300">Envelope:</div>
             <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                <div id="instrumentEnvAttack-${track.id}-placeholder"></div>
                <div id="instrumentEnvDecay-${track.id}-placeholder"></div>
                <div id="instrumentEnvSustain-${track.id}-placeholder"></div>
                <div id="instrumentEnvRelease-${track.id}-placeholder"></div>
            </div>
            <div><button id="instrumentPolyphonyToggle-${track.id}" class="text-xs px-2 py-1 border rounded mt-1 dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Mode: Poly</button></div>
        </div>
    </div>`;
}
function initializeSynthSpecificControls(track, winEl) { /* ... content from your file ... */ 
    const engineType = track.synthType || 'MonoSynth';
    const container = winEl.querySelector(`#synthEngineControls-${track.id}`);
    if (container) {
        const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
        definitions.forEach(def => { /* ... */ });
    }
}
function initializeSamplerSpecificControls(track, winEl) { /* ... content from your file ... */ }
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... content from your file ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... content from your file ... */ }

function buildTrackInspectorContentDOM(track) { /* ... content from your file ... */ 
    if (!track) return '<div>Error: Track data not found.</div>';
    let specificControlsHTML = '';
    if (track.type === 'Synth') specificControlsHTML = buildSynthSpecificInspectorDOM(track);
    else if (track.type === 'Sampler') specificControlsHTML = buildSamplerSpecificInspectorDOM(track);
    else if (track.type === 'DrumSampler') specificControlsHTML = buildDrumSamplerSpecificInspectorDOM(track);
    else if (track.type === 'InstrumentSampler') specificControlsHTML = buildInstrumentSamplerSpecificInspectorDOM(track);
    const armedTrackId = localAppServices.getArmedTrackId ? localAppServices.getArmedTrackId() : null;
    let sequencerButtonHTML = '';
    if (track.type !== 'Audio') {
        sequencerButtonHTML = `<button id="openSequencerBtn-${track.id}" class="px-1 py-0.5 border rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-500">Sequencer</button>`;
    }
    let monitorButtonHTML = '';
    if (track.type === 'Audio') {
        monitorButtonHTML = `<button id="inspectorTrackMonitor-${track.id}" title="Toggle Input Monitoring" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${track.isMonitoringEnabled ? 'active' : ''}">Monitor</button>`;
    }
    return `
        <div class="track-inspector-content p-1 space-y-1 text-xs text-gray-700 dark:text-slate-300 overflow-y-auto h-full">
            <div class="common-controls grid ${track.type === 'Audio' ? 'grid-cols-4' : 'grid-cols-3'} gap-1 mb-1">
                <button id="muteBtn-${track.id}" title="Mute Track" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${track.isMuted ? 'muted' : ''}">${track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="soloBtn-${track.id}" title="Solo Track" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${track.isSoloed ? 'soloed' : ''}">${track.isSoloed ? 'Unsolo' : 'Solo'}</button>
                ${monitorButtonHTML}
                <button id="armInputBtn-${track.id}" title="Arm for MIDI/Keyboard Input or Audio Recording" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${armedTrackId === track.id ? 'armed' : ''}">Arm</button>
            </div>
            <div id="volumeKnob-${track.id}-placeholder" class="mb-1"></div>
            <div id="trackMeterContainer-${track.id}" class="h-3 w-full bg-gray-200 dark:bg-slate-600 rounded border border-gray-300 dark:border-slate-500 overflow-hidden my-1">
                <div id="trackMeterBar-${track.id}" class="h-full bg-green-500 transition-all duration-50 ease-linear" style="width: 0%;"></div>
            </div>
            <div id="trackSpecificControls-${track.id}" class="mt-1 border-t dark:border-slate-600 pt-1">${specificControlsHTML}</div>
            <div class="inspector-nav grid ${track.type === 'Audio' ? 'grid-cols-2' : 'grid-cols-3'} gap-1 mt-2">
                <button id="openEffectsBtn-${track.id}" class="px-1 py-0.5 border rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-500">Effects</button>
                ${sequencerButtonHTML}
                <button id="removeTrackBtn-${track.id}" class="px-1 py-0.5 border rounded bg-red-400 hover:bg-red-500 text-white dark:bg-red-600 dark:hover:bg-red-700 dark:border-red-500">Remove</button>
            </div>
        </div>`;
}

function initializeCommonInspectorControls(track, winEl) { /* ... content from your file ... */ }
function initializeTypeSpecificInspectorControls(track, winEl) { /* ... content from your file ... */ }

function buildModularEffectsRackDOM(owner, ownerType = 'track') { /* ... content from your file, including corrected #addMasterEffectBtn ID logic ... */
    const ownerId = (ownerType === 'track' && owner) ? owner.id : 'master';
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    const addButtonId = ownerType === 'master' ? 'addMasterEffectBtn' : `addEffectBtn-${ownerId}`;

    return `<div id="effectsRackContent-${ownerId}" class="p-2 space-y-2 overflow-y-auto h-full">
        <h3 class="text-sm font-semibold dark:text-slate-200">Effects Rack: ${ownerName}</h3>
        <div id="effectsList-${ownerId}" class="space-y-1 min-h-[50px] border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600"></div>
        <button id="${addButtonId}" class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700">Add Effect</button>
        <div id="effectControlsContainer-${ownerId}" class="mt-2 space-y-2"></div>
    </div>`;
}

// THIS IS THE FUNCTION browserCoreUI.js is trying to import
export function openTrackInspectorWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) { console.error(`[UI] Track ${trackId} not found for inspector.`); return null; }

    const windowId = `trackInspector-${trackId}`;
    const openWindows = localAppServices.getOpenWindowsState ? localAppServices.getOpenWindowsState() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const winInstance = openWindows.get(windowId);
        if (winInstance && typeof winInstance.restore === 'function') winInstance.restore();
        return winInstance;
    }

    const contentDOM = buildTrackInspectorContentDOM(track); // Uses localAppServices
    const inspectorOptions = { width: 320, height: 450, minWidth: 280, minHeight: 350, initialContentKey: windowId };
    if (savedState) Object.assign(inspectorOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

    const inspectorWindow = localAppServices.createWindow(windowId, `Inspector: ${track.name}`, contentDOM, inspectorOptions);

    if (inspectorWindow?.element) {
        initializeCommonInspectorControls(track, inspectorWindow.element); // Uses localAppServices
        initializeTypeSpecificInspectorControls(track, inspectorWindow.element); // Uses localAppServices
    }
    return inspectorWindow;
}


export function openTrackEffectsRackWindow(trackId, savedState = null) { 
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) return null;
    const windowId = `effectsRack-${trackId}`;
    if (!savedState && localAppServices.getWindowById && localAppServices.getWindowById(windowId)?.element) {
        localAppServices.getWindowById(windowId).focus();
        return localAppServices.getWindowById(windowId);
    }
    const contentDOM = buildModularEffectsRackDOM(track, 'track');
    const options = { width: 350, height: 400, minWidth:300, minHeight:250, initialContentKey: windowId };
    if (savedState) Object.assign(options, savedState); // Simplified state application
    
    const rackWindow = localAppServices.createWindow(windowId, `Effects: ${track.name}`, contentDOM, options);

    if (rackWindow?.element) {
        const addBtn = rackWindow.element.querySelector(`#addEffectBtn-${track.id}`);
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if(localAppServices.showAddEffectModal) localAppServices.showAddEffectModal(track, 'track');
            });
        } else {
            console.warn(`[InspectorEffectsUI] Add effect button for track ${trackId} not found in rack window.`);
        }
        const listDiv = rackWindow.element.querySelector(`#effectsList-${trackId}`);
        const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-${track.id}`);
        renderEffectsList(track, 'track', listDiv, controlsContainer);
    }
    return rackWindow;
}

export function openMasterEffectsRackWindow(savedState = null) {
    const windowId = 'masterEffectsRack';
    if (!savedState && localAppServices.getWindowById && localAppServices.getWindowById(windowId)?.element) {
        localAppServices.getWindowById(windowId).focus();
        return localAppServices.getWindowById(windowId);
    }
    const contentDOM = buildModularEffectsRackDOM(null, 'master'); // owner is null for master
    const options = { width: 350, height: 400, minWidth:300, minHeight:250, initialContentKey: windowId };
    if (savedState) Object.assign(options, savedState);

    const rackWindow = localAppServices.createWindow(windowId, 'Master Effects', contentDOM, options);
    if (rackWindow?.element) {
        // Use the ID defined in buildModularEffectsRackDOM for master
        const addBtn = rackWindow.element.querySelector(`#addMasterEffectBtn`); 
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if(localAppServices.showAddEffectModal) localAppServices.showAddEffectModal(null, 'master');
            });
        } else {
            // This was the source of a previous error, ensure the ID matches if it recurs
            console.error(`[InspectorEffectsUI] Add Master Effect button ('#addMasterEffectBtn') not found.`);
        }
        const listDiv = rackWindow.element.querySelector(`#effectsList-master`);
        const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-master`);
        renderEffectsList(null, 'master', listDiv, controlsContainer);
    }
    return rackWindow;
}

export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... content from your file ... */ }
export function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... content from your file ... */ }
export function drawWaveform(track) { /* ... content from your file ... */ }
export function drawInstrumentWaveform(track) { /* ... content from your file ... */ }
export function renderSamplePads(track) { /* ... content from your file ... */ }
export function updateSliceEditorUI(track) { /* ... content from your file ... */ }
export function renderDrumSamplerPads(track, optPadIndexToSelect) { /* ... content from your file ... */ }
export function updateDrumPadControlsUI(track, padIndex) { /* ... content from your file ... */ }
