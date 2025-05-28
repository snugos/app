// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Inspector Init Debug + Previous Fixes');

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
function createKnob(options) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }

// --- Synth Inspector Specifics ---
const synthEngineControlDefinitions = { /* ... (as in ui_js_super_trycatch_gcw) ... */ };
function buildSynthSpecificInspectorDOM(track) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }
function buildSynthEngineControls(track, container, engineType) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }

// --- Sampler Inspector Specifics ---
function buildSamplerSpecificInspectorDOM(track) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }

// --- Drum Sampler Inspector Specifics ---
function buildDrumSamplerSpecificInspectorDOM(track) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }

// --- Instrument Sampler Inspector Specifics ---
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }

// --- Track Inspector Window & Controls Initialization ---
function buildTrackInspectorContentDOM(track) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }

function openTrackInspectorWindow(trackId, savedState = null) {
    console.log(`[UI - openTrackInspectorWindow] Called for trackId: ${trackId}`); // LOG
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track) {
        showNotification(`Track ID ${trackId} not found. Cannot open inspector.`, 3000);
        console.error(`[UI - openTrackInspectorWindow] Track object not found for ID: ${trackId}`);
        return null;
    }
    console.log(`[UI - openTrackInspectorWindow] Track found: ${track.name}, Type: ${track.type}`); // LOG

    const inspectorId = `trackInspector-${track.id}`;
    if (window.openWindows[inspectorId] && !savedState) {
        window.openWindows[inspectorId].restore();
        return window.openWindows[inspectorId];
    }
    if (window.openWindows[inspectorId] && savedState) {
        window.openWindows[inspectorId].close();
    }

    track.inspectorControls = {}; // Reset controls reference
    console.log(`[UI - openTrackInspectorWindow] Building content DOM for track ${track.id}`); // LOG
    const inspectorContentElement = buildTrackInspectorContentDOM(track);
    if (!inspectorContentElement) {
        showNotification(`Failed to build Inspector content (Track ${track.id}).`, 4000);
        console.error(`[UI - openTrackInspectorWindow] buildTrackInspectorContentDOM returned null for track ${track.id}`); // LOG
        return null;
    }

    let windowHeight = 450;
    if (track.type === 'Synth') windowHeight = 620;
    else if (track.type === 'Sampler') windowHeight = 620;
    else if (track.type === 'DrumSampler') windowHeight = 580;
    else if (track.type === 'InstrumentSampler') windowHeight = 620;

    const winOptions = { width: Math.min(500, window.innerWidth - 40), height: Math.min(windowHeight, window.innerHeight - 80), initialContentKey: `trackInspector-${track.id}` };
    if (savedState) Object.assign(winOptions, savedState);

    console.log(`[UI - openTrackInspectorWindow] Creating SnugWindow for inspector ${inspectorId}`); // LOG
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
         console.error(`[UI - openTrackInspectorWindow] SnugWindow instance or its element is null for inspector ${inspectorId}`); // LOG
        return null;
    }
    track.inspectorWindow = inspectorWin;
    console.log(`[UI - openTrackInspectorWindow] Inspector window created for ${track.id}. Element:`, inspectorWin.element); // LOG

    console.log(`[UI - openTrackInspectorWindow] Calling initializeCommonInspectorControls for track ${track.id}`); // LOG
    initializeCommonInspectorControls(track, inspectorWin.element);

    console.log(`[UI - openTrackInspectorWindow] Calling initializeTypeSpecificInspectorControls for track ${track.id} of type ${track.type}`); // LOG
    initializeTypeSpecificInspectorControls(track, inspectorWin.element);
    
    console.log(`[UI - openTrackInspectorWindow] Scheduling knob refresh for track ${track.id}`); // LOG
    setTimeout(() => {
        Object.values(track.inspectorControls).forEach(control => {
            if (control?.type === 'knob' && typeof control.refreshVisuals === 'function') {
                control.refreshVisuals();
            }
        });
    }, 50);
    
    console.log(`[UI - openTrackInspectorWindow] Finished for track ${track.id}`); // LOG
    return inspectorWin;
}

function initializeCommonInspectorControls(track, winEl) { /* ... (same as before) ... */ }

function initializeTypeSpecificInspectorControls(track, winEl) {
    console.log(`[UI - initializeTypeSpecificInspectorControls] START - Track ID: ${track.id}, Type: ${track.type}, winEl:`, winEl); // ADDED LOG
    if (track.type === 'Synth') {
        console.log(`[UI - initializeTypeSpecificInspectorControls] Initializing Synth controls for track ${track.id}`); // ADDED LOG
        initializeSynthSpecificControls(track, winEl);
    } else if (track.type === 'Sampler') {
        console.log(`[UI - initializeTypeSpecificInspectorControls] Initializing Sampler controls for track ${track.id}`); // ADDED LOG
        initializeSamplerSpecificControls(track, winEl);
    } else if (track.type === 'DrumSampler') {
        console.log(`[UI - initializeTypeSpecificInspectorControls] Initializing DrumSampler controls for track ${track.id}`); // ADDED LOG
        initializeDrumSamplerSpecificControls(track, winEl);
    } else if (track.type === 'InstrumentSampler') {
        console.log(`[UI - initializeTypeSpecificInspectorControls] Initializing InstrumentSampler controls for track ${track.id}`); // ADDED LOG
        initializeInstrumentSamplerSpecificControls(track, winEl);
    } else {
        console.warn(`[UI - initializeTypeSpecificInspectorControls] Unknown track type: ${track.type} for track ${track.id}`); // ADDED LOG
    }
    console.log(`[UI - initializeTypeSpecificInspectorControls] END - Track ID: ${track.id}`); // ADDED LOG
}

function initializeSynthSpecificControls(track, winEl) { /* ... (same as before) ... */ }
function initializeSamplerSpecificControls(track, winEl) { /* ... (same as before) ... */ }

function initializeDrumSamplerSpecificControls(track, winEl) {
    console.log(`[UI - initializeDrumSamplerSpecificControls] START - Track ID: ${track.id}, winEl:`, winEl); // ADDED LOG
    if (typeof renderDrumSamplerPads === 'function') {
        console.log(`[UI - initializeDrumSamplerSpecificControls] Calling renderDrumSamplerPads for track ${track.id}`); // ADDED LOG
        renderDrumSamplerPads(track);
    } else {
        console.error("[UI - initializeDrumSamplerSpecificControls] renderDrumSamplerPads is not a function");
    }
    if (typeof updateDrumPadControlsUI === 'function') {
        console.log(`[UI - initializeDrumSamplerSpecificControls] Calling updateDrumPadControlsUI for track ${track.id}`); // ADDED LOG
        updateDrumPadControlsUI(track);
    } else {
        console.error("[UI - initializeDrumSamplerSpecificControls] updateDrumPadControlsUI is not a function");
    }

    const pVolK = createKnob({ label: 'Pad Vol', min:0, max:1, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(track.selectedDrumPadForEdit, val)}); const volPh = winEl.querySelector(`#drumPadVolumeSlider-${track.id}`); if(volPh) { volPh.innerHTML = ''; volPh.appendChild(pVolK.element); } track.inspectorControls.drumPadVolume = pVolK;
    const pPitK = createKnob({ label: 'Pad Pitch', min:-24, max:24, step:1, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(track.selectedDrumPadForEdit, val)}); const pitPh = winEl.querySelector(`#drumPadPitchKnob-${track.id}`); if(pitPh) { pitPh.innerHTML = ''; pitPh.appendChild(pPitK.element); } track.inspectorControls.drumPadPitch = pPitK;
    const pEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.attack || 0.005, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'attack', val)}); const attPh = winEl.querySelector(`#drumPadEnvAttackSlider-${track.id}`); if(attPh) { attPh.innerHTML = ''; attPh.appendChild(pEAK.element); } track.inspectorControls.drumPadEnvAttack = pEAK;
    const pERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'release', val)}); const relPh = winEl.querySelector(`#drumPadEnvReleaseSlider-${track.id}`); if(relPh) { relPh.innerHTML = ''; relPh.appendChild(pERK.element); } track.inspectorControls.drumPadEnvRelease = pERK;
    console.log(`[UI - initializeDrumSamplerSpecificControls] END - Track ID: ${track.id}`); // ADDED LOG
}

function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... (same as before) ... */ }

// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') { /* ... (same as before, with debug logs) ... */ }
function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... (same as before, with debug logs) ... */ }
function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... (same as before) ... */ }
function showAddEffectModal(owner, ownerType) { /* ... (same as before) ... */ }

// --- Window Opening Functions (with Debugging & GCW try...catch from ui_js_super_trycatch_gcw) ---
function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (same as before) ... */ }
function openMasterEffectsRackWindow(savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function openGlobalControlsWindow(savedState = null) { /* ... (same as in ui_js_super_trycatch_gcw, with attachGlobalControlEvents call now restored/active) ... */
    console.log(`[UI - openGlobalControlsWindow] Called. savedState:`, savedState);
    const windowId = 'globalControls';

    try { 
        if (typeof SnugWindow !== 'function') {
            console.error("[UI - openGlobalControlsWindow] SnugWindow is NOT a function!");
            return null;
        }
        if (window.openWindows && window.openWindows[windowId] && !savedState) {
            window.openWindows[windowId].restore();
            console.log("[UI - openGlobalControlsWindow] Restored existing window and returning.");
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

        console.log(`[UI - openGlobalControlsWindow] SnugWindow for ${windowId} seems valid, proceeding to assign elements.`);
        window.playBtn = globalControlsWin.element.querySelector('#playBtnGlobal');
        window.recordBtn = globalControlsWin.element.querySelector('#recordBtnGlobal');
        window.tempoInput = globalControlsWin.element.querySelector('#tempoGlobalInput');
        window.masterMeterBar = globalControlsWin.element.querySelector('#masterMeterBarGlobal');
        window.midiInputSelectGlobal = globalControlsWin.element.querySelector('#midiInputSelectGlobal');
        window.midiIndicatorGlobalEl = globalControlsWin.element.querySelector('#midiIndicatorGlobal');
        window.keyboardIndicatorGlobalEl = globalControlsWin.element.querySelector('#keyboardIndicatorGlobal');
        console.log("[UI - openGlobalControlsWindow] Global element references assigned.");

        // Call to attachGlobalControlEvents is RESTORED
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

    } catch (error) {
        console.error("[UI - openGlobalControlsWindow] UNHANDLED EXCEPTION in openGlobalControlsWindow:", error);
        showNotification("Major error creating Global Controls. App may be unstable.", 6000);
        return null;
    }
}

function openSoundBrowserWindow(savedState = null) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }
function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }
function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }
function openMixerWindow(savedState = null) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }
function updateMixerWindow() { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }
function renderMixer(container) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }
function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }
function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }

// --- Utility UI functions for samplers (Updated for Audio Status & Debugging) ---
function renderSamplePads(track) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }
function updateSliceEditorUI(track) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }
function applySliceEdits(trackId) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }
function drawWaveform(track) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }
function drawInstrumentWaveform(track) { drawWaveform(track); }
function updateDrumPadControlsUI(track) { /* ... (same content as in ui_js_latest_debug_May28_v2, with detailed logs) ... */ }
function renderDrumSamplerPads(track) { /* ... (same content as in ui_js_latest_debug_May28_v2, with detailed logs) ... */ }
function highlightPlayingStep(col, trackType, gridElement) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }

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
