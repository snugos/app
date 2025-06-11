// js/welcome/welcome.js - Logic for the Welcome Page

import { showNotification, showCustomModal, base64ToBlob } from './welcomeUtils.js'; // Import from new welcomeUtils
import { storeAsset, getAsset } from './welcomeDb.js'; // Import from new welcomeDb

// Minimal appServices for this page, tailored for welcome page needs
const appServices = {};

let loggedInUser = null; // Manage user state directly in welcome.js
const SERVER_URL = 'https://snugos-server-api.onrender.com'; // Server URL for auth

function initializeWelcomePage() {
    // Populate appServices for welcome page's own use
    appServices.showNotification = showNotification;
    appServices.showCustomModal = showCustomModal;
    appServices.base64ToBlob = base64ToBlob;
    appServices.storeAsset = storeAsset;
    appServices.getAsset = getAsset;

    // Call these functions with a minimal appServices object if needed
    attachEventListeners();
    updateClockDisplay();
    checkInitialAuthState(); // Will now use functions defined/imported in welcome.js scope
    applyUserThemePreference(); // Will also be self-contained
}

function attachEventListeners() {
    // Top taskbar buttons
    document.getElementById('loginBtnTop')?.addEventListener('click', showLoginModal);
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);

    // Start Menu buttons
    document.getElementById('startButton')?.addEventListener('click', toggleStartMenu);
    document.getElementById('menuLaunchDaw')?.addEventListener('click', launchDaw);
    document.getElementById('menuViewProfiles')?.addEventListener('click', viewProfiles);
    document.getElementById('menuLogin')?.addEventListener('click', showLoginModal);
    document.getElementById('menuLogout')?.addEventListener('click', handleLogout); // Now directly linked to local handleLogout
    document.getElementById('menuToggleFullScreen')?.addEventListener('click', toggleFullScreen);

    // Desktop action buttons
    document.getElementById('launchDawBtn')?.addEventListener('click', launchDaw);
    document.getElementById('viewProfilesBtn')?.addEventListener('click', viewProfiles);

    // Close start menu on click outside
    document.addEventListener('click', (e) => {
        const startMenu = document.getElementById('startMenu');
        const startButton = document.getElementById('startButton');
        if (startMenu && !startMenu.classList.contains('hidden')) {
            if (!startMenu.contains(e.target) && e.target !== startButton) {
                startMenu.classList.add('hidden');
            }
        }
    });

    // Custom background upload for welcome page
    // Need to ensure an input with id="customBgInput" exists in welcome.html
    const customBgInput = document.getElementById('customBgInput');
    customBgInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleBackgroundUpload(file); // Calls local handler
        }
        e.target.value = null; // Clear the input
    });
}

function toggleStartMenu() {
    document.getElementById('startMenu')?.classList.toggle('hidden');
}

function launchDaw() {
    window.location.href = 'index.html';
}

function viewProfiles() {
    // This will open profile.html in a new tab. Profile.html has its own JS dependencies.
    window.open('profile.html?user=testuser', '_blank'); // Replace 'testuser' as needed
}

function updateClockDisplay() {
    const clockDisplay = document.getElementById('taskbarClockDisplay');
    if (clockDisplay) {
        const now = new Date();
        clockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    setTimeout(updateClockDisplay, 1000); // Update every second
}

// --- Authentication & User State Logic (Self-contained for Welcome Page) ---
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
        
        loggedInUser = { id: payload.id, username: payload.username };
        updateAuthUI(loggedInUser);

        // Apply custom background if available and logged in
        const backgroundBlob = await appServices.getAsset(`background-for-user-${loggedInUser.id}`);
        if (backgroundBlob) {
            applyCustomBackground(backgroundBlob);
        }

    } catch (e) {
        console.error("Error during initial auth state check on welcome page:", e);
        handleLogout();
    }
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
        userAuthContainer.innerHTML = `<button id="loginBtnTop" class="px-3 py-1 border rounded">Login</button>`;
        userAuthContainer.querySelector('#loginBtnTop')?.addEventListener('click', showLoginModal);
        menuLogin?.classList.remove('hidden');
        menuLogout?.classList.add('hidden');
    }
}

export function showLoginModal() {
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
    
    const { overlay, contentDiv } = appServices.showCustomModal('Login or Register', modalContent, []); // Use appServices.showCustomModal

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
            await checkInitialAuthState(); // Re-check state after login to update UI and load background
            appServices.showNotification(`Welcome back, ${data.user.username}!`, 2000);
        } else {
            appServices.showNotification(`Login failed: ${data.message}`, 3000);
        }
    } catch (error) {
        appServices.showNotification('Network error. Could not connect to server.', 3000);
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
            appServices.showNotification('Registration successful! Please log in.', 2500);
        } else {
            appServices.showNotification(`Registration failed: ${data.message}`, 3000);
        }
    } catch (error) {
        appServices.showNotification('Network error. Could not connect to server.', 3000);
        console.error("Register Error:", error);
    }
}

async function handleBackgroundUpload(file) {
    if (!loggedInUser) {
        appServices.showNotification('You must be logged in to save a custom background.', 3000);
        applyCustomBackground(file); // Still apply temporarily even if not logged in
        return;
    }

    try {
        appServices.showNotification('Saving background...', 1500);
        await appServices.storeAsset(`background-for-user-${loggedInUser.id}`, file);
        applyCustomBackground(file);
        appServices.showNotification('Background saved locally!', 2000);
    } catch (error) {
        appServices.showNotification(`Error saving background: ${error.message}`, 3000);
        console.error("Background Upload Error:", error);
    }
}

function handleLogout() {
    localStorage.removeItem('snugos_token');
    loggedInUser = null;
    updateAuthUI(null);
    document.getElementById('desktop').style.backgroundImage = '';
    const existingVideo = document.getElementById('desktop-video-bg');
    if (existingVideo) existingVideo.remove();
    
    appServices.showNotification('You have been logged out.', 2000);
}

function applyCustomBackground(source) {
    const desktopEl = document.getElementById('desktop');
    if (!desktopEl) return;

    desktopEl.style.backgroundImage = '';
    const existingVideo = desktopEl.querySelector('#desktop-video-bg');
    if (existingVideo) {
        existingVideo.remove();
    }

    let url;
    let fileType;

    if (typeof source === 'string') {
        url = source;
        const extension = source.split('.').pop().toLowerCase().split('?')[0];
        if (['mp4', 'webm', 'mov'].includes(extension)) {
            fileType = `video/${extension}`;
        } else {
            fileType = 'image/jpeg'; // Assume image for other URLs
        }
    } else if (source instanceof Blob || source instanceof File) { // Accept Blob or File
        url = URL.createObjectURL(source);
        fileType = source.type;
    } else {
        console.warn("Invalid source for applyCustomBackground:", source);
        return;
    }

    if (fileType.startsWith('image/')) {
        desktopEl.style.backgroundImage = `url(${url})`;
        desktopEl.style.backgroundSize = 'cover';
        desktopEl.style.backgroundPosition = 'center';
    } else if (fileType.startsWith('video/')) {
        const videoEl = document.createElement('video');
        videoEl.id = 'desktop-video-bg';
        videoEl.style.position = 'absolute';
        videoEl.style.top = '0';
        videoEl.style.left = '0';
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'cover';
        videoEl.src = url;
        videoEl.autoplay = true;
        videoEl.loop = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
        desktopEl.appendChild(videoEl);
    }
}

function toggleTheme() {
    const body = document.body;
    const isLightTheme = body.classList.contains('theme-light');
    if (isLightTheme) {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
        localStorage.setItem('snugos-theme', 'dark');
    } else {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
        localStorage.setItem('snugos-theme', 'light');
    }
}

function applyUserThemePreference() {
    const preference = localStorage.getItem('snugos-theme');
    const body = document.body;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (preference === 'light') {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
    } else if (preference === 'dark') {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
    } else { // 'system' or no preference saved
        if (prefersDark) {
            body.classList.remove('theme-light');
            body.classList.add('theme-dark');
        } else {
            body.classList.remove('theme-dark');
            body.classList.add('theme-light');
        }
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            showNotification(`Error attempting to enable full-screen mode: ${err.message}`, 3000);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}


// Initialize the welcome page when the DOM is ready
document.addEventListener('DOMContentLoaded', initializeWelcomePage);
