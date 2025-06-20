// js/daw/browser/browser.js
// NOTE: This file is the main JavaScript for the standalone SnugOS Browser application (browser.html).
// It manages its own authentication and UI, as it is a top-level page.

// Base URL for your backend server
const SERVER_URL = 'https://snugos-server-api.onrender.com'; // Direct use for standalone app

// Global state variables for this standalone app
let token = localStorage.getItem('snugos_token'); // Get token from localStorage directly
let currentUser = null; // Stores { id, username }
let currentPath = '/';
let authMode = 'login'; // 'login' or 'register'
let isAdminView = false; // Flag for 'snaw' to view all files

// DOM Elements (assuming they exist in browser.html)
const loadingOverlay = document.getElementById('loading-overlay');
const messageDialog = document.getElementById('message-dialog');
const messageText = document.getElementById('message-text');
const messageConfirmBtn = document.getElementById('message-confirm-btn');
const messageCancelBtn = document.getElementById('message-cancel-btn');
const inputDialog = document.getElementById('input-dialog');
const inputDialogTitle = document.getElementById('input-dialog-title');
const inputDialogField = document.getElementById('input-dialog-field');
const inputDialogConfirmBtn = document.getElementById('input-dialog-confirm-btn');
const inputDialogCancelBtn = document.getElementById('input-dialog-cancel-btn');
const loginPage = document.getElementById('login-page');
const appContent = document.getElementById('app-content');
const authTitle = document.getElementById('auth-title');
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const authMessage = document.getElementById('auth-message');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authBtnText = document.getElementById('auth-btn-text');
const authSpinner = document.getElementById('auth-spinner');
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
const loggedInUserSpan = document.getElementById('logged-in-user');
const logoutBtn = document.getElementById('logout-btn');
const createFolderBtn = document.getElementById('create-folder-btn');
const uploadFileBtn = document.getElementById('upload-file-btn');
const fileUploadInput = document.getElementById('file-upload-input');
const breadcrumbsNav = document.getElementById('breadcrumbs');
const fileListDiv = document.getElementById('file-list');
const mainContentArea = document.getElementById('main-content-area');
const snawAdminSection = document.getElementById('snaw-admin-section'); // Snaw admin section
const viewAllFilesBtn = document.getElementById('view-all-files-btn'); // View All Files Button

// --- Utility Functions for Modals (Local to this standalone app) ---

function showLoading() {
    loadingOverlay?.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay?.classList.add('hidden');
}

function showMessage(msg, onConfirm = null, showCancel = false, onCancel = null) {
    if (!messageDialog) return;
    messageText.textContent = msg;
    messageCancelBtn?.classList.toggle('hidden', !showCancel);
    messageDialog.classList.remove('hidden');

    messageConfirmBtn.onclick = null;
    messageCancelBtn.onclick = null;

    messageConfirmBtn.onclick = () => {
        messageDialog.classList.add('hidden');
        if (typeof onConfirm === 'function') { // FIX: Check if onConfirm is a function
            onConfirm();
        }
    };

    if (showCancel) {
        messageCancelBtn.onclick = () => {
            messageDialog.classList.add('hidden');
            if (typeof onCancel === 'function') { // FIX: Check if onCancel is a function
                onCancel();
            }
        };
    }
}

function showInputDialog(title, placeholder, initialValue, onConfirmCallback) {
    if (!inputDialog) return;
    inputDialogTitle.textContent = title;
    inputDialogField.placeholder = placeholder;
    inputDialogField.value = initialValue;
    inputDialog.classList.remove('hidden');
    inputDialogField.focus();

    inputDialogConfirmBtn.onclick = null;
    inputDialogCancelBtn.onclick = null;

    inputDialogConfirmBtn.onclick = async () => {
        const value = inputDialogField.value.trim();
        const success = await onConfirmCallback(value);
        if (success) {
            inputDialog.classList.add('hidden');
        }
    };

    inputDialogCancelBtn.onclick = () => {
        inputDialog.classList.add('hidden');
    };
}

// --- Icon SVGs (Inline) ---
const getFolderIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-folder mr-3 flex-shrink-0" style="color: currentColor;"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`;
const getFileIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-file-text mr-3 flex-shrink-0" style="color: currentColor;"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v6h6"/><path d="M10 12H8"/><path d="M16 16H8"/><path d="M16 20H8"/></svg>`;
const getEditIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const getTrashIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
const getEyeIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const getEyeOffIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.06 18.06 0 0 1 5.34-4.34M7.52 3.13A9.01 9.01 0 0 1 12 4c7 0 10 7 10 7a18.06 18.06 0 0 1-2.5 3.06"/><circle cx="12" cy="12" r="3"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;
const getShareIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-share-2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>`;

// --- Authentication Functions (Local to this standalone app) ---

function checkLocalAuth() {
    try {
        const tokenFromStorage = localStorage.getItem('snugos_token'); // Use 'snugos_token' for consistency
        if (!tokenFromStorage) return null;
        const payload = JSON.parse(atob(tokenFromStorage.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('snugos_token');
            return null;
        }
        token = tokenFromStorage; // Set local token variable
        return { id: payload.id, username: payload.username };
    } catch (e) {
        localStorage.removeItem('snugos_token');
        return null;
    }
}

async function fetchUserProfile() {
    if (!token) return;
    showLoading();
    try {
        const response = await fetch(`${SERVER_URL}/api/profile/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            currentUser = data.profile;
            renderApp();
        } else {
            console.error("Failed to fetch user profile:", response.statusText);
            token = null;
            localStorage.removeItem('snugos_token'); // Use 'snugos_token' for consistency
            renderApp(); // Go back to login
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        token = null;
        localStorage.removeItem('snugos_token'); // Use 'snugos_token' for consistency
        renderApp(); // Go back to login
    } finally {
        hideLoading();
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        document.getElementById('auth-message').textContent = 'Please enter both username and password.';
        document.getElementById('auth-message').classList.remove('hidden');
        return;
    }

    document.getElementById('auth-message').classList.add('hidden');
    authSubmitBtn.disabled = true;
    authSpinner.classList.remove('hidden');
    authBtnText.textContent = authMode === 'register' ? 'Registering...' : 'Logging in...';

    try {
        const endpoint = authMode === 'register' ? '/api/register' : '/api/login';
        const response = await fetch(`${SERVER_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            token = data.token;
            localStorage.setItem('snugos_token', token); // Use 'snugos_token' for consistency
            currentUser = data.user;
            renderApp();
        } else {
            showMessage(data.message || (authMode === 'register' ? 'Registration failed.' : 'Login failed.'), 4000); // Use local showMessage
        }
    } catch (error) {
        console.error("Authentication error:", error);
        showMessage('Network error or server unavailable.', 4000); // Use local showMessage
    } finally {
        document.getElementById('auth-submit-btn').disabled = false;
        document.getElementById('auth-spinner').classList.add('hidden');
        document.getElementById('auth-btn-text').textContent = authMode === 'register' ? 'Register' : 'Login';
    }
}

function handleLogout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('snugos_token'); // Use 'snugos_token' for consistency
    isAdminView = false; // Reset admin view flag on logout
    renderApp();
    showMessage('You have been logged out.'); // Use local showMessage
}

// --- File Management Functions ---

async function fetchFiles() {
    if (!token || !currentUser) {
        document.getElementById('file-list').innerHTML = ''; // Clear content if not logged in
        return;
    }

    showLoading();
    try {
        let apiUrl = `${SERVER_URL}/api/files/my?path=${encodeURIComponent(currentPath)}`;
        // If 'snaw' and in admin view, fetch all files
        if (currentUser.username === 'snaw' && isAdminView) {
            apiUrl = `${SERVER_URL}/api/admin/files`;
        }

        const response = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            if (currentUser.username === 'snaw' && isAdminView) {
                renderFileListAdmin(data.items);
            } else {
                const sortedItems = data.items.sort((a, b) => {
                    const isAFolder = a.mime_type === 'application/vnd.snugos.folder';
                    const isBFolder = b.mime_type === 'application/vnd.snugos.folder';

                    if (isAFolder && !isBFolder) return -1;
                    if (!isAFolder && isBFolder) return 1;
                    return a.file_name.localeCompare(b.file_name);
                });
                renderFileList(sortedItems);
            }
        } else {
            showMessage(data.message || "Failed to load files.", 4000); // Use local showMessage
            renderFileList([]); // Render empty list on error
        }
    } catch (error) {
        console.error("Error fetching files:", error);
        showMessage("Network error while fetching files. Please try again.", 4000); // Use local showMessage
        renderFileList([]);
    } finally {
        hideLoading();
    }
}

async function handleCreateFolder() {
    showInputDialog('Create New Folder', 'Folder Name', '', async (name) => {
        if (!name.trim()) {
            showMessage("Folder name cannot be empty.", 2000); // Use local showMessage
            return false;
        }
        showLoading();
        try {
            const response = await fetch(`${SERVER_URL}/api/folders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: name.trim(), path: currentPath })
            });
            const data = await response.json();
            if (data.success) {
                showMessage("Folder created successfully!", 2000); // Use local showMessage
                fetchFiles();
                return true;
            } else {
                showMessage(data.message || "Failed to create folder.", 4000); // Use local showMessage
                return false;
            }
        } catch (error) {
            console.error("Error creating folder:", error);
            showMessage("Network error creating folder.", 4000); // Use local showMessage
            return false;
        } finally {
            hideLoading();
        }
    });
}

async function uploadFiles(filesToUpload) {
    if (!currentUser || filesToUpload.length === 0) return; // Use currentUser

    showLoading();
    let allSuccess = true;
    let messages = [];

    for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', currentPath);
        formData.append('is_public', false); // Default to private

        try {
            const response = await fetch(`${SERVER_URL}/api/files/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                messages.push(`"${file.name}" uploaded successfully.`);
            } else {
                allSuccess = false;
                messages.push(`Failed to upload "${file.name}": ${data.message || 'Server error'}.`);
            }
        } catch (error) {
            allSuccess = false;
            messages.push(`Network error uploading "${file.name}".`);
            console.error(`Error uploading "${file.name}":`, error);
        }
    }
    showMessage(messages.join('\n'), 5000); // Consolidated notification with local showMessage
    fetchFiles(); // Re-fetch files to update UI
    hideLoading();
}

function handleUploadClick() {
    document.getElementById('file-upload-input').click();
}

function handleFileInputChange(event) {
    const files = event.target.files;
    uploadFiles(Array.from(files));
    event.target.value = null; // Reset file input
}

function handleRename(item) {
    showInputDialog(`Rename ${item.file_name}`, 'New Name', item.file_name, async (newName) => {
        if (!newName.trim()) {
            showMessage("Name cannot be empty.", 2000); // Use local showMessage
            return false;
        }
        showLoading();
        try {
            const response = await fetch(`${SERVER_URL}/api/files/${item.id}/rename`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newName: newName.trim() })
            });
            const data = await response.json();
            if (data.success) {
                showMessage("Item renamed successfully.", 2000); // Use local showMessage
                fetchFiles();
                return true;
            } else {
                showMessage(data.message || "Failed to rename item.", 4000); // Use local showMessage
                return false;
            }
        } catch (error) {
            console.error("Error renaming item:", error);
            showMessage("Network error renaming item.", 4000); // Use local showMessage
            return false;
        } finally {
            hideLoading();
        }
    });
}

function handleDeleteItem(item) {
    showMessage(`Are you sure you want to delete "${item.file_name}"? This action cannot be undone.`, async () => {
        showLoading();
        try {
            const response = await fetch(`${SERVER_URL}/api/files/${item.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                showMessage(`"${item.file_name}" deleted successfully.`, 2000); // Use local showMessage
                fetchFiles(); // Re-fetch files
            } else {
                showMessage(data.message || "Failed to delete item.", 4000); // Use local showMessage
            }
        } catch (error) {
            console.error("Error deleting item:", error);
            showMessage("Network error deleting item.", 4000); // Use local showMessage
        } finally {
            hideLoading();
        }
    }, true); // showCancel = true
}

async function handleTogglePublic(item) {
    showLoading();
    try {
        const response = await fetch(`${SERVER_URL}/api/files/${item.id}/toggle-public`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_public: !item.is_public })
        });
        const data = await response.json();
        if (data.success) {
            showMessage(`"${item.file_name}" is now ${data.file.is_public ? 'public' : 'private'}.`, 2000); // Use local showMessage
            fetchFiles(); // Re-fetch files
        } else {
            showMessage(data.message || "Failed to change public status.", 4000); // Use local showMessage
        }
    } catch (error) {
        console.error("Error toggling public status:", error);
        showMessage("Network error changing public status.", 4000); // Use local showMessage
    } finally {
        hideLoading();
    }
}

async function handleShareLink(item) {
    showLoading();
    try {
        const response = await fetch(`${SERVER_URL}/api/files/${item.id}/share-link`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            navigator.clipboard.writeText(data.shareUrl).then(() => {
                showMessage("Share link copied to clipboard!", 2000); // Use local showMessage
            }).catch(err => {
                const textarea = document.createElement('textarea');
                textarea.value = data.shareUrl;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                showMessage("Share link copied to clipboard! (Fallback method)", 3000); // Use local showMessage
                console.warn("Clipboard API not available, falling back to execCommand.");
            });
        } else {
            showMessage(data.message || "Failed to generate share link.", 4000); // Use local showMessage
        }
    } catch (error) {
        console.error("Error generating share link:", error);
        showMessage("Network error generating share link.", 4000); // Use local showMessage
    } finally {
        hideLoading();
    }
}

async function handleMoveItem(draggedItemId, targetPath) {
    showLoading();
    try {
        const response = await fetch(`${SERVER_URL}/api/files/${draggedItemId}/move`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ targetPath: targetPath })
        });
        const data = await response.json();
        if (data.success) {
            showMessage(data.message || "Item moved successfully.", 2000); // Use local showMessage
            fetchFiles(); // Re-fetch files to update UI
        } else {
            showMessage(data.message || "Failed to move item.", 4000); // Use local showMessage
        }
    } catch (error) {
        console.error("Error moving item:", error);
        showMessage("Network error moving item.", 4000); // Use local showMessage
    } finally {
        hideLoading();
    }
}

// --- UI Rendering Functions ---

function renderBreadcrumbs() {
    const breadcrumbsNav = document.getElementById('breadcrumbs');
    if (!breadcrumbsNav) return;

    breadcrumbsNav.innerHTML = '';
    const pathSegments = currentPath.split('/').filter(segment => segment !== '');

    let myDriveLi = document.createElement('li');
    myDriveLi.className = 'flex items-center';
    let myDriveBtn = document.createElement('button');
    myDriveBtn.className = 'hover:underline font-medium';
    myDriveBtn.style.setProperty('color', 'var(--text-primary)');
    myDriveBtn.textContent = 'My Drive';
    myDriveBtn.onclick = () => {
        currentPath = '/';
        isAdminView = false;
        renderApp();
    };
    myDriveLi.appendChild(myDriveBtn);
    breadcrumbsNav.appendChild(myDriveLi);

    if (isAdminView && currentUser?.username === 'snaw') { // Check currentUser
        breadcrumbsNav.classList.add('hidden');
        const adminIndicator = document.createElement('li');
        adminIndicator.className = 'flex items-center';
        adminIndicator.innerHTML = '<span class="mx-2" style="color: var(--text-secondary);">/</span><span class="font-bold" style="color: var(--text-primary);">All Files (Admin View)</span>';
        breadcrumbsNav.appendChild(adminIndicator);
        breadcrumbsNav.classList.remove('hidden');
        return;
    } else {
        breadcrumbsNav.classList.remove('hidden');
    }

    let accumulatedPath = '/';
    pathSegments.forEach((segment, index) => {
        accumulatedPath += segment + '/';
        let li = document.createElement('li');
        li.className = 'flex items-center';
        li.innerHTML = '<span class="mx-2" style="color: var(--text-secondary);">/</span>';
        let btn = document.createElement('button');
        btn.className = 'hover:underline font-medium';
        btn.style.setProperty('color', 'var(--text-primary)');
        btn.textContent = segment;
        const navPath = accumulatedPath;
        btn.onclick = () => {
            currentPath = navPath;
            renderApp();
        };
        li.appendChild(btn);
        breadcrumbsNav.appendChild(li);
    });
}


function renderFileList(items) {
    const fileListDiv = document.getElementById('file-list');
    if (!fileListDiv) return;

    fileListDiv.innerHTML = '';

    if (items.length === 0) {
        fileListDiv.innerHTML = `
            <p class="col-span-full text-center py-8" style="color: var(--text-secondary);">
                This folder is empty. Create a new folder or upload a file!
            </p>
        `;
    }

    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shadow-lg hover:shadow-xl transition-shadow duration-200 p-4 flex flex-col items-start space-y-3 relative';
        itemDiv.style.setProperty('background-color', 'var(--bg-window)');
        itemDiv.style.setProperty('border', '1px solid var(--border-primary)');
        itemDiv.style.setProperty('color', 'var(--text-primary)');
        itemDiv.style.setProperty('border-radius', '3px');

        itemDiv.draggable = true;
        itemDiv.dataset.itemId = item.id;
        itemDiv.dataset.itemType = item.mime_type;
        itemDiv.dataset.itemName = item.file_name;
        itemDiv.dataset.itemPath = item.path;

        itemDiv.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({
                id: item.id,
                type: item.mime_type,
                name: item.file_name,
                path: item.path
            }));
            e.dataTransfer.effectAllowed = 'move';
            itemDiv.classList.add('opacity-50');
        });

        itemDiv.addEventListener('dragend', (e) => {
            itemDiv.classList.remove('opacity-50');
        });


        const isFolder = item.mime_type === 'application/vnd.snugos.folder';
        const nameElement = document.createElement(isFolder ? 'button' : 'a');
        nameElement.className = 'flex items-center text-left group w-full';
        nameElement.style.setProperty('color', 'var(--text-primary)');
        nameElement.innerHTML = (isFolder ? getFolderIcon() : getFileIcon()) + `<span class="font-${isFolder ? 'semibold' : 'medium'} text-lg truncate flex-grow">${item.file_name}</span>`;

        if (isFolder) {
            nameElement.onclick = () => {
                currentPath = currentPath === '/' ? `/${item.file_name}/` : `${currentPath}${item.file_name}/`;
                isAdminView = false;
                renderApp();
            };

            // Make folders drop targets
            fileListDiv.addEventListener('dragover', handleDropTargetDragOver); // Re-added drag listeners to main list div
            fileListDiv.addEventListener('dragleave', handleDropTargetDragLeave);
            fileListDiv.addEventListener('drop', handleDrop);

            itemDiv.dataset.isDropTarget = 'true';
            itemDiv.dataset.dropTargetPath = currentPath + item.file_name + '/';
        } else {
            nameElement.href = item.s3_url;
            nameElement.target = '_blank';
            nameElement.rel = 'noopener noreferrer';
        }
        itemDiv.appendChild(nameElement);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'flex flex-wrap gap-2 pt-2 border-t w-full justify-start mt-auto';
        actionsDiv.style.setProperty('border-color', 'var(--border-secondary)');

        const renameBtn = document.createElement('button');
        renameBtn.className = 'item-action-btn';
        renameBtn.title = 'Rename';
        renameBtn.innerHTML = getEditIcon();
        renameBtn.onclick = () => handleRename(item);
        actionsDiv.appendChild(renameBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'item-action-btn';
        deleteBtn.title = 'Delete';
        deleteBtn.innerHTML = getTrashIcon();
        deleteBtn.onclick = () => handleDeleteItem(item);
        actionsDiv.appendChild(deleteBtn);

        if (!isFolder) {
            const togglePublicBtn = document.createElement('button');
            togglePublicBtn.className = 'item-action-btn';
            togglePublicBtn.title = item.is_public ? "Make Private" : "Make Public";
            togglePublicBtn.innerHTML = item.is_public ? getEyeOffIcon() : getEyeIcon();
            togglePublicBtn.onclick = () => handleTogglePublic(item);
            actionsDiv.appendChild(togglePublicBtn);

            const shareLinkBtn = document.createElement('button');
            shareLinkBtn.className = 'item-action-btn';
            shareLinkBtn.title = 'Get Share Link';
            shareLinkBtn.innerHTML = getShareIcon();
            shareLinkBtn.onclick = () => handleShareLink(item);
            actionsDiv.appendChild(shareLinkBtn);
        }

        itemDiv.appendChild(actionsDiv);
        fileListDiv.appendChild(itemDiv);
    });
}

// Renders file list for 'snaw' admin view (shows paths)
function renderFileListAdmin(items) {
    const fileListDiv = document.getElementById('file-list');
    if (!fileListDiv) return;

    fileListDiv.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'w-full text-sm text-left';
    table.style.setProperty('color', 'var(--text-primary)');
    table.style.setProperty('border', '1px solid var(--border-primary)');
    table.style.setProperty('background-color', 'var(--bg-window)');
    table.style.setProperty('border-radius', '3px');

    table.innerHTML = `
        <thead style="background-color: var(--bg-title-bar); color: var(--text-title-bar);">
            <tr>
                <th class="p-3">Type</th>
                <th class="p-3">Name</th>
                <th class="p-3">Owner</th>
                <th class="p-3">Path</th>
                <th class="p-3">Size</th>
                <th class="p-3">Public</th>
                <th class="p-3">Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-3 text-center" style="color: var(--text-secondary);">No files found across all users.</td></tr>`;
    }

    items.forEach(item => {
        const isFolder = item.mime_type === 'application/vnd.snugos.folder';
        const row = document.createElement('tr');
        row.className = 'border-b';
        row.style.setProperty('border-color', 'var(--border-secondary)');
        row.style.setProperty('background-color', 'var(--bg-window-content)');

        let fileNameDisplay = item.file_name;
        if (!isFolder) {
            fileNameDisplay = `<a href="${item.s3_url}" target="_blank" rel="noopener noreferrer" class="hover:underline">${item.file_name}</a>`;
        }

        row.innerHTML = `
            <td class="p-3">${isFolder ? 'Folder' : 'File'}</td>
            <td class="p-3">${fileNameDisplay}</td>
            <td class="p-3">${item.owner_username || item.user_id}</td>
            <td class="p-3 truncate max-w-[200px]">${item.path}</td>
            <td class="p-3">${item.file_size ? (item.file_size / 1024 / 1024).toFixed(2) + ' MB' : '-'}</td>
            <td class="p-3">${item.is_public ? 'Yes' : 'No'}</td>
            <td class="p-3">
                <div class="flex flex-wrap gap-1">
                    <button class="item-action-btn" title="Rename" onclick="handleRename(${JSON.stringify(item).replace(/"/g, '&quot;')})">${getEditIcon()}</button>
                    <button class="item-action-btn" title="Delete" onclick="handleDeleteItem(${JSON.stringify(item).replace(/"/g, '&quot;')})" style="color: #EF4444;">${getTrashIcon()}</button>
                    ${!isFolder ? `<button class="item-action-btn" title="${item.is_public ? 'Make Private' : 'Make Public'}" onclick="handleTogglePublic(${JSON.stringify(item).replace(/"/g, '&quot;')})">${item.is_public ? getEyeOffIcon() : getEyeIcon()}</button>` : ''}
                    ${!isFolder ? `<button class="item-action-btn" title="Get Share Link" onclick="handleShareLink(${JSON.stringify(item).replace(/"/g, '&quot;')})">${getShareIcon()}</button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    fileListDiv.appendChild(table);
}

// --- Drag and Drop Handlers (for uploads and internal moves) ---

function handleDropTargetDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/json')) {
        let targetElement = e.currentTarget;
        if (targetElement.dataset.isDropTarget === 'true' || targetElement.id === 'file-list') {
            targetElement.classList.add('drop-target-hover');
        }
    }
}

function handleDropTargetDragLeave(e) {
    e.stopPropagation();
    let targetElement = e.currentTarget;
    if (targetElement.dataset.isDropTarget === 'true' || targetElement.id === 'file-list') {
        targetElement.classList.remove('drop-target-hover');
    }
}

async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    let targetElement = e.currentTarget;
    targetElement.classList.remove('drop-target-hover');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        await uploadFiles(files);
        return;
    }

    try {
        const draggedItemData = JSON.parse(e.dataTransfer.getData('application/json'));
        const draggedItemId = draggedItemData.id;
        const draggedItemType = draggedItemData.type;
        const draggedItemName = draggedItemData.name;
        const draggedItemCurrentPath = draggedItemData.path;

        let dropTargetPath;

        if (targetElement.id === 'file-list') {
            dropTargetPath = currentPath;
        } else if (targetElement.dataset.isDropTarget === 'true' && targetElement.dataset.itemType === 'application/vnd.snugos.folder') {
            dropTargetPath = targetElement.dataset.dropTargetPath;
        } else {
            showMessage("Invalid drop target. You can only drop items into folders or the current directory's main area.", 3000); // Use local showMessage
            return;
        }

        if (draggedItemId === targetElement.dataset.itemId && dropTargetPath === draggedItemCurrentPath) {
            showMessage("Cannot drop an item onto itself (already in target location).", 3000); // Use local showMessage
            return;
        }

        if (dropTargetPath === draggedItemCurrentPath) {
            showMessage("Item is already in this location.", 3000); // Use local showMessage
            return;
        }

        const draggedItemFullPath = draggedItemCurrentPath + draggedItemName + (draggedItemType === 'application/vnd.snugos.folder' ? '/' : '');
        if (draggedItemType === 'application/vnd.snugos.folder' && dropTargetPath.startsWith(draggedItemFullPath)) {
            showMessage("Cannot move a folder into its own subfolder.", 3000); // Use local showMessage
            return;
        }

        await handleMoveItem(draggedItemId, dropTargetPath);

    } catch (error) {
        console.error("Drag and drop error:", error);
        showMessage("An error occurred during drag and drop. " + error.message, 5000); // Use local showMessage
    }
}

// --- Main App Renderer ---

function renderApp() {
    const loginPage = document.getElementById('login-page');
    const appContent = document.getElementById('app-content');
    const loggedInUserSpan = document.getElementById('logged-in-user');
    const logoutBtn = document.getElementById('logout-btn');
    const snawAdminSection = document.getElementById('snaw-admin-section'); // Ref to admin section

    if (currentUser) { // Use local currentUser from checkLocalAuth or successful login
        loginPage?.classList.add('hidden');
        appContent?.classList.remove('hidden');
        loggedInUserSpan.innerHTML = `Logged in as: <span class="font-semibold" style="color: var(--text-primary);">${currentUser.username}</span>`;
        logoutBtn?.classList.remove('hidden');

        if (currentUser.username === 'snaw') {
            snawAdminSection?.classList.remove('hidden');
        } else {
            snawAdminSection?.classList.add('hidden');
            isAdminView = false; // Ensure admin view is off if not 'snaw'
        }

        renderBreadcrumbs();
        fetchFiles();
    } else {
        loggedInUserSpan.textContent = ''; // Clear user display
        logoutBtn?.classList.add('hidden');
        appContent?.classList.add('hidden'); // Hide app content
        loginPage?.classList.remove('hidden'); // Show login page

        // Reset login/register form titles/buttons
        const authTitle = document.getElementById('auth-title');
        const authBtnText = document.getElementById('auth-btn-text');
        const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
        if (authTitle && authBtnText && toggleAuthModeBtn) {
            authTitle.textContent = 'Login to SnugOS Browser';
            authBtnText.textContent = 'Login';
            toggleAuthModeBtn.textContent = 'Need an account? Register';
        }
    }
}

// --- Event Listeners ---

function attachBrowserEventListeners() {
    const authForm = document.getElementById('auth-form');
    const logoutBtn = document.getElementById('logout-btn');
    const createFolderBtn = document.getElementById('create-folder-btn');
    const uploadFileBtn = document.getElementById('upload-file-btn');
    const fileUploadInput = document.getElementById('file-upload-input');
    const viewAllFilesBtn = document.getElementById('view-all-files-btn');
    const fileListDiv = document.getElementById('file-list');
    const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');

    if (authForm) authForm.addEventListener('submit', handleAuthSubmit); // Ensure only one listener
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (createFolderBtn) createFolderBtn.addEventListener('click', handleCreateFolder);
    if (uploadFileBtn) uploadFileBtn.addEventListener('click', handleUploadClick);
    if (fileUploadInput) fileUploadInput.addEventListener('change', handleFileInputChange);

    if (viewAllFilesBtn) {
        viewAllFilesBtn.addEventListener('click', () => {
            isAdminView = !isAdminView;
            if (isAdminView) {
                currentPath = '/';
            }
            renderApp();
        });
    }

    if (fileListDiv) {
        fileListDiv.addEventListener('dragover', handleDropTargetDragOver);
        fileListDiv.addEventListener('dragleave', handleDropTargetDragLeave);
        fileListDiv.addEventListener('drop', handleDrop);
    }

    if (toggleAuthModeBtn) {
        toggleAuthModeBtn.addEventListener('click', () => {
            authMode = authMode === 'login' ? 'register' : 'login';
            renderApp(); // Re-render to update form based on authMode
        });
    }
}

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Check initial auth state on page load
    token = localStorage.getItem('snugos_token'); // Get token from localStorage directly
    if (token) {
        fetchUserProfile(); // Attempt to fetch user profile if token exists
    } else {
        renderApp(); // Show login page if no token
    }
    attachBrowserEventListeners(); // Attach event listeners
});