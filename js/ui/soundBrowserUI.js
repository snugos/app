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
    
    const combinedViewTree = {};
    Object.keys(Constants.soundLibraries).forEach(libName => {
        if (allFileTrees[libName]) {
            combinedViewTree[libName] = { type: 'folder', children: allFileTrees[libName] };
        }
    });

    if (Object.keys(combinedViewTree).length > 0) {
        renderSoundBrowserDirectory([], combinedViewTree);
    } else {
        dirView.innerHTML = '<p class="text-black dark:text-white italic">Loading sound libraries...</p>';
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
    
    const contentHTML = `
        <div class="flex flex-col h-full text-xs bg-white dark:bg-black text-black dark:text-white">
            <div class="p-1 border-b border-black dark:border-white flex items-center space-x-2">
                <h3 class="font-bold text-sm px-2 flex-grow">Sound Library</h3>
                <button id="soundBrowserPreviewBtn" class="px-2 py-1 text-xs border rounded bg-black text-white border-black hover:bg-white hover:text-black dark:bg-white dark:text-black dark:border-white dark:hover:bg-black dark:hover:text-white disabled:opacity-50" disabled>Preview</button>
            </div>
            <div id="soundBrowserPathDisplay" class="p-1 text-xs bg-white dark:bg-black border-b border-black dark:border-white truncate">/</div>
            <div id="soundBrowserDirectoryView" class="flex-grow overflow-auto p-1">
                <p class="text-black dark:text-white italic">Loading libraries...</p>
            </div>
        </div>`;

    const browserOptions = { width: 350, height: 500, minWidth: 250, minHeight: 300, initialContentKey: windowId };
    if (savedState) {
        Object.assign(browserOptions, savedState);
    }

    const browserWindow = localAppServices.createWindow(windowId, 'Sound Browser', contentHTML, browserOptions);

    if (browserWindow?.element) {
        const previewBtn = browserWindow.element.querySelector('#soundBrowserPreviewBtn');

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
        
        renderCombinedLibraryView();
        
        previewBtn?.addEventListener('click', () => {
            const soundData = selectedSoundForPreviewData;
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
                            });
                        }
                    }
                 }).catch(err => {
                    console.error("Error getting blob for preview:", err);
                 });
            }
        });
    }
    return browserWindow;
}

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
        parentDiv.className = 'p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer rounded flex items-center';
        parentDiv.innerHTML = `<span class="mr-2 text-sm">&#8617;</span> .. (Parent Directory)`;
        parentDiv.addEventListener('click', () => {
            const newPath = pathArray.slice(0, -1);
            let currentTree = {};
            const allFileTrees = localAppServices.getSoundLibraryFileTrees?.() || {};

            if (newPath.length === 0) {
                Object.keys(Constants.soundLibraries).forEach(libName => {
                    if (allFileTrees[libName]) {
                        currentTree[libName] = { type: 'folder', children: allFileTrees[libName] };
                    }
                });
            } else {
                let rootTree = allFileTrees[newPath[0]];
                currentTree = rootTree;
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
        itemDiv.className = 'p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer rounded flex items-center';
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
                const libraryName = pathArray[0];
                if (!libraryName) { e.preventDefault(); return; }
                const dragData = { type: 'sound-browser-item', libraryName: libraryName, fullPath: item.entry.name, fileName: name };
                e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                e.dataTransfer.effectAllowed = 'copy';
            });
            itemDiv.addEventListener('click', () => {
                dirView.querySelectorAll('.bg-black.text-white, .dark\\:bg-white.dark\\:text-black').forEach(el => {
                    el.classList.remove('bg-black', 'text-white', 'dark:bg-white', 'dark:text-black');
                });
                itemDiv.classList.add('bg-black', 'text-white', 'dark:bg-white', 'dark:text-black');
                const libraryName = pathArray[0];
                if (localAppServices.setSelectedSoundForPreview && libraryName) {
                    localAppServices.setSelectedSoundForPreview({ libraryName: libraryName, fullPath: item.entry.name, fileName: name });
                }
            });
            itemDiv.addEventListener('dblclick', () => {
                const armedTrackId = localAppServices.getArmedTrackId?.();
                const armedTrack = armedTrackId !== null ? localAppServices.getTrackById?.(armedTrackId) : null;
                const libraryName = pathArray[0];

                if (armedTrack && localAppServices.loadSoundFromBrowserToTarget && libraryName) {
                    const soundData = { libraryName: libraryName, fullPath: item.entry.name, fileName: name };
                    let targetIndex = null;
                    if (armedTrack.type === 'DrumSampler') targetIndex = armedTrack.selectedDrumPadForEdit;
                    else if (armedTrack.type === 'Sampler') targetIndex = armedTrack.selectedSliceForEdit;
                    localAppServices.loadSoundFromBrowserToTarget(soundData, armedTrack.id, armedTrack.type, targetIndex);
                } else {
                    showNotification(`No compatible track armed to load "${name}". Arm a sampler track first.`, 2500);
                }
            });
        }
        dirView.appendChild(itemDiv);
    });
}
