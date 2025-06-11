// js/daw/ui/ui.js - Main UI Orchestrator

// Import initializers from all UI sub-modules
import { initializeInspectorUI } from './inspectorUI.js';
import { initializeMixerUI } from './mixerUI.js';
import { initializeEffectsRackUI } from './effectsRackUI.js';
// Removed initializeTimelineUI
import { initializeSoundBrowserUI } from './soundBrowserUI.js';
import { initializePianoRollUI } from './pianoRollUI.js';
import { initializeYouTubeImporterUI } from './youtubeImporterUI.js';
// Removed initializeProfileUI and openProfileWindow as profile page is now separate

// Removed specific imports for now-global functions and separated profile functions
// createKnob is global
// openTrackInspectorWindow, renderSamplePads, updateSliceEditorUI, renderDrumSamplerPads, updateDrumPadControlsUI are global
// openMixerWindow, updateMixerWindow are global
// openTrackEffectsRackWindow, openMasterEffectsRackWindow, renderEffectsList, renderEffectControls are global
// openTimelineWindow, renderTimeline, updatePlayheadPosition are removed (timeline removed)
// openSoundBrowserWindow, renderSoundBrowser, renderDirectoryView are global
// openPianoRollWindow, updatePianoRollPlayhead are global
// openYouTubeImporterWindow is global

/**
 * Initializes all UI sub-modules by passing them the appServices object.
 * This function also wires up services that are defined in one UI module but needed by others.
 * @param {object} appServices 
 */
// Removed export
function initializeUIModule(appServices) {
    // Make createKnob available as a service for other modules to use
    // createKnob is global
    appServices.createKnob = (opts) => createKnob(opts, appServices);
    
    // Initialize all modules
    initializeInspectorUI(appServices);
    initializeMixerUI(appServices);
    initializeEffectsRackUI(appServices);
    // Removed initializeTimelineUI
    initializeSoundBrowserUI(appServices);
    initializePianoRollUI(appServices);
    initializeYouTubeImporterUI(appServices);
    // Removed initializeProfileUI
}

// Export all the functions that main.js needs to build the appServices object.
// This file acts as a single entry point for all UI functionality.
// Removed exports as these functions are now globally available or handled by localAppServices.
// The appServices object in main.js will now directly refer to the global functions.
/*
export {
    createKnob,
    openTrackInspectorWindow,
    openMixerWindow,
    updateMixerWindow,
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    renderEffectsList,
    renderEffectControls,
    openSoundBrowserWindow,
    renderSoundBrowser,
    renderDirectoryView,
    openPianoRollWindow,
    updatePianoRollPlayhead,
    openYouTubeImporterWindow,
    renderSamplePads,
    updateSliceEditorUI,
    renderDrumSamplerPads,
    updateDrumPadControlsUI,
    openProfileWindow, // This should no longer be exported from here
};
*/
