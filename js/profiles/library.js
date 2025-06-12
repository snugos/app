import { SnugWindow } from '../daw/SnugWindow.js';

const SERVER_URL = 'https://snugos-server-api.onrender.com';

let loggedInUser = null;
let currentPath = [''];
let appServices = {};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Set up the services that SnugWindow depends on, which are now globally available
    // from the scripts loaded in library.html (utils.js, state.js)
    appServices.addWindowToStore = addWindowToStoreState;
    appServices.removeWindowFromStore = removeWindowFromStoreState;
    appServices.incrementHighestZ = incrementHighestZState;
    appServices.getOpenWindows = getOpenWindowsState;
    appServices.getWindowById = getWindowByIdState;
    appServices.createContextMenu = createContextMenu;

    loggedInUser = checkLocalAuth();
    
    // Always attach listeners for the main page (taskbar, start menu)
    attachEventListeners();
    applyUserThemePreference();
    updateClockDisplay();

    if (!loggedInUser) {
        showCustomModal('Access Denied', '<p class="p-4">You must be logged in to view the library. Please use the Start Menu to log in.</p>', [{ label: 'Close', action: ()=>{} }]);
    } else {
        openLibraryWindow();
    }
});

// --- Window Management ---

function openLibraryWindow() {
    const windowId = 'library';
    if (appServices.getWindowById(windowId)) {
        appServices.getWindowById(windowId).focus();
        return;
    }

    const contentHTML = `
        <div id="library-container" class="flex flex-col h-full bg-window text-primary">
            <div id="library-browser-window" class="flex flex-col flex-grow overflow-hidden m-2 rounded-lg border border-secondary">
                <div class="flex items-center p-2 border-b border-secondary bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    <button id="uploadFileBtn" class="px-3 py-1 mr-2 bg-button text-button border border-button rounded hover:bg-button-hover hover:text-button-hover">Upload</button>
                    <button id="createFolderBtn" class="px-3 py-1 bg-button text-button border border-button rounded hover:bg-button-hover hover:text-button-hover">New Folder</button>
                    <div class="flex-grow"></div>
                    <div id="library-path-display" class="text-sm px-2 text-secondary">/</div>
                </div>
                <div id="file-view-area" class="flex-grow p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 overflow-y-auto">
                    <p class="text-gray-500 italic text-center col-span-full">Loading files...</p>
                </div>
            </div>
        </div>`;
    
    const desktopEl = document.getElementById('desktop');
    const options = {
        width: Math.max(800, desktopEl.offsetWidth * 0.7),
        height: Math.max(500, desktopEl.offsetHeight * 0.8),
        x: desktopEl.offsetWidth * 0.15,
        y: desktopEl.offsetHeight * 0.1
    };

    const libWindow = new SnugWindow(windowId, 'My Library', contentHTML, options, appServices);
    
    initializePageUI(libWindow.element);
    fetchAndRenderLibraryItems(libWindow.element);
}

function openFileViewerWindow(item) {
    const windowId = `file-viewer-${item.id}`;
    if (appServices.getWindowById(windowId)) {
        appServices.getWindowById(windowId).focus();
        return;
    }

    let content = '';
    const fileType = item.mime_type || '';

    if (fileType.startsWith('image/')) {
        content = `<img src="${item.s3_url}" alt="${item.file_name}" class="w-full h-full object-contain">`;
    } else if (fileType.startsWith('video/')) {
        content = `<video src="${item.s3_url}" controls autoplay class="w-full h-full bg-black"></video>`;
    } else if (fileType.startsWith('audio/')) {
        content = `<div class="p-8 flex flex-col items-center justify-center h-full">
                     <p class="mb-4 font-bold">${item.file_name}</p>
                     <audio src="${item.s3_url}" controls autoplay></audio>
                   </div>`;
    } else {
        content = `<div class="p-8 text-center">
                     <p>Cannot preview this file type.</p>
                     <a href="${item.s3_url}" target="_blank" class="text-blue-400 hover:underline">Download file</a>
                   </div>`;
    }
    
    const options = { width: 640, height: 480 };
    new SnugWindow(windowId, `View: ${item.file_name}`, content, options, appServices);
}

// --- UI Initialization and Rendering ---

function initializePageUI(container) {
    const uploadFileBtn = container.querySelector('#uploadFileBtn');
    const createFolderBtn = container.querySelector('#createFolderBtn');
    const actualFileInput = document.getElementById('actualFileInput');

    uploadFileBtn?.addEventListener('click', () => actualFileInput.click());
    actualFileInput?.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
        e.target.value = null;
    });
    createFolderBtn?.addEventListener('click', createFolder);
}

async function fetchAndRenderLibraryItems(container = document) {
    const fileViewArea = container.querySelector('#file-view-area');
    const pathDisplay = container.querySelector('#library-path-display');
    if (!fileViewArea || !pathDisplay || !loggedInUser) return;

    fileViewArea.innerHTML = '<p class="text-gray-500 italic text-center col-span-full">Loading...</p>';
    pathDisplay.textContent = `/${currentPath.join('/')}`;

    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/files/my?path=${encodeURIComponent(currentPath.join('/'))}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            fileViewArea.innerHTML = '';
            
            if (currentPath.length > 1) {
                const parentFolderDiv = renderFileItem({ file_name: '..' }, true);
                fileViewArea.appendChild(parentFolderDiv);
            }

            if (data.items && data.items.length > 0) {
                data.items.forEach(item => {
                    fileViewArea.appendChild(renderFileItem(item));
                });
            } else if (currentPath.length <= 1) {
                 fileViewArea.innerHTML = '<p class="text-gray-500 italic text-center col-span-full">This folder is empty.</p>';
            }
        } else {
            throw new Error(data.message || 'Could not fetch files.');
        }
    } catch (error) {
        showNotification(`Error fetching items: ${error.message}`, 5000);
        console.error('Fetch items error:', error);
        fileViewArea.innerHTML = `<p class="text-red-500 text-center col-span-full">Error: ${error.message}</p>`;
    }
}

function renderFileItem(item, isParentFolder = false) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'file-item flex flex-col items-center justify-between p-2 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-gray-200 dark:hover:bg-gray-700';

    let iconHtml = '';
    let itemName = item.file_name;

    const mainContent = document.createElement('div');
    mainContent.className = 'text-center w-full flex-grow flex flex-col items-center justify-center';
    mainContent.addEventListener('click', () => handleItemClick(item, isParentFolder));

    if (isParentFolder) {
        itemName = '..';
        iconHtml = `<svg class="w-12 h-12 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11 5.373l-3.562 3.563.707.707L11 6.793V20h1V6.793l2.855 2.85.707-.707L11.5 4.666a1 1 0 00-1.414 0z"/></svg>`;
    } else if (item.mime_type === 'application/vnd.snugos.folder') {
        iconHtml = `<svg class="w-12 h-12 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h5.586l2 2H20v10H4V5zm0-2a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-6.414l-2-2H4z"/></svg>`;
    } else if (item.mime_type?.startsWith('image/')) {
        iconHtml = `<img src="${item.s3_url}" alt="${item.file_name}" class="max-h-12 w-auto object-contain">`;
    } else if (item.mime_type?.startsWith('audio/')) {
        iconHtml = `<svg class="w-12 h-12 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55a4.002 4.002 0 00-3-1.55c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-8z"/></svg>`;
    } else {
        iconHtml = `<svg class="w-12 h-12 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm7 1.5V9h5.5L13 3.5z"/></svg>`;
    }

    mainContent.innerHTML = `
        <div class="mb-2 h-12 flex items-center justify-center">${iconHtml}</div>
        <p class="font-bold text-sm truncate w-full">${itemName}</p>
    `;
    itemDiv.appendChild(mainContent);

    if (!isParentFolder && item.mime_type !== 'application/vnd.snugos.folder') {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'flex space-x-2 mt-2 w-full justify-center flex-shrink-0';
        
        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'View';
        viewBtn.className = 'px-2 py-1 rounded text-xs text-white bg-blue-600 hover:bg-blue-700';
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openFileViewerWindow(item);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'px-2 py-1 rounded text-xs text-white bg-red-600 hover:bg-red-700 delete-file-btn';
        deleteBtn.dataset.fileId = item.id;
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Delete logic would go here
        });
        
        actionsDiv.appendChild(viewBtn);
        actionsDiv.appendChild(deleteBtn);
        itemDiv.appendChild(actionsDiv);
    }

    return itemDiv;
}

// --- Core Logic ---

function handleItemClick(item, isParentFolder) {
    if (isParentFolder) {
        if (currentPath.length > 1) currentPath.pop();
    } else if (item.mime_type === 'application/vnd.snugos.folder') {
        currentPath.push(item.file_name);
    } else {
        return; 
    }
    const libWindow = appServices.getWindowById('library');
    if (libWindow) {
        fetchAndRenderLibraryItems(libWindow.element);
    }
}

async function handleFileUpload(files) {
    if (!loggedInUser || files.length === 0) return;
    showNotification(`Uploading ${files.length} file(s)...`, 3000);

    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_public', 'true');
        formData.append('path', currentPath.join('/'));

        try {
            const token = localStorage.getItem('snugos_token');
            const response = await fetch(`${SERVER_URL}/api/files/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Unknown upload error.');
            }
        } catch (error) {
            showNotification(`Failed to upload '${file.name}': ${error.message}`, 5000);
        }
    }
    const libWindow = appServices.getWindowById('library');
    if (libWindow) fetchAndRenderLibraryItems(libWindow.element);
}

async function createFolder() {
    if (!loggedInUser) return;
    const folderName = prompt("Enter new folder name:");
    if (!folderName || !folderName.trim()) return;

    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: folderName, path: currentPath.join('/') })
        });
        const result = await response.json();
        if (response.ok && result.success) {
            showNotification(`Folder '${folderName}' created!`, 2000);
            const libWindow = appServices.getWindowById('library');
            if (libWindow) fetchAndRenderLibraryItems(libWindow.element);
        } else {
            throw new Error(result.message || 'Failed to create folder.');
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 5000);
    }
}

// --- Desktop Environment and Auth Helpers ---

function updateClockDisplay() {
    const clockDisplay = document.getElementById('taskbarClockDisplay');
    if (clockDisplay) {
        const now = new Date();
        clockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    setTimeout(updateClockDisplay, 60000);
}

function toggleStartMenu() {
    document.getElementById('startMenu')?.classList.toggle('hidden');
}

function launchDaw() {
    window.location.href = 'snaw.html';
}

function viewProfiles() {
    if (loggedInUser) {
        window.open(`profile.html?user=${loggedInUser.username}`, '_blank');
    } else {
        showNotification('Please log in to view profiles.', 3000);
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            showNotification(`Error: ${err.message}`, 3000);
        });
    } else {
        if(document.exitFullscreen) document.exitFullscreen();
    }
}

function attachEventListeners() {
    document.getElementById('startButton')?.addEventListener('click', toggleStartMenu);
    document.getElementById('menuLaunchDaw')?.addEventListener('click', launchDaw);
    document.getElementById('menuViewProfiles')?.addEventListener('click', viewProfiles);
    document.getElementById('menuLogin')?.addEventListener('click', () => {
        toggleStartMenu();
        showLoginModal();
    });
    document.getElementById('menuLogout')?.addEventListener('click', () => {
        toggleStartMenu();
        handleLogout();
    });
    document.getElementById('menuToggleFullScreen')?.addEventListener('click', toggleFullScreen);
}

function checkLocalAuth() {
    const token = localStorage.getItem('snugos_token');
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('snugos_token');
            return null;
        }
        return { id: payload.id, username: payload.username };
    } catch (e) {
        console.error("Error decoding token:", e);
        localStorage.removeItem('snugos_token');
        return null;
    }
}

function showLoginModal() {
    const colors = getThemeColors();
    const modalContent = `...`; // Login modal HTML content here
    showCustomModal('Login or Register', modalContent, []);
    // Logic to handle login/register form submission inside the modal
}

function handleLogout() {
    localStorage.removeItem('snugos_token');
    showNotification('You have been logged out.', 2000);
    window.location.reload();
}

function applyUserThemePreference() {
    const preference = localStorage.getItem('snugos-theme');
    const body = document.body;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeToApply = preference || (prefersDark ? 'dark' : 'light');
    if (themeToApply === 'light') {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
    } else {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
    }
}
