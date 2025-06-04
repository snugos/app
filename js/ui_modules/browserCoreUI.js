// js/ui_modules/browserCoreUI.js (MODIFIED - Ensured direct appServices reference passing)
import { SnugWindow } from '../SnugWindow.js';
import {
    showNotification as utilShowNotification, // Renamed to avoid conflict if localAppServices.showNotification is different
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
    updateSequencerCellUI as updateSequencerCellUIFromArrangement,
    renderTimeline as renderTimelineFromArrangement,
    updatePlayheadPosition as updatePlayheadPositionFromArrangement,
    highlightPlayingStep as highlightPlayingStepFromArrangement
} from './arrangementMixingUI.js';

export {
    // Re-export functions that main.js (via appServices) will call
    openTrackInspectorWindow,
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    openArrangementWindow,
    openSequencerWindow,
    openMixerWindow,
    updateMixerWindow,
    // Also re-export UI update functions that might be called from state mutations or other services
    drawWaveformFromInspectorUI as drawWaveform,
    drawInstrumentWaveformFromInspectorUI as drawInstrumentWaveform,
    renderSamplePadsFromInspectorUI as renderSamplePads,
    updateSliceEditorUIFromInspectorUI as updateSliceEditorUI,
    renderDrumSamplerPadsFromInspectorUI as renderDrumSamplerPads,
    updateDrumPadControlsUIFromInspectorUI as updateDrumPadControlsUI,
    renderEffectsListFromInspectorUI as renderEffectsList,
    renderEffectControlsFromInspectorUI as renderEffectControls,
    createKnobFromInspectorUI as createKnob,
    updateSequencerCellUIFromArrangement as updateSequencerCellUI,
    renderTimelineFromArrangement as renderTimeline,
    updatePlayheadPositionFromArrangement as updatePlayheadPosition,
    highlightPlayingStepFromArrangement as highlightPlayingStep
};

// This will be the single appServices instance from main.js
let localAppServices = {};
// selectedSoundForPreviewData was moved to state.js and accessed via appServices.getSelectedSoundForPreview / setSelectedSoundForPreview

export function initializeUIModule(appServicesFromMain) {
    localAppServices = appServicesFromMain; // Use the direct reference from main.js

    // Pass the same, original appServicesFromMain to sub-modules
    initializeInspectorEffectsUI(appServicesFromMain);
    initializeArrangementMixingUI(appServicesFromMain);

    // Ensure selectedSoundForPreview services exist on appServices (provided by main.js from state.js)
    if (!localAppServices.getSelectedSoundForPreview || !localAppServices.setSelectedSoundForPreview) {
        console.warn("[BrowserCoreUI] getSelectedSoundForPreview or setSelectedSoundForPreview services are missing from appServices. Preview functionality might be affected.");
        // Provide no-op fallbacks if absolutely necessary, though main.js should guarantee these from state.js
        if (!localAppServices.getSelectedSoundForPreview) localAppServices.getSelectedSoundForPreview = () => null;
        if (!localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview = () => {};
    }


    if (!localAppServices.effectsRegistryAccess) {
        console.warn("[BrowserCoreUI] effectsRegistryAccess not found in appServices. UI relying on it may fail.");
        // Fallback to prevent immediate crashes but functionality will be impaired.
        localAppServices.effectsRegistryAccess = {
            AVAILABLE_EFFECTS: {},
            getEffectParamDefinitions: () => [],
            getEffectDefaultParams: () => ({}),
            synthEngineControlDefinitions: {}
        };
    }
    if (!localAppServices.effectsRegistryAccess.synthEngineControlDefinitions) {
        // Ensure this nested property also exists if effectsRegistryAccess was a fallback.
        localAppServices.effectsRegistryAccess.synthEngineControlDefinitions = {};
    }
    // console.log("[BrowserCoreUI] UI Module Initialized with submodules.");
}

export function openSoundBrowserWindow(onFileSelectedCallback, savedState = null) {
    // Ensure localAppServices are available (this was the source of a critical error)
    if (!localAppServices || !localAppServices.getWindowByIdState || !localAppServices.createWindow) {
        console.error("[BrowserCoreUI openSoundBrowserWindow] CRITICAL: Core appServices (getWindowByIdState, createWindow) not available!", localAppServices);
        const errNotification = localAppServices.showNotification || utilShowNotification; // Use utilShowNotification as fallback
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
        <div id="soundBrowserList" class="p-1 space-y-0.5 overflow-y-auto h-full text-xs" style="max-height: calc(100% - 90px);"> </div>
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
        const listDiv = browserWindow.element.querySelector('#soundBrowserList');


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

        if (localAppServices.getCurrentLibraryNameState && localAppServices.getCurrentLibraryNameState()) {
            librarySelect.value = localAppServices.getCurrentLibraryNameState();
        } else if (librarySelect.options.length > 0 && librarySelect.options[0].value) {
            librarySelect.value = librarySelect.options[0].value;
             if(localAppServices.setCurrentLibraryName) localAppServices.setCurrentLibraryName(librarySelect.value); // This should trigger update via state
        }


        librarySelect.addEventListener('change', (e) => {
            // This will trigger updateSoundBrowserDisplayForLibrary via the state setter's side effect
            if(localAppServices.setCurrentLibraryName) localAppServices.setCurrentLibraryName(e.target.value);
        });

        upButton.addEventListener('click', () => {
            // This will trigger updateSoundBrowserDisplayForLibrary via the state setter's side effect
            if(localAppServices.popFromSoundBrowserPath) localAppServices.popFromSoundBrowserPath();
        });

        previewButton.addEventListener('click', () => {
            const selectedSound = localAppServices.getSelectedSoundForPreview ? localAppServices.getSelectedSoundForPreview() : null;
            if (selectedSound && localAppServices.loadAndPreviewSample) {
                localAppServices.loadAndPreviewSample(selectedSound.fullPath, selectedSound.libraryName, selectedSound.fileName);
            }
        });
        // Initial population of the browser list
        updateSoundBrowserDisplayForLibrary();
    }
    return browserWindow;
}

export function updateSoundBrowserDisplayForLibrary(libraryNameOverride = null, isLoading = false, hasError = false) {
    if (!localAppServices.getWindowByIdState || !localAppServices.getCurrentLibraryNameState ||
        !localAppServices.getCurrentSoundBrowserPathState || !localAppServices.getSoundLibraryFileTreesState ||
        !localAppServices.getCurrentSoundFileTreeState) { // Added check for getCurrentSoundFileTreeState
        console.warn("[BrowserCoreUI updateSoundBrowserDisplayForLibrary] Required appServices for state access are missing.");
        return;
    }

    const browserWindow = localAppServices.getWindowByIdState('soundBrowser');
    if (!browserWindow || !browserWindow.element) return;

    const listDiv = browserWindow.element.querySelector('#soundBrowserList');
    const pathDisplay = browserWindow.element.querySelector('#soundBrowserPathDisplay');
    const librarySelect = browserWindow.element.querySelector('#soundLibrarySelect');
    const previewButton = browserWindow.element.querySelector('#soundBrowserPreviewBtn');

    if(!listDiv || !pathDisplay || !librarySelect || !previewButton) {
        console.warn("[BrowserCoreUI updateSoundBrowserDisplayForLibrary] UI elements within sound browser not found.");
        return;
    }
    listDiv.innerHTML = ''; // Clear previous list

    const currentLibraryName = libraryNameOverride || localAppServices.getCurrentLibraryNameState() || librarySelect.value;
    if (librarySelect.value !== currentLibraryName && currentLibraryName) { // Ensure select reflects current library
        librarySelect.value = currentLibraryName;
    }

    const currentPathArray = localAppServices.getCurrentSoundBrowserPathState();
    pathDisplay.textContent = `/${currentPathArray.join('/')}`;

    // Get the specific file tree for the current library and path
    let displayItems = localAppServices.getCurrentSoundFileTreeState(); // This getter from state.js should handle path logic

    if (isLoading) {
        listDiv.innerHTML = '<div class="p-2 text-slate-400">Loading library...</div>';
        if (previewButton) previewButton.disabled = true;
        if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(null);
        return;
    }
    if (hasError) {
        listDiv.innerHTML = `<div class="p-2 text-red-400">Error loading library: ${currentLibraryName}.</div>`;
        if (previewButton) previewButton.disabled = true;
        if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(null);
        return;
    }

    const loadedZips = localAppServices.getLoadedZipFilesState ? localAppServices.getLoadedZipFilesState() : {};
    const currentZipStatus = loadedZips[currentLibraryName];

    if (!currentZipStatus && currentLibraryName && Constants.soundLibraries[currentLibraryName] && localAppServices.fetchSoundLibrary) {
        // Library exists in constants but not loaded yet, initiate fetch
        listDiv.innerHTML = `<div class="p-2 text-slate-400">Fetching library: ${currentLibraryName}...</div>`;
        localAppServices.fetchSoundLibrary(currentLibraryName, Constants.soundLibraries[currentLibraryName]);
        if (previewButton) previewButton.disabled = true;
        if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(null);
        return; // fetchSoundLibrary will trigger another update once done/failed
    }

    if (!displayItems && currentZipStatus === "loading") {
         listDiv.innerHTML = '<div class="p-2 text-slate-400">Loading library content...</div>';
         if (previewButton) previewButton.disabled = true;
         if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(null);
         return;
    }
    if (!displayItems) {
        listDiv.innerHTML = `<div class="p-2 text-slate-400">No items found or library '${currentLibraryName}' not fully loaded.</div>`;
        if (previewButton) previewButton.disabled = true;
        if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(null);
        return;
    }


    // Render folders first, then files, sorted alphabetically
    Object.entries(displayItems).sort((a,b) => a[0].localeCompare(b[0])).forEach(([name, item]) => {
        if (item.type === 'folder') {
            const folderEl = document.createElement('div');
            folderEl.className = 'p-1.5 hover:bg-slate-700 rounded-sm cursor-pointer flex items-center';
            folderEl.innerHTML = `<i class="fas fa-folder mr-2 text-yellow-400"></i> ${name}`;
            folderEl.addEventListener('click', () => {
                if (localAppServices.pushToSoundBrowserPath) localAppServices.pushToSoundBrowserPath(name);
                // update is triggered by state change
            });
            listDiv.appendChild(folderEl);
        }
    });
    Object.entries(displayItems).sort((a,b) => a[0].localeCompare(b[0])).forEach(([name, item]) => {
        if (item.type === 'file') {
            const fileEl = document.createElement('div');
            fileEl.className = 'p-1.5 hover:bg-slate-700 rounded-sm cursor-pointer flex items-center sound-browser-item';
            fileEl.innerHTML = `<i class="fas fa-file-audio mr-2 text-blue-400"></i> ${name}`;
            fileEl.dataset.fileName = name;
            fileEl.dataset.fullPath = item.fullPath;
            fileEl.dataset.libraryName = currentLibraryName;
            fileEl.draggable = true;

            fileEl.addEventListener('click', () => {
                listDiv.querySelectorAll('.sound-browser-item.bg-blue-600').forEach(el => el.classList.remove('bg-blue-600'));
                fileEl.classList.add('bg-blue-600');
                if (localAppServices.setSelectedSoundForPreview) {
                    localAppServices.setSelectedSoundForPreview({ fileName: name, fullPath: item.fullPath, libraryName: currentLibraryName });
                }
                if (previewButton) previewButton.disabled = false;
            });

            fileEl.addEventListener('dblclick', () => {
                 if (localAppServices.setSelectedSoundForPreview) {
                    localAppServices.setSelectedSoundForPreview({ fileName: name, fullPath: item.fullPath, libraryName: currentLibraryName });
                }
                if (previewButton && localAppServices.loadAndPreviewSample) {
                     previewButton.click(); // Simulate click on preview button
                }
            });
            fileEl.addEventListener('dragstart', (ev) => {
                const dragData = {
                    type: 'sound-browser-item',
                    fileName: name,
                    fullPath: item.fullPath,
                    libraryName: currentLibraryName
                };
                ev.dataTransfer.setData('application/json', JSON.stringify(dragData));
                ev.dataTransfer.effectAllowed = 'copy';
            });
            listDiv.appendChild(fileEl);
        }
    });
     if (previewButton) previewButton.disabled = true; // Disable by default, enable on selection
     if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(null); // Clear selection
}

export function showAddTrackModal() {
    if (!localAppServices.showCustomModal || !localAppServices.addTrack) {
        console.error("[BrowserCoreUI showAddTrackModal] Missing required appServices: showCustomModal or addTrack");
        return;
    }
    const trackTypes = ['Synth', 'Sampler', 'DrumSampler', 'InstrumentSampler', 'Audio'];
    let optionsHTML = trackTypes.map(type => `<option value="${type}">${type}</option>`).join('');

    const content = `
        <div class="space-y-3">
            <div>
                <label for="newTrackType" class="block text-sm font-medium text-slate-300">Track Type:</label>
                <select id="newTrackType" class="mt-1 block w-full p-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white">
                    ${optionsHTML}
                </select>
            </div>
            <div>
                <label for="newTrackName" class="block text-sm font-medium text-slate-300">Track Name (Optional):</label>
                <input type="text" id="newTrackName" placeholder="e.g., Lead Synth" class="mt-1 block w-full p-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white">
            </div>
        </div>`;

    const buttons = [
        { text: 'Cancel', action: (e, modal) => modal.overlay.remove(), classes: 'bg-slate-600 hover:bg-slate-500 text-white' },
        {
            text: 'Add Track',
            action: (e, modal) => {
                const type = modal.contentDiv.querySelector('#newTrackType').value;
                const nameInput = modal.contentDiv.querySelector('#newTrackName');
                const name = nameInput.value.trim() || ''; // Use empty string if no name
                localAppServices.addTrack(type, { name: name }); // Pass name in initialData
                modal.overlay.remove();
            },
            classes: 'bg-blue-600 hover:bg-blue-500 text-white'
        }
    ];
    localAppServices.showCustomModal('Add New Track', content, buttons);
}


export function showAddEffectModal(owner, ownerType = 'track') { // owner is track object or null for master
    if (!localAppServices.effectsRegistryAccess || !localAppServices.showCustomModal ||
        (ownerType === 'track' && (!owner || !owner.addEffect)) ||
        (ownerType === 'master' && !localAppServices.addMasterEffect)) {
        console.error("[BrowserCoreUI showAddEffectModal] Missing required services or owner methods.");
        const notify = localAppServices.showNotification || utilShowNotification;
        notify("Cannot add effect: internal error.", "error");
        return;
    }

    const effectsRegistry = localAppServices.effectsRegistryAccess;
    let optionsHTML = Object.entries(effectsRegistry.AVAILABLE_EFFECTS)
        .map(([key, def]) => `<option value="${key}">${def.displayName || key}</option>`)
        .join('');

    const content = `
        <div>
            <label for="newEffectType" class="block text-sm font-medium text-slate-300">Effect Type:</label>
            <select id="newEffectType" class="mt-1 block w-full p-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white">
                ${optionsHTML}
            </select>
        </div>`;

    const buttons = [
        { text: 'Cancel', action: (e, modal) => modal.overlay.remove(), classes: 'bg-slate-600 hover:bg-slate-500 text-white' },
        {
            text: 'Add Effect',
            action: (e, modal) => {
                const type = modal.contentDiv.querySelector('#newEffectType').value;
                if (ownerType === 'track' && owner && owner.addEffect) {
                    owner.addEffect(type); // Track method handles undo and UI update
                } else if (ownerType === 'master' && localAppServices.addMasterEffect) {
                    localAppServices.addMasterEffect(type); // App service handles undo and UI update for master
                }
                modal.overlay.remove();
            },
            classes: 'bg-blue-600 hover:bg-blue-500 text-white'
        }
    ];
    const title = ownerType === 'track' && owner ? `Add Effect to: ${owner.name}` : 'Add Master Effect';
    localAppServices.showCustomModal(title, content, buttons);
}

export function updateTheme(theme) {
    if (localAppServices.setCurrentThemeState) {
        localAppServices.setCurrentThemeState(theme); // State module handles localStorage
    } else {
        console.warn("[BrowserCoreUI updateTheme] setCurrentThemeState service not available.");
    }
    // Actual DOM manipulation (adding/removing 'dark' class) should be triggered by the state change,
    // or done directly in main.js as a subscriber to theme changes.
    // For safety, we can leave the direct manipulation here as a fallback.
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    // console.log(`[BrowserCoreUI updateTheme] Theme set to ${theme}`);
}
export function getTheme() {
    return localAppServices.getCurrentThemeState ? localAppServices.getCurrentThemeState() :
           (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}

export function closeAllTrackWindows(trackIdToExcludeOrObject = null) {
    if (!localAppServices.getOpenWindowsState || !localAppServices.removeWindowFromStoreState) {
        console.warn("[BrowserCoreUI closeAllTrackWindows] Window state services missing.");
        return;
    }
    let trackIdStr = null;
    if (trackIdToExcludeOrObject && typeof trackIdToExcludeOrObject === 'object' && trackIdToExcludeOrObject.id) {
        trackIdStr = trackIdToExcludeOrObject.id.toString();
    } else if (trackIdToExcludeOrObject) {
        trackIdStr = trackIdToExcludeOrObject.toString();
    }

    localAppServices.getOpenWindowsState().forEach(win => {
        if (win.id.startsWith('trackInspector-') || win.id.startsWith('effectsRack-') || win.id.startsWith('sequencer-')) {
            if (trackIdStr && win.id.includes(trackIdStr)) {
                // Don't close if it's for the track being excluded (e.g. if a track is removed, its windows should close)
                // This logic might need refinement: if a track is *not* excluded, its windows *should* close.
                // If trackIdToExcludeOrObject is the ID of a track being deleted, its windows SHOULD be closed.
                // The current interpretation is: close all track-specific windows *unless* it's for the track ID specified to be kept open.
                // This seems backward if trackIdToExclude is for a deleted track.
                // Assuming `trackIdToExcludeOrObject` means "close all windows RELATED to this trackId"
                if (win.id.includes(trackIdStr)) {
                     win.close(true); // Close without undo, as it's part of a larger operation
                }
            } else if (!trackIdStr) { // If no trackId is specified to exclude, close all track windows
                 win.close(true);
            }
        }
    });
}

export function updateTrackUI(trackId, reason, details = null) {
    // This function acts as a central dispatcher for UI updates related to a specific track.
    // It would typically call more specific rendering functions based on the 'reason'.
    // For instance, if a track's name changes, it might update the mixer strip, timeline lane, etc.
    // The actual rendering functions are now imported from submodules and re-exported.
    // State changes should trigger calls to these specific rendering functions directly or via appServices.

    // Example of how it might have been used (now specific functions are called directly):
    // const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    // if (!track) return;

    // switch (reason) {
    //     case 'nameChange':
    //         if (localAppServices.updateMixerWindow) localAppServices.updateMixerWindow();
    //         if (localAppServices.renderTimeline) localAppServices.renderTimeline();
    //         // Update inspector window title if open
    //         const inspectorWindow = localAppServices.getWindowByIdState(`trackInspector-${trackId}`);
    //         if (inspectorWindow && inspectorWindow.titleBar) {
    //             const titleSpan = inspectorWindow.titleBar.querySelector('span');
    //             if (titleSpan) titleSpan.textContent = `Inspector: ${track.name}`;
    //         }
    //         break;
    //     case 'effectAdded':
    //     case 'effectRemoved':
    //         // Call renderEffectsList for the specific track's effects rack if open
    //         const effectsRackWindow = localAppServices.getWindowByIdState(`effectsRack-${trackId}`);
    //         if (effectsRackWindow && effectsRackWindow.element) {
    //             const listDiv = effectsRackWindow.element.querySelector(`#effectsList-${trackId}`);
    //             const controlsContainer = effectsRackWindow.element.querySelector(`#effectControlsContainer-${trackId}`);
    //             if (renderEffectsList && listDiv && controlsContainer) renderEffectsList(track, 'track', listDiv, controlsContainer);
    //         }
    //         break;
    //     // Add more cases as needed
    // }
    // console.log(`[BrowserCoreUI updateTrackUI] Called for track ${trackId}, reason: ${reason}`, details);
}
