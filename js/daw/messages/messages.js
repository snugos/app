// js/daw/messages/messages.js
// NOTE: This file is the main JavaScript for the standalone SnugOS Messages application (messages.html).
// It manages its own authentication and UI, as it is a top-level page.

// Base URL for your backend server
const SERVER_URL = 'https://snugos-server-api.onrender.com'; // Direct use for standalone app

// Global state variables for this standalone app
let token = localStorage.getItem('snugos_token'); // Get token from localStorage directly
let currentUser = null; // Stores { id, username }
let authMode = 'login'; // 'login' or 'register'

// DOM Elements (assuming they exist in messages.html)
const loadingOverlay = document.getElementById('loading-overlay');
const messageDialog = document.getElementById('message-dialog');
const messageText = document.getElementById('message-text');
const messageConfirmBtn = document.getElementById('message-confirm-btn');
const messageCancelBtn = document.getElementById('message-cancel-btn');

const appContent = document.getElementById('app-content');
const loggedInUserSpan = document.getElementById('logged-in-user');
const logoutBtn = document.getElementById('logout-btn');

const messagesListDiv = document.getElementById('messages-list');
const recipientUsernameInput = document.getElementById('recipient-username-input');
const messageContentInput = document.getElementById('message-content-input');
const sendMessageBtn = document.getElementById('send-message-btn');

// --- Utility Functions for Modals (Local to this standalone app) ---

function showLoading() {
    loadingOverlay?.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay?.classList.add('hidden');
}

function showMessage(msg, onConfirm = null, showCancel = false, onCancel = null) {
    if (!messageDialog) return;
    messageText.textContent = msg;
    messageCancelBtn?.classList.toggle('hidden', !showCancel);
    messageDialog.classList.remove('hidden');

    messageConfirmBtn.onclick = null;
    messageCancelBtn.onclick = null;

    messageConfirmBtn.onclick = () => {
        messageDialog.classList.add('hidden');
        if (onConfirm) onConfirm();
    };

    if (showCancel) {
        messageCancelBtn.onclick = () => {
            messageDialog.classList.add('hidden');
            if (onCancel) onCancel();
        };
    }
}

// --- Authentication Functions (Local to this standalone app) ---

async function fetchUserProfileAndMessages() {
    if (!token) {
        renderLoginPrompt();
        return;
    }
    showLoading();
    try {
        const response = await fetch(`${SERVER_URL}/api/profile/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            currentUser = data.profile;
            renderMessagesApp(); // Render the messages content after fetching current user's data
        } else {
            console.error("Failed to fetch user profile:", response.statusText);
            token = null;
            localStorage.removeItem('snugos_token');
            renderLoginPrompt(); // Go back to login if profile fetch fails
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        token = null;
        localStorage.removeItem('snugos_token');
        renderLoginPrompt(); // Go back to login
    } finally {
        hideLoading();
    }
}

function handleLogout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('snugos_token');
    renderLoginPrompt(); // Re-render the app to show login prompt
    showMessage('You have been logged out.');
}

// --- Messages Specific Functions ---

async function fetchMessages() {
    if (!currentUser) {
        messagesListDiv.innerHTML = '<p class="p-8 text-center" style="color: var(--text-secondary);">Please log in to view messages.</p>';
        return;
    }
    showLoading();
    try {
        const response = await fetch(`${SERVER_URL}/api/messages/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            renderMessages(data.messages);
        } else {
            showMessage(data.message || 'Failed to fetch messages.', 4000);
            messagesListDiv.innerHTML = '<p class="p-8 text-center" style="color:red;">Error loading messages.</p>';
        }
    } catch (error) {
        console.error("Error fetching messages:", error);
        showMessage('Network error fetching messages.', 4000);
        messagesListDiv.innerHTML = '<p class="p-8 text-center" style="color:red;">Network error loading messages.</p>';
    } finally {
        hideLoading();
    }
}

function renderMessages(messages) {
    messagesListDiv.innerHTML = '';
    if (messages.length === 0) {
        messagesListDiv.innerHTML = '<p class="p-8 text-center" style="color: var(--text-secondary);">No messages yet.</p>';
        return;
    }

    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `p-4 rounded-md shadow-sm ${msg.sender_id === currentUser.id ? 'bg-blue-600 text-white self-end' : 'bg-gray-700 text-white self-start'}`;
        messageDiv.style.backgroundColor = msg.sender_id === currentUser.id ? 'var(--accent-active)' : 'var(--bg-window)';
        messageDiv.style.color = msg.sender_id === currentUser.id ? 'var(--accent-active-text)' : 'var(--text-primary)';
        
        const timestamp = new Date(msg.timestamp).toLocaleString();
        messageDiv.innerHTML = `
            <div class="font-bold mb-1">${msg.sender_username || 'Unknown User'} to ${msg.recipient_username || 'Unknown User'}</div>
            <p>${msg.content}</p>
            <div class="text-xs opacity-75 mt-1 text-right">${timestamp}</div>
        `;
        messagesListDiv.appendChild(messageDiv);
    });
    // Scroll to bottom
    messagesListDiv.scrollTop = messagesListDiv.scrollHeight;
}

async function sendMessage(recipientUsername, content) {
    if (!currentUser) {
        showMessage('You must be logged in to send messages.', 3000);
        return;
    }
    if (!recipientUsername || !content) {
        showMessage('Recipient and content are required.', 3000);
        return;
    }
    showLoading();
    try {
        const response = await fetch(`${SERVER_URL}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({ recipientUsername, content })
        });
        const result = await response.json();
        if (response.ok) {
            showMessage("Message sent!", 2000);
            messageContentInput.value = ''; // Clear input
            fetchMessages(); // Refresh messages list
        } else {
            showMessage(data.message || 'Failed to send message.', 4000);
        }
    } catch (error) {
        console.error("Send Message Error:", error);
        showMessage('Network error sending message.', 4000);
    } finally {
        hideLoading();
    }
}


// --- Main App Renderer & Event Listeners ---

function renderMessagesApp() {
    if (token && currentUser) {
        // Logged in: Show app content, fetch messages
        appContent?.classList.remove('hidden');
        loggedInUserSpan.innerHTML = `Logged in as: <span class="font-semibold" style="color: var(--text-primary);">${currentUser.username}</span>`;
        logoutBtn?.classList.remove('hidden');
        fetchMessages(); // Fetch messages
    } else {
        // Not logged in: Show login prompt (similar to browser/profile standalone login)
        appContent?.classList.add('hidden');
        loggedInUserSpan.textContent = '';
        logoutBtn?.classList.add('hidden');
        // This messages app does not have a dedicated login form in its HTML
        // For simplicity, we just display a message if not logged in.
        messagesListDiv.innerHTML = '<p class="p-8 text-center" style="color:red;">Please log in from the main SnugOS desktop to view messages.</p>';
    }
}

function renderLoginPrompt() {
    // For standalone messages, if not logged in, just show a message.
    // User needs to login via main desktop.
    appContent?.classList.add('hidden');
    loggedInUserSpan.textContent = '';
    logoutBtn?.classList.add('hidden');
    messagesListDiv.innerHTML = '<p class="p-8 text-center" style="color:red;">Please log in from the main SnugOS desktop to view messages.</p>';
    // Optionally, could add a button to redirect to index.html for login
    // messagesListDiv.innerHTML += '<button onclick="window.location.href=\'/index.html\'">Go to Login Page</button>';
}


function attachMessagesEventListeners() {
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', () => {
            sendMessage(recipientUsernameInput.value, messageContentInput.value);
        });
        messageContentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { // Shift+Enter for new line
                e.preventDefault();
                sendMessage(recipientUsernameInput.value, messageContentInput.value);
            }
        });
    }
}


// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Check initial auth state on page load
    token = localStorage.getItem('snugos_token'); // Get token again directly
    if (token) {
        fetchUserProfileAndMessages(); // Fetch user profile and messages if token exists
    } else {
        renderLoginPrompt(); // Otherwise, show login prompt
    }
    attachMessagesEventListeners(); // Attach event listeners
});