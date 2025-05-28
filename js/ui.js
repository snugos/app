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
const synthEngineControlDefinitions = { /* ... same as before ... */ };
function buildSynthSpecificInspectorDOM(track) { /* ... same as before ... */ }
function buildSynthEngineControls(track, container, engineType) { /* ... same as before ... */ }

// --- Sampler Inspector Specifics ---
function buildSamplerSpecificInspectorDOM(track) { /* ... same as before ... */ }

// --- Drum Sampler Inspector Specifics ---
function buildDrumSamplerSpecificInspectorDOM(track) { /* ... same as before ... */ }

// --- Instrument Sampler Inspector Specifics ---
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... same as before ... */ }


// --- Track Inspector Window & Controls Initialization ---
export function buildTrackInspectorContentDOM(track) { /* ... (same as v5/v6) ... */ }
export function openTrackInspectorWindow(trackId, savedState = null) { /* ... (same as v5/v6) ... */ }
export function initializeCommonInspectorControls(track, winEl) { /* ... (same as v5/v6) ... */ }

// initializeTypeSpecificInspectorControls is defined below and exported once at the end.
function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl);
    else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl);
    else if (track.type === 'DrumSampler') initializeDrumSamplerSpecificControls(track, winEl);
    else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl);
}
function initializeSynthSpecificControls(track, winEl) { const c = winEl.querySelector(`#synthEngineControls-${track.id}`); if (c) { setTimeout(() => { (synthEngineControlDefinitions['MonoSynth']||[]).forEach(def => { if (def.type === 'knob' && track.inspectorControls?.[def.idPrefix]) track.inspectorControls[def.idPrefix].refreshVisuals(); }); }, 50); } }
function initializeSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-sampler`); const fileInputEl = winEl.querySelector(`#fileInput-${track.id}`);
    if (dzContainerEl && fileInputEl) { const dzEl = dzContainerEl.querySelector('.drop-zone'); if (dzEl) utilSetupDropZoneListeners(dzEl, track.id, 'Sampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile); fileInputEl.onchange = (e) => { window.loadSampleFile(e, track.id, 'Sampler'); }; }
    if (typeof renderSamplePads === 'function') renderSamplePads(track);
    winEl.querySelector(`#applySliceEditsBtn-${track.id}`)?.addEventListener('click', () => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Apply Slice Edits for ${track.name}`); applySliceEdits(track.id); });
    const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`); if (canvas) { track.waveformCanvasCtx = canvas.getContext('2d'); if(typeof window.drawWaveform === 'function') window.drawWaveform(track); }
    if (typeof updateSliceEditorUI === 'function') updateSliceEditorUI(track);
    const sVolK = createKnob({ label: 'Vol', min:0, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceVolume(track.selectedSliceForEdit, val)}); const volPh = winEl.querySelector(`#sliceVolumeSlider-${track.id}`); if(volPh) { volPh.innerHTML = ''; volPh.appendChild(sVolK.element); } track.inspectorControls.sliceVolume = sVolK;
    const sPitK = createKnob({ label: 'Pitch', min:-24, max:24, step:1, initialValue: track.slices[track.selectedSliceForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setSlicePitchShift(track.selectedSliceForEdit, val)}); const pitPh = winEl.querySelector(`#slicePitchKnob-${track.id}`); if(pitPh) { pitPh.innerHTML = ''; pitPh.appendChild(sPitK.element); } track.inspectorControls.slicePitch = sPitK;
    const sEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.attack || 0.01, decimals:3, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'attack', val)}); const attPh = winEl.querySelector(`#sliceEnvAttackSlider-${track.id}`); if(attPh) { attPh.innerHTML = ''; attPh.appendChild(sEAK.element); } track.inspectorControls.sliceEnvAttack = sEAK;
    const sEDK = createKnob({ label: 'Decay', min:0.01, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.decay || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'decay', val)}); const decPh = winEl.querySelector(`#sliceEnvDecaySlider-${track.id}`); if(decPh) { decPh.innerHTML = ''; decPh.appendChild(sEDK.element); } track.inspectorControls.sliceEnvDecay = sEDK;
    const sESK = createKnob({ label: 'Sustain', min:0, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.sustain || 1.0, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'sustain', val)}); const susPh = winEl.querySelector(`#sliceEnvSustainSlider-${track.id}`); if(susPh) { susPh.innerHTML = ''; susPh.appendChild(sESK.element); } track.inspectorControls.sliceEnvSustain = sESK;
    const sERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'release', val)}); const relPh = winEl.querySelector(`#sliceEnvReleaseSlider-${track.id}`); if(relPh) { relPh.innerHTML = ''; relPh.appendChild(sERK.element); } track.inspectorControls.sliceEnvRelease = sERK;
    winEl.querySelector(`#sliceLoopToggle-${track.id}`)?.addEventListener('click', (e) => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Loop for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`); track.setSliceLoop(track.selectedSliceForEdit, !track.slices[track.selectedSliceForEdit].loop); e.target.textContent = track.slices[track.selectedSliceForEdit].loop ? 'Loop: ON' : 'Loop: OFF'; e.target.classList.toggle('active', track.slices[track.selectedSliceForEdit].loop); });
    winEl.querySelector(`#sliceReverseToggle-${track.id}`)?.addEventListener('click', (e) => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Reverse for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`); track.setSliceReverse(track.selectedSliceForEdit, !track.slices[track.selectedSliceForEdit].reverse); e.target.textContent = track.slices[track.selectedSliceForEdit].reverse ? 'Rev: ON' : 'Rev: OFF'; e.target.classList.toggle('active', track.slices[track.selectedSliceForEdit].reverse);});

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
                if(track.slicerMonoPlayer && track.audioBuffer?.loaded) track.slicerMonoPlayer.buffer = track.audioBuffer;
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
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... (same as v6) ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... (same as v6) ... */ }

// --- MODULAR EFFECTS RACK UI ---
// ... (buildModularEffectsRackDOM, renderEffectsList, renderEffectControls, showAddEffectModal remain the same)
function buildModularEffectsRackDOM(owner, ownerType = 'track') { /* ... */ }
export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... */ }
function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... */ } // Made non-export, exported at bottom
function showAddEffectModal(owner, ownerType) { /* ... */ }

// --- Window Opening Functions ---
// ... (openTrackEffectsRackWindow, openMasterEffectsRackWindow, openGlobalControlsWindow, openSoundBrowserWindow etc. remain the same)
export function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... */ }
export function openMasterEffectsRackWindow(savedState = null) { /* ... */ }
export function openGlobalControlsWindow(savedState = null) { /* ... */ }
export function openSoundBrowserWindow(savedState = null) { /* ... */ }
export function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... */ }
export function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... */ }
export function openMixerWindow(savedState = null) { /* ... */ }
export function updateMixerWindow() { /* ... */ }
export function renderMixer(container) { /* ... */ }
export function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... */ }
export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... */ }

// --- Utility UI functions for samplers ---
// ... (renderSamplePads, updateSliceEditorUI, applySliceEdits, drawWaveform, drawInstrumentWaveform)
// ... (updateDrumPadControlsUI, renderDrumSamplerPads, highlightPlayingStep remain the same)
export function renderSamplePads(track) { /* ... */ }
export function updateSliceEditorUI(track) { /* ... */ }
export function applySliceEdits(trackId) { /* ... */ }
export function drawWaveform(track) { /* ... */ }
export function drawInstrumentWaveform(track) { drawWaveform(track); }
export function updateDrumPadControlsUI(track) { /* ... */ }
export function renderDrumSamplerPads(track) { /* ... */ }
export function highlightPlayingStep(col, trackType, gridElement) { /* ... */ }

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
