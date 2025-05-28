// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Minimal GlobalControlsWindow Return Test');

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
function createKnob(options) { /* ... (same as in ui_js_super_trycatch_gcw) ... */ }

// --- Synth Inspector Specifics ---
const synthEngineControlDefinitions = { /* ... (same as in ui_js_super_trycatch_gcw) ... */ };
function buildSynthSpecificInspectorDOM(track) { /* ... (same as in ui_js_super_trycatch_gcw) ... */ }
function buildSynthEngineControls(track, container, engineType) { /* ... (same as in ui_js_super_trycatch_gcw) ... */ }

// --- Sampler Inspector Specifics ---
function buildSamplerSpecificInspectorDOM(track) { /* ... (same as in ui_js_super_trycatch_gcw, with corrected createDropZoneHTML call) ... */ }

// --- Drum Sampler Inspector Specifics ---
function buildDrumSamplerSpecificInspectorDOM(track) { /* ... (same as in ui_js_super_trycatch_gcw, with corrected createDropZoneHTML call) ... */ }

// --- Instrument Sampler Inspector Specifics ---
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... (same as in ui_js_super_trycatch_gcw, with corrected createDropZoneHTML call) ... */ }

// --- Track Inspector Window & Controls Initialization ---
function buildTrackInspectorContentDOM(track) { /* ... (same as in ui_js_inspector_build_debug, with detailed try-catch and logging) ... */ }
function openTrackInspectorWindow(trackId, savedState = null) { /* ... (same as in ui_js_inspector_build_debug, with detailed logging) ... */ }
function initializeCommonInspectorControls(track, winEl) { /* ... (same as in ui_js_super_trycatch_gcw) ... */ }
function initializeTypeSpecificInspectorControls(track, winEl) { /* ... (same as in ui_js_inspector_build_debug, with detailed logs) ... */ }
function initializeSynthSpecificControls(track, winEl) { /* ... (same as in ui_js_super_trycatch_gcw) ... */ }
function initializeSamplerSpecificControls(track, winEl) { /* ... (same as in ui_js_super_trycatch_gcw, with corrected ID logic) ... */ }
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... (same as in ui_js_inspector_build_debug, with detailed logs) ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... (same as in ui_js_super_trycatch_gcw, with corrected ID logic) ... */ }

// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') { /* ... (same as in ui_js_super_trycatch_gcw) ... */ }
function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }
function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }
function showAddEffectModal(owner, ownerType) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }

// --- Window Opening Functions ---
function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }
function openMasterEffectsRackWindow(savedState = null) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }

function openGlobalControlsWindow(savedState = null) {
    console.log(`[UI - openGlobalControlsWindow] Called. savedState:`, savedState);
    const windowId = 'globalControls';

    // No extensive try-catch for this minimal test, errors should be obvious if SnugWindow fails
    if (typeof SnugWindow !== 'function') {
        console.error("[UI - openGlobalControlsWindow] SnugWindow is NOT a function!");
        return null;
    }
    if (window.openWindows && window.openWindows[windowId] && !savedState) {
        console.log("[UI - openGlobalControlsWindow] Restoring existing window and returning immediately.");
        window.openWindows[windowId].restore();
        return window.openWindows[windowId];
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'global-controls-window p-2 space-y-3';
    try {
        let tempoValue = 120.0;
        if (typeof Tone !== 'undefined' && Tone.Transport) {
            tempoValue = Tone.Transport.bpm.value.toFixed(1);
        }
        contentDiv.innerHTML = `
            <div class="flex items-center gap-2"><button id="playBtnGlobal" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-sm shadow">Play</button><button id="recordBtnGlobal" class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-sm shadow">Record</button></div>
            <div class="flex items-center gap-2"><label for="tempoGlobalInput" class="control-label text-xs">Tempo:</label><input type="number" id="tempoGlobalInput" value="${tempoValue}" min="40" max="240" step="0.1" class="bg-white text-black w-16 p-1 rounded-sm text-center text-xs border border-gray-500"><span class="text-xs"> BPM</span></div>
            <div class="flex items-center gap-2 mt-2"><label for="midiInputSelectGlobal" class="text-xs">MIDI In:</label><select id="midiInputSelectGlobal" class="bg-white text-black p-1 rounded-sm text-xs border border-gray-500 flex-grow"></select><span id="midiIndicatorGlobal" title="MIDI Activity" class="border border-black w-3 h-3 inline-block rounded-full bg-gray-400"></span><span id="keyboardIndicatorGlobal" title="Keyboard Input Activity" class="border border-black w-3 h-3 inline-block rounded-full bg-gray-400"></span></div>
            <div id="masterMeterContainerGlobal" class="meter-bar-container mt-2" title="Master Output Level" style="height:15px;"><div id="masterMeterBarGlobal" class="meter-bar" style="width: 0%;"></div></div>
        `;
    } catch (e) {
        console.error("[UI - openGlobalControlsWindow] Error setting innerHTML for globalControls:", e);
        showNotification("Error creating global controls content.", 5000);
        return null;
    }

    const winOptions = { width: 280, height: 250, x: 20, y: 20, initialContentKey: 'globalControls' };
    if (savedState) Object.assign(winOptions, savedState);

    console.log("[UI - openGlobalControlsWindow] Attempting to create SnugWindow for globalControls...");
    let globalControlsWin = new SnugWindow(windowId, 'Global Controls', contentDiv, winOptions);
    console.log("[UI - openGlobalControlsWindow] SnugWindow instance for globalControls (initial):", globalControlsWin);

    if (!globalControlsWin || !globalControlsWin.element) {
        console.error("[UI - openGlobalControlsWindow] CRITICAL CHECK FAILED IMMEDIATELY: globalControlsWin or element is falsy after SnugWindow construction.");
        showNotification("Failed to create Global Controls window (instance/element invalid).", 5000);
        return null;
    }
    
    // ALL SUBSEQUENT LOGIC IS COMMENTED OUT FOR THIS TEST
    console.log(`[UI - openGlobalControlsWindow] SnugWindow for ${windowId} seems valid.`);
    console.log("[UI - openGlobalControlsWindow] Returning globalControlsWin IMMEDIATELY after creation for debugging.");
    console.log("[UI - openGlobalControlsWindow] globalControlsWin.element before immediate return:", globalControlsWin?.element);
    return globalControlsWin;

    /*
    // --- Start of Commmented Out Section ---
    console.log(`[UI - openGlobalControlsWindow] SnugWindow for ${windowId} seems valid, proceeding to assign elements.`);
    window.playBtn = globalControlsWin.element.querySelector('#playBtnGlobal');
    window.recordBtn = globalControlsWin.element.querySelector('#recordBtnGlobal');
    window.tempoInput = globalControlsWin.element.querySelector('#tempoGlobalInput');
    window.masterMeterBar = globalControlsWin.element.querySelector('#masterMeterBarGlobal');
    window.midiInputSelectGlobal = globalControlsWin.element.querySelector('#midiInputSelectGlobal');
    window.midiIndicatorGlobalEl = globalControlsWin.element.querySelector('#midiIndicatorGlobal');
    window.keyboardIndicatorGlobalEl = globalControlsWin.element.querySelector('#keyboardIndicatorGlobal');
    console.log("[UI - openGlobalControlsWindow] Global element references assigned.");

    if (typeof window.attachGlobalControlEvents === 'function' && globalControlsWin.element) {
        console.log("[UI - openGlobalControlsWindow] Attaching global control events...");
        window.attachGlobalControlEvents(globalControlsWin.element); 
        console.log("[UI - openGlobalControlsWindow] Global control events attached (or attempted).");
    } else {
        console.warn("[UI - openGlobalControlsWindow] attachGlobalControlEvents not found or window element missing for globalControlsWin.");
    }
    
    console.log("[UI - openGlobalControlsWindow] Successfully returning globalControlsWin:", globalControlsWin);
    console.log("[UI - openGlobalControlsWindow] globalControlsWin.element before return:", globalControlsWin?.element);
    return globalControlsWin;
    // --- End of Commmented Out Section ---
    */
}

function openSoundBrowserWindow(savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function openMixerWindow(savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function updateMixerWindow() { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function renderMixer(container) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
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
