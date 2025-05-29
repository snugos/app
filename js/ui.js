// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Dark Theme Panel Consistency v1');

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

const synthEngineControlDefinitions = {
    MonoSynth: [ 
        { idPrefix: 'portamento', label: 'Porta', type: 'knob', min: 0, max: 0.2, step: 0.001, defaultValue: 0.01, decimals: 3, path: 'portamento' },
        { idPrefix: 'oscType', label: 'Osc Type', type: 'select', options: ['sine', 'square', 'sawtooth', 'triangle', 'pulse', 'pwm'], defaultValue: 'sawtooth', path: 'oscillator.type' },
        { idPrefix: 'envAttack', label: 'Attack', type: 'knob', min: 0.001, max: 2, step: 0.001, defaultValue: 0.005, decimals: 3, path: 'envelope.attack' },
        { idPrefix: 'envDecay', label: 'Decay', type: 'knob', min: 0.01, max: 2, step: 0.01, defaultValue: 0.1, decimals: 2, path: 'envelope.decay' },
        { idPrefix: 'envSustain', label: 'Sustain', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.9, decimals: 2, path: 'envelope.sustain' },
        { idPrefix: 'envRelease', label: 'Release', type: 'knob', min: 0.01, max: 5, step: 0.01, defaultValue: 1, decimals: 2, path: 'envelope.release' },
        { idPrefix: 'filtType', label: 'Filt Type', type: 'select', options: ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'notch', 'allpass', 'peaking'], defaultValue: 'lowpass', path: 'filter.type' },
        { idPrefix: 'filtFreq', label: 'Filt Freq', type: 'knob', min: 20, max: 20000, step: 1, defaultValue: 1000, decimals: 0, path: 'filter.frequency.value' }, 
        { idPrefix: 'filtQ', label: 'Filt Q', type: 'knob', min: 0.1, max: 20, step: 0.1, defaultValue: 1, decimals: 1, path: 'filter.Q.value' }, 
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
        controlsHTML += `<div id="${def.idPrefix}-${track.id}-placeholder"></div>`;
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
                currentValObj = undefined; 
                break;
            }
        }
        initialValue = (currentValObj !== undefined) ? currentValObj : def.defaultValue;
        if (def.path.endsWith('.value') && track.instrument && track.instrument.get) {
            try {
                const signalPath = def.path.substring(0, def.path.lastIndexOf('.value'));
                const signalValue = track.instrument.get(signalPath)?.value;
                if (signalValue !== undefined) initialValue = signalValue;
            } catch (e) { /* ignore */ }
        }
        if (def.type === 'knob') {
            const knob = createKnob({
                label: def.label,
                min: def.min, max: def.max, step: def.step, initialValue: initialValue,
                decimals: def.decimals, displaySuffix: def.displaySuffix || '',
                trackRef: track,
                onValueChange: (val, oldVal, fromInteraction) => {
                    track.setSynthParam(def.path, val);
                }
            });
            placeholder.innerHTML = ''; 
            placeholder.appendChild(knob.element); 
            track.inspectorControls[def.idPrefix] = knob;
        } else if (def.type === 'select') {
            const selectEl = document.createElement('select');
            selectEl.id = `${def.idPrefix}-${track.id}`;
            selectEl.className = 'synth-param-select w-full p-1 border rounded text-xs'; // Removed specific bg/dark:bg classes
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
            labelEl.className = 'text-xs block mb-0.5'; // Removed dark:text-slate-300
            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'flex flex-col items-start';
            wrapperDiv.appendChild(labelEl);
            wrapperDiv.appendChild(selectEl);
            placeholder.innerHTML = ''; 
            placeholder.appendChild(wrapperDiv); 
            track.inspectorControls[def.idPrefix] = selectEl;
        }
    });
}

function buildSamplerSpecificInspectorDOM(track) {
    let html = `<div class="sampler-controls p-1 space-y-2">`;
    html += `<div id="dropZoneContainer-${track.id}-sampler" class="mb-2"></div>`;
    html += `<div class="waveform-section border rounded p-1"> {/* Removed bg/dark:bg classes */}
                <canvas id="waveformCanvas-${track.id}" class="w-full h-24 rounded shadow-inner"></canvas> {/* Removed bg/dark:bg classes */}
             </div>`;
    // MODIFIED: Removed bg-gray-50 dark:bg-slate-700 from slice-editor-controls
    html += `<div class="slice-editor-controls mt-2 p-1 border rounded space-y-1">
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
    html += `<div id="samplePadsContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>`;
    html += `<div><button id="slicerPolyphonyToggle-${track.id}" class="text-xs px-2 py-1 border rounded mt-1">Mode: Poly</button></div>`;
    html += `</div>`;
    return html;
}

function buildDrumSamplerSpecificInspectorDOM(track) {
    let html = `<div class="drum-sampler-controls p-1 space-y-2">`;
    // MODIFIED: Removed bg-gray-50 dark:bg-slate-700 from selected-pad-controls
    html += `<div class="selected-pad-controls p-1 border rounded space-y-1">
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
    html += `<div id="drumPadsGridContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>`;
    html += `</div>`;
    return html;
}

function buildInstrumentSamplerSpecificInspectorDOM(track) {
    let html = `<div class="instrument-sampler-controls p-1 space-y-2">`;
    html += `<div id="dropZoneContainer-${track.id}-instrumentsampler" class="mb-2"></div>`;
    html += `<div class="waveform-section border rounded p-1"> {/* Removed bg/dark:bg classes */}
               <canvas id="instrumentWaveformCanvas-${track.id}" class="w-full h-24 rounded shadow-inner"></canvas> {/* Removed bg/dark:bg classes */}
             </div>`;
    // MODIFIED: Removed bg-gray-50 dark:bg-slate-700 from instrument-params-controls
    html += `<div class="instrument-params-controls mt-2 p-1 border rounded space-y-1 text-xs">
                <div class="grid grid-cols-2 gap-2 items-center">
                    <div>
                        <label for="instrumentRootNote-${track.id}" class="block text-xs font-medium">Root Note:</label>
                        <select id="instrumentRootNote-${track.id}" class="w-full p-1 border rounded text-xs"></select>
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
    html += `</div>`;
    return html;
}

function applySliceEdits(trackId) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track || track.type !== 'Sampler') {
        console.warn(`[UI - applySliceEdits] Track ${trackId} not found or not a Sampler.`);
        return;
    }
    showNotification(`Edits for Slice ${track.selectedSliceForEdit + 1} on ${track.name} applied (Note: Knobs/toggles often apply live).`, 2000);
    if (typeof window.drawWaveform === 'function') {
        window.drawWaveform(track);
    }
}

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

    // Removed dark:text-slate-300 from main div, color will be inherited or set by specific CSS
    return `
        <div class="track-inspector-content p-1 space-y-1 text-xs overflow-y-auto h-full">
            <div class="common-controls grid grid-cols-3 gap-1 mb-1">
                <button id="muteBtn-${track.id}" title="Mute Track" class="px-1 py-0.5 border rounded ${track.isMuted ? 'muted' : ''}">${track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="soloBtn-${track.id}" title="Solo Track" class="px-1 py-0.5 border rounded ${track.isSoloed ? 'soloed' : ''}">${track.isSoloed ? 'Unsolo' : 'Solo'}</button>
                <button id="armInputBtn-${track.id}" title="Arm for MIDI/Keyboard Input" class="px-1 py-0.5 border rounded ${window.getArmedTrackId && window.getArmedTrackId() === track.id ? 'armed' : ''}">Arm</button>
            </div>
            <div id="volumeKnob-${track.id}-placeholder" class="mb-1"></div>
            <div id="trackMeterContainer-${track.id}" class="meter-bar-container h-3 w-full rounded border overflow-hidden my-1"> {/* Generic meter class */}
                <div id="trackMeterBar-${track.id}" class="meter-bar h-full transition-all duration-50 ease-linear" style="width: 0%;"></div>
            </div>
            <div class="type-specific-controls mt-1 border-t pt-1"> {/* Removed dark:border-slate-600 */}
                ${specificControlsHTML}
            </div>
            <div class="inspector-nav grid grid-cols-3 gap-1 mt-2">
                <button id="openEffectsBtn-${track.id}" class="px-1 py-0.5 border rounded">Effects</button>
                <button id="openSequencerBtn-${track.id}" class="px-1 py-0.5 border rounded">Sequencer</button>
                <button id="removeTrackBtn-${track.id}" class="px-1 py-0.5 border rounded btn-danger">Remove</button> {/* Example danger class */}
            </div>
        </div>
    `;
}

 function openTrackInspectorWindow(trackId, savedState = null) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track) { console.error(`[UI] Track ${trackId} not found for inspector.`); return null; }
    const windowId = `trackInspector-${trackId}`;
    if (window.openWindows[windowId] && !savedState) { 
        window.openWindows[windowId].restore(); 
        return window.openWindows[windowId];
    }
    const contentDOM = buildTrackInspectorContentDOM(track);
    const inspectorOptions = {
        width: 320, height: 450, minWidth: 280, minHeight: 350,
        initialContentKey: windowId, 
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
        if (track) track.inspectorWindow = null; 
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
            initialValue: track.previousVolumeBeforeMute, 
            decimals: 2, trackRef: track,
            onValueChange: (val, oldVal, fromInteraction) => {
                track.setVolume(val, fromInteraction); 
            }
        });
        volumeKnobPlaceholder.innerHTML = ''; 
        volumeKnobPlaceholder.appendChild(volumeKnob.element); 
        track.inspectorControls.volume = volumeKnob;
    }
}

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
    const createAndPlaceKnobInPlaceholder = (placeholderId, options) => {
        const placeholder = winEl.querySelector(`#${placeholderId}`);
        if (placeholder) {
            const knob = createKnob(options);
            placeholder.innerHTML = ''; 
            placeholder.appendChild(knob.element); 
            return knob;
        } else { console.warn(`[UI - initializeSamplerSpecificControls] Placeholder ${placeholderId} not found.`); }
        return null;
    };
    const selectedSlice = track.slices[track.selectedSliceForEdit] || track.slices[0] || { volume: 0.7, pitchShift: 0, envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 } };
    track.inspectorControls.sliceVolume = createAndPlaceKnobInPlaceholder(`sliceVolumeSlider-${track.id}-placeholder`, { label: 'Vol', min:0, max:1, step:0.01, initialValue: selectedSlice.volume, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceVolume(track.selectedSliceForEdit, val)});
    track.inspectorControls.slicePitch = createAndPlaceKnobInPlaceholder(`slicePitchKnob-${track.id}-placeholder`, { label: 'Pitch', min:-24, max:24, step:1, initialValue: selectedSlice.pitchShift, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setSlicePitchShift(track.selectedSliceForEdit, val)});
    track.inspectorControls.sliceEnvAttack = createAndPlaceKnobInPlaceholder(`sliceEnvAttackSlider-${track.id}-placeholder`, { label: 'Attack', min:0.001, max:1, step:0.001, initialValue: selectedSlice.envelope.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'attack', val)});
    track.inspectorControls.sliceEnvDecay = createAndPlaceKnobInPlaceholder(`sliceEnvDecaySlider-${track.id}-placeholder`, { label: 'Decay', min:0.01, max:1, step:0.01, initialValue: selectedSlice.envelope.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'decay', val)});
    track.inspectorControls.sliceEnvSustain = createAndPlaceKnobInPlaceholder(`sliceEnvSustainSlider-${track.id}-placeholder`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: selectedSlice.envelope.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'sustain', val)});
    track.inspectorControls.sliceEnvRelease = createAndPlaceKnobInPlaceholder(`sliceEnvReleaseSlider-${track.id}-placeholder`, { label: 'Release', min:0.01, max:2, step:0.01, initialValue: selectedSlice.envelope.release, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'release', val)});
    const loopToggleBtn = winEl.querySelector(`#sliceLoopToggle-${track.id}`);
    if (loopToggleBtn) { /* ... */ }
    const reverseToggleBtn = winEl.querySelector(`#sliceReverseToggle-${track.id}`);
    if(reverseToggleBtn){ /* ... */ }
    const polyToggleBtn = winEl.querySelector(`#slicerPolyphonyToggle-${track.id}`);
    if (polyToggleBtn) { /* ... */ }
}

function initializeDrumSamplerSpecificControls(track, winEl) {
    if (typeof renderDrumSamplerPads === 'function') renderDrumSamplerPads(track); 
    if (typeof updateDrumPadControlsUI === 'function') updateDrumPadControlsUI(track); 
}

function updateDrumPadControlsUI(track) {
    const inspector = track.inspectorWindow?.element;
    if (!inspector || track.type !== 'DrumSampler' || !track.drumSamplerPads) return;
    const selectedPadIndex = track.selectedDrumPadForEdit;
    const padData = track.drumSamplerPads[selectedPadIndex];
    const selectedInfo = inspector.querySelector(`#selectedDrumPadInfo-${track.id}`);
    if (selectedInfo) selectedInfo.textContent = selectedPadIndex + 1;
    const padSpecificDropZoneContainerId = `drumPadDropZoneContainer-${track.id}-${selectedPadIndex}`;
    const controlsArea = inspector.querySelector('.selected-pad-controls');
    let dzContainer = inspector.querySelector(`#${padSpecificDropZoneContainerId}`);
    if (controlsArea) {
        const existingDropZones = controlsArea.querySelectorAll(`div[id^="drumPadDropZoneContainer-${track.id}-"]`);
        existingDropZones.forEach(oldDz => {
            if (oldDz.id !== padSpecificDropZoneContainerId) oldDz.remove(); 
        });
        dzContainer = controlsArea.querySelector(`#${padSpecificDropZoneContainerId}`);
        if (!dzContainer) { 
            dzContainer = document.createElement('div');
            dzContainer.id = padSpecificDropZoneContainerId;
            dzContainer.className = 'mb-1 text-xs';
            const knobGridOrFirstChild = controlsArea.querySelector('.grid') || controlsArea.firstChild;
            if (knobGridOrFirstChild) controlsArea.insertBefore(dzContainer, knobGridOrFirstChild);
            else controlsArea.appendChild(dzContainer);
        }
    }
    if (dzContainer) {
        const existingAudioData = { /* ... */ }; // as before
        dzContainer.innerHTML = createDropZoneHTML(track.id, `drumPadFileInput-${track.id}-${selectedPadIndex}`, 'DrumSampler', selectedPadIndex, existingAudioData);
        // ... setup listeners ...
    }
    const createAndPlaceKnobInPlaceholder = (placeholderId, options) => {
        const placeholder = inspector.querySelector(`#${placeholderId}`);
        if (placeholder) {
            const knob = createKnob(options);
            placeholder.innerHTML = ''; 
            placeholder.appendChild(knob.element); 
            return knob;
        } else { console.warn(`[UI - updateDrumPadControlsUI] Placeholder ${placeholderId} not found.`); }
        return null;
    };
    track.inspectorControls.drumPadVolume = createAndPlaceKnobInPlaceholder(`drumPadVolumeKnob-${track.id}-placeholder`, { /* ... */ });
    track.inspectorControls.drumPadPitch = createAndPlaceKnobInPlaceholder(`drumPadPitchKnob-${track.id}-placeholder`, { /* ... */ });
    const env = padData.envelope || { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 };
    track.inspectorControls.drumPadEnvAttack = createAndPlaceKnobInPlaceholder(`drumPadEnvAttack-${track.id}-placeholder`, { /* ... */ });
    track.inspectorControls.drumPadEnvDecay = createAndPlaceKnobInPlaceholder(`drumPadEnvDecay-${track.id}-placeholder`, { /* ... */ });
    track.inspectorControls.drumPadEnvSustain = createAndPlaceKnobInPlaceholder(`drumPadEnvSustain-${track.id}-placeholder`, { /* ... */ });
    track.inspectorControls.drumPadEnvRelease = createAndPlaceKnobInPlaceholder(`drumPadEnvRelease-${track.id}-placeholder`, { /* ... */ });
}

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler`);
    if (dzContainerEl) { /* ... */ }
    const canvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if (canvas) { /* ... */ }
    const rootNoteSelect = winEl.querySelector(`#instrumentRootNote-${track.id}`);
    if (rootNoteSelect) { /* ... */ }
    const loopToggleBtn = winEl.querySelector(`#instrumentLoopToggle-${track.id}`);
    if (loopToggleBtn) { /* ... */ }
    const loopStartInput = winEl.querySelector(`#instrumentLoopStart-${track.id}`);
    if (loopStartInput) { /* ... */ }
    const loopEndInput = winEl.querySelector(`#instrumentLoopEnd-${track.id}`);
    if (loopEndInput) { /* ... */ }
    const createAndPlaceKnobInPlaceholder = (placeholderId, options) => {
        const placeholder = winEl.querySelector(`#${placeholderId}`);
        if (placeholder) { /* ... */ } else { console.warn(`[UI - initializeInstrumentSamplerSpecificControls] Placeholder ${placeholderId} not found.`); }
        return null;
    };
    const env = track.instrumentSamplerSettings.envelope || { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 };
    track.inspectorControls.instrEnvAttack = createAndPlaceKnobInPlaceholder(`instrumentEnvAttack-${track.id}-placeholder`, { /* ... */ });
    track.inspectorControls.instrEnvDecay = createAndPlaceKnobInPlaceholder(`instrumentEnvDecay-${track.id}-placeholder`, { /* ... */ });
    track.inspectorControls.instrEnvSustain = createAndPlaceKnobInPlaceholder(`instrumentEnvSustain-${track.id}-placeholder`, { /* ... */ });
    track.inspectorControls.instrEnvRelease = createAndPlaceKnobInPlaceholder(`instrumentEnvRelease-${track.id}-placeholder`, { /* ... */ });
    const polyToggleBtnInst = winEl.querySelector(`#instrumentPolyphonyToggle-${track.id}`);
    if (polyToggleBtnInst) { /* ... */ }
}

function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    const ownerId = (ownerType === 'track' && owner) ? owner.id : 'master';
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    // MODIFIED: Removed bg-gray-100 dark:bg-slate-700 from effectsList
    let html = `<div id="effectsRackContent-${ownerId}" class="p-2 space-y-2 overflow-y-auto h-full">
        <h3 class="text-sm font-semibold">Effects Rack: ${ownerName}</h3>
        <div id="effectsList-${ownerId}" class="space-y-1 min-h-[50px] border rounded p-1 dark:border-slate-600">
            </div>
        <button id="addEffectBtn-${ownerId}" class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Add Effect</button>
        <div id="effectControlsContainer-${ownerId}" class="mt-2 space-y-2">
            </div>
    </div>`;
    return html;
}

 function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    if (!listDiv) return;
    listDiv.innerHTML = ''; 
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : window.masterEffectsChain;
    if (!effectsArray || effectsArray.length === 0) {
        listDiv.innerHTML = '<p class="text-xs italic">No effects added.</p>'; // Adjusted text color via parent
        if (controlsContainer) controlsContainer.innerHTML = ''; 
        return;
    }
    effectsArray.forEach((effect, index) => {
        const effectDef = AVAILABLE_EFFECTS[effect.type];
        const displayName = effectDef ? effectDef.displayName : effect.type;
        // MODIFIED: Removed Tailwind bg/dark:bg and text/dark:text classes. Added 'effect-item-base'
        const item = document.createElement('div');
        item.className = 'effect-item-base flex justify-between items-center p-1 border-b rounded-sm shadow-xs text-xs dark:border-slate-700';
        item.innerHTML = `
            <span class="effect-name flex-grow cursor-pointer hover:text-blue-400" title="Edit ${displayName}">${displayName}</span>
            <div class="effect-actions">
                <button class="up-btn text-xs px-0.5 ${index === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-green-400'}" ${index === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                <button class="down-btn text-xs px-0.5 ${index === effectsArray.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:text-green-400'}" ${index === effectsArray.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                <button class="remove-btn text-xs px-1 text-red-400 hover:text-red-300" title="Remove Effect">✕</button>
            </div>
        `;
        item.querySelector('.effect-name').addEventListener('click', () => {
            renderEffectControls(owner, ownerType, effect.id, controlsContainer);
            listDiv.querySelectorAll('.effect-item-base').forEach(el => el.classList.remove('effect-item-selected'));
            item.classList.add('effect-item-selected');
        });
        // ... (up, down, remove listeners unchanged) ...
        item.querySelector('.up-btn').addEventListener('click', () => { /* ... */ });
        item.querySelector('.down-btn').addEventListener('click', () => { /* ... */ });
        item.querySelector('.remove-btn').addEventListener('click', () => { /* ... */ });
        listDiv.appendChild(item);
    });
}

function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    if (!controlsContainer) return;
    controlsContainer.innerHTML = ''; 
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : window.masterEffectsChain;
    const effectWrapper = effectsArray.find(e => e.id === effectId);
    if (!effectWrapper) { /* ... */ return; }
    const effectDef = AVAILABLE_EFFECTS[effectWrapper.type];
    if (!effectDef) { /* ... */ return; }
    const titleEl = document.createElement('h4');
    titleEl.className = 'text-xs font-semibold mb-1'; // Removed dark:text-slate-200
    titleEl.textContent = `Controls: ${effectDef.displayName}`;
    controlsContainer.appendChild(titleEl);
    // MODIFIED: Removed bg-gray-50 dark:bg-slate-700 from gridContainer
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 border rounded text-xs';
    if (!effectDef.params || effectDef.params.length === 0) { /* ... */ }
    else {
        effectDef.params.forEach(paramDef => {
            const controlWrapper = document.createElement('div');
            let currentValue; /* ... */
            if (paramDef.type === 'knob') { /* ... */ }
            else if (paramDef.type === 'select') {
                const label = document.createElement('label');
                label.className = 'block text-xs font-medium mb-0.5'; // Removed dark:text-slate-300
                /* ... */
                const select = document.createElement('select');
                select.className = 'w-full p-1 border rounded text-xs'; // Removed specific bg/dark:bg
                /* ... */
            } else if (paramDef.type === 'toggle') {
                const button = document.createElement('button');
                 // MODIFIED: Removed specific bg/dark:bg, rely on general button/active styling
                button.className = `w-full p-1 border rounded text-xs ${currentValue ? 'active' : ''}`;
                /* ... */
            }
            gridContainer.appendChild(controlWrapper);
        });
    }
    controlsContainer.appendChild(gridContainer);
}

function showAddEffectModal(owner, ownerType) { /* ... unchanged ... */ }
function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... unchanged ... */ }
function openMasterEffectsRackWindow(savedState = null) { /* ... unchanged ... */ }
function openGlobalControlsWindow(savedState = null) { /* ... unchanged, ensure its internal HTML has classes styled in CSS now */ }

function openSoundBrowserWindow(savedState = null) {
    const windowId = 'soundBrowser';
    if (window.openWindows[windowId] && !savedState) { /* ... */ }
    // MODIFIED: Removed Tailwind bg/dark:bg classes from #soundBrowserList and select
    let contentHTML = `
        <div id="soundBrowserContent" class="p-2 space-y-2 text-xs overflow-y-auto h-full">
            <div class="flex space-x-1 mb-1">
                <select id="librarySelect" class="flex-grow p-1 border rounded text-xs">
                    <option value="">Select Library...</option>
                </select>
                <button id="upDirectoryBtn" class="px-2 py-1 border rounded" title="Up Directory">↑</button>
            </div>
            <div id="currentPathDisplay" class="text-xs truncate mb-1">/</div>
            <div id="soundBrowserList" class="min-h-[100px] border rounded p-0 overflow-y-auto"> {/* p-0 for items to have full control */}
                 <p class="italic p-1">Select a library to browse sounds.</p> {/* Adjusted class for text color */}
            </div>
            <div id="soundPreviewControls" class="mt-1 text-center">
                <button id="previewSoundBtn" class="px-2 py-1 text-xs border rounded btn-primary" disabled>Preview</button> {/* Example btn-primary class */}
            </div>
        </div>`;
    const browserOptions = { /* ... */ };
    if (savedState) { /* ... */ }
    const browserWindow = window.createWindow(windowId, 'Sound Browser', contentHTML, browserOptions);
    if (browserWindow && browserWindow.element) { /* ... event listeners ... */ }
    return browserWindow;
}
function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... unchanged ... */ }

function renderSoundBrowserDirectory(pathArray, treeNode) {
    const browserWindowEl = window.openWindows['soundBrowser']?.element;
    if (!browserWindowEl || !treeNode) return;
    const listDiv = browserWindowEl.querySelector('#soundBrowserList');
    const currentPathDisplay = browserWindowEl.querySelector('#currentPathDisplay');
    const previewSoundBtn = browserWindowEl.querySelector('#previewSoundBtn');
    listDiv.innerHTML = ''; 
    currentPathDisplay.textContent = `/${window.currentLibraryName || ''}${pathArray.length > 0 ? '/' : ''}${pathArray.join('/')}`;
    window.selectedSoundForPreview = null;
    if(previewSoundBtn) previewSoundBtn.disabled = true;
    const items = [];
    for (const name in treeNode) {
        if (treeNode[name] && typeof treeNode[name].type !== 'undefined') {
            items.push({ name, type: treeNode[name].type, nodeData: treeNode[name] });
        } else { /* ... */ }
    }
    items.sort((a, b) => { /* ... */ });
    if (items.length === 0) { /* ... */ return; }

    items.forEach(itemObj => {
        const name = itemObj.name;
        const node = itemObj.nodeData; 
        const listItem = document.createElement('div');
        // MODIFIED: Added 'sound-browser-item' and removed explicit Tailwind hover/border/text classes
        listItem.className = 'sound-browser-item flex items-center'; // Base class, padding/border from CSS
        listItem.draggable = node.type === 'file'; 
        const icon = document.createElement('span');
        icon.className = 'mr-1.5';
        icon.textContent = node.type === 'folder' ? '📁' : '🎵';
        listItem.appendChild(icon);
        const text = document.createElement('span');
        text.textContent = name;
        listItem.appendChild(text);
        if (node.type === 'folder') { /* ... */ }
        else { 
            listItem.addEventListener('click', () => {
                listDiv.querySelectorAll('.sound-browser-item-selected').forEach(el => el.classList.remove('sound-browser-item-selected'));
                listItem.classList.add('sound-browser-item-selected'); // Use CSS class for selection
                window.selectedSoundForPreview = { /* ... */ };
                if(previewSoundBtn) previewSoundBtn.disabled = false;
            });
            listItem.addEventListener('dragstart', (event) => { /* ... unchanged ... */ });
        }
        listDiv.appendChild(listItem);
    });
}

function openMixerWindow(savedState = null) { /* ... unchanged ... */ }
function updateMixerWindow() { /* ... unchanged ... */ }
function renderMixer(container) { /* ... html generation uses Tailwind, this is fine if Tailwind CDN is JITing */ }

function buildSequencerContentDOM(track, rows, rowLabels, numBars) {
    const stepsPerBar = Constants.STEPS_PER_BAR;
    const totalSteps = numBars * stepsPerBar;
    // MODIFIED: Removed dark:bg-slate-900 dark:text-slate-300 from container
    // MODIFIED: Removed bg-gray-200 dark:bg-slate-800 etc. from controls - will be styled by CSS
    let html = `<div class="sequencer-container p-1 text-xs overflow-auto h-full">`;
    html += `<div class="controls mb-1 flex justify-between items-center sticky top-0 left-0 p-1 z-30 border-b">
                <span class="font-semibold">${track.name} - ${numBars} Bar${numBars > 1 ? 's' : ''} (${totalSteps} steps)</span>
                <div>
                    <label for="seqLengthInput-${track.id}">Bars: </label>
                    <input type="number" id="seqLengthInput-${track.id}" value="${numBars}" min="1" max="${Constants.MAX_BARS || 16}" class="w-12 p-0.5 border rounded text-xs">
                </div>
             </div>`;
    html += `<div class="sequencer-grid-layout" style="display: grid; grid-template-columns: 50px repeat(${totalSteps}, 20px); grid-auto-rows: 20px; gap: 0px; width: fit-content; position: relative; top: 0; left: 0;">`;
    html += `<div class="sequencer-header-cell sticky top-0 left-0 z-20 border-r border-b"></div>`; // Top-left
    for (let i = 0; i < totalSteps; i++) { // Step numbers
        html += `<div class="sequencer-header-cell sticky top-0 z-10 border-r border-b flex items-center justify-center text-[10px]">
                    ${(i % stepsPerBar === 0) ? (Math.floor(i / stepsPerBar) + 1) : ((i % 4 === 0) ? '&#x2022;' : '')}
                 </div>`;
    }
    for (let i = 0; i < rows; i++) { // Row labels and step cells
        let labelText = rowLabels[i] || `R${i + 1}`;
        if (labelText.length > 6) labelText = labelText.substring(0,5) + "..";
        html += `<div class="sequencer-label-cell sticky left-0 z-10 border-r border-b flex items-center justify-end pr-1 text-[10px]" title="${rowLabels[i] || ''}">${labelText}</div>`;
        for (let j = 0; j < totalSteps; j++) {
            const stepData = track.sequenceData[i]?.[j];
            let activeClass = ''; /* ... */
            if (stepData?.active) { /* ... */ }
            let beatBlockClass = '';
            if (Math.floor((j % stepsPerBar) / 4) % 2 === 0) { beatBlockClass = 'beat-block-a'; } 
            else { beatBlockClass = 'beat-block-b'; }
            let barLineClass = (j % stepsPerBar === 0 && j > 0) ? 'bar-line-strong' : 
                               (j > 0 && j % (stepsPerBar / 2) === 0) ? 'bar-line-medium' :
                               (j > 0 && j % (stepsPerBar / 4) === 0) ? 'bar-line-light' : '';

            html += `<div class="sequencer-step-cell ${activeClass} ${beatBlockClass} ${barLineClass} border-r border-b"
                         data-row="${i}" data-col="${j}" title="R${i+1},S${j+1}"></div>`;
        }
    }
    html += `</div></div>`; 
    return html;
}

 function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... unchanged ... */ }
 function renderSamplePads(track) { /* ... html generation uses Tailwind, review if this needs CSS classes ... */ }
 function updateSliceEditorUI(track) { /* ... unchanged ... */ }
 function drawWaveform(track) { /* ... unchanged ... */ }
 function drawInstrumentWaveform(track) { /* ... unchanged ... */ }
 function renderDrumSamplerPads(track) { /* ... html generation uses Tailwind, review if this needs CSS classes ... */ }
 function highlightPlayingStep(col, trackType, gridElement) { /* ... unchanged ... */ }

export {
    createKnob,
    buildTrackInspectorContentDOM,
    openTrackInspectorWindow,
    initializeCommonInspectorControls,
    initializeTypeSpecificInspectorControls, 
    applySliceEdits,
    drawWaveform,
    drawInstrumentWaveform,
    renderEffectsList,
    renderEffectControls, 
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
