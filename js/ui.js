// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Inspector Build Debug + Previous Fixes');

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
function buildTrackInspectorContentDOM(track) {
    console.log(`[UI - buildTrackInspectorContentDOM] Building content for track ${track.id} (${track.name}), type: ${track.type}`); // LOG
    const contentDiv = document.createElement('div');
    contentDiv.className = 'track-inspector-content p-2 space-y-1';

    try { // Wrap the main content building in a try-catch
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex items-center justify-between mb-1';
        const nameInput = document.createElement('input');
        nameInput.type = 'text'; nameInput.id = `trackNameDisplay-${track.id}`; nameInput.value = track.name;
        nameInput.className = 'text-md font-bold bg-transparent border-b w-full focus:ring-0 focus:border-blue-500';
        headerDiv.appendChild(nameInput);
        const meterContainer = document.createElement('div');
        meterContainer.id = `trackMeterContainer-${track.id}`;
        meterContainer.className = 'track-meter-container meter-bar-container w-1/3 ml-2 h-4';
        const meterBar = document.createElement('div'); meterBar.id = `trackMeterBar-${track.id}`; meterBar.className = 'meter-bar';
        meterContainer.appendChild(meterBar);
        headerDiv.appendChild(meterContainer);
        contentDiv.appendChild(headerDiv);

        const actionsDiv = document.createElement('div'); actionsDiv.className = 'flex items-center gap-1 mb-1';
        const muteBtn = document.createElement('button'); muteBtn.id = `muteBtn-${track.id}`; muteBtn.className = `mute-button text-xs p-1 ${track.isMuted ? 'muted' : ''}`; muteBtn.textContent = 'M'; muteBtn.addEventListener('click', () => handleTrackMute(track.id)); actionsDiv.appendChild(muteBtn);
        const soloBtn = document.createElement('button'); soloBtn.id = `soloBtn-${track.id}`; const currentSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null; soloBtn.className = `solo-button text-xs p-1 ${currentSoloId === track.id ? 'soloed' : ''}`; soloBtn.textContent = 'S'; soloBtn.addEventListener('click', () => handleTrackSolo(track.id)); actionsDiv.appendChild(soloBtn);
        const armBtn = document.createElement('button'); armBtn.id = `armInputBtn-${track.id}`; const currentArmedId = typeof window.getArmedTrackId === 'function' ? window.getArmedTrackId() : null; armBtn.className = `arm-input-button text-xs p-1 ${currentArmedId === track.id ? 'armed' : ''}`; armBtn.textContent = 'Arm'; armBtn.addEventListener('click', () => handleTrackArm(track.id)); actionsDiv.appendChild(armBtn);
        const removeBtn = document.createElement('button'); removeBtn.id = `removeTrackBtn-${track.id}`; removeBtn.className = 'bg-red-500 hover:bg-red-600 text-white text-xs py-0.5 px-1.5 rounded ml-auto'; removeBtn.textContent = 'Del'; removeBtn.addEventListener('click', () => handleRemoveTrack(track.id)); actionsDiv.appendChild(removeBtn);
        contentDiv.appendChild(actionsDiv);

        const trackControlsPanel = document.createElement('div'); trackControlsPanel.className = 'panel';
        const panelTitle = document.createElement('h4'); panelTitle.className = 'text-sm font-semibold mb-1'; panelTitle.textContent = 'Track Controls'; trackControlsPanel.appendChild(panelTitle);
        const controlGroup = document.createElement('div'); controlGroup.className = 'control-group';
        const volumeContainer = document.createElement('div'); volumeContainer.id = `volumeSliderContainer-${track.id}`; controlGroup.appendChild(volumeContainer);
        const seqLengthContainer = document.createElement('div'); seqLengthContainer.className = 'flex flex-col items-center space-y-1';
        const currentBars = track.sequenceLength / Constants.STEPS_PER_BAR;
        const seqLabel = document.createElement('label'); seqLabel.htmlFor = `sequenceLengthBars-${track.id}`; seqLabel.className = 'knob-label'; seqLabel.textContent = 'Seq Len (Bars)'; seqLengthContainer.appendChild(seqLabel);
        const seqInput = document.createElement('input'); seqInput.type = 'number'; seqInput.id = `sequenceLengthBars-${track.id}`; seqInput.value = currentBars; seqInput.min = "1"; seqInput.max = "256"; seqInput.step = "1"; seqInput.className = 'bg-white text-black w-16 p-1 rounded-sm text-center text-xs border border-gray-500'; seqLengthContainer.appendChild(seqInput);
        const seqDisplay = document.createElement('span'); seqDisplay.id = `sequenceLengthDisplay-${track.id}`; seqDisplay.className = 'knob-value'; seqDisplay.textContent = `${currentBars} bars (${track.sequenceLength} steps)`; seqLengthContainer.appendChild(seqDisplay);
        const doubleSeqButton = document.createElement('button'); doubleSeqButton.id = `doubleSeqBtn-${track.id}`; doubleSeqButton.className = 'bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded w-full mt-1'; doubleSeqButton.title = 'Double sequence length and content'; doubleSeqButton.textContent = 'Double';
        doubleSeqButton.addEventListener('click', async () => { /* ... */ });
        seqLengthContainer.appendChild(doubleSeqButton); controlGroup.appendChild(seqLengthContainer); trackControlsPanel.appendChild(controlGroup);
        contentDiv.appendChild(trackControlsPanel);

        let specificContentElement = null;
        console.log(`[UI - buildTrackInspectorContentDOM] About to call specific DOM builder for type: ${track.type}`); // LOG
        try {
            if (track.type === 'Synth') specificContentElement = buildSynthSpecificInspectorDOM(track);
            else if (track.type === 'Sampler') specificContentElement = buildSamplerSpecificInspectorDOM(track);
            else if (track.type === 'DrumSampler') specificContentElement = buildDrumSamplerSpecificInspectorDOM(track);
            else if (track.type === 'InstrumentSampler') specificContentElement = buildInstrumentSamplerSpecificInspectorDOM(track);
            console.log(`[UI - buildTrackInspectorContentDOM] specificContentElement after build call:`, specificContentElement); // LOG
        } catch (specificBuildError) {
            console.error(`[UI - buildTrackInspectorContentDOM] Error in specific DOM builder for type ${track.type}:`, specificBuildError); // LOG
            const errorMsg = document.createElement('p');
            errorMsg.textContent = `Error building UI for ${track.type}: ${specificBuildError.message}. Check console.`;
            errorMsg.className = 'text-red-500 text-xs';
            contentDiv.appendChild(errorMsg);
            // No explicit return null here, let the function proceed to return contentDiv
        }

        if (specificContentElement) {
            contentDiv.appendChild(specificContentElement);
        } else if (track.type === 'Synth' || track.type === 'Sampler' || track.type === 'DrumSampler' || track.type === 'InstrumentSampler') {
            // This log might be redundant if the catch block above already logged an error.
            console.warn(`[UI - buildTrackInspectorContentDOM] specificContentElement for track type ${track.type} was null or undefined (and no error caught in its builder).`);
        }

        const effectsButton = document.createElement('button'); effectsButton.className = 'effects-rack-button text-xs py-1 px-2 rounded mt-2 w-full bg-gray-300 hover:bg-gray-400 border border-gray-500'; effectsButton.textContent = 'Track Effects Rack'; effectsButton.addEventListener('click', () => handleOpenEffectsRack(track.id));
        contentDiv.appendChild(effectsButton);

        const sequencerButton = document.createElement('button'); sequencerButton.className = 'bg-indigo-500 hover:bg-indigo-600 text-white text-xs py-1 px-2 rounded mt-1 w-full'; sequencerButton.textContent = 'Sequencer'; sequencerButton.addEventListener('click', () => handleOpenSequencer(track.id));
        contentDiv.appendChild(sequencerButton);

        console.log(`[UI - buildTrackInspectorContentDOM] Successfully built contentDiv for track ${track.id}:`, contentDiv); // LOG
        return contentDiv;

    } catch (error) {
        console.error(`[UI - buildTrackInspectorContentDOM] MAJOR ERROR building inspector for track ${track.id}:`, error); // LOG
        showNotification(`Critical error building inspector for ${track.name}.`, 5000);
        // Fallback: return an empty div or a div with an error message to prevent returning undefined
        const errorDiv = document.createElement('div');
        errorDiv.textContent = "Error building inspector content. See console.";
        errorDiv.className = 'p-2 text-red-500';
        return errorDiv; // Ensure an HTMLElement is returned
    }
}

function openTrackInspectorWindow(trackId, savedState = null) { /* ... (same as in ui_js_latest_debug_May28_v2, with detailed logs around initialize calls) ... */ }
function initializeCommonInspectorControls(track, winEl) { /* ... (same as in ui_js_latest_debug_May28_v2) ... */ }
function initializeTypeSpecificInspectorControls(track, winEl) { /* ... (same as in ui_js_latest_debug_May28_v2, with detailed logs) ... */ }
function initializeSynthSpecificControls(track, winEl) { /* ... (same as in ui_js_latest_debug_May28_v2) ... */ }
function initializeSamplerSpecificControls(track, winEl) { /* ... (same as in ui_js_latest_debug_May28_v2) ... */ }
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... (same as in ui_js_latest_debug_May28_v2, with detailed logs) ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... (same as in ui_js_latest_debug_May28_v2) ... */ }

// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }
function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }
function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }
function showAddEffectModal(owner, ownerType) { /* ... (same content as in ui_js_latest_debug_May28_v2) ... */ }

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
