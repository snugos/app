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

/**
 * Creates HTML for a drop zone, status-aware with consistent ID generation.
 * @param {number} trackId - The ID of the track.
 * @param {string} trackTypeHint - Type of track (e.g., 'Sampler', 'DrumSampler', 'InstrumentSampler').
 * @param {number|null} padOrSliceIndex - Index if it's for a specific pad. Null for general track samplers.
 * @param {object|null} audioData - The audio data object from the track (e.g., track.samplerAudioData or padData) which contains fileName and status.
 * @returns {string} HTML string for the drop zone.
 */
export function createDropZoneHTML(trackId, trackTypeHint, padOrSliceIndex = null, audioData = null) {
    const indexSuffix = (padOrSliceIndex !== null && padOrSliceIndex !== undefined) ? `-${padOrSliceIndex}` : '-null';
    const inputId = `fileInput-${trackId}-${trackTypeHint}${indexSuffix}`;
    const dropZoneId = `dropZone-${trackId}-${trackTypeHint.toLowerCase()}${indexSuffix}`;
    const relinkButtonId = `relinkFileBtn-${trackId}-${trackTypeHint}${indexSuffix}`;

    let dataAttributes = `data-track-id="${trackId}" data-track-type="${trackTypeHint}"`;
    if (padOrSliceIndex !== null && padOrSliceIndex !== undefined) {
        dataAttributes += ` data-pad-slice-index="${padOrSliceIndex}"`;
    }

    let content = '';
    const fileName = audioData?.fileName || 'Unknown File';
    const status = audioData?.status || 'empty';

    let displayText = fileName.length > 20 ? `${fileName.substring(0, 18)}...` : fileName;

    switch (status) {
        case 'loaded':
            content = `Loaded: ${displayText}<br>
                       <label for="${inputId}" class="text-blue-600 hover:text-blue-800 underline cursor-pointer">Replace</label>`;
            break;
        case 'missing':
            content = `<span class="text-red-500 font-semibold">MISSING: ${displayText}</span><br>
                       <div class="drop-zone-relink-container mt-1">
                           <button id="${relinkButtonId}" class="text-xs bg-orange-500 hover:bg-orange-600 text-white py-0.5 px-1.5 rounded drop-zone-relink-button">Relink/Upload</button>
                       </div>`;
            break;
        case 'pending':
            content = `<span class="text-gray-500">Loading: ${displayText}...</span>`;
            break;
        case 'empty':
        default:
            content = `Drag & Drop Audio File or <br>
                       <label for="${inputId}" class="text-blue-600 hover:text-blue-800 underline cursor-pointer">Click to Upload</label>`;
            break;
    }

    return `
        <div class="drop-zone p-2 text-center border-2 border-dashed border-gray-400 rounded-md bg-gray-50 hover:border-blue-400" id="${dropZoneId}" ${dataAttributes} title="${fileName}">
            ${content}
            <input type="file" id="${inputId}" accept="audio/*" class="hidden">
        </div>`.trim();
}

export function setupDropZoneListeners(dropZoneElement, trackId, trackTypeHint, padIndexOrSliceId = null, loadSoundCallback, loadFileCallback) {
    if (!dropZoneElement) {
        console.error("[Utils] setupDropZoneListeners: dropZoneElement is null for trackId:", trackId, "type:", trackTypeHint, "pad/slice:", padIndexOrSliceId);
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

        const dzTrackId = dropZoneElement.dataset.trackId ? parseInt(dropZoneElement.dataset.trackId) : trackId;
        const dzTrackType = dropZoneElement.dataset.trackType || trackTypeHint;
        const dzPadSliceIndexStr = dropZoneElement.dataset.padSliceIndex;

        let numericIndexForCallback = null;
        if (dzPadSliceIndexStr !== undefined && dzPadSliceIndexStr !== null && dzPadSliceIndexStr !== "null" && !isNaN(parseInt(dzPadSliceIndexStr))) {
            numericIndexForCallback = parseInt(dzPadSliceIndexStr);
        } else if (typeof padIndexOrSliceId === 'number' && !isNaN(padIndexOrSliceId)) {
            numericIndexForCallback = padIndexOrSliceId;
        }

        const soundDataString = event.dataTransfer.getData("application/json");

        if (soundDataString) {
            try {
                const soundData = JSON.parse(soundDataString);
                if (loadSoundCallback) {
                    await loadSoundCallback(soundData, dzTrackId, dzTrackType, numericIndexForCallback);
                }
            } catch (e) {
                console.error("[Utils] Error parsing dropped sound data:", e);
                showNotification("Error processing dropped sound.", 3000);
            }
        } else if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0];
            const simulatedEvent = { target: { files: [file] } };
            if (loadFileCallback) {
                if (dzTrackType === 'DrumSampler') {
                    const finalPadIndex = (typeof numericIndexForCallback === 'number' && !isNaN(numericIndexForCallback))
                        ? numericIndexForCallback
                        : ( (typeof window.getTrackById === 'function' ? window.getTrackById(dzTrackId)?.selectedDrumPadForEdit : 0) || 0);
                    await loadFileCallback(simulatedEvent, dzTrackId, finalPadIndex, file.name);
                } else if (dzTrackType === 'Sampler' || dzTrackType === 'InstrumentSampler') {
                    await loadFileCallback(simulatedEvent, dzTrackId, dzTrackType, file.name);
                } else {
                    console.warn(`[Utils] Unhandled trackType "${dzTrackType}" for OS file drop with loadFileCallback.`);
                }
            }
        }
    });
}

export function secondsToBBSTime(seconds) {
    if (typeof Tone === 'undefined' || seconds === null || seconds === undefined || isNaN(seconds)) {
        return "0:0:0";
    }
    try {
        return Tone.Time(seconds).toBarsBeatsSixteenths();
    } catch (e) {
        console.error("Error converting seconds to B:B:S:", e);
        return "0:0:0";
    }
}

export function bbsTimeToSeconds(bbsString) {
    if (typeof Tone === 'undefined' || !bbsString || typeof bbsString !== 'string') {
        return null;
    }
    try {
        const seconds = Tone.Time(bbsString).toSeconds();
        return isNaN(seconds) ? null : seconds;
    } catch (e) {
        console.error("Error converting B:B:S to seconds:", bbsString, e);
        return null;
    }
}
