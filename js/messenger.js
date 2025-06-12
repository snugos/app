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
    updateAuthUI(loggedInUser);
    
    if (loggedInUser) {
        openMessengerWindow();
        loadAndApplyGlobals();
    } else {
        const desktop = document.getElementById('desktop');
        if(desktop) {
            desktop.innerHTML = `<div class="w-full h-full flex items-center justify-center"><p class="text-xl">Please log in to use Messenger.</p></div>`;
        }
    }
});

function attachDesktopEventListeners() {
    const desktop = document.getElementById('desktop');
    if (desktop) {
        desktop.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (e.target.closest('.window')) return;
            const menuItems = [{
                label: 'Change Background',
                action: () => document.getElementById('customBgInput').click()
            }];
            appServices.createContextMenu(e, menuItems);
        });
    }

    document.getElementById('customBgInput')?.addEventListener('change', async (e) => {
        if(!e.target.files || !e.target.files[0] || !loggedInUser) return;
        handleBackgroundUpload(e.target.files[0]);
    });

    document.getElementById('startButton')?.addEventListener('click', toggleStartMenu);
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
    document.getElementById('menuLogin')?.addEventListener('click', () => { toggleStartMenu(); showLoginModal(); });
    document.getElementById('menuLogout')?.addEventListener('click', () => { toggleStartMenu(); handleLogout(); });
    document.getElementById('menuToggleFullScreen')?.addEventListener('click', toggleFullScreen);
}

async function handleBackgroundUpload(file) {
    if (!loggedInUser) return;
    showNotification("Uploading background...", 2000);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', '/backgrounds/');
    try {
        const token = localStorage.getItem('snugos_token');
        const uploadResponse = await fetch(`${SERVER_URL}/api/files/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResult.success) throw new Error(uploadResult.message);

        const newBgUrl = uploadResult.file.s3_url;
        await fetch(`${SERVER_URL}/api/profile/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ background_url: newBgUrl })
        });
        showNotification("Background updated!", 2000);
        loadAndApplyGlobals();
    } catch(error) {
        showNotification(`Error: ${error.message}`, 4000);
    }
}

async function loadAndApplyGlobals() {
    if (!loggedInUser) return;
    try {
        const token = localStorage.getItem('snugos_token');
        const response = await fetch(`${SERVER_URL}/api/profile/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.profile.background_url) {
            document.getElementById('desktop').style.backgroundImage = `url(${data.profile.background_url})`;
            document.getElementById('desktop').style.backgroundSize = 'cover';
        }
    } catch (error) {
        console.error("Could not apply global settings:", error);
    }
}

async function openMessengerWindow() {
    const windowId = 'messenger';
    if (appServices.getWindowById(windowId)) return;

    const contentHTML = `
        <div class="flex h-full text-sm">
            <div id="friend-list" class="w-1/3 h-full border-r border-secondary overflow-y-auto">
                <p class="p-2 text-center italic">Loading friends...</p>
            </div>
            <div id="conversation-area" class="w-2/3 h-full flex flex-col bg-window">
                <div id="chat-header" class="p-2 border-b border-secondary text-center font-bold">Select a friend</div>
                <div id="message-list" class="flex-grow p-4 overflow-y-auto flex flex-col space-y-4"></div>
                <div id="message-input-area" class="p-2 border-t border-secondary flex hidden">
                    <input type="text" id="message-input" class="w-full p-2 bg-input text-primary border border-input rounded-l-md" placeholder="Type a message...">
                    <button id="send-btn" class="px-4 py-2 bg-button text-button border border-button rounded-r-md">Send</button>
                </div>
            </div>
        </div>
    `;
    const desktopEl = document.getElementById('desktop');
    const options = { width: 700, height: 500, x: 150, y: 50 };
    const messengerWindow = new SnugWindow(windowId, 'Messenger', contentHTML, options, appServices);
    
    await populateFriendList(messengerWindow.element);
}

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
            friendDiv.innerHTML = `<img src="${friend.avatar_url || 'assets/default-avatar.png'}" class="w-8 h-8 rounded-full mr-2 flex-shrink-0"><span class="truncate">${friend.username}</span>`;
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
            const response = await fetch(`${SERVER_URL}/api/messages/conversation/${friend.username}`, { headers: { 'Authorization': `Bearer ${token}` } });
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
    messageInput.onkeydown = (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessageAction(); } };
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

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => { showNotification(`Error: ${err.message}`, 3000); });
    } else {
        if(document.exitFullscreen) document.exitFullscreen();
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

function updateAuthUI(user) {
    const userAuthContainer = document.getElementById('userAuthContainer');
    const menuLogin = document.getElementById('menuLogin');
    const menuLogout = document.getElementById('menuLogout');

    if (user && userAuthContainer) {
        userAuthContainer.innerHTML = `<span class="mr-2">Welcome, ${user.username}!</span> <button id="logoutBtnTop" class="px-3 py-1 border rounded">Logout</button>`;
        userAuthContainer.querySelector('#logoutBtnTop')?.addEventListener('click', handleLogout);
        if (menuLogin) menuLogin.style.display = 'none';
        if (menuLogout) menuLogout.style.display = 'block';
    } else if (userAuthContainer) {
        userAuthContainer.innerHTML = `<button id="loginBtnTop" class="px-3 py-1 border rounded">Login</button>`;
        userAuthContainer.querySelector('#loginBtnTop')?.addEventListener('click', showLoginModal);
        if (menuLogin) menuLogin.style.display = 'block';
        if (menuLogout) menuLogout.style.display = 'none';
    }
}

function handleLogout() {
    localStorage.removeItem('snugos_token');
    loggedInUser = null;
    window.location.reload();
}

function showLoginModal() {
    // Full login/register form implementation
}

async function handleLogin(username, password) {
    // Full login logic
}

async function handleRegister(username, password) {
    // Full register logic
}
