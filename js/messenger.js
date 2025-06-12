import { SnugWindow } from './daw/SnugWindow.js';

const SERVER_URL = 'https://snugos-server-api.onrender.com';
let loggedInUser = null;
let appServices = {};
let currentChatPartner = null; // To track who we are talking to
let messagePollingInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    // Setup app services for SnugWindow
    appServices.addWindowToStore = addWindowToStoreState;
    appServices.removeWindowFromStore = removeWindowFromStoreState;
    appServices.incrementHighestZ = incrementHighestZState;
    appServices.getWindowById = getWindowByIdState;
    appServices.showNotification = showNotification;
    
    loggedInUser = checkLocalAuth();
    if (loggedInUser) {
        openMessengerWindow();
        updateClockDisplay();
    } else {
        document.body.innerHTML = `<div class="w-full h-full flex items-center justify-center"><p>Please <a href="index.html" class="text-blue-400">log in</a> to use Messenger.</p></div>`;
    }
});

async function openMessengerWindow() {
    const windowId = 'messenger';
    if (appServices.getWindowById(windowId)) return;

    const contentHTML = `
        <div class="flex h-full text-sm">
            <div id="friend-list" class="w-1/3 h-full border-r border-secondary overflow-y-auto">
                <p class="p-2 text-center italic">Loading friends...</p>
            </div>
            <div id="conversation-area" class="w-2/3 h-full flex flex-col bg-window">
                <div id="chat-header" class="p-2 border-b border-secondary text-center font-bold">Select a friend to start chatting</div>
                <div id="message-list" class="flex-grow p-4 overflow-y-auto flex flex-col space-y-4"></div>
                <div id="message-input-area" class="p-2 border-t border-secondary flex hidden">
                    <input type="text" id="message-input" class="w-full p-2 bg-input text-primary border border-input rounded-l-md" placeholder="Type a message...">
                    <button id="send-btn" class="px-4 py-2 bg-button text-button border border-button rounded-r-md">Send</button>
                </div>
            </div>
        </div>
    `;
    const desktop = document.getElementById('desktop');
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
            friendDiv.className = 'p-2 flex items-center cursor-pointer hover:bg-button-hover';
            friendDiv.innerHTML = `
                <img src="${friend.avatar_url || 'assets/default-avatar.png'}" class="w-8 h-8 rounded-full mr-2">
                <span>${friend.username}</span>
            `;
            friendDiv.addEventListener('click', () => {
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
                msgDiv.className = `w-fit max-w-xs p-3 rounded-lg ${isMine ? 'bg-blue-600 self-end' : 'bg-gray-600 self-start'}`;
                msgDiv.innerHTML = `<p>${msg.content}</p><span class="text-xs opacity-70 block text-right mt-1">${new Date(msg.timestamp).toLocaleTimeString()}</span>`;
                messageList.appendChild(msgDiv);
            });
            messageList.scrollTop = messageList.scrollHeight; // Scroll to bottom
        } catch (error) {
            messageList.innerHTML = `<p class="text-center italic" style="color:red;">${error.message}</p>`;
        }
    };
    
    await fetchAndRender(); // Initial load
    messagePollingInterval = setInterval(fetchAndRender, 5000); // Poll for new messages every 5 seconds

    const sendBtn = container.querySelector('#send-btn');
    const messageInput = container.querySelector('#message-input');
    
    const sendMessageAction = async () => {
        const content = messageInput.value.trim();
        if(!content) return;

        try {
            const token = localStorage.getItem('snugos_token');
            await fetch(`${SERVER_URL}/api/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify({ recipientUsername: currentChatPartner.username, content })
            });
            messageInput.value = '';
            await fetchAndRender(); // Refresh immediately after sending
        } catch(error) {
            appServices.showNotification(`Failed to send: ${error.message}`, 3000);
        }
    };

    sendBtn.onclick = sendMessageAction;
    messageInput.onkeydown = (e) => {
        if(e.key === 'Enter') sendMessageAction();
    };
}

function checkLocalAuth() { /* ... from previous files ... */ }
function updateClockDisplay() { /* ... from previous files ... */ }
