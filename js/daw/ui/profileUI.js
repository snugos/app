// js/daw/ui/profileUI.js

// Import from the monolithic state.js
import {
    getOpenWindowsState,
    getWindowByIdState,
} from '../../state.js';
import { getLoggedInUser } from '../../auth.js'; // Import getLoggedInUser
import { showNotification } from '../../utils.js'; // Ensure showNotification is imported

let localAppServices = {};
let currentProfileUsername = null; // Store the username of the profile being viewed
let isEditing = false; // Track edit mode state

/**
 * Initializes the Profile UI module.
 * @param {object} appServices - The main app services object.
 */
export function initializeProfileUI(appServices) {
    localAppServices = appServices;
    // When the DAW loads, it's not the profile page, so init is minimal.
    // The profile page script directly calls openProfileWindow.
}

/**
 * Fetches profile data and opens a new window to display it.
 * This function is designed to be called directly by the profile.html script.
 * @param {string} username - The username of the profile to open.
 */
export async function openProfileWindow(username) {
    // This is now called directly from profile.html's script, not as a SnugWindow.
    // So, it will render directly into the body's #profile-container.
    currentProfileUsername = username; // Set the global variable

    const profileContainer = document.getElementById('profile-container');
    if (!profileContainer) {
        console.error("Profile container not found in DOM.");
        return;
    }

    profileContainer.innerHTML = '<div class="text-center p-12"><p>Loading Profile...</p></div>';

    try {
        const serverUrl = 'https://snugos-server-api.onrender.com';
        const response = await fetch(`${serverUrl}/api/profiles/${username}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Could not fetch profile.');
        }

        // Data fetched successfully, now render the profile UI
        updateProfileUI(profileContainer, data.profile, data.projects); // Use updateProfileUI

    } catch (error) {
        console.error("Failed to load profile:", error);
        profileContainer.innerHTML = `<div class="text-center p-12 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg"><h2 class="text-xl font-bold text-red-700 dark:text-red-300">Error Loading Profile</h2><p class="text-red-600 dark:text-red-400">${error.message}</p></div>`;
    }
}

/**
 * Updates the entire profile UI (view or edit mode).
 * @param {HTMLElement} container 
 * @param {object} profileData 
 * @param {Array} projectsData 
 */
function updateProfileUI(container, profileData, projectsData) {
    const loggedInUser = getLoggedInUser(); // Get current logged-in user
    const isOwner = loggedInUser && loggedInUser.username === profileData.username; // Check if owner

    container.innerHTML = ''; // Clear previous content
    container.className = 'max-w-4xl mx-auto my-8 p-4 bg-white dark:bg-gray-900 text-black dark:text-white rounded-lg shadow-lg';

    const joinDate = new Date(profileData.memberSince).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    // Profile Header Section
    const headerHtml = `
        <div class="relative h-32 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-3xl font-bold">
                SnugOS Profile
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
                ${isOwner ? `<button id="editProfileBtn" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-300">Edit Profile</button>` : `<button class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Follow</button>`}
            </div>
        </div>
    `;

    container.insertAdjacentHTML('afterbegin', headerHtml); // Insert header HTML

    const bodyContentDiv = document.createElement('div'); // Create a div for dynamic content
    bodyContentDiv.className = 'p-6';
    container.appendChild(bodyContentDiv); // Append to main container

    if (isEditing) {
        renderEditMode(bodyContentDiv, profileData);
    } else {
        renderViewMode(bodyContentDiv, profileData, projectsData);
    }

    // Attach event listeners for the buttons
    if (isOwner) {
        document.getElementById('editProfileBtn')?.addEventListener('click', () => {
            isEditing = true;
            updateProfileUI(container, profileData, projectsData); // Re-render in edit mode
        });
    }
}

/**
 * Renders the profile content in view mode.
 */
function renderViewMode(container, profileData, projectsData) {
    container.innerHTML = `
        <div class="mb-6">
            <h3 class="text-lg font-semibold mb-2">Bio</h3>
            <p>${profileData.bio || 'No bio yet.'}</p>
        </div>

        <div>
            <h3 class="text-lg font-semibold">Public Projects</h3>
            <div id="profile-projects-list" class="mt-4 space-y-3">
                ${projectsData && projectsData.length > 0 ? 
                    projectsData.map(project => `<div class="bg-gray-100 dark:bg-gray-800 p-3 rounded shadow"><span class="font-bold">${project.name}</span> - <span>${new Date(project.createdAt).toLocaleDateString()}</span></div>`).join('')
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
        const serverUrl = 'https://snugos-server-api.onrender.com';
        const response = await fetch(`${serverUrl}/api/profiles/${username}`, {
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
        // Re-fetch and re-render to ensure UI is updated with latest data from server
        openProfileWindow(username);

    } catch (error) {
        showNotification(`Error saving profile: ${error.message}`, 3000);
        console.error("Save Profile Error:", error);
    }
}

function cancelEdit() {
    isEditing = false; // Exit edit mode
    openProfileWindow(currentProfileUsername); // Re-render to show original profile
}

// Function to handle initial loading of profile data when page loads
// (Assumes profile.html calls this directly or via a DOMContentLoaded listener)
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user');
    if (username) {
        openProfileWindow(username);
    } else {
        document.getElementById('profile-container').innerHTML = '<div class="text-center p-12 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg"><h2 class="text-xl font-bold text-red-700 dark:text-red-300">Error</h2><p class="text-red-600 dark:text-red-400">No username specified in URL (e.g., profile.html?user=yourusername)</p></div>';
    }
});
