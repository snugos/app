// js/ui.js - Main UI Orchestrator

// Import initializers from all UI sub-modules
import { initializeInspectorUI } from './ui/inspectorUI.js';
import { initializeMixerUI } from './ui/mixerUI.js';
import { initializeEffectsRackUI } from './ui/effectsRackUI.js';
import { initializeTimelineUI } from './ui/timelineUI.js';
import { initializeSoundBrowserUI } from './ui/soundBrowserUI.js';
import { initializePianoRollUI } from './ui/pianoRollUI.js';
import { initializeYouTubeImporterUI } from './ui/youtubeImporterUI.js';

// Import all exported functions from the sub-modules
import { createKnob } from './ui/knobUI.js';
import { openTrackInspectorWindow, drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI, renderDrumSamplerPads, updateDrumPadControlsUI } from './ui/inspectorUI.js';
import { openMixerWindow, updateMixerWindow } from './ui/mixerUI.js';
import { openTrackEffectsRackWindow, openMasterEffectsRackWindow, renderEffectsList, renderEffectControls } from './ui/effectsRackUI.js';
import { openTimelineWindow, renderTimeline, updatePlayheadPosition } from './ui/timelineUI.js';
import { openSoundBrowserWindow, updateSoundBrowserDisplayForLibrary, renderSoundBrowserDirectory } from './ui/soundBrowserUI.js';
import { openPianoRollWindow } from './ui/pianoRollUI.js';
import { openYouTubeImporterWindow } from './ui/youtubeImporterUI.js';


export function initializeUIModule(appServices) {
    // Pass the appServices object to each sub-module that needs it
    initializeInspectorUI(appServices);
    initializeMixerUI(appServices);
    initializeEffectsRackUI(appServices);
    initializeTimelineUI(appServices);
    initializeSoundBrowserUI(appServices);
    initializePianoRollUI(appServices);
    initializeYouTubeImporterUI(appServices);
}

// Export all functions to be used by other parts of the app
export {
    createKnob,
    openTrackInspectorWindow,
    openMixerWindow,
    updateMixerWindow,
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    renderEffectsList,
    renderEffectControls,
    openTimelineWindow,
    renderTimeline,
    updatePlayheadPosition,
    openSoundBrowserWindow,
    updateSoundBrowserDisplayForLibrary,
    renderSoundBrowserDirectory,
    openPianoRollWindow,
    openYouTubeImporterWindow,
    drawWaveform,
    drawInstrumentWaveform,
    renderSamplePads,
    updateSliceEditorUI,
    renderDrumSamplerPads,
    updateDrumPadControlsUI
};
