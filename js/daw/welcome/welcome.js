// js/daw/welcome/welcome.js
// NOTE: This file is designed to run within the main index.html context.
// It sets up the desktop icons and application launching.

import { SERVER_URL } from '../constants.js';
import { SnugWindow } from '../SnugWindow.js';
import { showNotification, showCustomModal } from '../utils.js';
import { storeAsset, getAsset } from '../db.js';
import { initializeAuth, handleBackgroundUpload, handleLogout } from '../auth.js';

// Import necessary state accessors
import { getWindowById, addWindowToStore, removeWindowFromStore, incrementHighestZ, getHighestZ, setHighestZ, getOpenWindows, serializeWindows, reconstructWindows } from '../state/windowState.js';
import { getCurrentUserThemePreference, setCurrentUserThemePreference } from '../state/appState.js';

// Explicitly import createContextMenu and showConfirmationDialog from utils.js
import { createContextMenu, showConfirmationDialog } from '../utils.js';

let appServices = {}; // Define appServices at the top level
let loggedInUser = null;

/**
 * Creates and opens a new window containing an HTML page loaded into an iframe.
 * Used for apps that *should* be embedded (Profiles, Library, Tetris).
 * @param {string} windowId Unique ID for the SnugWindow.
 * @param {string} windowTitle Title of the SnugWindow.
 * @param {string} iframeSrc URL of the HTML page to load in the iframe.
 * @param {object} options SnugWindow options.
 * @returns {SnugWindow} The newly created SnugWindow instance.
 */
function openEmbeddedAppInWindow(windowId, windowTitle, iframeSrc, options = {}) {
    // Check if the window is already open and focus it
    if (appServices.getWindowById(windowId)) {
        appServices.getWindowById(windowId).focus();
        return appServices.getWindowById(windowId);
    }

    const content = document.createElement('iframe');
    content.src = iframeSrc;
    content.style.width = '100%';
    content.style.height = '100%';
    content.style.border = 'none';
    content.style.backgroundColor = 'var(--bg-window-content)'; // Inherit theme background

    // Use appServices.createWindow to create the SnugWindow
    const windowInstance = appServices.createWindow(windowId, windowTitle, content, options);

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
async function initializeWelcomePage() { // Marked as async to allow await
    // 1. Initialize appServices placeholders.
    // Functions that are directly used here, but populated by modules later, start as null.
    appServices = {
        // Core SnugWindow/Window State functions (will be assigned after windowStateModule loads)
        getWindowById: null, addWindowToStore: null, removeWindowFromStore: null, 
        incrementHighestZ: null, getHighestZ: null, setHighestZ: null, getOpenWindows: null, 
        serializeWindows: null, reconstructWindows: null,
        
        // Theme functions
        getCurrentUserThemePreference: null, setCurrentUserThemePreference: null,

        // Background handling
        applyCustomBackground: applyCustomBackground, // Local function in welcome.js
        handleBackgroundUpload: handleBackgroundUpload, // Imported from auth.js

        // Utility access
        showNotification: showNotification, // Direct import, can be used immediately
        showCustomModal: showCustomModal,   // Direct import, can be used immediately
        createContextMenu: createContextMenu,
        showConfirmationDialog: showConfirmationDialog,

        // Auth related (will be assigned after authModule loads)
        initializeAuth: null, // This is the initialize function from auth.js
        handleLogout: handleLogout, // Local handleLogout
        // We need a way for welcome.js to trigger the auth.js updateAuthUI.
        // Let's ensure initializeAuth returns updateAuthUI or similar.
    };

    // 2. Dynamically import necessary modules.
    // We use Promise.all to ensure all modules are loaded before proceeding.
    const [
        windowStateModule, appStateModule, authModuleExports
    ] = await Promise.all([
        import('../state/windowState.js'),
        import('../state/appState.js'),
        import('../auth.js') // Auth module
    ]);

    // 3. Populate appServices with exports from modules.
    // This is crucial: assign module exports to appServices
    Object.assign(appServices, windowStateModule);
    Object.assign(appServices, appStateModule);

    // 4. Define `appServices.createWindow` *after* appServices has its core window functions.
    // This resolves the TypeError in SnugWindow.focus.
    appServices.createWindow = (id, title, content, options) => new SnugWindow(id, title, content, options, appServices);


    // 5. Initialize modules that have an `initializeXModule` function.
    // These initializers set up internal state and might return specific functions to be exposed.
    appServices.initializeWindowState(appServices);
    appServices.initializeAppState(appServices);

    // Initialize AuthModule. This module's initialize function sets up its own event listeners
    // and might return functions like `updateAuthUI` to be exposed on appServices.
    const authExports = authModuleExports.initializeAuth(appServices);
    Object.assign(appServices, authExports); // Assign functions returned by the initializer


    // 6. Attach top-level event listeners for the welcome page.
    attachEventListeners();
    updateClockDisplay();
    // Use the function from appState.js to apply user theme preference
    appServices.setCurrentUserThemePreference(appServices.getCurrentUserThemePreference() || 'system'); // Re-evaluate initial theme
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => appServices.setCurrentUserThemePreference('system'));
    
    renderDesktopIcons();
    initAudioOnFirstGesture();
    
    // Attempt to restore window state from previous session
    const lastSessionState = localStorage.getItem('snugos_welcome_session_windows');
    if (lastSessionState) {
        try {
            const parsedState = JSON.parse(lastSessionState);
            if (parsedState && parsedState.length > 0) {
                // Reconstruct windows based on saved state
                appServices.reconstructWindows(parsedState);
            }
        } catch (e) {
            console.error("Error restoring welcome page window state:", e);
        }
    }

    // Add a beforeunload listener to save welcome page window state
    window.addEventListener('beforeunload', () => {
        const currentOpenWindows = appServices.serializeWindows();
        localStorage.setItem('snugos_welcome_session_windows', JSON.stringify(currentOpenWindows));
    });

    console.log("Welcome Page Initialized Successfully.");
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
    // Top taskbar buttons
    document.getElementById('loginBtnTop')?.addEventListener('click', showLoginModal); 
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
    document.getElementById('startButton')?.addEventListener('click', toggleStartMenu);
    
    // Start Menu and Desktop Icon actions
    document.getElementById('menuLaunchDaw')?.addEventListener('click', launchDaw); 
    document.getElementById('menuViewProfiles')?.addEventListener('click', viewProfiles); 
    document.getElementById('menuOpenLibrary')?.addEventListener('click', openLibraryWindow); 
    
    document.getElementById('menuLogin')?.addEventListener('click', () => {
        toggleStartMenu();
        showLoginModal(); 
    });
    document.getElementById('menuLogout')?.addEventListener('click', () => {
        toggleStartMenu();
        // Calls the handleLogout from auth.js which is now exposed via appServices
        appServices.handleLogout(); 
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
            action: viewProfiles, 
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`
        },
        {
            id: 'sound-library-icon',
            name: 'Library',
            action: openLibraryWindow, 
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 10H9c-.55 0-1-.45-1-1V5c0-.55.45-1 1-1h8c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1z"/></svg>`
        },
        {
            id: 'game-icon',
            name: 'Game',
            action: openGameWindow, 
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
    // Correct absolute path for snaw.html
    window.location.href = '/app/snaw.html';
}

// MODIFIED: View Profiles opens in a SnugWindow iframe
function viewProfiles() {
    toggleStartMenu();
    const profileUsername = loggedInUser ? loggedInUser.username : 'snaw';
    // Correct absolute path for profile.html
    openEmbeddedAppInWindow(`profile-${profileUsername}`, `${profileUsername}'s Profile`, `/app/js/daw/profiles/profile.html?user=${profileUsername}`, { width: 600, height: 700 });
}

// MODIFIED: Open Library opens in a SnugWindow iframe
function openLibraryWindow() {
    toggleStartMenu();
    // Correct absolute path for library.html
    openEmbeddedAppInWindow('libraryApp', 'SnugOS Library', `/app/js/daw/profiles/library.html`, { width: 800, height: 600 });
}

// MODIFIED: Open Tetris is still embedded in a SnugWindow iframe
function openGameWindow() {
    toggleStartMenu();
    // Correct absolute path for tetris.html
    openEmbeddedAppInWindow('tetrisGame', 'Snugtris', `/app/tetris.html`, { width: 600, height: 750, minWidth: 400, minHeight: 600 });
}

function updateClockDisplay() {
    const clockDisplay = document.getElementById('taskbarClockDisplay');
    if (clockDisplay) {
        const now = new Date();
        clockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    setTimeout(updateClockDisplay, 60000);
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

// The following functions are called by desktop events but are defined in auth.js.
// We call auth.js's showLoginModal via appServices
function showLoginModal() {
    document.getElementById('startMenu')?.classList.add('hidden');
    appServices.showLoginModal(); // Call the auth module's showLoginModal
}

function toggleTheme() {
    // This calls the setCurrentUserThemePreference from appState.js which is exposed via appServices
    const isLightTheme = document.body.classList.contains('theme-light');
    const newTheme = isLightTheme ? 'dark' : 'light';
    appServices.setCurrentUserThemePreference(newTheme);
}

// The following functions handle background upload/logout specific to welcome.js (index.html) context.
// These are separate from similar functions in main.js (DAW context) for clarity.

// The `handleBackgroundUpload` is already defined locally in welcome.js.
// It uses `appServices.handleBackgroundUpload` which comes from `auth.js`.
// This structure is fine as `auth.js` provides the core logic and `welcome.js` defines the UI interaction.

// The `handleLogout` is defined locally in welcome.js.
// It uses `appServices.handleLogout` which comes from `auth.js`.
// This is also fine, as `auth.js` provides the core logout mechanism.

// Ensure initializeWelcomePage runs when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', initializeWelcomePage);