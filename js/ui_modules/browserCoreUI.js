// js/ui_modules/browserCoreUI.js (MODIFIED - Ensured direct appServices reference passing)
import { SnugWindow } from '../SnugWindow.js';
import {
    showNotification as utilShowNotification,
    createDropZoneHTML,
    setupGenericDropZoneListeners,
    showCustomModal,
    createContextMenu,
    showConfirmationDialog,
    snapTimeToGrid
} from '../utils.js';
import * as Constants from '../constants.js';

import {
    initializeInspectorEffectsUI,
    openTrackInspectorWindow,
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    drawWaveform as drawWaveformFromInspectorUI,
    drawInstrumentWaveform as drawInstrumentWaveformFromInspectorUI,
    renderSamplePads as renderSamplePadsFromInspectorUI,
    updateSliceEditorUI as updateSliceEditorUIFromInspectorUI,
    renderDrumSamplerPads as renderDrumSamplerPadsFromInspectorUI,
    updateDrumPadControlsUI as updateDrumPadControlsUIFromInspectorUI,
    renderEffectsList as renderEffectsListFromInspectorUI,
    renderEffectControls as renderEffectControlsFromInspectorUI,
    createKnob as createKnobFromInspectorUI
} from './inspectorEffectsUI.js';

import {
    initializeArrangementMixingUI,
    openArrangementWindow,
    openSequencerWindow,
    openMixerWindow,
    updateMixerWindow,
    updateSequencerCellUI as updateSequencerCellUIFromArrangement, // Exported from arrangementMixingUI
    renderTimeline as renderTimelineFromArrangement,
    updatePlayheadPosition as updatePlayheadPositionFromArrangement,
    highlightPlayingStep as highlightPlayingStepFromArrangement
} from './arrangementMixingUI.js';

export {
    openTrackInspectorWindow,
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    openArrangementWindow,
    openSequencerWindow,
    openMixerWindow,
    updateMixerWindow
};

// This will be the single appServices instance from main.js
let localAppServices = {};
let selectedSoundForPreviewData = null;

export function initializeUIModule(appServicesFromMain) {
    localAppServices = appServicesFromMain; // Use the direct reference from main.js

    // Pass the same, original appServicesFromMain to sub-modules
    initializeInspectorEffectsUI(appServicesFromMain);
    initializeArrangementMixingUI(appServicesFromMain);

    // Local sound preview helpers (these are fine as they are specific to this UI domain)
    if (!localAppServices.getSelectedSoundForPreview) {
        localAppServices.getSelectedSoundForPreview = () => selectedSoundForPreviewData;
    }
    if (!localAppServices.setSelectedSoundForPreview) {
        localAppServices.setSelectedSoundForPreview = (data) => { selectedSoundForPreviewData = data; };
    }

    if (!localAppServices.effectsRegistryAccess) { // Fallback, though main.js should provide it
        console.warn("[BrowserCoreUI] effectsRegistryAccess not found in appServices. Creating fallback.");
        localAppServices.effectsRegistryAccess = {
            AVAILABLE_EFFECTS: {},
            getEffectParamDefinitions: () => [],
            getEffectDefaultParams: () => ({}),
            synthEngineControlDefinitions: {}
        };
    }
    if (!localAppServices.effectsRegistryAccess.synthEngineControlDefinitions) {
        localAppServices.effectsRegistryAccess.synthEngineControlDefinitions = {};
    }
    // console.log("[BrowserCoreUI] UI Module Initialized with submodules.");
}

export function openSoundBrowserWindow(onFileSelectedCallback, savedState = null) {
    // Ensure localAppServices are available
    if (!localAppServices || !localAppServices.getWindowByIdState || !localAppServices.createWindow) {
        console.error("[BrowserCoreUI openSoundBrowserWindow] CRITICAL: Core appServices not available!");
        const errNotification = localAppServices.showNotification || utilShowNotification;
        errNotification("Cannot open Sound Browser: internal services missing.", "error");
        return null;
    }
    const windowId = 'soundBrowser';
    if (!savedState && localAppServices.getWindowByIdState(windowId)?.element) {
        localAppServices.getWindowByIdState(windowId).focus();
        return localAppServices.getWindowByIdState(windowId);
    }

    const contentHTML = `
        <div class="p-1 bg-slate-700 text-sm flex items-center sticky top-0 z-10">
            <label for="soundLibrarySelect" class="mr-2 text-xs">Library:</label>
            <select id="soundLibrarySelect" class="flex-grow bg-slate-800 p-1 rounded-sm text-xs mr-2"></select>
            <button id="soundBrowserUpBtn" class="px-2 py-0.5 bg-slate-600 hover:bg-slate-500 rounded-sm mr-1" title="Up a level"><i class="fas fa-arrow-up"></i></button>
        </div>
        <div id="soundBrowserPathDisplay" class="p-1 text-xs bg-slate-750 text-slate-400 truncate">/</div>
        <div id="soundBrowserList" class="p-1 space-y-0.5 overflow-y-auto h-full text-xs">
        </div>
        <div class="p-1 border-t border-slate-600 text-xs">
            <button id="soundBrowserPreviewBtn" class="w-full p-1 bg-blue-600 hover:bg-blue-500 rounded-sm disabled:opacity-50 text-white" disabled>Preview</button>
        </div>
    `;
    const options = { width: 300, height: 400, minWidth:250, minHeight:200, initialContentKey: windowId };
     if (savedState) Object.assign(options, { 
        x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), 
        width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), 
        zIndex: savedState.zIndex, isMinimized: savedState.isMinimized 
    });
    
    const browserWindow = localAppServices.createWindow(windowId, 'Sound Browser', contentHTML, options);

    if (browserWindow?.element) {
        const librarySelect = browserWindow.element.querySelector('#soundLibrarySelect');
        const upButton = browserWindow.element.querySelector('#soundBrowserUpBtn');
        const previewButton = browserWindow.element.querySelector('#soundBrowserPreviewBtn');

        if (Constants.soundLibraries && Object.keys(Constants.soundLibraries).length > 0) {
            Object.keys(Constants.soundLibraries).forEach(libName => {
                const option = document.createElement('option');
                option.value = libName;
                option.textContent = libName;
                librarySelect.appendChild(option);
            });
        } else {
            librarySelect.innerHTML = '<option value="">No Libraries Defined</option>';
        }
        
        if (localAppServices.getCurrentLibraryName && localAppServices.getCurrentLibraryName()) {
            librarySelect.value = localAppServices.getCurrentLibraryName();
        } else if (librarySelect.options.length > 0 && librarySelect.options[0].value) {
            // Select first available library if none is current
            librarySelect.value = librarySelect.options[0].value;
             if(localAppServices.setCurrentLibraryName) localAppServices.setCurrentLibraryName(librarySelect.value);
        }


        librarySelect.addEventListener('change', (e) => {
            if(localAppServices.setCurrentLibraryName) localAppServices.setCurrentLibraryName(e.target.value);
            // updateSoundBrowserDisplayForLibrary() is called by setCurrentLibraryName via state
        });

        upButton.addEventListener('click', () => {
            if(localAppServices.popFromSoundBrowserPath) localAppServices.popFromSoundBrowserPath();
            // updateSoundBrowserDisplayForLibrary() is called by popFromSoundBrowserPath via state
        });

        previewButton.addEventListener('click', () => {
            const selectedSound = localAppServices.getSelectedSoundForPreview ? localAppServices.getSelectedSoundForPreview() : null;
            if (selectedSound && localAppServices.loadAndPreviewSample) {
                localAppServices.loadAndPreviewSample(selectedSound.fullPath, selectedSound.libraryName, selectedSound.fileName);
            }
        });
        updateSoundBrowserDisplayForLibrary(); 
    }
    return browserWindow;
}

export function updateSoundBrowserDisplayForLibrary(libraryNameOverride = null, isLoading = false, hasError = false) {
    // ... (same as response #58, ensure localAppServices calls are valid) ...
    if (!localAppServices.getWindowByIdState || !localAppServices.getCurrentLibraryNameState || !localAppServices.getCurrentSoundBrowserPathState || !localAppServices.getSoundLibraryFileTreesState) return;

    const browserWindow = localAppServices.getWindowByIdState('soundBrowser');
    if (!browserWindow || !browserWindow.element) return;

    const listDiv = browserWindow.element.querySelector('#soundBrowserList');
    const pathDisplay = browserWindow.element.querySelector('#soundBrowserPathDisplay');
    const librarySelect = browserWindow.element.querySelector('#soundLibrarySelect');
    const previewButton = browserWindow.element.querySelector('#soundBrowserPreviewBtn');
    if(!listDiv || !pathDisplay || !librarySelect || !previewButton) return;
    listDiv.innerHTML = ''; 

    const currentLibraryName = libraryNameOverride || localAppServices.getCurrentLibraryNameState() || librarySelect.value;
    if (librarySelect.value !== currentLibraryName) librarySelect.value = currentLibraryName;

    const currentPathArray = localAppServices.getCurrentSoundBrowserPathState();
    pathDisplay.textContent = `/${currentPathArray.join('/')}`;

    const fileTrees = localAppServices.getSoundLibraryFileTreesState();
    let currentLevel = fileTrees[currentLibraryName];

    if (isLoading) { /* ... */ }
    if (hasError) { /* ... */ }
    if (!currentLevel && currentLibraryName && localAppServices.fetchSoundLibrary) { /* ... */ }
    if (!currentLevel) { /* ... */ }

    // Render folders and files (same logic as response #58)
    Object.entries(currentLevel || {}).sort((a,b) => a[0].localeCompare(b[0])).forEach(([name, item]) => {
        if (item.type === 'folder') { /* ... */ }
    });
    Object.entries(currentLevel || {}).sort((a,b) => a[0].localeCompare(b[0])).forEach(([name, item]) => {
        if (item.type === 'file') { /* ... */ }
    });
    if (previewButton) previewButton.disabled = true;
}

export function showAddTrackModal() {
    // ... (same as response #58, ensure localAppServices calls are valid) ...
    if (!localAppServices.showCustomModal || !localAppServices.addTrack) return;
    const content = `...`; // Content from response #58
    const modal = localAppServices.showCustomModal('Add New Track', content);
    if (modal && modal.contentDiv) { /* ... event listeners ... */ }
}

export function showAddEffectModal(owner, ownerType = 'track') {
    // ... (same as response #58, ensure localAppServices calls are valid) ...
    if (!localAppServices.effectsRegistryAccess || !localAppServices.showCustomModal) return;
    const effectsRegistry = localAppServices.effectsRegistryAccess;
    // ... (rest of logic)
}

export function updateTheme(theme) { 
    if (localAppServices.setCurrentThemeState) localAppServices.setCurrentThemeState(theme);
    else console.warn("[BrowserCoreUI updateTheme] setCurrentThemeState service not available.");
    // The actual DOM manipulation for theme is now expected to be handled by the state setter or a dedicated theme module
    // For now, let's keep the direct DOM manipulation here as a fallback if state doesn't do it.
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
}
export function getTheme() {
    return localAppServices.getCurrentThemeState ? localAppServices.getCurrentThemeState() : 
           (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}

export function closeAllTrackWindows(trackIdToExclude = null) {
    // ... (same as response #58, ensure localAppServices calls are valid) ...
    if (localAppServices.getOpenWindowsState) { /* ... */ }
}

export function updateTrackUI(trackId, reason, details = null) {
    // ... (same as response #58, ensure localAppServices calls are valid) ...
    // This function now primarily acts as a dispatcher, calling specific rendering
    // functions that are also exported by this module (which re-export from sub-modules)
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) return;
    switch (reason) {
        // Cases call functions like openTrackInspectorWindow, renderEffectsList, etc.
        // Make sure these functions (imported from submodules) are called directly.
    }
}

// Pass-through re-exports from submodules for appServices or other modules to use
export const drawWaveform = drawWaveformFromInspectorUI;
export const drawInstrumentWaveform = drawInstrumentWaveformFromInspectorUI;
export const renderSamplePads = renderSamplePadsFromInspectorUI;
export const updateSliceEditorUI = updateSliceEditorUIFromInspectorUI;
export const renderDrumSamplerPads = renderDrumSamplerPadsFromInspectorUI;
export const updateDrumPadControlsUI = updateDrumPadControlsUIFromInspectorUI;
export const renderEffectsList = renderEffectsListFromInspectorUI;
export const renderEffectControls = renderEffectControlsFromInspectorUI;
export const createKnob = createKnobFromInspectorUI;

export const updateSequencerCellUI = updateSequencerCellUIFromArrangement;
export const renderTimeline = renderTimelineFromArrangement;
export const updatePlayheadPosition = updatePlayheadPositionFromArrangement;
export const highlightPlayingStep = highlightPlayingStepFromArrangement;
