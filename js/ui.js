// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Minimal Inspector Content Test + GCW Fix');

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

// --- Drum Sampler Inspector Specifics ---
function buildDrumSamplerSpecificInspectorDOM(track) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }

// --- Instrument Sampler Inspector Specifics ---
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... (same as in ui_js_inspector_build_debug_may28_v3) ... */ }

// --- Track Inspector Window & Controls Initialization ---
/**
 * SIMPLIFIED VERSION FOR DEBUGGING
 * Creates the DOM content for a track's inspector window.
 * @param {Track} track - The track object.
 * @returns {HTMLElement|null} The main content element for the inspector or null on critical failure.
 */
function buildTrackInspectorContentDOM(track) {
    console.log(`[UI - buildTrackInspectorContentDOM - MINIMAL TEST] Building content for track ${track.id} (${track.name}), type: ${track.type}`);
    try {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'track-inspector-content p-2 space-y-1';
        contentDiv.style.border = "2px solid red"; // Make it obvious
        
        const title = document.createElement('h3');
        title.textContent = `Inspector for: ${track.name} (Type: ${track.type})`;
        contentDiv.appendChild(title);

        const placeholderText = document.createElement('p');
        placeholderText.textContent = "Simplified inspector content for testing. Original content building is temporarily bypassed.";
        placeholderText.className = "text-xs text-gray-600";
        contentDiv.appendChild(placeholderText);

        if (!track || !track.id || !track.name || !track.type) {
            console.error("[UI - buildTrackInspectorContentDOM - MINIMAL TEST] Invalid track object received:", track);
            const errorMsg = document.createElement('p');
            errorMsg.textContent = "Error: Invalid track data for inspector.";
            errorMsg.className = "text-red-500";
            contentDiv.appendChild(errorMsg);
            return contentDiv; // Still return the div with error
        }
        
        console.log(`[UI - buildTrackInspectorContentDOM - MINIMAL TEST] Successfully built minimal contentDiv for track ${track.id}:`, contentDiv);
        return contentDiv;

    } catch (error) {
        console.error(`[UI - buildTrackInspectorContentDOM - MINIMAL TEST] MAJOR ERROR building inspector for track ${track.id}:`, error);
        showNotification(`Critical error building inspector for ${track.name || 'Unknown Track'}.`, 5000);
        const errorDiv = document.createElement('div');
        errorDiv.textContent = "Critical Error building inspector content. See console.";
        errorDiv.className = 'p-2 text-red-500 text-lg font-bold';
        return errorDiv; // Ensure an HTMLElement is returned
    }
}


function openTrackInspectorWindow(trackId, savedState = null) {
    console.log(`[UI - openTrackInspectorWindow] Called for trackId: ${trackId}`);
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track) {
        showNotification(`Track ID ${trackId} not found. Cannot open inspector.`, 3000);
        console.error(`[UI - openTrackInspectorWindow] Track object not found for ID: ${trackId}`);
        return null;
    }
    console.log(`[UI - openTrackInspectorWindow] Track found: ${track.name}, Type: ${track.type}`);

    const inspectorId = `trackInspector-${track.id}`;
    if (window.openWindows[inspectorId] && !savedState) {
        window.openWindows[inspectorId].restore();
        return window.openWindows[inspectorId];
    }
    if (window.openWindows[inspectorId] && savedState) {
        window.openWindows[inspectorId].close();
    }

    track.inspectorControls = {};
    console.log(`[UI - openTrackInspectorWindow] Building content DOM for track ${track.id}`);
    const inspectorContentElement = buildTrackInspectorContentDOM(track); // Call the debugged version
    
    if (!inspectorContentElement) {
        showNotification(`Failed to build Inspector content for Track ${track.id}. See console.`, 4000);
        console.error(`[UI - openTrackInspectorWindow] buildTrackInspectorContentDOM returned null for track ${track.id}. Cannot create window.`);
        return null; 
    }
    console.log(`[UI - openTrackInspectorWindow] inspectorContentElement received from build:`, inspectorContentElement);

    let windowHeight = 450; // Default, will be used if type-specific content is bypassed
    // if (track.type === 'Synth') windowHeight = 620;
    // else if (track.type === 'Sampler') windowHeight = 620;
    // else if (track.type === 'DrumSampler') windowHeight = 580;
    // else if (track.type === 'InstrumentSampler') windowHeight = 620;

    const winOptions = { width: Math.min(500, window.innerWidth - 40), height: Math.min(windowHeight, window.innerHeight - 80), initialContentKey: `trackInspector-${track.id}` };
    if (savedState) Object.assign(winOptions, savedState);

    console.log(`[UI - openTrackInspectorWindow] Creating SnugWindow for inspector ${inspectorId}`);
    let inspectorWin = null;
    try {
        inspectorWin = new SnugWindow(inspectorId, `Track: ${track.name}`, inspectorContentElement, winOptions);
    } catch (e) {
        console.error(`[UI - openTrackInspectorWindow] CRITICAL ERROR during \`new SnugWindow()\` for inspector ${inspectorId}:`, e);
        showNotification("CRITICAL: Error creating inspector window.", 6000);
        return null;
    }

    if (!inspectorWin || !inspectorWin.element) {
        showNotification(`Failed to create Inspector window for track ${track.id}.`, 5000);
         console.error(`[UI - openTrackInspectorWindow] SnugWindow instance or its element is null for inspector ${inspectorId}`);
        return null;
    }
    track.inspectorWindow = inspectorWin;
    console.log(`[UI - openTrackInspectorWindow] Inspector window created for ${track.id}. Element:`, inspectorWin.element);

    // Temporarily skip these as buildTrackInspectorContentDOM is minimal
    // console.log(`[UI - openTrackInspectorWindow] Calling initializeCommonInspectorControls for track ${track.id}`);
    // initializeCommonInspectorControls(track, inspectorWin.element);
    // console.log(`[UI - openTrackInspectorWindow] Calling initializeTypeSpecificInspectorControls for track ${track.id} of type ${track.type}`);
    // initializeTypeSpecificInspectorControls(track, inspectorWin.element);
    // console.log(`[UI - openTrackInspectorWindow] Scheduling knob refresh for track ${track.id}`);
    // setTimeout(() => {
    //     Object.values(track.inspectorControls).forEach(control => {
    //         if (control?.type === 'knob' && typeof control.refreshVisuals === 'function') {
    //             control.refreshVisuals();
    //         }
    //     });
    // }, 50);
    console.log(`[UI - openTrackInspectorWindow] SKIPPED common and type-specific controls initialization for minimal test.`);
    
    console.log(`[UI - openTrackInspectorWindow] Finished for track ${track.id}`);
    return inspectorWin;
}

function initializeCommonInspectorControls(track, winEl) { /* ... (same as in ui_js_super_trycatch_gcw) ... */ }
function initializeTypeSpecificInspectorControls(track, winEl) { /* ... (same as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function initializeSynthSpecificControls(track, winEl) { /* ... (same as in ui_js_super_trycatch_gcw) ... */ }
function initializeSamplerSpecificControls(track, winEl) { /* ... (same as in ui_js_super_trycatch_gcw) ... */ }
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... (same as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... (same as in ui_js_super_trycatch_gcw) ... */ }

// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function showAddEffectModal(owner, ownerType) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }

// --- Window Opening Functions (with Debugging & GCW try...catch from ui_js_super_trycatch_gcw) ---
function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function openMasterEffectsRackWindow(savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function openGlobalControlsWindow(savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw, with attachGlobalControlEvents call ACTIVE) ... */ }
function openSoundBrowserWindow(savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function openMixerWindow(savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function updateMixerWindow() { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function renderMixer(container) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }

// --- Utility UI functions for samplers (Updated for Audio Status & Debugging) ---
function renderSamplePads(track) { /* ... (same content as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function updateSliceEditorUI(track) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function applySliceEdits(trackId) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function drawWaveform(track) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function drawInstrumentWaveform(track) { drawWaveform(track); }
function updateDrumPadControlsUI(track) { /* ... (same content as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function renderDrumSamplerPads(track) { /* ... (same content as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function highlightPlayingStep(col, trackType, gridElement) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }

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
