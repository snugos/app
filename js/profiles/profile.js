// js/profile.js
// NOTE: This file is designed to run within an iframe, hosted by index.html.
// It receives `appServices` from its parent window.

// Removed imports like SnugWindow as it's provided by the parent.
// Removed other direct imports like state accessors, showNotification etc.
// as they are accessed via the injected `appServices` object.

let appServices = {}; // Will be populated by the parent window.
let loggedInUser = null;
const SERVER_URL = 'https://snugos-server-api.onrender.com';
let currentProfileData = null;
let isEditing = false;

// This is the new entry point for when the iframe content is loaded by the parent.
// It will be called by `initializePage` in `profile.html`.
function initProfilePageInIframe(injectedAppServices) {
    appServices = injectedAppServices;

    // Use appServices for window/modal management
    appServices.showNotification = appServices.showNotification || window.parent.showNotification;
    appServices.showCustomModal = appServices.showCustomModal || window.parent.showCustomModal;
    appServices.createContextMenu = appServices.createContextMenu || window.parent.createContextMenu; // Assuming this exists globally in parent or via main.js
    
    // Check local auth, but apply global settings via injected appServices.
    loggedInUser = checkLocalAuth();
    loadAndApplyGlobals(); // Will use appServices.getAsset and appServices.applyCustomBackground

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
        // avatarUploadInput is still in the profile.html body
        container.querySelector('#avatarOverlay')?.addEventListener('click', () => document.getElementById('avatarUploadInput').click());
        container.querySelector('#editProfileBtn')?.addEventListener('click', () => {
            isEditing = !isEditing;
            updateProfileUI(container, profileData);
        });
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
        updateProfileUI(container, profileData); // Pass the container to re-render
    });
    container.querySelector('#editProfileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newBio = container.querySelector('#editBio').value;
        saveProfile(profileData.username, { bio: newBio });
    });
}

// Global scope listener to avoid re-attaching on UI updates
// This is specific to the iframe, not the main index.html desktop
function attachProfileWindowListeners() {
    // This is the file input that lives in profile.html body
    document.getElementById('avatarUploadInput')?.addEventListener('change', async (e) => {
        if(!e.target.files || !e.target.files[0] || !loggedInUser) return;
        const file = e.target.files[0];
        handleAvatarUpload(file);
        e.target.value = null; // Clear input
    });

    document.getElementById('customBgInput')?.addEventListener('change', async (e) => {
        if(!e.target.files || !e.target.files[0] || !loggedInUser) return;
        const file = e.target.files[0];
        
        appServices.showNotification("Uploading background...", 2000); // Use appServices
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', '/backgrounds/');
        try {
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

            appServices.showNotification("Background updated!", 2000); // Use appServices
            loadAndApplyGlobals(); // Re-apply to parent desktop if necessary via appServices
        } catch(error) {
            appServices.showNotification(`Error: ${error.message}`, 4000); // Use appServices
        }
    });
}


async function handleAvatarUpload(file) {
    if (!loggedInUser) return;
    appServices.showNotification("Uploading picture...", 2000); // Use appServices
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', '/avatars/');
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

        appServices.showNotification("Profile picture updated!", 2000); // Use appServices
        // Re-fetch profile data to update UI
        fetchProfileData(loggedInUser.username, document.getElementById('profile-container'));

    } catch (error) {
        appServices.showNotification(`Update failed: ${error.message}`, 4000); // Use appServices
    }
}

async function saveProfile(username, dataToSave) {
    const token = localStorage.getItem('snugos_token');
    if (!token) return;
    appServices.showNotification("Saving...", 1500); // Use appServices
    try {
        const response = await fetch(`${SERVER_URL}/api/profiles/${username}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(dataToSave)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        appServices.showNotification("Profile saved!", 2000); // Use appServices
        isEditing = false;
        fetchProfileData(username, document.getElementById('profile-container'));
    } catch (error) {
        appServices.showNotification(`Error: ${error.message}`, 4000); // Use appServices
    }
}

async function handleAddFriendToggle(username, isFriend) {
    const token = localStorage.getItem('snugos_token');
    if (!token) return;
    const method = isFriend ? 'DELETE' : 'POST';
    appServices.showNotification(isFriend ? 'Removing friend...' : 'Adding friend...', 1500); // Use appServices
    try {
        const response = await fetch(`${SERVER_URL}/api/profiles/${username}/friend`, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        appServices.showNotification(result.message, 2000); // Use appServices
        // Re-fetch profile data to update UI
        fetchProfileData(username, document.getElementById('profile-container'));
    } catch (error) {
        appServices.showNotification(`Error: ${error.message}`, 4000); // Use appServices
    }
}

function showMessageModal(recipientUsername) {
    const modalContent = `<textarea id="messageTextarea" class="w-full p-2" rows="5"></textarea>`;
    appServices.showCustomModal(`Message ${recipientUsername}`, modalContent, [ // Use appServices
        { label: 'Cancel' },
        { label: 'Send', action: () => {
            const content = document.getElementById('messageTextarea').value;
            if (content) sendMessage(recipientUsername, content);
        }}
    ]);
}

async function sendMessage(recipientUsername, content) {
    const token = localStorage.getItem('snugos_token');
    if (!token) return;
    appServices.showNotification("Sending...", 1500); // Use appServices
    try {
        const response = await fetch(`${SERVER_URL}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({ recipientUsername, content })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        appServices.showNotification("Message sent!", 2000); // Use appServices
    } catch (error) {
        appServices.showNotification(`Error: ${error.message}`, 4000); // Use appServices
    }
}

async function loadAndApplyGlobals() {
    if (!loggedInUser) return;
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/profile/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if (data.success && data.profile.background_url) {
            // Apply background to the parent window's desktop
            appServices.applyCustomBackground(data.profile.background_url); // Use appServices
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
