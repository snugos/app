import { SnugWindow } from '../daw/SnugWindow.js';
import { showNotification, showCustomModal } from './welcomeUtils.js';
import { storeAsset, getAsset } from './welcomeDb.js';
import { initializeBackgroundManager, applyCustomBackground, handleBackgroundUpload, loadAndApplyUserBackground } from '../backgroundManager.js';


const appServices = {};
let loggedInUser = null; 
const SERVER_URL = 'https://snugos-server-api.onrender.com';

/**
 * Creates and opens a new window containing the Tetris game.
 */
function openGameWindow() {
    const windowId = 'tetrisGame';
    if (appServices.getWindowById(windowId)) {
        appServices.getWindowById(windowId).focus();
        return;
    }

    const content = document.createElement('iframe');
    content.src = 'tetris.html';
    content.style.width = '100%';
    content.style.height = '100%';
    content.style.border = 'none';

    const options = {
        width: 500,
        height: 680,
        minWidth: 400,
        minHeight: 600,
    };

    new SnugWindow(windowId, 'Snugtris', content, options, appServices);
}


function initializeWelcomePage() {
    appServices.showNotification = showNotification;
    appServices.showCustomModal = showCustomModal;
    appServices.storeAsset = storeAsset;
    appServices.getAsset = getAsset;
    appServices.getLoggedInUser = () => loggedInUser; 
    appServices.applyCustomBackground = applyCustomBackground;
    appServices.handleBackgroundUpload = handleBackgroundUpload;

    if (typeof addWindowToStoreState !== 'undefined') appServices.addWindowToStore = addWindowToStoreState;
    if (typeof removeWindowFromStoreState !== 'undefined') appServices.removeWindowFromStore = removeWindowFromStoreState;
    if (typeof incrementHighestZState !== 'undefined') appServices.incrementHighestZ = incrementHighestZState;
    if (typeof getWindowByIdState !== 'undefined') appServices.getWindowById = getWindowByIdState;
    if (typeof createContextMenu !== 'undefined') appServices.createContextMenu = createContextMenu;
    if (typeof getHighestZState !== 'undefined') appServices.getHighestZ = getHighestZState;
    if (typeof setHighestZState !== 'undefined') appServices.setHighestZ = setHighestZState;

    initializeBackgroundManager(appServices);

    attachEventListeners();
    // NEW: Attach desktop context menu listener here
    setupDesktopContextMenu(); 
    updateClockDisplay();
    checkInitialAuthState(); // This will call loadAndApplyUserBackground
    applyUserThemePreference(); // This will call applyUserThemePreference
    renderDesktopIcons();
    initAudioOnFirstGesture();
}

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

function attachEventListeners() {
    document.getElementById('loginBtnTop')?.addEventListener('click', showLoginModal);
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
    document.getElementById('startButton')?.addEventListener('click', toggleStartMenu);
    document.getElementById('menuLaunchDaw')?.addEventListener('click', launchDaw);
    document.getElementById('menuViewProfiles')?.addEventListener('click', viewProfiles);
    document.getElementById('menuLogin')?.addEventListener('click', () => {
        toggleStartMenu();
        showLoginModal();
    });
    document.getElementById('menuLogout')?.addEventListener('click', () => {
        toggleStartMenu();
        handleLogout();
    });
    document.getElementById('menuToggleFullScreen')?.addEventListener('click', toggleFullScreen);
    // REMOVED: This listener is now handled by the generic customBgInput listener below
    // document.getElementById('customBgInput')?.addEventListener('change', (e) => {
    //     const file = e.target.files[0];
    //     if (file) appServices.handleBackgroundUpload(file); 
    //     e.target.value = null; 
    // });
}

// NEW: Function to set up desktop context menu
function setupDesktopContextMenu() {
    const desktop = document.getElementById('desktop');
    const customBgInput = document.getElementById('customBgInput'); // Get the input element

    if (!desktop || !customBgInput) return;

    desktop.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        // Prevent showing context menu if clicking inside a SnugWindow
        if (e.target.closest('.window')) return; 

        const menuItems = [
            {
                label: 'Change Background',
                action: () => customBgInput.click() // Trigger the file input
            }
            // Add other desktop context menu items here if needed
        ];
        appServices.createContextMenu(e, menuItems, appServices);
    });

    // Central listener for the hidden file input
    customBgInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            appServices.handleBackgroundUpload(file); // Use the centralized handler
        }
        e.target.value = null; // Clear the input after file selection
    });
}


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
            action: () => {
                if (loggedInUser) {
                    window.location.href = `profile.html?user=${loggedInUser.username}`;
                } else {
                    appServices.showNotification('Please log in to view your profile.', 3000);
                }
            },
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`
        },
        {
            id: 'sound-library-icon',
            name: 'Library',
            action: () => {
                window.location.href = 'library.html';
            },
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.11 0-2 .9-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path></svg>`
        },
        {
            id: 'messenger-icon',
            name: 'Messenger',
            action: () => { window.location.href = 'messenger.html'; },
            svgContent: `<svg class="w-12 h-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`
        },
        {
            id: 'game-icon',
            name: 'Game',
            action: openGameWindow,
            svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12" viewBox="0 0 24 24" fill="currentColor"><path d="M21.57,9.36,18,7.05V4a1,1,0,0,0-1-1H7A1,1,0,0,0,6,4V7.05L2.43,9.36a1,1,0,0,0-.43,1V17a1,1,0,0,0,1,1H6v3a1,1,0,0,0,1,1h1V19H16v3h1a1,1,0,0,0,1-1V18h3a1,1,0,0,0,1-1V10.36A1,1,0,0,0,21.57,9.36ZM8,5H16V7H8ZM14,14H12V16H10V14H8V12h2V10h2v2h2Z"/></svg>`
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

function launchDaw() {
    window.location.href = 'snaw.html';
}

function viewProfiles() {
    window.location.href = 'profile.html?user=snaw';
}

function updateClockDisplay() {
    const clockDisplay = document.getElementById('taskbarClockDisplay');
    if (clockDisplay) {
        const now = new Date();
        clockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    setTimeout(updateClockDisplay, 60000);
}

async function checkInitialAuthState() {
    const token = localStorage.getItem('snugos_token');
    if (!token) {
        updateAuthUI(null);
        appServices.loadAndApplyUserBackground(); 
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            return handleLogout();
        }
        
        loggedInUser = { id: payload.id, username: payload.username };
        updateAuthUI(loggedInUser);
        appServices.loadAndApplyUserBackground(); 

    } catch (e) {
        console.error("Error during initial auth state check:", e);
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
    const { overlay } = appServices.showCustomModal('Login or Register', modalContent, []); 
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
            await checkInitialAuthState();
            appServices.showNotification(`Welcome back, ${data.user.username}!`, 2000);
        } else {
            appServices.showNotification(`Login failed: ${data.message}`, 3000);
        }
    } catch (error) {
        appServices.showNotification('Network error.', 3000);
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
        appServices.showNotification('Network error.', 3000);
        console.error("Register Error:", error);
    }
}

// REMOVED handleBackgroundUpload from here, it's now in backgroundManager.js and called via appServices.handleBackgroundUpload

function handleLogout() {
    localStorage.removeItem('snugos_token');
    loggedInUser = null;
    updateAuthUI(null);
    appServices.applyCustomBackground(''); // Clear background on logout
    appServices.showNotification('You have been logged out.', 2000);
}

// REMOVED applyCustomBackground from here, it's now in backgroundManager.js

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
