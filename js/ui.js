// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Audio Status, Relink & Debugging Version (Corrected Exports & Upload Click Fix + GCW Debug + GCW try...catch)');

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
function createKnob(options) { /* ... (as before) ... */ }

// --- Synth Inspector Specifics ---
const synthEngineControlDefinitions = { /* ... (as before) ... */ };
function buildSynthSpecificInspectorDOM(track) { /* ... (as before) ... */ }
function buildSynthEngineControls(track, container, engineType) { /* ... (as before) ... */ }

// --- Sampler Inspector Specifics ---
function buildSamplerSpecificInspectorDOM(track) { /* ... (as before, uses corrected createDropZoneHTML call) ... */ }

// --- Drum Sampler Inspector Specifics ---
function buildDrumSamplerSpecificInspectorDOM(track) { /* ... (as before, uses corrected createDropZoneHTML call) ... */ }

// --- Instrument Sampler Inspector Specifics ---
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... (as before, uses corrected createDropZoneHTML call) ... */ }

// --- Track Inspector Window & Controls Initialization ---
function buildTrackInspectorContentDOM(track) { /* ... (as before) ... */ }
function openTrackInspectorWindow(trackId, savedState = null) { /* ... (as before) ... */ }
function initializeCommonInspectorControls(track, winEl) { /* ... (as before) ... */ }
function initializeTypeSpecificInspectorControls(track, winEl) { /* ... (as before) ... */ }
function initializeSynthSpecificControls(track, winEl) { /* ... (as before) ... */ }
function initializeSamplerSpecificControls(track, winEl) { /* ... (as before, with corrected ID querying and relink listener) ... */ }
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... (as before, with corrected ID querying and relink listener) ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... (as before, with corrected ID querying and relink listener) ... */ }

// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') { /* ... (as before) ... */ }
function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... (as before) ... */ }
function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... (as before) ... */ }
function showAddEffectModal(owner, ownerType) { /* ... (as before) ... */ }


// --- Window Opening Functions (with Debugging) ---
function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (as before) ... */ }
function openMasterEffectsRackWindow(savedState = null) { /* ... (as before) ... */ }

function openGlobalControlsWindow(savedState = null) {
    console.log(`[UI - openGlobalControlsWindow] Called. savedState:`, savedState);
    const windowId = 'globalControls';
    if (typeof SnugWindow !== 'function') {
        console.error("[UI - openGlobalControlsWindow] SnugWindow is NOT a function!");
        return null;
    }
    if (window.openWindows && window.openWindows[windowId] && !savedState) {
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
        showNotification("Error creating global controls.", 5000);
        return null;
    }
    const winOptions = { width: 280, height: 250, x: 20, y: 20, initialContentKey: 'globalControls' };
    if (savedState) Object.assign(winOptions, savedState);

    let globalControlsWin = null;
    try {
        console.log("[UI - openGlobalControlsWindow] Attempting to create SnugWindow for globalControls...");
        globalControlsWin = new SnugWindow(windowId, 'Global Controls', contentDiv, winOptions);
        console.log("[UI - openGlobalControlsWindow] SnugWindow instance for globalControls:", globalControlsWin);
    } catch (e) {
        console.error('[UI - openGlobalControlsWindow] CRITICAL ERROR `new SnugWindow()` for globalControls:', e);
        showNotification("CRITICAL: Error creating window object.", 6000);
        return null;
    }

    if (!globalControlsWin || !globalControlsWin.element) {
        console.error("[UI - openGlobalControlsWindow] CRITICAL CHECK FAILED: globalControlsWin or element is falsy after SnugWindow construction.");
        showNotification("Failed to create Global Controls window.", 5000);
        return null;
    }

    // ***** ADDED TRY...CATCH AROUND THIS SECTION *****
    try {
        window.playBtn = globalControlsWin.element.querySelector('#playBtnGlobal');
        window.recordBtn = globalControlsWin.element.querySelector('#recordBtnGlobal');
        window.tempoInput = globalControlsWin.element.querySelector('#tempoGlobalInput');
        window.masterMeterBar = globalControlsWin.element.querySelector('#masterMeterBarGlobal');
        window.midiInputSelectGlobal = globalControlsWin.element.querySelector('#midiInputSelectGlobal');
        window.midiIndicatorGlobalEl = globalControlsWin.element.querySelector('#midiIndicatorGlobal');
        window.keyboardIndicatorGlobalEl = globalControlsWin.element.querySelector('#keyboardIndicatorGlobal');

        if (typeof window.attachGlobalControlEvents === 'function' && globalControlsWin.element) {
            console.log("[UI - openGlobalControlsWindow] Attaching global control events...");
            window.attachGlobalControlEvents(globalControlsWin.element);
            console.log("[UI - openGlobalControlsWindow] Global control events attached.");
        } else {
            console.warn("[UI - openGlobalControlsWindow] attachGlobalControlEvents not found or window element missing for globalControlsWin.");
        }
    } catch (error) {
        console.error("[UI - openGlobalControlsWindow] Error during control assignment or attachGlobalControlEvents:", error);
        showNotification("Error setting up global controls. Functionality may be limited.", 5000);
        // Do not return null here necessarily, the window object itself was created.
        // But this error might leave the window partially non-functional.
    }
    // ***** END OF ADDED TRY...CATCH *****
    
    console.log("[UI - openGlobalControlsWindow] Returning globalControlsWin:", globalControlsWin);
    console.log("[UI - openGlobalControlsWindow] globalControlsWin.element:", globalControlsWin?.element);
    return globalControlsWin;
}

function openSoundBrowserWindow(savedState = null) { /* ... (with existing logs) ... */ }
function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... (with existing logs) ... */ }
function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (no changes) ... */ }
function openMixerWindow(savedState = null) { /* ... (with existing logs) ... */ }
function updateMixerWindow() { /* ... (with existing logs) ... */ }
function renderMixer(container) { /* ... (with existing logs) ... */ }
function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... (no changes) ... */ }
function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... (no changes) ... */ }


// --- Utility UI functions for samplers (Updated for Audio Status & Debugging) ---
function renderSamplePads(track) { /* ... (as in ui_js_final_relink_fix_May28) ... */ }
function updateSliceEditorUI(track) { /* ... (as in ui_js_final_relink_fix_May28) ... */ }
function applySliceEdits(trackId) { /* ... (as in ui_js_final_relink_fix_May28) ... */ }
function drawWaveform(track) { /* ... (as in ui_js_final_relink_fix_May28) ... */ }
function drawInstrumentWaveform(track) { drawWaveform(track); }
function updateDrumPadControlsUI(track) { /* ... (as in ui_js_final_relink_fix_May28) ... */ }

function renderDrumSamplerPads(track) { // For Drum Sampler
    console.log(`[UI - renderDrumSamplerPads] Called for track ${track.id}`); // ADDED LOG
    if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) {
        console.warn(`[UI - renderDrumSamplerPads] Pre-conditions not met. Track: ${!!track}, Type: ${track?.type}, Inspector: ${!!track?.inspectorWindow?.element}`);
        return;
    }
    const padsContainer = track.inspectorWindow.element.querySelector(`#drumSamplerPadsContainer-${track.id}`);
    if (!padsContainer) {
        console.error(`[UI - renderDrumSamplerPads] padsContainer (ID: #drumSamplerPadsContainer-${track.id}) not found! Cannot render pads.`);
        return;
    }
    padsContainer.innerHTML = '';

    if (!track.drumSamplerPads || track.drumSamplerPads.length === 0) {
        padsContainer.textContent = 'No pads defined for this track.';
        console.warn(`[UI - renderDrumSamplerPads] Track ${track.id} has no drumSamplerPads array or it's empty.`);
        return;
    }
    console.log(`[UI - renderDrumSamplerPads] Rendering ${track.drumSamplerPads.length} pads for track ${track.id}.`); // ADDED LOG

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
        // console.log(`[UI - renderDrumSamplerPads] Creating pad button ${index + 1} for track ${track.id}. Status: ${padData.status}, FileName: ${padData.originalFileName}`); // DEBUG

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
    console.log(`[UI - renderDrumSamplerPads] Finished rendering pads for track ${track.id}. Pad count in DOM: ${padsContainer.children.length}`); // ADDED LOG
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
