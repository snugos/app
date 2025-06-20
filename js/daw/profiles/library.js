// js/daw/profiles/library.js
// NOTE: This file is designed to run within an iframe, hosted by library.html.
// It receives `appServices` from its parent window.

import { SERVER_URL } from '/app/js/daw/constants.js'; // Corrected path
// SnugWindow is not imported here, as this script runs inside an existing SnugWindow iframe.
// It is the parent window's responsibility to create and manage SnugWindows.
// openFileViewerWindow is specific to library, so it's imported and called directly.
import { openFileViewerWindow, initializeFileViewerUI } from '/app/js/daw/ui/fileViewerUI.js'; // Corrected path

// We explicitly import common utilities and DB functions.
import { storeAudio, getAudio } from '/app/js/daw/db.js'; // Corrected path
import * as Constants from '/app/js/daw/constants.js'; // Corrected path
import { showNotification, showCustomModal, createContextMenu } from '/app/js/daw/utils.js'; // Corrected path

let loggedInUser = null;
let currentPath = ['/'];
let currentViewMode = 'my-files';
let appServices = {}; // This will be assigned the actual appServices object from the parent.

/**
 * Entry point function for the Library page when loaded within an iframe.
 * This function is called by the parent window's `initializePage` function.
 * @param {object} injectedAppServices - The appServices object passed from the parent window.
 */
function initLibraryPageInIframe(injectedAppServices) {
    appServices = injectedAppServices; // Assign the injected appServices

    // Initialize UI sub-modules that library.js might call directly
    initializeFileViewerUI(appServices);

    // Use appServices for window/modal management (ensure parent's services are used)
    // These checks ensure that if parent.appServices is not fully defined, it falls back to local imports.
    // However, in the final structure, parent.appServices should be fully defined.
    // REMOVED: appServices.showNotification = appServices.showNotification || window.parent.appServices.showNotification;
    // REMOVED: appServices.showCustomModal = appServices.showCustomModal || window.parent.appServices.showCustomModal;
    // REMOVED: appServices.createContextMenu = appServices.createContextMenu || window.parent.appServices.createContextMenu;
    // REMOVED: appServices.openEmbeddedAppInWindow = appServices.openEmbeddedAppInWindow || window.parent.appServices.openEmbeddedAppInWindow;
    // REMOVED: appServices.applyCustomBackground = appServices.applyCustomBackground || window.parent.appServices.applyCustomBackground;
    
    // Check local authentication status.
    loggedInUser = checkLocalAuth();
    // Load user's global settings (like background) via parent's appServices.
    loadAndApplyGlobals();
    
    // Original library functions that still run
    attachLibraryEventListeners();
    initAudioOnFirstGesture(); // Initialize audio for previews.
    
    // Open the library UI if a user is logged in, otherwise show a login prompt.
    if (loggedInUser) {
        initializePageUI(document.body.querySelector('.flex.h-full'));
        fetchAndRenderLibraryItems(document.body.querySelector('.flex.h-full'));
    } else {
        appServices.showCustomModal('Access Denied', '<p class="p-4">Please log in to use the Library.</p>', [{ label: 'Close' }]);
        document.body.querySelector('.flex.h-full').innerHTML = '<p class="p-8 text-center" style="color:red;">Please log in to use the Library.</p>';
    }
}

// Make the initialization function globally accessible for the parent window.
window.initLibraryPageInIframe = initLibraryPageInIframe;

/**
 * Initializes Tone.js AudioContext on the first user gesture for sound previews.
 */
function initAudioOnFirstGesture() {
    const startAudio = async () => {
        // Tone.js is loaded in library.html for previewing sounds
        if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
            try {
                await Tone.start();
                console.log('AudioContext started successfully for Library preview.');
            } catch (e) { console.error('Could not start AudioContext:', e); }
        }
        document.body.removeEventListener('mousedown', startAudio);
    };
    document.body.addEventListener('mousedown', startAudio);
}

/**
 * Loads and applies global settings for the logged-in user from the parent appServices,
 * such as a custom background.
 */
async function loadAndApplyGlobals() {
    if (!loggedInUser) return; // Only proceed if a user is logged in
    try {
        const token = localStorage.getItem('snugos_token'); // Retrieve authentication token
        const response = await fetch(`${SERVER_URL}/api/profile/me`, {
            headers: { 'Authorization': `Bearer ${token}` } // Authorize the request
        });
        const data = await response.json();
        if (data.success && data.profile.background_url) {
            // Apply background image to the parent desktop if parent has the service.
            if (window.parent && window.parent.appServices && typeof window.parent.appServices.applyCustomBackground === 'function') {
                window.parent.appServices.applyCustomBackground(data.profile.background_url);
            }
        }
    }
    catch (error) {
        console.error("Could not apply global settings:", error);
    }
}

/**
 * Initializes event listeners and styling for the Library page UI elements.
 * @param {HTMLElement} container The main container element of the library window.
 */
function initializePageUI(container) {
    const myFilesBtn = container.querySelector('#my-files-btn');
    const globalFilesBtn = container.querySelector('#global-files-btn');
    const uploadBtn = container.querySelector('#uploadFileBtn');
    const newFolderBtn = container.querySelector('#createFolderBtn');
    const actualFileInput = document.getElementById('actualFileInput');

    // Function to update navigation button styling based on current view mode
    const updateNavStyling = () => {
        myFilesBtn.style.backgroundColor = currentViewMode === 'my-files' ? 'var(--accent-active)' : 'transparent';
        myFilesBtn.style.color = currentViewMode === 'my-files' ? 'var(--accent-active-text)' : 'var(--text-primary)';
        globalFilesBtn.style.backgroundColor = currentViewMode === 'global' ? 'var(--accent-active)' : 'transparent';
        globalFilesBtn.style.color = currentViewMode === 'global' ? 'var(--accent-active-text)' : 'var(--text-primary)';
    };
    
    // Event listener for "My Files" button
    myFilesBtn.addEventListener('click', () => {
        currentViewMode = 'my-files';
        currentPath = ['/']; // Reset path for "My Files"
        fetchAndRenderLibraryItems(container); // Fetch and render items
        updateNavStyling(); // Update button styling
    });
    // Event listener for "Global" button
    globalFilesBtn.addEventListener('click', () => {
        currentViewMode = 'global';
        currentPath = ['/']; // Reset path for "Global"
        fetchAndRenderLibraryItems(container); // Fetch and render items
        updateNavStyling(); // Update button styling
    });

    // Add hover effects to buttons
    [myFilesBtn, globalFilesBtn, uploadBtn, newFolderBtn].forEach(btn => {
        if (!btn) return;
        const originalBg = btn.id.includes('-files-btn') ? 'transparent' : 'var(--bg-button)';
        btn.addEventListener('mouseenter', () => { if(btn.style.backgroundColor === originalBg || btn.style.backgroundColor === '') btn.style.backgroundColor = 'var(--bg-button-hover)'; });
        btn.addEventListener('mouseleave', () => { if(btn.style.backgroundColor !== 'var(--accent-active)') btn.style.backgroundColor = originalBg; });
    });

    // Event listeners for "Upload File" and "New Folder" buttons
    uploadBtn?.addEventListener('click', () => document.getElementById('actualFileInput').click());
    actualFileInput?.addEventListener('change', e => {
        handleFileUpload(e.target.files);
        e.target.value = null; // Clear the input after file selection
    });
    newFolderBtn?.addEventListener('click', createFolder);

    updateNavStyling(); // Initial styling update
    fetchAndRenderLibraryItems(container); // Initial fetch and render
}

/**
 * Attaches event listeners to elements that exist globally on the library page's HTML.
 */
function attachLibraryEventListeners() {
    // The customBgInput listener (for changing desktop background)
    // is specific to the parent window's desktop. However, if the iframe itself
    // had elements that triggered a background change on the *parent*, this would be the place.
    // The provided old library.js doesn't have such elements directly.
    // This function will remain empty for now based on the provided old code.
}

/**
 * Fetches and renders library items (files and folders) based on current view mode and path.
 * @param {HTMLElement} container The container where files will be rendered.
 */
async function fetchAndRenderLibraryItems(container) {
    const fileViewArea = container.querySelector('#file-view-area');
    const pathDisplay = container.querySelector('#library-path-display');
    if (!fileViewArea || !pathDisplay) return;

    fileViewArea.innerHTML = `<p class="w-full text-center italic" style="color: var(--text-secondary);">Loading...</p>`;
    pathDisplay.textContent = currentPath.join(''); // Update path display

    // Determine the API endpoint based on current view mode
    const endpoint = currentViewMode === 'my-files' ? '/api/files/my' : '/api/files/public';
    try {
        const token = localStorage.getItem('snugos_token'); // Retrieve authentication token
        const response = await fetch(`${SERVER_URL}${endpoint}?path=${encodeURIComponent(currentPath.join('/'))}`, {
            headers: { 'Authorization': `Bearer ${token}` } // Authorize the request
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch files');
        
        fileViewArea.innerHTML = ''; // Clear previous content
        // Add ".." (parent folder) item if not at root
        if (currentPath.length > 1) {
            fileViewArea.appendChild(renderFileItem({ file_name: '..', mime_type: 'folder' }, true));
        }
        // Render fetched items
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
        } else if (currentPath.length <= 1) { // Display message if folder is empty at root level
            fileViewArea.innerHTML = `<p class="w-full text-center italic" style="color: var(--text-secondary);">This folder is empty.</p>`;
        }
    }
    catch (error) {
        fileViewArea.innerHTML = `<p class="w-full text-center italic" style="color: red;">${error.message}</p>`;
    }
}

/**
 * Renders a single file or folder item for display in the library.
 * Includes action buttons (share, toggle public/private, delete) for owned files.
 * @param {Object} item The file or folder object.
 * @param {boolean} isParentFolder True if this item represents the ".." parent folder.
 * @returns {HTMLElement} The created div element for the file item.
 */
function renderFileItem(item, isParentFolder = false) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'flex flex-col items-center justify-start text-center cursor-pointer rounded-md p-2 w-24 h-28 file-item-container';
    itemDiv.style.color = 'var(--text-primary)';
    
    // Add click and double-click listeners
    itemDiv.addEventListener('click', () => {
        document.querySelectorAll('.file-item-container').forEach(el => el.style.backgroundColor = 'transparent');
        itemDiv.style.backgroundColor = 'var(--accent-focus)';
    });
    itemDiv.addEventListener('dblclick', () => handleItemClick(item, isParentFolder));

    let iconHtml = '';
    const mime = isParentFolder ? 'folder' : (item.mime_type || '');

    // Determine icon based on MIME type or if it's a parent folder
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

    // Set inner HTML for the item
    itemDiv.innerHTML = `
        <div class="relative">${iconHtml}</div>
        <p class="text-xs mt-1 w-full break-words truncate" title="${isParentFolder ? '..' : item.file_name}">${isParentFolder ? '..' : item.file_name}</p>
        ${(currentViewMode === 'global' && item.owner_username) ? `<p class="text-xs opacity-60 truncate">by ${item.owner_username}</p>` : ''}
    `;

    // Add action buttons for owned files (share, toggle public/private, delete)
    const itemContainer = itemDiv.querySelector('.relative');
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'absolute top-0 right-0 flex flex-col space-y-1';

    if (!isParentFolder && loggedInUser && item.user_id === loggedInUser.id) {
        // Share button
        const shareBtn = document.createElement('button');
        shareBtn.innerHTML = `<svg class="w-4 h-4" title="Share" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
        shareBtn.className = 'p-1 rounded-full opacity-60 hover:opacity-100';
        shareBtn.style.backgroundColor = 'var(--bg-button)';
        shareBtn.addEventListener('click', (e) => { e.stopPropagation(); handleShareFile(item); });
        actionsContainer.appendChild(shareBtn);
        
        // Public/Private toggle button
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

        // Delete button
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

/**
 * Handles clicks (and double clicks) on file and folder items.
 * Navigates into folders or opens the file viewer for files.
 * @param {Object} item The clicked file or folder object.
 * @param {boolean} isParentFolder True if this item represents the ".." parent folder.
 */
function handleItemClick(item, isParentFolder) {
    const libWindow = appServices.getWindowById('libraryApp'); // Assuming appServices.getWindowById is available.
    if (isParentFolder) {
        if (currentPath.length > 1) currentPath.pop(); // Go up one level
    } else if (item.mime_type && item.mime_type.includes('folder')) {
        currentPath.push(item.file_name + '/'); // Navigate into the folder
    } else {
        // Now, clicking on a file within the Library iframe should open it in a new SnugWindow
        // on the parent (index.html) desktop via openFileViewerWindow imported from fileViewerUI.js.
        openFileViewerWindow(item);
        return;
    }
    if (libWindow) fetchAndRenderLibraryItems(libWindow.element); // Re-render library items
}

/**
 * Generates and copies a shareable link for a file.
 * @param {Object} item The file object to share.
 */
async function handleShareFile(item) {
    appServices.showNotification("Generating secure link...", 1500); // Assuming appServices.showNotification is available.
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/files/${item.id}/share-link`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        // Copy the generated share URL to clipboard
        await navigator.clipboard.writeText(result.shareUrl); // Using modern clipboard API
        appServices.showNotification("Sharable link copied! It expires in 1 hour.", 4000);
    } catch (error) {
        appServices.showNotification(`Could not generate link: ${error.message}`, 4000);
    }
}

/**
 * Shows a confirmation modal for changing a file's public/private status.
 * @param {Object} item The file object to modify.
 */
function showShareModal(item) {
    const newStatus = !item.is_public;
    const actionText = newStatus ? "publicly available" : "private";
    const modalContent = `<p>Make '${item.file_name}' ${actionText}?</p>`;
    appServices.showCustomModal('Confirm Action', modalContent, [
        { label: 'Cancel' },
        { label: 'Confirm', action: () => handleToggleFilePublic(item.id, newStatus) }
    ]);
}

/**
 * Toggles the public/private status of a file.
 * @param {string} fileId The ID of the file to modify.
 * @param {boolean} newStatus The new public status (true for public, false for private).
 */
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
        appServices.showNotification('File status updated!', 2000);
        // Refresh the library window to reflect changes
        const libWindow = appServices.getWindowById('libraryApp'); // Assuming appServices.getWindowById is available.
        if (libWindow) fetchAndRenderLibraryItems(libWindow.element);
    } catch (error) {
        appServices.showNotification(`Error: ${error.message}`, 4000);
    }
}

/**
 * Shows a confirmation modal before deleting a file.
 * @param {Object} item The file object to delete.
 */
function showDeleteModal(item) {
    const modalContent = `<p>Permanently delete '${item.file_name}'?</p><p class="text-sm mt-2" style="color:var(--accent-armed);">This cannot be undone.</p>`;
    appServices.showCustomModal('Confirm Deletion', modalContent, [
        { label: 'Cancel' },
        { label: 'Delete', action: () => handleDeleteFile(item.id) }
    ]);
}

/**
 * Deletes a file from the server and refreshes the library.
 * @param {string} fileId - The ID of the file to delete.
 */
async function handleDeleteFile(fileId) {
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        appServices.showNotification('File deleted!', 2000);
        // Refresh the library window to reflect changes
        const libWindow = appServices.getWindowById('libraryApp'); // Assuming appServices.getWindowById is available.
        if (libWindow) fetchAndRenderLibraryItems(libWindow.element);
    } catch (error) {
        appServices.showNotification(`Error: ${error.message}`, 4000);
    }
}

/**
 * Handles the upload of multiple files to the current path.
 * @param {FileList} files The files to upload.
 */
async function handleFileUpload(files) {
    if (!loggedInUser || files.length === 0) return;
    appServices.showNotification(`Uploading ${files.length} file(s)...`, 3000);
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
            appServices.showNotification(`Failed to upload '${file.name}': ${error.message}`, 5000);
        }
    }
    const libWindow = appServices.getWindowById('libraryApp'); // Assuming appServices.getWindowById is available.
    if (libWindow) fetchAndRenderLibraryItems(libWindow.element);
}

/**
 * Prompts the user for a folder name and creates a new folder on the server.
 */
function createFolder() {
    if (!loggedInUser) return;
    appServices.showCustomModal('Create New Folder', `<input type="text" id="folderNameInput" class="w-full p-2" style="background-color: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-input);" placeholder="Folder Name">`, [
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
                // Refresh the library window after folder creation
                const libWindow = appServices.getWindowById('libraryApp'); // Assuming appServices.getWindowById is available.
                if (libWindow) fetchAndRenderLibraryItems(libWindow.element);
            } catch (error) {
                showNotification(`Error: ${error.message}`, 5000);
            }
        }}
    ]);
}

/**
 * Checks for a valid authentication token in local storage and returns user info if valid.
 * @returns {Object|null} The logged-in user's ID and username, or null if no valid token.
 */
function checkLocalAuth() {
    try {
        const token = localStorage.getItem('snugos_token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) { // Check if token is expired.
            localStorage.removeItem('snugos_token'); // Remove expired token.
            return null;
        }
        return { id: payload.id, username: payload.username };
    } catch (e) {
        localStorage.removeItem('snugos_token'); // Clear token on error during parsing.
        return null;
    }
}

/**
 * Handles user logout. This function is specific to the iframe context.
 * It will trigger the parent's logout function for a consistent experience.
 */
function handleLogout() {
    localStorage.removeItem('snugos_token');
    loggedInUser = null; // Clear local user state.
    appServices.showNotification('You have been logged out.', 2000);
    // Call the parent window's logout function if available.
    if (window.parent && window.parent.appServices && typeof window.parent.appServices.handleLogout === 'function') {
        window.parent.appServices.handleLogout(); 
    } else {
        window.location.reload(); // Fallback: reload the iframe if no parent handler.
    }
}