// SnugOS - Main Application Logic
// Version 5.5.1: Updated Sound Libraries, Tutorial Removed
// Refactor Step 4: Sequencer DOM Building
console.log("SCRIPT EXECUTION STARTED - SnugOS v5.5.1 (Refactor 4)");

// --- Notification System ---
const notificationArea = document.getElementById('notification-area');
function showNotification(message, duration = 3000) {
    if (!notificationArea) return;
    const notification = document.createElement('div');
    notification.className = 'notification-message';
    notification.textContent = message;
    notificationArea.appendChild(notification);
    setTimeout(() => { notification.classList.add('show'); }, 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => { if (notification.parentElement) notificationArea.removeChild(notification); }, 300);
    }, duration);
}

// --- Custom Confirmation Modal ---
const modalContainer = document.getElementById('modalContainer');
function showCustomModal(title, contentHTML, buttonsConfig, modalClass = '') {
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
    } else {
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
function showConfirmationDialog(title, message, onConfirm, onCancel = null) {
   const buttons = [
        { text: 'OK', action: onConfirm },
        { text: 'Cancel', action: onCancel }
   ];
   showCustomModal(title, message, buttons);
}

// --- Global Variables & Initialization ---
let tracks = [];
let trackIdCounter = 0;
let activeSequencerTrackId = null;
const STEPS_PER_BAR = 16;
const defaultStepsPerBar = 16;
const synthPitches = [
    'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2',
    'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
    'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'
].reverse();
const soundLibraries = {
    "Drums": "/drums.zip",
    "Instruments": "/instruments.zip",
    "Instruments 2": "/instruments2.zip",
    "Instruments 3": "/instruments3.zip"
};
let loadedZipFiles = {};
let currentLibraryName = null;
let currentSoundFileTree = null;
let currentSoundBrowserPath = [];
let previewPlayer = null;
const numSlices = 8;
const numDrumSamplerPads = 8;
const samplerMIDINoteStart = 36; // C2
let midiAccess = null, activeMIDIInput = null, armedTrackId = null, soloedTrackId = null;
const defaultVelocity = 0.7;
const defaultDesktopBg = '#FFB6C1', defaultTaskbarBg = '#c0c0c0', defaultWindowBg = '#c0c0c0', defaultWindowContentBg = '#c0c0c0';
const computerKeySynthMap = {
    'KeyA': 60, 'KeyW': 61, 'KeyS': 62, 'KeyE': 63, 'KeyD': 64, 'KeyF': 65, 'KeyT': 66,
    'KeyG': 67, 'KeyY': 68, 'KeyH': 69, 'KeyU': 70, 'KeyJ': 71, 'KeyK': 72,
};
const computerKeySamplerMap = {
    'Digit1': samplerMIDINoteStart + 0, 'Digit2': samplerMIDINoteStart + 1, 'Digit3': samplerMIDINoteStart + 2, 'Digit4': samplerMIDINoteStart + 3,
    'Digit5': samplerMIDINoteStart + 4, 'Digit6': samplerMIDINoteStart + 5, 'Digit7': samplerMIDINoteStart + 6, 'Digit8': samplerMIDINoteStart + 7
};
let currentlyPressedComputerKeys = {};
let transportEventsInitialized = false;
let undoStack = [];
let redoStack = [];
const MAX_HISTORY_STATES = 30;
let isRecording = false;
let recordingTrackId = null;
let recordingStartTime = 0;

// --- DOM Elements ---
const desktop = document.getElementById('desktop');
const startButton = document.getElementById('startButton');
const startMenu = document.getElementById('startMenu');
const taskbarButtonsContainer = document.getElementById('taskbarButtons');
const taskbarTempoDisplay = document.getElementById('taskbarTempoDisplay');
const menuAddSynthTrack = document.getElementById('menuAddSynthTrack');
const menuAddSamplerTrack = document.getElementById('menuAddSamplerTrack');
const menuAddDrumSamplerTrack = document.getElementById('menuAddDrumSamplerTrack');
const menuAddInstrumentSamplerTrack = document.getElementById('menuAddInstrumentSamplerTrack');
const menuOpenSoundBrowser = document.getElementById('menuOpenSoundBrowser');
const menuUndo = document.getElementById('menuUndo');
const menuRedo = document.getElementById('menuRedo');
const menuSaveProject = document.getElementById('menuSaveProject');
const menuLoadProject = document.getElementById('menuLoadProject');
const menuExportWav = document.getElementById('menuExportWav');
const menuOpenGlobalControls = document.getElementById('menuOpenGlobalControls');
const menuOpenMixer = document.getElementById('menuOpenMixer');
const menuToggleFullScreen = document.getElementById('menuToggleFullScreen');
let playBtn, recordBtn, tempoInput, masterMeterBar, midiInputSelectGlobal, midiIndicatorGlobalEl, keyboardIndicatorGlobalEl;
const loadProjectInputEl = document.getElementById('loadProjectInput');
let masterMeter = null;
let openWindows = {};
let highestZIndex = 100;

// --- UI Component Creation (Knobs) ---
function createKnob(options) {
    const container = document.createElement('div');
    container.className = 'knob-container';
    const labelEl = document.createElement('div');
    labelEl.className = 'knob-label';
    labelEl.textContent = options.label || '';
    labelEl.title = options.label || '';
    container.appendChild(labelEl);
    const knobEl = document.createElement('div');
    knobEl.className = 'knob';
    const handleEl = document.createElement('div');
    handleEl.className = 'knob-handle';
    knobEl.appendChild(handleEl);
    container.appendChild(knobEl);
    const valueEl = document.createElement('div');
    valueEl.className = 'knob-value';
    container.appendChild(valueEl);
    let currentValue = options.initialValue || 0;
    const min = options.min === undefined ? 0 : options.min;
    const max = options.max === undefined ? 100 : options.max;
    const step = options.step || 1;
    const range = max - min;
    const maxDegrees = options.maxDegrees || 270;
    const BASE_PIXELS_PER_FULL_RANGE_MOUSE = 300;
    const BASE_PIXELS_PER_FULL_RANGE_TOUCH = 450;
    let initialValueBeforeInteraction = currentValue;
    function updateKnobVisual() {
        const percentage = range === 0 ? 0 : (currentValue - min) / range;
        const rotation = (percentage * maxDegrees) - (maxDegrees / 2);
        handleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        valueEl.textContent = typeof currentValue === 'number' ? currentValue.toFixed(options.decimals !== undefined ? options.decimals : (step < 1 ? 2 : 0)) : currentValue;
        if (options.displaySuffix) valueEl.textContent += options.displaySuffix;
    }
    function setValue(newValue, triggerCallback = true, fromInteraction = false) {
        const numValue = parseFloat(newValue);
        if (isNaN(numValue)) return;
        let boundedValue = Math.min(max, Math.max(min, numValue));
        if (step !== 0) {
            boundedValue = Math.round(boundedValue / step) * step;
        }
        const oldValue = currentValue;
        currentValue = Math.min(max, Math.max(min, boundedValue));
        updateKnobVisual();
        if (triggerCallback && options.onValueChange) {
            options.onValueChange(currentValue, oldValue, fromInteraction);
        }
    }
    function handleInteraction(e, isTouch = false) {
        e.preventDefault();
        initialValueBeforeInteraction = currentValue;
        const startY = isTouch ? e.touches[0].clientY : e.clientY;
        const startValue = currentValue;
        const pixelsForFullRange = isTouch ? BASE_PIXELS_PER_FULL_RANGE_TOUCH : BASE_PIXELS_PER_FULL_RANGE_MOUSE;
        const currentSensitivity = options.sensitivity === undefined ? 1 : options.sensitivity;
        function onMove(moveEvent) {
            const currentY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
            const deltaY = startY - currentY;
            let valueChange = (deltaY / pixelsForFullRange) * range * currentSensitivity;
            let newValue = startValue + valueChange;
            setValue(newValue, true, true);
        }
        function onEnd() {
            document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
            document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
            if (currentValue !== initialValueBeforeInteraction) {
                let description = `Change ${options.label || 'knob'} to ${valueEl.textContent}`;
                if (options.trackRef && options.trackRef.name) {
                    description = `Change ${options.label || 'knob'} for ${options.trackRef.name} to ${valueEl.textContent}`;
                }
                captureStateForUndo(description);
            }
        }
        document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, { passive: !isTouch });
        document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
    }
    knobEl.addEventListener('mousedown', (e) => handleInteraction(e, false));
    knobEl.addEventListener('touchstart', (e) => handleInteraction(e, true), { passive: false });
    setValue(currentValue, false);
    return { element: container, setValue, getValue: () => currentValue, type: 'knob', refreshVisuals: updateKnobVisual };
}

// --- Undo/Redo System ---
function updateUndoRedoButtons() {
    if (menuUndo) {
        menuUndo.classList.toggle('disabled', undoStack.length === 0);
        menuUndo.title = undoStack.length > 0 && undoStack[undoStack.length - 1]?.description
                         ? `Undo: ${undoStack[undoStack.length - 1].description}`
                         : 'Undo (Nothing to undo)';
    }
    if (menuRedo) {
        menuRedo.classList.toggle('disabled', redoStack.length === 0);
        menuRedo.title = redoStack.length > 0 && redoStack[redoStack.length - 1]?.description
                         ? `Redo: ${redoStack[redoStack.length - 1].description}`
                         : 'Redo (Nothing to redo)';
    }
}
function captureStateForUndo(description = "Unknown action") {
    console.log("Capturing state for undo:", description);
    try {
        const currentState = gatherProjectData();
        currentState.description = description;
        undoStack.push(JSON.parse(JSON.stringify(currentState)));
        if (undoStack.length > MAX_HISTORY_STATES) {
            undoStack.shift();
        }
        redoStack = [];
        updateUndoRedoButtons();
    } catch (error) {
        console.error("Error capturing state for undo:", error);
        showNotification("Error capturing undo state. Undo may not work correctly.", 3000);
    }
}
async function undoLastAction() {
    if (undoStack.length === 0) {
        showNotification("Nothing to undo.", 1500);
        return;
    }
    try {
        const stateToRestore = undoStack.pop();
        const currentStateForRedo = gatherProjectData();
        currentStateForRedo.description = stateToRestore.description;
        redoStack.push(JSON.parse(JSON.stringify(currentStateForRedo)));
        if (redoStack.length > MAX_HISTORY_STATES) redoStack.shift();
        showNotification(`Undoing: ${stateToRestore.description || 'last action'}...`, 2000);
        await reconstructDAW(stateToRestore, true);
        updateUndoRedoButtons();
    } catch (error) {
        console.error("Error during undo:", error);
        showNotification("Error during undo operation. Project state might be unstable.", 4000);
        updateUndoRedoButtons();
    }
}
async function redoLastAction() {
    if (redoStack.length === 0) {
        showNotification("Nothing to redo.", 1500);
        return;
    }
    try {
        const stateToRestore = redoStack.pop();
        const currentStateForUndo = gatherProjectData();
        currentStateForUndo.description = stateToRestore.description;
        undoStack.push(JSON.parse(JSON.stringify(currentStateForUndo)));
        if (undoStack.length > MAX_HISTORY_STATES) undoStack.shift();
        showNotification(`Redoing: ${stateToRestore.description || 'last action'}...`, 2000);
        await reconstructDAW(stateToRestore, true);
        updateUndoRedoButtons();
    } catch (error) {
        console.error("Error during redo:", error);
        showNotification("Error during redo operation. Project state might be unstable.", 4000);
        updateUndoRedoButtons();
    }
}

// --- Utility Functions ---
function createWindow(id, title, contentHTMLOrElement, options = {}) {
    if (openWindows[id]) {
        openWindows[id].restore();
        return openWindows[id];
    }
    const newWindow = new SnugWindow(id, title, contentHTMLOrElement, options);
    return newWindow.element ? newWindow : null;
}
function createDropZoneHTML(trackId, inputId, trackTypeHintForLoad, padOrSliceIndex = null) {
    const dropZoneId = `dropZone-${trackId}-${trackTypeHintForLoad.toLowerCase()}${padOrSliceIndex !== null ? '-' + padOrSliceIndex : ''}`;
    const dataAttributes = `data-track-id="${trackId}" data-track-type="${trackTypeHintForLoad}" ${padOrSliceIndex !== null ? `data-pad-slice-index="${padOrSliceIndex}"` : ''}`;
    return `
        <div class="drop-zone" id="${dropZoneId}" ${dataAttributes}>
            Drag & Drop Audio File or <br>
            <label for="${inputId}" class="text-blue-600 hover:text-blue-800 underline cursor-pointer">Click to Upload</label>
            <input type="file" id="${inputId}" accept="audio/*" class="hidden">
        </div>`;
}
function setupDropZoneListeners(dropZoneElement, trackId, trackTypeHint, padIndexOrSliceId = null) {
    if (!dropZoneElement) return;
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
        const soundDataString = event.dataTransfer.getData("application/json");
        if (soundDataString) {
            try {
                const soundData = JSON.parse(soundDataString);
                const track = tracks.find(t => t.id === parseInt(trackId));
                captureStateForUndo(`Load "${soundData.fileName}" to ${track ? track.name : 'track ' + trackId}`);
                await loadSoundFromBrowserToTarget(soundData, trackId, trackTypeHint, padIndexOrSliceId);
            } catch (e) {
                console.error("Error parsing dropped sound data:", e);
                showNotification("Error processing dropped sound.", 3000);
            }
        } else if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0];
            const simulatedEvent = { target: { files: [file] } };
            const track = tracks.find(t => t.id === parseInt(trackId));
            captureStateForUndo(`Load file "${file.name}" to ${track ? track.name : 'track ' + trackId}`);
            if (trackTypeHint === 'DrumSampler' && padIndexOrSliceId !== null) {
                await loadDrumSamplerPadFile(simulatedEvent, trackId, padIndexOrSliceId);
            } else {
                await loadSampleFile(simulatedEvent, trackId, trackTypeHint);
            }
        }
    });
}

// --- CLASS DEFINITIONS ---
class SnugWindow {
    constructor(id, title, contentHTMLOrElement, options = {}) {
        this.id = id;
        this.title = title;
        this.isMinimized = false;
        this.initialContentKey = options.initialContentKey || id;
        this.resizeObserver = null;
        const desktopEl = document.getElementById('desktop');
        if (!desktopEl) {
            console.error("SnugWindow: Desktop element not found for window ID:", this.id);
            this.element = null;
            return;
        }
        const defaultWidth = options.width || Math.min(350, desktopEl.offsetWidth - 40);
        const defaultHeight = options.height || Math.min(250, desktopEl.offsetHeight - 80);
        const taskbarHeightVal = document.getElementById('taskbar')?.offsetHeight || 28;
        const maxX = Math.max(5, desktopEl.offsetWidth - defaultWidth - 10);
        const maxY = Math.max(5, desktopEl.offsetHeight - defaultHeight - 10 - taskbarHeightVal);
        const randomX = Math.max(5, Math.min( (Math.random() * maxX) || 5, maxX));
        const randomY = Math.max(5, Math.min( (Math.random() * maxY) || 5, maxY));
        this.options = Object.assign({
            x: randomX, y: randomY,
            width: defaultWidth, height: defaultHeight,
            closable: true, minimizable: true
        }, options);
        this.element = document.createElement('div');
        this.element.id = `window-${this.id}`;
        this.element.className = 'window';
        this.element.style.left = `${this.options.x}px`;
        this.element.style.top = `${this.options.y}px`;
        this.element.style.width = `${this.options.width}px`;
        this.element.style.height = `${this.options.height}px`;
        this.element.style.zIndex = options.zIndex !== undefined ? options.zIndex : ++highestZIndex;
        this.element.style.backgroundColor = `var(--window-bg, ${defaultWindowBg})`;
        let buttonsHTML = '';
        if (this.options.minimizable) { buttonsHTML += `<button class="window-minimize-btn" title="Minimize">_</button>`; }
        if (this.options.closable) { buttonsHTML += `<button class="window-close-btn" title="Close">X</button>`; }

        this.titleBar = document.createElement('div');
        this.titleBar.className = 'window-title-bar';
        this.titleBar.innerHTML = `<span>${this.title}</span><div class="window-title-buttons">${buttonsHTML}</div>`;

        this.contentArea = document.createElement('div');
        this.contentArea.className = 'window-content';
        this.contentArea.style.backgroundColor = `var(--window-content-bg, ${defaultWindowContentBg})`;

        if (typeof contentHTMLOrElement === 'string') {
            this.contentArea.innerHTML = contentHTMLOrElement;
        } else if (contentHTMLOrElement instanceof HTMLElement) {
            this.contentArea.appendChild(contentHTMLOrElement);
        }

        this.element.appendChild(this.titleBar);
        this.element.appendChild(this.contentArea);

        desktopEl.appendChild(this.element);
        openWindows[this.id] = this;
        this.makeDraggable();
        this.makeResizable();
        if (this.options.closable) {
            const closeBtn = this.element.querySelector('.window-close-btn');
            if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
        }
        if (this.options.minimizable) {
            const minBtn = this.element.querySelector('.window-minimize-btn');
            if (minBtn) minBtn.addEventListener('click', (e) => { e.stopPropagation(); this.minimize(); });
        }
        this.element.addEventListener('mousedown', () => this.focus(), true);
        this.createTaskbarButton();
        if (options.isMinimized) {
            this.minimize(true);
        }
    }
    makeDraggable() {
        if (!this.titleBar) return;
        let offsetX, offsetY, isDragging = false;
        const desktopEl = document.getElementById('desktop');
        let initialX, initialY;
        this.titleBar.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || !desktopEl) return;
            isDragging = true; this.focus();
            initialX = this.element.offsetLeft;
            initialY = this.element.offsetTop;
            offsetX = e.clientX - initialX;
            offsetY = e.clientY - initialY;
            this.titleBar.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !desktopEl) return;
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            const desktopRect = desktopEl.getBoundingClientRect();
            const taskbarHeightVal = document.getElementById('taskbar')?.offsetHeight || 28;
            newX = Math.max(0, Math.min(newX, desktopRect.width - this.element.offsetWidth));
            newY = Math.max(0, Math.min(newY, desktopRect.height - this.element.offsetHeight - taskbarHeightVal));
            this.element.style.left = `${newX}px`;
            this.element.style.top = `${newY}px`;
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                if (this.titleBar) this.titleBar.style.cursor = 'grab';
                document.body.style.userSelect = '';
                if (this.element.offsetLeft !== initialX || this.element.offsetTop !== initialY) {
                    captureStateForUndo(`Move window "${this.title}"`);
                }
            }
        });
    }
    makeResizable() {
        let initialWidth, initialHeight;
        this.resizeObserver = new ResizeObserver(entries => {});
        this.resizeObserver.observe(this.element);
        this.element.addEventListener('mousedown', (e) => {
            const rect = this.element.getBoundingClientRect();
            const resizeHandleSize = 15;
            if (e.clientX > rect.right - resizeHandleSize && e.clientY > rect.bottom - resizeHandleSize) {
                initialWidth = this.element.offsetWidth;
                initialHeight = this.element.offsetHeight;
            } else {
                initialWidth = null;
                initialHeight = null;
            }
        });
        this.element.addEventListener('mouseup', () => {
            if (initialWidth !== null && initialHeight !== null) {
                if (this.element.offsetWidth !== initialWidth || this.element.offsetHeight !== initialHeight) {
                    captureStateForUndo(`Resize window "${this.title}"`);
                }
                initialWidth = null;
                initialHeight = null;
            }
        });
    }
    createTaskbarButton() {
        if (!taskbarButtonsContainer) return;
        this.taskbarButton = document.createElement('button');
        this.taskbarButton.className = 'taskbar-button';
        this.taskbarButton.textContent = this.title.substring(0, 15) + (this.title.length > 15 ? '...' : '');
        this.taskbarButton.title = this.title;
        this.taskbarButton.dataset.windowId = this.id;
        taskbarButtonsContainer.appendChild(this.taskbarButton);
        this.taskbarButton.addEventListener('click', () => {
            if (this.isMinimized) { this.restore(); }
            else {
                if (parseInt(this.element.style.zIndex) === highestZIndex && !this.isMinimized) {
                    this.minimize();
                } else {
                    this.focus();
                }
            }
        });
        this.updateTaskbarButtonActiveState();
    }
    updateTaskbarButtonActiveState() {
        if (this.taskbarButton) {
            const isActive = !this.isMinimized && parseInt(this.element.style.zIndex) === highestZIndex;
            this.taskbarButton.classList.toggle('active', isActive);
            this.taskbarButton.classList.toggle('minimized-on-taskbar', this.isMinimized && !isActive);
        }
    }
    minimize(skipUndo = false) {
        if (!this.isMinimized) {
            this.isMinimized = true;
            this.element.classList.add('minimized');
            if(this.taskbarButton) {
                this.taskbarButton.classList.add('minimized-on-taskbar');
                this.taskbarButton.classList.remove('active');
            }
            if (!skipUndo) captureStateForUndo(`Minimize window "${this.title}"`);
        }
    }
    restore(skipUndo = false) {
        if (this.isMinimized) {
            this.isMinimized = false;
            this.element.classList.remove('minimized');
            this.focus(true);
            if (!skipUndo) captureStateForUndo(`Restore window "${this.title}"`);
        } else {
            this.focus();
        }
    }
    close() {
        if (this.onCloseCallback) this.onCloseCallback();
        if (this.taskbarButton) this.taskbarButton.remove();
        if (this.element) this.element.remove();
        if (this.resizeObserver) this.resizeObserver.disconnect();
        const oldWindowTitle = this.title;
        delete openWindows[this.id];
        const trackIdStr = this.id.split('-')[1];
        if (trackIdStr) {
            const trackIdNum = parseInt(trackIdStr);
            const track = tracks.find(t => t.id === trackIdNum);
            if (track) {
                if (this.id.startsWith('trackInspector-')) track.inspectorWindow = null;
                if (this.id.startsWith('sequencerWin-')) track.sequencerWindow = null;
                if (this.id.startsWith('effectsRack-')) track.effectsRackWindow = null;
            }
        }
        captureStateForUndo(`Close window "${oldWindowTitle}"`);
    }
    focus(skipUndo = false) {
        if (this.isMinimized) { this.restore(skipUndo); return; }
        if (!this.element) return;
        this.element.style.zIndex = ++highestZIndex;
        Object.values(openWindows).forEach(win => { if (win && win.taskbarButton) win.updateTaskbarButtonActiveState(); });
    }
    applyState(state) {
        if (!this.element) return;
        this.element.style.left = state.left;
        this.element.style.top = state.top;
        this.element.style.width = state.width;
        this.element.style.height = state.height;
        this.element.style.zIndex = state.zIndex;
        this.titleBar.querySelector('span').textContent = state.title;
        this.title = state.title;
        if (this.taskbarButton) {
            this.taskbarButton.textContent = state.title.substring(0, 15) + (state.title.length > 15 ? '...' : '');
            this.taskbarButton.title = state.title;
        }
        if (state.isMinimized && !this.isMinimized) {
            this.minimize(true);
        } else if (!state.isMinimized && this.isMinimized) {
            this.restore(true);
        }
        this.updateTaskbarButtonActiveState();
    }
    onCloseCallback() {}
}
class Track {
    constructor(id, type, initialData = null) {
        this.id = initialData?.id || id;
        this.type = type;
        this.name = initialData?.name || `${type} Track ${this.id}`;
        this.isMuted = initialData?.isMuted || false;
        this.isSoloed = false;
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7;
        this.synthParams = {
            oscillator: initialData?.synthParams?.oscillator || { type: 'triangle8' },
            envelope: initialData?.synthParams?.envelope || { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 }
        };
        this.originalFileName = initialData?.samplerAudioData?.fileName || null;
        this.audioBuffer = null;
        this.audioBufferDataURL = initialData?.samplerAudioData?.audioBufferDataURL || null;
        this.slices = initialData?.slices || Array(numSlices).fill(null).map(() => ({
            offset: 0, duration: 0, userDefined: false, volume: 1.0, pitchShift: 0,
            loop: false, reverse: false,
            envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 }
        }));
        this.selectedSliceForEdit = 0;
        this.waveformZoom = initialData?.waveformZoom || 1;
        this.waveformScrollOffset = initialData?.waveformScrollOffset || 0;
        this.slicerIsPolyphonic = initialData?.slicerIsPolyphonic !== undefined ? initialData.slicerIsPolyphonic : true;
        this.slicerMonoPlayer = null;
        this.slicerMonoEnvelope = null;
        this.slicerMonoGain = null;
        this.instrumentSamplerSettings = {
            sampleUrl: null,
            audioBuffer: null,
            audioBufferDataURL: initialData?.instrumentSamplerSettings?.audioBufferDataURL || null,
            originalFileName: initialData?.instrumentSamplerSettings?.originalFileName || null,
            rootNote: initialData?.instrumentSamplerSettings?.rootNote || 'C4',
            loop: initialData?.instrumentSamplerSettings?.loop || false,
            loopStart: initialData?.instrumentSamplerSettings?.loopStart || 0,
            loopEnd: initialData?.instrumentSamplerSettings?.loopEnd || 0,
            envelope: initialData?.instrumentSamplerSettings?.envelope || { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 },
        };
        this.instrumentSamplerIsPolyphonic = initialData?.instrumentSamplerIsPolyphonic !== undefined ? initialData.instrumentSamplerIsPolyphonic : true;
        this.toneSampler = null;
        this.drumSamplerPads = initialData?.drumSamplerPads || Array(numDrumSamplerPads).fill(null).map(() => ({
            sampleUrl: null,
            audioBuffer: null,
            audioBufferDataURL: null,
            originalFileName: null,
            volume: 0.7, pitchShift: 0,
            envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 }
        }));
        if (initialData?.drumSamplerPads) {
            initialData.drumSamplerPads.forEach((padData, index) => {
                if (this.drumSamplerPads[index] && padData.audioBufferDataURL) {
                    this.drumSamplerPads[index].audioBufferDataURL = padData.audioBufferDataURL;
                    this.drumSamplerPads[index].originalFileName = padData.originalFileName;
                }
            });
        }
        this.selectedDrumPadForEdit = 0;
        this.drumPadPlayers = Array(numDrumSamplerPads).fill(null);
        this.effects = {
            reverb: initialData?.effects?.reverb || { wet: 0, decay: 2.5, preDelay: 0.02 },
            delay: initialData?.effects?.delay || { wet: 0, time: 0.5, feedback: 0.3 },
            filter: initialData?.effects?.filter || { frequency: 20000, type: "lowpass", Q: 1, rolloff: -12 },
            compressor: initialData?.effects?.compressor || { threshold: -24, ratio: 12, attack: 0.003, release: 0.25, knee: 30 },
            eq3: initialData?.effects?.eq3 || { low: 0, mid: 0, high: 0 },
            distortion: initialData?.effects?.distortion || { amount: 0 },
            chorus: initialData?.effects?.chorus || { wet: 0, frequency: 1.5, delayTime: 3.5, depth: 0.7 },
            saturation: initialData?.effects?.saturation || { wet: 0, amount: 2 }
        };
        this.distortionNode = new Tone.Distortion(this.effects.distortion.amount);
        this.filterNode = new Tone.Filter({
            frequency: this.effects.filter.frequency,
            type: this.effects.filter.type,
            rolloff: this.effects.filter.rolloff,
            Q: this.effects.filter.Q
        });
        this.chorusNode = new Tone.Chorus(this.effects.chorus.frequency, this.effects.chorus.delayTime, this.effects.chorus.depth);
        this.chorusNode.wet.value = this.effects.chorus.wet;
        this.saturationNode = new Tone.Chebyshev(Math.floor(this.effects.saturation.amount) * 2 + 1);
        this.saturationNode.wet.value = this.effects.saturation.wet;
        this.eq3Node = new Tone.EQ3(this.effects.eq3);
        this.compressorNode = new Tone.Compressor(this.effects.compressor);
        this.delayNode = new Tone.FeedbackDelay(this.effects.delay.time, this.effects.delay.feedback);
        this.delayNode.wet.value = this.effects.delay.wet;
        this.reverbNode = new Tone.Reverb(this.effects.reverb);
        this.gainNode = new Tone.Gain(this.isMuted ? 0 : (initialData?.volume ?? 0.7));
        this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        this.distortionNode.chain(this.filterNode, this.chorusNode, this.saturationNode, this.eq3Node, this.compressorNode, this.delayNode, this.reverbNode, this.gainNode, this.trackMeter, Tone.getDestination());
        this.instrument = null;
        this.sequenceLength = initialData?.sequenceLength || defaultStepsPerBar;
        let numRowsForGrid;
        if (type === 'Synth' || type === 'InstrumentSampler') numRowsForGrid = synthPitches.length;
        else if (type === 'Sampler') numRowsForGrid = this.slices.length > 0 ? this.slices.length : numSlices;
        else if (type === 'DrumSampler') numRowsForGrid = numDrumSamplerPads;
        else numRowsForGrid = 0;
        this.sequenceData = initialData?.sequenceData || Array(numRowsForGrid).fill(null).map(() => Array(this.sequenceLength).fill(null));
        this.sequence = null;
        this.inspectorWindow = null; this.effectsRackWindow = null;
        this.waveformCanvasCtx = null; this.instrumentWaveformCanvasCtx = null;
        this.sequencerWindow = null;
        this.automation = initialData?.automation || { volume: [] };
        this.inspectorControls = {};
        this.initializeInstrumentFromInitialData(initialData);
        this.setSequenceLength(this.sequenceLength, true);
    }
    async initializeInstrumentFromInitialData(initialData) {
        if (this.type === 'Synth') {
            this.instrument = new Tone.PolySynth(Tone.Synth, {
                oscillator: this.synthParams.oscillator, envelope: this.synthParams.envelope
            }).connect(this.distortionNode);
        } else if (this.type === 'Sampler') {
            if (this.audioBufferDataURL) {
                try {
                    this.audioBuffer = await new Tone.Buffer().load(this.audioBufferDataURL);
                    if (!this.slicerIsPolyphonic && this.audioBuffer.loaded) {
                        this.setupSlicerMonoNodes();
                    }
                } catch (e) {
                    console.error(`Error loading Slicer audio buffer from DataURL for track ${this.id}:`, e);
                    showNotification(`Error loading sample for Slicer ${this.name} from project.`, 3000);
                    this.audioBufferDataURL = null;
                }
            }
        } else if (this.type === 'InstrumentSampler') {
            if (this.instrumentSamplerSettings.audioBufferDataURL) {
                try {
                    this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(this.instrumentSamplerSettings.audioBufferDataURL);
                    this.setupToneSampler();
                } catch (e) {
                    console.error(`Error loading InstrumentSampler audio buffer from DataURL for track ${this.id}:`, e);
                    showNotification(`Error loading sample for Instrument Sampler ${this.name} from project.`, 3000);
                    this.instrumentSamplerSettings.audioBufferDataURL = null;
                }
            } else {
                this.setupToneSampler();
            }
        } else if (this.type === 'DrumSampler') {
            for (let i = 0; i < this.drumSamplerPads.length; i++) {
                const padData = this.drumSamplerPads[i];
                if (padData.audioBufferDataURL) {
                    try {
                        padData.audioBuffer = await new Tone.Buffer().load(padData.audioBufferDataURL);
                        if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) this.drumPadPlayers[i].dispose();
                        this.drumPadPlayers[i] = new Tone.Player(padData.audioBuffer).connect(this.distortionNode);
                    } catch (e) {
                        console.error(`Error loading DrumSampler pad ${i} audio buffer from DataURL for track ${this.id}:`, e);
                        showNotification(`Error loading sample for Drum Sampler ${this.name}, Pad ${i+1} from project.`, 3000);
                        padData.audioBufferDataURL = null;
                    }
                }
            }
        }
    }
    setupSlicerMonoNodes() {
        if (!this.slicerMonoPlayer || this.slicerMonoPlayer.disposed) {
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain(1);
            this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain, this.distortionNode);
        }
        if (this.audioBuffer && this.audioBuffer.loaded && this.slicerMonoPlayer) {
            this.slicerMonoPlayer.buffer = this.audioBuffer;
        }
    }
    disposeSlicerMonoNodes() {
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) {
            this.slicerMonoPlayer.dispose();
            this.slicerMonoPlayer = null;
        }
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) {
            this.slicerMonoEnvelope.dispose();
            this.slicerMonoEnvelope = null;
        }
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            this.slicerMonoGain.dispose();
            this.slicerMonoGain = null;
        }
    }
    setupToneSampler() {
        if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.dispose();
        const urls = {};
        if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
            urls[this.instrumentSamplerSettings.rootNote] = this.instrumentSamplerSettings.audioBuffer;
        }
        this.toneSampler = new Tone.Sampler({
            urls: urls,
            attack: this.instrumentSamplerSettings.envelope.attack,
            release: this.instrumentSamplerSettings.envelope.release,
            baseUrl: "",
        }).connect(this.distortionNode);
        this.toneSampler.loop = this.instrumentSamplerSettings.loop;
        this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart;
        this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd;
        if (!(this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded)) {
             console.warn(`InstrumentSampler: Audio buffer not ready for track ${this.id}. Sample may need to be reloaded or loaded from DataURL.`);
        }
    }
    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = parseFloat(volume);
        if (!this.isMuted) { this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05); }
    }
    applyMuteState() {
        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.01);
        } else {
            if (soloedTrackId && soloedTrackId !== this.id) {
                this.gainNode.gain.rampTo(0, 0.01);
            } else {
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            }
        }
    }
    applySoloState() {
        if (this.isMuted) return;
        if (soloedTrackId) {
            if (this.id === soloedTrackId) {
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            } else {
                this.gainNode.gain.rampTo(0, 0.01);
            }
        } else {
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
        }
    }
    setReverbWet(value) { this.effects.reverb.wet = parseFloat(value) || 0; this.reverbNode.wet.value = this.effects.reverb.wet; }
    setDelayWet(value) { this.effects.delay.wet = parseFloat(value) || 0; this.delayNode.wet.value = this.effects.delay.wet; }
    setDelayTime(value) { this.effects.delay.time = parseFloat(value) || 0; this.delayNode.delayTime.value = this.effects.delay.time; }
    setDelayFeedback(value) { this.effects.delay.feedback = parseFloat(value) || 0; this.delayNode.feedback.value = this.effects.delay.feedback; }
    setFilterFrequency(value) { this.effects.filter.frequency = parseFloat(value) || 20000; this.filterNode.frequency.value = this.effects.filter.frequency; }
    setFilterType(value) { this.effects.filter.type = value; this.filterNode.type = this.effects.filter.type; }
    setCompressorThreshold(value) { this.effects.compressor.threshold = parseFloat(value) || -24; this.compressorNode.threshold.value = this.effects.compressor.threshold; }
    setCompressorRatio(value) { this.effects.compressor.ratio = parseFloat(value) || 12; this.compressorNode.ratio.value = this.effects.compressor.ratio; }
    setCompressorAttack(value) { this.effects.compressor.attack = parseFloat(value) || 0.003; this.compressorNode.attack.value = this.effects.compressor.attack; }
    setCompressorRelease(value) { this.effects.compressor.release = parseFloat(value) || 0.25; this.compressorNode.release.value = this.effects.compressor.release; }
    setCompressorKnee(value) { this.effects.compressor.knee = parseFloat(value) || 30; this.compressorNode.knee.value = this.effects.compressor.knee; }
    setEQ3Low(value) { this.effects.eq3.low = parseFloat(value) || 0; this.eq3Node.low.value = this.effects.eq3.low; }
    setEQ3Mid(value) { this.effects.eq3.mid = parseFloat(value) || 0; this.eq3Node.mid.value = this.effects.eq3.mid; }
    setEQ3High(value) { this.effects.eq3.high = parseFloat(value) || 0; this.eq3Node.high.value = this.effects.eq3.high; }
    setDistortionAmount(value) { this.effects.distortion.amount = parseFloat(value) || 0; this.distortionNode.distortion = this.effects.distortion.amount; }
    setChorusWet(value) { this.effects.chorus.wet = parseFloat(value) || 0; this.chorusNode.wet.value = this.effects.chorus.wet; }
    setChorusFrequency(value) { this.effects.chorus.frequency = parseFloat(value) || 1.5; this.chorusNode.frequency.value = this.effects.chorus.frequency; }
    setChorusDelayTime(value) { this.effects.chorus.delayTime = parseFloat(value) || 3.5; this.chorusNode.delayTime = this.effects.chorus.delayTime; }
    setChorusDepth(value) { this.effects.chorus.depth = parseFloat(value) || 0.7; this.chorusNode.depth = this.effects.chorus.depth; }
    setSaturationWet(value) { this.effects.saturation.wet = parseFloat(value) || 0; this.saturationNode.wet.value = this.effects.saturation.wet; }
    setSaturationAmount(value) {
        this.effects.saturation.amount = parseFloat(value) || 0;
        this.saturationNode.order = Math.max(1, Math.floor(this.effects.saturation.amount) * 2 + 1);
    }
    setSynthOscillatorType(type) { if (this.type !== 'Synth' || !this.instrument) return; this.synthParams.oscillator.type = type; this.instrument.set({ oscillator: { type: type }}); }
    setSynthEnvelope(param, value) { if (this.type !== 'Synth' || !this.instrument) return; const val = parseFloat(value); if (isNaN(val)) return; this.synthParams.envelope[param] = val; this.instrument.set({ envelope: this.synthParams.envelope }); }
    setSliceVolume(sliceIndex, volume) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].volume = parseFloat(volume) || 0;}
    setSlicePitchShift(sliceIndex, semitones) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].pitchShift = parseFloat(semitones) || 0;}
    setSliceLoop(sliceIndex, loop) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].loop = Boolean(loop);}
    setSliceReverse(sliceIndex, reverse) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].reverse = Boolean(reverse);}
    setSliceEnvelopeParam(sliceIndex, param, value) { if (this.type !== 'Sampler' || !this.slices[sliceIndex] || !this.slices[sliceIndex].envelope) return; this.slices[sliceIndex].envelope[param] = parseFloat(value) || 0; }
    setDrumSamplerPadVolume(padIndex, volume) { if(this.type !== 'DrumSampler' || !this.drumSamplerPads[padIndex]) return; this.drumSamplerPads[padIndex].volume = parseFloat(volume);}
    setDrumSamplerPadPitch(padIndex, pitch) { if(this.type !== 'DrumSampler' || !this.drumSamplerPads[padIndex]) return; this.drumSamplerPads[padIndex].pitchShift = parseFloat(pitch);}
    setDrumSamplerPadEnv(padIndex, param, value) { if(this.type !== 'DrumSampler' || !this.drumSamplerPads[padIndex]) return; this.drumSamplerPads[padIndex].envelope[param] = parseFloat(value);}
    setInstrumentSamplerRootNote(noteName) { if(this.type !== 'InstrumentSampler') return; this.instrumentSamplerSettings.rootNote = noteName; this.setupToneSampler(); }
    setInstrumentSamplerLoop(loop) { if(this.type !== 'InstrumentSampler') return; this.instrumentSamplerSettings.loop = Boolean(loop); if(this.toneSampler) this.toneSampler.loop = this.instrumentSamplerSettings.loop; }
    setInstrumentSamplerLoopStart(time) { if(this.type !== 'InstrumentSampler' || !this.instrumentSamplerSettings.audioBuffer) return; this.instrumentSamplerSettings.loopStart = Math.min(this.instrumentSamplerSettings.audioBuffer.duration, Math.max(0, parseFloat(time))); if(this.toneSampler) this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart; }
    setInstrumentSamplerLoopEnd(time) { if(this.type !== 'InstrumentSampler' || !this.instrumentSamplerSettings.audioBuffer) return; this.instrumentSamplerSettings.loopEnd = Math.min(this.instrumentSamplerSettings.audioBuffer.duration, Math.max(this.instrumentSamplerSettings.loopStart, parseFloat(time))); if(this.toneSampler) this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd; }
    setInstrumentSamplerEnv(param, value) { if(this.type !== 'InstrumentSampler') return; this.instrumentSamplerSettings.envelope[param] = parseFloat(value); if(this.toneSampler) this.toneSampler.set({ attack: this.instrumentSamplerSettings.envelope.attack, release: this.instrumentSamplerSettings.envelope.release }); }
    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        newLengthInSteps = Math.max(STEPS_PER_BAR, parseInt(newLengthInSteps) || defaultStepsPerBar);
        newLengthInSteps = Math.ceil(newLengthInSteps / STEPS_PER_BAR) * STEPS_PER_BAR;
        this.sequenceLength = newLengthInSteps;
        let numRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = synthPitches.length;
        else if (this.type === 'Sampler') numRows = this.slices.length > 0 ? this.slices.length : numSlices;
        else if (this.type === 'DrumSampler') numRows = numDrumSamplerPads;
        else numRows = 0;
        const newGridData = Array(numRows).fill(null).map(() => Array(this.sequenceLength).fill(null));
        if (Array.isArray(this.sequenceData) && Array.isArray(this.sequenceData[0])) {
            for (let r = 0; r < Math.min(this.sequenceData.length, numRows); r++) {
                for (let c = 0; c < Math.min(this.sequenceData[r]?.length || 0, this.sequenceLength); c++) {
                    newGridData[r][c] = this.sequenceData[r][c];
                }
            }
        }
        this.sequenceData = newGridData;
        if (this.sequence) this.sequence.dispose();
        this.sequence = new Tone.Sequence((time, col) => {
            if (this.isMuted || (soloedTrackId && soloedTrackId !== this.id)) return;
            if (this.type === 'Synth') {
                synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step && step.active && this.instrument) {
                        this.instrument.triggerAttackRelease(pitchName, "8n", time, step.velocity);
                    }
                });
            } else if (this.type === 'Sampler') {
                this.slices.forEach((sliceData, sliceIndex) => {
                    const step = this.sequenceData[sliceIndex]?.[col];
                    if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                        const totalPitchShift = sliceData.pitchShift;
                        const playbackRate = Math.pow(2, totalPitchShift / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds();
                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(Tone.dbToGain(-6) * sliceData.volume * step.velocity);
                            tempPlayer.chain(tempEnv, tempGain, this.distortionNode);
                            tempPlayer.playbackRate = playbackRate;
                            tempPlayer.reverse = sliceData.reverse;
                            tempPlayer.loop = sliceData.loop;
                            tempPlayer.loopStart = sliceData.offset;
                            tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            tempEnv.triggerAttack(time);
                            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);
                            Tone.Transport.scheduleOnce(() => {
                                if (tempPlayer && !tempPlayer.disposed) { tempPlayer.stop(); tempPlayer.dispose(); }
                                if (tempEnv && !tempEnv.disposed) tempEnv.dispose();
                                if (tempGain && !tempGain.disposed) tempGain.dispose();
                            }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.1);
                        } else {
                            if (!this.slicerMonoPlayer || this.slicerMonoPlayer.disposed) return;
                            const player = this.slicerMonoPlayer;
                            const env = this.slicerMonoEnvelope;
                            const gain = this.slicerMonoGain;
                            if (player.state === 'started') { player.stop(time);  }
                            if (env.getValueAtTime(time) > 0.001) { env.triggerRelease(time); }
                            player.buffer = this.audioBuffer;
                            env.set(sliceData.envelope);
                            gain.gain.value = Tone.dbToGain(-6) * sliceData.volume * step.velocity;
                            player.playbackRate = playbackRate;
                            player.reverse = sliceData.reverse;
                            player.loop = sliceData.loop;
                            player.loopStart = sliceData.offset;
                            player.loopEnd = sliceData.offset + sliceData.duration;
                            player.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            env.triggerAttack(time);
                            if (!sliceData.loop) {
                                const effectiveDuration = playDuration;
                                const releaseTime = time + effectiveDuration - (sliceData.envelope.release || 0.1);
                                env.triggerRelease(Math.max(time, releaseTime));
                            }
                        }
                    }
                });
            } else if (this.type === 'DrumSampler') {
                this.drumSamplerPads.forEach((padData, padIndex) => {
                    const step = this.sequenceData[padIndex]?.[col];
                    if (step?.active && this.drumPadPlayers[padIndex] && this.drumPadPlayers[padIndex].loaded) {
                        const player = this.drumPadPlayers[padIndex];
                        player.volume.value = Tone.gainToDb(padData.volume * step.velocity);
                        player.playbackRate = Math.pow(2, (padData.pitchShift) / 12);
                        player.start(time);
                    }
                });
            } else if (this.type === 'InstrumentSampler') {
                synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active && this.toneSampler && this.toneSampler.loaded) {
                        const midiNote = Tone.Frequency(pitchName).toMidi();
                        const shiftedNote = Tone.Frequency(midiNote, "midi").toNote();
                        this.toneSampler.triggerAttackRelease(shiftedNote, "8n", time, step.velocity);
                    }
                });
            }
            if (this.sequencerWindow && !this.sequencerWindow.isMinimized && activeSequencerTrackId === this.id) {
                const grid = this.sequencerWindow.element?.querySelector('.sequencer-grid');
                if (grid) highlightPlayingStep(col, this.type, grid);
            }
        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);
        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && openWindows[`sequencerWin-${this.id}`]) {
            openTrackSequencerWindow(this.id, true);
        }
    }
    dispose() {
        if (this.instrument && !this.instrument.disposed) this.instrument.dispose();
        if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose();
        this.drumSamplerPads.forEach(pad => { if (pad.audioBuffer?.dispose && !pad.audioBuffer.disposed) pad.audioBuffer.dispose(); });
        this.drumPadPlayers.forEach(player => { if (player?.dispose && !player.disposed) player.dispose(); });
        if (this.instrumentSamplerSettings.audioBuffer?.dispose && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();
        if (this.toneSampler?.dispose && !this.toneSampler.disposed) this.toneSampler.dispose();
        this.disposeSlicerMonoNodes();
        const nodesToDispose = [
            this.gainNode, this.reverbNode, this.delayNode,
            this.compressorNode, this.eq3Node, this.filterNode,
            this.distortionNode, this.chorusNode, this.saturationNode, this.trackMeter
        ];
        nodesToDispose.forEach(node => { if (node && !node.disposed) node.dispose(); });
        if (this.sequence && !this.sequence.disposed) {
            this.sequence.stop();
            this.sequence.clear();
            this.sequence.dispose();
        }
        if (this.inspectorWindow) this.inspectorWindow.close();
        if (this.effectsRackWindow) this.effectsRackWindow.close();
        if(this.sequencerWindow) this.sequencerWindow.close();
        console.log(`Track ${this.id} (${this.name}) disposed.`);
    }
}

// --- UI Creation Functions ---

// --- Track Inspector DOM Builder Functions ---
function buildTrackInspectorContentDOM(track) {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'track-inspector-content p-2 space-y-1';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'flex items-center justify-between mb-1';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = `trackNameDisplay-${track.id}`;
    nameInput.value = track.name;
    nameInput.className = 'text-md font-bold bg-transparent border-b w-full focus:ring-0 focus:border-blue-500';
    headerDiv.appendChild(nameInput);
    const meterContainer = document.createElement('div');
    meterContainer.id = `trackMeterContainer-${track.id}`;
    meterContainer.className = 'track-meter-container meter-bar-container w-1/3 ml-2 h-4';
    const meterBar = document.createElement('div');
    meterBar.id = `trackMeterBar-${track.id}`;
    meterBar.className = 'meter-bar';
    meterContainer.appendChild(meterBar);
    headerDiv.appendChild(meterContainer);
    contentDiv.appendChild(headerDiv);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'flex items-center gap-1 mb-1';
    const muteBtn = document.createElement('button');
    muteBtn.id = `muteBtn-${track.id}`;
    muteBtn.className = `mute-button text-xs p-1 ${track.isMuted ? 'muted' : ''}`;
    muteBtn.textContent = 'M';
    actionsDiv.appendChild(muteBtn);
    const soloBtn = document.createElement('button');
    soloBtn.id = `soloBtn-${track.id}`;
    soloBtn.className = `solo-button text-xs p-1 ${track.isSoloed ? 'soloed' : ''}`;
    soloBtn.textContent = 'S';
    actionsDiv.appendChild(soloBtn);
    const armBtn = document.createElement('button');
    armBtn.id = `armInputBtn-${track.id}`;
    armBtn.className = `arm-input-button text-xs p-1 ${armedTrackId === track.id ? 'armed' : ''}`;
    armBtn.textContent = 'Arm';
    actionsDiv.appendChild(armBtn);
    const removeBtn = document.createElement('button');
    removeBtn.id = `removeTrackBtn-${track.id}`;
    removeBtn.className = 'bg-red-500 hover:bg-red-600 text-white text-xs py-0.5 px-1.5 rounded ml-auto';
    removeBtn.textContent = 'Del';
    actionsDiv.appendChild(removeBtn);
    contentDiv.appendChild(actionsDiv);

    const trackControlsPanel = document.createElement('div');
    trackControlsPanel.className = 'panel';
    const panelTitle = document.createElement('h4');
    panelTitle.className = 'text-sm font-semibold mb-1';
    panelTitle.textContent = 'Track Controls';
    trackControlsPanel.appendChild(panelTitle);
    const controlGroup = document.createElement('div');
    controlGroup.className = 'control-group';
    const volumeContainer = document.createElement('div');
    volumeContainer.id = `volumeSliderContainer-${track.id}`;
    controlGroup.appendChild(volumeContainer);
    const seqLengthContainer = document.createElement('div');
    seqLengthContainer.className = 'flex flex-col items-center';
    const currentBars = track.sequenceLength / STEPS_PER_BAR;
    const seqLabel = document.createElement('label');
    seqLabel.htmlFor = `sequenceLengthBars-${track.id}`;
    seqLabel.className = 'knob-label';
    seqLabel.textContent = 'Seq Len (Bars)';
    seqLengthContainer.appendChild(seqLabel);
    const seqInput = document.createElement('input');
    seqInput.type = 'number';
    seqInput.id = `sequenceLengthBars-${track.id}`;
    seqInput.value = currentBars;
    seqInput.min = "1"; seqInput.max = "256"; seqInput.step = "1";
    seqInput.className = 'bg-white text-black w-16 p-1 rounded-sm text-center text-xs border border-gray-500';
    seqLengthContainer.appendChild(seqInput);
    const seqDisplay = document.createElement('span');
    seqDisplay.id = `sequenceLengthDisplay-${track.id}`;
    seqDisplay.className = 'knob-value';
    seqDisplay.textContent = `${currentBars} bars (${track.sequenceLength} steps)`;
    seqLengthContainer.appendChild(seqDisplay);
    controlGroup.appendChild(seqLengthContainer);
    trackControlsPanel.appendChild(controlGroup);
    contentDiv.appendChild(trackControlsPanel);

    let specificContentElement;
    if (track.type === 'Synth') {
        specificContentElement = buildSynthSpecificInspectorDOM(track);
    } else if (track.type === 'Sampler') {
        specificContentElement = buildSamplerSpecificInspectorDOM(track);
    } else if (track.type === 'DrumSampler') {
        specificContentElement = buildDrumSamplerSpecificInspectorDOM(track);
    } else if (track.type === 'InstrumentSampler') {
        specificContentElement = buildInstrumentSamplerSpecificInspectorDOM(track);
    }
    if (specificContentElement) {
        contentDiv.appendChild(specificContentElement);
    }

    const effectsButton = document.createElement('button');
    effectsButton.className = 'effects-rack-button text-xs py-1 px-2 rounded mt-2 w-full hover:bg-gray-300';
    effectsButton.textContent = 'Effects Rack';
    effectsButton.onclick = () => openTrackEffectsRackWindow(track.id);
    contentDiv.appendChild(effectsButton);

    const sequencerButton = document.createElement('button');
    sequencerButton.className = 'bg-indigo-500 hover:bg-indigo-600 text-white text-xs py-1 px-2 rounded mt-1 w-full';
    sequencerButton.textContent = 'Sequencer';
    sequencerButton.onclick = () => openTrackSequencerWindow(track.id);
    contentDiv.appendChild(sequencerButton);

    return contentDiv;
}

function buildSynthSpecificInspectorDOM(track) {
    const panel = document.createElement('div');
    panel.className = 'panel synth-panel';
    const oscTitle = document.createElement('h4');
    oscTitle.className = 'text-sm font-semibold';
    oscTitle.textContent = 'Oscillator';
    panel.appendChild(oscTitle);
    const oscSelect = document.createElement('select');
    oscSelect.id = `oscType-${track.id}`;
    oscSelect.className = 'text-xs p-1 border w-full mb-2 bg-white text-black';
    panel.appendChild(oscSelect);
    const envTitle = document.createElement('h4');
    envTitle.className = 'text-sm font-semibold';
    envTitle.textContent = 'Envelope (ADSR)';
    panel.appendChild(envTitle);
    const envGroup = document.createElement('div');
    envGroup.className = 'control-group';
    ['envAttackSlider', 'envDecaySlider', 'envSustainSlider', 'envReleaseSlider'].forEach(id => {
        const knobPlaceholder = document.createElement('div');
        knobPlaceholder.id = `${id}-${track.id}`;
        envGroup.appendChild(knobPlaceholder);
    });
    panel.appendChild(envGroup);
    return panel;
}

function buildSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div');
    panel.className = 'panel sampler-panel';

    const dropZoneContainer = document.createElement('div');
    dropZoneContainer.innerHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler');
    panel.appendChild(dropZoneContainer.firstChild);

    const editorPanel = document.createElement('div');
    editorPanel.className = 'sampler-editor-panel mt-1 flex flex-wrap md:flex-nowrap gap-3';

    const leftSide = document.createElement('div');
    leftSide.className = 'flex-grow w-full md:w-3/5';
    const canvas = document.createElement('canvas');
    canvas.id = `waveformCanvas-${track.id}`;
    canvas.className = 'waveform-canvas w-full';
    canvas.width = 380; canvas.height = 70;
    leftSide.appendChild(canvas);
    const padsContainer = document.createElement('div');
    padsContainer.id = `samplePadsContainer-${track.id}`;
    padsContainer.className = 'pads-container mt-2';
    leftSide.appendChild(padsContainer);
    editorPanel.appendChild(leftSide);

    const rightSide = document.createElement('div');
    rightSide.id = `sliceControlsContainer-${track.id}`;
    rightSide.className = 'slice-edit-group w-full md:w-2/5 space-y-1';
    const sliceTitle = document.createElement('h4');
    sliceTitle.className = 'text-sm font-semibold';
    sliceTitle.innerHTML = `Slice: <span id="selectedSliceLabel-${track.id}">${track.selectedSliceForEdit + 1}</span>`;
    rightSide.appendChild(sliceTitle);

    ['Start', 'End'].forEach(label => {
        const div = document.createElement('div');
        div.className = 'flex gap-1 items-center text-xs';
        const lbl = document.createElement('label');
        lbl.textContent = `${label}:`;
        div.appendChild(lbl);
        const input = document.createElement('input');
        input.type = 'number';
        input.id = `slice${label}-${track.id}`;
        input.className = 'flex-grow p-0.5 text-xs bg-white text-black border';
        div.appendChild(input);
        rightSide.appendChild(div);
    });

    const applyBtn = document.createElement('button');
    applyBtn.id = `applySliceEditsBtn-${track.id}`;
    applyBtn.className = 'bg-blue-500 text-white text-xs py-0.5 px-1.5 rounded mt-1 hover:bg-blue-600';
    applyBtn.textContent = 'Apply S/E';
    rightSide.appendChild(applyBtn);

    const volPitchGroup = document.createElement('div');
    volPitchGroup.className = 'control-group mt-1';
    const volPlaceholder = document.createElement('div');
    volPlaceholder.id = `sliceVolumeSlider-${track.id}`;
    volPitchGroup.appendChild(volPlaceholder);
    const pitchPlaceholder = document.createElement('div');
    pitchPlaceholder.id = `slicePitchKnob-${track.id}`;
    volPitchGroup.appendChild(pitchPlaceholder);
    rightSide.appendChild(volPitchGroup);

    const loopReverseGroup = document.createElement('div');
    loopReverseGroup.className = 'flex gap-2 mt-1';
    const loopBtn = document.createElement('button');
    loopBtn.id = `sliceLoopToggle-${track.id}`;
    loopBtn.className = 'slice-toggle-button text-xs p-1';
    loopBtn.textContent = 'Loop';
    loopReverseGroup.appendChild(loopBtn);
    const reverseBtn = document.createElement('button');
    reverseBtn.id = `sliceReverseToggle-${track.id}`;
    reverseBtn.className = 'slice-toggle-button text-xs p-1';
    reverseBtn.textContent = 'Reverse';
    loopReverseGroup.appendChild(reverseBtn);
    rightSide.appendChild(loopReverseGroup);

    const polyBtn = document.createElement('button');
    polyBtn.id = `slicerPolyphonyToggle-${track.id}`;
    polyBtn.className = 'slice-toggle-button text-xs p-1 mt-1 w-full';
    polyBtn.textContent = 'Mode: Poly';
    rightSide.appendChild(polyBtn);

    const details = document.createElement('details');
    details.className = 'mt-1';
    const summary = document.createElement('summary');
    summary.className = 'text-xs font-semibold';
    summary.textContent = 'Slice Env';
    details.appendChild(summary);
    const sliceEnvGroup = document.createElement('div');
    sliceEnvGroup.className = 'control-group';
    ['sliceEnvAttackSlider', 'sliceEnvDecaySlider', 'sliceEnvSustainSlider', 'sliceEnvReleaseSlider'].forEach(id => {
        const knobPlaceholder = document.createElement('div');
        knobPlaceholder.id = `${id}-${track.id}`;
        sliceEnvGroup.appendChild(knobPlaceholder);
    });
    details.appendChild(sliceEnvGroup);
    rightSide.appendChild(details);

    editorPanel.appendChild(rightSide);
    panel.appendChild(editorPanel);
    return panel;
}

function buildDrumSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div');
    panel.className = 'panel drum-sampler-panel';
    const title = document.createElement('h4');
    title.className = 'text-sm font-semibold mb-1';
    title.innerHTML = `Drum Pads (Selected: <span id="selectedDrumPadLabel-${track.id}">${track.selectedDrumPadForEdit + 1}</span>)`;
    panel.appendChild(title);
    const padsContainer = document.createElement('div');
    padsContainer.id = `drumSamplerPadsContainer-${track.id}`;
    padsContainer.className = 'pads-container mb-2';
    panel.appendChild(padsContainer);
    const controlsContainer = document.createElement('div');
    controlsContainer.id = `drumPadControlsContainer-${track.id}`;
    controlsContainer.className = 'border-t pt-2';
    const loadContainer = document.createElement('div');
    loadContainer.id = `drumPadLoadContainer-${track.id}`;
    loadContainer.className = 'mb-2';
    controlsContainer.appendChild(loadContainer);
    const volPitchGroup = document.createElement('div');
    volPitchGroup.className = 'control-group';
    const volPlaceholder = document.createElement('div');
    volPlaceholder.id = `drumPadVolumeSlider-${track.id}`;
    volPitchGroup.appendChild(volPlaceholder);
    const pitchPlaceholder = document.createElement('div');
    pitchPlaceholder.id = `drumPadPitchKnob-${track.id}`;
    volPitchGroup.appendChild(pitchPlaceholder);
    controlsContainer.appendChild(volPitchGroup);
    const details = document.createElement('details');
    details.className = 'mt-1';
    const summary = document.createElement('summary');
    summary.className = 'text-xs font-semibold';
    summary.textContent = 'Pad Envelope (AR)';
    details.appendChild(summary);
    const padEnvGroup = document.createElement('div');
    padEnvGroup.className = 'control-group';
    ['drumPadEnvAttackSlider', 'drumPadEnvReleaseSlider'].forEach(id => {
        const knobPlaceholder = document.createElement('div');
        knobPlaceholder.id = `${id}-${track.id}`;
        padEnvGroup.appendChild(knobPlaceholder);
    });
    details.appendChild(padEnvGroup);
    controlsContainer.appendChild(details);
    panel.appendChild(controlsContainer);
    return panel;
}

function buildInstrumentSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div');
    panel.className = 'panel instrument-sampler-panel';
    const dropZoneContainer = document.createElement('div');
    dropZoneContainer.innerHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler');
    panel.appendChild(dropZoneContainer.firstChild);
    const canvas = document.createElement('canvas');
    canvas.id = `instrumentWaveformCanvas-${track.id}`;
    canvas.className = 'waveform-canvas w-full mb-1';
    canvas.width = 380; canvas.height = 70;
    panel.appendChild(canvas);
    const controlsContainer = document.createElement('div');
    const rootLoopGroup = document.createElement('div');
    rootLoopGroup.className = 'control-group mb-2 items-center';
    const rootNoteDiv = document.createElement('div');
    rootNoteDiv.innerHTML = `<label class="knob-label text-xs">Root Note</label><input type="text" id="instrumentRootNote-${track.id}" value="${track.instrumentSamplerSettings.rootNote}" class="bg-white text-black w-12 p-0.5 text-xs text-center border">`;
    rootLoopGroup.appendChild(rootNoteDiv);
    const loopToggleDiv = document.createElement('div');
    loopToggleDiv.innerHTML = `<label class="knob-label text-xs">Loop</label><button id="instrumentLoopToggle-${track.id}" class="slice-toggle-button text-xs p-1">${track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF'}</button>`;
    rootLoopGroup.appendChild(loopToggleDiv);
    const loopStartDiv = document.createElement('div');
    loopStartDiv.innerHTML = `<label class="knob-label text-xs">Start</label><input type="number" id="instrumentLoopStart-${track.id}" value="${track.instrumentSamplerSettings.loopStart.toFixed(3)}" step="0.001" class="bg-white text-black w-16 p-0.5 text-xs text-center border">`;
    rootLoopGroup.appendChild(loopStartDiv);
    const loopEndDiv = document.createElement('div');
    loopEndDiv.innerHTML = `<label class="knob-label text-xs">End</label><input type="number" id="instrumentLoopEnd-${track.id}" value="${track.instrumentSamplerSettings.loopEnd.toFixed(3)}" step="0.001" class="bg-white text-black w-16 p-0.5 text-xs text-center border">`;
    rootLoopGroup.appendChild(loopEndDiv);
    controlsContainer.appendChild(rootLoopGroup);
    const polyBtn = document.createElement('button');
    polyBtn.id = `instrumentSamplerPolyphonyToggle-${track.id}`;
    polyBtn.className = 'slice-toggle-button text-xs p-1 mb-2 w-full';
    polyBtn.textContent = 'Mode: Poly';
    controlsContainer.appendChild(polyBtn);
    const envTitle = document.createElement('h4');
    envTitle.className = 'text-sm font-semibold';
    envTitle.textContent = 'Envelope (ADSR)';
    controlsContainer.appendChild(envTitle);
    const envGroup = document.createElement('div');
    envGroup.className = 'control-group';
    ['instrumentEnvAttackSlider', 'instrumentEnvDecaySlider', 'instrumentEnvSustainSlider', 'instrumentEnvReleaseSlider'].forEach(id => {
        const knobPlaceholder = document.createElement('div');
        knobPlaceholder.id = `${id}-${track.id}`;
        envGroup.appendChild(knobPlaceholder);
    });
    controlsContainer.appendChild(envGroup);
    panel.appendChild(controlsContainer);
    return panel;
}
// --- END Track Inspector DOM Builder Functions ---

// --- Track Inspector Control Initializer Functions ---
function initializeCommonInspectorControls(track, winEl) {
    winEl.querySelector(`#trackNameDisplay-${track.id}`)?.addEventListener('change', (e) => {
        const oldName = track.name;
        const newName = e.target.value;
        if (oldName !== newName) {
            captureStateForUndo(`Rename Track "${oldName}" to "${newName}"`);
        }
        track.name = newName;
        track.inspectorWindow.titleBar.querySelector('span').textContent = `Track: ${track.name}`;
        updateMixerWindow();
    });
    winEl.querySelector(`#muteBtn-${track.id}`)?.addEventListener('click', () => handleTrackMute(track.id));
    winEl.querySelector(`#soloBtn-${track.id}`)?.addEventListener('click', () => handleTrackSolo(track.id));
    winEl.querySelector(`#armInputBtn-${track.id}`)?.addEventListener('click', () => handleTrackArm(track.id));
    winEl.querySelector(`#removeTrackBtn-${track.id}`)?.addEventListener('click', () => removeTrack(track.id));

    const volSliderContainer = winEl.querySelector(`#volumeSliderContainer-${track.id}`);
    if (volSliderContainer) {
        const volKnob = createKnob({
            label: 'Volume', min: 0, max: 1, step: 0.01, initialValue: track.previousVolumeBeforeMute, decimals: 2, sensitivity: 0.8,
            trackRef: track,
            onValueChange: (val, oldVal, fromInteraction) => {
                track.setVolume(val, fromInteraction);
                updateMixerWindow();
            }
        });
        volSliderContainer.appendChild(volKnob.element);
        track.inspectorControls.volume = volKnob;
    }

    const seqLenBarsInput = winEl.querySelector(`#sequenceLengthBars-${track.id}`);
    const seqLenDisplaySpan = winEl.querySelector(`#sequenceLengthDisplay-${track.id}`);
    if(seqLenBarsInput && seqLenDisplaySpan) {
        seqLenBarsInput.addEventListener('change', (e) => {
            let numBars = parseInt(e.target.value);
            if(isNaN(numBars) || numBars < 1) numBars = 1;
            if(numBars > 256) numBars = 256;
            e.target.value = numBars;
            const numSteps = numBars * STEPS_PER_BAR;
            if (track.sequenceLength !== numSteps) {
                captureStateForUndo(`Set Seq Length for ${track.name} to ${numBars} bars`);
                track.setSequenceLength(numSteps);
                seqLenDisplaySpan.textContent = `${numBars} bars (${numSteps} steps)`;
                if (track.sequencerWindow && !track.sequencerWindow.isMinimized) {
                    openTrackSequencerWindow(track.id, true);
                }
            }
        });
    }
}

function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') {
        initializeSynthSpecificControls(track, winEl);
    } else if (track.type === 'Sampler') {
        initializeSamplerSpecificControls(track, winEl);
    } else if (track.type === 'DrumSampler') {
        initializeDrumSamplerSpecificControls(track, winEl);
    } else if (track.type === 'InstrumentSampler') {
        initializeInstrumentSamplerSpecificControls(track, winEl);
    }
}

function initializeSynthSpecificControls(track, winEl) {
    const oscTypeSelect = winEl.querySelector(`#oscType-${track.id}`);
    if (oscTypeSelect) {
        ['sine', 'square', 'sawtooth', 'triangle', 'pwm', 'pulse'].forEach(type => oscTypeSelect.add(new Option(type, type)));
        oscTypeSelect.value = track.synthParams.oscillator.type;
        oscTypeSelect.addEventListener('change', (e) => {
            captureStateForUndo(`Set Osc Type for ${track.name} to ${e.target.value}`);
            track.setSynthOscillatorType(e.target.value);
        });
    }
    const envAKnob = createKnob({ label: 'Attack', min: 0.005, max: 2, step: 0.001, initialValue: track.synthParams.envelope.attack, decimals: 3, trackRef: track, onValueChange: (val) => track.setSynthEnvelope('attack', val) });
    winEl.querySelector(`#envAttackSlider-${track.id}`)?.appendChild(envAKnob.element); track.inspectorControls.envAttack = envAKnob;
    const envDKnob = createKnob({ label: 'Decay', min: 0.01, max: 2, step: 0.01, initialValue: track.synthParams.envelope.decay, decimals: 2, trackRef: track, onValueChange: (val) => track.setSynthEnvelope('decay', val) });
    winEl.querySelector(`#envDecaySlider-${track.id}`)?.appendChild(envDKnob.element); track.inspectorControls.envDecay = envDKnob;
    const envSKnob = createKnob({ label: 'Sustain', min: 0, max: 1, step: 0.01, initialValue: track.synthParams.envelope.sustain, decimals: 2, trackRef: track, onValueChange: (val) => track.setSynthEnvelope('sustain', val) });
    winEl.querySelector(`#envSustainSlider-${track.id}`)?.appendChild(envSKnob.element); track.inspectorControls.envSustain = envSKnob;
    const envRKnob = createKnob({ label: 'Release', min: 0.01, max: 5, step: 0.01, initialValue: track.synthParams.envelope.release, decimals: 2, trackRef: track, onValueChange: (val) => track.setSynthEnvelope('release', val) });
    winEl.querySelector(`#envReleaseSlider-${track.id}`)?.appendChild(envRKnob.element); track.inspectorControls.envRelease = envRKnob;
}

function initializeSamplerSpecificControls(track, winEl) {
    const dropZoneEl = winEl.querySelector(`#dropZone-${track.id}-sampler`);
    const fileInputEl = winEl.querySelector(`#fileInput-${track.id}`);
    if (dropZoneEl && fileInputEl) {
        setupDropZoneListeners(dropZoneEl, track.id, 'Sampler');
        fileInputEl.onchange = (e) => {
            captureStateForUndo(`Load sample to ${track.name}`);
            loadSampleFile(e, track.id, 'Sampler');
        };
    }
    renderSamplePads(track);
    winEl.querySelector(`#applySliceEditsBtn-${track.id}`)?.addEventListener('click', () => {
        captureStateForUndo(`Apply Slice Edits for ${track.name}`);
        applySliceEdits(track.id);
    });

    const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`);
    if (canvas) { track.waveformCanvasCtx = canvas.getContext('2d'); drawWaveform(track); }
    updateSliceEditorUI(track);

    ['sliceStart', 'sliceEnd'].forEach(idSuffix => {
        const inputEl = winEl.querySelector(`#${idSuffix}-${track.id}`);
        if (inputEl) {
            inputEl.addEventListener('change', () => { /* Value picked up by applySliceEdits */ });
        }
    });

    const sVolK = createKnob({ label: 'Vol', min:0, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceVolume(track.selectedSliceForEdit, val)});
    winEl.querySelector(`#sliceVolumeSlider-${track.id}`)?.appendChild(sVolK.element); track.inspectorControls.sliceVolume = sVolK;
    const sPitK = createKnob({ label: 'Pitch', min:-24, max:24, step:1, initialValue: track.slices[track.selectedSliceForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setSlicePitchShift(track.selectedSliceForEdit, val)});
    winEl.querySelector(`#slicePitchKnob-${track.id}`)?.appendChild(sPitK.element); track.inspectorControls.slicePitch = sPitK;
    const sEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.attack || 0.01, decimals:3, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'attack', val)});
    winEl.querySelector(`#sliceEnvAttackSlider-${track.id}`)?.appendChild(sEAK.element); track.inspectorControls.sliceEnvAttack = sEAK;
    const sEDK = createKnob({ label: 'Decay', min:0.01, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.decay || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'decay', val)});
    winEl.querySelector(`#sliceEnvDecaySlider-${track.id}`)?.appendChild(sEDK.element); track.inspectorControls.sliceEnvDecay = sEDK;
    const sESK = createKnob({ label: 'Sustain', min:0, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.sustain || 1.0, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'sustain', val)});
    winEl.querySelector(`#sliceEnvSustainSlider-${track.id}`)?.appendChild(sESK.element); track.inspectorControls.sliceEnvSustain = sESK;
    const sERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'release', val)});
    winEl.querySelector(`#sliceEnvReleaseSlider-${track.id}`)?.appendChild(sERK.element); track.inspectorControls.sliceEnvRelease = sERK;

    winEl.querySelector(`#sliceLoopToggle-${track.id}`)?.addEventListener('click', (e) => {
        captureStateForUndo(`Toggle Loop for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
        track.setSliceLoop(track.selectedSliceForEdit, !track.slices[track.selectedSliceForEdit].loop); e.target.textContent = track.slices[track.selectedSliceForEdit].loop ? 'Loop: ON' : 'Loop: OFF'; e.target.classList.toggle('active', track.slices[track.selectedSliceForEdit].loop); });
    winEl.querySelector(`#sliceReverseToggle-${track.id}`)?.addEventListener('click', (e) => {
        captureStateForUndo(`Toggle Reverse for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
        track.setSliceReverse(track.selectedSliceForEdit, !track.slices[track.selectedSliceForEdit].reverse); e.target.textContent = track.slices[track.selectedSliceForEdit].reverse ? 'Rev: ON' : 'Rev: OFF'; e.target.classList.toggle('active', track.slices[track.selectedSliceForEdit].reverse);});

    const polyphonyToggleBtn = winEl.querySelector(`#slicerPolyphonyToggle-${track.id}`);
    if (polyphonyToggleBtn) {
        polyphonyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
        polyphonyToggleBtn.classList.toggle('active', !track.slicerIsPolyphonic);
        polyphonyToggleBtn.addEventListener('click', () => {
            captureStateForUndo(`Toggle Slicer Polyphony for ${track.name} to ${!track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`);
            track.slicerIsPolyphonic = !track.slicerIsPolyphonic;
            polyphonyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
            polyphonyToggleBtn.classList.toggle('active', !track.slicerIsPolyphonic);
            if (!track.slicerIsPolyphonic) {
                track.setupSlicerMonoNodes();
                 if(track.slicerMonoPlayer && track.audioBuffer?.loaded) track.slicerMonoPlayer.buffer = track.audioBuffer;
                showNotification(`${track.name} slicer mode: Mono`, 2000);
            } else {
                track.disposeSlicerMonoNodes();
                showNotification(`${track.name} slicer mode: Poly`, 2000);
            }
        });
    }
}

function initializeDrumSamplerSpecificControls(track, winEl) {
    const padLoadContainer = winEl.querySelector(`#drumPadLoadContainer-${track.id}`);
    if (padLoadContainer) {
        updateDrumPadControlsUI(track);
    }
    renderDrumSamplerPads(track);

    const pVolK = createKnob({ label: 'Pad Vol', min:0, max:1, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(track.selectedDrumPadForEdit, val)});
    winEl.querySelector(`#drumPadVolumeSlider-${track.id}`)?.appendChild(pVolK.element); track.inspectorControls.drumPadVolume = pVolK;
    const pPitK = createKnob({ label: 'Pad Pitch', min:-24, max:24, step:1, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(track.selectedDrumPadForEdit, val)});
    winEl.querySelector(`#drumPadPitchKnob-${track.id}`)?.appendChild(pPitK.element); track.inspectorControls.drumPadPitch = pPitK;
    const pEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.attack || 0.005, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'attack', val)});
    winEl.querySelector(`#drumPadEnvAttackSlider-${track.id}`)?.appendChild(pEAK.element); track.inspectorControls.drumPadEnvAttack = pEAK;
    const pERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'release', val)});
    winEl.querySelector(`#drumPadEnvReleaseSlider-${track.id}`)?.appendChild(pERK.element); track.inspectorControls.drumPadEnvRelease = pERK;
}

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    const dropZoneEl = winEl.querySelector(`#dropZone-${track.id}-instrumentsampler`);
    const fileInputEl = winEl.querySelector(`#instrumentFileInput-${track.id}`);
    if (dropZoneEl && fileInputEl) {
        setupDropZoneListeners(dropZoneEl, track.id, 'InstrumentSampler');
         fileInputEl.onchange = (e) => {
            captureStateForUndo(`Load sample to Instrument Sampler ${track.name}`);
            loadSampleFile(e, track.id, 'InstrumentSampler');
        };
    }

    const iCanvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if(iCanvas) { track.instrumentWaveformCanvasCtx = iCanvas.getContext('2d'); drawInstrumentWaveform(track); }

    winEl.querySelector(`#instrumentRootNote-${track.id}`)?.addEventListener('change', (e) => {
        captureStateForUndo(`Set Root Note for ${track.name} to ${e.target.value}`);
        track.setInstrumentSamplerRootNote(e.target.value);
    });
    winEl.querySelector(`#instrumentLoopStart-${track.id}`)?.addEventListener('change', (e) => {
        captureStateForUndo(`Set Loop Start for ${track.name} to ${e.target.value}`);
        track.setInstrumentSamplerLoopStart(parseFloat(e.target.value));
    });
    winEl.querySelector(`#instrumentLoopEnd-${track.id}`)?.addEventListener('change', (e) => {
        captureStateForUndo(`Set Loop End for ${track.name} to ${e.target.value}`);
        track.setInstrumentSamplerLoopEnd(parseFloat(e.target.value));
    });
    winEl.querySelector(`#instrumentLoopToggle-${track.id}`)?.addEventListener('click', (e) => {
        captureStateForUndo(`Toggle Loop for ${track.name}`);
        track.setInstrumentSamplerLoop(!track.instrumentSamplerSettings.loop); e.target.textContent = track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF'; e.target.classList.toggle('active', track.instrumentSamplerSettings.loop);});

    const instPolyphonyToggleBtn = winEl.querySelector(`#instrumentSamplerPolyphonyToggle-${track.id}`);
    if (instPolyphonyToggleBtn) {
        instPolyphonyToggleBtn.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
        instPolyphonyToggleBtn.classList.toggle('active', !track.instrumentSamplerIsPolyphonic);
        instPolyphonyToggleBtn.addEventListener('click', () => {
            captureStateForUndo(`Toggle Instrument Sampler Polyphony for ${track.name} to ${!track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`);
            track.instrumentSamplerIsPolyphonic = !track.instrumentSamplerIsPolyphonic;
            instPolyphonyToggleBtn.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
            instPolyphonyToggleBtn.classList.toggle('active', !track.instrumentSamplerIsPolyphonic);
            showNotification(`${track.name} Instrument Sampler mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'} (for live input)`, 2000);
        });
    }

    const iEAK = createKnob({ label: 'Attack', min:0.005, max:2, step:0.001, initialValue: track.instrumentSamplerSettings.envelope.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('attack',val) });
    winEl.querySelector(`#instrumentEnvAttackSlider-${track.id}`)?.appendChild(iEAK.element); track.inspectorControls.instEnvAttack = iEAK;
    const iEDK = createKnob({ label: 'Decay', min:0.01, max:2, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('decay',val) });
    winEl.querySelector(`#instrumentEnvDecaySlider-${track.id}`)?.appendChild(iEDK.element); track.inspectorControls.instEnvDecay = iEDK;
    const iESK = createKnob({ label: 'Sustain', min:0, max:1, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('sustain',val) });
    winEl.querySelector(`#instrumentEnvSustainSlider-${track.id}`)?.appendChild(iESK.element); track.inspectorControls.instEnvSustain = iESK;
    const iERK = createKnob({ label: 'Release', min:0.01, max:5, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.release, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('release',val) });
    winEl.querySelector(`#instrumentEnvReleaseSlider-${track.id}`)?.appendChild(iERK.element); track.inspectorControls.instEnvRelease = iERK;
}
// --- END Track Inspector Control Initializer Functions ---


function openGlobalControlsWindow(savedState = null) {
    const windowId = 'globalControls';
    if (openWindows[windowId] && !savedState) {
         openWindows[windowId].restore(); return;
    }
    const contentDiv = document.createElement('div');
    contentDiv.className = 'global-controls-window p-2 space-y-3';
    const transportControlsDiv = document.createElement('div');
    transportControlsDiv.className = 'flex items-center gap-2';
    playBtn = document.createElement('button');
    playBtn.id = 'playBtnGlobal';
    playBtn.className = 'bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-sm shadow';
    playBtn.textContent = 'Play';
    transportControlsDiv.appendChild(playBtn);
    recordBtn = document.createElement('button');
    recordBtn.id = 'recordBtnGlobal';
    recordBtn.className = 'bg-gray-500 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-sm shadow';
    recordBtn.textContent = 'Record';
    transportControlsDiv.appendChild(recordBtn);
    contentDiv.appendChild(transportControlsDiv);
    const tempoDiv = document.createElement('div');
    tempoDiv.className = 'flex items-center gap-2';
    tempoDiv.innerHTML = `<label for="tempoGlobalInput" class="control-label text-xs">Tempo:</label>`;
    tempoInput = document.createElement('input');
    tempoInput.type = 'number';
    tempoInput.id = 'tempoGlobalInput';
    tempoInput.value = Tone.Transport.bpm.value.toFixed(1);
    tempoInput.min = "40"; tempoInput.max = "240"; tempoInput.step = "0.1";
    tempoInput.className = 'bg-white text-black w-16 p-1 rounded-sm text-center text-xs border border-gray-500';
    const bpmLabel = document.createElement('span');
    bpmLabel.textContent = ' BPM';
    bpmLabel.className = 'text-xs';
    tempoDiv.append(tempoInput, bpmLabel);
    contentDiv.appendChild(tempoDiv);
    const midiDiv = document.createElement('div');
    midiDiv.className = 'flex items-center gap-2 mt-2';
    midiInputSelectGlobal = document.createElement('select');
    midiInputSelectGlobal.id = 'midiInputSelectGlobal';
    midiInputSelectGlobal.className = 'bg-white text-black p-1 rounded-sm text-xs border border-gray-500 flex-grow';
    midiDiv.innerHTML = `<label for="midiInputSelectGlobal" class="text-xs">MIDI In:</label>`;
    midiDiv.appendChild(midiInputSelectGlobal);
    midiIndicatorGlobalEl = document.createElement('span');
    midiIndicatorGlobalEl.id='midiIndicatorGlobal';
    midiIndicatorGlobalEl.title = "MIDI Activity";
    keyboardIndicatorGlobalEl = document.createElement('span');
    keyboardIndicatorGlobalEl.id='keyboardIndicatorGlobal';
    keyboardIndicatorGlobalEl.title = "Keyboard Input Activity";
    midiDiv.append(midiIndicatorGlobalEl, keyboardIndicatorGlobalEl);
    contentDiv.appendChild(midiDiv);
    const meterContainer = document.createElement('div');
    meterContainer.id = 'masterMeterContainerGlobal';
    meterContainer.className = 'meter-bar-container mt-2';
    meterContainer.title="Master Output Level";
    meterContainer.style.height="15px";
    masterMeterBar = document.createElement('div');
    masterMeterBar.id = 'masterMeterBarGlobal';
    masterMeterBar.className = 'meter-bar';
    masterMeterBar.style.width = '0%';
    meterContainer.appendChild(masterMeterBar);
    contentDiv.appendChild(meterContainer);
    const winOptions = {
        width: 280, height: 250, x: 20, y: 20,
        initialContentKey: 'globalControls'
    };
     if (savedState) {
        Object.assign(winOptions, {
            x: parseFloat(savedState.left), y: parseFloat(savedState.top),
            width: parseFloat(savedState.width), height: parseFloat(savedState.height),
            zIndex: savedState.zIndex, isMinimized: savedState.isMinimized
        });
    }
    const globalControlsWin = createWindow(windowId, 'Global Controls', contentDiv, winOptions);
    if (!globalControlsWin || !globalControlsWin.element) {
        showNotification("Failed to create Global Controls window.", 5000);
        return null;
    }
    const winEl = globalControlsWin.contentArea;

    playBtn = winEl.querySelector('#playBtnGlobal');
    recordBtn = winEl.querySelector('#recordBtnGlobal');
    tempoInput = winEl.querySelector('#tempoGlobalInput');
    masterMeterBar = winEl.querySelector('#masterMeterBarGlobal');
    midiInputSelectGlobal = winEl.querySelector('#midiInputSelectGlobal');
    midiIndicatorGlobalEl = winEl.querySelector('#midiIndicatorGlobal');
    keyboardIndicatorGlobalEl = winEl.querySelector('#keyboardIndicatorGlobal');

    if (playBtn) {
        playBtn.addEventListener('click', async () => {
            try {
                await initAudioContextAndMasterMeter();
                if (Tone.Transport.state !== 'started') {
                    Tone.Transport.position = 0;
                    Tone.Transport.start();
                } else {
                    Tone.Transport.pause();
                }
            } catch (error) {
                console.error("Error in play/pause click:", error);
                const actualPlayBtn = document.getElementById('playBtnGlobal');
                if (actualPlayBtn && Tone.Transport.state !== 'started') {
                    actualPlayBtn.textContent = 'Play';
                }
            }
        });
    }
    if (recordBtn) {
        recordBtn.addEventListener('click', async () => {
            try {
                await initAudioContextAndMasterMeter();
                if (!isRecording) {
                    if (!armedTrackId) {
                        showNotification("No track armed for recording. Arm a track first.", 3000);
                        return;
                    }
                    const trackToRecord = tracks.find(t => t.id === armedTrackId);
                    if (!trackToRecord) {
                        showNotification("Armed track not found.", 3000);
                        return;
                    }
                    isRecording = true;
                    recordingTrackId = armedTrackId;
                    recordingStartTime = Tone.Transport.seconds;
                    recordBtn.textContent = 'Stop Rec';
                    recordBtn.classList.add('recording');
                    showNotification(`Recording started for ${trackToRecord.name}.`, 2000);
                    captureStateForUndo(`Start Recording on ${trackToRecord.name}`);
                    if (Tone.Transport.state !== 'started') {
                        Tone.Transport.position = 0;
                        Tone.Transport.start();
                    }
                } else {
                    isRecording = false;
                    recordBtn.textContent = 'Record';
                    recordBtn.classList.remove('recording');
                    showNotification("Recording stopped.", 2000);
                    captureStateForUndo(`Stop Recording (Track: ${tracks.find(t => t.id === recordingTrackId)?.name || 'Unknown'})`);
                    recordingTrackId = null;
                }
            } catch (error) {
                console.error("Error in record button click:", error);
                showNotification("Error during recording setup.", 3000);
                if (recordBtn) {
                    recordBtn.textContent = 'Record';
                    recordBtn.classList.remove('recording');
                }
                isRecording = false;
                recordingTrackId = null;
            }
        });
    }
    if (tempoInput) {
        tempoInput.addEventListener('change', (e) => {
            const newTempo = parseFloat(e.target.value);
            if (!isNaN(newTempo) && newTempo >= 40 && newTempo <= 240) {
                if (Tone.Transport.bpm.value !== newTempo) {
                    captureStateForUndo(`Set Tempo to ${newTempo.toFixed(1)} BPM`);
                }
                Tone.Transport.bpm.value = newTempo;
                updateTaskbarTempoDisplay(newTempo);
            } else {
                e.target.value = Tone.Transport.bpm.value.toFixed(1);
            }
        });
    }
    if(midiInputSelectGlobal) {
        populateMIDIInputs();
        if (activeMIDIInput) midiInputSelectGlobal.value = activeMIDIInput.id;
        midiInputSelectGlobal.onchange = () => {
            const oldMidiName = activeMIDIInput ? activeMIDIInput.name : "No MIDI Input";
            const newMidiId = midiInputSelectGlobal.value;
            const newMidiDevice = midiAccess && newMidiId ? midiAccess.inputs.get(newMidiId) : null;
            const newMidiName = newMidiDevice ? newMidiDevice.name : "No MIDI Input";
            if (oldMidiName !== newMidiName) {
                 captureStateForUndo(`Change MIDI Input to ${newMidiName}`);
            }
            selectMIDIInput();
        };
    }
    if (!transportEventsInitialized && typeof Tone !== 'undefined' && Tone.Transport) {
        Tone.Transport.on('start', () => {
            const btn = document.getElementById('playBtnGlobal');
            if (btn) btn.textContent = 'Pause';
        });
        Tone.Transport.on('pause', () => {
            const btn = document.getElementById('playBtnGlobal');
            if (btn) btn.textContent = 'Play';
             if (isRecording) {
                isRecording = false;
                const recBtn = document.getElementById('recordBtnGlobal');
                if (recBtn) {
                    recBtn.textContent = 'Record';
                    recBtn.classList.remove('recording');
                }
                showNotification("Recording stopped due to transport pause.", 2000);
                captureStateForUndo(`Stop Recording (Track: ${tracks.find(t => t.id === recordingTrackId)?.name || 'Unknown'}, transport paused)`);
                recordingTrackId = null;
            }
        });
        Tone.Transport.on('stop', () => {
            const btn = document.getElementById('playBtnGlobal');
            if (btn) btn.textContent = 'Play';
            document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
            if (isRecording) {
                isRecording = false;
                const recBtn = document.getElementById('recordBtnGlobal');
                if (recBtn) {
                    recBtn.textContent = 'Record';
                    recBtn.classList.remove('recording');
                }
                showNotification("Recording stopped due to transport stop.", 2000);
                captureStateForUndo(`Stop Recording (Track: ${tracks.find(t => t.id === recordingTrackId)?.name || 'Unknown'}, transport stopped)`);
                recordingTrackId = null;
            }
        });
        transportEventsInitialized = true;
    }
    return globalControlsWin;
}

function openTrackInspectorWindow(trackId, savedState = null) {
    const track = tracks.find(t => t.id === trackId);
    if (!track) {
        showNotification(`Track with ID ${trackId} not found.`, 3000);
        return null;
    }
    const inspectorId = `trackInspector-${track.id}`;

    if (openWindows[inspectorId] && !savedState) {
        openWindows[inspectorId].restore();
        return openWindows[inspectorId];
    }
    if (openWindows[inspectorId] && (savedState)) {
        openWindows[inspectorId].close();
    }

    track.inspectorControls = {};
    const inspectorContentElement = buildTrackInspectorContentDOM(track);

    let windowHeight = 450;
    if (track.type === 'Synth') windowHeight = 520;
    else if (track.type === 'Sampler') windowHeight = 620;
    else if (track.type === 'DrumSampler') windowHeight = 580;
    else if (track.type === 'InstrumentSampler') windowHeight = 620;

    const winOptions = {
        width: Math.min(500, window.innerWidth - 40),
        height: Math.min(windowHeight, window.innerHeight - 80),
        initialContentKey: `trackInspector-${track.id}`
    };
    if (savedState) {
        Object.assign(winOptions, {
            x: parseFloat(savedState.left), y: parseFloat(savedState.top),
            width: parseFloat(savedState.width), height: parseFloat(savedState.height),
            zIndex: savedState.zIndex, isMinimized: savedState.isMinimized
        });
    }

    const inspectorWin = createWindow(inspectorId, `Track: ${track.name}`, inspectorContentElement, winOptions);
    if (!inspectorWin || !inspectorWin.element) {
        showNotification(`Failed to create Inspector for track ${track.id}`, 5000);
        return null;
    }
    track.inspectorWindow = inspectorWin;
    const winEl = inspectorWin.contentArea;

    initializeCommonInspectorControls(track, winEl);
    initializeTypeSpecificInspectorControls(track, winEl);

    setTimeout(() => {
        Object.values(track.inspectorControls).forEach(control => {
            if (control && control.type === 'knob' && typeof control.refreshVisuals === 'function') {
                control.refreshVisuals();
            }
        });
    }, 0);
    return inspectorWin;
}

// --- Effects Rack DOM Builder and Control Definitions ---
const effectControlDefinitions = {
    distortion: {
        title: 'Distortion',
        controls: [
            { idPrefix: 'distAmount', type: 'knob', label: 'Amount', min:0, max:1, step:0.01, paramKey: 'amount', decimals:2, setter: 'setDistortionAmount' }
        ]
    },
    saturation: {
        title: 'Saturation',
        controls: [
            { idPrefix: 'satWet', type: 'knob', label: 'Sat Wet', min:0, max:1, step:0.01, paramKey: 'wet', decimals:2, setter: 'setSaturationWet' },
            { idPrefix: 'satAmount', type: 'knob', label: 'Sat Amt', min:0, max:20, step:1, paramKey: 'amount', decimals:0, setter: 'setSaturationAmount' }
        ]
    },
    filter: {
        title: 'Filter',
        controls: [
            { idPrefix: 'filterType', type: 'select', options: ['lowpass', 'highpass'], paramKey: 'type', setter: 'setFilterType' },
            { idPrefix: 'filterFreq', type: 'knob', label: 'Freq', min:20, max:20000, step:1, paramKey: 'frequency', decimals:0, displaySuffix:'Hz', setter: 'setFilterFrequency' },
            { idPrefix: 'filterQ', type: 'knob', label: 'Q', min:0.1, max:20, step:0.1, paramKey: 'Q', decimals:1, customSetter: (track, val) => { track.effects.filter.Q = parseFloat(val); track.filterNode.Q.value = parseFloat(val); } }
        ]
    },
    chorus: {
        title: 'Chorus',
        controls: [
            { idPrefix: 'chorusWet', type: 'knob', label: 'Chorus Wet', min:0, max:1, step:0.01, paramKey: 'wet', decimals:2, setter: 'setChorusWet' },
            { idPrefix: 'chorusFreq', type: 'knob', label: 'Chorus Freq', min:0.1, max:20, step:0.1, paramKey: 'frequency', decimals:1, displaySuffix:'Hz', setter: 'setChorusFrequency' },
            { idPrefix: 'chorusDelayTime', type: 'knob', label: 'Chorus Delay', min:1, max:20, step:0.1, paramKey: 'delayTime', decimals:1, displaySuffix:'ms', setter: 'setChorusDelayTime' },
            { idPrefix: 'chorusDepth', type: 'knob', label: 'Chorus Depth', min:0, max:1, step:0.01, paramKey: 'depth', decimals:2, setter: 'setChorusDepth' }
        ]
    },
    eq3: {
        title: 'EQ3',
        controls: [
            { idPrefix: 'eqLow', type: 'knob', label: 'Low', min:-24, max:24, step:1, paramKey: 'low', decimals:0, displaySuffix:'dB', setter: 'setEQ3Low' },
            { idPrefix: 'eqMid', type: 'knob', label: 'Mid', min:-24, max:24, step:1, paramKey: 'mid', decimals:0, displaySuffix:'dB', setter: 'setEQ3Mid' },
            { idPrefix: 'eqHigh', type: 'knob', label: 'High', min:-24, max:24, step:1, paramKey: 'high', decimals:0, displaySuffix:'dB', setter: 'setEQ3High' }
        ]
    },
    compressor: {
        title: 'Compressor',
        controls: [
            { idPrefix: 'compThresh', type: 'knob', label: 'Thresh', min:-60, max:0, step:1, paramKey: 'threshold', decimals:0, displaySuffix:'dB', setter: 'setCompressorThreshold' },
            { idPrefix: 'compRatio', type: 'knob', label: 'Ratio', min:1, max:20, step:1, paramKey: 'ratio', decimals:0, setter: 'setCompressorRatio' },
            { idPrefix: 'compAttack', type: 'knob', label: 'Attack', min:0.001, max:0.1, step:0.001, paramKey: 'attack', decimals:3, displaySuffix:'s', setter: 'setCompressorAttack' },
            { idPrefix: 'compRelease', type: 'knob', label: 'Release', min:0.01, max:1, step:0.01, paramKey: 'release', decimals:2, displaySuffix:'s', setter: 'setCompressorRelease' },
            { idPrefix: 'compKnee', type: 'knob', label: 'Knee', min:0, max:40, step:1, paramKey: 'knee', decimals:0, displaySuffix:'dB', setter: 'setCompressorKnee' }
        ]
    },
    delay: {
        title: 'Delay',
        controls: [
            { idPrefix: 'delayWet', type: 'knob', label: 'Wet', min:0, max:1, step:0.01, paramKey: 'wet', decimals:2, setter: 'setDelayWet' },
            { idPrefix: 'delayTime', type: 'knob', label: 'Time', min:0, max:1, step:0.01, paramKey: 'time', decimals:2, displaySuffix:'s', setter: 'setDelayTime' },
            { idPrefix: 'delayFeedback', type: 'knob', label: 'Feedback', min:0, max:0.99, step:0.01, paramKey: 'feedback', decimals:2, setter: 'setDelayFeedback' }
        ]
    },
    reverb: {
        title: 'Reverb',
        controls: [
            { idPrefix: 'reverbWet', type: 'knob', label: 'Wet', min:0, max:1, step:0.01, paramKey: 'wet', decimals:2, setter: 'setReverbWet' },
            { idPrefix: 'reverbDecay', type: 'knob', label: 'Decay', min:0.1, max:10, step:0.1, paramKey: 'decay', decimals:1, displaySuffix:'s', customSetter: (track, val) => { track.effects.reverb.decay = parseFloat(val); track.reverbNode.decay = parseFloat(val);} },
            { idPrefix: 'reverbPreDelay', type: 'knob', label: 'PreDelay', min:0, max:0.1, step:0.001, paramKey: 'preDelay', decimals:3, displaySuffix:'s', customSetter: (track, val) => { track.effects.reverb.preDelay = parseFloat(val); track.reverbNode.preDelay = parseFloat(val);} }
        ]
    }
};

function buildEffectsRackContentDOM(track) {
    const mainContentDiv = document.createElement('div');
    mainContentDiv.className = 'effects-rack-window p-2 space-y-3';

    for (const effectKey in effectControlDefinitions) {
        const effectDef = effectControlDefinitions[effectKey];
        const effectGroupDiv = document.createElement('div');
        effectGroupDiv.className = 'effect-group';
        const titleEl = document.createElement('h4');
        titleEl.className = 'text-sm font-semibold';
        titleEl.textContent = effectDef.title;
        effectGroupDiv.appendChild(titleEl);
        const controlsContainer = document.createElement('div');
        if (effectDef.controls.length > 1 || ['distortion', 'saturation'].includes(effectKey)) {
             controlsContainer.className = 'control-group';
        }
        effectDef.controls.forEach(controlDef => {
            if (controlDef.type === 'select') {
                const selectEl = document.createElement('select');
                selectEl.id = `${controlDef.idPrefix}-${track.id}`;
                selectEl.className = 'text-xs p-1 border w-full mb-1 bg-white text-black';
                controlsContainer.appendChild(selectEl);
            } else if (controlDef.type === 'knob') {
                const knobPlaceholder = document.createElement('div');
                knobPlaceholder.id = `${controlDef.idPrefix}Knob-${track.id}`;
                controlsContainer.appendChild(knobPlaceholder);
            }
        });
        effectGroupDiv.appendChild(controlsContainer);
        mainContentDiv.appendChild(effectGroupDiv);
    }
    return mainContentDiv;
}

function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return null;
    const windowId = `effectsRack-${track.id}`;

    if (openWindows[windowId] && !savedState) {
        openWindows[windowId].restore();
        return openWindows[windowId];
    }
     if (openWindows[windowId] && savedState) {
        openWindows[windowId].close();
    }

    track.inspectorControls = track.inspectorControls || {};
    const effectsRackContentElement = buildEffectsRackContentDOM(track);

    const winOptions = {
        width: 450, height: 600,
        initialContentKey: `effectsRack-${track.id}`
    };
    if (savedState) {
        Object.assign(winOptions, {
            x: parseFloat(savedState.left), y: parseFloat(savedState.top),
            width: parseFloat(savedState.width), height: parseFloat(savedState.height),
            zIndex: savedState.zIndex, isMinimized: savedState.isMinimized
        });
    }

    const effectsWin = createWindow(windowId, `Effects: ${track.name}`, effectsRackContentElement, winOptions);
    if (!effectsWin || !effectsWin.element) {
        showNotification("Failed to create Effects Rack.", 5000);
        return null;
    }
    track.effectsRackWindow = effectsWin;
    const winEl = effectsWin.contentArea;

    for (const effectKey in effectControlDefinitions) {
        const effectDef = effectControlDefinitions[effectKey];
        effectDef.controls.forEach(controlDef => {
            const controlIdBase = `${controlDef.idPrefix}-${track.id}`;
            const initialValue = track.effects[effectKey] ? track.effects[effectKey][controlDef.paramKey] : controlDef.min;

            if (controlDef.type === 'select') {
                const selectEl = winEl.querySelector(`#${controlIdBase}`);
                if (selectEl) {
                    controlDef.options.forEach(opt => selectEl.add(new Option(opt, opt)));
                    selectEl.value = initialValue;
                    selectEl.addEventListener('change', (e) => {
                        captureStateForUndo(`Set ${effectDef.title} ${controlDef.paramKey} for ${track.name} to ${e.target.value}`);
                        if (track[controlDef.setter]) {
                            track[controlDef.setter](e.target.value);
                        }
                    });
                }
            } else if (controlDef.type === 'knob') {
                const knobPlaceholder = winEl.querySelector(`#${controlDef.idPrefix}Knob-${track.id}`);
                if (knobPlaceholder) {
                    const knob = createKnob({
                        label: controlDef.label,
                        min: controlDef.min, max: controlDef.max, step: controlDef.step,
                        initialValue: initialValue,
                        decimals: controlDef.decimals, displaySuffix: controlDef.displaySuffix,
                        trackRef: track,
                        onValueChange: (val) => {
                            if (controlDef.customSetter) {
                                controlDef.customSetter(track, val);
                            } else if (track[controlDef.setter]) {
                                track[controlDef.setter](val);
                            }
                        }
                    });
                    knobPlaceholder.appendChild(knob.element);
                    track.inspectorControls[controlDef.idPrefix] = knob;
                }
            }
        });
    }
    setTimeout(() => {
        for (const effectKey in effectControlDefinitions) {
            effectControlDefinitions[effectKey].controls.forEach(controlDef => {
                if (controlDef.type === 'knob' && track.inspectorControls[controlDef.idPrefix]) {
                    track.inspectorControls[controlDef.idPrefix].refreshVisuals();
                }
            });
        }
    }, 0);

    return effectsWin;
}
// --- END Effects Rack ---

// --- Sequencer Window DOM Builder ---
function buildSequencerContentDOM(track, rows, rowLabels, numBars) {
    const mainContentDiv = document.createElement('div');
    mainContentDiv.className = 'sequencer-window-content p-2';

    const titleP = document.createElement('p');
    titleP.className = 'text-xs';
    titleP.textContent = `${track.name} - ${track.type} Sequencer (${rows} rows x ${track.sequenceLength} steps, ${numBars} Bars)`;
    mainContentDiv.appendChild(titleP);

    const gridContainer = document.createElement('div');
    gridContainer.className = 'sequencer-grid-container';

    const gridDiv = document.createElement('div');
    gridDiv.className = 'sequencer-grid';
    gridDiv.style.gridTemplateColumns = `50px repeat(${track.sequenceLength}, 1fr)`;
    gridDiv.style.gridTemplateRows = `auto repeat(${rows}, auto)`;
    gridDiv.style.setProperty('--steps-per-bar', STEPS_PER_BAR);

    // Top-left empty cell
    const placeholderCell = document.createElement('div');
    placeholderCell.className = 'sequencer-bar-header-placeholder';
    gridDiv.appendChild(placeholderCell);

    // Bar headers
    for (let bar = 0; bar < numBars; bar++) {
        const barHeaderCell = document.createElement('div');
        barHeaderCell.className = 'sequencer-bar-header-cell';
        barHeaderCell.textContent = `Bar ${bar + 1}`;
        gridDiv.appendChild(barHeaderCell);
    }

    // Rows (labels and step cells)
    for (let r = 0; r < rows; r++) {
        const labelCell = document.createElement('div');
        labelCell.className = 'sequencer-label-cell';
        labelCell.title = rowLabels[r] || '';
        labelCell.textContent = rowLabels[r] || '';
        gridDiv.appendChild(labelCell);

        for (let c = 0; c < track.sequenceLength; c++) {
            const stepCell = document.createElement('div');
            let cellClass = 'sequencer-step-cell';
            const beatInBar = (c % STEPS_PER_BAR);

            if (STEPS_PER_BAR === 16) {
                if (beatInBar >= 0 && beatInBar <= 3) cellClass += ' beat-1';
                else if (beatInBar >= 4 && beatInBar <= 7) cellClass += ' beat-2';
                else if (beatInBar >= 8 && beatInBar <= 11) cellClass += ' beat-3';
                else if (beatInBar >= 12 && beatInBar <= 15) cellClass += ' beat-4';
            } else {
                if (Math.floor(beatInBar / 4) % 2 === 0) cellClass += ' beat-1';
                else cellClass += ' beat-2';
            }

            const stepData = track.sequenceData[r]?.[c];
            if (stepData && stepData.active) {
                if (track.type === 'Synth') cellClass += ' active-synth';
                else if (track.type === 'Sampler') cellClass += ' active-sampler';
                else if (track.type === 'DrumSampler') cellClass += ' active-drum-sampler';
                else if (track.type === 'InstrumentSampler') cellClass += ' active-instrument-sampler';
            }
            stepCell.className = cellClass;
            stepCell.dataset.row = r;
            stepCell.dataset.col = c;
            stepCell.title = `${rowLabels[r] || ''} - Step ${c + 1}`;
            gridDiv.appendChild(stepCell);
        }
    }
    gridContainer.appendChild(gridDiv);
    mainContentDiv.appendChild(gridContainer);
    return mainContentDiv;
}


function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return null;
    const windowId = `sequencerWin-${track.id}`;
    activeSequencerTrackId = track.id;

    if (openWindows[windowId] && !forceRedraw && !savedState) {
        openWindows[windowId].restore();
        return openWindows[windowId];
    }
    if (openWindows[windowId] && (forceRedraw || savedState)) {
        openWindows[windowId].close();
    }

    let windowTitle = `Sequencer: ${track.name}`;
    let rows = 0, rowLabels = [];
    if (track.type === 'Synth' || track.type === 'InstrumentSampler') {
        rows = synthPitches.length; rowLabels = synthPitches;
    } else if (track.type === 'Sampler') {
        rows = track.slices.length; rowLabels = track.slices.map((s, i) => `Slice ${i + 1}`);
    } else if (track.type === 'DrumSampler') {
        rows = numDrumSamplerPads; rowLabels = Array.from({length: numDrumSamplerPads}, (_, i) => `Pad ${i+1}`);
    }
    const numBars = Math.ceil(track.sequenceLength / STEPS_PER_BAR);

    // Build the content DOM
    const sequencerContentElement = buildSequencerContentDOM(track, rows, rowLabels, numBars);

    const winOptions = {
        width: Math.min(700, window.innerWidth - 50),
        height: Math.min(420 + rows * 22, window.innerHeight - 100),
        initialContentKey: `sequencerWin-${track.id}`
    };
     if (savedState) {
        Object.assign(winOptions, {
            x: parseFloat(savedState.left), y: parseFloat(savedState.top),
            width: parseFloat(savedState.width), height: parseFloat(savedState.height),
            zIndex: savedState.zIndex, isMinimized: savedState.isMinimized
        });
    }
    const seqWin = createWindow(windowId, windowTitle, sequencerContentElement, winOptions);
    if (!seqWin || !seqWin.element) { showNotification("Failed to create Sequencer window.", 5000); return null; }
    track.sequencerWindow = seqWin;

    seqWin.contentArea.querySelectorAll('.sequencer-step-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            captureStateForUndo(`Toggle Sequencer Step (Track ${track.name}, ${rowLabels[r] || 'Row ' + (r+1)}, Step ${c+1})`);
            if (!track.sequenceData[r]) track.sequenceData[r] = Array(track.sequenceLength).fill(null);
            if (!track.sequenceData[r][c] || !track.sequenceData[r][c].active) {
                track.sequenceData[r][c] = { active: true, velocity: defaultVelocity };
                let activeClass = '';
                if (track.type === 'Synth') activeClass = 'active-synth';
                else if (track.type === 'Sampler') activeClass = 'active-sampler';
                else if (track.type === 'DrumSampler') activeClass = 'active-drum-sampler';
                else if (track.type === 'InstrumentSampler') activeClass = 'active-instrument-sampler';
                // Remove other active classes before adding the new one
                cell.classList.remove('active-synth', 'active-sampler', 'active-drum-sampler', 'active-instrument-sampler');
                if(activeClass) cell.classList.add(activeClass);
            } else {
                track.sequenceData[r][c].active = false;
                cell.className = 'sequencer-step-cell'; // Reset to base
                const beatInBar = (c % STEPS_PER_BAR); // Re-apply beat highlighting
                if (STEPS_PER_BAR === 16) {
                    if (beatInBar >=0 && beatInBar <=3) cell.classList.add('beat-1');
                    else if (beatInBar >=4 && beatInBar <=7) cell.classList.add('beat-2');
                    else if (beatInBar >=8 && beatInBar <=11) cell.classList.add('beat-3');
                    else if (beatInBar >=12 && beatInBar <=15) cell.classList.add('beat-4');
                } else {
                    if (Math.floor(beatInBar / 4) % 2 === 0) cell.classList.add('beat-1');
                    else cell.classList.add('beat-2');
                }
            }
        });
    });
    seqWin.onCloseCallback = () => { if (activeSequencerTrackId === track.id) activeSequencerTrackId = null; };
    return seqWin;
}
// --- END Sequencer Window ---


function highlightPlayingStep(col, trackType, gridElement) {
    if (!gridElement) return;
    gridElement.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
    gridElement.querySelectorAll(`.sequencer-step-cell[data-col="${col}"]`).forEach(cell => cell.classList.add('playing'));
}
async function initAudioContextAndMasterMeter() {
    try {
        if (Tone.context.state !== 'running') {
            await Tone.start();
            console.log("AudioContext started.");
        }
        if (!masterMeter && Tone.getDestination()) {
            masterMeter = new Tone.Meter({ smoothing: 0.8 });
            Tone.getDestination().connect(masterMeter);
            console.log("Master meter initialized.");
        }
    } catch (error) {
        console.error("Error initializing audio context or master meter:", error);
        showNotification("Error initializing audio. Please ensure permissions and refresh.", 4000);
        throw error;
    }
}
function updateMeters() {
    if (masterMeter && masterMeterBar) {
        const level = Tone.dbToGain(masterMeter.getValue());
        masterMeterBar.style.width = `${Math.min(100, level * 100)}%`;
        masterMeterBar.classList.toggle('clipping', masterMeter.getValue() > -0.1);
    }
    const mixerMasterMeter = document.getElementById('mixerMasterMeterBar');
     if (masterMeter && mixerMasterMeter) {
        const level = Tone.dbToGain(masterMeter.getValue());
        mixerMasterMeter.style.width = `${Math.min(100, level * 100)}%`;
        mixerMasterMeter.classList.toggle('clipping', masterMeter.getValue() > -0.1);
    }
    tracks.forEach(track => {
        if (track.trackMeter) {
            const level = Tone.dbToGain(track.trackMeter.getValue());
            const inspectorMeterBar = track.inspectorWindow?.contentArea?.querySelector(`#trackMeterBar-${track.id}`);
            if (inspectorMeterBar) {
                inspectorMeterBar.style.width = `${Math.min(100, level * 100)}%`;
                inspectorMeterBar.classList.toggle('clipping', track.trackMeter.getValue() > -0.1);
            }
            const mixerMeterBar = openWindows['mixer']?.contentArea?.querySelector(`#mixerTrackMeterBar-${track.id}`);
             if (mixerMeterBar) {
                mixerMeterBar.style.width = `${Math.min(100, level * 100)}%`;
                mixerMeterBar.classList.toggle('clipping', track.trackMeter.getValue() > -0.1);
            }
        }
    });
    requestAnimationFrame(updateMeters);
}
function updateTaskbarTempoDisplay(newTempo) {
    if (taskbarTempoDisplay) {
        taskbarTempoDisplay.textContent = `${parseFloat(newTempo).toFixed(1)} BPM`;
    }
}
async function fetchSoundLibrary(libraryName, zipUrl) {
    const soundBrowserList = document.getElementById('soundBrowserList');
    const pathDisplay = document.getElementById('soundBrowserPathDisplay');
    if (!soundBrowserList || !pathDisplay) return;
    soundBrowserList.innerHTML = `<div class="sound-browser-loading">Fetching ${libraryName} sounds...</div>`;
    pathDisplay.textContent = `Path: / (${libraryName} - Loading...)`;
    currentLibraryName = libraryName;
    try {
        const response = await fetch(zipUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} fetching ${zipUrl}`);
        }
        const zipData = await response.arrayBuffer();
        const jszip = new JSZip();
        loadedZipFiles[libraryName] = await jszip.loadAsync(zipData);
        currentSoundFileTree = {};
        loadedZipFiles[libraryName].forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return;
            const pathParts = relativePath.split('/').filter(p => p);
            let currentLevel = currentSoundFileTree;
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (i === pathParts.length - 1) {
                    if (part.endsWith('.wav') || part.endsWith('.mp3') || part.endsWith('.ogg')) {
                        currentLevel[part] = { type: 'file', entry: zipEntry, fullPath: relativePath };
                    }
                } else {
                    if (!currentLevel[part] || currentLevel[part].type !== 'folder') {
                        currentLevel[part] = { type: 'folder', children: {} };
                    }
                    currentLevel = currentLevel[part].children;
                }
            }
        });
        currentSoundBrowserPath = [];
        renderSoundBrowserDirectory(currentSoundBrowserPath, currentSoundFileTree);
    } catch (error) {
        console.error(`Error fetching or processing ${libraryName} ZIP:`, error);
        showNotification(`Error with ${libraryName} library: ${error.message}`, 4000);
        if (soundBrowserList) soundBrowserList.innerHTML = `<div class="sound-browser-loading">Error fetching ${libraryName}. Check console.</div>`;
        if (pathDisplay) pathDisplay.textContent = `Path: / (Error - ${libraryName})`;
    }
}
function renderSoundBrowserDirectory(pathArray, treeNode) {
    const soundBrowserList = document.getElementById('soundBrowserList');
    const pathDisplay = document.getElementById('soundBrowserPathDisplay');
    if (!soundBrowserList || !pathDisplay || !treeNode) return;
    soundBrowserList.innerHTML = '';
    pathDisplay.textContent = `Path: /${pathArray.join('/')} (${currentLibraryName || 'No Library Selected'})`;
    if (pathArray.length > 0) {
        const backButton = document.createElement('div');
        backButton.className = 'sound-browser-item font-semibold';
        backButton.textContent = 'ç­®ï½¸.. (Up)';
        backButton.onclick = () => {
            currentSoundBrowserPath.pop();
            let newTreeNode = currentSoundFileTree;
            for (const segment of currentSoundBrowserPath) {
                newTreeNode = newTreeNode[segment]?.children;
                if (!newTreeNode) {
                    currentSoundBrowserPath = [];
                    newTreeNode = currentSoundFileTree;
                    break;
                }
            }
            renderSoundBrowserDirectory(currentSoundBrowserPath, newTreeNode);
        };
        soundBrowserList.appendChild(backButton);
    }
    const sortedEntries = Object.entries(treeNode).sort(([nameA, itemA], [nameB, itemB]) => {
        if (itemA.type === 'folder' && itemB.type === 'file') return -1;
        if (itemA.type === 'file' && itemB.type === 'folder') return 1;
        return nameA.localeCompare(nameB);
    });
    sortedEntries.forEach(([name, item]) => {
        const div = document.createElement('div');
        div.className = 'sound-browser-item';
        if (item.type === 'folder') {
            div.textContent = `î žåˆ€ ${name}`;
            div.onclick = () => {
                currentSoundBrowserPath.push(name);
                renderSoundBrowserDirectory(currentSoundBrowserPath, item.children);
            };
        } else if (item.type === 'file') {
            div.textContent = `î žä¸ƒ ${name}`;
            div.title = `Click to play. Drag to load: ${name}`;
            div.draggable = true;
            div.addEventListener('dragstart', (event) => {
                const soundData = {
                    fullPath: item.fullPath,
                    libraryName: currentLibraryName,
                    fileName: name
                };
                event.dataTransfer.setData("application/json", JSON.stringify(soundData));
                event.dataTransfer.effectAllowed = "copy";
                div.style.opacity = '0.5';
            });
             div.addEventListener('dragend', () => {
                div.style.opacity = '1';
            });
            div.addEventListener('click', async (event) => {
                if (event.detail === 0) return;
                await initAudioContextAndMasterMeter();
                if (previewPlayer && !previewPlayer.disposed) {
                    previewPlayer.stop();
                    previewPlayer.dispose();
                }
                try {
                    if (!loadedZipFiles[currentLibraryName]) throw new Error("Current ZIP library not loaded.");
                    const zipEntry = loadedZipFiles[currentLibraryName].file(item.fullPath);
                    if (!zipEntry) throw new Error(`File ${item.fullPath} not found in ${currentLibraryName} ZIP.`);
                    const fileBlob = await zipEntry.async("blob");
                    const buffer = await new Tone.Buffer().load(URL.createObjectURL(fileBlob));
                    previewPlayer = new Tone.Player(buffer).toDestination();
                    previewPlayer.autostart = true;
                    previewPlayer.onstop = () => {
                        if (previewPlayer && !previewPlayer.disposed) previewPlayer.dispose();
                        previewPlayer = null;
                    };
                } catch (error) {
                    console.error(`Error previewing sound ${name}:`, error);
                    showNotification(`Error previewing ${name}: ${error.message}`, 3000);
                }
            });
        }
        soundBrowserList.appendChild(div);
    });
}
async function loadSoundFromBrowserToTarget(soundData, targetTrackId, targetTrackType, targetPadOrSliceIndex = null) {
    const { fullPath, libraryName, fileName } = soundData;
    const track = tracks.find(t => t.id === parseInt(targetTrackId));
    if (!track) {
        showNotification(`Target track ID ${targetTrackId} not found.`, 3000);
        return;
    }
    if (track.type !== targetTrackType &&
        !( (targetTrackType === 'Sampler' || targetTrackType === 'InstrumentSampler' || targetTrackType === 'DrumSampler') &&
           (track.type === 'Sampler' || track.type === 'InstrumentSampler' || track.type === 'DrumSampler') )
    ) {
        showNotification(`Cannot load "${fileName}" into a ${track.type} track from a ${targetTrackType} drop zone.`, 3500);
        return;
    }
    showNotification(`Loading "${fileName}" to ${track.name}...`, 2000);
    try {
        if (!loadedZipFiles[libraryName]) throw new Error(`Sound library "${libraryName}" not loaded.`);
        const zipEntry = loadedZipFiles[libraryName].file(fullPath);
        if (!zipEntry) throw new Error(`File "${fullPath}" not found in "${libraryName}" ZIP.`);
        const fileBlob = await zipEntry.async("blob");
        const blobUrl = URL.createObjectURL(fileBlob);
        if (track.type === 'DrumSampler') {
            let actualPadIndex = targetPadOrSliceIndex;
            if (actualPadIndex === null) {
                actualPadIndex = track.drumSamplerPads.findIndex(p => !p.audioBufferDataURL);
                if (actualPadIndex === -1) actualPadIndex = track.selectedDrumPadForEdit;
            }
            await loadDrumSamplerPadFile(blobUrl, track.id, actualPadIndex, fileName);
        } else if (track.type === 'Sampler') {
            if (targetPadOrSliceIndex !== null) {
                showNotification("Drag & drop to individual slices reloads the main sample for now.", 3000);
                await loadSampleFile(blobUrl, track.id, 'Sampler');
            } else {
                await loadSampleFile(blobUrl, track.id, 'Sampler');
            }
        } else if (track.type === 'InstrumentSampler') {
            await loadSampleFile(blobUrl, track.id, 'InstrumentSampler');
        }
    } catch (error) {
        console.error(`Error loading sound "${fileName}" from browser:`, error);
        showNotification(`Error loading "${fileName}": ${error.message}`, 3000);
    }
}
function openSoundBrowserWindow(savedState = null) {
    const windowId = 'soundBrowser';
    if (openWindows[windowId] && !savedState) { openWindows[windowId].restore(); return openWindows[windowId]; }
    let selectOptionsHTML = '';
    for (const libName in soundLibraries) {
        selectOptionsHTML += `<option value="${libName}">${libName}</option>`;
    }
    const contentHTML = `
        <div class="sound-browser-content">
            <select id="soundBrowserLibrarySelect" class="w-full mb-2 p-1 border border-gray-500 rounded-sm text-xs">
                ${selectOptionsHTML}
            </select>
            <div id="soundBrowserPathDisplay" class="text-xs p-1 bg-gray-200 border-b border-gray-400">Path: /</div>
            <div id="soundBrowserList" class="sound-browser-list">Select a library to load sounds.</div>
        </div>
    `;
    const winOptions = {
        width: 350, height: 400,
        initialContentKey: 'soundBrowser'
    };
    if (savedState) {
        Object.assign(winOptions, {
            x: parseFloat(savedState.left), y: parseFloat(savedState.top),
            width: parseFloat(savedState.width), height: parseFloat(savedState.height),
            zIndex: savedState.zIndex, isMinimized: savedState.isMinimized
        });
    }
    const soundBrowserWin = createWindow(windowId, 'Sound Browser', contentHTML, winOptions);
    if (!soundBrowserWin) return null;
    const librarySelect = soundBrowserWin.contentArea.querySelector('#soundBrowserLibrarySelect');
    librarySelect.onchange = () => {
        const selectedLibraryName = librarySelect.value;
        const zipUrl = soundLibraries[selectedLibraryName];
        if (zipUrl) {
            if (loadedZipFiles[selectedLibraryName]) {
                currentLibraryName = selectedLibraryName;
                currentSoundFileTree = {};
                loadedZipFiles[selectedLibraryName].forEach((relativePath, zipEntry) => {
                     if (zipEntry.dir) return;
                    const pathParts = relativePath.split('/').filter(p => p);
                    let currentLevel = currentSoundFileTree;
                    for (let i = 0; i < pathParts.length; i++) {
                        const part = pathParts[i];
                        if (i === pathParts.length - 1) {
                            if (part.endsWith('.wav') || part.endsWith('.mp3') || part.endsWith('.ogg')) {
                                currentLevel[part] = { type: 'file', entry: zipEntry, fullPath: relativePath };
                            }
                        } else {
                            if (!currentLevel[part] || currentLevel[part].type !== 'folder') {
                                currentLevel[part] = { type: 'folder', children: {} };
                            }
                            currentLevel = currentLevel[part].children;
                        }
                    }
                });
                currentSoundBrowserPath = [];
                renderSoundBrowserDirectory(currentSoundBrowserPath, currentSoundFileTree);
            } else {
                fetchSoundLibrary(selectedLibraryName, zipUrl);
            }
        }
    };
    if (Object.keys(soundLibraries).length > 0) {
        const firstLibraryName = Object.keys(soundLibraries)[0];
        librarySelect.value = firstLibraryName;
        fetchSoundLibrary(firstLibraryName, soundLibraries[firstLibraryName]);
    }
    return soundBrowserWin;
}

// --- Window Load and Global Event Listeners ---
window.addEventListener('load', async () => {
    console.log("Window loaded. Initializing SnugOS...");
    startButton.addEventListener('click', (e) => {
        e.stopPropagation();
        startMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!startMenu.classList.contains('hidden') && !startMenu.contains(e.target) && e.target !== startButton) {
            startMenu.classList.add('hidden');
        }
    });
    menuAddSynthTrack.addEventListener('click', () => { addTrack('Synth', {_isUserActionPlaceholder: true}); startMenu.classList.add('hidden'); });
    menuAddSamplerTrack.addEventListener('click', () => { addTrack('Sampler', {_isUserActionPlaceholder: true}); startMenu.classList.add('hidden'); });
    menuAddDrumSamplerTrack.addEventListener('click', () => { addTrack('DrumSampler', {_isUserActionPlaceholder: true}); startMenu.classList.add('hidden'); });
    menuAddInstrumentSamplerTrack.addEventListener('click', () => { addTrack('InstrumentSampler', {_isUserActionPlaceholder: true}); startMenu.classList.add('hidden'); });
    if(menuOpenSoundBrowser) menuOpenSoundBrowser.addEventListener('click', () => { openSoundBrowserWindow(); startMenu.classList.add('hidden'); });
    if(menuUndo) menuUndo.addEventListener('click', () => {
        if (!menuUndo.classList.contains('disabled')) {
            undoLastAction();
            startMenu.classList.add('hidden');
        }
    });
    if(menuRedo) menuRedo.addEventListener('click', () => {
        if (!menuRedo.classList.contains('disabled')) {
            redoLastAction();
            startMenu.classList.add('hidden');
        }
    });
    menuSaveProject.addEventListener('click', () => { saveProject(); startMenu.classList.add('hidden'); });
    menuLoadProject.addEventListener('click', () => { loadProject(); startMenu.classList.add('hidden'); });
    menuExportWav.addEventListener('click', () => { exportToWav(); startMenu.classList.add('hidden'); });
    menuOpenGlobalControls.addEventListener('click', () => { openGlobalControlsWindow(); startMenu.classList.add('hidden'); });
    menuOpenMixer.addEventListener('click', () => { openMixerWindow(); startMenu.classList.add('hidden'); });
    menuToggleFullScreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                showNotification(`Error entering full screen: ${err.message}`, 3000);
            });
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
        startMenu.classList.add('hidden');
    });
    taskbarTempoDisplay.addEventListener('click', () => {
        openGlobalControlsWindow();
    });
    openGlobalControlsWindow();
    await setupMIDI();
    requestAnimationFrame(updateMeters);
    updateUndoRedoButtons();
    showNotification("Welcome to SnugOS!", 2500);
    console.log("SnugOS Initialized.");
});
window.addEventListener('beforeunload', (e) => {
    if (tracks.length > 0 && (undoStack.length > 0 || Object.keys(openWindows).length > 1 )) {
        e.preventDefault();
        e.returnValue = '';
    }
});

console.log("SCRIPT EXECUTION FINISHED - SnugOS v5.5.1 (Refactor 4)");
