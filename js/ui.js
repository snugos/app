// js/ui.js - Main UI Orchestration and Window Management
import { SnugWindow } from './SnugWindow.js';
import { showNotification, createDropZoneHTML, setupGenericDropZoneListeners, showCustomModal, createContextMenu, showConfirmationDialog } from './utils.js';
import * as Constants from './constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, 
    handleOpenPianoRoll as handleOpenSequencer
} from './eventHandlers.js';

let localAppServices = {};

export function initializeUIModule(appServicesFromMain) {
    localAppServices = { ...localAppServices, ...appServicesFromMain };
    if (!localAppServices.effectsRegistryAccess) {
        localAppServices.effectsRegistryAccess = {
            AVAILABLE_EFFECTS: {},
            getEffectParamDefinitions: () => [],
            getEffectDefaultParams: () => ({}),
            synthEngineControlDefinitions: {}
        };
    }
}

export function createKnob(options) {
    const container = document.createElement('div');
    container.className = 'knob-container';

    const labelEl = document.createElement('div');
    labelEl.className = 'knob-label';
    labelEl.textContent = options.label || '';
    labelEl.title = options.label || '';
    container.appendChild(labelEl);

    const knobEl = document.createElement('div');
    knobEl.className = 'knob';
    const handleEl = document.createElement('div');
    handleEl.className = 'knob-handle';
    knobEl.appendChild(handleEl);
    container.appendChild(knobEl);

    const valueEl = document.createElement('div');
    valueEl.className = 'knob-value';
    container.appendChild(valueEl);

    let currentValue = options.initialValue === undefined ? (options.min !== undefined ? options.min : 0) : options.initialValue;
    const min = options.min === undefined ? 0 : options.min;
    const max = options.max === undefined ? 100 : options.max;
    const step = options.step === undefined ? 1 : options.step;
    const range = max - min;
    const maxDegrees = options.maxDegrees || 270;
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
        if (step !== 0) boundedValue = Math.round(boundedValue / step) * step;
        const oldValue = currentValue;
        currentValue = Math.min(max, Math.max(min, boundedValue));
        updateKnobVisual(options.disabled);
        if (triggerCallback && options.onValueChange && (oldValue !== currentValue || fromInteraction) ) {
            options.onValueChange(currentValue, oldValue, fromInteraction);
        }
    }

    function handleInteraction(e, isTouch = false) {
        e.preventDefault();
        initialValueBeforeInteraction = currentValue;
        const startY = isTouch ? e.touches[0].clientY : e.clientY;
        const startValue = currentValue;
        const pixelsForFullRange = isTouch ? 450 : 300;
        function onMove(moveEvent) {
            const currentY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
            const deltaY = startY - moveEvent.clientY;
            let valueChange = (deltaY / pixelsForFullRange) * range;
            setValue(startValue + valueChange, true, true);
        }
        function onEnd() {
            document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
            document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
            if (currentValue !== initialValueBeforeInteraction && localAppServices.captureStateForUndo) {
                localAppServices.captureStateForUndo(`Change ${options.label} to ${valueEl.textContent}`);
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

export function openTrackInspectorWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById(trackId);
    if (!track) {
        console.error(`[UI] Track ${trackId} not found for inspector.`);
        return null;
    }

    const windowId = `trackInspector-${trackId}`;
    const openWindows = localAppServices.getOpenWindows();

    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore();
        return openWindows.get(windowId);
    }

    const contentDOM = buildTrackInspectorContentDOM(track);
    const inspectorOptions = {
        width: 320,
        height: 450,
        minWidth: 280,
        minHeight: 350,
        initialContentKey: windowId,
    };

    if (savedState) {
        Object.assign(inspectorOptions, savedState);
    }

    const inspectorWindow = localAppServices.createWindow(
        windowId,
        `Inspector: ${track.name}`,
        contentDOM,
        inspectorOptions
    );

    if (inspectorWindow && inspectorWindow.element) {
        initializeCommonInspectorControls(track, inspectorWindow.element);
        initializeTypeSpecificInspectorControls(track, inspectorWindow.element);
    }
    return inspectorWindow;
}

function buildTrackInspectorContentDOM(track) {
    if (!track) return '<div>Error: Track data not found.</div>';
    let specificControlsHTML = '';
    if (track.type === 'Synth') specificControlsHTML = buildSynthSpecificInspectorDOM(track);
    else if (track.type === 'Sampler') specificControlsHTML = buildSamplerSpecificInspectorDOM(track);
    else if (track.type === 'DrumSampler') specificControlsHTML = buildDrumSamplerSpecificInspectorDOM(track);
    else if (track.type === 'InstrumentSampler') specificControlsHTML = buildInstrumentSamplerSpecificInspectorDOM(track);

    const armedTrackId = localAppServices.getArmedTrackId();
    let sequencerButtonHTML = '';
    if (track.type !== 'Audio') {
        sequencerButtonHTML = `<button id="openSequencerBtn-${track.id}" class="px-1 py-0.5 border rounded">Sequencer</button>`;
    }

    return `
        <div class="track-inspector-content p-1 space-y-1 text-xs">
            <div class="common-controls grid grid-cols-3 gap-1 mb-1">
                <button id="muteBtn-${track.id}" class="${track.isMuted ? 'muted' : ''}">${track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="soloBtn-${track.id}" class="${track.isSoloed ? 'soloed' : ''}">${track.isSoloed ? 'Unsolo' : 'Solo'}</button>
                <button id="armInputBtn-${track.id}" class="${armedTrackId === track.id ? 'armed' : ''}">Arm</button>
            </div>
            <div id="volumeKnob-${track.id}-placeholder" class="mb-1"></div>
            <div class="type-specific-controls mt-1 border-t pt-1">${specificControlsHTML}</div>
            <div class="inspector-nav grid grid-cols-3 gap-1 mt-2">
                <button id="openEffectsBtn-${track.id}">Effects</button>
                ${sequencerButtonHTML}
                <button id="removeTrackBtn-${track.id}">Remove</button>
            </div>
        </div>`;
}

function initializeCommonInspectorControls(track, winEl) {
    winEl.querySelector(`#muteBtn-${track.id}`)?.addEventListener('click', () => handleTrackMute(track.id));
    winEl.querySelector(`#soloBtn-${track.id}`)?.addEventListener('click', () => handleTrackSolo(track.id));
    winEl.querySelector(`#armInputBtn-${track.id}`)?.addEventListener('click', () => handleTrackArm(track.id));
    winEl.querySelector(`#removeTrackBtn-${track.id}`)?.addEventListener('click', () => handleRemoveTrack(track.id));
    winEl.querySelector(`#openEffectsBtn-${track.id}`)?.addEventListener('click', () => handleOpenEffectsRack(track.id));
    winEl.querySelector(`#openSequencerBtn-${track.id}`)?.addEventListener('click', () => handleOpenSequencer(track.id));

    const volumeKnobPlaceholder = winEl.querySelector(`#volumeKnob-${track.id}-placeholder`);
    if (volumeKnobPlaceholder) {
        const knob = createKnob({
            label: 'Volume',
            min: 0,
            max: 1.2,
            step: 0.01,
            initialValue: track.previousVolumeBeforeMute,
            onValueChange: (val, o, fromInteraction) => track.setVolume(val, fromInteraction)
        });
        volumeKnobPlaceholder.appendChild(knob.element);
        track.inspectorControls.volume = knob;
    }
}
function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') {
        initializeSynthSpecificControls(track, winEl);
    } else if (track.type === 'Sampler') {
        initializeSamplerSpecificControls(track, winEl);
    } else if (track.type === 'DrumSampler') {
        initializeDrumSamplerSpecificControls(track, winEl);
    } else if (track.type === 'InstrumentSampler') {
        initializeInstrumentSamplerSpecificControls(track, winEl);
    }
}

function buildSynthSpecificInspectorDOM(track) {
    const engineType = track.synthEngineType || 'MonoSynth';
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    let controlsHTML = `<div id="synthEngineControls-${track.id}" class="grid grid-cols-2 md:grid-cols-3 gap-2 p-1">`;
    definitions.forEach(def => {
        controlsHTML += `<div id="${def.idPrefix}-${track.id}-placeholder"></div>`;
    });
    controlsHTML += `</div>`;
    return controlsHTML;
}

function buildSamplerSpecificInspectorDOM(track) {
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

function buildDrumSamplerSpecificInspectorDOM(track) {
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
            <div class="text-xs font-medium mt-2 pt-1 border-t dark:border-slate-600 dark:text-slate-300">Auto-Stretch:</div>
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 items-center text-xs">
                <button id="drumPadAutoStretchToggle-${track.id}" class="px-1.5 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Stretch: OFF</button>
                <div>
                    <label for="drumPadStretchBPM-${track.id}" class="block text-[10px] font-medium dark:text-slate-400">Orig. BPM:</label>
                    <input type="number" id="drumPadStretchBPM-${track.id}" step="0.1" class="w-full p-0.5 border rounded text-[10px] dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
                </div>
                <div>
                    <label for="drumPadStretchBeats-${track.id}" class="block text-[10px] font-medium dark:text-slate-400">Beats:</label>
                    <input type="number" id="drumPadStretchBeats-${track.id}" step="0.01" class="w-full p-0.5 border rounded text-[10px] dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
                </div>
            </div>
         </div>
        <div id="drumPadsGridContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
    </div>`;
}

function buildInstrumentSamplerSpecificInspectorDOM(track) {
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

function initializeSynthSpecificInspectorDOM(track, winEl) {
    const engineType = track.synthEngineType || 'MonoSynth';
    const container = winEl.querySelector(`#synthEngineControls-${track.id}`);
    if (container) {
        buildSynthEngineControls(track, container, engineType);
    }
}

function initializeSamplerSpecificInspectorDOM(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-sampler`);
    if (dzContainerEl) {
        const existingAudioData = { originalFileName: track.samplerAudioData.fileName, status: track.samplerAudioData.status || (track.samplerAudioData.fileName ? 'missing' : 'empty') };
        dzContainerEl.innerHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler', null, existingAudioData);
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        const fileInputEl = dzContainerEl.querySelector(`#fileInput-${track.id}`);
        if (dzEl) setupGenericDropZoneListeners(dzEl, track.id, 'Sampler', null, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadSampleFile);
        if (fileInputEl) fileInputEl.onchange = (e) => { localAppServices.loadSampleFile(e, track.id, 'Sampler'); };
    }
    renderSamplePads(track);
    const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`);
    if (canvas) {
        track.waveformCanvasCtx = canvas.getContext('2d');
        if(track.audioBuffer?.loaded) drawWaveform(track);
    }
    updateSliceEditorUI(track);

    const createAndPlaceKnob = (placeholderId, options) => {
        const placeholder = winEl.querySelector(`#${placeholderId}`);
        if (placeholder) {
            const knob = createKnob(options);
            placeholder.innerHTML = ''; placeholder.appendChild(knob.element); return knob;
        }
        return null;
    };
    const selectedSlice = track.slices[track.selectedSliceForEdit] || track.slices[0] || { volume: 0.7, pitchShift: 0, envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 } };
    track.inspectorControls.sliceVolume = createAndPlaceKnob(`sliceVolumeSlider-${track.id}-placeholder`, { label: 'Vol', min:0, max:1, step:0.01, initialValue: selectedSlice.volume, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceVolume(track.selectedSliceForEdit, val)});
    track.inspectorControls.slicePitch = createAndPlaceKnob(`slicePitchKnob-${track.id}-placeholder`, { label: 'Pitch', min:-24, max:24, step:1, initialValue: selectedSlice.pitchShift, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setSlicePitchShift(track.selectedSliceForEdit, val)});
    track.inspectorControls.sliceEnvAttack = createAndPlaceKnob(`sliceEnvAttackSlider-${track.id}-placeholder`, { label: 'Attack', min:0.001, max:1, step:0.001, initialValue: selectedSlice.envelope.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'attack', val)});
    track.inspectorControls.sliceEnvDecay = createAndPlaceKnob(`sliceEnvDecaySlider-${track.id}-placeholder`, { label: 'Decay', min:0.01, max:1, step:0.01, initialValue: selectedSlice.envelope.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'decay', val)});
    track.inspectorControls.sliceEnvSustain = createAndPlaceKnob(`sliceEnvSustainSlider-${track.id}-placeholder`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: selectedSlice.envelope.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'sustain', val)});
    track.inspectorControls.sliceEnvRelease = createAndPlaceKnob(`sliceEnvReleaseSlider-${track.id}-placeholder`, { label: 'Release', min:0.01, max:2, step:0.01, initialValue: selectedSlice.envelope.release, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'release', val)});

    winEl.querySelector(`#sliceLoopToggle-${track.id}`)?.addEventListener('click', (e) => { /* ... */ });
    winEl.querySelector(`#sliceReverseToggle-${track.id}`)?.addEventListener('click', (e) => { /* ... */ });
    winEl.querySelector(`#slicerPolyphonyToggle-${track.id}`)?.addEventListener('click', () => { /* ... */ });
}

function initializeDrumSamplerSpecificInspectorDOM(track, winEl) {
    renderDrumSamplerPads(track);
    updateDrumPadControlsUI(track);
}

function initializeInstrumentSamplerSpecificInspectorDOM(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler`);
    if(dzContainerEl) {
        const existingAudioData = { originalFileName: track.instrumentSamplerSettings.originalFileName, status: track.instrumentSamplerSettings.status || (track.instrumentSamplerSettings.originalFileName ? 'missing' : 'empty') };
        dzContainerEl.innerHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler', null, existingAudioData);
    }
    const canvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if (canvas) {
        track.instrumentWaveformCanvasCtx = canvas.getContext('2d');
        if(track.instrumentSamplerSettings.audioBuffer?.loaded) drawInstrumentWaveform(track);
    }
}
export function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById(trackId);
    if (!track) return null;
    const windowId = `effectsRack-${trackId}`;
    if (localAppServices.getOpenWindows().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore();
        return;
    }
    const contentDOM = buildModularEffectsRackDOM(track, 'track');
    const rackWindow = localAppServices.createWindow(windowId, `Effects: ${track.name}`, contentDOM, {
        width: 350,
        height: 400,
        minWidth: 300,
        minHeight: 250,
        initialContentKey: windowId
    });
    if (rackWindow?.element) {
        const listDiv = rackWindow.element.querySelector(`#effectsList-${track.id}`);
        const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-${track.id}`);
        renderEffectsList(track, 'track', listDiv, controlsContainer);
        rackWindow.element.querySelector(`#addEffectBtn-${track.id}`)?.addEventListener('click', () => showAddEffectModal(track, 'track'));
    }
    return rackWindow;
}

export function openMasterEffectsRackWindow(savedState = null) {
    const windowId = 'masterEffectsRack';
    if (localAppServices.getOpenWindows().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore();
        return;
    }
    const contentDOM = buildModularEffectsRackDOM(null, 'master');
    const rackWindow = localAppServices.createWindow(windowId, 'Master Effects Rack', contentDOM, {
        width: 350,
        height: 400,
        minWidth: 300,
        minHeight: 250,
        initialContentKey: windowId
    });
    if (rackWindow?.element) {
        const listDiv = rackWindow.element.querySelector('#effectsList-master');
        const controlsContainer = rackWindow.element.querySelector('#effectControlsContainer-master');
        renderEffectsList(null, 'master', listDiv, controlsContainer);
        rackWindow.element.querySelector('#addEffectBtn-master')?.addEventListener('click', () => showAddEffectModal(null, 'master'));
    }
    return rackWindow;
}

export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    if (!listDiv) return;
    listDiv.innerHTML = '';
    const effectsArray = (ownerType === 'track') ? owner.activeEffects : localAppServices.getMasterEffects();
    if (!effectsArray || effectsArray.length === 0) {
        listDiv.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic">No effects added.</p>';
        if (controlsContainer) controlsContainer.innerHTML = '';
        return;
    }
    const AVAILABLE_EFFECTS = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
    effectsArray.forEach((effect) => {
        const displayName = AVAILABLE_EFFECTS[effect.type]?.displayName || effect.type;
        const item = document.createElement('div');
        item.className = 'effect-item flex justify-between items-center p-1 border-b bg-white dark:bg-slate-800 dark:border-slate-700 rounded-sm shadow-xs text-xs';
        item.innerHTML = `<span class="effect-name flex-grow cursor-pointer hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400" title="Edit ${displayName}">${displayName}</span>
            <button class="remove-btn text-xs px-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remove Effect">✕</button>`;
        item.querySelector('.effect-name').addEventListener('click', () => {
            renderEffectControls(owner, ownerType, effect.id, controlsContainer);
            listDiv.querySelectorAll('.bg-blue-100').forEach(el => el.classList.remove('bg-blue-100', 'dark:bg-blue-700'));
            item.classList.add('bg-blue-100', 'dark:bg-blue-700');
        });
        item.querySelector('.remove-btn').addEventListener('click', () => {
            if (ownerType === 'track') owner.removeEffect(effect.id);
            else localAppServices.removeMasterEffect(effect.id);
        });
        listDiv.appendChild(item);
    });
}

export function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    const effectsArray = (ownerType === 'track') ? owner.activeEffects : localAppServices.getMasterEffects();
    const effectWrapper = effectsArray.find(e => e.id === effectId);
    if (!effectWrapper) {
        controlsContainer.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic">Select an effect to see its controls.</p>';
        return;
    }
    const effectDef = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS[effectWrapper.type];
    if (!effectDef) return;
    const titleEl = document.createElement('h4');
    titleEl.textContent = `Controls: ${effectDef.displayName}`;
    controlsContainer.appendChild(titleEl);
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 border rounded';
    if (!effectDef.params || effectDef.params.length === 0) {
        gridContainer.innerHTML = '<p>No adjustable parameters.</p>';
    } else {
        effectDef.params.forEach(paramDef => {
            const controlWrapper = document.createElement('div');
            let currentValue = effectWrapper.params[paramDef.key];
            if (paramDef.type === 'knob') {
                const knob = createKnob({
                    label: paramDef.label, min: paramDef.min, max: paramDef.max, step: paramDef.step, initialValue: currentValue,
                    onValueChange: (val) => {
                        if (ownerType === 'track') owner.updateEffectParam(effectId, paramDef.key, val);
                        else localAppServices.updateMasterEffectParam(effectId, paramDef.key, val);
                    }
                });
                controlWrapper.appendChild(knob.element);
            }
            gridContainer.appendChild(controlWrapper);
        });
    }
    controlsContainer.appendChild(gridContainer);
}

function showAddEffectModal(owner, ownerType) {
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    let modalContentHTML = `<div class="max-h-60 overflow-y-auto"><ul class="list-none p-0 m-0">`;
    const AVAILABLE_EFFECTS = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
    for (const effectKey in AVAILABLE_EFFECTS) {
        modalContentHTML += `<li class="p-1.5 hover:bg-blue-700 cursor-pointer" data-effect-type="${effectKey}">${AVAILABLE_EFFECTS[effectKey].displayName}</li>`;
    }
    modalContentHTML += `</ul></div>`;
    const modal = showCustomModal(`Add Effect to ${ownerName}`, modalContentHTML, [], 'add-effect-modal');
    if (modal?.contentDiv) {
        modal.contentDiv.querySelectorAll('li[data-effect-type]').forEach(item => {
            item.addEventListener('click', () => {
                const effectType = item.dataset.effectType;
                if (ownerType === 'track') owner.addEffect(effectType);
                else localAppServices.addMasterEffect(effectType);
                modal.overlay.remove();
            });
        });
    }
}

export function openMixerWindow(savedState = null) {
    const windowId = 'mixer';
    if (localAppServices.getOpenWindows().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore(); return;
    }
    const contentContainer = document.createElement('div');
    contentContainer.id = 'mixerContentContainer';
    const mixerWindow = localAppServices.createWindow(windowId, 'Mixer', contentContainer, {});
    if (mixerWindow?.element) updateMixerWindow();
}

export function updateMixerWindow() {
    const mixerWindow = localAppServices.getWindowById('mixer');
    if (!mixerWindow?.element || mixerWindow.isMinimized) return;
    const container = mixerWindow.element.querySelector('#mixerContentContainer');
    if (container) renderMixer(container);
}

export function renderMixer(container) {
    if (!container) return;
    container.innerHTML = '';
    getTracksState().forEach(track => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'mixer-track';
        trackDiv.innerHTML = `<div class="track-name">${track.name}</div>`;
        container.appendChild(trackDiv);
    });
}

export function drawWaveform(track) {
    if (!track?.waveformCanvasCtx || !track.audioBuffer?.loaded) return;
    const canvas = track.waveformCanvasCtx.canvas; const ctx = track.waveformCanvasCtx;
    const buffer = track.audioBuffer.get(); const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width); const amp = canvas.height / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.beginPath();
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0, max = -1.0;
        for (let j = 0; j < step; j++) { const datum = data[(i * step) + j]; if (datum < min) min = datum; if (datum > max) max = datum; }
        ctx.moveTo(i, (1 + min) * amp); ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();
}

export function drawInstrumentWaveform(track) {
    if (!track?.instrumentWaveformCanvasCtx || !track.instrumentSamplerSettings.audioBuffer?.loaded) return;
    const canvas = track.instrumentWaveformCanvasCtx.canvas; const ctx = track.instrumentWaveformCanvasCtx;
    const buffer = track.instrumentSamplerSettings.audioBuffer.get(); const data = buffer.getChannelData(0);
    // ... drawing logic here ...
}

export function renderSamplePads(track) {
    const inspector = localAppServices.getWindowById(`trackInspector-${track.id}`)?.element;
    if (!inspector || track.type !== 'Sampler') return;
    const padsContainer = inspector.querySelector(`#samplePadsContainer-${track.id}`);
    if (!padsContainer) return; padsContainer.innerHTML = '';
    track.slices.forEach((slice, index) => {
        const pad = document.createElement('button');
        pad.className = `pad-button ${track.selectedSliceForEdit === index ? 'selected-for-edit' : ''}`;
        pad.innerHTML = `<span class="pad-number">${index + 1}</span>`;
        pad.disabled = !track.audioBuffer?.loaded || slice.duration <= 0;
        pad.addEventListener('click', () => { track.selectedSliceForEdit = index; localAppServices.playSlicePreview?.(track.id, index); renderSamplePads(track); updateSliceEditorUI(track); });
        padsContainer.appendChild(pad);
    });
}

export function updateSliceEditorUI(track) {
    const inspector = localAppServices.getWindowById(`trackInspector-${track.id}`)?.element;
    if (!inspector || track.type !== 'Sampler' || !track.slices?.length) return;
    const selectedInfo = inspector.querySelector(`#selectedSliceInfo-${track.id}`);
    if (selectedInfo) selectedInfo.textContent = track.selectedSliceForEdit + 1;
    const slice = track.slices[track.selectedSliceForEdit]; if (!slice) return;
    if (track.inspectorControls.sliceVolume) track.inspectorControls.sliceVolume.setValue(slice.volume || 0.7);
    if (track.inspectorControls.slicePitch) track.inspectorControls.slicePitch.setValue(slice.pitchShift || 0);
}

export function renderDrumSamplerPads(track) {
    const inspector = localAppServices.getWindowById(`trackInspector-${track.id}`)?.element;
    if (!inspector || track.type !== 'DrumSampler') return;
    const padsContainer = inspector.querySelector(`#drumPadsGridContainer-${track.id}`);
    if (!padsContainer) return; padsContainer.innerHTML = '';
    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button');
        padEl.className = `pad-button ${track.selectedDrumPadForEdit === index ? 'selected-for-edit' : ''}`;
        padEl.innerHTML = `<span class="pad-number">${index + 1}</span><span class="pad-label">${padData.originalFileName ? padData.originalFileName.split('.')[0] : ''}</span>`;
        padEl.addEventListener('click', () => { track.selectedDrumPadForEdit = index; localAppServices.playDrumSamplerPadPreview?.(track.id, index); renderDrumSamplerPads(track); updateDrumPadControlsUI(track); });
        padsContainer.appendChild(padEl);
    });
}

export function updateDrumPadControlsUI(track) {
    const inspector = localAppServices.getWindowById(`trackInspector-${track.id}`)?.element;
    if (!inspector || track.type !== 'DrumSampler') return;
    const editorContainer = inspector.querySelector(`#drum-pad-editor-container-${track.id}`); if (!editorContainer) return;
    const selectedPadIndex = track.selectedDrumPadForEdit; const padData = track.drumSamplerPads[selectedPadIndex]; if (!padData) return;
    editorContainer.innerHTML = `<h4>Edit Pad: ${selectedPadIndex + 1}</h4>`;
    const dzHTML = createDropZoneHTML(track.id, `drumPadFileInput-${track.id}-${selectedPadIndex}`, 'DrumSampler', selectedPadIndex, padData);
    editorContainer.innerHTML += dzHTML;
}

export function openPianoRollWindow() {}
export function updateSequencerCellUI() {}
export function highlightPlayingStep() {}
