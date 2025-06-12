let loggedInUser = null;
const SERVER_URL = 'https://snugos-server-api.onrender.com';
let currentProfileData = null;
let isEditing = false;
const appServices = {};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
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

    loggedInUser = checkLocalAuth();
    loadAndApplyGlobals();
    attachDesktopEventListeners();
    updateClockDisplay();

    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user');
    if (username) {
        openProfileWindow(username);
    } else {
        showCustomModal('Error', '<p class="p-4">No user profile specified in the URL.</p>', [{label: 'Close'}]);
    }
});

// --- Main Window and UI Functions ---

async function openProfileWindow(username) {
    const windowId = `profile-${username}`;
    if(appServices.getWindowById(windowId)) {
        appServices.getWindowById(windowId).focus();
        return;
    }

    const placeholderContent = document.createElement('div');
    placeholderContent.innerHTML = '<p class="p-8 text-center">Loading Profile...</p>';
    
    const desktopEl = document.getElementById('desktop');
    const options = {
        width: Math.min(600, desktopEl.offsetWidth - 40),
        height: Math.min(700, desktopEl.offsetHeight - 40),
        x: (desktopEl.offsetWidth - Math.min(600, desktopEl.offsetWidth - 40)) / 2,
        y: (desktopEl.offsetHeight - Math.min(700, desktopEl.offsetHeight - 40)) / 2
    };

    const profileWindow = new SnugWindow(windowId, `${username}'s Profile`, placeholderContent, options, appServices);
    
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

        updateProfileUI(profileWindow, currentProfileData);

    } catch (error) {
        profileWindow.contentContainer.innerHTML = `<p class="p-8 text-center" style="color:red;">Error: ${error.message}</p>`;
    }
}

function updateProfileUI(profileWindow, profileData) {
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
    
    profileWindow.contentContainer.innerHTML = '';
    profileWindow.contentContainer.appendChild(newContent);
    
    if (isOwner) {
        profileWindow.contentContainer.querySelector('#avatarOverlay')?.addEventListener('click', () => document.getElementById('avatarUploadInput').click());
        profileWindow.contentContainer.querySelector('#editProfileBtn')?.addEventListener('click', () => {
            isEditing = !isEditing;
            updateProfileUI(profileWindow, profileData);
        });
    } else if (loggedInUser) {
        profileWindow.contentContainer.querySelector('#addFriendBtn')?.addEventListener('click', () => handleAddFriendToggle(profileData.username, profileData.isFriend));
        profileWindow.contentContainer.querySelector('#messageBtn')?.addEventListener('click', () => showMessageModal(profileData.username));
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
        const profileWindow = appServices.getWindowById(`profile-${profileData.username}`);
        if(profileWindow) updateProfileUI(profileWindow, profileData);
    });
    container.querySelector('#editProfileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newBio = container.querySelector('#editBio').value;
        saveProfile(profileData.username, { bio: newBio });
    });
}

async function handleAvatarUpload(file) {
    if (!loggedInUser) return;
    showNotification("Uploading picture...", 2000);
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

        showNotification("Profile picture updated!", 2000);
        const profileWindow = appServices.getWindowById(`profile-${loggedInUser.username}`);
        if(profileWindow) loadProfilePage(loggedInUser.username); // Refresh the window content

    } catch (error) {
        showNotification(`Update failed: ${error.message}`, 4000);
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
        const profileWindow = appServices.getWindowById(`profile-${username}`);
        if (profileWindow) loadProfilePage(username);
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
        const profileWindow = appServices.getWindowById(`profile-${username}`);
        if (profileWindow) loadProfilePage(username);
    } catch (error) {
        showNotification(`Error: ${error.message}`, 4000);
    }
}

function showMessageModal(recipientUsername) {
    const modalContent = `<textarea id="messageTextarea" class="w-full p-2" rows="5"></textarea>`;
    showCustomModal(`Message ${recipientUsername}`, modalContent, [
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
    showNotification("Sending...", 1500);
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

// --- Desktop and Global Functionality ---

function attachDesktopEventListeners() {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;

    desktop.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (e.target.closest('.window')) return;
        const menuItems = [{
            label: 'Change Background',
            action: () => document.getElementById('customBgInput').click()
        }];
        appServices.createContextMenu(e, menuItems);
    });

    document.getElementById('customBgInput')?.addEventListener('change', async (e) => {
        if(!e.target.files || !e.target.files[0] || !loggedInUser) return;
        const file = e.target.files[0];
        
        showNotification("Uploading background...", 2000);
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

            showNotification("Background updated!", 2000);
            loadAndApplyGlobals();
        } catch(error) {
            showNotification(`Error: ${error.message}`, 4000);
        }
    });
    
    document.getElementById('startButton')?.addEventListener('click', toggleStartMenu);
    document.getElementById('menuToggleFullScreen')?.addEventListener('click', toggleFullScreen);
    document.getElementById('menuLogin')?.addEventListener('click', () => { toggleStartMenu(); showLoginModal(); });
    document.getElementById('menuLogout')?.addEventListener('click', () => { toggleStartMenu(); handleLogout(); });
}

async function loadAndApplyGlobals() {
    if (!loggedInUser) return;
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/profile/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if (data.success && data.profile.background_url) {
            const desktop = document.getElementById('desktop');
            if(desktop) {
                desktop.style.backgroundImage = `url(${data.profile.background_url})`;
                desktop.style.backgroundSize = 'cover';
                desktop.style.backgroundPosition = 'center';
            }
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
    showNotification('You have been logged out.', 2000);
    window.location.reload();
}

function updateClockDisplay() {
    const clockDisplay = document.getElementById('taskbarClockDisplay');
    if (clockDisplay) {
        clockDisplay.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    setTimeout(updateClockDisplay, 60000);
}

function toggleStartMenu() {
    document.getElementById('startMenu')?.classList.toggle('hidden');
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            showNotification(`Error: ${err.message}`, 3000);
        });
    } else {
        if(document.exitFullscreen) document.exitFullscreen();
    }
}

function showLoginModal() {
    // Basic placeholder, implement your full login form here
    showCustomModal('Login / Register', '<p class="p-4">Login form functionality would go here.</p>', [{label: 'Close'}]);
}
