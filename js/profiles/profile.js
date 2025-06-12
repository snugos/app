// js/profiles/profile.js - Main JavaScript for the independent Profile Page

// NOTE: Utility functions are globally available from utils.js
let loggedInUser = null;
const SERVER_URL = 'https://snugos-server-api.onrender.com';
let currentProfileData = null;
let isEditing = false; // To track edit mode for the bio

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user');

    if (username) {
        loadProfilePage(username);
    } else {
        const profileContainer = document.getElementById('profile-container');
        profileContainer.innerHTML = `<div class="text-center p-12"><p style="color:red;">Error: No username specified in URL.</p></div>`;
    }

    // Listener for the hidden avatar file input
    document.getElementById('avatarUploadInput')?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleAvatarUpload(e.target.files[0]);
        }
    });
});

// --- Core Profile Loading and Rendering ---

async function loadProfilePage(username) {
    isEditing = false;
    document.title = `${username}'s Profile | SnugOS`;
    const profileContainer = document.getElementById('profile-container');
    profileContainer.innerHTML = '<div class="text-center p-12"><p>Loading Profile...</p></div>';

    try {
        // Fetch profile data and friend status at the same time
        const token = localStorage.getItem('snugos_token');
        const [profileRes, friendStatusRes] = await Promise.all([
            fetch(`${SERVER_URL}/api/profiles/${username}`),
            token ? fetch(`${SERVER_URL}/api/profiles/${username}/friend-status`, { headers: { 'Authorization': `Bearer ${token}` } }) : Promise.resolve(null)
        ]);

        const profileData = await profileRes.json();
        if (!profileRes.ok) throw new Error(profileData.message);

        const friendStatusData = friendStatusRes ? await friendStatusRes.json() : null;

        loggedInUser = checkLocalAuth();
        currentProfileData = profileData.profile;
        currentProfileData.isFriend = friendStatusData?.isFriend || false;

        updateProfileUI(profileContainer, currentProfileData);
    } catch (error) {
        profileContainer.innerHTML = `<div class="text-center p-12"><p style="color:red;">Error loading profile: ${error.message}</p></div>`;
    }
}

function updateProfileUI(container, profileData) {
    const isOwner = loggedInUser && loggedInUser.id === profileData.id;
    const joinDate = new Date(profileData.created_at).toLocaleDateString();

    // Avatar display logic
    let avatarContent = profileData.avatar_url
        ? `<img src="${profileData.avatar_url}" alt="${profileData.username}'s avatar" class="w-full h-full object-cover">`
        : `<span class="text-4xl font-bold">${profileData.username.charAt(0).toUpperCase()}</span>`;

    // Clickable overlay for avatar upload
    const uploadOverlay = isOwner
        ? `<div id="avatarOverlay" class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer" title="Change Profile Picture">...</div>`
        : '';
        
    // Action buttons (Edit, Add Friend, Message)
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

    container.innerHTML = `
        <div class="bg-window text-primary border border-primary rounded-lg shadow-window">
            <div class="relative h-40 bg-gray-700 rounded-t-lg bg-cover bg-center" style="background-image: url(${profileData.background_url || ''})">
                <div id="avatarContainer" class="absolute bottom-0 left-6 transform translate-y-1/2 w-28 h-28 rounded-full border-4 border-window bg-gray-500 flex items-center justify-center text-white overflow-hidden">
                    ${avatarContent}
                    ${uploadOverlay}
                </div>
            </div>
            <div class="pt-20 px-6 pb-4 border-b border-secondary flex justify-between items-end">
                <div>
                    <h2 class="text-2xl font-bold">${profileData.username}</h2>
                    <p class="text-sm text-secondary">Member since ${joinDate}</p>
                </div>
                <div class="flex space-x-2">${actionButtons}</div>
            </div>
            <div id="profile-body-content" class="p-6">
                </div>
        </div>
    `;

    const profileBody = container.querySelector('#profile-body-content');
    if (isEditing && isOwner) {
        renderEditMode(profileBody, profileData);
    } else {
        renderViewMode(profileBody, profileData);
    }

    // Attach all event listeners
    if (isOwner) {
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
        loadProfilePage(profileData.username);
    });
    container.querySelector('#editProfileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newBio = container.querySelector('#editBio').value;
        saveProfile(profileData.username, { bio: newBio });
    });
}

// --- Action Handlers (Avatar, Friends, Bio, Messages) ---

async function handleAvatarUpload(file) {
    if (!loggedInUser) return;
    const formData = new FormData();
    formData.append('avatarFile', file);
    showNotification("Uploading picture...", 2000);
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/profile/avatar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showNotification("Profile picture updated!", 2000);
        // Dynamically update the image on the page
        const avatarContainer = document.getElementById('avatarContainer');
        if (avatarContainer) {
            const oldContent = avatarContainer.querySelector('img, span');
            if(oldContent) oldContent.remove();
            const newImg = document.createElement('img');
            newImg.src = result.avatar_url;
            newImg.className = 'w-full h-full object-cover';
            avatarContainer.insertAdjacentElement('afterbegin', newImg);
        }
    } catch (error) {
        showNotification(`Upload failed: ${error.message}`, 4000);
    }
}

async function saveProfile(username, dataToSave) {
    const token = localStorage.getItem('snugos_token');
    if (!token) return;
    showNotification("Saving...", 1500);
    try {
        const response = await fetch(`${SERVER_URL}/api/profiles/${username}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(dataToSave)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showNotification("Profile saved!", 2000);
        isEditing = false;
        loadProfilePage(username);
    } catch (error) {
        showNotification(`Error: ${error.message}`, 4000);
    }
}

async function handleAddFriendToggle(username, isFriend) {
    const token = localStorage.getItem('snugos_token');
    if (!token) return;
    const method = isFriend ? 'DELETE' : 'POST';
    showNotification(isFriend ? 'Removing friend...' : 'Adding friend...', 1500);
    try {
        const response = await fetch(`${SERVER_URL}/api/profiles/${username}/friend`, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showNotification(result.message, 2000);
        loadProfilePage(username); // Refresh to show new friend status
    } catch (error) {
        showNotification(`Error: ${error.message}`, 4000);
    }
}

function showMessageModal(recipientUsername) {
    const modalContent = `
        <textarea id="messageTextarea" class="w-full p-2 border rounded-md" style="background-color: var(--bg-input); color: var(--text-primary); border-color: var(--border-input);" rows="5" placeholder="Your message..."></textarea>
    `;
    showCustomModal(`Message ${recipientUsername}`, modalContent, [
        { label: 'Cancel', action: () => {} },
        { label: 'Send', action: () => {
            const content = document.getElementById('messageTextarea').value;
            if (content) sendMessage(recipientUsername, content);
        }}
    ]);
}

async function sendMessage(recipientUsername, content) {
    const token = localStorage.getItem('snugos_token');
    if (!token) return;
    showNotification("Sending message...", 1500);
    try {
        const response = await fetch(`${SERVER_URL}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({ recipientUsername, content })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showNotification("Message sent!", 2000);
    } catch (error) {
        showNotification(`Error: ${error.message}`, 4000);
    }
}

// --- Auth Helper ---
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
        localStorage.removeItem('snugos_token');
        return null;
    }
}
