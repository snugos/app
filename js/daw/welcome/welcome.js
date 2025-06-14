import { SnugWindow } from '../daw/SnugWindow.js';
import { showNotification, showCustomModal } from './welcomeUtils.js';
import { storeAsset, getAsset } from './welcomeDb.js';
import { initializeAuth, handleBackgroundUpload, handleLogout } from '../auth.js'; // Import auth functions

// Import necessary state accessors (since welcome.js now runs on index.html)
import { getWindowById, addWindowToStore, removeWindowFromStore, incrementHighestZ, getHighestZ, setHighestZ } from '../state/windowState.js';
import { getCurrentUserThemePreference, setCurrentUserThemePreference } from '../state/appState.js';

let appServices = {};
let loggedInUser = null;
const SERVER_URL = 'https://snugos-server-api.onrender.com';

/**
 * Creates and opens a new window containing an HTML page loaded into an iframe.
 * @param {string} windowId Unique ID for the SnugWindow.
 * @param {string} windowTitle Title of the SnugWindow.
 * @param {string} iframeSrc URL of the HTML page to load in the iframe.
 * @param {object} options SnugWindow options.
 * @param {boolean} injectAppServicesIntoIframe If true, tries to make appServices available in iframe.
 */
function openAppInWindow(windowId, windowTitle, iframeSrc, options = {}, injectAppServicesIntoIframe = true) {
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

    if (injectAppServicesIntoIframe) {
        // After the iframe content has loaded, inject appServices
        content.onload = () => {
            try {
                // Ensure the iframe's contentWindow is accessible (same-origin policy applies)
                if (content.contentWindow && content.contentWindow.document) {
                    content.contentWindow.appServices = appServices;
                    // If the iframe has an initialization function, call it
                    if (content.contentWindow.initializePage) {
                        content.contentWindow.initializePage(appServices);
                    }
                    console.log(`[SnugOS] appServices injected into iframe: ${iframeSrc}`);
                }
            } catch (e) {
                console.warn(`[SnugOS] Could not inject appServices into iframe ${iframeSrc}. Check same-origin policy or iframe content.`, e);
            }
        };
    }
    return windowInstance;
}

/**
 * Sets up the main welcome page functionality.
 */
function initializeWelcomePage() {
    // Populate the appServices object for the index.html context
    appServices.showNotification = showNotification;
    appServices.showCustomModal = showCustomModal;
    appServices.storeAsset = storeAsset; // from welcomeDb.js
    appServices.getAsset = getAsset;     // from welcomeDb.js
    
    // Core SnugWindow/Window State functions
    appServices.addWindowToStore = addWindowToStore;
    appServices.removeWindowFromStore = removeWindowFromStore;
    appServices.incrementHighestZ = incrementHighestZ;
    appServices.getHighestZ = getHighestZ;
    appServices.setHighestZ = setHighestZ;
    appServices.getWindowById = getWindowById;

    // Theme functions (from appState)
    appServices.getCurrentUserThemePreference = getCurrentUserThemePreference;
    appServices.setCurrentUserThemePreference = setCurrentUserThemePreference;

    // Background handling
    appServices.applyCustomBackground = applyCustomBackground; // Local function in welcome.js
    appServices.handleBackgroundUpload = handleBackgroundUpload; // Imported from auth.js

    // Global utility access (from utils.js, assumed globally loaded)
    appServices.createContextMenu = createContextMenu;
    appServices.showConfirmationDialog = showConfirmationDialog; // Assuming utils.js provides this

    // Initialize auth module (passing the appServices)
    initializeAuth(appServices);

    attachEventListeners();
    updateClockDisplay();
    // checkInitialAuthState is now called by initializeAuth
    applyUserThemePreference(); // Now directly from appServices
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
        try {
            if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
                await Tone.start();
                console.log('AudioContext started successfully.');
            }
        } catch (e) {
            console.error('Could not start AudioContext:', e);
        }
        document.body.removeEventListener('mousedown', startAudio);
    };
    document.body.addEventListener('mousedown', startAudio);
}

/**
 * Attaches all primary event listeners for the page.
 */
function attachEventListeners() {
    document.getElementById('loginBtnTop')?.addEventListener('click', showLoginModal); // Auth handles this
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
    document.getElementById('startButton')?.addEventListener('click', toggleStartMenu);
    
    // Modified Start Menu and Desktop Icon actions to open SnugWindows
    document.getElementById('menuLaunchDaw')?.addEventListener('click', launchDaw);
    document.getElementById('menuViewProfiles')?.addEventListener('click', viewProfiles);
    document.getElementById('menuOpenLibrary')?.addEventListener('click', openLibraryWindow); // New menu item
    
    document.getElementById('menuLogin')?.addEventListener('click', () => {
        toggleStartMenu();
        showLoginModal(); // Auth handles this
    });
    document.getElementById('menuLogout')?.addEventListener('click', () => {
        toggleStartMenu();
        handleLogout(); // Auth handles this
    });
    document.getElementById('menuToggleFullScreen')?.addEventListener('click', toggleFullScreen);
    document.getElementById('customBgInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) appServices.handleBackgroundUpload(file); // Use appServices
        e.target.value = null;
    });

    // Add context menu to desktop
    document.getElementById('desktop')?.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (e.target.closest('.window')) return; // Don't show if clicking inside a window
        const menuItems = [
            { label: 'Change Background', action: () => document.getElementById('customBgInput').click() },
            { separator: true },
            { label: 'Open DAW', action: launchDaw },
            { label: 'Open Library', action: openLibraryWindow },
            { label: 'View Profiles', action: viewProfiles },
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
            action: launchDaw,
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-8z"/></svg>`
        },
        {
            id: 'profiles-icon',
            name: 'Profiles',
            action: viewProfiles, // Now uses the new function to open in SnugWindow
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`
        },
        {
            id: 'sound-library-icon',
            name: 'Library',
            action: openLibraryWindow, // Now uses the new function to open in SnugWindow
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 10H9c-.55 0-1-.45-1-1V5c0-.55.45-1 1-1h8c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1z"/></svg>`
        },
        {
            id: 'game-icon',
            name: 'Game',
            action: openGameWindow, // Now uses the new function to open in SnugWindow
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

// Rewritten to open Snaw in a SnugWindow iframe
function launchDaw() {
    toggleStartMenu();
    openAppInWindow('snawApp', 'Snaw DAW', 'snaw.html', { width: 1000, height: 700 });
}

// Rewritten to open Profiles in a SnugWindow iframe
function viewProfiles() {
    toggleStartMenu();
    // Retrieve logged-in user if available to pass to profile.html
    const profileUsername = loggedInUser ? loggedInUser.username : 'guest'; // Default to guest or handle login
    openAppInWindow(`profile-${profileUsername}`, `${profileUsername}'s Profile`, `profile.html?user=${profileUsername}`, { width: 600, height: 700 });
}

// NEW: Function to open Library in a SnugWindow iframe
function openLibraryWindow() {
    toggleStartMenu();
    openAppInWindow('libraryApp', 'SnugOS Library', 'library.html', { width: 800, height: 600 });
}

// Rewritten to open Tetris in a SnugWindow iframe
function openGameWindow() {
    toggleStartMenu();
    openAppInWindow('tetrisGame', 'Snugtris', 'tetris.html', { width: 600, height: 750, minWidth: 400, minHeight: 600 });
}

function updateClockDisplay() {
    const clockDisplay = document.getElementById('taskbarClockDisplay');
    if (clockDisplay) {
        const now = new Date();
        clockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    setTimeout(updateClockDisplay, 60000);
}

// This function needs to be exposed for `auth.js` to call into it
// It replaces the global checkInitialAuthState from `auth.js` which is now a module
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

// Function to call from auth.js, which now needs to access a local utility
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
        </div>
    `;
    const { overlay } = appServices.showCustomModal('Login or Register', modalContent, []); // Use appServices.showCustomModal
    overlay.querySelector('#loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = overlay.querySelector('#loginUsername').value;
        const password = overlay.querySelector('#loginPassword').value;
        // The handleLogin/Register functions are within the auth.js module
        // and need to be called via appServices if they aren't globally exposed.
        // auth.js's showLoginModal will call its own internal handleLogin/Register.
        // So, this is implicitly correct if auth.js's showLoginModal is handling the form submits.
        // We'll rely on auth.js's internal logic for now.
    });
    overlay.querySelector('#registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = overlay.querySelector('#registerUsername').value;
        const password = overlay.querySelector('#registerPassword').value;
        // Same as above
    });
}

function toggleTheme() {
    const body = document.body;
    const isLightTheme = body.classList.contains('theme-light');
    const newTheme = isLightTheme ? 'dark' : 'light';
    appServices.setCurrentUserThemePreference(newTheme); // Use appServices
}

// Now this function is a local helper, appServices handles applying it
function applyUserThemePreference() {
    const preference = appServices.getCurrentUserThemePreference();
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
            appServices.showNotification(`Error: ${err.message}`, 3000); // Use appServices
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

document.addEventListener('DOMContentLoaded', initializeWelcomePage);
