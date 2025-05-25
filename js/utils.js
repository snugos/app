// js/utils.js - Utility Functions Module

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
}

export function showCustomModal(title, contentHTML, buttonsConfig, modalClass = '') {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
        console.error("Modal container not found!");
        return null;
    }
    if (modalContainer.firstChild) {
        modalContainer.firstChild.remove();
    }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const dialog = document.createElement('div');
    dialog.className = `modal-dialog ${modalClass}`;
    const titleBar = document.createElement('div');
    titleBar.className = 'modal-title-bar';
    titleBar.textContent = title || 'Dialog';
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
                if (btnConfig.action) btnConfig.action();
                if (btnConfig.closesModal !== false) overlay.remove();
            };
            buttonsDiv.appendChild(button);
        });
        dialog.appendChild(buttonsDiv);
    }
    overlay.appendChild(dialog);
    modalContainer.appendChild(overlay);
    const firstButton = dialog.querySelector('.modal-buttons button');
    if (firstButton) firstButton.focus();
    return { overlay, dialog, contentDiv };
}

export function showConfirmationDialog(title, message, onConfirm, onCancel = null) {
    const buttons = [
        { text: 'OK', action: onConfirm },
        { text: 'Cancel', action: onCancel }
    ];
    showCustomModal(title, message, buttons);
}

export function createDropZoneHTML(trackId, inputId, trackTypeHintForLoad, padOrSliceIndex = null) {
    const dropZoneId = `dropZone-${trackId}-${trackTypeHintForLoad.toLowerCase()}${padOrSliceIndex !== null ? '-' + padOrSliceIndex : ''}`;
    let dataAttributes = `data-track-id="${trackId}" data-track-type="${trackTypeHintForLoad}"`;
    if (padOrSliceIndex !== null) {
        dataAttributes += ` data-pad-slice-index="${padOrSliceIndex}"`;
    }

    // Ensure the returned string is trimmed to remove leading/trailing whitespace
    return `
        <div class="drop-zone" id="${dropZoneId}" ${dataAttributes}>
            Drag & Drop Audio File or <br>
            <label for="${inputId}" class="text-blue-600 hover:text-blue-800 underline cursor-pointer">Click to Upload</label>
            <input type="file" id="${inputId}" accept="audio/*" class="hidden">
        </div>`.trim();
}

export function setupDropZoneListeners(dropZoneElement, trackId, trackTypeHint, padIndexOrSliceId = null, loadSoundCallback, loadFileCallback) {
    if (!dropZoneElement) {
        console.error("[Utils] setupDropZoneListeners: dropZoneElement is null for trackId:", trackId, "type:", trackTypeHint);
        return;
    }

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
            console.log("[Utils] Drop event with no recognized data (JSON or files).");
        }
    });
}
