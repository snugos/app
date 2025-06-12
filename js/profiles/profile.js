// js/profiles/profile.js - Main JavaScript for the independent Profile Page

import { showNotification, showCustomModal } from './profileUtils.js'; // From new profileUtils.js
import { storeAsset, getAsset } from './profileDb.js'; // From new profileDb.js

let loggedInUser = null; // Manage user state directly on profile page
const SERVER_URL = 'https://snugos-server-api.onrender.com'; // Your server URL

let currentProfileData = null; // Store fetched profile data
let isEditing = false; // Track edit mode state

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user');
    if (username) {
        openProfilePage(username); // Changed from openProfileWindow to openProfilePage
    } else {
        document.getElementById('profile-container').innerHTML = '<div class="text-center p-12 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg"><h2 class="text-xl font-bold text-red-700 dark:text-red-300">Error</h2><p class="text-red-600 dark:text-red-400">No username specified in URL (e.g., profile.html?user=yourusername)</p></div>';
    }
});

// --- Main Profile Page Logic ---
async function openProfilePage(username) {
    currentProfileData = null; // Clear previous data
    isEditing = false; // Always start in view mode
    document.title = `${username}'s Profile | SnugOS`; // Set page title

    const profileContainer = document.getElementById('profile-container');
    if (!profileContainer) {
        console.error("Profile container not found in DOM.");
        return;
    }

    profileContainer.innerHTML = '<div class="text-center p-12"><p>Loading Profile...</p></div>';

    try {
        const token = localStorage.getItem('snugos_token');
        // Fetch profile data and follow status in parallel
        const [profileRes, followStatusRes] = await Promise.all([
            fetch(`${SERVER_URL}/api/profiles/${username}`),
            token ? fetch(`${SERVER_URL}/api/profiles/${username}/follow-status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }) : Promise.resolve(null)
        ]);

        const profileData = await profileRes.json();
        const followStatusData = followStatusRes ? await followStatusRes.json() : null;

        if (!profileRes.ok || !profileData.success) {
            throw new Error(profileData.message || 'Could not fetch profile.');
        }

        loggedInUser = checkLocalAuth(); // Check if current user is logged in
        currentProfileData = profileData.profile; // Store fetched profile data
        currentProfileData.isFollowing = followStatusData?.isFollowing || false; // Add follow status

        updateProfileUI(profileContainer, currentProfileData);

    } catch (error) {
        console.error("Failed to load profile:", error);
        profileContainer.innerHTML = `<div class="text-center p-12 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg"><h2 class="text-xl font-bold text-red-700 dark:text-red-300">Error Loading Profile</h2><p class="text-red-600 dark:text-red-400">${error.message}</p></div>`;
    }
}

/**
 * Updates the entire profile UI (view or edit mode).
 * @param {HTMLElement} container 
 * @param {object} profileData 
 */
function updateProfileUI(container, profileData) {
    const isOwner = loggedInUser && loggedInUser.username === profileData.username;

    container.innerHTML = '';
    container.className = 'max-w-4xl mx-auto my-8 p-4 bg-white dark:bg-gray-900 text-black dark:text-white rounded-lg shadow-lg';

    const joinDate = new Date(profileData.memberSince).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const headerHtml = `
        <div class="relative h-32 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-3xl font-bold">
                ${profileData.username}'s Profile
            </div>
            <div class="absolute bottom-0 left-4 translate-y-1/2 w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 bg-gray-500 flex items-center justify-center text-white text-4xl font-bold">
                ${profileData.username.charAt(0).toUpperCase()}
            </div>
        </div>
        <div class="pt-16 px-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-end">
            <div>
                <h2 class="text-2xl font-bold">${profileData.username}</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">Member since ${joinDate}</p>
            </div>
            <div class="flex space-x-2">
                ${isOwner ? `<button id="editProfileBtn" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-300">Edit Profile</button>` : ''}
                ${!isOwner && loggedInUser ? `<button id="followBtn" class="px-4 py-2 ${profileData.isFollowing ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition duration-300">${profileData.isFollowing ? 'Unfollow' : 'Follow'}</button>` : ''}
                ${!isOwner && loggedInUser ? `<button id="messageBtn" class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition duration-300">Message</button>` : ''}
            </div>
        </div>
    `;
    container.insertAdjacentHTML('afterbegin', headerHtml);

    const bodyContentDiv = document.createElement('div');
    bodyContentDiv.className = 'p-6';
    container.appendChild(bodyContentDiv);

    if (isEditing) {
        renderEditMode(bodyContentDiv, profileData);
    } else {
        renderViewMode(bodyContentDiv, profileData);
    }

    // Attach event listeners for the new buttons
    if (isOwner) {
        document.getElementById('editProfileBtn')?.addEventListener('click', () => {
            isEditing = true;
            updateProfileUI(container, profileData); // Re-render in edit mode
        });
    }
    if (!isOwner && loggedInUser) {
        document.getElementById('followBtn')?.addEventListener('click', () => handleFollowToggle(profileData.username, profileData.isFollowing));
        document.getElementById('messageBtn')?.addEventListener('click', () => showMessageModal(profileData.username));
    }
}

/**
 * Renders the profile content in view mode.
 */
function renderViewMode(container, profileData) {
    container.innerHTML = `
        <div class="mb-6">
            <h3 class="text-lg font-semibold mb-2">Bio</h3>
            <p>${profileData.bio || 'No bio yet.'}</p>
        </div>

        <div>
            <h3 class="text-lg font-semibold">Public Projects</h3>
            <div id="profile-projects-list" class="mt-4 space-y-3">
                ${profileData.projects && profileData.projects.length > 0 ? 
                    profileData.projects.map(project => `<div class="bg-gray-100 dark:bg-gray-800 p-3 rounded shadow"><span class="font-bold">${project.name}</span> - <span>${new Date(project.createdAt).toLocaleDateString()}</span></div>`).join('')
                    : '<p class="text-gray-500 italic">No public projects yet.</p>'}
            </div>
        </div>
    `;
}

/**
 * Renders the profile content in edit mode.
 */
function renderEditMode(container, profileData) {
    container.innerHTML = `
        <form id="editProfileForm" class="space-y-4">
            <div>
                <label for="editBio" class="block text-sm font-medium mb-1">Bio</label>
                <textarea id="editBio" class="w-full p-2 border rounded-md bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700" rows="5">${profileData.bio || ''}</textarea>
            </div>
            
            <div class="flex justify-end space-x-2">
                <button type="button" id="cancelEditBtn" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition duration-300">Cancel</button>
                <button type="submit" id="saveProfileBtn" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300">Save Changes</button>
            </div>
        </form>
    `;

    document.getElementById('cancelEditBtn')?.addEventListener('click', cancelEdit);
    document.getElementById('editProfileForm')?.addEventListener('submit', (e) => saveProfile(e, profileData.username));
}

// --- Authentication & User State Logic (Self-contained for Profile Page) ---
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

// --- Profile Editing Actions ---
async function saveProfile(event, username) {
    event.preventDefault();
    const bio = document.getElementById('editBio').value;
    const token = localStorage.getItem('snugos_token');
    
    if (!token) {
        showNotification("You must be logged in to save changes.", 3000);
        return;
    }

    try {
        showNotification("Saving profile...", 1500);
        const response = await fetch(`${SERVER_URL}/api/profiles/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ bio })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to save profile.');
        }

        showNotification("Profile saved successfully!", 2000);
        isEditing = false; // Exit edit mode
        openProfilePage(username); // Re-fetch and re-render to ensure UI is updated with latest data from server

    } catch (error) {
        showNotification(`Error saving profile: ${error.message}`, 3000);
        console.error("Save Profile Error:", error);
    }
}

function cancelEdit() {
    isEditing = false; // Exit edit mode
    openProfilePage(currentProfileData.username); // Re-render to show original profile
}

// --- Follow/Unfollow Feature ---
async function handleFollowToggle(username, isCurrentlyFollowing) {
    const token = localStorage.getItem('snugos_token');
    if (!token) {
        showNotification('You must be logged in to follow/unfollow users.', 3000);
        return;
    }

    const method = isCurrentlyFollowing ? 'DELETE' : 'POST';
    const action = isCurrentlyFollowing ? 'Unfollowing' : 'Following';

    try {
        showNotification(`${action} ${username}...`, 1500);
        const response = await fetch(`${SERVER_URL}/api/profiles/${username}/follow`, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || `${action} failed.`);
        }

        showNotification(`${action} successful!`, 2000);
        openProfilePage(username); // Re-fetch and re-render to update UI with new follow state

    } catch (error) {
        showNotification(`Error ${action.toLowerCase()}: ${error.message}`, 3000);
        console.error(`${action} Error:`, error);
    }
}

// --- Messaging Feature (Modal) ---
function showMessageModal(recipientUsername) {
    const senderUsername = loggedInUser?.username;
    if (!senderUsername) {
        showNotification('You must be logged in to send messages.', 3000);
        return;
    }

    const modalContent = `
        <div class="space-y-4">
            <p>Send a message to <strong>${recipientUsername}</strong>:</p>
            <textarea id="messageTextarea" class="w-full p-2 border rounded-md bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700" rows="5" placeholder="Type your message here..."></textarea>
        </div>
    `;

    const buttons = [
        { label: 'Cancel', action: () => {} }, // Modal will close
        { label: 'Send Message', action: async () => {
            const messageContent = document.getElementById('messageTextarea').value;
            if (messageContent.trim() === '') {
                showNotification('Message cannot be empty.', 2000);
                return;
            }
            await sendMessage(recipientUsername, messageContent);
        }}
    ];
    
    showCustomModal(`Message ${recipientUsername}`, modalContent, buttons);
}

async function sendMessage(recipientUsername, content) {
    const token = localStorage.getItem('snugos_token');
    if (!token) {
        showNotification('Login expired. Please log in again.', 3000);
        return;
    }

    try {
        showNotification('Sending message...', 1500);
        const response = await fetch(`${SERVER_URL}/api/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ recipientUsername, content })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to send message.');
        }

        showNotification('Message sent successfully!', 2000);

    } catch (error) {
        showNotification(`Error sending message: ${error.message}`, 3000);
        console.error("Send Message Error:", error);
    }
}

// --- Helper to get logged in user from localStorage (minimal auth) ---
// This is a simplified version of checkInitialAuthState from auth.js,
// just for getting the user object for UI display.
function checkLocalAuth() {
    const token = localStorage.getItem('snugos_token');
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('snugos_token'); // Token expired
            return null;
        }
        return { id: payload.id, username: payload.username };
    } catch (e) {
        console.error("Error decoding token:", e);
        localStorage.removeItem('snugos_token');
        return null;
    }
}
