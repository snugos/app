// js/profile.js

/**
 * Main function that runs when the profile page loads.
 */
function initProfilePage() {
    // Determine which user's profile to load from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user');
    
    const profileContainer = document.getElementById('profile-container');

    if (!username) {
        displayError(profileContainer, 'No user specified.');
        return;
    }

    document.title = `${username}'s Profile | SnugOS`;
    fetchProfileData(username, profileContainer);
}

/**
 * Fetches profile data and follow status from the server.
 */
async function fetchProfileData(username, container) {
    const serverUrl = 'https://snugos-server-api.onrender.com';
    const token = localStorage.getItem('snugos_token');

    try {
        // Fetch profile data and follow status in parallel
        const [profileRes, followStatusRes] = await Promise.all([
            fetch(`${serverUrl}/api/profiles/${username}`),
            token ? fetch(`${serverUrl}/api/profiles/${username}/follow-status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }) : Promise.resolve(null)
        ]);

        const profileData = await profileRes.json();
        if (!profileRes.ok || !profileData.success) {
            throw new Error(profileData.message || 'Could not fetch profile.');
        }

        let isFollowing = false;
        if (followStatusRes && followStatusRes.ok) {
            const followStatusData = await followStatusRes.json();
            isFollowing = followStatusData.isFollowing;
        }

        renderProfile(container, profileData.profile, profileData.projects, isFollowing);

    } catch (error) {
        console.error("Failed to load profile:", error);
        displayError(container, `Error: ${error.message}`);
    }
}

/**
 * Renders the profile UI, including the dynamic follow/unfollow button.
 */
function renderProfile(container, profileData, projectsData, isFollowing) {
    container.innerHTML = '';
    container.className = 'p-0 overflow-y-auto h-full';

    const joinDate = new Date(profileData.memberSince).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const followButtonHtml = `
        <button id="followBtn" class="px-5 py-2 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 ${
            isFollowing 
                ? 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-400' 
                : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-400'
        }">
            ${isFollowing ? 'Unfollow' : 'Follow'}
        </button>
    `;

    const profileHTML = `
        <div class="w-full">
            <header class="relative h-40 md:h-48 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <div class="absolute bottom-0 left-6 transform translate-y-1/2">
                    <div class="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-black bg-gray-500 flex items-center justify-center text-white text-5xl font-bold">
                        ${profileData.username.charAt(0).toUpperCase()}
                    </div>
                </div>
            </header>

            <section class="mt-20 px-6 pb-4">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-3xl font-bold">${profileData.username}</h1>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Member since ${joinDate}</p>
                    </div>
                    <div id="follow-button-container">
                        ${followButtonHtml}
                    </div>
                </div>
            </section>
            
            <hr class="my-6 border-gray-200 dark:border-gray-700">

            <section class="px-6">
                <h2 class="text-2xl font-semibold mb-4">Public Projects</h2>
                <div id="profile-projects-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <p class="text-gray-500 italic">No public projects yet.</p>
                </div>
            </section>
        </div>
    `;

    container.innerHTML = profileHTML;

    // Add event listener to the new follow button
    const followBtn = document.getElementById('followBtn');
    followBtn?.addEventListener('click', () => {
        handleFollowToggle(profileData.username, isFollowing);
    });
}

/**
 * Handles the logic for sending follow or unfollow requests to the server.
 * @param {string} username - The username of the profile to follow/unfollow.
 * @param {boolean} isCurrentlyFollowing - The current follow state.
 */
async function handleFollowToggle(username, isCurrentlyFollowing) {
    const token = localStorage.getItem('snugos_token');
    if (!token) {
        alert('You must be logged in to follow users.');
        return;
    }

    const serverUrl = 'https://snugos-server-api.onrender.com';
    const method = isCurrentlyFollowing ? 'DELETE' : 'POST';

    try {
        const response = await fetch(`${serverUrl}/api/profiles/${username}/follow`, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message);
        }

        // Re-fetch profile data to update the UI with the new follow state
        fetchProfileData(username, document.getElementById('profile-container'));

    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

/**
 * Displays an error message in the main container.
 */
function displayError(container, message) {
    container.innerHTML = `
        <div class="text-center p-12 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg">
            <h2 class="text-xl font-bold text-red-800 dark:text-red-200">Could not load profile</h2>
            <p class="text-red-600 dark:text-red-300 mt-2">${message}</p>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', initProfilePage);
