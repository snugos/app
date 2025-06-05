// js/ui/soundBrowserUI.js - Sound Browser UI Management
import { SnugWindow } from '../SnugWindow.js'; // Adjust path if SnugWindow is not in ../js/
import { showNotification, createContextMenu } from '../utils.js'; // Adjust path if utils.js is not in ../js/
import * as Constants from '../constants.js'; // Adjust path if constants.js is not in ../js/

let localAppServices = {};
let selectedSoundForPreviewData = null; // Managed internally by this module

export function initializeSoundBrowserUI(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    console.log("[SoundBrowserUI] Initialized with appServices keys:", Object.keys(localAppServices));

    // Expose getter/setter for selectedSoundForPreviewData via appServices if other modules need it
    // This allows main.js or other UI modules to not worry about its internal management here.
    if (localAppServices && !localAppServices.getSelectedSoundForPreview) {
        localAppServices.getSelectedSoundForPreview = () => selectedSoundForPreviewData;
    }
    if (localAppServices && !localAppServices.setSelectedSoundForPreview) {
        localAppServices.setSelectedSoundForPreview = (data) => {
            console.log('[SoundBrowserUI setSelectedSoundForPreview] Setting selected sound data:', data ? JSON.stringify(data).substring(0,100) : 'null');
            selectedSoundForPreviewData = data;
            // Update preview button state when selection changes
            const browserWindow = localAppServices.getWindowById ? localAppServices.getWindowById('soundBrowser') : null;
            if (browserWindow?.element) {
                const previewBtn = browserWindow.element.querySelector('#soundBrowserPreviewBtn');
                if (previewBtn) {
                    previewBtn.disabled = !selectedSoundForPreviewData;
                }
            }
        };
    }
}

export function openSoundBrowserWindow(savedState = null) {
    const windowId = 'soundBrowser';
    // Ensure getOpenWindows service is available and correctly referenced
    const getOpenWindows = localAppServices.getOpenWindows || localAppServices.getOpenWindowsState || (() => new Map());
    const openWindows = getOpenWindows();

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
                <p class="text-slate-500 italic">Select a library to browse sounds.</p>
            </div>
        </div>`;

    const browserOptions = { width: 350, height: 500, minWidth: 250, minHeight: 300, initialContentKey: windowId };
    if (savedState) {
         Object.assign(browserOptions, {
            x: Number.isFinite(parseInt(savedState.left, 10)) ? parseInt(savedState.left, 10) : browserOptions.x,
            y: Number.isFinite(parseInt(savedState.top, 10)) ? parseInt(savedState.top, 10) : browserOptions.y,
            width: Number.isFinite(parseInt(savedState.width, 10)) && parseInt(savedState.width, 10) >= browserOptions.minWidth ? parseInt(savedState.width, 10) : browserOptions.width,
            height: Number.isFinite(parseInt(savedState.height, 10)) && parseInt(savedState.height, 10) >= browserOptions.minHeight ? parseInt(savedState.height, 10) : browserOptions.height,
            zIndex: savedState.zIndex,
            isMinimized: savedState.isMinimized
        });
    }

    const browserWindow = localAppServices.createWindow(windowId, 'Sound Browser', contentHTML, browserOptions);

    if (browserWindow?.element) {
        const librarySelect = browserWindow.element.querySelector('#soundLibrarySelect');
        const previewBtn = browserWindow.element.querySelector('#soundBrowserPreviewBtn');

        if (librarySelect && localAppServices.getLoadedZipFiles) {
            const loadedZips = localAppServices.getLoadedZipFiles();
            Object.keys(loadedZips).forEach(libName => {
                if (libName && loadedZips[libName] !== "loading" && typeof loadedZips[libName] === 'object') {
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
            if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(null); // Deselect on library change

            if (selectedLib && localAppServices.setCurrentLibraryName) {
                localAppServices.setCurrentLibraryName(selectedLib);
                updateSoundBrowserDisplayForLibrary(selectedLib); // This function is now in this module
            } else if (!selectedLib && localAppServices.setCurrentLibraryName) {
                localAppServices.setCurrentLibraryName(null);
                if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath([]);
                const dirView = browserWindow.element.querySelector('#soundBrowserDirectoryView');
                if (dirView) dirView.innerHTML = '<p class="text-slate-500 italic">Select a library to browse sounds.</p>';
                const pathDisplay = browserWindow.element.querySelector('#soundBrowserPathDisplay');
                if (pathDisplay) pathDisplay.textContent = '/';
                if (previewBtn) previewBtn.disabled = true;
            }
        });

        previewBtn?.addEventListener('click', () => {
            const soundData = selectedSoundForPreviewData;
            console.log("[SoundBrowserUI PreviewBtn Click] Selected sound for preview:", soundData ? JSON.stringify(soundData).substring(0,100) : 'null');
            if (soundData && localAppServices.getPreviewPlayer && localAppServices.getAudioBlobFromSoundBrowserItem) {
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
                 }).catch(err => {
                    console.error("Error getting blob for preview:", err);
                    showNotification("Error preparing sound for preview.", 2000);
                 });
            } else {
                 showNotification("No sound selected or preview service unavailable.", 2000);
            }
        });

        if (localAppServices.getCurrentLibraryName && localAppServices.getCurrentLibraryName()) {
            updateSoundBrowserDisplayForLibrary(localAppServices.getCurrentLibraryName());
        }
    }
    return browserWindow;
}

export function updateSoundBrowserDisplayForLibrary(libraryName, isLoading = false, hasError = false) {
    const browserWindow = localAppServices.getWindowById ? localAppServices.getWindowById('soundBrowser') : null;
    if (!browserWindow || !browserWindow.element) {
        console.log(`[SoundBrowserUI updateForLib] Window not found/visible. Lib: ${libraryName}, Loading: ${isLoading}, Error: ${hasError}`);
        if (!isLoading && !hasError && libraryName && localAppServices.setCurrentLibraryName && localAppServices.getCurrentLibraryName && localAppServices.getCurrentLibraryName() !== libraryName) {
            localAppServices.setCurrentLibraryName(libraryName);
        }
        return;
    }

    const dirView = browserWindow.element.querySelector('#soundBrowserDirectoryView');
    const pathDisplay = browserWindow.element.querySelector('#soundBrowserPathDisplay');
    const librarySelect = browserWindow.element.querySelector('#soundLibrarySelect');
    const previewBtn = browserWindow.element.querySelector('#soundBrowserPreviewBtn');

    if (librarySelect && libraryName && librarySelect.value !== libraryName) {
        let optionExists = Array.from(librarySelect.options).some(opt => opt.value === libraryName);
        if(!optionExists && localAppServices.getLoadedZipFiles && localAppServices.getLoadedZipFiles()[libraryName] !== "loading") {
            const option = document.createElement('option'); option.value = libraryName; option.textContent = libraryName;
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
        if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath([]);
        renderSoundBrowserDirectory([], tree);
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
    if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(null);
    previewBtn.disabled = true;

    if (pathArray.length > 0) {
        const parentDiv = document.createElement('div');
        parentDiv.className = 'p-1 hover:bg-gray-200 dark:hover:bg-slate-600 cursor-pointer rounded flex items-center';
        parentDiv.innerHTML = `<span class="mr-2 text-yellow-500 text-sm">&#8617;</span> .. (Parent Directory)`;
        parentDiv.addEventListener('click', () => {
            const newPath = pathArray.slice(0, -1);
            if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath(newPath);
            let currentTree = localAppServices.getCurrentSoundFileTree ? localAppServices.getCurrentSoundFileTree() : {};
            newPath.forEach(part => { currentTree = currentTree[part]?.children || {}; });
            renderSoundBrowserDirectory(newPath, currentTree);
        });
        dirView.appendChild(parentDiv);
    }

    const entries = Object.entries(treeNode || {}).sort((a, b) => {
        const aIsDir = a[1].type === 'folder';
        const bIsDir = b[1].type === 'folder';
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a[0].localeCompare(b[0]);
    });

    entries.forEach(([name, item]) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'p-1 hover:bg-gray-200 dark:hover:bg-slate-600 cursor-pointer rounded flex items-center';
        itemDiv.title = name;

        const icon = document.createElement('span');
        icon.className = 'mr-2 text-sm';
        icon.innerHTML = item.type === 'folder' ? '&#128193;' : '&#127925;';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'truncate';
        nameSpan.textContent = name;

        itemDiv.appendChild(icon);
        itemDiv.appendChild(nameSpan);

        if (item.type === 'folder') {
            itemDiv.addEventListener('click', () => {
                const newPath = [...pathArray, name];
                if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath(newPath);
                renderSoundBrowserDirectory(newPath, item.children || {});
            });
        } else { // File
            itemDiv.draggable = true;
            itemDiv.addEventListener('dragstart', (e) => {
                const currentLib = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
                if (!currentLib) { e.preventDefault(); return; } // Cannot drag if library context is lost
                const dragData = { type: 'sound-browser-item', libraryName: currentLib, fullPath: item.entry.name, fileName: name };
                e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                e.dataTransfer.effectAllowed = 'copy';
            });
            itemDiv.addEventListener('click', (e) => {
                dirView.querySelectorAll('.bg-blue-200').forEach(el => el.classList.remove('bg-blue-200', 'dark:bg-blue-700'));
                itemDiv.classList.add('bg-blue-200', 'dark:bg-blue-700');
                const currentLib = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
                if (localAppServices.setSelectedSoundForPreview && currentLib) {
                    localAppServices.setSelectedSoundForPreview({ libraryName: currentLib, fullPath: item.entry.name, fileName: name });
                }
                if (previewBtn) previewBtn.disabled = !currentLib;
            });
            itemDiv.addEventListener('dblclick', () => {
                const armedTrackId = localAppServices.getArmedTrackId ? localAppServices.getArmedTrackId() : null;
                const armedTrack = armedTrackId !== null && localAppServices.getTrackById ? localAppServices.getTrackById(armedTrackId) : null;
                const currentLib = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;

                if (armedTrack && localAppServices.loadSoundFromBrowserToTarget && currentLib) {
                    const soundData = { libraryName: currentLib, fullPath: item.entry.name, fileName: name };
                    let targetPadOrSliceIndex = null;
                    if (armedTrack.type === 'DrumSampler') targetPadOrSliceIndex = armedTrack.selectedDrumPadForEdit;
                    else if (armedTrack.type === 'Sampler') targetPadOrSliceIndex = armedTrack.selectedSliceForEdit;
                    localAppServices.loadSoundFromBrowserToTarget(soundData, armedTrack.id, armedTrack.type, targetPadOrSliceIndex);
                } else if (armedTrack && !currentLib) {
                     showNotification("Please select a library first.", 2000);
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
