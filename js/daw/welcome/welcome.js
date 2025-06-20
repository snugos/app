// js/daw/welcome/welcome.js
// NOTE: This file is designed to run within the main index.html context.
// It sets up the desktop icons and application launching.

import { SERVER_URL } from '/app/js/daw/constants.js';
import { SnugWindow } from '/app/js/daw/SnugWindow.js';
import { showNotification, showCustomModal } from '/app/js/daw/utils.js'; // Use main utils.js
import { storeAsset, getAsset } from '/app/js/daw/db.js'; // Use main db.js
import { initializeAuth, handleBackgroundUpload, handleLogout } from '/app/js/daw/auth.js';

// Import necessary state accessors
import { getWindowById, addWindowToStore, removeWindowFromStore, incrementHighestZ, getHighestZ, setHighestZ, getOpenWindows, serializeWindows, reconstructWindows } from '/app/js/daw/state/windowState.js';
import { getCurrentUserThemePreference, setCurrentUserThemePreference } from '/app/js/daw/state/appState.js';

// Explicitly import createContextMenu and showConfirmationDialog from utils.js
import { createContextMenu, showConfirmationDialog } from '/app/js/daw/utils.js';

let appServices = {}; // Define appServices at the top level
let loggedInUser = null;

// Centralized applyCustomBackground function
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
            fileType = 'image/jpeg';
        }
    } else { // It's a File object
        url = URL.createObjectURL(source);
        fileType = source.type;
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

/**
 * Creates and opens a new window containing an HTML page loaded into an iframe.
 * Used for apps that *should* be embedded (Profiles, Library, Tetris, Discord).
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
    // This object will be progressively populated with module exports.
    appServices = {
        // These are initial placeholders. `createWindow` will be redefined later
        // after `appServices` is fully populated with window state functions.
        createWindow: null, 
        
        // Utilities (from js/daw/utils.js)
        showNotification: showNotification, 
        showCustomModal: showCustomModal,
        createContextMenu: createContextMenu, 
        // drawWaveform: drawWaveform, // Only needed in DAW, not Welcome
        // base64ToBlob: base64ToBlob, // Only needed in DAW, not Welcome
        // setupGenericDropZoneListeners: setupGenericDropZoneListeners, // Only needed in DAW, not Welcome
        // createDropZoneHTML: createDropZoneHTML, // Only needed in DAW, not Welcome
        showConfirmationDialog: showConfirmationDialog, 
        // getThemeColors: getThemeColors, // Used in applyUserThemePreference which is outside appServices, or can be passed.

        // Auth related functions (from js/daw/auth.js)
        initializeAuth: null, // Will be replaced by actual initializeAuth from module
        handleBackgroundUpload: handleBackgroundUpload, // Local function, relies on appServices.storeAsset/getAsset/showNotification
        handleLogout: handleLogout, // Local function, relies on appServices.showNotification/updateAuthUI
        updateUserAuthContainer: null, // Will be replaced by auth module's updateAuthUI

        // DB functions (from js/daw/db.js)
        dbStoreAudio: storeAsset, // Remap from welcomeDb.js (storeAsset)
        dbGetAudio: getAsset,     // Remap from welcomeDb.js (getAsset)
        // dbDeleteAudio: deleteAudio, // Only needed in DAW

        // Tone.js related contexts and registries (only necessary parts for welcome page)
        context: typeof Tone !== 'undefined' ? Tone.context : null, 
        Tone: typeof Tone !== 'undefined' ? Tone : null, 
        // ToneTime: Tone.Time, // Not directly used in welcome
        // ToneMidi: Tone.Midi, // Not directly used in welcome
        // ToneTransport: Tone.Transport, // Not directly used in welcome

        // State Module Accessors (functions will be assigned from imported modules)
        // windowState.js functions (getWindowById, addWindowToStore, etc.)
        getWindowById: null, addWindowToStore: null, removeWindowFromStore: null, 
        incrementHighestZ: null, getHighestZ: null, setHighestZ: null, getOpenWindows: null, 
        serializeWindows: null, reconstructWindows: null,
        // appState.js functions (getCurrentUserThemePreference, setCurrentUserThemePreference, etc.)
        getCurrentUserThemePreference: null, setCurrentUserThemePreference: null,
        // (Other state modules not directly used by welcome.js are not included here)
        
        // This makes the definitive Track class available throughout appServices
        // (if it were needed in welcome.js, currently not)
        Track: null, 

        // Event Handlers (functions will be assigned from imported module exports)
        initializeEventHandlersModule: null, 
        initializePrimaryEventListeners: null, 
        attachGlobalControlEvents: null, 
        setupMIDI: null, 
        // Specific event handlers used by welcome page:
        // handleBackgroundUpload (local), handleLogout (local), showLoginModal (local), toggleTheme (local)
        // No direct use of handleTrackMute, handleTrackSolo, etc. in welcome.js
    };

    // 2. Dynamically import necessary modules.
    // We use Promise.all to ensure all modules are loaded before proceeding.
    const [
        windowStateModule, appStateModule, authModuleExports
    ] = await Promise.all([
        import('/app/js/daw/state/windowState.js'), // Corrected absolute path
        import('/app/js/daw/state/appState.js'),     // Corrected absolute path
        import('/app/js/daw/auth.js')               // Corrected absolute path
    ]);

    // 3. Populate appServices with exports from modules.
    Object.assign(appServices, windowStateModule);
    Object.assign(appServices, appStateModule);
    
    // 4. Define `appServices.createWindow` *after* appServices has its core window functions.
    appServices.createWindow = (id, title, content, options) => new SnugWindow(id, title, content, options, appServices);

    // 5. Initialize AuthModule (it sets up its own event listeners and updates auth UI).
    // Note: Welcome page is not importing eventHandlers.js or main.js, so only Auth specific exports needed.
    const authExports = authModuleExports.initializeAuth(appServices); 
    Object.assign(appServices, authExports); 

    // 6. Attach top-level event listeners for the welcome page.
    attachEventListeners();
    updateClockDisplay();
    
    // Use the function from appState.js to apply user theme preference
    appServices.setCurrentUserThemePreference(appServices.getCurrentUserThemePreference() || 'system');
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => appServices.setCurrentUserThemePreference('system'));
    
    renderDesktopIcons();
    initAudioOnFirstGesture();
    
    // Attempt to restore window state from previous session
    const lastSessionState = localStorage.getItem('snugos_welcome_session_windows'); 
    if (lastSessionState) { 
        try {
            const parsedState = JSON.parse(lastSessionState); 
            if (parsedState && parsedState.length > 0) { 
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
    document.getElementById('menuOpenLibrary')?.addEventListener('click', openSnugOSDrive); // Open new Drive
    document.getElementById('menuViewProfiles')?.addEventListener('click', viewProfiles); // Keep for now, but will likely remove.
    
    document.getElementById('menuLogin')?.addEventListener('click', () => {
        toggleStartMenu();
        showLoginModal(); 
    });
    document.getElementById('menuLogout')?.addEventListener('click', () => {
        toggleStartMenu();
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
            { label: 'Open SnugOS Drive', action: openSnugOSDrive }, // New menu item
            { label: 'View Profiles', action: viewProfiles }, // Keep for now
            { label: 'Play Snugtris', action: openGameWindow },
            { label: 'Discord Server', action: openDiscordWindow } // New Discord icon action
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
            id: 'snugos-drive-icon',
            name: 'SnugOS Drive',
            action: openSnugOSDrive, 
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>` // Folder icon
        },
        {
            id: 'discord-icon', // NEW: Discord icon
            name: 'Discord',
            action: openDiscordWindow,
            // Simple Discord SVG from FontAwesome (simplified)
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="currentColor" class="w-12 h-12"><path d="M524.531 69.832a1.87 1.87 0 0 0-.01-.01c-26.541-26.82-62.158-39.736-102.822-40.407-1.121-.023-2.253-.023-3.375-.011C354.269 28.147 301.867 36.57 252.093 50.84C180.252 71.077 124.976 112.593 84.7 172.585a1.873 1.873 0 0 0-.01.011C40.669 220.187 16 270.812 16 323.013c0 88.083 49.37 129.418 99.851 129.418 25.166 0 45.418-12.06 63.784-33.829 9.897-11.536 18.232-26.331 22.42-40.485 3.309-11.082 5.922-21.737 5.922-21.737 0 .041-36.438 16.924-81.862 10.36-11.758-1.705-19.26-6.495-19.26-6.495 0-.013 1.05-.724 3.016-1.63 7.15-3.238 12.396-6.848 14.156-8.291 16.295-13.626 27.675-29.62 34.789-48.423 9.489-25.04 14.77-50.605 14.77-75.986 0-106.82-58.41-190.155-155.67-190.155-28.053 0-51.464 8.789-70.198 25.059-3.791 3.344-3.791 8.847 0 12.191C123.637 151.787 150.117 167 180.598 167c17.51 0 31.866-5.467 43.197-16.143 6.945-6.536 12.106-14.47 14.975-23.468 4.795-15.006 7.42-30.825 7.42-46.758 0-68.539-38.35-125.132-90.87-125.132-24.717 0-45.023 8.357-61.944 24.363zm-109.846 179.814c0-3.344 2.685-6.029 6.03-6.029h12.06c3.344 0 6.03 2.685 6.03 6.029v24.119c0 3.344-2.686 6.029-6.03 6.029H410.74c-3.344 0-6.03-2.685-6.03-6.029v-24.119c0-3.344 2.686-6.029 6.03-6.029h12.06c3.344 0 6.03 2.685 6.03 6.029v24.119c0 3.344-2.686 6.029-6.03 6.029H410.74c-3.344 0-6.03-2.685-6.03-6.029v-24.119z"/></svg>`
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

// NEW: Function to open SnugOS Drive
function openSnugOSDrive() {
    toggleStartMenu();
    // Path to the new drive.html
    openEmbeddedAppInWindow('snugosDriveApp', 'SnugOS Drive', '/app/js/daw/drive/drive.html', { width: 900, height: 700 });
}

// NEW: Function to open Discord Widget
function openDiscordWindow() {
    toggleStartMenu();
    const discordServerId = '1381090107079266424'; // From user's input
    const discordWidgetSrc = `https://discord.com/widget?id=${discordServerId}&theme=dark`;
    openEmbeddedAppInWindow('discordWidget', 'Discord Server', discordWidgetSrc, { width: 370, height: 550, resizable: false });
}

// MODIFIED: View Profiles (now just opens default "snaw" profile)
function viewProfiles() {
    toggleStartMenu();
    const profileUsername = loggedInUser ? loggedInUser.username : 'snaw';
    // Correct absolute path for profile.html
    openEmbeddedAppInWindow(`profile-${profileUsername}`, `${profileUsername}'s Profile`, `/app/js/daw/profiles/profile.html?user=${profileUsername}`, { width: 600, height: 700 });
}

// MODIFIED: Open Tetris is still embedded in a SnugWindow iframe
function openGameWindow() {
    toggleStartMenu();
    // Correct absolute path for tetris.html
    openEmbeddedAppInWindow('tetrisGame', 'Snugtris', '/app/tetris.html', { width: 600, height: 750, minWidth: 400, minHeight: 600 });
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

// The `handleBackgroundUpload` is already defined locally in welcome.js.
// It uses `appServices.handleBackgroundUpload` which comes from `auth.js`.
// This structure is fine as `auth.js` provides the core logic and `welcome.js` defines the UI interaction.

// The `handleLogout` is defined locally in welcome.js.
// It uses `appServices.handleLogout` which comes from `auth.js`.
// This is also fine, as `auth.js` provides the core logout mechanism.

// Ensure initializeWelcomePage runs when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', initializeWelcomePage);