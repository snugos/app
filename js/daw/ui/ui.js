// js/daw/ui/ui.js - Main UI Orchestrator

// Import initializers from all UI sub-modules
import { initializeInspectorUI, openTrackInspectorWindow, renderSamplePads, updateSliceEditorUI, renderDrumSamplerPads, updateDrumPadControlsUI } from './inspectorUI.js'; //
import { initializeMixerUI, openMixerWindow, updateMixerWindow } from './mixerUI.js'; //
import { initializeEffectsRackUI, openTrackEffectsRackWindow, openMasterEffectsRackWindow, renderEffectsList, renderEffectControls } from './effectsRackUI.js'; //
// Removed initializeTimelineUI as timeline is removed
import { initializeSoundBrowserUI, openSoundBrowserWindow, renderSoundBrowser, renderDirectoryView } from './soundBrowserUI.js'; //
import { initializePianoRollUI, openPianoRollWindow, updatePianoRollPlayhead } from './pianoRollUI.js'; //
import { initializeYouTubeImporterUI, openYouTubeImporterWindow } from './youtubeImporterUI.js'; //
import { initializeFileViewerUI, openFileViewerWindow } from './fileViewerUI.js'; // NEW: Import FileViewerUI

import { createKnob } from './knobUI.js'; //


/**
 * Initializes all UI sub-modules by passing them the appServices object.
 * This function also wires up services that are defined in one UI module but needed by others.
 * @param {object} appServices 
 */
export function initializeUIModule(appServices) { //
    // Make createKnob available as a service for other modules to use
    appServices.createKnob = (opts) => createKnob(opts, appServices); //
    
    // Initialize all modules
    initializeInspectorUI(appServices); //
    initializeMixerUI(appServices); //
    initializeEffectsRackUI(appServices); //
    // Removed initializeTimelineUI
    initializeSoundBrowserUI(appServices); //
    initializePianoRollUI(appServices); //
    initializeYouTubeImporterUI(appServices); //
    initializeFileViewerUI(appServices); // NEW: Initialize FileViewerUI
}

// Export all the functions that main.js needs to build the appServices object.
// This file acts as a single entry point for all UI functionality.
export { //
    createKnob, // Re-exported
    openTrackInspectorWindow, //
    openMixerWindow, //
    updateMixerWindow, //
    openTrackEffectsRackWindow, //
    openMasterEffectsRackWindow, //
    renderEffectsList, //
    renderEffectControls, //
    openSoundBrowserWindow, //
    renderSoundBrowser, //
    renderDirectoryView, //
    openPianoRollWindow, //
    updatePianoRollPlayhead, //
    openYouTubeImporterWindow, //
    openFileViewerWindow, // NEW: Export openFileViewerWindow
    renderSamplePads, //
    updateSliceEditorUI, //
    renderDrumSamplerPads, //
    updateDrumPadControlsUI, //
    // openProfileWindow, // This should no longer be exported from here as profile page is separate
};
