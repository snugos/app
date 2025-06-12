// js/profiles/library.js - Main JavaScript for the independent Library Page

import { showNotification, showCustomModal, getThemeColors } from './profileUtils.js'; // Added getThemeColors
import { getAsset } from './profileDb.js'; // Reusing profileDb for IndexedDB access (e.g. for user backgrounds)

const SERVER_URL = 'https://snugos-server-api.onrender.com'; // Your backend server URL

let loggedInUser = null; // Store logged-in user info

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loggedInUser = checkLocalAuth(); // Check if user is logged in
    if (!loggedInUser) {
        // Redirect or show message if not logged in
        document.getElementById('library-container').innerHTML = `
            <div class="text-center p-12 bg-window text-primary border border-primary rounded-lg shadow-window">
                <h1 class="text-2xl font-bold mb-4">Access Denied</h1>
                <p>You must be logged in to view your library. Please <a href="index.html" class="text-blue-400 hover:underline">login</a> first.</p>
            </div>
        `;
        return;
    }

    initializePageUI();
    attachEventListeners();
    fetchAndRenderMyFiles(); // Call to fetch and display user's files
});

function initializePageUI() {
    const colors = getThemeColors(); // Get theme colors
    // Dynamically update top taskbar for logged-in user
    updateAuthUI(loggedInUser);
    applyUserThemePreference(); // Apply user theme

    // Initialize dropzone for file uploads
    const dropZone = document.getElementById('file-upload-dropzone');
    const fileInput = document.getElementById('fileInput');

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Use CSS variables for highlight
        dropZone.style.backgroundColor = colors.bgDropzoneDragover;
        dropZone.style.borderColor = colors.borderDropzoneDragover;
        dropZone.style.color = colors.textDropzoneDragover;
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Revert to normal dropzone colors
        dropZone.style.backgroundColor = colors.bgDropzone;
        dropZone.style.borderColor = colors.borderDropzone;
        dropZone.style.color = colors.textDropzone;
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Revert to normal dropzone colors
        dropZone.style.backgroundColor = colors.bgDropzone;
        dropZone.style.borderColor = colors.borderDropzone;
        dropZone.style.color = colors.textDropzone;
        const files = e.dataTransfer.files;
        handleFileUpload(files);
    });

    dropZone.addEventListener('click', () => {
        fileInput.click(); // Trigger file input click
    });

    fileInput.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
    });
}

function attachEventListeners() {
    // Top taskbar login/logout/theme
    document.getElementById('loginBtnTop')?.addEventListener('click', showLoginModal);
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
}

// --- File Upload Logic ---
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
        // You might want to add a UI to ask the user if they want the file to be public or private
        formData.append('is_public', 'true'); // Default to public for now

        try {
            const token = localStorage.getItem('snugos_token');
            const response = await fetch(`${SERVER_URL}/api/files/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData // Multer handles multipart/form-data
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showNotification(`'${file.name}' uploaded successfully!`, 2000);
                fetchAndRenderMyFiles(); // Refresh the list
            } else {
                throw new Error(result.message || 'Unknown upload error.');
            }
        } catch (error) {
            showNotification(`Failed to upload '${file.name}': ${error.message}`, 5000);
            console.error('File upload error:', error);
        }
    }
}

// --- Fetch & Render My Files ---
async function fetchAndRenderMyFiles() {
    const myFilesList = document.getElementById('my-files-list');
    if (!myFilesList || !loggedInUser) return;

    myFilesList.innerHTML = '<p class="text-gray-500 italic">Loading files...</p>';

    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/files/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            if (data.files && data.files.length > 0) {
                myFilesList.innerHTML = ''; // Clear "Loading files..."
                data.files.forEach(file => {
                    const colors = getThemeColors(); // Get theme colors inside loop for dynamic elements
                    const fileDiv = document.createElement('div');
                    // Use CSS variables for consistent file item styling
                    fileDiv.className = 'p-3 rounded shadow flex flex-col items-center justify-between';
                    fileDiv.style.backgroundColor = colors.bgButton; // Using bg-button for file item background
                    fileDiv.style.borderColor = colors.borderButton;
                    fileDiv.style.color = colors.textSecondary; // Text for size/date

                    let previewHtml = '';
                    if (file.mime_type.startsWith('image/')) {
                        previewHtml = `<img src="${file.s3_url}" alt="${file.file_name}" class="max-h-24 w-auto object-contain mb-2">`;
                    } else if (file.mime_type.startsWith('audio/')) {
                        previewHtml = `<audio controls src="${file.s3_url}" class="w-full mb-2"></audio>`;
                    } else if (file.mime_type.startsWith('video/')) {
                        previewHtml = `<video controls src="${file.s3_url}" class="max-h-24 w-auto object-contain mb-2"></video>`;
                    } else {
                        previewHtml = `<span class="text-4xl mb-2" style="color: ${colors.textPrimary};">📄</span>`; // Generic file icon
                    }

                    fileDiv.innerHTML = `
                        <div class="text-center w-full">
                            ${previewHtml}
                            <p class="font-bold text-sm truncate w-full" style="color: ${colors.textPrimary};">${file.file_name}</p>
                            <p class="text-xs text-gray-600 dark:text-gray-400">${(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
                            <p class="text-xs text-gray-600 dark:text-gray-400">${new Date(file.created_at).toLocaleDateString()}</p>
                        </div>
                        <div class="flex space-x-2 mt-2 w-full justify-center">
                            <a href="${file.s3_url}" target="_blank" class="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">View/DL</a>
                            <button class="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 toggle-public-btn" data-file-id="${file.id}" data-is-public="${file.is_public}">
                                ${file.is_public ? 'Make Private' : 'Make Public'}
                            </button>
                            <button class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 delete-file-btn" data-file-id="${file.id}">Delete</button>
                        </div>
                    `;
                    myFilesList.appendChild(fileDiv);

                    // Apply dynamic button styles and hover effects
                    const viewDlBtn = fileDiv.querySelector('a');
                    viewDlBtn.style.backgroundColor = colors.blue500;
                    viewDlBtn.style.color = colors.textPrimary;
                    viewDlBtn.addEventListener('mouseover', () => { viewDlBtn.style.backgroundColor = colors.blue600; });
                    viewDlBtn.addEventListener('mouseout', () => { viewDlBtn.style.backgroundColor = colors.blue500; });


                    const toggleBtn = fileDiv.querySelector('.toggle-public-btn');
                    toggleBtn.style.backgroundColor = colors.gray500;
                    toggleBtn.style.color = colors.textPrimary;
                    toggleBtn.addEventListener('mouseover', () => { toggleBtn.style.backgroundColor = colors.gray600; });
                    toggleBtn.addEventListener('mouseout', () => { toggleBtn.style.backgroundColor = colors.gray500; });

                    const deleteBtn = fileDiv.querySelector('.delete-file-btn');
                    deleteBtn.style.backgroundColor = colors.red500;
                    deleteBtn.style.color = colors.textPrimary;
                    deleteBtn.addEventListener('mouseover', () => { deleteBtn.style.backgroundColor = colors.red600; });
                    deleteBtn.addEventListener('mouseout', () => { deleteBtn.style.backgroundColor = colors.red500; });
                });

                // Attach event listeners for toggle public and delete buttons
                myFilesList.querySelectorAll('.toggle-public-btn').forEach(button => {
                    button.addEventListener('click', (e) => toggleFilePublicStatus(e.target.dataset.fileId, e.target.dataset.isPublic === 'true'));
                });
                myFilesList.querySelectorAll('.delete-file-btn').forEach(button => {
                    button.addEventListener('click', (e) => deleteUserFile(e.target.dataset.fileId));
                });

            } else {
                myFilesList.innerHTML = '<p class="text-gray-500 italic">No files uploaded yet.</p>';
            }
        } else {
            throw new Error(data.message || 'Could not fetch files.');
        }
    } catch (error) {
        showNotification(`Error fetching files: ${error.message}`, 5000);
        console.error('Fetch files error:', error);
        myFilesList.innerHTML = `<p class="text-red-500">Error loading files: ${error.message}</p>`;
    }
}

// --- File Actions (Make Public/Private, Delete) ---
async function toggleFilePublicStatus(fileId, isCurrentlyPublic) {
    if (!loggedInUser) {
        showNotification('You must be logged in to change file status.', 3000);
        return;
    }
    const token = localStorage.getItem('snugos_token');
    const newStatus = !isCurrentlyPublic;
    const action = newStatus ? 'Making public' : 'Making private';

    try {
        showNotification(`${action}...`, 1500);
        const response = await fetch(`${SERVER_URL}/api/files/${fileId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_public: newStatus })
        });
        const result = await response.json();
        if (response.ok && result.success) {
            showNotification(`File status changed to ${newStatus ? 'public' : 'private'}!`, 2000);
            fetchAndRenderMyFiles(); // Refresh list
        } else {
            throw new Error(result.message || 'Failed to change file status.');
        }
    } catch (error) {
        showNotification(`Error changing file status: ${error.message}`, 5000);
        console.error('Toggle public status error:', error);
    }
}

async function deleteUserFile(fileId) {
    if (!loggedInUser) {
        showNotification('You must be logged in to delete files.', 3000);
        return;
    }
    const token = localStorage.getItem('snugos_token');

    // Confirm with user before deleting
    const confirmDelete = showCustomModal('Delete File', 'Are you sure you want to delete this file? This cannot be undone.', [
        { label: 'Cancel', action: () => {} },
        { label: 'Delete', action: async () => {
            try {
                showNotification('Deleting file...', 1500);
                const response = await fetch(`${SERVER_URL}/api/files/${fileId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();
                if (response.ok && result.success) {
                    showNotification('File deleted successfully!', 2000);
                    fetchAndRenderMyFiles(); // Refresh list
                } else {
                    throw new Error(result.message || 'Failed to delete file.');
                }
            } catch (error) {
                showNotification(`Error deleting file: ${error.message}`, 5000);
                console.error('Delete file error:', error);
            }
        }}
    ]);
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

// --- Helper: Update Auth UI (minimal version for Library page) ---
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
            fetchAndRenderMyFiles(); // Refresh files after login
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
    fetchAndRenderMyFiles(); // Clear files display on logout
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
