// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Audio Status, Relink & Debugging Version (Corrected Exports & Upload Click Fix + GCW Debug + Pad Render Debug)');

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
const synthEngineControlDefinitions = { /* ... (no changes) ... */ };
function buildSynthSpecificInspectorDOM(track) { /* ... (no changes) ... */ }
function buildSynthEngineControls(track, container, engineType) { /* ... (no changes) ... */ }


// --- Sampler Inspector Specifics (Updated for Audio Status) ---
function buildSamplerSpecificInspectorDOM(track) { /* ... (no changes from ui_js_final_relink_fix_May28) ... */ }

// --- Drum Sampler Inspector Specifics (Updated for Audio Status) ---
function buildDrumSamplerSpecificInspectorDOM(track) { /* ... (no changes from ui_js_final_relink_fix_May28) ... */ }

// --- Instrument Sampler Inspector Specifics (Updated for Audio Status) ---
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... (no changes from ui_js_final_relink_fix_May28) ... */ }

// --- Track Inspector Window & Controls Initialization ---
function buildTrackInspectorContentDOM(track) { /* ... (no changes from ui_js_final_relink_fix_May28) ... */ }
function openTrackInspectorWindow(trackId, savedState = null) { /* ... (no changes from ui_js_final_relink_fix_May28) ... */ }
function initializeCommonInspectorControls(track, winEl) { /* ... (no changes from ui_js_final_relink_fix_May28) ... */ }

function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl);
    else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl);
    else if (track.type === 'DrumSampler') initializeDrumSamplerSpecificControls(track, winEl);
    else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl);
}

function initializeSynthSpecificControls(track, winEl) { /* ... (no changes) ... */ }

function initializeSamplerSpecificControls(track, winEl) { /* ... (no changes from ui_js_final_relink_fix_May28) ... */ }

function initializeDrumSamplerSpecificControls(track, winEl) {
    console.log(`[UI - initializeDrumSamplerSpecificControls] Called for track ${track.id}`);
    if (typeof renderDrumSamplerPads === 'function') renderDrumSamplerPads(track);
    if (typeof updateDrumPadControlsUI === 'function') updateDrumPadControlsUI(track);

    // Knobs are initialized here as they are part of the permanent inspector structure for drum samplers
    const pVolK = createKnob({ label: 'Pad Vol', min:0, max:1, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(track.selectedDrumPadForEdit, val)}); const volPh = winEl.querySelector(`#drumPadVolumeSlider-${track.id}`); if(volPh) { volPh.innerHTML = ''; volPh.appendChild(pVolK.element); } track.inspectorControls.drumPadVolume = pVolK;
    const pPitK = createKnob({ label: 'Pad Pitch', min:-24, max:24, step:1, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(track.selectedDrumPadForEdit, val)}); const pitPh = winEl.querySelector(`#drumPadPitchKnob-${track.id}`); if(pitPh) { pitPh.innerHTML = ''; pitPh.appendChild(pPitK.element); } track.inspectorControls.drumPadPitch = pPitK;
    const pEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.attack || 0.005, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'attack', val)}); const attPh = winEl.querySelector(`#drumPadEnvAttackSlider-${track.id}`); if(attPh) { attPh.innerHTML = ''; attPh.appendChild(pEAK.element); } track.inspectorControls.drumPadEnvAttack = pEAK;
    const pERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'release', val)}); const relPh = winEl.querySelector(`#drumPadEnvReleaseSlider-${track.id}`); if(relPh) { relPh.innerHTML = ''; relPh.appendChild(pERK.element); } track.inspectorControls.drumPadEnvRelease = pERK;
}

function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... (no changes from ui_js_final_relink_fix_May28) ... */ }

// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') { /* ... (no changes) ... */ }
function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... (no changes) ... */ }
function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... (no changes) ... */ }
function showAddEffectModal(owner, ownerType) { /* ... (no changes) ... */ }


// --- Window Opening Functions (with Debugging) ---
function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (no changes) ... */ }
function openMasterEffectsRackWindow(savedState = null) { /* ... (no changes) ... */ }
function openGlobalControlsWindow(savedState = null) { /* ... (no changes from ui_js_final_relink_fix_May28, includes return logging) ... */ }
function openSoundBrowserWindow(savedState = null) { /* ... (no changes from ui_js_final_relink_fix_May28, includes debug logs) ... */ }
function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... (no changes from ui_js_final_relink_fix_May28, includes debug logs) ... */ }
function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (no changes from ui_js_final_relink_fix_May28, includes debug logs) ... */ }
function openMixerWindow(savedState = null) { /* ... (no changes from ui_js_final_relink_fix_May28, includes debug logs) ... */ }
function updateMixerWindow() { /* ... (no changes from ui_js_final_relink_fix_May28, includes debug logs) ... */ }
function renderMixer(container) { /* ... (no changes from ui_js_final_relink_fix_May28, includes debug logs) ... */ }
function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... (no changes) ... */ }
function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... (no changes) ... */ }


// --- Utility UI functions for samplers (Updated for Audio Status & Debugging) ---
function renderSamplePads(track) { /* ... (no changes from ui_js_final_relink_fix_May28, includes status display) ... */ }
function updateSliceEditorUI(track) { /* ... (no changes from ui_js_final_relink_fix_May28, includes status display & control disabling) ... */ }
function applySliceEdits(trackId) { /* ... (no changes from ui_js_final_relink_fix_May28) ... */ }
function drawWaveform(track) { /* ... (no changes from ui_js_final_relink_fix_May28, includes status display on canvas) ... */ }
function drawInstrumentWaveform(track) { drawWaveform(track); }

function updateDrumPadControlsUI(track) { // For Drum Sampler
    console.log(`[UI - updateDrumPadControlsUI] Called for track ${track.id}, selectedPadForEdit: ${track.selectedDrumPadForEdit}`);
    if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) {
        console.warn(`[UI - updateDrumPadControlsUI] Pre-conditions not met. Track: ${!!track}, Type: ${track?.type}, Inspector: ${!!track?.inspectorWindow?.element}`);
        return;
    }
    const inspectorEl = track.inspectorWindow.element;
    const padIndex = track.selectedDrumPadForEdit;
    const selectedPadData = track.drumSamplerPads[padIndex];

    if (!selectedPadData) {
        console.error(`[UI - updateDrumPadControlsUI] No data for selected pad index: ${padIndex} on track ${track.id}`);
        return;
    }
    console.log(`[UI - updateDrumPadControlsUI] Selected Pad Data for Pad ${padIndex}:`, JSON.parse(JSON.stringify(selectedPadData)));


    const loadContainer = inspectorEl.querySelector(`#drumPadLoadContainer-${track.id}`);
    if (loadContainer) {
        console.log(`[UI - updateDrumPadControlsUI] Found loadContainer for pad ${padIndex}. Updating its innerHTML.`);
        loadContainer.innerHTML = createDropZoneHTML(track.id, 'DrumSampler', padIndex, selectedPadData);

        const fileInputId = `fileInput-${track.id}-DrumSampler-${padIndex}`;
        const fileInputEl = loadContainer.querySelector(`#${fileInputId}`);

        const dropZoneId = `dropZone-${track.id}-drumsampler-${padIndex}`;
        const dropZoneEl = loadContainer.querySelector(`#${dropZoneId}`);

        const relinkButtonId = `relinkFileBtn-${track.id}-DrumSampler-${padIndex}`;
        const relinkButton = loadContainer.querySelector(`#${relinkButtonId}`);

        if (fileInputEl) {
            console.log(`[UI - updateDrumPadControlsUI] Setting up fileInputEl for pad ${padIndex} (ID: #${fileInputId})`);
            fileInputEl.onchange = (e) => {
                console.log(`[UI - updateDrumPadControlsUI] File input changed for pad ${padIndex}`);
                window.loadDrumSamplerPadFile(e, track.id, padIndex);
            };
        } else {
            console.warn(`[UI - updateDrumPadControlsUI] fileInputEl NOT found for pad ${padIndex} with ID ${fileInputId} in loadContainer:`, loadContainer.innerHTML);
        }

        if (dropZoneEl && typeof utilSetupDropZoneListeners === 'function') {
            console.log(`[UI - updateDrumPadControlsUI] Setting up drop zone listeners for pad ${padIndex} (DropZone ID: ${dropZoneId})`);
            utilSetupDropZoneListeners(dropZoneEl, track.id, "DrumSampler", padIndex, window.loadSoundFromBrowserToTarget, window.loadDrumSamplerPadFile);
        } else {
            console.warn(`[UI - updateDrumPadControlsUI] Drop zone element or utilSetupDropZoneListeners not found for pad ${padIndex}.`);
        }

        if (relinkButton && fileInputEl) {
            console.log(`[UI - updateDrumPadControlsUI] Setting up relinkButton for pad ${padIndex} (ID: ${relinkButtonId}) to trigger #${fileInputId}`);
            relinkButton.onclick = () => {
                console.log(`[UI - updateDrumPadControlsUI] Relink button clicked for pad ${padIndex}, triggering click on #${fileInputId}`);
                fileInputEl.click();
            };
        } else if (relinkButton && !fileInputEl) {
            console.warn(`[UI - updateDrumPadControlsUI] Relink button found for pad ${padIndex} (ID: ${relinkButtonId}), but fileInputEl (ID: ${fileInputId}) was NOT found!`);
        } else if (!relinkButton && selectedPadData.status === 'missing') {
            console.warn(`[UI - updateDrumPadControlsUI] Pad ${padIndex} status is 'missing' but relink button (ID: ${relinkButtonId}) was NOT found in loadContainer:`, loadContainer.innerHTML);
        }
    } else {
        console.warn(`[UI - updateDrumPadControlsUI] loadContainer for pad controls (ID: #drumPadLoadContainer-${track.id}) NOT found.`);
    }

    track.inspectorControls.drumPadVolume?.setValue(selectedPadData.volume, false);
    track.inspectorControls.drumPadPitch?.setValue(selectedPadData.pitchShift, false);
    track.inspectorControls.drumPadEnvAttack?.setValue(selectedPadData.envelope.attack, false);
    track.inspectorControls.drumPadEnvRelease?.setValue(selectedPadData.envelope.release, false);

    const controlsContainer = inspectorEl.querySelector(`#drumPadControlsContainer-${track.id}`);
    const padSpecificControls = controlsContainer?.querySelectorAll('input, button, select, details');
    const disable = selectedPadData.status !== 'loaded';
    if (padSpecificControls) {
        padSpecificControls.forEach(el => {
            if (!el.closest('.drop-zone-relink-container') && !el.classList.contains('drop-zone-relink-button') && el.id !== `drumPadLoadContainer-${track.id}`) {
                 el.disabled = disable;
            }
        });
        if (controlsContainer) controlsContainer.style.opacity = disable ? '0.5' : '1';
    }
     console.log(`[UI - updateDrumPadControlsUI] Finished for pad ${padIndex}. Disabled state for controls: ${disable}`);
}

function renderDrumSamplerPads(track) {
    console.log(`[UI - renderDrumSamplerPads] Called for track ${track.id}`);
    if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) {
        console.warn(`[UI - renderDrumSamplerPads] Pre-conditions not met. Track: ${!!track}, Type: ${track?.type}, Inspector: ${!!track?.inspectorWindow?.element}`);
        return;
    }
    const padsContainer = track.inspectorWindow.element.querySelector(`#drumSamplerPadsContainer-${track.id}`);
    if (!padsContainer) {
        console.error(`[UI - renderDrumSamplerPads] padsContainer (ID: #drumSamplerPadsContainer-${track.id}) not found! Cannot render pads.`);
        return;
    }
    padsContainer.innerHTML = ''; // Clear previous pads

    if (!track.drumSamplerPads || track.drumSamplerPads.length === 0) {
        padsContainer.textContent = 'No pads defined for this track.';
        console.warn(`[UI - renderDrumSamplerPads] Track ${track.id} has no drumSamplerPads array or it's empty.`);
        return;
    }
    console.log(`[UI - renderDrumSamplerPads] Rendering ${track.drumSamplerPads.length} pads for track ${track.id}.`);

    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button');
        padEl.className = `pad-button ${index === track.selectedDrumPadForEdit ? 'selected-for-edit' : ''} drop-zone-pad`;

        let fileNameDisplay = padData.originalFileName ? padData.originalFileName.substring(0, 10) + (padData.originalFileName.length > 10 ? '...' : '') : 'Empty';
        let titleInfo = `Sample: ${padData.originalFileName || 'Empty'}`;
        padEl.style.borderColor = '';

        if (padData.status === 'missing') {
            fileNameDisplay = `MISSING!`;
            padEl.style.borderColor = 'red';
            titleInfo = `MISSING: ${padData.originalFileName || 'Unknown'}. Click to select this pad and then use 'Relink/Upload' in the controls below, or drag a file here.`;
        } else if (padData.status === 'pending') {
            fileNameDisplay = `Loading...`;
            titleInfo = `Loading: ${padData.originalFileName}`;
        } else if (padData.status === 'empty') {
             titleInfo = 'Empty. Click to select this pad and load a sample via the controls below, or drag a file here.';
        }

        padEl.innerHTML = `Pad ${index + 1} <span class="pad-label block truncate" style="max-width: 60px;" title="${padData.originalFileName || 'Empty'}">${fileNameDisplay}</span>`;
        padEl.title = `Select Pad ${index + 1}. ${titleInfo}`;
        padEl.dataset.trackId = track.id.toString(); padEl.dataset.trackType = "DrumSampler"; padEl.dataset.padSliceIndex = index.toString();
        console.log(`[UI - renderDrumSamplerPads] Creating pad button ${index + 1} for track ${track.id}. Status: ${padData.status}, FileName: ${padData.originalFileName}`);

        padEl.addEventListener('click', async () => {
            console.log(`[UI - renderDrumSamplerPads] Pad ${index + 1} clicked. Current status: ${padData.status}`);
            track.selectedDrumPadForEdit = index;
            if (padData.status === 'loaded' && typeof window.playDrumSamplerPadPreview === 'function') {
                await window.playDrumSamplerPadPreview(track.id, index);
            } else if (padData.status === 'missing' || padData.status === 'empty') {
                console.log(`[UI - renderDrumSamplerPads] Clicked on ${padData.status} pad ${index}. updateDrumPadControlsUI will make its dropzone/relink primary.`);
            }
            renderDrumSamplerPads(track);
            updateDrumPadControlsUI(track);
        });
        if (typeof utilSetupDropZoneListeners === 'function') {
            utilSetupDropZoneListeners(padEl, track.id, "DrumSampler", index, window.loadSoundFromBrowserToTarget, window.loadDrumSamplerPadFile);
        } else {
            console.warn("[UI - renderDrumSamplerPads] utilSetupDropZoneListeners is not defined.");
        }
        padsContainer.appendChild(padEl);
    });
    console.log(`[UI - renderDrumSamplerPads] Finished rendering pads for track ${track.id}.`);
}

function highlightPlayingStep(col, trackType, gridElement) { /* ... (no changes) ... */ }

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
