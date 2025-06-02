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
function buildSynthSpecificInspectorDOM(track) {
    const engineType = track.synthEngineType || 'MonoSynth';
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    let controlsHTML = `<div id="synthEngineControls-${track.id}" class="grid grid-cols-2 md:grid-cols-3 gap-2 p-1">`;
    definitions.forEach(def => { controlsHTML += `<div id="<span class="math-inline">\{def\.idPrefix\}\-</span>{track.id}-placeholder"></div>`; });
    controlsHTML += `</div>`;
    return controlsHTML;
}

function buildSamplerSpecificInspectorDOM(track) {
    return `<div class="sampler-controls p-1 space-y-2">
        <div id="dropZoneContainer-<span class="math-inline">\{track\.id\}\-sampler" class\="mb\-2"\></div\>
<div class\="waveform\-section border rounded p\-1 bg\-gray\-100 dark\:bg\-slate\-700 dark\:border\-slate\-600"\>
<canvas id\="waveformCanvas\-</span>{track.id}" class="w-full h-24 bg-white dark:bg-slate-800 rounded shadow-inner"></canvas>
        </div>
        <div class="slice-editor-controls mt-2 p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1">
            <h4 class="text-xs font-semibold dark:text-slate-200">Slice Editor (Selected: <span id="selectedSliceInfo-<span class="math-inline">\{track\.id\}"\>1</span\>\)</h4\>
<div class\="grid grid\-cols\-2 sm\:grid\-cols\-3 gap\-x\-2 gap\-y\-1 items\-center text\-xs"\>
<div id\="sliceVolumeSlider\-</span>{track.id}-placeholder"></div>
                <div id="slicePitchKnob-<span class="math-inline">\{track\.id\}\-placeholder"\></div\>
<button id\="sliceLoopToggle\-</span>{track.id}" class="px-1.5 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Loop: OFF</button>
                <button id="sliceReverseToggle-<span class="math-inline">\{track\.id\}" class\="px\-1\.5 py\-0\.5 text\-xs border rounded dark\:border\-slate\-500 dark\:text\-slate\-300 dark\:hover\:bg\-slate\-600"\>Rev\: OFF</button\>
</div\>
<div class\="text\-xs font\-medium mt\-1 dark\:text\-slate\-300"\>Envelope\:</div\>
<div class\="grid grid\-cols\-2 sm\:grid\-cols\-4 gap\-x\-2 gap\-y\-1 items\-center text\-xs"\>
<div id\="sliceEnvAttackSlider\-</span>{track.id}-placeholder"></div>
                <div id="sliceEnvDecaySlider-<span class="math-inline">\{track\.id\}\-placeholder"\></div\>
<div id\="sliceEnvSustainSlider\-</span>{track.id}-placeholder"></div>
                <div id="sliceEnvReleaseSlider-<span class="math-inline">\{track\.id\}\-placeholder"\></div\>
</div\>
</div\>
<div id\="samplePadsContainer\-</span>{track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
        <div><button id="slicerPolyphonyToggle-${track.id}" class="text-xs px-2 py-1 border rounded mt-1 dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Mode: Poly</button></div>
    </div>`;
}

function buildDrumSamplerSpecificInspectorDOM(track) {
    return `<div class="drum-sampler-controls p-1 space-y-2">
        <div class="selected-pad-controls p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1">
            <h4 class="text-xs font-semibold dark:text-slate-200">Edit Pad: <span id="selectedDrumPadInfo-<span class="math-inline">\{track\.id\}"\>1</span\></h4\>
<div id\="drumPadDropZoneContainer\-</span>{track.id}-<span class="math-inline">\{track\.selectedDrumPadForEdit\}" class\="mb\-1 text\-xs"\></div\>
<div class\="grid grid\-cols\-2 gap\-x\-2 gap\-y\-1 items\-center text\-xs"\>
<div id\="drumPadVolumeKnob\-</span>{track.id}-placeholder"></div>
                <div id="drumPadPitchKnob-<span class="math-inline">\{track\.id\}\-placeholder"\></div\>
</div\>
<div class\="text\-xs font\-medium mt\-1 dark\:text\-slate\-300"\>Envelope\:</div\>
<div class\="grid grid\-cols\-2 sm\:grid\-cols\-4 gap\-x\-2 gap\-y\-1 items\-center text\-xs"\>
<div id\="drumPadEnvAttack\-</span>{track.id}-placeholder"></div>
                <div id="drumPadEnvDecay-<span class="math-inline">\{track\.id\}\-placeholder"\></div\>
<div id\="drumPadEnvSustain\-</span>{track.id}-placeholder"></div>
                <div id="drumPadEnvRelease-<span class="math-inline">\{track\.id\}\-placeholder"\></div\>
</div\>
<div class\="text\-xs font\-medium mt\-2 pt\-1 border\-t dark\:border\-slate\-600 dark\:text\-slate\-300"\>Auto\-Stretch\:</div\>
<div class\="grid grid\-cols\-2 gap\-x\-2 gap\-y\-1 items\-center text\-xs"\>
<button id\="drumPadAutoStretchToggle\-</span>{track.id}" class="px-1.5 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Stretch: OFF</button>
                <div>
                    <label for="drumPadStretchBPM-<span class="math-inline">\{track\.id\}" class\="block text\-\[10px\] font\-medium dark\:text\-slate\-400"\>Orig\. BPM\:</label\>
<input type\="number" id\="drumPadStretchBPM\-</span>{track.id}" step="0.1" class="w-full p-0.5 border rounded text-[10px] dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
                </div>
                <div>
                    <label for="drumPadStretchBeats-<span class="math-inline">\{track\.id\}" class\="block text\-\[10px\] font\-medium dark\:text\-slate\-400"\>Beats\:</label\>
<input type\="number" id\="drumPadStretchBeats\-</span>{track.id}" step="0.01" class="w-full p-0.5 border rounded text-[10px] dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
                </div>
            </div>
         </div>
        <div id="drumPadsGridContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
    </div>`;
}

function buildInstrumentSamplerSpecificInspectorDOM(track) {
    return `<div class="instrument-sampler-controls p-1 space-y-2">
        <div id="dropZoneContainer-<span class="math-inline">\{track\.id\}\-instrumentsampler" class\="mb\-2"\></div\>
<div class\="waveform\-section border rounded p\-1 bg\-gray\-100 dark\:bg\-slate\-700 dark\:border\-slate\-600"\>
<canvas id\="instrumentWaveformCanvas\-</span>{track.id}" class="w-full h-24 bg-white dark:bg-slate-800 rounded shadow-inner"></canvas>
        </div>
        <div class="instrument-params-controls mt-2 p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1 text-xs">
            <div class="grid grid-cols-2 gap-2 items-center">
                <div>
                    <label for="instrumentRootNote-<span class="math-inline">\{track\.id\}" class\="block text\-xs font\-medium dark\:text\-slate\-300"\>Root Note\:</label\>
<select id\="instrumentRootNote\-</span>{track.id}" class="w-full p-1 border rounded text-xs bg-gray-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500"></select>
                </div>
                <div>
                    <label for="instrumentLoopToggle-<span class="math-inline">\{track\.id\}" class\="block text\-xs font\-medium dark\:text\-slate\-300"\>Loop\:</label\>
<button id\="instrumentLoopToggle\-</span>{track.id}" class="px-2 py-1 text-xs border rounded w-full dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Loop: OFF</button>
                </div>
                <div>
                    <label for="instrumentLoopStart-<span class="math-inline">\{track\.id\}" class\="block text\-xs font\-medium dark\:text\-slate\-300"\>Loop Start \(s\)\:</label\>
<input type\="number" id\="instrumentLoopStart\-</span>{track.id}" step="0.001" class="w-full p-1 border rounded text-xs dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
                </div>
                <div>
                    <label for="instrumentLoopEnd-<span class="math-inline">\{track\.id\}" class\="block text\-xs font\-medium dark\:text\-slate\-300"\>Loop End \(s\)\:</label\>
<input type\="number" id\="instrumentLoopEnd\-</span>{track.id}" step="0.001" class="w-full p-1 border rounded text-xs dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
                </div>
            </div>
             <div class="text-xs font-medium mt-1 dark:text-slate-300">Envelope:</div>
             <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                <div id="instrumentEnvAttack-<span class="math-inline">\{track\.id\}\-placeholder"\></div\>
<div id\="instrumentEnvDecay\-</span>{track.id}-placeholder"></div>
                <div id="instrumentEnvSustain-<span class="math-inline">\{track\.id\}\-placeholder"\></div\>
<div id\="instrumentEnvRelease\-</span>{track.id}-placeholder"></div>
            </div>
            <div><button id="instrumentPolyphonyToggle-${track.id}" class="text-xs px-2 py-1 border rounded mt-1 dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Mode: Poly</button></div>
        </div>
    </div>`;
}

// --- Specific Inspector Control Initializers ---
// This function was causing the ReferenceError. It is now defined.
function buildSynthEngineControls(track, container, engineType) {
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    definitions.forEach(def => {
        const placeholder = container.querySelector(`#<span class="math-inline">\{def\.idPrefix\}\-</span>{track.id}-placeholder`);
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
        if (def.path.endsWith('.value') && track.instrument?.get) {
            const signalPath = def.path.substring(0, def.path.lastIndexOf('.value'));
            const signalValue = track.instrument.get(signalPath)?.value;
            if (signalValue !== undefined) initialValue = signalValue;
        }

        if (def.type === 'knob') {
            const knob = createKnob({ label: def.label, min: def.min, max: def.max, step: def.step, initialValue, decimals: def.decimals, displaySuffix: def.displaySuffix, trackRef: track, onValueChange: (val) => track.setSynthParam(def.path, val) });
            placeholder.innerHTML = ''; placeholder.appendChild(knob.element); track.inspectorControls[def.idPrefix] = knob;
        } else if (def.type === 'select') {
            const selectEl = document.createElement('select');
            selectEl.id = `<span class="math-inline">\{def\.idPrefix\}\-</span>{track.id}`;
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
        buildSynthEngineControls(track, container, engineType); // Call the function
    }
}

// --- Shared Dropzone Setup for Samplers using Interact.js ---
function setupSamplerInteractDropzone(dropZoneElement, trackId, targetType, padIndex = null) {
    if (!window.interact || !dropZoneElement) return;

    interact(dropZoneElement).unset(); 
    interact(dropZoneElement)
        .dropzone({
            accept: '.dragging-sound-item', 
            ondropactivate: function (event) {
                event.target.classList.add('drop-active');
                event.target.classList.add('border-blue-400'); // Example active style
            },
            ondragenter: function (event) {
                event.target.classList.add('drop-target'); 
                event.target.classList.add('bg-blue-700'); // Example hover style
                if (event.relatedTarget) event.relatedTarget.classList.add('can-drop');
            },
            ondragleave: function (event) {
                event.target.classList.remove('drop-target');
                event.target.classList.remove('bg-blue-700');
                if (event.relatedTarget) event.relatedTarget.classList.remove('can-drop');
            },
            ondrop: function (event) {
                const droppedElement = event.relatedTarget;
                const dropzone = event.target;
                console.log(`[SamplerDropzone] Item dropped on ${targetType} (TrackID: ${trackId}, Pad: ${padIndex})`);

                const jsonDataString = droppedElement.dataset.jsonData;
                if (jsonDataString) {
                    try {
                        const droppedItemData = JSON.parse(jsonDataString);
                        if (droppedItemData.type === 'sound-browser-item') {
                            if (localAppServices.loadSoundFromBrowserToTarget) {
                                localAppServices.loadSoundFromBrowserToTarget(droppedItemData, trackId, targetType, padIndex);
                            } else {
                                console.error("loadSoundFromBrowserToTarget service not available for sampler drop.");
                                showNotification("Error processing dropped sound.", 3000);
                            }
                        } else {
                            console.warn("Dropped item is not a sound-browser-item type:", droppedItemData.type);
                            showNotification("Can only drop sound files here.", 3000);
                        }
                    } catch (e) {
                        console.error("Error parsing jsonData from dropped sampler item:", e);
                        showNotification("Error processing dropped item data.", 3000);
                    }
                } else {
                    console.warn("No jsonData found on dropped sampler item.");
                }
                dropzone.classList.remove('drop-target', 'bg-blue-700');
                if (droppedElement) droppedElement.classList.remove('can-drop');
            },
            ondropdeactivate: function (event) {
                event.target.classList.remove('drop-active', 'drop-target', 'border-blue-400', 'bg-blue-700');
            }
        });
        console.log(`[InspectorEffectsUI] Interact.js dropzone setup for ${targetType}, track ${trackId}, pad ${padIndex}`);
}


function initializeSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-sampler`);
    if (dzContainerEl) {
        const existingAudioData = { originalFileName: track.samplerAudioData.fileName, status: track.samplerAudioData.status || (track.samplerAudioData.fileName ? 'missing' : 'empty') };
        dzContainerEl.innerHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler', null, existingAudioData);
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        const fileInputEl = dzContainerEl.querySelector(`#fileInput-${track.id}`);
        
        if (fileInputEl && localAppServices.loadSampleFile) {
             fileInputEl.onchange = (e) => { localAppServices.loadSampleFile(e, track.id, 'Sampler'); };
        }
        if(dzEl) {
            setupSamplerInteractDropzone(dzEl, track.id, 'Sampler');
        }
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
    // Call updateDrumPadControlsUI initially to setup the dropzone for the currently selected pad
    updateDrumPadControlsUI(track); 
    renderDrumSamplerPads(track); // Renders the grid of pads
}

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler`);
    if (dzContainerEl) {
        const existingAudioData = { originalFileName: track.instrumentSamplerSettings.originalFileName, status: track.instrumentSamplerSettings.status || (track.instrumentSamplerSettings.originalFileName ? 'missing' : 'empty') };
        dzContainerEl.innerHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler', null, existingAudioData);
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        const fileInputEl = dzContainerEl.querySelector(`#instrumentFileInput-${track.id}`);

        if (fileInputEl && localAppServices.loadSampleFile) {
             fileInputEl.onchange = (e) => { localAppServices.loadSampleFile(e, track.id, 'InstrumentSampler'); };
        }
        if (dzEl) {
            setupSamplerInteractDropzone(dzEl, track.id, 'InstrumentSampler');
        }
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
            <div class="common-controls grid <span class="math-inline">\{track\.type \=\=\= 'Audio' ? 'grid\-cols\-4' \: 'grid\-cols\-3'\} gap\-1 mb\-1"\>
<button id\="muteBtn\-</span>{track.id}" title="Mute Track" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 <span class="math-inline">\{track\.isMuted ? 'muted' \: ''\}"\></span>{track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="soloBtn-${track.id}" title="Solo Track" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 <span class="math-inline">\{track\.isSoloed ? 'soloed' \: ''\}"\></span>{track.isSoloed ? 'Unsolo' : 'Solo'}</button>
                <span class="math-inline">\{monitorButtonHTML\}
<button id\="armInputBtn\-</span>{track.id}" title="Arm for MIDI/Keyboard Input or Audio Recording" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 <span class="math-inline">\{armedTrackId \=\=\= track\.id ? 'armed' \: ''\}"\>Arm</button\>
</div\>
<div id\="volumeKnob\-</span>{track.id}-placeholder" class="mb-1"></div>
            <div id="trackMeterContainer-<span class="math-inline">\{track\.id\}" class\="h\-3 w\-full bg\-gray\-200 dark\:bg\-slate\-600 rounded border border\-gray\-300 dark\:border\-slate\-500 overflow\-hidden my\-1"\>
<div id\="trackMeterBar\-</span>{track.id}" class="h-full bg-green-500 transition-all duration-50 ease-linear" style="width: 0%;"></div>
            </div>
            <div class="type-specific-controls mt-1 border-t dark:border-slate-600 pt-1">${specificControlsHTML}</div>
            <div class="inspector-nav grid <span class="math-inline">\{track\.type \=\=\= 'Audio' ? 'grid\-cols\-2' \: 'grid\-cols\-3'\} gap\-1 mt\-2"\>
<button id\="openEffectsBtn\-</span>{track.id}" class="px-1 py-0.5 border rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-500">Effects</button>
                <span class="math-inline">\{sequencerButtonHTML\}
<button id\="removeTrackBtn\-</span>{track.id}" class="px-1 py-0.5 border rounded bg-red-400 hover:bg-red-500 text-white dark:bg-red-600 dark:hover:bg-red-700 dark:border-red-500">Remove</button>
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
    const inspectorOptions = { width: 320, height: 450, minWidth: 280, minHeight: 350, initialContentKey: windowId, onCloseCallback: () => { /* main.js can clear track.inspectorWindow if needed */ } };
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
            if (track.type === 'Audio') {
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

    const sequencerBtn = winEl.querySelector(`#openSequencerBtn-${track.id}`);
    if (sequencerBtn) {
        sequencerBtn.addEventListener('click', () => handleOpenSequencer(track.id));
    }


    const volumeKnobPlaceholder = winEl.querySelector(`#volumeKnob-${track.id}-placeholder`);
    if (volumeKnobPlaceholder) {
        const volumeKnob = createKnob({ label: 'Volume', min: 0, max: 1.2, step: 0.01, initialValue: track.previousVolumeBeforeMute, decimals: 2, trackRef: track, onValueChange: (val, o, fromInteraction) => track.setVolume(val, fromInteraction) });
        volumeKnobPlaceholder.innerHTML = ''; volumeKnobPlaceholder.appendChild(volumeKnob.element); track.inspectorControls.volume = volumeKnob;
    }
}

function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl);
    else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl);
    else if (track.type === 'DrumSampler') initializeDrumSamplerSpecificControls(track, winEl);
    else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl);
}

// --- Modular Effects Rack UI ---
export function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    const ownerId = (ownerType === 'track' && owner) ? owner.id : 'master';
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    return `<div id="effectsRackContent-${ownerId}" class="p-2 space-y-2 overflow-y-auto h-full">
        <h3 class="text-sm font-semibold dark:text-slate-200">Effects Rack: <span class="math-inline">\{ownerName\}</h3\>
<div id\="effectsList\-</span>{ownerId}" class="space-y-1 min-h-[50px] border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600"></div>
        <button id="addEffectBtn-<span class="math-inline">\{ownerId\}" class\="text\-xs px\-2 py\-1 bg\-blue\-500 text\-white rounded hover\:bg\-blue\-600 dark\:bg\-blue\-600 dark\:hover\:bg\-blue\-700"\>Add Effect</button\>
<div id\="effectControlsContainer\-</span>{ownerId}" class="mt-2 space-y-2"></div>
    </div>`;
}

export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    if (!listDiv) return;
    listDiv.innerHTML = '';
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : (localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);

    if (!effectsArray || effectsArray.length === 0) {
        listDiv.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic">No effects added.</p>';
        if (controlsContainer) controlsContainer.innerHTML = ''; return;
    }

    const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};

    effectsArray.forEach((effect, index) => {
        const effectDef = AVAILABLE_EFFECTS_LOCAL[effect.type];
        const displayName = effectDef ? effectDef.displayName : effect.type;
        const item = document.createElement('div');
        item.className = 'effect-item flex justify-between items-center p-1 border-b bg-white dark:bg-slate-800 dark:border-slate-700 rounded-sm shadow-xs text-xs';
        item.innerHTML = `<span class="effect-name flex-grow cursor-pointer hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400" title="Edit <span class="math-inline">\{displayName\}"\></span>{displayName}</span>
            <div class="effect-actions">
                <button class="up-btn text-xs px-0.5 ${index === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-green-600 dark:hover:text-green-400'} dark:text-slate-400" ${index === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                <button class="down-btn text-xs px-0.5 ${index === effectsArray.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:text-green-600 dark:hover:text-green-400'} dark:text-slate-400" ${index === effectsArray.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                <button class="remove-btn text-xs px-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remove Effect">✕</button>
            </div>`;
        item.querySelector('.effect-name').addEventListener('click', () => {
            renderEffectControls(owner, ownerType, effect.id, controlsContainer);
            listDiv.querySelectorAll('.bg-blue-100,.dark\\:bg-blue-700').forEach(el => el.classList.remove('bg-blue-100', 'dark:bg-blue-700', 'border-blue-300', 'dark:border-blue-500'));
            item.classList.add('bg-blue-100', 'dark:bg-blue-700', 'border-blue-300', 'dark:border-blue-500');
        });
        item.querySelector('.up-btn').addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Reorder effect on ${ownerType === 'track' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.reorderEffect(effect.id, index - 1);
            else if (localAppServices.reorderMasterEffect) localAppServices.reorderMasterEffect(effect.id, index - 1);
        });
        item.querySelector('.down-btn').addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Reorder effect on ${ownerType === 'track' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.reorderEffect(effect.id, index + 1);
            else if (localAppServices.reorderMasterEffect) localAppServices.reorderMasterEffect(effect.id, index + 1);
        });
        item.querySelector('.remove-btn').addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Remove ${effect.type} from ${ownerType === 'track' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.removeEffect(effect.id);
            else if (localAppServices.removeMasterEffect) localAppServices.removeMasterEffect(effect.id);
        });
        listDiv.appendChild(item);
    });
}

export function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : (localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);
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
            let currentValue; const pathKeys = paramDef.key.split('.'); let tempVal = effectWrapper.params;
            for (const key of pathKeys) { if (tempVal && typeof tempVal === 'object' && key in tempVal) tempVal = tempVal[key]; else { tempVal = undefined; break; } }
            currentValue = (tempVal !== undefined) ? tempVal : paramDef.defaultValue;

            if (paramDef.type === 'knob') {
                const knob = createKnob({ label: paramDef.label, min: paramDef.min, max: paramDef.max, step: paramDef.step, initialValue: currentValue, decimals: paramDef.decimals, displaySuffix: paramDef.displaySuffix, trackRef: (ownerType === 'track' ? owner : null), onValueChange: (val) => { if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, val); else if (localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, val); } });
                controlWrapper.appendChild(knob.element);
            } else if (paramDef.type === 'select') {
                const label = document.createElement('label'); label.className = 'block text-xs font-medium mb-0.5 dark:text-slate-300'; label.textContent = paramDef.label + ':';
                const select = document.createElement('select'); select.className = 'w-full p-1 border rounded text-xs bg-white dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500';
                paramDef.options.forEach(opt => { const option = document.createElement('option'); option.value = typeof opt === 'object' ? opt.value : opt; option.textContent = typeof opt === 'object' ? opt.text : opt; select.appendChild(option); });
                select.value = currentValue;
                select.addEventListener('change', (e) => {
                    const newValue = e.target.value; const finalValue = (typeof paramDef.defaultValue === 'number' && !isNaN(parseFloat(newValue))) ? parseFloat(newValue) : newValue;
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Change ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' ? owner.name : 'Master'}`);
                    if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, finalValue); else if (localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, finalValue);
                });
                controlWrapper.appendChild(label); controlWrapper.appendChild(select);
            } else if (paramDef.type === 'toggle') {
                const button = document.createElement('button'); button.className = `w-full p-1 border rounded text-xs dark:border-slate-500 dark:text-slate-300 ${currentValue ? 'bg-blue-500 text-white dark:bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'}`; button.textContent = `${paramDef.label}: ${currentValue ? 'ON' : 'OFF'}`;
                button.addEventListener('click', () => {
                    const newValue = !currentValue;
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' ? owner.name : 'Master'}`);
                    if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, newValue); else if (localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, newValue);
                });
                controlWrapper.appendChild(button);
            }
            gridContainer.appendChild(controlWrapper);
        });
    }
    controlsContainer.appendChild(gridContainer);
}

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
        rackWindow.element.querySelector(`#addEffectBtn-${track.id}`)?.addEventListener('click', () => {
            if (localAppServices.showAddEffectModal) localAppServices.showAddEffectModal(track, 'track');
            else console.warn("showAddEffectModal service not available from inspectorEffectsUI");
        });
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
        rackWindow.element.querySelector(`#addEffectBtn-master`)?.addEventListener('click', () => {
            if (localAppServices.showAddEffectModal) localAppServices.showAddEffectModal(null, 'master');
            else console.warn("showAddEffectModal service not available from inspectorEffectsUI");
        });
    }
    return rackWindow;
}


// --- Waveform & Pad Rendering (typically part of inspectors) ---
export function drawWaveform(track) {
    if (!track?.waveformCanvasCtx || !track.audioBuffer?.loaded) {
        if (track?.waveformCanvasCtx) {
            const canvas = track.waveformCanvasCtx.canvas;
            track.waveformCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            track.waveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#334155' : '#e0e0e0';
            track.waveformCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            track.waveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#94a3b8' : '#a0a0a0';
            track.waveformCanvasCtx.textAlign = 'center';
            track.waveformCanvasCtx.fillText('No audio loaded or processed', canvas.width / 2, canvas.height / 2);
        }
        return;
    }
    const canvas = track.waveformCanvasCtx.canvas; const ctx = track.waveformCanvasCtx;
    const buffer = track.audioBuffer.get(); const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width); const amp = canvas.height / 2;
    ctx.fillStyle = ctx.canvas.classList.contains('dark') ? '#1e293b' : '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1; ctx.strokeStyle = ctx.canvas.classList.contains('dark') ? '#60a5fa' : '#3b82f6';
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
        ctx.fillStyle = index === track.selectedSliceForEdit ? '#cc0000' : (ctx.canvas.classList.contains('dark') ? '#93c5fd' : '#0000cc');
        ctx.font = '10px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`S${index + 1}`, startX + 2, 10);
    });
}

export function drawInstrumentWaveform(track) {
    if (!track?.instrumentWaveformCanvasCtx || !track.instrumentSamplerSettings.audioBuffer?.loaded) {
        if (track?.instrumentWaveformCanvasCtx) { /* Draw 'No audio' message */ } return;
    }
    const canvas = track.instrumentWaveformCanvasCtx.canvas; const ctx = track.instrumentWaveformCanvasCtx;
    const buffer = track.instrumentSamplerSettings.audioBuffer.get(); const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width); const amp = canvas.height / 2;
    ctx.fillStyle = canvas.classList.contains('dark') ? '#1e293b' : '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1; ctx.strokeStyle = canvas.classList.contains('dark') ? '#34d399' : '#10b981';
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

export function renderSamplePads(track) {
    const inspectorWindow = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow?.element || track.type !== 'Sampler') return;
    const padsContainer = inspectorWindow.element.querySelector(`#samplePadsContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = '';
    track.slices.forEach((slice, index) => {
        const pad = document.createElement('button');
        pad.className = `sample-pad p-2 border rounded text-xs h-12 flex items-center justify-center dark:border-slate-500 dark:text-slate-300 ${track.selectedSliceForEdit === index ? 'bg-blue-200 border-blue-400 dark:bg-blue-700 dark:border-blue-500' : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500'} ${(!track.audioBuffer?.loaded || slice.duration <= 0) ? 'opacity-50' : ''}`;
        pad.textContent = `S${index + 1}`; pad.title = `Slice ${index + 1}`;
        if (!track.audioBuffer?.loaded || slice.duration <= 0) pad.disabled = true;
        pad.addEventListener('click', () => { track.selectedSliceForEdit = index; if (localAppServices.playSlicePreview) localAppServices.playSlicePreview(track.id, index); renderSamplePads(track); updateSliceEditorUI(track); });
        padsContainer.appendChild(pad);
    });
}

export function updateSliceEditorUI(track) {
    const inspectorWindow = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow?.element || track.type !== 'Sampler' || !track.slices?.length) return;
    const selectedInfo = inspectorWindow.element.querySelector(`#selectedSliceInfo-${track.id}`);
    if (selectedInfo) selectedInfo.textContent = track.selectedSliceForEdit + 1;
    const slice = track.slices[track.selectedSliceForEdit]; if (!slice) return;
    if (track.inspectorControls.sliceVolume) track.inspectorControls.sliceVolume.setValue(slice.volume || 0.7);
    if (track.inspectorControls.slicePitch) track.inspectorControls.slicePitch.setValue(slice.pitchShift || 0);
    const loopToggleBtn = inspectorWindow.element.querySelector(`#sliceLoopToggle-${track.id}`);
    if (loopToggleBtn) { loopToggleBtn.textContent = slice.loop ? 'Loop: ON' : 'Loop: OFF'; loopToggleBtn.classList.toggle('active', slice.loop); }
    const reverseToggleBtn = inspectorWindow.element.querySelector(`#sliceReverseToggle-${track.id}`);
    if (reverseToggleBtn) { reverseToggleBtn.textContent = slice.reverse ? 'Rev: ON' : 'Rev: OFF'; reverseToggleBtn.classList.toggle('active', slice.reverse); }
    const env = slice.envelope || { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 };
    if (track.inspectorControls.sliceEnvAttack) track.inspectorControls.sliceEnvAttack.setValue(env.attack);
    if (track.inspectorControls.sliceEnvDecay) track.inspectorControls.sliceEnvDecay.setValue(env.decay);
    if (track.inspectorControls.sliceEnvSustain) track.inspectorControls.sliceEnvSustain.setValue(env.sustain);
    if (track.inspectorControls.sliceEnvRelease) track.inspectorControls.sliceEnvRelease.setValue(env.release);
}

export function renderDrumSamplerPads(track) {
    const inspectorWindow = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow?.element || track.type !== 'DrumSampler') return;
    const padsContainer = inspectorWindow.element.querySelector(`#drumPadsGridContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = '';
    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button');
        padEl.className = `drum-pad p-2 border rounded text-xs h-12 flex items-center justify-center dark:border-slate-500 dark:text-slate-300 ${track.selectedDrumPadForEdit === index ? 'bg-blue-200 border-blue-400 dark:bg-blue-700 dark:border-blue-500' : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500'} ${(!padData.audioBufferDataURL && !padData.dbKey && padData.status !== 'loaded') ? 'opacity-60' : ''}`;
        padEl.textContent = `Pad ${index + 1}`; padEl.title = padData.originalFileName || `Pad ${index + 1}`;
        if (padData.status === 'missing' || padData.status === 'error') padEl.classList.add(padData.status === 'missing' ? 'border-yellow-500' : 'border-red-500', 'text-black', 'dark:text-white');
        padEl.addEventListener('click', () => { track.selectedDrumPadForEdit = index; if (localAppServices.playDrumSamplerPadPreview && padData.status === 'loaded') localAppServices.playDrumSamplerPadPreview(track.id, index); else if (padData.status !== 'loaded') showNotification(`Sample for Pad ${index+1} not loaded.`, 2000); renderDrumSamplerPads(track); updateDrumPadControlsUI(track); });
        padsContainer.appendChild(padEl);
    });
}

export function updateDrumPadControlsUI(track) {
    const inspectorWindow = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow || !inspectorWindow.element || track.type !== 'DrumSampler' || !track.drumSamplerPads) return;
    const inspector = inspectorWindow.element;

    const selectedPadIndex = track.selectedDrumPadForEdit;
    const padData = track.drumSamplerPads[selectedPadIndex];

    const selectedInfo = inspector.querySelector(`#selectedDrumPadInfo-${track.id}`);
    if (selectedInfo) selectedInfo.textContent = selectedPadIndex + 1;

    const padSpecificDropZoneContainerId = `drumPadDropZoneContainer-<span class="math-inline">\{track\.id\}\-</span>{selectedPadIndex}`;
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
        const existingAudioData = {
            originalFileName: padData.originalFileName,
            status: padData.status || (padData.originalFileName ? 'missing' : 'empty')
        };
        dzContainer.innerHTML = createDropZoneHTML(track.id, `drumPadFileInput-<span class="math-inline">\{track\.id\}\-</span>{selectedPadIndex}`, 'DrumSampler', selectedPadIndex, existingAudioData);
        const dzEl = dzContainer.querySelector('.drop-zone');
        const fileInputEl = dzContainer.querySelector(`#drumPadFileInput-<span class="math-inline">\{track\.id\}\-</span>{selectedPadIndex}`);
        if (dzEl) setupGenericDropZoneListeners(dzEl, track.id, 'DrumSampler', selectedPadIndex, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadDrumSamplerPadFile);
        if (fileInputEl) fileInputEl.onchange = (e) => { localAppServices.loadDrumSamplerPadFile(e, track.id, selectedPadIndex); };
    }

    const createAndPlaceKnob = (placeholderId, options) => {
        const placeholder = inspector.querySelector(`#${placeholderId}`);
        if (placeholder) {
            const knob = createKnob(options);
            placeholder.innerHTML = ''; placeholder.appendChild(knob.element);
            return knob;
        }
        return null;
    };

    const env = padData.envelope || { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 };
    track.inspectorControls.drumPadVolume = createAndPlaceKnob(`drumPadVolumeKnob-${track.id}-placeholder`, { label: 'Vol', min:0, max:1, step:0.01, initialValue: padData.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(selectedPadIndex, val)});
    
    const pitchKnobOptions = { label: 'Pitch', min:-24, max:24, step:1, initialValue: padData.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(selectedPadIndex, val), disabled: padData.autoStretchEnabled };
    
    if (!track.inspectorControls.drumPadPitch) {
        track.inspectorControls.drumPadPitch = createAndPlaceKnob(`drumPadPitchKnob-${track.id}-placeholder`, pitchKnobOptions);
    } else {
        track.inspectorControls.drumPadPitch.setValue(padData.pitchShift || 0);
        track.inspectorControls.drumPadPitch.refreshVisuals(padData.autoStretchEnabled);
    }

    const autoStretchToggle = inspector.querySelector(`#drumPadAutoStretchToggle-${track.id}`);
    const stretchBPMInput = inspector.querySelector(`#drumPadStretchBPM-${track.id}`);
    const stretchBeatsInput = inspector.querySelector(`#drumPadStretchBeats-${track.id}`);

    if (autoStretchToggle && stretchBPMInput && stretchBeatsInput) {
        autoStretchToggle.textContent = padData.autoStretchEnabled ? 'Stretch: ON' : 'Stretch: OFF';
        autoStretchToggle.classList.toggle('active', padData.autoStretchEnabled);
        stretchBPMInput.disabled = !padData.autoStretchEnabled;
        stretchBeatsInput.disabled = !padData.autoStretchEnabled;
        stretchBPMInput.style.opacity = padData.autoStretchEnabled ? '1' : '0.5';
        stretchBeatsInput.style.opacity = padData.autoStretchEnabled ? '1' : '0.5';
        
        stretchBPMInput.value = padData.stretchOriginalBPM || 120;
        stretchBeatsInput.value = padData.stretchBeats || 1;

        if (!autoStretchToggle.hasAttribute('listener-attached')) {
            autoStretchToggle.addEventListener('click', () => {
                const newState = !track.drumSamplerPads[track.selectedDrumPadForEdit].autoStretchEnabled;
                if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Auto-Stretch for Pad ${track.selectedDrumPadForEdit + 1} on ${track.name}`);
                track.setDrumSamplerPadAutoStretch(track.selectedDrumPadForEdit, newState);
                updateDrumPadControlsUI(track);
            });
            autoStretchToggle.setAttribute('listener-attached', 'true');
        }
        if (!stretchBPMInput.hasAttribute('listener-attached')) {
            stretchBPMInput.addEventListener('change', (e) => {
                if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Stretch BPM for Pad ${track.selectedDrumPadForEdit + 1} on ${track.name}`);
                track.setDrumSamplerPadStretchOriginalBPM(track.selectedDrumPadForEdit, parseFloat(e.target.value));
            });
            stretchBPMInput.setAttribute('listener-attached', 'true');
        }
        if (!stretchBeatsInput.hasAttribute('listener-attached')) {
             stretchBeatsInput.addEventListener('change', (e) => {
                if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Stretch Beats for Pad ${track.selectedDrumPadForEdit + 1} on ${track.name}`);
                track.setDrumSamplerPadStretchBeats(track.selectedDrumPadForEdit, parseFloat(e.target.value));
            });
            stretchBeatsInput.setAttribute('listener-attached', 'true');
        }
    }


    track.inspectorControls.drumPadEnvAttack = createAndPlaceKnob(`drumPadEnvAttack-${track.id}-placeholder`, { label: 'Attack', min:0.001, max:1, step:0.001, initialValue: env.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'attack', val)});
    track.inspectorControls.drumPadEnvDecay = createAndPlaceKnob(`drumPadEnvDecay-${track.id}-placeholder`, { label: 'Decay', min:0.01, max:1, step:0.01, initialValue: env.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'decay', val)});
    track.inspectorControls.drumPadEnvSustain = createAndPlaceKnob(`drumPadEnvSustain-${track.id}-placeholder`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: env.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'sustain', val)});
    track.inspectorControls.drumPadEnvRelease = createAndPlaceKnob(`drumPadEnvRelease-${track.id}-placeholder`, { label: 'Release', min:0.01, max:2, step:0.01, initialValue: env.release, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'release', val)});
}


// --- Timeline UI Functions ---
export function renderTimeline() {
    const timelineWindow = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null;
    if (!timelineWindow || !timelineWindow.element || timelineWindow.isMinimized) {
        return;
    }

    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');
    const tracks = getTracksState();
    if (!tracksArea || !tracks) {
        console.warn("Timeline area or tracks not found for rendering inside timeline window.");
        return;
    }

    tracksArea.innerHTML = '';

    const trackNameWidthStyle = getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim();
    const trackNameWidth = parseFloat(trackNameWidthStyle) || 120;


    tracks.forEach(track => {
        const lane = document.createElement('div');
        lane.className = 'timeline-track-lane';
        lane.dataset.trackId = track.id;

        lane.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.stopPropagation();
            lane.classList.add('dragover-timeline-lane');
            event.dataTransfer.dropEffect = 'copy';
        });

        lane.addEventListener('dragleave', (event) => {
            event.preventDefault();
            event.stopPropagation();
            lane.classList.remove('dragover-timeline-lane');
        });

        lane.addEventListener('drop', (event) => {
            event.preventDefault();
            event.stopPropagation();
            lane.classList.remove('dragover-timeline-lane');

            const targetTrackId = parseInt(lane.dataset.trackId, 10);
            const timelineContentArea = timelineWindow.element.querySelector('.window-content');
            const pixelsPerSecond = 30;

            const rect = timelineContentArea.getBoundingClientRect();
            let dropX = event.clientX - rect.left - trackNameWidth + timelineContentArea.scrollLeft;
            dropX = Math.max(0, dropX);
            const startTime = dropX / pixelsPerSecond;

            console.log(`[UI Timeline Drop] TrackID: ${targetTrackId}, Time: ${startTime.toFixed(2)}s`);

            if (localAppServices.handleTimelineLaneDrop) {
                localAppServices.handleTimelineLaneDrop(event, targetTrackId, startTime);
            } else {
                console.warn("handleTimelineLaneDrop service not available.");
            }
        });


        const nameEl = document.createElement('div');
        nameEl.className = 'timeline-track-lane-name';
        nameEl.textContent = track.name;
        lane.appendChild(nameEl);

        const clipsContainer = document.createElement('div');
        clipsContainer.style.position = 'relative';
        clipsContainer.style.width = `calc(100% - ${trackNameWidth}px)`;
        clipsContainer.style.height = '100%';


        if (track.timelineClips && Array.isArray(track.timelineClips)) {
            track.timelineClips.forEach(clip => {
                const clipEl = document.createElement('div');
                let clipText = clip.name || `Clip ${clip.id.slice(-4)}`;
                let clipTitle = `<span class="math-inline">\{clip\.name \|\| \(clip\.type \=\=\= 'audio' ? 'Audio Clip' \: 'Sequence Clip'\)\} \(</span>{clip.duration.toFixed(2)}s)`;

                if (clip.type === 'audio') {
                    clipEl.className = 'audio-clip';
                } else if (clip.type === 'sequence') {
                    clipEl.className = 'audio-clip sequence-clip';
                    const sourceSeq = track.sequences && track.sequences.find(s => s.id === clip.sourceSequenceId);
                    if (sourceSeq) {
                        clipText = sourceSeq.name;
                        clipTitle = `Sequence: <span class="math-inline">\{sourceSeq\.name\} \(</span>{clip.duration.toFixed(2)}s)`;
                    }
                } else {
                    clipEl.className = 'audio-clip unknown-clip';
                }

                clipEl.textContent = clipText;
                clipEl.title = clipTitle;

                const pixelsPerSecond = 30;
                clipEl.style.left = `${clip.startTime * pixelsPerSecond}px`;
                clipEl.style.width = `${Math.max(5, clip.duration * pixelsPerSecond)}px`;

                clipEl.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const startX = e.clientX;
                    const initialLeftPixels = parseFloat(clipEl.style.left) || 0;
                    let originalStartTime = clip.startTime;

                    function onMouseMove(moveEvent) {
                        const dx = moveEvent.clientX - startX;
                        const newLeftPixels = initialLeftPixels + dx;
                        clipEl.style.left = `${Math.max(0, newLeftPixels)}px`;
                    }

                    function onMouseUp() {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        const finalLeftPixels = parseFloat(clipEl.style.left) || 0;
                        const newStartTime = Math.max(0, finalLeftPixels / pixelsPerSecond);

                        if (Math.abs(newStartTime - originalStartTime) > (1 / pixelsPerSecond) * 0.5 ) {
                            if (localAppServices.captureStateForUndo) {
                                localAppServices.captureStateForUndo(`Move clip on track "${track.name}"`);
                            }
                            if (track.updateAudioClipPosition) {
                                track.updateAudioClipPosition(clip.id, newStartTime);
                            } else {
                                console.error("Track.updateAudioClipPosition method not found!");
                            }
                        } else {
                            clipEl.style.left = `${originalStartTime * pixelsPerSecond}px`;
                        }
                    }
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
                clipsContainer.appendChild(clipEl);
            });
        }
        lane.appendChild(clipsContainer);
        tracksArea.appendChild(lane);
    });
}

export function updatePlayheadPosition() {
    const timelineWindow = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null;

    if (!timelineWindow || !timelineWindow.element || timelineWindow.isMinimized) {
        return;
    }

    const playhead = timelineWindow.element.querySelector('#timeline-playhead');
    const timelineContentArea = timelineWindow.element.querySelector('.window-content');
    const timelineRuler = timelineWindow.element.querySelector('#timeline-ruler');


    if (!playhead || typeof Tone === 'undefined' || !timelineContentArea || !localAppServices.getPlaybackMode) return;

    const currentPlaybackMode = localAppServices.getPlaybackMode();

    if (currentPlaybackMode === 'sequencer' || currentPlaybackMode === 'pattern') {
        playhead.style.display = 'none';
        if (timelineRuler) {
             timelineRuler.style.transform = `translateX(-${timelineContentArea.scrollLeft}px)`;
        }
        return;
    }

    playhead.style.display = 'block';

    const pixelsPerSecond = 30;
    const trackNameWidthStyle = getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim();
    const trackNameWidth = parseFloat(trackNameWidthStyle) || 120;

    if (Tone.Transport.state === 'started') {
        const rawNewPosition = Tone.Transport.seconds * pixelsPerSecond;
        playhead.style.left = `${trackNameWidth + rawNewPosition}px`;

        const scrollableContent = timelineContentArea;
        const containerWidth = scrollableContent.clientWidth - trackNameWidth;
        const playheadVisualPositionInScrollable = rawNewPosition - scrollableContent.scrollLeft;

        if (playheadVisualPositionInScrollable > containerWidth * 0.8) {
            scrollableContent.scrollLeft = rawNewPosition - (containerWidth * 0.8) + 20;
        } else if (playheadVisualPositionInScrollable < containerWidth * 0.2 && scrollableContent.scrollLeft > 0) {
            scrollableContent.scrollLeft = Math.max(0, rawNewPosition - (containerWidth * 0.2) - 20);
        }
        if (scrollableContent.scrollLeft < 0) scrollableContent.scrollLeft = 0;

    } else if (Tone.Transport.state === 'stopped') {
         playhead.style.left = `${trackNameWidth}px`;
    }

    if (timelineRuler && timelineContentArea) {
        timelineRuler.style.transform = `translateX(-${timelineContentArea.scrollLeft}px)`;
    }
}


export function openTimelineWindow(savedState = null) {
    const windowId = 'timeline';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        win.restore();
        renderTimeline();
        return win;
    }

    const contentHTML = `
        <div id="timeline-container">
            <div id="timeline-header">
                <div id="timeline-ruler"></div>
            </div>
            <div id="timeline-tracks-container">
                <div id="timeline-tracks-area"></div>
            </div>
            <div id="timeline-playhead"></div>
        </div>
    `;

    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const safeDesktopWidth = (desktopEl && typeof desktopEl.offsetWidth === 'number' && desktopEl.offsetWidth > 0) ? desktopEl.offsetWidth : 1024;
    const timelineOptions = {
        width: Math.max(600, Math.min(1200, safeDesktopWidth - 60)),
        height: 250,
        x: 30,
        y: 50,
        minWidth: 400,
        minHeight: 150,
        initialContentKey: windowId,
        onCloseCallback: () => {}
    };

     if (savedState) {
        Object.assign(timelineOptions, {
            x: parseInt(savedState.left, 10),
            y: parseInt(savedState.top, 10),
            width: parseInt(savedState.width, 10),
            height: parseInt(savedState.height, 10),
            zIndex: savedState.zIndex,
            isMinimized: savedState.isMinimized
        });
    }

    const timelineWindow = localAppServices.createWindow(windowId, 'Timeline', contentHTML, timelineOptions);

    if (timelineWindow?.element) {
        const contentArea = timelineWindow.element.querySelector('.window-content');
        if (contentArea) {
            contentArea.addEventListener('scroll', () => {
                const ruler = timelineWindow.element.querySelector('#timeline-ruler');
                if (ruler) {
                    ruler.style.transform = `translateX(-${contentArea.scrollLeft}px)`;
                }
                updatePlayheadPosition();
            });
        }
        renderTimeline();
    }
    return timelineWindow;
}
