// js/daw/welcome/welcome.js
// NOTE: This file is designed to run within the main index.html context.
// It sets up the desktop icons and application launching.

import { SnugWindow } from '../SnugWindow.js';
import { showNotification, showCustomModal } from './welcomeUtils.js';
import { storeAsset, getAsset } from './welcomeDb.js';
import { initializeAuth, handleBackgroundUpload, handleLogout } from '../auth.js';

// Import necessary state accessors
import { getWindowById, addWindowToStore, removeWindowFromStore, incrementHighestZ, getHighestZ, setHighestZ } from '../state/windowState.js';
import { getCurrentUserThemePreference, setCurrentUserThemePreference } from '../state/appState.js';

// Explicitly import createContextMenu and showConfirmationDialog from utils.js
import { createContextMenu, showConfirmationDialog } from '../utils.js';

let appServices = {};
let loggedInUser = null;
const SERVER_URL = 'https://snugos-server-api.onrender.com';

/**
 * Creates and opens a new window containing an HTML page loaded into an iframe.
 * Used for apps that *should* be embedded (Profiles, Library, Tetris).
 * @param {string} windowId Unique ID for the SnugWindow.
 * @param {string} windowTitle Title of the SnugWindow.
 * @param {string} iframeSrc URL of the HTML page to load in the iframe.
 * @param {object} options SnugWindow options.
 */
function openEmbeddedAppInWindow(windowId, windowTitle, iframeSrc, options = {}) {
    if (appServices.getWindowById(windowId)) {
        appServices.getWindowById(windowId).focus();
        return;
    }

    const content = document.createElement('iframe');
    content.src = iframeSrc;
    content.style.width = '100%';
    content.style.height = '100%';
    content.style.border = 'none';
    content.style.backgroundColor = 'var(--bg-window-content)'; // Inherit theme background

    const windowInstance = new SnugWindow(windowId, windowTitle, content, options, appServices);

    // Inject appServices into iframe after content loads
    content.onload = () => {
        try {
            if (content.contentWindow && content.contentWindow.document) {
                // Pass appServices to the iframe's global scope and call its initializer
                content.contentWindow.appServices = appServices;
                if (content.contentWindow.initializePage) { // This is the expected initializer in iframe HTML
                    content.contentWindow.initializePage(appServices);
                }
                console.log(`[SnugOS] appServices injected into iframe: ${iframeSrc}`);
            }
        } catch (e) {
            console.warn(`[SnugOS] Could not inject appServices into iframe ${iframeSrc}. Check same-origin policy or iframe content.`, e);
        }
    };
    return windowInstance;
}

/**
 * Sets up the main welcome page functionality.
 */
function initializeWelcomePage() {
    // Populate the appServices object for the index.html context
    appServices.showNotification = showNotification;
    appServices.showCustomModal = showCustomModal;
    appServices.storeAsset = storeAsset;
    appServices.getAsset = getAsset;
    
    // Core SnugWindow/Window State functions
    appServices.addWindowToStore = addWindowToStore;
    appServices.removeWindowFromStore = removeWindowFromStore;
    appServices.incrementHighestZ = incrementHighestZ;
    appServices.getHighestZ = getHighestZ;
    appServices.setHighestZ = setHighestZ;
    appServices.getWindowById = getWindowById;

    // Theme functions
    appServices.getCurrentUserThemePreference = getCurrentUserThemePreference;
    appServices.setCurrentUserThemePreference = setCurrentUserThemePreference;

    // Background handling
    appServices.applyCustomBackground = applyCustomBackground; // Local function in welcome.js
    appServices.handleBackgroundUpload = handleBackgroundUpload; // Imported from auth.js

    // Utility access
    appServices.createContextMenu = createContextMenu;
    appServices.showConfirmationDialog = showConfirmationDialog;

    // Initialize auth module (passing the appServices)
    initializeAuth(appServices);

    attachEventListeners();
    updateClockDisplay();
    applyUserThemePreference();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', appServices.applyUserThemePreference);
    renderDesktopIcons();
    initAudioOnFirstGesture();
}

/**
 * Handles browser security restrictions by starting the audio context
 * only after the first user click on the page.
 */
function initAudioOnFirstGesture() {
    const startAudio = async () => {
        // Tone.js is loaded in index.html because Tetris (and now DAW) will be embedded.
        if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
            await Tone.start();
            console.log('AudioContext started successfully.');
        }
        document.body.removeEventListener('mousedown', startAudio);
    };
    document.body.addEventListener('mousedown', startAudio);
}

/**
 * Attaches all primary event listeners for the page.
 */
function attachEventListeners() {
    document.getElementById('loginBtnTop')?.addEventListener('click', showLoginModal);
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
    document.getElementById('startButton')?.addEventListener('click', toggleStartMenu);
    
    // Start Menu and Desktop Icon actions
    document.getElementById('menuLaunchDaw')?.addEventListener('click', launchDaw); // Direct navigation (DAW)
    document.getElementById('menuViewProfiles')?.addEventListener('click', viewProfiles); // SnugWindow
    document.getElementById('menuOpenLibrary')?.addEventListener('click', openLibraryWindow); // SnugWindow
    
    document.getElementById('menuLogin')?.addEventListener('click', () => {
        toggleStartMenu();
        // auth.js's showLoginModal will be called by initializeAuth and will handle form submits
    });
    document.getElementById('menuLogout')?.addEventListener('click', () => {
        toggleStartMenu();
        handleLogout();
    });
    document.getElementById('menuToggleFullScreen')?.addEventListener('click', toggleFullScreen);
    document.getElementById('customBgInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) appServices.handleBackgroundUpload(file);
        e.target.value = null;
    });

    // Add context menu to desktop
    document.getElementById('desktop')?.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (e.target.closest('.window')) return;
        const menuItems = [
            { label: 'Change Background', action: () => document.getElementById('customBgInput').click() },
            { separator: true },
            { label: 'Open DAW', action: launchDaw }, // Direct navigation (DAW)
            { label: 'Open Library', action: openLibraryWindow }, // SnugWindow
            { label: 'View Profiles', action: viewProfiles }, // SnugWindow
            { label: 'Play Snugtris', action: openGameWindow }
        ];
        appServices.createContextMenu(e, menuItems);
    });
}

/**
 * Renders the application icons on the desktop.
 */
function renderDesktopIcons() {
    const desktopIconsContainer = document.getElementById('desktop-icons-container');
    if (!desktopIconsContainer) return;

    desktopIconsContainer.innerHTML = '';

    const icons = [
        {
            id: 'snaw-icon',
            name: 'Snaw',
            action: launchDaw, // Direct navigation (DAW)
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-8z"/></svg>`
        },
        {
            id: 'profiles-icon',
            name: 'Profiles',
            action: viewProfiles, // SnugWindow
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`
        },
        {
            id: 'sound-library-icon',
            name: 'Library',
            action: openLibraryWindow, // SnugWindow
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 10H9c-.55 0-1-.45-1-1V5c0-.55.45-1 1-1h8c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1z"/></svg>`
        },
        {
            id: 'game-icon',
            name: 'Game',
            action: openGameWindow, // SnugWindow
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12"><path d="M21.57,9.36,18,7.05V4a1,1,0,0,0-1-1H7A1,1,0,0,0,6,4V7.05L2.43,9.36a1,1,0,0,0-.43,1V17a1,1,0,0,0,1,1H6v3a1,1,0,0,0,1,1h1V19H16v3h1a1,1,0,0,0,1-1V18h3a1,1,0,0,0,1-1V10.36A1,1,0,0,0,21.57,9.36ZM8,5H16V7H8ZM14,14H12V16H10V14H8V12h2V10h2v2h2Z"/></svg>`
        }
    ];

    icons.forEach(icon => {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'desktop-icon';
        iconDiv.id = icon.id;
        
        const imgContainer = document.createElement('div');
        imgContainer.className = 'desktop-icon-image';
        imgContainer.innerHTML = icon.svgContent;

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

// MODIFIED: Launch DAW as a standalone page (direct navigation)
function launchDaw() {
    toggleStartMenu();
    window.location.href = 'snaw.html';
}

// MODIFIED: View Profiles opens in a SnugWindow iframe
function viewProfiles() {
    toggleStartMenu();
    const profileUsername = loggedInUser ? loggedInUser.username : 'snaw';
    openEmbeddedAppInWindow(`profile-${profileUsername}`, `${profileUsername}'s Profile`, `js/daw/profiles/profile.html?user=${profileUsername}`, { width: 600, height: 700 });
}

// MODIFIED: Open Library opens in a SnugWindow iframe
function openLibraryWindow() {
    toggleStartMenu();
    openEmbeddedAppInWindow('libraryApp', 'SnugOS Library', `js/daw/profiles/library.html`, { width: 800, height: 600 });
}

// MODIFIED: Open Tetris is still embedded in a SnugWindow iframe
function openGameWindow() {
    toggleStartMenu();
    openEmbeddedAppInWindow('tetrisGame', 'Snugtris', 'tetris.html', { width: 600, height: 750, minWidth: 400, minHeight: 600 });
}

function updateClockDisplay() {
    const clockDisplay = document.getElementById('taskbarClockDisplay');
    if (clockDisplay) {
        const now = new Date();
        clockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    setTimeout(updateClockDisplay, 60000);
}

function applyCustomBackground(source) {
    const desktopEl = document.getElementById('desktop');
    if (!desktopEl) return;
    desktopEl.style.backgroundImage = '';
    const existingVideo = desktopEl.querySelector('video#desktop-video-bg');
    if (existingVideo) existingVideo.remove();
    let url, fileType;
    if (typeof source === 'string') {
        url = source;
        const extension = source.split('.').pop().toLowerCase().split('?')[0];
        fileType = ['mp4', 'webm', 'mov'].includes(extension) ? `video/${extension}` : 'image/jpeg';
    } else if (source instanceof Blob || source instanceof File) {
        url = URL.createObjectURL(source);
        fileType = source.type;
    } else { return; }
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

function showLoginModal() {
    document.getElementById('startMenu')?.classList.add('hidden');
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
            <hr class="border-gray-500">
            <div>
                <h3 class="font-bold mb-2">Register</h3>
                <form id="registerForm" class="space-y-3">
                    <input type="text" id="registerUsername" placeholder="Username" required class="w-full p-2 border rounded" style="background-color: var(--bg-input); color: var(--text-primary);">
                    <input type="password" id="registerPassword" placeholder="Password (min. 6)" required class="w-full p-2 border rounded" style="background-color: var(--bg-input); color: var(--text-primary);">
                    <button type="submit" class="w-full p-2 rounded" style="background-color: var(--bg-button); color: var(--text-button); border: 1px solid var(--border-button);">Register</button>
                </form>
            </div>
            <div id="login-register-status" class="text-center text-sm mt-2"></div>
        </div>
    `;
    const { overlay } = appServices.showCustomModal('Login or Register', modalContent, []);

    // Add button styling and form submission
    const loginForm = overlay.querySelector('#loginForm');
    const registerForm = overlay.querySelector('#registerForm');
    const statusDiv = overlay.querySelector('#login-register-status');

    // Style inputs and buttons
    overlay.querySelectorAll('input[type="text"], input[type="password"]').forEach(input => {
        input.style.backgroundColor = 'var(--bg-input)';
        input.style.color = 'var(--text-primary)';
        input.style.border = '1px solid var(--border-input)';
        input.style.padding = '8px';
        input.style.borderRadius = '3px';
    });

    overlay.querySelectorAll('button').forEach(button => {
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

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = loginForm.querySelector('#loginUsername').value;
        const password = loginForm.querySelector('#loginPassword').value;
        statusDiv.textContent = 'Logging in...';
        try {
            const response = await fetch(`${SERVER_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (data.success) {
                localStorage.setItem('snugos_token', data.token);
                // The initializeAuth function will handle updating UI and background
                initializeAuth(appServices); 
                statusDiv.textContent = `Welcome back, ${data.user.username}!`;
                setTimeout(() => overlay.remove(), 1000);
            } else {
                statusDiv.textContent = `Login failed: ${data.message}`;
            }
        } catch (error) {
            statusDiv.textContent = 'Network error. Could not connect to server.';
            console.error("Login Error:", error);
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = registerForm.querySelector('#registerUsername').value;
        const password = registerForm.querySelector('#registerPassword').value;
        statusDiv.textContent = 'Registering...';
        try {
            const response = await fetch(`${SERVER_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (data.success) {
                statusDiv.textContent = 'Registration successful! Please log in.';
                // No auto-login after register, user should log in explicitly
            } else {
                statusDiv.textContent = `Registration failed: ${data.message}`;
            }
        } catch (error) {
            statusDiv.textContent = 'Network error. Could not connect to server.';
            console.error("Register Error:", error);
        }
    });
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
    const themeToApply = preference || (prefersDark ? 'dark' : 'light');
    if (themeToApply === 'light') {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
    } else {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            appServices.showNotification(`Error: ${err.message}`, 3000);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

document.addEventListener('DOMContentLoaded', initializeWelcomePage);
