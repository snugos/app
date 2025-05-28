// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Debug Drum Sampler DOM Build'); // Updated top log for clarity

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
function createKnob(options) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }

// --- Synth Inspector Specifics ---
const synthEngineControlDefinitions = { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ };
function buildSynthSpecificInspectorDOM(track) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }
function buildSynthEngineControls(track, container, engineType) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }

// --- Sampler Inspector Specifics ---
function buildSamplerSpecificInspectorDOM(track) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }

// --- Drum Sampler Inspector Specifics (ADDED DETAILED LOGGING) ---
function buildDrumSamplerSpecificInspectorDOM(track) {
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] START for track ${track.id}`);
    const panel = document.createElement('div');
    panel.className = 'panel drum-sampler-panel';
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] Panel created:`, panel);

    const title = document.createElement('h4');
    title.className = 'text-sm font-semibold mb-1';
    title.innerHTML = `Sampler Pads (Selected: <span id="selectedDrumPadLabel-${track.id}">${track.selectedDrumPadForEdit + 1}</span>)`;
    panel.appendChild(title);
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] Title appended:`, title);

    const padsContainer = document.createElement('div');
    padsContainer.id = `drumSamplerPadsContainer-${track.id}`;
    padsContainer.className = 'pads-container mb-2';
    panel.appendChild(padsContainer);
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] PadsContainer appended:`, padsContainer);

    const controlsContainer = document.createElement('div');
    controlsContainer.id = `drumPadControlsContainer-${track.id}`;
    controlsContainer.className = 'border-t pt-2';
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] ControlsContainer created:`, controlsContainer);

    const loadContainer = document.createElement('div');
    loadContainer.id = `drumPadLoadContainer-${track.id}`;
    loadContainer.className = 'mb-2';
    controlsContainer.appendChild(loadContainer);
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] LoadContainer appended to ControlsContainer:`, loadContainer);

    const volPitchGroup = document.createElement('div');
    volPitchGroup.className = 'control-group';
    const volPlaceholder = document.createElement('div');
    volPlaceholder.id = `drumPadVolumeSlider-${track.id}`;
    volPitchGroup.appendChild(volPlaceholder);
    const pitchPlaceholder = document.createElement('div');
    pitchPlaceholder.id = `drumPadPitchKnob-${track.id}`;
    volPitchGroup.appendChild(pitchPlaceholder);
    controlsContainer.appendChild(volPitchGroup);
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] VolPitchGroup appended:`, volPitchGroup);

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
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] Envelope details appended:`, details);

    panel.appendChild(controlsContainer);
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] ControlsContainer appended to Panel.`);

    const selectedPadData = track.drumSamplerPads[track.selectedDrumPadForEdit];
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] Selected pad data (for status check):`, selectedPadData);
    if (selectedPadData?.status !== 'loaded') {
        console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] Selected pad status is NOT 'loaded' (it's '${selectedPadData?.status}'). Disabling controls.`);
        controlsContainer.querySelectorAll('input, button, select, details').forEach(el => {
             if (!el.closest('.drop-zone-relink-container') && !el.classList.contains('drop-zone-relink-button') && el.id !== `drumPadLoadContainer-${track.id}`) {
                el.disabled = true;
             }
        });
        controlsContainer.style.opacity = '0.5';
    } else {
        console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] Selected pad status IS 'loaded'. Controls should be enabled.`);
    }
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] FINISHED. Returning panel:`, panel);
    return panel;
}

// --- Instrument Sampler Inspector Specifics ---
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }

// --- Track Inspector Window & Controls Initialization ---
function buildTrackInspectorContentDOM(track) { /* ... (same as in ui_js_inspector_build_debug_may28_v3, with its internal try-catch and logging) ... */ }
function openTrackInspectorWindow(trackId, savedState = null) { /* ... (same as in ui_js_inspector_build_debug_may28_v3, with its internal logging) ... */ }
function initializeCommonInspectorControls(track, winEl) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }
function initializeTypeSpecificInspectorControls(track, winEl) { /* ... (same as in ui_js_inspector_build_debug_may28_v3, with its internal logging) ... */ }
function initializeSynthSpecificControls(track, winEl) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }
function initializeSamplerSpecificControls(track, winEl) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... (same as in ui_js_inspector_build_debug_may28_v3, with its internal logging) ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }

// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }
function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }
function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }
function showAddEffectModal(owner, ownerType) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }

// --- Window Opening Functions (with Debugging & GCW try...catch) ---
function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }
function openMasterEffectsRackWindow(savedState = null) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }
function openGlobalControlsWindow(savedState = null) { /* ... (same as in ui_js_inspector_build_debug_may28_v3, with "super try-catch" and active attachGlobalControlEvents) ... */ }
function openSoundBrowserWindow(savedState = null) { /* ... (same as in ui_js_inspector_build_debug_may28_v3, with debug logs) ... */ }
function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... (same as in ui_js_inspector_build_debug_may28_v3, with debug logs) ... */ }
function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (same as in ui_js_inspector_build_debug_may28_v3, with debug logs) ... */ }
function openMixerWindow(savedState = null) { /* ... (same as in ui_js_inspector_build_debug_may28_v3, with debug logs) ... */ }
function updateMixerWindow() { /* ... (same as in ui_js_inspector_build_debug_may28_v3, with debug logs) ... */ }
function renderMixer(container) { /* ... (same as in ui_js_inspector_build_debug_may28_v3, with debug logs) ... */ }
function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }
function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }

// --- Utility UI functions for samplers (Updated for Audio Status & Debugging) ---
function renderSamplePads(track) { /* ... (same as in ui_js_inspector_build_debug_may28_v3, with detailed logs) ... */ }
function updateSliceEditorUI(track) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }
function applySliceEdits(trackId) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }
function drawWaveform(track) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }
function drawInstrumentWaveform(track) { drawWaveform(track); }
function updateDrumPadControlsUI(track) { /* ... (same as in ui_js_inspector_build_debug_may28_v3, with detailed logs) ... */ }
function renderDrumSamplerPads(track) { /* ... (same as in ui_js_inspector_build_debug_may28_v3, with detailed logs) ... */ }
function highlightPlayingStep(col, trackType, gridElement) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }

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
