// js/auth.js
import { storeAsset, getAsset } from '../db.js';

let localAppServices = {};
let loggedInUser = null;

export function initializeAuth(appServices) {
    localAppServices = appServices;
    document.getElementById('loginBtnTop')?.addEventListener('click', showLoginModal);
    document.getElementById('menuLogin')?.addEventListener('click', showLoginModal);
    document.getElementById('menuLogout')?.addEventListener('click', handleLogout);
    checkInitialAuthState();
}

function updateAuthUI(user = null) {
    loggedInUser = user;
    const userAuthContainer = document.getElementById('userAuthContainer');
    const menuLogin = document.getElementById('menuLogin');
    const menuLogout = document.getElementById('menuLogout');

    if (user && userAuthContainer) {
        userAuthContainer.innerHTML = `<span class="mr-2">Welcome, ${user.username}!</span>`;
        menuLogin?.classList.add('hidden');
        menuLogout?.classList.remove('hidden');
    } else {
        userAuthContainer.innerHTML = `<button id="loginBtnTop" class="px-3 py-1">Login</button>`;
        userAuthContainer.querySelector('#loginBtnTop')?.addEventListener('click', showLoginModal);
        menuLogin?.classList.remove('hidden');
        menuLogout?.classList.add('hidden');
    }
}

async function checkInitialAuthState() {
    const token = localStorage.getItem('snugos_token');
    if (!token) {
        updateAuthUI(null);
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            return handleLogout();
        }
        
        // Set the logged in user state
        loggedInUser = { id: payload.id, username: payload.username };
        updateAuthUI(loggedInUser);

        // NEW: Try to load the background from the local database
        const backgroundBlob = await getAsset(`background-for-user-${loggedInUser.id}`);
        if (backgroundBlob) {
            localAppServices.applyCustomBackground(backgroundBlob);
        }

    } catch (e) {
        console.error("Error during initial auth state check:", e);
        handleLogout();
    }
}

export function showLoginModal() {
    // ... (This function remains the same as before)
    document.getElementById('startMenu')?.classList.add('hidden');
    const modalContent = `...`; // The HTML for the modal is unchanged
    const { overlay, contentDiv } = localAppServices.showCustomModal('Login or Register', modalContent, []);
    // ... (styling and event listeners for the form remain the same)
}

async function handleLogin(username, password) {
    const serverUrl = 'https://snugos-server-api.onrender.com';

    try {
        const response = await fetch(`${serverUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('snugos_token', data.token);
            await checkInitialAuthState(); // Re-check state to load user info and background
            localAppServices.showNotification(`Welcome back, ${data.user.username}!`, 2000);
        } else {
            localAppServices.showNotification(`Login failed: ${data.message}`, 3000);
        }
    } catch (error) {
        localAppServices.showNotification('Network error. Could not connect to server.', 3000);
    }
}

async function handleRegister(username, password) {
    // ... (This function remains the same)
}

// UPDATED: This function now saves the background to the local database
export async function handleBackgroundUpload(file) {
    if (!loggedInUser) {
        localAppServices.showNotification('You must be logged in to save a custom background.', 3000);
        // still apply locally for a good UX
        localAppServices.applyCustomBackground(file);
        return;
    }

    try {
        localAppServices.showNotification('Saving background...', 1500);
        await storeAsset(`background-for-user-${loggedInUser.id}`, file);
        localAppServices.applyCustomBackground(file);
        localAppServices.showNotification('Background saved locally!', 2000);
    } catch (error) {
        localAppServices.showNotification(`Error saving background: ${error.message}`, 3000);
    }
}

function handleLogout() {
    localStorage.removeItem('snugos_token');
    loggedInUser = null;
    updateAuthUI(null);
    // Reset the background to default on logout
    document.getElementById('desktop').style.backgroundImage = '';
    const existingVideo = document.getElementById('desktop-video-bg');
    if (existingVideo) existingVideo.remove();
    
    localAppServices.showNotification('You have been logged out.', 2000);
}
