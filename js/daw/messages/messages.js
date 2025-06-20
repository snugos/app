// js/daw/messages/messages.js
// NOTE: This file is the main JavaScript for the standalone SnugOS Messages application (messages.html).
// It manages its own desktop UI and launches individual chat windows as SnugWindows.

// Corrected imports to be absolute paths
import { SnugWindow } from '/app/js/daw/SnugWindow.js';
import { showNotification, showCustomModal, createContextMenu } from '/app/js/daw/utils.js';
import * as Constants from '/app/js/daw/constants.js';
import { getWindowById, addWindowToStore, removeWindowFromStore, incrementHighestZ, getHighestZ, setHighestZ, getOpenWindows, serializeWindows, reconstructWindows } from '/app/js/daw/state/windowState.js';
import { getCurrentUserThemePreference, setCurrentUserThemePreference } from '/app/js/daw/state/appState.js';

const SERVER_URL = 'https://snugos-server-api.onrender.com';
let loggedInUser = null;
let appServices = {}; // This will be populated locally for this standalone app.
let messagePollingIntervals = new Map(); // Store intervals per conversation window

// --- Global UI and Utility Functions (Local to this standalone app) ---
// These functions provide desktop-like UI/modal functionality that this standalone app needs.

// MOVED TO TOP: Authentication and related helper functions
function checkLocalAuth() {
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
            loggedInUser = data.user;
            showNotification(`Welcome, ${data.user.username}!`, 2000);
            window.location.reload(); // Reload the page to fully initialize with logged-in user
        } else {
            showNotification(`Login failed: ${data.message}`, 3000);
        }
    } catch (error) {
        showNotification('Network error.', 3000);
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
        showNotification('Network error.', 3000);
        console.error("Register Error:", error);
    }
}

function handleLogout() {
    localStorage.removeItem('snugos_token');
    loggedInUser = null;
    showNotification('You have been logged out.', 2000);
    window.location.reload(); // Reload the page to reflect logout status
}

function showLoginModal() {
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
            <hr style="border-color: var(--border-secondary);">
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
    const { overlay } = showCustomModal('Login or Register', modalContent, []);
    overlay.querySelector('#loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = overlay.querySelector('#loginUsername').value;
        const password = overlay.querySelector('#loginPassword').value;
        await handleLogin(username, password);
        overlay.remove(); // Close modal after action
    });
    overlay.querySelector('#registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = overlay.querySelector('#registerUsername').value;
        const password = overlay.querySelector('#registerPassword').value;
        await handleRegister(username, password);
        overlay.remove(); // Close modal after action
    });
}

function initAudioOnFirstGesture() {
    const startAudio = async () => {
        try {
            if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
                await Tone.start();
                console.log('AudioContext started successfully.');
            }
        } catch (e) { console.error('Could not start AudioContext:', e); }
        document.body.removeEventListener('mousedown', startAudio);
    };
    document.body.addEventListener('mousedown', startAudio);
}

function updateClockDisplay() {
    const clockDisplay = document.getElementById('taskbarClockDisplay');
    if (clockDisplay) {
        clockDisplay.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    setTimeout(updateClockDisplay, 60000);
}

function toggleStartMenu() {
    document.getElementById('startMenu')?.classList.toggle('hidden');
}

function applyUserThemePreference() {
    const preference = localStorage.getItem('snugos-theme');
    const body = document.body;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeToApply = preference || (prefersDark ? 'dark' : 'light');
    if (themeToApply === 'light') {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
        localStorage.setItem('snugos-theme', 'light');
    } else {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
        localStorage.setItem('snugos-theme', 'dark');
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            showNotification(`Error: ${err.message}`, 3000);
        });
    } else {
        if(document.exitFullscreen) document.exitFullscreen();
    }
}

// --- Main App Initialization (on DOMContentLoaded) ---
document.addEventListener('DOMContentLoaded', () => {
    // Populate appServices for this standalone desktop's context
    appServices = {
        // SnugWindow management from windowState.js (imported above)
        addWindowToStore: addWindowToStore,
        removeWindowFromStore: removeWindowFromStore,
        incrementHighestZ: incrementHighestZ,
        getHighestZ: getHighestZ,
        setHighestZ: setHighestZ,
        getOpenWindows: getOpenWindows,
        getWindowById: getWindowById,
        serializeWindows: serializeWindows,
        reconstructWindows: reconstructWindows,

        // Utilities from utils.js (imported above)
        createContextMenu: createContextMenu,
        showNotification: showNotification,
        showCustomModal: showCustomModal,

        // appState.js functions (imported above)
        applyUserThemePreference: applyUserThemePreference, // Local function defined above
        setCurrentUserThemePreference: setCurrentUserThemePreference,
        getCurrentUserThemePreference: getCurrentUserThemePreference,

        // Core SnugWindow constructor for this messenger app to open its own child windows
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
    };

    loggedInUser = checkLocalAuth();
    
    attachDesktopEventListeners(); // Attach desktop-level event listeners for this standalone page
    applyUserThemePreference(); // Apply theme for this page
    updateClockDisplay(); // Start clock
    initAudioOnFirstGesture(); // Initialize audio if this page can play sounds (e.g. for message sounds)
    
    // Initial render based on login status
    if (loggedInUser) {
        renderMessengerDesktop(); // Render the main messenger desktop UI
    } else {
        // If not logged in, show a message and the login modal on the desktop area.
        const desktop = document.getElementById('desktop');
        if(desktop) {
            desktop.innerHTML = `<div class="w-full h-full flex items-center justify-center"><p class="text-xl" style="color:var(--text-primary);">Please log in to use Messages.</p></div>`;
        }
        showLoginModal();
    }
});


// --- Core Messenger UI Rendering & Logic ---

function renderMessengerDesktop() {
    // This is the main "desktop" for the Messenger app itself.
    // It will show the friend list and the conversation area.
    const desktop = document.getElementById('desktop');
    if (!desktop) return;

    desktop.innerHTML = `
        <div class="flex h-full text-sm" style="background-color: var(--bg-window-content);">
            <div id="friend-list" class="w-1/3 h-full border-r overflow-y-auto" style="border-color: var(--border-secondary);">
                <p class="p-2 text-center italic" style="color:var(--text-secondary);">Loading friends...</p>
            </div>
            <div id="conversation-area-placeholder" class="w-2/3 h-full flex flex-col bg-window">
                 <p class="p-2 text-center italic" style="color:var(--text-secondary);">Select a friend to start chatting</p>
            </div>
        </div>
    `;

    populateFriendList(desktop); // Populate the friend list on this desktop
}

// --- Window Management for Conversations ---

async function openConversationWindow(friend) {
    const windowId = `chatWin-${friend.username}`;
    if (appServices.getWindowById(windowId)) {
        appServices.getWindowById(windowId).focus();
        return;
    }

    const contentHTML = `
        <div class="h-full flex flex-col bg-window-content">
            <div id="message-list-${friend.username}" class="flex-grow p-4 overflow-y-auto flex flex-col space-y-4"></div>
            <div class="p-2 border-t border-secondary flex" style="border-color: var(--border-secondary);">
                <input type="text" id="message-input-${friend.username}" class="w-full p-2 bg-input text-primary border border-input rounded-l-md" placeholder="Type a message...">
                <button id="send-btn-${friend.username}" class="px-4 py-2 bg-button text-button border border-button rounded-r-md">Send</button>
            </div>
        </div>
    `;
    
    // Create the SnugWindow instance on THIS desktop
    const desktopEl = document.getElementById('desktop'); // Reference the current Messenger desktop
    const options = {
        width: 450, 
        height: 400, 
        x: (desktopEl.offsetWidth / 2) - 225 + (Math.random() * 50), // Offset slightly for multiple windows
        y: (desktopEl.offsetHeight / 2) - 200 + (Math.random() * 50),
    };
    const chatWindow = appServices.createWindow(windowId, `Chat: ${friend.username}`, contentHTML, options);

    // Attach listeners and load conversation for this specific window
    const messageInput = chatWindow.element.querySelector(`#message-input-${friend.username}`);
    const sendBtn = chatWindow.element.querySelector(`#send-btn-${friend.username}`);
    
    const sendMessageAction = async () => {
        const content = messageInput.value.trim();
        if(!content) return;
        await sendMessage(friend.username, content); // Use global sendMessage
        messageInput.value = '';
        await fetchAndRenderConversation(friend.username, chatWindow.element.querySelector(`#message-list-${friend.username}`)); // Refresh this window's conversation
    };

    if (sendBtn) sendBtn.onclick = sendMessageAction;
    if (messageInput) {
        messageInput.onkeydown = (e) => {
            if(e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessageAction();
            }
        };
    }

    // Set up polling for this specific conversation window
    // Clear any existing polling for this partner if window was re-opened
    if (messagePollingIntervals.has(friend.username)) {
        clearInterval(messagePollingIntervals.get(friend.username));
    }
    const intervalId = setInterval(async () => {
        await fetchAndRenderConversation(friend.username, chatWindow.element.querySelector(`#message-list-${friend.username}`));
    }, 5000);
    messagePollingIntervals.set(friend.username, intervalId);

    // When this window is closed, clear its polling interval
    const originalOnClose = chatWindow.onCloseCallback;
    chatWindow.onCloseCallback = () => {
        clearInterval(messagePollingIntervals.get(friend.username));
        messagePollingIntervals.delete(friend.username);
        if (typeof originalOnClose === 'function') originalOnClose();
    };

    // Initial fetch for this specific conversation window
    await fetchAndRenderConversation(friend.username, chatWindow.element.querySelector(`#message-list-${friend.username}`));
}


async function populateFriendList(container) {
    const friendListEl = container.querySelector('#friend-list');
    if (!friendListEl) return;
    
    friendListEl.innerHTML = `<p class="p-2 text-center italic" style="color:var(--text-secondary);">Loading friends...</p>`;
    
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/friends`, { // Assuming this endpoint exists on server.js
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);

        friendListEl.innerHTML = '';
        if (data.friends.length === 0) {
            friendListEl.innerHTML = `<p class="p-2 text-center italic" style="color:var(--text-secondary);">No friends yet. Add friends via the Profile page!</p>`;
            return;
        }

        data.friends.forEach(friend => {
            const friendDiv = document.createElement('div');
            friendDiv.className = 'p-2 flex items-center cursor-pointer hover:bg-button-hover friend-item';
            friendDiv.dataset.username = friend.username;
            friendDiv.innerHTML = `
                <img src="${friend.avatar_url || '/app/assets/default-avatar.png'}" class="w-8 h-8 rounded-full mr-2 flex-shrink-0" onerror="this.src='/app/assets/default-avatar.png';">
                <span class="truncate" style="color:var(--text-primary);">${friend.username}</span>
            `;
            friendDiv.addEventListener('click', () => {
                // Remove selection from all other friends
                container.querySelectorAll('.friend-item').forEach(el => {
                    el.style.backgroundColor = 'transparent';
                    el.style.color = 'var(--text-primary)';
                    el.querySelector('span').style.color = 'var(--text-primary)';
                });
                // Highlight selected friend
                friendDiv.style.backgroundColor = 'var(--accent-active)';
                friendDiv.style.color = 'var(--accent-active-text)';
                friendDiv.querySelector('span').style.color = 'var(--accent-active-text)';

                openConversationWindow(friend); // Open a new SnugWindow for conversation
            });
            friendListEl.appendChild(friendDiv);
        });
    } catch(error) {
        friendListEl.innerHTML = `<p class="p-2 text-center italic" style="color:red;">Failed to load friends: ${error.message}</p>`;
        showNotification(`Error loading friends: ${error.message}`, 4000);
    }
}

async function fetchAndRenderConversation(friendUsername, messageListContainer) {
    if (!loggedInUser) {
        messageListContainer.innerHTML = '<p class="p-8 text-center" style="color:red;">Please log in to view messages.</p>';
        return;
    }
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/messages/conversation/${friendUsername}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        
        messageListContainer.innerHTML = ''; // Clear previous messages
        if (data.conversation && data.conversation.length > 0) {
             data.conversation.forEach(msg => {
                const msgDiv = document.createElement('div');
                const isMine = msg.sender_id === loggedInUser.id;
                
                msgDiv.className = `max-w-[80%] p-3 rounded-lg shadow-md ${isMine ? 'bg-blue-600 text-white self-end ml-auto' : 'bg-gray-700 text-white self-start mr-auto'}`;
                msgDiv.style.backgroundColor = isMine ? 'var(--accent-active)' : 'var(--bg-window)';
                msgDiv.style.color = isMine ? 'var(--accent-active-text)' : 'var(--text-primary)';

                const usernameLink = `<a href="/app/js/daw/profiles/profile.html?user=${isMine ? msg.recipient_username : msg.sender_username}" target="_blank" class="font-bold cursor-pointer hover:underline" style="color:inherit;">${isMine ? msg.recipient_username : msg.sender_username}</a>`;

                msgDiv.innerHTML = `
                    <div class="text-xs mb-1" style="color: ${isMine ? 'inherit' : 'var(--text-secondary)'};">
                        ${isMine ? `To: ${usernameLink}` : `From: ${usernameLink}`}
                    </div>
                    <p class="text-base break-words">${msg.content}</p>
                    <div class="text-xs opacity-75 mt-1" style="text-align: ${isMine ? 'right' : 'left'};">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                `;
                messageListContainer.appendChild(msgDiv);
             });
             messageListContainer.scrollTop = messageListContainer.scrollHeight;
        } else {
             messageListContainer.innerHTML = `<p class="p-2 text-center italic" style="color:var(--text-secondary);">Start a conversation!</p>`;
        }
    } catch (error) {
        messageListContainer.innerHTML = `<p class="p-2 text-center italic" style="color:red;">Failed to load conversation: ${error.message}</p>`;
        showNotification(`Error loading conversation: ${error.message}`, 4000);
        console.error("Error loading conversation:", error);
    }
}

async function sendMessage(recipientUsername, content) {
    if (!loggedInUser) {
        showNotification('You must be logged in to send messages.', 3000);
        return;
    }
    if (!recipientUsername || !content) {
        showNotification('Recipient and content are required.', 3000);
        return;
    }
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({ recipientUsername, content })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showNotification("Message sent!", 2000);
    } catch (error) {
        showNotification(`Error sending message: ${error.message}`, 4000);
        console.error("Send Message Error:", error);
    }
}