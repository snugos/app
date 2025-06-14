import { SnugWindow } from '../daw/SnugWindow.js';
import { openFileViewerWindow, initializeFileViewerUI } from '../daw/ui/fileViewerUI.js'; // NEW: Import initializeFileViewerUI

const SERVER_URL = 'https://snugos-server-api.onrender.com';

let loggedInUser = null;
let currentPath = ['/'];
let currentViewMode = 'my-files';
let appServices = {};

function initAudioOnFirstGesture() {
    const startAudio = async () => {
        try {
            if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
                await Tone.start();
                console.log('AudioContext started successfully.');
            }
        } catch (e) { console.error('Could not start AudioContext:', e); }
        document.body.removeEventListener('mousedown', startAudio);
    };
    document.body.addEventListener('mousedown', startAudio);
}

document.addEventListener('DOMContentLoaded', () => {
    // Correctly populate appServices for the library.html context
    appServices = { // Ensure appServices is populated here
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        getWindowById: getWindowByIdState,
        addWindowToStore: addWindowToStoreState,
        removeWindowFromStore: removeWindowFromStoreState,
        getHighestZ: getHighestZState,
        setHighestZ: setHighestZState,
        incrementHighestZ: incrementHighestZState,
        createContextMenu: createContextMenu,
        showNotification: showNotification,
        showCustomModal: showCustomModal,
        openFileViewerWindow: openFileViewerWindow, // This is already imported and available
        // Add any other globally available functions that appServices needs from utils.js, state.js, etc.
        // For example:
        // getTracks: getTracksState, 
        // getTrackById: getTrackByIdState,
        // (etc., if library.js directly needed other state functions beyond window management)
    };

    // Initialize FileViewerUI with the now-populated appServices
    initializeFileViewerUI(appServices); // NEW: Call initializer for fileViewerUI

    loggedInUser = checkLocalAuth();
    
    attachDesktopEventListeners();
    applyUserThemePreference();
    updateClockDisplay();
    initAudioOnFirstGesture(); 
    
    if (loggedInUser) {
        openLibraryWindow();
        loadAndApplyGlobals();
    } else {
        showCustomModal('Access Denied', '<p class="p-4">Please log in to use the Library.</p>', [{ label: 'Close' }]);
    }
});

async function loadAndApplyGlobals() {
    if (!loggedInUser) return;
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/profile/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.profile.background_url) {
            const desktop = document.getElementById('desktop');
            if(desktop) {
                desktop.style.backgroundImage = `url(${data.profile.background_url})`;
                desktop.style.backgroundSize = 'cover';
                desktop.style.backgroundPosition = 'center';
            }
        }
    } catch (error) {
        console.error("Could not apply global settings:", error);
    }
}

function openLibraryWindow() {
    const windowId = 'library';
    if (appServices.getWindowById(windowId)) {
        appServices.getWindowById(windowId).focus();
        return;
    }
    const contentHTML = `
        <div class="flex h-full" style="background-color: var(--bg-window-content);">
            <div class="w-48 flex-shrink-0 p-2" style="background-color: var(--bg-window); border-right: 1px solid var(--border-secondary);">
                <h2 class="text-lg font-bold mb-4" style="color: var(--text-primary);">Library</h2>
                <ul>
                    <li><button id="my-files-btn" class="w-full text-left p-2 rounded mb-1" style="color: var(--text-primary);">My Files</button></li>
                    <li><button id="global-files-btn" class="w-full text-left p-2 rounded" style="color: var(--text-primary);">Global</button></li>
                </ul>
                <hr class="my-4" style="border-color: var(--border-secondary);" />
                <button id="uploadFileBtn" class="w-full p-2 rounded" style="background-color: var(--bg-button); color: var(--text-button); border: 1px solid var(--border-button);">Upload File</button>
                <button id="createFolderBtn" class="w-full p-2 rounded mt-2" style="background-color: var(--bg-button); color: var(--text-button); border: 1px solid var(--border-button);">New Folder</button>
            </div>
            <div class="flex-grow flex flex-col">
                <div class="p-2 border-b" style="border-color: var(--border-secondary);">
                    <div id="library-path-display" class="text-sm" style="color: var(--text-secondary);">/</div>
                </div>
                <div id="file-view-area" class="flex-grow p-4 overflow-y-auto flex flex-wrap content-start gap-4"></div>
            </div>
        </div>
    `;
    const desktopEl = document.getElementById('desktop');
    const options = { width: Math.max(800, desktopEl.offsetWidth * 0.7), height: Math.max(600, desktopEl.offsetHeight * 0.8), x: desktopEl.offsetWidth * 0.15, y: desktopEl.offsetHeight * 0.05 };
    const libWindow = new SnugWindow(windowId, 'File Explorer', contentHTML, options, appServices);
    initializePageUI(libWindow.element);
}

function initializePageUI(container) {
    const myFilesBtn = container.querySelector('#my-files-btn');
    const globalFilesBtn = container.querySelector('#global-files-btn');
    const uploadBtn = container.querySelector('#uploadFileBtn');
    const newFolderBtn = container.querySelector('#createFolderBtn');
    const actualFileInput = document.getElementById('actualFileInput'); // This is in the main document

    const updateNavStyling = () => {
        myFilesBtn.style.backgroundColor = currentViewMode === 'my-files' ? 'var(--accent-active)' : 'transparent';
        myFilesBtn.style.color = currentViewMode === 'my-files' ? 'var(--accent-active-text)' : 'var(--text-primary)';
        globalFilesBtn.style.backgroundColor = currentViewMode === 'global' ? 'var(--accent-active)' : 'transparent';
        globalFilesBtn.style.color = currentViewMode === 'global' ? 'var(--accent-active-text)' : 'var(--text-primary)';
    };
    
    myFilesBtn.addEventListener('click', () => {
        currentViewMode = 'my-files';
        currentPath = ['/'];
        fetchAndRenderLibraryItems(container);
        updateNavStyling();
    });
    globalFilesBtn.addEventListener('click', () => {
        currentViewMode = 'global';
        currentPath = ['/'];
        fetchAndRenderLibraryItems(container);
        updateNavStyling();
    });

    [myFilesBtn, globalFilesBtn].forEach(btn => {
        btn.addEventListener('mouseenter', () => { if(btn.style.backgroundColor === 'transparent') btn.style.backgroundColor = 'var(--bg-button-hover)'; });
        btn.addEventListener('mouseleave', () => { if(btn.style.backgroundColor !== 'var(--accent-active)') btn.style.backgroundColor = 'transparent'; });
    });

    // NOTE: These are the listeners that were missing and have now been restored.
    uploadBtn?.addEventListener('click', () => actualFileInput.click());
    actualFileInput?.addEventListener('change', e => {
        handleFileUpload(e.target.files);
        e.target.value = null; // Clear input after selection
    });
    newFolderBtn?.addEventListener('click', createFolder);

    updateNavStyling();
    fetchAndRenderLibraryItems(container);
}

function setupDesktopContextMenu() {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;

    desktop.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (e.target.closest('.window')) return;
        const menuItems = [
            { label: 'New Folder', action: () => createFolder() },
            { label: 'Upload File', action: () => document.getElementById('actualFileInput').click() },
            { type: 'separator' },
            { label: 'Change Background', action: () => document.getElementById('customBgInput').click() }
        ];
        appServices.createContextMenu(e, menuItems);
    });
}

function attachDesktopEventListeners() {
    setupDesktopContextMenu();
    
    document.getElementById('startButton')?.addEventListener('click', toggleStartMenu);
    document.getElementById('menuToggleFullScreen')?.addEventListener('click', toggleFullScreen);
    document.getElementById('menuLogin')?.addEventListener('click', () => { toggleStartMenu(); showLoginModal(); });
    document.getElementById('menuLogout')?.addEventListener('click', () => { toggleStartMenu(); handleLogout(); });

    document.getElementById('customBgInput')?.addEventListener('change', async (e) => {
        if(!e.target.files || !e.target.files[0] || !loggedInUser) return;
        const file = e.target.files[0];
        
        showNotification("Uploading background...", 2000);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', '/backgrounds/');
        try {
            const token = localStorage.getItem('snugos_token');
            const uploadResponse = await fetch(`${SERVER_URL}/api/files/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const uploadResult = await uploadResponse.json();
            if (!uploadResult.success) throw new Error(uploadResult.message);

            const newBgUrl = uploadResult.file.s3_url;
            await fetch(`${SERVER_URL}/api/profile/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ background_url: newBgUrl })
            });

            showNotification("Background updated!", 2000);
            loadAndApplyGlobals();
        } catch(error) {
            showNotification(`Error: ${error.message}`, 4000);
        }
    });
}

async function fetchAndRenderLibraryItems(container) {
    const fileViewArea = container.querySelector('#file-view-area');
    const pathDisplay = container.querySelector('#library-path-display');
    if (!fileViewArea || !pathDisplay) return;

    fileViewArea.innerHTML = `<p class="w-full text-center italic" style="color: var(--text-secondary);">Loading...</p>`;
    pathDisplay.textContent = currentPath.join('');

    const endpoint = currentViewMode === 'my-files' ? '/api/files/my' : '/api/files/public';
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}${endpoint}?path=${encodeURIComponent(currentPath.join('/'))}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch files');
        fileViewArea.innerHTML = '';
        if (currentPath.length > 1) {
            fileViewArea.appendChild(renderFileItem({ file_name: '..', mime_type: 'folder' }, true));
        }

        if (data.items && data.items.length > 0) {
            data.items.forEach(item => fileViewArea.appendChild(renderFileItem(item)));
        } else if (currentPath.length <= 1) {
            fileViewArea.innerHTML = `<p class="w-full text-center italic" style="color: var(--text-secondary);">This folder is empty.</p>`;
        }
    } catch (error) {
        fileViewArea.innerHTML = `<p class="w-full text-center italic" style="color: red;">${error.message}</p>`;
    }
}

function renderFileItem(item, isParentFolder = false) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'flex flex-col items-center justify-start text-center cursor-pointer rounded-md p-2 w-24 h-28 file-item-container';
    itemDiv.style.color = 'var(--text-primary)';
    
    itemDiv.addEventListener('click', () => {
        document.querySelectorAll('.file-item-container').forEach(el => el.style.backgroundColor = 'transparent');
        itemDiv.style.backgroundColor = 'var(--accent-focus)';
    });
    itemDiv.addEventListener('dblclick', () => handleItemClick(item, isParentFolder));

    let iconHtml = '';
    const mime = isParentFolder ? 'folder' : (item.mime_type || '');

    if (isParentFolder) {
        iconHtml = `<svg class="w-16 h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13.172 4L15.172 6H20V18H4V4H13.172ZM14.586 2H4A2 2 0 0 0 2 4V18A2 2 0 0 0 4 20H20A2 2 0 0 0 22 18V6A2 2 0 0 0 20 4H16L14.586 2Z"></path></svg>`;
    } else if (mime.includes('folder')) {
        iconHtml = `<svg class="w-16 h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h5.586l2 2H20v10H4V5zm0-2a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-6.414l-2-2H4z"/></svg>`;
    } else if (mime.startsWith('image/')) {
        iconHtml = `<img src="${item.s3_url}" class="w-16 h-16 object-cover border" style="border-color: var(--border-secondary);"/>`;
    } else if (mime.startsWith('audio/')) {
        iconHtml = `<svg class="w-16 h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55a4.002 4.002 0 00-3-1.55c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-8z"/></svg>`;
    } else {
        iconHtml = `<svg class="w-16 h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm7 1.5V9h5.5L13 3.5z"/></svg>`;
    }

    itemDiv.innerHTML = `<div class="relative">${iconHtml}</div><p class="text-xs mt-2 w-full break-words truncate">${isParentFolder ? '..' : item.file_name}</p>`;

    const itemContainer = itemDiv.querySelector('.relative');
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'absolute top-0 right-0 flex flex-col space-y-1';

    if (!isParentFolder && item.user_id === loggedInUser.id) {
        const shareBtn = document.createElement('button');
        shareBtn.innerHTML = `<svg class="w-4 h-4" title="Share" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4.715 6.542 3.343 7.914a.5.5 0 1 0 .707.707l1.414-1.414a.5.5 0 0 0 0-.707l-1.414-1.414a.5.5 0 1 0-.707.707l1.371 1.371z"/><path fill-rule="evenodd" d="M7.447 11.458a.5.5 0 0 0 .707 0l1.414-1.414a.5.5 0 1 0-.707-.707l-1.371 1.371a.5.5 0 0 0 0 .708l1.371 1.371a.5.5 0 1 0 .707-.707L7.447 11.458zM12.95 6.542a.5.5 0 0 0-.707-.707L10.828 7.25a.5.5 0 0 0 0 .707l1.414 1.414a.5.5 0 0 0 .707-.707L11.543 7.914l1.407-1.372z"/><path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM2.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 11.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-11 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>`;
        shareBtn.className = 'p-1 rounded-full opacity-60 hover:opacity-100';
        shareBtn.style.backgroundColor = 'var(--bg-button)';
        shareBtn.addEventListener('click', (e) => { e.stopPropagation(); handleShareFile(item); });
        actionsContainer.appendChild(shareBtn);
        
        const privacyBtn = document.createElement('button');
        privacyBtn.innerHTML = `<svg class="w-4 h-4" title="${item.is_public ? 'Public' : 'Private'}" fill="currentColor" viewBox="0 0 16 16"><path d="M11 1.5a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-1 0v-13a.5.5 0 0 1 .5-.5zM9.05.435c.58-.58 1.52-.58 2.1 0l1.5 1.5c.58.58.58 1.519 0 2.098l-7.5 7.5a.5.5 0 0 1-.707 0l-1.5-1.5a.5.5 0 0 1 0-.707l7.5-7.5Z"/></svg>`;
        privacyBtn.className = 'p-1 rounded-full opacity-60 hover:opacity-100';
        privacyBtn.style.backgroundColor = item.is_public ? 'var(--accent-soloed)' : 'var(--bg-button)';
        privacyBtn.addEventListener('click', (e) => { e.stopPropagation(); showShareModal(item); });
        actionsContainer.appendChild(privacyBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>`;
        deleteBtn.className = 'p-1 rounded-full opacity-60 hover:opacity-100';
        deleteBtn.style.backgroundColor = 'var(--bg-button)';
        deleteBtn.title = "Delete File";
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); showDeleteModal(item); });
        actionsContainer.appendChild(deleteBtn);
    }
    
    itemContainer.appendChild(actionsContainer);
    return itemDiv;
}

function handleItemClick(item, isParentFolder) {
    const libWindow = appServices.getWindowById('library');
    if (isParentFolder) {
        if (currentPath.length > 1) currentPath.pop();
    } else if (item.mime_type.includes('folder')) {
        currentPath.push(item.file_name + '/');
    } else {
        // Here, appServices.openFileViewerWindow is called
        // If appServices.openFileViewerWindow is indeed a function, it should work.
        // The problem is that 'appServices' itself needs to be correctly populated.
        appServices.openFileViewerWindow(item); 
        return;
    }
    if (libWindow) fetchAndRenderLibraryItems(libWindow.element);
}

async function handleShareFile(item) {
    showNotification("Generating secure link...", 1500);
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/files/${item.id}/share-link`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        await navigator.clipboard.writeText(result.shareUrl);
        showNotification("Sharable link copied! It expires in 1 hour.", 4000);
    } catch (error) {
        showNotification(`Could not generate link: ${error.message}`, 4000);
    }
}

function showShareModal(item) {
    const newStatus = !item.is_public;
    const actionText = newStatus ? "publicly available" : "private";
    const modalContent = `<p>Make '${item.file_name}' ${actionText}?</p>`;
    showCustomModal('Confirm Action', modalContent, [
        { label: 'Cancel' },
        { label: 'Confirm', action: () => handleToggleFilePublic(item.id, newStatus) }
    ]);
}

async function handleToggleFilePublic(fileId, newStatus) {
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/files/${fileId}/toggle-public`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ is_public: newStatus })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showNotification('File status updated!', 2000);
        const libWindow = appServices.getWindowById('library');
        if (libWindow) fetchAndRenderLibraryItems(libWindow.element);
    } catch (error) {
        showNotification(`Error: ${error.message}`, 4000);
    }
}

function showDeleteModal(item) {
    const modalContent = `<p>Permanently delete '${item.file_name}'?</p><p class="text-sm mt-2" style="color:var(--accent-armed);">This cannot be undone.</p>`;
    showCustomModal('Confirm Deletion', modalContent, [
        { label: 'Cancel' },
        { label: 'Delete', action: () => handleDeleteFile(item.id) }
    ]);
}

async function handleDeleteFile(fileId) {
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showNotification('File deleted!', 2000);
        const libWindow = appServices.getWindowById('library');
        if (libWindow) fetchAndRenderLibraryItems(libWindow.element);
    } catch (error) {
        showNotification(`Error: ${error.message}`, 4000);
    }
}

async function handleFileUpload(files) {
    if (!loggedInUser || files.length === 0) return;
    showNotification(`Uploading ${files.length} file(s)...`, 3000);
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', currentPath.join('/'));
        try {
            const token = localStorage.getItem('snugos_token');
            const response = await fetch(`${SERVER_URL}/api/files/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
        } catch (error) {
            showNotification(`Failed to upload '${file.name}': ${error.message}`, 5000);
        }
    }
    const libWindow = appServices.getWindowById('library');
    if (libWindow) fetchAndRenderLibraryItems(libWindow.element);
}

function createFolder() {
    if (!loggedInUser) return;
    showCustomModal('Create New Folder', `<input type="text" id="folderNameInput" class="w-full p-2" style="background-color: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-input);" placeholder="Folder Name">`, [
        { label: 'Cancel' },
        { label: 'Create', action: async ()=>{
            const folderName = document.getElementById('folderNameInput').value;
            if (!folderName) return;
            try {
                const token = localStorage.getItem('snugos_token');
                const response = await fetch(`${SERVER_URL}/api/folders`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name: folderName, path: currentPath.join('/') }) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showNotification(`Folder '${folderName}' created!`, 2000);
                const libWindow = appServices.getWindowById('library');
                if (libWindow) fetchAndRenderLibraryItems(libWindow.element);
            } catch (error) {
                showNotification(`Error: ${error.message}`, 5000);
            }
        }}
    ]);
}

function updateClockDisplay() {
    const clockDisplay = document.getElementById('taskbarClockDisplay');
    if (clockDisplay) {
        clockDisplay.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    setTimeout(updateClockDisplay, 60000);
}

function toggleStartMenu() {
    document.getElementById('startMenu')?.classList.toggle('hidden');
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

function checkLocalAuth() {
    try {
        const token = localStorage.getItem('snugos_token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('snugos_token');
            return null;
        }
        return { id: payload.id, username: payload.username };
    } catch (e) {
        localStorage.removeItem('snugos_token');
        return null;
    }
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

function showLoginModal() {
    showCustomModal('Login / Register', '<p class="p-4">Login functionality would appear here.</p>', [{label: 'Close'}]);
}
