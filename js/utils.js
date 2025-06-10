// js/utils.js - Utility Functions Module

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

export function showConfirmationDialog(title, message, onConfirm, onCancel) {
    const content = document.createElement('p');
    content.textContent = message;

    const buttons = [
        { label: 'Cancel', action: onCancel },
        { label: 'Confirm', action: onConfirm }
    ];

    showCustomModal(title, content, buttons);
}

let activeContextMenu = null;
let activeCloseListener = null;
let activeBlurListener = null;

function removeActiveContextMenuListeners() {
    if (activeCloseListener) {
        document.removeEventListener('click', activeCloseListener, { capture: true });
        document.removeEventListener('contextmenu', activeCloseListener, { capture: true });
        activeCloseListener = null;
    }
    if (activeBlurListener) {
        window.removeEventListener('blur', activeBlurListener);
        activeBlurListener = null;
    }
}

export function createContextMenu(event, menuItems, appServicesForZIndex) {
    removeActiveContextMenuListeners();
    event.preventDefault();
    event.stopPropagation();
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    const ul = document.createElement('ul');

    menuItems.forEach(item => {
        if (item.separator) {
            const li = document.createElement('li');
            li.innerHTML = '<hr>';
            ul.appendChild(li);
            return;
        }

        const li = document.createElement('li');
        li.className = 'context-menu-item';
        li.textContent = item.label;
        if (item.disabled) {
            li.classList.add('disabled');
        } else {
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                item.action();
                closeMenu();
            });
        }
        ul.appendChild(li);
    });

    menu.appendChild(ul);
    document.body.appendChild(menu);
    activeContextMenu = menu;

    const zIndex = appServicesForZIndex?.incrementHighestZ ? appServicesForZIndex.incrementHighestZ() : 10003;
    menu.style.zIndex = zIndex;

    const { clientX: mouseX, clientY: mouseY } = event;
    const { offsetWidth: menuWidth, offsetHeight: menuHeight } = menu;
    const { innerWidth: viewportWidth, innerHeight: viewportHeight } = window;

    let top = mouseY;
    let left = mouseX;

    if (mouseX + menuWidth > viewportWidth) {
        left = mouseX - menuWidth;
    }
    if (mouseY + menuHeight > viewportHeight) {
        top = mouseY - menuHeight;
    }
    menu.style.top = `${Math.max(0, top)}px`;
    menu.style.left = `${Math.max(0, left)}px`;
    
    const closeMenu = () => {
        if (activeContextMenu) {
            try {
                activeContextMenu.remove();
            } catch (removeError) { /* ignore */ }
            activeContextMenu = null;
        }
        removeActiveContextMenuListeners();
    };

    activeCloseListener = closeMenu;
    activeBlurListener = closeMenu;

    setTimeout(() => {
        document.addEventListener('click', activeCloseListener, { capture: true });
        document.addEventListener('contextmenu', activeCloseListener, { capture: true });
        window.addEventListener('blur', activeBlurListener);
    }, 0);
}

export function createDropZoneHTML(inputId, labelText = 'Drop file or click to load') {
    return `
        <div class="drop-zone" data-input-id="${inputId}">
            <p>${labelText}</p>
            <input type="file" id="${inputId}" class="hidden">
        </div>
    `;
}

// *** UPDATED to be more versatile ***
export function setupGenericDropZoneListeners(dropZoneElement, trackId, trackTypeHint, padIndex, onDropSound, onFileLoad) {
    if (!dropZoneElement) return;

    dropZoneElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneElement.classList.add('dragover');
    });

    dropZoneElement.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneElement.classList.remove('dragover');
    });

    dropZoneElement.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneElement.classList.remove('dragover');

        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            const event = { target: { files: [file] } };
            if (padIndex !== null) {
                onFileLoad(event, trackId, padIndex);
            } else {
                onFileLoad(event, trackId, trackTypeHint);
            }
        } else {
            const jsonDataString = e.dataTransfer.getData("application/json");
            if (jsonDataString) {
                const soundData = JSON.parse(jsonDataString);
                onDropSound(soundData, trackId, trackTypeHint, padIndex);
            }
        }
    });

    // Only add a click listener if the element has a data-input-id attribute
    if (dropZoneElement.dataset.inputId) {
        dropZoneElement.addEventListener('click', (e) => {
            document.getElementById(dropZoneElement.dataset.inputId)?.click();
        });
    }
}

export function drawWaveform(canvas, audioBuffer, color = '#FFFFFF') {
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
