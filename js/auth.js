// js/auth.js - Auth module for SnugOS

// Corrected import path for backgroundManager.js
import { applyCustomBackground, handleBackgroundUpload, loadAndApplyUserBackground } from './backgroundManager.js';

let localAppServices = {};
let loggedInUser = null; 

const SERVER_URL = 'https://snugos-server-api.onrender.com';

/**
 * Initializes the authentication module and attaches event listeners.
 * Should be called once on page load.
 * @param {object} appServicesFromMain - The main app services object.
 */
export function initializeAuth(appServicesFromMain) { 
    localAppServices = appServicesFromMain;
    
    // Ensure appServices always has the correct getters/setters for loggedInUser
    localAppServices.getLoggedInUser = () => loggedInUser;
    localAppServices.setLoggedInUser = (user) => { 
        loggedInUser = user; 
        // Optional: Trigger UI update here if needed, but `updateAuthUI` already does it.
    };

    document.getElementById('loginBtnTop')?.addEventListener('click', showLoginModal);
    document.getElementById('menuLogin')?.addEventListener('click', showLoginModal);
    document.getElementById('menuLogout')?.addEventListener('click', handleLogout);
    
    // Check initial auth state, which will also trigger background loading via appServices
    checkInitialAuthState();
}

/**
 * Checks for a local authentication token and validates it.
 * Updates `loggedInUser` state and the UI.
 */
export async function checkInitialAuthState() {
    console.log("[auth.js] checkInitialAuthState called.");
    const token = localStorage.getItem('snugos_token');
    if (!token) {
        loggedInUser = null; // Ensure state is cleared
        updateAuthUI(null); // Update UI for logged out state
        if (localAppServices.loadAndApplyUserBackground) {
            console.log("[auth.js] Calling appServices.loadAndApplyUserBackground (logged out path).");
            localAppServices.loadAndApplyUserBackground(); // Load default background
        } else {
            console.error("[auth.js] CRITICAL: appServices.loadAndApplyUserBackground is NOT defined during checkInitialAuthState initial load!");
        }
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            console.log("[auth.js] Token expired.");
            return handleLogout(); // Token expired
        }
        
        loggedInUser = { id: payload.id, username: payload.username };
        updateAuthUI(loggedInUser); // Update UI
        if (localAppServices.loadAndApplyUserBackground) {
            console.log("[auth.js] Calling appServices.loadAndApplyUserBackground (logged in path).");
            localAppServices.loadAndApplyUserBackground(); // Load user's custom background
        } else {
            console.error("[auth.js] CRITICAL: appServices.loadAndApplyUserBackground is NOT defined during checkInitialAuthState (logged in)!");
        }

    } catch (e) {
        console.error("[auth.js] Error during initial auth state check:", e);
        handleLogout(); // Malformed token
    }
}

/**
 * Updates the UI elements related to user authentication (login/logout buttons, welcome message).
 * @param {object|null} user - The logged-in user object, or null if logged out.
 */
function updateAuthUI(user = null) {
    // Update loggedInUser in this module and propagate to appServices
    loggedInUser = user;
    localAppServices.setLoggedInUser?.(user);

    const userAuthContainer = document.getElementById('userAuthContainer');
    const menuLogin = document.getElementById('menuLogin');
    const menuLogout = document.getElementById('menuLogout');

    if (user && userAuthContainer) {
        userAuthContainer.innerHTML = `<span class="mr-2">Welcome, ${user.username}!</span> <button id="logoutBtnTop" class="px-3 py-1 border rounded">Logout</button>`;
        userAuthContainer.querySelector('#logoutBtnTop')?.addEventListener('click', handleLogout);
        if (menuLogin) menuLogin.style.display = 'none';
        if (menuLogout) menuLogout.style.display = 'block';
    } else {
        userAuthContainer.innerHTML = `<button id="loginBtnTop" class="px-3 py-1 border rounded">Login</button>`;
        userAuthContainer.querySelector('#loginBtnTop')?.addEventListener('click', showLoginModal);
        if (menuLogin) menuLogin.style.display = 'block';
        if (menuLogout) menuLogout.style.display = 'none';
    }
}

/**
 * Displays the login/register modal.
 */
function showLoginModal() {
    console.log("[auth.js] showLoginModal called.");
    document.getElementById('startMenu')?.classList.add('hidden');
    // Reusing the modal content from welcome.js/index.html for consistency
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
    
    // Use appServices.showCustomModal, ensuring it's available
    if (!localAppServices.showCustomModal) {
        console.error("[auth.js] CRITICAL: appServices.showCustomModal is NOT defined!");
        alert("Error: Core UI functions not available."); // Fallback
        return;
    }
    const { overlay, contentDiv } = localAppServices.showCustomModal('Login or Register', modalContent, []);

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

    overlay.querySelector('#loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = overlay.querySelector('#loginUsername').value;
        const password = overlay.querySelector('#loginPassword').value;
        await handleLogin(username, password);
        overlay.remove();
    });

    overlay.querySelector('#registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = overlay.querySelector('#registerUsername').value;
        const password = overlay.querySelector('#registerPassword').value;
        await handleRegister(username, password);
        overlay.remove();
    });
}

/**
 * Handles user login.
 * @param {string} username 
 * @param {string} password 
 */
async function handleLogin(username, password) {
    console.log("[auth.js] handleLogin called.");
    try {
        const response = await fetch(`${SERVER_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('snugos_token', data.token);
            // On successful login, check state again to properly update loggedInUser and UI
            await checkInitialAuthState(); // This will update loggedInUser and call appServices.loadAndApplyUserBackground
            localAppServices.showNotification?.(`Welcome back, ${data.user.username}!`, 2000);
        } else {
            localAppServices.showNotification?.(`Login failed: ${data.message}`, 3000);
        }
    } catch (error) {
        console.error("[auth.js] Login Error:", error);
        localAppServices.showNotification?.('Network error. Could not connect to server.', 3000);
    }
}

/**
 * Handles user registration.
 * @param {string} username 
 * @param {string} password 
 */
async function handleRegister(username, password) {
    console.log("[auth.js] handleRegister called.");
    try {
        const response = await fetch(`${SERVER_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            localAppServices.showNotification?.('Registration successful! Please log in.', 2500);
        } else {
            localAppServices.showNotification?.(`Registration failed: ${data.message}`, 3000);
        }
    } catch (error) {
        console.error("[auth.js] Register Error:", error);
        localAppServices.showNotification?.('Network error. Could not connect to server.', 3000);
    }
}

/**
 * Handles background file uploads. This function is exposed via `appServices`.
 * It now calls the centralized `handleBackgroundUpload` from `backgroundManager.js`.
 * @param {File} file 
 */
export function handleBackgroundUpload(file) { 
    if (localAppServices.handleBackgroundUpload) { // Check if the service is available
        localAppServices.handleBackgroundUpload(file);
    } else {
        console.error("[auth.js] CRITICAL: appServices.handleBackgroundUpload is NOT defined!");
        localAppServices.showNotification?.("Error: Background upload service not available.", 3000);
    }
}

/**
 * Handles user logout.
 */
export function handleLogout() { 
    console.log("[auth.js] handleLogout called.");
    localStorage.removeItem('snugos_token');
    loggedInUser = null; // Clear local state
    localAppServices.setLoggedInUser?.(null); // Clear state in appServices

    updateAuthUI(null); // Update UI
    
    if (localAppServices.applyCustomBackground) { // Check service availability
        localAppServices.applyCustomBackground(''); // Clear background
    } else {
        console.error("[auth.js] CRITICAL: appServices.applyCustomBackground is NOT defined during logout!");
    }

    localAppServices.showNotification?.('You have been logged out.', 2000);

    // Reload behavior based on page:
    // If on index.html (main desktop), no reload is needed, broadcast takes care of it.
    // If on an app page (messenger, library, snaw, profile), reload to reset app state.
    if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
        window.location.reload(); 
    }
}

/**
 * Checks for a valid authentication token in local storage and returns user info if valid.
 * This is primarily used internally by auth.js for initial state checks.
 * @returns {Object|null} The logged-in user's ID and username, or null if no valid token.
 */
export function checkLocalAuth() { 
    try {
        const token = localStorage.getItem('snugos_token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            console.log("[auth.js] Token found but expired in checkLocalAuth.");
            localStorage.removeItem('snugos_token');
            return null;
        }
        return { id: payload.id, username: payload.username };
    } catch (e) {
        console.error("[auth.js] Error parsing token in checkLocalAuth:", e);
        localStorage.removeItem('snugos_token');
        return null;
    }
}
