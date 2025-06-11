// js/welcome.js - Logic for the Welcome Page

import { showLoginModal, handleBackgroundUpload, checkInitialAuthState } from './auth.js'; // Import checkInitialAuthState too
import { showNotification } from './utils.js';
import { applyCustomBackground } from './main.js'; // NEW: Import applyCustomBackground from main.js

// No Tone.js or complex DAW services needed here, as it's a simple welcome screen.
// We only need a subset of functionalities.

const appServices = {}; // Minimal appServices for this page

function initializeWelcomePage() {
    // Basic appServices setup needed for utility functions
    appServices.showNotification = showNotification; // For showing notifications
    appServices.applyCustomBackground = applyCustomBackground; // To apply saved backgrounds
    appServices.handleBackgroundUpload = handleBackgroundUpload; // For background upload on welcome page

    attachEventListeners();
    updateClockDisplay();
    checkInitialAuthState(appServices); // Pass appServices to checkInitialAuthState
    applyUserThemePreference(); // This applies the theme, but not background

    // The logic to apply custom background from IndexedDB needs to be in auth.js,
    // which already tries to do it. Just ensure checkInitialAuthState is called.
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
    // document.getElementById('menuLogout')?.addEventListener('click', handleLogout); // If implementing logout on welcome
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

    // Optional: Custom background upload (if you want this on the welcome page)
    // You'd need an input type="file" with id="customBgInput" similar to index.html
    // document.getElementById('customBgInput')?.addEventListener('change', (e) => {
    //     const file = e.target.files[0];
    //     if (file) {
    //         appServices.handleBackgroundUpload(file);
    //     }
    // });
}

function toggleStartMenu() {
    document.getElementById('startMenu')?.classList.toggle('hidden');
}

function launchDaw() {
    // Navigate to the main DAW application
    window.location.href = 'index.html';
}

function viewProfiles() {
    // Navigate to a generic profiles page or a specific test profile
    // Assuming profile.html exists and can take a user parameter
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
