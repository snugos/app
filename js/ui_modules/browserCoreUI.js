// js/ui_modules/browserCoreUI.js (MODIFIED)
import { SnugWindow } from '../SnugWindow.js';
import {
    showNotification as utilShowNotification, // Renamed to avoid conflict if showNotification is defined locally
    createDropZoneHTML,
    setupGenericDropZoneListeners,
    showCustomModal,
    createContextMenu,
    showConfirmationDialog,
    // Ensure snapTimeToGrid is available if arrangementMixingUI or other sub-modules need it
    snapTimeToGrid
} from '../utils.js';
import * as Constants from '../constants.js';

// Import sub-modules that handle specific UI areas
import {
    initializeInspectorEffectsUI,
    openTrackInspectorWindow,
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    // UI update functions from inspectorEffectsUI
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
    openArrangementWindow, // Handles Timeline
    openSequencerWindow,
    openMixerWindow, // Assuming Mixer is now part of this or a new submodule
    updateMixerWindow, // Assuming Mixer is now part of this
    // UI update functions from arrangementMixingUI
    updateSequencerCellUI as updateSequencerCellUIFromArrangement,
    renderTimeline as renderTimelineFromArrangement,
    updatePlayheadPosition as updatePlayheadPositionFromArrangement,
    highlightPlayingStep as highlightPlayingStepFromArrangement
} from './arrangementMixingUI.js';

// Re-export functions from submodules to be used by main.js or other modules
export {
    openTrackInspectorWindow,
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    openArrangementWindow,
    openSequencerWindow,
    openMixerWindow, // Ensure this is correctly implemented/exported
    updateMixerWindow // Ensure this is correctly implemented/exported
};

let localAppServices = {};
let selectedSoundForPreviewData = null; // Keep local state for sound preview if not managed globally

// --- Central UI Initialization ---
export function initializeUIModule(appServicesFromMain) {
    localAppServices = { ...localAppServices, ...appServicesFromMain };

    // Initialize sub-UI modules
    initializeInspectorEffectsUI(localAppServices);
    initializeArrangementMixingUI(localAppServices);

    // Wire up local sound preview if not fully managed by appServices
    if (!localAppServices.getSelectedSoundForPreview) {
        localAppServices.getSelectedSoundForPreview = () => selectedSoundForPreviewData;
    }
    if (!localAppServices.setSelectedSoundForPreview) {
        localAppServices.setSelectedSoundForPreview = (data) => { selectedSoundForPreviewData = data; };
    }

    // Ensure effects registry is available, fallback if necessary
    if (!localAppServices.effectsRegistryAccess) {
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
    console.log("[BrowserCoreUI] UI Module Initialized with submodules.");
}

// --- Sound Browser Window ---
export function openSoundBrowserWindow(onFileSelectedCallback, savedState = null) {
    const windowId = 'soundBrowser';
    if (localAppServices.getWindowByIdState && localAppServices.getWindowByIdState(windowId)?.element) {
        localAppServices.getWindowByIdState(windowId).focus();
        return localAppServices.getWindowByIdState(windowId);
    }

    const contentHTML = `
        <div class="p-1 bg-slate-700 text-sm flex items-center sticky top-0 z-10">
            <label for="soundLibrarySelect" class="mr-2">Library:</label>
            <select id="soundLibrarySelect" class="flex-grow bg-slate-800 p-1 rounded-sm text-xs mr-2"></select>
            <button id="soundBrowserUpBtn" class="px-2 py-0.5 bg-slate-600 hover:bg-slate-500 rounded-sm mr-1" title="Up a level"><i class="fas fa-arrow-up"></i></button>
        </div>
        <div id="soundBrowserPathDisplay" class="p-1 text-xs bg-slate-750 text-slate-400 truncate">/</div>
        <div id="soundBrowserList" class="p-1 space-y-0.5 overflow-y-auto h-full">
            </div>
        <div class="p-1 border-t border-slate-600 text-xs">
            <button id="soundBrowserPreviewBtn" class="w-full p-1 bg-blue-600 hover:bg-blue-500 rounded-sm disabled:opacity-50" disabled>Preview</button>
        </div>
    `;
    const options = { width: 300, height: 400, minWidth:250, minHeight:200, initialContentKey: windowId };
     if (savedState) Object.assign(options, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

    const browserWindow = localAppServices.createWindow(windowId, 'Sound Browser', contentHTML, options);

    if (browserWindow?.element) {
        const librarySelect = browserWindow.element.querySelector('#soundLibrarySelect');
        const upButton = browserWindow.element.querySelector('#soundBrowserUpBtn');
        const previewButton = browserWindow.element.querySelector('#soundBrowserPreviewBtn');

        // Populate library select
        Object.keys(Constants.soundLibraries).forEach(libName => {
            const option = document.createElement('option');
            option.value = libName;
            option.textContent = libName;
            librarySelect.appendChild(option);
        });
        if (localAppServices.getCurrentLibraryNameState && localAppServices.getCurrentLibraryNameState()) {
            librarySelect.value = localAppServices.getCurrentLibraryNameState();
        }

        librarySelect.addEventListener('change', (e) => {
            localAppServices.setCurrentLibraryNameState(e.target.value);
            updateSoundBrowserDisplayForLibrary();
        });

        upButton.addEventListener('click', () => {
            localAppServices.popFromSoundBrowserPath();
            updateSoundBrowserDisplayForLibrary();
        });

        previewButton.addEventListener('click', () => {
            const selectedSound = localAppServices.getSelectedSoundForPreview ? localAppServices.getSelectedSoundForPreview() : null;
            if (selectedSound && localAppServices.loadAndPreviewSample) {
                localAppServices.loadAndPreviewSample(selectedSound.fullPath, selectedSound.libraryName, selectedSound.fileName);
            }
        });
        updateSoundBrowserDisplayForLibrary(); // Initial population
    }
    return browserWindow;
}

export function updateSoundBrowserDisplayForLibrary(libraryNameOverride = null, isLoading = false, hasError = false) {
    const browserWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState('soundBrowser') : null;
    if (!browserWindow || !browserWindow.element) return;

    const listDiv = browserWindow.element.querySelector('#soundBrowserList');
    const pathDisplay = browserWindow.element.querySelector('#soundBrowserPathDisplay');
    const librarySelect = browserWindow.element.querySelector('#soundLibrarySelect');
    const previewButton = browserWindow.element.querySelector('#soundBrowserPreviewBtn');
    listDiv.innerHTML = ''; // Clear previous items

    const currentLibraryName = libraryNameOverride || (localAppServices.getCurrentLibraryNameState ? localAppServices.getCurrentLibraryNameState() : null) || librarySelect.value;
    if (librarySelect.value !== currentLibraryName) librarySelect.value = currentLibraryName;

    const currentPathArray = localAppServices.getCurrentSoundBrowserPathState ? localAppServices.getCurrentSoundBrowserPathState() : [];
    pathDisplay.textContent = `/${currentPathArray.join('/')}`;

    const fileTrees = localAppServices.getSoundLibraryFileTreesState ? localAppServices.getSoundLibraryFileTreesState() : {};
    let currentLevel = fileTrees[currentLibraryName];

    if (isLoading) {
        listDiv.innerHTML = `<div class="p-2 text-slate-400 text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Loading ${currentLibraryName}...</div>`;
        return;
    }
    if (hasError) {
         listDiv.innerHTML = `<div class="p-2 text-red-400 text-center">Error loading ${currentLibraryName}.</div>`;
        return;
    }
    if (!currentLevel && currentLibraryName && localAppServices.fetchSoundLibrary) {
        listDiv.innerHTML = `<div class="p-2 text-slate-400 text-center">Library ${currentLibraryName} not loaded. <button id="loadLibBtn-${currentLibraryName.replace(/\s/g,'')}" class="text-blue-400 hover:underline">Load now?</button></div>`;
        const loadBtn = listDiv.querySelector(`#loadLibBtn-${currentLibraryName.replace(/\s/g,'')}`);
        if(loadBtn) {
            loadBtn.addEventListener('click', () => {
                localAppServices.fetchSoundLibrary(currentLibraryName, Constants.soundLibraries[currentLibraryName]);
                updateSoundBrowserDisplayForLibrary(currentLibraryName, true, false); // Show loading
            });
        }
        return;
    }
    if (!currentLevel) {
        listDiv.innerHTML = `<div class="p-2 text-slate-400 text-center">Select a library.</div>`;
        return;
    }


    currentPathArray.forEach(folderName => {
        if (currentLevel && currentLevel[folderName] && currentLevel[folderName].type === 'folder') {
            currentLevel = currentLevel[folderName].children;
        } else {
            currentLevel = null; return; // Path is invalid or leads to a file
        }
    });

    if (!currentLevel) {
        listDiv.innerHTML = '<div class="p-2 text-slate-400">Error: Path not found in library.</div>';
        return;
    }

    // Add folders first
    Object.entries(currentLevel).sort((a,b) => a[0].localeCompare(b[0])).forEach(([name, item]) => {
        if (item.type === 'folder') {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'p-1.5 bg-slate-600 hover:bg-slate-500 rounded-sm cursor-pointer text-xs flex items-center';
            itemDiv.innerHTML = `<i class="fas fa-folder mr-2 text-yellow-400"></i> ${name}`;
            itemDiv.addEventListener('click', () => {
                localAppServices.pushToSoundBrowserPath(name);
                updateSoundBrowserDisplayForLibrary();
            });
            listDiv.appendChild(itemDiv);
        }
    });

    // Add files
    Object.entries(currentLevel).sort((a,b) => a[0].localeCompare(b[0])).forEach(([name, item]) => {
        if (item.type === 'file') {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'p-1.5 bg-slate-600 hover:bg-slate-500 rounded-sm cursor-pointer text-xs flex items-center';
            itemDiv.innerHTML = `<i class="fas fa-file-audio mr-2 text-blue-300"></i> ${name}`;
            itemDiv.dataset.filePath = item.fullPath; // Store full path for loading
            itemDiv.dataset.fileName = name;
            itemDiv.dataset.libraryName = currentLibraryName;

            itemDiv.addEventListener('click', () => {
                if (localAppServices.setSelectedSoundForPreview) {
                    localAppServices.setSelectedSoundForPreview({
                        fullPath: item.fullPath,
                        fileName: name,
                        libraryName: currentLibraryName
                    });
                }
                if (previewButton) previewButton.disabled = false;
                // Highlight selected item
                listDiv.querySelectorAll('.bg-blue-500').forEach(el => el.classList.replace('bg-blue-500','bg-slate-600'));
                itemDiv.classList.replace('bg-slate-600', 'bg-blue-500');
            });
            // Drag and drop for sound browser items
            itemDiv.draggable = true;
            itemDiv.addEventListener('dragstart', (event) => {
                const dragData = {
                    type: 'sound-browser-item',
                    fullPath: item.fullPath,
                    fileName: name,
                    libraryName: currentLibraryName
                };
                event.dataTransfer.setData('application/json', JSON.stringify(dragData));
                event.dataTransfer.effectAllowed = 'copy';
            });
            listDiv.appendChild(itemDiv);
        }
    });
     if (previewButton) previewButton.disabled = true; // Disable preview until a file is clicked
}


// --- Add Track Modal ---
export function showAddTrackModal() {
    const content = `
        <p class="text-sm text-slate-300 mb-3">Choose the type of track to add:</p>
        <div class="grid grid-cols-1 gap-2">
            <button data-track-type="Synth" class="p-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white">Synth (MonoSynth)</button>
            <button data-track-type="Sampler" class="p-2 bg-green-600 hover:bg-green-500 rounded-md text-white">Sampler (Slicer)</button>
            <button data-track-type="DrumSampler" class="p-2 bg-yellow-600 hover:bg-yellow-500 rounded-md text-white">Sampler (Pads)</button>
            <button data-track-type="InstrumentSampler" class="p-2 bg-purple-600 hover:bg-purple-500 rounded-md text-white">Sampler (Instrument)</button>
            <button data-track-type="Audio" class="p-2 bg-red-600 hover:bg-red-500 rounded-md text-white">Audio Track</button>
        </div>
    `;
    const modal = showCustomModal('Add New Track', content);

    if (modal && modal.contentDiv) {
        modal.contentDiv.querySelectorAll('button[data-track-type]').forEach(button => {
            button.addEventListener('click', () => {
                const trackType = button.dataset.trackType;
                if (localAppServices.addTrack) {
                    localAppServices.addTrack(trackType);
                }
                if (modal.overlay && typeof modal.overlay.remove === 'function') modal.overlay.remove();
            });
        });
    }
}

// --- Add Effect Modal ---
export function showAddEffectModal(owner, ownerType = 'track') { // ownerType can be 'track' or 'master'
    const effectsRegistry = localAppServices.effectsRegistryAccess;
    if (!effectsRegistry) {
        utilShowNotification("Error: Effects system not available.", 3000);
        return;
    }

    let effectOptionsHTML = '';
    Object.entries(effectsRegistry.AVAILABLE_EFFECTS).forEach(([key, effectDef]) => {
        effectOptionsHTML += `<button data-effect-type="${key}" class="block w-full text-left p-2 hover:bg-blue-500 rounded-md text-sm">${effectDef.displayName || key}</button>`;
    });

    if (!effectOptionsHTML) effectOptionsHTML = '<p class="text-slate-400 text-sm">No effects available.</p>';

    const content = `
        <p class="text-sm text-slate-300 mb-3">Select an effect to add:</p>
        <div class="max-h-60 overflow-y-auto space-y-1 pr-1">
            ${effectOptionsHTML}
        </div>
    `;
    const ownerName = ownerType === 'track' ? owner.name : 'Master';
    const modal = showCustomModal(`Add Effect to ${ownerName}`, content);

    if (modal && modal.contentDiv) {
        modal.contentDiv.querySelectorAll('button[data-effect-type]').forEach(button => {
            button.addEventListener('click', () => {
                const effectType = button.dataset.effectType;
                if (ownerType === 'track' && owner && typeof owner.addEffect === 'function') {
                    owner.addEffect(effectType);
                } else if (ownerType === 'master' && localAppServices.addMasterEffect) {
                    localAppServices.addMasterEffect(effectType);
                } else {
                    console.warn("[BrowserCoreUI] Could not add effect. Owner/method missing.");
                    utilShowNotification("Error: Could not add effect (internal).", 3000);
                }
                if (modal.overlay && typeof modal.overlay.remove === 'function') modal.overlay.remove();
            });
        });
    }
}


// --- Theme Management (Example) ---
export function updateTheme(theme) { // theme is 'light' or 'dark'
    if (localAppServices.setCurrentThemeState) localAppServices.setCurrentThemeState(theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // Any other theme update logic
}
export function getTheme() {
    return localAppServices.getCurrentThemeState ? localAppServices.getCurrentThemeState() : 'dark';
}

// --- Close All Track Windows ---
export function closeAllTrackWindows(trackIdToExclude = null) {
    if (localAppServices.getOpenWindowsState) {
        localAppServices.getOpenWindowsState().forEach(win => {
            if (win.id.startsWith(`trackInspector-${trackIdToExclude}`) ||
                win.id.startsWith(`effectsRack-${trackIdToExclude}`) ||
                win.id.startsWith(`sequencer-${trackIdToExclude}`)) {
                // Potentially keep these open or implement more granular logic
            } else if (win.id.startsWith('trackInspector-') || win.id.startsWith('effectsRack-') || win.id.startsWith('sequencer-')) {
                if(win.id.split('-')[1] !== trackIdToExclude?.toString()) { // Ensure correct exclusion
                     win.close(true); // Close silently
                }
            }
        });
    }
}

// --- Generic UI Update Dispatcher (called by state changes) ---
// This function will call more specific UI update functions based on the reason.
export function updateTrackUI(trackId, reason, details = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) return;

    // Call specific UI update functions based on the reason
    // These specific functions are now imported from their respective sub-modules
    switch (reason) {
        case 'nameChange':
        case 'volumeChange':
        case 'panChange':
        case 'muteSoloChange':
            if (localAppServices.updateMixerWindow) localAppServices.updateMixerWindow();
            if (localAppServices.renderTimeline) localAppServices.renderTimeline(); // For track name on timeline
            // Update track inspector if open
            const inspectorWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState(`trackInspector-${trackId}`) : null;
            if (inspectorWindow && inspectorWindow.element) {
                // Re-render or selectively update inspector content
                openTrackInspectorWindow(trackId); // Re-opens/refreshes
            }
            break;
        case 'effectAdded':
        case 'effectRemoved':
        case 'effectParamChanged':
        case 'effectOrderChanged':
            if (renderEffectsListFromInspectorUI) renderEffectsListFromInspectorUI(track, 'track');
             if (localAppServices.updateMixerWindow) localAppServices.updateMixerWindow(); // Effects list in mixer might need update
            break;
        case 'samplerLoaded': // Sampler (Slicer) sample loaded
            if (renderSamplePadsFromInspectorUI) renderSamplePadsFromInspectorUI(track);
            if (updateSliceEditorUIFromInspectorUI) updateSliceEditorUIFromInspectorUI(track);
            if (drawWaveformFromInspectorUI) drawWaveformFromInspectorUI(track);
            break;
        case 'sampleSliced': // Sampler (Slicer) sample sliced
            if (renderSamplePadsFromInspectorUI) renderSamplePadsFromInspectorUI(track);
            if (updateSliceEditorUIFromInspectorUI) updateSliceEditorUIFromInspectorUI(track);
            break;
        case 'sliceSelected': // Sampler (Slicer) slice selected for edit
             if (updateSliceEditorUIFromInspectorUI) updateSliceEditorUIFromInspectorUI(track);
            break;
        case 'drumPadLoaded': // Drum Sampler pad loaded
            if (renderDrumSamplerPadsFromInspectorUI) renderDrumSamplerPadsFromInspectorUI(track, details /* padIndex */);
            break;
        case 'drumPadSelected': // Drum Sampler pad selected for edit
            if (updateDrumPadControlsUIFromInspectorUI) updateDrumPadControlsUIFromInspectorUI(track, details /* padIndex */);
            break;
        case 'instrumentSamplerLoaded': // Instrument Sampler sample loaded
            if (drawInstrumentWaveformFromInspectorUI) drawInstrumentWaveformFromInspectorUI(track);
            break;
        case 'sequenceChanged':
        case 'sequenceAdded':
        case 'sequenceRemoved':
        case 'activeSequenceChanged':
            // Update sequencer window if open for this track
            const seqWin = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState(`sequencer-${trackId}`) : null;
            if (seqWin && seqWin.element) {
                openSequencerWindow(trackId); // Re-opens/refreshes
            }
            if (localAppServices.renderTimeline) localAppServices.renderTimeline(); // Update timeline clips derived from sequences
            break;
        case 'clipAdded':
        case 'clipRemoved':
        case 'clipChanged':
            if (localAppServices.renderTimeline) localAppServices.renderTimeline();
            break;
        case 'synthParamChanged':
             const synthInspectorWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState(`trackInspector-${trackId}`) : null;
            if (synthInspectorWindow && synthInspectorWindow.element) {
                openTrackInspectorWindow(trackId); // Re-opens/refreshes
            }
            break;
        // Add more cases as needed
        default:
            console.warn(`[BrowserCoreUI updateTrackUI] Unknown reason: ${reason} for track ${trackId}`);
    }
     // General updates that might be needed for many changes
    if (localAppServices.updateArrangementView) localAppServices.updateArrangementView();
}

// --- Pass-through to submodule functions if they are not directly exported ---
// (Or ensure submodules export them and they are re-exported at the top of this file)

// From inspectorEffectsUI.js
export const drawWaveform = drawWaveformFromInspectorUI;
export const drawInstrumentWaveform = drawInstrumentWaveformFromInspectorUI;
export const renderSamplePads = renderSamplePadsFromInspectorUI;
export const updateSliceEditorUI = updateSliceEditorUIFromInspectorUI;
export const renderDrumSamplerPads = renderDrumSamplerPadsFromInspectorUI;
export const updateDrumPadControlsUI = updateDrumPadControlsUIFromInspectorUI;
export const renderEffectsList = renderEffectsListFromInspectorUI;
export const renderEffectControls = renderEffectControlsFromInspectorUI;
export const createKnob = createKnobFromInspectorUI;

// From arrangementMixingUI.js
export const updateSequencerCellUI = updateSequencerCellUIFromArrangement;
export const renderTimeline = renderTimelineFromArrangement;
export const updatePlayheadPosition = updatePlayheadPositionFromArrangement;
export const highlightPlayingStep = highlightPlayingStepFromArrangement;
