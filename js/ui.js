// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Adding Effects Rack Context Menu. Version: daw_ui_js_effects_rack_context_menu');

import { SnugWindow } from './SnugWindow.js';
import { showNotification, createDropZoneHTML, setupDropZoneListeners as utilSetupDropZoneListeners, showCustomModal, createContextMenu } from './utils.js';
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
            selectEl.className = 'synth-param-select w-full p-1 border rounded text-xs bg-gray-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600';
            def.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = typeof opt === 'object' ? opt.value : opt;
                option.textContent = typeof opt === 'object' ? opt.text : opt;
                selectEl.appendChild(option);
            });
            selectEl.value = initialValue;
            selectEl.addEventListener('change', (e) => {
                if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Change ${def.label} for ${track.name} to ${e.target.value}`);
                track.setSynthParam(def.path, e.target.value);
            });

            const labelEl = document.createElement('label');
            labelEl.htmlFor = selectEl.id;
            labelEl.textContent = def.label + ':';
            labelEl.className = 'text-xs block mb-0.5 dark:text-slate-300';
            
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

// --- Sampler Inspector Specifics ---
function buildSamplerSpecificInspectorDOM(track) {
    let html = `<div class="sampler-controls p-1 space-y-2">`;
    html += `<div id="dropZoneContainer-${track.id}-sampler" class="mb-2"></div>`;
    html += `<div class="waveform-section border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600">
                <canvas id="waveformCanvas-${track.id}" class="w-full h-24 bg-white dark:bg-slate-800 rounded shadow-inner"></canvas>
             </div>`;
    html += `<div class="slice-editor-controls mt-2 p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1">
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
                <button id="applySliceEditsBtn-${track.id}" class="mt-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700">Apply Edits to Slice</button>
             </div>`;
    html += `<div id="samplePadsContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>`;
    html += `<div><button id="slicerPolyphonyToggle-${track.id}" class="text-xs px-2 py-1 border rounded mt-1 dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Mode: Poly</button></div>`;
    html += `</div>`;
    return html;
}

// --- Drum Sampler Inspector Specifics ---
function buildDrumSamplerSpecificInspectorDOM(track) {
    let html = `<div class="drum-sampler-controls p-1 space-y-2">`;
    html += `<div class="selected-pad-controls p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1">
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
             </div>`;
    html += `<div id="drumPadsGridContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>`;
    html += `</div>`;
    return html;
}

// --- Instrument Sampler Inspector Specifics ---
function buildInstrumentSamplerSpecificInspectorDOM(track) {
    let html = `<div class="instrument-sampler-controls p-1 space-y-2">`;
    html += `<div id="dropZoneContainer-${track.id}-instrumentsampler" class="mb-2"></div>`;
    html += `<div class="waveform-section border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600">
               <canvas id="instrumentWaveformCanvas-${track.id}" class="w-full h-24 bg-white dark:bg-slate-800 rounded shadow-inner"></canvas>
             </div>`;
    html += `<div class="instrument-params-controls mt-2 p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1 text-xs">
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
        <div class="track-inspector-content p-1 space-y-1 text-xs text-gray-700 dark:text-slate-300 overflow-y-auto h-full">
            <div class="common-controls grid grid-cols-3 gap-1 mb-1">
                <button id="muteBtn-${track.id}" title="Mute Track" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${track.isMuted ? 'muted' : ''}">${track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="soloBtn-${track.id}" title="Solo Track" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${track.isSoloed ? 'soloed' : ''}">${track.isSoloed ? 'Unsolo' : 'Solo'}</button>
                <button id="armInputBtn-${track.id}" title="Arm for MIDI/Keyboard Input" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${window.getArmedTrackId && window.getArmedTrackId() === track.id ? 'armed' : ''}">Arm</button>
            </div>
            <div id="volumeKnob-${track.id}-placeholder" class="mb-1"></div>
            <div id="trackMeterContainer-${track.id}" class="h-3 w-full bg-gray-200 dark:bg-slate-600 rounded border border-gray-300 dark:border-slate-500 overflow-hidden my-1">
                <div id="trackMeterBar-${track.id}" class="h-full bg-green-500 transition-all duration-50 ease-linear" style="width: 0%;"></div>
            </div>

            <div class="type-specific-controls mt-1 border-t dark:border-slate-600 pt-1">
                ${specificControlsHTML}
            </div>

            <div class="inspector-nav grid grid-cols-3 gap-1 mt-2">
                <button id="openEffectsBtn-${track.id}" class="px-1 py-0.5 border rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-500">Effects</button>
                <button id="openSequencerBtn-${track.id}" class="px-1 py-0.5 border rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-500">Sequencer</button>
                <button id="removeTrackBtn-${track.id}" class="px-1 py-0.5 border rounded bg-red-400 hover:bg-red-500 text-white dark:bg-red-600 dark:hover:bg-red-700 dark:border-red-500">Remove</button>
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
        } else {
            console.warn(`[UI - initializeSamplerSpecificControls] Placeholder ${placeholderId} not found.`);
        }
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
                track.setupSlicerMonoNodes(); 
            } else {
                track.disposeSlicerMonoNodes();
            }
            if (track && typeof track.rebuildEffectChain === 'function') {
                console.log(`[UI - SlicerPolyToggle] Rebuilding effect chain for track ${track.id} after polyphony change.`);
                track.rebuildEffectChain(); 
            }
            showNotification(`${track.name} slicer mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`, 2000);
        });
    }
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
            if (oldDz.id !== padSpecificDropZoneContainerId) {
                oldDz.remove(); 
            }
        });
        
        dzContainer = controlsArea.querySelector(`#${padSpecificDropZoneContainerId}`);
        if (!dzContainer) { 
            dzContainer = document.createElement('div');
            dzContainer.id = padSpecificDropZoneContainerId;
            dzContainer.className = 'mb-1 text-xs';
            const knobGridOrFirstChild = controlsArea.querySelector('.grid') || controlsArea.firstChild;
            if (knobGridOrFirstChild) {
                 controlsArea.insertBefore(dzContainer, knobGridOrFirstChild);
            } else { 
                controlsArea.appendChild(dzContainer);
            }
        }
    }
    
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
    }

    const createAndPlaceKnobInPlaceholder = (placeholderId, options) => {
        const placeholder = inspector.querySelector(`#${placeholderId}`);
        if (placeholder) {
            const knob = createKnob(options);
            placeholder.innerHTML = ''; 
            placeholder.appendChild(knob.element); 
            return knob;
        } else {
            console.warn(`[UI - updateDrumPadControlsUI] Placeholder ${placeholderId} not found.`);
        }
        return null;
    };

    track.inspectorControls.drumPadVolume = createAndPlaceKnobInPlaceholder(`drumPadVolumeKnob-${track.id}-placeholder`, { label: 'Vol', min:0, max:1, step:0.01, initialValue: padData.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(selectedPadIndex, val)});
    track.inspectorControls.drumPadPitch = createAndPlaceKnobInPlaceholder(`drumPadPitchKnob-${track.id}-placeholder`, { label: 'Pitch', min:-24, max:24, step:1, initialValue: padData.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(selectedPadIndex, val)});

    const env = padData.envelope || { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 };
    track.inspectorControls.drumPadEnvAttack = createAndPlaceKnobInPlaceholder(`drumPadEnvAttack-${track.id}-placeholder`, { label: 'Attack', min:0.001, max:1, step:0.001, initialValue: env.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'attack', val)});
    track.inspectorControls.drumPadEnvDecay = createAndPlaceKnobInPlaceholder(`drumPadEnvDecay-${track.id}-placeholder`, { label: 'Decay', min:0.01, max:1, step:0.01, initialValue: env.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'decay', val)});
    track.inspectorControls.drumPadEnvSustain = createAndPlaceKnobInPlaceholder(`drumPadEnvSustain-${track.id}-placeholder`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: env.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'sustain', val)});
    track.inspectorControls.drumPadEnvRelease = createAndPlaceKnobInPlaceholder(`drumPadEnvRelease-${track.id}-placeholder`, { label: 'Release', min:0.01, max:2, step:0.01, initialValue: env.release, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'release', val)});
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
        Constants.synthPitches.slice().reverse().forEach(pitch => { 
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

    const createAndPlaceKnobInPlaceholder = (placeholderId, options) => {
        const placeholder = winEl.querySelector(`#${placeholderId}`);
        if (placeholder) {
            const knob = createKnob(options);
            placeholder.innerHTML = ''; 
            placeholder.appendChild(knob.element); 
            return knob;
        } else {
            console.warn(`[UI - initializeInstrumentSamplerSpecificControls] Placeholder ${placeholderId} not found.`);
        }
        return null;
    };
    const env = track.instrumentSamplerSettings.envelope || { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 };
    track.inspectorControls.instrEnvAttack = createAndPlaceKnobInPlaceholder(`instrumentEnvAttack-${track.id}-placeholder`, { label: 'Attack', min:0.001, max:2, step:0.001, initialValue: env.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('attack', val)});
    track.inspectorControls.instrEnvDecay = createAndPlaceKnobInPlaceholder(`instrumentEnvDecay-${track.id}-placeholder`, { label: 'Decay', min:0.01, max:2, step:0.01, initialValue: env.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('decay', val)});
    track.inspectorControls.instrEnvSustain = createAndPlaceKnobInPlaceholder(`instrumentEnvSustain-${track.id}-placeholder`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: env.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('sustain', val)});
    track.inspectorControls.instrEnvRelease = createAndPlaceKnobInPlaceholder(`instrumentEnvRelease-${track.id}-placeholder`, { label: 'Release', min:0.01, max:5, step:0.01, initialValue: env.release, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('release', val)});

    const polyToggleBtnInst = winEl.querySelector(`#instrumentPolyphonyToggle-${track.id}`);
    if (polyToggleBtnInst) {
        polyToggleBtnInst.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
        polyToggleBtnInst.classList.toggle('active', track.instrumentSamplerIsPolyphonic);
        polyToggleBtnInst.addEventListener('click', () => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Instrument Sampler Polyphony for ${track.name} to ${!track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`);
            track.instrumentSamplerIsPolyphonic = !track.instrumentSamplerIsPolyphonic;
            polyToggleBtnInst.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
            polyToggleBtnInst.classList.toggle('active', track.instrumentSamplerIsPolyphonic);
            if (track.toneSampler) { 
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
        <h3 class="text-sm font-semibold dark:text-slate-200">Effects Rack: ${ownerName}</h3>
        <div id="effectsList-${ownerId}" class="space-y-1 min-h-[50px] border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600">
            </div>
        <button id="addEffectBtn-${ownerId}" class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700">Add Effect</button>
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
        listDiv.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic">No effects added.</p>';
        if (controlsContainer) controlsContainer.innerHTML = ''; 
        return;
    }

    effectsArray.forEach((effect, index) => {
        const effectDef = AVAILABLE_EFFECTS[effect.type];
        const displayName = effectDef ? effectDef.displayName : effect.type;

        const item = document.createElement('div');
        item.className = 'effect-item flex justify-between items-center p-1 border-b bg-white dark:bg-slate-800 dark:border-slate-700 rounded-sm shadow-xs text-xs';
        item.innerHTML = `
            <span class="effect-name flex-grow cursor-pointer hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400" title="Edit ${displayName}">${displayName}</span>
            <div class="effect-actions">
                <button class="up-btn text-xs px-0.5 ${index === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-green-600 dark:hover:text-green-400'} dark:text-slate-400" ${index === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                <button class="down-btn text-xs px-0.5 ${index === effectsArray.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:text-green-600 dark:hover:text-green-400'} dark:text-slate-400" ${index === effectsArray.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                <button class="remove-btn text-xs px-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remove Effect">✕</button>
            </div>
        `;
        item.querySelector('.effect-name').addEventListener('click', () => {
            renderEffectControls(owner, ownerType, effect.id, controlsContainer);
            listDiv.querySelectorAll('.effect-item').forEach(el => el.classList.remove('bg-blue-100', 'dark:bg-blue-700', 'border-blue-300', 'dark:border-blue-500'));
            item.classList.add('bg-blue-100', 'dark:bg-blue-700', 'border-blue-300', 'dark:border-blue-500');
        });
        item.querySelector('.up-btn').addEventListener('click', () => {
            if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Reorder effect on ${ownerType === 'track' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.reorderEffect(effect.id, index - 1);
            else if (typeof window.reorderMasterEffect === 'function') window.reorderMasterEffect(effect.id, index - 1);
            renderEffectsList(owner, ownerType, listDiv, controlsContainer); 
        });
        item.querySelector('.down-btn').addEventListener('click', () => {
            if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Reorder effect on ${ownerType === 'track' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.reorderEffect(effect.id, index + 1);
            else if (typeof window.reorderMasterEffect === 'function') window.reorderMasterEffect(effect.id, index + 1);
            renderEffectsList(owner, ownerType, listDiv, controlsContainer); 
        });
        item.querySelector('.remove-btn').addEventListener('click', () => {
            if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Remove ${effect.type} from ${ownerType === 'track' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.removeEffect(effect.id);
            else if (typeof window.removeMasterEffect === 'function') window.removeMasterEffect(effect.id);
            renderEffectsList(owner, ownerType, listDiv, controlsContainer); 
            if (controlsContainer) controlsContainer.innerHTML = ''; 
        });
        listDiv.appendChild(item);
    });
}

function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    if (!controlsContainer) return;
    controlsContainer.innerHTML = ''; 

    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : window.masterEffectsChain;
    const effectWrapper = effectsArray.find(e => e.id === effectId);

    if (!effectWrapper) {
        controlsContainer.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic">Select an effect to see its controls.</p>';
        return;
    }

    const effectDef = AVAILABLE_EFFECTS[effectWrapper.type];
    if (!effectDef) {
        controlsContainer.innerHTML = `<p class="text-xs text-red-500">Error: Definition for effect type "${effectWrapper.type}" not found.</p>`;
        return;
    }

    const titleEl = document.createElement('h4');
    titleEl.className = 'text-xs font-semibold mb-1 dark:text-slate-200';
    titleEl.textContent = `Controls: ${effectDef.displayName}`;
    controlsContainer.appendChild(titleEl);

    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 text-xs';

    if (!effectDef.params || effectDef.params.length === 0) {
        gridContainer.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic col-span-full">No adjustable parameters for this effect.</p>';
    } else {
        effectDef.params.forEach(paramDef => {
            const controlWrapper = document.createElement('div');
            let currentValue;
            const pathKeys = paramDef.key.split('.');
            let tempVal = effectWrapper.params;
            for (const key of pathKeys) {
                if (tempVal && typeof tempVal === 'object' && key in tempVal) {
                    tempVal = tempVal[key];
                } else {
                    tempVal = undefined; 
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
                    trackRef: (ownerType === 'track' ? owner : null), 
                    onValueChange: (val, oldVal, fromInteraction) => {
                        if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, val);
                        else if (typeof window.updateMasterEffectParam === 'function') window.updateMasterEffectParam(effectId, paramDef.key, val);
                    }
                });
                controlWrapper.appendChild(knob.element);
            } else if (paramDef.type === 'select') {
                const label = document.createElement('label');
                label.className = 'block text-xs font-medium mb-0.5 dark:text-slate-300';
                label.textContent = paramDef.label + ':';
                const select = document.createElement('select');
                select.className = 'w-full p-1 border rounded text-xs bg-white dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500';
                paramDef.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = typeof opt === 'object' ? opt.value : opt;
                    option.textContent = typeof opt === 'object' ? opt.text : opt;
                    select.appendChild(option);
                });
                select.value = currentValue;
                select.addEventListener('change', (e) => {
                    const newValue = e.target.value;
                    const finalValue = (typeof paramDef.defaultValue === 'number' && !isNaN(parseFloat(newValue))) ? parseFloat(newValue) : newValue;

                    if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Change ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' ? owner.name : 'Master'}`);
                    if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, finalValue);
                    else if (typeof window.updateMasterEffectParam === 'function') window.updateMasterEffectParam(effectId, paramDef.key, finalValue);
                });
                controlWrapper.appendChild(label);
                controlWrapper.appendChild(select);
            } else if (paramDef.type === 'toggle') {
                const button = document.createElement('button');
                button.className = `w-full p-1 border rounded text-xs dark:border-slate-500 dark:text-slate-300 ${currentValue ? 'bg-blue-500 text-white dark:bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'}`;
                button.textContent = `${paramDef.label}: ${currentValue ? 'ON' : 'OFF'}`;
                button.addEventListener('click', () => {
                    const newValue = !currentValue;
                    if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' ? owner.name : 'Master'}`);
                    if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, newValue);
                    else if (typeof window.updateMasterEffectParam === 'function') window.updateMasterEffectParam(effectId, paramDef.key, newValue);
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
        modalContentHTML += `<li class="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-700 cursor-pointer border-b dark:border-slate-600 text-sm dark:text-slate-200" data-effect-type="${effectKey}">${AVAILABLE_EFFECTS[effectKey].displayName}</li>`;
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
                    window.addMasterEffect(effectType); 
                     const masterRackWindow = window.openWindows['masterEffectsRack'];
                     if (masterRackWindow && masterRackWindow.element) {
                        const listDiv = masterRackWindow.element.querySelector(`#effectsList-master`);
                        const controlsContainer = masterRackWindow.element.querySelector(`#effectControlsContainer-master`);
                        renderEffectsList(null, 'master', listDiv, controlsContainer); 
                     }
                }
                modal.overlay.remove(); 
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
    if (savedState) { 
        rackOptions.x = parseInt(savedState.left);
        rackOptions.y = parseInt(savedState.top);
        rackOptions.width = parseInt(savedState.width);
        rackOptions.height = parseInt(savedState.height);
        rackOptions.zIndex = savedState.zIndex;
        if (savedState.isMinimized) rackOptions.isMinimized = true;
     }

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

    const contentDOM = buildModularEffectsRackDOM(null, 'master'); 
    const rackOptions = {
        width: 350, height: 400, minWidth: 300, minHeight: 250,
        initialContentKey: windowId,
        onCloseCallback: () => { /* any specific master rack close logic */ }
    };
    if (savedState) { 
        rackOptions.x = parseInt(savedState.left);
        rackOptions.y = parseInt(savedState.top);
        rackOptions.width = parseInt(savedState.width);
        rackOptions.height = parseInt(savedState.height);
        rackOptions.zIndex = savedState.zIndex;
        if (savedState.isMinimized) rackOptions.isMinimized = true;
    }

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
    console.log(`[UI - openGlobalControlsWindow] Attempting to open/focus. SavedState:`, savedState);

    if (window.openWindows[windowId] && !savedState) { 
        const existingWindow = window.openWindows[windowId];
        if (!existingWindow.isMinimized) {
            console.log(`[UI - openGlobalControlsWindow] Window '${windowId}' already open and not minimized. Focusing.`);
            existingWindow.focus();
        } else {
            console.log(`[UI - openGlobalControlsWindow] Window '${windowId}' already open but minimized. Restoring.`);
            existingWindow.restore();
        }
        return existingWindow;
    }

    console.log(`[UI - openGlobalControlsWindow] Window '${windowId}' not found or was closed. Creating new instance.`);
    const contentHTML = `
        <div id="global-controls-content" class="p-2.5 space-y-3 text-sm text-gray-700 dark:text-slate-300">
            <div class="grid grid-cols-2 gap-2 items-center">
                <button id="playBtnGlobal" title="Play/Pause (Spacebar)" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-1.5 px-3 rounded shadow transition-colors duration-150 dark:bg-green-600 dark:hover:bg-green-700">Play</button>
                <button id="recordBtnGlobal" title="Record Arm/Disarm" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 px-3 rounded shadow transition-colors duration-150 dark:bg-red-600 dark:hover:bg-red-700">Record</button>
            </div>
            <div>
                <label for="tempoGlobalInput" class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-0.5">Tempo (BPM):</label>
                <input type="number" id="tempoGlobalInput" value="120" min="30" max="300" step="0.1" class="w-full p-1.5 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
            </div>
            <div>
                <label for="midiInputSelectGlobal" class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-0.5">MIDI Input:</label>
                <select id="midiInputSelectGlobal" class="w-full p-1.5 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                    <option value="">No MIDI Input</option>
                </select>
            </div>
            <div class="pt-1">
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-0.5">Master Level:</label>
                <div class="h-5 w-full bg-gray-200 dark:bg-slate-600 rounded border border-gray-300 dark:border-slate-500 overflow-hidden shadow-sm">
                     <div id="masterMeterBarGlobal" class="h-full bg-blue-500 transition-all duration-50 ease-linear" style="width: 0%;"></div>
                </div>
            </div>
            <div class="flex justify-between items-center text-xs mt-1.5">
                <span id="midiIndicatorGlobal" title="MIDI Activity" class="px-2 py-1 rounded-full bg-gray-300 text-gray-600 font-medium transition-colors duration-150 dark:bg-slate-600 dark:text-slate-300">MIDI</span>
                <span id="keyboardIndicatorGlobal" title="Computer Keyboard Activity" class="px-2 py-1 rounded-full bg-gray-300 text-gray-600 font-medium transition-colors duration-150 dark:bg-slate-600 dark:text-slate-300">KBD</span>
            </div>
        </div>
    `;

    const options = {
        width: 280, height: 290, minWidth: 250, minHeight: 270,
        closable: true, minimizable: true, resizable: true,
        initialContentKey: windowId 
    };

    if (savedState && savedState.id === windowId) {
        console.log(`[UI - openGlobalControlsWindow] Applying saved state:`, savedState);
        options.x = parseInt(savedState.left, 10);
        options.y = parseInt(savedState.top, 10);
        options.width = parseInt(savedState.width, 10);
        options.height = parseInt(savedState.height, 10);
        options.zIndex = savedState.zIndex; 
        if (savedState.isMinimized) options.isMinimized = true;
    } else {
      console.log(`[UI - openGlobalControlsWindow] No valid saved state, using defaults.`);
    }

    const newWindow = window.createWindow(windowId, 'Global Controls', contentHTML, options);

    if (newWindow && newWindow.element) {
        console.log('[UI - openGlobalControlsWindow] SnugWindow created successfully. Element exists.');

        window.playBtn = newWindow.element.querySelector('#playBtnGlobal');
        window.recordBtn = newWindow.element.querySelector('#recordBtnGlobal');
        window.tempoInput = newWindow.element.querySelector('#tempoGlobalInput');
        window.masterMeterBar = newWindow.element.querySelector('#masterMeterBarGlobal');
        window.midiInputSelectGlobal = newWindow.element.querySelector('#midiInputSelectGlobal');
        window.midiIndicatorGlobalEl = newWindow.element.querySelector('#midiIndicatorGlobal');
        window.keyboardIndicatorGlobalEl = newWindow.element.querySelector('#keyboardIndicatorGlobal');
        
        console.log('[UI - openGlobalControlsWindow] Global element references populated.');
        console.log('[UI - openGlobalControlsWindow] Type of window.attachGlobalControlEvents JUST BEFORE CHECK:', typeof window.attachGlobalControlEvents);

        if (typeof window.attachGlobalControlEvents === 'function') {
            console.log('[UI - openGlobalControlsWindow] ATTACHING global control events to element:', newWindow.element);
            window.attachGlobalControlEvents(newWindow.element);
        } else {
            console.error('[UI - openGlobalControlsWindow] window.attachGlobalControlEvents IS NOT A FUNCTION! Value:', window.attachGlobalControlEvents);
        }
        console.log('[UI - openGlobalControlsWindow] Finished with attachGlobalControlEvents block.');
        return newWindow;
    } else {
        console.error('[UI - openGlobalControlsWindow] CRITICAL: window.createWindow failed to return a valid instance or element for Global Controls.');
        return null;
    }
}

// --- Sound Browser ---
 function openSoundBrowserWindow(savedState = null) { 
    const windowId = 'soundBrowser';
    if (window.openWindows[windowId] && !savedState) {
        window.openWindows[windowId].restore();
        return window.openWindows[windowId];
    }

    let contentHTML = `
        <div id="soundBrowserContent" class="p-2 space-y-2 text-xs overflow-y-auto h-full dark:text-slate-300">
            <div class="flex space-x-1 mb-1">
                <select id="librarySelect" class="flex-grow p-1 border rounded text-xs bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                    <option value="">Select Library...</option>
                </select>
                <button id="upDirectoryBtn" class="px-2 py-1 border rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-500" title="Up Directory">↑</button>
            </div>
            <div id="currentPathDisplay" class="text-xs text-gray-600 dark:text-slate-400 truncate mb-1">/</div>
            <div id="soundBrowserList" class="min-h-[100px] border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600 overflow-y-auto">
                 <p class="text-gray-500 dark:text-slate-400 italic">Select a library to browse sounds.</p>
            </div>
            <div id="soundPreviewControls" class="mt-1 text-center">
                <button id="previewSoundBtn" class="px-2 py-1 text-xs border rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700 dark:disabled:bg-slate-500" disabled>Preview</button>
            </div>
        </div>`;

    const browserOptions = { width: 380, height: 450, minWidth: 300, minHeight: 300, initialContentKey: windowId };
    if (savedState) { 
        browserOptions.x = parseInt(savedState.left);
        browserOptions.y = parseInt(savedState.top);
        browserOptions.width = parseInt(savedState.width);
        browserOptions.height = parseInt(savedState.height);
        browserOptions.zIndex = savedState.zIndex;
        if (savedState.isMinimized) browserOptions.isMinimized = true;
    }

    const browserWindow = window.createWindow(windowId, 'Sound Browser', contentHTML, browserOptions);

    if (browserWindow && browserWindow.element) {
        const librarySelect = browserWindow.element.querySelector('#librarySelect');
        const upDirectoryBtn = browserWindow.element.querySelector('#upDirectoryBtn');
        const previewSoundBtn = browserWindow.element.querySelector('#previewSoundBtn');

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
                window.fetchSoundLibrary(libName, Constants.soundLibraries[libName]);
            } else if (!libName) {
                if (typeof window.updateSoundBrowserDisplayForLibrary === 'function') window.updateSoundBrowserDisplayForLibrary(null);
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
                                URL.revokeObjectURL(tempUrl); 
                            }).toDestination();
                        }).catch(err => showNotification("Error loading preview: " + err.message, 2000));
                    } else {
                        showNotification(`Preview error: File '${fullPath}' not found in '${libraryName}'.`, 3000);
                    }
                }
            }
        });
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
    window.currentSoundBrowserPath = []; 

    if (librarySelect && librarySelect.value !== libraryName) { 
        librarySelect.value = libraryName || "";
    }

    if (!libraryName) {
        listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">Select a library to browse sounds.</p>';
        currentPathDisplay.textContent = '/';
        window.currentSoundFileTree = null;
        return;
    }

    if (window.loadedZipFiles && window.loadedZipFiles[libraryName] === "loading") {
        listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">Loading library...</p>';
        currentPathDisplay.textContent = `/${libraryName}/`;
        window.currentSoundFileTree = null;
    } else if (window.soundLibraryFileTrees && window.soundLibraryFileTrees[libraryName]) {
        window.currentSoundFileTree = window.soundLibraryFileTrees[libraryName];
        if (typeof renderSoundBrowserDirectory === 'function') renderSoundBrowserDirectory([], window.currentSoundFileTree); 
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

    listDiv.innerHTML = ''; 
    currentPathDisplay.textContent = `/${window.currentLibraryName || ''}${pathArray.length > 0 ? '/' : ''}${pathArray.join('/')}`;
    window.selectedSoundForPreview = null;
    if(previewSoundBtn) previewSoundBtn.disabled = true;

    const items = [];
    for (const name in treeNode) {
        if (treeNode[name] && typeof treeNode[name].type !== 'undefined') {
            items.push({ name, type: treeNode[name].type, nodeData: treeNode[name] });
        } else {
            console.warn(`[UI - renderSoundBrowserDirectory] Skipping item with missing type or data: ${name}`, treeNode[name]);
        }
    }
    items.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
    });

    if (items.length === 0) {
        listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">Empty folder.</p>';
        return;
    }

    items.forEach(itemObj => {
        const name = itemObj.name;
        const node = itemObj.nodeData; 
        const listItem = document.createElement('div');
        listItem.className = 'p-1 hover:bg-blue-100 dark:hover:bg-blue-700 cursor-pointer border-b dark:border-slate-600 text-xs flex items-center';
        listItem.draggable = node.type === 'file'; 

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
        } else { 
            listItem.addEventListener('click', () => {
                listDiv.querySelectorAll('.bg-blue-200').forEach(el => el.classList.remove('bg-blue-200', 'dark:bg-blue-600'));
                listItem.classList.add('bg-blue-200', 'dark:bg-blue-600');
                window.selectedSoundForPreview = {
                    fileName: name,
                    fullPath: node.fullPath, 
                    libraryName: window.currentLibraryName
                };
                if(previewSoundBtn) previewSoundBtn.disabled = false;
            });
            listItem.addEventListener('dragstart', (event) => {
                const soundData = {
                    fileName: name,
                    fullPath: node.fullPath, 
                    libraryName: window.currentLibraryName,
                    type: 'sound-browser-item' 
                };
                event.dataTransfer.setData("application/json", JSON.stringify(soundData));
                event.dataTransfer.effectAllowed = "copy";
                console.log("[UI] Drag Start Sound Browser:", soundData);
            });
        }
        listDiv.appendChild(listItem);
    });
}

// --- Mixer --- 
 function openMixerWindow(savedState = null) { 
    const windowId = 'mixer';
    if (window.openWindows[windowId] && !savedState) {
        window.openWindows[windowId].restore();
        return window.openWindows[windowId];
    }

    const contentContainer = document.createElement('div');
    contentContainer.id = 'mixerContentContainer';
    contentContainer.className = 'p-2 overflow-x-auto whitespace-nowrap h-full bg-gray-100 dark:bg-slate-800'; 

    const mixerOptions = {
        width: Math.min(800, (document.getElementById('desktop')?.offsetWidth || 800) - 40),
        height: 300, minWidth: 300, minHeight: 200,
        initialContentKey: windowId
    };
    if (savedState) { 
        mixerOptions.x = parseInt(savedState.left);
        mixerOptions.y = parseInt(savedState.top);
        mixerOptions.width = parseInt(savedState.width);
        mixerOptions.height = parseInt(savedState.height);
        mixerOptions.zIndex = savedState.zIndex;
        if (savedState.isMinimized) mixerOptions.isMinimized = true;
    }

    const mixerWindow = window.createWindow(windowId, 'Mixer', contentContainer, mixerOptions);

    if (mixerWindow && mixerWindow.element) {
        if (typeof updateMixerWindow === 'function') updateMixerWindow(); 
    } else { return null; }
    return mixerWindow;
}
 function updateMixerWindow() { 
    const mixerWindow = window.openWindows['mixer'];
    if (!mixerWindow || !mixerWindow.element || mixerWindow.isMinimized) return;

    const container = mixerWindow.element.querySelector('#mixerContentContainer');
    if (!container) return;

    renderMixer(container); 
}
 function renderMixer(container) { 
    const tracks = typeof window.getTracks === 'function' ? window.getTracks() : [];
    console.log('[UI - renderMixer] Called. Number of tracks found:', tracks.length, 'Tracks:', tracks); 
    
    container.innerHTML = ''; 
    
    const masterTrackDiv = document.createElement('div');
    masterTrackDiv.className = 'mixer-track master-track inline-block align-top p-1.5 border rounded bg-gray-200 dark:bg-slate-700 dark:border-slate-600 shadow w-24 mr-2 text-xs';
    masterTrackDiv.innerHTML = `
        <div class="track-name font-semibold truncate mb-1 dark:text-slate-200" title="Master">Master</div>
        <div id="masterVolumeKnob-mixer-placeholder" class="h-16 mx-auto mb-1"></div>
        <div id="mixerMasterMeterContainer" class="h-3 w-full bg-gray-300 dark:bg-slate-600 rounded border border-gray-400 dark:border-slate-500 overflow-hidden mt-1">
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
        masterVolKnobPlaceholder.innerHTML = '';
        masterVolKnobPlaceholder.appendChild(masterVolKnob.element);
    }


    tracks.forEach(track => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'mixer-track inline-block align-top p-1.5 border rounded bg-white dark:bg-slate-700 dark:border-slate-600 shadow w-24 mr-2 text-xs';
        trackDiv.innerHTML = `
            <div class="track-name font-semibold truncate mb-1 dark:text-slate-200" title="${track.name}">${track.name}</div>
            <div id="volumeKnob-mixer-${track.id}-placeholder" class="h-16 mx-auto mb-1"></div>
            <div class="grid grid-cols-2 gap-0.5 my-1">
                <button id="mixerMuteBtn-${track.id}" title="Mute" class="px-1 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600 ${track.isMuted ? 'muted' : ''}">${track.isMuted ? 'U' : 'M'}</button>
                <button id="mixerSoloBtn-${track.id}" title="Solo" class="px-1 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600 ${track.isSoloed ? 'soloed' : ''}">${track.isSoloed ? 'U' : 'S'}</button>
            </div>
            <div id="mixerTrackMeterContainer-${track.id}" class="h-3 w-full bg-gray-200 dark:bg-slate-600 rounded border border-gray-300 dark:border-slate-500 overflow-hidden mt-0.5">
                <div id="mixerTrackMeterBar-${track.id}" class="h-full bg-green-500 transition-all duration-50 ease-linear" style="width: 0%;"></div>
            </div>
        `;
        
        console.log(`[UI - renderMixer] Creating trackDiv for track ID: ${track.id}`, trackDiv); 

        trackDiv.addEventListener('click', (event) => {
            console.log(`[UI - renderMixer] CLICK event on trackDiv for ID: ${track.id}`, event.target);
        });
        console.log(`[UI - renderMixer] Basic CLICK listener ADDED for track ID: ${track.id}`); 


        console.log(`[UI - renderMixer] Attempting to add CONTEXTMENU listener for track ID: ${track.id}`); 
        trackDiv.addEventListener('contextmenu', (event) => {
            event.preventDefault(); 
            console.log(`[UI - renderMixer] CONTEXTMENU event triggered for track ID: ${track.id}`); 
            
            const currentTrack = typeof window.getTrackById === 'function' ? window.getTrackById(track.id) : null;
            if (!currentTrack) {
                console.log(`[UI - renderMixer] Context menu: Track ${track.id} not found via getTrackById.`);
                return;
            }
            console.log(`[UI - renderMixer] Context menu: currentTrack found:`, currentTrack.name);


            const menuItems = [
                {
                    label: "Open Inspector",
                    action: () => window.handleOpenTrackInspector(currentTrack.id)
                },
                {
                    label: "Open Effects Rack",
                    action: () => window.handleOpenEffectsRack(currentTrack.id)
                },
                {
                    label: "Open Sequencer",
                    action: () => window.handleOpenSequencer(currentTrack.id)
                },
                { separator: true },
                {
                    label: currentTrack.isMuted ? "Unmute" : "Mute",
                    action: () => window.handleTrackMute(currentTrack.id)
                },
                {
                    label: (typeof window.getSoloedTrackId === 'function' && window.getSoloedTrackId() === currentTrack.id) ? "Unsolo" : "Solo",
                    action: () => window.handleTrackSolo(currentTrack.id)
                },
                {
                    label: (typeof window.getArmedTrackId === 'function' && window.getArmedTrackId() === currentTrack.id) ? "Disarm Input" : "Arm for Input",
                    action: () => window.handleTrackArm(currentTrack.id)
                },
                { separator: true },
                {
                    label: "Remove Track",
                    action: () => window.handleRemoveTrack(currentTrack.id),
                    disabled: false
                }
            ];
            console.log(`[UI - renderMixer] Context menu: menuItems defined:`, menuItems);

            if (typeof createContextMenu === 'function') {
                 console.log(`[UI - renderMixer] Context menu: Calling imported createContextMenu`);
                createContextMenu(event, menuItems);
            } else if (typeof window.createContextMenu === 'function') {
                console.log(`[UI - renderMixer] Context menu: Calling window.createContextMenu`);
                window.createContextMenu(event, menuItems);
            } else {
                console.error("[UI - renderMixer] createContextMenu function is not available.");
            }
        });
        console.log(`[UI - renderMixer] CONTEXTMENU listener setup completed for track ID: ${track.id}`); 
        
        container.appendChild(trackDiv);


        const volKnobPlaceholder = trackDiv.querySelector(`#volumeKnob-mixer-${track.id}-placeholder`);
        if (volKnobPlaceholder) {
            const volKnob = createKnob({
                label: `Vol ${track.id}`, min: 0, max: 1.2, step: 0.01, initialValue: track.previousVolumeBeforeMute, decimals: 2, trackRef: track,
                onValueChange: (val, oldVal, fromInteraction) => { track.setVolume(val, fromInteraction); }
            });
            volKnobPlaceholder.innerHTML = '';
            volKnobPlaceholder.appendChild(volKnob.element);
        }

        trackDiv.querySelector(`#mixerMuteBtn-${track.id}`).addEventListener('click', () => handleTrackMute(track.id));
        trackDiv.querySelector(`#mixerSoloBtn-${track.id}`).addEventListener('click', () => handleTrackSolo(track.id));
    });
}

// --- Sequencer DOM Rework ---
function buildSequencerContentDOM(track, rows, rowLabels, numBars) {
    const stepsPerBar = Constants.STEPS_PER_BAR;
    const totalSteps = numBars * stepsPerBar;
    let html = `<div class="sequencer-container p-1 text-xs overflow-auto h-full dark:bg-slate-900 dark:text-slate-300">`;
    html += `<div class="controls mb-1 flex justify-between items-center sticky top-0 left-0 bg-gray-200 dark:bg-slate-800 p-1 z-30 border-b dark:border-slate-700">
                <span class="font-semibold">${track.name} - ${numBars} Bar${numBars > 1 ? 's' : ''} (${totalSteps} steps)</span>
                <div>
                    <label for="seqLengthInput-${track.id}">Bars: </label>
                    <input type="number" id="seqLengthInput-${track.id}" value="${numBars}" min="1" max="${Constants.MAX_BARS || 16}" class="w-12 p-0.5 border rounded text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                </div>
             </div>`;

    html += `<div class="sequencer-grid-layout" style="display: grid; grid-template-columns: 50px repeat(${totalSteps}, 20px); grid-auto-rows: 20px; gap: 0px; width: fit-content; position: relative; top: 0; left: 0;">`;

    html += `<div class="sequencer-header-cell sticky top-0 left-0 z-20 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700"></div>`;

    for (let i = 0; i < totalSteps; i++) {
        html += `<div class="sequencer-header-cell sticky top-0 z-10 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700 flex items-center justify-center text-[10px] text-gray-500 dark:text-slate-400">
                    ${(i % stepsPerBar === 0) ? (Math.floor(i / stepsPerBar) + 1) : ((i % 4 === 0) ? '&#x2022;' : '')}
                 </div>`;
    }

    for (let i = 0; i < rows; i++) {
        let labelText = rowLabels[i] || `R${i + 1}`;
        if (labelText.length > 6) labelText = labelText.substring(0,5) + "..";
        html += `<div class="sequencer-label-cell sticky left-0 z-10 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700 flex items-center justify-end pr-1 text-[10px]" title="${rowLabels[i] || ''}">${labelText}</div>`;

        for (let j = 0; j < totalSteps; j++) {
            const stepData = track.sequenceData[i]?.[j];
            let activeClass = '';
            if (stepData?.active) {
                if (track.type === 'Synth') activeClass = 'active-synth';
                else if (track.type === 'Sampler') activeClass = 'active-sampler';
                else if (track.type === 'DrumSampler') activeClass = 'active-drum-sampler';
                else if (track.type === 'InstrumentSampler') activeClass = 'active-instrument-sampler';
            }
            
            let beatBlockClass = '';
            if (Math.floor((j % stepsPerBar) / 4) % 2 === 0) { 
                beatBlockClass = 'bg-gray-50 dark:bg-slate-700'; 
            } else { 
                beatBlockClass = 'bg-white dark:bg-slate-750'; 
            }
            if (j % stepsPerBar === 0 && j > 0) {
                beatBlockClass += ' border-l-2 border-l-gray-400 dark:border-l-slate-600';
            } else if (j > 0 && j % (stepsPerBar / 2) === 0) { 
                 beatBlockClass += ' border-l-gray-300 dark:border-l-slate-650';
            } else if (j > 0 && j % (stepsPerBar / 4) === 0) { 
                 beatBlockClass += ' border-l-gray-200 dark:border-l-slate-675';
            }

            html += `<div class="sequencer-step-cell ${activeClass} ${beatBlockClass} border-r border-b border-gray-200 dark:border-slate-600"
                         data-row="${i}" data-col="${j}" title="R${i+1},S${j+1}"></div>`;
        }
    }
    html += `</div></div>`; 
    return html;
}

// --- MODIFIED openTrackSequencerWindow (with Erase Sequence & Double Sequence Length) ---
 function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track) {
        console.error(`[UI] Track ${trackId} not found for sequencer.`);
        return null;
    }

    const windowId = `sequencerWin-${trackId}`;

    if (forceRedraw && window.openWindows[windowId]) {
        console.log(`[UI - SeqWindow] forceRedraw true for existing window ${windowId}. Closing it first to ensure content refresh.`);
        try {
            window.openWindows[windowId].close(true); 
        } catch (e) {
            console.warn(`[UI - SeqWindow] Error closing existing window during forceRedraw for ${windowId}:`, e);
        }
    }

    if (window.openWindows[windowId] && !forceRedraw && !savedState) {
        window.openWindows[windowId].restore();
        if (typeof window.setActiveSequencerTrackId === 'function') window.setActiveSequencerTrackId(trackId);
        return window.openWindows[windowId];
    }

    let rows, rowLabels;
    const numBars = Math.max(1, track.sequenceLength / Constants.STEPS_PER_BAR);

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
        rows = 0;
        rowLabels = [];
    }

    const contentDOM = buildSequencerContentDOM(track, rows, rowLabels, numBars);
    const seqOptions = {
        width: Math.min(900, (document.getElementById('desktop')?.offsetWidth || 900) - 40),
        height: 400,
        minWidth: 400,
        minHeight: 250,
        initialContentKey: windowId,
        onCloseCallback: () => {
            if (track) track.sequencerWindow = null;
            if (typeof window.getActiveSequencerTrackId === 'function' && window.getActiveSequencerTrackId() === trackId && typeof window.setActiveSequencerTrackId === 'function') {
                window.setActiveSequencerTrackId(null);
            }
        }
    };

    if (savedState) {
        seqOptions.x = parseInt(savedState.left);
        seqOptions.y = parseInt(savedState.top);
        seqOptions.width = parseInt(savedState.width);
        seqOptions.height = parseInt(savedState.height);
        seqOptions.zIndex = savedState.zIndex;
        if (savedState.isMinimized) seqOptions.isMinimized = true;
    }

    const sequencerWindow = window.createWindow(windowId, `Sequencer: ${track.name}`, contentDOM, seqOptions);

    if (sequencerWindow && sequencerWindow.element) {
        track.sequencerWindow = sequencerWindow;
        if (typeof window.setActiveSequencerTrackId === 'function') window.setActiveSequencerTrackId(trackId);

        const grid = sequencerWindow.element.querySelector('.sequencer-grid-layout'); 
        const controlsDiv = sequencerWindow.element.querySelector('.sequencer-container .controls'); 

        const sequencerContextMenuHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
        
            const currentTrackForMenu = typeof window.getTrackById === 'function' ? window.getTrackById(track.id) : null;
            if (!currentTrackForMenu) {
                console.error("[UI - Sequencer Context] Could not get current track for menu.");
                return;
            }
        
            const menuItems = [
                {
                    label: "Copy Sequence",
                    action: () => {
                        if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Copy Sequence from ${currentTrackForMenu.name}`);
                        const sequenceDataCopy = currentTrackForMenu.sequenceData ? JSON.parse(JSON.stringify(currentTrackForMenu.sequenceData)) : [];
                        
                        window.clipboardData = {
                            type: 'sequence', 
                            sourceTrackType: currentTrackForMenu.type,
                            data: sequenceDataCopy, 
                            sequenceLength: currentTrackForMenu.sequenceLength,
                        };
                        showNotification(`Sequence for "${currentTrackForMenu.name}" copied.`, 2000);
                        console.log('[UI - Sequencer Context] Copied sequence:', window.clipboardData);
                    }
                },
                {
                    label: "Paste Sequence",
                    action: () => {
                        if (!window.clipboardData || window.clipboardData.type !== 'sequence' || !window.clipboardData.data) {
                            showNotification("Clipboard is empty or does not contain full sequence data.", 2000);
                            return;
                        }
                        if (window.clipboardData.sourceTrackType !== currentTrackForMenu.type) {
                            showNotification(`Cannot paste sequence: Track types do not match (Source: ${window.clipboardData.sourceTrackType}, Target: ${currentTrackForMenu.type}).`, 3000);
                            return;
                        }
        
                        if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Paste Sequence into ${currentTrackForMenu.name}`);
                        
                        currentTrackForMenu.sequenceData = JSON.parse(JSON.stringify(window.clipboardData.data));
                        currentTrackForMenu.sequenceLength = window.clipboardData.sequenceLength;
        
                        currentTrackForMenu.setSequenceLength(currentTrackForMenu.sequenceLength, true); 
                        
                        if(typeof window.openTrackSequencerWindow === 'function'){
                            console.log(`[UI - Sequencer Context] Forcing redraw of sequencer for track ${currentTrackForMenu.id} after paste.`);
                            window.openTrackSequencerWindow(currentTrackForMenu.id, true, null); 
                        }
                        showNotification(`Sequence pasted into "${currentTrackForMenu.name}".`, 2000);
                    },
                    disabled: (!window.clipboardData || window.clipboardData.type !== 'sequence' || !window.clipboardData.data || (window.clipboardData.sourceTrackType && currentTrackForMenu && window.clipboardData.sourceTrackType !== currentTrackForMenu.type))
                },
                { separator: true },
                {
                    label: "Erase Sequence",
                    action: () => {
                        if (!currentTrackForMenu) return;
                        if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Erase Sequence for ${currentTrackForMenu.name}`);
                        
                        let numRowsForErase = 0;
                        if (currentTrackForMenu.type === 'Synth' || currentTrackForMenu.type === 'InstrumentSampler') {
                            numRowsForErase = Constants.synthPitches.length;
                        } else if (currentTrackForMenu.type === 'Sampler') {
                            numRowsForErase = currentTrackForMenu.slices ? (currentTrackForMenu.slices.length > 0 ? currentTrackForMenu.slices.length : Constants.numSlices) : Constants.numSlices;
                        } else if (currentTrackForMenu.type === 'DrumSampler') {
                            numRowsForErase = Constants.numDrumSamplerPads;
                        }
                        
                        currentTrackForMenu.sequenceData = Array(numRowsForErase).fill(null).map(() => Array(currentTrackForMenu.sequenceLength).fill(null));
                        
                        currentTrackForMenu.setSequenceLength(currentTrackForMenu.sequenceLength, true); 

                        if(typeof window.openTrackSequencerWindow === 'function'){
                            console.log(`[UI - Sequencer Context] Forcing redraw of sequencer for track ${currentTrackForMenu.id} after erase.`);
                            window.openTrackSequencerWindow(currentTrackForMenu.id, true, null);
                        }
                        showNotification(`Sequence erased for "${currentTrackForMenu.name}".`, 2000);
                        console.log('[UI - Sequencer Context] Erased sequence for track:', currentTrackForMenu.id);
                    }
                },
                {
                    label: "Double Sequence Length",
                    action: () => {
                        if (!currentTrackForMenu) return;

                        const currentNumBars = currentTrackForMenu.sequenceLength / Constants.STEPS_PER_BAR;
                        if (currentNumBars * 2 > Constants.MAX_BARS) {
                            showNotification(`Cannot double: Exceeds maximum of ${Constants.MAX_BARS} bars.`, 3000);
                            return;
                        }

                        if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Double Sequence Length for ${currentTrackForMenu.name}`);

                        const originalSequenceData = JSON.parse(JSON.stringify(currentTrackForMenu.sequenceData || []));
                        const oldLength = currentTrackForMenu.sequenceLength;
                        const newLength = oldLength * 2;
                        
                        let numRows = 0;
                        if (currentTrackForMenu.type === 'Synth' || currentTrackForMenu.type === 'InstrumentSampler') {
                            numRows = Constants.synthPitches.length;
                        } else if (currentTrackForMenu.type === 'Sampler') {
                            numRows = currentTrackForMenu.slices ? (currentTrackForMenu.slices.length > 0 ? currentTrackForMenu.slices.length : Constants.numSlices) : Constants.numSlices;
                        } else if (currentTrackForMenu.type === 'DrumSampler') {
                            numRows = Constants.numDrumSamplerPads;
                        } else { 
                            numRows = originalSequenceData.length; // Fallback, though should match a type
                        }
                        // Ensure originalSequenceData has the correct number of rows for iteration, padding with empty arrays if necessary
                        while (originalSequenceData.length < numRows) {
                            originalSequenceData.push([]);
                        }


                        const doubledSequenceData = Array(numRows).fill(null).map(() => Array(newLength).fill(null));

                        for (let r = 0; r < numRows; r++) {
                            const originalRow = originalSequenceData[r] || []; // Handle potentially sparse rows from original
                            for (let c = 0; c < oldLength; c++) {
                                if (originalRow[c]) { 
                                    doubledSequenceData[r][c] = JSON.parse(JSON.stringify(originalRow[c]));
                                    doubledSequenceData[r][c + oldLength] = JSON.parse(JSON.stringify(originalRow[c]));
                                }
                            }
                        }
                        
                        currentTrackForMenu.sequenceData = doubledSequenceData;
                        // Important: Set the length property on the track *before* calling setSequenceLength
                        currentTrackForMenu.sequenceLength = newLength; 
                        
                        currentTrackForMenu.setSequenceLength(newLength, true); 

                        if(typeof window.openTrackSequencerWindow === 'function'){
                             window.openTrackSequencerWindow(currentTrackForMenu.id, true, null);
                        }
                        showNotification(`Sequence length doubled for "${currentTrackForMenu.name}".`, 2000);
                    }
                }
            ];
            
            if (typeof createContextMenu === 'function') {
                createContextMenu(event, menuItems);
            } else {
                console.error("[UI - Sequencer Context] createContextMenu function is not available.");
            }
        };

        if (grid) {
            grid.addEventListener('contextmenu', sequencerContextMenuHandler);
        } else {
            console.error(`[UI - openTrackSequencerWindow] Sequencer grid layout element not found for track ${track.id} to attach context menu.`);
        }
        if (controlsDiv) { 
            controlsDiv.addEventListener('contextmenu', sequencerContextMenuHandler);
        }  else {
            console.error(`[UI - openTrackSequencerWindow] Sequencer controls div element not found for track ${track.id} to attach context menu.`);
        }


        if (grid) { 
            grid.addEventListener('click', (e) => {
                const targetCell = e.target.closest('.sequencer-step-cell');
                if (targetCell) {
                    const row = parseInt(targetCell.dataset.row);
                    const col = parseInt(targetCell.dataset.col);

                    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) { 
                        if (!track.sequenceData[row]) track.sequenceData[row] = Array(track.sequenceLength).fill(null);
                        const currentStepData = track.sequenceData[row][col];
                        const isActive = !(currentStepData && currentStepData.active);

                        if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Step (${row + 1},${col + 1}) on ${track.name}`);
                        track.sequenceData[row][col] = isActive ? { active: true, velocity: Constants.defaultVelocity } : null;

                        if(typeof window.updateSequencerCellUI === 'function') {
                            window.updateSequencerCellUI(targetCell, track.type, isActive);
                        }
                    }
                }
            });
        }
        const lengthInput = sequencerWindow.element.querySelector(`#seqLengthInput-${track.id}`);
        if (lengthInput) {
            lengthInput.addEventListener('change', (e) => {
                const newNumBarsInput = parseInt(e.target.value);
                if (!isNaN(newNumBarsInput) && newNumBarsInput >= 1 && newNumBarsInput <= (Constants.MAX_BARS || 16)) { 
                    track.setSequenceLength(newNumBarsInput * Constants.STEPS_PER_BAR);
                } else {
                    e.target.value = track.sequenceLength / Constants.STEPS_PER_BAR; 
                }
            });
        }

    } else {
        if (track) track.sequencerWindow = null;
        return null;
    }
    return sequencerWindow;
}
// --- END MODIFIED openTrackSequencerWindow ---

// --- Waveform Drawing Functions ---
function drawWaveform(track) { 
    if (!track || !track.waveformCanvasCtx || !track.audioBuffer || !track.audioBuffer.loaded) {
        if (track && track.waveformCanvasCtx) { 
            const canvas = track.waveformCanvasCtx.canvas;
            track.waveformCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
             track.waveformCanvasCtx.fillStyle = track.waveformCanvasCtx.canvas.classList.contains('dark') ? '#334155' : '#e0e0e0'; 
             track.waveformCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
             track.waveformCanvasCtx.fillStyle = track.waveformCanvasCtx.canvas.classList.contains('dark') ? '#94a3b8' : '#a0a0a0'; 
             track.waveformCanvasCtx.textAlign = 'center';
             track.waveformCanvasCtx.fillText('No audio loaded or processed', canvas.width / 2, canvas.height / 2);
        }
        return;
    }
    const canvas = track.waveformCanvasCtx.canvas;
    const ctx = track.waveformCanvasCtx;
    const buffer = track.audioBuffer.get(); 
    const data = buffer.getChannelData(0); 
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    ctx.fillStyle = ctx.canvas.classList.contains('dark') ? '#1e293b' : '#f0f0f0'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = ctx.canvas.classList.contains('dark') ? '#60a5fa' : '#3b82f6'; 

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

    track.slices.forEach((slice, index) => {
        if (slice.duration <= 0) return;
        const startX = (slice.offset / buffer.duration) * canvas.width;
        const endX = ((slice.offset + slice.duration) / buffer.duration) * canvas.width;
        ctx.fillStyle = index === track.selectedSliceForEdit ? 'rgba(255, 0, 0, 0.3)' : (ctx.canvas.classList.contains('dark') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 0, 255, 0.15)');
        ctx.fillRect(startX, 0, endX - startX, canvas.height);
        ctx.strokeStyle = index === track.selectedSliceForEdit ? 'rgba(255,0,0,0.7)' : (ctx.canvas.classList.contains('dark') ? 'rgba(96, 165, 250, 0.5)' : 'rgba(0,0,255,0.4)');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, 0); ctx.lineTo(startX, canvas.height);
        ctx.moveTo(endX, 0); ctx.lineTo(endX, canvas.height);
        ctx.stroke();
        ctx.fillStyle = index === track.selectedSliceForEdit ? '#cc0000' : (ctx.canvas.classList.contains('dark') ? '#93c5fd' : '#0000cc');
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`S${index + 1}`, startX + 2, 10);
    });
}

function drawInstrumentWaveform(track) { 
    if (!track || !track.instrumentWaveformCanvasCtx || !track.instrumentSamplerSettings.audioBuffer || !track.instrumentSamplerSettings.audioBuffer.loaded) {
         if (track && track.instrumentWaveformCanvasCtx) { 
            const canvas = track.instrumentWaveformCanvasCtx.canvas;
            track.instrumentWaveformCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
             track.instrumentWaveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#334155' : '#e0e0e0';
             track.instrumentWaveformCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
             track.instrumentWaveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#94a3b8' : '#a0a0a0';
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

    ctx.fillStyle = canvas.classList.contains('dark') ? '#1e293b' : '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = canvas.classList.contains('dark') ? '#34d399' : '#10b981'; 
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

    if (track.instrumentSamplerSettings.loop) {
        const loopStartX = (track.instrumentSamplerSettings.loopStart / buffer.duration) * canvas.width;
        const loopEndX = (track.instrumentSamplerSettings.loopEnd / buffer.duration) * canvas.width;
        ctx.fillStyle = canvas.classList.contains('dark') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 255, 0, 0.2)';
        ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, canvas.height);
        ctx.strokeStyle = canvas.classList.contains('dark') ? 'rgba(52, 211, 153, 0.6)' : 'rgba(0,200,0,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(loopStartX, 0); ctx.lineTo(loopStartX, canvas.height);
        ctx.moveTo(loopEndX, 0); ctx.lineTo(loopEndX, canvas.height);
        ctx.stroke();
    }
}
// --- END Waveform Drawing Functions ---

function renderSamplePads(track) { 
    const inspector = track.inspectorWindow?.element;
    if (!inspector || track.type !== 'Sampler') return;
    const padsContainer = inspector.querySelector(`#samplePadsContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = ''; 

    track.slices.forEach((slice, index) => {
        const pad = document.createElement('button');
        pad.className = `sample-pad p-2 border rounded text-xs h-12 flex items-center justify-center dark:border-slate-500 dark:text-slate-300
                         ${track.selectedSliceForEdit === index ? 'bg-blue-200 border-blue-400 dark:bg-blue-700 dark:border-blue-500' : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500'}
                         ${(!track.audioBuffer || !track.audioBuffer.loaded || slice.duration <= 0) ? 'opacity-50' : ''}`;
        pad.textContent = `S${index + 1}`;
        pad.title = `Slice ${index + 1}`;
        if (!track.audioBuffer || !track.audioBuffer.loaded || slice.duration <= 0) {
            pad.disabled = true;
        }

        pad.addEventListener('click', () => {
            track.selectedSliceForEdit = index;
            if (typeof window.playSlicePreview === 'function') window.playSlicePreview(track.id, index);
            renderSamplePads(track); 
            if (typeof updateSliceEditorUI === 'function') updateSliceEditorUI(track); 
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
    if (!slice) return; 

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

function renderDrumSamplerPads(track) { 
    const inspector = track.inspectorWindow?.element;
    if (!inspector || track.type !== 'DrumSampler') return;
    const padsContainer = inspector.querySelector(`#drumPadsGridContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = ''; 

    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button');
        padEl.className = `drum-pad p-2 border rounded text-xs h-12 flex items-center justify-center dark:border-slate-500 dark:text-slate-300
                         ${track.selectedDrumPadForEdit === index ? 'bg-blue-200 border-blue-400 dark:bg-blue-700 dark:border-blue-500' : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500'}
                         ${(!padData.audioBufferDataURL && !padData.dbKey && padData.status !== 'loaded') ? 'opacity-60' : ''}`; 
        padEl.textContent = `Pad ${index + 1}`;
        padEl.title = padData.originalFileName || `Pad ${index + 1}`;

        if (padData.status === 'missing' || padData.status === 'error') {
            padEl.classList.add(padData.status === 'missing' ? 'border-yellow-500' : 'border-red-500');
            padEl.classList.add('text-black', 'dark:text-white'); 
        }


        padEl.addEventListener('click', () => {
            track.selectedDrumPadForEdit = index;
            if (typeof window.playDrumSamplerPadPreview === 'function' && padData.status === 'loaded') {
                 window.playDrumSamplerPadPreview(track.id, index);
            } else if (padData.status !== 'loaded') {
                showNotification(`Sample for Pad ${index+1} not loaded. Click to load.`, 2000);
            }
            renderDrumSamplerPads(track); 
            if (typeof updateDrumPadControlsUI === 'function') updateDrumPadControlsUI(track); 
        });
        padsContainer.appendChild(padEl);
    });
}

function highlightPlayingStep(col, trackType, gridElement) { 
    if (!gridElement) return;
    const previouslyPlaying = gridElement.querySelector('.sequencer-step-cell.playing');
    if (previouslyPlaying) previouslyPlaying.classList.remove('playing');

    const currentCells = gridElement.querySelectorAll(`.sequencer-step-cell[data-col="${col}"]`);
    currentCells.forEach(cell => cell.classList.add('playing'));
}


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
