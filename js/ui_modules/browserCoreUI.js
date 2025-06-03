// js/ui_modules/browserCoreUI.js
import { SnugWindow } from '../SnugWindow.js';
import { showNotification, createDropZoneHTML, setupGenericDropZoneListeners, showCustomModal, createContextMenu, showConfirmationDialog } from '../utils.js'; // Assuming showNotification is correctly used or via appServices
import * as Constants from '../constants.js';

import { initializeInspectorEffectsUI, openTrackInspectorWindow, openTrackEffectsRackWindow, openMasterEffectsRackWindow } from './inspectorEffectsUI.js';
import { initializeArrangementMixingUI, openArrangementWindow, openSequencerWindow } from './arrangementMixingUI.js';

export { openTrackInspectorWindow, openTrackEffectsRackWindow, openMasterEffectsRackWindow, openArrangementWindow, openSequencerWindow };


let localAppServices = {};
let selectedSoundForPreviewData = null;

export function initializeUIModule(appServicesFromMain) {
    localAppServices = { ...localAppServices, ...appServicesFromMain };
    initializeInspectorEffectsUI(appServicesFromMain);
    initializeArrangementMixingUI(appServicesFromMain);
    if (!localAppServices.getSelectedSoundForPreview) {
        localAppServices.getSelectedSoundForPreview = () => selectedSoundForPreviewData;
    }
    if (!localAppServices.setSelectedSoundForPreview) {
        localAppServices.setSelectedSoundForPreview = (data) => { selectedSoundForPreviewData = data; };
    }
     if (!localAppServices.effectsRegistryAccess) {
        localAppServices.effectsRegistryAccess = { AVAILABLE_EFFECTS: {} };
    }
    // console.log('[BrowserCoreUI] UI Module initialized.');
}

// --- Sound Browser UI ---
// ... (openSoundBrowserWindow, updateSoundBrowserDisplayForLibrary, renderSoundBrowserDirectory remain the same as response #21)
export function openSoundBrowserWindow(savedState = null) {
    const windowId = 'sound-browser';
    if (localAppServices.getWindowById(windowId)) {
        const win = localAppServices.getWindowById(windowId);
        if (win) win.focus();
        return win;
    }
    const content = `
        <div class="h-full flex flex-col bg-slate-700 text-sm">
            <div class="controls p-1.5 bg-slate-800/50 flex items-center space-x-2">
                <select id="library-selector" class="bg-slate-600 text-white border-slate-500 rounded-md text-xs px-2 py-1 w-full">
                    </select>
                <button id="browser-back-btn" class="disabled:opacity-50 px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded-md" disabled><i class="fas fa-arrow-left"></i></button>
            </div>
            <div id="sound-browser-path" class="p-1.5 text-xs bg-slate-800/30 truncate">/</div>
            <div id="sound-browser-list" class="flex-grow overflow-y-auto p-1">
                </div>
            <div id="sound-browser-preview" class="p-1.5 border-t border-slate-600 bg-slate-800/50 flex items-center justify-between">
                <span id="preview-file-name" class="text-xs truncate">No file selected</span>
                <button id="preview-play-btn" class="disabled:opacity-50 px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded-md" disabled><i class="fas fa-play"></i></button>
            </div>
        </div>
    `;

    const browserWindow = new SnugWindow(windowId, 'Sound Browser', content, {
        width: 300,
        height: 450,
        x: 50,
        y: 50,
        onCloseCallback: () => {
            if (localAppServices.getPreviewPlayer && localAppServices.getPreviewPlayer()?.state === 'started') {
                localAppServices.getPreviewPlayer().stop();
            }
        }
    }, localAppServices);
    updateSoundBrowserDisplayForLibrary();
    setupSoundBrowserEventListeners(browserWindow.element);
    return browserWindow;
}


export function updateSoundBrowserDisplayForLibrary() {
    const selector = document.getElementById('library-selector');
    const soundLibraryFileTrees = localAppServices.getSoundLibraryFileTrees ? localAppServices.getSoundLibraryFileTrees() : {};

    if (selector && soundLibraryFileTrees) {
        const currentLibraryName = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
        selector.innerHTML = '';
        Object.keys(soundLibraryFileTrees).forEach(libName => {
            const option = document.createElement('option');
            option.value = libName;
            option.textContent = libName;
            if (libName === currentLibraryName) {
                option.selected = true;
            }
            selector.appendChild(option);
        });

        if (selector.value) {
            renderSoundBrowserDirectory(soundLibraryFileTrees[selector.value]);
        }
    }
}
function findNodeByPath(tree, pathArray) {
    if (!pathArray || pathArray.length === 0) return tree;
    let currentNode = tree;
    for (const part of pathArray) {
        if (currentNode && currentNode.children) {
            const foundNode = currentNode.children.find(c => c.name === part && c.type === 'directory');
            if (foundNode) {
                currentNode = foundNode;
            } else {
                return null; // Path not found
            }
        } else {
            return null; // Invalid path
        }
    }
    return currentNode;
}

export function renderSoundBrowserDirectory() {
    const listEl = document.getElementById('sound-browser-list');
    const pathEl = document.getElementById('sound-browser-path');
    const backBtn = document.getElementById('browser-back-btn');

    if (!listEl || !pathEl || !backBtn) return;

    const currentFileTree = localAppServices.getCurrentSoundFileTree ? localAppServices.getCurrentSoundFileTree() : null;
    const currentPath = localAppServices.getCurrentSoundBrowserPath ? localAppServices.getCurrentSoundBrowserPath() : [];

    const currentNode = findNodeByPath(currentFileTree, currentPath);

    listEl.innerHTML = '';
    if (currentNode && currentNode.children) {
        currentNode.children.forEach(item => {
            const div = document.createElement('div');
            div.className = 'p-1.5 rounded-md hover:bg-slate-600/50 cursor-pointer flex items-center space-x-2';
            div.dataset.type = item.type;
            div.dataset.name = item.name;

            const icon = document.createElement('i');
            icon.className = `fas ${item.type === 'directory' ? 'fa-folder' : 'fa-file-audio'} fa-fw`;
            div.appendChild(icon);

            const text = document.createElement('span');
            text.textContent = item.name;
            div.appendChild(text);

            listEl.appendChild(div);
        });
    }

    pathEl.textContent = `/${currentPath.join('/')}`;
    backBtn.disabled = currentPath.length === 0;
}
function setupSoundBrowserEventListeners(containerElement) {
    const selector = containerElement.querySelector('#library-selector');
    const listEl = containerElement.querySelector('#sound-browser-list');
    const backBtn = containerElement.querySelector('#browser-back-btn');
    const previewPlayBtn = containerElement.querySelector('#preview-play-btn');
    const previewFileNameEl = containerElement.querySelector('#preview-file-name');

    if (selector) {
        selector.addEventListener('change', () => {
            if (localAppServices.setCurrentLibraryName) localAppServices.setCurrentLibraryName(selector.value);
            renderSoundBrowserDirectory();
        });
    }
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (localAppServices.popFromSoundBrowserPath) {
                localAppServices.popFromSoundBrowserPath();
                renderSoundBrowserDirectory();
            }
        });
    }
    if (listEl) {
        listEl.addEventListener('click', (e) => {
            const itemEl = e.target.closest('[data-name]');
            if (!itemEl) return;

            const { type, name } = itemEl.dataset;
            if (type === 'directory') {
                if (localAppServices.pushToSoundBrowserPath) localAppServices.pushToSoundBrowserPath(name);
                renderSoundBrowserDirectory();
            } else if (type === 'file') {
                const currentPath = localAppServices.getCurrentSoundBrowserPath ? localAppServices.getCurrentSoundBrowserPath() : [];
                const fullPath = [...currentPath, name].join('/');
                const currentLibrary = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;

                if (localAppServices.setSelectedSoundForPreview) {
                    localAppServices.setSelectedSoundForPreview({
                        library: currentLibrary,
                        path: fullPath,
                        name: name
                    });
                }
                if (previewFileNameEl) previewFileNameEl.textContent = name;
                if (previewPlayBtn) previewPlayBtn.disabled = false;
            }
        });
    }
    if (previewPlayBtn) {
        previewPlayBtn.addEventListener('click', async () => {
            const selectedSoundData = localAppServices.getSelectedSoundForPreview ? localAppServices.getSelectedSoundForPreview() : null;
            if (!selectedSoundData) return;

            const previewPlayer = localAppServices.getPreviewPlayer ? localAppServices.getPreviewPlayer() : null;
            if (previewPlayer && previewPlayer.state === 'started') {
                previewPlayer.stop();
                previewPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
                return;

            }
            if (localAppServices.loadAndPreviewSample) {
                const isPlaying = await localAppServices.loadAndPreviewSample(
                    selectedSoundData.library,
                    selectedSoundData.path,
                    () => {
                        previewPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
                    }
                );
                if (isPlaying) {
                    previewPlayBtn.innerHTML = '<i class="fas fa-stop"></i>';
                }
            }
        });
    }
}


// --- Mixer Window UI ---
export function openMixerWindow(savedState = null) { /* ... same as previous response ... */ }
export function updateMixerWindow() { /* ... same as previous response ... */ }


// --- Add Track / Add Effect Modals ---
export function showAddTrackModal() {
    const content = `
        <div class="p-4 bg-slate-700 rounded-lg">
            <h3 class="text-lg font-bold mb-4">Add New Track</h3>
            <div class="space-y-2">
                <button data-track-type="Synth" class="w-full text-left p-3 bg-slate-600 hover:bg-blue-600 rounded-md">
                    <i class="fas fa-wave-square fa-fw mr-2"></i>Synth (MonoSynth)
                    <p class="text-xs text-slate-400 pl-8">A simple monophonic synthesizer.</p>
                </button>
                <button data-track-type="DrumSampler" class="w-full text-left p-3 bg-slate-600 hover:bg-blue-600 rounded-md">
                    <i class="fas fa-drum fa-fw mr-2"></i>Drum Sampler (Pads)
                     <p class="text-xs text-slate-400 pl-8">Load samples onto 8 pads.</p>
                </button>
                <button data-track-type="Audio" class="w-full text-left p-3 bg-slate-600 hover:bg-blue-600 rounded-md">
                    <i class="fas fa-microphone-alt fa-fw mr-2"></i>Audio Track
                     <p class="text-xs text-slate-400 pl-8">Record or import audio clips.</p>
                </button>
            </div>
        </div>
    `;

    const modal = showCustomModal('Add Track', content);

    modal.contentDiv.querySelectorAll('button[data-track-type]').forEach(button => {
        button.addEventListener('click', () => {
            const trackType = button.dataset.trackType;
            if (localAppServices.addTrack && typeof localAppServices.addTrack === 'function') {
                localAppServices.addTrack(trackType);
            }
            if (modal.overlay && typeof modal.overlay.remove === 'function') modal.overlay.remove();
        });
    });
}
export function showAddEffectModal(owner, ownerType, ownerName) {
    if (!localAppServices.effectsRegistryAccess) {
        console.error("[BrowserCoreUI showAddEffectModal] Effects Registry not available via appServices.");
        return;
    }
    const AVAILABLE_EFFECTS = localAppServices.effectsRegistryAccess.AVAILABLE_EFFECTS;
    if (!AVAILABLE_EFFECTS) {
        console.error("[BrowserCoreUI showAddEffectModal] AVAILABLE_EFFECTS is missing from effectsRegistryAccess.");
        return;
    }
    let effectsListHTML = '<div class="space-y-2">';
    for (const key in AVAILABLE_EFFECTS) {
        const effect = AVAILABLE_EFFECTS[key];
        effectsListHTML += `
            <button data-effect-type="${key}" class="w-full text-left p-3 bg-slate-600 hover:bg-blue-600 rounded-md">
                <p class="font-bold">${effect.displayName}</p>
                <p class="text-xs text-slate-400">${effect.description}</p>
            </button>
        `;
    }
    effectsListHTML += '</div>';

    const modal = showCustomModal(`Add Effect to ${ownerName}`, effectsListHTML);
    if (modal.contentDiv) {
        modal.contentDiv.querySelectorAll('button[data-effect-type]').forEach(item => {
            item.addEventListener('click', () => {
                const effectType = item.dataset.effectType;
                console.log(`[BrowserCoreUI showAddEffectModal] Effect selected: ${effectType} for ${ownerName}`); // LOG ADDED

                if (ownerType === 'track' && owner && typeof owner.addEffect === 'function') {
                    console.log(`[BrowserCoreUI showAddEffectModal] Calling owner.addEffect ('${effectType}')`); // LOG ADDED
                    owner.addEffect(effectType);
                } else if (ownerType === 'master' && localAppServices.addMasterEffect && typeof localAppServices.addMasterEffect === 'function') {
                    console.log(`[BrowserCoreUI showAddEffectModal] Calling appServices.addMasterEffect ('${effectType}')`); // LOG ADDED
                    localAppServices.addMasterEffect(effectType);
                } else {
                    console.warn("[BrowserCoreUI showAddEffectModal] Could not add effect. Owner/method missing. Owner:", owner, "ownerType:", ownerType, "addMasterEffect exists:", !!localAppServices.addMasterEffect);
                    const utilShowNotification = localAppServices.showNotification || showNotification;
                    utilShowNotification("Error: Could not add effect (internal error).", 3000);
                }
                if (modal.overlay && typeof modal.overlay.remove === 'function') modal.overlay.remove();
            });
        });
    } else {
        console.error("[BrowserCoreUI showAddEffectModal] Modal contentDiv not found after creating modal.");
    }
}
