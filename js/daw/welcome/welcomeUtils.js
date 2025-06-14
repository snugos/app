// js/welcome/welcomeUtils.js - Minimal utility functions for the Welcome Page

export function showNotification(message, duration = 3000) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) {
        console.error("CRITICAL: Notification area ('notification-area') not found in DOM. Message:", message);
        // Fallback to alert if notification area is missing (e.g., during initial setup)
        alert(`Notification: ${message}`);
        return;
    }
    try {
        const notification = document.createElement('div');
        notification.className = 'notification-message';
        notification.textContent = message;
        notificationArea.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10); 

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notificationArea.removeChild(notification);
                }
            }, 300);
        }, duration);
    } catch (error) {
        console.error("Error displaying notification:", error, "Message:", message);
    }
}

/**
 * Converts a Base64 encoded string to a Blob object.
 * (Copied from js/utils.js)
 * @param {string} base64 - The Base64 string.
 * @param {string} contentType - The MIME type of the content.
 * @returns {Blob}
 */
export function base64ToBlob(base64, contentType = 'audio/mpeg') {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
}

// Minimal modal for login/register on welcome page
export function showCustomModal(title, contentHTML, buttonsConfig = []) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';

    const titleBar = document.createElement('div');
    titleBar.className = 'modal-title-bar';
    titleBar.textContent = title;
    dialog.appendChild(titleBar);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'modal-content';
    if (typeof contentHTML === 'string') {
        contentDiv.innerHTML = contentHTML;
    } else {
        contentDiv.appendChild(contentHTML);
    }
    dialog.appendChild(contentDiv);

    if (buttonsConfig.length > 0) {
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'modal-buttons';
        buttonsConfig.forEach(btnConfig => {
            const button = document.createElement('button');
            button.textContent = btnConfig.label;
            button.addEventListener('click', () => {
                btnConfig.action?.();
                overlay.remove();
            });
            buttonsDiv.appendChild(button);
        });
        dialog.appendChild(buttonsDiv);
    }
    
    overlay.appendChild(dialog);
    modalContainer.appendChild(overlay);

    return { overlay, contentDiv };
}
