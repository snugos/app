// js/daw/ui/profileUI.js

// Import from the monolithic state.js
import {
    getOpenWindowsState,
    getWindowByIdState,
} from '../../state.js'; // Path updated

let localAppServices = {};

/**
 * Initializes the Profile UI module.
 * @param {object} appServices - The main app services object.
 */
export function initializeProfileUI(appServices) {
    localAppServices = appServices;
}

/**
 * Fetches profile data and opens a new window to display it.
 * @param {string} username - The username of the profile to open.
 */
export async function openProfileWindow(username) {
    if (!username) {
        console.error("No username provided to openProfileWindow");
        return;
    }

    const windowId = `profile-${username}`;
    // Use getOpenWindowsState and getWindowByIdState from monolithic state
    if (getOpenWindowsState().has(windowId)) {
        getWindowByIdState(windowId).focus();
        return;
    }

    // Create a placeholder window while the data loads
    const contentContainer = document.createElement('div');
    contentContainer.className = 'p-4 text-center';
    contentContainer.textContent = 'Loading profile...';
    
    const profileWindow = localAppServices.createWindow(windowId, `Profile: ${username}`, contentContainer, {
        width: 600,
        height: 450,
        minWidth: 400,
        minHeight: 300
    });

    try {
        const serverUrl = 'https://snugos-server-api.onrender.com';
        const response = await fetch(`${serverUrl}/api/profiles/${username}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Could not fetch profile.');
        }

        // Data fetched successfully, now build the real profile UI
        buildProfileUI(profileWindow.contentContainer, data.profile, data.projects);

    } catch (error) {
        console.error("Failed to load profile:", error);
        profileWindow.contentContainer.textContent = `Error: ${error.message}`;
    }
}

/**
 * Renders the profile information into the window's content container.
 * @param {HTMLElement} container - The content container of the SnugWindow.
 * @param {object} profileData - The profile data from the server.
 * @param {Array} projectsData - The list of public projects from the server.
 */
function buildProfileUI(container, profileData, projectsData) {
    container.innerHTML = ''; // Clear the "Loading..." message
    container.className = 'p-0 overflow-y-auto h-full'; // Reset class for new layout

    const joinDate = new Date(profileData.memberSince).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    // This HTML structure uses TailwindCSS classes for styling
    container.innerHTML = `
        <div class="h-full bg-white dark:bg-gray-900 text-black dark:text-white">
            <div class="relative h-32 bg-gray-200 dark:bg-gray-700">
                <div class="absolute bottom-0 left-4 translate-y-1/2 w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 bg-gray-500 flex items-center justify-center">
                    <span class="text-4xl text-white">${profileData.username.charAt(0).toUpperCase()}</span>
                </div>
            </div>

            <div class="pt-16 px-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-2xl font-bold">${profileData.username}</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">Member since ${joinDate}</p>
                <div class="mt-4">
                    <button class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Follow</button>
                </div>
            </div>

            <div class="p-6">
                <h3 class="text-lg font-semibold">Public Projects</h3>
                <div id="profile-projects-list" class="mt-4">
                    <p class="text-gray-500 italic">No public projects yet.</p>
                </div>
            </div>
        </div>
    `;

    // In the future, you would loop through `projectsData` here to render the project list
}
