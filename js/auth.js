// js/auth.js

let localAppServices = {};

/**
 * Initializes the authentication module, adds event listeners to the UI,
 * and checks for an existing login session.
 * @param {object} appServices - The main app services object.
 */
export function initializeAuth(appServices) {
    localAppServices = appServices;
    
    // Add event listeners to the new buttons in the UI
    document.getElementById('loginBtnTop')?.addEventListener('click', showLoginModal);
    document.getElementById('menuLogin')?.addEventListener('click', showLoginModal);
    document.getElementById('menuLogout')?.addEventListener('click', handleLogout);

    // Check if the user is already logged in from a previous session
    checkInitialAuthState();
}

/**
 * Updates the top taskbar and start menu to reflect the user's login status.
 * @param {object|null} user - The user object, or null if logged out.
 */
function updateAuthUI(user = null) {
    const userAuthContainer = document.getElementById('userAuthContainer');
    const menuLogin = document.getElementById('menuLogin');
    const menuLogout = document.getElementById('menuLogout');

    if (user && userAuthContainer) {
        // User is logged in: Show welcome message and logout button
        userAuthContainer.innerHTML = `<span class="mr-2">Welcome, ${user.username}!</span>`;
        menuLogin?.classList.add('hidden');
        menuLogout?.classList.remove('hidden');
    } else {
        // User is logged out: Show login button
        userAuthContainer.innerHTML = `<button id="loginBtnTop" class="px-3 py-1">Login</button>`;
        userAuthContainer.querySelector('#loginBtnTop')?.addEventListener('click', showLoginModal);
        menuLogin?.classList.remove('hidden');
        menuLogout?.classList.add('hidden');
    }
}

/**
 * Checks for a saved JWT in localStorage and fetches the user's full profile.
 */
async function checkInitialAuthState() {
    const token = localStorage.getItem('snugos_token');
    if (!token) {
        updateAuthUI(null);
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            return handleLogout(); // Token is expired
        }

        // Token is valid, now fetch full profile from the secure /me endpoint
        const serverUrl = 'https://snugos-server-api.onrender.com';
        const response = await fetch(`${serverUrl}/api/profile/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Session expired or invalid. Please log in again.');
        }

        const data = await response.json();
        if (data.success) {
            updateAuthUI(data.profile);
            // Apply the saved background if it exists
            if (data.profile.background_url) {
                localAppServices.applyCustomBackground(data.profile.background_url);
            }
        } else {
            handleLogout();
        }
    } catch (e) {
        console.error("Error during initial auth state check:", e);
        handleLogout();
    }
}


/**
 * Creates and displays a modal window with forms for both login and registration.
 */
export function showLoginModal() {
    // Hide the start menu if it's open
    document.getElementById('startMenu')?.classList.add('hidden');

    const modalContent = `
        <div class="space-y-4">
            <div>
                <h3 class="text-lg font-bold mb-2">Login</h3>
                <form id="loginForm" class="space-y-3">
                    <input type="text" id="loginUsername" placeholder="Username" required class="w-full">
                    <input type="password" id="loginPassword" placeholder="Password" required class="w-full">
                    <button type="submit" class="w-full">Login</button>
                </form>
            </div>
            <hr class="border-gray-500">
            <div>
                <h3 class="text-lg font-bold mb-2">Don't have an account? Register</h3>
                <form id="registerForm" class="space-y-3">
                    <input type="text" id="registerUsername" placeholder="Username" required class="w-full">
                    <input type="password" id="registerPassword" placeholder="Password (min. 6 characters)" required class="w-full">
                    <button type="submit" class="w-full">Register</button>
                </form>
            </div>
        </div>
    `;
    
    // Use the utility function to show the modal
    const { overlay, contentDiv } = localAppServices.showCustomModal('Login or Register', modalContent, []);

    // Apply SnugOS styles to the new form elements
    contentDiv.querySelectorAll('input[type="text"], input[type="password"]').forEach(input => {
        input.style.backgroundColor = 'var(--bg-input)';
        input.style.color = 'var(--text-primary)';
        input.style.border = '1px solid var(--border-input)';
        input.style.padding = '8px';
        input.style.borderRadius = '3px';
    });

    contentDiv.querySelectorAll('button').forEach(button => {
        button.style.backgroundColor = 'var(--bg-button)';
        button.style.border = '1px solid var(--border-button)';
        button.style.color = 'var(--text-button)';
        button.style.padding = '8px 15px';
        button.style.cursor = 'pointer';
        button.style.borderRadius = '3px';
        button.style.transition = 'background-color 0.15s ease';
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = 'var(--bg-button-hover)';
            button.style.color = 'var(--text-button-hover)';
        });
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = 'var(--bg-button)';
            button.style.color = 'var(--text-button)';
        });
    });

    // Add submit event listeners to the forms
    overlay.querySelector('#loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = overlay.querySelector('#loginUsername').value;
        const password = overlay.querySelector('#loginPassword').value;
        handleLogin(username, password).then(() => overlay.remove());
    });

    overlay.querySelector('#registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = overlay.querySelector('#registerUsername').value;
        const password = overlay.querySelector('#registerPassword').value;
        handleRegister(username, password).then(() => overlay.remove());
    });
}

/**
 * Sends a login request to the server and applies background on success.
 * @param {string} username 
 * @param {string} password 
 */
async function handleLogin(username, password) {
    const serverUrl = 'https://snugos-server-api.onrender.com'; // Your Render server URL

    try {
        const response = await fetch(`${serverUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('snugos_token', data.token);
            // After logging in, check the initial state again to fetch profile and background
            await checkInitialAuthState();
            localAppServices.showNotification(`Welcome back, ${data.user.username}!`, 2000);
        } else {
            localAppServices.showNotification(`Login failed: ${data.message}`, 3000);
        }
    } catch (error) {
        localAppServices.showNotification('Network error. Could not connect to server.', 3000);
    }
}

/**
 * Sends a registration request to the server.
 * @param {string} username 
 * @param {string} password 
 */
async function handleRegister(username, password) {
    const serverUrl = 'https://snugos-server-api.onrender.com';

    try {
        const response = await fetch(`${serverUrl}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            localAppServices.showNotification('Registration successful! Please log in.', 2500);
        } else {
            localAppServices.showNotification(`Registration failed: ${data.message}`, 3000);
        }
    } catch (error) {
        localAppServices.showNotification('Network error. Could not connect to server.', 3000);
    }
}

/**
 * NEW: Handles uploading the background file to the server.
 * @param {File} file The image or video file to upload.
 */
export async function handleBackgroundUpload(file) {
    const token = localStorage.getItem('snugos_token');
    if (!token) {
        localAppServices.showNotification('You must be logged in to save a custom background.', 3000);
        // still apply locally for a good UX
        localAppServices.applyCustomBackground(file);
        return;
    }

    const formData = new FormData();
    formData.append('backgroundFile', file);

    localAppServices.showNotification('Uploading background...', 2000);
    const serverUrl = 'https://snugos-server-api.onrender.com';

    try {
        const response = await fetch(`${serverUrl}/api/profile/background`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            localAppServices.showNotification('Background updated!', 2000);
            localAppServices.applyCustomBackground(data.backgroundUrl);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        localAppServices.showNotification(`Error saving background: ${error.message}`, 3000);
    }
}


/**
 * Logs the user out by removing the token and updating the UI.
 */
function handleLogout() {
    localStorage.removeItem('snugos_token');
    updateAuthUI(null);
    // Optionally, reset the background to default on logout
    document.getElementById('desktop').style.backgroundImage = '';
    const existingVideo = document.getElementById('desktop-video-bg');
    if (existingVideo) existingVideo.remove();
    
    localAppServices.showNotification('You have been logged out.', 2000);
}
