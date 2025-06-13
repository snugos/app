// js/auth.js

// NEW: Import applyCustomBackground and handleBackgroundUpload from backgroundManager.js
import { applyCustomBackground, handleBackgroundUpload, loadAndApplyUserBackground } from './backgroundManager.js';

// Import from utils.js (assuming it's available or passed via appServices)
// These should ideally be passed in appServices for strict modularity
// For now, we'll assume they're broadly accessible or main.js/messenger.js injects them correctly.
// const showNotification = appServices.showNotification; // This pattern might be needed if they aren't globally available
// const showCustomModal = appServices.showCustomModal;

let localAppServices = {};
let loggedInUser = null; // Manage this state here

const SERVER_URL = 'https://snugos-server-api.onrender.com';

/**
 * Initializes the authentication module and attaches event listeners.
 * Should be called once on page load.
 * @param {object} appServicesFromMain - The main app services object.
 */
export function initializeAuth(appServicesFromMain) { 
    localAppServices = appServicesFromMain;
    // Expose local `loggedInUser` state via appServices
    localAppServices.getLoggedInUser = () => loggedInUser;
    localAppServices.setLoggedInUser = (user) => { loggedInUser = user; };

    document.getElementById('loginBtnTop')?.addEventListener('click', showLoginModal);
    document.getElementById('menuLogin')?.addEventListener('click', showLoginModal);
    document.getElementById('menuLogout')?.addEventListener('click', handleLogout);
    
    // Check initial auth state, which will also trigger background loading
    checkInitialAuthState();
}

/**
 * Checks for a local authentication token and validates it.
 * Updates `loggedInUser` state and the UI.
 */
export async function checkInitialAuthState() {
    const token = localStorage.getItem('snugos_token');
    if (!token) {
        loggedInUser = null;
        updateAuthUI(null);
        localAppServices.loadAndApplyUserBackground?.(); // Load default background
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            return handleLogout(); // Token expired
        }
        
        loggedInUser = { id: payload.id, username: payload.username };
        updateAuthUI(loggedInUser);
        localAppServices.loadAndApplyUserBackground?.(); // Load user's custom background

    } catch (e) {
        console.error("Error during initial auth state check:", e);
        handleLogout(); // Malformed token
    }
}

/**
 * Updates the UI elements related to user authentication (login/logout buttons, welcome message).
 * @param {object|null} user - The logged-in user object, or null if logged out.
 */
function updateAuthUI(user = null) {
    const userAuthContainer = document.getElementById('userAuthContainer');
    const menuLogin = document.getElementById('menuLogin');
    const menuLogout = document.getElementById('menuLogout');

    // Update loggedInUser in this module
    loggedInUser = user;
    // Also update it in appServices if it's stored there directly
    localAppServices.setLoggedInUser?.(user);

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
    const { overlay, contentDiv } = localAppServices.showCustomModal('Login or Register', modalContent, []);

    // Apply styles to inputs and buttons within the modal for consistency
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
    try {
        const response = await fetch(`${SERVER_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('snugos_token', data.token);
            // After successful login, set loggedInUser and trigger UI/background update
            loggedInUser = { id: data.user.id, username: data.user.username };
            updateAuthUI(loggedInUser); // Update UI
            localAppServices.loadAndApplyUserBackground?.(); // Load user background
            localAppServices.showNotification?.(`Welcome back, ${data.user.username}!`, 2000);
        } else {
            localAppServices.showNotification?.(`Login failed: ${data.message}`, 3000);
        }
    } catch (error) {
        localAppServices.showNotification?.('Network error. Could not connect to server.', 3000);
        console.error("Login Error:", error);
    }
}

/**
 * Handles user registration.
 * @param {string} username 
 * @param {string} password 
 */
async function handleRegister(username, password) {
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
        localAppServices.showNotification?.('Network error. Could not connect to server.', 3000);
        console.error("Register Error:", error);
    }
}

/**
 * Handles background file uploads. This function is exposed via `appServices`.
 * It now calls the centralized `handleBackgroundUpload` from `backgroundManager.js`.
 * @param {File} file 
 */
// Removed: This function is now directly in backgroundManager.js and called via appServices

/**
 * Handles user logout.
 */
export function handleLogout() { // Exported for direct call from UI/menu
    localStorage.removeItem('snugos_token');
    loggedInUser = null;
    updateAuthUI(null); // Clear UI
    localAppServices.applyCustomBackground?.(''); // Clear background
    localAppServices.showNotification?.('You have been logged out.', 2000);

    // Depending on the page, you might want to reload or redirect after logout
    // For general purpose, a reload is simplest to clear all app state.
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        // If on the main desktop, just update UI and background
        // (no need to reload, backgroundManager handles propagation)
    } else {
        // If on an app page (e.g., messenger, library, snaw), reload to reset app state
        window.location.reload(); 
    }
}

// Export checkLocalAuth for modules that might need to check auth status directly
export function checkLocalAuth() {
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
