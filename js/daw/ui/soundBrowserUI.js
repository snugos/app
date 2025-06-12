// js/daw/ui/soundBrowserUI.js - Sound Browser UI Management
// NOTE: Constants, Tone, Konva, JSZip are loaded globally via script tags in snaw.html.
// showNotification is from utils.js (loaded globally or accessed via appServices).
// getAudioBlobFromSoundBrowserItem from sampleManager.js (accessed via appServices)

import { getOpenWindows, getWindowById } from '../state/windowState.js'; // Corrected path
import { getCurrentSoundBrowserPath, setCurrentSoundBrowserPath, getSoundLibraryFileTrees, getLoadedZipFiles, setCurrentLibraryName, setLoadedZipFiles, setSoundLibraryFileTrees, getPreviewPlayer, setPreviewPlayer } from '../state/soundLibraryState.js'; // Corrected path
import { showNotification } from '../../utils.js'; // Corrected path
import * as Constants from '../../constants.js'; // Assuming constants.js is now a module or will be. If global, remove this.


let localAppServices = {};
let selectedSoundForPreviewData = null;

const FOLDER_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
</svg>`;

const FILE_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
  <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
  <path d="M5.5 9.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5v-2zM12.5 9.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5v-2z" />
  <path d="M5 10a1 1 0 00-1 1v1a1 1 0 001 1h1.5a.5.5 0 010 1H5a2 2 0 01-2-2v-1a2 2 0 012-2h1.5a.5.5 0 010 1H5zM15 10a1 1 0 011 1v1a1 1 0 01-1 1h-1.5a.5.5 0 000 1H15a2 2 0 002-2v-1a2 2 0 00-2-2h-1.5a.5.5 0 000 1H15z" />
</svg>`;


export function initializeSoundBrowserUI(appServicesFromMain) {
    localAppServices = appServicesFromMain;
}

export function renderSoundBrowser(pathToRender) {
    const browserWindow = getWindowById?.('soundBrowser'); // Corrected from getWindowByIdState
    if (!browserWindow?.element || browserWindow.isMinimized) {
        return;
    }

    const currentPath = pathToRender !== undefined ? pathToRender : (getCurrentSoundBrowserPath?.() || []); // Corrected function name
    
    const allFileTrees = getSoundLibraryFileTrees?.() || {}; // Corrected function name
    
    const virtualRoot = {};
    virtualRoot['Imports'] = { type: 'folder', children: allFileTrees['Imports'] || {} };
    // Constants is global
    Object.keys(Constants.soundLibraries).forEach(libName => {
        if (allFileTrees[libName]) {
            virtualRoot[libName] = { type: 'folder', children: allFileTrees[libName] };
        } else {
            const loadedZips = getLoadedZipFiles?.() || {}; // Corrected function name
            // Updated to show loading status more accurately
            virtualRoot[libName] = {
                type: 'placeholder',
                status: loadedZips[libName]?.status || 'pending',
                displayName: `${libName} (${loadedZips[libName]?.status || 'loading...'})`
            };
        }
    });
    
    let currentTreeNode = virtualRoot;
    try {
        for (const part of currentPath) {
            if (currentTreeNode[part] && currentTreeNode[part].type === 'folder') {
                currentTreeNode = currentTreeNode[part].children;
            } else {
                throw new Error(`Invalid path segment: ${part}`);
            }
        }
    } catch (e) {
        setCurrentSoundBrowserPath([]); // Corrected function name
        currentTreeNode = virtualRoot;
    }
    
    renderDirectoryView(currentPath, currentTreeNode);
}

function getLibraryNameFromPath(pathArray) {
    if (pathArray.length > 0) {
        if (pathArray[0] === 'Imports') return 'Imports';
        // Constants is global
        return Object.keys(Constants.soundLibraries).find(lib => pathArray[0] === lib) || null;
    }
    return null;
}

export function openSoundBrowserWindow(savedState = null) {
    const windowId = 'soundBrowser';
    const openWindows = getOpenWindows() || new Map(); // Corrected from getOpenWindowsState

    if (openWindows.has(windowId) && !savedState) {
        getWindowById(windowId).restore(); // Corrected from getWindowByIdState
        return getWindowById(windowId); // Corrected from getWindowByIdState
    }
    
    const contentHTML = `
        <div class="flex flex-col h-full text-sm bg-white dark:bg-black text-black dark:text-white">
            <div class="p-1 border-b border-black dark:border-white flex items-center space-x-2">
                <h3 class="font-bold px-2 flex-grow">Sound Library</h3>
                <button id="soundBrowserPreviewBtn" class="px-2 py-1 text-xs border rounded bg-black text-white border-black hover:bg-white hover:text-black dark:bg-white dark:text-black dark:border-white dark:hover:bg-black dark:hover:text-white disabled:opacity-50" disabled>Preview</button>
            </div>
            <div id="soundBrowserPathDisplay" class="p-1 text-xs bg-white dark:bg-black border-b border-black dark:border-white truncate">/</div>
            <div id="soundBrowserDirectoryView" class="flex-grow overflow-auto p-1">
                <p class="text-black dark:text-white italic">Initializing libraries...</p>
            </div>
        </div>`;

    // --- FIX: Apply savedState to options object ---
    const browserOptions = { width: 350, height: 500 };
    if (savedState) Object.assign(browserOptions, savedState);

    const browserWindow = localAppServices.createWindow(windowId, 'Sound Browser', contentHTML, browserOptions);

    if (browserWindow?.element) {
        const previewBtn = browserWindow.element.querySelector('#soundBrowserPreviewBtn');
        
        // Constants is global
        Object.entries(Constants.soundLibraries || {}).forEach(([name, url]) => {
            localAppServices.fetchSoundLibrary?.(name, url)
                .then(() => renderSoundBrowser())
                .catch(error => console.error(`Failed to load library ${name}:`, error));
        });

        renderSoundBrowser(); // Initial render to show "Initializing libraries..." and placeholders
        
        previewBtn?.addEventListener('click', async () => {
            if (selectedSoundForPreviewData) {
                try {
                    const blob = localAppServices.getAudioBlobFromSoundBrowserItem(selectedSoundForPreviewData); // Corrected to use appServices.
                    if (blob) {
                        let previewPlayer = getPreviewPlayer(); // Corrected function name
                        if (!previewPlayer) {
                            previewPlayer = new Tone.Player().toDestination();
                            setPreviewPlayer(previewPlayer); // Corrected function name
                        }
                        const objectURL = URL.createObjectURL(blob);
                        await previewPlayer.load(objectURL);
                        previewPlayer.start();
                    }
                } catch (err) {
                    showNotification("Error playing preview.", "error"); // Corrected function name
                    console.error("Preview Error:", err);
                }
            }
        });
    }
    return browserWindow;
}

export function renderDirectoryView(pathArray, treeNode) {
    const browserWindow = getWindowById?.('soundBrowser'); // Corrected from getWindowByIdState
    if (!browserWindow?.element) return;

    const dirView = browserWindow.element.querySelector('#soundBrowserDirectoryView');
    const pathDisplay = browserWindow.element.querySelector('#soundBrowserPathDisplay');
    const previewBtn = browserWindow.element.querySelector('#soundBrowserPreviewBtn');
    
    if (!dirView || !pathDisplay) return;

    dirView.innerHTML = '';
    pathDisplay.textContent = `/${pathArray.join('/')}`;
    if (previewBtn) previewBtn.disabled = true;

    if (pathArray.length > 0) {
        const parentDiv = document.createElement('div');
        parentDiv.className = 'p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer rounded flex items-center';
        parentDiv.innerHTML = `<span class="mr-2 text-lg font-bold text-black dark:text-white">↩</span> .. (Parent)`;
        parentDiv.addEventListener('click', () => {
            const newPath = pathArray.slice(0, -1);
            setCurrentSoundBrowserPath(newPath); // Corrected function name
            renderSoundBrowser(newPath);
        });
        dirView.appendChild(parentDiv);
    }

    // Sort entries: folders first, then files, both alphabetically
    const entries = Object.entries(treeNode || {}).sort((a, b) => {
        const aIsFolder = a[1].type === 'folder' || a[1].type === 'placeholder'; // Treat placeholder as folder for sorting
        const bIsFolder = b[1].type === 'folder' || b[1].type === 'placeholder';

        if (aIsFolder && !bIsFolder) return -1;
        if (!aIsFolder && bIsFolder) return 1;
        
        // For placeholders, use displayName for sorting, otherwise use name
        const nameA = a[1].displayName || a[0];
        const nameB = b[1].displayName || b[0];

        return nameA.localeCompare(nameB);
    });

    entries.forEach(([name, item]) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer rounded flex items-center';
        itemDiv.title = item.displayName || name;

        const icon = document.createElement('span');
        icon.className = 'mr-2 flex-shrink-0 text-black dark:text-white';
        icon.innerHTML = item.type === 'folder' || item.type === 'placeholder' ? FOLDER_ICON_SVG : FILE_ICON_SVG;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'truncate';
        nameSpan.textContent = item.displayName || name;

        itemDiv.appendChild(icon);
        itemDiv.appendChild(nameSpan);

        if (item.type === 'folder') {
            itemDiv.addEventListener('click', () => {
                const newPath = [...pathArray, name];
                setCurrentSoundBrowserPath(newPath); // Corrected function name
                renderSoundBrowser(newPath);
            });
        } else if (item.type === 'file') {
            itemDiv.draggable = true;
            itemDiv.addEventListener('dragstart', (e) => {
                const libraryName = getLibraryNameFromPath(pathArray);
                if (!libraryName) { e.preventDefault(); return; }
                const dragData = { type: 'sound-browser-item', libraryName, fullPath: item.fullPath, fileName: name };
                e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                e.dataTransfer.effectAllowed = 'copy';
            });
            itemDiv.addEventListener('click', () => {
                dirView.querySelectorAll('.bg-black.text-white, .dark\\:bg-white.dark\\:text-black').forEach(el => {
                    el.classList.remove('bg-black', 'text-white', 'dark:bg-white', 'dark:text-black');
                });
                itemDiv.classList.add('bg-black', 'text-white', 'dark:bg-white', 'dark:text-black');
                const libraryName = getLibraryNameFromPath(pathArray);
                selectedSoundForPreviewData = { libraryName, fullPath: item.fullPath, fileName: name };
                if (previewBtn) previewBtn.disabled = false;
            });
            itemDiv.addEventListener('dblclick', () => {
                const armedTrackId = localAppServices.getArmedTrackId?.(); // Corrected from getArmedTrackIdState
                const armedTrack = armedTrackId !== null ? localAppServices.getTrackById?.(armedTrackId) : null; // Corrected from getTrackByIdState

                if (armedTrack) {
                    const soundData = { libraryName: getLibraryNameFromPath(pathArray), fullPath: item.fullPath, fileName: name };
                    let targetIndex = null;
                    if (armedTrack.type === 'DrumSampler') targetIndex = armedTrack.selectedDrumPadForEdit;
                    localAppServices.loadSoundFromBrowserToTarget?.(soundData, armedTrack.id, armedTrack.type, targetIndex);
                } else {
                    showNotification(`No compatible track armed to load "${name}". Arm a sampler track first.`, 2500); // Corrected function name
                }
            });
        } else if (item.type === 'placeholder') {
            // For placeholder items (libraries still loading/errored)
            itemDiv.classList.add('opacity-50', 'cursor-not-allowed'); // Make it look disabled
            itemDiv.title = item.status === 'error' ? `Error loading ${name}` : `Loading ${name}...`;
            // No click handler for placeholders, as they are not browsable yet
        }
        dirView.appendChild(itemDiv);
    });
}
