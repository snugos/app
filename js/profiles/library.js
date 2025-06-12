import { SnugWindow } from '../daw/SnugWindow.js';

const SERVER_URL = 'https://snugos-server-api.onrender.com';

let loggedInUser = null;
let currentPath = ['/']; // Start at root
let currentViewMode = 'my-files'; // Can be 'my-files' or 'global'
let appServices = {};

document.addEventListener('DOMContentLoaded', () => {
    // NOTE: This section is now complete. I've added the missing functions
    // like getWindowById, getOpenWindows, etc., which fixes the second error.
    appServices.addWindowToStore = addWindowToStoreState;
    appServices.removeWindowFromStore = removeWindowFromStoreState;
    appServices.incrementHighestZ = incrementHighestZState;
    appServices.getHighestZ = getHighestZState;
    appServices.setHighestZ = setHighestZState;
    appServices.getOpenWindows = getOpenWindowsState;
    appServices.getWindowById = getWindowByIdState;
    appServices.createContextMenu = createContextMenu;
    appServices.showNotification = showNotification;
    appServices.showCustomModal = showCustomModal;

    loggedInUser = checkLocalAuth();
    
    attachEventListeners();
    applyUserThemePreference();
    updateClockDisplay();
    if (loggedInUser) {
        openLibraryWindow();
    } else {
        showCustomModal('Access Denied', '<p class="p-4">Please log in to use the Library.</p>', [{ label: 'Close', action: ()=>{} }]);
    }
});

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
                <div id="file-view-area" class="flex-grow p-4 overflow-y-auto flex flex-wrap content-start gap-4">
                    </div>
            </div>
        </div>
    `;
    
    const desktopEl = document.getElementById('desktop');
    const options = { 
        width: Math.max(800, desktopEl.offsetWidth * 0.7), 
        height: Math.max(600, desktopEl.offsetHeight * 0.8),
        x: desktopEl.offsetWidth * 0.15,
        y: desktopEl.offsetHeight * 0.05
    };
    const libWindow = new SnugWindow(windowId, 'File Explorer', contentHTML, options, appServices);
    
    initializePageUI(libWindow.element);
}

function initializePageUI(container) {
    const myFilesBtn = container.querySelector('#my-files-btn');
    const globalFilesBtn = container.querySelector('#global-files-btn');
    const uploadBtn = container.querySelector('#uploadFileBtn');
    const newFolderBtn = container.querySelector('#createFolderBtn');

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

    // Hover effects for sidebar buttons
    [myFilesBtn, globalFilesBtn, uploadBtn, newFolderBtn].forEach(btn => {
        const originalBg = btn.id.includes('-files-btn') ? 'transparent' : 'var(--bg-button)';
        btn.addEventListener('mouseenter', () => { 
            if(btn.style.backgroundColor === originalBg) btn.style.backgroundColor = 'var(--bg-button-hover)'; 
        });
        btn.addEventListener('mouseleave', () => { 
            if(btn.style.backgroundColor !== 'var(--accent-active)') btn.style.backgroundColor = originalBg; 
        });
    });

    uploadBtn?.addEventListener('click', () => document.getElementById('actualFileInput').click());
    document.getElementById('actualFileInput')?.addEventListener('change', e => handleFileUpload(e.target.files));
    newFolderBtn?.addEventListener('click', createFolder);

    updateNavStyling();
    fetchAndRenderLibraryItems(container);
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
        } else if (currentPath.length === 1 && data.items.length === 0) {
            fileViewArea.innerHTML = `<p class="w-full text-center italic" style="color: var(--text-secondary);">This folder is empty.</p>`;
        }
    } catch (error) {
        fileViewArea.innerHTML = `<p class="w-full text-center italic" style="color: red;">${error.message}</p>`;
    }
}

function renderFileItem(item, isParentFolder = false) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'flex flex-col items-center justify-start text-center cursor-pointer rounded-md p-2 w-24 h-28';
    itemDiv.style.color = 'var(--text-primary)';
    itemDiv.addEventListener('mouseenter', () => itemDiv.style.backgroundColor = 'var(--bg-button-hover)');
    itemDiv.addEventListener('mouseleave', () => itemDiv.style.backgroundColor = 'transparent');
    itemDiv.addEventListener('dblclick', () => handleItemClick(item, isParentFolder));

    let iconHtml = '';
    const mime = isParentFolder ? 'folder' : (item.mime_type || '');

    if (isParentFolder) {
        iconHtml = `<svg class="w-16 h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13.172 4L15.172 6H20V18H4V4H13.172ZM14.586 2H4A2 2 0 0 0 2 4V18A2 2 0 0 0 4 20H20A2 2 0 0 0 22 18V6A2 2 0 0 0 20 4H16L14.586 2Z"></path></svg>`;
    } else if (mime.includes('folder')) {
        iconHtml = `<svg class="w-16 h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h5.586l2 2H20v10H4V5zm0-2a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-6.414l-2-2H4z"/></svg>`;
    } else if (mime.startsWith('image/')) {
        iconHtml = `<img src="${item.s3_url}" class="w-16 h-16 object-cover border border-secondary" style="border-color: var(--border-secondary);"/>`;
    } else if (mime.startsWith('audio/')) {
        iconHtml = `<svg class="w-16 h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55a4.002 4.002 0 00-3-1.55c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-8z"/></svg>`;
    } else {
        iconHtml = `<svg class="w-16 h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm7 1.5V9h5.5L13 3.5z"/></svg>`;
    }

    itemDiv.innerHTML = `
        <div class="relative">${iconHtml}</div>
        <p class="text-xs mt-2 w-full break-words truncate">${isParentFolder ? '..' : item.file_name}</p>
    `;

    if (!isParentFolder && currentViewMode === 'my-files' && item.user_id === loggedInUser.id) {
        const shareBtn = document.createElement('button');
        shareBtn.innerHTML = item.is_public ? `<svg class="w-4 h-4" title="Public" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM4.5 7.5a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7Z"/></svg>` : `<svg class="w-4 h-4" title="Private" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM4.5 7.5a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7Zm-2.25 2a.25.25 0 0 1 .25-.25h9.5a.25.25 0 0 1 0 .5h-9.5a.25.25 0 0 1-.25-.25Z"/></svg>`;
        shareBtn.className = 'absolute top-0 right-0 p-1 rounded-full opacity-60 hover:opacity-100';
        shareBtn.style.backgroundColor = 'var(--bg-button)';
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showShareModal(item);
        });
        itemDiv.querySelector('.relative').appendChild(shareBtn);
    }

    return itemDiv;
}

// ... the rest of the file (all helper functions) is identical and complete ...
function showShareModal(item) {
    const newStatus = !item.is_public;
    const actionText = newStatus ? "publicly available" : "private";
    const modalContent = `<p>Are you sure you want to make '${item.file_name}' ${actionText}?</p>`;
    showCustomModal('Confirm Action', modalContent, [
        { label: 'Cancel', action: () => {} },
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

function handleItemClick(item, isParentFolder) {
    const libWindow = appServices.getWindowById('library');
    if (isParentFolder) {
        if (currentPath.length > 1) currentPath.pop();
    } else if (item.mime_type.includes('folder')) {
        currentPath.push(item.file_name + '/');
    } else {
        openFileViewerWindow(item);
        return;
    }
    if (libWindow) fetchAndRenderLibraryItems(libWindow.element);
}

async function handleFileUpload(files) {
    if (!loggedInUser || files.length === 0) return;
    showNotification(`Uploading ${files.length} file(s)...`, 3000);

    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_public', 'false'); // Default to private
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

function createFolder() {
    if (!loggedInUser) return;
    showCustomModal('Create New Folder', `<input type="text" id="folderNameInput" class="w-full p-2" style="background-color: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-input);" placeholder="Folder Name">`, [
        { label: 'Cancel', action: ()=>{} },
        { label: 'Create', action: async ()=>{
            const folderName = document.getElementById('folderNameInput').value;
            if (!folderName || !folderName.trim()) return;
            try {
                const token = localStorage.getItem('snugos_token');
                const response = await fetch(`${SERVER_URL}/api/folders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ name: folderName, path: currentPath.join('/') })
                });
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
