// js/ui.js - UI Creation and Management Module

import { SnugWindow } from './SnugWindow.js';
console.log('[ui.js] SnugWindow imported as:', SnugWindow);
import { showNotification, createDropZoneHTML, setupDropZoneListeners as utilSetupDropZoneListeners } from './utils.js';
import * as Constants from './constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from './eventHandlers.js';

export function createKnob(options) {
    // ... (createKnob function remains the same as daw_ui_js_instance_check_debug_v3) ...
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

    let currentValue = options.initialValue || 0;
    const min = options.min === undefined ? 0 : options.min;
    const max = options.max === undefined ? 100 : options.max;
    const step = options.step || 1;
    const range = max - min;
    const maxDegrees = options.maxDegrees || 270;
    const BASE_PIXELS_PER_FULL_RANGE_MOUSE = 300;
    const BASE_PIXELS_PER_FULL_RANGE_TOUCH = 450;
    let initialValueBeforeInteraction = currentValue;

    function updateKnobVisual() {
        const percentage = range === 0 ? 0 : (currentValue - min) / range;
        const rotation = (percentage * maxDegrees) - (maxDegrees / 2);
        handleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        valueEl.textContent = typeof currentValue === 'number' ? currentValue.toFixed(options.decimals !== undefined ? options.decimals : (step < 1 ? 2 : 0)) : currentValue;
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
        if (triggerCallback && options.onValueChange) {
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

const synthEngineControlDefinitions = { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ };

export function buildTrackInspectorContentDOM(track) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }
function buildSynthSpecificInspectorDOM(track) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }
function buildSynthEngineControls(track, container, engineType) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }


function buildSamplerSpecificInspectorDOM(track) {
    console.log(`[ui.js] buildSamplerSpecificInspectorDOM called for track ${track.id}`);
    const panel = document.createElement('div');
    panel.className = 'panel sampler-panel';
    
    const dropZoneContainer = document.createElement('div');
    dropZoneContainer.id = `dropZoneContainer-${track.id}-sampler`; // Give container a unique ID too
    const dropZoneHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler');
    dropZoneContainer.innerHTML = dropZoneHTML;
    const actualDropZoneElement = dropZoneContainer.querySelector('.drop-zone');

    if (actualDropZoneElement) {
        panel.appendChild(dropZoneContainer); // Append container
         console.log(`[ui.js] Sampler drop zone container created and appended for track ${track.id}`);
    } else {
        console.error(`[UI] buildSamplerSpecific: Failed to create/find drop-zone element from HTML for track ${track.id}.`);
    }

    const editorPanel = document.createElement('div');
    editorPanel.className = 'sampler-editor-panel mt-1 flex flex-wrap md:flex-nowrap gap-3';
    const leftSide = document.createElement('div');
    leftSide.className = 'flex-grow w-full md:w-3/5';
    const canvas = document.createElement('canvas');
    canvas.id = `waveformCanvas-${track.id}`;
    canvas.className = 'waveform-canvas w-full';
    canvas.width = 380; canvas.height = 70;
    leftSide.appendChild(canvas);
    const padsContainer = document.createElement('div');
    padsContainer.id = `samplePadsContainer-${track.id}`;
    padsContainer.className = 'pads-container mt-2';
    console.log(`[ui.js] Sampler padsContainer created for track ${track.id}:`, padsContainer);
    leftSide.appendChild(padsContainer);
    editorPanel.appendChild(leftSide);
    
    const rightSide = document.createElement('div');
    rightSide.id = `sliceControlsContainer-${track.id}`;
    rightSide.className = 'slice-edit-group w-full md:w-2/5 space-y-1';
    const sliceTitle = document.createElement('h4');
    sliceTitle.className = 'text-sm font-semibold';
    sliceTitle.innerHTML = `Slice: <span id="selectedSliceLabel-${track.id}">${track.selectedSliceForEdit + 1}</span>`;
    rightSide.appendChild(sliceTitle);
    ['Start', 'End'].forEach(label => {
        const div = document.createElement('div');
        div.className = 'flex gap-1 items-center text-xs';
        const lbl = document.createElement('label');
        lbl.textContent = `${label}:`;
        div.appendChild(lbl);
        const input = document.createElement('input');
        input.type = 'number';
        input.id = `slice${label}-${track.id}`;
        input.className = 'flex-grow p-0.5 text-xs bg-white text-black border';
        div.appendChild(input);
        rightSide.appendChild(div);
    });
    const applyBtn = document.createElement('button');
    applyBtn.id = `applySliceEditsBtn-${track.id}`;
    applyBtn.className = 'bg-blue-500 text-white text-xs py-0.5 px-1.5 rounded mt-1 hover:bg-blue-600';
    applyBtn.textContent = 'Apply S/E';
    rightSide.appendChild(applyBtn);
    const volPitchGroup = document.createElement('div');
    volPitchGroup.className = 'control-group mt-1';
    const volPlaceholder = document.createElement('div');
    volPlaceholder.id = `sliceVolumeSlider-${track.id}`;
    volPitchGroup.appendChild(volPlaceholder);
    const pitchPlaceholder = document.createElement('div');
    pitchPlaceholder.id = `slicePitchKnob-${track.id}`;
    volPitchGroup.appendChild(pitchPlaceholder);
    rightSide.appendChild(volPitchGroup);
    const loopReverseGroup = document.createElement('div');
    loopReverseGroup.className = 'flex gap-2 mt-1';
    const loopBtn = document.createElement('button');
    loopBtn.id = `sliceLoopToggle-${track.id}`;
    loopBtn.className = 'slice-toggle-button text-xs p-1';
    loopBtn.textContent = 'Loop';
    loopReverseGroup.appendChild(loopBtn);
    const reverseBtn = document.createElement('button');
    reverseBtn.id = `sliceReverseToggle-${track.id}`;
    reverseBtn.className = 'slice-toggle-button text-xs p-1';
    reverseBtn.textContent = 'Reverse';
    loopReverseGroup.appendChild(reverseBtn);
    rightSide.appendChild(loopReverseGroup);
    const polyBtn = document.createElement('button');
    polyBtn.id = `slicerPolyphonyToggle-${track.id}`;
    polyBtn.className = 'slice-toggle-button text-xs p-1 mt-1 w-full';
    polyBtn.textContent = 'Mode: Poly';
    rightSide.appendChild(polyBtn);
    const details = document.createElement('details');
    details.className = 'mt-1';
    const summary = document.createElement('summary');
    summary.className = 'text-xs font-semibold';
    summary.textContent = 'Slice Env';
    details.appendChild(summary);
    const sliceEnvGroup = document.createElement('div');
    sliceEnvGroup.className = 'control-group';
    ['sliceEnvAttackSlider', 'sliceEnvDecaySlider', 'sliceEnvSustainSlider', 'sliceEnvReleaseSlider'].forEach(id => {
        const knobPlaceholder = document.createElement('div');
        knobPlaceholder.id = `${id}-${track.id}`;
        sliceEnvGroup.appendChild(knobPlaceholder);
    });
    details.appendChild(sliceEnvGroup);
    rightSide.appendChild(details);
    editorPanel.appendChild(rightSide);
    panel.appendChild(editorPanel);
    console.log(`[ui.js] buildSamplerSpecificInspectorDOM returning panel for track ${track.id}:`, panel);
    return panel;
}

function buildDrumSamplerSpecificInspectorDOM(track) {
    console.log(`[ui.js] buildDrumSamplerSpecificInspectorDOM called for track ${track.id}`);
    const panel = document.createElement('div');
    panel.className = 'panel drum-sampler-panel';
    const title = document.createElement('h4');
    title.className = 'text-sm font-semibold mb-1';
    title.innerHTML = `Drum Pads (Selected: <span id="selectedDrumPadLabel-${track.id}">${track.selectedDrumPadForEdit + 1}</span>)`;
    panel.appendChild(title);
    const padsContainer = document.createElement('div');
    padsContainer.id = `drumSamplerPadsContainer-${track.id}`;
    padsContainer.className = 'pads-container mb-2';
    console.log(`[ui.js] Drum Sampler padsContainer created for track ${track.id}:`, padsContainer);
    panel.appendChild(padsContainer);
    
    const controlsContainer = document.createElement('div');
    controlsContainer.id = `drumPadControlsContainer-${track.id}`; // This is the main container for below
    controlsContainer.className = 'border-t pt-2';

    const loadContainer = document.createElement('div'); // This will hold the dropzone and filename
    loadContainer.id = `drumPadLoadContainer-${track.id}`; // <<< ID being searched for
    loadContainer.className = 'mb-2';
    // The actual dropzone HTML will be injected here by updateDrumPadControlsUI
    controlsContainer.appendChild(loadContainer); 

    const volPitchGroup = document.createElement('div');
    volPitchGroup.className = 'control-group';
    const volPlaceholder = document.createElement('div');
    volPlaceholder.id = `drumPadVolumeSlider-${track.id}`;
    volPitchGroup.appendChild(volPlaceholder);
    const pitchPlaceholder = document.createElement('div');
    pitchPlaceholder.id = `drumPadPitchKnob-${track.id}`;
    volPitchGroup.appendChild(pitchPlaceholder);
    controlsContainer.appendChild(volPitchGroup);
    const details = document.createElement('details');
    details.className = 'mt-1';
    const summary = document.createElement('summary');
    summary.className = 'text-xs font-semibold';
    summary.textContent = 'Pad Envelope (AR)';
    details.appendChild(summary);
    const padEnvGroup = document.createElement('div');
    padEnvGroup.className = 'control-group';
    ['drumPadEnvAttackSlider', 'drumPadEnvReleaseSlider'].forEach(id => {
        const knobPlaceholder = document.createElement('div');
        knobPlaceholder.id = `${id}-${track.id}`;
        padEnvGroup.appendChild(knobPlaceholder);
    });
    details.appendChild(padEnvGroup);
    controlsContainer.appendChild(details);
    panel.appendChild(controlsContainer);
    console.log(`[ui.js] buildDrumSamplerSpecificInspectorDOM returning panel for track ${track.id}:`, panel);
    return panel;
}
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }

export function initializeCommonInspectorControls(track, winEl) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }

export function initializeTypeSpecificInspectorControls(track, winEl) {
    console.log(`[ui.js] initializeTypeSpecificInspectorControls for track ${track.id}, type: ${track.type}`);
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

function initializeSynthSpecificControls(track, winEl) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }

function initializeSamplerSpecificControls(track, winEl) {
    console.log(`[ui.js] initializeSamplerSpecificControls for track ${track.id} (Slicer Sampler). winEl:`, winEl);
    const dropZoneContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-sampler`); // Query for the container
    const fileInputEl = winEl.querySelector(`#fileInput-${track.id}`);

    if (dropZoneContainerEl && dropZoneContainerEl.firstChild && fileInputEl) { // Check if dropZone was rendered inside
        const dropZoneEl = dropZoneContainerEl.querySelector('.drop-zone');
        if (dropZoneEl) {
            console.log(`[ui.js] Sampler drop zone FOUND via container for track ${track.id}. Setting up listeners.`);
            utilSetupDropZoneListeners(dropZoneEl, track.id, 'Sampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile);
        } else {
            console.warn(`[ui.js] Slicer Sampler (Track ID: ${track.id}): .drop-zone element NOT FOUND within its container.`);
        }
        fileInputEl.onchange = (e) => {
            window.loadSampleFile(e, track.id, 'Sampler');
        };
    } else {
        console.warn(`[ui.js] Slicer Sampler (Track ID: ${track.id}): Drop zone container or file input NOT FOUND. Container: ${dropZoneContainerEl}, FileInput: ${fileInputEl}`);
    }

    if (typeof renderSamplePads === 'function') {
        console.log(`[ui.js] Calling renderSamplePads for track ${track.id}`);
        renderSamplePads(track);
    } else {
        console.error(`[ui.js] renderSamplePads function not found!`);
    }

    winEl.querySelector(`#applySliceEditsBtn-${track.id}`)?.addEventListener('click', () => {
        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Apply Slice Edits for ${track.name}`);
        applySliceEdits(track.id);
    });

    const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`);
    if (canvas) { 
        track.waveformCanvasCtx = canvas.getContext('2d'); 
        console.log(`[ui.js] Waveform canvas context set for track ${track.id}`);
        if(typeof window.drawWaveform === 'function') window.drawWaveform(track); 
    } else {
        console.warn(`[ui.js] Waveform canvas not found for track ${track.id}`);
    }
    
    if (typeof updateSliceEditorUI === 'function') {
        console.log(`[ui.js] Calling updateSliceEditorUI for track ${track.id}`);
        updateSliceEditorUI(track);
    } else {
         console.error(`[ui.js] updateSliceEditorUI function not found!`);
    }
    // ... (rest of sampler controls initialization)
}
function initializeDrumSamplerSpecificControls(track, winEl) {
    console.log(`[ui.js] initializeDrumSamplerSpecificControls for track ${track.id}. winEl:`, winEl);

    const targetId = `drumPadLoadContainer-${track.id}`;
    const padLoadContainerById = document.getElementById(targetId); // Global search
    const padLoadContainerByQuery = winEl.querySelector(`#${targetId}`); // Search within winEl

    console.log(`[ui.js] DrumSampler - Target ID for load container: #${targetId}`);
    console.log(`[ui.js] DrumSampler - document.getElementById result:`, padLoadContainerById);
    console.log(`[ui.js] DrumSampler - winEl.querySelector result:`, padLoadContainerByQuery);

    let padLoadContainerToUse = padLoadContainerByQuery;
    if (!padLoadContainerToUse && padLoadContainerById) {
        console.warn(`[ui.js] DrumSampler - Querying within winEl failed for ${targetId}, but found globally. Using global result. This might indicate a DOM structure issue or timing.`);
        padLoadContainerToUse = padLoadContainerById;
    }
    
    if (padLoadContainerToUse && typeof updateDrumPadControlsUI === 'function') {
        console.log(`[ui.js] Calling updateDrumPadControlsUI for drum track ${track.id} using:`, padLoadContainerToUse);
        updateDrumPadControlsUI(track); // This function will internally find and populate this container
    } else if (!padLoadContainerToUse) {
        console.warn(`[ui.js] Drum pad load container ('${targetId}') not found for track ${track.id} using either querySelector or getElementById.`);
    } else {
        console.error(`[ui.js] updateDrumPadControlsUI function not found!`);
    }

    if (typeof renderDrumSamplerPads === 'function') {
        console.log(`[ui.js] Calling renderDrumSamplerPads for track ${track.id}`);
        renderDrumSamplerPads(track);
    } else {
         console.error(`[ui.js] renderDrumSamplerPads function not found!`);
    }
    // ... (rest of drum sampler controls initialization as before) ...
    const pVolK = createKnob({ label: 'Pad Vol', min:0, max:1, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(track.selectedDrumPadForEdit, val)});
    const volPlaceholder = winEl.querySelector(`#drumPadVolumeSlider-${track.id}`);
    if(volPlaceholder) volPlaceholder.appendChild(pVolK.element); else console.warn(`[ui.js] Placeholder #drumPadVolumeSlider-${track.id} not found.`);
    track.inspectorControls.drumPadVolume = pVolK;
    
    const pPitK = createKnob({ label: 'Pad Pitch', min:-24, max:24, step:1, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(track.selectedDrumPadForEdit, val)});
    const pitchPlaceholder = winEl.querySelector(`#drumPadPitchKnob-${track.id}`);
    if(pitchPlaceholder) pitchPlaceholder.appendChild(pPitK.element); else console.warn(`[ui.js] Placeholder #drumPadPitchKnob-${track.id} not found.`);
    track.inspectorControls.drumPadPitch = pPitK;

    const pEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.attack || 0.005, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'attack', val)});
    const attackPlaceholder = winEl.querySelector(`#drumPadEnvAttackSlider-${track.id}`);
    if(attackPlaceholder) attackPlaceholder.appendChild(pEAK.element); else console.warn(`[ui.js] Placeholder #drumPadEnvAttackSlider-${track.id} not found.`);
    track.inspectorControls.drumPadEnvAttack = pEAK;

    const pERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'release', val)});
    const releasePlaceholder = winEl.querySelector(`#drumPadEnvReleaseSlider-${track.id}`);
    if(releasePlaceholder) releasePlaceholder.appendChild(pERK.element); else console.warn(`[ui.js] Placeholder #drumPadEnvReleaseSlider-${track.id} not found.`);
    track.inspectorControls.drumPadEnvRelease = pERK;
}

function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }
export function openGlobalControlsWindow(savedState = null) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }
export function openTrackInspectorWindow(trackId, savedState = null) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }

const effectControlDefinitions = { /* ... (remains the same as daw_ui_js_instance_check_debug_v3, includes AutoWah) ... */ };
export function buildEffectsRackContentDOM(track) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }
export function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }

export function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }
export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }
export function highlightPlayingStep(col, trackType, gridElement) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }
export function openMixerWindow(savedState = null) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }
export function updateMixerWindow() { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }
export function renderMixer(container) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }
export function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }
export function openSoundBrowserWindow(savedState = null) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }
export function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (remains the same as daw_ui_js_instance_check_debug_v3) ... */ }

export function renderSamplePads(track) {
    console.log(`[ui.js] renderSamplePads called for track ${track.id}. Slices count: ${track.slices?.length}`);
    if (!track || !track.inspectorWindow?.element) {
        console.warn(`[ui.js] renderSamplePads: Track ${track.id} or inspector window element not found.`);
        return;
    }
    const padsContainer = track.inspectorWindow.element.querySelector(`#samplePadsContainer-${track.id}`);
    if (!padsContainer) {
        console.warn(`[ui.js] renderSamplePads: Pads container '#samplePadsContainer-${track.id}' not found for track ${track.id}. Searched within:`, track.inspectorWindow.element);
        return;
    }
    padsContainer.innerHTML = ''; 
    if (!track.slices || track.slices.length === 0) {
        console.warn(`[ui.js] renderSamplePads: No slices to render for track ${track.id}`);
        padsContainer.textContent = 'No slices available. Load a sample.';
        return;
    }
    track.slices.forEach((slice, index) => {
        const pad = document.createElement('button');
        pad.className = `pad-button ${index === track.selectedSliceForEdit ? 'selected-for-edit' : ''}`;
        pad.textContent = `Slice ${index + 1}`;
        pad.title = `Select Slice ${index + 1}. Click to preview.`;
        pad.dataset.trackId = track.id;
        pad.dataset.trackType = "Sampler";
        pad.dataset.padSliceIndex = index;
        pad.addEventListener('click', async () => {
            track.selectedSliceForEdit = index;
            console.log(`[ui.js] Sampler pad ${index + 1} clicked for track ${track.id}`);
            if(typeof window.playSlicePreview === 'function') await window.playSlicePreview(track.id, index);
            renderSamplePads(track); 
            updateSliceEditorUI(track);
        });
        padsContainer.appendChild(pad);
    });
    console.log(`[ui.js] renderSamplePads finished for track ${track.id}. ${track.slices.length} pads rendered into:`, padsContainer);
}

export function updateSliceEditorUI(track) {
    console.log(`[ui.js] updateSliceEditorUI called for track ${track.id}, selected slice: ${track.selectedSliceForEdit}`); 
    if (!track || track.type !== 'Sampler' || !track.inspectorWindow?.element) {
        console.warn(`[ui.js] updateSliceEditorUI: Pre-conditions not met for track ${track.id}`);
        return;
    }
    const inspectorEl = track.inspectorWindow.element;
    const selectedSlice = track.slices[track.selectedSliceForEdit];
    if (!selectedSlice) {
        console.warn(`[ui.js] updateSliceEditorUI: Selected slice ${track.selectedSliceForEdit} not found for track ${track.id}`);
        return;
    }
    // ... (rest of the function as in daw_ui_js_instance_check_debug_v3)
    inspectorEl.querySelector(`#selectedSliceLabel-${track.id}`).textContent = track.selectedSliceForEdit + 1;
    const startInput = inspectorEl.querySelector(`#sliceStart-${track.id}`);
    const endInput = inspectorEl.querySelector(`#sliceEnd-${track.id}`);
    if (startInput) startInput.value = selectedSlice.offset.toFixed(3);
    if (endInput) endInput.value = (selectedSlice.offset + selectedSlice.duration).toFixed(3);

    track.inspectorControls.sliceVolume?.setValue(selectedSlice.volume, false);
    track.inspectorControls.slicePitch?.setValue(selectedSlice.pitchShift, false);
    track.inspectorControls.sliceEnvAttack?.setValue(selectedSlice.envelope.attack, false);
    track.inspectorControls.sliceEnvDecay?.setValue(selectedSlice.envelope.decay, false);
    track.inspectorControls.sliceEnvSustain?.setValue(selectedSlice.envelope.sustain, false);
    track.inspectorControls.sliceEnvRelease?.setValue(selectedSlice.envelope.release, false);

    const loopToggle = inspectorEl.querySelector(`#sliceLoopToggle-${track.id}`);
    if (loopToggle) { loopToggle.textContent = selectedSlice.loop ? 'Loop: ON' : 'Loop: OFF'; loopToggle.classList.toggle('active', selectedSlice.loop); }
    const reverseToggle = inspectorEl.querySelector(`#sliceReverseToggle-${track.id}`);
    if (reverseToggle) { reverseToggle.textContent = selectedSlice.reverse ? 'Rev: ON' : 'Rev: OFF'; reverseToggle.classList.toggle('active', selectedSlice.reverse); }
}
export function applySliceEdits(trackId) { /* ... (remains the same as daw_autowah_ui_js) ... */ }
export function drawWaveform(track) { /* ... (remains the same as daw_autowah_ui_js) ... */ }
export function drawInstrumentWaveform(track) { /* ... (remains the same as daw_autowah_ui_js) ... */ }

export function updateDrumPadControlsUI(track) {
    console.log(`[ui.js] updateDrumPadControlsUI for track ${track.id}, selected pad: ${track.selectedDrumPadForEdit}`);
    if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) return;
    const inspectorEl = track.inspectorWindow.element;
    const selectedPad = track.drumSamplerPads[track.selectedDrumPadForEdit];
    if (!selectedPad) {
        console.warn(`[ui.js] updateDrumPadControlsUI: Selected drum pad ${track.selectedDrumPadForEdit} not found for track ${track.id}`);
        return;
    }
    
    const loadContainer = inspectorEl.querySelector(`#drumPadLoadContainer-${track.id}`); // Query within inspectorEl
    if (loadContainer) {
        console.log(`[ui.js] Drum pad load container FOUND for track ${track.id} in updateDrumPadControlsUI.`);
        const inputId = `drumPadFileInput-${track.id}-${track.selectedDrumPadForEdit}`;
        loadContainer.innerHTML = createDropZoneHTML(track.id, inputId, 'DrumSampler', track.selectedDrumPadForEdit) +
                                  `<span id="drumPadFileName-${track.id}-${track.selectedDrumPadForEdit}" class="text-xs ml-2 block truncate" style="max-width: 150px;" title="${selectedPad.originalFileName || 'No file'}">${selectedPad.originalFileName || 'No file'}</span>`;
        const fileInputEl = loadContainer.querySelector(`#${inputId}`); // Query within loadContainer
        if (fileInputEl) {
            fileInputEl.addEventListener('change', (e) => {
                window.loadDrumSamplerPadFile(e, track.id, track.selectedDrumPadForEdit);
            });
        } else {
            console.warn(`[ui.js] Drum pad file input #${inputId} NOT FOUND within loadContainer.`);
        }
        const dropZoneEl = loadContainer.querySelector(`#dropZone-${track.id}-drumsampler-${track.selectedDrumPadForEdit}`); // Query within loadContainer
        if (dropZoneEl) {
            utilSetupDropZoneListeners(dropZoneEl, track.id, 'DrumSampler', track.selectedDrumPadForEdit, window.loadSoundFromBrowserToTarget, window.loadDrumSamplerPadFile);
        } else {
            console.warn(`[ui.js] Drum pad drop zone #dropZone-${track.id}-drumsampler-${track.selectedDrumPadForEdit} NOT FOUND within loadContainer.`);
        }
    } else {
        console.warn(`[ui.js] updateDrumPadControlsUI: #drumPadLoadContainer-${track.id} NOT FOUND in inspectorEl for track ${track.id}.`);
    }

    track.inspectorControls.drumPadVolume?.setValue(selectedPad.volume, false);
    track.inspectorControls.drumPadPitch?.setValue(selectedPad.pitchShift, false);
    track.inspectorControls.drumPadEnvAttack?.setValue(selectedPad.envelope.attack, false);
    track.inspectorControls.drumPadEnvRelease?.setValue(selectedPad.envelope.release, false);
}
export function renderDrumSamplerPads(track) {
    console.log(`[ui.js] renderDrumSamplerPads called for track ${track.id}. Pads count: ${track.drumSamplerPads?.length}`);
    if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) return;
    const padsContainer = track.inspectorWindow.element.querySelector(`#drumSamplerPadsContainer-${track.id}`);
    if (!padsContainer) {
        console.warn(`[ui.js] renderDrumSamplerPads: Pads container '#drumSamplerPadsContainer-${track.id}' not found for track ${track.id}. Searched within:`, track.inspectorWindow.element);
        return;
    }
    padsContainer.innerHTML = '';
    if (!track.drumSamplerPads || track.drumSamplerPads.length === 0) {
        console.warn(`[ui.js] renderDrumSamplerPads: No drum pads to render for track ${track.id}`);
        padsContainer.textContent = 'No pads available.'; // Should not happen with default pads
        return;
    }
    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button');
        padEl.className = `pad-button ${index === track.selectedDrumPadForEdit ? 'selected-for-edit' : ''}`;
        const fileNameDisplay = padData.originalFileName ? padData.originalFileName.substring(0, 10) + (padData.originalFileName.length > 10 ? '...' : '') : 'Empty';
        padEl.innerHTML = `Pad ${index + 1} <span class="pad-label block truncate" style="max-width: 60px;" title="${padData.originalFileName || 'Empty'}">${fileNameDisplay}</span>`;
        padEl.title = `Select Pad ${index + 1}. Click to preview. Sample: ${padData.originalFileName || 'Empty'}`;
        padEl.dataset.trackId = track.id;
        padEl.dataset.trackType = "DrumSampler";
        padEl.dataset.padSliceIndex = index; // Consistent with sampler
        padEl.addEventListener('click', async () => {
            track.selectedDrumPadForEdit = index;
            console.log(`[ui.js] Drum pad ${index + 1} clicked for track ${track.id}`);
            if(typeof window.playDrumSamplerPadPreview === 'function') await window.playDrumSamplerPadPreview(track.id, index);
            renderDrumSamplerPads(track); 
            updateDrumPadControlsUI(track);
        });
        padsContainer.appendChild(padEl);
    });
     console.log(`[ui.js] renderDrumSamplerPads finished for track ${track.id}. ${track.drumSamplerPads.length} pads rendered into:`, padsContainer);
}
