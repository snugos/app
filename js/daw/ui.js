// js/daw/ui.js - Main UI Orchestrator

// Import initializers from all UI sub-modules
import { initializeInspectorUI } from './inspectorUI.js';
import { initializeMixerUI } from './mixerUI.js';
import { initializeEffectsRackUI } from './effectsRackUI.js';
// Removed initializeTimelineUI
import { initializeSoundBrowserUI } from './soundBrowserUI.js';
import { initializePianoRollUI } from './pianoRollUI.js';
import { initializeYouTubeImporterUI } from './youtubeImporterUI.js';
import { initializeProfileUI, openProfileWindow } from './profileUI.js';

// Import all exported functions from the sub-modules that main.js needs
import { createKnob } from '../knobUI.js'; // Adjusted path
import { openTrackInspectorWindow, renderSamplePads, updateSliceEditorUI, renderDrumSamplerPads, updateDrumPadControlsUI } from './inspectorUI.js';
import { openMixerWindow, updateMixerWindow } from './mixerUI.js';
import { openTrackEffectsRackWindow, openMasterEffectsRackWindow, renderEffectsList, renderEffectControls } from './effectsRackUI.js';
// Removed openTimelineWindow, renderTimeline, updatePlayheadPosition
import { openSoundBrowserWindow, renderSoundBrowser, renderDirectoryView } from './soundBrowserUI.js';
import { openPianoRollWindow, updatePianoRollPlayhead } from './pianoRollUI.js';
import { openYouTubeImporterWindow } from './youtubeImporterUI.js';

/**
 * Initializes all UI sub-modules by passing them the appServices object.
 * This function also wires up services that are defined in one UI module but needed by others.
 * @param {object} appServices 
 */
export function initializeUIModule(appServices) {
    // Make createKnob available as a service for other modules to use
    appServices.createKnob = (opts) => createKnob(opts, appServices);
    
    // Initialize all modules
    initializeInspectorUI(appServices);
    initializeMixerUI(appServices);
    initializeEffectsRackUI(appServices);
    // Removed initializeTimelineUI
    initializeSoundBrowserUI(appServices);
    initializePianoRollUI(appServices);
    initializeYouTubeImporterUI(appServices);
    initializeProfileUI(appServices);
}

// Export all the functions that main.js needs to build the appServices object.
// This file acts as a single entry point for all UI functionality.
export {
    createKnob,
    openTrackInspectorWindow,
    openMixerWindow,
    updateMixerWindow,
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    renderEffectsList,
    renderEffectControls,
    // Removed openTimelineWindow, renderTimeline, updatePlayheadPosition
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
    openProfileWindow,
};
