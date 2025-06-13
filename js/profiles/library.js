// CORRECTED PATH
import { initializeBackgroundManager, applyCustomBackground, handleBackgroundUpload, loadAndApplyUserBackground } from '../backgroundManager.js';
import { SnugWindow } from '../daw/SnugWindow.js'; 


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
    // --- CRITICAL: Populate appServices first and ensure functions are defined ---
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
    
    // Background Manager specific appServices assignments
    appServices.getLoggedInUser = () => loggedInUser; 
    appServices.applyCustomBackground = applyCustomBackground;
    appServices.handleBackgroundUpload = handleBackgroundUpload;
    appServices.loadAndApplyUserBackground = loadAndApplyUserBackground; // Ensure this is set on appServices

    // Initialize background manager module with the main load function
    initializeBackgroundManager(appServices, loadAndApplyUserBackground); // PASSED loadAndApplyUserBackground

    // Now proceed with logic that might rely on appServices being fully populated
    loggedInUser = checkLocalAuth();
    
    attachDesktopEventListeners();
    applyUserThemePreference();
    updateClockDisplay();
    updateAuthUI(loggedInUser);
    
    if (loggedInUser) {
        openLibraryWindow();
        appServices.loadAndApplyUserBackground(); 
    } else {
        appServices.showCustomModal('Access Denied', '<p class="p-4">Please log in to use the Library.</p>', [{ label: 'Close' }]);
        appServices.loadAndApplyUserBackground(); 
    }
});

/**
 * Opens the main Library window or focuses it if already open.
 */
function openLibraryWindow() {
    const windowId = 'library';
    // Check if the window is already open
    if (appServices.getWindowById(windowId)) {
        appServices.getWindowById(windowId).focus();
        return;
    }
    // HTML content for the Library window
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
            <div class="flex-grow flex-col">
                <div class="p-2 border-b" style="border-color: var(--border-secondary);">
                    <div id="library-path-display" class="text-sm" style="color: var(--text-secondary);">/</div>
                </div>
                <div id="file-view-area" class="flex-grow p-4 overflow-y-auto flex flex-wrap content-start gap-4"></div>
            </div>
        </div>
    `;
    const desktopEl = document.getElementById('desktop');
    // Calculate optimal window size and position
    const options = { 
        width: Math.min(800, (desktopEl?.offsetWidth || 800) - 40), 
        height: Math.min(600, (desktopEl?.offsetHeight || 600) - 40), 
        x: (desktopEl?.offsetWidth || 0) * 0.15, 
        y: (desktopEl?.offsetHeight || 0) * 0.05 
    };
    // Create a new SnugWindow instance for the library
    const libWindow = new SnugWindow(windowId, 'File Explorer', contentHTML, options, appServices);
    initializePageUI(libWindow.element); // Initialize UI elements within the new window
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
    newFolderBtn?.addEventListener('click', createFolder);

    updateNavStyling(); // Initial styling update
    fetchAndRenderLibraryItems(container); // Initial fetch and render
}

/**
 * Attaches event listeners to desktop elements like start button, full screen toggle, etc.
 */
function attachDesktopEventListeners() {
    setupDesktopContextMenu(); // Set up right-click context menu for the desktop
    
    // Event listeners for taskbar buttons
    document.getElementById('startButton')?.addEventListener('click', toggleStartMenu);
    document.getElementById('menuToggleFullScreen')?.addEventListener('click', toggleFullScreen);
    document.getElementById('menuLogin')?.addEventListener('click', () => { toggleStartMenu(); showLoginModal(); });
    document.getElementById('menuLogout')?.addEventListener('click', () => { toggleStartMenu(); handleLogout(); });
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);

}

/**
 * Sets up the right-click context menu for the desktop area.
 */
function setupDesktopContextMenu() {
    const desktop = document.getElementById('desktop');
    const customBgInput = document.getElementById('customBgInput');

    if (!desktop || !customBgInput) return;

    desktop.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        // Prevent showing context menu if clicking inside a SnugWindow
        if (e.target.closest('.window')) return; 

        const menuItems = [
            {
                label: 'Change Background',
                action: () => customBgInput.click() 
            }
            // Add other desktop context menu items here if needed
        ];
        appServices.createContextMenu(e, menuItems, appServices);
    });

    // Central listener for the hidden file input
    customBgInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            appServices.handleBackgroundUpload(file); 
        }
        e.target.value = null; 
    });
}

/**
 * Fetches and renders library items (files and folders) based on current view mode and path.
 * @param {HTMLElement} container The main container element of the library window.
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
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`<span class="math-inline">\{SERVER\_URL\}</span>{endpoint}?path=${encodeURIComponent(currentPath.join('/'))}`, {
            headers: { 'Authorization': `Bearer ${token}` }
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
            data.items.forEach(item => fileViewArea.appendChild(renderFileItem(item)));
        } else if (currentPath.length <= 1) { // Display message if folder is empty at root level
            fileViewArea.innerHTML = `<p class="w-full text-center italic" style="color: var(--text-secondary);">This folder is empty.</p>`;
        }
    } catch (error) {
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
        iconHtml = `<svg class="w-16 h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 012-2V4a2 2 0 012-2zm7 1.5V9h5.5L13 3.5z"/></svg>`;
    }

    // Set inner HTML for the item
    itemDiv.innerHTML = `
        <div class="relative"><span class="math-inline">\{iconHtml\}</div\>
<p class\="text\-xs mt\-1 w\-full break\-words truncate" title\="</span>{isParentFolder ? '..' : item.file_name}">${isParentFolder ? '..' : item.file_name}</p>
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
 * @param {boolean} isParentFolder True if the item is the ".." parent folder.
 */
function handleItemClick(item, isParentFolder) {
    const libWindow = appServices.getWindowById('library');
    if (isParentFolder) {
        if (currentPath.length > 1) currentPath.pop(); // Go up one level
    } else if (item.mime_type && item.mime_type.includes('folder')) {
        currentPath.push(item.file_name + '/'); // Navigate into the folder
    } else {
        openFileViewerWindow(item); // Open the file viewer for actual files
        return;
    }
    if (libWindow) fetchAndRenderLibraryItems(libWindow.element); // Re-render library items
}

/**
 * Opens a new window to view the selected file.
 * @param {Object} item The file object to view.
 */
function openFileViewerWindow(item) {
    const windowId = `file-viewer-${item.id}`;
    if (appServices.getWindowById(windowId)) {
        appServices.getWindowById(windowId).focus();
        return;
    }
    let content = '';
    const fileType = item.mime_type || '';
    // Generate content based on file type
    if (fileType.startsWith('image/')) {
        content = `<img src="<span class="math-inline">\{item\.s3\_url\}" alt\="</span>{item.file_name}" class="w-full h-full object-contain">`;
    } else if (fileType.startsWith('video/')) {
        content = `<video src="${item.s3_url}" controls autoplay class="w-full h-full bg-black"></video>`;
    } else if (fileType.startsWith('audio/')) {
        content = `<div class="p-8 flex flex-col items-center justify-center h-full"><p class="mb-4 font-bold"><span class="math-inline">\{item\.file\_name\}</p\><audio src\="</span>{item.s3_url}" controls autoplay></audio></div>`;
    } else {
        content = `<div class="p-8 text-center"><p>Cannot preview this file type.</p><a href="${item.s3_url}" target="_blank" class="text-blue-400 hover:underline">Download file</a></div>`;
    }
    const options = { width: 640, height: 480 };
    new SnugWindow(windowId, `View: ${item.file_name}`, content, options, appServices);
}

/**
 * Generates and copies a shareable link for a file.
 * @param {Object} item The file object to share.
 */
async function handleShareFile(item) {
    appServices.showNotification("Generating secure link...", 1500); // Use appServices
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`<span class="math-inline">\{SERVER\_URL\}/api/files/</span>{item.id}/share-link`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        // Copy the generated share URL to clipboard
        navigator.clipboard.writeText(result.shareUrl).then(() => { // Using modern clipboard API
            appServices.showNotification("Sharable link copied! It expires in 1 hour.", 4000); // Use appServices
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            appServices.showNotification("Failed to copy link to clipboard. Please copy manually from console.", 4000);
            console.log("Share URL:", result.shareUrl);
        });
    }
