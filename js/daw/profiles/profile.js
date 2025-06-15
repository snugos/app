// js/daw/profiles/profile.js
// NOTE: This file is designed to run within an iframe, hosted by index.html.
// It receives `appServices` from its parent window.

// Corrected imports for utils and db
import { storeAsset, getAsset } from '../db.js'; // Consolidated db import
import { showNotification, showCustomModal, createContextMenu } from '../utils.js'; // Consolidated utils import

let appServices = {}; // Will be populated by the parent window.
let loggedInUser = null;
const SERVER_URL = 'https://snugos-server-api.onrender.com'; // Defined in constants.js, but hardcoding here to ensure iframe works if constants isn't available
let currentProfileData = null;
let isEditing = false;

// This is the new entry point for when the iframe content is loaded by the parent.
// It will be called by `initializePage` in `profile.html`.
function initProfilePageInIframe(injectedAppServices) {
    appServices = injectedAppServices;

    // Use appServices for window/modal management (ensure parent's services are used)
    // Assuming `appServices` object from parent is fully formed.
    // Fallback to window.parent.appServices if not directly injected (for robustness)
    appServices.showNotification = appServices.showNotification || window.parent.appServices.showNotification || showNotification;
    appServices.showCustomModal = appServices.showCustomModal || window.parent.appServices.showCustomModal || showCustomModal;
    appServices.createContextMenu = appServices.createContextMenu || window.parent.appServices.createContextMenu || createContextMenu;
    // For profile to open other profiles, it also needs openEmbeddedAppInWindow
    appServices.openEmbeddedAppInWindow = appServices.openEmbeddedAppInWindow || window.parent.appServices.openEmbeddedAppInWindow;
    
    // Check local auth, but apply global settings via injected appServices.
    loggedInUser = checkLocalAuth();
    loadAndApplyGlobals();

    attachProfileWindowListeners(); // Attach listeners relevant to profile content
    
    // Get username from URL (still relevant for individual profile pages)
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user');

    if (username) {
        // No need to open a SnugWindow, we are already IN the SnugWindow iframe.
        // Just fetch and render the profile content directly into `#profile-container`.
        fetchProfileData(username, document.getElementById('profile-container'));
    } else {
        appServices.showCustomModal('Error', '<p class="p-4">No user profile specified in the URL.</p>', [{label: 'Close'}]);
    }
}

// --- Main Profile Content Loading and Rendering ---

async function fetchProfileData(username, container) {
    // container is now #profile-container directly within this iframe
    container.innerHTML = '<p class="p-8 text-center">Loading Profile...</p>';

    try {
        const token = localStorage.getItem('snugos_token');
        const [profileRes, friendStatusRes] = await Promise.all([
            fetch(`${SERVER_URL}/api/profiles/${username}`),
            token ? fetch(`${SERVER_URL}/api/profiles/${username}/friend-status`, { headers: { 'Authorization': `Bearer ${token}` } }) : Promise.resolve(null)
        ]);

        const profileData = await profileRes.json();
        if (!profileRes.ok) throw new Error(profileData.message);
        
        const friendStatusData = friendStatusRes ? await friendStatusRes.json() : null;
        
        currentProfileData = profileData.profile;
        currentProfileData.isFriend = friendStatusData?.isFriend || false;

        updateProfileUI(document.getElementById('profile-container'), currentProfileData);

    } catch (error) {
        document.getElementById('profile-container').innerHTML = `<p class="p-8 text-center" style="color:red;">Error: ${error.message}</p>`;
        appServices.showNotification(`Failed to load profile: ${error.message}`, 4000);
    }
}

function updateProfileUI(container, profileData) {
    const isOwner = loggedInUser && loggedInUser.id === profileData.id;
    const joinDate = new Date(profileData.created_at).toLocaleDateString();

    let avatarContent = profileData.avatar_url
        ? `<img src="${profileData.avatar_url}" alt="${profileData.username}'s avatar" class="w-full h-full object-cover">`
        : `<span class="text-4xl font-bold">${profileData.username.charAt(0).toUpperCase()}</span>`;

    const uploadOverlay = isOwner ? `<div id="avatarOverlay" class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer" title="Change Profile Picture"><svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 11.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 6.5 12 6.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z"/></svg></div>` : '';
        
    let actionButtons = '';
    if (isOwner) {
        actionButtons = `<button id="editProfileBtn" class="px-4 py-2 rounded" style="background-color: var(--bg-button); border: 1px solid var(--border-button); color: var(--text-button);">Edit Profile</button>`;
    } else if (loggedInUser) {
        const friendBtnText = profileData.isFriend ? 'Remove Friend' : 'Add Friend';
        const friendBtnColor = profileData.isFriend ? 'var(--accent-armed)' : 'var(--accent-active)';
        actionButtons = `
            <button id="addFriendBtn" class="px-4 py-2 rounded text-white" style="background-color: ${friendBtnColor};">${friendBtnText}</button>
            <button id="messageBtn" class="px-4 py-2 rounded text-white ml-2" style="background-color: var(--accent-soloed);">Message</button>
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
    
    // Attach listeners for buttons and avatar upload
    if (isOwner) {
        // Corrected event listener attachment for dynamically created elements
        container.querySelector('#avatarOverlay')?.addEventListener('click', () => document.getElementById('avatarUploadInput').click());
        container.querySelector('#editProfileBtn')?.addEventListener('click', () => {
            isEditing = !isEditing;
            updateProfileUI(container, profileData);
        });
        // Attach event listener for background upload input
        const customBgInput = document.getElementById('customBgInput');
        if (customBgInput) {
            customBgInput.addEventListener('change', async (e) => {
                if (!e.target.files || !e.target.files[0] || !loggedInUser) return;
                const file = e.target.files[0];
                handleBackgroundUpload(file); // Call the newly created handleBackgroundUpload
                e.target.value = null; // Clear input after selection
            });

            // Add context menu to background area for owner
            const backgroundArea = newContent.querySelector('.relative.h-40');
            if (backgroundArea) {
                backgroundArea.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    appServices.createContextMenu(e, [
                        { label: 'Change Background', action: () => customBgInput.click() }
                    ]);
                });
            }
        }
    } else if (loggedInUser) {
        container.querySelector('#addFriendBtn')?.addEventListener('click', () => handleAddFriendToggle(profileData.username, profileData.isFriend));
        container.querySelector('#messageBtn')?.addEventListener('click', () => showMessageModal(profileData.username));
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

function attachProfileWindowListeners() {
    // This function now primarily handles avatar upload, which is specific to profile.html
    // The customBgInput listener is moved into updateProfileUI for dynamic attachment
    // after content update.
    document.getElementById('avatarUploadInput')?.addEventListener('change', async (e) => {
        if(!e.target.files || !e.target.files[0] || !loggedInUser) return;
        const file = e.target.files[0];
        handleAvatarUpload(file);
        e.target.value = null; 
    });
}

/**
 * Handles uploading an avatar file to the server and updating profile settings.
 * @param {File} file - The image file selected for the avatar.
 */
async function handleAvatarUpload(file) {
    if (!loggedInUser) return;
    appServices.showNotification("Uploading picture...", 2000);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', '/avatars/'); // Specific path for avatars
    try {
        const token = localStorage.getItem('snugos_token');
        const uploadResponse = await fetch(`${SERVER_URL}/api/files/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResult.success) throw new Error(uploadResult.message);
        
        const newAvatarUrl = uploadResult.file.s3_url;
        
        const settingsResponse = await fetch(`${SERVER_URL}/api/profile/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ avatar_url: newAvatarUrl })
        });
        const settingsResult = await settingsResponse.json();
        if (!settingsResult.success) throw new Error(settingsResult.message);

        appServices.showNotification("Profile picture updated!", 2000);
        // After successful update, re-fetch profile data to refresh UI with new URL
        await fetchProfileData(loggedInUser.username, document.getElementById('profile-container'));
        
        // If the parent (index.html) has a way to update its auth UI (e.g., avatar on top bar)
        if (window.parent && window.parent.appServices && window.parent.appServices.updateUserAuthContainer) { 
             window.parent.appServices.updateUserAuthContainer(loggedInUser);
        }

    } catch (error) {
        appServices.showNotification(`Update failed: ${error.message}`, 4000);
        console.error("Avatar Upload Error:", error);
    }
}

/**
 * Handles uploading a background file to the server and updating profile settings.
 * This function is now part of profile.js as it's directly related to profile background.
 * It uses the main `db.js` for asset storage.
 * @param {File} file - The image/video file selected for the background.
 */
async function handleBackgroundUpload(file) {
    if (!loggedInUser) {
        appServices.showNotification('You must be logged in to save a custom background.', 3000);
        return;
    }

    try {
        appServices.showNotification('Uploading background...', 1500);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_public', 'true'); // Backgrounds are generally public
        formData.append('path', '/backgrounds/'); // Specific path for backgrounds

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

        appServices.showNotification("Background updated!", 2000);
        // After successful upload, store it locally and apply it
        await storeAsset(`background-for-user-${loggedInUser.id}`, file); // Store locally using db.js
        // If the parent (index.html) has an `applyCustomBackground` function
        if (window.parent && window.parent.appServices && window.parent.appServices.applyCustomBackground) {
            window.parent.appServices.applyCustomBackground(file); // Apply to parent desktop immediately
        } else {
            // Fallback for standalone profile or direct background update within iframe
            const desktopEl = document.getElementById('profile-container').closest('.window-content');
            if (desktopEl) {
                if (file.type.startsWith('image/')) {
                    desktopEl.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
                    desktopEl.style.backgroundSize = 'cover';
                    desktopEl.style.backgroundPosition = 'center';
                } else if (file.type.startsWith('video/')) {
                    // Handle video background if needed in iframe
                }
            }
        }
        // Re-fetch profile data to ensure the URL is updated
        await fetchProfileData(loggedInUser.username, document.getElementById('profile-container'));

    } catch(error) {
        appServices.showNotification(`Error saving background: ${error.message}`, 4000);
        console.error("Background Upload Error:", error);
    }
}


async function saveProfile(username, dataToSave) {
    const token = localStorage.getItem('snugos_token');
    if (!token) return;
    appServices.showNotification("Saving...", 1500);
    try {
        const response = await fetch(`${SERVER_URL}/api/profiles/${username}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(dataToSave)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        appServices.showNotification("Profile saved!", 2000);
        isEditing = false;
        fetchProfileData(username, document.getElementById('profile-container'));
    } catch (error) {
        appServices.showNotification(`Error: ${error.message}`, 4000);
        console.error("Save Profile Error:", error);
    }
}

async function handleAddFriendToggle(username, isFriend) {
    const token = localStorage.getItem('snugos_token');
    if (!token) {
        appServices.showNotification('You must be logged in to add/remove friends.', 3000);
        return;
    }
    const method = isFriend ? 'DELETE' : 'POST';
    appServices.showNotification(isFriend ? 'Removing friend...' : 'Adding friend...', 1500);
    try {
        const response = await fetch(`${SERVER_URL}/api/profiles/${username}/friend`, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        appServices.showNotification(result.message, 2000);
        fetchProfileData(username, document.getElementById('profile-container'));
    } catch (error) {
        appServices.showNotification(`Error: ${error.message}`, 4000);
        console.error("Friend Action Error:", error);
    }
}

function showMessageModal(recipientUsername) {
    const modalContent = `<textarea id="messageTextarea" class="w-full p-2" rows="5" style="background-color: var(--bg-input); color: var(--text-primary); border-color: var(--border-input);"></textarea>`;
    appServices.showCustomModal(`Message ${recipientUsername}`, modalContent, [
        { label: 'Cancel' },
        { label: 'Send', action: () => {
            const content = document.getElementById('messageTextarea').value;
            if (content) sendMessage(recipientUsername, content);
        }}
    ]);
}

async function sendMessage(recipientUsername, content) {
    const token = localStorage.getItem('snugos_token');
    if (!token) {
        appServices.showNotification('You must be logged in to send messages.', 3000);
        return;
    }
    appServices.showNotification("Sending...", 1500);
    try {
        const response = await fetch(`${SERVER_URL}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({ recipientUsername, content })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        appServices.showNotification("Message sent!", 2000);
    } catch (error) {
        appServices.showNotification(`Error: ${error.message}`, 4000);
        console.error("Send Message Error:", error);
    }
}

async function loadAndApplyGlobals() {
    if (!loggedInUser) return;
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/profile/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if (data.success && data.profile.background_url) {
            // Apply background to the parent desktop
            if (window.parent && window.parent.appServices && window.parent.appServices.applyCustomBackground) {
                window.parent.appServices.applyCustomBackground(data.profile.background_url);
            }
        }
        // Update parent's auth container with user info
        if (window.parent && window.parent.appServices && window.parent.appServices.updateUserAuthContainer) {
            window.parent.appServices.updateUserAuthContainer(loggedInUser);
        }
    } catch (error) {
        console.error("Could not apply global settings:", error);
    }
}

function checkLocalAuth() {
    try {
        const token = localStorage.getItem('snugos_token');
        if (!token) return null;
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
    loggedInUser = null;
    appServices.showNotification('You have been logged out.', 2000);
    // If logout in iframe should affect parent, it needs to call parent's logout.
    if (window.parent && window.parent.appServices && window.parent.appServices.handleLogout) {
        window.parent.appServices.handleLogout(); // Call parent's logout
    } else {
        window.location.reload(); // Fallback for standalone page
    }
}