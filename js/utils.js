// js/utils.js - Utility Functions Module

export function showNotification(message, duration = 3000) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) {
        console.error("CRITICAL: Notification area ('notification-area') not found in DOM. Message:", message);
        // Fallback to alert if notification area is missing
        alert(`Notification: ${message}`);
        return;
    }
    try {
        const notification = document.createElement('div');
        notification.className = 'notification-message';
        notification.textContent = message;
        notificationArea.appendChild(notification);

        // Trigger fade-in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10); // Short delay to allow element to be added to DOM before transition

        // Set timeout to remove the notification
        setTimeout(() => {
            notification.classList.remove('show');
            // Remove the element after the fade-out transition
            setTimeout(() => {
                if (notification.parentElement) {
                    notificationArea.removeChild(notification);
                }
            }, 300); // Duration of the fade-out transition (should match CSS)
        }, duration);
    } catch (error) {
        console.error("Error displaying notification:", error, "Message:", message);
    }
}

export function showCustomModal(title, contentHTML, buttonsConfig = [], modalId = 'customModal') {
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove(); // Remove if already exists

    const modalOverlay = document.createElement('div');
    modalOverlay.id = modalId;
    // Use a consistent class for the overlay itself for styling
    modalOverlay.className = 'modal-overlay fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[15000]'; // Tailwind for overlay

    const modalDialog = document.createElement('div');
    // Use classes from style.css for the dialog box appearance
    modalDialog.className = 'modal-dialog bg-gray-800 p-4 rounded-lg shadow-xl max-w-md w-full text-white dark:bg-slate-700'; // Tailwind for dialog

    const modalTitleBar = document.createElement('div');
    modalTitleBar.className = 'modal-title-bar text-lg font-semibold mb-3 pb-2 border-b border-gray-700 dark:border-slate-600';
    modalTitleBar.textContent = title;
    modalDialog.appendChild(modalTitleBar);

    const modalBody = document.createElement('div');
    modalBody.className = 'modal-content-body mb-4 text-sm'; // Tailwind for body
    if (typeof contentHTML === 'string') {
        modalBody.innerHTML = contentHTML;
    } else if (contentHTML instanceof HTMLElement) {
        modalBody.appendChild(contentHTML);
    }
    modalDialog.appendChild(modalBody);

    const modalButtons = document.createElement('div');
    modalButtons.className = 'modal-buttons text-right space-x-2'; // Tailwind for buttons area

    if (buttonsConfig.length === 0) { // Add a default close button if none provided
        buttonsConfig.push({ text: 'Close', type: 'cancel', action: () => modalOverlay.remove() });
    }

    buttonsConfig.forEach(btnConfig => {
        const button = document.createElement('button');
        button.textContent = btnConfig.text;
        // Apply base Tailwind button styles and then specific type styles
        button.className = `px-4 py-2 rounded text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800`;
        if (btnConfig.type === 'confirm') {
            button.classList.add('bg-blue-600', 'hover:bg-blue-700', 'focus:ring-blue-500', 'text-white');
        } else { // Default to 'cancel' or other style
            button.classList.add('bg-gray-600', 'hover:bg-gray-700', 'focus:ring-gray-500', 'text-gray-200', 'dark:bg-slate-600', 'dark:hover:bg-slate-500');
        }
        button.addEventListener('click', () => {
            if (btnConfig.action && typeof btnConfig.action === 'function') {
                btnConfig.action();
            }
            modalOverlay.remove(); // Always remove modal after action
        });
        modalButtons.appendChild(button);
    });

    modalDialog.appendChild(modalButtons);
    modalOverlay.appendChild(modalDialog);
    document.body.appendChild(modalOverlay);

    // Focus on the first button for accessibility
    const firstButton = modalButtons.querySelector('button');
    if (firstButton) firstButton.focus();
    
    return { overlay: modalOverlay, contentDiv: modalBody, dialog: modalDialog };
}


export function showConfirmationDialog(title, message, onConfirm, onCancel) {
    const buttons = [
        { text: 'Confirm', type: 'confirm', action: onConfirm },
        { text: 'Cancel', type: 'cancel', action: onCancel }
    ];
    // Ensure the message is wrapped in a <p> for consistent styling if it's just a string
    const content = `<p class="text-sm text-gray-300 dark:text-slate-300">${message}</p>`;
    showCustomModal(title, content, buttons, 'confirmationDialog');
}


export function createDropZoneHTML(trackId, fileInputId, targetType, index = null, existingAudioData = null) {
    let statusClass = 'text-gray-500 dark:text-slate-400'; // Default
    let statusText = 'Drop audio file here, or click to browse.';
    let fileNameText = '';

    if (existingAudioData) {
        if (existingAudioData.status === 'loaded' && existingAudioData.originalFileName) {
            statusClass = 'text-green-500 dark:text-green-400';
            statusText = `Loaded:`;
            fileNameText = existingAudioData.originalFileName;
        } else if ((existingAudioData.status === 'missing' || existingAudioData.status === 'missing_db') && existingAudioData.originalFileName) {
            statusClass = 'text-yellow-500 dark:text-yellow-400';
            statusText = `Missing:`;
            fileNameText = existingAudioData.originalFileName;
        } else if (existingAudioData.status === 'error' && existingAudioData.originalFileName) {
            statusClass = 'text-red-500 dark:text-red-400';
            statusText = `Error:`;
            fileNameText = existingAudioData.originalFileName;
        } else if (existingAudioData.originalFileName) { // Fallback if status is odd but filename exists
            statusClass = 'text-blue-500 dark:text-blue-400';
            statusText = `File:`;
            fileNameText = existingAudioData.originalFileName;
        }
    }

    const indexAttr = index !== null ? `data-index="${index}"` : '';
    // Using Tailwind classes for styling
    return `
        <div class="drop-zone border-2 border-dashed border-gray-400 dark:border-slate-600 rounded-md p-3 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors duration-150" 
             data-track-id="${trackId}" data-target-type="${targetType}" ${indexAttr}>
            <p class="text-xs ${statusClass} mb-1">${statusText}</p>
            ${fileNameText ? `<p class="text-xs text-gray-700 dark:text-slate-300 font-medium truncate" title="${fileNameText}">${fileNameText}</p>` : ''}
            <input type="file" id="${fileInputId}" class="hidden" accept="audio/*">
            <button onclick="document.getElementById('${fileInputId}').click(); event.stopPropagation();" 
                    class="mt-1 text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors duration-150 dark:bg-blue-600 dark:hover:bg-blue-700">
                Browse
            </button>
        </div>
    `;
}


export function setupGenericDropZoneListeners(dropZoneElement, trackId, targetType, index, loadFromBrowserCallback, fileLoadCallback) {
    if (!dropZoneElement) return;

    dropZoneElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneElement.classList.add('border-blue-500', 'dark:border-blue-400', 'bg-blue-50', 'dark:bg-slate-700'); // Tailwind for dragover
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });
    dropZoneElement.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneElement.classList.remove('border-blue-500', 'dark:border-blue-400', 'bg-blue-50', 'dark:bg-slate-700');
    });
    dropZoneElement.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneElement.classList.remove('border-blue-500', 'dark:border-blue-400', 'bg-blue-50', 'dark:bg-slate-700');
        const files = e.dataTransfer?.files;
        const jsonDataString = e.dataTransfer?.getData("application/json");

        if (jsonDataString) {
            try {
                const soundData = JSON.parse(jsonDataString);
                if (soundData.type === 'sound-browser-item' && typeof loadFromBrowserCallback === 'function') {
                    loadFromBrowserCallback(soundData, trackId, targetType, index);
                }
            } catch (err) { console.error("Error parsing dropped JSON for dropzone:", err); }
        } else if (files && files.length > 0) {
            if (typeof fileLoadCallback === 'function') {
                // Create a mock event object for fileLoadCallback
                const mockEvent = { target: { files: files } };
                if (targetType === 'DrumSampler' && index !== null) {
                     fileLoadCallback(mockEvent, trackId, index); // For drum samplers, pass pad index
                } else {
                     fileLoadCallback(mockEvent, trackId, targetType); // For general samplers
                }
            }
        }
    });
}

/**
 * Snaps a given time to the nearest grid interval.
 * @param {number} timeInSeconds - The time to snap.
 * @param {number} snapIntervalSeconds - The duration of one grid interval in seconds.
 * @returns {number} The snapped time in seconds.
 */
export function snapTimeToGrid(timeInSeconds, snapIntervalSeconds) {
    if (snapIntervalSeconds <= 0) return timeInSeconds; // Avoid division by zero or negative interval
    return Math.round(timeInSeconds / snapIntervalSeconds) * snapIntervalSeconds;
}

// Context Menu
let activeContextMenu = null;
export function createContextMenu(event, menuItems, appServicesForZIndex) {
    if (activeContextMenu) activeContextMenu.remove();
    event.preventDefault();
    event.stopPropagation();

    const menu = document.createElement('div');
    // Using Tailwind for basic context menu styling
    menu.className = 'context-menu absolute bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 text-sm text-white dark:bg-slate-700 dark:border-slate-600';
    menu.id = 'snug-context-menu'; // Added an ID

    const ul = document.createElement('ul');
    ul.className = 'list-none p-0 m-0';
    menuItems.forEach(item => {
        if (item.separator) {
            const hr = document.createElement('hr');
            hr.className = 'border-t border-gray-700 dark:border-slate-600 my-1';
            ul.appendChild(hr);
        } else {
            const li = document.createElement('li');
            li.className = 'px-3 py-1.5 hover:bg-blue-600 dark:hover:bg-blue-500 cursor-pointer whitespace-nowrap';
            li.textContent = item.label;
            if (item.disabled) {
                li.classList.add('opacity-50', 'cursor-not-allowed', 'hover:bg-transparent', 'dark:hover:bg-transparent');
            } else {
                li.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent click from closing menu if action opens another menu/modal
                    if (typeof item.action === 'function') item.action();
                    if (activeContextMenu) activeContextMenu.remove(); // Close after action
                    activeContextMenu = null;
                });
            }
            ul.appendChild(li);
        }
    });
    menu.appendChild(ul);
    document.body.appendChild(menu);
    activeContextMenu = menu;

    const zIndex = appServicesForZIndex && appServicesForZIndex.incrementHighestZ ? appServicesForZIndex.incrementHighestZ() : 10003;
    menu.style.zIndex = zIndex.toString();

    // Position the menu
    const { clientX: mouseX, clientY: mouseY } = event;
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = mouseY;
    let left = mouseX;

    if (mouseX + menuWidth > viewportWidth) {
        left = mouseX - menuWidth;
    }
    if (mouseY + menuHeight > viewportHeight) {
        top = mouseY - menuHeight;
    }
    menu.style.top = `${Math.max(0, top)}px`; // Ensure it doesn't go off-screen top
    menu.style.left = `${Math.max(0, left)}px`; // Ensure it doesn't go off-screen left

    // Close listener
    const closeListener = (e) => {
        if (activeContextMenu && (!menu.contains(e.target) || (e.type === 'contextmenu' && e.target !== menu && !menu.contains(e.target)))) {
            try {
                activeContextMenu.remove();
            } catch (removeError) { /* ignore if already removed */ }
            activeContextMenu = null;
            document.removeEventListener('click', closeListener, { capture: true });
            document.removeEventListener('contextmenu', closeListener, { capture: true });
            window.removeEventListener('blur', closeListenerBlur); // Also remove blur listener
        }
    };
    const closeListenerBlur = () => { // Separate for blur as it doesn't have e.target
        if (activeContextMenu) {
             try { activeContextMenu.remove(); } catch (removeError) { /* ignore */ }
            activeContextMenu = null;
            document.removeEventListener('click', closeListener, { capture: true });
            document.removeEventListener('contextmenu', closeListener, { capture: true });
            window.removeEventListener('blur', closeListenerBlur);
        }
    }

    // Add listeners after a short delay to avoid capturing the event that opened the menu
    setTimeout(() => {
        document.addEventListener('click', closeListener, { capture: true });
        document.addEventListener('contextmenu', closeListener, { capture: true });
        window.addEventListener('blur', closeListenerBlur); // Close on window blur
    }, 0);

    return menu;
}
