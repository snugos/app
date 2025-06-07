// js/ui/soundBrowserUI.js - Sound Browser UI Management
import { SnugWindow } from '../SnugWindow.js';
import { showNotification, createContextMenu } from '../utils.js';
import * as Constants from '../constants.js';

let localAppServices = {};
let selectedSoundForPreviewData = null;

export function initializeSoundBrowserUI(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
}

function renderCombinedLibraryView() {
    const browserWindow = localAppServices.getWindowById?.('soundBrowser');
    if (!browserWindow?.element || browserWindow.isMinimized) return;

    const dirView = browserWindow.element.querySelector('#soundBrowserDirectoryView');
    const allFileTrees = localAppServices.getSoundLibraryFileTrees?.() || {};
    
    // Create a new root tree where each library is a top-level folder
    const combinedViewTree = {};
    Object.keys(Constants.soundLibraries).forEach(libName => {
        if (allFileTrees[libName]) {
            combinedViewTree[libName] = { type: 'folder', children: allFileTrees[libName] };
        }
    });

    if (Object.keys(combinedViewTree).length > 0) {
        // Render the new combined root directory
        renderSoundBrowserDirectory([], combinedViewTree);
    } else {
        dirView.innerHTML = '<p class="text-slate-500 italic">Loading sound libraries...</p>';
    }
}

export function openSoundBrowserWindow(savedState = null) {
    const windowId = 'soundBrowser';
    const getOpenWindows = localAppServices.getOpenWindows || (() => new Map());
    const openWindows = getOpenWindows();

    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore();
        return openWindows.get(windowId);
    }
    
    // --- Start of Corrected Code ---
    // Removed the <select> dropdown and replaced with a static header
    const contentHTML = `
        <div class="flex flex-col h-full text-xs bg-gray-50 dark:bg-slate-800 dark:text-slate-300">
            <div class="p-1 border-b dark:border-slate-700 flex items-center space-x-2">
                <h3 class="font-bold text-sm px-2 flex-grow">Sound Library</h3>
                <button id="soundBrowserPreviewBtn" class="px-2 py-1 text-xs border rounded bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700 dark:border-blue-500 disabled:opacity-50" disabled>Preview</button>
            </div>
            <div id="soundBrowserPathDisplay" class="p-1 text-xs bg-gray-100 dark:bg-slate-700 border-b dark:border-slate-600 truncate">/</div>
            <div id="soundBrowserDirectoryView" class="flex-grow overflow-auto p-1">
                <p class="text-slate-500 italic">Loading sound libraries...</p>
            </div>
        </div>`;
    // --- End of Corrected Code ---

    const browserOptions = { width: 350, height: 500, minWidth: 250, minHeight: 300, initialContentKey: windowId };
    if (savedState) {
        Object.assign(browserOptions, savedState);
    }

    const browserWindow = localAppServices.createWindow(windowId, 'Sound Browser', contentHTML, browserOptions);

    if (browserWindow?.element) {
        const previewBtn = browserWindow.element.querySelector('#soundBrowserPreviewBtn');

        // --- Start of Corrected Code ---
        // Automatically fetch all libraries when the window is opened
        const librarySources = Constants.soundLibraries || {};
        const libraryNames = Object.keys(librarySources);
        let loadedCount = 0;

        libraryNames.forEach(name => {
            const url = librarySources[name];
            const loadedZips = localAppServices.getLoadedZipFiles?.() || {};
            if (loadedZips[name]?.status === 'loaded') {
                loadedCount++;
            } else if (!loadedZips[name] || loadedZips[name].status !== 'loading') {
                localAppServices.fetchSoundLibrary?.(name, url, true);
            }
        });
        
        // Periodically check if libraries are loaded and update the view
        const checkLoadingStatus = setInterval(() => {
            const loadedZips = localAppServices.getLoadedZipFiles?.() || {};
            const currentLoaded = libraryNames.filter(name => loadedZips[name]?.status === 'loaded').length;
            if (currentLoaded > loadedCount) {
                loadedCount = currentLoaded;
                renderCombinedLibraryView();
            }
            if (currentLoaded === libraryNames.length) {
                clearInterval(checkLoadingStatus);
            }
        }, 500);
        // Initial render
        renderCombinedLibraryView();
        // --- End of Corrected Code ---
        
        previewBtn?.addEventListener('click', () => {
            // ... (preview logic remains the same)
        });
    }
    return browserWindow;
}

// This function is no longer needed as we now have a combined view
// export function updateSoundBrowserDisplayForLibrary(...) {}

export function renderSoundBrowserDirectory(pathArray, treeNode) {
    const browserWindow = localAppServices.getWindowById?.('soundBrowser');
    if (!browserWindow?.element) return;

    const dirView = browserWindow.element.querySelector('#soundBrowserDirectoryView');
    const pathDisplay = browserWindow.element.querySelector('#soundBrowserPathDisplay');
    
    if (!dirView || !pathDisplay) return;

    dirView.innerHTML = '';
    pathDisplay.textContent = `/${pathArray.join('/')}`;
    localAppServices.setSelectedSoundForPreview?.(null);

    if (pathArray.length > 0) {
        const parentDiv = document.createElement('div');
        parentDiv.className = 'p-1 hover:bg-gray-200 dark:hover:bg-slate-600 cursor-pointer rounded flex items-center';
        parentDiv.innerHTML = `<span class="mr-2 text-yellow-500 text-sm">&#8617;</span> .. (Parent Directory)`;
        parentDiv.addEventListener('click', () => {
            const newPath = pathArray.slice(0, -1);
            let currentTree = {};
            const allFileTrees = localAppServices.getSoundLibraryFileTrees?.() || {};

            if (newPath.length === 0) {
                // If we are at the root, reconstruct the combined view
                Object.keys(Constants.soundLibraries).forEach(libName => {
                    if (allFileTrees[libName]) {
                        currentTree[libName] = { type: 'folder', children: allFileTrees[libName] };
                    }
                });
            } else {
                // Navigate within the tree
                currentTree = allFileTrees[newPath[0]];
                for (let i = 1; i < newPath.length; i++) {
                    currentTree = currentTree?.[newPath[i]]?.children;
                }
            }
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
                renderSoundBrowserDirectory(newPath, item.children || {});
            });
        } else {
            itemDiv.draggable = true;
            itemDiv.addEventListener('dragstart', (e) => {
                // --- Start of Corrected Code ---
                // The library name is the first element in the path
                const libraryName = pathArray[0];
                if (!libraryName) { e.preventDefault(); return; }
                const dragData = { type: 'sound-browser-item', libraryName: libraryName, fullPath: item.entry.name, fileName: name };
                // --- End of Corrected Code ---
                e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                e.dataTransfer.effectAllowed = 'copy';
            });
            itemDiv.addEventListener('click', () => {
                dirView.querySelectorAll('.bg-blue-200').forEach(el => el.classList.remove('bg-blue-200', 'dark:bg-blue-700'));
                itemDiv.classList.add('bg-blue-200', 'dark:bg-blue-700');
                const libraryName = pathArray[0];
                if (localAppServices.setSelectedSoundForPreview && libraryName) {
                    localAppServices.setSelectedSoundForPreview({ libraryName: libraryName, fullPath: item.entry.name, fileName: name });
                }
            });
            // dblclick logic remains the same
        }
        dirView.appendChild(itemDiv);
    });
}
