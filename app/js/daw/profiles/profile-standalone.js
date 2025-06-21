// js/daw/profiles/profile-standalone.js
// NOTE: This file is the main JavaScript for the standalone SnugOS Profile application (profile.html).
// It manages its own authentication and UI, as it is a top-level page.

// Base URL for your backend server
const SERVER_URL = 'https://snugos-server-api.onrender.com'; // Direct use for standalone app

// Global state variables for this standalone app
let token = localStorage.getItem('snugos_token'); // Get token from localStorage directly
let currentUser = null; // Stores { id, username }
let currentProfileData = null;
let isEditing = false;
let authMode = 'login'; // 'login' or 'register'

// DOM Elements (assuming they exist in profile.html)
const loadingOverlay = document.getElementById('loading-overlay');
const messageDialog = document.getElementById('message-dialog');
const messageText = document.getElementById('message-text');
const messageConfirmBtn = document.getElementById('message-confirm-btn');
const messageCancelBtn = document.getElementById('message-cancel-btn');

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

const profileContainer = document.getElementById('profile-container');
const avatarUploadInput = document.getElementById('avatarUploadInput');
const customBgInput = document.getElementById('customBgInput');

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
        if (onConfirm) onConfirm();
    };

    if (showCancel) {
        messageCancelBtn.onclick = () => {
            messageDialog.classList.add('hidden');
            if (onCancel) onCancel();
        };
    }
}

// --- Authentication Functions (Local to this standalone app) ---

async function fetchUserProfileData() {
    if (!token) return;
    showLoading();
    try {
        const response = await fetch(`${SERVER_URL}/api/profile/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            currentUser = data.profile;
            renderProfileApp(); // Render the profile content after fetching current user's data
        } else {
            console.error("Failed to fetch user profile:", response.statusText);
            token = null;
            localStorage.removeItem('snugos_token');
            renderProfileApp(); // Go back to login if profile fetch fails
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        token = null;
        localStorage.removeItem('snugos_token');
        renderProfileApp(); // Go back to login
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
            localStorage.setItem('snugos_token', token);
            currentUser = data.user;
            renderProfileApp(); // Re-render the profile application after successful auth
        } else {
            document.getElementById('auth-message').textContent = data.message || (authMode === 'register' ? 'Registration failed.' : 'Login failed.');
            document.getElementById('auth-message').classList.remove('hidden');
        }
    } catch (error) {
        console.error("Authentication error:", error);
        document.getElementById('auth-message').textContent = 'Network error or server unavailable.';
        document.getElementById('auth-message').classList.remove('hidden');
    } finally {
        authSubmitBtn.disabled = false;
        authSpinner.classList.add('hidden');
        authBtnText.textContent = authMode === 'register' ? 'Register' : 'Login';
    }
}

function handleLogout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('snugos_token');
    renderProfileApp(); // Re-render the profile app after logout
    showMessage('You have been logged out.');
}

// --- Profile Specific Functions ---

async function fetchProfileData(username, container) {
    container.innerHTML = '<p class="p-8 text-center" style="color: var(--text-secondary);">Loading Profile...</p>';

    try {
        const fetchUrl = `${SERVER_URL}/api/profiles/${username}`;
        
        // Only fetch friend status if current user is logged in
        const friendStatusPromise = currentUser ? fetch(`${SERVER_URL}/api/profiles/${username}/friend-status`, { headers: { 'Authorization': `Bearer ${token}` } }) : Promise.resolve(null);
        
        const [profileRes, friendStatusRes] = await Promise.all([
            fetch(fetchUrl),
            friendStatusPromise
        ]);

        const profileDataJson = await profileRes.json();
        if (!profileRes.ok) {
            throw new Error(profileDataJson.message || `Failed to fetch profile for ${username}.`);
        }
        
        currentProfileData = profileDataJson.profile;
        currentProfileData.isFriend = friendStatusRes ? (await friendStatusRes.json()).isFriend : false;

        updateProfileUI(container, currentProfileData);

    } catch (error) {
        container.innerHTML = `<p class="p-8 text-center" style="color:red;">Error: ${error.message}</p>`;
        showMessage(`Failed to load profile: ${error.message}`, 4000);
    }
}

function updateProfileUI(container, profileData) {
    const isOwner = currentUser && currentUser.id === profileData.id;
    const joinDate = new Date(profileData.created_at).toLocaleDateString();

    let avatarContent = profileData.avatar_url
        ? `<img src="${profileData.avatar_url}" alt="${profileData.username}'s avatar" class="w-full h-full object-cover">`
        : `<span class="text-4xl font-bold">${profileData.username.charAt(0).toUpperCase()}</span>`;

    const uploadOverlay = isOwner ? `<div id="avatarOverlay" class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer" title="Change Profile Picture"><svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 11.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 6.5 12 6.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z"/></svg></div>` : '';
        
    let actionButtons = '';
    if (isOwner) {
        actionButtons = `<button id="editProfileBtn" class="px-4 py-2 rounded" style="background-color: var(--bg-button); border: 1px solid var(--border-button); color: var(--text-button);">Edit Profile</button>`;
    } else if (currentUser) { // Show friend/message buttons if logged in and not owner.
        const friendBtnText = profileData.isFriend ? 'Remove Friend' : 'Add Friend';
        const friendBtnColor = profileData.isFriend ? 'var(--accent-armed)' : 'var(--accent-active)';
        actionButtons = `
            <button id="addFriendBtn" class="px-4 py-2 rounded text-white" style="background-color: ${friendBtnColor};">${friendBtnText}</button>
            <button id="messageBtn" class="px-4 py-2 rounded text-white ml-2" style="background-color: var(--accent-soloed); color: var(--accent-active-text);">Message</button>
        `;
    }

    const newContent = document.createElement('div');
    newContent.className = "h-full w-full";
    newContent.innerHTML = `
        <div class="bg-window text-primary h-full flex flex-col">
            <div class="relative h-40 bg-gray-700 bg-cover bg-center flex-shrink-0" style="background-image: url(${profileData.background_url || ''})">
                <div id="avatarContainer" class="absolute bottom-0 left-6 transform translate-y-1/2 w-28 h-28 rounded-full border-4 border-window bg-gray-500 flex items-center justify-center text-white overflow-hidden">
                    ${avatarContent}${uploadOverlay}
                </div>
            </div>
            <div class="pt-20 px-6 pb-4 border-b border-secondary flex justify-between items-end flex-shrink-0">
                <div><h2 class="text-2xl font-bold">${profileData.username}</h2><p class="text-sm text-secondary">Member since ${joinDate}</p></div>
                <div class="flex space-x-2">${actionButtons}</div>
            </div>
            <div id="profile-body-content" class="p-6 overflow-y-auto flex-grow"></div>
        </div>
    `;

    const profileBody = newContent.querySelector('#profile-body-content');
    if (isEditing && isOwner) {
        renderEditMode(profileBody, profileData);
    } else {
        renderViewMode(profileBody, profileData);
    }
    
    container.innerHTML = '';
    container.appendChild(newContent);

    if (isOwner) {
        newContent.querySelector('#avatarOverlay')?.addEventListener('click', () => avatarUploadInput.click());
        newContent.querySelector('#editProfileBtn')?.addEventListener('click', () => {
            isEditing = !isEditing;
            updateProfileUI(container, profileData);
        });
        customBgInput?.addEventListener('change', async (e) => {
            if (!e.target.files || !e.target.files[0] || !currentUser) return;
            const file = e.target.files[0];
            handleBackgroundUpload(file);
            e.target.value = null;
        });

        const backgroundArea = newContent.querySelector('.relative.h-40');
        if (backgroundArea) {
            backgroundArea.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                // In standalone, we don't have appServices.createContextMenu, so use a simple local alert or a custom modal.
                // For now, just trigger background input directly.
                customBgInput.click();
            });
        }
    } else if (currentUser) {
        newContent.querySelector('#addFriendBtn')?.addEventListener('click', () => handleAddFriendToggle(profileData.username, profileData.isFriend));
        newContent.querySelector('#messageBtn')?.addEventListener('click', () => showMessageModal(profileData.username));
        newContent.querySelectorAll('.username-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetUsername = e.target.dataset.username;
                if (targetUsername) {
                    window.location.href = `profile.html?user=${targetUsername}`;
                }
            });
        });
    }
}

function renderViewMode(container, profileData) {
    container.innerHTML = `
        <h3 class="font-semibold mb-2">Bio</h3>
        <p class="text-primary whitespace-pre-wrap">${profileData.bio || 'This user has not written a bio yet.'}</p>
    `;
}

function renderEditMode(container, profileData) {
    container.innerHTML = `
        <form id="editProfileForm" class="space-y-4">
            <div>
                <label for="editBio" class="block font-medium mb-1">Edit Bio</label>
                <textarea id="editBio" class="w-full p-2 border rounded-md" style="background-color: var(--bg-input); color: var(--text-primary); border-color: var(--border-input);" rows="5">${profileData.bio || ''}</textarea>
            </div>
            <div class="flex justify-end space-x-2">
                <button type="button" id="cancelEditBtn" class="px-4 py-2 rounded" style="background-color: var(--bg-button); border: 1px solid var(--border-button); color: var(--text-button);">Cancel</button>
                <button type="submit" id="saveProfileBtn" class="px-4 py-2 rounded text-white" style="background-color: var(--accent-active);">Save Changes</button>
            </div>
        </form>
    `;
    container.querySelector('#cancelEditBtn').addEventListener('click', () => {
        isEditing = false;
        updateProfileUI(container, profileData);
    });
    container.querySelector('#editProfileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newBio = container.querySelector('#editBio').value;
        saveProfile(profileData.username, { bio: newBio });
    });
}

async function handleAvatarUpload(file) {
    if (!currentUser) return;
    showMessage("Uploading picture...", 2000);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', '/avatars/');
    try {
        const response = await fetch(`${SERVER_URL}/api/files/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const uploadResult = await response.json();
        if (!uploadResult.success) throw new Error(uploadResult.message);
        
        const newAvatarUrl = uploadResult.file.s3_url;
        
        const settingsResponse = await fetch(`${SERVER_URL}/api/profile/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ avatar_url: newAvatarUrl })
        });
        const settingsResult = await settingsResponse.json();
        if (!settingsResult.success) throw new Error(settingsResult.message);

        showMessage("Profile picture updated!", 2000);
        fetchProfileData(currentUser.username, profileContainer); // Refresh the profile content

    } catch (error) {
        showMessage(`Update failed: ${error.message}`, 4000);
        console.error("Avatar Upload Error:", error);
    }
}

async function handleBackgroundUpload(file) {
    if (!currentUser) return;
    showMessage('Uploading background...', 1500);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_public', 'true'); // Backgrounds are generally public
    formData.append('path', '/backgrounds/');

    try {
        const response = await fetch(`${SERVER_URL}/api/files/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const uploadResult = await response.json();
        if (!uploadResult.success) throw new Error(uploadResult.message);

        const newBgUrl = uploadResult.file.s3_url;
        await fetch(`${SERVER_URL}/api/profile/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ background_url: newBgUrl })
        });

        showMessage("Background updated!", 2000);
        document.body.style.backgroundImage = `url(${newBgUrl})`; // Apply directly to body
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        fetchProfileData(currentUser.username, profileContainer); // Refresh the profile content if current user's
    } catch(error) {
        showMessage(`Error saving background: ${error.message}`, 4000);
        console.error("Background Upload Error:", error);
    }
}

async function saveProfile(username, dataToSave) {
    if (!currentUser) return;
    showMessage("Saving...", 1500);
    try {
        const response = await fetch(`${SERVER_URL}/api/profiles/${username}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(dataToSave)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showMessage("Profile saved!", 2000);
        isEditing = false;
        fetchProfileData(username, profileContainer); // Re-fetch data to update UI.
    } catch (error) {
        showMessage(`Error: ${error.message}`, 4000);
        console.error("Save Profile Error:", error);
    }
}

async function handleAddFriendToggle(username, isFriend) {
    if (!currentUser) return;
    const method = isFriend ? 'DELETE' : 'POST';
    showMessage(isFriend ? 'Removing friend...' : 'Adding friend...', 1500);
    try {
        const response = await fetch(`${SERVER_URL}/api/profiles/${username}/friend`, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ isFriend: isFriend })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showMessage(result.message, 2000);
        fetchProfileData(username, profileContainer); // Re-fetch profile to update friend status UI.
    } catch (error) {
        showMessage(`Error: ${error.message}`, 4000);
        console.error("Friend Action Error:", error);
    }
}

function showMessageModal(recipientUsername) {
    const modalContent = `<textarea id="messageTextarea" class="w-full p-2" rows="5" style="background-color: var(--bg-input); color: var(--text-primary); border-color: var(--border-input);"></textarea>`;
    showCustomModal(`Message ${recipientUsername}`, modalContent, [
        { label: 'Cancel' },
        { label: 'Send', action: () => {
            const content = document.getElementById('messageTextarea').value;
            if (content) sendMessage(recipientUsername, content);
        }}
    ]);
}

async function sendMessage(recipientUsername, content) {
    if (!currentUser) return;
    showMessage("Sending...", 1500);
    try {
        const response = await fetch(`${SERVER_URL}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({ recipientUsername, content })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showMessage("Message sent!", 2000);
    }
    catch (error) {
        showMessage(`Error: ${error.message}`, 4000);
        console.error("Send Message Error:", error);
    }
}

// --- Main App Renderer & Event Listeners ---

function renderProfileApp() {
    // Update logged in user display in header
    if (currentUser) {
        loggedInUserSpan.innerHTML = `Logged in as: <span class="font-semibold" style="color: var(--text-primary);">${currentUser.username}</span>`;
        logoutBtn?.classList.remove('hidden');
        appContent?.classList.remove('hidden'); // Show the main profile content
        // Fetch profile data based on URL or current user
        const urlParams = new URLSearchParams(window.location.search);
        const username = urlParams.get('user') || currentUser.username; // Default to current user's profile
        fetchProfileData(username, profileContainer);
    } else {
        // Not logged in: Show the login page
        loggedInUserSpan.textContent = '';
        logoutBtn?.classList.add('hidden');
        appContent?.classList.add('hidden'); // Hide profile content
        loginPage?.classList.remove('hidden'); // Show login page
        
        // Reset login/register form titles/buttons
        authTitle.textContent = 'Login to SnugOS Profile';
        document.getElementById('auth-btn-text').textContent = 'Login';
        toggleAuthModeBtn.textContent = 'Need an account? Register';
    }
}

function attachProfileEventListeners() {
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (authForm) authForm.addEventListener('submit', handleAuthSubmit);
    if (toggleAuthModeBtn) {
        toggleAuthModeBtn.addEventListener('click', () => {
            authMode = authMode === 'login' ? 'register' : 'login';
            // Update auth form UI based on mode
            authTitle.textContent = authMode === 'register' ? 'Register to SnugOS Profile' : 'Login to SnugOS Profile';
            document.getElementById('auth-btn-text').textContent = authMode === 'register' ? 'Register' : 'Login';
            toggleAuthModeBtn.textContent = authMode === 'register' ? 'Already have an account? Login' : 'Need an account? Register';
            document.getElementById('auth-message').classList.add('hidden'); // Clear message on toggle
        });
    }

    // Attach avatar and background upload input listeners
    if (avatarUploadInput) avatarUploadInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleAvatarUpload(e.target.files[0]);
        e.target.value = null;
    });
    if (customBgInput) customBgInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleBackgroundUpload(e.target.files[0]);
        e.target.value = null;
    });
}

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Check initial auth state on page load
    token = localStorage.getItem('snugos_token'); // Ensure token is read on DOMContentLoaded
    if (token) {
        fetchUserProfileData(); // Attempt to fetch user profile if token exists
    } else {
        renderProfileApp(); // Show login page if no token
    }
    attachProfileEventListeners();
});