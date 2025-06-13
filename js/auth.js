// CORRECTED PATH
import { applyCustomBackground, handleBackgroundUpload, loadAndApplyUserBackground } from './backgroundManager.js';


let localAppServices = {};
let loggedInUser = null; 

const SERVER_URL = 'https://snugos-server-api.onrender.com';

export function initializeAuth(appServicesFromMain) { 
    localAppServices = appServicesFromMain;
    localAppServices.getLoggedInUser = () => loggedInUser;
    localAppServices.setLoggedInUser = (user) => { loggedInUser = user; }; // Ensure setter is exposed

    document.getElementById('loginBtnTop')?.addEventListener('click', showLoginModal);
    document.getElementById('menuLogin')?.addEventListener('click', showLoginModal);
    document.getElementById('menuLogout')?.addEventListener('click', handleLogout);
    
    checkInitialAuthState();
}

export async function checkInitialAuthState() {
    const token = localStorage.getItem('snugos_token');
    if (!token) {
        loggedInUser = null;
        updateAuthUI(null);
        localAppServices.loadAndApplyUserBackground?.(); 
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            return handleLogout(); 
        }
        
        loggedInUser = { id: payload.id, username: payload.username };
        updateAuthUI(loggedInUser);
        localAppServices.loadAndApplyUserBackground?.(); 

    } catch (e) {
        console.error("Error during initial auth state check:", e);
        handleLogout(); 
    }
}

function updateAuthUI(user = null) {
    loggedInUser = user;
    localAppServices.setLoggedInUser?.(user); // Call the setter to update appServices reference

    const userAuthContainer = document.getElementById('userAuthContainer');
    const menuLogin = document.getElementById('menuLogin');
    const menuLogout = document.getElementById('menuLogout');

    if (user && userAuthContainer) {
        userAuthContainer.innerHTML = `<span class="mr-2">Welcome, ${user.username}!</span> <button id="logoutBtnTop" class="px-3 py-1 border rounded">Logout</button>`;
        userAuthContainer.querySelector('#logoutBtnTop')?.addEventListener('click', handleLogout);
        if (menuLogin) menuLogin.style.display = 'none';
        if (menuLogout) menuLogout.style.display = 'block';
    } else {
        userAuthContainer.innerHTML = `<button id="loginBtnTop" class="px-3 py-1 border rounded">Login</button>`;
        userAuthContainer.querySelector('#loginBtnTop')?.addEventListener('click', showLoginModal);
        if (menuLogin) menuLogin.style.display = 'block';
        if (menuLogout) menuLogout.style.display = 'none';
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
    
    const { overlay, contentDiv } = localAppServices.showCustomModal('Login or Register', modalContent, []);

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
            loggedInUser = { id: data.user.id, username: data.user.username };
            updateAuthUI(loggedInUser); // This will update loggedInUser and call setLoggedInUser
            localAppServices.loadAndApplyUserBackground?.(); 
            localAppServices.showNotification?.(`Welcome back, ${data.user.username}!`, 2000);
        } else {
            localAppServices.showNotification?.(`Login failed: ${data.message}`, 3000);
        }
    } catch (error) {
        localAppServices.showNotification?.('Network error. Could not connect to server.', 3000);
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
            localAppServices.showNotification?.('Registration successful! Please log in.', 2500);
        } else {
            localAppServices.showNotification?.(`Registration failed: ${data.message}`, 3000);
        }
    } catch (error) {
        localAppServices.showNotification?.('Network error. Could not connect to server.', 3000);
        console.error("Register Error:", error);
    }
}

export function handleBackgroundUpload(file) {
    // This function is now just a pass-through to the centralized manager
    localAppServices.handleBackgroundUpload(file);
}

export function handleLogout() { 
    localStorage.removeItem('snugos_token');
    loggedInUser = null;
    updateAuthUI(null); 
    localAppServices.applyCustomBackground?.(''); 
    localAppServices.showNotification?.('You have been logged out.', 2000);

    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    } else {
        window.location.reload(); 
    }
}

export function checkLocalAuth() {
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
