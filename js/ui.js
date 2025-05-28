// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Poly/Mono Fix Attempt v6 / Duplicate Export Fix v2');

import { SnugWindow } from './SnugWindow.js';
import { showNotification, createDropZoneHTML, setupDropZoneListeners as utilSetupDropZoneListeners, showCustomModal } from './utils.js';
import * as Constants from './constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from './eventHandlers.js';
import { AVAILABLE_EFFECTS, getEffectParamDefinitions } from './effectsRegistry.js';
import { getMimeTypeFromFilename } from './audio.js';

// --- Knob UI ---
 function createKnob(options) {
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
        valueEl.textContent = typeof currentValue === 'number' ? currentValue.toFixed(options.decimals !== undefined ? options.decimals : (step < 1 && step !== 0 ? 2 : 0)) : currentValue;
        if (options.displaySuffix) valueEl.textContent += options.displaySuffix;
    }

    function setValue(newValue, triggerCallback = true, fromInteraction = false) {
        const numValue = parseFloat(newValue);
        if (isNaN(numValue)) return;
        let boundedValue = Math.min(max, Math.max(min, numValue));
        if (step !== 0) {
            boundedValue = Math.round(boundedValue / step) * step;
        }
        const oldValue = currentValue;
        currentValue = Math.min(max, Math.max(min, boundedValue));
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
            const currentY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
            const deltaY = startY - currentY;
            let valueChange = (deltaY / pixelsForFullRange) * range * currentSensitivity;
            let newValue = startValue + valueChange;
            setValue(newValue, true, true);
        }
        function onEnd() {
            document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
            document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
            if (currentValue !== initialValueBeforeInteraction && typeof window.captureStateForUndo === 'function') {
                let description = `Change ${options.label || 'knob'} to ${valueEl.textContent}`;
                if (options.trackRef && options.trackRef.name) {
                    description = `Change ${options.label || 'knob'} for ${options.trackRef.name} to ${valueEl.textContent}`;
                }
                window.captureStateForUndo(description);
            }
        }
        document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, { passive: !isTouch });
        document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
    }
    knobEl.addEventListener('mousedown', (e) => handleInteraction(e, false));
    knobEl.addEventListener('touchstart', (e) => handleInteraction(e, true), { passive: false });
    setValue(currentValue, false);
    return { element: container, setValue, getValue: () => currentValue, type: 'knob', refreshVisuals: updateKnobVisual };
}

// --- Synth Inspector Specifics ---
const synthEngineControlDefinitions = {
    MonoSynth: [ // Example for MonoSynth
        { idPrefix: 'portamento', label: 'Porta', type: 'knob', min: 0, max: 0.2, step: 0.001, defaultValue: 0.01, decimals: 3, path: 'portamento' },
        { idPrefix: 'oscType', label: 'Osc Type', type: 'select', options: ['sine', 'square', 'sawtooth', 'triangle', 'pulse', 'pwm'], defaultValue: 'sawtooth', path: 'oscillator.type' },
        { idPrefix: 'envAttack', label: 'Attack', type: 'knob', min: 0.001, max: 2, step: 0.001, defaultValue: 0.005, decimals: 3, path: 'envelope.attack' },
        { idPrefix: 'envDecay', label: 'Decay', type: 'knob', min: 0.01, max: 2, step: 0.01, defaultValue: 0.1, decimals: 2, path: 'envelope.decay' },
        { idPrefix: 'envSustain', label: 'Sustain', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.9, decimals: 2, path: 'envelope.sustain' },
        { idPrefix: 'envRelease', label: 'Release', type: 'knob', min: 0.01, max: 5, step: 0.01, defaultValue: 1, decimals: 2, path: 'envelope.release' },
        { idPrefix: 'filtType', label: 'Filt Type', type: 'select', options: ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'notch', 'allpass', 'peaking'], defaultValue: 'lowpass', path: 'filter.type' },
        { idPrefix: 'filtFreq', label: 'Filt Freq', type: 'knob', min: 20, max: 20000, step: 1, defaultValue: 1000, decimals: 0, path: 'filter.frequency.value' }, // Assuming filter.frequency is a Signal
        { idPrefix: 'filtQ', label: 'Filt Q', type: 'knob', min: 0.1, max: 20, step: 0.1, defaultValue: 1, decimals: 1, path: 'filter.Q.value' }, // Assuming filter.Q is a Signal
        { idPrefix: 'filtEnvAttack', label: 'F.Atk', type: 'knob', min:0.001, max:2, step:0.001, defaultValue:0.06, decimals:3, path:'filterEnvelope.attack'},
        { idPrefix: 'filtEnvDecay', label: 'F.Dec', type: 'knob', min:0.01, max:2, step:0.01, defaultValue:0.2, decimals:2, path:'filterEnvelope.decay'},
        { idPrefix: 'filtEnvSustain', label: 'F.Sus', type: 'knob', min:0, max:1, step:0.01, defaultValue:0.5, decimals:2, path:'filterEnvelope.sustain'},
        { idPrefix: 'filtEnvRelease', label: 'F.Rel', type: 'knob', min:0.01, max:5, step:0.01, defaultValue:2, decimals:2, path:'filterEnvelope.release'},
        { idPrefix: 'filtEnvBaseFreq', label: 'F.Base', type: 'knob', min:20, max:5000, step:1, defaultValue:200, decimals:0, path:'filterEnvelope.baseFrequency'},
        { idPrefix: 'filtEnvOctaves', label: 'F.Oct', type: 'knob', min:0, max:10, step:0.1, defaultValue:7, decimals:1, path:'filterEnvelope.octaves'},
    ]
};

function buildSynthSpecificInspectorDOM(track) {
    const engineType = track.synthEngineType || 'MonoSynth';
    const definitions = synthEngineControlDefinitions[engineType] || [];
    let controlsHTML = `<div id="synthEngineControls-${track.id}" class="grid grid-cols-2 md:grid-cols-3 gap-2 p-1">`;
    definitions.forEach(def => {
        controlsHTML += `<div id="${def.idPrefix}-${track.id}-placeholder"></div>`; // Placeholder for knob/select
    });
    controlsHTML += `</div>`;
    return controlsHTML;
}

function buildSynthEngineControls(track, container, engineType) {
    const definitions = synthEngineControlDefinitions[engineType] || [];
    definitions.forEach(def => {
        const placeholder = container.querySelector(`#${def.idPrefix}-${track.id}-placeholder`);
        if (!placeholder) {
            console.warn(`Placeholder for ${def.idPrefix} not found in synth inspector for track ${track.id}`);
            return;
        }

        let initialValue;
        const pathParts = def.path.split('.');
        let currentValObj = track.synthParams;
        for (let i = 0; i < pathParts.length; i++) {
            if (currentValObj && typeof currentValObj === 'object' && pathParts[i] in currentValObj) {
                currentValObj = currentValObj[pathParts[i]];
            } else {
                currentValObj = undefined; // Path not found in synthParams
                break;
            }
        }
        initialValue = (currentValObj !== undefined) ? currentValObj : def.defaultValue;
        
        // Special case for signal values like filter.frequency.value
        if (def.path.endsWith('.value') && track.instrument && track.instrument.get) {
            try {
                const signalPath = def.path.substring(0, def.path.lastIndexOf('.value'));
                const signalValue = track.instrument.get(signalPath)?.value;
                if (signalValue !== undefined) initialValue = signalValue;
            } catch (e) { /* ignore if path doesn't exist on instrument.get */ }
        }


        if (def.type === 'knob') {
            const knob = createKnob({
                label: def.label,
                min: def.min, max: def.max, step: def.step, initialValue: initialValue,
                decimals: def.decimals, displaySuffix: def.displaySuffix || '',
                trackRef: track,
                onValueChange: (val, oldVal, fromInteraction) => {
                    track.setSynthParam(def.path, val);
                    // No undo capture here, it's done by the knob itself on interaction end
                }
            });
            placeholder.replaceWith(knob.element);
            track.inspectorControls[def.idPrefix] = knob;
        } else if (def.type === 'select') {
            const selectEl = document.createElement('select');
            selectEl.id = `${def.idPrefix}-${track.id}`;
            selectEl.className = 'synth-param-select w-full p-1 border rounded text-xs bg-gray-50';
            def.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = typeof opt === 'object' ? opt.value : opt;
                option.textContent = typeof opt === 'object' ? opt.text : opt;
                selectEl.appendChild(option);
            });
            selectEl.value = initialValue;
            selectEl.addEventListener('change', (e) => {
                window.captureStateForUndo(`Change ${def.label} for ${track.name} to ${e.target.value}`);
                track.setSynthParam(def.path, e.target.value);
            });

            const labelEl = document.createElement('label');
            labelEl.htmlFor = selectEl.id;
            labelEl.textContent = def.label + ':';
            labelEl.className = 'text-xs block mb-0.5';
            
            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'flex flex-col items-start';
            wrapperDiv.appendChild(labelEl);
            wrapperDiv.appendChild(selectEl);
            placeholder.replaceWith(wrapperDiv);
            track.inspectorControls[def.idPrefix] = selectEl;
        }
    });
}

// --- Sampler Inspector Specifics ---
function buildSamplerSpecificInspectorDOM(track) {
    // Waveform display, slice editor, sample pads
    let html = `<div class="sampler-controls p-1 space-y-2">`;
    // Drop Zone
    html += `<div id="dropZoneContainer-${track.id}-sampler" class="mb-2"></div>`;
    // Waveform Canvas
    html += `<div class="waveform-section border rounded p-1 bg-gray-100">
                <canvas id="waveformCanvas-${track.id}" class="w-full h-24 bg-white rounded shadow-inner"></canvas>
             </div>`;
    // Slice Editor Controls
    html += `<div class="slice-editor-controls mt-2 p-1 border rounded bg-gray-50 space-y-1">
                <h4 class="text-xs font-semibold">Slice Editor (Selected: <span id="selectedSliceInfo-${track.id}">1</span>)</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1 items-center text-xs">
                    <div id="sliceVolumeSlider-${track.id}-placeholder"></div>
                    <div id="slicePitchKnob-${track.id}-placeholder"></div>
                    <button id="sliceLoopToggle-${track.id}" class="px-1.5 py-0.5 text-xs border rounded">Loop: OFF</button>
                    <button id="sliceReverseToggle-${track.id}" class="px-1.5 py-0.5 text-xs border rounded">Rev: OFF</button>
                </div>
                <div class="text-xs font-medium mt-1">Envelope:</div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                    <div id="sliceEnvAttackSlider-${track.id}-placeholder"></div>
                    <div id="sliceEnvDecaySlider-${track.id}-placeholder"></div>
                    <div id="sliceEnvSustainSlider-${track.id}-placeholder"></div>
                    <div id="sliceEnvReleaseSlider-${track.id}-placeholder"></div>
                </div>
                <button id="applySliceEditsBtn-${track.id}" class="mt-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">Apply Edits to Slice</button>
             </div>`;
    // Sample Pads Area
    html += `<div id="samplePadsContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>`;
    html += `<div><button id="slicerPolyphonyToggle-${track.id}" class="text-xs px-2 py-1 border rounded mt-1">Mode: Poly</button></div>`;
    html += `</div>`; // End sampler-controls
    return html;
}

// --- Drum Sampler Inspector Specifics ---
function buildDrumSamplerSpecificInspectorDOM(track) {
    let html = `<div class="drum-sampler-controls p-1 space-y-2">`;
    // Pad Controls Area (for selected pad)
    html += `<div class="selected-pad-controls p-1 border rounded bg-gray-50 space-y-1">
                <h4 class="text-xs font-semibold">Edit Pad: <span id="selectedDrumPadInfo-${track.id}">1</span></h4>
                <div id="drumPadDropZoneContainer-${track.id}-${track.selectedDrumPadForEdit}" class="mb-1 text-xs"></div>
                <div class="grid grid-cols-2 gap-x-2 gap-y-1 items-center text-xs">
                    <div id="drumPadVolumeKnob-${track.id}-placeholder"></div>
                    <div id="drumPadPitchKnob-${track.id}-placeholder"></div>
                </div>
                <div class="text-xs font-medium mt-1">Envelope:</div>
                 <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                    <div id="drumPadEnvAttack-${track.id}-placeholder"></div>
                    <div id="drumPadEnvDecay-${track.id}-placeholder"></div>
                    <div id="drumPadEnvSustain-${track.id}-placeholder"></div>
                    <div id="drumPadEnvRelease-${track.id}-placeholder"></div>
                </div>
             </div>`;
    // Drum Pads Grid
    html += `<div id="drumPadsGridContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>`;
    html += `</div>`; // End drum-sampler-controls
    return html;
}

// --- Instrument Sampler Inspector Specifics ---
function buildInstrumentSamplerSpecificInspectorDOM(track) {
    let html = `<div class="instrument-sampler-controls p-1 space-y-2">`;
    // Drop Zone
    html += `<div id="dropZoneContainer-${track.id}-instrumentsampler" class="mb-2"></div>`;
    // Waveform Canvas
    html += `<div class="waveform-section border rounded p-1 bg-gray-100">
               <canvas id="instrumentWaveformCanvas-${track.id}" class="w-full h-24 bg-white rounded shadow-inner"></canvas>
             </div>`;
    // Controls: Root Note, Loop, Envelope
    html += `<div class="instrument-params-controls mt-2 p-1 border rounded bg-gray-50 space-y-1 text-xs">
                <div class="grid grid-cols-2 gap-2 items-center">
                    <div>
                        <label for="instrumentRootNote-${track.id}" class="block text-xs font-medium">Root Note:</label>
                        <select id="instrumentRootNote-${track.id}" class="w-full p-1 border rounded text-xs bg-gray-50"></select>
                    </div>
                    <div>
                        <label for="instrumentLoopToggle-${track.id}" class="block text-xs font-medium">Loop:</label>
                        <button id="instrumentLoopToggle-${track.id}" class="px-2 py-1 text-xs border rounded w-full">Loop: OFF</button>
                    </div>
                    <div>
                        <label for="instrumentLoopStart-${track.id}" class="block text-xs font-medium">Loop Start (s):</label>
                        <input type="number" id="instrumentLoopStart-${track.id}" step="0.001" class="w-full p-1 border rounded text-xs">
                    </div>
                    <div>
                        <label for="instrumentLoopEnd-${track.id}" class="block text-xs font-medium">Loop End (s):</label>
                        <input type="number" id="instrumentLoopEnd-${track.id}" step="0.001" class="w-full p-1 border rounded text-xs">
                    </div>
                </div>
                 <div class="text-xs font-medium mt-1">Envelope:</div>
                 <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                    <div id="instrumentEnvAttack-${track.id}-placeholder"></div>
                    <div id="instrumentEnvDecay-${track.id}-placeholder"></div>
                    <div id="instrumentEnvSustain-${track.id}-placeholder"></div>
                    <div id="instrumentEnvRelease-${track.id}-placeholder"></div>
                </div>
                <div><button id="instrumentPolyphonyToggle-${track.id}" class="text-xs px-2 py-1 border rounded mt-1">Mode: Poly</button></div>
            </div>`;
    html += `</div>`; // End instrument-sampler-controls
    return html;
}


// --- Track Inspector Window & Controls Initialization ---
 function buildTrackInspectorContentDOM(track) {
    if (!track) return '<div>Error: Track data not found.</div>';
    let specificControlsHTML = '';
    if (track.type === 'Synth') {
        specificControlsHTML = buildSynthSpecificInspectorDOM(track);
    } else if (track.type === 'Sampler') {
        specificControlsHTML = buildSamplerSpecificInspectorDOM(track);
    } else if (track.type === 'DrumSampler') {
        specificControlsHTML = buildDrumSamplerSpecificInspectorDOM(track);
    } else if (track.type === 'InstrumentSampler') {
        specificControlsHTML = buildInstrumentSamplerSpecificInspectorDOM(track);
    }

    return `
        <div class="track-inspector-content p-1 space-y-1 text-xs text-gray-700 overflow-y-auto h-full">
            <div class="common-controls grid grid-cols-3 gap-1 mb-1">
                <button id="muteBtn-${track.id}" title="Mute Track" class="px-1 py-0.5 border rounded ${track.isMuted ? 'muted' : ''}">${track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="soloBtn-${track.id}" title="Solo Track" class="px-1 py-0.5 border rounded ${track.isSoloed ? 'soloed' : ''}">${track.isSoloed ? 'Unsolo' : 'Solo'}</button>
                <button id="armInputBtn-${track.id}" title="Arm for MIDI/Keyboard Input" class="px-1 py-0.5 border rounded ${window.getArmedTrackId && window.getArmedTrackId() === track.id ? 'armed' : ''}">Arm</button>
            </div>
            <div id="volumeKnob-${track.id}-placeholder" class="mb-1"></div>
            <div id="trackMeterContainer-${track.id}" class="h-3 w-full bg-gray-200 rounded border border-gray-300 overflow-hidden my-1">
                <div id="trackMeterBar-${track.id}" class="h-full bg-green-500 transition-all duration-50 ease-linear" style="width: 0%;"></div>
            </div>

            <div class="type-specific-controls mt-1 border-t pt-1">
                ${specificControlsHTML}
            </div>

            <div class="inspector-nav grid grid-cols-3 gap-1 mt-2">
                <button id="openEffectsBtn-${track.id}" class="px-1 py-0.5 border rounded bg-gray-200 hover:bg-gray-300">Effects</button>
                <button id="openSequencerBtn-${track.id}" class="px-1 py-0.5 border rounded bg-gray-200 hover:bg-gray-300">Sequencer</button>
                <button id="removeTrackBtn-${track.id}" class="px-1 py-0.5 border rounded bg-red-400 hover:bg-red-500 text-white">Remove</button>
            </div>
        </div>
    `;
}

 function openTrackInspectorWindow(trackId, savedState = null) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track) { console.error(`[UI] Track ${trackId} not found for inspector.`); return null; }

    const windowId = `trackInspector-${trackId}`;
    if (window.openWindows[windowId] && !savedState) { // If opening normally and window exists
        window.openWindows[windowId].restore(); // Focus/restore
        return window.openWindows[windowId];
    }
    
    const contentDOM = buildTrackInspectorContentDOM(track);
    const inspectorOptions = {
        width: 320, height: 450, minWidth: 280, minHeight: 350,
        initialContentKey: windowId, // For state restoration
        onCloseCallback: () => { if (track) track.inspectorWindow = null; }
    };

    if (savedState) {
        inspectorOptions.x = parseInt(savedState.left);
        inspectorOptions.y = parseInt(savedState.top);
        inspectorOptions.width = parseInt(savedState.width);
        inspectorOptions.height = parseInt(savedState.height);
        inspectorOptions.zIndex = savedState.zIndex;
        if (savedState.isMinimized) inspectorOptions.isMinimized = true;
    }

    const inspectorWindow = window.createWindow(windowId, `Inspector: ${track.name}`, contentDOM, inspectorOptions);

    if (inspectorWindow && inspectorWindow.element) {
        track.inspectorWindow = inspectorWindow;
        initializeCommonInspectorControls(track, inspectorWindow.element);
        initializeTypeSpecificInspectorControls(track, inspectorWindow.element);
    } else {
        console.error(`[UI] Failed to create inspector window for track ${trackId}.`);
        if (track) track.inspectorWindow = null; // Ensure it's nulled if creation failed
        return null;
    }
    return inspectorWindow;
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
        const volumeKnob = createKnob({
            label: 'Volume', min: 0, max: 1.2, step: 0.01,
            initialValue: track.previousVolumeBeforeMute, // Use the actual gain value
            decimals: 2, trackRef: track,
            onValueChange: (val, oldVal, fromInteraction) => {
                track.setVolume(val, fromInteraction); // fromInteraction will be true on mouseup/touchend
            }
        });
        volumeKnobPlaceholder.replaceWith(volumeKnob.element);
        track.inspectorControls.volume = volumeKnob;
    }
}

// initializeTypeSpecificInspectorControls is defined below and exported once at the end.
function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl);
    else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl);
    else if (track.type === 'DrumSampler') initializeDrumSamplerSpecificControls(track, winEl);
    else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl);
}

function initializeSynthSpecificControls(track, winEl) {
    const controlsContainer = winEl.querySelector(`#synthEngineControls-${track.id}`);
    if (controlsContainer) {
        buildSynthEngineControls(track, controlsContainer, track.synthEngineType || 'MonoSynth');
        // Refresh visuals after a short delay to ensure DOM is fully ready
        setTimeout(() => {
            const definitions = synthEngineControlDefinitions[track.synthEngineType || 'MonoSynth'] || [];
            definitions.forEach(def => {
                if (def.type === 'knob' && track.inspectorControls?.[def.idPrefix]) {
                    track.inspectorControls[def.idPrefix].refreshVisuals();
                }
            });
        }, 50);
    }
}

function initializeSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-sampler`);
    if (dzContainerEl) {
        const existingAudioData = {
            originalFileName: track.samplerAudioData.fileName,
            status: track.samplerAudioData.status || (track.samplerAudioData.fileName ? 'missing' : 'empty')
        };
        dzContainerEl.innerHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler', null, existingAudioData);
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        const fileInputEl = dzContainerEl.querySelector(`#fileInput-${track.id}`);
        if (dzEl) utilSetupDropZoneListeners(dzEl, track.id, 'Sampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile);
        if (fileInputEl) fileInputEl.onchange = (e) => { window.loadSampleFile(e, track.id, 'Sampler'); };
    }

    if (typeof renderSamplePads === 'function') renderSamplePads(track);
    winEl.querySelector(`#applySliceEditsBtn-${track.id}`)?.addEventListener('click', () => {
        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Apply Slice Edits for ${track.name}`);
        applySliceEdits(track.id);
    });
    const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`);
    if (canvas) {
        track.waveformCanvasCtx = canvas.getContext('2d');
        if(typeof window.drawWaveform === 'function' && track.audioBuffer && track.audioBuffer.loaded) window.drawWaveform(track);
    }
    if (typeof updateSliceEditorUI === 'function') updateSliceEditorUI(track);

    const createAndPlaceKnob = (id, options) => {
        const knob = createKnob(options);
        const placeholder = winEl.querySelector(`#${id}-placeholder`);
        if (placeholder) placeholder.replaceWith(knob.element);
        else console.warn(`Placeholder ${id}-placeholder not found for Sampler slice knob`);
        return knob;
    };

    const selectedSlice = track.slices[track.selectedSliceForEdit] || track.slices[0] || { volume: 0.7, pitchShift: 0, envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 } };

    track.inspectorControls.sliceVolume = createAndPlaceKnob(`sliceVolumeSlider-${track.id}`, { label: 'Vol', min:0, max:1, step:0.01, initialValue: selectedSlice.volume, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceVolume(track.selectedSliceForEdit, val)});
    track.inspectorControls.slicePitch = createAndPlaceKnob(`slicePitchKnob-${track.id}`, { label: 'Pitch', min:-24, max:24, step:1, initialValue: selectedSlice.pitchShift, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setSlicePitchShift(track.selectedSliceForEdit, val)});
    track.inspectorControls.sliceEnvAttack = createAndPlaceKnob(`sliceEnvAttackSlider-${track.id}`, { label: 'Attack', min:0.001, max:1, step:0.001, initialValue: selectedSlice.envelope.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'attack', val)});
    track.inspectorControls.sliceEnvDecay = createAndPlaceKnob(`sliceEnvDecaySlider-${track.id}`, { label: 'Decay', min:0.01, max:1, step:0.01, initialValue: selectedSlice.envelope.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'decay', val)});
    track.inspectorControls.sliceEnvSustain = createAndPlaceKnob(`sliceEnvSustainSlider-${track.id}`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: selectedSlice.envelope.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'sustain', val)});
    track.inspectorControls.sliceEnvRelease = createAndPlaceKnob(`sliceEnvReleaseSlider-${track.id}`, { label: 'Release', min:0.01, max:2, step:0.01, initialValue: selectedSlice.envelope.release, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'release', val)});

    const loopToggleBtn = winEl.querySelector(`#sliceLoopToggle-${track.id}`);
    if (loopToggleBtn) {
        loopToggleBtn.textContent = selectedSlice.loop ? 'Loop: ON' : 'Loop: OFF';
        loopToggleBtn.classList.toggle('active', selectedSlice.loop);
        loopToggleBtn.addEventListener('click', (e) => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Loop for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
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
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Reverse for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
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
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Slicer Polyphony for ${track.name} to ${!track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`);
            track.slicerIsPolyphonic = !track.slicerIsPolyphonic;
            polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
            polyToggleBtn.classList.toggle('active', track.slicerIsPolyphonic);
            if (!track.slicerIsPolyphonic) {
                track.setupSlicerMonoNodes(); // This also handles player buffer if audioBuffer is loaded
            } else {
                track.disposeSlicerMonoNodes();
            }
            if (track && typeof track.rebuildEffectChain === 'function') {
                console.log(`[UI - SlicerPolyToggle] Rebuilding effect chain for track ${track.id} after polyphony change.`);
                track.rebuildEffectChain(); // Ensure effects chain is rebuilt correctly
            }
            showNotification(`${track.name} slicer mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`, 2000);
        });
    }
}

function initializeDrumSamplerSpecificControls(track, winEl) {
    if (typeof renderDrumSamplerPads === 'function') renderDrumSamplerPads(track); // Renders the grid of pads
    if (typeof updateDrumPadControlsUI === 'function') updateDrumPadControlsUI(track); // Renders controls for the currently selected pad
}

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler`);
    if (dzContainerEl) {
        const existingAudioData = {
            originalFileName: track.instrumentSamplerSettings.originalFileName,
            status: track.instrumentSamplerSettings.status || (track.instrumentSamplerSettings.originalFileName ? 'missing' : 'empty')
        };
        dzContainerEl.innerHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler', null, existingAudioData);
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        const fileInputEl = dzContainerEl.querySelector(`#instrumentFileInput-${track.id}`);
        if (dzEl) utilSetupDropZoneListeners(dzEl, track.id, 'InstrumentSampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile);
        if (fileInputEl) fileInputEl.onchange = (e) => { window.loadSampleFile(e, track.id, 'InstrumentSampler'); };
    }

    const canvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if (canvas) {
        track.instrumentWaveformCanvasCtx = canvas.getContext('2d');
        if(typeof window.drawInstrumentWaveform === 'function' && track.instrumentSamplerSettings.audioBuffer && track.instrumentSamplerSettings.audioBuffer.loaded) window.drawInstrumentWaveform(track);
    }

    const rootNoteSelect = winEl.querySelector(`#instrumentRootNote-${track.id}`);
    if (rootNoteSelect) {
        Constants.synthPitches.slice().reverse().forEach(pitch => { // Use a wider range, or a specific common range
            const option = document.createElement('option');
            option.value = pitch;
            option.textContent = pitch;
            rootNoteSelect.appendChild(option);
        });
        rootNoteSelect.value = track.instrumentSamplerSettings.rootNote || 'C4';
        rootNoteSelect.addEventListener('change', (e) => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Root Note for ${track.name} to ${e.target.value}`);
            track.setInstrumentSamplerRootNote(e.target.value);
        });
    }

    const loopToggleBtn = winEl.querySelector(`#instrumentLoopToggle-${track.id}`);
    if (loopToggleBtn) {
        loopToggleBtn.textContent = track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF';
        loopToggleBtn.classList.toggle('active', track.instrumentSamplerSettings.loop);
        loopToggleBtn.addEventListener('click', (e) => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Loop for ${track.name}`);
            track.setInstrumentSamplerLoop(!track.instrumentSamplerSettings.loop);
            e.target.textContent = track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF';
            e.target.classList.toggle('active', track.instrumentSamplerSettings.loop);
        });
    }

    const loopStartInput = winEl.querySelector(`#instrumentLoopStart-${track.id}`);
    if (loopStartInput) {
        loopStartInput.value = track.instrumentSamplerSettings.loopStart?.toFixed(3) || '0.000';
        loopStartInput.addEventListener('change', (e) => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Loop Start for ${track.name}`);
            track.setInstrumentSamplerLoopStart(parseFloat(e.target.value));
        });
    }
    const loopEndInput = winEl.querySelector(`#instrumentLoopEnd-${track.id}`);
    if (loopEndInput) {
        loopEndInput.value = track.instrumentSamplerSettings.loopEnd?.toFixed(3) || (track.instrumentSamplerSettings.audioBuffer?.duration.toFixed(3) || '0.000');
        loopEndInput.addEventListener('change', (e) => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Loop End for ${track.name}`);
            track.setInstrumentSamplerLoopEnd(parseFloat(e.target.value));
        });
    }

    const createAndPlaceKnob = (id, options) => {
        const knob = createKnob(options);
        const placeholder = winEl.querySelector(`#${id}-placeholder`);
        if (placeholder) placeholder.replaceWith(knob.element);
        else console.warn(`Placeholder ${id}-placeholder not found for InstrumentSampler knob`);
        return knob;
    };
    const env = track.instrumentSamplerSettings.envelope || { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 };
    track.inspectorControls.instrEnvAttack = createAndPlaceKnob(`instrumentEnvAttack-${track.id}`, { label: 'Attack', min:0.001, max:2, step:0.001, initialValue: env.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('attack', val)});
    track.inspectorControls.instrEnvDecay = createAndPlaceKnob(`instrumentEnvDecay-${track.id}`, { label: 'Decay', min:0.01, max:2, step:0.01, initialValue: env.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('decay', val)});
    track.inspectorControls.instrEnvSustain = createAndPlaceKnob(`instrumentEnvSustain-${track.id}`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: env.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('sustain', val)});
    track.inspectorControls.instrEnvRelease = createAndPlaceKnob(`instrumentEnvRelease-${track.id}`, { label: 'Release', min:0.01, max:5, step:0.01, initialValue: env.release, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('release', val)});

    const polyToggleBtnInst = winEl.querySelector(`#instrumentPolyphonyToggle-${track.id}`);
    if (polyToggleBtnInst) {
        polyToggleBtnInst.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
        polyToggleBtnInst.classList.toggle('active', track.instrumentSamplerIsPolyphonic);
        polyToggleBtnInst.addEventListener('click', () => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Instrument Sampler Polyphony for ${track.name} to ${!track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`);
            track.instrumentSamplerIsPolyphonic = !track.instrumentSamplerIsPolyphonic;
            polyToggleBtnInst.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
            polyToggleBtnInst.classList.toggle('active', track.instrumentSamplerIsPolyphonic);
            // Re-setup sampler or adjust behavior if needed (e.g., releaseAll on note for mono)
            if (track.toneSampler) { // If sampler exists, might need to reconfigure or just note the mode change
                console.log(`[UI] Instrument Sampler for ${track.name} polyphony set to: ${track.instrumentSamplerIsPolyphonic}`);
            }
            showNotification(`${track.name} instrument sampler mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`, 2000);
        });
    }
}


// --- MODULAR EFFECTS RACK UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    const ownerId = (ownerType === 'track' && owner) ? owner.id : 'master';
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';

    let html = `<div id="effectsRackContent-${ownerId}" class="p-2 space-y-2 overflow-y-auto h-full">
        <h3 class="text-sm font-semibold">Effects Rack: ${ownerName}</h3>
        <div id="effectsList-${ownerId}" class="space-y-1 min-h-[50px] border rounded p-1 bg-gray-100">
            </div>
        <button id="addEffectBtn-${ownerId}" class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Add Effect</button>
        <div id="effectControlsContainer-${ownerId}" class="mt-2 space-y-2">
            </div>
    </div>`;
    return html;
}

 function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    if (!listDiv) return;
    listDiv.innerHTML = ''; // Clear previous list
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : window.masterEffectsChain;

    if (!effectsArray || effectsArray.length === 0) {
        listDiv.innerHTML = '<p class="text-xs text-gray-500 italic">No effects added.</p>';
        if (controlsContainer) controlsContainer.innerHTML = ''; // Clear controls if no effects
        return;
    }

    effectsArray.forEach((effect, index) => {
        const effectDef = AVAILABLE_EFFECTS[effect.type];
        const displayName = effectDef ? effectDef.displayName : effect.type;

        const item = document.createElement('div');
        item.className = 'effect-item flex justify-between items-center p-1 border-b bg-white rounded-sm shadow-xs text-xs';
        item.innerHTML = `
            <span class="effect-name flex-grow cursor-pointer hover:text-blue-600" title="Edit ${displayName}">${displayName}</span>
            <div class="effect-actions">
                <button class="up-btn text-xs px-0.5 ${index === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-green-600'}" ${index === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                <button class="down-btn text-xs px-0.5 ${index === effectsArray.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:text-green-600'}" ${index === effectsArray.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                <button class="remove-btn text-xs px-1 text-red-500 hover:text-red-700" title="Remove Effect">✕</button>
            </div>
        `;
        item.querySelector('.effect-name').addEventListener('click', () => {
            renderEffectControls(owner, ownerType, effect.id, controlsContainer);
            // Highlight selected effect
            listDiv.querySelectorAll('.effect-item').forEach(el => el.classList.remove('bg-blue-100', 'border-blue-300'));
            item.classList.add('bg-blue-100', 'border-blue-300');
        });
        item.querySelector('.up-btn').addEventListener('click', () => {
            if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Reorder effect on ${ownerType === 'track' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.reorderEffect(effect.id, index - 1);
            else if (typeof window.reorderMasterEffect === 'function') window.reorderMasterEffect(effect.id, index - 1);
            renderEffectsList(owner, ownerType, listDiv, controlsContainer); // Re-render
        });
        item.querySelector('.down-btn').addEventListener('click', () => {
            if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Reorder effect on ${ownerType === 'track' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.reorderEffect(effect.id, index + 1);
            else if (typeof window.reorderMasterEffect === 'function') window.reorderMasterEffect(effect.id, index + 1);
            renderEffectsList(owner, ownerType, listDiv, controlsContainer); // Re-render
        });
        item.querySelector('.remove-btn').addEventListener('click', () => {
            if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Remove ${effect.type} from ${ownerType === 'track' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.removeEffect(effect.id);
            else if (typeof window.removeMasterEffect === 'function') window.removeMasterEffect(effect.id);
            renderEffectsList(owner, ownerType, listDiv, controlsContainer); // Re-render
            if (controlsContainer) controlsContainer.innerHTML = ''; // Clear controls
        });
        listDiv.appendChild(item);
    });
}

function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    if (!controlsContainer) return;
    controlsContainer.innerHTML = ''; // Clear previous controls

    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : window.masterEffectsChain;
    const effectWrapper = effectsArray.find(e => e.id === effectId);

    if (!effectWrapper) {
        controlsContainer.innerHTML = '<p class="text-xs text-gray-500 italic">Select an effect to see its controls.</p>';
        return;
    }

    const effectDef = AVAILABLE_EFFECTS[effectWrapper.type];
    if (!effectDef) {
        controlsContainer.innerHTML = `<p class="text-xs text-red-500">Error: Definition for effect type "${effectWrapper.type}" not found.</p>`;
        return;
    }

    const titleEl = document.createElement('h4');
    titleEl.className = 'text-xs font-semibold mb-1';
    titleEl.textContent = `Controls: ${effectDef.displayName}`;
    controlsContainer.appendChild(titleEl);

    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 border rounded bg-gray-50 text-xs';

    if (!effectDef.params || effectDef.params.length === 0) {
        gridContainer.innerHTML = '<p class="text-xs text-gray-500 italic col-span-full">No adjustable parameters for this effect.</p>';
    } else {
        effectDef.params.forEach(paramDef => {
            const controlWrapper = document.createElement('div');
            // controlWrapper.className = 'mb-1'; // Spacing for each control

            let currentValue;
            // Get current value from effectWrapper.params, drilling down if path is nested
            const pathKeys = paramDef.key.split('.');
            let tempVal = effectWrapper.params;
            for (const key of pathKeys) {
                if (tempVal && typeof tempVal === 'object' && key in tempVal) {
                    tempVal = tempVal[key];
                } else {
                    tempVal = undefined; // Path not found
                    break;
                }
            }
            currentValue = (tempVal !== undefined) ? tempVal : paramDef.defaultValue;


            if (paramDef.type === 'knob') {
                const knob = createKnob({
                    label: paramDef.label,
                    min: paramDef.min, max: paramDef.max, step: paramDef.step,
                    initialValue: currentValue,
                    decimals: paramDef.decimals, displaySuffix: paramDef.displaySuffix || '',
                    trackRef: (ownerType === 'track' ? owner : null), // Pass track ref if applicable
                    onValueChange: (val, oldVal, fromInteraction) => {
                        if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, val);
                        else if (typeof window.updateMasterEffectParam === 'function') window.updateMasterEffectParam(effectId, paramDef.key, val);
                        // Undo capture is handled by the knob itself on interaction end
                    }
                });
                controlWrapper.appendChild(knob.element);
            } else if (paramDef.type === 'select') {
                const label = document.createElement('label');
                label.className = 'block text-xs font-medium mb-0.5';
                label.textContent = paramDef.label + ':';
                const select = document.createElement('select');
                select.className = 'w-full p-1 border rounded text-xs bg-white';
                paramDef.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = typeof opt === 'object' ? opt.value : opt;
                    option.textContent = typeof opt === 'object' ? opt.text : opt;
                    select.appendChild(option);
                });
                select.value = currentValue;
                select.addEventListener('change', (e) => {
                    const newValue = e.target.value;
                    // Convert to number if original default was a number (e.g. Filter rolloff)
                    const finalValue = (typeof paramDef.defaultValue === 'number' && !isNaN(parseFloat(newValue))) ? parseFloat(newValue) : newValue;

                    if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Change ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' ? owner.name : 'Master'}`);
                    if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, finalValue);
                    else if (typeof window.updateMasterEffectParam === 'function') window.updateMasterEffectParam(effectId, paramDef.key, finalValue);
                });
                controlWrapper.appendChild(label);
                controlWrapper.appendChild(select);
            } else if (paramDef.type === 'toggle') {
                // Basic toggle button for boolean params
                const button = document.createElement('button');
                button.className = `w-full p-1 border rounded text-xs ${currentValue ? 'bg-blue-500 text-white' : 'bg-gray-200'}`;
                button.textContent = `${paramDef.label}: ${currentValue ? 'ON' : 'OFF'}`;
                button.addEventListener('click', () => {
                    const newValue = !currentValue;
                    if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' ? owner.name : 'Master'}`);
                    if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, newValue);
                    else if (typeof window.updateMasterEffectParam === 'function') window.updateMasterEffectParam(effectId, paramDef.key, newValue);
                    // Re-render controls to update button state (or update button directly)
                    renderEffectControls(owner, ownerType, effectId, controlsContainer);
                });
                controlWrapper.appendChild(button);
            }
            gridContainer.appendChild(controlWrapper);
        });
    }
    controlsContainer.appendChild(gridContainer);
}

function showAddEffectModal(owner, ownerType) {
    const ownerId = (ownerType === 'track' && owner) ? owner.id : 'master';
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';

    let modalContentHTML = `<div class="max-h-60 overflow-y-auto"><ul class="list-none p-0 m-0">`;
    for (const effectKey in AVAILABLE_EFFECTS) {
        modalContentHTML += `<li class="p-1.5 hover:bg-blue-100 cursor-pointer border-b text-sm" data-effect-type="${effectKey}">${AVAILABLE_EFFECTS[effectKey].displayName}</li>`;
    }
    modalContentHTML += `</ul></div>`;

    const modal = showCustomModal(`Add Effect to ${ownerName}`, modalContentHTML, [], 'add-effect-modal');

    if (modal && modal.contentDiv) {
        modal.contentDiv.querySelectorAll('li[data-effect-type]').forEach(item => {
            item.addEventListener('click', () => {
                const effectType = item.dataset.effectType;
                if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Add ${effectType} to ${ownerType === 'track' ? owner.name : 'Master'}`);

                if (ownerType === 'track' && owner) {
                    owner.addEffect(effectType);
                    const rackWindow = window.openWindows[`effectsRack-${owner.id}`];
                    if (rackWindow && rackWindow.element) {
                        const listDiv = rackWindow.element.querySelector(`#effectsList-${owner.id}`);
                        const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-${owner.id}`);
                        renderEffectsList(owner, ownerType, listDiv, controlsContainer);
                    }
                } else if (ownerType === 'master' && typeof window.addMasterEffect === 'function') {
                    window.addMasterEffect(effectType); // This should handle adding to window.masterEffectsChain and rebuilding
                     const masterRackWindow = window.openWindows['masterEffectsRack'];
                     if (masterRackWindow && masterRackWindow.element) {
                        const listDiv = masterRackWindow.element.querySelector(`#effectsList-master`);
                        const controlsContainer = masterRackWindow.element.querySelector(`#effectControlsContainer-master`);
                        renderEffectsList(null, 'master', listDiv, controlsContainer); // Pass null for owner when master
                     }
                }
                modal.overlay.remove(); // Close modal
            });
        });
    }
}


// --- Window Opening Functions ---
 function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track) { console.error(`[UI] Track ${trackId} not found for effects rack.`); return null; }

    const windowId = `effectsRack-${trackId}`;
    if (window.openWindows[windowId] && !savedState) {
        window.openWindows[windowId].restore();
        return window.openWindows[windowId];
    }

    const contentDOM = buildModularEffectsRackDOM(track, 'track');
    const rackOptions = {
        width: 350, height: 400, minWidth: 300, minHeight: 250,
        initialContentKey: windowId,
        onCloseCallback: () => { if (track) track.effectsRackWindow = null; }
    };
    if (savedState) { /* Apply saved state to options */ }

    const rackWindow = window.createWindow(windowId, `Effects: ${track.name}`, contentDOM, rackOptions);
    if (rackWindow && rackWindow.element) {
        track.effectsRackWindow = rackWindow;
        const listDiv = rackWindow.element.querySelector(`#effectsList-${track.id}`);
        const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-${track.id}`);
        const addBtn = rackWindow.element.querySelector(`#addEffectBtn-${track.id}`);

        renderEffectsList(track, 'track', listDiv, controlsContainer);
        if (addBtn) addBtn.addEventListener('click', () => showAddEffectModal(track, 'track'));
    } else {
        if (track) track.effectsRackWindow = null;
        return null;
    }
    return rackWindow;
}

 function openMasterEffectsRackWindow(savedState = null) {
    const windowId = 'masterEffectsRack';
    console.log(`[UI] Attempting to open Master Effects Rack. SavedState:`, savedState);
    if (window.openWindows[windowId] && !savedState) {
        window.openWindows[windowId].restore();
        return window.openWindows[windowId];
    }

    const contentDOM = buildModularEffectsRackDOM(null, 'master'); // Pass null for owner
    const rackOptions = {
        width: 350, height: 400, minWidth: 300, minHeight: 250,
        initialContentKey: windowId,
        onCloseCallback: () => { /* any specific master rack close logic */ }
    };
    if (savedState) { /* Apply saved state */ }

    const rackWindow = window.createWindow(windowId, 'Master Effects Rack', contentDOM, rackOptions);
    if (rackWindow && rackWindow.element) {
        const listDiv = rackWindow.element.querySelector(`#effectsList-master`);
        const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-master`);
        const addBtn = rackWindow.element.querySelector(`#addEffectBtn-master`);

        renderEffectsList(null, 'master', listDiv, controlsContainer);
        if (addBtn) addBtn.addEventListener('click', () => showAddEffectModal(null, 'master'));
    } else {
        return null;
    }
    return rackWindow;
}

 function openGlobalControlsWindow(savedState = null) {
    const windowId = 'globalControls';
    console.log(`[UI] Attempting to open/focus Global Controls Window. SavedState:`, savedState);

    // 1. Check if window already exists
    if (window.openWindows[windowId]) {
        const existingWindow = window.openWindows[windowId];
        if (!existingWindow.isMinimized) {
            console.log(`[UI] Global Controls window '${windowId}' already open and not minimized. Focusing.`);
            existingWindow.focus();
        } else {
            console.log(`[UI] Global Controls window '${windowId}' already open but minimized. Restoring.`);
            existingWindow.restore(); // This also focuses
        }
        return existingWindow; // Return existing instance
    }

    console.log(`[UI] Global Controls window '${windowId}' not found or was closed. Creating new instance.`);

    // 2. Define content HTML for the Global Controls window
    // Ensure all element IDs match what's expected by eventHandlers.js and main.js
    const contentHTML = `
        <div id="global-controls-content" class="p-2.5 space-y-3 text-sm text-gray-700">
            <div class="grid grid-cols-2 gap-2 items-center">
                <button id="playBtnGlobal" title="Play/Pause (Spacebar)" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-1.5 px-3 rounded shadow transition-colors duration-150">Play</button>
                <button id="recordBtnGlobal" title="Record Arm/Disarm" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 px-3 rounded shadow transition-colors duration-150">Record</button>
            </div>
            <div>
                <label for="tempoGlobalInput" class="block text-xs font-medium text-gray-600 mb-0.5">Tempo (BPM):</label>
                <input type="number" id="tempoGlobalInput" value="120" min="30" max="300" step="0.1" class="w-full p-1.5 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
            </div>
            <div>
                <label for="midiInputSelectGlobal" class="block text-xs font-medium text-gray-600 mb-0.5">MIDI Input:</label>
                <select id="midiInputSelectGlobal" class="w-full p-1.5 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                    <option value="">No MIDI Input</option>
                </select>
            </div>
            <div class="pt-1">
                <label class="block text-xs font-medium text-gray-600 mb-0.5">Master Level:</label>
                <div class="h-5 w-full bg-gray-200 rounded border border-gray-300 overflow-hidden shadow-sm">
                     <div id="masterMeterBarGlobal" class="h-full bg-blue-500 transition-all duration-50 ease-linear" style="width: 0%;"></div>
                </div>
            </div>
            <div class="flex justify-between items-center text-xs mt-1.5">
                <span id="midiIndicatorGlobal" title="MIDI Activity" class="px-2 py-1 rounded-full bg-gray-300 text-gray-600 font-medium transition-colors duration-150">MIDI</span>
                <span id="keyboardIndicatorGlobal" title="Computer Keyboard Activity" class="px-2 py-1 rounded-full bg-gray-300 text-gray-600 font-medium transition-colors duration-150">KBD</span>
            </div>
        </div>
    `;

    // 3. Define options for the SnugWindow
    const options = {
        width: 280,
        height: 290, // Adjusted for more padding/content
        minWidth: 250,
        minHeight: 270,
        closable: true, // Or false if it should always be accessible via taskbar
        minimizable: true,
        resizable: true,
        initialContentKey: windowId // Important for project save/load state restoration
    };

    if (savedState && savedState.id === windowId) {
        console.log(`[UI] Applying saved state to Global Controls window:`, savedState);
        options.x = parseInt(savedState.left, 10);
        options.y = parseInt(savedState.top, 10);
        options.width = parseInt(savedState.width, 10);
        options.height = parseInt(savedState.height, 10);
        options.zIndex = savedState.zIndex; // Let SnugWindow handle default if undefined
        if (savedState.isMinimized) {
            options.isMinimized = true;
        }
    } else {
      // Default position if no saved state (or mismatch) - SnugWindow will cascade
      console.log(`[UI] No valid saved state for Global Controls window, using defaults.`);
    }

    // 4. Create the SnugWindow instance using the global createWindow wrapper
    // window.createWindow is defined in main.js and wraps `new SnugWindow(...)`
    const newWindow = window.createWindow(windowId, 'Global Controls', contentHTML, options);

    // 5. Populate global DOM element references IF window creation was successful
    if (newWindow && newWindow.element) {
        console.log('[UI] Global Controls SnugWindow created successfully. Populating global element references for it.');

        // These global variables are used by eventHandlers.js and other parts of main.js
        window.playBtn = newWindow.element.querySelector('#playBtnGlobal');
        window.recordBtn = newWindow.element.querySelector('#recordBtnGlobal');
        window.tempoInput = newWindow.element.querySelector('#tempoGlobalInput');
        window.masterMeterBar = newWindow.element.querySelector('#masterMeterBarGlobal');
        window.midiInputSelectGlobal = newWindow.element.querySelector('#midiInputSelectGlobal');
        window.midiIndicatorGlobalEl = newWindow.element.querySelector('#midiIndicatorGlobal');
        window.keyboardIndicatorGlobalEl = newWindow.element.querySelector('#keyboardIndicatorGlobal');

        if (!window.playBtn || !window.recordBtn || !window.tempoInput || !window.masterMeterBar || !window.midiInputSelectGlobal || !window.midiIndicatorGlobalEl || !window.keyboardIndicatorGlobalEl) {
            console.error('[UI] CRITICAL: One or more essential controls NOT FOUND in Global Controls window HTML after creation. Check IDs in contentHTML.');
        }
        
        // The actual event listeners will be attached by main.js calling eventHandlers.attachGlobalControlEvents
        // after this function returns and globalControlsWindowInstance.element is validated in main.js.

        console.log(`[UI] Returning new Global Controls SnugWindow instance:`, newWindow);
        return newWindow; // Return the SnugWindow instance
    } else {
        console.error('[UI] CRITICAL: window.createWindow failed to return a valid instance or element for Global Controls.');
        return null; // Explicitly return null if SnugWindow creation failed
    }
}


 function openSoundBrowserWindow(savedState = null) {
    const windowId = 'soundBrowser';
    if (window.openWindows[windowId] && !savedState) {
        window.openWindows[windowId].restore();
        return window.openWindows[windowId];
    }

    let contentHTML = `
        <div id="soundBrowserContent" class="p-2 space-y-2 text-xs overflow-y-auto h-full">
            <div class="flex space-x-1 mb-1">
                <select id="librarySelect" class="flex-grow p-1 border rounded text-xs bg-gray-50">
                    <option value="">Select Library...</option>
                </select>
                <button id="upDirectoryBtn" class="px-2 py-1 border rounded bg-gray-200 hover:bg-gray-300" title="Up Directory">↑</button>
            </div>
            <div id="currentPathDisplay" class="text-xs text-gray-600 truncate mb-1">/</div>
            <div id="soundBrowserList" class="min-h-[100px] border rounded p-1 bg-gray-100 overflow-y-auto">
                <p class="text-gray-500 italic">Select a library to browse sounds.</p>
            </div>
            <div id="soundPreviewControls" class="mt-1 text-center">
                <button id="previewSoundBtn" class="px-2 py-1 text-xs border rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50" disabled>Preview</button>
            </div>
        </div>`;

    const browserOptions = { width: 380, height: 450, minWidth: 300, minHeight: 300, initialContentKey: windowId };
    if (savedState) { /* Apply saved state */ }

    const browserWindow = window.createWindow(windowId, 'Sound Browser', contentHTML, browserOptions);

    if (browserWindow && browserWindow.element) {
        const librarySelect = browserWindow.element.querySelector('#librarySelect');
        const upDirectoryBtn = browserWindow.element.querySelector('#upDirectoryBtn');
        const previewSoundBtn = browserWindow.element.querySelector('#previewSoundBtn');

        // Populate library select
        if (Constants.soundLibraries) {
            for (const libName in Constants.soundLibraries) {
                const option = document.createElement('option');
                option.value = libName;
                option.textContent = libName;
                librarySelect.appendChild(option);
            }
        }
        librarySelect.addEventListener('change', (e) => {
            const libName = e.target.value;
            if (libName && typeof window.fetchSoundLibrary === 'function') {
                window.fetchSoundLibrary(libName, Constants.soundLibraries[libName]); // This will also update display
            } else if (!libName) {
                if (typeof window.updateSoundBrowserDisplayForLibrary === 'function') window.updateSoundBrowserDisplayForLibrary(null); // Clear display
            }
        });

        upDirectoryBtn.addEventListener('click', () => {
            if (window.currentSoundBrowserPath && window.currentSoundBrowserPath.length > 0) {
                window.currentSoundBrowserPath.pop();
                if (typeof window.renderSoundBrowserDirectory === 'function') window.renderSoundBrowserDirectory(window.currentSoundBrowserPath, window.currentSoundFileTree);
            }
        });

        previewSoundBtn.addEventListener('click', () => {
            if (window.selectedSoundForPreview && typeof window.Tone !== 'undefined') {
                if (window.previewPlayer && !window.previewPlayer.disposed) {
                    window.previewPlayer.stop();
                    window.previewPlayer.dispose();
                }
                const { fullPath, libraryName } = window.selectedSoundForPreview;
                if (window.loadedZipFiles && window.loadedZipFiles[libraryName] && window.loadedZipFiles[libraryName] !== "loading") {
                    const zipEntry = window.loadedZipFiles[libraryName].file(fullPath);
                    if (zipEntry) {
                        zipEntry.async("blob").then(blob => {
                            const tempUrl = URL.createObjectURL(blob);
                            window.previewPlayer = new Tone.Player(tempUrl, () => {
                                window.previewPlayer.start();
                                URL.revokeObjectURL(tempUrl); // Revoke after loading
                            }).toDestination();
                        }).catch(err => showNotification("Error loading preview: " + err.message, 2000));
                    }
                }
            }
        });
        // Initial display update if a library is pre-selected or auto-loaded
        if (window.currentLibraryName && typeof window.updateSoundBrowserDisplayForLibrary === 'function') {
            window.updateSoundBrowserDisplayForLibrary(window.currentLibraryName);
        }
    } else { return null; }
    return browserWindow;
}

 function updateSoundBrowserDisplayForLibrary(libraryName) {
    const browserWindowEl = window.openWindows['soundBrowser']?.element;
    if (!browserWindowEl) return;

    const listDiv = browserWindowEl.querySelector('#soundBrowserList');
    const librarySelect = browserWindowEl.querySelector('#librarySelect');
    const currentPathDisplay = browserWindowEl.querySelector('#currentPathDisplay');

    window.currentLibraryName = libraryName;
    window.currentSoundBrowserPath = []; // Reset path

    if (librarySelect && librarySelect.value !== libraryName) { // Sync dropdown if changed externally
        librarySelect.value = libraryName || "";
    }

    if (!libraryName) {
        listDiv.innerHTML = '<p class="text-gray-500 italic">Select a library to browse sounds.</p>';
        currentPathDisplay.textContent = '/';
        window.currentSoundFileTree = null;
        return;
    }

    if (window.loadedZipFiles && window.loadedZipFiles[libraryName] === "loading") {
        listDiv.innerHTML = '<p class="text-gray-500 italic">Loading library...</p>';
        currentPathDisplay.textContent = `/${libraryName}/`;
        window.currentSoundFileTree = null;
    } else if (window.soundLibraryFileTrees && window.soundLibraryFileTrees[libraryName]) {
        window.currentSoundFileTree = window.soundLibraryFileTrees[libraryName];
        if (typeof renderSoundBrowserDirectory === 'function') renderSoundBrowserDirectory([], window.currentSoundFileTree); // Start at root
    } else {
        listDiv.innerHTML = `<p class="text-red-500">Error: Library "${libraryName}" not found or failed to load.</p>`;
        currentPathDisplay.textContent = '/';
        window.currentSoundFileTree = null;
    }
}

 function renderSoundBrowserDirectory(pathArray, treeNode) {
    const browserWindowEl = window.openWindows['soundBrowser']?.element;
    if (!browserWindowEl || !treeNode) return;

    const listDiv = browserWindowEl.querySelector('#soundBrowserList');
    const currentPathDisplay = browserWindowEl.querySelector('#currentPathDisplay');
    const previewSoundBtn = browserWindowEl.querySelector('#previewSoundBtn');

    listDiv.innerHTML = ''; // Clear previous
    currentPathDisplay.textContent = `/${window.currentLibraryName || ''}${pathArray.length > 0 ? '/' : ''}${pathArray.join('/')}`;
    window.selectedSoundForPreview = null;
    if(previewSoundBtn) previewSoundBtn.disabled = true;


    const items = [];
    for (const name in treeNode) {
        items.push({ name, type: treeNode[name].type });
    }
    // Sort folders first, then files, then alphabetically
    items.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
    });


    if (items.length === 0) {
        listDiv.innerHTML = '<p class="text-gray-500 italic">Empty folder.</p>';
        return;
    }

    items.forEach(itemObj => {
        const name = itemObj.name;
        const node = treeNode[name];
        const listItem = document.createElement('div');
        listItem.className = 'p-1 hover:bg-blue-100 cursor-pointer border-b text-xs flex items-center';
        listItem.draggable = node.type === 'file'; // Only files are draggable

        const icon = document.createElement('span');
        icon.className = 'mr-1.5';
        icon.textContent = node.type === 'folder' ? '📁' : '🎵';
        listItem.appendChild(icon);

        const text = document.createElement('span');
        text.textContent = name;
        listItem.appendChild(text);

        if (node.type === 'folder') {
            listItem.addEventListener('click', () => {
                window.currentSoundBrowserPath.push(name);
                renderSoundBrowserDirectory(window.currentSoundBrowserPath, node.children);
            });
        } else { // File
            listItem.addEventListener('click', () => {
                // Highlight selected file
                listDiv.querySelectorAll('.bg-blue-200').forEach(el => el.classList.remove('bg-blue-200'));
                listItem.classList.add('bg-blue-200');
                window.selectedSoundForPreview = {
                    fileName: name,
                    fullPath: [...pathArray, name].join('/'),
                    libraryName: window.currentLibraryName
                };
                if(previewSoundBtn) previewSoundBtn.disabled = false;
            });
            listItem.addEventListener('dragstart', (event) => {
                const soundData = {
                    fileName: name,
                    fullPath: [...pathArray, name].join('/'),
                    libraryName: window.currentLibraryName,
                    type: 'sound-browser-item' // Identifier for drop target
                };
                event.dataTransfer.setData("application/json", JSON.stringify(soundData));
                event.dataTransfer.effectAllowed = "copy";
                console.log("[UI] Drag Start Sound Browser:", soundData);
            });
        }
        listDiv.appendChild(listItem);
    });
}

 function openMixerWindow(savedState = null) {
    const windowId = 'mixer';
    if (window.openWindows[windowId] && !savedState) {
        window.openWindows[windowId].restore();
        return window.openWindows[windowId];
    }

    const contentContainer = document.createElement('div');
    contentContainer.id = 'mixerContentContainer';
    contentContainer.className = 'p-2 overflow-x-auto whitespace-nowrap h-full'; // Allow horizontal scroll for many tracks

    const mixerOptions = {
        width: Math.min(800, (document.getElementById('desktop')?.offsetWidth || 800) - 40),
        height: 300, minWidth: 300, minHeight: 200,
        initialContentKey: windowId
    };
    if (savedState) { /* Apply saved state */ }

    const mixerWindow = window.createWindow(windowId, 'Mixer', contentContainer, mixerOptions);

    if (mixerWindow && mixerWindow.element) {
        if (typeof updateMixerWindow === 'function') updateMixerWindow(); // Initial render
    } else { return null; }
    return mixerWindow;
}

 function updateMixerWindow() {
    const mixerWindow = window.openWindows['mixer'];
    if (!mixerWindow || !mixerWindow.element || mixerWindow.isMinimized) return;

    const container = mixerWindow.element.querySelector('#mixerContentContainer');
    if (!container) return;

    renderMixer(container); // Call the main render function
}

 function renderMixer(container) {
    container.innerHTML = ''; // Clear previous content
    const tracks = typeof window.getTracks === 'function' ? window.getTracks() : [];

    const masterTrackDiv = document.createElement('div');
    masterTrackDiv.className = 'mixer-track master-track inline-block align-top p-1.5 border rounded bg-gray-200 shadow w-24 mr-2 text-xs';
    masterTrackDiv.innerHTML = `
        <div class="track-name font-semibold truncate mb-1" title="Master">Master</div>
        <div id="masterVolumeKnob-mixer-placeholder" class="h-16 mx-auto mb-1"></div>
        <div id="mixerMasterMeterContainer" class="h-3 w-full bg-gray-300 rounded border border-gray-400 overflow-hidden mt-1">
            <div id="mixerMasterMeterBar" class="h-full bg-blue-500 transition-all duration-50 ease-linear" style="width: 0%;"></div>
        </div>
    `;
    container.appendChild(masterTrackDiv);

    const masterVolKnobPlaceholder = masterTrackDiv.querySelector('#masterVolumeKnob-mixer-placeholder');
    if (masterVolKnobPlaceholder) {
        const masterVolume = (window.masterGainNode && typeof window.masterGainNode.gain?.value === 'number') ? window.masterGainNode.gain.value : Tone.dbToGain(0);
        const masterVolKnob = createKnob({
            label: 'Master Vol', min: 0, max: 1.2, step: 0.01, initialValue: masterVolume, decimals: 2,
            onValueChange: (val, oldVal, fromInteraction) => {
                if (window.masterGainNode && window.masterGainNode.gain) {
                    window.masterGainNode.gain.value = val;
                    if (fromInteraction && typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Master Volume to ${val.toFixed(2)}`);
                }
            }
        });
        masterVolKnobPlaceholder.replaceWith(masterVolKnob.element);
    }


    tracks.forEach(track => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'mixer-track inline-block align-top p-1.5 border rounded bg-white shadow w-24 mr-2 text-xs';
        trackDiv.innerHTML = `
            <div class="track-name font-semibold truncate mb-1" title="${track.name}">${track.name}</div>
            <div id="volumeKnob-mixer-${track.id}-placeholder" class="h-16 mx-auto mb-1"></div>
            <div class="grid grid-cols-2 gap-0.5 my-1">
                <button id="mixerMuteBtn-${track.id}" title="Mute" class="px-1 py-0.5 text-xs border rounded ${track.isMuted ? 'muted' : ''}">${track.isMuted ? 'U' : 'M'}</button>
                <button id="mixerSoloBtn-${track.id}" title="Solo" class="px-1 py-0.5 text-xs border rounded ${track.isSoloed ? 'soloed' : ''}">${track.isSoloed ? 'U' : 'S'}</button>
            </div>
            <div id="mixerTrackMeterContainer-${track.id}" class="h-3 w-full bg-gray-200 rounded border border-gray-300 overflow-hidden mt-0.5">
                <div id="mixerTrackMeterBar-${track.id}" class="h-full bg-green-500 transition-all duration-50 ease-linear" style="width: 0%;"></div>
            </div>
        `;
        container.appendChild(trackDiv);

        const volKnobPlaceholder = trackDiv.querySelector(`#volumeKnob-mixer-${track.id}-placeholder`);
        if (volKnobPlaceholder) {
            const volKnob = createKnob({
                label: `Vol ${track.id}`, min: 0, max: 1.2, step: 0.01, initialValue: track.previousVolumeBeforeMute, decimals: 2, trackRef: track,
                onValueChange: (val, oldVal, fromInteraction) => { track.setVolume(val, fromInteraction); }
            });
            volKnobPlaceholder.replaceWith(volKnob.element);
        }

        trackDiv.querySelector(`#mixerMuteBtn-${track.id}`).addEventListener('click', () => handleTrackMute(track.id));
        trackDiv.querySelector(`#mixerSoloBtn-${track.id}`).addEventListener('click', () => handleTrackSolo(track.id));
    });
}

 function buildSequencerContentDOM(track, rows, rowLabels, numBars) {
    const stepsPerBar = Constants.STEPS_PER_BAR;
    const totalSteps = numBars * stepsPerBar;
    let html = `<div class="sequencer-container p-1 text-xs overflow-auto h-full">`;
    html += `<div class="controls mb-1 flex justify-between items-center">
                <span class="font-semibold">${track.name} - ${numBars} Bar${numBars > 1 ? 's' : ''} (${totalSteps} steps)</span>
                <div>
                    <label for="seqLengthInput-${track.id}">Bars: </label>
                    <input type="number" id="seqLengthInput-${track.id}" value="${numBars}" min="1" max="16" class="w-12 p-0.5 border rounded text-xs">
                </div>
             </div>`;
    html += `<div class="sequencer-grid-wrapper relative">`; // Wrapper for labels + grid
    // Row Labels (Piano Roll for Synth/Instrument, Slices for Sampler, Pads for Drum Sampler)
    html += `<div class="sequencer-row-labels absolute left-0 top-0 pt-[18px] pr-1 text-right text-[10px] leading-tight z-10 bg-gray-100 border-r">`;
    for (let i = 0; i < rows; i++) {
        let labelText = rowLabels[i] || `R${i + 1}`;
        if (labelText.length > 5) labelText = labelText.substring(0,4) + "..";
        html += `<div class="h-[18px] flex items-center justify-end" title="${rowLabels[i] || ''}">${labelText}</div>`;
    }
    html += `</div>`;

    // Grid itself
    html += `<div class="sequencer-grid inline-block ml-[50px]">`; // Margin for labels
    // Header row for bar numbers / beat markers
    html += `<div class="flex sticky top-0 bg-gray-100 z-20 border-b">`;
    for (let i = 0; i < totalSteps; i++) {
        let barMarkerClass = (i % stepsPerBar === 0) ? 'bar-marker' : '';
        let beatMarkerClass = (i % (stepsPerBar / 4) === 0) ? 'beat-marker' : '';
        html += `<div class="sequencer-header-cell w-[18px] h-[18px] text-[9px] flex items-center justify-center ${barMarkerClass} ${beatMarkerClass}">
                    ${i % stepsPerBar === 0 ? (i/stepsPerBar + 1) : ''}
                 </div>`;
    }
    html += `</div>`;

    for (let i = 0; i < rows; i++) {
        html += `<div class="sequencer-row flex">`;
        for (let j = 0; j < totalSteps; j++) {
            const stepData = track.sequenceData[i]?.[j];
            let activeClass = '';
            if (stepData?.active) {
                if (track.type === 'Synth') activeClass = 'active-synth';
                else if (track.type === 'Sampler') activeClass = 'active-sampler';
                else if (track.type === 'DrumSampler') activeClass = 'active-drum-sampler';
                else if (track.type === 'InstrumentSampler') activeClass = 'active-instrument-sampler';
            }
            let barDividerClass = (j % stepsPerBar === 0 && j > 0) ? 'bar-divider' : '';
            let beatDividerClass = (j % (stepsPerBar/4) === 0 && j > 0) ? 'beat-divider' : '';

            html += `<div class="sequencer-step-cell w-[18px] h-[18px] border border-gray-300 ${activeClass} ${barDividerClass} ${beatDividerClass}"
                         data-row="${i}" data-col="${j}" title="R${i+1},S${j+1}"></div>`;
        }
        html += `</div>`;
    }
    html += `</div></div></div>`; // End sequencer-grid, grid-wrapper, sequencer-container
    return html;
}

 function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track) { console.error(`[UI] Track ${trackId} not found for sequencer.`); return null; }

    const windowId = `sequencerWin-${trackId}`;
    if (window.openWindows[windowId] && !forceRedraw && !savedState) {
        window.openWindows[windowId].restore();
        if (typeof window.setActiveSequencerTrackId === 'function') window.setActiveSequencerTrackId(trackId);
        return window.openWindows[windowId];
    }

    let rows, rowLabels;
    const numBars = track.sequenceLength / Constants.STEPS_PER_BAR;

    if (track.type === 'Synth' || track.type === 'InstrumentSampler') {
        rows = Constants.synthPitches.length;
        rowLabels = Constants.synthPitches;
    } else if (track.type === 'Sampler') {
        rows = track.slices.length > 0 ? track.slices.length : Constants.numSlices;
        rowLabels = Array.from({ length: rows }, (_, i) => `Slice ${i + 1}`);
    } else if (track.type === 'DrumSampler') {
        rows = Constants.numDrumSamplerPads;
        rowLabels = Array.from({ length: rows }, (_, i) => `Pad ${i + 1}`);
    } else {
        rows = 0; rowLabels = [];
    }

    const contentDOM = buildSequencerContentDOM(track, rows, rowLabels, numBars);
    const seqOptions = {
        width: Math.min(900, (document.getElementById('desktop')?.offsetWidth || 900) - 40),
        height: 400, minWidth: 400, minHeight: 250,
        initialContentKey: windowId,
        onCloseCallback: () => {
            if (track) track.sequencerWindow = null;
            if (typeof window.getActiveSequencerTrackId === 'function' && window.getActiveSequencerTrackId() === trackId && typeof window.setActiveSequencerTrackId === 'function') {
                window.setActiveSequencerTrackId(null);
            }
        }
    };
     if (savedState) { /* Apply saved state */ }

    const sequencerWindow = window.createWindow(windowId, `Sequencer: ${track.name}`, contentDOM, seqOptions);

    if (sequencerWindow && sequencerWindow.element) {
        track.sequencerWindow = sequencerWindow;
        if (typeof window.setActiveSequencerTrackId === 'function') window.setActiveSequencerTrackId(trackId);

        const grid = sequencerWindow.element.querySelector('.sequencer-grid');
        grid.addEventListener('click', (e) => {
            if (e.target.classList.contains('sequencer-step-cell')) {
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                if (!track.sequenceData[row]) track.sequenceData[row] = Array(track.sequenceLength).fill(null);
                const currentStep = track.sequenceData[row][col];
                const isActive = !(currentStep && currentStep.active);

                if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Step (${row+1},${col+1}) on ${track.name}`);
                track.sequenceData[row][col] = isActive ? { active: true, velocity: Constants.defaultVelocity } : null;

                // Update cell UI directly
                e.target.classList.remove('active-synth', 'active-sampler', 'active-drum-sampler', 'active-instrument-sampler');
                if (isActive) {
                    let activeClass = '';
                    if (track.type === 'Synth') activeClass = 'active-synth';
                    else if (track.type === 'Sampler') activeClass = 'active-sampler';
                    else if (track.type === 'DrumSampler') activeClass = 'active-drum-sampler';
                    else if (track.type === 'InstrumentSampler') activeClass = 'active-instrument-sampler';
                    if (activeClass) e.target.classList.add(activeClass);
                }
            }
        });
        const lengthInput = sequencerWindow.element.querySelector(`#seqLengthInput-${track.id}`);
        lengthInput.addEventListener('change', (e) => {
            const newNumBars = parseInt(e.target.value);
            if (!isNaN(newNumBars) && newNumBars >= 1 && newNumBars <= 16) {
                track.setSequenceLength(newNumBars * Constants.STEPS_PER_BAR); // This will re-render if needed
            } else {
                e.target.value = track.sequenceLength / Constants.STEPS_PER_BAR; // Reset to current
            }
        });

    } else {
        if (track) track.sequencerWindow = null;
        return null;
    }
    return sequencerWindow;
}

// --- Utility UI functions for samplers ---
 function renderSamplePads(track) {
    const inspector = track.inspectorWindow?.element;
    if (!inspector || track.type !== 'Sampler') return;
    const padsContainer = inspector.querySelector(`#samplePadsContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = ''; // Clear

    track.slices.forEach((slice, index) => {
        const pad = document.createElement('button');
        pad.className = `sample-pad p-2 border rounded text-xs h-12 flex items-center justify-center 
                         ${track.selectedSliceForEdit === index ? 'bg-blue-200 border-blue-400' : 'bg-gray-200 hover:bg-gray-300'}
                         ${(!track.audioBuffer || !track.audioBuffer.loaded || slice.duration <= 0) ? 'opacity-50' : ''}`;
        pad.textContent = `S${index + 1}`;
        pad.title = `Slice ${index + 1}`;
        if (!track.audioBuffer || !track.audioBuffer.loaded || slice.duration <= 0) {
            pad.disabled = true;
        }

        pad.addEventListener('click', () => {
            track.selectedSliceForEdit = index;
            if (typeof window.playSlicePreview === 'function') window.playSlicePreview(track.id, index);
            renderSamplePads(track); // Re-render to update selection highlight
            if (typeof updateSliceEditorUI === 'function') updateSliceEditorUI(track); // Update knobs and toggles
        });
        padsContainer.appendChild(pad);
    });
}

 function updateSliceEditorUI(track) {
    const inspector = track.inspectorWindow?.element;
    if (!inspector || track.type !== 'Sampler' || !track.slices || track.slices.length === 0) return;

    const selectedInfo = inspector.querySelector(`#selectedSliceInfo-${track.id}`);
    if (selectedInfo) selectedInfo.textContent = track.selectedSliceForEdit + 1;

    const slice = track.slices[track.selectedSliceForEdit];
    if (!slice) return; // Should not happen if selectedSliceForEdit is valid

    if (track.inspectorControls.sliceVolume) track.inspectorControls.sliceVolume.setValue(slice.volume || 0.7);
    if (track.inspectorControls.slicePitch) track.inspectorControls.slicePitch.setValue(slice.pitchShift || 0);

    const loopToggleBtn = inspector.querySelector(`#sliceLoopToggle-${track.id}`);
    if (loopToggleBtn) {
        loopToggleBtn.textContent = slice.loop ? 'Loop: ON' : 'Loop: OFF';
        loopToggleBtn.classList.toggle('active', slice.loop);
    }
    const reverseToggleBtn = inspector.querySelector(`#sliceReverseToggle-${track.id}`);
    if (reverseToggleBtn) {
        reverseToggleBtn.textContent = slice.reverse ? 'Rev: ON' : 'Rev: OFF';
        reverseToggleBtn.classList.toggle('active', slice.reverse);
    }

    const env = slice.envelope || { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 };
    if (track.inspectorControls.sliceEnvAttack) track.inspectorControls.sliceEnvAttack.setValue(env.attack);
    if (track.inspectorControls.sliceEnvDecay) track.inspectorControls.sliceEnvDecay.setValue(env.decay);
    if (track.inspectorControls.sliceEnvSustain) track.inspectorControls.sliceEnvSustain.setValue(env.sustain);
    if (track.inspectorControls.sliceEnvRelease) track.inspectorControls.sliceEnvRelease.setValue(env.release);
}

 function applySliceEdits(trackId) {
    // This function is somewhat conceptual now as knobs update directly.
    // It could be used for more complex batch edits or if knobs only staged changes.
    // For now, it's mainly a placeholder or for actions that aren't direct knob changes.
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track || track.type !== 'Sampler') return;
    showNotification(`Edits for Slice ${track.selectedSliceForEdit + 1} on ${track.name} applied (Note: Knobs apply live).`, 2000);
    // If there were non-knob edits to apply, do it here.
    // e.g., track.slices[track.selectedSliceForEdit].someOtherProperty = someValueFromUI;
    if (typeof window.drawWaveform === 'function') window.drawWaveform(track); // Redraw if edits might affect visual representation of slices
}

 function drawWaveform(track) {
    if (!track || !track.waveformCanvasCtx || !track.audioBuffer || !track.audioBuffer.loaded) {
        if (track && track.waveformCanvasCtx) { // Clear canvas if no buffer
            const canvas = track.waveformCanvasCtx.canvas;
            track.waveformCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
             track.waveformCanvasCtx.fillStyle = '#e0e0e0'; // Light grey background
             track.waveformCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
             track.waveformCanvasCtx.fillStyle = '#a0a0a0';
             track.waveformCanvasCtx.textAlign = 'center';
             track.waveformCanvasCtx.fillText('No audio loaded or processed', canvas.width / 2, canvas.height / 2);
        }
        return;
    }
    const canvas = track.waveformCanvasCtx.canvas;
    const ctx = track.waveformCanvasCtx;
    const buffer = track.audioBuffer.get(); // Get the AudioBuffer
    const data = buffer.getChannelData(0); // Use the first channel
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    ctx.fillStyle = '#f0f0f0'; // Background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#3b82f6'; // Waveform color (Tailwind blue-500)

    ctx.beginPath();
    ctx.moveTo(0, amp);
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0; let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.lineTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp); // Draw both min and max for better visual
    }
    ctx.lineTo(canvas.width, amp);
    ctx.stroke();

    // Draw slice markers
    track.slices.forEach((slice, index) => {
        if (slice.duration <= 0) return;
        const startX = (slice.offset / buffer.duration) * canvas.width;
        const endX = ((slice.offset + slice.duration) / buffer.duration) * canvas.width;
        ctx.fillStyle = index === track.selectedSliceForEdit ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 0, 255, 0.15)';
        ctx.fillRect(startX, 0, endX - startX, canvas.height);
        ctx.strokeStyle = index === track.selectedSliceForEdit ? 'rgba(255,0,0,0.7)' : 'rgba(0,0,255,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, 0); ctx.lineTo(startX, canvas.height);
        ctx.moveTo(endX, 0); ctx.lineTo(endX, canvas.height);
        ctx.stroke();
        ctx.fillStyle = index === track.selectedSliceForEdit ? '#cc0000' : '#0000cc';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`S${index + 1}`, startX + 2, 10);
    });
}

 function drawInstrumentWaveform(track) {
    if (!track || !track.instrumentWaveformCanvasCtx || !track.instrumentSamplerSettings.audioBuffer || !track.instrumentSamplerSettings.audioBuffer.loaded) {
         if (track && track.instrumentWaveformCanvasCtx) { // Clear canvas if no buffer
            const canvas = track.instrumentWaveformCanvasCtx.canvas;
            track.instrumentWaveformCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
             track.instrumentWaveformCanvasCtx.fillStyle = '#e0e0e0';
             track.instrumentWaveformCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
             track.instrumentWaveformCanvasCtx.fillStyle = '#a0a0a0';
             track.instrumentWaveformCanvasCtx.textAlign = 'center';
             track.instrumentWaveformCanvasCtx.fillText('No audio loaded', canvas.width / 2, canvas.height / 2);
        }
        return;
    }
    const canvas = track.instrumentWaveformCanvasCtx.canvas;
    const ctx = track.instrumentWaveformCanvasCtx;
    const buffer = track.instrumentSamplerSettings.audioBuffer.get();
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#10b981'; // Waveform color (Tailwind emerald-500)
    ctx.beginPath();
    ctx.moveTo(0, amp);
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0; let max = -1.0;
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

    // Draw loop markers if loop is enabled
    if (track.instrumentSamplerSettings.loop) {
        const loopStartX = (track.instrumentSamplerSettings.loopStart / buffer.duration) * canvas.width;
        const loopEndX = (track.instrumentSamplerSettings.loopEnd / buffer.duration) * canvas.width;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, canvas.height);
        ctx.strokeStyle = 'rgba(0,200,0,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(loopStartX, 0); ctx.lineTo(loopStartX, canvas.height);
        ctx.moveTo(loopEndX, 0); ctx.lineTo(loopEndX, canvas.height);
        ctx.stroke();
    }
}

function updateDrumPadControlsUI(track) {
    const inspector = track.inspectorWindow?.element;
    if (!inspector || track.type !== 'DrumSampler' || !track.drumSamplerPads) return;

    const selectedPadIndex = track.selectedDrumPadForEdit;
    const padData = track.drumSamplerPads[selectedPadIndex];

    const selectedInfo = inspector.querySelector(`#selectedDrumPadInfo-${track.id}`);
    if (selectedInfo) selectedInfo.textContent = selectedPadIndex + 1;

    // Update Drop Zone for the selected pad
    const dzContainer = inspector.querySelector(`#drumPadDropZoneContainer-${track.id}-${selectedPadIndex}`);
    if (dzContainer) {
        const existingAudioData = {
            originalFileName: padData.originalFileName,
            status: padData.status || (padData.originalFileName ? 'missing' : 'empty')
        };
        dzContainer.innerHTML = createDropZoneHTML(track.id, `drumPadFileInput-${track.id}-${selectedPadIndex}`, 'DrumSampler', selectedPadIndex, existingAudioData);
        const dzEl = dzContainer.querySelector('.drop-zone');
        const fileInputEl = dzContainer.querySelector(`#drumPadFileInput-${track.id}-${selectedPadIndex}`);
        if (dzEl) utilSetupDropZoneListeners(dzEl, track.id, 'DrumSampler', selectedPadIndex, window.loadSoundFromBrowserToTarget, window.loadDrumSamplerPadFile);
        if (fileInputEl) fileInputEl.onchange = (e) => { window.loadDrumSamplerPadFile(e, track.id, selectedPadIndex); };
    } else {
         // If the specific dropzone for the pad isn't found, try to find the general placeholder and recreate it.
        const mainPadControlsArea = inspector.querySelector('.selected-pad-controls');
        if (mainPadControlsArea) {
            let generalDzPlaceholder = mainPadControlsArea.querySelector(`[id^="drumPadDropZoneContainer-${track.id}-"]`);
            if (generalDzPlaceholder) {
                generalDzPlaceholder.id = `drumPadDropZoneContainer-${track.id}-${selectedPadIndex}`; // Update ID
                // Now re-run the population logic
                const existingAudioData = {
                    originalFileName: padData.originalFileName,
                    status: padData.status || (padData.originalFileName ? 'missing' : 'empty')
                };
                generalDzPlaceholder.innerHTML = createDropZoneHTML(track.id, `drumPadFileInput-${track.id}-${selectedPadIndex}`, 'DrumSampler', selectedPadIndex, existingAudioData);
                const dzEl = generalDzPlaceholder.querySelector('.drop-zone');
                const fileInputEl = generalDzPlaceholder.querySelector(`#drumPadFileInput-${track.id}-${selectedPadIndex}`);
                if (dzEl) utilSetupDropZoneListeners(dzEl, track.id, 'DrumSampler', selectedPadIndex, window.loadSoundFromBrowserToTarget, window.loadDrumSamplerPadFile);
                if (fileInputEl) fileInputEl.onchange = (e) => { window.loadDrumSamplerPadFile(e, track.id, selectedPadIndex); };
            }
        }
    }


    const createAndPlaceKnob = (idSuffix, options) => {
        const knob = createKnob(options);
        const placeholder = inspector.querySelector(`#${idSuffix}-${track.id}-placeholder`);
        if (placeholder) placeholder.replaceWith(knob.element);
        else console.warn(`Placeholder ${idSuffix}-${track.id}-placeholder not found for DrumSampler pad knob`);
        return knob;
    };

    track.inspectorControls.drumPadVolume = createAndPlaceKnob(`drumPadVolumeKnob`, { label: 'Vol', min:0, max:1, step:0.01, initialValue: padData.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(selectedPadIndex, val)});
    track.inspectorControls.drumPadPitch = createAndPlaceKnob(`drumPadPitchKnob`, { label: 'Pitch', min:-24, max:24, step:1, initialValue: padData.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(selectedPadIndex, val)});

    const env = padData.envelope || { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 };
    track.inspectorControls.drumPadEnvAttack = createAndPlaceKnob(`drumPadEnvAttack`, { label: 'Attack', min:0.001, max:1, step:0.001, initialValue: env.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'attack', val)});
    track.inspectorControls.drumPadEnvDecay = createAndPlaceKnob(`drumPadEnvDecay`, { label: 'Decay', min:0.01, max:1, step:0.01, initialValue: env.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'decay', val)});
    track.inspectorControls.drumPadEnvSustain = createAndPlaceKnob(`drumPadEnvSustain`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: env.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'sustain', val)});
    track.inspectorControls.drumPadEnvRelease = createAndPlaceKnob(`drumPadEnvRelease`, { label: 'Release', min:0.01, max:2, step:0.01, initialValue: env.release, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'release', val)});
}

function renderDrumSamplerPads(track) {
    const inspector = track.inspectorWindow?.element;
    if (!inspector || track.type !== 'DrumSampler') return;
    const padsContainer = inspector.querySelector(`#drumPadsGridContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = ''; // Clear

    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button');
        padEl.className = `drum-pad p-2 border rounded text-xs h-12 flex items-center justify-center 
                         ${track.selectedDrumPadForEdit === index ? 'bg-blue-200 border-blue-400' : 'bg-gray-200 hover:bg-gray-300'}
                         ${(!padData.audioBufferDataURL && !padData.dbKey && padData.status !== 'loaded') ? 'opacity-60' : ''}`; // Dim if no sample
        padEl.textContent = `Pad ${index + 1}`;
        padEl.title = padData.originalFileName || `Pad ${index + 1}`;

        if (padData.status === 'missing' || padData.status === 'error') {
            padEl.classList.add(padData.status === 'missing' ? 'border-yellow-500' : 'border-red-500');
            padEl.classList.add('text-black'); // Ensure text is visible
        }


        padEl.addEventListener('click', () => {
            track.selectedDrumPadForEdit = index;
            if (typeof window.playDrumSamplerPadPreview === 'function' && padData.status === 'loaded') {
                 window.playDrumSamplerPadPreview(track.id, index);
            } else if (padData.status !== 'loaded') {
                showNotification(`Sample for Pad ${index+1} not loaded. Click to load.`, 2000);
            }
            renderDrumSamplerPads(track); // Re-render to update selection highlight
            if (typeof updateDrumPadControlsUI === 'function') updateDrumPadControlsUI(track); // Update knobs and dropzone
        });
        padsContainer.appendChild(padEl);
    });
}

function highlightPlayingStep(col, trackType, gridElement) {
    if (!gridElement) return;
    // Remove 'playing' from previously highlighted cell in this grid
    const previouslyPlaying = gridElement.querySelector('.sequencer-step-cell.playing');
    if (previouslyPlaying) previouslyPlaying.classList.remove('playing');

    // Add 'playing' to current step cells in the column
    const currentCells = gridElement.querySelectorAll(`.sequencer-step-cell[data-col="${col}"]`);
    currentCells.forEach(cell => cell.classList.add('playing'));
}

export {
    createKnob,
    buildTrackInspectorContentDOM,
    openTrackInspectorWindow,
    initializeCommonInspectorControls,
    initializeTypeSpecificInspectorControls, // Single export for this function
    applySliceEdits,
    drawWaveform,
    drawInstrumentWaveform,
    renderEffectsList,
    renderEffectControls, // Exporting the non-prefixed version
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    openGlobalControlsWindow,
    openSoundBrowserWindow,
    updateSoundBrowserDisplayForLibrary,
    renderSoundBrowserDirectory,
    openMixerWindow,
    updateMixerWindow,
    renderMixer,
    buildSequencerContentDOM,
    openTrackSequencerWindow,
    renderSamplePads,
    updateSliceEditorUI,
    updateDrumPadControlsUI,
    renderDrumSamplerPads,
    highlightPlayingStep
};

// --- Helper function definitions (ensure these are not exported if they were before, unless intended) ---
// (Content of buildSynthSpecificInspectorDOM, buildSynthEngineControls, buildSamplerSpecificInspectorDOM, etc.)
// (Content of buildDrumSamplerSpecificInspectorDOM, buildInstrumentSamplerSpecificInspectorDOM)
// (Content of initializeSynthSpecificControls, initializeSamplerSpecificControls, etc.)
// (Content of buildModularEffectsRackDOM, showAddEffectModal)
// These are already defined above as non-exported, or exported via the block above.
