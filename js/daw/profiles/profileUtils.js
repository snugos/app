// js/profiles/profileUtils.js - Minimal utility functions for the Profile Page

export function showNotification(message, duration = 3000) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) {
        console.error("CRITICAL: Notification area ('notification-area') not found in DOM. Message:", message);
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

// Minimal modal for login/register/messaging on profile page
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

/**
 * Reads CSS custom properties to get current theme colors.
 * @returns {object} An object containing theme colors.
 */
export function getThemeColors() { // Export re-added
    const rootStyle = getComputedStyle(document.documentElement);
    return {
        // Backgrounds
        bgPrimary: rootStyle.getPropertyValue('--bg-primary').trim(),
        bgWindow: rootStyle.getPropertyValue('--bg-window').trim(),
        bgWindowContent: rootStyle.getPropertyValue('--bg-window-content').trim(),
        bgButton: rootStyle.getPropertyValue('--bg-button').trim(),
        bgButtonHover: rootStyle.getPropertyValue('--bg-button-hover').trim(),
        bgInput: rootStyle.getPropertyValue('--bg-input').trim(),
        bgDropzone: rootStyle.getPropertyValue('--bg-dropzone').trim(),
        bgDropzoneDragover: rootStyle.getPropertyValue('--bg-dropzone-dragover').trim(),
        bgModalDialog: rootStyle.getPropertyValue('--bg-modal-dialog').trim(),

        // Text Colors
        textPrimary: rootStyle.getPropertyValue('--text-primary').trim(),
        textSecondary: rootStyle.getPropertyValue('--text-secondary').trim(),
        textButton: rootStyle.getPropertyValue('--text-button').trim(),
        textButtonHover: rootStyle.getPropertyValue('--text-button-hover').trim(),
        textDropzone: rootStyle.getPropertyValue('--text-dropzone').trim(),
        textDropzoneDragover: rootStyle.getPropertyValue('--text-dropzone-dragover').trim(),
        
        // Borders
        borderPrimary: rootStyle.getPropertyValue('--border-primary').trim(),
        borderButton: rootStyle.getPropertyValue('--border-button').trim(),
        borderDropzone: rootStyle.getPropertyValue('--border-dropzone').trim(),
        borderDropzoneDragover: rootStyle.getPropertyValue('--border-dropzone-dragover').trim(),

        // Accents (for active states)
        accentFocus: rootStyle.getPropertyValue('--accent-focus').trim(),
        accentMuted: rootStyle.getPropertyValue('--accent-muted').trim(),
        accentMutedText: rootStyle.getPropertyValue('--accent-muted-text').trim(),
        accentSoloed: rootStyle.getPropertyValue('--accent-soloed').trim(),
        accentSoloedText: rootStyle.getPropertyValue('--accent-soloed-text').trim(),
        accentArmed: rootStyle.getPropertyValue('--accent-armed').trim(),
        accentArmedText: rootStyle.getPropertyValue('--accent-armed-text').trim(),
        accentActive: rootStyle.getPropertyValue('--accent-active').trim(),
        accentActiveText: rootStyle.getPropertyValue('--accent-active-text').trim(),
        errorBg: 'var(--bg-error, #fee2e2)', // Example with fallback
        errorText: 'var(--text-error, #b91c1c)', // Example with fallback
        panelBg: 'var(--bg-panel, var(--bg-window-content))', // Use existing panel background
        panelBorder: 'var(--border-panel, var(--border-primary))',
        gray200: 'var(--gray-200, #e5e7eb)', // Assuming Tailwind's gray levels are mapped
        gray700: 'var(--gray-700, #374151)',
        gray500: 'var(--gray-500, #6b7280)',
        red500: 'var(--red-500, #ef4444)',
        red600: 'var(--red-600, #dc2626)',
        blue500: 'var(--blue-500, #3b82f6)',
        blue600: 'var(--blue-600, #2563eb)',
        purple500: 'var(--purple-500, #a855f7)',
        purple600: 'var(--purple-600, #9333ea)',
    };
}
