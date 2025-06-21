// js/daw/profiles/profile.js
// NOTE: This file is the main JavaScript for the standalone SnugOS Profile application (profile.html).
// It manages its own desktop UI and profile-specific logic.

// Corrected imports to be absolute paths
import { SnugWindow } from '/app/js/daw/SnugWindow.js';
import { showNotification, showCustomModal, createContextMenu } from '/app/js/daw/utils.js';
import { storeAsset, getAsset } from '/app/js/daw/db.js';
import * as Constants from '/app/js/daw/constants.js';
import { getWindowById, addWindowToStore, removeWindowFromStore, incrementHighestZ, getHighestZ, setHighestZ, getOpenWindows, serializeWindows, reconstructWindows } from '/app/js/daw/state/windowState.js';
import { getCurrentUserThemePreference, setCurrentUserThemePreference } from '/app/js/daw/state/appState.js';

const SERVER_URL = 'https://snugos-server-api.onrender.com';
let loggedInUser = null;
let currentProfileData = null;
let isEditing = false;
const appServices = {}; // This will be populated locally for this standalone app.

// --- Global UI and Utility Functions (Defined first to ensure availability) ---

// Authentication/Login/Logout Functions
function checkLocalAuth() {
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
            loggedInUser = data.user;
            showNotification(`Welcome, ${data.user.username}!`, 2000);
            window.location.reload(); // Reload the page to fully initialize with logged-in user
        } else {
            showNotification(`Login failed: ${data.message}`, 3000);
        }
    } catch (error) {
        showNotification('Network error.', 3000);
        console.error("Login Error:", error);
    }
}

async function handleRegister(username, password) {
    try {
        const response = await fetch(`${SERVER_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.success) {
            showNotification('Registration successful! Please log in.', 2500);
        } else {
            showNotification(`Registration failed: ${data.message}`, 3000);
        }
    } catch (error) {
        showNotification('Network error.', 3000);
        console.error("Register Error:", error);
    }
}

function handleLogout() {
    localStorage.removeItem('snugos_token');
    loggedInUser = null;
    showNotification('You have been logged out.', 2000);
    window.location.reload(); // Reload the page to reflect logout status
}

function showLoginModal() {
    const modalContent = `
        <div class="space-y-4">
            <div>
                <h3 class="font-bold mb-2">Login</h3>
                <form id="loginForm" class="space-y-3">
                    <input type="text" id="loginUsername" placeholder="Username" required class="w-full p-2 border rounded" style="background-color: var(--bg-input); color: var(--text-primary);">
                    <input type="password" id="loginPassword" placeholder="Password" required class="w-full p-2 border rounded" style="background-color: var(--bg-input); color: var(--text-primary);">
                    <button type="submit" class="w-full p-2 rounded" style="background-color: var(--bg-button); color: var(--text-button); border: 1px solid var(--border-button);">Login</button>
                </form>
            </div>
            <hr style="border-color: var(--border-secondary);">
            <div>
                <h3 class="font-bold mb-2">Register</h3>
                <form id="registerForm" class="space-y-3">
                    <input type="text" id="registerUsername" placeholder="Username" required class="w-full p-2 border rounded" style="background-color: var(--bg-input); color: var(--text-primary);">
                    <input type="password" id="registerPassword" placeholder="Password (min. 6)" required class="w-full p-2 border rounded" style="background-color: var(--bg-input); color: var(--text-primary);">
                    <button type="submit" class="w-full p-2 rounded" style="background-color: var(--bg-button); color: var(--text-button); border: 1px solid var(--border-button);">Register</button>
                </form>
            </div>
        </div>
    `;
    const { overlay } = showCustomModal('Login or Register', modalContent, []);
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

// Global UI functions (clock, start menu, full screen, desktop event listeners, theme)
function updateClockDisplay() {
    const clockDisplay = document.getElementById('taskbarClockDisplay');
    if (clockDisplay) {
        clockDisplay.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    setTimeout(updateClockDisplay, 60000);
}

function toggleStartMenu() {
    document.getElementById('startMenu')?.classList.toggle('hidden');
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            showNotification(`Error: ${err.message}`, 3000);
        });
    } else {
        if(document.exitFullscreen) document.exitFullscreen();
    }
}

function attachDesktopEventListeners() {
    // Top-level elements
    document.getElementById('startButton')?.addEventListener('click', toggleStartMenu);
    document.getElementById('menuLogin')?.addEventListener('click', () => { toggleStartMenu(); showLoginModal(); });
    document.getElementById('menuLogout')?.addEventListener('click', handleLogout);

    // Links in the start menu (will open new tabs/windows)
    document.getElementById('menuLaunchDaw')?.addEventListener('click', () => { window.open('/app/snaw.html', '_blank'); toggleStartMenu(); });
    document.getElementById('menuOpenLibrary')?.addEventListener('click', () => { window.open('/app/js/daw/browser/browser.html', '_blank'); toggleStartMenu(); }); // Browser link
    document.getElementById('menuViewProfiles')?.addEventListener('click', () => { window.open('/app/js/daw/profiles/profile.html', '_blank'); toggleStartMenu(); }); // Profile link
    document.getElementById('menuOpenMessages')?.addEventListener('click', () => { window.open('/app/js/daw/messages/messages.html', '_blank'); toggleStartMenu(); }); // Messages link

    // Generic context menu for desktop background
    const desktop = document.getElementById('desktop');
    if (desktop) {
        desktop.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const menuItems = [
                { label: 'Change Background', action: () => document.getElementById('customBgInput').click() }
            ];
            createContextMenu(e, menuItems);
        });

        document.getElementById('customBgInput')?.addEventListener('change', async (e) => {
            if(!e.target.files || !e.target.files[0] || !loggedInUser) return;
            const file = e.target.files[0];
            await handleBackgroundUpload(file);
            e.target.value = null;
        });
    }

    document.getElementById('menuToggleFullScreen')?.addEventListener('click', toggleFullScreen);
}

async function loadAndApplyGlobals() {
    if (!loggedInUser) return;
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/profile/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if (data.success && data.profile.background_url) {
            const desktop = document.getElementById('desktop');
            if(desktop) {
                desktop.style.backgroundImage = `url(${data.profile.background_url})`;
                desktop.style.backgroundSize = 'cover';
                desktop.style.backgroundPosition = 'center';
            }
        }
    } catch (error) {
        console.error("Could not apply global settings:", error);
    }
}

async function handleBackgroundUpload(file) {
    if (!loggedInUser) {
        showNotification('You must be logged in to save a background.', 3000);
        return;
    }
    try {
        await storeAsset(`background-for-user-${loggedInUser.id}`, file);
        loadAndApplyGlobals(); // Re-apply global background
        showNotification('Background saved locally!', 2000);
    } catch (error) {
        showNotification(`Error saving background: ${error.message}`, 3000);
    }
}

// --- Main Window and UI Functions ---

// Main entry point for the Profile application when loaded
document.addEventListener('DOMContentLoaded', () => {
    // Populate appServices for this standalone desktop's context
    appServices.addWindowToStore = addWindowToStore;
    appServices.removeWindowFromStore = removeWindowFromStore;
    appServices.incrementHighestZ = incrementHighestZ;
    appServices.getHighestZ = getHighestZ;
    appServices.setHighestZ = setHighestZ;
    appServices.getOpenWindows = getOpenWindows;
    appServices.getWindowById = getWindowById;
    appServices.createContextMenu = createContextMenu; // From utils.js
    appServices.showNotification = showNotification;   // From utils.js
    appServices.showCustomModal = showCustomModal;     // From utils.js

    // Global state imports for appServices
    appServices.applyUserThemePreference = applyUserThemePreference;
    appServices.setCurrentUserThemePreference = setCurrentUserThemePreference;
    appServices.getCurrentUserThemePreference = getCurrentUserThemePreference;

    loggedInUser = checkLocalAuth();
    attachDesktopEventListeners(); // Call local function attachDesktopEventListeners
    applyUserThemePreference(); // Call local function applyUserThemePreference
    updateClockDisplay(); // Call local function updateClockDisplay
    
    // Get username from URL parameters or default to logged-in user
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user') || (loggedInUser ? loggedInUser.username : null);

    if (username) {
        openProfileWindow(username); // Open profile for specified user
    } else {
        // If no username in URL and not logged in, show login modal
        const desktop = document.getElementById('desktop');
        if(desktop) {
            desktop.innerHTML = `<div class="w-full h-full flex items-center justify-center"><p class="text-xl" style="color:var(--text-primary);">Please log in or specify a user in the URL to view a profile.</p></div>`;
        }
        showLoginModal();
    }
});

async function openProfileWindow(username) {
    // For a standalone app, this function *is* the main window logic.
    // We update its content directly.
    const profileContainer = document.getElementById('profile-container');
    if (!profileContainer) return; // Ensure profile container exists

    profileContainer.innerHTML = '<p class="p-8 text-center" style="color: var(--text-secondary);">Loading Profile...</p>';
    
    try {
        const token = localStorage.getItem('snugos_token');
        const [profileRes, friendStatusRes] = await Promise.all([
            fetch(`${SERVER_URL}/api/profiles/${username}`),
            token ? fetch(`${SERVER_URL}/api/profiles/${username}/friend-status`, { headers: { 'Authorization': `Bearer ${token}` } }) : Promise.resolve(null)
        ]);

        const profileData = await profileRes.json();
        if (!profileRes.ok) throw new Error(profileData.message);
        
        const friendStatusData = friendStatusRes ? await friendStatusRes.json() : null;
        
        currentProfileData = profileData.profile;
        currentProfileData.isFriend = friendStatusData?.isFriend || false;

        updateProfileUI(profileData); // Pass profileData directly
        
        // Attach profile-specific event listeners after UI is updated
        attachProfileSpecificEventListeners(profileData);

    }