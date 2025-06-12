// js/daw/ui/ui.js - Main UI Orchestrator

// Import initializers from all UI sub-modules
import { initializeInspectorUI, openTrackInspectorWindow, renderSamplePads, updateSliceEditorUI, renderDrumSamplerPads, updateDrumPadControlsUI } from './inspectorUI.js'; // Re-added imports
import { initializeMixerUI, openMixerWindow, updateMixerWindow } from './mixerUI.js'; // Re-added imports
import { initializeEffectsRackUI, openTrackEffectsRackWindow, openMasterEffectsRackWindow, renderEffectsList, renderEffectControls } from './effectsRackUI.js'; // Re-added imports
// Removed initializeTimelineUI as timeline is removed
import { initializeSoundBrowserUI, openSoundBrowserWindow, renderSoundBrowser, renderDirectoryView } from './soundBrowserUI.js'; // Re-added imports
import { initializePianoRollUI, openPianoRollWindow, updatePianoRollPlayhead } from './pianoRollUI.js'; // Re-added imports
import { initializeYouTubeImporterUI, openYouTubeImporterWindow } from './youtubeImporterUI.js'; // Re-added imports
// Removed initializeProfileUI and openProfileWindow as profile page is now separate

import { createKnob } from './knobUI.js'; // CORRECTED PATH: Changed from '../../knobUI.js' to './knobUI.js'


/**
 * Initializes all UI sub-modules by passing them the appServices object.
 * This function also wires up services that are defined in one UI module but needed by others.
 * @param {object} appServices 
 */
export function initializeUIModule(appServices) { // Export re-added
    // Make createKnob available as a service for other modules to use
    appServices.createKnob = (opts) => createKnob(opts, appServices); // createKnob is imported from knobUI.js
    
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
export { // Exports re-added
    createKnob, // Re-exported
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
    // openProfileWindow, // This should no longer be exported from here as profile page is separate
};
