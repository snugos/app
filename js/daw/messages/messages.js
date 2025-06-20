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
        if (typeof onConfirm === 'function') { // FIX: Check if onConfirm is a function
            onConfirm();
        }
    };

    if (showCancel) {
        messageCancelBtn.onclick = () => {
            messageDialog.classList.add('hidden');
            if (typeof onCancel === 'function') { // FIX: Check if onCancel is a function
                onCancel();
            }
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
        // Fetch both sent and received messages
        const [receivedRes, sentRes] = await Promise.all([
            fetch(`${SERVER_URL}/api/messages/received`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${SERVER_URL}/api/messages/sent`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const [receivedData, sentData] = await Promise.all([receivedRes.json(), sentRes.json()]);

        // FIX: Check success property for both receivedData and sentData
        if (!receivedRes.ok || !receivedData.success) throw new Error(receivedData.message || 'Failed to fetch received messages.');
        if (!sentRes.ok || !sentData.success) throw new Error(sentData.message || 'Failed to fetch sent messages.');

        // Combine and sort messages by timestamp
        const allMessages = [...(receivedData.messages || []), ...(sentData.messages || [])];
        allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        renderMessages(allMessages);

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
        const isSender = msg.sender_id === currentUser.id;
        const messageDiv = document.createElement('div');
        
        // Apply styling for conversational bubbles
        messageDiv.className = `flex ${isSender ? 'justify-end' : 'justify-start'} mb-4`;
        messageDiv.innerHTML = `
            <div class="max-w-[70%] p-3 rounded-lg shadow-md ${isSender ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}"
                 style="background-color: ${isSender ? 'var(--accent-active)' : 'var(--bg-window)'}; color: ${isSender ? 'var(--accent-active-text)' : 'var(--text-primary)'};">
                <div class="text-sm font-semibold mb-1">
                    <a href="profile.html?user=${isSender ? msg.recipient_username : msg.sender_username}" target="_blank" class="hover:underline" style="color: inherit;">
                        ${isSender ? `To: ${msg.recipient_username}` : `From: ${msg.sender_username}`}
                    </a>
                </div>
                <p class="text-base break-words">${msg.content}</p>
                <div class="text-xs opacity-75 mt-1" style="text-align: ${isSender ? 'right' : 'left'};">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        `;
        
        messagesListDiv.appendChild(messageDiv);

        // Attach click listeners to usernames
        messageDiv.querySelector(`a[href*="profile.html?user=${msg.sender_username}"]`)?.addEventListener('click', (e) => handleUsernameClick(e.target.dataset.username || msg.sender_username));
        messageDiv.querySelector(`a[href*="profile.html?user=${msg.recipient_username}"]`)?.addEventListener('click', (e) => handleUsernameClick(e.target.dataset.username || msg.recipient_username));
    });
    // Scroll to bottom
    messagesListDiv.scrollTop = messagesListDiv.scrollHeight;
}

function handleUsernameClick(username) {
    if (username) {
        window.open(`/app/js/daw/profiles/profile.html?user=${username}`, '_blank'); // Open in new tab
    }
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
            recipientUsernameInput.value = ''; // Clear recipient field too
            messageContentInput.value = ''; // Clear message input
            fetchMessages(); // Refresh messages list
        } else {
            showMessage(result.message || 'Failed to send message.', 4000);
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
    // Update logged in user display in header
    if (currentUser) {
        loggedInUserSpan.innerHTML = `Logged in as: <span class="font-semibold" style="color: var(--text-primary);">${currentUser.username}</span>`;
        logoutBtn?.classList.remove('hidden');
        appContent?.classList.remove('hidden'); // Show the main messages content
        fetchMessages(); // Fetch messages
    } else {
        // Not logged in: Show a message prompting login from main desktop
        loggedInUserSpan.textContent = '';
        logoutBtn?.classList.add('hidden');
        appContent?.classList.add('hidden'); // Hide messages content
        
        messagesListDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center">
                <p class="text-lg font-semibold mb-4" style="color:var(--text-primary);">Access Denied</p>
                <p style="color:var(--text-secondary);">Please log in from the main SnugOS desktop to view and send messages.</p>
                <button onclick="window.location.href='/'" class="mt-4 px-6 py-2 rounded" style="background-color:var(--bg-button); color:var(--text-button); border:1px solid var(--border-button);">Go to Login Page</button>
            </div>
        `;
    }
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
        renderMessagesApp(); // Show login prompt if no token
    }
    attachMessagesEventListeners(); // Attach event listeners
});