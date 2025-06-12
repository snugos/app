// js/profiles/library.js - Main JavaScript for the independent Library Page

import { showNotification, showCustomModal, getThemeColors } from './profileUtils.js';
import { getAsset } from './profileDb.js';

const SERVER_URL = 'https://snugos-server-api.onrender.com'; // Your backend server URL

let loggedInUser = null; // Store logged-in user info
let currentPath = []; // Track the current folder path

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loggedInUser = checkLocalAuth(); // Check if user is logged in
    if (!loggedInUser) {
        document.getElementById('library-container').innerHTML = `
            <div class="text-center p-12 bg-window text-primary border border-primary rounded-lg shadow-window">
                <h1 class="text-2xl font-bold mb-4">Access Denied</h1>
                <p>You must be logged in to view your library. Please <a href="index.html" class="text-blue-400 hover:underline">login</a> first.</p>
            </div>
        `;
        return;
    }

    initializePageUI();
    attachEventListeners(); // Global listeners for top bar
    fetchAndRenderLibraryItems(); // Fetch items for the current path
});

function initializePageUI() {
    // Dynamically update top taskbar for logged-in user
    updateAuthUI(loggedInUser);
    applyUserThemePreference(); // Apply user theme

    // Attach listeners for file browser toolbar buttons
    const uploadFileBtn = document.getElementById('uploadFileBtn');
    const createFolderBtn = document.getElementById('createFolderBtn');
    const actualFileInput = document.getElementById('actualFileInput'); // The hidden file input

    uploadFileBtn?.addEventListener('click', () => {
        actualFileInput.click(); // Trigger the hidden file input
    });

    actualFileInput?.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
        e.target.value = null; // Clear the input
    });

    // Dropzone logic (reusing old dropzone ID for simplicity)
    const dropZone = document.getElementById('file-upload-dropzone'); // In the upload new file section
    if (dropZone) { // Check if the element exists in this version of HTML
        const colors = getThemeColors();
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault(); e.stopPropagation();
            dropZone.style.backgroundColor = colors.bgDropzoneDragover;
            dropZone.style.borderColor = colors.borderDropzoneDragover;
            dropZone.style.color = colors.textDropzoneDragover;
        });
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault(); e.stopPropagation();
            dropZone.style.backgroundColor = colors.bgDropzone;
            dropZone.style.borderColor = colors.borderDropzone;
            dropZone.style.color = colors.textDropzone;
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault(); e.stopPropagation();
            dropZone.style.backgroundColor = colors.bgDropzone;
            dropZone.style.borderColor = colors.borderDropzone;
            dropZone.style.color = colors.textDropzone;
            handleFileUpload(e.dataTransfer.files);
        });
    }

    createFolderBtn?.addEventListener('click', createFolder); // Handler for new folder
}

function attachEventListeners() {
    // Top taskbar login/logout/theme
    document.getElementById('loginBtnTop')?.addEventListener('click', showLoginModal);
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
}

// --- File Upload Logic (now triggered by actualFileInput) ---
async function handleFileUpload(files) {
    if (!loggedInUser) {
        showNotification('You must be logged in to upload files.', 3000);
        return;
    }
    if (files.length === 0) return;

    showNotification(`Uploading ${files.length} file(s)...`, 3000);

    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_public', 'true'); // Default to public for now
        // Add path to formData for folder support
        formData.append('path', currentPath.join('/') + '/'); // currentPath global

        try {
            const token = localStorage.getItem('snugos_token');
            const response = await fetch(`${SERVER_URL}/api/files/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showNotification(`'${file.name}' uploaded successfully!`, 2000);
                fetchAndRenderLibraryItems(); // Refresh the list
            } else {
                throw new Error(result.message || 'Unknown upload error.');
            }
        } catch (error) {
            showNotification(`Failed to upload '${file.name}': ${error.message}`, 5000);
            console.error('File upload error:', error);
        }
    }
}

// --- Create Folder Logic ---
async function createFolder() {
    if (!loggedInUser) {
        showNotification('You must be logged in to create folders.', 3000);
        return;
    }

    const colors = getThemeColors();
    const modalContent = `
        <div class="space-y-4">
            <label class="text-primary">Folder Name:</label>
            <input type="text" id="folderNameInput" placeholder="New Folder" class="w-full p-2 border rounded-md" style="background-color: ${colors.bgInput}; color: ${colors.textPrimary}; border-color: ${colors.borderInput};">
        </div>
    `;

    const buttons = [
        { label: 'Cancel', action: () => {} },
        { label: 'Create', action: async () => {
            const folderName = document.getElementById('folderNameInput').value;
            if (!folderName.trim()) {
                showNotification('Folder name cannot be empty.', 2000);
                return;
            }
            // Backend will handle the actual creation
            showNotification(`Creating folder '${folderName}'...`, 1500);
            try {
                const token = localStorage.getItem('snugos_token');
                const response = await fetch(`${SERVER_URL}/api/folders`, { // NEW Backend Endpoint
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name: folderName, path: currentPath.join('/') }) // currentPath global
                });
                const result = await response.json();
                if (response.ok && result.success) {
                    showNotification(`Folder '${folderName}' created!`, 2000);
                    fetchAndRenderLibraryItems(); // Refresh items
                } else {
                    throw new Error(result.message || 'Failed to create folder.');
                }
            } catch (error) {
                showNotification(`Error creating folder: ${error.message}`, 5000);
                console.error('Create folder error:', error);
            }
        }}
    ];

    showCustomModal('Create New Folder', modalContent, buttons);
}

// --- Fetch & Render Library Items ---
async function fetchAndRenderLibraryItems() { // Renamed from fetchAndRenderMyFiles
    const fileViewArea = document.getElementById('file-view-area');
    const pathDisplay = document.getElementById('library-path-display'); // New path display element
    if (!fileViewArea || !pathDisplay || !loggedInUser) return;

    fileViewArea.innerHTML = '<p class="text-gray-500 italic text-center col-span-full">Loading items...</p>';
    pathDisplay.textContent = `/${currentPath.join('/')}`; // Update path display

    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/files/my?path=${encodeURIComponent(currentPath.join('/'))}`, { // Add path query param
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            if (data.items && data.items.length > 0) { // Data now contains 'items' (files+folders)
                fileViewArea.innerHTML = ''; // Clear "Loading items..."

                // Add ".." (Parent Folder) item if not in root
                if (currentPath.length > 0) {
                    const parentFolderDiv = renderFileItem({
                        id: '..',
                        file_name: '..',
                        type: 'folder',
                        is_public: false, // Irrelevant for parent, but needed by renderer
                        s3_url: '' // Not applicable
                    }, true); // Pass true for isParentFolder
                    fileViewArea.appendChild(parentFolderDiv);
                }

                data.items.forEach(item => { // Loop through items (files and folders)
                    fileViewArea.appendChild(renderFileItem(item)); // Render each item
                });
            } else {
                fileViewArea.innerHTML = '<p class="text-gray-500 italic text-center col-span-full">This folder is empty.</p>';
            }
        } else {
            throw new Error(data.message || 'Could not fetch files.');
        }
    } catch (error) {
        showNotification(`Error fetching items: ${error.message}`, 5000);
        console.error('Fetch items error:', error);
        fileViewArea.innerHTML = `<p class="text-red-500 text-center col-span-full">Error loading items: ${error.message}</p>`;
    }
}

// --- Render Single File/Folder Item ---
function renderFileItem(item, isParentFolder = false) { // New helper function
    const colors = getThemeColors();
    const itemDiv = document.createElement('div');
    itemDiv.className = 'file-item'; // Apply the general file-item class

    let iconHtml = '';
    let itemName = item.file_name;
    let clickAction = () => handleItemClick(item, isParentFolder); // New click handler

    if (isParentFolder) {
        itemName = '..';
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12 text-primary">
                        <path d="M12 2L4 9v11h16V9l-8-7zM6 18v-8h12v8H6zm3-1h6v-2H9v2z"/>
                    </svg>`; // Up-folder icon
    } else if (item.mime_type === 'application/vnd.snugos.folder') { // Custom MIME type for folders
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12 text-primary">
                        <path fill-rule="evenodd" d="M19.5 9a7.5 7.5 0 100 6h-15a.75.75 0 000 1.5h15.75A3.75 3.75 0 0023.25 15V9.75a.75.75 0 00-.75-.75H19.5z" clip-rule="evenodd" />
                        <path fill-rule="evenodd" d="M3.75 9H1.5a.75.75 0 00-.75.75V15a3.75 3.75 0 003.75 3.75h1.5a.75.75 0 000-1.5H3.75A2.25 2.25 0 011.5 15V9.75c0-.414.336-.75.75-.75H3.75a.75.75 0 000-1.5z" clip-rule="evenodd" />
                    </svg>`; // Generic folder icon
        itemDiv.dataset.itemId = item.id; // Store folder ID
        itemDiv.dataset.itemType = 'folder'; // Identify as folder
    } else if (item.mime_type.startsWith('image/')) {
        iconHtml = `<img src="${item.s3_url}" alt="${item.file_name}" class="max-h-24 w-auto object-contain mb-2">`;
        itemDiv.dataset.itemId = item.id;
        itemDiv.dataset.itemType = 'file';
    } else if (item.mime_type.startsWith('audio/')) {
        iconHtml = `<audio controls src="${item.s3_url}" class="w-full mb-2"></audio>`;
        itemDiv.dataset.itemId = item.id;
        itemDiv.dataset.itemType = 'file';
    } else if (item.mime_type.startsWith('video/')) {
        iconHtml = `<video controls src="${item.s3_url}" class="w-full mb-2"></video>`;
        itemDiv.dataset.itemId = item.id;
        itemDiv.dataset.itemType = 'file';
    } else {
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12 text-primary">
                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                    </svg>`; // Generic document icon
        itemDiv.dataset.itemId = item.id;
        itemDiv.dataset.itemType = 'file';
    }

    itemDiv.innerHTML = `
        <div class="text-center w-full flex-grow flex flex-col items-center justify-center">
            <div class="mb-2">${iconHtml}</div>
            <p class="font-bold text-sm truncate w-full" style="color: ${colors.textPrimary};">${itemName}</p>
            ${!isParentFolder && item.file_size ? `<p class="text-xs" style="color: ${colors.textSecondary};">${(item.file_size / 1024 / 1024).toFixed(2)} MB</p>` : ''}
            ${!isParentFolder && item.created_at ? `<p class="text-xs" style="color: ${colors.textSecondary};">${new Date(item.created_at).toLocaleDateString()}</p>` : ''}
        </div>
        ${!isParentFolder && item.type !== 'folder' ? ` <div class="flex space-x-2 mt-2 w-full justify-center flex-shrink-0">
            <a href="${item.s3_url}" target="_blank" class="px-2 py-1 rounded text-xs view-dl-btn">View/DL</a>
            <button class="px-2 py-1 rounded text-xs toggle-public-btn" data-file-id="${item.id}" data-is-public="${item.is_public}">
                ${item.is_public ? 'Make Private' : 'Make Public'}
            </button>
            <button class="px-2 py-1 rounded text-xs delete-file-btn" data-file-id="${item.id}">Delete</button>
        </div>
        ` : ''}
    `;

    // Attach click handler for item navigation/selection
    itemDiv.addEventListener('click', clickAction);
    
    // Apply dynamic button styles for View/DL, Toggle Public, Delete
    const viewDlBtn = itemDiv.querySelector('.view-dl-btn');
    if (viewDlBtn) {
        viewDlBtn.style.backgroundColor = colors.blue500;
        viewDlBtn.style.color = colors.textPrimary;
        viewDlBtn.addEventListener('mouseover', () => { viewDlBtn.style.backgroundColor = colors.blue600; });
        viewDlBtn.addEventListener('mouseout', () => { viewDlBtn.style.backgroundColor = colors.blue500; });
    }

    const toggleBtn = itemDiv.querySelector('.toggle-public-btn');
    if (toggleBtn) {
        toggleBtn.style.backgroundColor = colors.gray500;
        toggleBtn.style.color = colors.textPrimary;
        toggleBtn.addEventListener('mouseover', () => { toggleBtn.style.backgroundColor = colors.gray600; });
        toggleBtn.addEventListener('mouseout', () => { toggleBtn.style.backgroundColor = colors.gray500; });
    }

    const deleteBtn = itemDiv.querySelector('.delete-file-btn');
    if (deleteBtn) {
        deleteBtn.style.backgroundColor = colors.red500;
        deleteBtn.style.color = colors.textPrimary;
        deleteBtn.addEventListener('mouseover', () => { deleteBtn.style.backgroundColor = colors.red600; });
        deleteBtn.addEventListener('mouseout', () => { deleteBtn.style.backgroundColor = colors.red500; });
    }
    
    return itemDiv;
}

// --- Item Click Handler (for files and folders) ---
function handleItemClick(item, isParentFolder) { // New function
    if (isParentFolder) {
        currentPath.pop(); // Go up one level
    } else if (item.mime_type === 'application/vnd.snugos.folder') {
        currentPath.push(item.file_name); // Navigate into folder
    } else {
        // It's a file, do nothing on single click for now (double click or View/DL button handles it)
        return; 
    }
    fetchAndRenderLibraryItems(); // Re-render for new path
}


// --- Helper: Check Local Auth (copied from profile.js, for independence) ---
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

// --- Helper: Update Auth UI (copied from welcome.js for consistency) ---
function updateAuthUI(user = null) {
    const userAuthContainer = document.getElementById('userAuthContainer');
    if (userAuthContainer) {
        const colors = getThemeColors(); // Get theme colors
        if (user) {
            userAuthContainer.innerHTML = `<span class="mr-2" style="color: ${colors.textPrimary};">Welcome, ${user.username}!</span> <button id="logoutBtnTop" class="px-3 py-1 border rounded" style="background-color: ${colors.bgButton}; color: ${colors.textButton}; border-color: ${colors.borderButton};">Logout</button>`;
            userAuthContainer.querySelector('#logoutBtnTop')?.addEventListener('click', handleLogout);
            userAuthContainer.querySelector('#logoutBtnTop')?.addEventListener('mouseover', function() { this.style.backgroundColor = colors.bgButtonHover; this.style.color = colors.textButtonHover; });
            userAuthContainer.querySelector('#logoutBtnTop')?.addEventListener('mouseout', function() { this.style.backgroundColor = colors.bgButton; this.style.color = colors.textButton; });
        } else {
            userAuthContainer.innerHTML = `<button id="loginBtnTop" class="px-3 py-1 border rounded" style="background-color: ${colors.bgButton}; color: ${colors.textButton}; border-color: ${colors.borderButton};">Login</button>`;
            userAuthContainer.querySelector('#loginBtnTop')?.addEventListener('click', showLoginModal);
            userAuthContainer.querySelector('#loginBtnTop')?.addEventListener('mouseover', function() { this.style.backgroundColor = colors.bgButtonHover; this.style.color = colors.textButtonHover; });
            userAuthContainer.querySelector('#loginBtnTop')?.addEventListener('mouseout', function() { this.style.backgroundColor = colors.bgButton; this.style.color = colors.textButton; });
        }
    }
}

// --- Helper: Login Modal (from welcome.js, for independence) ---
function showLoginModal() {
    const colors = getThemeColors(); // Get theme colors
    const modalContent = `
        <div class="space-y-4">
            <div>
                <h3 class="font-bold mb-2" style="color: ${colors.textPrimary};">Login</h3>
                <form id="loginForm" class="space-y-3">
                    <input type="text" id="loginUsername" placeholder="Username" required class="w-full">
                    <input type="password" id="loginPassword" placeholder="Password" required class="w-full">
                    <button type="submit" class="w-full">Login</button>
                </form>
            </div>
            <hr style="border-color: ${colors.borderSecondary};">
            <div>
                <h3 class="font-bold mb-2" style="color: ${colors.textPrimary};">Don't have an account? Register</h3>
                <form id="registerForm" class="space-y-3">
                    <input type="text" id="registerUsername" placeholder="Username" required class="w-full">
                    <input type="password" id="registerPassword" placeholder="Password (min. 6 characters)" required class="w-full">
                    <button type="submit" class="w-full">Register</button>
                </form>
            </div>
        </div>
    `;
    
    const { overlay, contentDiv } = showCustomModal('Login or Register', modalContent, []);

    contentDiv.querySelectorAll('input[type="text"], input[type="password"]').forEach(input => {
        input.style.backgroundColor = colors.bgInput;
        input.style.color = colors.textPrimary;
        input.style.borderColor = colors.borderInput;
        input.style.padding = '8px';
        input.style.borderRadius = '3px';
    });

    contentDiv.querySelectorAll('button').forEach(button => {
        button.style.backgroundColor = colors.bgButton;
        button.style.border = `1px solid ${colors.borderButton}`;
        button.style.color = colors.textButton;
        button.style.padding = '8px 15px';
        button.style.cursor = 'pointer';
        button.style.borderRadius = '3px';
        button.style.transition = 'background-color 0.15s ease';
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = colors.bgButtonHover;
            button.style.color = colors.textButtonHover;
        });
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = colors.bgButton;
            button.style.color = colors.textButton;
        });
    });

    overlay.querySelector('#loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = overlay.querySelector('#loginUsername').value;
        const password = overlay.querySelector('#loginPassword').value;
        await handleLogin(username, password);
        overlay.remove();
    });

    overlay.querySelector('#registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = overlay.querySelector('#registerUsername').value;
        const password = overlay.querySelector('#registerPassword').value;
        await handleRegister(username, password);
        overlay.remove();
    });
}

// --- Helper: Login/Register (copied from welcome.js) ---
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
            loggedInUser = checkLocalAuth(); // Update loggedInUser after login
            showNotification(`Welcome back, ${data.user.username}!`, 2000);
            fetchAndRenderLibraryItems(); // Refresh files after login
            updateAuthUI(loggedInUser); // Update top bar auth UI
        } else {
            showNotification(`Login failed: ${data.message}`, 3000);
        }
    } catch (error) {
        showNotification('Network error. Could not connect to server.', 3000);
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
        showNotification('Network error. Could not connect to server.', 3000);
        console.error("Register Error:", error);
    }
}

function handleLogout() {
    localStorage.removeItem('snugos_token');
    loggedInUser = null;
    updateAuthUI(null); // Update top bar auth UI
    showNotification('You have been logged out.', 2000);
    fetchAndRenderLibraryItems(); // Clear files display on logout
}

// --- Theme Toggling (copied from welcome.js) ---
function toggleTheme() {
    const body = document.body;
    const isLightTheme = body.classList.contains('theme-light');
    if (isLightTheme) {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
        localStorage.setItem('snugos-theme', 'dark');
    } else {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
        localStorage.setItem('snugos-theme', 'light');
    }
}

function applyUserThemePreference() {
    const preference = localStorage.getItem('snugos-theme');
    const body = document.body;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (preference === 'light') {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
    } else if (preference === 'dark') {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
    } else { // 'system' or no preference saved
        if (prefersDark) {
            body.classList.remove('theme-light');
            body.classList.add('theme-dark');
        } else {
            body.classList.remove('theme-dark');
            body.classList.add('theme-light');
        }
    }
}
