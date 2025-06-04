// js/utils.js - Utility Functions Module

export function showNotification(message, typeOrDuration = 'info', durationIfTypeProvided = 3000) {
    // ... (content from your uploaded utils.js, no changes needed here for current debugging)
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) {
        console.error("CRITICAL: Notification area ('notification-area') not found in DOM. Message:", message);
        alert(`Notification: ${message}`);
        return;
    }
    try {
        const notification = document.createElement('div');
        notification.className = 'notification-message p-3 rounded-md shadow-lg text-sm mb-2 border-l-4';
        let type = 'info';
        let duration = 3000;
        if (typeof typeOrDuration === 'string' && ['info', 'success', 'warning', 'error'].includes(typeOrDuration)) {
            type = typeOrDuration;
            duration = typeof durationIfTypeProvided === 'number' ? durationIfTypeProvided : 3000;
        } else if (typeof typeOrDuration === 'number') {
            duration = typeOrDuration;
        }
        switch (type) {
            case 'success': notification.classList.add('bg-green-500', 'border-green-700', 'text-white'); break;
            case 'warning': notification.classList.add('bg-yellow-500', 'border-yellow-700', 'text-black'); break;
            case 'error': notification.classList.add('bg-red-500', 'border-red-700', 'text-white'); break;
            default: notification.classList.add('bg-blue-500', 'border-blue-700', 'text-white'); break;
        }
        notification.textContent = message;
        if (notificationArea.firstChild) notificationArea.insertBefore(notification, notificationArea.firstChild);
        else notificationArea.appendChild(notification);
        setTimeout(() => { notification.classList.add('opacity-100', 'translate-x-0'); notification.classList.remove('opacity-0', 'translate-x-full');}, 10);
        setTimeout(() => {
            notification.classList.remove('opacity-100', 'translate-x-0');
            notification.classList.add('opacity-0', 'translate-x-full');
            setTimeout(() => { if (notification.parentElement) notificationArea.removeChild(notification);}, 300);
        }, duration);
    } catch (error) { console.error("Error displaying notification:", error, "Message:", message); }
}

export function showCustomModal(title, contentHTML, buttonsConfig = [], modalClass = '', appServices = null) { // appServices added for consistency
    // ... (content from your uploaded utils.js)
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
        console.error("CRITICAL: Modal container ('modalContainer') not found in DOM. Cannot show modal:", title);
        return null;
    }
    if (modalContainer.firstChild) { try { modalContainer.firstChild.remove(); } catch (e) { console.warn("Error removing previous modal:", e); } }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[15000]';
    const dialog = document.createElement('div');
    dialog.className = `modal-dialog bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh] ${modalClass}`;
    const titleBar = document.createElement('div');
    titleBar.className = 'modal-title-bar p-3 border-b border-slate-600 text-white text-lg font-semibold flex justify-between items-center';
    titleBar.innerHTML = `<span>${title}</span><button class="modal-close-btn text-slate-400 hover:text-white">&times;</button>`;
    const contentDiv = document.createElement('div');
    contentDiv.className = 'modal-content-body p-4 overflow-y-auto text-slate-300';
    if (typeof contentHTML === 'string') contentDiv.innerHTML = contentHTML;
    else if (contentHTML instanceof HTMLElement) contentDiv.appendChild(contentHTML);
    dialog.appendChild(titleBar); dialog.appendChild(contentDiv);
    if (buttonsConfig && buttonsConfig.length > 0) {
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'modal-buttons p-3 border-t border-slate-600 flex justify-end space-x-2 bg-slate-750 rounded-b-lg';
        buttonsConfig.forEach(btnConfig => {
            const button = document.createElement('button'); button.textContent = btnConfig.text;
            button.className = `px-4 py-1.5 rounded-md text-sm font-medium ${btnConfig.classes || 'bg-blue-600 hover:bg-blue-500 text-white'}`;
            button.addEventListener('click', (e) => {
                if (btnConfig.action) btnConfig.action(e, { overlay, dialog, contentDiv });
                if (btnConfig.closesModal !== false) { if (overlay.parentElement) overlay.remove(); }
            });
            buttonsDiv.appendChild(button);
        });
        dialog.appendChild(buttonsDiv);
    }
    overlay.appendChild(dialog); document.body.appendChild(overlay);
    const closeAndRemove = () => { if (overlay.parentElement) overlay.remove(); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAndRemove(); });
    titleBar.querySelector('.modal-close-btn').addEventListener('click', closeAndRemove);
    const firstFocusable = dialog.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if(firstFocusable) firstFocusable.focus();
    return { overlay, dialog, contentDiv };
}

export function showConfirmationDialog(message, onConfirm, onCancel = null, appServices = null) { // Added appServices
    const content = `<p class="text-sm">${message}</p>`; // Matched your utils.js
    const buttons = [
        { text: 'Cancel', action: () => { if (onCancel) onCancel(); }, classes: 'bg-slate-600 hover:bg-slate-500 text-white' },
        { text: 'Confirm', action: onConfirm, classes: 'bg-red-600 hover:bg-red-500 text-white' } // Confirm button should not remove modal by default, let onConfirm handle it
    ];
    // Pass appServices if createCustomModal uses it (e.g., for notifications within modal actions)
    return showCustomModal('Confirmation', content, buttons, 'confirmation-dialog', appServices);
}

export function createDropZoneHTML(trackId, inputId, trackTypeHintForLoad, padOrSliceIndex = null, existingAudioData = null) { /* ... same as your file ... */ }
export function setupGenericDropZoneListeners(dropZoneElement, onFileDropped, fileInputId = null, appServices = null) { /* ... same as your file ... */ }

let activeContextMenu = null;
export function createContextMenu(event, menuItems = [], appServices = null) { // appServices was already a param
    // ADDED LOG
    console.log("[Utils createContextMenu] Called. Event Target:", event.target, "Items count:", menuItems.length);
    
    event.preventDefault();
    event.stopPropagation();

    if (activeContextMenu) {
        try { activeContextMenu.remove(); } catch (e) { console.warn("Error removing previous context menu:", e); }
        activeContextMenu = null;
    }

    const menu = document.createElement('div');
    menu.id = `snug-context-menu-${Date.now()}`;
    menu.className = 'context-menu absolute bg-slate-800 border border-slate-700 rounded-md shadow-lg py-1 z-[20000]'; // From your utils.js

    const ul = document.createElement('ul');
    menuItems.forEach(itemConfig => {
        if (!itemConfig) return;
        if (itemConfig.separator) {
            const hr = document.createElement('hr'); hr.className = 'context-menu-separator border-t border-slate-600 my-1'; // From your utils.js
            ul.appendChild(hr); return;
        }
        const li = document.createElement('li');
        li.className = `context-menu-item px-3 py-1.5 text-sm text-slate-300 hover:bg-blue-600 hover:text-white cursor-pointer ${itemConfig.disabled ? 'opacity-50 cursor-default !bg-transparent !text-slate-500' : ''}`; // From your utils.js
        li.textContent = itemConfig.label || 'Menu Item';
        if (itemConfig.title) li.title = itemConfig.title;

        if (!itemConfig.disabled && typeof itemConfig.action === 'function') {
            li.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent click from bubbling
                console.log(`[Utils createContextMenu] Menu item "${itemConfig.label}" clicked.`); // ADDED LOG
                try {
                    itemConfig.action();
                } catch (actionError) {
                    console.error("Error in context menu item action:", actionError);
                    const notify = appServices?.showNotification || showNotification;
                    notify("Error executing menu action.", "error");
                }
                if (activeContextMenu && activeContextMenu.parentElement) {
                    try { activeContextMenu.remove(); } catch (e) {/* ignore */}
                }
                activeContextMenu = null;
            });
        }
        ul.appendChild(li);
    });

    menu.appendChild(ul);
    document.body.appendChild(menu);
    activeContextMenu = menu;

    // Position the menu (from your utils.js)
    const { clientX: mouseX, clientY: mouseY } = event;
    const { innerWidth, innerHeight } = window;
    const menuRect = menu.getBoundingClientRect();
    let x = mouseX; let y = mouseY;
    if (mouseX + menuRect.width > innerWidth) x = innerWidth - menuRect.width - 5;
    if (mouseY + menuRect.height > innerHeight) y = innerHeight - menuRect.height - 5;
    if (x < 5) x = 5; if (y < 5) y = 5; // Ensure it's not off-screen top-left
    menu.style.left = `${x}px`; menu.style.top = `${y}px`;

    const closeListener = (e) => { /* ... same as your utils.js ... */ };
    const closeListenerBlur = () => { /* ... same as your utils.js ... */ };
    setTimeout(() => { /* ... same as your utils.js ... */ }, 0);

    return menu;
}

export function snapTimeToGrid(timeInSeconds, bpm, pixelsPerSecond = 30, forDuration = false, subdivision = '16n') { /* ... same as your utils.js, ensure Tone guard ... */
    if (typeof Tone === 'undefined' || !isFinite(timeInSeconds) || !isFinite(bpm) || bpm <=0 ) return timeInSeconds;
    try {
        const subdivisionSeconds = Tone.Time(subdivision).toSeconds();
        if (subdivisionSeconds <= 0) return timeInSeconds;
        const snappedTime = Math.round(timeInSeconds / subdivisionSeconds) * subdivisionSeconds;
        if (forDuration && snappedTime === 0 && timeInSeconds > (subdivisionSeconds / 2)) return subdivisionSeconds;
        return parseFloat(snappedTime.toFixed(5));
    } catch (e) {
        console.warn("[Utils snapTimeToGrid] Error with Tone.Time, returning original value:", e);
        return timeInSeconds;
    }
}
