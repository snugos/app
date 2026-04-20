// js/ui.js - UI Module (v2025.02)
// Last updated: Fixed timeline clip context menu
import { SnugWindow } from './SnugWindow.js';
// Added showConfirmationDialog to the import statement
import { showNotification, createDropZoneHTML, setupGenericDropZoneListeners, showCustomModal, createContextMenu, showConfirmationDialog } from './utils.js';
import * as Constants from './constants.js';
// Event handlers are now mostly called via appServices from main.js,
// but direct calls might still exist or be transitioned.
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from './eventHandlers.js';
import { getTracksState } from './state.js';


// Module-level state for appServices, to be set by main.js
let localAppServices = {};
let selectedSoundForPreviewData = null; // Holds data for the sound selected for preview

export function initializeUIModule(appServicesFromMain) {
    localAppServices = { ...localAppServices, ...appServicesFromMain };

    if (!localAppServices.getSelectedSoundForPreview) {
        localAppServices.getSelectedSoundForPreview = () => selectedSoundForPreviewData;
    }
    if (!localAppServices.setSelectedSoundForPreview) {
        localAppServices.setSelectedSoundForPreview = (data) => {
            selectedSoundForPreviewData = data;
        };
    }

    if (!localAppServices.effectsRegistryAccess) {
        console.warn("[UI Module] effectsRegistryAccess not found in appServices. Effect-related UI might be limited.");
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
    const BASE_PIXELS_PER_FULL_RANGE_MOUSE = 300;
    const BASE_PIXELS_PER_FULL_RANGE_TOUCH = 450;
    let initialValueBeforeInteraction = currentValue;

    function updateKnobVisual() {
        const percentage = range === 0 ? 0 : (currentValue - min) / range;
        const rotation = (percentage * maxDegrees) - (maxDegrees / 2);
        handleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        
        // Display as dB if requested (Ableton-style)
        if (options.displayAsDb) {
            if (currentValue <= 0.0001) {
                valueEl.textContent = '-∞';
            } else {
                const dbValue = 20 * Math.log10(currentValue);
                valueEl.textContent = dbValue.toFixed(1);
            }
        } else {
            valueEl.textContent = typeof currentValue === 'number' ? currentValue.toFixed(options.decimals !== undefined ? options.decimals : (step < 1 && step !== 0 ? 2 : 0)) : currentValue;
            if (options.displaySuffix) valueEl.textContent += options.displaySuffix;
        }
    }

    function setValue(newValue, triggerCallback = true, fromInteraction = false) {
        const numValue = parseFloat(newValue);
        if (isNaN(numValue)) return;
        let boundedValue = Math.min(max, Math.max(min, numValue));
        if (step !== 0) boundedValue = Math.round(boundedValue / step) * step;
        boundedValue = Math.min(max, Math.max(min, boundedValue));
        const oldValue = currentValue;
        currentValue = boundedValue;
        updateKnobVisual();
        if (triggerCallback && options.onValueChange && (oldValue !== currentValue || fromInteraction) ) {
            options.onValueChange(currentValue, oldValue, fromInteraction);
        }
    }

    function handleInteraction(e, isTouch = false) {
        e.preventDefault();
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
            if (currentValue !== initialValueBeforeInteraction && localAppServices.captureStateForUndo) {
                let description = `Change ${options.label || 'knob'} to ${valueEl.textContent}`;
                if (options.trackRef && options.trackRef.name) {
                    description = `Change ${options.label || 'knob'} for ${options.trackRef.name} to ${valueEl.textContent}`;
                }
                localAppServices.captureStateForUndo(description);
            }
        }
        document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, { passive: !isTouch });
        document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
    }
    knobEl.addEventListener('mousedown', (e) => handleInteraction(e, false));
    knobEl.addEventListener('touchstart', (e) => handleInteraction(e, true), { passive: false });
    setValue(currentValue, false); // Initialize visual
    return { element: container, setValue, getValue: () => currentValue, type: 'knob', refreshVisuals: updateKnobVisual };
}

// --- Specific Inspector DOM Builders ---
function buildSynthSpecificInspectorDOM(track) {
    const engineType = track.synthEngineType || 'MonoSynth';
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    let controlsHTML = `<div id="synthEngineControls-${track.id}" class="grid grid-cols-2 md:grid-cols-3 gap-2 p-1">`;
    definitions.forEach(def => { controlsHTML += `<div id="${def.idPrefix}-${track.id}-placeholder"></div>`; });
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
                    <select id="instrumentRootNote-${track.id}" class="w-full p-1 border rounded text-xs bg-gray-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-600"></select>
                </div>
                <div>
                    <label for="instrumentLoopToggle-${track.id}" class="block text-xs font-medium dark:text-slate-300">Loop:</label>
                    <button id="instrumentLoopToggle-${track.id}" class="px-2 py-1 text-xs border rounded w-full dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Loop: OFF</button>
                </div>
                <div>
                    <label for="instrumentLoopStart-${track.id}" class="block text-xs font-medium dark:text-slate-300">Loop Start (s):</label>
                    <input type="number" id="instrumentLoopStart-${track.id}" step="0.001" class="w-full p-1 border rounded text-xs bg-gray-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
                </div>
                <div>
                    <label for="instrumentLoopEnd-${track.id}" class="block text-xs font-medium dark:text-slate-300">Loop End (s):</label>
                    <input type="number" id="instrumentLoopEnd-${track.id}" step="0.001" class="w-full p-1 border rounded text-xs bg-gray-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
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

// --- Specific Inspector Control Initializers ---
function buildSynthEngineControls(track, container, engineType) {
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    definitions.forEach(def => {
        const placeholder = container.querySelector(`#${def.idPrefix}-${track.id}-placeholder`);
        if (!placeholder) return;
        let initialValue;
        const pathParts = def.path.split('.');
        let currentValObj = track.synthParams;
        for (const key of pathParts) {
            if (currentValObj && typeof currentValObj === 'object' && key in currentValObj) {
                currentValObj = currentValObj[key];
            } else { currentValObj = undefined; break; }
        }
        initialValue = (currentValObj !== undefined) ? currentValObj : def.defaultValue;
        if (def.path.endsWith('.value') && track.instrument?.get) { // For Tone.Signal parameters
            const signalPath = def.path.substring(0, def.path.lastIndexOf('.value'));
            const signalValue = track.instrument.get(signalPath)?.value;
            if (signalValue !== undefined) initialValue = signalValue;
        }

        if (def.type === 'knob') {
            const knob = createKnob({ label: def.label, min: def.min, max: def.max, step: def.step, initialValue, decimals: def.decimals, displaySuffix: def.displaySuffix, trackRef: track, onValueChange: (val) => track.setSynthParam(def.path, val) });
            placeholder.innerHTML = ''; placeholder.appendChild(knob.element); track.inspectorControls[def.idPrefix] = knob;
        } else if (def.type === 'select') {
            const selectEl = document.createElement('select');
            selectEl.id = `${def.idPrefix}-${track.id}`;
            selectEl.className = 'synth-param-select w-full p-1 border rounded text-xs bg-gray-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600';
            def.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = typeof opt === 'object' ? opt.value : opt; option.textContent = typeof opt === 'object' ? opt.text : opt;
                selectEl.appendChild(option);
            });
            selectEl.value = initialValue;
            selectEl.addEventListener('change', (e) => {
                if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Change ${def.label} for ${track.name} to ${e.target.value}`);
                track.setSynthParam(def.path, e.target.value);
            });
            const labelEl = document.createElement('label');
            labelEl.htmlFor = selectEl.id; labelEl.textContent = def.label + ':';
            labelEl.className = 'text-xs block mb-0.5 dark:text-slate-300';
            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'flex flex-col items-start'; wrapperDiv.appendChild(labelEl); wrapperDiv.appendChild(selectEl);
            placeholder.innerHTML = ''; placeholder.appendChild(wrapperDiv); track.inspectorControls[def.idPrefix] = selectEl;
        }
    });
}

function initializeSynthSpecificControls(track, winEl) {
    const engineType = track.synthEngineType || 'MonoSynth';
    const container = winEl.querySelector(`#synthEngineControls-${track.id}`);
    if (container) {
        buildSynthEngineControls(track, container, engineType);
    }
}

function initializeSamplerSpecificControls(track, winEl) {
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

    const loopToggleBtn = winEl.querySelector(`#sliceLoopToggle-${track.id}`);
    if (loopToggleBtn) {
        loopToggleBtn.textContent = selectedSlice.loop ? 'Loop: ON' : 'Loop: OFF';
        loopToggleBtn.classList.toggle('active', selectedSlice.loop);
        loopToggleBtn.addEventListener('click', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Loop for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
            const currentSlice = track.slices[track.selectedSliceForEdit];
            track.setSliceLoop(track.selectedSliceForEdit, !currentSlice.loop);
            e.target.textContent = currentSlice.loop ? 'Loop: ON' : 'Loop: OFF';
            e.target.classList.toggle('active', currentSlice.loop);
        });
    }
    const reverseToggleBtn = winEl.querySelector(`#sliceReverseToggle-${track.id}`);
    if(reverseToggleBtn){
        reverseToggleBtn.textContent = selectedSlice.reverse ? 'Rev: ON' : 'Rev: OFF';
        reverseToggleBtn.classList.toggle('active', selectedSlice.reverse);
        reverseToggleBtn.addEventListener('click', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Reverse for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
            const currentSlice = track.slices[track.selectedSliceForEdit];
            track.setSliceReverse(track.selectedSliceForEdit, !currentSlice.reverse);
            e.target.textContent = currentSlice.reverse ? 'Rev: ON' : 'Rev: OFF';
            e.target.classList.toggle('active', currentSlice.reverse);
        });
    }
    const polyToggleBtn = winEl.querySelector(`#slicerPolyphonyToggle-${track.id}`);
    if (polyToggleBtn) {
        polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
        polyToggleBtn.classList.toggle('active', track.slicerIsPolyphonic);
        polyToggleBtn.addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Slicer Polyphony for ${track.name}`);
            track.slicerIsPolyphonic = !track.slicerIsPolyphonic;
            polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
        polyToggleBtn.classList.toggle('active', track.slicerIsPolyphonic);
            if (!track.slicerIsPolyphonic) track.setupSlicerMonoNodes(); else track.disposeSlicerMonoNodes();
            track.rebuildEffectChain();
            showNotification(`${track.name} slicer mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`, 2000);
        });
    }
}

function initializeDrumSamplerSpecificControls(track, winEl) {
    // First, set up the knobs for the selected drum pad
    const createAndPlaceKnob = (placeholderId, options) => {
        const placeholder = winEl.querySelector(`#${placeholderId}`);
        if (placeholder) {
            const knob = createKnob(options);
            placeholder.innerHTML = '';
            placeholder.appendChild(knob.element);
            return knob;
        }
        return null;
    };
    
    const selectedPadIndex = track.selectedDrumPadForEdit || 0;
    const padData = track.drumSamplerPads?.[selectedPadIndex] || { volume: 0.7, pitchShift: 0, envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 } };
    const env = padData.envelope || { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 };
    
    track.inspectorControls.drumPadVolume = createAndPlaceKnob(`drumPadVolumeKnob-${track.id}-placeholder`, {
        label: 'Volume',
        min: 0, max: 1, step: 0.01,
        initialValue: padData.volume ?? 0.7,
        decimals: 2,
        trackRef: track,
        onValueChange: (val) => track.setDrumSamplerPadVolume(selectedPadIndex, val)
    });
    
    track.inspectorControls.drumPadPitch = createAndPlaceKnob(`drumPadPitchKnob-${track.id}-placeholder`, {
        label: 'Pitch',
        min: -24, max: 24, step: 1,
        initialValue: padData.pitchShift ?? 0,
        decimals: 0,
        displaySuffix: 'st',
        trackRef: track,
        onValueChange: (val) => track.setDrumSamplerPadPitch(selectedPadIndex, val)
    });
    
    track.inspectorControls.drumPadEnvAttack = createAndPlaceKnob(`drumPadEnvAttack-${track.id}-placeholder`, {
        label: 'Attack',
        min: 0.001, max: 2, step: 0.001,
        initialValue: env.attack,
        decimals: 3,
        trackRef: track,
        onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'attack', val)
    });
    
    track.inspectorControls.drumPadEnvDecay = createAndPlaceKnob(`drumPadEnvDecay-${track.id}-placeholder`, {
        label: 'Decay',
        min: 0.01, max: 2, step: 0.01,
        initialValue: env.decay,
        decimals: 2,
        trackRef: track,
        onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'decay', val)
    });
    
    track.inspectorControls.drumPadEnvSustain = createAndPlaceKnob(`drumPadEnvSustain-${track.id}-placeholder`, {
        label: 'Sustain',
        min: 0, max: 1, step: 0.01,
        initialValue: env.sustain,
        decimals: 2,
        trackRef: track,
        onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'sustain', val)
    });
    
    track.inspectorControls.drumPadEnvRelease = createAndPlaceKnob(`drumPadEnvRelease-${track.id}-placeholder`, {
        label: 'Release',
        min: 0.01, max: 2, step: 0.01,
        initialValue: env.release,
        decimals: 2,
        trackRef: track,
        onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'release', val)
    });
    
    // Then render the pads and update the UI
    renderDrumSamplerPads(track);
    updateDrumPadControlsUI(track);
}

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler`);
    if (dzContainerEl) {
        const existingAudioData = { originalFileName: track.instrumentSamplerSettings.originalFileName, status: track.instrumentSamplerSettings.status || (track.instrumentSamplerSettings.originalFileName ? 'missing' : 'empty') };
        dzContainerEl.innerHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler', null, existingAudioData);
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        const fileInputEl = dzContainerEl.querySelector(`#instrumentFileInput-${track.id}`);
        if (dzEl) setupGenericDropZoneListeners(dzEl, track.id, 'InstrumentSampler', null, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadSampleFile);
        if (fileInputEl) fileInputEl.onchange = (e) => { localAppServices.loadSampleFile(e, track.id, 'InstrumentSampler'); };
    }

    const canvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if (canvas) {
        track.instrumentWaveformCanvasCtx = canvas.getContext('2d');
        if(track.instrumentSamplerSettings.audioBuffer?.loaded) drawInstrumentWaveform(track);
    }

    const rootNoteSelect = winEl.querySelector(`#instrumentRootNote-${track.id}`);
    if (rootNoteSelect) {
        Constants.synthPitches.slice().reverse().forEach(pitch => {
            const option = document.createElement('option'); option.value = pitch; option.textContent = pitch; rootNoteSelect.appendChild(option);
        });
        rootNoteSelect.value = track.instrumentSamplerSettings.rootNote || 'C4';
        rootNoteSelect.addEventListener('change', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Root Note for ${track.name} to ${e.target.value}`);
            track.setInstrumentSamplerRootNote(e.target.value);
        });
    }

    const loopToggleBtn = winEl.querySelector(`#instrumentLoopToggle-${track.id}`);
    if (loopToggleBtn) {
        loopToggleBtn.textContent = track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF';
        loopToggleBtn.classList.toggle('active', track.instrumentSamplerSettings.loop);
        loopToggleBtn.addEventListener('click', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Loop for ${track.name}`);
            track.setInstrumentSamplerLoop(!track.instrumentSamplerSettings.loop);
            e.target.textContent = track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF';
            e.target.classList.toggle('active', track.instrumentSamplerSettings.loop);
        });
    }
    const loopStartInput = winEl.querySelector(`#instrumentLoopStart-${track.id}`);
    if (loopStartInput) {
        loopStartInput.value = track.instrumentSamplerSettings.loopStart?.toFixed(3) || '0.000';
        loopStartInput.addEventListener('change', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Loop Start for ${track.name}`);
            track.setInstrumentSamplerLoopStart(parseFloat(e.target.value));
        });
    }
    const loopEndInput = winEl.querySelector(`#instrumentLoopEnd-${track.id}`);
    if (loopEndInput) {
        loopEndInput.value = track.instrumentSamplerSettings.loopEnd?.toFixed(3) || (track.instrumentSamplerSettings.audioBuffer?.duration.toFixed(3) || '0.000');
        loopEndInput.addEventListener('change', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Loop End for ${track.name}`);
            track.setInstrumentSamplerLoopEnd(parseFloat(e.target.value));
        });
    }

    const createAndPlaceKnob = (placeholderId, options) => {
        const placeholder = winEl.querySelector(`#${placeholderId}`);
        if (placeholder) {
            const knob = createKnob(options);
            placeholder.innerHTML = ''; placeholder.appendChild(knob.element); return knob;
        }
        return null;
    };
    const env = track.instrumentSamplerSettings.envelope || { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 };
    track.inspectorControls.instrEnvAttack = createAndPlaceKnob(`instrumentEnvAttack-${track.id}-placeholder`, { label: 'Attack', min:0.001, max:2, step:0.001, initialValue: env.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('attack', val)});
    track.inspectorControls.instrEnvDecay = createAndPlaceKnob(`instrumentEnvDecay-${track.id}-placeholder`, { label: 'Decay', min:0.01, max:2, step:0.01, initialValue: env.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('decay', val)});
    track.inspectorControls.instrEnvSustain = createAndPlaceKnob(`instrumentEnvSustain-${track.id}-placeholder`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: env.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('sustain', val)});
    track.inspectorControls.instrEnvRelease = createAndPlaceKnob(`instrumentEnvRelease-${track.id}-placeholder`, { label: 'Release', min:0.01, max:5, step:0.01, initialValue: env.release, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('release', val)});

    const polyToggleBtnInst = winEl.querySelector(`#instrumentPolyphonyToggle-${track.id}`);
    if (polyToggleBtnInst) {
        polyToggleBtnInst.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
        polyToggleBtnInst.classList.toggle('active', track.instrumentSamplerIsPolyphonic);
        polyToggleBtnInst.addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Instrument Sampler Polyphony for ${track.name}`);
            track.instrumentSamplerIsPolyphonic = !track.instrumentSamplerIsPolyphonic;
            polyToggleBtnInst.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
            polyToggleBtnInst.classList.toggle('active', track.instrumentSamplerIsPolyphonic);
            showNotification(`${track.name} instrument sampler mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`, 2000);
        });
    }
}


// --- Track Inspector Window (Entry Point) ---
function buildTrackInspectorContentDOM(track) {
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
        monitorButtonHTML = `<button id="monitorBtn-${track.id}" title="Toggle Input Monitoring" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${track.isMonitoringEnabled ? 'active' : ''}">Monitor</button>`;
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
                <div id="trackMeterBar-${track.id}" class="h-full bg-pink-400 transition-all duration-50 ease-linear" style="width: 0%;"></div>
            </div>
            <div class="type-specific-controls mt-1 border-t dark:border-slate-600 pt-1">${specificControlsHTML}</div>
            <div class="inspector-nav grid ${track.type === 'Audio' ? 'grid-cols-2' : 'grid-cols-3'} gap-1 mt-2">
                <button id="openEffectsBtn-${track.id}" class="px-1 py-0.5 border rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-500">Effects</button>
                ${sequencerButtonHTML}
                <button id="removeTrackBtn-${track.id}" class="px-1 py-0.5 border rounded bg-red-400 hover:bg-red-500 text-white dark:bg-red-600 dark:hover:bg-red-700 dark:border-red-500">Remove</button>
            </div>
        </div>`;
}

export function openTrackInspectorWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) { console.error(`[UI] Track ${trackId} not found for inspector.`); return null; }

    const windowId = `trackInspector-${trackId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore(); return openWindows.get(windowId);
    }

    const contentDOM = buildTrackInspectorContentDOM(track);
    // Larger window for DrumSampler to show pads
    const baseHeight = track.type === 'DrumSampler' ? 580 : 450;
    const inspectorOptions = { width: 320, height: baseHeight, minWidth: 280, minHeight: 350, initialContentKey: windowId, onCloseCallback: () => { /* main.js can clear track.inspectorWindow if needed */ } };
    if (savedState) { Object.assign(inspectorOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized }); }

    const inspectorWindow = localAppServices.createWindow(windowId, `Inspector: ${track.name}`, contentDOM, inspectorOptions);

    if (inspectorWindow?.element) {
        initializeCommonInspectorControls(track, inspectorWindow.element);
        initializeTypeSpecificInspectorControls(track, inspectorWindow.element);
    }
    return inspectorWindow;
}

function initializeCommonInspectorControls(track, winEl) {
    winEl.querySelector(`#muteBtn-${track.id}`)?.addEventListener('click', () => handleTrackMute(track.id));
    winEl.querySelector(`#soloBtn-${track.id}`)?.addEventListener('click', () => handleTrackSolo(track.id));
    winEl.querySelector(`#armInputBtn-${track.id}`)?.addEventListener('click', () => handleTrackArm(track.id));

    const monitorBtn = winEl.querySelector(`#monitorBtn-${track.id}`);
    if (monitorBtn) {
        monitorBtn.addEventListener('click', () => {
            if (track.type === 'Audio') { // Ensure it's an audio track
                track.isMonitoringEnabled = !track.isMonitoringEnabled;
                monitorBtn.classList.toggle('active', track.isMonitoringEnabled);
                showNotification(`Input Monitoring ${track.isMonitoringEnabled ? 'ON' : 'OFF'} for ${track.name}`, 2000);
                if (localAppServices.captureStateForUndo) {
                    localAppServices.captureStateForUndo(`Toggle Monitoring for ${track.name} to ${track.isMonitoringEnabled ? 'ON' : 'OFF'}`);
                }
            }
        });
    }

    winEl.querySelector(`#removeTrackBtn-${track.id}`)?.addEventListener('click', () => handleRemoveTrack(track.id));
    winEl.querySelector(`#openEffectsBtn-${track.id}`)?.addEventListener('click', () => handleOpenEffectsRack(track.id));
    winEl.querySelector(`#openSequencerBtn-${track.id}`)?.addEventListener('click', () => handleOpenSequencer(track.id));
}


function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl);
    else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl);
    else if (track.type === 'DrumSampler') initializeDrumSamplerSpecificControls(track, winEl);
    else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl);
}


// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    const ownerId = (ownerType === 'track' && owner) ? owner.id : (ownerType === 'send' && owner) ? owner.id : 'master';
    const ownerName = (ownerType === 'track' && owner) ? owner.name : (ownerType === 'send' && owner) ? owner.name : 'Master Bus';
    return `<div id="effectsRackContent-${ownerId}" class="p-2 space-y-2 overflow-y-auto h-full">
        <h3 class="text-sm font-semibold dark:text-slate-200">Effects Rack: ${ownerName}</h3>
        <div id="effectsList-${ownerId}" class="space-y-1 min-h-[50px] border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600"></div>
        <button id="addEffectBtn-${ownerId}" class="text-xs px-2 py-1 bg-purple-400 text-white rounded hover:bg-purple-500 dark:bg-purple-500 dark:hover:bg-purple-600">Add Effect</button>
        <div id="effectControlsContainer-${ownerId}" class="mt-2 space-y-2"></div>
    </div>`;
}

export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    if (!listDiv) return;
    listDiv.innerHTML = '';
    let effectsArray;
    if (ownerType === 'track' && owner) {
        effectsArray = owner.activeEffects;
    } else if (ownerType === 'send' && owner) {
        effectsArray = owner.effects || [];
    } else {
        effectsArray = localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : [];
    }

    if (!effectsArray || effectsArray.length === 0) {
        listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">No effects added.</p>';
        if (controlsContainer) controlsContainer.innerHTML = ''; return;
    }

    const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};

    effectsArray.forEach((effect, index) => {
        const effectDef = AVAILABLE_EFFECTS_LOCAL[effect.type];
        const displayName = effectDef ? effectDef.displayName : effect.type;
        const item = document.createElement('div');
        item.className = 'effect-item flex justify-between items-center p-1 border-b bg-white dark:bg-slate-800 dark:border-slate-700 rounded-sm shadow-xs text-xs';
        item.innerHTML = `<span class="effect-name flex-grow cursor-pointer hover:text-purple-500 dark:text-slate-300 dark:hover:text-purple-300" title="Edit ${displayName}">${displayName}</span>
            <div class="effect-actions">
                <button class="up-btn text-xs px-0.5 ${index === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-pink-500 dark:hover:text-pink-300'} dark:text-slate-400" ${index === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                <button class="down-btn text-xs px-0.5 ${index === effectsArray.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:text-pink-500 dark:hover:text-pink-300'} dark:text-slate-400" ${index === effectsArray.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                <button class="remove-btn text-xs px-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remove Effect">✕</button>
            </div>`;
        item.querySelector('.effect-name').addEventListener('click', () => {
            renderEffectControls(owner, ownerType, effect.id, controlsContainer);
            listDiv.querySelectorAll('.bg-blue-100,.dark\\:bg-purple-600').forEach(el => el.classList.remove('bg-blue-100', 'dark:bg-purple-600', 'border-purple-400', 'dark:border-purple-600'));
            item.classList.add('bg-blue-100', 'dark:bg-purple-600', 'border-purple-400', 'dark:border-purple-600');
        });
        item.querySelector('.up-btn').addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Reorder effect on ${ownerType === 'track' ? owner.name : ownerType === 'send' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.reorderEffect(effect.id, index - 1);
            else if (ownerType === 'send' && localAppServices.reorderSendEffect) localAppServices.reorderSendEffect(owner.id, effect.id, index - 1);
            else if (localAppServices.reorderMasterEffect) localAppServices.reorderMasterEffect(effect.id, index - 1);
        });
        item.querySelector('.down-btn').addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Reorder effect on ${ownerType === 'track' ? owner.name : ownerType === 'send' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.reorderEffect(effect.id, index + 1);
            else if (ownerType === 'send' && localAppServices.reorderSendEffect) localAppServices.reorderSendEffect(owner.id, effect.id, index + 1);
            else if (localAppServices.reorderMasterEffect) localAppServices.reorderMasterEffect(effect.id, index + 1);
        });
        item.querySelector('.remove-btn').addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Remove ${effect.type} from ${ownerType === 'track' ? owner.name : ownerType === 'send' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.removeEffect(effect.id);
            else if (ownerType === 'send' && localAppServices.removeSendEffect) localAppServices.removeSendEffect(owner.id, effect.id);
            else if (localAppServices.removeMasterEffect) localAppServices.removeMasterEffect(effect.id);
        });
        listDiv.appendChild(item);
    });
}

export function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    let effectsArray;
    if (ownerType === 'track' && owner) {
        effectsArray = owner.activeEffects;
    } else if (ownerType === 'send' && owner) {
        effectsArray = owner.effects || [];
    } else {
        effectsArray = localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : [];
    }
    const effectWrapper = effectsArray.find(e => e.id === effectId);

    if (!effectWrapper) { controlsContainer.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic">Select an effect.</p>'; return; }

    const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
    const effectDef = AVAILABLE_EFFECTS_LOCAL[effectWrapper.type];

    if (!effectDef) { controlsContainer.innerHTML = `<p class="text-xs text-red-500">Error: Definition for "${effectWrapper.type}" not found.</p>`; return; }

    const titleEl = document.createElement('h4');
    titleEl.className = 'text-xs font-semibold mb-1 dark:text-slate-200'; titleEl.textContent = `Controls: ${effectDef.displayName}`;
    controlsContainer.appendChild(titleEl);
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 text-xs';

    if (!effectDef.params || effectDef.params.length === 0) {
        gridContainer.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic col-span-full">No adjustable parameters.</p>';
    } else {
        effectDef.params.forEach(paramDef => {
            const controlWrapper = document.createElement('div');
            let initialValue;
            const pathKeys = paramDef.key.split('.');
            let currentValObj = effectWrapper.params;
            for (const key of pathKeys) {
                if (currentValObj && typeof currentValObj === 'object' && key in currentValObj) {
                    currentValObj = currentValObj[key];
                } else {
                    currentValObj = undefined;
                    break;
                }
            }
            initialValue = (currentValObj !== undefined) ? currentValObj : paramDef.defaultValue;

            if (paramDef.type === 'knob') {
                const knob = createKnob({ label: paramDef.label, min: paramDef.min, max: paramDef.max, step: paramDef.step, initialValue: initialValue, decimals: paramDef.decimals, displaySuffix: paramDef.displaySuffix, trackRef: (ownerType === 'track' ? owner : null), onValueChange: (val) => { 
                    if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, val); 
                    else if (ownerType === 'send' && owner && localAppServices.updateSendBusEffectParam) localAppServices.updateSendBusEffectParam(owner.id, effectId, paramDef.key, val);
                    else if (localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, val); 
                } });
                controlWrapper.appendChild(knob.element);
            } else if (paramDef.type === 'select') {
                const label = document.createElement('label');
                label.className = 'block text-xs font-medium mb-0.5 dark:text-slate-300';
                label.textContent = paramDef.label + ':';
                const select = document.createElement('select');
                select.className = 'w-full p-1 border border-gray-300 rounded text-xs bg-gray-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-600';
                paramDef.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = typeof opt === 'object' ? opt.value : opt;
                    option.textContent = typeof opt === 'object' ? opt.text : opt;
                    select.appendChild(option);
                });
                select.value = initialValue;
                select.addEventListener('change', (e) => {
                    const newValue = e.target.value;
                    const finalValue = (typeof paramDef.defaultValue === 'number' && !isNaN(parseFloat(newValue))) ? parseFloat(newValue) : newValue;
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Change ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' ? owner.name : ownerType === 'send' ? owner.name : 'Master'}`);
                    if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, finalValue);
                    else if (ownerType === 'send' && owner && localAppServices.updateSendBusEffectParam) localAppServices.updateSendBusEffectParam(owner.id, effectId, paramDef.key, finalValue);
                    else if (localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, finalValue);
                });
                controlWrapper.appendChild(label);
                controlWrapper.appendChild(select);
            } else if (paramDef.type === 'toggle') {
                const button = document.createElement('button');
                button.className = `w-full p-1 border rounded text-xs dark:border-slate-500 dark:text-slate-300 ${initialValue ? 'bg-purple-400 text-white dark:bg-purple-500' : 'bg-gray-200 dark:bg-slate-600'}`;
                button.textContent = `${paramDef.label}: ${initialValue ? 'ON' : 'OFF'}`;
                button.addEventListener('click', () => {
                    const newValue = !initialValue;
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' ? owner.name : ownerType === 'send' ? owner.name : 'Master'}`);
                    if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, newValue);
                    else if (ownerType === 'send' && owner && localAppServices.updateSendBusEffectParam) localAppServices.updateSendBusEffectParam(owner.id, effectId, paramDef.key, newValue);
                    else if (localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, newValue);
                });
                controlWrapper.appendChild(button);
            }
            gridContainer.appendChild(controlWrapper);
        });
    }
    controlsContainer.appendChild(gridContainer);
}

function showAddEffectModal(owner, ownerType) {
    const ownerName = (ownerType === 'track' && owner) ? owner.name : (ownerType === 'send' && owner) ? owner.name : 'Master Bus';
    let modalContentHTML = `<div class="max-h-60 overflow-y-auto"><ul class="list-none p-0 m-0">`;
    const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
    
    for (const effectKey in AVAILABLE_EFFECTS_LOCAL) { modalContentHTML += `<li class="p-1.5 hover:bg-purple-200 dark:hover:bg-purple-600 cursor-pointer border-b dark:border-slate-600 text-sm dark:text-slate-200" data-effect-type="${effectKey}">${AVAILABLE_EFFECTS_LOCAL[effectKey].displayName}</li>`; }
    modalContentHTML += `</ul></div>`;
    const modal = showCustomModal(`Add Effect to ${ownerName}`, modalContentHTML, [], 'add-effect-modal');
    if (modal?.contentDiv) {
        modal.contentDiv.querySelectorAll('li[data-effect-type]').forEach(item => {
            item.addEventListener('click', () => {
                const effectType = item.dataset.effectType;
                if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Add ${effectType} to ${ownerName}`);
                if (ownerType === 'track' && owner) {
                    owner.addEffect(effectType);
                } else if (ownerType === 'send' && owner && localAppServices.addEffectToSendBus) {
                    localAppServices.addEffectToSendBus(owner.id, effectType);
                } else if (ownerType === 'master' && localAppServices.addMasterEffect) {
                    localAppServices.addMasterEffect(effectType);
                }
                modal.overlay.remove();
            });
        });
    }
}

// --- Window Opening Functions ---
export function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) return null;
    const windowId = `effectsRack-${trackId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) { openWindows.get(windowId).restore(); return openWindows.get(windowId); }

    const contentDOM = buildModularEffectsRackDOM(track, 'track');
    const rackOptions = { width: 350, height: 400, minWidth: 300, minHeight: 250, initialContentKey: windowId };
    if (savedState) Object.assign(rackOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const rackWindow = localAppServices.createWindow(windowId, `Effects: ${track.name}`, contentDOM, rackOptions);
    if (rackWindow?.element) {
        renderEffectsList(track, 'track', rackWindow.element.querySelector(`#effectsList-${track.id}`), rackWindow.element.querySelector(`#effectControlsContainer-${track.id}`));
        rackWindow.element.querySelector(`#addEffectBtn-${track.id}`)?.addEventListener('click', () => showAddEffectModal(track, 'track'));
    }
    return rackWindow;
}

export function openMasterEffectsRackWindow(savedState = null) {
    const windowId = 'masterEffectsRack';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) { openWindows.get(windowId).restore(); return openWindows.get(windowId); }

    const contentDOM = buildModularEffectsRackDOM(null, 'master');
    const rackOptions = { width: 350, height: 400, minWidth: 300, minHeight: 250, initialContentKey: windowId };
    if (savedState) Object.assign(rackOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const rackWindow = localAppServices.createWindow(windowId, 'Master Effects Rack', contentDOM, rackOptions);
    if (rackWindow?.element) {
        renderEffectsList(null, 'master', rackWindow.element.querySelector(`#effectsList-master`), rackWindow.element.querySelector(`#effectControlsContainer-master`));
        rackWindow.element.querySelector(`#addEffectBtn-master`)?.addEventListener('click', () => showAddEffectModal(null, 'master'));
    }
    return rackWindow;
}

export function openSendEffectsWindow(sendId, savedState = null) {
    const sendTrack = localAppServices.getSendTrackById ? localAppServices.getSendTrackById(sendId) : null;
    if (!sendTrack) return null;
    const windowId = `sendEffectsRack-${sendId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) { openWindows.get(windowId).restore(); return openWindows.get(windowId); }

    const contentDOM = buildModularEffectsRackDOM(sendTrack, 'send');
    const rackOptions = { width: 350, height: 400, minWidth: 300, minHeight: 250, initialContentKey: windowId };
    if (savedState) Object.assign(rackOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const rackWindow = localAppServices.createWindow(windowId, `Effects: ${sendTrack.name}`, contentDOM, rackOptions);
    if (rackWindow?.element) {
        renderEffectsList(sendTrack, 'send', rackWindow.element.querySelector(`#effectsList-${sendTrack.id}`), rackWindow.element.querySelector(`#effectControlsContainer-${sendTrack.id}`));
        rackWindow.element.querySelector(`#addEffectBtn-${sendTrack.id}`)?.addEventListener('click', () => showAddEffectModal(sendTrack, 'send'));
    }
    return rackWindow;
}

export function openGlobalControlsWindow(onReadyCallback, savedState = null) {
    const windowId = 'globalControls';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        win.restore();
        if (typeof onReadyCallback === 'function' && win.element) {
            onReadyCallback({
                playBtnGlobal: win.element.querySelector('#playBtnGlobal'),
                recordBtnGlobal: win.element.querySelector('#recordBtnGlobal'),
                stopBtnGlobal: win.element.querySelector('#stopBtnGlobal'),
                tempoGlobalInput: win.element.querySelector('#tempoGlobalInput'),
                midiInputSelectGlobal: win.element.querySelector('#midiInputSelectGlobal'),
                masterMeterContainerGlobal: win.element.querySelector('#masterMeterContainerGlobal'),
                masterMeterBarGlobal: win.element.querySelector('#masterMeterBarGlobal'),
                midiIndicatorGlobal: win.element.querySelector('#midiIndicatorGlobal'),
                keyboardIndicatorGlobal: win.element.querySelector('#keyboardIndicatorGlobal'),
                playbackModeToggleBtnGlobal: win.element.querySelector('#playbackModeToggleBtnGlobal')
            });
        }
        return win;
    }

    const contentHTML = `<div id="global-controls-content" class="p-2.5 space-y-3 text-sm text-gray-700 dark:text-slate-300">
        <div class="grid grid-cols-3 gap-2 items-center">
            <button id="playBtnGlobal" title="Play/Pause (Spacebar)" class="bg-pink-400 hover:bg-pink-500 text-white font-semibold py-1.5 px-3 rounded shadow transition-colors duration-150 dark:bg-pink-500 dark:hover:bg-pink-600">Play</button>
            <button id="stopBtnGlobal" title="Stop All Audio (Panic)" class="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1.5 px-3 rounded shadow transition-colors duration-150 dark:bg-yellow-600 dark:hover:bg-yellow-700">Stop</button>
            <button id="recordBtnGlobal" title="Record Arm/Disarm" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 px-3 rounded shadow transition-colors duration-150 dark:bg-red-600 dark:hover:bg-red-700">Record</button>
        </div>
        <div> <label for="tempoGlobalInput" class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-0.5">Tempo (BPM):</label> <input type="number" id="tempoGlobalInput" value="120" min="30" max="300" step="0.1" class="w-full p-1.5 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-purple-600 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"> </div>
        <div> <label for="midiInputSelectGlobal" class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-0.5">MIDI Input:</label> <select id="midiInputSelectGlobal" class="w-full p-1.5 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-purple-600 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"> <option value="">No MIDI Input</option> </select> </div>
        <div class="pt-1"> <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-0.5">Master Level:</label> <div id="masterMeterContainerGlobal" class="h-5 w-full bg-gray-200 dark:bg-slate-600 rounded border border-gray-300 dark:border-slate-500 overflow-hidden shadow-sm"> <div id="masterMeterBarGlobal" class="h-full bg-purple-400 transition-all duration-50 ease-linear" style="width: 0%;"></div> </div> </div>
        <div class="flex justify-between items-center text-xs mt-1.5"> <span id="midiIndicatorGlobal" title="MIDI Activity" class="px-2 py-1 rounded-full bg-gray-300 text-gray-600 font-medium transition-colors duration-150 dark:bg-slate-600 dark:text-slate-300">MIDI</span> <span id="keyboardIndicatorGlobal" title="Computer Keyboard Activity" class="px-2 py-1 rounded-full bg-gray-300 text-gray-600 font-medium transition-colors duration-150 dark:bg-slate-600 dark:text-slate-300">KBD</span> </div>
        <div class="mt-2"> <button id="playbackModeToggleBtnGlobal" title="Toggle Playback Mode (Sequencer/Timeline)" class="w-full bg-violet-400 hover:bg-violet-500 text-white font-semibold py-1.5 px-3 rounded shadow transition-colors duration-150 dark:bg-violet-500 dark:hover:bg-violet-600">Mode: Sequencer</button> </div>
    </div>`;
    const options = { width: 280, height: 360, minWidth: 250, minHeight: 340, closable: true, minimizable: true, resizable: true, initialContentKey: windowId };
    if (savedState) Object.assign(options, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const newWindow = localAppServices.createWindow(windowId, 'Global Controls', contentHTML, options);
    if (newWindow?.element && typeof onReadyCallback === 'function') {
        onReadyCallback({
            playBtnGlobal: newWindow.element.querySelector('#playBtnGlobal'),
            recordBtnGlobal: newWindow.element.querySelector('#recordBtnGlobal'),
            stopBtnGlobal: newWindow.element.querySelector('#stopBtnGlobal'),
            tempoGlobalInput: newWindow.element.querySelector('#tempoGlobalInput'),
            midiInputSelectGlobal: newWindow.element.querySelector('#midiInputSelectGlobal'),
            masterMeterContainerGlobal: newWindow.element.querySelector('#masterMeterContainerGlobal'),
            masterMeterBarGlobal: newWindow.element.querySelector('#masterMeterBarGlobal'),
            midiIndicatorGlobal: newWindow.element.querySelector('#midiIndicatorGlobal'),
            keyboardIndicatorGlobal: newWindow.element.querySelector('#keyboardIndicatorGlobal'),
            playbackModeToggleBtnGlobal: newWindow.element.querySelector('#playbackModeToggleBtnGlobal')
        });
    }
    return newWindow;
}

export function openSoundBrowserWindow(savedState = null) {
    const windowId = 'soundBrowser';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        win.restore();
        const currentLibNameFromState = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
        if (currentLibNameFromState && localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(currentLibNameFromState);
        } else if (localAppServices.updateSoundBrowserDisplayForLibrary) {
             localAppServices.updateSoundBrowserDisplayForLibrary(null);
        }
        return win;
    }

    const contentHTML = `<div id="soundBrowserContent" class="p-2 space-y-2 text-xs overflow-y-auto h-full dark:text-slate-300"> <div class="flex space-x-1 mb-1"> <select id="librarySelect" class="flex-grow p-1 border rounded text-xs bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"> <option value="">Select Library...</option> </select> <button id="upDirectoryBtn" class="px-2 py-1 border rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-500" title="Up Directory">↑</button> </div> <div id="currentPathDisplay" class="text-xs text-gray-600 dark:text-slate-400 truncate mb-1">/</div> <div id="soundBrowserList" class="min-h-[100px] border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600 overflow-y-auto"> <p class="text-gray-500 dark:text-slate-400 italic">Select a library to browse sounds.</p> </div> <div id="soundPreviewControls" class="mt-1 text-center"> <button id="previewSoundBtn" class="px-2 py-1 text-xs border rounded bg-purple-400 text-white hover:bg-purple-500 disabled:opacity-50 dark:bg-purple-500 dark:hover:bg-purple-600 dark:disabled:bg-slate-500" disabled>Preview</button> </div> </div>`;
    const browserOptions = { width: 380, height: 450, minWidth: 300, minHeight: 300, initialContentKey: windowId };
    if (savedState) Object.assign(browserOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

    const browserWindow = localAppServices.createWindow(windowId, 'Sound Browser', contentHTML, browserOptions);

    if (browserWindow?.element) {
        const libSelect = browserWindow.element.querySelector('#librarySelect');
        if (Constants.soundLibraries) {
            Object.keys(Constants.soundLibraries).forEach(libName => {
                const opt = document.createElement('option');
                opt.value = libName;
                opt.textContent = libName;
                libSelect.appendChild(opt);
            });
        }

        libSelect.addEventListener('change', (e) => {
            const lib = e.target.value;
            if (lib && localAppServices.fetchSoundLibrary) {
                localAppServices.fetchSoundLibrary(lib, Constants.soundLibraries[lib]);
            } else if (!lib && localAppServices.updateSoundBrowserDisplayForLibrary) {
                localAppServices.updateSoundBrowserDisplayForLibrary(null);
            }
        });

        browserWindow.element.querySelector('#upDirectoryBtn').addEventListener('click', () => {
            const currentPath = localAppServices.getCurrentSoundBrowserPath ? localAppServices.getCurrentSoundBrowserPath() : [];
            if (currentPath.length > 0) {
                const newPath = [...currentPath]; newPath.pop();
                if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath(newPath);
                if (localAppServices.renderSoundBrowserDirectory) localAppServices.renderSoundBrowserDirectory(newPath, localAppServices.getCurrentSoundFileTree ? localAppServices.getCurrentSoundFileTree() : null);
            }
        });

        browserWindow.element.querySelector('#previewSoundBtn').addEventListener('click', () => {
            const selectedSound = localAppServices.getSelectedSoundForPreview ? localAppServices.getSelectedSoundForPreview() : null;

            if (selectedSound && typeof Tone !== 'undefined') {
                let previewPlayer = localAppServices.getPreviewPlayer ? localAppServices.getPreviewPlayer() : null;
                if (previewPlayer && !previewPlayer.disposed) {
                    previewPlayer.stop(); previewPlayer.dispose();
                }
                const { fullPath, libraryName } = selectedSound;

                const loadedZips = localAppServices.getLoadedZipFiles ? localAppServices.getLoadedZipFiles() : {};
                if (loadedZips?.[libraryName] && loadedZips[libraryName] !== "loading") {
                    const zipEntry = loadedZips[libraryName].file(fullPath);
                    if (zipEntry) {
                        zipEntry.async("blob").then(blob => {
                            const url = URL.createObjectURL(blob);
                            previewPlayer = new Tone.Player(url, () => {
                                previewPlayer.start();
                                URL.revokeObjectURL(url);
                            }).toDestination();
                            previewPlayer.onerror = (err) => {
                                console.error(`[UI PreviewButton] Tone.Player error for ${url}:`, err);
                                showNotification("Error playing preview: " + err.message, 3000);
                                URL.revokeObjectURL(url);
                            };
                            if (localAppServices.setPreviewPlayer) localAppServices.setPreviewPlayer(previewPlayer);
                        }).catch(err => {
                            console.error(`[UI PreviewButton] Error converting zipEntry to blob for ${fullPath}:`, err);
                            showNotification("Error loading preview data: " + err.message, 2000);
                        });
                    } else {
                        console.warn(`[UI PreviewButton] ZipEntry not found for ${fullPath} in ${libraryName}.`);
                        showNotification("Preview error: Sound file not found in library.", 2000);
                    }
                } else {
                    console.warn(`[UI PreviewButton] Library ${libraryName} not loaded or is loading. Loaded zips:`, loadedZips);
                    showNotification("Preview error: Library not ready.", 2000);
                }
            } else if (!selectedSound) {
                console.warn('[UI PreviewButton] No sound selected for preview.');
            } else if (typeof Tone === 'undefined') {
                console.error('[UI PreviewButton] Tone is undefined!');
            }
        });

        if (!savedState) {
            const currentLibNameFromState = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
            const soundTrees = localAppServices.getSoundLibraryFileTrees ? localAppServices.getSoundLibraryFileTrees() : {};


            if (currentLibNameFromState && soundTrees && soundTrees[currentLibNameFromState] && libSelect) {
                libSelect.value = currentLibNameFromState;
                if (localAppServices.updateSoundBrowserDisplayForLibrary) {
                    localAppServices.updateSoundBrowserDisplayForLibrary(currentLibNameFromState);
                }
            } else {
                if (libSelect) libSelect.value = "";
                if (localAppServices.updateSoundBrowserDisplayForLibrary) {
                    localAppServices.updateSoundBrowserDisplayForLibrary(null);
                }
            }
        } else if (savedState && localAppServices.getCurrentLibraryName && localAppServices.updateSoundBrowserDisplayForLibrary) {
            const currentLibNameFromState = localAppServices.getCurrentLibraryName();
             if (currentLibNameFromState && libSelect) {
                libSelect.value = currentLibNameFromState;
                localAppServices.updateSoundBrowserDisplayForLibrary(currentLibNameFromState);
            } else if (libSelect) {
                libSelect.value = "";
                localAppServices.updateSoundBrowserDisplayForLibrary(null);
            }
        }
    }
    return browserWindow;
}

export function updateSoundBrowserDisplayForLibrary(libraryName, isLoading = false, hasError = false) {
    const browserWindowEl = localAppServices.getWindowById ? localAppServices.getWindowById('soundBrowser')?.element : null;

    if (!browserWindowEl) {
        if (libraryName && !isLoading && !hasError) {
            const currentGlobalLib = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
            if (!currentGlobalLib && localAppServices.setCurrentLibraryName) {
                localAppServices.setCurrentLibraryName(libraryName);
            }
        }
        return;
    }

    const listDiv = browserWindowEl.querySelector('#soundBrowserList');
    const libSelect = browserWindowEl.querySelector('#librarySelect');
    const pathDisplay = browserWindowEl.querySelector('#currentPathDisplay');
    const isWindowVisible = !browserWindowEl.closest('.window.minimized');
    const currentDropdownSelection = libSelect ? libSelect.value : null;


    let performFullUIUpdate = false;

    if (!isWindowVisible) {
        if (libraryName && !isLoading && !hasError) {
            const currentGlobalLib = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
            if (!currentGlobalLib && localAppServices.setCurrentLibraryName) {
                localAppServices.setCurrentLibraryName(libraryName);
            }
        }
        return;
    }

    if (libraryName === currentDropdownSelection) {
        performFullUIUpdate = true;
    } else if (currentDropdownSelection === "" && libraryName && !isLoading && !hasError) {
        performFullUIUpdate = true;
    } else if (libraryName && !isLoading && !hasError) {
        const currentGlobalLib = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
        if (!currentGlobalLib && localAppServices.setCurrentLibraryName) {
            localAppServices.setCurrentLibraryName(libraryName);
        }
        return;
    } else if ((isLoading || hasError) && libraryName !== currentDropdownSelection) {
        return;
    }


    if (performFullUIUpdate) {
        if (localAppServices.setCurrentLibraryName) localAppServices.setCurrentLibraryName(libraryName);
        if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath([]);
        if (libSelect && libSelect.value !== (libraryName || "")) {
            libSelect.value = libraryName || "";
        }
    } else {
        if (!libraryName) {
             performFullUIUpdate = true;
             if (localAppServices.setCurrentLibraryName) localAppServices.setCurrentLibraryName(null);
             if (libSelect) libSelect.value = "";
        } else {
            console.error(`[UI updateSoundBrowserDisplayForLibrary] LOGIC ERROR: Reached unexpected state for '${libraryName}'. No UI update performed when one might have been expected.`);
            return;
        }
    }

    if (!libraryName) {
        listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">Select a library.</p>';
        pathDisplay.textContent = '/';
        if (localAppServices.setCurrentSoundFileTree) localAppServices.setCurrentSoundFileTree(null);
        return;
    }

    if (isLoading || (localAppServices.getLoadedZipFiles && localAppServices.getLoadedZipFiles()[libraryName] === "loading")) {
        listDiv.innerHTML = `<p class="text-gray-500 dark:text-slate-400 italic">Loading ${libraryName}...</p>`;
    } else if (hasError) {
        listDiv.innerHTML = `<p class="text-red-500">Error: Library "${libraryName}" failed.</p>`;
    } else {
        const currentTrees = localAppServices.getSoundLibraryFileTrees ? localAppServices.getSoundLibraryFileTrees() : {};

        if (currentTrees && currentTrees[libraryName]) {
            const treeForLib = currentTrees[libraryName];
            if (treeForLib && Object.keys(treeForLib).length > 0) {
                if (localAppServices.setCurrentSoundFileTree) localAppServices.setCurrentSoundFileTree(treeForLib);
                if (localAppServices.renderSoundBrowserDirectory) localAppServices.renderSoundBrowserDirectory([], localAppServices.getCurrentSoundFileTree());
            } else {
                console.warn(`[UI updateSoundBrowserDisplayForLibrary WARN] Tree for "${libraryName}" was found but considered empty or invalid.`);
                listDiv.innerHTML = `<p class="text-red-500">Error: Library "${libraryName}" data is empty or corrupt.</p>`;
            }
        } else {
            listDiv.innerHTML = `<p class="text-red-500">Error: Library "${libraryName}" data not found after attempting load.</p>`;
        }
    }
    pathDisplay.textContent = `/${libraryName || ''}/`;
}


export function renderSoundBrowserDirectory(pathArray, treeNode) {
    const browserWindowEl = localAppServices.getWindowById ? localAppServices.getWindowById('soundBrowser')?.element : null;
    if (!browserWindowEl || !treeNode) return;
    const listDiv = browserWindowEl.querySelector('#soundBrowserList');
    const pathDisplay = browserWindowEl.querySelector('#currentPathDisplay');
    const previewBtn = browserWindowEl.querySelector('#previewSoundBtn');
    listDiv.innerHTML = '';
    const currentLibName = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : '';
    pathDisplay.textContent = `/${currentLibName}${pathArray.length > 0 ? '/' : ''}${pathArray.join('/')}`;

    if (localAppServices.setSelectedSoundForPreview) {
        localAppServices.setSelectedSoundForPreview(null);
    }
    if(previewBtn) previewBtn.disabled = true;

    const items = [];
    for (const name in treeNode) { if (treeNode[name]?.type) items.push({ name, type: treeNode[name].type, nodeData: treeNode[name] }); }
    items.sort((a, b) => { if (a.type === 'folder' && b.type !== 'folder') return -1; if (a.type !== 'folder' && b.type === 'folder') return 1; return a.name.localeCompare(b.name); });
    if (items.length === 0) { listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">Empty folder.</p>'; return; }

    items.forEach(itemObj => {
        const {name, nodeData} = itemObj; const listItem = document.createElement('div');
        listItem.className = 'p-1 hover:bg-purple-200 dark:hover:bg-purple-600 cursor-pointer border-b dark:border-slate-600 text-xs flex items-center';
        listItem.draggable = nodeData.type === 'file';
        const icon = document.createElement('span'); icon.className = 'mr-1.5'; icon.textContent = nodeData.type === 'folder' ? '📁' : '🎵'; listItem.appendChild(icon);
        const text = document.createElement('span'); text.textContent = name; listItem.appendChild(text);
        if (nodeData.type === 'folder') {
            listItem.addEventListener('click', () => {
                const newPath = [...pathArray, name];
                if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath(newPath);
                renderSoundBrowserDirectory(newPath, nodeData.children);
            });
        }
        else { // File
            listItem.addEventListener('click', () => {
                listDiv.querySelectorAll('.bg-blue-200,.dark\\:bg-purple-500').forEach(el => el.classList.remove('bg-blue-200', 'dark:bg-purple-500'));
                listItem.classList.add('bg-blue-200', 'dark:bg-purple-500');
                const soundToSelect = { fileName: name, fullPath: nodeData.fullPath, libraryName: currentLibName };
                if (localAppServices.setSelectedSoundForPreview) {
                    localAppServices.setSelectedSoundForPreview(soundToSelect);
                    const checkSelected = localAppServices.getSelectedSoundForPreview ? localAppServices.getSelectedSoundForPreview() : { error: 'getSelectedSoundForPreview service not found' };
                } else {
                    console.warn('[UI SoundFile Click] setSelectedSoundForPreview service not available.');
                }
                if(previewBtn) previewBtn.disabled = false;
            });
            listItem.addEventListener('dragstart', (e) => { e.dataTransfer.setData("application/json", JSON.stringify({ fileName: name, fullPath: nodeData.fullPath, libraryName: currentLibName, type: 'sound-browser-item' })); e.dataTransfer.effectAllowed = "copy"; });
        }
        listDiv.appendChild(listItem);
    });
}

// --- Tap Tempo Feature ---
let tapTimes = [];
const TAP_TIMEOUT_MS = 2000; // Reset tap buffer after 2 seconds of inactivity

export function handleTapTempo() {
    const now = performance.now();
    
    // Reset if too much time has passed since last tap
    if (tapTimes.length > 0 && (now - tapTimes[tapTimes.length - 1]) > TAP_TIMEOUT_MS) {
        tapTimes = [];
    }
    
    tapTimes.push(now);
    
    // Keep only the last 8 taps
    if (tapTimes.length > 8) {
        tapTimes.shift();
    }
    
    // Need at least 2 taps to calculate tempo
    if (tapTimes.length < 2) {
        return null;
    }
    
    // Calculate average interval between taps
    let totalInterval = 0;
    for (let i = 1; i < tapTimes.length; i++) {
        totalInterval += tapTimes[i] - tapTimes[i - 1];
    }
    const avgInterval = totalInterval / (tapTimes.length - 1);
    
    // Convert interval (ms) to BPM
    const bpm = 60000 / avgInterval;
    
    // Clamp to reasonable tempo range
    const clampedBpm = Math.min(Constants.MAX_TEMPO, Math.max(Constants.MIN_TEMPO, bpm));
    
    return clampedBpm;
}

export function resetTapTempo() {
    tapTimes = [];
}

// --- Timeline Functions ---

export function renderTimeline() {
    const win = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null;
    if (!win?.element) return;
    
    const tracks = localAppServices.getTracks ? localAppServices.getTracks() : [];
    const contentDiv = win.element.querySelector('#timelineContent');
    if (!contentDiv) return;
    
    // Build timeline HTML
    const beatWidth = Constants.TIMELINE_BEAT_WIDTH;
    const trackHeight = Constants.TIMELINE_TRACK_HEIGHT;
    const headerHeight = Constants.TIMELINE_HEADER_HEIGHT;
    const bpm = Tone.Transport.bpm.value;
    const pixelsPerSecond = (beatWidth * bpm) / 60;
    const totalBars = Constants.MAX_BARS;
    const stepsPerBar = Constants.STEPS_PER_BAR;
    const pixelsPerBar = beatWidth * 4; // 4 beats per bar
    const totalWidth = pixelsPerBar * totalBars;
    
    // Get loop region state
    const loopRegion = localAppServices.getLoopRegionState ? localAppServices.getLoopRegionState() : Constants.DEFAULT_LOOP_REGION;
    
    // Create loop region controls
    let loopControlsHTML = `
        <div class="loop-region-controls flex items-center gap-2 p-2 bg-zinc-800 border-b border-zinc-700">
            <label class="flex items-center gap-1 text-xs text-zinc-300 cursor-pointer">
                <input type="checkbox" id="loopRegionToggle" class="w-4 h-4 accent-green-500" ${loopRegion.enabled ? 'checked' : ''}>
                <span>Loop</span>
            </label>
            <div class="flex items-center gap-1 text-xs text-zinc-400">
                <span>Start:</span>
                <input type="number" id="loopStartBar" min="1" max="${Constants.MAX_BARS}" value="${loopRegion.startBar}" 
                    class="w-14 px-1 py-0.5 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-center">
            </div>
            <div class="flex items-center gap-1 text-xs text-zinc-400">
                <span>End:</span>
                <input type="number" id="loopEndBar" min="1" max="${Constants.MAX_BARS}" value="${loopRegion.endBar}" 
                    class="w-14 px-1 py-0.5 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-center">
            </div>
            <span class="text-xs text-zinc-500 ml-2">Press L to toggle loop</span>
        </div>
    `;
    
    // Create time ruler with loop region overlay
    let rulerHTML = '<div class="timeline-ruler" style="height:30px;background:#2a2a2a;display:flex;align-items:flex-end;border-bottom:1px solid #444;position:relative;overflow:hidden;">';
    
    // Loop region overlay (visual highlight)
    if (loopRegion.enabled) {
        const loopStartX = (loopRegion.startBar - 1) * pixelsPerBar;
        const loopEndX = loopRegion.endBar * pixelsPerBar;
        const loopWidth = loopEndX - loopStartX;
        rulerHTML += `<div class="loop-region-overlay" style="position:absolute;top:0;left:${loopStartX}px;width:${loopWidth}px;height:100%;background:rgba(34,197,94,0.2);border-left:2px solid #22c55e;border-right:2px solid #22c55e;z-index:1;"></div>`;
    }
    
    for (let bar = 0; bar < totalBars; bar++) {
        rulerHTML += `<div class="timeline-bar-marker" style="position:absolute;left:${bar * pixelsPerBar}px;height:100%;border-left:1px solid #666;z-index:2;"></div>`;
        rulerHTML += `<span style="position:sticky;left:0;background:#333;padding:2px 5px;font-size:11px;color:#ccc;z-index:3;">${bar + 1}</span>`;
    }
    rulerHTML += '</div>';
    
    // Create track lanes
    let lanesHTML = '<div class="timeline-lanes" style="flex:1;overflow-y:auto;position:relative;">';
    tracks.forEach((track, index) => {
        const laneTop = index * trackHeight;
        lanesHTML += `<div class="timeline-track-lane" data-track-id="${track.id}" style="position:absolute;top:${laneTop}px;left:0;width:100%;height:${trackHeight}px;background:${index % 2 === 0 ? '#1a1a1a' : '#222'};border-bottom:1px solid #333;">
            <span style="position:sticky;left:0;background:#333;padding:2px 5px;font-size:11px;color:#ccc;z-index:5;">${track.name}</span>`;
        
        // Render clips if any
        if (track.timelineClips && track.timelineClips.length > 0) {
            track.timelineClips.forEach(clip => {
                const clipLeft = clip.startTime * pixelsPerSecond;
                const clipWidth = clip.duration * pixelsPerSecond;
                const clipColor = clip.type === 'audio' ? '#4a9eff' : '#9f4aff';
                lanesHTML += `<div class="timeline-clip" data-clip-id="${clip.id}" style="position:absolute;top:4px;left:${clipLeft}px;width:${clipWidth}px;height:${trackHeight - 8}px;background:${clipColor};border-radius:4px;cursor:pointer;overflow:hidden;box-shadow:0 0 4px rgba(0,0,0,0.5);">
                    <span style="padding:2px 4px;font-size:10px;color:white;text-shadow:0 1px 2px black;">${clip.name || 'Clip'}</span>
                </div>`;
            });
        }
        lanesHTML += '</div>';
    });
    lanesHTML += '</div>';
    
    // Playhead line
    const playheadHTML = `<div id="timelinePlayhead" style="position:absolute;top:0;left:0;width:2px;height:100%;background:#ff4444;z-index:10;pointer-events:none;"></div>`;
    
    contentDiv.innerHTML = `<div class="timeline-container" style="display:flex;flex-direction:column;height:100%;position:relative;overflow:hidden;">
        ${loopControlsHTML}
        ${rulerHTML}
        <div class="timeline-tracks" style="flex:1;position:relative;overflow:auto;">${lanesHTML}${playheadHTML}</div>
    </div>`;
    
    // Add clip click handlers
    contentDiv.querySelectorAll('.timeline-clip').forEach(clipEl => {
        clipEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const clipId = clipEl.dataset.clipId;
            showNotification(`Selected clip: ${clipId}`, 1500);
        });
    });
    
    // Add loop region control handlers
    const loopToggle = contentDiv.querySelector('#loopRegionToggle');
    const loopStartInput = contentDiv.querySelector('#loopStartBar');
    const loopEndInput = contentDiv.querySelector('#loopEndBar');
    
    if (loopToggle) {
        loopToggle.addEventListener('change', (e) => {
            if (localAppServices.setLoopRegionEnabled) {
                localAppServices.setLoopRegionEnabled(e.target.checked);
                if (localAppServices.updateLoopRegion) {
                    localAppServices.updateLoopRegion();
                }
                renderTimeline(); // Refresh to show/hide overlay
            }
        });
    }
    
    if (loopStartInput) {
        loopStartInput.addEventListener('change', (e) => {
            const val = parseInt(e.target.value) || 1;
            if (localAppServices.setLoopRegionStartBar) {
                localAppServices.setLoopRegionStartBar(val);
                if (localAppServices.updateLoopRegion) {
                    localAppServices.updateLoopRegion();
                }
                renderTimeline();
            }
        });
    }
    
    if (loopEndInput) {
        loopEndInput.addEventListener('change', (e) => {
            const val = parseInt(e.target.value) || 4;
            if (localAppServices.setLoopRegionEndBar) {
                localAppServices.setLoopRegionEndBar(val);
                if (localAppServices.updateLoopRegion) {
                    localAppServices.updateLoopRegion();
                }
                renderTimeline();
            }
        });
    }
    
}

export function updatePlayheadPosition() {
    const win = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null;
    if (!win?.element) return;
    
    const playhead = win.element.querySelector('#timelinePlayhead');
    if (!playhead) return;
    
    const playbackMode = localAppServices.getPlaybackMode ? localAppServices.getPlaybackMode() : 'sequencer';
    if (playbackMode !== 'timeline') return;
    
    const bpm = Tone.Transport.bpm.value;
    const beatWidth = Constants.TIMELINE_BEAT_WIDTH;
    const pixelsPerSecond = (beatWidth * bpm) / 60;
    const currentTime = Tone.Transport.seconds;
    
    playhead.style.left = `${currentTime * pixelsPerSecond}px`;
}

export function openTimelineWindow(savedState = null) {
    const windowId = 'timeline';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        win.restore();
        renderTimeline(); // Refresh content when restoring
        return win;
    }
    const contentHTML = '<div id="timelineContent" class="p-2 text-sm text-gray-700 dark:text-slate-300 h-full"><p class="text-center text-gray-400">Loading timeline...</p></div>';
    const options = { width: 900, height: 300, minWidth: 600, minHeight: 200, closable: true, minimizable: true, resizable: true, initialContentKey: windowId };
    if (savedState) Object.assign(options, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const win = localAppServices.createWindow(windowId, 'Timeline', contentHTML, options);
    
    // Render timeline after window is created
    setTimeout(() => renderTimeline(), 50);
    
    return win;
}
