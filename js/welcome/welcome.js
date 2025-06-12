// js/welcome/welcome.js - Logic for the Welcome Page

import { showNotification, showCustomModal, base64ToBlob } from './welcomeUtils.js';
import { storeAsset, getAsset } from './welcomeDb.js';

// This object is used to pass functions to the SnugWindow class.
// It needs to be populated with globally available functions from your other scripts.
const appServices = {};

let loggedInUser = null;
const SERVER_URL = 'https://snugos-server-api.onrender.com';

/**
 * Creates and opens a new window containing the Tetris game.
 * The game itself is loaded from tetris.html into an iframe.
 */
function openGameWindow() {
    const windowId = 'tetrisGame';
    // Use the global getWindowByIdState function from state.js
    if (typeof getWindowByIdState !== 'undefined' && getWindowByIdState(windowId)) {
        getWindowByIdState(windowId).focus();
        return;
    }

    const content = document.createElement('iframe');
    content.src = 'tetris.html'; // The game file to load
    content.style.width = '100%';
    content.style.height = '100%';
    content.style.border = 'none';

    const options = {
        width: 600,
        height: 750,
        minWidth: 400,
        minHeight: 600,
    };

    // Ensure SnugWindow class from SnugWindow.js is available
    if (typeof SnugWindow !== 'undefined') {
        new SnugWindow(windowId, 'Snugtris', content, options, appServices);
    } else {
        console.error("SnugWindow class is not defined. Ensure SnugWindow.js is loaded before welcome.js.");
        showNotification("Error: Could not open game window component.", 3000);
    }
}


function initializeWelcomePage() {
    // Populate the appServices object. These functions are expected to be globally available
    // from the other script files you load in index.html (like utils.js, state.js).
    if (typeof addWindowToStoreState !== 'undefined') appServices.addWindowToStore = addWindowToStoreState;
    if (typeof removeWindowFromStoreState !== 'undefined') appServices.removeWindowFromStore = removeWindowFromStoreState;
    if (typeof incrementHighestZState !== 'undefined') appServices.incrementHighestZ = incrementHighestZState;
    if (typeof getWindowByIdState !== 'undefined') appServices.getWindowById = getWindowByIdState;
    if (typeof createContextMenu !== 'undefined') appServices.createContextMenu = createContextMenu;

    attachEventListeners();
    updateClockDisplay();
    checkInitialAuthState();
    applyUserThemePreference();
    renderDesktopIcons();
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
                    showNotification('Please log in to view your profile.', 3000);
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

function launchDaw() {
    window.location.href = 'snaw.html';
}

function viewProfiles() {
    window.open('profile.html?user=testuser', '_blank');
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
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            return handleLogout();
        }
        
        loggedInUser = { id: payload.id, username: payload.username };
        updateAuthUI(loggedInUser);

        const backgroundBlob = await getAsset(`background-for-user-${loggedInUser.id}`);
        if (backgroundBlob) {
            applyCustomBackground(backgroundBlob);
        }

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
                    <input type="text" id="loginUsername" placeholder="Username" required class="w-full">
                    <input type="password" id="loginPassword" placeholder="Password" required class="w-full">
                    <button type="submit" class="w-full">Login</button>
                </form>
            </div>
            <hr class="border-gray-500">
            <div>
                <h3 class="font-bold mb-2">Don't have an account? Register</h3>
                <form id="registerForm" class="space-y-3">
                    <input type="text" id="registerUsername" placeholder="Username" required class="w-full">
                    <input type="password" id="registerPassword" placeholder="Password (min. 6 characters)" required class="w-full">
                    <button type="submit" class="w-full">Register</button>
                </form>
            </div>
        </div>
    `;
    
    const { overlay, contentDiv } = showCustomModal('Login or Register', modalContent, []);

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
            await checkInitialAuthState();
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
        applyCustomBackground(file);
        return;
    }

    try {
        showNotification('Saving background...', 1500);
        await storeAsset(`background-for-user-${loggedInUser.id}`, file);
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
    if (existingVideo) existingVideo.remove();

    let url;
    let fileType;
    if (typeof source === 'string') {
        url = source;
        const extension = source.split('.').pop().toLowerCase().split('?')[0];
        fileType = ['mp4', 'webm', 'mov'].includes(extension) ? `video/${extension}` : 'image/jpeg';
    } else if (source instanceof Blob || source instanceof File) {
        url = URL.createObjectURL(source);
        fileType = source.type;
    } else {
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
    } else {
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

document.addEventListener('DOMContentLoaded', initializeWelcomePage);
