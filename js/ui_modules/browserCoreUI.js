// js/ui_modules/browserCoreUI.js
import { SnugWindow } from '../SnugWindow.js';
import { showNotification, createDropZoneHTML, setupGenericDropZoneListeners, showCustomModal, createContextMenu, showConfirmationDialog } from '../utils.js';
import * as Constants from '../constants.js';

import { initializeInspectorEffectsUI } from './inspectorEffectsUI.js';
import { initializeArrangementMixingUI } from './arrangementMixingUI.js';

let localAppServices = {};
let selectedSoundForPreviewData = null; 

export function initializeUIModule(appServicesFromMain) {
    localAppServices = { ...localAppServices, ...appServicesFromMain };

    initializeInspectorEffectsUI(appServicesFromMain);
    initializeArrangementMixingUI(appServicesFromMain);

    if (!localAppServices.getSelectedSoundForPreview) {
        console.log('[BrowserCoreUI Init] getSelectedSoundForPreview service not found in appServices, wiring locally.');
        localAppServices.getSelectedSoundForPreview = () => selectedSoundForPreviewData;
    }
    if (!localAppServices.setSelectedSoundForPreview) {
        console.log('[BrowserCoreUI Init] setSelectedSoundForPreview service not found in appServices, wiring locally.');
        localAppServices.setSelectedSoundForPreview = (data) => {
            selectedSoundForPreviewData = data;
        };
    }
     if (!localAppServices.effectsRegistryAccess) { 
        console.warn("[BrowserCoreUI Module] effectsRegistryAccess not found in appServices. Add effect modal might be limited.");
        localAppServices.effectsRegistryAccess = {
            AVAILABLE_EFFECTS: {},
        };
    }
    console.log('[BrowserCoreUI] UI Module initialized, and sub-modules (InspectorEffects, ArrangementMixing) also initialized.');
}


// --- Sound Browser UI ---
export function openSoundBrowserWindow(savedState = null) {
    const windowId = 'soundBrowser';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        win.restore();
        const currentLibNameFromState = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
        if (currentLibNameFromState && localAppServices.updateSoundBrowserDisplayForLibrary) {
            console.log(`[UI SoundBrowser Re-Open/Restore] Updating display for already selected library: ${currentLibNameFromState}`);
            localAppServices.updateSoundBrowserDisplayForLibrary(currentLibNameFromState);
        } else if (localAppServices.updateSoundBrowserDisplayForLibrary) {
             localAppServices.updateSoundBrowserDisplayForLibrary(null);
        }
        return win;
    }

    const contentHTML = `<div id="soundBrowserContent" class="p-2 space-y-2 text-xs overflow-y-auto h-full dark:text-slate-300"> <div class="flex space-x-1 mb-1"> <select id="librarySelect" class="flex-grow p-1 border rounded text-xs bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"> <option value="">Select Library...</option> </select> <button id="upDirectoryBtn" class="px-2 py-1 border rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-500" title="Up Directory">↑</button> </div> <div id="currentPathDisplay" class="text-xs text-gray-600 dark:text-slate-400 truncate mb-1">/</div> <div id="soundBrowserList" class="min-h-[100px] border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600 overflow-y-auto"> <p class="text-gray-500 dark:text-slate-400 italic">Select a library to browse sounds.</p> </div> <div id="soundPreviewControls" class="mt-1 text-center"> <button id="previewSoundBtn" class="px-2 py-1 text-xs border rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700 dark:disabled:bg-slate-500" disabled>Preview</button> </div> </div>`;
    const browserOptions = { width: 380, height: 450, minWidth: 300, minHeight: 300, initialContentKey: windowId };
    if (savedState) Object.assign(browserOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

    const browserWindow = localAppServices.createWindow(windowId, 'Sound Browser', contentHTML, browserOptions);

    if (browserWindow?.element) {
        const libSelect = browserWindow.element.querySelector('#librarySelect');
        if (Constants.soundLibraries) {
            Object.keys(Constants.soundLibraries).forEach(libName => {
                const opt = document.createElement('option');
                opt.value = libName;
                opt.textContent = libName;
                libSelect.appendChild(opt);
            });
        }

        libSelect.addEventListener('change', (e) => {
            const lib = e.target.value;
            console.log(`[UI SoundBrowser] Library selected via dropdown: ${lib}`);
            if (lib && localAppServices.fetchSoundLibrary) {
                localAppServices.fetchSoundLibrary(lib, Constants.soundLibraries[lib]);
            } else if (!lib && localAppServices.updateSoundBrowserDisplayForLibrary) {
                localAppServices.updateSoundBrowserDisplayForLibrary(null);
            }
        });

        browserWindow.element.querySelector('#upDirectoryBtn').addEventListener('click', () => {
            const currentPath = localAppServices.getCurrentSoundBrowserPath ? localAppServices.getCurrentSoundBrowserPath() : [];
            if (currentPath.length > 0) {
                const newPath = [...currentPath]; newPath.pop();
                if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath(newPath);
                if (localAppServices.renderSoundBrowserDirectory) localAppServices.renderSoundBrowserDirectory(newPath, localAppServices.getCurrentSoundFileTree ? localAppServices.getCurrentSoundFileTree() : null);
            }
        });

        browserWindow.element.querySelector('#previewSoundBtn').addEventListener('click', () => {
            const selectedSound = localAppServices.getSelectedSoundForPreview ? localAppServices.getSelectedSoundForPreview() : null;
            console.log('[UI PreviewButton] Clicked. Selected Sound:', JSON.stringify(selectedSound));

            if (selectedSound && typeof Tone !== 'undefined') {
                let previewPlayer = localAppServices.getPreviewPlayer ? localAppServices.getPreviewPlayer() : null;
                if (previewPlayer && !previewPlayer.disposed) {
                    console.log('[UI PreviewButton] Disposing existing preview player.');
                    previewPlayer.stop(); previewPlayer.dispose();
                }
                const { fullPath, libraryName } = selectedSound;
                console.log(`[UI PreviewButton] Attempting to preview: ${fullPath} from ${libraryName}`);

                const loadedZips = localAppServices.getLoadedZipFiles ? localAppServices.getLoadedZipFiles() : {};
                if (loadedZips?.[libraryName] && loadedZips[libraryName] !== "loading") {
                    const zipEntry = loadedZips[libraryName].file(fullPath);
                    if (zipEntry) {
                        console.log(`[UI PreviewButton] Found zipEntry for ${fullPath}. Converting to blob.`);
                        zipEntry.async("blob").then(blob => {
                            console.log(`[UI PreviewButton] Blob created for ${fullPath}, size: ${blob.size}. Creating Object URL.`);
                            const url = URL.createObjectURL(blob);
                            console.log(`[UI PreviewButton] Object URL: ${url}. Creating Tone.Player.`);
                            previewPlayer = new Tone.Player(url, () => {
                                console.log(`[UI PreviewButton] Tone.Player loaded for ${url}. Starting playback.`);
                                previewPlayer.start();
                                URL.revokeObjectURL(url);
                                console.log(`[UI PreviewButton] Object URL revoked for ${url}.`);
                            }).toDestination();
                            previewPlayer.onerror = (err) => {
                                console.error(`[UI PreviewButton] Tone.Player error for ${url}:`, err);
                                showNotification("Error playing preview: " + err.message, 3000);
                                URL.revokeObjectURL(url);
                            };
                            if (localAppServices.setPreviewPlayer) localAppServices.setPreviewPlayer(previewPlayer);
                        }).catch(err => {
                            console.error(`[UI PreviewButton] Error converting zipEntry to blob for ${fullPath}:`, err);
                            showNotification("Error loading preview data: " + err.message, 2000);
                        });
                    } else {
                        console.warn(`[UI PreviewButton] ZipEntry not found for ${fullPath} in ${libraryName}.`);
                        showNotification("Preview error: Sound file not found in library.", 2000);
                    }
                } else {
                    console.warn(`[UI PreviewButton] Library ${libraryName} not loaded or is loading. Loaded zips:`, loadedZips);
                    showNotification("Preview error: Library not ready.", 2000);
                }
            } else if (!selectedSound) {
                console.warn('[UI PreviewButton] No sound selected for preview.');
            } else if (typeof Tone === 'undefined') {
                console.error('[UI PreviewButton] Tone is undefined!');
            }
        });

        if (!savedState) {
            const currentLibNameFromState = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
            const soundTrees = localAppServices.getSoundLibraryFileTrees ? localAppServices.getSoundLibraryFileTrees() : {};

            console.log(`[UI SoundBrowser Open DEBUG] Initial Global State Check. currentLibNameFromState: ${currentLibNameFromState}. soundTrees keys: ${soundTrees ? Object.keys(soundTrees) : 'undefined'}. soundTrees[Drums] exists: ${soundTrees ? !!soundTrees["Drums"] : 'false'}`);
            console.log(`[UI SoundBrowser Open] Initial check. Current lib in state: ${currentLibNameFromState}, Dropdown value: ${libSelect?.value}`);

            if (currentLibNameFromState && soundTrees && soundTrees[currentLibNameFromState] && libSelect) {
                console.log(`[UI SoundBrowser Open] State has current library '${currentLibNameFromState}' with loaded data. Setting dropdown and updating UI.`);
                libSelect.value = currentLibNameFromState;
                if (localAppServices.updateSoundBrowserDisplayForLibrary) {
                    localAppServices.updateSoundBrowserDisplayForLibrary(currentLibNameFromState);
                }
            } else {
                console.log(`[UI SoundBrowser Open] No specific library active and loaded in state (or soundTrees issue). Defaulting to "Select Library..." view.`);
                if (libSelect) libSelect.value = "";
                if (localAppServices.updateSoundBrowserDisplayForLibrary) {
                    localAppServices.updateSoundBrowserDisplayForLibrary(null);
                }
            }
        } else if (savedState && localAppServices.getCurrentLibraryName && localAppServices.updateSoundBrowserDisplayForLibrary) {
            const currentLibNameFromState = localAppServices.getCurrentLibraryName();
            console.log(`[UI SoundBrowser Open] Restoring from savedState. Current lib in state: ${currentLibNameFromState}`);
             if (currentLibNameFromState && libSelect) {
                libSelect.value = currentLibNameFromState;
                localAppServices.updateSoundBrowserDisplayForLibrary(currentLibNameFromState);
            } else if (libSelect) {
                libSelect.value = "";
                localAppServices.updateSoundBrowserDisplayForLibrary(null);
            }
        }
    }
    return browserWindow;
}

export function updateSoundBrowserDisplayForLibrary(libraryName, isLoading = false, hasError = false) {
    console.log(`[UI updateSoundBrowserDisplayForLibrary] START - Called for: '${libraryName}', isLoading: ${isLoading}, hasError: ${hasError}`);
    const browserWindowEl = localAppServices.getWindowById ? localAppServices.getWindowById('soundBrowser')?.element : null;

    if (!browserWindowEl) {
        console.log(`[UI updateSoundBrowserDisplayForLibrary] Sound Browser window element NOT FOUND. Aborting DOM updates.`);
        if (libraryName && !isLoading && !hasError) {
            const currentGlobalLib = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
            if (!currentGlobalLib && localAppServices.setCurrentLibraryName) {
                localAppServices.setCurrentLibraryName(libraryName);
                 console.log(`[UI updateSoundBrowserDisplayForLibrary] Window NOT visible. Library '${libraryName}' loaded. Set as current in global state.`);
            }
        }
        return;
    }

    const listDiv = browserWindowEl.querySelector('#soundBrowserList');
    const libSelect = browserWindowEl.querySelector('#librarySelect');
    const pathDisplay = browserWindowEl.querySelector('#currentPathDisplay');
    const isWindowVisible = !browserWindowEl.closest('.window.minimized');
    const currentDropdownSelection = libSelect ? libSelect.value : null;

    console.log(`[UI updateSoundBrowserDisplayForLibrary] Window visible: ${isWindowVisible}, Current dropdown: '${currentDropdownSelection}', Target library: '${libraryName}'`);

    let performFullUIUpdate = false;

    if (!isWindowVisible) {
        console.log(`[UI updateSoundBrowserDisplayForLibrary] Window NOT visible. No DOM update.`);
        if (libraryName && !isLoading && !hasError) {
            const currentGlobalLib = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
            if (!currentGlobalLib && localAppServices.setCurrentLibraryName) {
                localAppServices.setCurrentLibraryName(libraryName);
                 console.log(`[UI updateSoundBrowserDisplayForLibrary] Window NOT visible. Library '${libraryName}' loaded. Set as current in global state (as no global lib was active).`);
            }
        }
        return;
    }

    if (libraryName === currentDropdownSelection) {
        performFullUIUpdate = true;
        console.log(`[UI updateSoundBrowserDisplayForLibrary] Decision: Update current view for '${libraryName}'.`);
    } else if (currentDropdownSelection === "" && libraryName && !isLoading && !hasError) {
        performFullUIUpdate = true;
        console.log(`[UI updateSoundBrowserDisplayForLibrary] Decision: Set initial view to '${libraryName}' from 'Select Library...'.`);
    } else if (libraryName && !isLoading && !hasError) {
        console.log(`[UI updateSoundBrowserDisplayForLibrary] Decision: NO CHANGE to visible UI. Update for '${libraryName}' (isLoading: ${isLoading}, hasError: ${hasError}), but current view is '${currentDropdownSelection}'.`);
        const currentGlobalLib = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
        if (!currentGlobalLib && localAppServices.setCurrentLibraryName) {
            localAppServices.setCurrentLibraryName(libraryName);
             console.log(`[UI updateSoundBrowserDisplayForLibrary] Background load of '${libraryName}' successful. Set as current in global state (as no global lib was active).`);
        }
        return;
    } else if ((isLoading || hasError) && libraryName !== currentDropdownSelection) {
        console.log(`[UI updateSoundBrowserDisplayForLibrary] Decision: NO CHANGE to visible UI. Loading/Error for non-selected library '${libraryName}'. Current view: '${currentDropdownSelection}'.`);
        return;
    }


    if (performFullUIUpdate) {
        console.log(`[UI updateSoundBrowserDisplayForLibrary] Proceeding with UI update for '${libraryName}'.`);
        if (localAppServices.setCurrentLibraryName) localAppServices.setCurrentLibraryName(libraryName);
        if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath([]);
        if (libSelect && libSelect.value !== (libraryName || "")) {
            console.log(`[UI updateSoundBrowserDisplayForLibrary] Setting libSelect.value to: '${libraryName || ""}' (was '${currentDropdownSelection}')`);
            libSelect.value = libraryName || "";
        }
    } else {
        if (!libraryName) {
             performFullUIUpdate = true;
             console.log(`[UI updateSoundBrowserDisplayForLibrary] Condition: Explicitly setting to "Select a library" view.`);
             if (localAppServices.setCurrentLibraryName) localAppServices.setCurrentLibraryName(null);
             if (libSelect) libSelect.value = "";
        } else {
            console.error(`[UI updateSoundBrowserDisplayForLibrary] LOGIC ERROR: Reached unexpected state for '${libraryName}'. No UI update performed when one might have been expected.`);
            return;
        }
    }

    if (!libraryName) {
        listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">Select a library.</p>';
        pathDisplay.textContent = '/';
        if (localAppServices.setCurrentSoundFileTree) localAppServices.setCurrentSoundFileTree(null);
        console.log(`[UI updateSoundBrowserDisplayForLibrary] Rendering "Select a library" view.`);
        return;
    }

    if (isLoading || (localAppServices.getLoadedZipFiles && localAppServices.getLoadedZipFiles()[libraryName] === "loading")) {
        listDiv.innerHTML = `<p class="text-gray-500 dark:text-slate-400 italic">Loading ${libraryName}...</p>`;
        console.log(`[UI updateSoundBrowserDisplayForLibrary] Rendering "Loading ${libraryName}..." view.`);
    } else if (hasError) {
        listDiv.innerHTML = `<p class="text-red-500">Error: Library "${libraryName}" failed.</p>`;
        console.log(`[UI updateSoundBrowserDisplayForLibrary] Rendering "Error: Library '${libraryName}' failed." view.`);
    } else {
        console.log(`[UI updateSoundBrowserDisplayForLibrary DEBUG] About to check trees. Library: ${libraryName}`);
        const currentTrees = localAppServices.getSoundLibraryFileTrees ? localAppServices.getSoundLibraryFileTrees() : {};
        console.log(`[UI updateSoundBrowserDisplayForLibrary DEBUG] Current trees from getSoundLibraryFileTrees. Keys:`, currentTrees ? Object.keys(currentTrees) : 'undefined');

        if (currentTrees && currentTrees[libraryName]) {
            const treeForLib = currentTrees[libraryName];
            console.log(`[UI updateSoundBrowserDisplayForLibrary DEBUG] Found tree for "${libraryName}". Keys:`, treeForLib ? Object.keys(treeForLib) : 'Tree is null/undefined');
            if (treeForLib && Object.keys(treeForLib).length > 0) {
                 console.log(`[UI updateSoundBrowserDisplayForLibrary DEBUG] Tree for "${libraryName}" is NOT empty.`);
                 if (localAppServices.setCurrentSoundFileTree) localAppServices.setCurrentSoundFileTree(treeForLib);
                 if (localAppServices.renderSoundBrowserDirectory) localAppServices.renderSoundBrowserDirectory([], localAppServices.getCurrentSoundFileTree());
                 console.log(`[UI updateSoundBrowserDisplayForLibrary] Rendering directory for library '${libraryName}'.`);
            } else {
                console.warn(`[UI updateSoundBrowserDisplayForLibrary WARN] Tree for "${libraryName}" was found but considered empty or invalid. Tree:`, treeForLib);
                listDiv.innerHTML = `<p class="text-red-500">Error: Library "${libraryName}" data is empty or corrupt.</p>`;
            }
        } else {
            listDiv.innerHTML = `<p class="text-red-500">Error: Library "${libraryName}" data not found after attempting load.</p>`;
            console.log(`[UI updateSoundBrowserDisplayForLibrary] Rendering "Error: Library '${libraryName}' data not found." view. (Checked currentTrees['${libraryName}'])`);
        }
    }
    pathDisplay.textContent = `/${libraryName || ''}/`;
}


export function renderSoundBrowserDirectory(pathArray, treeNode) {
    const browserWindowEl = localAppServices.getWindowById ? localAppServices.getWindowById('soundBrowser')?.element : null;
    if (!browserWindowEl || !treeNode) return;
    const listDiv = browserWindowEl.querySelector('#soundBrowserList');
    const pathDisplay = browserWindowEl.querySelector('#currentPathDisplay');
    const previewBtn = browserWindowEl.querySelector('#previewSoundBtn');
    listDiv.innerHTML = '';
    const currentLibName = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : '';
    pathDisplay.textContent = `/${currentLibName}${pathArray.length > 0 ? '/' : ''}${pathArray.join('/')}`;

    if (localAppServices.setSelectedSoundForPreview) {
        localAppServices.setSelectedSoundForPreview(null);
    }
    if(previewBtn) previewBtn.disabled = true;

    const items = [];
    for (const name in treeNode) { if (treeNode[name]?.type) items.push({ name, type: treeNode[name].type, nodeData: treeNode[name] }); }
    items.sort((a, b) => { if (a.type === 'folder' && b.type !== 'folder') return -1; if (a.type !== 'folder' && b.type === 'folder') return 1; return a.name.localeCompare(b.name); });
    if (items.length === 0) { listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">Empty folder.</p>'; return; }

    items.forEach(itemObj => {
        const {name, nodeData} = itemObj; const listItem = document.createElement('div');
        listItem.className = 'p-1 hover:bg-blue-100 dark:hover:bg-blue-700 cursor-pointer border-b dark:border-slate-600 text-xs flex items-center';
        
        const icon = document.createElement('span'); icon.className = 'mr-1.5'; icon.textContent = nodeData.type === 'folder' ? '📁' : '🎵'; listItem.appendChild(icon);
        const text = document.createElement('span'); text.textContent = name; listItem.appendChild(text);
        
        if (nodeData.type === 'folder') {
            listItem.addEventListener('click', () => {
                const newPath = [...pathArray, name];
                if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath(newPath);
                renderSoundBrowserDirectory(newPath, nodeData.children);
            });
        } else { // File
            listItem.style.touchAction = 'none'; 
            listItem.addEventListener('click', () => {
                listDiv.querySelectorAll('.bg-blue-200,.dark\\:bg-blue-600').forEach(el => el.classList.remove('bg-blue-200', 'dark:bg-blue-600'));
                listItem.classList.add('bg-blue-200', 'dark:bg-blue-600');
                const soundToSelect = { fileName: name, fullPath: nodeData.fullPath, libraryName: currentLibName };
                console.log('[UI SoundFile Click] Sound selected:', JSON.stringify(soundToSelect));
                if (localAppServices.setSelectedSoundForPreview) {
                    localAppServices.setSelectedSoundForPreview(soundToSelect);
                }
                if(previewBtn) previewBtn.disabled = false;
            });

            // MODIFICATION: Replace native HTML5 drag-and-drop with Interact.js
            if (window.interact) {
                interact(listItem).unset(); 
                interact(listItem)
                    .draggable({
                        inertia: true, 
                        listeners: {
                            start: (event) => {
                                const dragData = {
                                    type: 'sound-browser-item',
                                    fileName: name,
                                    fullPath: nodeData.fullPath,
                                    libraryName: currentLibName
                                };
                                const targetElement = event.interaction.element || event.target; 
                                if (targetElement) {
                                    targetElement.dataset.dragType = 'sound-browser-item';
                                    targetElement.dataset.jsonData = JSON.stringify(dragData);
                                    targetElement.classList.add('dragging-sound-item'); 
                                }
                                console.log(`[UI SoundBrowser DragStart via Interact.js] Dragging: ${name}`);
                            },
                            move: (event) => {
                                // For a simple drag from a list, we might not move the original element.
                                // Interact.js handles creating a representation for the drag if not customized.
                                // If a visual "ghost" element is desired to follow the cursor,
                                // it would be created and positioned here using event.dx and event.dy.
                            },
                            end: (event) => {
                                const targetElement = event.interaction.element || event.target;
                                if (targetElement) {
                                     targetElement.classList.remove('dragging-sound-item'); 
                                }
                            }
                        }
                    })
                    .styleCursor(false); 
                listItem.style.cursor = 'grab';
            } else {
                // Fallback to original HTML5 drag if Interact.js isn't loaded (should ideally not happen)
                listItem.draggable = true;
                listItem.addEventListener('dragstart', (e) => {
                    const dragData = {type: 'sound-browser-item', fileName: name, fullPath: nodeData.fullPath, libraryName: currentLibName};
                    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
                    e.dataTransfer.effectAllowed = "copy";
                    // Still set dataset for consistency, though native D&D uses dataTransfer primarily
                    listItem.dataset.dragType = 'sound-browser-item';
                    listItem.dataset.jsonData = JSON.stringify(dragData);
                });
            }
        }
        listDiv.appendChild(listItem);
    });
}

// --- Add Effect Modal ---
export function showAddEffectModal(owner, ownerType) {
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    let modalContentHTML = `<div class="max-h-60 overflow-y-auto"><ul class="list-none p-0 m-0">`;
    const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
    for (const effectKey in AVAILABLE_EFFECTS_LOCAL) { modalContentHTML += `<li class="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-700 cursor-pointer border-b dark:border-slate-600 text-sm dark:text-slate-200" data-effect-type="${effectKey}">${AVAILABLE_EFFECTS_LOCAL[effectKey].displayName}</li>`; }
    modalContentHTML += `</ul></div>`;
    const modal = showCustomModal(`Add Effect to ${ownerName}`, modalContentHTML, [], 'add-effect-modal');
    if (modal?.contentDiv) {
        modal.contentDiv.querySelectorAll('li[data-effect-type]').forEach(item => {
            item.addEventListener('click', () => {
                const effectType = item.dataset.effectType;
                if (ownerType === 'track' && owner && typeof owner.addEffect === 'function') { 
                    owner.addEffect(effectType);
                } else if (ownerType === 'master' && localAppServices.addMasterEffect) {
                    localAppServices.addMasterEffect(effectType);
                } else {
                    console.warn("Could not add effect. Owner or required addEffect method missing.");
                }
                modal.overlay.remove();
            });
        });
    }
}
