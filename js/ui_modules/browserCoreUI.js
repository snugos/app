// js/ui_modules/browserCoreUI.js

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
    updateSequencerCellUI as updateSequencerCellUIFromArrangement,
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
    updateMixerWindow,
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

let localAppServices = {};

export function initializeUIModule(appServicesFromMain) {
    localAppServices = appServicesFromMain;

    initializeInspectorEffectsUI(appServicesFromMain);
    initializeArrangementMixingUI(appServicesFromMain);

    if (!localAppServices.getSelectedSoundForPreview || !localAppServices.setSelectedSoundForPreview) {
        console.warn("[BrowserCoreUI] getSelectedSoundForPreview or setSelectedSoundForPreview services missing.");
        if (!localAppServices.getSelectedSoundForPreview) localAppServices.getSelectedSoundForPreview = () => null;
        if (!localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview = () => {};
    }

    if (!localAppServices.effectsRegistryAccess) {
        console.warn("[BrowserCoreUI] effectsRegistryAccess not found in appServices.");
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
}

export function openSoundBrowserWindow(onFileSelectedCallback, savedState = null) {
    const windowId = 'soundBrowser';

    // --- DETAILED CRITICAL CHECK ---
    if (!localAppServices) {
        console.error("[BrowserCoreUI openSoundBrowserWindow] CRITICAL: localAppServices object itself is not available!");
        alert("Sound Browser Error: Core services missing (1).");
        return null;
    }
    // The console log showed getWindowByIdState, so checking for getWindowById
    if (typeof localAppServices.getWindowById !== 'function') { // Changed from getWindowByIdState to getWindowById based on log
        console.error("[BrowserCoreUI openSoundBrowserWindow] CRITICAL: localAppServices.getWindowById is NOT A FUNCTION. Type:", typeof localAppServices.getWindowById, "Value:", localAppServices.getWindowById);
        console.log("Full localAppServices at this point:", JSON.parse(JSON.stringify(localAppServices)));
        alert("Sound Browser Error: Core services missing (2).");
        return null;
    }
    if (typeof localAppServices.createWindow !== 'function') {
        console.error("[BrowserCoreUI openSoundBrowserWindow] CRITICAL: localAppServices.createWindow is NOT A FUNCTION. Type:", typeof localAppServices.createWindow, "Value:", localAppServices.createWindow);
        console.log("Full localAppServices at this point:", JSON.parse(JSON.stringify(localAppServices)));
        alert("Sound Browser Error: Core services missing (3).");
        return null;
    }
    // --- END DETAILED CRITICAL CHECK ---

    // Use getWindowById for existing window check
    if (!savedState && localAppServices.getWindowById(windowId)?.element) {
        localAppServices.getWindowById(windowId).focus();
        return localAppServices.getWindowById(windowId);
    }

    const contentHTML = `
        <div class="p-1 bg-slate-700 text-sm flex items-center sticky top-0 z-10">
            <label for="soundLibrarySelect" class="mr-2 text-xs">Library:</label>
            <select id="soundLibrarySelect" class="flex-grow bg-slate-800 p-1 rounded-sm text-xs mr-2"></select>
            <button id="soundBrowserUpBtn" class="px-2 py-0.5 bg-slate-600 hover:bg-slate-500 rounded-sm mr-1" title="Up a level"><i class="fas fa-arrow-up"></i></button>
        </div>
        <div id="soundBrowserPathDisplay" class="p-1 text-xs bg-slate-750 text-slate-400 truncate">/</div>
        <div id="soundBrowserList" class="p-1 space-y-0.5 overflow-y-auto h-full text-xs" style="max-height: calc(100% - 90px);">
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

        if (localAppServices.getCurrentLibraryName && localAppServices.getCurrentLibraryName()) { // Changed from getCurrentLibraryNameState
            librarySelect.value = localAppServices.getCurrentLibraryName();
        } else if (librarySelect.options.length > 0 && librarySelect.options[0].value) {
            librarySelect.value = librarySelect.options[0].value;
             if(localAppServices.setCurrentLibraryName) localAppServices.setCurrentLibraryName(librarySelect.value);
        }

        librarySelect.addEventListener('change', (e) => {
            if(localAppServices.setCurrentLibraryName) localAppServices.setCurrentLibraryName(e.target.value);
        });

        upButton.addEventListener('click', () => {
            if(localAppServices.popFromSoundBrowserPath) localAppServices.popFromSoundBrowserPath();
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
    if (!localAppServices.getWindowById || !localAppServices.getCurrentLibraryName || // Changed from ...State versions
        !localAppServices.getCurrentSoundBrowserPath || !localAppServices.getSoundLibraryFileTrees ||
        !localAppServices.getCurrentSoundFileTree) {
        console.warn("[BrowserCoreUI updateSoundBrowserDisplayForLibrary] Required appServices missing.");
        return;
    }

    const browserWindow = localAppServices.getWindowById('soundBrowser'); // Changed from getWindowByIdState
    if (!browserWindow || !browserWindow.element) return;

    const listDiv = browserWindow.element.querySelector('#soundBrowserList');
    const pathDisplay = browserWindow.element.querySelector('#soundBrowserPathDisplay');
    const librarySelect = browserWindow.element.querySelector('#soundLibrarySelect');
    const previewButton = browserWindow.element.querySelector('#soundBrowserPreviewBtn');

    if(!listDiv || !pathDisplay || !librarySelect || !previewButton) {
        console.warn("[BrowserCoreUI updateSoundBrowserDisplayForLibrary] UI elements not found.");
        return;
    }
    listDiv.innerHTML = '';

    const currentLibraryName = libraryNameOverride || localAppServices.getCurrentLibraryName() || librarySelect.value;
    if (librarySelect.value !== currentLibraryName && currentLibraryName) {
        librarySelect.value = currentLibraryName;
    }

    const currentPathArray = localAppServices.getCurrentSoundBrowserPath();
    pathDisplay.textContent = `/${currentPathArray.join('/')}`;

    let displayItems = localAppServices.getCurrentSoundFileTree();

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

    const loadedZips = localAppServices.getLoadedZipFiles ? localAppServices.getLoadedZipFiles() : {}; // Changed from ...State
    const currentZipStatus = loadedZips[currentLibraryName];

    if (!currentZipStatus && currentLibraryName && Constants.soundLibraries[currentLibraryName] && localAppServices.fetchSoundLibrary) {
        listDiv.innerHTML = `<div class="p-2 text-slate-400">Fetching library: ${currentLibraryName}...</div>`;
        localAppServices.fetchSoundLibrary(currentLibraryName, Constants.soundLibraries[currentLibraryName]);
        if (previewButton) previewButton.disabled = true;
        if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(null);
        return;
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

    Object.entries(displayItems).sort((a,b) => a[0].localeCompare(b[0])).forEach(([name, item]) => {
        if (item.type === 'folder') {
            const folderEl = document.createElement('div');
            folderEl.className = 'p-1.5 hover:bg-slate-700 rounded-sm cursor-pointer flex items-center';
            folderEl.innerHTML = `<i class="fas fa-folder mr-2 text-yellow-400"></i> ${name}`;
            folderEl.addEventListener('click', () => {
                if (localAppServices.pushToSoundBrowserPath) localAppServices.pushToSoundBrowserPath(name);
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
                     previewButton.click();
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
     if (previewButton) previewButton.disabled = true;
     if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(null);
}

export function showAddTrackModal() {
    if (!localAppServices.showCustomModal || !localAppServices.addTrack) {
        console.error("[BrowserCoreUI showAddTrackModal] Missing required appServices.");
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
                const name = nameInput.value.trim() || '';
                localAppServices.addTrack(type, { name: name });
                modal.overlay.remove();
            },
            classes: 'bg-blue-600 hover:bg-blue-500 text-white'
        }
    ];
    localAppServices.showCustomModal('Add New Track', content, buttons);
}


export function showAddEffectModal(owner, ownerType = 'track') {
    if (!localAppServices.effectsRegistryAccess || !localAppServices.showCustomModal ||
        (ownerType === 'track' && (!owner || !owner.addEffect)) ||
        (ownerType === 'master' && !localAppServices.addMasterEffect)) {
        console.error("[BrowserCoreUI showAddEffectModal] Missing services or owner methods.");
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
                    owner.addEffect(type);
                } else if (ownerType === 'master' && localAppServices.addMasterEffect) {
                    localAppServices.addMasterEffect(type);
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
        localAppServices.setCurrentThemeState(theme);
    } else {
        console.warn("[BrowserCoreUI updateTheme] setCurrentThemeState service not available.");
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
}
export function getTheme() {
    return localAppServices.getCurrentThemeState ? localAppServices.getCurrentThemeState() :
           (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}

export function closeAllTrackWindows(trackIdToClose = null) { // Changed parameter name for clarity
    if (!localAppServices.getOpenWindowsState) { // Removed removeWindowFromStoreState as SnugWindow.close handles it
        console.warn("[BrowserCoreUI closeAllTrackWindows] Window state services missing.");
        return;
    }

    const trackIdStr = trackIdToClose ? trackIdToClose.toString() : null;

    localAppServices.getOpenWindowsState().forEach(win => {
        const shouldClose = win.id.startsWith('trackInspector-') ||
                            win.id.startsWith('effectsRack-') ||
                            win.id.startsWith('sequencer-');

        if (shouldClose) {
            // If a specific trackId is provided, only close windows related to that track.
            // If no trackId is provided (trackIdToClose is null), close all track-specific windows.
            if (trackIdStr && win.id.includes(`-${trackIdStr}`)) {
                win.close(true); // true for reconstruction/programmatic close
            } else if (!trackIdStr) {
                win.close(true);
            }
        }
    });
}

export function updateTrackUI(trackId, reason, details = null) {
    // This function is mostly a placeholder now.
    // Specific UI update functions (renderTimeline, updateMixerWindow, etc.)
    // should be called directly by the services that change the relevant state.
    // console.log(`[BrowserCoreUI updateTrackUI] Called for track ${trackId}, reason: ${reason}`, details);
}
