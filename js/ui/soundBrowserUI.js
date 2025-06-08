// js/ui/soundBrowserUI.js - Sound Browser UI Management
import * as Constants from '../constants.js';
import { showNotification } from '../utils.js';

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

export function renderSoundBrowser() {
    console.log('%c---[ renderSoundBrowser called ]---', 'color: orange');
    const browserWindow = localAppServices.getWindowById?.('soundBrowser');
    if (!browserWindow?.element || browserWindow.isMinimized) {
        console.log('Browser window not found or minimized. Aborting render.');
        return;
    }

    const currentPath = localAppServices.getCurrentSoundBrowserPath?.() || [];
    console.log('Path at start of render:', currentPath);
    
    const allFileTrees = localAppServices.getSoundLibraryFileTrees?.() || {};
    
    const virtualRoot = {};
    virtualRoot['Imports'] = { type: 'folder', children: allFileTrees['Imports'] || {} };
    Object.keys(Constants.soundLibraries).forEach(libName => {
        if (allFileTrees[libName]) {
            virtualRoot[libName] = { type: 'folder', children: allFileTrees[libName] };
        } else {
            const loadedZips = localAppServices.getLoadedZipFiles?.() || {};
            virtualRoot[`${libName} (${loadedZips[libName]?.status || 'loading...'})`] = { type: 'placeholder' };
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
        console.warn(`[SoundBrowser] Path error: ${e.message}. Resetting to root.`);
        localAppServices.setCurrentSoundBrowserPath?.([]);
        currentTreeNode = virtualRoot;
    }
    
    console.log('Rendering directory view with path:', currentPath);
    renderDirectoryView(currentPath, currentTreeNode);
}

function getLibraryNameFromPath(pathArray) {
    if (pathArray.length > 0) {
        if (pathArray[0] === 'Imports') return 'Imports';
        return Object.keys(Constants.soundLibraries).find(lib => pathArray[0] === lib) || null;
    }
    return null;
}

export function openSoundBrowserWindow(savedState = null) {
    const windowId = 'soundBrowser';
    const openWindows = localAppServices.getOpenWindows?.() || new Map();

    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore();
        return openWindows.get(windowId);
    }
    
    const contentHTML = `
        <div class="flex flex-col h-full text-sm bg-white dark:bg-black text-black dark:text-white">
            <div class="p-1 border-b border-black dark:border-white flex items-center space-x-2">
                <h3 class="font-bold px-2 flex-grow">Sound Library</h3>
                <button id="soundBrowserPreviewBtn" class="px-2 py-1 text-xs border rounded ...">Preview</button>
            </div>
            <div id="soundBrowserPathDisplay" class="p-1 text-xs ...">/</div>
            <div id="soundBrowserDirectoryView" class="flex-grow overflow-auto p-1">...</div>
        </div>`;

    const browserWindow = localAppServices.createWindow(windowId, 'Sound Browser', contentHTML, { width: 350, height: 500 });

    if (browserWindow?.element) {
        const previewBtn = browserWindow.element.querySelector('#soundBrowserPreviewBtn');
        
        Object.entries(Constants.soundLibraries || {}).forEach(([name, url]) => {
            localAppServices.fetchSoundLibrary?.(name, url).then(() => renderSoundBrowser());
        });

        renderSoundBrowser();
        
        previewBtn?.addEventListener('click', async () => { /* ... preview logic ... */ });
    }
    return browserWindow;
}

export function renderDirectoryView(pathArray, treeNode) {
    console.log(`Rendering directory for path: /${pathArray.join('/')}`);
    const browserWindow = localAppServices.getWindowById?.('soundBrowser');
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
            localAppServices.setCurrentSoundBrowserPath?.(newPath);
            renderSoundBrowser();
        });
        dirView.appendChild(parentDiv);
    }

    const entries = Object.entries(treeNode || {}).sort((a, b) => { /* ... sorting logic ... */ });

    entries.forEach(([name, item]) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer rounded flex items-center';
        itemDiv.title = name;

        const icon = document.createElement('span');
        icon.className = 'mr-2 flex-shrink-0 text-black dark:text-white';
        icon.innerHTML = item.type === 'folder' ? FOLDER_ICON_SVG : FILE_ICON_SVG;

        itemDiv.appendChild(icon);
        // ... (rest of the element creation)

        if (item.type === 'folder') {
            itemDiv.addEventListener('click', () => {
                console.log(`%cFolder clicked: "${name}"`, 'color: #3498db; font-weight: bold;');
                const newPath = [...pathArray, name];
                localAppServices.setCurrentSoundBrowserPath?.(newPath);
                renderSoundBrowser();
            });
        } else if (item.type === 'file') {
            // ... (file event listeners)
        }
        dirView.appendChild(itemDiv);
    });
}
