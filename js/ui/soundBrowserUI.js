// js/ui/soundBrowserUI.js - Sound Browser UI Management
import { SnugWindow } from '../SnugWindow.js'; // Adjust path
import { showNotification, createContextMenu } from '../utils.js'; // Adjust path
import * as Constants from '../constants.js'; // Adjust path

let localAppServices = {};
let selectedSoundForPreviewData = null; // Managed internally by this module now

export function initializeSoundBrowserUI(appServicesFromMain) {
    localAppServices = appServicesFromMain;

    // Expose getter/setter for selectedSoundForPreviewData via appServices if needed by other modules
    // This allows main.js to not worry about its internal management here.
    if (localAppServices && !localAppServices.getSelectedSoundForPreview) {
        localAppServices.getSelectedSoundForPreview = () => selectedSoundForPreviewData;
    }
    if (localAppServices && !localAppServices.setSelectedSoundForPreview) {
        localAppServices.setSelectedSoundForPreview = (data) => {
            console.log('[SoundBrowserUI setSelectedSoundForPreview] Setting selected sound data:', data ? JSON.stringify(data).substring(0,100) : 'null');
            selectedSoundForPreviewData = data;
        };
    }
}

export function openSoundBrowserWindow(savedState = null) {
    const windowId = 'soundBrowser';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();

    if (openWindows.has(windowId) && !savedState) {
        const winInstance = openWindows.get(windowId);
        if (winInstance && typeof winInstance.restore === 'function') {
            winInstance.restore();
        }
        return winInstance;
    }

    const contentHTML = `
        <div class="flex flex-col h-full text-xs dark:bg-slate-800 dark:text-slate-300">
            <div class="p-1 border-b dark:border-slate-700 flex items-center space-x-2">
                <select id="soundLibrarySelect" class="p-1 text-xs border rounded bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 flex-grow">
                    <option value="">Select Library...</option>
                </select>
                <button id="soundBrowserPreviewBtn" class="px-2 py-1 text-xs border rounded bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700 dark:border-blue-500 disabled:opacity-50" disabled>Preview</button>
            </div>
            <div id="soundBrowserPathDisplay" class="p-1 text-xs bg-gray-100 dark:bg-slate-700 border-b dark:border-slate-600 truncate">/</div>
            <div id="soundBrowserDirectoryView" class="flex-grow overflow-auto p-1">
                <!-- Directory listing will go here -->
                <p class="text-slate-500 italic">Select a library to browse sounds.</p>
            </div>
        </div>`;

    const browserOptions = { width: 350, height: 500, minWidth: 250, minHeight: 300, initialContentKey: windowId };
    if (savedState) { Object.assign(browserOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized }); }

    const browserWindow = localAppServices.createWindow(windowId, 'Sound Browser', contentHTML, browserOptions);

    if (browserWindow?.element) {
        const librarySelect = browserWindow.element.querySelector('#soundLibrarySelect');
        const previewBtn = browserWindow.element.querySelector('#soundBrowserPreviewBtn');

        // Populate library select
        if (librarySelect && localAppServices.getLoadedZipFiles) {
            const loadedZips = localAppServices.getLoadedZipFiles();
            Object.keys(loadedZips).forEach(libName => {
                if (libName && loadedZips[libName] !== "loading" && typeof loadedZips[libName] === 'object') { // Check if it's a JSZip instance
                    const option = document.createElement('option');
                    option.value = libName;
                    option.textContent = libName;
                    librarySelect.appendChild(option);
                }
            });
            const currentLibName = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
            if (currentLibName) librarySelect.value = currentLibName;
        }

        librarySelect?.addEventListener('change', (e) => {
            const selectedLib = e.target.value;
            if (selectedLib && localAppServices.setCurrentLibraryName) {
                localAppServices.setCurrentLibraryName(selectedLib);
                updateSoundBrowserDisplayForLibrary(selectedLib);
            } else if (!selectedLib && localAppServices.setCurrentLibraryName) {
                localAppServices.setCurrentLibraryName(null);
                if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath([]);
                const dirView = browserWindow.element.querySelector('#soundBrowserDirectoryView');
                if (dirView) dirView.innerHTML = '<p class="text-slate-500 italic">Select a library to browse sounds.</p>';
                const pathDisplay = browserWindow.element.querySelector('#soundBrowserPathDisplay');
                if (pathDisplay) pathDisplay.textContent = '/';
                if (previewBtn) previewBtn.disabled = true;
                if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(null);

            }
        });

        previewBtn?.addEventListener('click', () => {
            const soundData = selectedSoundForPreviewData; // Use local variable
            console.log("[SoundBrowserUI PreviewBtn Click] Selected sound for preview:", soundData ? JSON.stringify(soundData).substring(0,100) : 'null');
            if (soundData && localAppServices.playSlicePreview && localAppServices.getTrackById) { // Assuming preview plays on an existing track or a dedicated preview player
                // This preview logic might need refinement:
                // For now, let's assume a generic preview mechanism if a dedicated one doesn't exist
                // This could be a Tone.Player instance managed in audio.js for previews
                // or it attempts to load into a temporary context.
                // The original logic used playSlicePreview, which needs a track context.

                if (localAppServices.getPreviewPlayer && localAppServices.getAudioBlobFromSoundBrowserItem) {
                     localAppServices.getAudioBlobFromSoundBrowserItem(soundData).then(blob => {
                        if (blob) {
                            const previewPlayer = localAppServices.getPreviewPlayer();
                            if (previewPlayer && !previewPlayer.disposed) {
                                if (previewPlayer.state === 'started') previewPlayer.stop();
                                const url = URL.createObjectURL(blob);
                                previewPlayer.load(url).then(() => {
                                    previewPlayer.start();
                                    URL.revokeObjectURL(url);
                                }).catch(err => {
                                    console.error("Error loading preview sound:", err);
                                    URL.revokeObjectURL(url);
                                    showNotification("Error playing preview.", 2000);
                                });
                            } else {
                                console.warn("Preview player not available or disposed.");
                                showNotification("Preview player not ready.", 2000);
                            }
                        } else {
                            showNotification("Could not load sound for preview.", 2000);
                        }
                     });
                } else {
                    console.warn("Preview player or blob getter not available in appServices.");
                    showNotification("Preview functionality not fully available.", 2000);
                }
            } else {
                 showNotification("No sound selected for preview.", 2000);
            }
        });
        // Initial render if a library is already selected
        if (localAppServices.getCurrentLibraryName && localAppServices.getCurrentLibraryName()) {
            updateSoundBrowserDisplayForLibrary(localAppServices.getCurrentLibraryName());
        }
    }
    return browserWindow;
}

export function updateSoundBrowserDisplayForLibrary(libraryName, isLoading = false, hasError = false) {
    const browserWindow = localAppServices.getWindowById ? localAppServices.getWindowById('soundBrowser') : null;
    if (!browserWindow || !browserWindow.element) {
        console.log(`[SoundBrowserUI updateSoundBrowserDisplayForLibrary] Sound Browser window not found or element missing. Library: ${libraryName}`);
        // If a library was attempted to be loaded, make sure it's set as current if successful and not error
        if (!isLoading && !hasError && libraryName && localAppServices.setCurrentLibraryName) {
             if (localAppServices.getCurrentLibraryName && localAppServices.getCurrentLibraryName() !== libraryName) {
                localAppServices.setCurrentLibraryName(libraryName);
                console.log(`[SoundBrowserUI] Set current library to ${libraryName} as window was not open.`);
             }
        }
        return;
    }

    const dirView = browserWindow.element.querySelector('#soundBrowserDirectoryView');
    const pathDisplay = browserWindow.element.querySelector('#soundBrowserPathDisplay');
    const librarySelect = browserWindow.element.querySelector('#soundLibrarySelect');
    const previewBtn = browserWindow.element.querySelector('#soundBrowserPreviewBtn');

    if (librarySelect && libraryName && librarySelect.value !== libraryName) {
        // Check if option exists, if not add it (can happen if lib loaded before window opened)
        let optionExists = false;
        for(let i=0; i < librarySelect.options.length; i++) {
            if(librarySelect.options[i].value === libraryName) {
                optionExists = true; break;
            }
        }
        if(!optionExists && localAppServices.getLoadedZipFiles && localAppServices.getLoadedZipFiles()[libraryName] !== "loading") {
            const option = document.createElement('option');
            option.value = libraryName; option.textContent = libraryName;
            librarySelect.appendChild(option);
        }
        librarySelect.value = libraryName;
    }


    if (isLoading) {
        if (dirView) dirView.innerHTML = `<p class="text-slate-500 italic">Loading library "${libraryName}"...</p>`;
        return;
    }
    if (hasError) {
        if (dirView) dirView.innerHTML = `<p class="text-red-500 italic">Error loading library "${libraryName}".</p>`;
        return;
    }

    const fileTrees = localAppServices.getSoundLibraryFileTrees ? localAppServices.getSoundLibraryFileTrees() : {};
    const tree = fileTrees[libraryName];

    if (tree && dirView) {
        if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath([]); // Reset to root
        renderSoundBrowserDirectory([], tree); // Render root of the selected library
    } else if (dirView) {
        dirView.innerHTML = `<p class="text-slate-500 italic">Library "${libraryName}" has no content or failed to parse.</p>`;
        if (pathDisplay) pathDisplay.textContent = '/';
        if (previewBtn) previewBtn.disabled = true;
        if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(null);
    }
}

export function renderSoundBrowserDirectory(pathArray, treeNode) {
    const browserWindow = localAppServices.getWindowById ? localAppServices.getWindowById('soundBrowser') : null;
    if (!browserWindow || !browserWindow.element) return;

    const dirView = browserWindow.element.querySelector('#soundBrowserDirectoryView');
    const pathDisplay = browserWindow.element.querySelector('#soundBrowserPathDisplay');
    const previewBtn = browserWindow.element.querySelector('#soundBrowserPreviewBtn');

    if (!dirView || !pathDisplay || !previewBtn) return;

    dirView.innerHTML = '';
    pathDisplay.textContent = `/${pathArray.join('/')}`;
    if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(null); // Deselect on navigation
    previewBtn.disabled = true;

    // Parent directory link ("..")
    if (pathArray.length > 0) {
        const parentDiv = document.createElement('div');
        parentDiv.className = 'p-1 hover:bg-gray-200 dark:hover:bg-slate-600 cursor-pointer rounded';
        parentDiv.textContent = '.. (Parent Directory)';
        parentDiv.addEventListener('click', () => {
            const newPath = pathArray.slice(0, -1);
            if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath(newPath);
            let currentTree = localAppServices.getCurrentSoundFileTree ? localAppServices.getCurrentSoundFileTree() : {};
            newPath.forEach(part => { currentTree = currentTree[part]?.children || {}; });
            renderSoundBrowserDirectory(newPath, currentTree);
        });
        dirView.appendChild(parentDiv);
    }

    // Sort entries: folders first, then files, alphabetically
    const entries = Object.entries(treeNode).sort((a, b) => {
        const aIsDir = a[1].type === 'folder';
        const bIsDir = b[1].type === 'folder';
        if (aIsDir && !bIsDir) return -1; // Folders first
        if (!aIsDir && bIsDir) return 1;  // Files after folders
        return a[0].localeCompare(b[0]); // Alphabetical for same types
    });


    entries.forEach(([name, item]) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'p-1 hover:bg-gray-200 dark:hover:bg-slate-600 cursor-pointer rounded flex items-center';
        itemDiv.title = name;

        const icon = document.createElement('span');
        icon.className = 'mr-2 text-sm';
        icon.innerHTML = item.type === 'folder' ? '&#128193;' : '&#127925;'; // Folder or Musical Note emoji

        const nameSpan = document.createElement('span');
        nameSpan.className = 'truncate';
        nameSpan.textContent = name;

        itemDiv.appendChild(icon);
        itemDiv.appendChild(nameSpan);


        if (item.type === 'folder') {
            itemDiv.addEventListener('click', () => {
                const newPath = [...pathArray, name];
                if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath(newPath);
                renderSoundBrowserDirectory(newPath, item.children);
            });
        } else { // File
            itemDiv.draggable = true;
            itemDiv.addEventListener('dragstart', (e) => {
                const currentLib = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
                const dragData = {
                    type: 'sound-browser-item',
                    libraryName: currentLib,
                    fullPath: item.entry.name, // JSZip entry.name is the full path
                    fileName: name
                };
                e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                e.dataTransfer.effectAllowed = 'copy';
            });

            itemDiv.addEventListener('click', (e) => {
                // Deselect previous
                dirView.querySelectorAll('.bg-blue-200').forEach(el => el.classList.remove('bg-blue-200', 'dark:bg-blue-700'));
                itemDiv.classList.add('bg-blue-200', 'dark:bg-blue-700'); // Highlight selected
                const currentLib = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
                if (localAppServices.setSelectedSoundForPreview) {
                    localAppServices.setSelectedSoundForPreview({
                        libraryName: currentLib,
                        fullPath: item.entry.name,
                        fileName: name
                    });
                }
                if (previewBtn) previewBtn.disabled = false;
            });
            // Double click to load to an armed track (if applicable)
             itemDiv.addEventListener('dblclick', () => {
                const armedTrackId = localAppServices.getArmedTrackId ? localAppServices.getArmedTrackId() : null;
                const armedTrack = armedTrackId !== null && localAppServices.getTrackById ? localAppServices.getTrackById(armedTrackId) : null;
                const currentLib = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;

                if (armedTrack && localAppServices.loadSoundFromBrowserToTarget) {
                    const soundData = { libraryName: currentLib, fullPath: item.entry.name, fileName: name };
                    let targetPadOrSliceIndex = null; // This might need to be determined if applicable
                    if (armedTrack.type === 'DrumSampler') targetPadOrSliceIndex = armedTrack.selectedDrumPadForEdit;
                    else if (armedTrack.type === 'Sampler') targetPadOrSliceIndex = armedTrack.selectedSliceForEdit;

                    localAppServices.loadSoundFromBrowserToTarget(soundData, armedTrack.id, armedTrack.type, targetPadOrSliceIndex);
                } else if (armedTrack) {
                    showNotification(`Cannot load sound. Service unavailable or track not configured.`, 2000);
                } else {
                    showNotification(`No track armed to load "${name}". Arm a sampler track first.`, 2500);
                }
            });
        }
        dirView.appendChild(itemDiv);
    });
}

