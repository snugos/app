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
    // Trigger the transition
    setTimeout(() => {
        notification.classList.add('show');
    }, 10); // Small delay to ensure transition occurs

    // Remove after duration
    setTimeout(() => {
        notification.classList.remove('show');
        // Remove from DOM after transition
        setTimeout(() => {
            if (notification.parentElement) {
                notificationArea.removeChild(notification);
            }
        }, 300); // Match CSS transition duration
    }, duration);
}

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
                if (btnConfig.closesModal !== false) overlay.remove(); // Default to close unless specified
            };
            buttonsDiv.appendChild(button);
        });
        dialog.appendChild(buttonsDiv);
    }

    overlay.appendChild(dialog);
    modalContainer.appendChild(overlay);

    // Focus the first button if available
    const firstButton = dialog.querySelector('.modal-buttons button');
    if (firstButton) firstButton.focus();

    return { overlay, dialog, contentDiv };
}


export function showConfirmationDialog(title, message, onConfirm, onCancel = null) {
    const buttons = [
        { text: 'OK', action: onConfirm },
        { text: 'Cancel', action: onCancel }
    ];
    showCustomModal(title, `<p>${message}</p>`, buttons);
}


export function createDropZoneHTML(trackId, inputId, trackTypeHintForLoad, padOrSliceIndex = null, existingAudioData = null) {
    const indexString = (padOrSliceIndex !== null && padOrSliceIndex !== undefined) ? `-${padOrSliceIndex}` : '';
    const dropZoneId = `dropZone-${trackId}-${trackTypeHintForLoad.toLowerCase()}${indexString}`;

    let dataAttributes = `data-track-id="${trackId}" data-track-type="${trackTypeHintForLoad}"`;
    if (padOrSliceIndex !== null && padOrSliceIndex !== undefined) {
        dataAttributes += ` data-pad-slice-index="${padOrSliceIndex}"`;
    }

    let currentFileText = 'Drag & Drop Audio File or <br>';
    let relinkButtonHTML = '';
    let statusClass = ''; // This class (.drop-zone-missing, .drop-zone-error, .drop-zone-loading) is from your existing style.css

    if (existingAudioData) {
        if (existingAudioData.status === 'loaded' && existingAudioData.originalFileName) {
            currentFileText = `Loaded: ${existingAudioData.originalFileName.substring(0,20)}${existingAudioData.originalFileName.length > 20 ? '...' : ''}<br>`;
        } else if (existingAudioData.status === 'missing' || existingAudioData.status === 'missing_db') {
            currentFileText = `Missing: ${existingAudioData.originalFileName || 'Unknown File'}<br>`;
            statusClass = 'drop-zone-missing'; // This class is from your style.css
            relinkButtonHTML = `<button class="drop-zone-button drop-zone-button-yellow">Relink</button>`;
        } else if (existingAudioData.status === 'error') {
            currentFileText = `Error Loading: ${existingAudioData.originalFileName || 'Unknown File'}<br>`;
            statusClass = 'drop-zone-error'; // This class is from your style.css
            relinkButtonHTML = `<button class="drop-zone-button drop-zone-button-red">Retry Load</button>`;
        } else if (existingAudioData.status === 'loading') {
             currentFileText = `Loading: ${existingAudioData.originalFileName || 'Sample'}...<br>`;
             statusClass = 'drop-zone-loading'; // This class is from your style.css
        }
    }

    return `
        <div class="drop-zone ${statusClass}" id="${dropZoneId}" ${dataAttributes}>
            ${currentFileText}
            <label for="${inputId}" class="drop-zone-upload-label">Click to Upload</label>
            <input type="file" id="${inputId}" accept="audio/*" class="utils-hidden drop-zone-file-input">
            ${relinkButtonHTML}
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
        
        console.log(`[Utils] Drop event TRIGGERED on element ID: ${dropZoneElement.id}, Classes: ${dropZoneElement.className}. Dataset:`, JSON.parse(JSON.stringify(dropZoneElement.dataset)));

        const dzTrackId = dropZoneElement.dataset.trackId ? parseInt(dropZoneElement.dataset.trackId) : trackId;
        const dzTrackType = dropZoneElement.dataset.trackType || trackTypeHint;
        const dzPadSliceIndexStr = dropZoneElement.dataset.padSliceIndex;
        
        let numericIndexForCallback = null;
        if (dzPadSliceIndexStr !== undefined && dzPadSliceIndexStr !== null && dzPadSliceIndexStr !== "null" && !isNaN(parseInt(dzPadSliceIndexStr))) {
            numericIndexForCallback = parseInt(dzPadSliceIndexStr);
        } else if (typeof padIndexOrSliceId === 'number' && !isNaN(padIndexOrSliceId)) {
            numericIndexForCallback = padIndexOrSliceId;
        }
        console.log(`[Utils] Drop effective params: trackId=${dzTrackId}, type=${dzTrackType}, indexForCallback=${numericIndexForCallback} (Original dzPadSliceIndexStr: "${dzPadSliceIndexStr}", arg padIndexOrSliceId: ${padIndexOrSliceId})`);


        const soundDataString = event.dataTransfer.getData("application/json");

        if (soundDataString) { // From Sound Browser
            console.log("[Utils] Dropped JSON data (from sound browser):", soundDataString);
            try {
                const soundData = JSON.parse(soundDataString);
                if (loadSoundCallback) { 
                    console.log(`[Utils] Calling loadSoundCallback for Sound Browser drop. Target index: ${numericIndexForCallback}`);
                    await loadSoundCallback(soundData, dzTrackId, dzTrackType, numericIndexForCallback);
                } else {
                    console.warn("[Utils] loadSoundCallback not provided for sound browser drop.");
                }
            } catch (e) {
                console.error("[Utils] Error parsing dropped sound data:", e);
                showNotification("Error processing dropped sound.", 3000);
            }
        } else if (event.dataTransfer.files && event.dataTransfer.files.length > 0) { // OS File Drop
            const file = event.dataTransfer.files[0];
            console.log("[Utils] Dropped OS file:", file.name, "Type:", file.type);
            const simulatedEvent = { target: { files: [file] } }; // Simulate file input event
            if (loadFileCallback) {
                console.log("[Utils] Calling loadFileCallback for OS file drop. Callback name:", loadFileCallback.name);
                if (dzTrackType === 'DrumSampler') {
                    const trackForFallback = typeof window.getTrackById === 'function' ? window.getTrackById(dzTrackId) : null;
                    const finalPadIndex = (typeof numericIndexForCallback === 'number' && !isNaN(numericIndexForCallback))
                        ? numericIndexForCallback
                        : ( (trackForFallback ? trackForFallback.selectedDrumPadForEdit : 0) || 0); // Ensure a number
                    console.log(`[Utils] OS Drop on DrumSampler: trackId=${dzTrackId}, finalPadIndex=${finalPadIndex}, fileName=${file.name}`);
                    await loadFileCallback(simulatedEvent, dzTrackId, finalPadIndex, file.name);
                } else if (dzTrackType === 'Sampler' || dzTrackType === 'InstrumentSampler') {
                    console.log(`[Utils] OS Drop on ${dzTrackType}: trackId=${dzTrackId}, trackTypeHint=${dzTrackType}, fileName=${file.name}`);
                    await loadFileCallback(simulatedEvent, dzTrackId, dzTrackType, file.name);
                } else {
                    console.warn(`[Utils] Unhandled trackType "${dzTrackType}" for OS file drop with loadFileCallback.`);
                }
            } else {
                 console.warn("[Utils] loadFileCallback not provided for OS file drop.");
            }
        } else {
            console.log("[Utils] Drop event with no recognized data (JSON or files).");
        }
    });
}

/**
 * Converts seconds to "Bars:Beats:Sixteenths" string format.
 * Example: 2.5 seconds at 120 BPM, 4/4 time might become "1:1:0" (Bar 1, Beat 1, 0 Sixteenths).
 * @param {number} seconds - The time in seconds.
 * @returns {string} Time in "B:B:S" format.
 */
export function secondsToBBSTime(seconds) {
    if (typeof Tone === 'undefined' || seconds === null || seconds === undefined || isNaN(seconds)) {
        return "0:0:0";
    }
    try {
        // Tone.Time can take seconds as a number and convert it.
        // .toBarsBeatsSixteenths() is a convenient method.
        return Tone.Time(seconds).toBarsBeatsSixteenths();
    } catch (e) {
        console.error("Error converting seconds to B:B:S:", e);
        return "0:0:0"; // Fallback
    }
}

/**
 * Converts a "Bars:Beats:Sixteenths" string (e.g., "1:2:0") to seconds.
 * @param {string} bbsString - Time in "B:B:S" format.
 * @returns {number} Time in seconds, or null if parsing fails.
 */
export function bbsTimeToSeconds(bbsString) {
    if (typeof Tone === 'undefined' || !bbsString || typeof bbsString !== 'string') {
        return null;
    }
    try {
        // Tone.Time can parse "B:B:S" strings.
        const seconds = Tone.Time(bbsString).toSeconds();
        return isNaN(seconds) ? null : seconds;
    } catch (e) {
        console.error("Error converting B:B:S to seconds:", bbsString, e);
        return null; // Parsing failed
    }
}
