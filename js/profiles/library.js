// js/profiles/library.js - Main JavaScript for the independent Library Page

import { showNotification, showCustomModal, getThemeColors } from './profileUtils.js';
import { getAsset } from './profileDb.js';

const SERVER_URL = 'https://snugos-server-api.onrender.com'; // Your backend server URL

let loggedInUser = null; // Store logged-in user info
let currentPath = ['']; // Track the current folder path, start with root

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
        // Still attach top-level listeners for login and theme
        attachEventListeners();
        applyUserThemePreference();
        return;
    }

    initializePageUI();
    attachEventListeners(); // Global listeners for top bar, start menu, etc.
    fetchAndRenderLibraryItems(); // Fetch items for the current path
});

function initializePageUI() {
    updateAuthUI(loggedInUser);
    applyUserThemePreference();

    const uploadFileBtn = document.getElementById('uploadFileBtn');
    const createFolderBtn = document.getElementById('createFolderBtn');
    const actualFileInput = document.getElementById('actualFileInput');

    uploadFileBtn?.addEventListener('click', () => actualFileInput.click());

    actualFileInput?.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
        e.target.value = null;
    });

    createFolderBtn?.addEventListener('click', createFolder);
}

// --- Start Menu Handlers (Copied from welcome.js logic) ---
function toggleStartMenu() {
    document.getElementById('startMenu')?.classList.toggle('hidden');
}

function launchDaw() {
    window.location.href = 'snaw.html';
}

function viewProfiles() {
    if (loggedInUser) {
        window.location.href = `profile.html?user=${loggedInUser.username}`;
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
        document.exitFullscreen?.();
    }
}

function attachEventListeners() {
    // Top taskbar login/logout/theme
    document.getElementById('loginBtnTop')?.addEventListener('click', showLoginModal);
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);

    // Start Menu functionality
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

// --- File Upload Logic ---
async function handleFileUpload(files) {
    if (!loggedInUser) {
        showNotification('You must be logged in to upload files.', 3000);
        return;
    }
    if (files.length === 0) return;

    showNotification(`Uploading ${files.length} file(s)...`, 3000);

    const uploadPromises = [];
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_public', 'true');
        formData.append('path', currentPath.join('/'));

        const token = localStorage.getItem('snugos_token');
        const uploadPromise = fetch(`${SERVER_URL}/api/files/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        }).then(response => response.json())
          .then(result => {
              if (result.success) {
                  showNotification(`'${file.name}' uploaded successfully!`, 2000);
              } else {
                  throw new Error(result.message || 'Unknown upload error.');
              }
          }).catch(error => {
              showNotification(`Failed to upload '${file.name}': ${error.message}`, 5000);
              console.error('File upload error:', error);
          });
        uploadPromises.push(uploadPromise);
    }

    await Promise.all(uploadPromises);
    fetchAndRenderLibraryItems(); // Refresh the list once after all uploads are done
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

            showNotification(`Creating folder '${folderName}'...`, 1500);
            try {
                const token = localStorage.getItem('snugos_token');
                const response = await fetch(`${SERVER_URL}/api/folders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name: folderName, path: currentPath.join('/') })
                });
                const result = await response.json();
                if (response.ok && result.success) {
                    showNotification(`Folder '${folderName}' created!`, 2000);
                    fetchAndRenderLibraryItems();
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
async function fetchAndRenderLibraryItems() {
    const fileViewArea = document.getElementById('file-view-area');
    const pathDisplay = document.getElementById('library-path-display');
    if (!fileViewArea || !pathDisplay || !loggedInUser) return;

    fileViewArea.innerHTML = '<p class="text-gray-500 italic text-center col-span-full">Loading items...</p>';
    pathDisplay.textContent = `/${currentPath.join('/')}`;

    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/files/my?path=${encodeURIComponent(currentPath.join('/'))}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            fileViewArea.innerHTML = '';
            
            if (currentPath.length > 1) { // Show ".." if not in root
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
        fileViewArea.innerHTML = `<p class="text-red-500 text-center col-span-full">Error loading items: ${error.message}</p>`;
    }
}

// --- Render Single File/Folder Item ---
function renderFileItem(item, isParentFolder = false) {
    const colors = getThemeColors();
    const itemDiv = document.createElement('div');
    itemDiv.className = 'file-item flex flex-col items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700';

    let iconHtml = '';
    let itemName = item.file_name;

    const mainContent = document.createElement('div');
    mainContent.className = 'text-center w-full flex-grow flex flex-col items-center justify-center';
    mainContent.addEventListener('click', () => handleItemClick(item, isParentFolder));

    if (isParentFolder) {
        itemName = '..';
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>`;
    } else if (item.mime_type === 'application/vnd.snugos.folder') {
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>`;
    } else if (item.mime_type?.startsWith('image/')) {
        iconHtml = `<img src="${item.s3_url}" alt="${item.file_name}" class="max-h-12 w-auto object-contain">`;
    } else if (item.mime_type?.startsWith('audio/')) {
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-13c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>`;
    } else {
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>`;
    }

    mainContent.innerHTML = `
        <div class="mb-2 h-12 flex items-center justify-center">${iconHtml}</div>
        <p class="font-bold text-sm truncate w-full" style="color: ${colors.textPrimary};">${itemName}</p>
    `;
    itemDiv.appendChild(mainContent);

    if (!isParentFolder) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'flex space-x-2 mt-2 w-full justify-center flex-shrink-0';
        actionsDiv.innerHTML = `
            <a href="${item.s3_url}" target="_blank" class="px-2 py-1 rounded text-xs text-white" style="background-color: ${colors.blue500};">View</a>
            <button class="px-2 py-1 rounded text-xs delete-file-btn" data-file-id="${item.id}" style="background-color: ${colors.red500}; color: white;">Delete</button>
        `;
        itemDiv.appendChild(actionsDiv);
        
        actionsDiv.querySelector('.delete-file-btn')?.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent folder navigation
            // Add delete confirmation and logic here
            console.log("Delete clicked for:", item.id);
        });
    }

    return itemDiv;
}

// --- Item Click Handler ---
function handleItemClick(item, isParentFolder) {
    if (isParentFolder) {
        currentPath.pop();
    } else if (item.mime_type === 'application/vnd.snugos.folder') {
        currentPath.push(item.file_name);
    } else {
        return; 
    }
    fetchAndRenderLibraryItems();
}


// --- Helper: Check Local Auth ---
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

// --- Helper: Update Auth UI ---
function updateAuthUI(user = null) {
    const userAuthContainer = document.getElementById('userAuthContainer');
    const menuLogin = document.getElementById('menuLogin');
    const menuLogout = document.getElementById('menuLogout');

    if (userAuthContainer) {
        const colors = getThemeColors();
        if (user) {
            userAuthContainer.innerHTML = `<span class="mr-2" style="color: ${colors.textPrimary};">Welcome, ${user.username}!</span> <button id="logoutBtnTop" class="px-3 py-1 border rounded" style="background-color: ${colors.bgButton}; color: ${colors.textButton}; border-color: ${colors.borderButton};">Logout</button>`;
            userAuthContainer.querySelector('#logoutBtnTop')?.addEventListener('click', handleLogout);
            menuLogin?.classList.add('hidden');
            menuLogout?.classList.remove('hidden');
        } else {
            userAuthContainer.innerHTML = `<button id="loginBtnTop" class="px-3 py-1 border rounded" style="background-color: ${colors.bgButton}; color: ${colors.textButton}; border-color: ${colors.borderButton};">Login</button>`;
            userAuthContainer.querySelector('#loginBtnTop')?.addEventListener('click', showLoginModal);
            menuLogin?.classList.remove('hidden');
            menuLogout?.classList.add('hidden');
        }
    }
}

// --- Helper: Login Modal ---
function showLoginModal() {
    const colors = getThemeColors();
    const modalContent = `
        <div class="space-y-4">
            <div>
                <h3 class="font-bold mb-2" style="color: ${colors.textPrimary};">Login</h3>
                <form id="loginForm" class="space-y-3">
                    <input type="text" id="loginUsername" placeholder="Username" required class="w-full p-2 border rounded" style="background-color: ${colors.bgInput}; color: ${colors.textPrimary}; border-color: ${colors.borderInput};">
                    <input type="password" id="loginPassword" placeholder="Password" required class="w-full p-2 border rounded" style="background-color: ${colors.bgInput}; color: ${colors.textPrimary}; border-color: ${colors.borderInput};">
                    <button type="submit" class="w-full p-2 rounded" style="background-color: ${colors.bgButton}; color: ${colors.textButton}; border: 1px solid ${colors.borderButton};">Login</button>
                </form>
            </div>
            <hr style="border-color: ${colors.borderSecondary};">
            <div>
                <h3 class="font-bold mb-2" style="color: ${colors.textPrimary};">Register</h3>
                <form id="registerForm" class="space-y-3">
                    <input type="text" id="registerUsername" placeholder="Username" required class="w-full p-2 border rounded" style="background-color: ${colors.bgInput}; color: ${colors.textPrimary}; border-color: ${colors.borderInput};">
                    <input type="password" id="registerPassword" placeholder="Password (min. 6 characters)" required class="w-full p-2 border rounded" style="background-color: ${colors.bgInput}; color: ${colors.textPrimary}; border-color: ${colors.borderInput};">
                    <button type="submit" class="w-full p-2 rounded" style="background-color: ${colors.bgButton}; color: ${colors.textButton}; border: 1px solid ${colors.borderButton};">Register</button>
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

// --- Login/Register/Logout Handlers ---
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
            showNotification(`Welcome back, ${data.user.username}!`, 2000);
            window.location.reload(); // Reload to apply logged-in state
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
    showNotification('You have been logged out.', 2000);
    window.location.reload(); // Reload to apply logged-out state
}

// --- Theme Toggling ---
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
    window.location.reload(); // Reload to apply theme to all dynamic components
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
