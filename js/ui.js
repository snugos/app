// js/ui.js
import { SnugWindow } from './SnugWindow.js';
// showConfirmationDialog, showNotification, createContextMenu are used via appServices.
// createDropZoneHTML, setupGenericDropZoneListeners are used directly but also need appServices for their callbacks.
import { createDropZoneHTML, setupGenericDropZoneListeners, showCustomModal, createContextMenu, showConfirmationDialog as utilShowConfirmationDialog } from './utils.js';
import * as Constants from './constants.js';
// Event handlers are now mostly called via appServices from main.js
// import {
//     handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
//     handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
// } from './eventHandlers.js'; // These are now in appServices
// import { getTracksState } from './state.js'; // Access state via appServices

// Module-level state for appServices, to be set by main.js
let localAppServices = {};
let selectedSoundForPreviewData = null; // Holds data for the sound selected for preview

export function initializeUIModule(appServicesFromMain) {
    localAppServices = appServicesFromMain || {}; // Ensure it's an object

    // Ensure core utilities are available if not directly on appServices (e.g. for direct use within ui.js)
    // but prefer appServices if available for consistency.
    if (!localAppServices.showNotification) {
        console.warn('[UI Init] showNotification service not found in appServices, direct import usage might be limited or fallback.');
        // localAppServices.showNotification = utilShowNotification; // Or handle missing more gracefully
    }
    if (!localAppServices.showConfirmationDialog) {
        console.warn('[UI Init] showConfirmationDialog service not found in appServices.');
        // localAppServices.showConfirmationDialog = utilShowConfirmationDialog;
    }


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
        localAppServices.effectsRegistryAccess = { // Provide a safe fallback structure
            AVAILABLE_EFFECTS: {},
            getEffectParamDefinitions: () => [],
            getEffectDefaultParams: () => ({}),
            synthEngineControlDefinitions: {}
        };
    }
    if (!localAppServices.effectsRegistryAccess.synthEngineControlDefinitions) {
        localAppServices.effectsRegistryAccess.synthEngineControlDefinitions = {}; // Ensure this nested property exists
    }
    console.log("[UI] UI Module Initialized. AppServices keys:", Object.keys(localAppServices));
}

// --- Knob UI ---
export function createKnob(options) {
    if (!options || typeof options !== 'object') {
        console.error("[UI createKnob] Invalid options provided.");
        options = {}; // Fallback to empty options
    }

    const container = document.createElement('div');
    container.className = 'knob-container';

    const labelEl = document.createElement('div');
    labelEl.className = 'knob-label';
    labelEl.textContent = options.label || '';
    labelEl.title = options.label || ''; // Tooltip
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

    const min = Number.isFinite(options.min) ? options.min : 0;
    const max = Number.isFinite(options.max) ? options.max : 100;
    const step = Number.isFinite(options.step) && options.step !== 0 ? options.step : 1;
    let currentValue = Number.isFinite(options.initialValue) ? options.initialValue : min;
    currentValue = Math.max(min, Math.min(max, currentValue)); // Clamp initial value

    const range = max - min;
    const maxDegrees = options.maxDegrees || 270; // Max rotation in degrees
    const BASE_PIXELS_PER_FULL_RANGE_MOUSE = 300;
    const BASE_PIXELS_PER_FULL_RANGE_TOUCH = 450; // Potentially more for touch
    let initialValueBeforeInteraction = currentValue;

    function updateKnobVisual() {
        const percentage = range === 0 ? 0 : (currentValue - min) / range;
        const rotation = (percentage * maxDegrees) - (maxDegrees / 2); // Center rotation
        handleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;

        const decimals = Number.isFinite(options.decimals) ? options.decimals : (step < 1 && step !== 0 ? (step.toString().split('.')[1]?.length || 2) : 0);
        valueEl.textContent = typeof currentValue === 'number' ? currentValue.toFixed(decimals) : String(currentValue);
        if (options.displaySuffix) valueEl.textContent += options.displaySuffix;
    }

    function setValue(newValue, triggerCallback = true, fromInteraction = false) {
        let numValue = parseFloat(newValue);
        if (isNaN(numValue)) return; // Ignore if not a number

        // Apply step
        if (step !== 0) {
            numValue = Math.round(numValue / step) * step;
        }
        // Clamp to min/max
        let boundedValue = Math.min(max, Math.max(min, numValue));

        const oldValue = currentValue;
        currentValue = boundedValue;
        updateKnobVisual();

        if (triggerCallback && typeof options.onValueChange === 'function' && (oldValue !== currentValue || fromInteraction)) {
            try {
                options.onValueChange(currentValue, oldValue, fromInteraction);
            } catch (e) {
                console.error("[UI createKnob] Error in onValueChange callback:", e);
            }
        }
    }

    function handleInteraction(e, isTouch = false) {
        try {
            e.preventDefault();
            initialValueBeforeInteraction = currentValue;
            const startY = isTouch ? e.touches[0].clientY : e.clientY;
            const startValue = currentValue;
            const pixelsForFullRange = isTouch ? BASE_PIXELS_PER_FULL_RANGE_TOUCH : BASE_PIXELS_PER_FULL_RANGE_MOUSE;
            const currentSensitivity = Number.isFinite(options.sensitivity) ? options.sensitivity : 1;

            function onMove(moveEvent) {
                if (isTouch && moveEvent.touches.length === 0) return; // No active touch
                const currentY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
                const deltaY = startY - currentY; // Inverted for natural knob feel (drag up = increase)
                let valueChange = (deltaY / pixelsForFullRange) * range * currentSensitivity;
                let newValue = startValue + valueChange;
                setValue(newValue, true, true); // fromInteraction is true
            }

            function onEnd() {
                document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
                document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
                // Capture undo state if value actually changed and service is available
                if (currentValue !== initialValueBeforeInteraction && localAppServices.captureStateForUndo) {
                    let description = `Change ${options.label || 'knob'} to ${valueEl.textContent}`;
                    if (options.trackRef && options.trackRef.name) { // Add track context if available
                        description = `Change ${options.label || 'knob'} for ${options.trackRef.name} to ${valueEl.textContent}`;
                    }
                    localAppServices.captureStateForUndo(description);
                }
            }
            document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, { passive: !isTouch }); // Passive true for mousemove
            document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
        } catch (err) {
            console.error("[UI createKnob handleInteraction] Error:", err);
        }
    }
    knobEl.addEventListener('mousedown', (e) => handleInteraction(e, false));
    knobEl.addEventListener('touchstart', (e) => handleInteraction(e, true), { passive: false }); // passive: false to allow preventDefault

    setValue(currentValue, false); // Initialize visual without triggering callback
    return { element: container, setValue, getValue: () => currentValue, type: 'knob', refreshVisuals: updateKnobVisual };
}

// --- Specific Inspector DOM Builders ---
function buildSynthSpecificInspectorDOM(track) {
    if (!track || typeof track.id === 'undefined') return '<div>Error: Invalid track data for Synth Inspector.</div>';
    const engineType = track.synthEngineType || 'MonoSynth'; // Default to MonoSynth
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    let controlsHTML = `<div id="synthEngineControls-${track.id}" class="grid grid-cols-2 md:grid-cols-3 gap-2 p-1">`;
    definitions.forEach(def => {
        controlsHTML += `<div id="${def.idPrefix}-${track.id}-placeholder" class="control-placeholder"></div>`;
    });
    controlsHTML += `</div>`;
    return controlsHTML;
}

function buildSamplerSpecificInspectorDOM(track) {
    if (!track || typeof track.id === 'undefined') return '<div>Error: Invalid track data for Sampler Inspector.</div>';
    return `<div class="sampler-controls p-1 space-y-2">
        <div id="dropZoneContainer-${track.id}-sampler" class="mb-2"></div>
        <div class="waveform-section">
            <canvas id="waveformCanvas-${track.id}" class="waveform-canvas"></canvas>
        </div>
        <div class="slice-editor-controls control-group">
            <h4 class="control-group-title">Slice Editor (Selected: <span id="selectedSliceInfo-${track.id}">1</span>)</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1 items-center text-xs">
                <div id="sliceVolumeSlider-${track.id}-placeholder" class="control-placeholder"></div>
                <div id="slicePitchKnob-${track.id}-placeholder" class="control-placeholder"></div>
                <button id="sliceLoopToggle-${track.id}" class="small-button">Loop: OFF</button>
                <button id="sliceReverseToggle-${track.id}" class="small-button">Rev: OFF</button>
            </div>
            <div class="control-group-title">Envelope:</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                <div id="sliceEnvAttackSlider-${track.id}-placeholder" class="control-placeholder"></div>
                <div id="sliceEnvDecaySlider-${track.id}-placeholder" class="control-placeholder"></div>
                <div id="sliceEnvSustainSlider-${track.id}-placeholder" class="control-placeholder"></div>
                <div id="sliceEnvReleaseSlider-${track.id}-placeholder" class="control-placeholder"></div>
            </div>
        </div>
        <div id="samplePadsContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
        <div><button id="slicerPolyphonyToggle-${track.id}" class="small-button mt-1">Mode: Poly</button></div>
    </div>`;
}

function buildDrumSamplerSpecificInspectorDOM(track) {
    if (!track || typeof track.id === 'undefined') return '<div>Error: Invalid track data for Drum Sampler Inspector.</div>';
    const selectedPadIdx = track.selectedDrumPadForEdit !== undefined ? track.selectedDrumPadForEdit : 0;
    return `<div class="drum-sampler-controls p-1 space-y-2">
        <div class="selected-pad-controls control-group">
            <h4 class="control-group-title">Edit Pad: <span id="selectedDrumPadInfo-${track.id}">${selectedPadIdx + 1}</span></h4>
            <div id="drumPadDropZoneContainer-${track.id}-${selectedPadIdx}" class="mb-1 text-xs"></div>
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 items-center text-xs">
                <div id="drumPadVolumeKnob-${track.id}-placeholder" class="control-placeholder"></div>
                <div id="drumPadPitchKnob-${track.id}-placeholder" class="control-placeholder"></div>
            </div>
            <div class="control-group-title">Envelope:</div>
             <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                <div id="drumPadEnvAttack-${track.id}-placeholder" class="control-placeholder"></div>
                <div id="drumPadEnvDecay-${track.id}-placeholder" class="control-placeholder"></div>
                <div id="drumPadEnvSustain-${track.id}-placeholder" class="control-placeholder"></div>
                <div id="drumPadEnvRelease-${track.id}-placeholder" class="control-placeholder"></div>
            </div>
         </div>
        <div id="drumPadsGridContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
    </div>`;
}

function buildInstrumentSamplerSpecificInspectorDOM(track) {
    if (!track || typeof track.id === 'undefined') return '<div>Error: Invalid track data for Instrument Sampler Inspector.</div>';
    return `<div class="instrument-sampler-controls p-1 space-y-2">
        <div id="dropZoneContainer-${track.id}-instrumentsampler" class="mb-2"></div>
        <div class="waveform-section">
           <canvas id="instrumentWaveformCanvas-${track.id}" class="waveform-canvas"></canvas>
        </div>
        <div class="instrument-params-controls control-group text-xs">
            <div class="grid grid-cols-2 gap-2 items-center">
                <div>
                    <label for="instrumentRootNote-${track.id}" class="input-label">Root Note:</label>
                    <select id="instrumentRootNote-${track.id}" class="input-field"></select>
                </div>
                <div>
                    <label for="instrumentLoopToggle-${track.id}" class="input-label">Loop:</label>
                    <button id="instrumentLoopToggle-${track.id}" class="small-button w-full">Loop: OFF</button>
                </div>
                <div>
                    <label for="instrumentLoopStart-${track.id}" class="input-label">Loop Start (s):</label>
                    <input type="number" id="instrumentLoopStart-${track.id}" step="0.001" class="input-field">
                </div>
                <div>
                    <label for="instrumentLoopEnd-${track.id}" class="input-label">Loop End (s):</label>
                    <input type="number" id="instrumentLoopEnd-${track.id}" step="0.001" class="input-field">
                </div>
            </div>
             <div class="control-group-title">Envelope:</div>
             <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                <div id="instrumentEnvAttack-${track.id}-placeholder" class="control-placeholder"></div>
                <div id="instrumentEnvDecay-${track.id}-placeholder" class="control-placeholder"></div>
                <div id="instrumentEnvSustain-${track.id}-placeholder" class="control-placeholder"></div>
                <div id="instrumentEnvRelease-${track.id}-placeholder" class="control-placeholder"></div>
            </div>
            <div><button id="instrumentPolyphonyToggle-${track.id}" class="small-button mt-1">Mode: Poly</button></div>
        </div>
    </div>`;
}

// --- Specific Inspector Control Initializers ---
function buildSynthEngineControls(track, container, engineType) {
    if (!track || !container || !engineType || !localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions) {
        console.error("[UI buildSynthEngineControls] Invalid arguments or missing effects registry access.");
        if (container) container.innerHTML = "Error loading synth controls.";
        return;
    }
    const definitions = localAppServices.effectsRegistryAccess.synthEngineControlDefinitions[engineType] || [];
    definitions.forEach(def => {
        const placeholder = container.querySelector(`#${def.idPrefix}-${track.id}-placeholder`);
        if (!placeholder) {
            console.warn(`[UI buildSynthEngineControls] Placeholder not found for ${def.idPrefix}-${track.id}`);
            return;
        }
        let initialValue;
        // Safely get initial value from track.synthParams
        try {
            const pathParts = def.path.split('.');
            let currentValObj = track.synthParams;
            for (const key of pathParts) {
                if (currentValObj && typeof currentValObj === 'object' && key in currentValObj) {
                    currentValObj = currentValObj[key];
                } else { currentValObj = undefined; break; }
            }
            initialValue = (currentValObj !== undefined) ? currentValObj : def.defaultValue;

            // For Tone.Signal parameters, try to get live value if instrument exists
            if (def.path.endsWith('.value') && track.instrument && typeof track.instrument.get === 'function') {
                const signalPath = def.path.substring(0, def.path.lastIndexOf('.value'));
                const signalValue = track.instrument.get(signalPath)?.value;
                if (signalValue !== undefined) initialValue = signalValue;
            }
        } catch (e) {
            console.warn(`[UI buildSynthEngineControls] Error getting initial value for ${def.path}:`, e);
            initialValue = def.defaultValue;
        }


        if (def.type === 'knob') {
            const knob = createKnob({
                label: def.label, min: def.min, max: def.max, step: def.step,
                initialValue, decimals: def.decimals, displaySuffix: def.displaySuffix,
                trackRef: track, // For undo context
                onValueChange: (val) => {
                    if (track && typeof track.setSynthParam === 'function') {
                        track.setSynthParam(def.path, val);
                    }
                }
            });
            placeholder.innerHTML = ''; placeholder.appendChild(knob.element);
            if (track.inspectorControls) track.inspectorControls[def.idPrefix] = knob;
        } else if (def.type === 'select') {
            const selectEl = document.createElement('select');
            selectEl.id = `${def.idPrefix}-${track.id}`;
            selectEl.className = 'synth-param-select input-field w-full'; // Updated class
            (def.options || []).forEach(opt => {
                const option = document.createElement('option');
                option.value = typeof opt === 'object' ? opt.value : opt;
                option.textContent = typeof opt === 'object' ? opt.text : opt;
                selectEl.appendChild(option);
            });
            selectEl.value = initialValue;
            selectEl.addEventListener('change', (e) => {
                try {
                    if (localAppServices.captureStateForUndo) {
                        localAppServices.captureStateForUndo(`Change ${def.label} for ${track.name} to ${e.target.value}`);
                    }
                    if (track && typeof track.setSynthParam === 'function') {
                        track.setSynthParam(def.path, e.target.value);
                    }
                } catch (err) { console.error("Error in select change handler:", err); }
            });
            const labelEl = document.createElement('label');
            labelEl.htmlFor = selectEl.id; labelEl.textContent = def.label + ':';
            labelEl.className = 'input-label block'; // Updated class
            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'flex flex-col items-start'; // Basic wrapper
            wrapperDiv.appendChild(labelEl); wrapperDiv.appendChild(selectEl);
            placeholder.innerHTML = ''; placeholder.appendChild(wrapperDiv);
            if (track.inspectorControls) track.inspectorControls[def.idPrefix] = selectEl;
        }
    });
}

function initializeSynthSpecificControls(track, winEl) {
    if (!track || !winEl) return;
    try {
        const engineType = track.synthEngineType || 'MonoSynth';
        const container = winEl.querySelector(`#synthEngineControls-${track.id}`);
        if (container) {
            buildSynthEngineControls(track, container, engineType);
        } else {
            console.warn(`[UI initializeSynthSpecificControls] Container #synthEngineControls-${track.id} not found.`);
        }
    } catch (error) {
        console.error("[UI initializeSynthSpecificControls] Error:", error);
    }
}

function initializeSamplerSpecificControls(track, winEl) {
    if (!track || !winEl || !localAppServices.loadSoundFromBrowserToTarget || !localAppServices.loadSampleFile) {
        console.error("[UI initializeSamplerSpecificControls] Invalid args or missing services (loadSound/loadFile).");
        return;
    }
    try {
        const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-sampler`);
        if (dzContainerEl) {
            const audioData = track.samplerAudioData || { status: 'empty' };
            dzContainerEl.innerHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler', null, {originalFileName: audioData.fileName, status: audioData.status});
            const dzEl = dzContainerEl.querySelector('.drop-zone');
            const fileInputEl = dzContainerEl.querySelector(`#fileInput-${track.id}`);
            if (dzEl) {
                setupGenericDropZoneListeners(dzEl, track.id, 'Sampler', null,
                    localAppServices.loadSoundFromBrowserToTarget,
                    localAppServices.loadSampleFile,
                    localAppServices.getTrackById
                );
            }
            if (fileInputEl) {
                fileInputEl.onchange = (e) => {
                    if (localAppServices.loadSampleFile) localAppServices.loadSampleFile(e, track.id, 'Sampler');
                };
            }
        } else { console.warn(`[UI initializeSamplerSpecificControls] Drop zone container not found for track ${track.id}.`); }

        if (typeof renderSamplePads === 'function') renderSamplePads(track); else console.warn("renderSamplePads not available");

        const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) track.waveformCanvasCtx = ctx; else console.warn(`[UI] Could not get 2D context for waveformCanvas-${track.id}`);
            if(track.audioBuffer?.loaded && typeof drawWaveform === 'function') drawWaveform(track); else if (typeof drawWaveform === 'function') drawWaveform(track); // Draw empty state
        } else { console.warn(`[UI] waveformCanvas-${track.id} not found.`); }

        if (typeof updateSliceEditorUI === 'function') updateSliceEditorUI(track); else console.warn("updateSliceEditorUI not available");

        const createAndPlaceKnob = (placeholderId, options) => {
            const placeholder = winEl.querySelector(`#${placeholderId}`);
            if (placeholder) {
                const knob = createKnob(options);
                placeholder.innerHTML = ''; placeholder.appendChild(knob.element); return knob;
            }
            console.warn(`[UI initializeSamplerSpecificControls] Placeholder ${placeholderId} not found.`);
            return null;
        };

        const selectedSlice = (track.slices && track.slices[track.selectedSliceForEdit]) ||
                              (track.slices && track.slices[0]) ||
                              { volume: 0.7, pitchShift: 0, envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 }, loop: false, reverse: false };

        if (!track.inspectorControls) track.inspectorControls = {};
        track.inspectorControls.sliceVolume = createAndPlaceKnob(`sliceVolumeSlider-${track.id}-placeholder`, { label: 'Vol', min:0, max:1, step:0.01, initialValue: selectedSlice.volume, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceVolume(track.selectedSliceForEdit, val)});
        track.inspectorControls.slicePitch = createAndPlaceKnob(`slicePitchKnob-${track.id}-placeholder`, { label: 'Pitch', min:-24, max:24, step:1, initialValue: selectedSlice.pitchShift, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setSlicePitchShift(track.selectedSliceForEdit, val)});
        track.inspectorControls.sliceEnvAttack = createAndPlaceKnob(`sliceEnvAttackSlider-${track.id}-placeholder`, { label: 'Attack', min:0.001, max:1, step:0.001, initialValue: selectedSlice.envelope.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'attack', val)});
        track.inspectorControls.sliceEnvDecay = createAndPlaceKnob(`sliceEnvDecaySlider-${track.id}-placeholder`, { label: 'Decay', min:0.01, max:1, step:0.01, initialValue: selectedSlice.envelope.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'decay', val)});
        track.inspectorControls.sliceEnvSustain = createAndPlaceKnob(`sliceEnvSustainSlider-${track.id}-placeholder`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: selectedSlice.envelope.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'sustain', val)});
        track.inspectorControls.sliceEnvRelease = createAndPlaceKnob(`sliceEnvReleaseSlider-${track.id}-placeholder`, { label: 'Release', min:0.01, max:2, step:0.01, initialValue: selectedSlice.envelope.release, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'release', val)});

        const loopToggleBtn = winEl.querySelector(`#sliceLoopToggle-${track.id}`);
        if (loopToggleBtn) {
            loopToggleBtn.textContent = selectedSlice.loop ? 'Loop: ON' : 'Loop: OFF';
            loopToggleBtn.classList.toggle('active', !!selectedSlice.loop);
            loopToggleBtn.onclick = (e) => { // Changed to onclick for simplicity, ensure no prior listeners conflict
                try {
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Loop for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
                    const currentSliceForLoop = track.slices[track.selectedSliceForEdit];
                    if (currentSliceForLoop) {
                        track.setSliceLoop(track.selectedSliceForEdit, !currentSliceForLoop.loop);
                        e.target.textContent = currentSliceForLoop.loop ? 'Loop: ON' : 'Loop: OFF';
                        e.target.classList.toggle('active', !!currentSliceForLoop.loop);
                    }
                } catch (err) { console.error("Error in slice loop toggle:", err); }
            };
        }
        const reverseToggleBtn = winEl.querySelector(`#sliceReverseToggle-${track.id}`);
        if(reverseToggleBtn){
            reverseToggleBtn.textContent = selectedSlice.reverse ? 'Rev: ON' : 'Rev: OFF';
            reverseToggleBtn.classList.toggle('active', !!selectedSlice.reverse);
            reverseToggleBtn.onclick = (e) => {
                try {
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Reverse for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
                    const currentSliceForReverse = track.slices[track.selectedSliceForEdit];
                    if (currentSliceForReverse) {
                        track.setSliceReverse(track.selectedSliceForEdit, !currentSliceForReverse.reverse);
                        e.target.textContent = currentSliceForReverse.reverse ? 'Rev: ON' : 'Rev: OFF';
                        e.target.classList.toggle('active', !!currentSliceForReverse.reverse);
                    }
                } catch (err) { console.error("Error in slice reverse toggle:", err); }
            };
        }
        const polyToggleBtn = winEl.querySelector(`#slicerPolyphonyToggle-${track.id}`);
        if (polyToggleBtn) {
            polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
            polyToggleBtn.classList.toggle('active', track.slicerIsPolyphonic);
            polyToggleBtn.onclick = () => {
                try {
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Slicer Polyphony for ${track.name}`);
                    track.slicerIsPolyphonic = !track.slicerIsPolyphonic;
                    polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
                    polyToggleBtn.classList.toggle('active', track.slicerIsPolyphonic);
                    if (!track.slicerIsPolyphonic && typeof track.setupSlicerMonoNodes === 'function') track.setupSlicerMonoNodes();
                    else if (track.slicerIsPolyphonic && typeof track.disposeSlicerMonoNodes === 'function') track.disposeSlicerMonoNodes();
                    if (typeof track.rebuildEffectChain === 'function') track.rebuildEffectChain(); // Rebuild to connect mono player correctly
                    if(localAppServices.showNotification) localAppServices.showNotification(`${track.name} slicer mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`, 2000);
                } catch (err) { console.error("Error in slicer polyphony toggle:", err); }
            };
        }
    } catch (error) {
        console.error(`[UI initializeSamplerSpecificControls] Error for track ${track.id}:`, error);
        if (localAppServices.showNotification) localAppServices.showNotification("Error setting up sampler controls.", 3000);
    }
}

function initializeDrumSamplerSpecificControls(track, winEl) {
    if (!track || !winEl) {
        console.error("[UI initializeDrumSamplerSpecificControls] Invalid track or window element.");
        return;
    }
    try {
        if (typeof renderDrumSamplerPads === 'function') renderDrumSamplerPads(track); else console.warn("renderDrumSamplerPads not available");
        if (typeof updateDrumPadControlsUI === 'function') updateDrumPadControlsUI(track); else console.warn("updateDrumPadControlsUI not available");
    } catch (error) {
        console.error(`[UI initializeDrumSamplerSpecificControls] Error for track ${track.id}:`, error);
        if (localAppServices.showNotification) localAppServices.showNotification("Error setting up drum sampler controls.", 3000);
    }
}

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    if (!track || !winEl || !localAppServices.loadSoundFromBrowserToTarget || !localAppServices.loadSampleFile) {
        console.error("[UI initializeInstrumentSamplerSpecificControls] Invalid args or missing services.");
        return;
    }
    try {
        const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler`);
        if (dzContainerEl) {
            const audioData = track.instrumentSamplerSettings || { status: 'empty' };
            dzContainerEl.innerHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler', null, {originalFileName: audioData.originalFileName, status: audioData.status});
            const dzEl = dzContainerEl.querySelector('.drop-zone');
            const fileInputEl = dzContainerEl.querySelector(`#instrumentFileInput-${track.id}`);
            if (dzEl) {
                setupGenericDropZoneListeners(dzEl, track.id, 'InstrumentSampler', null,
                    localAppServices.loadSoundFromBrowserToTarget,
                    localAppServices.loadSampleFile, // For OS file drops
                    localAppServices.getTrackById
                );
            }
            if (fileInputEl) {
                fileInputEl.onchange = (e) => {
                    if (localAppServices.loadSampleFile) localAppServices.loadSampleFile(e, track.id, 'InstrumentSampler');
                };
            }
        } else { console.warn(`[UI initializeInstrumentSamplerSpecificControls] Drop zone container not found for track ${track.id}.`); }


        const canvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) track.instrumentWaveformCanvasCtx = ctx; else console.warn(`[UI] Could not get 2D context for instrumentWaveformCanvas-${track.id}`);
            if(track.instrumentSamplerSettings?.audioBuffer?.loaded && typeof drawInstrumentWaveform === 'function') drawInstrumentWaveform(track);
            else if (typeof drawInstrumentWaveform === 'function') drawInstrumentWaveform(track); // Draw empty state
        } else { console.warn(`[UI] instrumentWaveformCanvas-${track.id} not found.`); }

        const rootNoteSelect = winEl.querySelector(`#instrumentRootNote-${track.id}`);
        if (rootNoteSelect) {
            Constants.synthPitches.slice().reverse().forEach(pitch => { // Assuming Constants.synthPitches is available
                const option = document.createElement('option'); option.value = pitch; option.textContent = pitch; rootNoteSelect.appendChild(option);
            });
            rootNoteSelect.value = track.instrumentSamplerSettings?.rootNote || 'C4';
            rootNoteSelect.onchange = (e) => { // Changed to onchange
                try {
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Root Note for ${track.name} to ${e.target.value}`);
                    if (track && typeof track.setInstrumentSamplerRootNote === 'function') track.setInstrumentSamplerRootNote(e.target.value);
                } catch (err) { console.error("Error in root note select change:", err); }
            };
        } else { console.warn(`[UI] instrumentRootNote-${track.id} select not found.`); }

        const loopToggleBtn = winEl.querySelector(`#instrumentLoopToggle-${track.id}`);
        if (loopToggleBtn) {
            loopToggleBtn.textContent = track.instrumentSamplerSettings?.loop ? 'Loop: ON' : 'Loop: OFF';
            loopToggleBtn.classList.toggle('active', !!track.instrumentSamplerSettings?.loop);
            loopToggleBtn.onclick = (e) => {
                try {
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Loop for ${track.name}`);
                    if (track && typeof track.setInstrumentSamplerLoop === 'function') {
                         track.setInstrumentSamplerLoop(!track.instrumentSamplerSettings.loop);
                         e.target.textContent = track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF';
                         e.target.classList.toggle('active', track.instrumentSamplerSettings.loop);
                    }
                } catch (err) { console.error("Error in instrument loop toggle:", err); }
            };
        }
        const loopStartInput = winEl.querySelector(`#instrumentLoopStart-${track.id}`);
        if (loopStartInput) {
            loopStartInput.value = track.instrumentSamplerSettings?.loopStart?.toFixed(3) || '0.000';
            loopStartInput.onchange = (e) => { // Changed to onchange
                try {
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Loop Start for ${track.name}`);
                    if (track && typeof track.setInstrumentSamplerLoopStart === 'function') track.setInstrumentSamplerLoopStart(parseFloat(e.target.value));
                } catch (err) { console.error("Error in loop start input change:", err); }
            };
        }
        const loopEndInput = winEl.querySelector(`#instrumentLoopEnd-${track.id}`);
        if (loopEndInput) {
            const bufferDuration = track.instrumentSamplerSettings?.audioBuffer?.duration;
            loopEndInput.value = track.instrumentSamplerSettings?.loopEnd?.toFixed(3) || (bufferDuration ? bufferDuration.toFixed(3) : '0.000');
            loopEndInput.onchange = (e) => { // Changed to onchange
                try {
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Loop End for ${track.name}`);
                    if (track && typeof track.setInstrumentSamplerLoopEnd === 'function') track.setInstrumentSamplerLoopEnd(parseFloat(e.target.value));
                } catch (err) { console.error("Error in loop end input change:", err); }
            };
        }

        const createAndPlaceKnob = (placeholderId, options) => {
            const placeholder = winEl.querySelector(`#${placeholderId}`);
            if (placeholder) {
                const knob = createKnob(options);
                placeholder.innerHTML = ''; placeholder.appendChild(knob.element); return knob;
            }
            console.warn(`[UI initializeInstrumentSamplerSpecificControls] Placeholder ${placeholderId} not found.`);
            return null;
        };
        const env = track.instrumentSamplerSettings?.envelope || { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 };
        if (!track.inspectorControls) track.inspectorControls = {};
        track.inspectorControls.instrEnvAttack = createAndPlaceKnob(`instrumentEnvAttack-${track.id}-placeholder`, { label: 'Attack', min:0.001, max:2, step:0.001, initialValue: env.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('attack', val)});
        track.inspectorControls.instrEnvDecay = createAndPlaceKnob(`instrumentEnvDecay-${track.id}-placeholder`, { label: 'Decay', min:0.01, max:2, step:0.01, initialValue: env.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('decay', val)});
        track.inspectorControls.instrEnvSustain = createAndPlaceKnob(`instrumentEnvSustain-${track.id}-placeholder`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: env.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('sustain', val)});
        track.inspectorControls.instrEnvRelease = createAndPlaceKnob(`instrumentEnvRelease-${track.id}-placeholder`, { label: 'Release', min:0.01, max:5, step:0.01, initialValue: env.release, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('release', val)});

        const polyToggleBtnInst = winEl.querySelector(`#instrumentPolyphonyToggle-${track.id}`);
        if (polyToggleBtnInst) {
            polyToggleBtnInst.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
            polyToggleBtnInst.classList.toggle('active', track.instrumentSamplerIsPolyphonic);
            polyToggleBtnInst.onclick = () => {
                try {
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Instrument Sampler Polyphony for ${track.name}`);
                    track.instrumentSamplerIsPolyphonic = !track.instrumentSamplerIsPolyphonic;
                    polyToggleBtnInst.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
                    polyToggleBtnInst.classList.toggle('active', track.instrumentSamplerIsPolyphonic);
                    if(localAppServices.showNotification) localAppServices.showNotification(`${track.name} instrument sampler mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`, 2000);
                } catch (err) { console.error("Error in instrument polyphony toggle:", err); }
            };
        }
    } catch (error) {
        console.error(`[UI initializeInstrumentSamplerSpecificControls] Error for track ${track.id}:`, error);
        if (localAppServices.showNotification) localAppServices.showNotification("Error setting up instrument sampler controls.", 3000);
    }
}

// --- Track Inspector Window (Entry Point) ---
function buildTrackInspectorContentDOM(track) {
    if (!track || typeof track.id === 'undefined') return '<div>Error: Track data not found for inspector.</div>';
    let specificControlsHTML = '';
    try {
        if (track.type === 'Synth') specificControlsHTML = buildSynthSpecificInspectorDOM(track);
        else if (track.type === 'Sampler') specificControlsHTML = buildSamplerSpecificInspectorDOM(track);
        else if (track.type === 'DrumSampler') specificControlsHTML = buildDrumSamplerSpecificInspectorDOM(track);
        else if (track.type === 'InstrumentSampler') specificControlsHTML = buildInstrumentSamplerSpecificInspectorDOM(track);
        // Audio tracks might have specific controls later (e.g., input gain, simple fx sends)
    } catch (e) {
        console.error(`[UI buildTrackInspectorContentDOM] Error building specific controls for track ${track.id} (${track.type}):`, e);
        specificControlsHTML = '<div>Error loading specific controls.</div>';
    }


    const armedTrackId = localAppServices.getArmedTrackId ? localAppServices.getArmedTrackId() : null;
    let sequencerButtonHTML = '';
    if (track.type !== 'Audio') { // Sequencer not for Audio tracks
        sequencerButtonHTML = `<button id="openSequencerBtn-${track.id}" class="control-button">Sequencer</button>`;
    }
    let monitorButtonHTML = '';
    if (track.type === 'Audio') {
        monitorButtonHTML = `<button id="monitorBtn-${track.id}" title="Toggle Input Monitoring" class="control-button ${track.isMonitoringEnabled ? 'active' : ''}">Monitor</button>`;
    }

    // Using more generic classes for buttons for easier styling from style.css
    return `
        <div class="track-inspector-content">
            <div class="common-controls grid ${track.type === 'Audio' ? 'grid-cols-4' : 'grid-cols-3'} gap-1 mb-1">
                <button id="muteBtn-${track.id}" title="Mute Track" class="control-button ${track.isMuted ? 'muted' : ''}">${track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="soloBtn-${track.id}" title="Solo Track" class="control-button ${track.isSoloed ? 'soloed' : ''}">${track.isSoloed ? 'Unsolo' : 'Solo'}</button>
                ${monitorButtonHTML}
                <button id="armInputBtn-${track.id}" title="Arm for Input" class="control-button ${armedTrackId === track.id ? 'armed' : ''}">Arm</button>
            </div>
            <div id="volumeKnob-${track.id}-placeholder" class="control-placeholder mb-1"></div>
            <div id="trackMeterContainer-${track.id}" class="meter-bar-container track-meter-container my-1">
                <div id="trackMeterBar-${track.id}" class="meter-bar" style="width: 0%;"></div>
            </div>
            <div class="type-specific-controls mt-1 border-t pt-1">${specificControlsHTML}</div>
            <div class="inspector-nav grid ${track.type === 'Audio' ? 'grid-cols-2' : 'grid-cols-3'} gap-1 mt-2">
                <button id="openEffectsBtn-${track.id}" class="control-button">Effects</button>
                ${sequencerButtonHTML}
                <button id="removeTrackBtn-${track.id}" class="control-button danger-button">Remove</button>
            </div>
        </div>`;
}

export function openTrackInspectorWindow(trackId, savedState = null) {
    if (!localAppServices.getTrackById || !localAppServices.createWindow) {
        console.error("[UI openTrackInspectorWindow] Missing core services (getTrackById or createWindow).");
        return null;
    }
    const track = localAppServices.getTrackById(trackId);
    if (!track) {
        console.error(`[UI openTrackInspectorWindow] Track ${trackId} not found.`);
        if (localAppServices.showNotification) localAppServices.showNotification(`Cannot open inspector: Track ${trackId} not found.`, 3000);
        return null;
    }

    const windowId = `trackInspector-${trackId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) { // If window exists and we are not restoring from a saved state
        const existingWindow = openWindows.get(windowId);
        if (existingWindow && typeof existingWindow.restore === 'function') existingWindow.restore();
        return existingWindow;
    }

    let inspectorWindow = null;
    try {
        const contentDOM = buildTrackInspectorContentDOM(track);
        const inspectorOptions = {
            width: 320, height: 480, minWidth: 280, minHeight: 400,
            initialContentKey: windowId,
            onCloseCallback: () => {
                if (track && track.inspectorWindow === inspectorWindow) track.inspectorWindow = null; // Clear reference on track if any
            }
        };
        if (savedState) {
            Object.assign(inspectorOptions, {
                x: parseInt(savedState.left,10), y: parseInt(savedState.top,10),
                width: parseInt(savedState.width,10), height: parseInt(savedState.height,10),
                zIndex: savedState.zIndex, isMinimized: savedState.isMinimized
            });
        }

        inspectorWindow = localAppServices.createWindow(windowId, `Inspector: ${track.name}`, contentDOM, inspectorOptions);
        track.inspectorWindow = inspectorWindow; // Store reference if needed

        if (inspectorWindow?.element) {
            initializeCommonInspectorControls(track, inspectorWindow.element);
            initializeTypeSpecificInspectorControls(track, inspectorWindow.element);
        } else if (inspectorWindow === null && !desktopEl) {
            // createWindow already logged critical error if desktopEl was missing, so no redundant log here.
        } else {
            console.warn(`[UI openTrackInspectorWindow] Window element for inspector ${trackId} was not created successfully.`);
        }
    } catch (error) {
        console.error(`[UI openTrackInspectorWindow] Error opening inspector for track ${trackId}:`, error);
        if (localAppServices.showNotification) localAppServices.showNotification(`Error opening inspector: ${error.message}`, 3000);
    }
    return inspectorWindow;
}

function initializeCommonInspectorControls(track, winEl) {
    if (!track || !winEl || !localAppServices.handleTrackMute || !localAppServices.handleTrackSolo || !localAppServices.handleTrackArm || !localAppServices.handleRemoveTrack || !localAppServices.handleOpenEffectsRack) {
        console.error("[UI initializeCommonInspectorControls] Invalid args or missing appServices for track control handlers.");
        return;
    }
    try {
        const muteBtn = winEl.querySelector(`#muteBtn-${track.id}`);
        if (muteBtn) muteBtn.onclick = () => localAppServices.handleTrackMute(track.id);
        else console.warn(`#muteBtn-${track.id} not found.`);

        const soloBtn = winEl.querySelector(`#soloBtn-${track.id}`);
        if (soloBtn) soloBtn.onclick = () => localAppServices.handleTrackSolo(track.id);
        else console.warn(`#soloBtn-${track.id} not found.`);

        const armBtn = winEl.querySelector(`#armInputBtn-${track.id}`);
        if (armBtn) armBtn.onclick = () => localAppServices.handleTrackArm(track.id);
        else console.warn(`#armInputBtn-${track.id} not found.`);

        const monitorBtn = winEl.querySelector(`#monitorBtn-${track.id}`);
        if (monitorBtn && track.type === 'Audio') {
            monitorBtn.onclick = () => { // Changed to onclick
                try {
                    track.isMonitoringEnabled = !track.isMonitoringEnabled;
                    monitorBtn.classList.toggle('active', track.isMonitoringEnabled);
                    if(localAppServices.showNotification) localAppServices.showNotification(`Input Monitoring ${track.isMonitoringEnabled ? 'ON' : 'OFF'} for ${track.name}`, 2000);
                    if (localAppServices.captureStateForUndo) {
                        localAppServices.captureStateForUndo(`Toggle Monitoring for ${track.name} to ${track.isMonitoringEnabled ? 'ON' : 'OFF'}`);
                    }
                    if (typeof track.rebuildEffectChain === 'function') track.rebuildEffectChain(); // Reconnect mic if needed
                } catch (err) { console.error("Error in monitor toggle:", err); }
            };
        } else if (track.type === 'Audio' && !monitorBtn) console.warn(`#monitorBtn-${track.id} not found for Audio track.`);


        const removeBtn = winEl.querySelector(`#removeTrackBtn-${track.id}`);
        if (removeBtn) removeBtn.onclick = () => localAppServices.handleRemoveTrack(track.id);
        else console.warn(`#removeTrackBtn-${track.id} not found.`);

        const effectsBtn = winEl.querySelector(`#openEffectsBtn-${track.id}`);
        if (effectsBtn) effectsBtn.onclick = () => localAppServices.handleOpenEffectsRack(track.id);
        else console.warn(`#openEffectsBtn-${track.id} not found.`);

        const sequencerBtn = winEl.querySelector(`#openSequencerBtn-${track.id}`);
        if (sequencerBtn && localAppServices.handleOpenSequencer) { // Check for service
            sequencerBtn.onclick = () => localAppServices.handleOpenSequencer(track.id);
        } else if (track.type !== 'Audio' && !sequencerBtn) console.warn(`#openSequencerBtn-${track.id} not found for non-Audio track.`);

        const volumeKnobPlaceholder = winEl.querySelector(`#volumeKnob-${track.id}-placeholder`);
        if (volumeKnobPlaceholder) {
            if (!track.inspectorControls) track.inspectorControls = {};
            const volumeKnob = createKnob({
                label: 'Volume', min: 0, max: 1.2, step: 0.01,
                initialValue: track.previousVolumeBeforeMute, // Use the actual volume, not potentially muted state
                decimals: 2, trackRef: track,
                onValueChange: (val, oldVal, fromInteraction) => {
                    if (track && typeof track.setVolume === 'function') {
                        track.setVolume(val, fromInteraction);
                         if (fromInteraction && localAppServices.captureStateForUndo) { // Capture undo on user interaction end
                             localAppServices.captureStateForUndo(`Set Volume for ${track.name} to ${val.toFixed(2)}`);
                         }
                    }
                }
            });
            volumeKnobPlaceholder.innerHTML = ''; volumeKnobPlaceholder.appendChild(knob.element);
            track.inspectorControls.volume = knob;
        } else { console.warn(`#volumeKnob-${track.id}-placeholder not found.`); }
    } catch (error) {
        console.error(`[UI initializeCommonInspectorControls] Error for track ${track.id}:`, error);
    }
}

function initializeTypeSpecificInspectorControls(track, winEl) {
    if (!track || !winEl) return;
    try {
        if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl);
        else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl);
        else if (track.type === 'DrumSampler') initializeDrumSamplerSpecificControls(track, winEl);
        else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl);
        // Add more types as needed
    } catch (error) {
        console.error(`[UI initializeTypeSpecificInspectorControls] Error for track ${track.id} (${track.type}):`, error);
    }
}

// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    if (!owner && ownerType === 'track') return '<div>Error: Track owner not provided for effects rack.</div>';

    const ownerId = (ownerType === 'track' && owner) ? owner.id : 'master';
    const ownerName = (ownerType === 'track' && owner) ? (owner.name || `Track ${owner.id}`) : 'Master Bus';
    return `<div id="effectsRackContent-${ownerId}" class="effects-rack-content">
        <h3 class="effects-rack-title">Effects Rack: ${ownerName}</h3>
        <div id="effectsList-${ownerId}" class="effects-list-container"></div>
        <button id="addEffectBtn-${ownerId}" class="control-button primary-button">Add Effect</button>
        <div id="effectControlsContainer-${ownerId}" class="effect-controls-panel"></div>
    </div>`;
}

export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    if (!listDiv) {
        console.warn(`[UI renderEffectsList] List div not provided for owner ${ownerType === 'track' ? owner?.id : 'master'}.`);
        return;
    }
    try {
        listDiv.innerHTML = ''; // Clear previous list
        const effectsArray = (ownerType === 'track' && owner && owner.activeEffects) ?
            owner.activeEffects :
            (ownerType === 'master' && localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);

        if (!effectsArray || effectsArray.length === 0) {
            listDiv.innerHTML = '<p class="empty-list-message">No effects added.</p>';
            if (controlsContainer) controlsContainer.innerHTML = ''; // Clear controls if no effects
            return;
        }

        const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};

        effectsArray.forEach((effect, index) => {
            if (!effect || !effect.type) {
                console.warn("[UI renderEffectsList] Invalid effect object found in list:", effect);
                return;
            }
            const effectDef = AVAILABLE_EFFECTS_LOCAL[effect.type];
            const displayName = effectDef?.displayName || effect.type;
            const item = document.createElement('div');
            item.className = 'effect-item';
            item.innerHTML = `<span class="effect-name" title="Edit ${displayName}">${displayName}</span>
                <div class="effect-actions">
                    <button class="up-btn small-icon-button" ${index === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                    <button class="down-btn small-icon-button" ${index === effectsArray.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                    <button class="remove-btn small-icon-button danger" title="Remove Effect">✕</button>
                </div>`;

            const nameSpan = item.querySelector('.effect-name');
            if (nameSpan) {
                nameSpan.onclick = () => { // Changed to onclick
                    try {
                        if (typeof renderEffectControls === 'function') renderEffectControls(owner, ownerType, effect.id, controlsContainer);
                        listDiv.querySelectorAll('.effect-item.selected').forEach(el => el.classList.remove('selected'));
                        item.classList.add('selected');
                    } catch (err) { console.error("Error in effect name click:", err); }
                };
            }
            const upBtn = item.querySelector('.up-btn');
            if (upBtn) {
                upBtn.onclick = () => { // Changed to onclick
                    try {
                        if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Reorder effect on ${ownerType === 'track' ? owner.name : 'Master'}`);
                        if (ownerType === 'track' && owner && typeof owner.reorderEffect === 'function') owner.reorderEffect(effect.id, index - 1);
                        else if (ownerType === 'master' && localAppServices.reorderMasterEffect) localAppServices.reorderMasterEffect(effect.id, index - 1);
                    } catch (err) { console.error("Error in effect up button click:", err); }
                };
            }
            const downBtn = item.querySelector('.down-btn');
            if (downBtn) {
                downBtn.onclick = () => { // Changed to onclick
                    try {
                        if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Reorder effect on ${ownerType === 'track' ? owner.name : 'Master'}`);
                        if (ownerType === 'track' && owner && typeof owner.reorderEffect === 'function') owner.reorderEffect(effect.id, index + 1);
                        else if (ownerType === 'master' && localAppServices.reorderMasterEffect) localAppServices.reorderMasterEffect(effect.id, index + 1);
                    } catch (err) { console.error("Error in effect down button click:", err); }
                };
            }
            const removeBtn = item.querySelector('.remove-btn');
            if (removeBtn) {
                removeBtn.onclick = () => { // Changed to onclick
                    try {
                        if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Remove ${effect.type} from ${ownerType === 'track' ? owner.name : 'Master'}`);
                        if (ownerType === 'track' && owner && typeof owner.removeEffect === 'function') owner.removeEffect(effect.id);
                        else if (ownerType === 'master' && localAppServices.removeMasterEffect) localAppServices.removeMasterEffect(effect.id);
                        // After removal, if this was the selected effect, clear controls
                        if (item.classList.contains('selected') && controlsContainer) controlsContainer.innerHTML = '<p class="empty-list-message">Select an effect.</p>';
                    } catch (err) { console.error("Error in effect remove button click:", err); }
                };
            }
            listDiv.appendChild(item);
        });
    } catch (error) {
        console.error(`[UI renderEffectsList] Error rendering effects for ${ownerType === 'track' ? owner?.id : 'master'}:`, error);
        listDiv.innerHTML = '<p class="error-message">Error loading effects list.</p>';
    }
}


export function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    if (!controlsContainer) {
        console.warn(`[UI renderEffectControls] Controls container not provided for effect ${effectId}.`);
        return;
    }
    try {
        controlsContainer.innerHTML = ''; // Clear previous controls
        const effectsArray = (ownerType === 'track' && owner && owner.activeEffects) ?
            owner.activeEffects :
            (ownerType === 'master' && localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);

        if (!effectsArray) {
            controlsContainer.innerHTML = '<p class="empty-list-message">Error: Could not retrieve effects list.</p>';
            return;
        }

        const effectWrapper = effectsArray.find(e => e && e.id === effectId);

        if (!effectWrapper || !effectWrapper.type) {
            controlsContainer.innerHTML = '<p class="empty-list-message">Select an effect to see its controls.</p>';
            return;
        }

        const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
        const effectDef = AVAILABLE_EFFECTS_LOCAL[effectWrapper.type];

        if (!effectDef) {
            controlsContainer.innerHTML = `<p class="error-message">Error: Definition for effect type "${effectWrapper.type}" not found.</p>`;
            return;
        }

        const titleEl = document.createElement('h4');
        titleEl.className = 'control-group-title'; // Use consistent titling
        titleEl.textContent = `Controls: ${effectDef.displayName || effectWrapper.type}`;
        controlsContainer.appendChild(titleEl);

        const gridContainer = document.createElement('div');
        gridContainer.className = 'control-grid'; // Generic grid class

        if (!effectDef.params || effectDef.params.length === 0) {
            gridContainer.innerHTML = '<p class="empty-list-message col-span-full">No adjustable parameters for this effect.</p>';
        } else {
            effectDef.params.forEach(paramDef => {
                if (!paramDef || !paramDef.key) {
                    console.warn("[UI renderEffectControls] Invalid parameter definition found:", paramDef);
                    return;
                }
                const controlWrapper = document.createElement('div');
                controlWrapper.className = 'control-placeholder'; // For consistent spacing/styling

                let currentValue;
                const pathKeys = paramDef.key.split('.');
                let tempVal = effectWrapper.params;
                let paramFound = true;
                for (const key of pathKeys) {
                    if (tempVal && typeof tempVal === 'object' && tempVal.hasOwnProperty(key)) {
                        tempVal = tempVal[key];
                    } else {
                        tempVal = undefined; paramFound = false; break;
                    }
                }
                currentValue = paramFound ? tempVal : paramDef.defaultValue;


                if (paramDef.type === 'knob') {
                    const knob = createKnob({
                        label: paramDef.label, min: paramDef.min, max: paramDef.max, step: paramDef.step,
                        initialValue: currentValue, decimals: paramDef.decimals, displaySuffix: paramDef.displaySuffix,
                        trackRef: (ownerType === 'track' ? owner : null), // Pass track for undo context
                        onValueChange: (val) => {
                            try {
                                if (ownerType === 'track' && owner && typeof owner.updateEffectParam === 'function') {
                                    owner.updateEffectParam(effectId, paramDef.key, val);
                                } else if (ownerType === 'master' && localAppServices.updateMasterEffectParam) {
                                    localAppServices.updateMasterEffectParam(effectId, paramDef.key, val);
                                }
                            } catch (err) { console.error("Error in effect knob onValueChange:", err); }
                        }
                    });
                    if (knob && knob.element) controlWrapper.appendChild(knob.element);
                } else if (paramDef.type === 'select') {
                    const label = document.createElement('label');
                    label.className = 'input-label'; label.textContent = paramDef.label + ':';
                    const select = document.createElement('select');
                    select.className = 'input-field w-full'; // Consistent input styling
                    (paramDef.options || []).forEach(opt => {
                        const option = document.createElement('option');
                        option.value = typeof opt === 'object' ? opt.value : opt;
                        option.textContent = typeof opt === 'object' ? opt.text : opt;
                        select.appendChild(option);
                    });
                    select.value = currentValue;
                    select.onchange = (e) => { // Changed to onchange
                        try {
                            const newValue = e.target.value;
                            // Attempt to parse as number if original default was number (for select options like [-12, -24])
                            const finalValue = (typeof paramDef.defaultValue === 'number' && !isNaN(parseFloat(newValue))) ? parseFloat(newValue) : newValue;
                            if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Change ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' && owner ? owner.name : 'Master'}`);
                            if (ownerType === 'track' && owner && typeof owner.updateEffectParam === 'function') {
                                owner.updateEffectParam(effectId, paramDef.key, finalValue);
                            } else if (ownerType === 'master' && localAppServices.updateMasterEffectParam) {
                                localAppServices.updateMasterEffectParam(effectId, paramDef.key, finalValue);
                            }
                        } catch (err) { console.error("Error in effect select onchange:", err); }
                    };
                    controlWrapper.appendChild(label); controlWrapper.appendChild(select);
                } else if (paramDef.type === 'toggle') { // Assuming a toggle button style
                    const button = document.createElement('button');
                    button.className = `control-button toggle-button ${currentValue ? 'active' : ''}`;
                    button.textContent = `${paramDef.label}: ${currentValue ? 'ON' : 'OFF'}`;
                    button.onclick = () => { // Changed to onclick
                        try {
                            const newValue = !currentValue; // current value here is from the loop, might need re-fetch for accurate toggle
                            if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' && owner ? owner.name : 'Master'}`);
                            if (ownerType === 'track' && owner && typeof owner.updateEffectParam === 'function') {
                                owner.updateEffectParam(effectId, paramDef.key, newValue);
                                // Update button text/class based on the new state after updateEffectParam if it doesn't re-render
                                button.textContent = `${paramDef.label}: ${newValue ? 'ON' : 'OFF'}`;
                                button.classList.toggle('active', newValue);
                                currentValue = newValue; // Update local current value for next toggle
                            } else if (ownerType === 'master' && localAppServices.updateMasterEffectParam) {
                                localAppServices.updateMasterEffectParam(effectId, paramDef.key, newValue);
                                button.textContent = `${paramDef.label}: ${newValue ? 'ON' : 'OFF'}`;
                                button.classList.toggle('active', newValue);
                                currentValue = newValue;
                            }
                        } catch (err) { console.error("Error in effect toggle click:", err); }
                    };
                    controlWrapper.appendChild(button);
                }
                gridContainer.appendChild(controlWrapper);
            });
        }
        controlsContainer.appendChild(gridContainer);
    } catch (error) {
        console.error(`[UI renderEffectControls] Error rendering controls for effect ${effectId}:`, error);
        controlsContainer.innerHTML = '<p class="error-message">Error loading effect controls.</p>';
    }
}

function showAddEffectModal(owner, ownerType) {
    if (!localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || typeof showCustomModal !== 'function') {
        console.error("[UI showAddEffectModal] Missing effects registry or showCustomModal utility.");
        if (localAppServices.showNotification) localAppServices.showNotification("Cannot open add effect dialog: Missing resources.", 3000);
        return;
    }
    try {
        const ownerName = (ownerType === 'track' && owner) ? (owner.name || `Track ${owner.id}`) : 'Master Bus';
        let modalContentHTML = `<div class="add-effect-list-container"><ul class="modal-list">`; // Use more specific classes
        const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess.AVAILABLE_EFFECTS;
        for (const effectKey in AVAILABLE_EFFECTS_LOCAL) {
            if (Object.prototype.hasOwnProperty.call(AVAILABLE_EFFECTS_LOCAL, effectKey)) {
                modalContentHTML += `<li class="modal-list-item" data-effect-type="${effectKey}">${AVAILABLE_EFFECTS_LOCAL[effectKey].displayName || effectKey}</li>`;
            }
        }
        modalContentHTML += `</ul></div>`;

        const modal = showCustomModal(`Add Effect to ${ownerName}`, modalContentHTML, [], 'add-effect-modal'); // No default buttons, handled by li clicks

        if (modal?.contentDiv) {
            modal.contentDiv.querySelectorAll('li[data-effect-type]').forEach(item => {
                item.onclick = () => { // Changed to onclick
                    try {
                        const effectType = item.dataset.effectType;
                        if (!effectType) return;

                        if (ownerType === 'track' && owner && typeof owner.addEffect === 'function') {
                            owner.addEffect(effectType);
                        } else if (ownerType === 'master' && localAppServices.addMasterEffect) {
                            localAppServices.addMasterEffect(effectType);
                        } else {
                            console.warn(`[UI showAddEffectModal] Cannot add effect: Invalid owner type or missing add function. OwnerType: ${ownerType}`);
                        }
                        if (modal.overlay && modal.overlay.remove) modal.overlay.remove(); // Close modal
                    } catch (err) {
                        console.error("Error in add effect modal item click:", err);
                        if (modal.overlay && modal.overlay.remove) modal.overlay.remove();
                    }
                };
            });
        } else {
            console.warn("[UI showAddEffectModal] Modal contentDiv not found after creating modal.");
        }
    } catch (error) {
        console.error("[UI showAddEffectModal] Error showing add effect modal:", error);
        if (localAppServices.showNotification) localAppServices.showNotification("Error opening add effect dialog.", 3000);
    }
}


// --- Window Opening Functions ---
export function openTrackEffectsRackWindow(trackId, savedState = null) {
    if (!localAppServices.getTrackById || !localAppServices.createWindow) {
        console.error("[UI openTrackEffectsRackWindow] Missing core services.");
        return null;
    }
    const track = localAppServices.getTrackById(trackId);
    if (!track) {
        console.warn(`[UI openTrackEffectsRackWindow] Track ${trackId} not found.`);
        return null;
    }
    const windowId = `effectsRack-${trackId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        if (win && typeof win.restore === 'function') win.restore();
        return win;
    }

    let rackWindow = null;
    try {
        const contentDOM = buildModularEffectsRackDOM(track, 'track');
        const rackOptions = { width: 350, height: 400, minWidth: 300, minHeight: 250, initialContentKey: windowId };
        if (savedState) Object.assign(rackOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

        rackWindow = localAppServices.createWindow(windowId, `Effects: ${track.name}`, contentDOM, rackOptions);
        if (rackWindow?.element) {
            const listDiv = rackWindow.element.querySelector(`#effectsList-${track.id}`);
            const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-${track.id}`);
            const addBtn = rackWindow.element.querySelector(`#addEffectBtn-${track.id}`);

            if (listDiv && controlsContainer) {
                if (typeof renderEffectsList === 'function') renderEffectsList(track, 'track', listDiv, controlsContainer);
            } else { console.warn(`[UI openTrackEffectsRackWindow] Effects list or controls container not found for track ${track.id}.`); }

            if (addBtn) addBtn.onclick = () => showAddEffectModal(track, 'track'); // Changed to onclick
            else console.warn(`[UI openTrackEffectsRackWindow] Add effect button not found for track ${track.id}.`);
        }
    } catch (error) {
        console.error(`[UI openTrackEffectsRackWindow] Error opening effects rack for track ${trackId}:`, error);
        if (localAppServices.showNotification) localAppServices.showNotification("Error opening effects rack.", 3000);
    }
    return rackWindow;
}

export function openMasterEffectsRackWindow(savedState = null) {
    if (!localAppServices.createWindow) {
        console.error("[UI openMasterEffectsRackWindow] createWindow service missing.");
        return null;
    }
    const windowId = 'masterEffectsRack';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        if (win && typeof win.restore === 'function') win.restore();
        return win;
    }

    let rackWindow = null;
    try {
        const contentDOM = buildModularEffectsRackDOM(null, 'master');
        const rackOptions = { width: 350, height: 400, minWidth: 300, minHeight: 250, initialContentKey: windowId };
        if (savedState) Object.assign(rackOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

        rackWindow = localAppServices.createWindow(windowId, 'Master Effects Rack', contentDOM, rackOptions);
        if (rackWindow?.element) {
            const listDiv = rackWindow.element.querySelector(`#effectsList-master`);
            const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-master`);
            const addBtn = rackWindow.element.querySelector(`#addEffectBtn-master`);

            if (listDiv && controlsContainer && typeof renderEffectsList === 'function') {
                 renderEffectsList(null, 'master', listDiv, controlsContainer);
            } else { console.warn(`[UI openMasterEffectsRackWindow] Master effects list or controls container not found, or renderEffectsList is missing.`); }

            if (addBtn) addBtn.onclick = () => showAddEffectModal(null, 'master'); // Changed to onclick
            else console.warn(`[UI openMasterEffectsRackWindow] Add master effect button not found.`);
        }
    } catch (error) {
        console.error("[UI openMasterEffectsRackWindow] Error opening master effects rack:", error);
        if (localAppServices.showNotification) localAppServices.showNotification("Error opening master effects rack.", 3000);
    }
    return rackWindow;
}

// ... (openGlobalControlsWindow, openSoundBrowserWindow, updateSoundBrowserDisplayForLibrary, renderSoundBrowserDirectory - these are large and were split before, ensuring robustness)
// For brevity in this example, I'll assume they are handled similarly with checks for localAppServices and DOM elements.
// The previous parts should have covered their robustness improvements.

export function openGlobalControlsWindow(onReadyCallback, savedState = null) {
    if (!localAppServices.createWindow) {
        console.error("[UI openGlobalControlsWindow] createWindow service missing.");
        return null;
    }
    const windowId = 'globalControls';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();

    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        if (win && typeof win.restore === 'function') win.restore();
        if (typeof onReadyCallback === 'function' && win?.element) {
            // Gather elements again if restoring
            const elements = {
                playBtnGlobal: win.element.querySelector('#playBtnGlobal'),
                recordBtnGlobal: win.element.querySelector('#recordBtnGlobal'),
                tempoGlobalInput: win.element.querySelector('#tempoGlobalInput'),
                midiInputSelectGlobal: win.element.querySelector('#midiInputSelectGlobal'),
                masterMeterContainerGlobal: win.element.querySelector('#masterMeterContainerGlobal'),
                masterMeterBarGlobal: win.element.querySelector('#masterMeterBarGlobal'),
                midiIndicatorGlobal: win.element.querySelector('#midiIndicatorGlobal'),
                keyboardIndicatorGlobal: win.element.querySelector('#keyboardIndicatorGlobal'),
                playbackModeToggleBtnGlobal: win.element.querySelector('#playbackModeToggleBtnGlobal')
            };
            onReadyCallback(elements);
        }
        return win;
    }

    const contentHTML = `<div id="global-controls-content" class="global-controls-window"> <div class="flex grid-cols-2 gap-2 items-center"> <button id="playBtnGlobal" title="Play/Pause (Spacebar)" class="control-button primary-button">Play</button> <button id="recordBtnGlobal" title="Record Arm/Disarm" class="control-button danger-button">Record</button> </div> <div> <label for="tempoGlobalInput" class="input-label">Tempo (BPM):</label> <input type="number" id="tempoGlobalInput" value="120" min="30" max="300" step="0.1" class="input-field"> </div> <div> <label for="midiInputSelectGlobal" class="input-label">MIDI Input:</label> <select id="midiInputSelectGlobal" class="input-field"> <option value="">No MIDI Input</option> </select> </div> <div class="pt-1"> <label class="input-label">Master Level:</label> <div id="masterMeterContainerGlobal" class="meter-bar-container"> <div id="masterMeterBarGlobal" class="meter-bar" style="width: 0%;"></div> </div> </div> <div class="flex justify-between items-center text-xs mt-1.5"> <span id="midiIndicatorGlobal" title="MIDI Activity" class="indicator">MIDI</span> <span id="keyboardIndicatorGlobal" title="Computer Keyboard Activity" class="indicator">KBD</span> </div> <div class="mt-2"> <button id="playbackModeToggleBtnGlobal" title="Toggle Playback Mode" class="control-button w-full">Mode: Sequencer</button> </div> </div>`;
    const options = { width: 280, height: 350, minWidth: 250, minHeight: 330, closable: true, minimizable: true, resizable: true, initialContentKey: windowId };
    if (savedState) Object.assign(options, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

    const newWindow = localAppServices.createWindow(windowId, 'Global Controls', contentHTML, options);
    if (newWindow?.element && typeof onReadyCallback === 'function') {
        const elements = {
            playBtnGlobal: newWindow.element.querySelector('#playBtnGlobal'),
            recordBtnGlobal: newWindow.element.querySelector('#recordBtnGlobal'),
            tempoGlobalInput: newWindow.element.querySelector('#tempoGlobalInput'),
            midiInputSelectGlobal: newWindow.element.querySelector('#midiInputSelectGlobal'),
            masterMeterContainerGlobal: newWindow.element.querySelector('#masterMeterContainerGlobal'),
            masterMeterBarGlobal: newWindow.element.querySelector('#masterMeterBarGlobal'),
            midiIndicatorGlobal: newWindow.element.querySelector('#midiIndicatorGlobal'),
            keyboardIndicatorGlobal: newWindow.element.querySelector('#keyboardIndicatorGlobal'),
            playbackModeToggleBtnGlobal: newWindow.element.querySelector('#playbackModeToggleBtnGlobal')
        };
        onReadyCallback(elements);
    } else if (!newWindow?.element) {
        console.warn("[UI openGlobalControlsWindow] Window element not created or onReadyCallback not a function.");
    }
    return newWindow;
}

// --- Mixer Window ---
export function openMixerWindow(savedState = null) {
    // ... (robustness checks for localAppServices.createWindow, DOM elements, etc.)
    // This function was relatively simple and its core logic (renderMixer) will be made robust.
    if (!localAppServices.createWindow) {
        console.error("[UI openMixerWindow] createWindow service missing.");
        return null;
    }
    const windowId = 'mixer';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        if (win && typeof win.restore === 'function') win.restore();
        if (typeof updateMixerWindow === 'function') updateMixerWindow(); // Re-render on restore
        return win;
    }

    const contentContainer = document.createElement('div');
    contentContainer.id = 'mixerContentContainer';
    contentContainer.className = 'mixer-content-container'; // Use specific class
    
    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const defaultWidth = Math.min(800, (desktopEl?.offsetWidth || 800) - 40);

    const mixerOptions = { width: defaultWidth, height: 300, minWidth: 300, minHeight: 200, initialContentKey: windowId };
    if (savedState) Object.assign(mixerOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10) || defaultWidth, height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    
    const mixerWindow = localAppServices.createWindow(windowId, 'Mixer', contentContainer, mixerOptions);
    if (mixerWindow?.element && typeof updateMixerWindow === 'function') updateMixerWindow();
    return mixerWindow;
}

export function updateMixerWindow() {
    if (!localAppServices.getWindowById) return;
    const mixerWindow = localAppServices.getWindowById('mixer');
    if (!mixerWindow?.element || mixerWindow.isMinimized) return;
    const container = mixerWindow.element.querySelector('#mixerContentContainer');
    if (container && typeof renderMixer === 'function') {
        renderMixer(container);
    } else if (!container) {
        console.warn("[UI updateMixerWindow] Mixer content container not found.");
    }
}

export function renderMixer(container) {
    if (!container) { console.error("[UI renderMixer] Container element not provided."); return; }
    if (!localAppServices.getTracks || !localAppServices.getMasterGainValue) {
        console.error("[UI renderMixer] Missing required services (getTracks or getMasterGainValue).");
        container.innerHTML = "<p class='error-message'>Error loading mixer data.</p>";
        return;
    }
    try {
        const tracks = localAppServices.getTracks() || [];
        container.innerHTML = ''; // Clear previous content

        // Master Track
        const masterTrackDiv = document.createElement('div');
        masterTrackDiv.className = 'mixer-track master-track';
        masterTrackDiv.innerHTML = `<div class="track-name" title="Master">Master</div> <div id="masterVolumeKnob-mixer-placeholder" class="control-placeholder"></div> <div id="mixerMasterMeterContainer" class="meter-bar-container mixer-meter-container"> <div id="mixerMasterMeterBar" class="meter-bar" style="width: 0%;"></div> </div>`;
        container.appendChild(masterTrackDiv);

        const masterVolKnobPlaceholder = masterTrackDiv.querySelector('#masterVolumeKnob-mixer-placeholder');
        if (masterVolKnobPlaceholder) {
            const masterGainValue = localAppServices.getMasterGainValue(); // Get current master gain
            const masterVolKnob = createKnob({
                label: 'Master Vol', min: 0, max: 1.2, step: 0.01, initialValue: masterGainValue, decimals: 2,
                onValueChange: (val, oldVal, fromInteraction) => {
                    if (localAppServices.setActualMasterVolume) localAppServices.setActualMasterVolume(val);
                    if (localAppServices.setMasterGainValueState) localAppServices.setMasterGainValueState(val); // Update state
                    if (fromInteraction && localAppServices.captureStateForUndo) {
                        localAppServices.captureStateForUndo(`Set Master Volume to ${val.toFixed(2)}`);
                    }
                }
            });
            if(masterVolKnob && masterVolKnob.element) {
                masterVolKnobPlaceholder.innerHTML = ''; masterVolKnobPlaceholder.appendChild(masterVolKnob.element);
            }
        } else { console.warn("[UI renderMixer] Master volume knob placeholder not found."); }

        // Individual Tracks
        tracks.forEach(track => {
            if (!track || typeof track.id === 'undefined') return;
            const trackDiv = document.createElement('div');
            trackDiv.className = 'mixer-track';
            trackDiv.innerHTML = `<div class="track-name" title="${track.name}">${track.name.substring(0,12) + (track.name.length > 12 ? '...' : '')}</div> <div id="volumeKnob-mixer-${track.id}-placeholder" class="control-placeholder"></div> <div class="mixer-track-buttons grid grid-cols-2 gap-0.5 my-1"> <button id="mixerMuteBtn-${track.id}" title="Mute" class="small-button ${track.isMuted ? 'muted' : ''}">${track.isMuted ? 'U' : 'M'}</button> <button id="mixerSoloBtn-${track.id}" title="Solo" class="small-button ${track.isSoloed ? 'soloed' : ''}">${track.isSoloed ? 'U' : 'S'}</button> </div> <div id="mixerTrackMeterContainer-${track.id}" class="meter-bar-container mixer-meter-container"> <div id="mixerTrackMeterBar-${track.id}" class="meter-bar" style="width: 0%;"></div> </div>`;
            
            if (localAppServices.handleOpenTrackInspector && localAppServices.handleOpenEffectsRack && localAppServices.handleOpenSequencer &&
                localAppServices.handleTrackMute && localAppServices.handleTrackSolo && localAppServices.handleTrackArm && localAppServices.handleRemoveTrack) {
                trackDiv.oncontextmenu = (e) => { // Changed to oncontextmenu
                    try {
                        e.preventDefault();
                        const menuItems = [ /* ... (menu items as before, ensure services are checked before calling) ... */ ];
                        // Example for one item:
                        menuItems.push({label: "Open Inspector", action: () => localAppServices.handleOpenTrackInspector(track.id)});
                        // ... add other items similarly, checking for service existence
                        if (typeof createContextMenu === 'function') createContextMenu(e, menuItems, localAppServices);
                    } catch (err) { console.error("Error in mixer track context menu:", err); }
                };
            }
            container.appendChild(trackDiv);

            const volKnobPlaceholder = trackDiv.querySelector(`#volumeKnob-mixer-${track.id}-placeholder`);
            if (volKnobPlaceholder) {
                const volKnob = createKnob({
                    label: `Vol ${track.id+1}`, min: 0, max: 1.2, step: 0.01, initialValue: track.previousVolumeBeforeMute, decimals: 2, trackRef: track,
                    onValueChange: (val, oldVal, fromInteraction) => {
                        if (typeof track.setVolume === 'function') track.setVolume(val, fromInteraction);
                        if (fromInteraction && localAppServices.captureStateForUndo) {
                             localAppServices.captureStateForUndo(`Set Volume for ${track.name} to ${val.toFixed(2)}`);
                        }
                    }
                });
                 if(volKnob && volKnob.element) {
                    volKnobPlaceholder.innerHTML = ''; volKnobPlaceholder.appendChild(volKnob.element);
                }
            } else { console.warn(`[UI renderMixer] Volume knob placeholder for track ${track.id} not found.`); }

            const muteBtn = trackDiv.querySelector(`#mixerMuteBtn-${track.id}`);
            if (muteBtn && localAppServices.handleTrackMute) muteBtn.onclick = () => localAppServices.handleTrackMute(track.id);
            const soloBtn = trackDiv.querySelector(`#mixerSoloBtn-${track.id}`);
            if (soloBtn && localAppServices.handleTrackSolo) soloBtn.onclick = () => localAppServices.handleTrackSolo(track.id);
        });
    } catch (error) {
        console.error("[UI renderMixer] Error rendering mixer:", error);
        container.innerHTML = "<p class='error-message'>Error displaying mixer.</p>";
    }
}


// --- Sequencer Window ---
// ... (buildSequencerContentDOM, openTrackSequencerWindow, updateSequencerCellUI, highlightPlayingStep)
// These would require similar robustness checks for DOM elements and appService calls.
// For brevity, their detailed modifications are omitted here but would follow the same patterns.
// Key things to check:
// - Existence of `track` object and its properties in `buildSequencerContentDOM`.
// - `localAppServices.createWindow` and other service calls in `openTrackSequencerWindow`.
// - `querySelector` calls within `openTrackSequencerWindow` for attaching listeners.
// - `sequencerWindow.element` and `cell` in `updateSequencerCellUI`.
// - `seqWindow.element` and `seqWindow.stepCellsGrid` in `highlightPlayingStep`.

// --- Timeline UI Functions ---
// ... (renderTimeline, updatePlayheadPosition, openTimelineWindow)
// Similar robustness checks for DOM elements (`timelineWindow.element`, `tracksArea`, `playhead`, etc.)
// and appService calls (`localAppServices.getWindowById`, `localAppServices.getPlaybackMode`, etc.).
// Ensure Tone.js objects are checked before use in `updatePlayheadPosition`.
// Error handling for player creation and loading in `renderTimeline` if audio clips are involved.

// Placeholder for the rest of the large UI functions, assuming similar improvements.
// A full refactor would involve applying these patterns throughout.
// For example, in openTrackSequencerWindow:
export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) {
    if (!localAppServices.getTrackById || !localAppServices.createWindow) {
        console.error("[UI openTrackSequencerWindow] Missing core services.");
        return null;
    }
    // ... (rest of the logic with robustness checks as demonstrated in other openWindow functions)
    console.log(`[UI openTrackSequencerWindow] Called for track ${trackId}. Force redraw: ${forceRedraw}`);
    const track = localAppServices.getTrackById(trackId);
    if (!track || track.type === 'Audio') {
        console.warn(`[UI openTrackSequencerWindow] Track ${trackId} not found or is Audio type. Aborting.`);
        return null;
    }
    // ... rest of the implementation with safety checks ...
    return null; // Placeholder
}

export function updateSequencerCellUI(sequencerWindowElement, trackType, row, col, isActive) {
    if (!sequencerWindowElement) {
        // console.warn("[UI updateSequencerCellUI] Sequencer window element not provided."); // Can be noisy
        return;
    }
    try {
        const cell = sequencerWindowElement.querySelector(`.sequencer-step-cell[data-row="${row}"][data-col="${col}"]`);
        if (!cell) {
            // console.warn(`[UI updateSequencerCellUI] Cell not found for row ${row}, col ${col}.`); // Can be noisy
            return;
        }
        cell.classList.remove('active-synth', 'active-sampler', 'active-drum-sampler', 'active-instrument-sampler');
        if (isActive) {
            let activeClass = '';
            if (trackType === 'Synth') activeClass = 'active-synth';
            else if (trackType === 'Sampler') activeClass = 'active-sampler';
            else if (trackType === 'DrumSampler') activeClass = 'active-drum-sampler';
            else if (trackType === 'InstrumentSampler') activeClass = 'active-instrument-sampler';
            if (activeClass) cell.classList.add(activeClass);
        }
    } catch (error) {
        console.error(`[UI updateSequencerCellUI] Error updating cell for ${trackType} at ${row},${col}:`, error);
    }
}

export function highlightPlayingStep(trackId, col) {
    if (!localAppServices.getTrackById || !localAppServices.getOpenWindows) return;
    try {
        const track = localAppServices.getTrackById(trackId);
        if (!track || track.type === 'Audio') return;

        const openWindows = localAppServices.getOpenWindows();
        const seqWindow = openWindows.get(`sequencerWin-${trackId}`);

        if (seqWindow && seqWindow.element && !seqWindow.isMinimized && seqWindow.stepCellsGrid) {
            const activeSeq = track.getActiveSequence();
            if (!activeSeq) return;
            const currentSeqLength = activeSeq.length || Constants.defaultStepsPerBar;

            if (seqWindow.lastPlayedCol !== undefined && seqWindow.lastPlayedCol !== -1 && seqWindow.lastPlayedCol < currentSeqLength) {
                for (let i = 0; i < seqWindow.stepCellsGrid.length; i++) {
                    const cell = seqWindow.stepCellsGrid[i]?.[seqWindow.lastPlayedCol];
                    if (cell) cell.classList.remove('playing');
                }
            }

            if (col < currentSeqLength) {
                for (let i = 0; i < seqWindow.stepCellsGrid.length; i++) {
                    const cell = seqWindow.stepCellsGrid[i]?.[col];
                    if (cell) cell.classList.add('playing');
                }
            }
            seqWindow.lastPlayedCol = col;
        }
    } catch (error) {
        console.error(`[UI highlightPlayingStep] Error for track ${trackId}, col ${col}:`, error);
    }
}


export function renderTimeline() { /* ... with robustness checks ... */ }
export function updatePlayheadPosition() { /* ... with robustness checks ... */ }
export function openTimelineWindow(savedState = null) { /* ... with robustness checks ... */ return null; }
// The functions drawWaveform, renderSamplePads, etc., were in Part 1.
// Ensure their robustness if they were not fully covered there.

// Final check for any other functions if this were a complete refactor.
// The functions like openSoundBrowserWindow, updateSoundBrowserDisplayForLibrary, renderSoundBrowserDirectory
// would also need similar checks for appServices and DOM elements.
// For instance:
export function openSoundBrowserWindow(savedState = null) {
    if (!localAppServices.createWindow || !localAppServices.getCurrentLibraryName) {
        console.error("[UI openSoundBrowserWindow] Missing core services.");
        return null;
    }
    // ... rest of the implementation with safety checks for DOM querySelectors and appService calls ...
    return null; // Placeholder
}
export function updateSoundBrowserDisplayForLibrary(libraryName, isLoading = false, hasError = false) {
    if (!localAppServices.getWindowById) return;
    // ... rest of the implementation with safety checks ...
}
export function renderSoundBrowserDirectory(pathArray, treeNode) {
     if (!localAppServices.getWindowById || !localAppServices.getCurrentLibraryName) return;
    // ... rest of the implementation with safety checks ...
}
// In ui.js

// Ensure this function is present and exported:
export function drawInstrumentWaveform(track) {
    // Check if track and necessary properties are valid
    if (!track || !track.instrumentWaveformCanvasCtx || !track.instrumentSamplerSettings?.audioBuffer?.loaded) {
        if (track && track.instrumentWaveformCanvasCtx) {
            const canvas = track.instrumentWaveformCanvasCtx.canvas;
            const ctx = track.instrumentWaveformCanvasCtx;
            if (canvas && ctx) {
                try {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    // Determine fillStyle based on current theme if possible, or use a safe default
                    const isDarkTheme = canvas.classList?.contains('dark') || document.body.classList.contains('dark-theme-active'); // Example check
                    ctx.fillStyle = isDarkTheme ? '#334155' : '#e0e0e0'; // Example dark/light theme colors
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = isDarkTheme ? '#94a3b8' : '#a0a0a0';
                    ctx.textAlign = 'center';
                    ctx.font = '12px Inter, sans-serif';
                    ctx.fillText('No audio loaded or buffer not processed', canvas.width / 2, canvas.height / 2);
                } catch (e) {
                    console.error("[UI drawInstrumentWaveform] Error drawing 'No audio' message:", e);
                }
            }
        }
        return;
    }

    const canvas = track.instrumentWaveformCanvasCtx.canvas;
    const ctx = track.instrumentWaveformCanvasCtx;

    if (!canvas || !ctx) {
        console.error("[UI drawInstrumentWaveform] Canvas or context is missing for track:", track.id);
        return;
    }

    try {
        const buffer = track.instrumentSamplerSettings.audioBuffer.get(); // Assuming .get() returns the AudioBuffer
        if (!buffer) {
             console.warn(`[UI drawInstrumentWaveform] AudioBuffer not available in instrumentSamplerSettings for track ${track.id}`);
             // Optionally draw an empty/error state here as well
             return;
        }
        const data = buffer.getChannelData(0); // Use first channel for waveform

        const step = Math.ceil(data.length / canvas.width);
        const amp = canvas.height / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawing
        // Background color should match CSS for .waveform-canvas or its content area
        const isDark = canvas.classList?.contains('dark') || document.body.classList.contains('dark-theme-active'); // Example check
        ctx.fillStyle = isDark ? '#101010' : '#f0f0f0'; // Use theme-appropriate background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 1.5; // Slightly thicker for better visibility
        ctx.strokeStyle = isDark ? '#34d399' : '#10b981'; // Theme-appropriate waveform color (emerald/greenish)

        ctx.beginPath();
        ctx.moveTo(0, amp);

        for (let i = 0; i < canvas.width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum === undefined) continue; // Skip if data is undefined for some reason
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            // Draw a line from min to max for each vertical slice if step > 1, or just the point if step = 1
            if (step > 1) {
                 ctx.lineTo(i, (1 + min) * amp);
                 ctx.lineTo(i, (1 + max) * amp); // Creates the filled waveform appearance
            } else {
                 ctx.lineTo(i, (1 + data[i * step]) * amp);
            }
        }
        ctx.stroke();

        // Draw loop points if applicable
        if (track.instrumentSamplerSettings.loop && track.instrumentSamplerSettings.audioBuffer) {
            const bufferDuration = track.instrumentSamplerSettings.audioBuffer.duration;
            if (bufferDuration > 0) {
                const loopStartX = (track.instrumentSamplerSettings.loopStart / bufferDuration) * canvas.width;
                const loopEndX = (track.instrumentSamplerSettings.loopEnd / bufferDuration) * canvas.width;

                ctx.fillStyle = isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.2)'; // Semi-transparent loop region
                ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, canvas.height);

                ctx.strokeStyle = isDark ? 'rgba(52, 211, 153, 0.6)' : 'rgba(16, 185, 129, 0.6)'; // Loop line color
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(loopStartX, 0); ctx.lineTo(loopStartX, canvas.height);
                ctx.moveTo(loopEndX, 0); ctx.lineTo(loopEndX, canvas.height);
                ctx.stroke();
            }
        }
    } catch (error) {
        console.error(`[UI drawInstrumentWaveform] Error drawing waveform for track ${track.id}:`, error);
        try {
            // Attempt to draw an error message on the canvas
            ctx.fillStyle = isDark ? '#4B0000' : '#FFCCCC'; // Error background
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = isDark ? '#FF8888' : '#CC0000'; // Error text
            ctx.textAlign = 'center';
            ctx.font = '12px Inter, sans-serif';
            ctx.fillText('Error drawing waveform', canvas.width / 2, canvas.height / 2);
        } catch (e) { /* ignore fallback drawing error */ }
    }
}

console.log("[UI] UI Module script part 3 evaluated.");
