// js/utils.js - Utility Functions Module

function showNotification(message, duration = 3000) {
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

function showCustomModal(title, contentHTML, buttonsConfig = []) {
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

// NEW: Basic implementation for showConfirmationDialog
function showConfirmationDialog(title, message, onConfirm, onCancel = null) {
    const buttons = [
        {
            label: 'Cancel',
            action: () => {
                if (onCancel) onCancel();
            }
        },
        {
            label: 'Confirm',
            action: () => {
                onConfirm();
            }
        }
    ];
    showCustomModal(title, `<p class="p-4">${message}</p>`, buttons);
}


function createContextMenu(event, menuItems, appServices) {
    // Remove any existing context menus
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    const ul = document.createElement('ul');
    menu.appendChild(ul);

    menuItems.forEach(item => {
        if (item.separator) {
            const hr = document.createElement('hr');
            hr.className = 'context-menu-separator';
            ul.appendChild(hr);
        } else {
            const li = document.createElement('li');
            li.className = 'context-menu-item';
            li.textContent = item.label;
            if (item.disabled) {
                li.classList.add('disabled');
            } else {
                li.addEventListener('click', () => {
                    item.action();
                    menu.remove(); // Close menu after action
                });
            }
            ul.appendChild(li);
        }
    });

    // Close menu when clicking outside
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
            document.removeEventListener('contextmenu', closeMenu); // Also remove on subsequent right-clicks
        }
    };
    document.addEventListener('click', closeMenu);
    document.addEventListener('contextmenu', closeMenu); // To close if another right-click happens outside

    document.body.appendChild(menu);
}


/**
 * Converts a Base64 encoded string to a Blob object.
 * @param {string} base64 - The Base64 string.
 * @param {string} contentType - The MIME type of the content.
 * @returns {Blob}
 */
function base64ToBlob(base64, contentType = 'audio/mpeg') {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
}

/**
 * Draws a waveform on a given canvas element.
 * @param {HTMLCanvasElement} canvas - The canvas element to draw on.
 * @param {AudioBuffer} audioBuffer - The AudioBuffer containing the audio data.
 * @param {string} color - The color of the waveform (default: 'black').
 */
function drawWaveform(canvas, audioBuffer, color = 'black') {
    if (!canvas || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);

    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    
    ctx.fillStyle = color;
    
    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;

        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) {
                min = datum;
            }
            if (datum > max) {
                max = datum;
            }
        }
        
        const rectHeight = Math.max(1, (max - min) * amp);
        const y = (1 + min) * amp;
        ctx.fillRect(i, y, 1, rectHeight);
    }
}


// Generic drop zone listeners for dragging files from local system or sound browser
function setupGenericDropZoneListeners(dropZoneElement, trackId, trackTypeHint, padIndex = null, loadFromSoundBrowserCallback, loadFromFileCallback) {
    dropZoneElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZoneElement.classList.add('dragover');
    });

    dropZoneElement.addEventListener('dragleave', () => {
        dropZoneElement.classList.remove('dragover');
    });

    dropZoneElement.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZoneElement.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('audio/')) {
                loadFromFileCallback(e, trackId, trackTypeHint, padIndex); // Use the callback
            } else {
                showNotification(`Unsupported file type: ${file.type}`, 3000);
            }
        } else {
            const jsonData = e.dataTransfer.getData("application/json");
            if (jsonData) {
                try {
                    const data = JSON.parse(jsonData);
                    if (data.type === 'sound-browser-item') {
                        loadFromSoundBrowserCallback(data, trackId, trackTypeHint, padIndex); // Use the callback
                    }
                } catch (jsonError) {
                    console.error("Error parsing dropped JSON data:", jsonError);
                    showNotification("Error processing dropped data.", 3000);
                }
            }
        }
    });

    // Attach click listener to trigger file input
    const fileInput = dropZoneElement.querySelector('input[type="file"]');
    if (fileInput) {
        dropZoneElement.addEventListener('click', () => fileInput.click());
    }
}

// Function to create drop zone HTML - needed in inspectorUI
function createDropZoneHTML(inputId, labelText = 'Drag & Drop Audio Here') {
    return `
        <div class="drop-zone">
            <input type="file" id="${inputId}" class="hidden" accept="audio/*">
            <p>${labelText} or <label for="${inputId}" class="cursor-pointer">click to browse</label></p>
        </div>
    `;
}
