// js/utils.js - Utility Functions Module

// --- Notification System ---
export function showNotification(message, duration = 3000) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) {
        console.warn("Notification area not found. Message:", message);
        return;
    }
    const notification = document.createElement('div');
    notification.className = 'notification-message';
    notification.textContent = message;
    notificationArea.appendChild(notification);
    // Trigger the animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10); // Small delay to ensure the element is in the DOM for transition

    // Remove the notification after the duration
    setTimeout(() => {
        notification.classList.remove('show');
        // Remove the element from DOM after transition out
        setTimeout(() => {
            if (notification.parentElement) {
                notificationArea.removeChild(notification);
            }
        }, 300); // Matches CSS transition duration
    }, duration);
}


// --- Custom Confirmation Modal ---
export function showCustomModal(title, contentHTML, buttonsConfig, modalClass = '') {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
        console.error("Modal container not found!");
        return null;
    }

    // Remove any existing modal first
    if (modalContainer.firstChild) {
        modalContainer.firstChild.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const dialog = document.createElement('div');
    dialog.className = `modal-dialog ${modalClass}`; // Apply any custom class

    const titleBar = document.createElement('div');
    titleBar.className = 'modal-title-bar';
    titleBar.textContent = title || 'Dialog'; // Default title
    dialog.appendChild(titleBar);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'modal-content';
    if (typeof contentHTML === 'string') {
        contentDiv.innerHTML = contentHTML;
    } else if (contentHTML instanceof HTMLElement) {
        contentDiv.appendChild(contentHTML);
    }
    dialog.appendChild(contentDiv);

    if (buttonsConfig && buttonsConfig.length > 0) {
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'modal-buttons';
        buttonsConfig.forEach(btnConfig => {
            const button = document.createElement('button');
            button.textContent = btnConfig.text;
            button.onclick = () => {
                if (btnConfig.action) {
                    btnConfig.action();
                }
                // Close modal by default unless specified otherwise
                if (btnConfig.closesModal !== false) {
                    overlay.remove();
                }
            };
            buttonsDiv.appendChild(button);
        });
        dialog.appendChild(buttonsDiv);
    }

    overlay.appendChild(dialog);
    modalContainer.appendChild(overlay);

    // Focus the first button if available
    const firstButton = dialog.querySelector('.modal-buttons button');
    if (firstButton) {
        firstButton.focus();
    }

    return { overlay, dialog, contentDiv }; // Return references if needed
}

export function showConfirmationDialog(title, message, onConfirm, onCancel = null) {
    const buttons = [
        { text: 'OK', action: onConfirm },
        { text: 'Cancel', action: onCancel } // onCancel can be null, modal will still close
    ];
    showCustomModal(title, message, buttons);
}


// --- Drop Zone Utilities ---
export function createDropZoneHTML(trackId, inputId, trackTypeHintForLoad, padOrSliceIndex = null) {
    const dropZoneId = `dropZone-${trackId}-${trackTypeHintForLoad.toLowerCase()}${padOrSliceIndex !== null ? '-' + padOrSliceIndex : ''}`;
    let dataAttributes = `data-track-id="${trackId}" data-track-type="${trackTypeHintForLoad}"`;
    if (padOrSliceIndex !== null) {
        dataAttributes += ` data-pad-slice-index="${padOrSliceIndex}"`;
    }

    return `
        <div class="drop-zone" id="${dropZoneId}" ${dataAttributes}>
            Drag & Drop Audio File or <br>
            <label for="${inputId}" class="text-blue-600 hover:text-blue-800 underline cursor-pointer">Click to Upload</label>
            <input type="file" id="${inputId}" accept="audio/*" class="hidden">
        </div>`;
}

export function setupDropZoneListeners(dropZoneElement, trackId, trackTypeHint, padIndexOrSliceId = null, loadSoundCallback, loadFileCallback) {
    if (!dropZoneElement) {
        console.error("[Utils] setupDropZoneListeners: dropZoneElement is null for trackId:", trackId, "type:", trackTypeHint);
        return;
    }
    // console.log(`[Utils] Setting up drop zone listeners for: ${dropZoneElement.id}`);

    dropZoneElement.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropZoneElement.classList.add('dragover');
        event.dataTransfer.dropEffect = "copy";
    });

    dropZoneElement.addEventListener('dragleave', (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropZoneElement.classList.remove('dragover');
    });

    dropZoneElement.addEventListener('drop', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropZoneElement.classList.remove('dragover');

        // console.log(`[Utils] Drop event on: ${dropZoneElement.id}. Target:`, event.target, "CurrentTarget:", event.currentTarget);
        // console.log("[Utils] Drop Zone Dataset:", JSON.parse(JSON.stringify(dropZoneElement.dataset)));

        const dzTrackId = dropZoneElement.dataset.trackId ? parseInt(dropZoneElement.dataset.trackId) : trackId;
        const dzTrackType = dropZoneElement.dataset.trackType || trackTypeHint;
        const dzPadSliceIndexStr = dropZoneElement.dataset.padSliceIndex;
        const dzPadSliceIndex = dzPadSliceIndexStr !== undefined && dzPadSliceIndexStr !== null && dzPadSliceIndexStr !== "null" ? parseInt(dzPadSliceIndexStr) : padIndexOrSliceId;


        // console.log(`[Utils] Using effective params: trackId=${dzTrackId}, type=${dzTrackType}, index=${dzPadSliceIndex}`);

        const soundDataString = event.dataTransfer.getData("application/json");

        if (soundDataString) {
            // console.log("[Utils] Dropped JSON data (from sound browser):", soundDataString);
            try {
                const soundData = JSON.parse(soundDataString);
                if (loadSoundCallback) {
                    // console.log("[Utils] Calling loadSoundCallback (from sound browser).");
                    await loadSoundCallback(soundData, dzTrackId, dzTrackType, dzPadSliceIndex);
                } else {
                    console.warn("[Utils] loadSoundCallback not provided for sound browser drop.");
                }
            } catch (e) {
                console.error("[Utils] Error parsing dropped sound data:", e);
                showNotification("Error processing dropped sound.", 3000);
            }
        } else if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0];
            // console.log("[Utils] Dropped OS file:", file.name, "Type:", file.type);
            const simulatedEvent = { target: { files: [file] } };
            if (loadFileCallback) {
                // console.log("[Utils] Calling loadFileCallback (from OS file drop). Callback name:", loadFileCallback.name);
                await loadFileCallback(simulatedEvent, dzTrackId, dzTrackType, dzPadSliceIndex);
            } else {
                 console.warn("[Utils] loadFileCallback not provided for OS file drop.");
            }
        } else {
            // This is where line 152 from the error message would be if the above conditions are false.
            // It's just a console.log, so it's highly unlikely to be the source of a SyntaxError itself.
            // The error is almost certainly happening *before* this line is reached,
            // or due to how the file is being processed by the browser's JS engine.
            console.log("[Utils] Drop event with no recognized data (JSON or files).");
        }
    });
}
