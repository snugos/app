// js/ui/soundBrowserUI.js - Sound Browser UI Management
import * as Constants from '../constants.js';
import { showNotification } from '../utils.js';

let localAppServices = {};
let selectedSoundForPreviewData = null; 

export function initializeSoundBrowserUI(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
}

// --- Start of Corrected Code ---
function renderSoundBrowser() {
    const browserWindow = localAppServices.getWindowById?.('soundBrowser');
    if (!browserWindow?.element || browserWindow.isMinimized) return;

    const allFileTrees = localAppServices.getSoundLibraryFileTrees?.() || {};
    
    // Create a virtual root containing all libraries as top-level folders
    const virtualRoot = {};
    Object.keys(Constants.soundLibraries).forEach(libName => {
        if (allFileTrees[libName]) {
            virtualRoot[libName] = { 
                type: 'folder', 
                children: allFileTrees[libName] 
            };
        } else {
            // Show a placeholder if the library is loading or failed
            const loadedZips = localAppServices.getLoadedZipFiles?.() || {};
            const libStatus = loadedZips[libName]?.status;
            let status_text = '(loading...)';
            if (libStatus === 'error') status_text = '(error)';

            virtualRoot[`${libName} ${status_text}`] = { type: 'placeholder' };
        }
    });

    const currentPath = localAppServices.getCurrentSoundBrowserPath?.() || [];
    let currentTree = virtualRoot;
    
    // Navigate to the current path within the virtual root
    try {
        for (const part of currentPath) {
            currentTree = currentTree[part]?.children;
            if (!currentTree) throw new Error("Path not found");
        }
    } catch (e) {
        console.warn("Error navigating sound browser path, resetting to root.", e);
        localAppServices.setCurrentSoundBrowserPath?.([]);
        currentTree = virtualRoot;
    }
    
    renderDirectoryView(currentPath, currentTree);
}
// --- End of Corrected Code ---

export function openSoundBrowserWindow(savedState = null) {
    const windowId = 'soundBrowser';
    const getOpenWindows = localAppServices.getOpenWindows || (() => new Map());
    const openWindows = getOpenWindows();

    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore();
        return openWindows.get(windowId);
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

    const browserOptions = { width: 350, height: 500, minWidth: 250, minHeight: 300, initialContentKey: windowId };
    if (savedState) {
        Object.assign(browserOptions, savedState);
    }

    const browserWindow = localAppServices.createWindow(windowId, 'Sound Browser', contentHTML, browserOptions);

    if (browserWindow?.element) {
        const previewBtn = browserWindow.element.querySelector('#soundBrowserPreviewBtn');
        
        // --- Start of Corrected Code: Simplified library loading ---
        const librarySources = Constants.soundLibraries || {};
        Object.entries(librarySources).forEach(([name, url]) => {
            localAppServices.fetchSoundLibrary?.(name, url).then(() => {
                // Re-render whenever a library is done loading
                renderSoundBrowser();
            });
        });

        renderSoundBrowser(); // Initial render
        // --- End of Corrected Code ---
        
        previewBtn?.addEventListener('click', () => {
            if (selectedSoundForPreviewData) {
                localAppServices.playPreview?.(selectedSoundForPreviewData);
            }
        });
    }
    return browserWindow;
}

// --- Start of Corrected Code ---
// Renamed from renderSoundBrowserDirectory to renderDirectoryView
function renderDirectoryView(pathArray, treeNode) {
// --- End of Corrected Code ---
    const browserWindow = localAppServices.getWindowById?.('soundBrowser');
    if (!browserWindow?.element) return;

    const dirView = browserWindow.element.querySelector('#soundBrowserDirectoryView');
    const pathDisplay = browserWindow.element.querySelector('#soundBrowserPathDisplay');
    const previewBtn = browserWindow.element.querySelector('#soundBrowserPreviewBtn');
    
    if (!dirView || !pathDisplay) return;

    dirView.innerHTML = '';
    pathDisplay.textContent = `/${pathArray.join('/')}`;
    selectedSoundForPreviewData = null;
    if (previewBtn) previewBtn.disabled = true;

    // "Up" directory button
    if (pathArray.length > 0) {
        const parentDiv = document.createElement('div');
        parentDiv.className = 'p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer rounded flex items-center';
        parentDiv.innerHTML = `<span class="mr-2 text-lg">&#8617;</span> .. (Parent Directory)`;
        parentDiv.addEventListener('click', () => {
            const newPath = pathArray.slice(0, -1);
            localAppServices.setCurrentSoundBrowserPath?.(newPath);
            renderSoundBrowser();
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
        itemDiv.className = 'p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer rounded flex items-center';
        itemDiv.title = name;

        const icon = document.createElement('span');
        icon.className = 'mr-2 text-lg';
        icon.innerHTML = item.type === 'folder' ? '&#128193;' : '&#127925;';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'truncate';
        nameSpan.textContent = name;

        itemDiv.appendChild(icon);
        itemDiv.appendChild(nameSpan);

        if (item.type === 'folder') {
            itemDiv.addEventListener('click', () => {
                const newPath = [...pathArray, name];
                localAppServices.setCurrentSoundBrowserPath?.(newPath);
                renderSoundBrowser();
            });
        } else if (item.type === 'file') {
            itemDiv.draggable = true;
            itemDiv.addEventListener('dragstart', (e) => {
                const libraryName = pathArray[0];
                if (!libraryName) { e.preventDefault(); return; }
                const dragData = { type: 'sound-browser-item', libraryName, fullPath: item.entry.name, fileName: name };
                e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                e.dataTransfer.effectAllowed = 'copy';
            });
            itemDiv.addEventListener('click', () => {
                dirView.querySelectorAll('.bg-black.text-white, .dark\\:bg-white.dark\\:text-black').forEach(el => {
                    el.classList.remove('bg-black', 'text-white', 'dark:bg-white', 'dark:text-black');
                });
                itemDiv.classList.add('bg-black', 'text-white', 'dark:bg-white', 'dark:text-black');
                const libraryName = pathArray[0];
                selectedSoundForPreviewData = { libraryName, fullPath: item.entry.name, fileName: name };
                if (previewBtn) previewBtn.disabled = false;
            });
            itemDiv.addEventListener('dblclick', () => {
                const armedTrackId = localAppServices.getArmedTrackId?.();
                const armedTrack = armedTrackId !== null ? localAppServices.getTrackById?.(armedTrackId) : null;
                const libraryName = pathArray[0];

                if (armedTrack) {
                    const soundData = { libraryName, fullPath: item.entry.name, fileName: name };
                    let targetIndex = null;
                    if (armedTrack.type === 'DrumSampler') targetIndex = armedTrack.selectedDrumPadForEdit;
                    localAppServices.loadSoundFromBrowserToTarget?.(soundData, armedTrack.id, armedTrack.type, targetIndex);
                } else {
                    showNotification(`No compatible track armed to load "${name}". Arm a sampler track first.`, 2500);
                }
            });
        }
        dirView.appendChild(itemDiv);
    });
}
