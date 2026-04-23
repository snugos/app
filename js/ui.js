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
import { getAudio } from './db.js';


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

// --- Track Color Swatches Builder ---
function buildTrackColorSwatches(track) {
    const colors = Constants.TRACK_COLORS;
    let html = '';
    for (let i = 0; i < colors.length; i++) {
        const color = colors[i];
        const isSelected = track.color === color;
        const borderClass = isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-100 dark:ring-offset-slate-800' : 'hover:scale-110';
        html += `<button class="track-color-swatch w-5 h-5 rounded cursor-pointer transition-all ${borderClass}" 
            data-color="${color}" 
            style="background-color: ${color};" 
            title="${color}"></button>`;
    }
    return html;
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

function buildAudioTrackInspectorDOM(track) {
    return `<div class="audio-track-controls p-1 space-y-2">
        <div class="recording-controls p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1">
            <h4 class="text-xs font-semibold dark:text-slate-200">Recording Input</h4>
            <div class="space-y-1">
                <div>
                    <label for="audioInputDevice-${track.id}" class="block text-xs font-medium dark:text-slate-300">Input Device:</label>
                    <select id="audioInputDevice-${track.id}" class="w-full p-1 border rounded text-xs bg-gray-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
                        <option value="">Default Microphone</option>
                    </select>
                </div>
                <div id="inputGainKnob-${track.id}-placeholder" class="flex items-center gap-1">
                    <span class="text-xs dark:text-slate-300">Gain:</span>
                </div>
                <div class="flex items-center gap-1">
                    <label for="monitoringVolume-${track.id}" class="text-xs font-medium dark:text-slate-300">Monitor:</label>
                    <input type="range" id="monitoringVolume-${track.id}" min="0" max="1" step="0.01" 
                           value="${track.monitoringVolume !== undefined ? track.monitoringVolume : 0.5}" 
                           class="flex-1 h-2 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer">
                    <span id="monitoringVolumeLabel-${track.id}" class="text-xs w-8 text-right dark:text-slate-300">${Math.round((track.monitoringVolume !== undefined ? track.monitoringVolume : 0.5) * 100)}%</span>
                </div>
            </div>
        </div>
        <div id="recordingStatus-${track.id}" class="text-xs text-center p-1 rounded ${track.isRecording ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}">
            ${track.isRecording ? '🔴 Recording...' : 'Ready to Record'}
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
            <div id="trackColor-${track.id}" class="flex items-center gap-1 mt-1">
                <span class="text-xs text-gray-500 dark:text-slate-400">Color:</span>
                <div id="trackColorSwatches-${track.id}" class="flex gap-1 flex-wrap">
                    ${buildTrackColorSwatches(track)}
                </div>
            </div>
            <div id="trackName-${track.id}" class="flex items-center gap-1 mt-1">
                <label for="trackNameInput-${track.id}" class="text-xs text-gray-500 dark:text-slate-400">Name:</label>
                <input type="text" id="trackNameInput-${track.id}" value="${track.name}" 
                    class="flex-1 px-2 py-0.5 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-xs">
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
    if (savedState) {
        Object.assign(inspectorOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    }

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

    // Track color swatches
    const colorSwatches = winEl.querySelectorAll(`.track-color-swatch`);
    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            const newColor = swatch.dataset.color;
            if (track.setTrackColor) {
                track.setTrackColor(newColor);
            }
            // Update visual selection
            colorSwatches.forEach(s => {
                s.classList.remove('ring-2', 'ring-white', 'ring-offset-1', 'ring-offset-gray-100', 'dark:ring-offset-slate-800');
            });
            swatch.classList.add('ring-2', 'ring-white', 'ring-offset-1', 'ring-offset-gray-100', 'dark:ring-offset-slate-800');
            showNotification(`Track color changed`, 1500);
        });
    });
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
        }
    }
    return browserWindow;
}

export function openTrackTemplatesWindow(savedState = null) {
    const windowId = 'trackTemplates';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore();
        updateTrackTemplatesWindowContent();
        return openWindows.get(windowId);
    }

    const contentHTML = `<div id="trackTemplatesContent" class="p-3 space-y-3 text-xs overflow-y-auto h-full dark:text-slate-300">
        <div class="flex justify-between items-center mb-2">
            <h3 class="text-sm font-semibold text-gray-200">Track Templates</h3>
            <button id="closeTemplatesBtn" class="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs">Close</button>
        </div>
        <div id="templatesGrid" class="grid grid-cols-2 gap-2">
            <p class="text-gray-500 col-span-2 italic text-center py-4">Loading templates...</p>
        </div>
    </div>`;
    const options = { width: 500, height: 400, minWidth: 400, minHeight: 300, initialContentKey: windowId };
    if (savedState) Object.assign(options, { x: parseInt(savedState.left, 10), y: parseInt(savedState.top, 10), width: parseInt(savedState.width, 10), height: parseInt(savedState.height, 10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

    const templatesWindow = localAppServices.createWindow(windowId, 'Track Templates', contentHTML, options);

    if (templatesWindow?.element) {
        templatesWindow.element.querySelector('#closeTemplatesBtn').addEventListener('click', () => {
            templatesWindow.close();
        });
        templatesWindow.element.querySelector('#templatesGrid').addEventListener('click', (e) => {
            const card = e.target.closest('.template-card');
            if (card) {
                const templateId = parseInt(card.dataset.templateId, 10);
                const template = localAppServices.getTrackTemplateByIdState ? localAppServices.getTrackTemplateByIdState(templateId) : null;
                if (template) {
                    applyTrackTemplate(template);
                }
            }
        });
        templatesWindow.element.querySelector('#templatesGrid').addEventListener('contextmenu', (e) => {
            const card = e.target.closest('.template-card');
            if (card) {
                e.preventDefault();
                const templateId = parseInt(card.dataset.templateId, 10);
                showTemplateContextMenu(templateId, e.clientX, e.clientY);
            }
        });
    }

    updateTrackTemplatesWindowContent(templatesWindow?.element);
    return templatesWindow;
}

function updateTrackTemplatesWindowContent(winElement) {
    const element = winElement || (localAppServices.getWindowById ? localAppServices.getWindowById('trackTemplates')?.element : null);
    if (!element) return;

    const grid = element.querySelector('#templatesGrid');
    if (!grid) return;

    const templates = localAppServices.getTrackTemplatesState ? localAppServices.getTrackTemplatesState() : [];
    if (templates.length === 0) {
        grid.innerHTML = `<p class="text-gray-500 col-span-2 italic text-center py-8">No templates saved yet.</p>
            <p class="text-gray-500 col-span-2 text-center text-[10px]">Use Menu > Save Track as Template to save your first template.</p>`;
    } else {
        grid.innerHTML = templates.map(t => `
            <div class="template-card p-2 rounded cursor-pointer bg-[#2a2a3a] hover:bg-[#3a3a4a] border border-[#3a3a4a] hover:border-[#4a4a5a]"
                 data-template-id="${t.id}" title="${t.name}">
                <div class="flex items-center gap-2 mb-1">
                    <div class="w-3 h-3 rounded" style="background-color: ${t.color}"></div>
                    <span class="text-xs font-medium text-gray-200 truncate">${t.name}</span>
                </div>
                <div class="text-[10px] text-gray-400">${t.type}</div>
                <div class="text-[10px] text-gray-500">${t.activeEffects?.length || 0} effects${t.hasAutomation ? ' • auto' : ''}</div>
            </div>
        `).join('');
    }
}

function applyTrackTemplate(template) {
    try {
        const newTrack = localAppServices.createTrack ? localAppServices.createTrack(template.type) : null;
        if (!newTrack) {
            localAppServices.showNotification?.('Failed to create track from template.', 2000);
            return;
        }
        newTrack.color = template.color || '#54a0ff';
        if (template.synthParams && newTrack.synthParams) {
            Object.assign(newTrack.synthParams, template.synthParams);
        }
        if (template.instrumentSamplerSettings && newTrack.instrumentSamplerSettings) {
            Object.assign(newTrack.instrumentSamplerSettings, template.instrumentSamplerSettings);
        }
        if (template.drumSamplerPads && newTrack.drumSamplerPads) {
            template.drumSamplerPads.forEach((p, i) => {
                if (newTrack.drumSamplerPads[i]) {
                    newTrack.drumSamplerPads[i].volume = p.volume;
                    newTrack.drumSamplerPads[i].pitchShift = p.pitchShift;
                    if (p.envelope) {
                        newTrack.drumSamplerPads[i].envelope = { ...p.envelope };
                    }
                }
            });
        }
        if (template.automationLanes && newTrack.automation) {
            template.automationLanes.forEach(lane => {
                if (lane && lane.paramName) {
                    newTrack.automation[lane.paramName] = [...lane.points];
                }
            });
        }
        // Restore effects from template: add each effect type and restore its params
        if (template.activeEffects && template.activeEffects.length > 0) {
            const effectsRegistry = localAppServices.effectsRegistryAccess;
            template.activeEffects.forEach(effectData => {
                if (effectsRegistry && effectsRegistry.AVAILABLE_EFFECTS && effectsRegistry.AVAILABLE_EFFECTS[effectData.type]) {
                    newTrack.addEffect(effectData.type);
                    // After addEffect, the new effect is at the end of activeEffects array
                    const newEffectWrapper = newTrack.activeEffects[newTrack.activeEffects.length - 1];
                    if (newEffectWrapper && effectData.params) {
                        Object.keys(effectData.params).forEach(paramPath => {
                            newTrack.updateEffectParam(newEffectWrapper.id, paramPath, effectData.params[paramPath]);
                        });
                    }
                }
            });
        }
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`Template "${template.name}" applied to new track.`, 2000);
        }
        if (localAppServices.updateUI) localAppServices.updateUI();
    } catch(e) {
        console.error('[UI applyTrackTemplate] Error:', e);
        localAppServices.showNotification?.('Error applying template.', 2000);
    }
}

function showTemplateContextMenu(templateId, x, y) {
    const existingMenu = document.querySelector('.template-context-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'template-context-menu fixed bg-[#2a2a3a] border border-[#4a4a5a] rounded shadow-lg z-50 text-xs';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.innerHTML = `
        <div class="context-menu-item px-3 py-2 hover:bg-[#3a3a4a] cursor-pointer text-red-400" data-action="delete">Delete Template</div>
    `;
    menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
        if (localAppServices.removeTrackTemplateState) {
            localAppServices.removeTrackTemplateState(templateId);
            updateTrackTemplatesWindowContent();
            localAppServices.showNotification?.('Template deleted.', 1500);
        }
        menu.remove();
    });
    document.body.appendChild(menu);
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 10);
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
    const libSelect = browserWindowEl.querySelector('#librarySelect');
    const pathDisplay = browserWindowEl.querySelector('#currentPathDisplay');
    const isWindowVisible = !browserWindowEl.closest('.window.minimized');
    const currentDropdownSelection = libSelect ? libSelect.value : null;


    let performFullUIUpdate = false;

    if (!isWindowVisible) {
        if (treeNode && Object.keys(treeNode).length > 0) {
            if (localAppServices.setCurrentSoundFileTree) localAppServices.setCurrentSoundFileTree(treeNode);
            if (localAppServices.renderSoundBrowserDirectory) localAppServices.renderSoundBrowserDirectory(pathArray, localAppServices.getCurrentSoundFileTree());
        }
        return;
    }

    if (treeNode && currentDropdownSelection === (treeNode.libraryName || "")) {
        performFullUIUpdate = true;
    } else if (currentDropdownSelection === "" && treeNode && Object.keys(treeNode).length > 0) {
        performFullUIUpdate = true;
    } else if (treeNode && Object.keys(treeNode).length > 0) {
        if (localAppServices.setCurrentSoundFileTree) localAppServices.setCurrentSoundFileTree(treeNode);
        if (localAppServices.renderSoundBrowserDirectory) localAppServices.renderSoundBrowserDirectory(pathArray, localAppServices.getCurrentSoundFileTree());
    } else {
        console.warn(`[UI renderSoundBrowserDirectory WARN] Tree node was empty or invalid.`);
        listDiv.innerHTML = `<p class="text-red-500">Error: Library "${treeNode?.libraryName || ''}" data is empty or corrupt.</p>`;
    }
}


// --- Sequencer Window ---

function buildSequencerContentDOM(track, rows, rowLabels, numBars) {
    const stepsPerBar = Constants.STEPS_PER_BAR;
    const totalSteps = Number.isFinite(numBars) && numBars > 0 ? numBars * stepsPerBar : Constants.defaultStepsPerBar;
    
    // Get scale mode settings
    const scaleMode = localAppServices.getScaleMode ? localAppServices.getScaleMode() : Constants.DEFAULT_SCALE_MODE;
    const isScaleModeEnabled = scaleMode.enabled && (track.type === 'Synth' || track.type === 'InstrumentSampler');
    
    // Helper function to check if a note is in the scale
    const isNoteInScale = (noteName) => {
        if (!isScaleModeEnabled) return true;
        const rootNote = scaleMode.root;
        const scaleIntervals = Constants.SCALES[scaleMode.scale] || Constants.SCALES['Major'];
        
        // Extract note letter and octave
        const match = noteName.match(/^([A-G]#?)(\d)$/);
        if (!match) return true;
        
        const [, noteLetter, octave] = match;
        
        // Calculate semitone distance from root
        const rootIndex = Constants.SCALE_ROOTS.indexOf(rootNote);
        const noteIndex = Constants.SCALE_ROOTS.indexOf(noteLetter);
        
        if (rootIndex === -1 || noteIndex === -1) return true;
        
        // Calculate interval (semitones) from root to this note
        let interval = (noteIndex - rootIndex + 12) % 12;
        
        // Check if interval is in the scale
        return scaleIntervals.includes(interval);
    };

    // Build scale controls HTML (only for Synth/InstrumentSampler tracks)
    let scaleControlsHTML = '';
    if (track.type === 'Synth' || track.type === 'InstrumentSampler') {
        const scaleOptions = Object.keys(Constants.SCALES).map(s => 
            `<option value="${s}" ${s === scaleMode.scale ? 'selected' : ''}>${s}</option>`
        ).join('');
        const rootOptions = Constants.SCALE_ROOTS.map(r => 
            `<option value="${r}" ${r === scaleMode.root ? 'selected' : ''}>${r}</option>`
        ).join('');
        
        scaleControlsHTML = `
            <div class="scale-mode-controls flex items-center gap-1 ml-2 pl-2 border-l border-gray-400 dark:border-slate-600">
                <label class="flex items-center gap-0.5 cursor-pointer">
                    <input type="checkbox" id="scaleModeToggle-${track.id}" ${scaleMode.enabled ? 'checked' : ''} class="w-3 h-3">
                    <span class="text-[10px]">Scale</span>
                </label>
                <select id="scaleRootSelect-${track.id}" class="w-10 p-0.5 border border-gray-300 rounded text-[10px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" ${!scaleMode.enabled ? 'disabled' : ''}>
                    ${rootOptions}
                </select>
                <select id="scaleSelect-${track.id}" class="w-24 p-0.5 border border-gray-300 rounded text-[10px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" ${!scaleMode.enabled ? 'disabled' : ''}>
                    ${scaleOptions}
                </select>
                <label class="flex items-center gap-0.5 cursor-pointer" title="Lock: only allow notes in scale">
                    <input type="checkbox" id="scaleLockToggle-${track.id}" ${scaleMode.lock ? 'checked' : ''} class="w-3 h-3" ${!scaleMode.enabled ? 'disabled' : ''}>
                    <span class="text-[10px]">🔒</span>
                </label>
            </div>`;
    }

    // Build chord controls HTML (only for Synth/InstrumentSampler tracks)
    let chordControlsHTML = '';
    if (track.type === 'Synth' || track.type === 'InstrumentSampler') {
        const chordMode = localAppServices.getChordMode ? localAppServices.getChordMode() : Constants.DEFAULT_CHORD_MODE;
        const chordTypeOptions = Object.keys(Constants.CHORD_TYPES).map(t => 
            `<option value="${t}" ${t === chordMode.type ? 'selected' : ''}>${t}</option>`
        ).join('');
        const rootOptions = Constants.SCALE_ROOTS.map(r => 
            `<option value="${r}" ${r === chordMode.root ? 'selected' : ''}>${r}</option>`
        ).join('');
        
        chordControlsHTML = `
            <div class="chord-mode-controls flex items-center gap-1 ml-2 pl-2 border-l border-gray-400 dark:border-slate-600">
                <label class="flex items-center gap-0.5 cursor-pointer">
                    <input type="checkbox" id="chordModeToggle-${track.id}" ${chordMode.enabled ? 'checked' : ''} class="w-3 h-3">
                    <span class="text-[10px]">Chord</span>
                </label>
                <select id="chordRootSelect-${track.id}" class="w-10 p-0.5 border border-gray-300 rounded text-[10px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" ${!chordMode.enabled ? 'disabled' : ''}>
                    ${rootOptions}
                </select>
                <select id="chordTypeSelect-${track.id}" class="w-20 p-0.5 border border-gray-300 rounded text-[10px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" ${!chordMode.enabled ? 'disabled' : ''}>
                    ${chordTypeOptions}
                </select>
                <label class="flex items-center gap-0.5 cursor-pointer" title="Lock: only allow chord tones">
                    <input type="checkbox" id="chordLockToggle-${track.id}" ${chordMode.lockChord ? 'checked' : ''} class="w-3 h-3" ${!chordMode.enabled ? 'disabled' : ''}>
                    <span class="text-[10px]">🔒</span>
                </label>
            </div>`;
    }

    // Velocity editor toggle button
    const velocityEditorToggleHTML = `
        <label class="flex items-center gap-0.5 cursor-pointer ml-2 pl-2 border-l border-gray-400 dark:border-slate-600">
            <input type="checkbox" id="velocityEditorToggle-${track.id}" class="w-3 h-3">
            <span class="text-[10px]">Velocity</span>
        </label>`;

    // Probability editor toggle button
    const probabilityEditorToggleHTML = `
        <label class="flex items-center gap-0.5 cursor-pointer ml-2 pl-2 border-l border-gray-400 dark:border-slate-600">
            <input type="checkbox" id="probabilityEditorToggle-${track.id}" class="w-3 h-3">
            <span class="text-[10px]">Probability</span>
        </label>`;

    // Automation editor toggle button
    const automationEditorToggleHTML = `
        <label class="flex items-center gap-0.5 cursor-pointer ml-2 pl-2 border-l border-gray-400 dark:border-slate-600">
            <input type="checkbox" id="automationEditorToggle-${track.id}" class="w-3 h-3">
            <span class="text-[10px]">Automation</span>
        </label>`;

    // Ghost Track selector (for showing notes from other tracks)
    const allTracks = localAppServices.getTracks ? localAppServices.getTracks() : [];
    const compatibleGhostTracks = allTracks.filter(t => t.id !== track.id && (t.type === 'Synth' || t.type === 'InstrumentSampler'));
    const currentGhostTrackId = localAppServices.getGhostTrackId ? localAppServices.getGhostTrackId() : null;
    
    let ghostTrackOptionsHTML = '<option value="">None</option>';
    compatibleGhostTracks.forEach(t => {
        const selected = currentGhostTrackId === t.id ? 'selected' : '';
        ghostTrackOptionsHTML += `<option value="${t.id}" ${selected}>${t.name}</option>`;
    });
    
    const ghostTrackSelectHTML = compatibleGhostTracks.length > 0 ? `
        <label class="flex items-center gap-0.5 cursor-pointer ml-2 pl-2 border-l border-gray-400 dark:border-slate-600">
            <span class="text-[10px]">Ghost:</span>
            <select id="ghostTrackSelect-${track.id}" class="w-24 p-0.5 border border-gray-300 rounded text-[10px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                ${ghostTrackOptionsHTML}
            </select>
        </label>` : '';

    let html = `<div class="sequencer-container p-1 text-xs overflow-auto h-full dark:bg-slate-900 dark:text-slate-300"> <div class="controls mb-1 flex flex-wrap justify-between items-center sticky top-0 left-0 bg-gray-200 dark:bg-slate-800 p-1 z-30 border-b dark:border-slate-700"> <span class="font-semibold">${track.name} - ${numBars} Bar${numBars > 1 ? 's' : ''} (${totalSteps} steps)</span> <div class="flex items-center flex-wrap gap-1"> <label for="seqLengthInput-${track.id}">Bars: </label> <input type="number" id="seqLengthInput-${track.id}" value="${numBars}" min="1" max="${Constants.MAX_BARS || 16}" step="0.1" class="w-12 p-0.5 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-purple-600 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"> ${scaleControlsHTML} ${chordControlsHTML} ${velocityEditorToggleHTML} ${probabilityEditorToggleHTML} ${automationEditorToggleHTML} ${ghostTrackSelectHTML} </div> </div>`;
    html += `<div class="sequencer-grid-layout" style="display: grid; grid-template-columns: 50px repeat(${totalSteps}, 20px); grid-auto-rows: 20px; gap: 0px; width: fit-content; position: relative; top: 0; left: 0;"> <div class="sequencer-header-cell sticky top-0 left-0 z-20 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700"></div>`;
    for (let i = 0; i < totalSteps; i++) { const beatsPerBar = 4; const barNum = Math.floor(i / beatsPerBar) + 1; const beatInBar = (i % beatsPerBar) + 1; const label = beatInBar === 1 ? String(barNum) : `${barNum}.${beatInBar}`; html += `<div class="sequencer-header-cell sticky top-0 z-10 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700 flex items-center justify-center pr-1 text-[10px] text-gray-500 dark:text-slate-400">${label}</div>`; }

    const activeSequence = track.getActiveSequence();
    const sequenceData = activeSequence ? activeSequence.data : [];

    // Get ghost track data for rendering ghost notes
    const ghostTrackId = currentGhostTrackId ? parseInt(currentGhostTrackId) : null;
    const ghostTrack = ghostTrackId ? (localAppServices.getTrackById ? localAppServices.getTrackById(ghostTrackId) : null) : null;
    const ghostSequence = ghostTrack ? ghostTrack.getActiveSequence() : null;
    const ghostSequenceData = ghostSequence ? ghostSequence.data : [];
    
    // Build a map of ghost notes for quick lookup
    const ghostNotesMap = new Map(); // key: "row-col" -> true
    if (ghostSequenceData.length > 0 && rowLabels) {
        for (let ghostRow = 0; ghostRow < ghostSequenceData.length; ghostRow++) {
            for (let ghostCol = 0; ghostCol < (ghostSequenceData[ghostRow]?.length || 0); ghostCol++) {
                const ghostStep = ghostSequenceData[ghostRow]?.[ghostCol];
                if (ghostStep?.active) {
                    // Map ghost pitch to current track's row
                    const ghostPitch = Constants.synthPitches[ghostRow];
                    const currentRowIndex = rowLabels.indexOf(ghostPitch);
                    if (currentRowIndex !== -1) {
                        ghostNotesMap.set(`${currentRowIndex}-${ghostCol}`, true);
                    }
                }
            }
        }
    }

    // Calculate max velocity per column for velocity editor
    const maxVelocityPerColumn = [];
    for (let col = 0; col < totalSteps; col++) {
        let maxVel = 0;
        for (let row = 0; row < rows; row++) {
            const stepData = sequenceData[row]?.[col];
            if (stepData?.active && stepData.velocity !== undefined) {
                maxVel = Math.max(maxVel, stepData.velocity);
            }
        }
        maxVelocityPerColumn[col] = maxVel;
    }

    // Calculate max probability per column for probability editor
    const maxProbabilityPerColumn = [];
    for (let col = 0; col < totalSteps; col++) {
        let maxProb = 0;
        for (let row = 0; row < rows; row++) {
            const stepData = sequenceData[row]?.[col];
            if (stepData?.active && stepData.probability !== undefined) {
                maxProb = Math.max(maxProb, stepData.probability);
            } else if (stepData?.active) {
                // Default probability is 1.0 for active notes without explicit probability
                maxProb = Math.max(maxProb, Constants.DEFAULT_NOTE_PROBABILITY || 1.0);
            }
        }
        maxProbabilityPerColumn[col] = maxProb || (maxVel > 0 ? Constants.DEFAULT_NOTE_PROBABILITY || 1.0 : 0);
    }

    for (let i = 0; i < rows; i++) {
        let labelText = rowLabels[i] || `R${i + 1}`; if (labelText.length > 6) labelText = labelText.substring(0,5) + "..";
        
        // Check if this row is in the scale (for highlighting)
        const rowLabel = rowLabels[i] || '';
        const isInScale = isNoteInScale(rowLabel);
        const scaleHighlightClass = isScaleModeEnabled && !isInScale ? 'opacity-30' : '';
        
        html += `<div class="sequencer-label-cell sticky left-0 z-10 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700 flex items-center justify-end pr-1 text-[10px] ${scaleHighlightClass}" title="${rowLabels[i] || ''}">${labelText}</div>`;
        for (let j = 0; j < totalSteps; j++) {
            const stepData = sequenceData[i]?.[j];
            let activeClass = '';
            let velocityAttr = '';
            let velocityOpacityStyle = '';
            let ghostClass = '';
            
            // Check for ghost note at this position
            const isGhostNote = ghostNotesMap.has(`${i}-${j}`);
            if (isGhostNote && !stepData?.active) {
                ghostClass = 'ghost-note';
            }
            
            if (stepData?.active) { 
                if (track.type === 'Synth') activeClass = 'active-synth'; 
                else if (track.type === 'Sampler') activeClass = 'active-sampler'; 
                else if (track.type === 'DrumSampler') activeClass = 'active-drum-sampler'; 
                else if (track.type === 'InstrumentSampler') activeClass = 'active-instrument-sampler';
                // Add velocity data attribute and opacity style
                const velocity = stepData.velocity !== undefined ? stepData.velocity : Constants.defaultVelocity;
                velocityAttr = `data-velocity="${velocity.toFixed(2)}"`;
                // Scale opacity from 0.5 to 1.0 based on velocity (0.0-1.0)
                const opacity = 0.5 + (velocity * 0.5);
                velocityOpacityStyle = `style="opacity: ${opacity.toFixed(2)}"`;
            }
            let beatBlockClass = (Math.floor((j % stepsPerBar) / 4) % 2 === 0) ? 'bg-gray-50 dark:bg-slate-700' : 'bg-white dark:bg-slate-750';
            if (j % stepsPerBar === 0 && j > 0) beatBlockClass += ' border-l-2 border-l-gray-400 dark:border-l-slate-600';
            else if (j > 0 && j % (stepsPerBar / 2) === 0) beatBlockClass += ' border-l-gray-300 dark:border-l-slate-650';
            else if (j > 0 && j % (stepsPerBar / 4) === 0) beatBlockClass += ' border-l-gray-200 dark:border-l-slate-675';
            
            // Apply scale highlighting to cells
            const cellScaleClass = isScaleModeEnabled && !isInScale ? 'opacity-30' : '';
            
            html += `<div class="sequencer-step-cell ${activeClass} ${ghostClass} ${beatBlockClass} ${cellScaleClass} border-r border-b border-gray-200 dark:border-slate-600" data-row="${i}" data-col="${j}" data-active="${stepData?.active ? 'true' : 'false'}" ${velocityAttr} ${velocityOpacityStyle} title="R${i+1},S${j+1}${stepData?.active ? ` V:${Math.round((stepData.velocity || Constants.defaultVelocity) * 127)}` : ''}${isGhostNote ? ' [Ghost]' : ''}"></div>`;
        }
    }
    html += `</div>`;
    
    // Velocity Editor Lane (initially hidden)
    html += `<div id="velocityEditor-${track.id}" class="velocity-editor-lane hidden mt-1 border-t border-gray-400 dark:border-slate-600 pt-1">`;
    html += `<div class="text-[10px] font-semibold mb-1 text-gray-500 dark:text-slate-400">Velocity Editor (click/drag on bars to edit)</div>`;
    html += `<div class="velocity-editor-grid" style="display: grid; grid-template-columns: 50px repeat(${totalSteps}, 20px); grid-auto-rows: 60px; gap: 0px; width: fit-content;">`;
    html += `<div class="velocity-label sticky left-0 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700 flex items-center justify-center text-[9px] text-gray-400">VEL</div>`;
    for (let col = 0; col < totalSteps; col++) {
        const maxVel = maxVelocityPerColumn[col] || 0;
        const barHeight = Math.round(maxVel * 56); // 60px max height - 4px padding
        const barColor = maxVel > 0 ? '#7c3aed' : '#333333';
        const beatsPerBar = 4;
        const barNum = Math.floor(col / beatsPerBar) + 1;
        const beatInBar = (col % beatsPerBar) + 1;
        const isBeat = beatInBar === 1;
        const borderClass = col % stepsPerBar === 0 && col > 0 ? 'border-l-2 border-l-gray-500' : '';
        
        html += `<div class="velocity-cell relative border-r border-b border-gray-300 dark:border-slate-600 ${borderClass} flex items-end justify-center p-0.5 cursor-pointer hover:bg-slate-700" data-col="${col}" data-max-velocity="${maxVel.toFixed(2)}" title="Step ${col + 1}: ${maxVel > 0 ? Math.round(maxVel * 127) : 'No notes'}">`;
        html += `<div class="velocity-bar w-full rounded-t transition-all duration-75" style="height: ${barHeight}px; background-color: ${barColor};" data-col="${col}"></div>`;
        html += `</div>`;
    }
    html += `</div></div>`;
    
    // Probability Editor Lane (initially hidden)
    html += `<div id="probabilityEditor-${track.id}" class="probability-editor-lane hidden mt-1 border-t border-gray-400 dark:border-slate-600 pt-1">`;
    html += `<div class="text-[10px] font-semibold mb-1 text-gray-500 dark:text-slate-400">Probability Editor (click/drag on bars to edit - 0% = never plays, 100% = always plays)</div>`;
    html += `<div class="probability-editor-grid" style="display: grid; grid-template-columns: 50px repeat(${totalSteps}, 20px); grid-auto-rows: 60px; gap: 0px; width: fit-content;">`;
    html += `<div class="probability-label sticky left-0 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700 flex items-center justify-center text-[9px] text-gray-400">PROB</div>`;
    for (let col = 0; col < totalSteps; col++) {
        const maxProb = maxProbabilityPerColumn[col] || 0;
        const barHeight = Math.round(maxProb * 56); // 60px max height - 4px padding
        const barColor = maxProb > 0 ? '#0d9488' : '#333333';
        const beatsPerBar = 4;
        const barNum = Math.floor(col / beatsPerBar) + 1;
        const beatInBar = (col % beatsPerBar) + 1;
        const isBeat = beatInBar === 1;
        const borderClass = col % stepsPerBar === 0 && col > 0 ? 'border-l-2 border-l-gray-500' : '';
        
        html += `<div class="probability-cell relative border-r border-b border-gray-300 dark:border-slate-600 ${borderClass} flex items-end justify-center p-0.5 cursor-pointer hover:bg-slate-700" data-col="${col}" data-max-probability="${maxProb.toFixed(2)}" title="Step ${col + 1}: ${maxProb > 0 ? Math.round(maxProb * 100) + '%' : 'No notes'}">`;
        html += `<div class="probability-bar w-full rounded-t transition-all duration-75" style="height: ${barHeight}px; background-color: ${barColor};" data-col="${col}"></div>`;
        html += `</div>`;
    }
    html += `</div></div>`;
    

    
    // Automation Editor Lane (initially hidden)
    html += `<div id="automationEditor-${track.id}" class="automation-editor-lane hidden mt-1 border-t border-gray-400 dark:border-slate-600 pt-1">`;
    html += `<div class="text-[10px] font-semibold mb-1 text-gray-500 dark:text-slate-400">Automation Editor (click to add/move points)</div>`;
    
    // Parameter selector for automation
    const paramOptions = (Constants.AUTOMATION_LANE_PARAMETERS || ['volume', 'pan']).map(p => 
        `<option value="${p}">${p.charAt(0).toUpperCase() + p.slice(1)}</option>`
    ).join('');
    html += `<div class="flex items-center gap-2 mb-2">
        <select id="automationParamSelect-${track.id}" class="p-0.5 border border-gray-300 rounded text-[10px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">${paramOptions}</select>
        <button id="clearAutomationBtn-${track.id}" class="px-2 py-0.5 text-[10px] border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Clear Lane</button>
    </div>`;
    
    html += `<div class="automation-editor-grid" style="display: grid; grid-template-columns: 50px repeat(${totalSteps}, 20px); grid-auto-rows: 60px; gap: 0px; width: fit-content;">`;
    html += `<div class="automation-label sticky left-0 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700 flex items-center justify-center text-[9px] text-gray-400">AUTO</div>`;
    
    // Get current parameter and its automation data
    const autoParam = 'volume'; // Default
    const automationLane = track.getAutomationLane ? track.getAutomationLane(autoParam) : [];
    
    for (let col = 0; col < totalSteps; col++) {
        // Find automation point at this step
        const point = automationLane.find(p => p.step === col);
        const hasPoint = !!point;
        const pointValue = point ? point.value : Constants.AUTOMATION_LANE_DEFAULT;
        const barHeight = Math.round(pointValue * 56); // 60px max height - 4px padding
        const beatsPerBar = 4;
        const borderClass = col % stepsPerBar === 0 && col > 0 ? 'border-l-2 border-l-gray-500' : '';
        
        // Color based on whether there's a point
        const barColor = hasPoint ? '#ff9f43' : '#333333';
        
        html += `<div class="automation-cell relative border-r border-b border-gray-300 dark:border-slate-600 ${borderClass} flex items-end justify-center p-0.5 cursor-pointer hover:bg-slate-700" data-col="${col}" data-has-point="${hasPoint}" data-value="${pointValue.toFixed(2)}" title="Step ${col + 1}: ${hasPoint ? Math.round(pointValue * 100) + '%' : 'No point'}">`;
        html += `<div class="automation-bar w-full rounded-t transition-all duration-75 ${hasPoint ? 'cursor-move' : ''}" style="height: ${barHeight}px; background-color: ${barColor}; ${hasPoint ? 'opacity: 1;' : 'opacity: 0.3;'}" data-col="${col}"></div>`;
        // Show dot on top if there's a point
        if (hasPoint) {
            html += `<div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-500 border border-white pointer-events-none"></div>`;
        }
        html += `</div>`;
    }
    html += `</div></div>`;
    
    html += `</div>`; return html;
}

export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track || track.type === 'Audio') {
        console.warn(`[UI openTrackSequencerWindow] Track ${trackId} not found or is Audio type. Aborting.`);
        return null;
    }
    const windowId = `sequencerWin-${trackId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();

    if (forceRedraw && openWindows.has(windowId)) {
        const existingWindow = openWindows.get(windowId);
        if (existingWindow && typeof existingWindow.close === 'function') {
            try {
                existingWindow.close(true);
            } catch (e) {console.warn(`[UI openTrackSequencerWindow] Error closing existing sequencer window for redraw for track ${trackId}:`, e)}
        } else {
        }
    }
    if (openWindows.has(windowId) && !forceRedraw && !savedState) {
        const win = openWindows.get(windowId);
        win.restore();
        if (localAppServices.getActiveSequencerTrackId && localAppServices.getActiveSequencerTrackId() === trackId && localAppServices.setActiveSequencerTrackId) localAppServices.setActiveSequencerTrackId(null);
        return win;
    }

    const activeSequence = track.getActiveSequence();
    if (!activeSequence) {
        console.error(`[UI openTrackSequencerWindow] Track ${trackId} has no active sequence. Cannot open sequencer.`);
        return null;
    }

    let rows, rowLabels;
    const numBars = activeSequence.length > 0 ? Math.max(1, activeSequence.length / Constants.STEPS_PER_BAR) : 1;

    if (track.type === 'Synth' || track.type === 'InstrumentSampler') { rows = Constants.synthPitches.length; rowLabels = Constants.synthPitches; }
    else if (track.type === 'Sampler') { rows = track.slices.length > 0 ? track.slices.length : Constants.numSlices; rowLabels = Array.from({ length: rows }, (_, i) => `Slice ${i + 1}`); }
    else if (track.type === 'DrumSampler') { rows = Constants.numDrumSamplerPads; rowLabels = Array.from({ length: rows }, (_, i) => `Pad ${i + 1}`); }
    else { rows = 0; rowLabels = []; }

    const contentDOM = buildSequencerContentDOM(track, rows, rowLabels, numBars);

    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const safeDesktopWidth = (desktopEl && typeof desktopEl.offsetWidth === 'number' && desktopEl.offsetWidth > 0)
                           ? desktopEl.offsetWidth
                           : 1024; // More robust fallback


    let calculatedWidth = Math.max(400, Math.min(900, safeDesktopWidth - 40));
    let calculatedHeight = 400;

    if (!Number.isFinite(calculatedWidth) || calculatedWidth <= 0) {
        console.warn(`[UI openTrackSequencerWindow] Invalid calculatedWidth (${calculatedWidth}) for track ${trackId}, defaulting to 600.`);
        calculatedWidth = 600;
    }
    if (!Number.isFinite(calculatedHeight) || calculatedHeight <= 0) {
        console.warn(`[UI openTrackSequencerWindow] Invalid calculatedHeight (${calculatedHeight}) for track ${trackId}, defaulting to 400.`);
        calculatedHeight = 400;
    }

    const seqOptions = {
        width: calculatedWidth,
        height: calculatedHeight,
        minWidth: 400,
        minHeight: 250,
        initialContentKey: windowId,
        onCloseCallback: () => { if (localAppServices.getActiveSequencerTrackId && localAppServices.getActiveSequencerTrackId() === trackId && localAppServices.setActiveSequencerTrackId) localAppServices.setActiveSequencerTrackId(null); }
    };
    if (savedState) {
        if (Number.isFinite(parseInt(savedState.left,10))) seqOptions.x = parseInt(savedState.left,10);
        if (Number.isFinite(parseInt(savedState.top,10))) seqOptions.y = parseInt(savedState.top,10);
        if (Number.isFinite(parseInt(savedState.width,10)) && parseInt(savedState.width,10) >= seqOptions.minWidth) seqOptions.width = parseInt(savedState.width,10);
        if (Number.isFinite(parseInt(savedState.height,10)) && parseInt(savedState.height,10) >= seqOptions.minHeight) seqOptions.height = parseInt(savedState.height,10);
        if (Number.isFinite(parseInt(savedState.zIndex))) seqOptions.zIndex = parseInt(savedState.zIndex);
        seqOptions.isMinimized = savedState.isMinimized;
    }

    const sequencerWindow = localAppServices.createWindow(windowId, `Sequencer: ${track.name} - ${activeSequence.name}`, contentDOM, seqOptions);

    if (sequencerWindow?.element) {
        const allCells = Array.from(sequencerWindow.element.querySelectorAll('.sequencer-step-cell'));
        sequencerWindow.stepCellsGrid = [];
        const currentSequenceLength = activeSequence ? activeSequence.length : Constants.defaultStepsPerBar;
        for (let i = 0; i < rows; i++) {
            sequencerWindow.stepCellsGrid[i] = allCells.slice(i * currentSequenceLength, (i + 1) * currentSequenceLength);
        }
        sequencerWindow.lastPlayedCol = -1;


        if (localAppServices.setActiveSequencerTrackId) localAppServices.setActiveSequencerTrackId(trackId);
        const grid = sequencerWindow.element.querySelector('.sequencer-grid-layout');
        const controlsDiv = sequencerWindow.element.querySelector('.sequencer-container .controls');

        if (controlsDiv) {
            controlsDiv.draggable = true;
            controlsDiv.addEventListener('dragstart', (e) => {
                const currentActiveSeq = track.getActiveSequence();
                if (currentActiveSeq) {
                    const dragData = {
                        type: 'sequence-timeline-drag',
                        sourceSequenceId: currentActiveSeq.id,
                        sourceTrackId: track.id,
                        clipName: currentActiveSeq.name
                    };
                    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                    e.dataTransfer.effectAllowed = 'copy';
                } else {
                    e.preventDefault();
                    console.warn(`[UI Sequencer DragStart] No active sequence to drag for track ${track.name}`);
                }
            });
        }


        const sequencerContextMenuHandler = (event) => {
            event.preventDefault(); event.stopPropagation();
            const currentTrackForMenu = localAppServices.getTrackById ? localAppServices.getTrackById(track.id) : null; if (!currentTrackForMenu) return;
            const currentActiveSeq = currentTrackForMenu.getActiveSequence(); if(!currentActiveSeq) return;
            const clipboard = localAppServices.getClipboardData ? localAppServices.getClipboardData() : {};
            const menuItems = [
                { label: `Cut "${currentActiveSeq.name}"`, action: () => {
                    const selection = localAppServices.getSelectedSequenceSelection ? localAppServices.getSelectedSequenceSelection() : null;
                    if (selection && selection.startCol !== undefined && selection.endCol !== undefined) {
                        const cutData = currentTrackForMenu.cutSequenceSection(selection.startCol, selection.endCol);
                        if (cutData && localAppServices.setClipboardData) {
                            localAppServices.setClipboardData({ type: 'sequence', sourceTrackType: currentTrackForMenu.type, data: cutData, sequenceLength: selection.endCol - selection.startCol + 1, startCol: selection.startCol });
                            currentTrackForMenu.recreateToneSequence(true);
                            if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                            showNotification(`Sequence cut.`, 2000);
                        }
                    } else {
                        const startStr = prompt('Enter start column (0-indexed):', '0');
                        const startCol = parseInt(startStr, 10);
                        if (isNaN(startCol) || startCol < 0) { showNotification('Invalid start column.', 2000); return; }
                        const endStr = prompt('Enter end column (0-indexed):', String(currentActiveSeq.length - 1));
                        const endCol = parseInt(endStr, 10);
                        if (isNaN(endCol) || endCol < startCol) { showNotification('Invalid end column.', 2000); return; }
                        const cutData = currentTrackForMenu.cutSequenceSection(startCol, endCol);
                        if (cutData && localAppServices.setClipboardData) {
                            localAppServices.setClipboardData({ type: 'sequence', sourceTrackType: currentTrackForMenu.type, data: cutData, sequenceLength: endCol - startCol + 1, startCol: startCol });
                            currentTrackForMenu.recreateToneSequence(true);
                            if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                            showNotification(`Sequence cut (columns ${startCol}-${endCol}).`, 2000);
                        }
                    }
                } },
                { label: `Copy "${currentActiveSeq.name}"`, action: () => { if (localAppServices.setClipboardData) { localAppServices.setClipboardData({ type: 'sequence', sourceTrackType: currentTrackForMenu.type, data: JSON.parse(JSON.stringify(currentActiveSeq.data || [])), sequenceLength: currentActiveSeq.length }); showNotification(`Sequence "${currentActiveSeq.name}" copied.`, 2000); } } },
                { label: `Paste into "${currentActiveSeq.name}"`, action: () => { if (!clipboard || clipboard.type !== 'sequence' || !clipboard.data) { showNotification("Clipboard empty or no sequence data.", 2000); return; } if (clipboard.sourceTrackType !== currentTrackForMenu.type) { showNotification(`Track types mismatch. Can't paste ${clipboard.sourceTrackType} sequence into ${currentTrackForMenu.type} track.`, 3000); return; } if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Paste Sequence into ${currentActiveSeq.name} on ${currentTrackForMenu.name}`); currentActiveSeq.data = JSON.parse(JSON.stringify(clipboard.data)); currentActiveSeq.length = clipboard.sequenceLength; currentTrackForMenu.recreateToneSequence(true); showNotification(`Sequence pasted into "${currentActiveSeq.name}".`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { separator: true },
                { label: `Erase "${currentActiveSeq.name}"`, action: () => { showConfirmationDialog(`Erase Sequence "${currentActiveSeq.name}" for ${currentTrackForMenu.name}?`, "This will clear all notes. This can be undone.", () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Erase Sequence ${currentActiveSeq.name} for ${currentTrackForMenu.name}`); let numRowsErase = currentActiveSeq.data.length; currentActiveSeq.data = Array(numRowsErase).fill(null).map(() => Array(currentActiveSeq.length).fill(null)); currentTrackForMenu.recreateToneSequence(true); showNotification(`Sequence "${currentActiveSeq.name}" erased.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); }); } },
                { label: `Double Length of "${currentActiveSeq.name}"`, action: () => { const currentNumBars = currentActiveSeq.length / Constants.STEPS_PER_BAR; if (currentNumBars * 2 > (Constants.MAX_BARS || 16)) { showNotification(`Exceeds max of ${Constants.MAX_BARS || 16} bars.`, 3000); return; } currentTrackForMenu.doubleSequence(); showNotification(`Sequence length doubled for "${currentActiveSeq.name}".`, 2000); } },
                { separator: true },
                { label: '--- Pattern Operations ---', header: true },
                { label: 'Randomize Pattern...', action: () => { 
                    const density = prompt('Enter randomization density (0.0 - 1.0):', '0.3');
                    const densityValue = parseFloat(density);
                    if (isNaN(densityValue) || densityValue < 0 || densityValue > 1) { 
                        showNotification('Invalid density value. Must be between 0 and 1.', 3000); 
                        return; 
                    }
                    const count = currentTrackForMenu.randomizePattern(densityValue);
                    showNotification(`Randomized pattern: ${count} notes activated.`, 2000);
                    if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                } },
                { label: 'Shift Pattern Left ←', action: () => { 
                    const count = currentTrackForMenu.shiftPatternLeft();
                    showNotification(`Pattern shifted left: ${count} notes moved.`, 2000);
                    if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                } },
                { label: 'Shift Pattern Right →', action: () => { 
                    const count = currentTrackForMenu.shiftPatternRight();
                    showNotification(`Pattern shifted right: ${count} notes moved.`, 2000);
                    if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                } },
                { label: 'Mirror Horizontal (⇌)', action: () => { 
                    currentTrackForMenu.mirrorPatternHorizontal();
                    showNotification('Pattern mirrored horizontally.', 2000);
                    if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                } },
                { label: 'Mirror Vertical (⇅)', action: () => { 
                    const success = currentTrackForMenu.mirrorPatternVertical();
                    if (success) {
                        showNotification('Pattern mirrored vertically (pitches inverted).', 2000);
                        if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                    }
                }, disabled: (currentTrackForMenu.type !== 'Synth' && currentTrackForMenu.type !== 'InstrumentSampler') },
                { label: 'Humanize Pattern...', action: () => { 
                    const intensity = prompt('Enter humanize intensity (0.0 - 1.0):', '0.3');
                    const intensityValue = parseFloat(intensity);
                    if (isNaN(intensityValue) || intensityValue < 0 || intensityValue > 1) { 
                        showNotification('Invalid intensity value. Must be between 0 and 1.', 3000); 
                        return; 
                    }
                    const count = currentTrackForMenu.humanizePattern(intensityValue);
                    showNotification(`Humanized pattern: ${count} notes affected.`, 2000);
                    if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                } },
                { separator: true },
                { label: '--- Arpeggiator ---', header: true },
                { label: 'Arpeggiate Up ↑', action: () => { 
                    const count = currentTrackForMenu.arpeggiatePattern('up', 16, 1);
                    if (count > 0 && localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                }, disabled: (currentTrackForMenu.type !== 'Synth' && currentTrackForMenu.type !== 'InstrumentSampler') },
                { label: 'Arpeggiate Down ↓', action: () => { 
                    const count = currentTrackForMenu.arpeggiatePattern('down', 16, 1);
                    if (count > 0 && localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                }, disabled: (currentTrackForMenu.type !== 'Synth' && currentTrackForMenu.type !== 'InstrumentSampler') },
                { label: 'Arpeggiate Up-Down ↕', action: () => { 
                    const count = currentTrackForMenu.arpeggiatePattern('updown', 16, 1);
                    if (count > 0 && localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                }, disabled: (currentTrackForMenu.type !== 'Synth' && currentTrackForMenu.type !== 'InstrumentSampler') },
                { label: 'Arpeggiate Down-Up ↕', action: () => { 
                    const count = currentTrackForMenu.arpeggiatePattern('downup', 16, 1);
                    if (count > 0 && localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                }, disabled: (currentTrackForMenu.type !== 'Synth' && currentTrackForMenu.type !== 'InstrumentSampler') },
                { label: 'Arpeggiate Random 🎲', action: () => { 
                    const modeInput = prompt('Enter mode (up, down, updown, downup, random, converge, diverge):', 'up');
                    const validModes = ['up', 'down', 'updown', 'downup', 'random', 'converge', 'diverge'];
                    if (!validModes.includes(modeInput)) { 
                        showNotification('Invalid mode. Use: up, down, updown, downup, random, converge, or diverge.', 3000); 
                        return; 
                    }
                    const rateInput = prompt('Enter rate (8, 16, or 32 for 1/8th, 1/16th, 1/32nd notes):', '16');
                    const rateValue = parseInt(rateInput, 10);
                    if (isNaN(rateValue) || ![8, 16, 32].includes(rateValue)) { 
                        showNotification('Invalid rate. Must be 8, 16, or 32.', 3000); 
                        return; 
                    }
                    const octavesInput = prompt('Enter number of octaves (1-4):', '1');
                    const octavesValue = parseInt(octavesInput, 10);
                    if (isNaN(octavesValue) || octavesValue < 1 || octavesValue > 4) { 
                        showNotification('Invalid octave value. Must be between 1 and 4.', 3000); 
                        return; 
                    }
                    const count = currentTrackForMenu.arpeggiatePattern(modeInput, rateValue, octavesValue);
                    if (count > 0 && localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                }, disabled: (currentTrackForMenu.type !== 'Synth' && currentTrackForMenu.type !== 'InstrumentSampler') },
                { separator: true },
                { label: '--- Transpose ---', header: true },
                { label: 'Transpose Up ↑ (+1 semitone)', action: () => { 
                    const count = currentTrackForMenu.shiftSequenceNotes(-1);
                    if (count > 0) {
                        showNotification(`Transposed up: ${count} notes shifted.`, 2000);
                        if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                    } else {
                        showNotification('No notes to transpose.', 2000);
                    }
                }, disabled: (currentTrackForMenu.type !== 'Synth' && currentTrackForMenu.type !== 'InstrumentSampler') },
                { label: 'Transpose Down ↓ (-1 semitone)', action: () => { 
                    const count = currentTrackForMenu.shiftSequenceNotes(1);
                    if (count > 0) {
                        showNotification(`Transposed down: ${count} notes shifted.`, 2000);
                        if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                    } else {
                        showNotification('No notes to transpose.', 2000);
                    }
                }, disabled: (currentTrackForMenu.type !== 'Synth' && currentTrackForMenu.type !== 'InstrumentSampler') },
                { label: 'Transpose by...', action: () => { 
                    const semitones = prompt('Enter semitones to transpose (+/- 12):', '0');
                    const semitonesValue = parseInt(semitones, 10);
                    if (isNaN(semitonesValue) || semitonesValue < -12 || semitonesValue > 12) { 
                        showNotification('Invalid value. Must be between -12 and 12.', 3000); 
                        return; 
                    }
                    const count = currentTrackForMenu.shiftSequenceNotes(-semitonesValue);
                    if (count > 0) {
                        showNotification(`Transposed ${semitonesValue > 0 ? 'up' : 'down'} ${Math.abs(semitonesValue)} semitones: ${count} notes shifted.`, 2000);
                        if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                    } else {
                        showNotification('No notes to transpose.', 2000);
                    }
                }, disabled: (currentTrackForMenu.type !== 'Synth' && currentTrackForMenu.type !== 'InstrumentSampler') },
                { separator: true },
                { label: '--- Timing ---', header: true },
                { label: 'Quantize Pattern...', action: () => { 
                    const quantizeValue = prompt('Enter quantize value (1, 2, 4, 8, or 16):', '16');
                    const qVal = parseInt(quantizeValue, 10);
                    if (isNaN(qVal) || ![1, 2, 4, 8, 16].includes(qVal)) { 
                        showNotification('Invalid quantize value. Must be 1, 2, 4, 8, or 16.', 3000); 
                        return; 
                    }
                    const count = currentTrackForMenu.quantizeSequence(qVal);
                    if (count > 0) {
                        showNotification(`Quantized to 1/${qVal} notes: ${count} notes moved.`, 2000);
                        currentTrackForMenu.recreateToneSequence(true);
                        if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                    } else {
                        showNotification('No notes needed quantizing.', 2000);
                    }
                } },
                { separator: true },
                { label: '--- Note Repeat / Roll ---', header: true },
                { label: 'Drum Roll (4 notes)...', action: () => { 
                    const rowInput = prompt('Enter row/pitch index (0 = top):', '0');
                    const row = parseInt(rowInput, 10);
                    if (isNaN(row) || row < 0) { 
                        showNotification('Invalid row value.', 3000); 
                        return; 
                    }
                    const startColInput = prompt('Enter start step (0-indexed):', '0');
                    const startCol = parseInt(startColInput, 10);
                    if (isNaN(startCol) || startCol < 0) { 
                        showNotification('Invalid start step.', 3000); 
                        return; 
                    }
                    const count = currentTrackForMenu.noteRepeat(row, startCol, 4, 0);
                    showNotification(`Created drum roll: ${count} notes.`, 2000);
                    if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                } },
                { label: 'Drum Roll (8 notes)...', action: () => { 
                    const rowInput = prompt('Enter row/pitch index (0 = top):', '0');
                    const row = parseInt(rowInput, 10);
                    if (isNaN(row) || row < 0) { 
                        showNotification('Invalid row value.', 3000); 
                        return; 
                    }
                    const startColInput = prompt('Enter start step (0-indexed):', '0');
                    const startCol = parseInt(startColInput, 10);
                    if (isNaN(startCol) || startCol < 0) { 
                        showNotification('Invalid start step.', 3000); 
                        return; 
                    }
                    const count = currentTrackForMenu.noteRepeat(row, startCol, 8, 0);
                    showNotification(`Created drum roll: ${count} notes.`, 2000);
                    if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                } },
                { label: 'Roll with Fade...', action: () => { 
                    const rowInput = prompt('Enter row/pitch index (0 = top):', '0');
                    const row = parseInt(rowInput, 10);
                    if (isNaN(row) || row < 0) { 
                        showNotification('Invalid row value.', 3000); 
                        return; 
                    }
                    const startColInput = prompt('Enter start step (0-indexed):', '0');
                    const startCol = parseInt(startColInput, 10);
                    if (isNaN(startCol) || startCol < 0) { 
                        showNotification('Invalid start step.', 3000); 
                        return; 
                    }
                    const countInput = prompt('Enter number of notes (1-16):', '8');
                    const count = parseInt(countInput, 10);
                    if (isNaN(count) || count < 1 || count > 16) { 
                        showNotification('Invalid count. Must be 1-16.', 3000); 
                        return; 
                    }
                    const fadeInput = prompt('Enter fade amount (0.0 - 1.0):', '0.5');
                    const fade = parseFloat(fadeInput);
                    if (isNaN(fade) || fade < 0 || fade > 1) { 
                        showNotification('Invalid fade value. Must be between 0 and 1.', 3000); 
                        return; 
                    }
                    const noteCount = currentTrackForMenu.noteRepeat(row, startCol, count, fade);
                    showNotification(`Created roll with fade: ${noteCount} notes.`, 2000);
                    if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                } },
                { label: 'Custom Note Repeat...', action: () => { 
                    const rowInput = prompt('Enter row/pitch index (0 = top):', '0');
                    const row = parseInt(rowInput, 10);
                    if (isNaN(row) || row < 0) { 
                        showNotification('Invalid row value.', 3000); 
                        return; 
                    }
                    const startColInput = prompt('Enter start step (0-indexed):', '0');
                    const startCol = parseInt(startColInput, 10);
                    if (isNaN(startCol) || startCol < 0) { 
                        showNotification('Invalid start step.', 3000); 
                        return; 
                    }
                    const countInput = prompt('Enter number of notes (1-32):', '4');
                    const count = parseInt(countInput, 10);
                    if (isNaN(count) || count < 1 || count > 32) { 
                        showNotification('Invalid count. Must be 1-32.', 3000); 
                        return; 
                    }
                    const fadeInput = prompt('Enter fade amount (0.0 - 1.0, 0 = none):', '0');
                    const fade = parseFloat(fadeInput);
                    if (isNaN(fade) || fade < 0 || fade > 1) { 
                        showNotification('Invalid fade value. Must be between 0 and 1.', 3000); 
                        return; 
                    }
                    const noteCount = currentTrackForMenu.noteRepeat(row, startCol, count, fade);
                    showNotification(`Created note repeat: ${noteCount} notes.`, 2000);
                    if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                } }
            ];
            createContextMenu(event, menuItems, localAppServices);
        };
        if (grid) grid.addEventListener('contextmenu', sequencerContextMenuHandler);
        if (controlsDiv) controlsDiv.addEventListener('contextmenu', sequencerContextMenuHandler);

        // Handle bars input change
        const barsInput = sequencerWindow.element.querySelector(`#seqLengthInput-${track.id}`);
        if (barsInput) {
            barsInput.addEventListener('change', (e) => {
                const newNumBars = parseInt(e.target.value, 10);
                if (!Number.isFinite(newNumBars) || newNumBars < 1 || newNumBars > (Constants.MAX_BARS || 16)) {
                    showNotification(`Invalid number of bars. Must be 1-${Constants.MAX_BARS || 16}.`, 2000);
                    e.target.value = Math.max(1, activeSequence.length / Constants.STEPS_PER_BAR);
                    return;
                }
                const newLength = newNumBars * Constants.STEPS_PER_BAR;
                if (newLength === activeSequence.length) return; // No change
                
                if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Change sequence length to ${newNumBars} bars`);
                
                // Resize the sequence data
                const numRows = activeSequence.data ? activeSequence.data.length : (rows || 1);
                let hasActiveNotes = false;
                
                for (let row = 0; row < numRows; row++) {
                    if (activeSequence.data[row]?.length > newLength) {
                        activeSequence.data[row] = activeSequence.data[row].slice(0, newLength);
                        hasActiveNotes = true;
                    }
                }
                activeSequence.length = newLength;
                
                // Recreate the Tone sequence
                track.recreateToneSequence(true);
                
                // Re-render the sequencer window
                openTrackSequencerWindow(trackId, true);
                showNotification(`Sequence length changed to ${newNumBars} bars.`, 1500);
            });
        }

        // Scale mode event handlers (only for Synth/InstrumentSampler tracks)
        if (track.type === 'Synth' || track.type === 'InstrumentSampler') {
            const scaleModeToggle = sequencerWindow.element.querySelector(`#scaleModeToggle-${track.id}`);
            const scaleRootSelect = sequencerWindow.element.querySelector(`#scaleRootSelect-${track.id}`);
            const scaleSelect = sequencerWindow.element.querySelector(`#scaleSelect-${track.id}`);
            const scaleLockToggle = sequencerWindow.element.querySelector(`#scaleLockToggle-${track.id}`);

            if (scaleModeToggle) {
                scaleModeToggle.addEventListener('change', (e) => {
                    if (localAppServices.setScaleModeEnabled) {
                        localAppServices.setScaleModeEnabled(e.target.checked);
                    }
                    if (scaleRootSelect) scaleRootSelect.disabled = !e.target.checked;
                    if (scaleSelect) scaleSelect.disabled = !e.target.checked;
                    if (scaleLockToggle) scaleLockToggle.disabled = !e.target.checked;
                    // Re-render to update highlighting
                    openTrackSequencerWindow(trackId, true);
                });
            }

            if (scaleRootSelect) {
                scaleRootSelect.addEventListener('change', (e) => {
                    if (localAppServices.setScaleModeRoot) {
                        localAppServices.setScaleModeRoot(e.target.value);
                    }
                    // Re-render to update highlighting
                    openTrackSequencerWindow(trackId, true);
                });
            }

            if (scaleSelect) {
                scaleSelect.addEventListener('change', (e) => {
                    if (localAppServices.setScaleModeScale) {
                        localAppServices.setScaleModeScale(e.target.value);
                    }
                    // Re-render to update highlighting
                    openTrackSequencerWindow(trackId, true);
                });
            }

            if (scaleLockToggle) {
                scaleLockToggle.addEventListener('change', (e) => {
                    if (localAppServices.setScaleModeLock) {
                        localAppServices.setScaleModeLock(e.target.checked);
                    }
                });
            }
        }

        // Chord Mode event handlers
        const chordModeToggle = sequencerWindow.element.querySelector(`#chordModeToggle-${track.id}`);
        const chordRootSelect = sequencerWindow.element.querySelector(`#chordRootSelect-${track.id}`);
        const chordTypeSelect = sequencerWindow.element.querySelector(`#chordTypeSelect-${track.id}`);
        const chordLockToggle = sequencerWindow.element.querySelector(`#chordLockToggle-${track.id}`);

        if (chordModeToggle) {
            chordModeToggle.addEventListener('change', (e) => {
                if (localAppServices.setChordModeEnabledState) {
                    localAppServices.setChordModeEnabledState(e.target.checked);
                }
                if (chordRootSelect) chordRootSelect.disabled = !e.target.checked;
                if (chordTypeSelect) chordTypeSelect.disabled = !e.target.checked;
                if (chordLockToggle) chordLockToggle.disabled = !e.target.checked;
                // Re-render to update highlighting
                openTrackSequencerWindow(trackId, true);
            });
        }

        if (chordRootSelect) {
            chordRootSelect.addEventListener('change', (e) => {
                if (localAppServices.setChordModeRootState) {
                    localAppServices.setChordModeRootState(e.target.value);
                }
                // Re-render to update highlighting
                openTrackSequencerWindow(trackId, true);
            });
        }

        if (chordTypeSelect) {
            chordTypeSelect.addEventListener('change', (e) => {
                if (localAppServices.setChordModeTypeState) {
                    localAppServices.setChordModeTypeState(e.target.value);
                }
                // Re-render to update highlighting
                openTrackSequencerWindow(trackId, true);
            });
        }

        if (chordLockToggle) {
            chordLockToggle.addEventListener('change', (e) => {
                if (localAppServices.setChordModeLockState) {
                    localAppServices.setChordModeLockState(e.target.checked);
                }
            });
        }

        // Ghost Track event handlers
        const ghostTrackSelect = sequencerWindow.element.querySelector(`#ghostTrackSelect-${track.id}`);
        if (ghostTrackSelect) {
            ghostTrackSelect.addEventListener('change', (e) => {
                const selectedTrackId = e.target.value ? parseInt(e.target.value) : null;
                if (localAppServices.setGhostTrackId) {
                    localAppServices.setGhostTrackId(selectedTrackId);
                }
                // Re-render to show ghost notes
                openTrackSequencerWindow(trackId, true);
                const ghostTrack = selectedTrackId ? (localAppServices.getTrackById ? localAppServices.getTrackById(selectedTrackId) : null) : null;
                showNotification(ghostTrack ? `Showing ghost notes from "${ghostTrack.name}"` : 'Ghost notes cleared', 2000);
            });
        }

        // Velocity Editor event handlers
        const velocityEditorToggle = sequencerWindow.element.querySelector(`#velocityEditorToggle-${track.id}`);
        const velocityEditorLane = sequencerWindow.element.querySelector(`#velocityEditor-${track.id}`);

        if (velocityEditorToggle && velocityEditorLane) {
            velocityEditorToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    velocityEditorLane.classList.remove('hidden');
                } else {
                    velocityEditorLane.classList.add('hidden');
                }
            });

            // Velocity bar editing - click and drag to change velocity
            let isDraggingVelocity = false;
            let dragStartY = 0;
            let dragStartVelocity = 0;
            let dragCol = -1;

            const handleVelocityDrag = (e) => {
                if (!isDraggingVelocity) return;
                e.preventDefault();
                
                const currentY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
                const deltaY = dragStartY - currentY;
                const sensitivity = 0.01; // Adjust sensitivity
                let newVelocity = dragStartVelocity + (deltaY * sensitivity);
                newVelocity = Math.max(0.05, Math.min(1.0, newVelocity));
                
                // Update velocity for all active notes in this column
                const currentActiveSeq = track.getActiveSequence();
                if (!currentActiveSeq || !currentActiveSeq.data) return;
                
                const numRows = currentActiveSeq.data.length;
                let hasActiveNotes = false;
                
                for (let row = 0; row < numRows; row++) {
                    const stepData = currentActiveSeq.data[row]?.[dragCol];
                    if (stepData && stepData.active) {
                        stepData.velocity = newVelocity;
                        hasActiveNotes = true;
                        
                        // Update cell visual
                        const cell = sequencerWindow.element.querySelector(`.sequencer-step-cell[data-row="${row}"][data-col="${dragCol}"]`);
                        if (cell) {
                            const opacity = 0.5 + (newVelocity * 0.5);
                            cell.style.opacity = opacity.toFixed(2);
                            cell.dataset.velocity = newVelocity.toFixed(2);
                            cell.title = `R${row+1},S${dragCol+1} V:${Math.round(newVelocity * 127)}`;
                        }
                    }
                }
                
                if (hasActiveNotes) {
                    // Update velocity bar visual
                    const bar = velocityEditorLane.querySelector(`.velocity-bar[data-col="${dragCol}"]`);
                    if (bar) {
                        const barHeight = Math.round(newVelocity * 56);
                        bar.style.height = `${barHeight}px`;
                    }
                    const cell = velocityEditorLane.querySelector(`.velocity-cell[data-col="${dragCol}"]`);
                    if (cell) {
                        cell.dataset.maxVelocity = newVelocity.toFixed(2);
                        cell.title = `Step ${dragCol + 1}: ${Math.round(newVelocity * 127)}`;
                    }
                }
            };

            const handleVelocityDragEnd = () => {
                if (isDraggingVelocity) {
                    isDraggingVelocity = false;
                    document.removeEventListener('mousemove', handleVelocityDrag);
                    document.removeEventListener('mouseup', handleVelocityDragEnd);
                    document.removeEventListener('touchmove', handleVelocityDrag);
                    document.removeEventListener('touchend', handleVelocityDragEnd);
                    
                    // Recreate Tone sequence to apply velocity changes
                    track.recreateToneSequence(true);
                }
            };

            // Add click/drag handlers to velocity cells
            const velocityCells = velocityEditorLane.querySelectorAll('.velocity-cell');
            velocityCells.forEach(cell => {
                cell.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    const col = parseInt(cell.dataset.col, 10);
                    const currentActiveSeq = track.getActiveSequence();
                    if (!currentActiveSeq || !currentActiveSeq.data) return;
                    
                    // Check if there are active notes in this column
                    const numRows = currentActiveSeq.data.length;
                    let hasActiveNotes = false;
                    let currentMaxVel = 0;
                    
                    for (let row = 0; row < numRows; row++) {
                        const stepData = currentActiveSeq.data[row]?.[col];
                        if (stepData && stepData.active) {
                            hasActiveNotes = true;
                            if (stepData.velocity > currentMaxVel) {
                                currentMaxVel = stepData.velocity;
                            }
                        }
                    }
                    
                    if (!hasActiveNotes) return;
                    
                    // Capture undo state before velocity change
                    if (localAppServices.captureStateForUndo) {
                        localAppServices.captureStateForUndo(`Edit velocity at step ${col + 1} on ${track.name}`);
                    }
                    
                    isDraggingVelocity = true;
                    dragStartY = e.clientY;
                    dragStartVelocity = currentMaxVel;
                    dragCol = col;
                    
                    document.addEventListener('mousemove', handleVelocityDrag);
                    document.addEventListener('mouseup', handleVelocityDragEnd);
                });

                cell.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    const col = parseInt(cell.dataset.col, 10);
                    const currentActiveSeq = track.getActiveSequence();
                    if (!currentActiveSeq || !currentActiveSeq.data) return;
                    
                    const numRows = currentActiveSeq.data.length;
                    let hasActiveNotes = false;
                    let currentMaxVel = 0;
                    
                    for (let row = 0; row < numRows; row++) {
                        const stepData = currentActiveSeq.data[row]?.[col];
                        if (stepData && stepData.active) {
                            hasActiveNotes = true;
                            if (stepData.velocity > currentMaxVel) {
                                currentMaxVel = stepData.velocity;
                            }
                        }
                    }
                    
                    if (!hasActiveNotes) return;
                    
                    if (localAppServices.captureStateForUndo) {
                        localAppServices.captureStateForUndo(`Edit velocity at step ${col + 1} on ${track.name}`);
                    }
                    
                    isDraggingVelocity = true;
                    dragStartY = e.touches[0].clientY;
                    dragStartVelocity = currentMaxVel;
                    dragCol = col;
                    
                    document.addEventListener('touchmove', handleVelocityDrag, { passive: false });
                    document.addEventListener('touchend', handleVelocityDragEnd);
                }, { passive: false });
            });
        }

        // Probability Editor event handlers
        const probabilityEditorToggle = sequencerWindow.element.querySelector(`#probabilityEditorToggle-${track.id}`);
        const probabilityEditorLane = sequencerWindow.element.querySelector(`#probabilityEditor-${track.id}`);

        if (probabilityEditorToggle && probabilityEditorLane) {
            probabilityEditorToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    probabilityEditorLane.classList.remove('hidden');
                } else {
                    probabilityEditorLane.classList.add('hidden');
                }
            });

            // Probability bar editing - click and drag to change probability
            let isDraggingProbability = false;
            let dragStartYProb = 0;
            let dragStartProbability = 0;
            let dragColProb = -1;

            const handleProbabilityDrag = (e) => {
                if (!isDraggingProbability) return;
                e.preventDefault();
                
                const currentY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
                const deltaY = dragStartYProb - currentY;
                const sensitivity = 0.003; // Adjust sensitivity for 0-1 range
                let newProbability = dragStartProbability + (deltaY * sensitivity);
                newProbability = Math.max(0, Math.min(1, newProbability));
                
                // Update probability for all active notes in this column
                const currentActiveSeq = track.getActiveSequence();
                if (!currentActiveSeq || !currentActiveSeq.data) return;
                
                const numRows = currentActiveSeq.data.length;
                let hasActiveNotes = false;
                
                for (let row = 0; row < numRows; row++) {
                    const stepData = currentActiveSeq.data[row]?.[dragColProb];
                    if (stepData && stepData.active) {
                        stepData.probability = newProbability;
                        hasActiveNotes = true;
                    }
                }
                
                if (hasActiveNotes) {
                    // Update probability bar visual
                    const bar = probabilityEditorLane.querySelector(`.probability-bar[data-col="${dragColProb}"]`);
                    if (bar) {
                        const barHeight = Math.round(newProbability * 56);
                        bar.style.height = `${barHeight}px`;
                        bar.style.backgroundColor = newProbability > 0 ? '#0d9488' : '#333333';
                    }
                    const cell = probabilityEditorLane.querySelector(`.probability-cell[data-col="${dragColProb}"]`);
                    if (cell) {
                        cell.dataset.maxProbability = newProbability.toFixed(2);
                        cell.title = `Step ${dragColProb + 1}: ${Math.round(newProbability * 100)}%`;
                    }
                }
            };

            const handleProbabilityDragEnd = () => {
                if (isDraggingProbability) {
                    isDraggingProbability = false;
                    document.removeEventListener('mousemove', handleProbabilityDrag);
                    document.removeEventListener('mouseup', handleProbabilityDragEnd);
                    document.removeEventListener('touchmove', handleProbabilityDrag);
                    document.removeEventListener('touchend', handleProbabilityDragEnd);
                    
                    // Recreate Tone sequence to apply probability changes
                    track.recreateToneSequence(true);
                }
            };

            // Add click/drag handlers to probability cells
            const probabilityCells = probabilityEditorLane.querySelectorAll('.probability-cell');
            probabilityCells.forEach(cell => {
                cell.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    const col = parseInt(cell.dataset.col, 10);
                    const currentActiveSeq = track.getActiveSequence();
                    if (!currentActiveSeq || !currentActiveSeq.data) return;
                    
                    // Check if there are active notes in this column
                    const numRows = currentActiveSeq.data.length;
                    let hasActiveNotes = false;
                    let currentMaxProb = 0;
                    
                    for (let row = 0; row < numRows; row++) {
                        const stepData = currentActiveSeq.data[row]?.[col];
                        if (stepData && stepData.active) {
                            hasActiveNotes = true;
                            const prob = stepData.probability !== undefined ? stepData.probability : (Constants.DEFAULT_NOTE_PROBABILITY || 1.0);
                            if (prob > currentMaxProb) {
                                currentMaxProb = prob;
                            }
                        }
                    }
                    
                    if (!hasActiveNotes) return;
                    
                    // Capture undo state before probability change
                    if (localAppServices.captureStateForUndo) {
                        localAppServices.captureStateForUndo(`Edit probability at step ${col + 1} on ${track.name}`);
                    }
                    
                    isDraggingProbability = true;
                    dragStartYProb = e.clientY;
                    dragStartProbability = currentMaxProb;
                    dragColProb = col;
                    
                    document.addEventListener('mousemove', handleProbabilityDrag);
                    document.addEventListener('mouseup', handleProbabilityDragEnd);
                });

                cell.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    const col = parseInt(cell.dataset.col, 10);
                    const currentActiveSeq = track.getActiveSequence();
                    if (!currentActiveSeq || !currentActiveSeq.data) return;
                    
                    const numRows = currentActiveSeq.data.length;
                    let hasActiveNotes = false;
                    let currentMaxProb = 0;
                    
                    for (let row = 0; row < numRows; row++) {
                        const stepData = currentActiveSeq.data[row]?.[col];
                        if (stepData && stepData.active) {
                            hasActiveNotes = true;
                            const prob = stepData.probability !== undefined ? stepData.probability : (Constants.DEFAULT_NOTE_PROBABILITY || 1.0);
                            if (prob > currentMaxProb) {
                                currentMaxProb = prob;
                            }
                        }
                    }
                    
                    if (!hasActiveNotes) return;
                    
                    // Capture undo state before probability change
                    if (localAppServices.captureStateForUndo) {
                        localAppServices.captureStateForUndo(`Edit probability at step ${col + 1} on ${track.name}`);
                    }
                    
                    isDraggingProbability = true;
                    dragStartYProb = e.touches[0].clientY;
                    dragStartProbability = currentMaxProb;
                    dragColProb = col;
                    
                    document.addEventListener('touchmove', handleProbabilityDrag, { passive: false });
                    document.addEventListener('touchend', handleProbabilityDragEnd);
                }, { passive: false });
            });
        }

        // Automation Editor event handlers
        const automationEditorToggle = sequencerWindow.element.querySelector(`#automationEditorToggle-${track.id}`);
        const automationEditorLane = sequencerWindow.element.querySelector(`#automationEditor-${track.id}`);
        const automationParamSelect = sequencerWindow.element.querySelector(`#automationParamSelect-${track.id}`);
        const clearAutomationBtn = sequencerWindow.element.querySelector(`#clearAutomationBtn-${track.id}`);

        if (automationEditorToggle && automationEditorLane) {
            automationEditorToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    automationEditorLane.classList.remove('hidden');
                } else {
                    automationEditorLane.classList.add('hidden');
                }
            });

            // Automation parameter selector - re-render lane when parameter changes
            if (automationParamSelect) {
                automationParamSelect.addEventListener('change', (e) => {
                    const newParam = e.target.value;
                    const lane = automationEditorLane.querySelector('.automation-editor-grid');
                    if (!lane) return;
                    const automationLane = track.getAutomationLane ? track.getAutomationLane(newParam) : [];
                    const cells = lane.querySelectorAll('.automation-cell');
                    cells.forEach(cell => {
                        const col = parseInt(cell.dataset.col, 10);
                        const point = automationLane.find(p => p.step === col);
                        const hasPoint = !!point;
                        const pointValue = point ? point.value : Constants.AUTOMATION_LANE_DEFAULT;
                        const barHeight = Math.round(pointValue * 56);
                        const bar = cell.querySelector('.automation-bar');
                        if (bar) {
                            bar.style.height = `${barHeight}px`;
                            bar.style.backgroundColor = hasPoint ? '#ff9f43' : '#333333';
                            bar.style.opacity = hasPoint ? '1' : '0.3';
                        }
                        cell.dataset.hasPoint = hasPoint;
                        cell.dataset.value = pointValue.toFixed(2);
                        cell.title = `Step ${col + 1}: ${hasPoint ? Math.round(pointValue * 100) + '%' : 'No point'}`;
                        // Toggle dot visibility
                        const existingDot = cell.querySelector('.automation-point-dot');
                        if (existingDot) existingDot.remove();
                        if (hasPoint) {
                            const dot = document.createElement('div');
                            dot.className = 'automation-point-dot absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-500 border border-white pointer-events-none';
                            cell.appendChild(dot);
                        }
                    });
                });
            }

            // Clear automation lane button
            if (clearAutomationBtn) {
                clearAutomationBtn.addEventListener('click', () => {
                    const autoParam = automationParamSelect ? automationParamSelect.value : 'volume';
                    showConfirmationDialog(`Clear Automation Lane`, `Clear all automation points for ${autoParam}? This can be undone.`, () => {
                        if (track.clearAutomationLane) {
                            track.clearAutomationLane(autoParam);
                            showNotification(`Automation lane for ${autoParam} cleared.`, 2000);
                            // Update UI
                            const laneGrid = automationEditorLane.querySelector('.automation-editor-grid');
                            if (laneGrid) {
                                const cells = laneGrid.querySelectorAll('.automation-cell');
                                cells.forEach(cell => {
                                    const col = parseInt(cell.dataset.col, 10);
                                    const bar = cell.querySelector('.automation-bar');
                                    if (bar) {
                                        bar.style.height = '0px';
                                        bar.style.backgroundColor = '#333333';
                                        bar.style.opacity = '0.3';
                                    }
                                    cell.dataset.hasPoint = false;
                                    cell.dataset.value = Constants.AUTOMATION_LANE_DEFAULT.toFixed(2);
                                    const existingDot = cell.querySelector('.automation-point-dot');
                                    if (existingDot) existingDot.remove();
                                });
                            }
                        }
                    });
                });
            }

            // Automation cell click to add/move points
            const automationCells = automationEditorLane.querySelectorAll('.automation-cell');
            automationCells.forEach(cell => {
                cell.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    const col = parseInt(cell.dataset.col, 10);
                    const autoParam = automationParamSelect ? automationParamSelect.value : 'volume';
                    
                    // Determine if we're adding or removing a point
                    const currentHasPoint = cell.dataset.hasPoint === 'true';
                    
                    if (currentHasPoint) {
                        // Remove the automation point on right-click or second click
                        if (e.button === 2 || e.shiftKey) {
                            if (track.removeAutomationPoint) {
                                track.removeAutomationPoint(autoParam, col);
                                showNotification(`Automation point removed at step ${col + 1}.`, 1500);
                                // Update UI
                                const bar = cell.querySelector('.automation-bar');
                                if (bar) {
                                    bar.style.height = '0px';
                                    bar.style.backgroundColor = '#333333';
                                    bar.style.opacity = '0.3';
                                }
                                cell.dataset.hasPoint = false;
                                cell.dataset.value = Constants.AUTOMATION_LANE_DEFAULT.toFixed(2);
                                const existingDot = cell.querySelector('.automation-point-dot');
                                if (existingDot) existingDot.remove();
                            }
                        }
                    } else {
                        // Add automation point at this step
                        const currentValue = parseFloat(cell.dataset.value) || Constants.AUTOMATION_LANE_DEFAULT;
                        
                        // Capture undo state before adding point
                        if (localAppServices.captureStateForUndo) {
                            localAppServices.captureStateForUndo(`Add automation point at step ${col + 1} on ${track.name}`);
                        }
                        
                        if (track.setAutomationPoint) {
                            track.setAutomationPoint(autoParam, col, currentValue, true);
                            showNotification(`Automation point added at step ${col + 1}.`, 1500);
                            // Update UI
                            const barHeight = Math.round(currentValue * 56);
                            const bar = cell.querySelector('.automation-bar');
                            if (bar) {
                                bar.style.height = `${barHeight}px`;
                                bar.style.backgroundColor = '#ff9f43';
                                bar.style.opacity = '1';
                            }
                            cell.dataset.hasPoint = true;
                            const existingDot = cell.querySelector('.automation-point-dot');
                            if (!existingDot) {
                                const dot = document.createElement('div');
                                dot.className = 'automation-point-dot absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-500 border border-white pointer-events-none';
                                cell.appendChild(dot);
                            }
                        }
                    }
                });

                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    const col = parseInt(cell.dataset.col, 10);
                    const autoParam = automationParamSelect ? automationParamSelect.value : 'volume';
                    
                    if (cell.dataset.hasPoint === 'true' && track.removeAutomationPoint) {
                        track.removeAutomationPoint(autoParam, col);
                        showNotification(`Automation point removed at step ${col + 1}.`, 1500);
                        const bar = cell.querySelector('.automation-bar');
                        if (bar) {
                            bar.style.height = '0px';
                            bar.style.backgroundColor = '#333333';
                            bar.style.opacity = '0.3';
                        }
                        cell.dataset.hasPoint = false;
                        cell.dataset.value = Constants.AUTOMATION_LANE_DEFAULT.toFixed(2);
                        const existingDot = cell.querySelector('.automation-point-dot');
                        if (existingDot) existingDot.remove();
                    }
                });

                // Drag to move automation points vertically
                let isDraggingAutomation = false;
                let dragStartY = 0;
                let dragStartValue = 0;
                let dragCol = -1;

                const handleAutomationDrag = (e) => {
                    if (!isDraggingAutomation) return;
                    e.preventDefault();
                    
                    const currentY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
                    const deltaY = dragStartY - currentY;
                    const sensitivity = 0.005;
                    let newValue = dragStartValue + (deltaY * sensitivity);
                    newValue = Math.max(0, Math.min(1, newValue));
                    
                    const autoParam = automationParamSelect ? automationParamSelect.value : 'volume';
                    
                    // Update the automation point value
                    if (track.setAutomationPoint) {
                        track.setAutomationPoint(autoParam, dragCol, newValue, true);
                    }
                    
                    // Update UI
                    const barHeight = Math.round(newValue * 56);
                    const bar = automationEditorLane.querySelector(`.automation-bar[data-col="${dragCol}"]`);
                    if (bar) {
                        bar.style.height = `${barHeight}px`;
                    }
                    const cell = automationEditorLane.querySelector(`.automation-cell[data-col="${dragCol}"]`);
                    if (cell) {
                        cell.dataset.value = newValue.toFixed(2);
                        cell.title = `Step ${dragCol + 1}: ${Math.round(newValue * 100)}%`;
                    }
                };

                const handleAutomationDragEnd = () => {
                    if (isDraggingAutomation) {
                        isDraggingAutomation = false;
                        document.removeEventListener('mousemove', handleAutomationDrag);
                        document.removeEventListener('mouseup', handleAutomationDragEnd);
                        document.removeEventListener('touchmove', handleAutomationDrag);
                        document.removeEventListener('touchend', handleAutomationDragEnd);
                    }
                };

                cell.addEventListener('mousemove', (e) => {
                    if (e.buttons === 1 && cell.dataset.hasPoint === 'true') {
                        if (!isDraggingAutomation) {
                            isDraggingAutomation = true;
                            dragStartY = e.clientY;
                            dragStartValue = parseFloat(cell.dataset.value) || Constants.AUTOMATION_LANE_DEFAULT;
                            dragCol = parseInt(cell.dataset.col, 10);
                            document.addEventListener('mousemove', handleAutomationDrag);
                            document.addEventListener('mouseup', handleAutomationDragEnd);
                        }
                    }
                });

                cell.addEventListener('mouseleave', () => {
                    if (isDraggingAutomation) {
                        handleAutomationDragEnd();
                    }
                });
            });
        }

    }
    return sequencerWindow;
}

// --- UI Update & Drawing Functions ---
export function drawWaveform(track) {
    if (!track?.waveformCanvasCtx || !track.audioBuffer?.loaded) {
        if (track?.waveformCanvasCtx) {
            const canvas = track.waveformCanvasCtx.canvas;
            track.waveformCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            track.waveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#101010' : '#e0e0e0';
            track.waveformCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            track.waveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#E0BBE4' : '#a0a0a0';
            track.waveformCanvasCtx.textAlign = 'center';
            track.waveformCanvasCtx.fillText('No audio loaded or processed', canvas.width / 2, canvas.height / 2);
        }
        return;
    }
    const canvas = track.waveformCanvasCtx.canvas; const ctx = track.waveformCanvasCtx;
    const buffer = track.audioBuffer.get(); const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width); const amp = canvas.height / 2;
    ctx.fillStyle = ctx.canvas.classList.contains('dark') ? '#101010' : '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1; ctx.strokeStyle = ctx.canvas.classList.contains('dark') ? '#957DAD' : '#957DAD';
    ctx.beginPath(); ctx.moveTo(0, amp);
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0; let max = -1.0;
        for (let j = 0; j < step; j++) { const datum = data[(i * step) + j]; if (datum < min) min = datum; if (datum > max) max = datum; }
        ctx.lineTo(i, (1 + min) * amp); ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.lineTo(canvas.width, amp); ctx.stroke();
    track.slices.forEach((slice, index) => {
        if (slice.duration <= 0) return;
        const startX = (slice.offset / buffer.duration) * canvas.width;
        const endX = ((slice.offset + slice.duration) / buffer.duration) * canvas.width;
        ctx.fillStyle = index === track.selectedSliceForEdit ? 'rgba(255, 0, 0, 0.3)' : (ctx.canvas.classList.contains('dark') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 0, 255, 0.15)');
        ctx.fillRect(startX, 0, endX - startX, canvas.height);
        ctx.strokeStyle = index === track.selectedSliceForEdit ? 'rgba(255,0,0,0.7)' : (ctx.canvas.classList.contains('dark') ? 'rgba(96, 165, 250, 0.5)' : 'rgba(0,0,255,0.4)');
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(startX, 0); ctx.lineTo(startX, canvas.height); ctx.moveTo(endX, 0); ctx.lineTo(endX, canvas.height); ctx.stroke();
        ctx.fillStyle = index === track.selectedSliceForEdit ? '#FEC8D8' : (ctx.canvas.classList.contains('dark') ? '#E0BBE4' : '#0000cc');
        ctx.font = '10px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`S${index + 1}`, startX + 2, 10);
    });
}

export function drawClipWaveform(clipId, audioBuffer) {
    const canvas = document.getElementById(`clipWaveformCanvas-${clipId}`);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    if (!audioBuffer?.loaded) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.font = '12px sans-serif';
        ctx.fillText('No audio loaded', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const buffer = audioBuffer.get();
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, amp);
    
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.lineTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
    }
    
    ctx.lineTo(canvas.width, amp);
    ctx.stroke();
    
    // Draw center line
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(0, amp);
    ctx.lineTo(canvas.width, amp);
    ctx.stroke();
}

export function drawInstrumentWaveform(track) {
    if (!track?.instrumentWaveformCanvasCtx || !track.instrumentSamplerSettings.audioBuffer?.loaded) {
        if (track?.instrumentWaveformCanvasCtx) { /* Draw 'No audio' message, similar to drawWaveform */ } return;
    }
    const canvas = track.instrumentWaveformCanvasCtx.canvas; const ctx = track.instrumentWaveformCanvasCtx;
    const buffer = track.instrumentSamplerSettings.audioBuffer.get(); const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width); const amp = canvas.height / 2;
    ctx.fillStyle = canvas.classList.contains('dark') ? '#101010' : '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1; ctx.strokeStyle = canvas.classList.contains('dark') ? '#D291BC' : '#D291BC';
    ctx.beginPath(); ctx.moveTo(0, amp);
    for (let i = 0; i < canvas.width; i++) { let min = 1.0; let max = -1.0; for (let j = 0; j < step; j++) { const datum = data[(i * step) + j]; if (datum < min) min = datum; if (datum > max) max = datum; } ctx.lineTo(i, (1 + min) * amp); ctx.lineTo(i, (1 + max) * amp); }
    ctx.lineTo(canvas.width, amp); ctx.stroke();
    if (track.instrumentSamplerSettings.loop) {
        const loopStartX = (track.instrumentSamplerSettings.loopStart / buffer.duration) * canvas.width;
        const loopEndX = (track.instrumentSamplerSettings.loopEnd / buffer.duration) * canvas.width;
        ctx.fillStyle = canvas.classList.contains('dark') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 255, 0, 0.2)';
        ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, canvas.height);
        ctx.strokeStyle = canvas.classList.contains('dark') ? 'rgba(52, 211, 153, 0.6)' : 'rgba(0,200,0,0.6)';
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(loopStartX, 0); ctx.lineTo(loopStartX, canvas.height); ctx.moveTo(loopEndX, 0); ctx.lineTo(loopEndX, canvas.height); ctx.stroke();
    }
}



export function highlightPlayingStep(trackId, stepIndex, isPlaying) {
    // Highlight the current playing step in the sequencer grid
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) return;
    
    // Find the sequencer window for this track
    const sequencerWin = localAppServices.getWindowById ? localAppServices.getWindowById('sequencerWin-' + trackId) : null;
    if (!sequencerWin || !sequencerWin.element) return;
    
    // Remove playing class from all cells
    sequencerWin.element.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => {
        cell.classList.remove('playing');
    });
    
    if (isPlaying && stepIndex >= 0) {
        // Add playing class to current step cell
        const cell = sequencerWin.element.querySelector('[data-step="' + stepIndex + '"]');
        if (cell) {
            cell.classList.add('playing');
        }
    }
}



// --- Additional UI Functions ---

export function renderSamplePads(track) {
    if (!track || track.type !== 'Sampler') return;
    const inspectorWin = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    const container = inspectorWin?.element?.querySelector(`#samplePadsContainer-${track.id}`);
    if (!container) return;

    container.innerHTML = '';
    const numSlices = track.slices?.length || Constants.numSlices;
    
    for (let i = 0; i < numSlices; i++) {
        const sliceData = track.slices?.[i] || {};
        const pad = document.createElement('button');
        pad.className = `sample-pad p-1 border rounded text-xs transition-colors ${
            i === track.selectedSliceForEdit ? 'bg-purple-500 text-white border-purple-600' : 
            'bg-gray-100 dark:bg-slate-600 border-gray-300 dark:border-slate-500 hover:bg-gray-200 dark:hover:bg-slate-500'
        }`;
        pad.textContent = `${i + 1}`;
        pad.title = sliceData.userDefined ? `Slice ${i + 1} (Custom)` : `Slice ${i + 1}`;
        pad.dataset.sliceIndex = i;
        pad.addEventListener('click', () => {
            track.selectedSliceForEdit = i;
            renderSamplePads(track);
            updateSliceEditorUI(track);
            if (localAppServices.playSlicePreview && track.audioBuffer) {
                const slice = track.slices[i];
                if (slice) localAppServices.playSlicePreview(track, i);
            }
        });
        container.appendChild(pad);
    }
}

export function updateSliceEditorUI(track) {
    if (!track || track.type !== 'Sampler') return;
    const inspectorWin = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    const winEl = inspectorWin?.element;
    if (!winEl) return;

    const selectedSlice = track.slices?.[track.selectedSliceForEdit] || { volume: 0.7, pitchShift: 0, envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 }, loop: false, reverse: false };

    // Update selected slice info display
    const sliceInfo = winEl.querySelector(`#selectedSliceInfo-${track.id}`);
    if (sliceInfo) sliceInfo.textContent = track.selectedSliceForEdit + 1;

    // Update volume knob
    if (track.inspectorControls.sliceVolume?.setValue) {
        track.inspectorControls.sliceVolume.setValue(selectedSlice.volume, false);
    }

    // Update pitch knob
    if (track.inspectorControls.slicePitch?.setValue) {
        track.inspectorControls.slicePitch.setValue(selectedSlice.pitchShift || 0, false);
    }

    // Update loop toggle
    const loopToggle = winEl.querySelector(`#sliceLoopToggle-${track.id}`);
    if (loopToggle) {
        loopToggle.textContent = selectedSlice.loop ? 'Loop: ON' : 'Loop: OFF';
        loopToggle.classList.toggle('active', selectedSlice.loop);
    }

    // Update reverse toggle
    const reverseToggle = winEl.querySelector(`#sliceReverseToggle-${track.id}`);
    if (reverseToggle) {
        reverseToggle.textContent = selectedSlice.reverse ? 'Rev: ON' : 'Rev: OFF';
        reverseToggle.classList.toggle('active', selectedSlice.reverse);
    }

    // Update envelope knobs
    const env = selectedSlice.envelope || { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 };
    if (track.inspectorControls.sliceEnvAttack?.setValue) track.inspectorControls.sliceEnvAttack.setValue(env.attack, false);
    if (track.inspectorControls.sliceEnvDecay?.setValue) track.inspectorControls.sliceEnvDecay.setValue(env.decay, false);
    if (track.inspectorControls.sliceEnvSustain?.setValue) track.inspectorControls.sliceEnvSustain.setValue(env.sustain, false);
    if (track.inspectorControls.sliceEnvRelease?.setValue) track.inspectorControls.sliceEnvRelease.setValue(env.release, false);
}

export function updateDrumPadControlsUI(track) {
    if (!track || track.type !== 'DrumSampler') return;
    const inspectorWin = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    const winEl = inspectorWin?.element;
    if (!winEl) return;

    const selectedPadIndex = track.selectedDrumPadForEdit || 0;
    const padData = track.drumSamplerPads?.[selectedPadIndex] || { volume: 0.7, pitchShift: 0, envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 } };

    // Update selected pad info display
    const padInfo = winEl.querySelector(`#selectedDrumPadInfo-${track.id}`);
    if (padInfo) padInfo.textContent = selectedPadIndex + 1;

    // Update drop zone for selected pad
    const oldDropZoneContainer = winEl.querySelector(`[id^="drumPadDropZoneContainer-${track.id}"]`);
    if (oldDropZoneContainer) {
        const newContainerId = `drumPadDropZoneContainer-${track.id}-${selectedPadIndex}`;
        oldDropZoneContainer.id = newContainerId;
        
        const existingAudioData = { 
            originalFileName: padData.originalFileName, 
            status: padData.status || (padData.dbKey ? 'loaded' : (padData.originalFileName ? 'missing' : 'empty'))
        };
        const inputId = `drumPadFileInput-${track.id}-${selectedPadIndex}`;
        oldDropZoneContainer.innerHTML = createDropZoneHTML(track.id, inputId, 'DrumSampler', selectedPadIndex, existingAudioData);
        
        const dzEl = oldDropZoneContainer.querySelector('.drop-zone');
        const fileInputEl = oldDropZoneContainer.querySelector(`#${inputId}`);
        
        if (dzEl) {
            setupGenericDropZoneListeners(dzEl, track.id, 'DrumSampler', selectedPadIndex, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadDrumSamplerPadFile, localAppServices.getTrackById);
        }
        if (fileInputEl) {
            fileInputEl.onchange = (e) => {
                localAppServices.loadDrumSamplerPadFile(e, track.id, selectedPadIndex);
            };
        }
    }

    // Update volume knob
    if (track.inspectorControls.drumPadVolume?.setValue) {
        track.inspectorControls.drumPadVolume.setValue(padData.volume ?? 0.7, false);
    }

    // Update pitch knob
    if (track.inspectorControls.drumPadPitch?.setValue) {
        track.inspectorControls.drumPadPitch.setValue(padData.pitchShift ?? 0, false);
    }

    // Update envelope knobs
    const env = padData.envelope || { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 };
    if (track.inspectorControls.drumPadEnvAttack?.setValue) track.inspectorControls.drumPadEnvAttack.setValue(env.attack, false);
    if (track.inspectorControls.drumPadEnvDecay?.setValue) track.inspectorControls.drumPadEnvDecay.setValue(env.decay, false);
    if (track.inspectorControls.drumPadEnvSustain?.setValue) track.inspectorControls.drumPadEnvSustain.setValue(env.sustain, false);
    if (track.inspectorControls.drumPadEnvRelease?.setValue) track.inspectorControls.drumPadEnvRelease.setValue(env.release, false);
}

export function renderDrumSamplerPads(track) {
    if (!track || track.type !== 'DrumSampler') return;
    const inspectorWin = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    const container = inspectorWin?.element?.querySelector(`#drumPadsGridContainer-${track.id}`);
    if (!container) return;

    container.innerHTML = '';
    const numPads = Constants.numDrumSamplerPads || 8;
    
    for (let i = 0; i < numPads; i++) {
        const padData = track.drumSamplerPads?.[i] || {};
        const pad = document.createElement('button');
        
        const isSelected = i === track.selectedDrumPadForEdit;
        const isLoaded = padData.status === 'loaded' || padData.dbKey;
        
        let bgClass = 'bg-gray-200 dark:bg-slate-600';
        if (isSelected) {
            bgClass = 'bg-purple-500 text-white';
        } else if (isLoaded) {
            bgClass = 'bg-green-100 dark:bg-green-800';
        }
        
        pad.className = `drum-pad aspect-square p-1 border rounded text-xs font-medium transition-colors flex items-center justify-center ${bgClass} ${
            isSelected ? 'border-purple-600 ring-2 ring-purple-400' : 'border-gray-300 dark:border-slate-500 hover:bg-gray-300 dark:hover:bg-slate-500'
        }`;
        pad.textContent = `${i + 1}`;
        pad.title = padData.originalFileName ? `Pad ${i + 1}: ${padData.originalFileName}` : `Pad ${i + 1} (Empty)`;
        pad.dataset.padIndex = i;
        
        pad.addEventListener('click', () => {
            track.selectedDrumPadForEdit = i;
            renderDrumSamplerPads(track);
            updateDrumPadControlsUI(track);
            // Play preview if sample is loaded
            if (localAppServices.playDrumSamplerPadPreview && (padData.status === 'loaded' || padData.dbKey)) {
                localAppServices.playDrumSamplerPadPreview(track, i);
            }
        });
        
        container.appendChild(pad);
    }
}


export function updateSequencerCellUI(sequencerElement, trackType, row, col, isActive) {
    if (!sequencerElement) return;
    const cell = sequencerElement.querySelector(`.seq-cell[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;
    if (isActive) {
        cell.classList.add('active');
        cell.style.backgroundColor = trackType === 'DrumSampler' ? '#ef4444' : (trackType === 'Sampler' ? '#3b82f6' : '#eab308');
    } else {
        cell.classList.remove('active');
        cell.style.backgroundColor = '';
    }
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
    
    // Get timeline markers
    const markers = localAppServices.getTimelineMarkersState ? localAppServices.getTimelineMarkersState() : [];
    
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
    
    // Create marker controls
    let markerControlsHTML = `
        <div class="marker-controls flex items-center gap-2 p-2 bg-zinc-800 border-b border-zinc-700">
            <span class="text-xs text-zinc-400 font-semibold">Markers:</span>
            <button id="addMarkerBtn" class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded">+ Add</button>
            <button id="clearMarkersBtn" class="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded ${markers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${markers.length === 0 ? 'disabled' : ''}>Clear All</button>
            <span class="text-xs text-zinc-500 ml-2">${markers.length}/${Constants.MAX_TIMELINE_MARKERS}</span>
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
    
    // Render timeline markers on the ruler
    markers.forEach(marker => {
        const markerX = (marker.bar - 1) * pixelsPerBar + pixelsPerBar / 2;
        const markerColor = marker.color || Constants.DEFAULT_MARKER_COLOR;
        rulerHTML += `<div class="timeline-marker" data-marker-id="${marker.id}" 
            style="position:absolute;left:${markerX}px;top:0;width:4px;height:100%;background:${markerColor};cursor:pointer;z-index:5;"
            title="${marker.name || 'Marker'} @ Bar ${marker.bar}"></div>`;
    });
    
    rulerHTML += '</div>';
    
    // Create track lanes
    let lanesHTML = '<div class="timeline-lanes" style="flex:1;overflow-y:auto;position:relative;">';
    tracks.forEach((track, index) => {
        const laneTop = index * trackHeight;
        lanesHTML += `<div class="timeline-track-lane" data-track-id="${track.id}" style="position:absolute;top:${laneTop}px;left:0;width:100%;height:${trackHeight}px;background:${index % 2 === 0 ? '#1a1a1a' : '#222'};border-bottom:1px solid #333;">`;
        // Add track color indicator (colored left border on the lane header)
        const trackColor = track.color || '#666';
        lanesHTML += `<span style="position:sticky;left:0;background:#333;padding:2px 5px;font-size:11px;color:#ccc;z-index:5;border-left:3px solid ${trackColor};">${track.name}</span>`;
        
        // Render clips if any
        if (track.timelineClips && track.timelineClips.length > 0) {
            track.timelineClips.forEach(clip => {
                const clipLeft = clip.startTime * pixelsPerSecond;
                const clipWidth = clip.duration * pixelsPerSecond;
                const clipColor = clip.color || (clip.type === 'audio' ? '#4a9eff' : '#9f4aff');
                lanesHTML += `<div class="timeline-clip" data-clip-id="${clip.id}" data-track-id="${track.id}" draggable="true" style="position:absolute;top:4px;left:${clipLeft}px;width:${clipWidth}px;height:${trackHeight - 8}px;background:${clipColor};border-radius:4px;cursor:grab;overflow:hidden;box-shadow:0 0 4px rgba(0,0,0,0.5);">
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
        ${markerControlsHTML}
        ${rulerHTML}
        <div class="timeline-tracks" style="flex:1;position:relative;overflow:auto;">${lanesHTML}${playheadHTML}</div>
    </div>`;
    
    // Add clip click/dblclick handlers
    contentDiv.querySelectorAll('.timeline-clip').forEach(clipEl => {
        const clipId = clipEl.dataset.clipId;
        const trackId = clipEl.closest('.timeline-track-lane')?.dataset.trackId;
        
        // Double-click to open editor
        clipEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (trackId && localAppServices.openAudioClipEditorWindow) {
                localAppServices.openAudioClipEditorWindow(trackId, clipId);
            } else {
                showNotification(`Selected clip: ${clipId}`, 1500);
            }
        });
        
        // Single click shows notification
        clipEl.addEventListener('click', (e) => {
            e.stopPropagation();
            showNotification(`Selected clip: ${clipId}`, 1500);
        });
        
        // Right-click context menu for clip
        clipEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const menuItems = [
                { label: 'Open Clip Editor', action: () => {
                    if (localAppServices.openAudioClipEditorWindow) {
                        localAppServices.openAudioClipEditorWindow(trackId, clipId);
                    }
                }},
                { label: 'Split Clip...', action: () => {
                    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
                    if (!track) return;
                    const clip = track.timelineClips?.find(c => c.id === clipId);
                    if (!clip) return;
                    const splitTimeStr = prompt(`Enter split time in seconds for "${clip.name || 'Clip'}":\n(Clip starts at ${clip.startTime.toFixed(2)}s, ends at ${(clip.startTime + clip.duration).toFixed(2)}s)`, (clip.startTime + clip.duration / 2).toFixed(2));
                    if (splitTimeStr === null) return;
                    const splitTime = parseFloat(splitTimeStr);
                    if (isNaN(splitTime) || splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
                        showNotification('Invalid split time', 1500);
                        return;
                    }
                    if (track.splitAudioClip) {
                        const newClip = track.splitAudioClip(clipId, splitTime);
                        if (newClip) {
                            showNotification(`Clip split at ${splitTime.toFixed(2)}s`, 1500);
                        }
                    }
                }},
                { label: 'Duplicate Clip', action: () => {
                    if (trackId) {
                        const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
                        if (track && track.duplicateTimelineClip) {
                            const newClip = track.duplicateTimelineClip(clipId);
                            if (newClip) {
                                showNotification('Clip duplicated', 1500);
                            }
                        }
                    }
                }},
                { label: 'Delete Clip', action: () => {
                    if (trackId) {
                        const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
                        if (track && track.deleteTimelineClip) {
                            track.deleteTimelineClip(clipId);
                            showNotification('Clip deleted', 1500);
                        }
                    }
                }},
                { label: 'Export Clip as WAV', action: async () => {
                    if (!trackId) return;
                    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
                    if (!track) return;
                    const clip = track.timelineClips?.find(c => c.id === clipId);
                    if (!clip) return;
                    
                    // Get audio blob from IndexedDB
                    if (clip.sourceId) {
                        try {
                            const audioBlob = await getAudio(clip.sourceId);
                            if (audioBlob) {
                                const url = URL.createObjectURL(audioBlob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${clip.name || 'clip'}.wav`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                                showNotification('Clip exported as WAV', 2000);
                            } else {
                                showNotification('No audio data found for clip', 2000);
                            }
                        } catch (err) {
                            console.error('[Timeline] Export clip error:', err);
                            showNotification('Failed to export clip', 2000);
                        }
                    } else {
                        showNotification('No audio data found for clip', 2000);
                    }
                }},
            ];
            createContextMenu(e, menuItems, localAppServices);
        });
        
        // Drag out to export clip as audio file
        clipEl.addEventListener('dragstart', async (e) => {
            e.stopPropagation();
            const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
            if (!track) return;
            const clip = track.timelineClips?.find(c => c.id === clipId);
            if (!clip) return;
            
            // Store drag data for cross-window drops
            const dragData = {
                type: 'timeline-clip-drag',
                clipId: clipId,
                trackId: trackId,
                clipName: clip.name || 'Clip'
            };
            e.dataTransfer.setData('application/json', JSON.stringify(dragData));
            e.dataTransfer.effectAllowed = 'copy';
            
            // For external drag-out, we'll provide the audio blob after async processing
            if (clip.sourceId) {
                try {
                    const audioBlob = await getAudio(clip.sourceId);
                    if (audioBlob) {
                        e.dataTransfer.items.add(audioBlob);
                    }
                } catch (err) {
                    console.warn('[Timeline Clip] Could not attach audio for drag-out:', err);
                }
            }
        });
    });

    // Add right-click context menu on track lanes for Track Group management
    contentDiv.querySelectorAll('.timeline-track-lane').forEach(laneEl => {
        laneEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const trackId = laneEl.dataset.trackId;
            const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
            if (!track) return;

            // Get current track groups
            const trackGroups = localAppServices.getTrackGroups ? localAppServices.getTrackGroups() : [];
            const groupsContainingTrack = trackGroups.filter(g => g.trackIds.includes(trackId));
            const groupsNotContainingTrack = trackGroups.filter(g => !g.trackIds.includes(trackId));

            const menuItems = [];

            // Add to Group submenu
            if (groupsNotContainingTrack.length > 0) {
                const addToGroupItems = groupsNotContainingTrack.map(group => ({
                    label: group.name || `Group ${group.id}`,
                    action: () => {
                        if (localAppServices.addTrackToGroupState) {
                            localAppServices.addTrackToGroupState(group.id, trackId);
                            showNotification(`Added "${track.name}" to "${group.name || `Group ${group.id}`}"`, 1500);
                            if (localAppServices.updateMixerWindow) localAppServices.updateMixerWindow();
                        }
                    }
                }));
                menuItems.push({ label: 'Add to Group', submenu: addToGroupItems });
            }

            // Remove from Group submenu
            if (groupsContainingTrack.length > 0) {
                const removeFromGroupItems = groupsContainingTrack.map(group => ({
                    label: group.name || `Group ${group.id}`,
                    action: () => {
                        if (localAppServices.removeTrackFromGroupState) {
                            localAppServices.removeTrackFromGroupState(group.id, trackId);
                            showNotification(`Removed "${track.name}" from "${group.name || `Group ${group.id}`}"`, 1500);
                            if (localAppServices.updateMixerWindow) localAppServices.updateMixerWindow();
                        }
                    }
                }));
                menuItems.push({ label: 'Remove from Group', submenu: removeFromGroupItems });
            }

            // Create Group from Track (creates a new group with this track as member)
            menuItems.push({
                label: 'Create Group from Track',
                action: () => {
                    if (localAppServices.handleAddGroup) {
                        localAppServices.handleAddGroup();
                        // Wait a tick for the group to be created, then add track
                        setTimeout(() => {
                            const newGroups = localAppServices.getTrackGroups ? localAppServices.getTrackGroups() : [];
                            const lastGroup = newGroups[newGroups.length - 1];
                            if (lastGroup && localAppServices.addTrackToGroupState) {
                                localAppServices.addTrackToGroupState(lastGroup.id, trackId);
                                showNotification(`Created new group with "${track.name}"`, 1500);
                                if (localAppServices.updateMixerWindow) localAppServices.updateMixerWindow();
                            }
                        }, 50);
                    }
                }
            });

            menuItems.push({ separator: true });

            // Freeze Track option (only for non-Audio tracks with sequence clips)
            if (track.type !== 'Audio' && track.sequences && track.sequences.length > 0) {
                menuItems.push({
                    label: 'Freeze Track',
                    action: () => {
                        if (track.freezeTrack) {
                            track.freezeTrack().then(result => {
                                if (result) {
                                    showNotification(`Track "${track.name}" frozen successfully`, 2000);
                                }
                            }).catch(err => {
                                showNotification(`Freeze failed: ${err.message}`, 3000);
                            });
                        }
                    }
                });
            }

            // Bounce Track option (available for all track types with content)
            if ((track.timelineClips && track.timelineClips.length > 0) || (track.sequences && track.sequences.length > 0)) {
                menuItems.push({
                    label: 'Bounce Track',
                    action: () => {
                        if (track.bounceTrack) {
                            track.bounceTrack().then(blob => {
                                if (blob) {
                                    // Download the bounced audio
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${track.name}_bounce.wav`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                    showNotification(`Track "${track.name}" bounced and downloaded`, 2000);
                                }
                            }).catch(err => {
                                showNotification(`Bounce failed: ${err.message}`, 3000);
                            });
                        }
                    }
                });
            }

            // Change Track Color submenu
            if (typeof Constants !== 'undefined' && Constants.TRACK_COLORS) {
                const colorItems = Constants.TRACK_COLORS.map(color => ({
                    label: `<span style="display:inline-block;width:14px;height:14px;border-radius:2px;background:${color};margin-right:6px;"></span>`,
                    action: () => {
                        if (track.setTrackColor) {
                            track.setTrackColor(color);
                            showNotification(`Track color changed`, 1500);
                            if (localAppServices.renderTimeline) localAppServices.renderTimeline();
                        }
                    }
                }));
                menuItems.push({ label: 'Change Track Color', submenu: colorItems });
            }

            menuItems.push({
                label: 'Track Settings',
                action: () => {
                    if (localAppServices.openTrackInspectorWindow) {
                        localAppServices.openTrackInspectorWindow(trackId);
                    }
                }
            });

            createContextMenu(e, menuItems, localAppServices);
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
    
    // Add marker control handlers
    const addMarkerBtn = contentDiv.querySelector('#addMarkerBtn');
    const clearMarkersBtn = contentDiv.querySelector('#clearMarkersBtn');
    
    if (addMarkerBtn) {
        addMarkerBtn.addEventListener('click', () => {
            if (markers.length >= Constants.MAX_TIMELINE_MARKERS) {
                showNotification(`Maximum ${Constants.MAX_TIMELINE_MARKERS} markers reached`, 2000);
                return;
            }
            const currentBar = parseInt(prompt('Enter bar number for new marker:', '1')) || 1;
            if (currentBar >= 1 && currentBar <= Constants.MAX_BARS) {
                const markerName = prompt('Enter marker name:', `Marker ${markers.length + 1}`) || `Marker ${markers.length + 1}`;
                if (localAppServices.addTimelineMarkerState) {
                    localAppServices.addTimelineMarkerState(markerName, currentBar);
                    renderTimeline();
                    showNotification(`Marker "${markerName}" added at bar ${currentBar}`, 1500);
                }
            } else {
                showNotification('Invalid bar number', 1500);
            }
        });
    }
    
    if (clearMarkersBtn) {
        clearMarkersBtn.addEventListener('click', () => {
            if (markers.length === 0) return;
            if (localAppServices.clearTimelineMarkersState) {
                localAppServices.clearTimelineMarkersState();
                renderTimeline();
                showNotification('All markers cleared', 1500);
            }
        });
    }
    
    // Add double-click on ruler to add marker at that position
    const ruler = contentDiv.querySelector('.timeline-ruler');
    if (ruler) {
        ruler.addEventListener('dblclick', (e) => {
            if (markers.length >= Constants.MAX_TIMELINE_MARKERS) {
                showNotification(`Maximum ${Constants.MAX_TIMELINE_MARKERS} markers reached`, 2000);
                return;
            }
            const rect = ruler.getBoundingClientRect();
            const scrollLeft = ruler.parentElement?.scrollLeft || 0;
            const x = e.clientX - rect.left + scrollLeft;
            const bar = Math.floor(x / pixelsPerBar) + 1;
            if (bar >= 1 && bar <= Constants.MAX_BARS) {
                const markerName = prompt('Enter marker name:', `Marker ${markers.length + 1}`) || `Marker ${markers.length + 1}`;
                if (localAppServices.addTimelineMarkerState) {
                    localAppServices.addTimelineMarkerState(markerName, bar);
                    renderTimeline();
                    showNotification(`Marker "${markerName}" added at bar ${bar}`, 1500);
                }
            }
        });
    }
    
    // Add right-click context menu on markers to delete them
    contentDiv.querySelectorAll('.timeline-marker').forEach(markerEl => {
        markerEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const markerId = parseInt(markerEl.dataset.markerId);
            const marker = markers.find(m => m.id === markerId);
            if (!marker) return;
            
            const menuItems = [
                { label: `Delete "${marker.name || 'Marker'}"`, action: () => {
                    if (localAppServices.removeTimelineMarkerState) {
                        localAppServices.removeTimelineMarkerState(markerId);
                        renderTimeline();
                        showNotification('Marker deleted', 1500);
                    }
                }}
            ];
            createContextMenu(e, menuItems, localAppServices);
        });
    });
    
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

export function openMixerWindow(savedState = null) {
    const windowId = 'mixer';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore();
        return openWindows.get(windowId);
    }

    const contentDOM = buildMixerContentDOM();
    const options = {
        width: 800,
        height: 400,
        minWidth: 600,
        minHeight: 300,
        closable: true,
        minimizable: true,
        resizable: true,
        initialContentKey: windowId
    };
    if (savedState) {
        Object.assign(options, {
            x: parseInt(savedState.left, 10),
            y: parseInt(savedState.top, 10),
            width: parseInt(savedState.width, 10),
            height: parseInt(savedState.height, 10),
            zIndex: savedState.zIndex,
            isMinimized: savedState.isMinimized
        });
    }

    const mixerWindow = localAppServices.createWindow(windowId, 'Mixer', contentDOM, options);

    // Initialize mixer event handlers
    if (mixerWindow?.element) {
        initializeMixerEventHandlers(mixerWindow.element);
    }

    return mixerWindow;
}

function buildMixerContentDOM() {
    const tracks = localAppServices.getTracks ? localAppServices.getTracks() : [];
    const sendTracks = localAppServices.getSendTracks ? localAppServices.getSendTracks() : [];
    const trackGroups = localAppServices.getTrackGroupsState ? localAppServices.getTrackGroupsState() : [];

    let trackStripsHTML = '';
    tracks.forEach(track => {
        trackStripsHTML += buildMixerTrackStripHTML(track, sendTracks);
    });

    let groupStripsHTML = '';
    trackGroups.forEach(group => {
        groupStripsHTML += buildMixerGroupStripHTML(group);
    });

    let sendStripsHTML = '';
    sendTracks.forEach(send => {
        sendStripsHTML += buildMixerSendStripHTML(send);
    });

    return `<div id="mixerContent" class="flex h-full bg-[#1a1a1a] text-gray-200 text-xs overflow-x-auto">
        <!-- Track Groups Section -->
        ${groupStripsHTML ? `
        <div id="mixerGroupsContainer" class="flex flex-shrink-0">
            ${groupStripsHTML}
        </div>
        <div class="w-1 bg-[#303030] flex-shrink-0"></div>
        ` : ''}
        
        <!-- Track Strips -->
        <div id="mixerTracksContainer" class="flex flex-shrink-0">
            ${trackStripsHTML}
        </div>
        
        <!-- Separator -->
        <div class="w-1 bg-[#303030] flex-shrink-0"></div>
        
        <!-- Send Bus Strips -->
        <div id="mixerSendsContainer" class="flex flex-shrink-0">
            ${sendStripsHTML}
            <!-- Add Send Bus Button -->
            <div class="flex flex-col items-center justify-center w-16 h-full bg-[#252525] border-r border-[#303030]">
                <button id="addSendBusBtn" class="p-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded text-gray-300" title="Add Send Bus">
                    <span class="text-lg">+</span>
                </button>
                <span class="text-[10px] mt-1 text-gray-500">Add Send</span>
            </div>
        </div>
        
        <!-- Separator -->
        <div class="w-1 bg-[#303030] flex-shrink-0"></div>
        
        <!-- Add Group Button -->
        <div class="flex flex-col items-center justify-center w-16 h-full bg-[#1a1a2e] border-r border-[#303050]">
            <button id="addGroupBtn" class="p-2 bg-[#3a3a5a] hover:bg-[#4a4a6a] rounded text-blue-300" title="Add Track Group">
                <span class="text-lg">⚙</span>
            </button>
            <span class="text-[10px] mt-1 text-blue-400">Add Group</span>
        </div>
        
        <!-- Master Strip -->
        ${buildMixerMasterStripHTML()}
    </div>`;
}

function buildMixerTrackStripHTML(track, sendTracks) {
    const muted = track.muted;
    const soloed = localAppServices.getSoloedTrackId ? localAppServices.getSoloedTrackId() === track.id : false;
    const armed = localAppServices.getArmedTrackId ? localAppServices.getArmedTrackId() === track.id : false;
    const volume = track.volume !== undefined ? track.volume : 0.8;
    const pan = track.pan !== undefined ? track.pan : 0;

    // Build send level knobs HTML
    let sendKnobsHTML = '';
    sendTracks.forEach(send => {
        const sendLevel = localAppServices.getTrackSendLevel ? localAppServices.getTrackSendLevel(track.id, send.id) : 0;
        const isPreFader = localAppServices.getTrackSendPreFader ? localAppServices.getTrackSendPreFader(track.id, send.id) : false;
        const preFaderLabel = isPreFader ? 'PRE' : 'POST';
        sendKnobsHTML += `
            <div class="flex flex-col items-center mb-1">
                <span class="text-[9px] text-gray-500 truncate w-10 text-center" title="${send.name}">${send.name.substring(0, 4)}</span>
                <div class="send-knob-container flex flex-col items-center" data-track-id="${track.id}" data-send-id="${send.id}">
                    <input type="range" min="0" max="100" value="${Math.round(sendLevel * 100)}" 
                        class="send-level-slider w-8 h-1 bg-[#404040] rounded appearance-none cursor-pointer"
                        data-track-id="${track.id}" data-send-id="${send.id}">
                    <button class="send-pre-post-btn text-[6px] mt-0.5 px-0.5 py-0 rounded ${isPreFader ? 'bg-cyan-700 text-cyan-300' : 'bg-[#3a3a3a] text-gray-500'} hover:bg-[#4a4a4a]" 
                        data-track-id="${track.id}" data-send-id="${send.id}" title="${isPreFader ? 'Pre-Fader (before volume)' : 'Post-Fader (after volume)'}">${preFaderLabel}</button>
                </div>
            </div>`;
    });

    // Check if automation data exists for this parameter
    const hasAutomation = track.hasAutomation ? track.hasAutomation() : false;
    const automationLane = hasAutomation && track.getAutomationLane ? track.getAutomationLane('volume') : [];
    const automationCount = automationLane.length;
    const hasAutoClass = automationCount > 0 ? 'automation-active' : '';

    return `<div class="mixer-track-strip flex flex-col items-center w-16 h-full bg-[#252525] border-r border-[#303030] p-1" data-track-id="${track.id}">
        <!-- Track Color Indicator -->
        <div class="w-full h-1 rounded-sm mb-1" style="background:${track.color || '#666'};"></div>
        
        <!-- Track Name (click to rename) -->
        <div class="text-[10px] text-gray-300 truncate w-full text-center mb-1 mixer-track-name" title="${track.name} (double-click to rename)" style="border-left: 2px solid ${track.color || '#666'}; padding-left: 2px; cursor:pointer;" data-track-id="${track.id}" data-current-name="${track.name}">${track.name}</div>
        
        <!-- Mute/Solo/Arm Buttons -->
        <div class="flex gap-0.5 mb-1">
            <button class="mixer-btn mute-btn w-5 h-4 text-[8px] rounded ${muted ? 'bg-red-600 text-white' : 'bg-[#3a3a3a] text-gray-400 hover:bg-[#4a4a4a]'}" 
                data-track-id="${track.id}" title="Mute">M</button>
            <button class="mixer-btn solo-btn w-5 h-4 text-[8px] rounded ${soloed ? 'bg-yellow-600 text-white' : 'bg-[#3a3a3a] text-gray-400 hover:bg-[#4a4a4a]'}" 
                data-track-id="${track.id}" title="Solo">S</button>
            <button class="mixer-btn arm-btn w-5 h-4 text-[8px] rounded ${armed ? 'bg-red-500 text-white' : 'bg-[#3a3a3a] text-gray-400 hover:bg-[#4a4a4a]'}" 
                data-track-id="${track.id}" title="Record Arm">R</button>
        </div>
        
        <!-- Level Meter -->
        <div class="w-8 h-24 bg-[#101010] rounded border border-[#303030] relative mb-1">
            <div id="mixerTrackMeterBar-${track.id}" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-75" style="height: 0%"></div>
        </div>
        
        <!-- Volume Fader -->
        <input type="range" min="0" max="100" value="${Math.round(volume * 100)}" 
            class="mixer-fader w-3 h-16 bg-[#404040] rounded appearance-none cursor-pointer mb-1" 
            data-track-id="${track.id}" orient="vertical" style="writing-mode: bt-lr; -webkit-appearance: slider-vertical;">
        
        <!-- Pan Knob -->
        <div class="flex flex-col items-center mb-1">
            <span class="text-[8px] text-gray-500">Pan</span>
            <input type="range" min="-50" max="50" value="${Math.round(pan * 50)}" 
                class="pan-knob w-8 h-1 bg-[#404040] rounded appearance-none cursor-pointer" 
                data-track-id="${track.id}">
        </div>
        
        <!-- Automation Lane Mini Editor -->
        <div class="w-full mt-1 border-t border-[#303030] pt-1">
            <div class="flex items-center justify-between mb-0.5">
                <span class="text-[7px] text-gray-500">AUTO</span>
                <span class="text-[7px] ${hasAutoClass}" style="color: ${automationCount > 0 ? '#ff9f43' : '#555'}" title="${automationCount} automation points">${automationCount > 0 ? automationCount + 'pt' : '--'}</span>
            </div>
            <!-- Mini automation lane display -->
            <div class="w-full h-6 bg-[#151515] rounded border border-[#252525] relative overflow-hidden cursor-pointer mixer-automation-mini" data-track-id="${track.id}" title="Click to edit automation">
                <div class="absolute inset-0 flex items-end justify-around px-0.5 pb-0.5">
                    ${[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(step => {
                        const point = automationLane.find(p => p.step === step);
                        return `<div class="w-1 bg-[#252525] rounded-t ${point ? 'automation-mini-point' : ''}" style="height: ${point ? Math.round(point.value * 100) : 0}%; background-color: ${point ? '#ff9f43' : '#252525'}; opacity: ${point ? 1 : 0.3};"></div>`;
                    }).join('')}
                </div>
                ${automationCount === 0 ? '<div class="absolute inset-0 flex items-center justify-center text-[6px] text-gray-600">No Data</div>' : ''}
            </div>
            <!-- Parameter quick selector -->
            <select class="mixer-auto-param-select w-full mt-0.5 text-[7px] bg-[#2a2a2a] text-gray-400 rounded border border-[#303030] cursor-pointer" data-track-id="${track.id}">
                <option value="volume" selected>Volume</option>
                <option value="pan">Pan</option>
                <option value="filterCutoff">Filter</option>
                <option value="resonance">Resonance</option>
            </select>
        </div>
        
        <!-- Send Level Knobs -->
        <div class="sends-container flex flex-col items-center border-t border-[#303030] pt-1 mt-1">
            <span class="text-[8px] text-gray-500 mb-1">Sends</span>
            ${sendKnobsHTML}
        </div>
        
        <!-- Effects Quick Access -->
        <div class="w-full mt-1 border-t border-[#303030] pt-1 flex flex-col items-center">
            <button class="track-fx-btn w-full text-[8px] py-0.5 rounded bg-[#2a2a3a] text-gray-400 hover:bg-[#3a3a4a] hover:text-gray-300 transition-colors" data-track-id="${track.id}" title="Effects Chain">FX${track.activeEffects && track.activeEffects.length > 0 ? ' (' + track.activeEffects.length + ')' : ''}</button>
        </div>
    </div>`;
}

function buildMixerGroupStripHTML(group) {
    const muted = group.muted || false;
    const soloed = group.soloed || false;
    const memberCount = group.trackIds ? group.trackIds.length : 0;

    return `<div class="mixer-group-strip flex flex-col items-center w-20 h-full bg-[#1a1a2e] border-r border-[#303050] p-1" data-group-id="${group.id}">
        <!-- Group Color Indicator -->
        <div class="w-full h-1 rounded-sm mb-1" style="background:${group.color || '#54a0ff'};"></div>
        
        <!-- Group Name -->
        <div class="text-[10px] text-blue-300 truncate w-full text-center mb-1" title="${group.name}" style="border-left: 2px solid ${group.color || '#54a0ff'}; padding-left: 2px;">${group.name}</div>
        
        <!-- Mute/Solo Buttons -->
        <div class="flex gap-0.5 mb-1">
            <button class="mixer-group-btn mute-btn w-5 h-4 text-[8px] rounded ${muted ? 'bg-red-600 text-white' : 'bg-[#3a3a5a] text-gray-400 hover:bg-[#4a4a6a]'}" 
                data-group-id="${group.id}" title="Mute Group">M</button>
            <button class="mixer-group-btn solo-btn w-5 h-4 text-[8px] rounded ${soloed ? 'bg-yellow-600 text-white' : 'bg-[#3a3a5a] text-gray-400 hover:bg-[#4a4a6a]'}" 
                data-group-id="${group.id}" title="Solo Group">S</button>
        </div>
        
        <!-- Member Track Count -->
        <div class="text-[8px] text-gray-500 mb-1" title="${memberCount} tracks in group">
            <span class="text-blue-400">${memberCount}</span> track${memberCount !== 1 ? 's' : ''}
        </div>
        
        <!-- Color Strip showing member tracks (visual indicator) -->
        <div class="w-full flex-1 bg-[#151525] rounded border border-[#252545] p-0.5 flex flex-wrap content-start gap-0.5">
            ${group.trackIds ? group.trackIds.slice(0, 8).map(trackId => {
                const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
                return `<div class="w-3 h-3 rounded-sm" style="background:${track?.color || '#666'}" title="Track ${trackId}"></div>`;
            }).join('') : ''}
            ${memberCount > 8 ? `<div class="text-[6px] text-gray-500">+${memberCount - 8}</div>` : ''}
        </div>
        
        <!-- Context Menu Trigger (for right-click actions) -->
        <button class="mt-1 p-0.5 text-[7px] text-gray-500 hover:text-gray-300 group-context-btn" data-group-id="${group.id}" title="Group options">⚙</button>
    </div>`;
}

function buildMixerSendStripHTML(send) {
    const level = send.level !== undefined ? send.level : 1.0;
    const muted = send.muted || false;

    return `<div class="mixer-send-strip flex flex-col items-center w-16 h-full bg-[#202020] border-r border-[#303030] p-1" data-send-id="${send.id}">
        <!-- Send Name -->
        <div class="text-[10px] text-purple-300 truncate w-full text-center mb-1" title="${send.name}">${send.name}</div>
        
        <!-- Mute Button -->
        <button class="mixer-send-btn mute-btn w-8 h-4 text-[8px] rounded ${muted ? 'bg-red-600 text-white' : 'bg-[#3a3a3a] text-gray-400 hover:bg-[#4a4a4a]'}" 
            data-send-id="${send.id}" title="Mute Send">M</button>
        
        <!-- Level Meter (simplified) -->
        <div class="w-6 h-16 bg-[#101010] rounded border border-[#303030] relative my-1">
            <div id="mixerSendMeter-${send.id}" class="absolute bottom-0 left-0 right-0 bg-purple-500 transition-all duration-75" style="height: 0%"></div>
        </div>
        
        <!-- Level Fader -->
        <input type="range" min="0" max="100" value="${Math.round(level * 100)}" 
            class="send-fader w-3 h-12 bg-[#404040] rounded appearance-none cursor-pointer mb-1" 
            data-send-id="${send.id}" orient="vertical" style="writing-mode: bt-lr; -webkit-appearance: slider-vertical;">
        
        <!-- Effects Button -->
        <button class="send-effects-btn w-8 h-4 text-[8px] rounded bg-purple-500 hover:bg-purple-600 text-white" 
            data-send-id="${send.id}" title="Open Send Effects">FX</button>
    </div>`;
}

function buildMixerMasterStripHTML() {
    const masterVolume = localAppServices.getMasterGainValue ? localAppServices.getMasterGainValue() : 0.8;

    return `<div class="mixer-master-strip flex flex-col items-center w-20 h-full bg-[#1e1e1e] border-r border-[#303030] p-1">
        <!-- Master Label -->
        <div class="text-[10px] text-orange-300 font-semibold w-full text-center mb-1">MASTER</div>
        
        <!-- Master Level Meter -->
        <div class="w-10 h-16 bg-[#101010] rounded border border-[#303030] relative mb-1">
            <div id="mixerMasterMeterBar" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-75" style="height: 0%"></div>
        </div>
        
        <!-- Master Volume Fader -->
        <input type="range" min="0" max="100" value="${Math.round(masterVolume * 100)}" 
            class="master-fader w-4 h-20 bg-[#404040] rounded appearance-none cursor-pointer" 
            id="masterVolumeFader" orient="vertical" style="writing-mode: bt-lr; -webkit-appearance: slider-vertical;">
        
        <span class="text-[8px] text-gray-500 mt-1">Volume</span>
    </div>`;
}

function initializeMixerEventHandlers(mixerElement) {
    // Track mute/solo/arm buttons
    mixerElement.querySelectorAll('.mixer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const trackId = parseInt(e.target.dataset.trackId);
            const action = e.target.classList.contains('mute-btn') ? 'mute' :
                          e.target.classList.contains('solo-btn') ? 'solo' : 'arm';
            handleMixerButtonAction(trackId, action);
        });
    });

    // Group mute/solo buttons
    mixerElement.querySelectorAll('.mixer-group-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const groupId = parseInt(e.target.dataset.groupId);
            const action = e.target.classList.contains('mute-btn') ? 'groupMute' : 'groupSolo';
            handleMixerGroupAction(groupId, action);
        });
    });

    // Track volume faders
    mixerElement.querySelectorAll('.mixer-fader').forEach(fader => {
        fader.addEventListener('input', (e) => {
            const trackId = parseInt(e.target.dataset.trackId);
            const value = parseInt(e.target.value) / 100;
            handleMixerVolumeChange(trackId, value);
        });
    });

    // Track pan knobs
    mixerElement.querySelectorAll('.pan-knob').forEach(knob => {
        knob.addEventListener('input', (e) => {
            const trackId = parseInt(e.target.dataset.trackId);
            const value = parseInt(e.target.value) / 50; // -1 to 1
            handleMixerPanChange(trackId, value);
        });
    });

    // Mixer automation mini editor click handlers
    mixerElement.querySelectorAll('.mixer-automation-mini').forEach(miniEditor => {
        miniEditor.addEventListener('click', (e) => {
            const trackId = parseInt(miniEditor.dataset.trackId);
            // Open the track's sequencer window with automation visible
            if (localAppServices.openTrackSequencerWindow) {
                localAppServices.openTrackSequencerWindow(trackId);
                // The sequencer will show the automation editor by default
                showNotification('Automation editor available in Sequencer window', 2000);
            }
        });
    });

    // Mixer automation parameter selector handlers
    mixerElement.querySelectorAll('.mixer-auto-param-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const trackId = parseInt(select.dataset.trackId);
            const param = select.value;
            // Update the mini display to show the correct parameter
            const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
            if (track && track.getAutomationLane) {
                const lane = track.getAutomationLane(param);
                // Find the mini editor for this track
                const miniEditor = select.parentElement.querySelector('.mixer-automation-mini');
                if (miniEditor) {
                    // Rebuild the mini bar display
                    const barsContainer = miniEditor.querySelector('div:first-child');
                    if (barsContainer) {
                        const steps = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
                        barsContainer.innerHTML = steps.map(step => {
                            const point = lane.find(p => p.step === step);
                            return `<div class="w-1 bg-[#252525] rounded-t ${point ? 'automation-mini-point' : ''}" style="height: ${point ? Math.round(point.value * 100) : 0}%; background-color: ${point ? '#ff9f43' : '#252525'}; opacity: ${point ? 1 : 0.3};"></div>`;
                        }).join('');
                    }
                    // Update "No Data" overlay
                    const noDataEl = miniEditor.querySelector('.absolute.inset-0.flex');
                    if (lane.length === 0 && noDataEl) {
                        noDataEl.style.display = 'flex';
                    } else if (lane.length > 0 && noDataEl) {
                        noDataEl.style.display = 'none';
                    }
                }
                // Show automation count
                const countSpan = select.parentElement.querySelector('span:last-child');
                if (countSpan) {
                    countSpan.textContent = lane.length > 0 ? lane.length + 'pt' : '--';
                    countSpan.style.color = lane.length > 0 ? '#ff9f43' : '#555';
                }
            }
        });
    });

    // Send level sliders
    mixerElement.querySelectorAll('.send-level-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const trackId = parseInt(e.target.dataset.trackId);
            const sendId = parseInt(e.target.dataset.sendId);
            const value = parseInt(e.target.value) / 100;
            handleMixerSendLevelChange(trackId, sendId, value);
        });
    });

    // Send pre/post fader toggle buttons
    mixerElement.querySelectorAll('.send-pre-post-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const trackId = parseInt(e.target.dataset.trackId);
            const sendId = parseInt(e.target.dataset.sendId);
            const currentPreFader = localAppServices.getTrackSendPreFader ? localAppServices.getTrackSendPreFader(trackId, sendId) : false;
            const newPreFader = !currentPreFader;
            if (localAppServices.setTrackSendPreFader) {
                localAppServices.setTrackSendPreFader(trackId, sendId, newPreFader);
                // Update button appearance
                e.target.textContent = newPreFader ? 'PRE' : 'POST';
                e.target.className = `send-pre-post-btn text-[6px] mt-0.5 px-0.5 py-0 rounded ${newPreFader ? 'bg-cyan-700 text-cyan-300' : 'bg-[#3a3a3a] text-gray-500'} hover:bg-[#4a4a4a]`;
                showNotification(`Send set to ${newPreFader ? 'pre-fader' : 'post-fader'}`, 1500);
            }
        });
    });

    // Add Send Bus button
    const addSendBtn = mixerElement.querySelector('#addSendBusBtn');
    if (addSendBtn) {
        addSendBtn.addEventListener('click', () => {
            handleAddSendBus();
        });
    }

    // Add Group button
    const addGroupBtn = mixerElement.querySelector('#addGroupBtn');
    if (addGroupBtn) {
        addGroupBtn.addEventListener('click', () => {
            handleAddGroup();
        });
    }
    
    // Group context menu (right-click on group strip)
    mixerElement.querySelectorAll('.group-context-btn').forEach(btn => {
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const groupId = parseInt(e.target.dataset.groupId);
            const group = localAppServices.getTrackGroupByIdState ? localAppServices.getTrackGroupByIdState(groupId) : null;
            if (!group) return;
            
            const menuItems = [];
            
            // Rename group
            menuItems.push({
                label: 'Rename Group...',
                action: () => {
                    const newName = prompt('Enter new group name:', group.name);
                    if (newName && newName.trim() && localAppServices.setTrackGroupNameState) {
                        localAppServices.setTrackGroupNameState(groupId, newName.trim());
                        updateMixerWindow();
                    }
                }
            });
            
            // Change color
            const colorSubmenu = [];
            Constants.TRACK_GROUP_COLORS.forEach(color => {
                colorSubmenu.push({
                    label: color,
                    action: () => {
                        if (localAppServices.setTrackGroupColorState) {
                            localAppServices.setTrackGroupColorState(groupId, color);
                            updateMixerWindow();
                        }
                    }
                });
            });
            menuItems.push({ label: 'Change Color', submenu: colorSubmenu });
            
            // Delete group
            menuItems.push({ separator: true });
            menuItems.push({
                label: 'Delete Group',
                action: () => {
                    if (localAppServices.removeTrackGroupState) {
                        localAppServices.removeTrackGroupState(groupId);
                        updateMixerWindow();
                        showNotification(`Group "${group.name}" deleted`, 1500);
                    }
                }
            });
            
            createContextMenu(e, menuItems, localAppServices);
        });
    });
    
    // Track FX button (open effects rack)
    mixerElement.querySelectorAll('.track-fx-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const trackId = parseInt(e.target.dataset.trackId);
            if (localAppServices.openTrackEffectsRackWindow) {
                localAppServices.openTrackEffectsRackWindow(trackId);
            }
        });
    });
    
    // Track strip context menu (right-click on track strip)
    mixerElement.querySelectorAll('.mixer-track-strip').forEach(strip => {
        strip.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const trackId = parseInt(strip.dataset.trackId);
            const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
            if (!track) return;
            
            const groups = localAppServices.getTrackGroupsState ? localAppServices.getTrackGroupsState() : [];
            const trackGroups = groups.filter(g => g.trackIds && g.trackIds.includes(trackId));
            const otherGroups = groups.filter(g => !trackGroups.some(tg => tg.id === g.id));
            
            const menuItems = [];
            
            // Add to group submenu
            if (otherGroups.length > 0) {
                const addToGroupItems = otherGroups.map(g => ({
                    label: g.name,
                    action: () => {
                        if (localAppServices.addTrackToGroupState) {
                            localAppServices.addTrackToGroupState(g.id, trackId);
                            updateMixerWindow();
                            showNotification(`Added "${track.name}" to group "${g.name}"`, 1500);
                        }
                    }
                }));
                menuItems.push({ label: 'Add to Group', submenu: addToGroupItems });
            }
            
            // Remove from group submenu
            if (trackGroups.length > 0) {
                const removeFromGroupItems = trackGroups.map(g => ({
                    label: g.name,
                    action: () => {
                        if (localAppServices.removeTrackFromGroupState) {
                            localAppServices.removeTrackFromGroupState(g.id, trackId);
                            updateMixerWindow();
                            showNotification(`Removed "${track.name}" from group "${g.name}"`, 1500);
                        }
                    }
                }));
                menuItems.push({ label: 'Remove from Group', submenu: removeFromGroupItems });
            }
            
            // Create new group with track
            menuItems.push({
                label: 'Create Group from Track',
                action: () => {
                    handleAddGroup();
                    setTimeout(() => {
                        const newGroups = localAppServices.getTrackGroupsState ? localAppServices.getTrackGroupsState() : [];
                        const lastGroup = newGroups[newGroups.length - 1];
                        if (lastGroup && localAppServices.addTrackToGroupState) {
                            localAppServices.addTrackToGroupState(lastGroup.id, trackId);
                            updateMixerWindow();
                            showNotification(`Created new group with "${track.name}"`, 1500);
                        }
                    }, 50);
                }
            });
            
            // Rename track
            menuItems.push({
                label: 'Rename Track...',
                action: () => {
                    const newName = prompt('Enter new track name:', track.name);
                    if (newName && newName.trim()) {
                        if (track.setTrackName) {
                            track.setTrackName(newName.trim());
                            updateMixerWindow();
                            showNotification(`Track renamed to "${newName.trim()}"`, 1500);
                        }
                    }
                }
            });
            
            // Color submenu
            const colorItems = Constants.TRACK_COLORS.map(color => ({
                label: color,
                action: () => {
                    if (track.setTrackColor) {
                        track.setTrackColor(color);
                        updateMixerWindow();
                        showNotification(`Track color changed`, 1500);
                    }
                }
            }));
            menuItems.push({ label: 'Color', submenu: colorItems });
            
            // Delete track
            menuItems.push({ separator: true });
            menuItems.push({
                label: 'Delete Track',
                action: () => {
                    if (typeof handleRemoveTrack === 'function') {
                        handleRemoveTrack(trackId);
                    } else if (localAppServices.removeTrack) {
                        localAppServices.removeTrack(trackId);
                    }
                }
            });
            
            // Duplicate track
            menuItems.push({
                label: 'Duplicate Track',
                action: () => {
                    if (track.duplicateTrack) {
                        track.duplicateTrack();
                        showNotification(`Track "${track.name}" duplicated`, 1500);
                    }
                }
            });

            createContextMenu(e, menuItems, localAppServices);
        });
    });

    // Send bus mute buttons
    mixerElement.querySelectorAll('.mixer-send-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sendId = parseInt(e.target.dataset.sendId);
            const isMuted = !e.target.classList.contains('bg-red-600');
            handleMixerSendMute(sendId, isMuted);
        });
    });

    // Send bus level faders
    mixerElement.querySelectorAll('.send-fader').forEach(fader => {
        fader.addEventListener('input', (e) => {
            const sendId = parseInt(e.target.dataset.sendId);
            const value = parseInt(e.target.value) / 100;
            handleMixerSendLevelChangeFader(sendId, value);
        });
    });

    // Send bus effects buttons
    mixerElement.querySelectorAll('.send-effects-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sendId = parseInt(e.target.dataset.sendId);
            if (localAppServices.openSendEffectsWindow) {
                localAppServices.openSendEffectsWindow(sendId);
            }
        });
    });

    // Master volume fader
    const masterFader = mixerElement.querySelector('#masterVolumeFader');
    if (masterFader) {
        masterFader.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) / 100;
            handleMixerMasterVolumeChange(value);
        });
    }
}

function handleMixerButtonAction(trackId, action) {
    if (action === 'mute') {
        handleTrackMute(trackId);
    } else if (action === 'solo') {
        handleTrackSolo(trackId);
    } else if (action === 'arm') {
        handleTrackArm(trackId);
    }
    // Update the mixer UI
    updateMixerWindow();
}

function handleMixerGroupAction(groupId, action) {
    if (localAppServices.captureStateForUndo) {
        localAppServices.captureStateForUndo(`Track Group ${action}`);
    }
    
    const group = localAppServices.getTrackGroupByIdState ? localAppServices.getTrackGroupByIdState(groupId) : null;
    if (!group) return;
    
    if (action === 'groupMute') {
        const newMuted = !group.muted;
        if (localAppServices.setTrackGroupMutedState) {
            localAppServices.setTrackGroupMutedState(groupId, newMuted);
        }
        // Also mute/unmute all tracks in the group
        if (group.trackIds && localAppServices.setTrackMutedState) {
            group.trackIds.forEach(trackId => {
                localAppServices.setTrackMutedState(trackId, newMuted);
            });
        }
        showNotification(`Group ${group.name} ${newMuted ? 'muted' : 'unmuted'}`, 1500);
    } else if (action === 'groupSolo') {
        const newSoloed = !group.soloed;
        if (localAppServices.setTrackGroupSoloedState) {
            localAppServices.setTrackGroupSoloedState(groupId, newSoloed);
        }
        // Also solo/unsolo all tracks in the group
        if (group.trackIds && localAppServices.setTrackSoloedState) {
            group.trackIds.forEach(trackId => {
                localAppServices.setTrackSoloedState(trackId, newSoloed);
            });
        }
        showNotification(`Group ${group.name} ${newSoloed ? 'soloed' : 'unsoloed'}`, 1500);
    }
    
    // Update the mixer UI
    updateMixerWindow();
    // Also update track panels since track mute/solo states changed
    if (localAppServices.updateAllTrackPanels) {
        localAppServices.updateAllTrackPanels();
    }
}

function handleMixerVolumeChange(trackId, value) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (track && track.setVolume) {
        track.setVolume(value);
    }
}

function handleMixerPanChange(trackId, value) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (track && track.setPan) {
        track.setPan(value, true);
    }
    if (localAppServices.setTrackPanState) {
        localAppServices.setTrackPanState(trackId, value);
    }
}

function handleMixerSendLevelChange(trackId, sendId, value) {
    if (localAppServices.setTrackSendLevel) {
        localAppServices.setTrackSendLevel(trackId, sendId, value);
    }
    if (localAppServices.setTrackSendLevelState) {
        localAppServices.setTrackSendLevelState(trackId, sendId, value);
    }
}

function handleAddSendBus() {
    if (localAppServices.addSendTrack) {
        const sendTrack = localAppServices.addSendTrack();
        if (sendTrack && localAppServices.createSendBus) {
            localAppServices.createSendBus(sendTrack.id);
        }
        updateMixerWindow();
    }
}

function handleAddGroup() {
    if (localAppServices.addTrackGroupState && localAppServices.getTrackGroupsState) {
        const groups = localAppServices.getTrackGroupsState();
        if (groups.length >= Constants.MAX_TRACK_GROUPS) {
            showNotification(`Maximum number of groups (${Constants.MAX_TRACK_GROUPS}) reached`, 2000);
            return;
        }
        
        // Generate a unique group name
        const baseName = Constants.DEFAULT_TRACK_GROUP_NAME;
        let counter = 1;
        let name = baseName;
        while (groups.some(g => g.name === name)) {
            name = `${baseName} ${counter++}`;
        }
        
        const newGroup = {
            name: name,
            color: Constants.DEFAULT_TRACK_GROUP_COLOR,
            trackIds: [],
            muted: false,
            soloed: false
        };
        
        const group = localAppServices.addTrackGroupState(newGroup);
        showNotification(`Group "${name}" created`, 1500);
        updateMixerWindow();
    }
}

function handleMixerSendMute(sendId, muted) {
    if (localAppServices.setSendTrackMuted) {
        localAppServices.setSendTrackMuted(sendId, muted);
    }
    if (localAppServices.setSendBusMuted) {
        localAppServices.setSendBusMuted(sendId, muted);
    }
    updateMixerWindow();
}

function handleMixerSendLevelChangeFader(sendId, value) {
    if (localAppServices.setSendTrackLevel) {
        localAppServices.setSendTrackLevel(sendId, value);
    }
    if (localAppServices.setSendBusLevel) {
        localAppServices.setSendBusLevel(sendId, value);
    }
}

function handleMixerMasterVolumeChange(value) {
    if (localAppServices.setMasterGainValue) {
        localAppServices.setMasterGainValue(value);
    }
}

export function updateMixerWindow() {
    const mixerElement = localAppServices.getOpenWindowElement ? localAppServices.getOpenWindowElement('mixer') : null;
    if (!mixerElement) return;

    const tracks = localAppServices.getTracks ? localAppServices.getTracks() : [];
    const sendTracks = localAppServices.getSendTracks ? localAppServices.getSendTracks() : [];
    const soloedTrackId = localAppServices.getSoloedTrackId ? localAppServices.getSoloedTrackId() : null;
    const armedTrackId = localAppServices.getArmedTrackId ? localAppServices.getArmedTrackId() : null;

    // Update track strips
    tracks.forEach(track => {
        const trackStrip = mixerElement.querySelector(`.mixer-track-strip[data-track-id="${track.id}"]`);
        if (trackStrip) {
            // Update mute button
            const muteBtn = trackStrip.querySelector('.mute-btn');
            if (muteBtn) {
                muteBtn.classList.toggle('bg-red-600', track.muted);
                muteBtn.classList.toggle('text-white', track.muted);
                muteBtn.classList.toggle('bg-[#3a3a3a]', !track.muted);
                muteBtn.classList.toggle('text-gray-400', !track.muted);
            }

            // Update solo button
            const soloBtn = trackStrip.querySelector('.solo-btn');
            if (soloBtn) {
                const isSoloed = soloedTrackId === track.id;
                soloBtn.classList.toggle('bg-yellow-600', isSoloed);
                soloBtn.classList.toggle('text-white', isSoloed);
                soloBtn.classList.toggle('bg-[#3a3a3a]', !isSoloed);
                soloBtn.classList.toggle('text-gray-400', !isSoloed);
            }

            // Update arm button
            const armBtn = trackStrip.querySelector('.arm-btn');
            if (armBtn) {
                const isArmed = armedTrackId === track.id;
                armBtn.classList.toggle('bg-red-500', isArmed);
                armBtn.classList.toggle('text-white', isArmed);
                armBtn.classList.toggle('bg-[#3a3a3a]', !isArmed);
                armBtn.classList.toggle('text-gray-400', !isArmed);
            }

            // Update volume fader
            const fader = trackStrip.querySelector('.mixer-fader');
            if (fader && track.volume !== undefined) {
                fader.value = Math.round(track.volume * 100);
            }

            // Update pan knob
            const panKnob = trackStrip.querySelector('.pan-knob');
            if (panKnob && track.pan !== undefined) {
                panKnob.value = Math.round(track.pan * 50);
            }

            // Update send level sliders
            sendTracks.forEach(send => {
                const sendSlider = trackStrip.querySelector(`.send-level-slider[data-send-id="${send.id}"]`);
                if (sendSlider) {
                    const sendLevel = localAppServices.getTrackSendLevel ? localAppServices.getTrackSendLevel(track.id, send.id) : 0;
                    sendSlider.value = Math.round(sendLevel * 100);
                }
            });
        }
    });

    // Update send bus strips
    sendTracks.forEach(send => {
        const sendStrip = mixerElement.querySelector(`.mixer-send-strip[data-send-id="${send.id}"]`);
        if (sendStrip) {
            // Update mute button
            const muteBtn = sendStrip.querySelector('.mute-btn');
            if (muteBtn) {
                muteBtn.classList.toggle('bg-red-600', send.muted);
                muteBtn.classList.toggle('text-white', send.muted);
                muteBtn.classList.toggle('bg-[#3a3a3a]', !send.muted);
                muteBtn.classList.toggle('text-gray-400', !send.muted);
            }

            // Update level fader
            const fader = sendStrip.querySelector('.send-fader');
            if (fader && send.level !== undefined) {
                fader.value = Math.round(send.level * 100);
            }
        }
    });

    // Update master fader
    const masterFader = mixerElement.querySelector('#masterVolumeFader');
    if (masterFader) {
        const masterVolume = localAppServices.getMasterGainValue ? localAppServices.getMasterGainValue() : 0.8;
        masterFader.value = Math.round(masterVolume * 100);
    }
}

export function openAudioClipEditorWindow(trackId, clipId, savedState = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) { console.error(`[UI] Track ${trackId} not found for audio clip editor.`); return null; }
    
    const clip = track.timelineClips ? track.timelineClips.find(c => c.id === clipId) : null;
    if (!clip) { console.error(`[UI] Clip ${clipId} not found in track ${trackId}.`); return null; }

    const windowId = `audioClipEditor-${clipId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore();
        return openWindows.get(windowId);
    }

    function buildClipEditorContent() {
        const fadeIn = clip.fadeIn || 0;
        const fadeOut = clip.fadeOut || 0;
        const startTime = clip.startTime || 0;
        const duration = clip.duration || 0;
        const name = clip.name || 'Untitled Clip';
        const gain = clip.gain !== undefined ? clip.gain : Constants.DEFAULT_AUDIO_CLIP_GAIN;
        const gainDb = gain > 0 ? (20 * Math.log10(gain)).toFixed(1) : '-∞';
        const playbackRate = clip.playbackRate !== undefined ? clip.playbackRate : Constants.DEFAULT_AUDIO_CLIP_PLAYBACK_RATE;
        const startOffset = clip.startOffset !== undefined ? clip.startOffset : Constants.DEFAULT_AUDIO_CLIP_START_OFFSET;
        const endOffset = clip.endOffset !== undefined ? clip.endOffset : Constants.DEFAULT_AUDIO_CLIP_END_OFFSET;
        
        return `<div id="audioClipEditorContent-${clipId}" class="p-3 space-y-4 text-sm">
            <h3 class="text-base font-semibold dark:text-slate-200">Audio Clip Editor</h3>
            
            <div class="space-y-1">
                <label class="text-xs text-zinc-400">Clip Name</label>
                <input type="text" id="clipNameInput-${clipId}" value="${name}" 
                    class="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-sm">
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                    <label class="text-xs text-zinc-400">Start Time (s)</label>
                    <input type="number" id="clipStartTime-${clipId}" value="${startTime.toFixed(2)}" step="0.01" min="0"
                        class="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-sm">
                </div>
                <div class="space-y-1">
                    <label class="text-xs text-zinc-400">Duration (s)</label>
                    <input type="number" id="clipDuration-${clipId}" value="${duration.toFixed(2)}" step="0.01" min="0.1"
                        class="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-sm" readonly>
                </div>
            </div>
            
            <div class="space-y-1">
                <label class="text-xs text-zinc-400">Source Trim</label>
                <div class="grid grid-cols-2 gap-2">
                    <div class="space-y-1">
                        <label class="text-xs text-zinc-500">Start Offset (s)</label>
                        <div class="flex items-center gap-1">
                            <input type="range" id="clipStartOffsetSlider-${clipId}" min="0" max="${duration.toFixed(2)}" step="0.01" value="${startOffset.toFixed(2)}"
                                class="flex-1 accent-cyan-500">
                            <input type="number" id="clipStartOffsetInput-${clipId}" value="${startOffset.toFixed(2)}" step="0.01" min="0" max="${duration.toFixed(2)}"
                                class="w-16 px-1 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-xs text-center">
                        </div>
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs text-zinc-500">End Offset (s) <span class="text-zinc-600">(-1=full)</span></label>
                        <div class="flex items-center gap-1">
                            <input type="range" id="clipEndOffsetSlider-${clipId}" min="-1" max="${duration.toFixed(2)}" step="0.01" value="${endOffset < 0 ? duration.toFixed(2) : endOffset.toFixed(2)}"
                                class="flex-1 accent-cyan-500">
                            <input type="number" id="clipEndOffsetInput-${clipId}" value="${endOffset < 0 ? -1 : endOffset.toFixed(2)}" step="0.01" min="-1" max="${duration.toFixed(2)}"
                                class="w-16 px-1 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-xs text-center">
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="space-y-1">
                <label class="text-xs text-zinc-400">Gain (dB: <span id="gainDbDisplay-${clipId}">${gainDb}</span>)</label>
                <div class="flex items-center gap-2">
                    <input type="range" id="clipGainSlider-${clipId}" min="0" max="4" step="0.01" value="${gain}"
                        class="flex-1 accent-green-500">
                    <input type="number" id="clipGainInput-${clipId}" value="${gain.toFixed(2)}" step="0.01" min="0" max="4"
                        class="w-20 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-sm text-center">
                </div>
            </div>
            
            <div class="space-y-1">
                <label class="text-xs text-zinc-400">Fade In (seconds)</label>
                <div class="flex items-center gap-2">
                    <input type="range" id="clipFadeInSlider-${clipId}" min="0" max="${Math.min(duration/2, 10).toFixed(2)}" step="0.01" value="${fadeIn.toFixed(2)}"
                        class="flex-1 accent-blue-500">
                    <input type="number" id="clipFadeInInput-${clipId}" value="${fadeIn.toFixed(2)}" step="0.01" min="0" max="${Math.min(duration/2, 10).toFixed(2)}"
                        class="w-20 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-sm text-center">
                </div>
            </div>
            
            <div class="space-y-1">
                <label class="text-xs text-zinc-400">Fade Out (seconds)</label>
                <div class="flex items-center gap-2">
                    <input type="range" id="clipFadeOutSlider-${clipId}" min="0" max="${Math.min(duration/2, 10).toFixed(2)}" step="0.01" value="${fadeOut.toFixed(2)}"
                        class="flex-1 accent-blue-500">
                    <input type="number" id="clipFadeOutInput-${clipId}" value="${fadeOut.toFixed(2)}" step="0.01" min="0" max="${Math.min(duration/2, 10).toFixed(2)}"
                        class="w-20 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-sm text-center">
                </div>
            </div>
            
            <div class="space-y-1">
                <label class="text-xs text-zinc-400">Fade Curve</label>
                <div class="grid grid-cols-2 gap-2">
                    <div class="space-y-1">
                        <label class="text-xs text-zinc-500">Fade In Curve</label>
                        <select id="clipFadeInCurve-${clipId}" class="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-sm">
                            <option value="linear" ${(clip.fadeInCurve || 'linear') === 'linear' ? 'selected' : ''}>Linear</option>
                            <option value="exponential" ${clip.fadeInCurve === 'exponential' ? 'selected' : ''}>Exponential</option>
                        </select>
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs text-zinc-500">Fade Out Curve</label>
                        <select id="clipFadeOutCurve-${clipId}" class="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-sm">
                            <option value="linear" ${(clip.fadeOutCurve || 'linear') === 'linear' ? 'selected' : ''}>Linear</option>
                            <option value="exponential" ${clip.fadeOutCurve === 'exponential' ? 'selected' : ''}>Exponential</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="space-y-1">
                <label class="text-xs text-zinc-400">Crossfade (seconds)</label>
                <div class="flex items-center gap-2">
                    <input type="range" id="clipCrossfadeSlider-${clipId}" min="0" max="${Math.min(Constants.MAX_AUDIO_CLIP_CROSSFADE, duration/4).toFixed(2)}" step="0.01" value="${(clip.crossfade || 0).toFixed(2)}"
                        class="flex-1 accent-amber-500">
                    <input type="number" id="clipCrossfadeInput-${clipId}" value="${(clip.crossfade || 0).toFixed(2)}" step="0.01" min="0" max="${Math.min(Constants.MAX_AUDIO_CLIP_CROSSFADE, duration/4).toFixed(2)}"
                        class="w-20 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-sm text-center">
                </div>
            </div>
            
            <div class="space-y-1">
                <label class="text-xs text-zinc-400">Playback Options</label>
                <div class="flex items-center gap-3 flex-wrap">
                    <label class="flex items-center gap-1.5 text-zinc-300 text-xs cursor-pointer">
                        <input type="checkbox" id="clipReverse-${clipId}" ${clip.reverse ? 'checked' : ''} class="accent-purple-500">
                        <span>Reverse</span>
                    </label>
                </div>
            </div>
            
            <div class="space-y-1">
                <label class="text-xs text-zinc-400">Playback Rate (<span id="playbackRateDisplay-${clipId}">${playbackRate.toFixed(2)}x</span>)</label>
                <div class="flex items-center gap-2">
                    <input type="range" id="clipPlaybackRateSlider-${clipId}" min="${Constants.MIN_AUDIO_CLIP_PLAYBACK_RATE}" max="${Constants.MAX_AUDIO_CLIP_PLAYBACK_RATE}" step="0.05" value="${playbackRate}"
                        class="flex-1 accent-orange-500">
                    <input type="number" id="clipPlaybackRateInput-${clipId}" value="${playbackRate.toFixed(2)}" step="0.05" min="${Constants.MIN_AUDIO_CLIP_PLAYBACK_RATE}" max="${Constants.MAX_AUDIO_CLIP_PLAYBACK_RATE}"
                        class="w-20 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-sm text-center">
                </div>
            </div>
            
            <div class="space-y-1">
                <label class="text-xs text-zinc-400">Clip Color</label>
                <div id="clipColorSwatches-${clipId}" class="flex gap-1 flex-wrap">
                    ${Constants.CLIP_COLORS.map((c, i) => {
                        const isSelected = (clip.color || (clip.type === 'audio' ? '#4a9eff' : '#9f4aff')) === c;
                        const border = isSelected ? 'border-white border-2' : 'border-transparent border';
                        return `<button class="clip-color-swatch w-5 h-5 rounded cursor-pointer transition-all ${border}" style="background:${c};" data-color="${c}" title="${c}"></button>`;
                    }).join('')}
                </div>
            </div>
            
            <div class="space-y-1">
                <label class="text-xs text-zinc-400">Waveform Preview</label>
                <canvas id="clipWaveformCanvas-${clipId}" class="w-full h-20 bg-zinc-800 rounded border border-zinc-600"></canvas>
            </div>
            
            <div class="pt-2 border-t border-zinc-700 flex gap-2 flex-wrap">
                <button id="normalizeClipBtn-${clipId}" class="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium">Normalize</button>
                <button id="applyClipChangesBtn-${clipId}" class="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium">Apply</button>
                <button id="deleteClipBtn-${clipId}" class="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium">Delete</button>
            </div>
        </div>`;
    }

    const editorWindow = localAppServices.createWindow(windowId, `Clip: ${name}`, buildClipEditorContent(), {
        width: 380, height: 620, minWidth: 320, minHeight: 500, initialContentKey: windowId
    });

    if (editorWindow?.element) {
        const el = editorWindow.element;
        
        // Sync slider and input for fade in
        const fadeInSlider = el.querySelector(`#clipFadeInSlider-${clipId}`);
        const fadeInInput = el.querySelector(`#clipFadeInInput-${clipId}`);
        if (fadeInSlider && fadeInInput) {
            fadeInSlider.addEventListener('input', () => { fadeInInput.value = parseFloat(fadeInSlider.value).toFixed(2); });
            fadeInInput.addEventListener('input', () => { fadeInSlider.value = parseFloat(fadeInInput.value).toFixed(2); });
        }
        
        // Sync slider and input for fade out
        const fadeOutSlider = el.querySelector(`#clipFadeOutSlider-${clipId}`);
        const fadeOutInput = el.querySelector(`#clipFadeOutInput-${clipId}`);
        if (fadeOutSlider && fadeOutInput) {
            fadeOutSlider.addEventListener('input', () => { fadeOutInput.value = parseFloat(fadeOutSlider.value).toFixed(2); });
            fadeOutInput.addEventListener('input', () => { fadeOutSlider.value = parseFloat(fadeOutInput.value).toFixed(2); });
        }
        
        // Sync slider and input for crossfade
        const crossfadeSlider = el.querySelector(`#clipCrossfadeSlider-${clipId}`);
        const crossfadeInput = el.querySelector(`#clipCrossfadeInput-${clipId}`);
        if (crossfadeSlider && crossfadeInput) {
            crossfadeSlider.addEventListener('input', () => { crossfadeInput.value = parseFloat(crossfadeSlider.value).toFixed(2); });
            crossfadeInput.addEventListener('input', () => { crossfadeSlider.value = parseFloat(crossfadeInput.value).toFixed(2); });
        }
        
        // Sync slider and input for gain
        const gainSlider = el.querySelector(`#clipGainSlider-${clipId}`);
        const gainInput = el.querySelector(`#clipGainInput-${clipId}`);
        const gainDbDisplay = el.querySelector(`#gainDbDisplay-${clipId}`);
        if (gainSlider && gainInput) {
            const updateGainDisplay = () => {
                const g = parseFloat(gainSlider.value);
                gainInput.value = g.toFixed(2);
                if (gainDbDisplay) {
                    gainDbDisplay.textContent = g > 0 ? (20 * Math.log10(g)).toFixed(1) : '-∞';
                }
            };
            gainSlider.addEventListener('input', updateGainDisplay);
            gainInput.addEventListener('input', () => { gainSlider.value = parseFloat(gainInput.value); updateGainDisplay(); });
        }
        
        // Sync slider and input for playback rate
        const playbackRateSlider = el.querySelector(`#clipPlaybackRateSlider-${clipId}`);
        const playbackRateInput = el.querySelector(`#clipPlaybackRateInput-${clipId}`);
        const playbackRateDisplay = el.querySelector(`#playbackRateDisplay-${clipId}`);
        if (playbackRateSlider && playbackRateInput) {
            const updatePlaybackRateDisplay = () => {
                const r = parseFloat(playbackRateSlider.value);
                playbackRateInput.value = r.toFixed(2);
                if (playbackRateDisplay) {
                    playbackRateDisplay.textContent = r.toFixed(2) + 'x';
                }
            };
            playbackRateSlider.addEventListener('input', updatePlaybackRateDisplay);
            playbackRateInput.addEventListener('input', () => { playbackRateSlider.value = parseFloat(playbackRateInput.value); updatePlaybackRateDisplay(); });
        }
        
        // Sync slider and input for start offset
        const startOffsetSlider = el.querySelector(`#clipStartOffsetSlider-${clipId}`);
        const startOffsetInput = el.querySelector(`#clipStartOffsetInput-${clipId}`);
        if (startOffsetSlider && startOffsetInput) {
            startOffsetSlider.addEventListener('input', () => { startOffsetInput.value = parseFloat(startOffsetSlider.value).toFixed(2); });
            startOffsetInput.addEventListener('input', () => { 
                const val = parseFloat(startOffsetInput.value);
                startOffsetSlider.value = val;
                // Enforce: start offset cannot exceed end offset (if end offset is set)
                const endVal = parseFloat(endOffsetInput.value);
                if (!isNaN(endVal) && endVal >= 0 && val > endVal) {
                    startOffsetInput.value = endVal.toFixed(2);
                    startOffsetSlider.value = endVal;
                }
            });
        }
        
        // Sync slider and input for end offset
        const endOffsetSlider = el.querySelector(`#clipEndOffsetSlider-${clipId}`);
        const endOffsetInput = el.querySelector(`#clipEndOffsetInput-${clipId}`);
        if (endOffsetSlider && endOffsetInput) {
            const updateEndOffsetDisplay = () => {
                const r = parseFloat(endOffsetSlider.value);
                endOffsetInput.value = r < 0 ? -1 : r.toFixed(2);
            };
            endOffsetSlider.addEventListener('input', updateEndOffsetDisplay);
            endOffsetInput.addEventListener('input', () => {
                const val = parseFloat(endOffsetInput.value);
                const startVal = parseFloat(startOffsetInput.value);
                // -1 means use full audio, otherwise must be >= start offset
                if (val >= 0 && !isNaN(startVal) && val < startVal) {
                    endOffsetInput.value = startVal.toFixed(2);
                } else {
                    endOffsetSlider.value = val;
                }
            });
        }
        
        // Clip color swatches
        const colorSwatches = el.querySelectorAll(`.clip-color-swatch`);
        colorSwatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                if (localAppServices.captureStateForUndo) {
                    localAppServices.captureStateForUndo(`Change clip color on "${clip.name || clipId}"`);
                }
                const newColor = swatch.dataset.color;
                if (track.setAudioClipColor) {
                    track.setAudioClipColor(clipId, newColor);
                    clip.color = newColor;
                }
                // Update selection UI
                colorSwatches.forEach(s => {
                    s.classList.remove('border-white', 'border-2');
                    s.classList.add('border-transparent');
                });
                swatch.classList.remove('border-transparent');
                swatch.classList.add('border-white', 'border-2');
            });
        });
        
        // Draw waveform preview after window is created
        setTimeout(async () => {
            // Load audio buffer from IndexedDB for waveform display
            if (clip.sourceId) {
                try {
                    const audioBlob = await getAudio(clip.sourceId);
                    if (audioBlob) {
                        const arrayBuffer = await audioBlob.arrayBuffer();
                        const audioContext = Tone.context?.rawContext;
                        if (audioContext) {
                            const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
                            const toneBuffer = new Tone.Buffer(decodedBuffer);
                            drawClipWaveform(clipId, toneBuffer);
                            return;
                        }
                    }
                } catch (e) {
                    console.warn(`[AudioClipEditor] Failed to load waveform for clip ${clipId}:`, e);
                }
            }
            // Fallback: show "No audio loaded" if we couldn't load the buffer
            drawClipWaveform(clipId, null);
        }, 100);
        
        // Normalize button
        const normalizeBtn = el.querySelector(`#normalizeClipBtn-${clipId}`);
        if (normalizeBtn) {
            normalizeBtn.addEventListener('click', async () => {
                if (track.normalizeAudioClip) {
                    const success = await track.normalizeAudioClip(clipId);
                    if (success) {
                        if (localAppServices.renderTimeline) localAppServices.renderTimeline();
                    }
                }
            });
        }
        
        // Apply button
        const applyBtn = el.querySelector(`#applyClipChangesBtn-${clipId}`);
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const newFadeIn = parseFloat(fadeInInput.value) || 0;
                const newFadeOut = parseFloat(fadeOutInput.value) || 0;
                const newFadeInCurve = el.querySelector(`#clipFadeInCurve-${clipId}`)?.value || Constants.FADE_CURVE_LINEAR;
                const newFadeOutCurve = el.querySelector(`#clipFadeOutCurve-${clipId}`)?.value || Constants.FADE_CURVE_LINEAR;
                const newStartTime = parseFloat(el.querySelector(`#clipStartTime-${clipId}`).value) || 0;
                const newName = el.querySelector(`#clipNameInput-${clipId}`).value;
                const newGain = parseFloat(gainInput.value) || Constants.DEFAULT_AUDIO_CLIP_GAIN;
                const newReverse = el.querySelector(`#clipReverse-${clipId}`)?.checked || false;
                const newStartOffset = parseFloat(startOffsetInput.value) || 0;
                const newEndOffset = parseFloat(endOffsetInput.value);
                const newCrossfade = parseFloat(crossfadeInput?.value) || 0;
                
                if (track.setAudioClipFadeIn) track.setAudioClipFadeIn(clipId, newFadeIn);
                if (track.setAudioClipFadeOut) track.setAudioClipFadeOut(clipId, newFadeOut);
                if (track.setAudioClipFadeInCurve) track.setAudioClipFadeInCurve(clipId, newFadeInCurve);
                if (track.setAudioClipFadeOutCurve) track.setAudioClipFadeOutCurve(clipId, newFadeOutCurve);
                if (track.setAudioClipCrossfade) track.setAudioClipCrossfade(clipId, newCrossfade);
                if (track.setAudioClipStartTime) track.setAudioClipStartTime(clipId, newStartTime);
                if (track.setAudioClipGain) track.setAudioClipGain(clipId, newGain);
                if (track.setAudioClipName) track.setAudioClipName(clipId, newName);
                if (track.setAudioClipReverse) track.setAudioClipReverse(clipId, newReverse);
                if (track.setAudioClipPlaybackRate) track.setAudioClipPlaybackRate(clipId, parseFloat(el.querySelector(`#clipPlaybackRateInput-${clipId}`)?.value) || Constants.DEFAULT_AUDIO_CLIP_PLAYBACK_RATE);
                if (track.setAudioClipStartOffset) track.setAudioClipStartOffset(clipId, newStartOffset);
                if (track.setAudioClipEndOffset) track.setAudioClipEndOffset(clipId, isNaN(newEndOffset) ? -1 : newEndOffset);
                
                showNotification(`Clip settings applied`, 1500);
                editorWindow.close();
                if (localAppServices.renderTimeline) localAppServices.renderTimeline();
            });
        }
        
        // Delete button
        const deleteBtn = el.querySelector(`#deleteClipBtn-${clipId}`);
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (track.deleteTimelineClip) {
                    track.deleteTimelineClip(clipId);
                }
                showNotification(`Clip deleted`, 1500);
                editorWindow.close();
                if (localAppServices.renderTimeline) localAppServices.renderTimeline();
            });
        }
    }
    
    return editorWindow;
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
