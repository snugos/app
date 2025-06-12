import { SnugWindow } from './daw/SnugWindow.js';

const SERVER_URL = 'https://snugos-server-api.onrender.com';
let loggedInUser = null;
let appServices = {};
let currentChatPartner = null;
let messagePollingInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    appServices.addWindowToStore = addWindowToStoreState;
    appServices.removeWindowFromStore = removeWindowFromStoreState;
    appServices.incrementHighestZ = incrementHighestZState;
    appServices.getHighestZ = getHighestZState;
    appServices.setHighestZ = setHighestZState;
    appServices.getOpenWindows = getOpenWindowsState;
    appServices.getWindowById = getWindowByIdState;
    appServices.createContextMenu = createContextMenu;
    appServices.showNotification = showNotification;
    appServices.showCustomModal = showCustomModal;

    loggedInUser = checkLocalAuth();
    
    attachDesktopEventListeners();
    applyUserThemePreference();
    updateClockDisplay();
    
    if (loggedInUser) {
        openMessengerWindow();
    } else {
        const desktop = document.getElementById('desktop');
        if(desktop) {
            desktop.innerHTML = `<div class="w-full h-full flex items-center justify-center"><p class="text-xl">Please log in to use Messenger.</p></div>`;
        }
        updateAuthUI(null); // Ensure login button appears in Start Menu
    }
});

// --- Window Management ---

async function openMessengerWindow() {
    const windowId = 'messenger';
    if (appServices.getWindowById(windowId)) {
        appServices.getWindowById(windowId).focus();
        return;
    }

    const contentHTML = `
        <div class="flex h-full text-sm" style="background-color: var(--bg-window-content);">
            <div id="friend-list" class="w-1/3 h-full border-r overflow-y-auto" style="border-color: var(--border-secondary);">
                <p class="p-2 text-center italic">Loading friends...</p>
            </div>
            <div id="conversation-area" class="w-2/3 h-full flex flex-col bg-window">
                <div id="chat-header" class="p-2 border-b font-bold text-center" style="border-color: var(--border-secondary);">Select a friend to start chatting</div>
                <div id="message-list" class="flex-grow p-4 overflow-y-auto flex flex-col space-y-4"></div>
                <div id="message-input-area" class="p-2 border-t border-secondary flex hidden" style="border-color: var(--border-secondary);">
                    <input type="text" id="message-input" class="w-full p-2 bg-input text-primary border border-input rounded-l-md" placeholder="Type a message...">
                    <button id="send-btn" class="px-4 py-2 bg-button text-button border border-button rounded-r-md">Send</button>
                </div>
            </div>
        </div>
    `;
    const desktopEl = document.getElementById('desktop');
    const options = { width: 700, height: 500, x: (desktopEl.offsetWidth - 700) / 2, y: (desktopEl.offsetHeight - 500) / 2 };
    const messengerWindow = new SnugWindow(windowId, 'Messenger', contentHTML, options, appServices);
    
    await populateFriendList(messengerWindow.element);
}

// --- Core Messenger Logic ---

async function populateFriendList(container) {
    const friendListEl = container.querySelector('#friend-list');
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/friends`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);

        friendListEl.innerHTML = '';
        if (data.friends.length === 0) {
            friendListEl.innerHTML = `<p class="p-2 text-center italic">No friends yet.</p>`;
            return;
        }

        data.friends.forEach(friend => {
            const friendDiv = document.createElement('div');
            friendDiv.className = 'p-2 flex items-center cursor-pointer hover:bg-button-hover friend-item';
            friendDiv.dataset.username = friend.username;
            friendDiv.innerHTML = `
                <img src="${friend.avatar_url || 'assets/default-avatar.png'}" class="w-8 h-8 rounded-full mr-2 flex-shrink-0">
                <span class="truncate">${friend.username}</span>
            `;
            friendDiv.addEventListener('click', () => {
                container.querySelectorAll('.friend-item').forEach(el => el.style.backgroundColor = 'transparent');
                friendDiv.style.backgroundColor = 'var(--accent-active)';
                loadConversation(container, friend);
            });
            friendListEl.appendChild(friendDiv);
        });
    } catch(error) {
        friendListEl.innerHTML = `<p class="p-2 text-center italic" style="color:red;">${error.message}</p>`;
    }
}

async function loadConversation(container, friend) {
    currentChatPartner = friend;
    if(messagePollingInterval) clearInterval(messagePollingInterval);

    const chatHeader = container.querySelector('#chat-header');
    const messageInputArea = container.querySelector('#message-input-area');
    chatHeader.textContent = `Chat with ${friend.username}`;
    messageInputArea.classList.remove('hidden');

    const fetchAndRender = async () => {
        const messageList = container.querySelector('#message-list');
        try {
            const token = localStorage.getItem('snugos_token');
            const response = await fetch(`${SERVER_URL}/api/messages/conversation/${friend.username}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            
            messageList.innerHTML = '';
            data.conversation.forEach(msg => {
                const msgDiv = document.createElement('div');
                const isMine = msg.sender_id === loggedInUser.id;
                msgDiv.className = `w-fit max-w-xs p-3 rounded-lg ${isMine ? 'bg-blue-600 self-end text-white' : 'bg-gray-600 self-start'}`;
                msgDiv.innerHTML = `<p>${msg.content}</p><span class="text-xs opacity-70 block text-right mt-1">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
                messageList.appendChild(msgDiv);
            });
            messageList.scrollTop = messageList.scrollHeight;
        } catch (error) {
            messageList.innerHTML = `<p class="text-center italic" style="color:red;">${error.message}</p>`;
        }
    };
    
    await fetchAndRender();
    messagePollingInterval = setInterval(fetchAndRender, 5000);

    const sendBtn = container.querySelector('#send-btn');
    const messageInput = container.querySelector('#message-input');
    
    const sendMessageAction = async () => {
        const content = messageInput.value.trim();
        if(!content || !currentChatPartner) return;

        try {
            const token = localStorage.getItem('snugos_token');
            await fetch(`${SERVER_URL}/api/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify({ recipientUsername: currentChatPartner.username, content })
            });
            messageInput.value = '';
            await fetchAndRender();
        } catch(error) {
            appServices.showNotification(`Failed to send: ${error.message}`, 3000);
        }
    };

    sendBtn.onclick = sendMessageAction;
    messageInput.onkeydown = (e) => {
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessageAction();
        }
    };
}

// --- Standard Helper Functions ---

function attachDesktopEventListeners() {
    document.getElementById('startButton')?.addEventListener('click', toggleStartMenu);
    document.getElementById('menuLogin')?.addEventListener('click', () => { toggleStartMenu(); showLoginModal(); });
    document.getElementById('menuLogout')?.addEventListener('click', () => { toggleStartMenu(); handleLogout(); });
}

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
    } else {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
    }
}

function handleLogout() {
    localStorage.removeItem('snugos_token');
    loggedInUser = null;
    window.location.reload();
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
            showNotification(`Welcome, ${data.user.username}!`, 2000);
            window.location.reload();
        } else {
            showNotification(`Login failed: ${data.message}`, 3000);
        }
    } catch (error) {
        showNotification('Network error.', 3000);
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
    }
}
