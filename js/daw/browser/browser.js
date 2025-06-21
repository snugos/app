// js/daw/browser/browser.js
// NOTE: This file is now the main JavaScript for the standalone SnugOS Browser application.
// It includes its own desktop UI and manages its own global state.

// Corrected imports to be absolute paths from the project root
import { SnugWindow } from '/app/js/daw/SnugWindow.js';
import { openFileViewerWindow, initializeFileViewerUI } from '/app/js/daw/ui/fileViewerUI.js';

// We explicitly import common utilities and DB functions.
import { storeAudio, getAudio, deleteAudio, storeAsset, getAsset } from '/app/js/daw/db.js';
import * as Constants from '/app/js/daw/constants.js';
import { showNotification, showCustomModal, createContextMenu } from '/app/js/daw/utils.js';

// Import necessary state functions directly, as this is a standalone app
import { getWindowById, addWindowToStore, removeWindowFromStore, incrementHighestZ, getHighestZ, setHighestZ, getOpenWindows, serializeWindows, reconstructWindows } from '/app/js/daw/state/windowState.js';
import { getCurrentUserThemePreference, setCurrentUserThemePreference } from '/app/js/daw/state/appState.js';

const SERVER_URL = 'https://snugos-server-api.onrender.com';

let loggedInUser = null;
let currentPath = ['/'];
let currentViewMode = 'my-files';
let appServices = {}; // This will now be populated locally for this standalone app.

// --- Global UI and Utility Functions (Local to this standalone app) ---
// These are functions that would normally be provided by welcome.js via appServices
// but are now duplicated here to make this a truly standalone desktop-like app.

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

function applyUserThemePreference() {
    const preference = localStorage.getItem('snugos-theme');
    const body = document.body;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeToApply = preference || (prefersDark ? 'dark' : 'light');
    if (themeToApply === 'light') {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
        localStorage.setItem('snugos-theme', 'light'); // Store explicit preference
    } else {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
        localStorage.setItem('snugos-theme', 'dark'); // Store explicit preference
    }
}

function showLoginModal() {
    const modalContent = `
        <div class="space-y-4">
            <div>
                <h3 class="font-bold mb-2">Login</h3>
                <form id="loginForm" class="space-y-3">
                    <input type="text" id="loginUsername" placeholder="Username" required class="w-full p-2 border rounded" style="background-color: var(--bg-input); color: var(--text-primary);">
                    <input type="password" id="loginPassword" placeholder="Password" required class="w-full p-2 border rounded" style="background-color: var(--bg-input); color: var(--text-primary);">
                    <button type="submit" class="w-full p-2 rounded" style="background-color: var(--bg-button); color: var(--text-button); border: 1px solid var(--border-button);">Login</button>
                </form>
            </div>
            <hr style="border-color: var(--border-secondary);">
            <div>
                <h3 class="font-bold mb-2">Register</h3>
                <form id="registerForm" class="space-y-3">
                    <input type="text" id="registerUsername" placeholder="Username" required class="w-full p-2 border rounded" style="background-color: var(--bg-input); color: var(--text-primary);">
                    <input type="password" id="registerPassword" placeholder="Password (min. 6)" required class="w-full p-2 border rounded" style="background-color: var(--bg-input); color: var(--text-primary);">
                    <button type="submit" class="w-full p-2 rounded" style="background-color: var(--bg-button); color: var(--text-button); border: 1px solid var(--border-button);">Register</button>
                </form>
            </div>
        </div>
    `;
    const { overlay } = showCustomModal('Login or Register', modalContent, []);
    overlay.querySelector('#loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = overlay.querySelector('#loginUsername').value;
        const password = overlay.querySelector('#loginPassword').value;
        await handleLogin(username, password);
        overlay.remove(); // Close modal after action
    });
    overlay.querySelector('#registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = overlay.querySelector('#registerUsername').value;
        const password = overlay.querySelector('#registerPassword').value;
        await handleRegister(username, password);
        overlay.remove(); // Close modal after action
    });
}

async function handleLogin(username, password) {
    try {
        const response = await fetch(`${SERVER_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('snugos_token', data.token);
            loggedInUser = data.user; // Set local loggedInUser
            showNotification(`Welcome, ${data.user.username}!`, 2000);
            window.location.reload(); // Reload the page to fully initialize with logged-in user
        } else {
            showNotification(`Login failed: ${data.message}`, 3000);
        }
    } catch (error) {
        showNotification('Network error.', 3000);
        console.error("Login Error:", error);
    }
}

async function handleRegister(username, password) {
    try {
        const response = await fetch(`${SERVER_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.success) {
            showNotification('Registration successful! Please log in.', 2500);
        } else {
            showNotification(`Registration failed: ${data.message}`, 3000);
        }
    } catch (error) {
        showNotification('Network error.', 3000);
        console.error("Register Error:", error);
    }
}

function handleLogout() {
    localStorage.removeItem('snugos_token');
    loggedInUser = null;
    showNotification('You have been logged out.', 2000);
    window.location.reload(); // Reload the page to reflect logout status
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

// --- END Global UI and Utility Functions ---


// --- SnugWindow Related (If this file uses SnugWindows for sub-windows) ---
// This app is a standalone desktop itself, but it might open SnugWindows for viewers etc.
// Therefore, we need to populate appServices for its own SnugWindow instances.

document.addEventListener('DOMContentLoaded', () => {
    // Populate appServices for this standalone desktop's context
    appServices = {
        // SnugWindow management from windowState.js (imported above)
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        getWindowById: getWindowById, // from windowState.js
        addWindowToStore: addWindowToStore, // from windowState.js
        removeWindowFromStore: removeWindowFromStore, // from windowState.js
        incrementHighestZ: incrementHighestZ, // from windowState.js
        getHighestZ: getHighestZ, // from windowState.js
        setHighestZ: setHighestZ, // from windowState.js
        getOpenWindows: getOpenWindows, // from windowState.js
        serializeWindows: serializeWindows, // from windowState.js
        reconstructWindows: reconstructWindows, // from windowState.js

        // Utilities from utils.js (imported above)
        createContextMenu: createContextMenu, // from utils.js
        showNotification: showNotification, // Local showNotification
        showCustomModal: showCustomModal,   // Local showCustomModal
        openFileViewerWindow: openFileViewerWindow, // From fileViewerUI.js
        initializeFileViewerUI: initializeFileViewerUI, // From fileViewerUI.js

        // appState.js functions (for theming etc.)
        applyUserThemePreference: applyUserThemePreference, // Local function defined above
        setCurrentUserThemePreference: setCurrentUserThemePreference, // from appState.js
        getCurrentUserThemePreference: getCurrentUserThemePreference, // from appState.js

        // DB functions (from db.js)
        storeAudio: storeAudio,
        getAudio: getAudio,
        deleteAudio: deleteAudio,
        storeAsset: storeAsset,
        getAsset: getAsset,

        // General
        SERVER_URL: SERVER_URL,
    };

    loggedInUser = checkLocalAuth();
    
    // Attach desktop-level event listeners for this standalone page
    attachDesktopEventListeners();
    applyUserThemePreference(); // Apply theme for this page
    updateClockDisplay(); // Start clock
    initAudioOnFirstGesture(); // Initialize audio if this page can play sounds (e.g. for audio previews)
    
    // Initial render based on login status
    if (loggedInUser) {
        // Since this is now a full desktop app, we just initialize its UI and content.
        // The desktop elements are already in library.html.
        initializePageUI(document.body); // Pass body as the main container for finding elements
        loadAndApplyGlobals(); // Apply user background etc.
    } else {
        // If not logged in, show the login modal on the desktop area.
        const desktop = document.getElementById('desktop');
        if(desktop) {
            desktop.innerHTML = `<div class="w-full h-full flex items-center justify-center"><p class="text-xl" style="color:var(--text-primary);">Please log in to use SnugOS Browser.</p></div>`;
        }
        showLoginModal();
    }
});


// --- File Management Functions (Adapted for Standalone) ---

function initializePageUI(container) {
    const myFilesBtn = container.querySelector('#my-files-btn');
    const globalFilesBtn = container.querySelector('#global-files-btn');
    const uploadBtn = container.querySelector('#uploadFileBtn');
    const newFolderBtn = container.querySelector('#createFolderBtn');
    const actualFileInput = document.getElementById('actualFileInput'); // This is in the main document
    const snawAdminSection = container.querySelector('#snaw-admin-section'); // For admin view
    const viewAllFilesBtn = container.querySelector('#view-all-files-btn'); // For admin view

    // Admin section visibility
    if (loggedInUser?.username === 'snaw') {
        snawAdminSection?.classList.remove('hidden');
    } else {
        snawAdminSection?.classList.add('hidden');
        isAdminView = false;
    }

    const updateNavStyling = () => {
        if (myFilesBtn) {
            myFilesBtn.style.backgroundColor = currentViewMode === 'my-files' ? 'var(--accent-active)' : 'transparent';
            myFilesBtn.style.color = currentViewMode === 'my-files' ? 'var(--accent-active-text)' : 'var(--text-primary)';
        }
        if (globalFilesBtn) {
            globalFilesBtn.style.backgroundColor = currentViewMode === 'global' ? 'var(--accent-active)' : 'transparent';
            globalFilesBtn.style.color = currentViewMode === 'global' ? 'var(--accent-active-text)' : 'var(--text-primary)';
        }
    };
    
    if (myFilesBtn) myFilesBtn.addEventListener('click', () => {
        currentViewMode = 'my-files';
        currentPath = ['/'];
        fetchAndRenderLibraryItems(document.body); // Re-render main body
        updateNavStyling();
    });
    if (globalFilesBtn) globalFilesBtn.addEventListener('click', () => {
        currentViewMode = 'global';
        currentPath = ['/'];
        fetchAndRenderLibraryItems(document.body); // Re-render main body
        updateNavStyling();
    });

    [myFilesBtn, globalFilesBtn].forEach(btn => {
        if (!btn) return;
        const originalBg = btn.id === (currentViewMode === 'my-files' ? 'my-files-btn' : 'global-files-btn') ? 'var(--accent-active)' : 'transparent';
        btn.addEventListener('mouseenter', () => { if(btn.style.backgroundColor === originalBg || btn.style.backgroundColor === 'transparent') btn.style.backgroundColor = 'var(--bg-button-hover)'; });
        btn.addEventListener('mouseleave', () => { if(btn.style.backgroundColor !== 'var(--accent-active)') btn.style.backgroundColor = originalBg; });
    });

    if (uploadBtn) uploadBtn.addEventListener('click', () => actualFileInput.click());
    if (actualFileInput) actualFileInput.addEventListener('change', e => {
        handleFileUpload(e.target.files);
        e.target.value = null; // Clear input after selection
    });
    if (newFolderBtn) newFolderBtn.addEventListener('click', createFolder);

    if (viewAllFilesBtn) {
        viewAllFilesBtn.addEventListener('click', () => {
            isAdminView = !isAdminView;
            if (isAdminView) {
                currentPath = ['/'];
            }
            fetchAndRenderLibraryItems(document.body);
            // No navigation style update for admin view, it's a toggle.
        });
    }

    updateNavStyling();
    fetchAndRenderLibraryItems(document.body); // Initial fetch and render for the page itself
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
            { separator: true },
            { label: 'Refresh Files', action: () => fetchAndRenderLibraryItems(document.body) },
            { separator: true },
            { label: 'Change Background', action: () => document.getElementById('customBgInput').click() }
        ];
        createContextMenu(e, menuItems);
    });

    document.getElementById('customBgInput')?.addEventListener('change', async (e) => {
        if(!e.target.files || !e.target.files[0] || !loggedInUser) return;
        const file = e.target.files[0];
        
        showNotification("Uploading background...", 2000);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', '/backgrounds/'); // Fixed path
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
            loadAndApplyGlobals(); // Re-apply global background
        } catch(error) {
            showNotification(`Error: ${error.message}`, 4000);
        }
    });
}

function attachDesktopEventListeners() {
    // Top-level elements
    document.getElementById('startButton')?.addEventListener('click', toggleStartMenu);
    document.getElementById('menuLogin')?.addEventListener('click', () => { toggleStartMenu(); showLoginModal(); });
    document.getElementById('menuLogout')?.addEventListener('click', handleLogout);

    // Links in the start menu (will open new tabs/windows)
    document.getElementById('menuLaunchDaw')?.addEventListener('click', () => { window.open('/app/snaw.html', '_blank'); toggleStartMenu(); });
    document.getElementById('menuOpenLibrary')?.addEventListener('click', () => { window.open('/app/js/daw/browser/library.html', '_blank'); toggleStartMenu(); }); // Browser link
    document.getElementById('menuViewProfiles')?.addEventListener('click', () => { window.open('/app/js/daw/profiles/profile.html', '_blank'); toggleStartMenu(); }); // Profile link
    document.getElementById('menuOpenMessages')?.addEventListener('click', () => { window.open('/app/js/daw/messages/messages.html', '_blank'); toggleStartMenu(); }); // Messages link

    // Generic context menu for desktop background
    setupDesktopContextMenu();

    // Standard desktop clock and full screen
    document.getElementById('menuToggleFullScreen')?.addEventListener('click', toggleFullScreen);
}

async function loadAndApplyGlobals() {
    if (!loggedInUser) return;
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/profile/me`, { headers: { 'Authorization': `Bearer ${token}` } });
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

// --- File Management Functions ---

async function fetchAndRenderLibraryItems(container) {
    const fileViewArea = container.querySelector('#file-view-area');
    const pathDisplay = container.querySelector('#library-path-display');
    if (!fileViewArea || !pathDisplay) return;

    fileViewArea.innerHTML = `<p class="w-full text-center italic" style="color: var(--text-secondary);">Loading...</p>`;
    pathDisplay.textContent = currentPath.join('');

    const endpoint = currentViewMode === 'my-files' ? '/api/files/my' : '/api/files/public'; // Uses currentViewMode
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
            // Sort files and folders for consistent display
            data.items.sort((a, b) => {
                const aIsFolder = a.mime_type.includes('folder');
                const bIsFolder = b.mime_type.includes('folder');
                if (aIsFolder && !bIsFolder) return -1;
                if (!aIsFolder && bIsFolder) return 1;
                return a.file_name.localeCompare(b.file_name);
            });
            data.items.forEach(item => fileViewArea.appendChild(renderFileItem(item)));
        } else if (currentPath.length <= 1) {
            fileViewArea.innerHTML = `<p class="w-full text-center italic" style="color: var(--text-secondary);">This folder is empty.</p>`;
        }
    } catch (error) {
        fileViewArea.innerHTML = `<p class="w-full text-center italic" style="color: red;">${error.message}</p>`;
        showNotification(`Error loading files: ${error.message}`, 4000);
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

    itemDiv.innerHTML = `<div class="relative">${iconHtml}</div><p class="text-xs mt-1 w-full break-words truncate" title="${isParentFolder ? '..' : item.file_name}">${isParentFolder ? '..' : item.file_name}</p>`;

    const itemContainer = itemDiv.querySelector('.relative');
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'absolute top-0 right-0 flex flex-col space-y-1';

    if (!isParentFolder && loggedInUser && item.user_id === loggedInUser.id) {
        const shareBtn = document.createElement('button');
        shareBtn.innerHTML = `<svg class="w-4 h-4" title="Share" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
        shareBtn.className = 'p-1 rounded-full opacity-60 hover:opacity-100';
        shareBtn.style.backgroundColor = 'var(--bg-button)';
        shareBtn.addEventListener('click', (e) => { e.stopPropagation(); handleShareFile(item); });
        actionsContainer.appendChild(shareBtn);
        
        const privacyBtn = document.createElement('button');
        if (item.is_public) {
            privacyBtn.innerHTML = `<svg class="w-4 h-4" title="Make Private" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM8.9 6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2H8.9V6z"/></svg>`;
        } else {
            privacyBtn.innerHTML = `<svg class="w-4 h-4" title="Make Public" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/></svg>`;
        }
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
    if (isParentFolder) {
        if (currentPath.length > 1) currentPath.pop();
    } else if (item.mime_type && item.mime_type.includes('folder')) {
        currentPath.push(item.file_name + '/');
    } else {
        window.open(item.s3_url, '_blank');
        return;
    }
    fetchAndRenderLibraryItems(document.querySelector('.flex.h-full')); // Re-render library items
}

async function handleShareFile(item) {
    showNotification("Generating secure link...", 1500);
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/files/${item.id}/share-link`, {
            method: 'POST',
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
        fetchAndRenderLibraryItems(document.querySelector('.flex.h-full')); // Refresh library items
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
        fetchAndRenderLibraryItems(document.querySelector('.flex.h-full')); // Refresh library items
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
        const serverPath = `/${currentPath.slice(1).join('')}`;
        formData.append('path', serverPath);
        try {
            const token = localStorage.getItem('snugos_token');
            const response = await fetch(`${SERVER_URL}/api/files/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
        } catch (error) {
            showNotification(`Failed to upload '${file.name}': ${error.message}`, 5000);
        }
    }
    fetchAndRenderLibraryItems(document.querySelector('.flex.h-full')); // Refresh library items
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
                const response = await fetch(`${SERVER_URL}/api/folders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ name: folderName, path: currentPath.join('/') })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showNotification(`Folder '${folderName}' created!`, 2000);
                fetchAndRenderLibraryItems(document.querySelector('.flex.h-full')); // Refresh library items
            } catch (error) {
                showNotification(`Error: ${error.message}`, 5000);
            }
        }}
    ]);
}