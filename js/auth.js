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
        userAuthContainer.innerHTML = `<button id="loginBtnTop" class="px-3 py-1 border rounded">Login</button>`;
        userAuthContainer.querySelector('#loginBtnTop')?.addEventListener('click', showLoginModal);
        menuLogin?.classList.remove('hidden');
        menuLogout?.classList.add('hidden');
    }
}

/**
 * Checks for a saved JWT in localStorage to automatically log the user in.
 */
async function checkInitialAuthState() {
    const token = localStorage.getItem('snugos_token');
    if (token) {
        // A more secure app would verify the token with the server here.
        // For simplicity, we decode it on the client to check for expiry.
        try {
            // Decode the payload part of the JWT (it's the middle part)
            const payload = JSON.parse(atob(token.split('.')[1]));
            // Check if the token has expired
            if (payload.exp * 1000 > Date.now()) {
                updateAuthUI({ username: payload.username });
            } else {
                handleLogout(); // Token is expired, log the user out
            }
        } catch (e) {
            console.error("Error decoding token:", e);
            handleLogout(); // The token is invalid
        }
    } else {
        updateAuthUI(null);
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
                    <input type="text" id="loginUsername" placeholder="Username" required class="w-full p-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white">
                    <input type="password" id="loginPassword" placeholder="Password" required class="w-full p-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white">
                    <button type="submit" class="w-full px-4 py-2 border rounded">Login</button>
                </form>
            </div>
            <hr class="border-gray-500">
            <div>
                <h3 class="text-lg font-bold mb-2">Don't have an account? Register</h3>
                <form id="registerForm" class="space-y-3">
                    <input type="text" id="registerUsername" placeholder="Username" required class="w-full p-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white">
                    <input type="password" id="registerPassword" placeholder="Password (min. 6 characters)" required class="w-full p-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white">
                    <button type="submit" class="w-full px-4 py-2 border rounded">Register</button>
                </form>
            </div>
        </div>
    `;
    
    // Use the utility function to show the modal
    const { overlay } = localAppServices.showCustomModal('Login or Register', modalContent, []);

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
 * Sends a login request to the server.
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
            updateAuthUI(data.user);
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
 * Logs the user out by removing the token and updating the UI.
 */
function handleLogout() {
    localStorage.removeItem('snugos_token');
    updateAuthUI(null);
    localAppServices.showNotification('You have been logged out.', 2000);
}
