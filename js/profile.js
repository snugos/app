// js/profile.js

/**
 * Main function that runs when the profile page loads.
 */
function initProfilePage() {
    // Determine which user's profile to load from the URL
    // e.g., profile.html?user=someusername
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user');
    
    const profileContainer = document.getElementById('profile-container');

    if (!username) {
        displayError(profileContainer, 'No user specified.');
        return;
    }

    // Set the page title
    document.title = `${username}'s Profile | SnugOS`;

    // Fetch the profile data from our server
    fetchProfileData(username, profileContainer);
}

/**
 * Fetches profile data from the server and populates the page.
 * @param {string} username The username to fetch.
 * @param {HTMLElement} container The HTML element to render the profile into.
 */
async function fetchProfileData(username, container) {
    const serverUrl = 'https://snugos-server-api.onrender.com';

    try {
        const response = await fetch(`${serverUrl}/api/profiles/${username}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Could not fetch profile.');
        }

        // Data fetched successfully, render the profile UI
        renderProfile(container, data.profile, data.projects);

    } catch (error) {
        console.error("Failed to load profile:", error);
        displayError(container, `Error: ${error.message}`);
    }
}

/**
 * Renders the profile information into the main container.
 * @param {HTMLElement} container The HTML element to render into.
 * @param {object} profileData The user's profile data.
 * @param {Array} projectsData A list of the user's public projects.
 */
function renderProfile(container, profileData, projectsData) {
    container.innerHTML = ''; // Clear the "Loading..." message

    const joinDate = new Date(profileData.memberSince).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const profileHTML = `
        <div class="w-full">
            <!-- Header and Avatar Section -->
            <header class="relative h-40 md:h-48 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <!-- Banner Image Placeholder -->
                <div class="absolute bottom-0 left-6 transform translate-y-1/2">
                    <div class="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-black bg-gray-500 flex items-center justify-center text-white text-5xl font-bold">
                        ${profileData.username.charAt(0).toUpperCase()}
                    </div>
                </div>
            </header>

            <!-- User Info and Actions Section -->
            <section class="mt-20 px-6 pb-4">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-3xl font-bold">${profileData.username}</h1>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Member since ${joinDate}</p>
                    </div>
                    <div>
                        <button class="px-5 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                            Follow
                        </button>
                    </div>
                </div>
            </section>
            
            <hr class="my-6 border-gray-200 dark:border-gray-700">

            <!-- Projects Section -->
            <section class="px-6">
                <h2 class="text-2xl font-semibold mb-4">Public Projects</h2>
                <div id="profile-projects-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Projects will be rendered here by JavaScript -->
                </div>
            </section>
        </div>
    `;

    container.innerHTML = profileHTML;

    const projectsList = container.querySelector('#profile-projects-list');
    if (projectsData && projectsData.length > 0) {
        // In the future, loop through projectsData and render them
    } else {
        projectsList.innerHTML = `<p class="text-gray-500 italic">No public projects yet.</p>`;
    }
}

/**
 * Displays an error message in the main container.
 * @param {HTMLElement} container The HTML element to render the error into.
 * @param {string} message The error message to display.
 */
function displayError(container, message) {
    container.innerHTML = `
        <div class="text-center p-12 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg">
            <h2 class="text-xl font-bold text-red-800 dark:text-red-200">Could not load profile</h2>
            <p class="text-red-600 dark:text-red-300 mt-2">${message}</p>
        </div>
    `;
}

// Run the initialization function when the page is loaded
document.addEventListener('DOMContentLoaded', initProfilePage);

