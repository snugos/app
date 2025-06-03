// js/utils.js - Utility Functions Module (MODIFIED)

export function showNotification(message, typeOrDuration = 'info', durationIfTypeProvided = 3000) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) {
        console.error("CRITICAL: Notification area ('notification-area') not found in DOM. Message:", message);
        alert(`Notification: ${message}`); // Fallback
        return;
    }

    let type = 'info';
    let duration = 3000;

    if (typeof typeOrDuration === 'string' && ['info', 'success', 'warning', 'error'].includes(typeOrDuration)) {
        type = typeOrDuration;
        duration = typeof durationIfTypeProvided === 'number' ? durationIfTypeProvided : 3000;
    } else if (typeof typeOrDuration === 'number') {
        duration = typeOrDuration;
        // type remains 'info'
    }


    try {
        const notification = document.createElement('div');
        notification.className = 'notification-message p-3 rounded-md shadow-lg text-sm mb-2 border-l-4';
        
        // Apply styles based on type
        switch (type) {
            case 'success':
                notification.classList.add('bg-green-500', 'border-green-700', 'text-white');
                break;
            case 'warning':
                notification.classList.add('bg-yellow-500', 'border-yellow-700', 'text-black');
                break;
            case 'error':
                notification.classList.add('bg-red-500', 'border-red-700', 'text-white');
                break;
            case 'info':
            default:
                notification.classList.add('bg-blue-500', 'border-blue-700', 'text-white');
                break;
        }
        
        notification.textContent = message;
        // Prepend so new notifications appear at the top
        if (notificationArea.firstChild) {
            notificationArea.insertBefore(notification, notificationArea.firstChild);
        } else {
            notificationArea.appendChild(notification);
        }


        setTimeout(() => {
            notification.classList.add('opacity-100', 'translate-x-0'); // For fade/slide in
            notification.classList.remove('opacity-0', 'translate-x-full');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('opacity-100', 'translate-x-0');
            notification.classList.add('opacity-0', 'translate-x-full'); // For fade/slide out
            setTimeout(() => {
                if (notification.parentElement) {
                    notificationArea.removeChild(notification);
                }
            }, 300); // Match CSS transition duration
        }, duration);
    } catch (error) {
        console.error("Error displaying notification:", error, "Message:", message);
    }
}


export function showCustomModal(title, contentHTML, buttonsConfig = [], appServices = null) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[15000]'; // Higher z-index

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]';

    const titleBar = document.createElement('div');
    titleBar.className = 'modal-title-bar p-3 border-b border-slate-600 text-white text-lg font-semibold flex justify-between items-center';
    titleBar.innerHTML = `<span>${title}</span><button class="modal-close-btn text-slate-400 hover:text-white">&times;</button>`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'modal-content-body p-4 overflow-y-auto text-slate-300';
    if (typeof contentHTML === 'string') {
        contentDiv.innerHTML = contentHTML;
    } else if (contentHTML instanceof HTMLElement) {
        contentDiv.appendChild(contentHTML);
    }

    dialog.appendChild(titleBar);
    dialog.appendChild(contentDiv);

    if (buttonsConfig && buttonsConfig.length > 0) {
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'modal-buttons p-3 border-t border-slate-600 flex justify-end space-x-2 bg-slate-750 rounded-b-lg';
        buttonsConfig.forEach(btnConfig => {
            const button = document.createElement('button');
            button.textContent = btnConfig.text;
            button.className = `px-4 py-1.5 rounded-md text-sm font-medium ${btnConfig.classes || 'bg-blue-600 hover:bg-blue-500 text-white'}`;
            button.addEventListener('click', (e) => {
                if (btnConfig.action) btnConfig.action(e, { overlay, dialog, contentDiv });
                // Default behavior: close modal unless action returns false
                if (btnConfig.action === undefined || btnConfig.action(e, { overlay, dialog, contentDiv }) !== false) {
                     if (overlay.parentElement) overlay.remove();
                }
            });
            buttonsDiv.appendChild(button);
        });
        dialog.appendChild(buttonsDiv);
    }

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const closeAndRemove = () => {
        if (overlay.parentElement) overlay.remove();
    };
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeAndRemove(); // Click outside dialog closes
    });
    titleBar.querySelector('.modal-close-btn').addEventListener('click', closeAndRemove);
    
    // Focus first focusable element in the modal (e.g., first button or input)
    const firstFocusable = dialog.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if(firstFocusable) firstFocusable.focus();

    return { overlay, dialog, contentDiv };
}

export function showConfirmationDialog(message, onConfirm, onCancel = null, appServices = null) {
    const content = `<p class="text-sm">${message}</p>`;
    const buttons = [
        { text: 'Cancel', action: (e, modalElements) => { if (onCancel) onCancel(); modalElements.overlay.remove(); }, classes: 'bg-slate-600 hover:bg-slate-500 text-white' },
        { text: 'Confirm', action: (e, modalElements) => { if (onConfirm) onConfirm(); modalElements.overlay.remove(); }, classes: 'bg-red-600 hover:bg-red-500 text-white' }
    ];
    return showCustomModal('Confirmation', content, buttons, appServices);
}

export function createDropZoneHTML(id, labelText = 'Drop files here or click to upload') {
    return `
        <div id="${id}" class="drop-zone p-4 border-2 border-dashed border-slate-600 rounded-md text-center text-slate-400 hover:border-blue-500 hover:text-blue-400 cursor-pointer">
            <i class="fas fa-upload text-2xl mb-2"></i>
            <p class="text-xs">${labelText}</p>
        </div>
    `;
}

export function setupGenericDropZoneListeners(dropZoneElement, onFileDropped, fileInputId = null, appServices = null) {
    if (!dropZoneElement) return;

    dropZoneElement.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZoneElement.classList.add('border-blue-500', 'bg-slate-700');
        event.dataTransfer.dropEffect = 'copy';
    });
    dropZoneElement.addEventListener('dragleave', () => {
        dropZoneElement.classList.remove('border-blue-500', 'bg-slate-700');
    });
    dropZoneElement.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZoneElement.classList.remove('border-blue-500', 'bg-slate-700');
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            onFileDropped(event.dataTransfer.files[0]); // Handle first file dropped
        }
    });

    if (fileInputId) { // If a file input ID is provided, also trigger it on click
        dropZoneElement.addEventListener('click', () => {
            let inputEl = document.getElementById(fileInputId);
            if (!inputEl) { // Dynamically create if not exists
                inputEl = document.createElement('input');
                inputEl.type = 'file';
                inputEl.id = fileInputId;
                inputEl.className = 'hidden';
                document.body.appendChild(inputEl); // Append to body to ensure it's interactable
                inputEl.addEventListener('change', (event) => {
                    if (event.target.files && event.target.files.length > 0) {
                        onFileDropped(event.target.files[0]);
                    }
                     inputEl.value = ''; // Reset for next selection
                });
            }
            inputEl.click();
        });
    }
}

let activeContextMenu = null;
export function createContextMenu(event, menuItems = [], appServices = null) {
    event.preventDefault();
    event.stopPropagation();

    if (activeContextMenu) {
        try { activeContextMenu.remove(); } catch (e) {/* ignore */}
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu absolute bg-slate-800 border border-slate-700 rounded-md shadow-lg py-1 z-[20000]'; // High z-index

    const ul = document.createElement('ul');
    menuItems.forEach(item => {
        if (item.separator) {
            const li = document.createElement('li');
            li.className = 'context-menu-separator border-t border-slate-600 my-1';
            ul.appendChild(li);
            return;
        }
        const li = document.createElement('li');
        li.className = `context-menu-item px-3 py-1.5 text-sm text-slate-300 hover:bg-blue-600 hover:text-white cursor-pointer ${item.disabled ? 'opacity-50 cursor-default !bg-transparent !text-slate-500' : ''}`;
        li.textContent = item.label;
        if (!item.disabled) {
            li.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent click from closing parent windows immediately
                if (typeof item.action === 'function') {
                    try {
                        item.action();
                    } catch (actionError) {
                        console.error("Error in context menu action:", actionError);
                        if(appServices && appServices.showNotification) appServices.showNotification("Error executing action.", "error");
                    }
                }
                if (activeContextMenu) {
                    try { activeContextMenu.remove(); } catch (e) {/* ignore */}
                    activeContextMenu = null;
                }
            });
        }
        ul.appendChild(li);
    });
    menu.appendChild(ul);
    document.body.appendChild(menu);
    activeContextMenu = menu;

    // Position the menu
    const { clientX: mouseX, clientY: mouseY } = event;
    const { innerWidth, innerHeight } = window;
    const menuRect = menu.getBoundingClientRect();
    let x = mouseX;
    let y = mouseY;

    if (mouseX + menuRect.width > innerWidth) {
        x = innerWidth - menuRect.width - 5; // 5px padding from edge
    }
    if (mouseY + menuRect.height > innerHeight) {
        y = innerHeight - menuRect.height - 5;
    }
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // Close listeners
    const closeListener = (e) => {
        if (activeContextMenu && (!menu.contains(e.target) || (e.type === 'contextmenu' && e.target !== menu && !menu.contains(e.target)))) {
            try { activeContextMenu.remove(); } catch (e) {/* ignore */}
            activeContextMenu = null;
            document.removeEventListener('click', closeListener, { capture: true });
            document.removeEventListener('contextmenu', closeListener, { capture: true });
            window.removeEventListener('blur', closeListenerBlur);
        }
    };
    const closeListenerBlur = () => {
        if (activeContextMenu) {
             try { activeContextMenu.remove(); } catch (e) {/* ignore */}
            activeContextMenu = null;
            document.removeEventListener('click', closeListener, { capture: true });
            document.removeEventListener('contextmenu', closeListener, { capture: true });
            window.removeEventListener('blur', closeListenerBlur);
        }
    };

    setTimeout(() => { // Add listeners after current event bubble phase
        document.addEventListener('click', closeListener, { capture: true });
        document.addEventListener('contextmenu', closeListener, { capture: true });
        window.addEventListener('blur', closeListenerBlur);
    }, 0);

    return menu;
}


/**
 * Snaps a given time (in seconds) to the nearest grid subdivision.
 * @param {number} timeInSeconds - The time to snap.
 * @param {number} bpm - The current beats per minute.
 * @param {number} pixelsPerSecond - Timeline resolution, used if snapping duration visually.
 * @param {boolean} forDuration - If true, snaps to a duration, not just a time point.
 * @param {string} subdivision - The subdivision to snap to (e.g., '16n', '8n', 'bar'). Default '16n'.
 * @returns {number} The snapped time in seconds.
 */
export function snapTimeToGrid(timeInSeconds, bpm, pixelsPerSecond = 30, forDuration = false, subdivision = '16n') {
    if (!isFinite(timeInSeconds) || !isFinite(bpm) || bpm <=0 ) {
        return timeInSeconds; // Invalid input, return original
    }

    // Convert subdivision to seconds
    // Tone.Time can convert musical notation to seconds relative to the Transport's BPM.
    const subdivisionSeconds = Tone.Time(subdivision).toSeconds();

    if (subdivisionSeconds <= 0) {
        return timeInSeconds; // Invalid subdivision
    }

    const snappedTime = Math.round(timeInSeconds / subdivisionSeconds) * subdivisionSeconds;
    
    // For durations, ensure it's not zero if original was not.
    if (forDuration && snappedTime === 0 && timeInSeconds > (subdivisionSeconds / 2)) {
        return subdivisionSeconds;
    }
    return parseFloat(snappedTime.toFixed(5)); // Return with some precision
}
