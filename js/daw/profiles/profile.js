// js/daw/profiles/profile.js
// NOTE: This file is designed to run within an iframe, hosted by index.html.
// It receives `appServices` from its parent window.

// No direct import of SnugWindow here as this script runs inside an already existing SnugWindow iframe.
// We import common utilities which are expected to be available via `appServices` after initialization.
// The parent `index.html` (or `welcome.js`) handles global utility imports and passes appServices.
// We explicitly import storeAsset/getAsset as they are directly used for DB operations.
import { storeAsset, getAsset } from '/app/js/daw/db.js'; // Corrected path
import { SERVER_URL } from '/app/js/daw/constants.js'; // Corrected path
// Assuming utils.js functions are accessed via appServices, no direct import needed here for utils methods.
// The original file did not have a direct import from utils.js, but it's good to reconfirm.

let appServices = {}; // This will be assigned the actual appServices object from the parent.
let loggedInUser = null;
let currentProfileData = null;
let isEditing = false;

/**
 * Entry point function for the Profile page when loaded within an iframe.
 * This function is called by the parent window's `initializePage` function.
 * @param {object} injectedAppServices - The appServices object passed from the parent window.
 */
function initProfilePageInIframe(injectedAppServices) {
    appServices = injectedAppServices; // Assign the injected appServices

    // Check local authentication state.
    loggedInUser = checkLocalAuth();

    // Load user's global settings (like background) via parent's appServices.
    loadAndApplyGlobals();

    // Attach event listeners specific to the profile page elements within the iframe.
    attachProfilePageListeners();
    
    // Get the username from the URL query parameter.
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user');

    const profileContainer = document.getElementById('profile-container');
    if (username && profileContainer) {
        // Fetch and render the profile data directly into the iframe's container.
        fetchProfileData(username, profileContainer);
    } else {
        // Display an error if no username is specified.
        profileContainer.innerHTML = '<p class="p-8 text-center" style="color:red;">No user profile specified in the URL.</p>';
        appServices.showCustomModal('Error', '<p class="p-4">No user profile specified in the URL.</p>', [{label: 'Close'}]);
    }
}

// Make the initialization function globally accessible for the parent window.
window.initProfilePageInIframe = initProfilePageInIframe;

// --- Main Profile Content Loading and Rendering ---

/**
 * Fetches profile data from the server and updates the UI.
 * @param {string} username - The username of the profile to fetch.
 * @param {HTMLElement} container - The DOM element where the profile UI will be rendered.
 */
async function fetchProfileData(username, container) {
    container.innerHTML = '<p class="p-8 text-center">Loading Profile...</p>';

    try {
        const token = localStorage.getItem('snugos_token'); // Get token from localStorage
        
        // Fetch profile data and friend status concurrently.
        const [profileRes, friendStatusRes] = await Promise.all([
            fetch(`${SERVER_URL}/api/profiles/${username}`), // Fetch profile details
            token ? fetch(`${SERVER_URL}/api/profiles/${username}/friend-status`, { headers: { 'Authorization': `Bearer ${token}` } }) : Promise.resolve(null) // Fetch friend status if logged in
        ]);

        const profileData = await profileRes.json();
        if (!profileRes.ok) {
            // Handle HTTP errors or API-specific errors.
            throw new Error(profileData.message || `Failed to fetch profile for ${username}.`);
        }
        
        const friendStatusData = friendStatusRes ? await friendStatusRes.json() : null;
        
        currentProfileData = profileData.profile; // Store the fetched profile data.
        currentProfileData.isFriend = friendStatusData?.isFriend || false; // Set friend status.

        updateProfileUI(container, currentProfileData); // Update the UI with the fetched data.

    } catch (error) {
        // Display error message if fetching fails.
        container.innerHTML = `<p class="p-8 text-center" style="color:red;">Error: ${error.message}</p>`;
        appServices.showNotification(`Failed to load profile: ${error.message}`, 4000);
    }
}

/**
 * Updates the profile UI with the provided profile data.
 * @param {HTMLElement} container - The DOM element to update (e.g., #profile-container).
 * @param {object} profileData - The profile data object.
 */
function updateProfileUI(container, profileData) {
    const isOwner = loggedInUser && loggedInUser.id === profileData.id; // Check if the logged-in user is the profile owner.
    const joinDate = new Date(profileData.created_at).toLocaleDateString(); // Format join date.

    let avatarContent = profileData.avatar_url
        ? `<img src="${profileData.avatar_url}" alt="${profileData.username}'s avatar" class="w-full h-full object-cover">`
        : `<span class="text-4xl font-bold">${profileData.username.charAt(0).toUpperCase()}</span>`; // Default avatar if URL is missing.

    const uploadOverlay = isOwner ? `<div id="avatarOverlay" class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer" title="Change Profile Picture"><svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 11.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 6.5 12 6.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z"/></svg></div>` : '';
        
    let actionButtons = '';
    if (isOwner) {
        actionButtons = `<button id="editProfileBtn" class="px-4 py-2 rounded" style="background-color: var(--bg-button); border: 1px solid var(--border-button); color: var(--text-button);">Edit Profile</button>`;
    } else if (loggedInUser) { // Show friend/message buttons if logged in and not owner.
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
    
    container.innerHTML = ''; // Clear existing content
    container.appendChild(newContent); // Append new content

    // Attach event listeners to the dynamically created elements
    if (isOwner) {
        newContent.querySelector('#avatarOverlay')?.addEventListener('click', () => document.getElementById('avatarUploadInput').click());
        newContent.querySelector('#editProfileBtn')?.addEventListener('click', () => {
            isEditing = !isEditing;
            updateProfileUI(container, profileData); // Re-render in edit mode or view mode
        });
        // Attach listener for background upload input (which is outside the newContent)
        const customBgInput = document.getElementById('customBgInput');
        if (customBgInput) {
            customBgInput.addEventListener('change', async (e) => {
                if (!e.target.files || !e.target.files[0] || !loggedInUser) return;
                const file = e.target.files[0];
                handleBackgroundUpload(file); // Call the dedicated background upload handler
                e.target.value = null; // Clear input
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
        newContent.querySelector('#addFriendBtn')?.addEventListener('click', () => handleAddFriendToggle(profileData.username, profileData.isFriend));
        newContent.querySelector('#messageBtn')?.addEventListener('click', () => showMessageModal(profileData.username));
        // If there are links to other user profiles in the bio, add listeners
        newContent.querySelectorAll('.username-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetUsername = e.target.dataset.username;
                if (targetUsername && appServices.openEmbeddedAppInWindow) {
                    // Open another profile in a new SnugWindow using the parent's service
                    appServices.openEmbeddedAppInWindow(`profile-${targetUsername}`, `${targetUsername}'s Profile`, `/app/js/daw/profiles/profile.html?user=${targetUsername}`, { width: 600, height: 700 });
                }
            });
        });
    }
}

/**
 * Renders the profile in view mode.
 * @param {HTMLElement} container - The DOM element to render into.
 * @param {object} profileData - The profile data.
 */
function renderViewMode(container, profileData) {
    // Basic bio display
    container.innerHTML = `
        <h3 class="font-semibold mb-2">Bio</h3>
        <p class="text-primary whitespace-pre-wrap">${profileData.bio || 'This user has not written a bio yet.'}</p>
    `;
    // Future: Parse bio for @mentions or #hashtags and convert to links.
}

/**
 * Renders the profile in edit mode, allowing the owner to modify their bio.
 * @param {HTMLElement} container - The DOM element to render into.
 * @param {object} profileData - The profile data.
 */
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
        updateProfileUI(container, profileData); // Re-render in view mode.
    });
    container.querySelector('#editProfileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newBio = container.querySelector('#editBio').value;
        saveProfile(profileData.username, { bio: newBio }); // Save changes.
    });
}

/**
 * Attaches event listeners to elements that exist globally on the profile page's HTML,
 * like the avatar upload input.
 */
function attachProfilePageListeners() {
    document.getElementById('avatarUploadInput')?.addEventListener('change', async (e) => {
        if(!e.target.files || !e.target.files[0] || !loggedInUser) return;
        const file = e.target.files[0];
        handleAvatarUpload(file); // Handle avatar file upload.
        e.target.value = null; // Clear input.
    });

    // The customBgInput listener is attached dynamically in updateProfileUI for the owner
    // when the profile is rendered, to ensure it binds to the correct element.
}


/**
 * Handles the upload of an avatar image file to the server.
 * @param {File} file - The image file for the avatar.
 */
async function handleAvatarUpload(file) {
    if (!loggedInUser) {
        appServices.showNotification('You must be logged in to update your profile picture.', 3000);
        return;
    }
    appServices.showNotification("Uploading picture...", 2000);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', '/avatars/'); // Specify upload path for avatars on S3.
    try {
        const token = localStorage.getItem('snugos_token');
        const uploadResponse = await fetch(`${SERVER_URL}/api/files/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResult.success) throw new Error(uploadResult.message);
        
        const newAvatarUrl = uploadResult.file.s3_url; // Get the URL of the uploaded file.
        
        // Update the user's profile settings on the server with the new avatar URL.
        const settingsResponse = await fetch(`${SERVER_URL}/api/profile/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ avatar_url: newAvatarUrl })
        });
        const settingsResult = await settingsResponse.json();
        if (!settingsResult.success) throw new Error(settingsResult.message);

        appServices.showNotification("Profile picture updated!", 2000);
        // Re-fetch profile data to update the UI with the new avatar.
        await fetchProfileData(loggedInUser.username, document.getElementById('profile-container'));
        
        // If the parent (index.html) has a way to update its auth UI (e.g., avatar on top bar)
        // this is where you'd call it. Assuming it receives user object.
        if (window.parent && window.parent.appServices && typeof window.parent.appServices.updateUserAuthContainer === 'function') { 
             window.parent.appServices.updateUserAuthContainer(loggedInUser);
        }

    } catch (error) {
        appServices.showNotification(`Update failed: ${error.message}`, 4000);
        console.error("Avatar Upload Error:", error);
    }
}

/**
 * Handles the upload of a custom background file to the server.
 * This function uses the main app's authentication and file services.
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
        formData.append('path', '/backgrounds/'); // Specific path for backgrounds on S3.

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
        // After successful upload, store it locally via appServices' DB service
        await storeAsset(`background-for-user-${loggedInUser.id}`, file); 
        // Apply background to the parent desktop if parent has the service.
        if (window.parent && window.parent.appServices && typeof window.parent.appServices.applyCustomBackground === 'function') {
            window.parent.appServices.applyCustomBackground(file); 
        }
        // Re-fetch profile data to ensure the URL is updated and UI reflects new background immediately.
        await fetchProfileData(loggedInUser.username, document.getElementById('profile-container'));

    } catch(error) {
        appServices.showNotification(`Error saving background: ${error.message}`, 4000);
        console.error("Background Upload Error:", error);
    }
}


/**
 * Saves profile changes (e.g., bio) to the server.
 * @param {string} username - The username of the profile to save.
 * @param {object} dataToSave - An object containing the data to update (e.g., { bio: '...' }).
 */
async function saveProfile(username, dataToSave) {
    const token = localStorage.getItem('snugos_token');
    if (!token) {
        appServices.showNotification('You must be logged in to save your profile.', 3000);
        return;
    }
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
        isEditing = false; // Exit edit mode.
        fetchProfileData(username, document.getElementById('profile-container')); // Re-fetch data to update UI.
    } catch (error) {
        appServices.showNotification(`Error: ${error.message}`, 4000);
        console.error("Save Profile Error:", error);
    }
}

/**
 * Handles adding or removing a friend.
 * @param {string} username - The username of the friend to add/remove.
 * @param {boolean} isFriend - True if currently friends, false otherwise.
 */
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
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ isFriend: isFriend }) // Ensure payload is correct for server
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        appServices.showNotification(result.message, 2000);
        fetchProfileData(username, document.getElementById('profile-container')); // Re-fetch profile to update friend status UI.
    } catch (error) {
        appServices.showNotification(`Error: ${error.message}`, 4000);
        console.error("Friend Action Error:", error);
    }
}

/**
 * Displays a modal for sending a message to a user.
 * @param {string} recipientUsername - The username of the message recipient.
 */
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

/**
 * Sends a message to a specified recipient.
 * @param {string} recipientUsername - The username of the recipient.
 * @param {string} content - The message content.
 */
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
    }
    catch (error) {
        appServices.showNotification(`Error: ${error.message}`, 4000);
        console.error("Send Message Error:", error);
    }
}

/**
 * Loads user's global settings (like background) and applies them via parent's appServices.
 */
async function loadAndApplyGlobals() {
    if (!loggedInUser) return;
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/profile/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if (data.success && data.profile.background_url) {
            // Apply background to the parent desktop if the parent has the service.
            if (window.parent && window.parent.appServices && typeof window.parent.appServices.applyCustomBackground === 'function') {
                window.parent.appServices.applyCustomBackground(data.profile.background_url);
            }
        }
        // Update parent's authentication UI (e.g., welcome message)
        if (window.parent && window.parent.appServices && typeof window.parent.appServices.updateUserAuthContainer === 'function') {
            window.parent.appServices.updateUserAuthContainer(loggedInUser);
        }
    } catch (error) {
        console.error("Could not apply global settings:", error);
    }
}

/**
 * Checks for a valid authentication token in local storage and returns user info if valid.
 * @returns {object|null} User object (id, username) if authenticated, otherwise null.
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