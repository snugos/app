// js/daw/profiles/library.js
// NOTE: This file is designed to run within an iframe, hosted by index.html.
// It receives `appServices` from its parent window.

import { SERVER_URL } from '../constants.js';
// SnugWindow is not needed in the iframe, it's handled by the parent
import { openFileViewerWindow } from '../ui/fileViewerUI.js'; // openFileViewerWindow is specific to library

// Corrected imports for DB, Constants, Utils
import { storeAudio, getAudio } from '../db.js'; // Corrected: import from main db.js
import * as Constants from '../constants.js'; // Corrected: import from main constants.js
import { showNotification, showCustomModal, createContextMenu } from '../utils.js'; // Corrected: import from main utils.js

let loggedInUser = null;
let currentPath = ['/']; // Represents the current path in the library browser, e.g., ['/', 'MyFolder/', 'SubFolder/']
let currentViewMode = 'my-files'; // 'my-files' or 'global'
let appServices = {}; // Will be populated by the parent window.

/**
 * Entry point function for the Library page when loaded within an iframe.
 * Initializes library-specific UI and functionality.
 * @param {object} injectedAppServices - The appServices object passed from the parent window.
 */
function initLibraryPageInIframe(injectedAppServices) {
    appServices = injectedAppServices;

    // Use appServices from parent for window/modal management
    // Fallback to local imports if parent appServices functions are not available
    appServices.showNotification = appServices.showNotification || window.parent.appServices.showNotification || showNotification;
    appServices.showCustomModal = appServices.showCustomModal || window.parent.appServices.showCustomModal || showCustomModal;
    appServices.createContextMenu = appServices.createContextMenu || window.parent.appServices.createContextMenu || createContextMenu;
    // Ensure openEmbeddedAppInWindow from welcome.js is accessible for nested window opening
    appServices.openEmbeddedAppInWindow = appServices.openEmbeddedAppInWindow || window.parent.appServices.openEmbeddedAppInWindow;
    appServices.openFileViewerWindow = appServices.openFileViewerWindow || window.parent.appServices.openFileViewerWindow || openFileViewerWindow; // Ensure file viewer is available

    // Auth status and background (relies on parent's appServices.getAsset/applyCustomBackground)
    loggedInUser = checkLocalAuth();
    loadAndApplyGlobals();
    
    attachLibraryEventListeners(); // Attach event listeners for the Library UI

    // If logged in, initialize UI elements and fetch/render library items
    if (loggedInUser) {
        initializePageUI(document.body.querySelector('.flex.h-full'));
        fetchAndRenderLibraryItems(document.body.querySelector('.flex.h-full'));
    } else {
        appServices.showCustomModal('Access Denied', '<p class="p-4">Please log in to use the Library.</p>', [{ label: 'Close' }]);
        document.body.querySelector('.flex.h-full').innerHTML = '<p class="p-8 text-center" style="color:red;">Please log in to use the Library.</p>';
    }
}

/**
 * Handles browser security restrictions by starting the audio context
 * only after the first user click on the page. (For previewing sounds).
 */
function initAudioOnFirstGesture() {
    const startAudio = async () => {
        // Tone.js is loaded in library.html for previewing sounds
        if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
            await Tone.start();
            console.log('AudioContext started successfully for Library preview.');
        }
        document.body.removeEventListener('mousedown', startAudio);
    };
    document.body.addEventListener('mousedown', startAudio);
}

/**
 * Loads and applies global user settings like background from the main appServices.
 */
async function loadAndApplyGlobals() {
    if (!loggedInUser) return;
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/profile/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.profile.background_url) {
            // Check if parent's appServices exists and has applyCustomBackground
            if (window.parent && window.parent.appServices && typeof window.parent.appServices.applyCustomBackground === 'function') {
                window.parent.appServices.applyCustomBackground(data.profile.background_url);
            }
        }
    } catch (error) {
        console.error("Could not apply global settings for Library iframe:", error);
    }
}

/**
 * Initializes the main UI elements and their event listeners within the Library page.
 * @param {HTMLElement} container - The main container element of the Library page.
 */
function initializePageUI(container) {
    const myFilesBtn = container.querySelector('#my-files-btn');
    const globalFilesBtn = container.querySelector('#global-files-btn');
    const uploadBtn = container.querySelector('#uploadFileBtn');
    const newFolderBtn = container.querySelector('#createFolderBtn');
    const actualFileInput = document.getElementById('actualFileInput');

    /** Updates the visual styling of the navigation buttons based on currentViewMode. */
    const updateNavStyling = () => {
        myFilesBtn.style.backgroundColor = currentViewMode === 'my-files' ? 'var(--accent-active)' : 'transparent';
        myFilesBtn.style.color = currentViewMode === 'my-files' ? 'var(--accent-active-text)' : 'var(--text-primary)';
        globalFilesBtn.style.backgroundColor = currentViewMode === 'global' ? 'var(--accent-active)' : 'transparent';
        globalFilesBtn.style.color = currentViewMode === 'global' ? 'var(--accent-active-text)' : 'var(--text-primary)';
    };
    
    // Event listeners for view mode buttons
    myFilesBtn.addEventListener('click', () => {
        currentViewMode = 'my-files';
        currentPath = ['/']; // Reset path to root
        fetchAndRenderLibraryItems(container);
        updateNavStyling();
    });
    globalFilesBtn.addEventListener('click', () => {
        currentViewMode = 'global';
        currentPath = ['/']; // Reset path to root
        fetchAndRenderLibraryItems(container);
        updateNavStyling();
    });

    // Hover effects for navigation buttons
    [myFilesBtn, globalFilesBtn].forEach(btn => {
        btn.addEventListener('mouseenter', () => { 
            // Only apply hover if not already active
            if(btn.style.backgroundColor === 'transparent' || btn.style.backgroundColor === 'var(--bg-button)') {
                btn.style.backgroundColor = 'var(--bg-button-hover)'; 
                btn.style.color = 'var(--text-button-hover)';
            }
        });
        btn.addEventListener('mouseleave', () => { 
            // Revert if not the active button
            if(btn.style.backgroundColor !== 'var(--accent-active)') {
                btn.style.backgroundColor = 'transparent'; 
                btn.style.color = 'var(--text-primary)';
            }
        });
    });

    // Event listeners for file operations
    uploadBtn?.addEventListener('click', () => actualFileInput.click());
    actualFileInput?.addEventListener('change', e => {
        handleFileUpload(e.target.files);
        e.target.value = null; // Clear input after selection
    });
    newFolderBtn?.addEventListener('click', createFolder);

    updateNavStyling(); // Set initial button styling
}

/**
 * Attaches global event listeners specific to the library iframe.
 * (Note: Some global listeners like theme toggle are handled by the parent `index.html`).
 */
function attachLibraryEventListeners() {
    // This function is currently empty as background upload is now part of profile.js and main.js auth.js
    // If there were other global listeners ONLY relevant to the library iframe, they would go here.
}

/**
 * Fetches and renders file items for the current path and view mode.
 * @param {HTMLElement} container - The main container element where files will be rendered.
 */
async function fetchAndRenderLibraryItems(container) {
    const fileViewArea = container.querySelector('#file-view-area');
    const pathDisplay = container.querySelector('#library-path-display');
    if (!fileViewArea || !pathDisplay) return;

    fileViewArea.innerHTML = `<p class="w-full text-center italic" style="color: var(--text-secondary);">Loading...</p>`;
    pathDisplay.textContent = `/${currentPath.slice(1).join('')}`; // Display path without the leading '/'

    const endpoint = currentViewMode === 'my-files' ? '/api/files/my' : '/api/files/public';
    // Construct the server path correctly, ensuring it's relative from root.
    const serverPath = currentPath.join(''); // e.g., '/' or '/MyFolder/'

    try {
        const token = localStorage.getItem('snugos_token');
        if (!token && currentViewMode === 'my-files') {
            throw new Error('Not authenticated. Please log in.');
        }
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const response = await fetch(`${SERVER_URL}${endpoint}?path=${encodeURIComponent(serverPath)}`, { headers });
        const data = await response.json();

        if (!response.ok) {
            // Specific error message for 401/403 for better user feedback
            if (response.status === 401 || response.status === 403) {
                 throw new Error('Authentication required or permission denied.');
            }
            throw new Error(data.message || 'Failed to fetch files');
        }

        fileViewArea.innerHTML = '';
        
        // Add ".." (parent directory) link if not at the root
        if (currentPath.length > 1) {
            fileViewArea.appendChild(renderFileItem({ file_name: '..', mime_type: 'folder' }, true));
        }

        if (data.items && data.items.length > 0) {
            // Sort folders first, then files, both alphabetically
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
        fileViewArea.innerHTML = `<p class="w-full text-center italic" style="color: red;">Error: ${error.message}</p>`;
        appServices.showNotification(`Library Error: ${error.message}`, 4000);
    }
}

/**
 * Renders a single file or folder item for display in the library.
 * @param {object} item - The file/folder item data from the server.
 * @param {boolean} [isParentFolder=false] - True if this represents the ".." (parent) folder.
 * @returns {HTMLElement} The created DOM element for the item.
 */
function renderFileItem(item, isParentFolder = false) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'flex flex-col items-center justify-start text-center cursor-pointer rounded-md p-2 w-24 h-28 file-item-container';
    itemDiv.style.color = 'var(--text-primary)';
    
    // Add hover effect via JS for theme consistency if not in CSS
    itemDiv.addEventListener('mouseenter', () => {
        itemDiv.style.backgroundColor = 'var(--bg-button-hover)';
        itemDiv.style.color = 'var(--text-button-hover)';
        itemDiv.querySelector('svg')?.style.fill = 'var(--text-button-hover)'; // Change SVG color on hover
        const img = itemDiv.querySelector('img');
        if (img) img.style.borderColor = 'var(--text-button-hover)'; // Change image border color
    });
    itemDiv.addEventListener('mouseleave', () => {
        itemDiv.style.backgroundColor = 'transparent';
        itemDiv.style.color = 'var(--text-primary)';
        itemDiv.querySelector('svg')?.style.fill = 'currentColor'; // Revert SVG color
        const img = itemDiv.querySelector('img');
        if (img) img.style.borderColor = 'var(--border-secondary)'; // Revert image border color
    });

    itemDiv.addEventListener('click', () => {
        // Remove selection from all other items first
        document.querySelectorAll('.file-item-container').forEach(el => {
            el.classList.remove('selected-file-item');
            el.style.backgroundColor = 'transparent'; // Ensure background reverts
            el.style.color = 'var(--text-primary)';
            el.querySelector('svg')?.style.fill = 'currentColor';
            const img = el.querySelector('img');
            if (img) img.style.borderColor = 'var(--border-secondary)';
        });
        // Add selection to clicked item
        itemDiv.classList.add('selected-file-item');
        itemDiv.style.backgroundColor = 'var(--accent-focus)';
        itemDiv.style.color = 'var(--accent-active-text)'; // Use text-button-hover for selected state text
        itemDiv.querySelector('svg')?.style.fill = 'var(--accent-active-text)';
        const img = itemDiv.querySelector('img');
        if (img) img.style.borderColor = 'var(--accent-active-text)';
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

    // Only show actions for owned files and if logged in
    if (!isParentFolder && loggedInUser && item.user_id === loggedInUser.id) {
        const shareBtn = document.createElement('button');
        shareBtn.innerHTML = `<svg class="w-4 h-4" title="Share" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4.715 6.542 3.343 7.914a.5.5 0 1 0 .707.707l1.414-1.414a.5.5 0 0 0 0-.707l-1.414-1.414a.5.5 0 1 0-.707.707l1.371 1.371z"/><path fill-rule="evenodd" d="M7.447 11.458a.5.5 0 0 0 .707 0l1.414-1.414a.5.5 0 1 0-.707-.707l-1.371 1.371a.5.5 0 0 0 0 .708l1.371 1.371a.5.5 0 1 0 .707-.707L7.447 11.458zM12.95 6.542a.5.5 0 0 0-.707-.707L10.828 7.25a.5.5 0 0 0 0 .707l1.414 1.414a.5.5 0 0 0 .707-.707L11.543 7.914l1.407-1.372z"/><path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM2.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 11.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-11 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>`;
        shareBtn.className = 'p-1 rounded-full opacity-60 hover:opacity-100';
        shareBtn.style.backgroundColor = 'var(--bg-button)';
        shareBtn.addEventListener('click', (e) => { e.stopPropagation(); handleShareFile(item); });
        actionsContainer.appendChild(shareBtn);
        
        const privacyBtn = document.createElement('button');
        // Use a more appropriate icon for public/private, e.g., lock/unlock
        privacyBtn.innerHTML = item.is_public ? 
            `<svg class="w-4 h-4" title="Public (Click to make private)" fill="currentColor" viewBox="0 0 16 16"><path d="M11 1.5a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-1 0v-13a.5.5 0 0 1 .5-.5zM9.05.435c.58-.58 1.52-.58 2.1 0l1.5 1.5c.58.58.58 1.519 0 2.098l-7.5 7.5a.5.5 0 0 1-.707 0l-1.5-1.5a.5.5 0 0 1 0-.707l7.5-7.5Z"/></svg>` : 
            `<svg class="w-4 h-4" title="Private (Click to make public)" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 1 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H8z"/></svg>`;
        
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

/**
 * Handles double-click on a file/folder item.
 * Navigates into folders or opens files in a viewer.
 * @param {object} item - The clicked item data.
 * @param {boolean} isParentFolder - True if it's the ".." parent folder.
 */
function handleItemClick(item, isParentFolder) {
    const libWindow = appServices.getWindowById('libraryApp'); // Get the current library window
    if (isParentFolder) {
        if (currentPath.length > 1) currentPath.pop(); // Go up one level
    } else if (item.mime_type.includes('folder')) {
        currentPath.push(item.file_name + '/'); // Navigate into folder
    } else {
        // Open file in a new SnugWindow using the parent's file viewer service
        appServices.openFileViewerWindow(item);
        return; // Prevent re-rendering the library if a file viewer is opened
    }
    if (libWindow) fetchAndRenderLibraryItems(libWindow.element); // Re-render the library content
}

/**
 * Handles sharing a file by generating a shareable link and copying it to clipboard.
 * @param {object} item - The file item to share.
 */
async function handleShareFile(item) {
    appServices.showNotification("Generating secure link...", 1500);
    try {
        const token = localStorage.getItem('snugos_token');
        if (!token) throw new Error("Authentication required to share files.");

        const response = await fetch(`${SERVER_URL}/api/files/${item.id}/share-link`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        await navigator.clipboard.writeText(result.shareUrl);
        appServices.showNotification("Sharable link copied! It expires in 1 hour.", 4000);
    } catch (error) {
        appServices.showNotification(`Could not generate link: ${error.message}`, 4000);
        console.error("Share File Error:", error);
    }
}

/**
 * Displays a modal to confirm toggling a file's public/private status.
 * @param {object} item - The file item to modify.
 */
function showShareModal(item) {
    const newStatus = !item.is_public;
    const actionText = newStatus ? "publicly available" : "private";
    const modalContent = `<p>Are you sure you want to make '${item.file_name}' ${actionText}?</p>`;
    appServices.showCustomModal('Confirm Action', modalContent, [
        { label: 'Cancel' },
        { label: 'Confirm', action: () => handleToggleFilePublic(item.id, newStatus) }
    ]);
}

/**
 * Toggles the public/private status of a file on the server.
 * @param {string} fileId - The ID of the file to modify.
 * @param {boolean} newStatus - The new public status (true for public, false for private).
 */
async function handleToggleFilePublic(fileId, newStatus) {
    try {
        const token = localStorage.getItem('snugos_token');
        if (!token) throw new Error("Authentication required to change file status.");

        const response = await fetch(`${SERVER_URL}/api/files/${fileId}/toggle-public`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ is_public: newStatus })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        appServices.showNotification('File status updated!', 2000);
        const libWindow = appServices.getWindowById('libraryApp');
        if (libWindow) fetchAndRenderLibraryItems(libWindow.element); // Re-render to show updated status
    } catch (error) {
        appServices.showNotification(`Error updating file status: ${error.message}`, 4000);
        console.error("Toggle Public Status Error:", error);
    }
}

/**
 * Displays a modal to confirm file deletion.
 * @param {object} item - The file item to delete.
 */
function showDeleteModal(item) {
    const modalContent = `<p>Permanently delete '${item.file_name}'?</p><p class="text-sm mt-2" style="color:var(--accent-armed);">This cannot be undone.</p>`;
    appServices.showCustomModal('Confirm Deletion', modalContent, [
        { label: 'Cancel' },
        { label: 'Delete', action: () => handleDeleteFile(item.id) }
    ]);
}

/**
 * Deletes a file from the server.
 * @param {string} fileId - The ID of the file to delete.
 */
async function handleDeleteFile(fileId) {
    try {
        const token = localStorage.getItem('snugos_token');
        if (!token) throw new Error("Authentication required to delete files.");

        const response = await fetch(`${SERVER_URL}/api/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        appServices.showNotification('File deleted!', 2000);
        const libWindow = appServices.getWindowById('libraryApp');
        if (libWindow) fetchAndRenderLibraryItems(libWindow.element); // Re-render to reflect deletion
    } catch (error) {
        appServices.showNotification(`Error deleting file: ${error.message}`, 4000);
        console.error("Delete File Error:", error);
    }
}

/**
 * Handles uploading multiple files to the current directory on the server.
 * @param {FileList} files - The files selected for upload.
 */
async function handleFileUpload(files) {
    if (!loggedInUser || files.length === 0) {
        appServices.showNotification("You must be logged in to upload files.", 3000);
        return;
    }
    appServices.showNotification(`Uploading ${files.length} file(s)...`, 3000);
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const serverPath = currentPath.join(''); // e.g., '/' or '/MyFolder/'
        formData.append('path', serverPath);
        try {
            const token = localStorage.getItem('snugos_token');
            const response = await fetch(`${SERVER_URL}/api/files/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            appServices.showNotification(`'${file.name}' uploaded successfully!`, 1500);
        } catch (error) {
            appServices.showNotification(`Failed to upload '${file.name}': ${error.message}`, 5000);
            console.error(`Upload Error for ${file.name}:`, error);
        }
    }
    const libWindow = appServices.getWindowById('libraryApp');
    if (libWindow) fetchAndRenderLibraryItems(libWindow.element); // Re-render after uploads
}

/**
 * Prompts the user for a folder name and creates a new folder on the server.
 */
function createFolder() {
    if (!loggedInUser) {
        appServices.showNotification("You must be logged in to create folders.", 3000);
        return;
    }
    appServices.showCustomModal('Create New Folder', `<input type="text" id="folderNameInput" class="w-full p-2" style="background-color: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-input);" placeholder="Folder Name">`, [
        { label: 'Cancel' },
        { label: 'Create', action: async ()=>{
            const folderName = document.getElementById('folderNameInput').value.trim();
            if (!folderName) {
                appServices.showNotification("Folder name cannot be empty.", 2000);
                return;
            }
            try {
                const token = localStorage.getItem('snugos_token');
                const serverPath = currentPath.join(''); // e.g., '/' or '/MyFolder/'
                const response = await fetch(`${SERVER_URL}/api/folders`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name: folderName, path: serverPath }) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                appServices.showNotification(`Folder '${folderName}' created!`, 2000);
                const libWindow = appServices.getWindowById('libraryApp');
                if (libWindow) fetchAndRenderLibraryItems(libWindow.element);
            } catch (error) {
                appServices.showNotification(`Error creating folder: ${error.message}`, 5000);
                console.error("Create Folder Error:", error);
            }
        }}
    ]);
}

/**
 * Checks local storage for authentication token and returns user info if authenticated.
 * @returns {object|null} User object if authenticated, otherwise null.
 */
function checkLocalAuth() {
    try {
        const token = localStorage.getItem('snugos_token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) { // Check if token is expired
            localStorage.removeItem('snugos_token');
            return null;
        }
        return { id: payload.id, username: payload.username };
    } catch (e) {
        console.error("Error parsing local auth token:", e);
        localStorage.removeItem('snugos_token');
        return null;
    }
}

/**
 * Handles user logout.
 */
function handleLogout() {
    localStorage.removeItem('snugos_token');
    loggedInUser = null;
    appServices.showNotification('You have been logged out.', 2000);
    // If logout in iframe should affect parent, it needs to call parent's logout.
    if (window.parent && window.parent.appServices && typeof window.parent.appServices.handleLogout === 'function') { 
        window.parent.appServices.handleLogout(); // Call parent's logout
    } else {
        window.location.reload(); // Fallback for standalone page
    }
}

// These functions are for the parent window/app and are not directly used/needed by the iframe itself.
// They are kept here from the original structure but would typically be in the parent's script.
function updateClockDisplay() {} 
function toggleStartMenu() {}
function toggleFullScreen() {}
function showLoginModal() {} // The parent index.html handles this modal
function applyUserThemePreference() {} // The parent index.html handles this