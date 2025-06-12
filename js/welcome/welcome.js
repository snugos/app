// js/welcome/welcome.js - Logic for the Welcome Page

import { showNotification, showCustomModal, base64ToBlob } from './welcomeUtils.js';
import { storeAsset, getAsset } from './welcomeDb.js';

// Minimal appServices for this page, tailored for welcome page needs
const appServices = {};

let loggedInUser = null; // Manage user state directly in welcome.js
const SERVER_URL = 'https://snugos-server-api.onrender.com'; // Server URL for auth

function initializeWelcomePage() {
    // Basic appServices setup needed for utility functions
    appServices.showNotification = showNotification;
    appServices.showCustomModal = showCustomModal;
    appServices.base64ToBlob = base64ToBlob;
    appServices.storeAsset = storeAsset;
    appServices.getAsset = getAsset;

    attachEventListeners();
    updateClockDisplay();
    checkInitialAuthState(); // Will now use functions defined/imported in welcome.js scope
    applyUserThemePreference(); // Will also be self-contained
    renderDesktopIcons(); // Call to render desktop icons
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
    document.getElementById('menuLogout')?.addEventListener('click', handleLogout);
    document.getElementById('menuToggleFullScreen')?.addEventListener('click', toggleFullScreen);

    // Custom background upload for welcome page
    const customBgInput = document.getElementById('customBgInput');
    customBgInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleBackgroundUpload(file);
        }
        e.target.value = null;
    });
}

/**
 * Dynamically renders desktop icons and attaches click handlers.
 */
function renderDesktopIcons() {
    const desktopIconsContainer = document.getElementById('desktop-icons-container');
    if (!desktopIconsContainer) return;

    // Clear existing content
    desktopIconsContainer.innerHTML = '';

    const icons = [
        { 
            id: 'snaw-icon', 
            name: 'Snaw', // Changed text here
            action: launchDaw,
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14H8V8h2v8zm4 0h-2V8h2v8zm-3-9.75V11H8V6.25a2.25 2.25 0 014.5 0v4.75h-1V11z"/>
                        </svg>`
        },
        { 
            id: 'profiles-icon', 
            name: 'Profiles', 
            action: viewProfiles,
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12">
                            <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0V3.75a.75.75 0 011.5 0V6a7.5 7.5 0 11-15 0V3.75a.75.75 0 011.5 0V6zM3.75 16.5a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75zM3 20.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clip-rule="evenodd" />
                        </svg>`
        },
        { 
            id: 'sound-library-icon', 
            name: 'Sound Library', 
            action: () => showNotification('Sound Library will open here!', 2000), // Placeholder action
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12">
                            <path fill-rule="evenodd" d="M19.5 9a7.5 7.5 0 100 6h-15a.75.75 0 000 1.5h15.75A3.75 3.75 0 0023.25 15V9.75a.75.75 0 00-.75-.75H19.5z" clip-rule="evenodd" />
                            <path fill-rule="evenodd" d="M3.75 9H1.5a.75.75 0 00-.75.75V15a3.75 3.75 0 003.75 3.75h1.5a.75.75 0 000-1.5H3.75A2.25 2.25 0 011.5 15V9.75c0-.414.336-.75.75-.75H3.75a.75.75 0 000-1.5z" clip-rule="evenodd" />
                        </svg>`
        },
        { 
            id: 'settings-icon', 
            name: 'Settings', 
            action: () => showNotification('Settings will open here!', 2000), // Placeholder action
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12">
                            <path fill-rule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.884a1.125 1.125 0 01-1.07 1.07l-1.77-.252a1.125 1.125 0 00-1.44 1.188l.252 1.77c.057.42.106.827.147 1.229.058.423.095.823.132 1.226zM15.352 2.25c.917 0 1.699.663 1.85 1.567l.252 1.77a1.125 1.125 0 001.07 1.07l1.77-.252a1.125 1.125 0 011.188 1.44l-.252 1.77c-.057.42-.106.827-.147 1.229-.058.423-.095.823-.132 1.226zM11.078 21.75a1.125 1.125 0 01-1.07-1.07l-.252-1.77a1.125 1.125 0 00-1.07-1.07l-1.77.252a1.125 1.125 0 01-1.44-1.188l.252-1.77c.057-.42.106-.827.147-1.229.058-.423.095-.823.132-1.226zM15.352 21.75c.917 0 1.699-.663 1.85-1.567l.252-1.77a1.125 1.125 0 001.07-1.07l1.77.252a1.125 1.125 0 011.188-1.44l-.252-1.77c-.057-.42-.106-.827-.147-1.229-.058-.423-.095-.823-.132-1.226zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clip-rule="evenodd" />
                        </svg>`
        },
    ];

    icons.forEach(icon => {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'desktop-icon'; // Use desktop-icon class for styling
        iconDiv.id = icon.id; // Set ID for potential specific styling or manipulation
        iconDiv.dataset.app = icon.id; // Data attribute for logic

        const imgContainer = document.createElement('div');
        imgContainer.className = 'desktop-icon-image'; // Container for the SVG
        imgContainer.innerHTML = icon.svgContent; // Insert SVG directly

        const span = document.createElement('span');
        span.textContent = icon.name;

        iconDiv.appendChild(imgContainer);
        iconDiv.appendChild(span);

        iconDiv.addEventListener('click', icon.action);
        desktopIconsContainer.appendChild(iconDiv);
    });
}


function toggleStartMenu() {
    document.getElementById('startMenu')?.classList.toggle('hidden');
}

function launchDaw() {
    // Navigate to the main DAW application, now named snaw.html
    window.location.href = 'snaw.html';
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

function showLoginModal() {
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
    
    const { overlay, contentDiv } = appServices.showCustomModal('Login or Register', modalContent, []);

    contentDiv.querySelectorAll('input[type="text"], input[type="password"]').forEach(input => {
        input.style.backgroundColor = 'var(--bg-input)';
        input.style.color = 'var(--text-primary)';
        input.style.border = '1px solid var(--border-input)';
        input.style.padding = '8px';
        input.style.borderRadius = '3px';
    });

    contentDiv.querySelectorAll('button').forEach(button => {
        button.style.backgroundColor = 'var(--bg-button)';
        button.style.border = '1px solid '`var(--border-button)`;
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
            showNotification(`Welcome back, ${data.user.username}!`, 2000);
        } else {
            showNotification(`Login failed: ${data.message}`, 3000);
        }
    } catch (error) {
        showNotification('Network error. Could not connect to server.', 3000);
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
        showNotification('Network error. Could not connect to server.', 3000);
        console.error("Register Error:", error);
    }
}

async function handleBackgroundUpload(file) {
    if (!loggedInUser) {
        showNotification('You must be logged in to save a custom background.', 3000);
        applyCustomBackground(file); // Still apply temporarily even if not logged in
        return;
    }

    try {
        showNotification('Saving background...', 1500);
        await appServices.storeAsset(`background-for-user-${loggedInUser.id}`, file);
        applyCustomBackground(file);
        showNotification('Background saved locally!', 2000);
    } catch (error) {
        showNotification(`Error saving background: ${error.message}`, 3000);
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
    
    showNotification('You have been logged out.', 2000);
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
