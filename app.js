// SnugOS - Main Application Logic
        // Version 5.5.1: Updated Sound Libraries, Tutorial Removed
        console.log("SCRIPT EXECUTION STARTED - SnugOS v5.5.1");

        // --- Notification System ---
        const notificationArea = document.getElementById('notification-area');
        function showNotification(message, duration = 3000) {
            if (!notificationArea) return;
            const notification = document.createElement('div');
            notification.className = 'notification-message';
            notification.textContent = message;
            notificationArea.appendChild(notification);
            // Trigger animation for showing
            setTimeout(() => { notification.classList.add('show'); }, 10); 
            // Remove after duration
            setTimeout(() => {
                notification.classList.remove('show');
                // Wait for fade out animation before removing from DOM
                setTimeout(() => { if (notification.parentElement) notificationArea.removeChild(notification); }, 300); 
            }, duration);
        }

        // --- Custom Confirmation Modal ---
        const modalContainer = document.getElementById('modalContainer');
        function showCustomModal(title, contentHTML, buttonsConfig, modalClass = '') {
             // Remove any existing modal first to prevent overlap
             if (modalContainer.firstChild) {
                modalContainer.firstChild.remove();
            }
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            
            const dialog = document.createElement('div');
            dialog.className = `modal-dialog ${modalClass}`;

            const titleBar = document.createElement('div');
            titleBar.className = 'modal-title-bar';
            titleBar.textContent = title || 'Dialog'; // Default title
            dialog.appendChild(titleBar);

            const contentDiv = document.createElement('div');
            contentDiv.className = 'modal-content';
            if (typeof contentHTML === 'string') {
                contentDiv.innerHTML = contentHTML; // Set HTML string
            } else {
                contentDiv.appendChild(contentHTML); // Append DOM element
            }
            dialog.appendChild(contentDiv);

            // Create buttons if configuration is provided
            if (buttonsConfig && buttonsConfig.length > 0) {
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'modal-buttons';
                buttonsConfig.forEach(btnConfig => {
                    const button = document.createElement('button');
                    button.textContent = btnConfig.text;
                    button.onclick = () => {
                        if (btnConfig.action) btnConfig.action(); // Execute button action
                        if (btnConfig.closesModal !== false) overlay.remove(); // Close modal by default
                    };
                    buttonsDiv.appendChild(button);
                });
                dialog.appendChild(buttonsDiv);
            }
            
            overlay.appendChild(dialog);
            modalContainer.appendChild(overlay);
            
            // Focus the first button for accessibility
            const firstButton = dialog.querySelector('.modal-buttons button');
            if (firstButton) firstButton.focus();

            return { overlay, dialog, contentDiv }; // Return modal elements for further manipulation if needed
        }

        // Helper for standard confirmation dialogs
        function showConfirmationDialog(title, message, onConfirm, onCancel = null) {
           const buttons = [
                { text: 'OK', action: onConfirm },
                { text: 'Cancel', action: onCancel }
           ];
           showCustomModal(title, message, buttons);
        }


        // --- Global Variables & Initialization ---
        let tracks = []; // Array to store all tracks
        let trackIdCounter = 0; // Simple counter for unique track IDs
        let activeSequencerTrackId = null; // ID of the track whose sequencer is currently active/focused
        const STEPS_PER_BAR = 16; // Default steps per bar for sequencers
        const defaultStepsPerBar = 16; 
        // Pitches for synth/instrument sampler sequencers (reversed for top-to-bottom display)
        const synthPitches = [ 
            'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2',
            'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
            'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
            'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'
        ].reverse(); 
        
        // Sound libraries configuration - paths are now relative
        const soundLibraries = { 
            "Drums": "/drums.zip", 
            "Instruments": "/instruments.zip",
            "Instruments 2": "/instruments2.zip",
            "Instruments 3": "/instruments3.zip"
        };
        let loadedZipFiles = {}; // Cache for loaded JSZip instances
        let currentLibraryName = null; // Name of the currently selected sound library
        let currentSoundFileTree = null; // Parsed file tree of the current library
        let currentSoundBrowserPath = []; // Current path within the sound browser
        let previewPlayer = null; // Tone.Player instance for sound previews

        const numSlices = 8; // Default number of slices for Sampler track
        const numDrumSamplerPads = 8; // Number of pads for Drum Sampler
        const samplerMIDINoteStart = 36; // C2, base MIDI note for samplers/drum pads
        
        let midiAccess = null, activeMIDIInput = null, armedTrackId = null, soloedTrackId = null; 
        const defaultVelocity = 0.7; // Default velocity for notes triggered by keyboard/sequencer
        // Default theme colors (can be overridden by user settings in future)
        const defaultDesktopBg = '#FFB6C1', defaultTaskbarBg = '#c0c0c0', defaultWindowBg = '#c0c0c0', defaultWindowContentBg = '#c0c0c0';

        // Mapping computer keyboard keys to MIDI notes for synth/instrument input
        const computerKeySynthMap = { 
            'KeyA': 60, 'KeyW': 61, 'KeyS': 62, 'KeyE': 63, 'KeyD': 64, 'KeyF': 65, 'KeyT': 66, 
            'KeyG': 67, 'KeyY': 68, 'KeyH': 69, 'KeyU': 70, 'KeyJ': 71, 'KeyK': 72, 
        };
        // Mapping computer keyboard keys to MIDI notes for sampler/drum pad input
        const computerKeySamplerMap = { 
            'Digit1': samplerMIDINoteStart + 0, 'Digit2': samplerMIDINoteStart + 1, 'Digit3': samplerMIDINoteStart + 2, 'Digit4': samplerMIDINoteStart + 3,
            'Digit5': samplerMIDINoteStart + 4, 'Digit6': samplerMIDINoteStart + 5, 'Digit7': samplerMIDINoteStart + 6, 'Digit8': samplerMIDINoteStart + 7
        };
        let currentlyPressedComputerKeys = {}; // Tracks currently pressed keys to prevent repeats
        let transportEventsInitialized = false; // Flag to ensure Tone.Transport events are set up once

        // Undo/Redo History
        let undoStack = [];
        let redoStack = [];
        const MAX_HISTORY_STATES = 30; // Limit the number of undo/redo states

        // Recording State
        let isRecording = false; // Flag for active recording
        let recordingTrackId = null; // ID of the track being recorded to
        let recordingStartTime = 0; // Start time of recording in transport seconds


        // --- DOM Elements ---
        const desktop = document.getElementById('desktop');
        const startButton = document.getElementById('startButton');
        const startMenu = document.getElementById('startMenu');
        const taskbarButtonsContainer = document.getElementById('taskbarButtons');
        const taskbarTempoDisplay = document.getElementById('taskbarTempoDisplay'); 
        
        // Start Menu items
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

        // Global control elements (will be assigned when Global Controls window is created)
        let playBtn, recordBtn, tempoInput, 
            masterMeterBar, midiInputSelectGlobal, midiIndicatorGlobalEl, keyboardIndicatorGlobalEl; 

        const loadProjectInputEl = document.getElementById('loadProjectInput'); 
        let masterMeter = null; // Tone.Meter for master output
        let openWindows = {}; // Stores SnugWindow instances by ID, tracks open windows
        let highestZIndex = 100; // Tracks the highest z-index for window focusing

        // --- UI Component Creation (Knobs) ---
        function createKnob(options) {
            // Container for the knob, label, and value display
            const container = document.createElement('div');
            container.className = 'knob-container';
        
            // Label for the knob
            const labelEl = document.createElement('div');
            labelEl.className = 'knob-label';
            labelEl.textContent = options.label || '';
            labelEl.title = options.label || ''; // Tooltip for full label
            container.appendChild(labelEl);

            // Knob visual element
            const knobEl = document.createElement('div');
            knobEl.className = 'knob';
            const handleEl = document.createElement('div'); // The rotating part of the knob
            handleEl.className = 'knob-handle';
            knobEl.appendChild(handleEl);
            container.appendChild(knobEl);

            // Value display below the knob
            const valueEl = document.createElement('div');
            valueEl.className = 'knob-value';
            container.appendChild(valueEl);
        
            // Knob parameters
            let currentValue = options.initialValue || 0;
            const min = options.min === undefined ? 0 : options.min;
            const max = options.max === undefined ? 100 : options.max;
            const step = options.step || 1;
            const range = max - min;
            const maxDegrees = options.maxDegrees || 270; // Max rotation in degrees
            
            // Sensitivity for mouse/touch interaction
            const BASE_PIXELS_PER_FULL_RANGE_MOUSE = 300; 
            const BASE_PIXELS_PER_FULL_RANGE_TOUCH = 450; 

            let initialValueBeforeInteraction = currentValue; // For undo state capture

            // Updates the visual rotation of the knob and its displayed value
            function updateKnobVisual() {
                const percentage = range === 0 ? 0 : (currentValue - min) / range;
                const rotation = (percentage * maxDegrees) - (maxDegrees / 2); // Center rotation
                handleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
                // Format displayed value based on step and decimals option
                valueEl.textContent = typeof currentValue === 'number' ? currentValue.toFixed(options.decimals !== undefined ? options.decimals : (step < 1 ? 2 : 0)) : currentValue;
                if (options.displaySuffix) valueEl.textContent += options.displaySuffix; // Add suffix like 'dB' or 's'
            }
        
            // Sets the knob's value, updates visuals, and triggers callback
            function setValue(newValue, triggerCallback = true, fromInteraction = false) { 
                const numValue = parseFloat(newValue);
                if (isNaN(numValue)) return; // Ignore non-numeric input
                
                // Clamp value to min/max and snap to step
                let boundedValue = Math.min(max, Math.max(min, numValue));
                if (step !== 0) { 
                    boundedValue = Math.round(boundedValue / step) * step;
                }
                
                const oldValue = currentValue; 
                currentValue = Math.min(max, Math.max(min, boundedValue)); 
                
                updateKnobVisual();

                // Trigger onValueChange callback if provided and value changed
                if (triggerCallback && options.onValueChange) { 
                    options.onValueChange(currentValue, oldValue, fromInteraction); 
                }
            }

            // Handles mouse/touch drag interaction for changing knob value
            function handleInteraction(e, isTouch = false) {
                e.preventDefault();
                initialValueBeforeInteraction = currentValue; // Store value for undo

                const startY = isTouch ? e.touches[0].clientY : e.clientY;
                const startValue = currentValue;
                // Determine sensitivity based on device and options
                const pixelsForFullRange = isTouch ? BASE_PIXELS_PER_FULL_RANGE_TOUCH : BASE_PIXELS_PER_FULL_RANGE_MOUSE;
                const currentSensitivity = options.sensitivity === undefined ? 1 : options.sensitivity;

                // Called on mousemove or touchmove
                function onMove(moveEvent) {
                    const currentY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
                    const deltaY = startY - currentY; // Inverted Y for natural knob turning
                    
                    let valueChange = (deltaY / pixelsForFullRange) * range * currentSensitivity;
                    let newValue = startValue + valueChange;
                    setValue(newValue, true, true); // Update value, trigger callback, indicate from interaction
                }
        
                // Called on mouseup or touchend
                function onEnd() {
                    document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
                    document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
                    // Capture state for undo if value changed
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

            // Attach event listeners for mouse and touch
            knobEl.addEventListener('mousedown', (e) => handleInteraction(e, false));
            knobEl.addEventListener('touchstart', (e) => handleInteraction(e, true), { passive: false }); // passive:false to allow preventDefault
            
            setValue(currentValue, false); // Initialize visual state without triggering callback
            return { element: container, setValue, getValue: () => currentValue, type: 'knob', refreshVisuals: updateKnobVisual };
        }

        // --- Undo/Redo System ---
        // Updates the enabled/disabled state and title of undo/redo menu items
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

        // Captures the current project state for the undo stack
        function captureStateForUndo(description = "Unknown action") {
            console.log("Capturing state for undo:", description);
            try {
                const currentState = gatherProjectData(); // Gathers all serializable project data
                currentState.description = description; // Add description for UI

                undoStack.push(JSON.parse(JSON.stringify(currentState))); // Deep clone to prevent mutation

                // Limit undo stack size
                if (undoStack.length > MAX_HISTORY_STATES) {
                    undoStack.shift(); 
                }
                redoStack = []; // Clear redo stack when a new action is performed
                updateUndoRedoButtons();
            } catch (error) {
                console.error("Error capturing state for undo:", error);
                showNotification("Error capturing undo state. Undo may not work correctly.", 3000);
            }
        }

        // Restores the last state from the undo stack
        async function undoLastAction() {
            if (undoStack.length === 0) {
                showNotification("Nothing to undo.", 1500);
                return;
            }
            try {
                const stateToRestore = undoStack.pop();
                
                // Capture current state for redo stack before restoring
                const currentStateForRedo = gatherProjectData();
                currentStateForRedo.description = stateToRestore.description; 
                redoStack.push(JSON.parse(JSON.stringify(currentStateForRedo)));
                if (redoStack.length > MAX_HISTORY_STATES) redoStack.shift();

                showNotification(`Undoing: ${stateToRestore.description || 'last action'}...`, 2000);
                await reconstructDAW(stateToRestore, true); // Reconstruct project from saved state
                updateUndoRedoButtons();
            } catch (error) {
                console.error("Error during undo:", error);
                showNotification("Error during undo operation. Project state might be unstable.", 4000);
                updateUndoRedoButtons(); // Ensure buttons are updated even on error
            }
        }

        // Restores the last state from the redo stack
        async function redoLastAction() {
            if (redoStack.length === 0) {
                showNotification("Nothing to redo.", 1500);
                return;
            }
            try {
                const stateToRestore = redoStack.pop();

                // Capture current state for undo stack before restoring
                const currentStateForUndo = gatherProjectData();
                currentStateForUndo.description = stateToRestore.description;
                undoStack.push(JSON.parse(JSON.stringify(currentStateForUndo)));
                if (undoStack.length > MAX_HISTORY_STATES) undoStack.shift();

                showNotification(`Redoing: ${stateToRestore.description || 'last action'}...`, 2000);
                await reconstructDAW(stateToRestore, true); // Reconstruct project
                updateUndoRedoButtons();
            } catch (error) {
                console.error("Error during redo:", error);
                showNotification("Error during redo operation. Project state might be unstable.", 4000);
                updateUndoRedoButtons();
            }
        }


        // --- Utility Functions ---
        // Creates a new SnugWindow instance or restores an existing one
        function createWindow(id, title, contentHTML, options = {}) {
            if (openWindows[id]) { // If window already exists
                openWindows[id].restore(); // Restore and focus it
                return openWindows[id]; 
            }
            const newWindow = new SnugWindow(id, title, contentHTML, options);
            return newWindow.element ? newWindow : null; // Return null if creation failed
        }

        // Generates HTML for a file drop zone
        function createDropZoneHTML(trackId, inputId, trackTypeHintForLoad, padOrSliceIndex = null) {
            const dropZoneId = `dropZone-${trackId}-${trackTypeHintForLoad.toLowerCase()}${padOrSliceIndex !== null ? '-' + padOrSliceIndex : ''}`;
            // Data attributes to identify the target for dropped files
            const dataAttributes = `data-track-id="${trackId}" data-track-type="${trackTypeHintForLoad}" ${padOrSliceIndex !== null ? `data-pad-slice-index="${padOrSliceIndex}"` : ''}`;
            return `
                <div class="drop-zone" id="${dropZoneId}" ${dataAttributes}>
                    Drag & Drop Audio File or <br>
                    <label for="${inputId}" class="text-blue-600 hover:text-blue-800 underline cursor-pointer">Click to Upload</label>
                    <input type="file" id="${inputId}" accept="audio/*" class="hidden">
                </div>`;
        }
        
        // Sets up event listeners for a file drop zone
        function setupDropZoneListeners(dropZoneElement, trackId, trackTypeHint, padIndexOrSliceId = null) {
            if (!dropZoneElement) return;

            // Handle dragover: prevent default, add visual cue
            dropZoneElement.addEventListener('dragover', (event) => {
                event.preventDefault();
                event.stopPropagation();
                dropZoneElement.classList.add('dragover');
                event.dataTransfer.dropEffect = "copy"; 
            });

            // Handle dragleave: remove visual cue
            dropZoneElement.addEventListener('dragleave', (event) => {
                event.preventDefault();
                event.stopPropagation();
                dropZoneElement.classList.remove('dragover');
            });

            // Handle drop: process dropped file or sound browser data
            dropZoneElement.addEventListener('drop', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                dropZoneElement.classList.remove('dragover');

                const soundDataString = event.dataTransfer.getData("application/json"); // Check for sound browser data
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
                } else if (event.dataTransfer.files && event.dataTransfer.files.length > 0) { // Check for local file drop
                    const file = event.dataTransfer.files[0];
                    const simulatedEvent = { target: { files: [file] } }; // Simulate file input event
                    
                    const track = tracks.find(t => t.id === parseInt(trackId));
                    captureStateForUndo(`Load file "${file.name}" to ${track ? track.name : 'track ' + trackId}`);

                    // Route to appropriate file loading function based on track type
                    if (trackTypeHint === 'DrumSampler' && padIndexOrSliceId !== null) {
                        await loadDrumSamplerPadFile(simulatedEvent, trackId, padIndexOrSliceId);
                    } else {
                        await loadSampleFile(simulatedEvent, trackId, trackTypeHint);
                    }
                }
            });
        }


        // --- CLASS DEFINITIONS ---
        // SnugWindow class: Manages individual application windows
        class SnugWindow { 
            constructor(id, title, contentHTML, options = {}) {
                this.id = id; 
                this.title = title; 
                this.isMinimized = false; // Tracks minimized state
                this.initialContentKey = options.initialContentKey || id; // Key for restoring content type on project load
                this.resizeObserver = null; // For capturing resize end for undo

                const desktopEl = document.getElementById('desktop'); 
                if (!desktopEl) { 
                    console.error("SnugWindow: Desktop element not found for window ID:", this.id); 
                    this.element = null; 
                    return; 
                }
                
                // Default window dimensions and position (randomized slightly)
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
                    closable: true, minimizable: true // Default window behaviors
                }, options);

                // Create window element
                this.element = document.createElement('div'); 
                this.element.id = `window-${this.id}`; 
                this.element.className = 'window'; 
                this.element.style.left = `${this.options.x}px`; 
                this.element.style.top = `${this.options.y}px`; 
                this.element.style.width = `${this.options.width}px`; 
                this.element.style.height = `${this.options.height}px`;
                this.element.style.zIndex = options.zIndex !== undefined ? options.zIndex : ++highestZIndex; // Set z-index or increment global
                this.element.style.backgroundColor = `var(--window-bg, ${defaultWindowBg})`; 
                
                // Create title bar buttons (minimize, close)
                let buttonsHTML = ''; 
                if (this.options.minimizable) { buttonsHTML += `<button class="window-minimize-btn" title="Minimize">_</button>`; } 
                if (this.options.closable) { buttonsHTML += `<button class="window-close-btn" title="Close">X</button>`; }
                
                // Set window inner HTML
                this.element.innerHTML = `<div class="window-title-bar"><span>${this.title}</span><div class="window-title-buttons">${buttonsHTML}</div></div><div class="window-content">${contentHTML}</div>`;
                desktopEl.appendChild(this.element); 
                openWindows[this.id] = this; // Register window instance
                
                this.titleBar = this.element.querySelector('.window-title-bar'); 
                this.contentArea = this.element.querySelector('.window-content');
                this.contentArea.style.backgroundColor = `var(--window-content-bg, ${defaultWindowContentBg})`; 
                
                this.makeDraggable(); // Enable dragging
                this.makeResizable(); // Enable resizing and capture resize end for undo

                // Add event listeners for close and minimize buttons
                if (this.options.closable) { 
                    const closeBtn = this.element.querySelector('.window-close-btn'); 
                    if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
                }
                if (this.options.minimizable) { 
                    const minBtn = this.element.querySelector('.window-minimize-btn'); 
                    if (minBtn) minBtn.addEventListener('click', (e) => { e.stopPropagation(); this.minimize(); });
                }
                this.element.addEventListener('mousedown', () => this.focus(), true); // Focus window on mousedown
                this.createTaskbarButton(); // Create corresponding taskbar button
                // Apply minimized state if passed during creation (e.g., project load)
                if (options.isMinimized) { 
                    this.minimize(true); // Pass true to skip undo capture during load
                }
            }

            // Makes the window draggable via its title bar
            makeDraggable() { 
                if (!this.titleBar) return; 
                let offsetX, offsetY, isDragging = false; 
                const desktopEl = document.getElementById('desktop'); 
                let initialX, initialY; // For undo state capture
                
                this.titleBar.addEventListener('mousedown', (e) => { 
                    if (e.target.tagName === 'BUTTON' || !desktopEl) return; // Don't drag if clicking a button
                    isDragging = true; this.focus(); 
                    initialX = this.element.offsetLeft; // Store initial position
                    initialY = this.element.offsetTop;
                    offsetX = e.clientX - initialX; 
                    offsetY = e.clientY - initialY; 
                    this.titleBar.style.cursor = 'grabbing'; 
                    document.body.style.userSelect = 'none'; // Prevent text selection during drag
                }); 
                
                document.addEventListener('mousemove', (e) => { 
                    if (!isDragging || !desktopEl) return; 
                    let newX = e.clientX - offsetX; 
                    let newY = e.clientY - offsetY; 
                    const desktopRect = desktopEl.getBoundingClientRect(); 
                    const taskbarHeightVal = document.getElementById('taskbar')?.offsetHeight || 28; 
                    
                    // Constrain window within desktop bounds
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
                        // Capture state for undo if position changed
                        if (this.element.offsetLeft !== initialX || this.element.offsetTop !== initialY) {
                            captureStateForUndo(`Move window "${this.title}"`);
                        }
                    }
                });
            }
            
            // Enables window resizing and captures resize end for undo
            makeResizable() {
                let initialWidth, initialHeight; // For undo state capture
                // ResizeObserver is used to detect when resize operation ends
                this.resizeObserver = new ResizeObserver(entries => {
                    // This observer fires frequently during resize.
                    // We capture the state on mouseup of the window itself.
                });
                this.resizeObserver.observe(this.element);

                // Store initial dimensions on mousedown if it's on the resize handle area
                this.element.addEventListener('mousedown', (e) => {
                    const rect = this.element.getBoundingClientRect();
                    const resizeHandleSize = 15; // Approximate size of the browser's resize handle
                    if (e.clientX > rect.right - resizeHandleSize && e.clientY > rect.bottom - resizeHandleSize) {
                        initialWidth = this.element.offsetWidth;
                        initialHeight = this.element.offsetHeight;
                    } else {
                        initialWidth = null; // Not a resize operation
                        initialHeight = null;
                    }
                });

                // On mouseup, if dimensions changed, capture state for undo
                this.element.addEventListener('mouseup', () => {
                    if (initialWidth !== null && initialHeight !== null) {
                        if (this.element.offsetWidth !== initialWidth || this.element.offsetHeight !== initialHeight) {
                            captureStateForUndo(`Resize window "${this.title}"`);
                        }
                        initialWidth = null; // Reset
                        initialHeight = null;
                    }
                });
            }


            // Creates a button on the taskbar for this window
            createTaskbarButton() { 
                if (!taskbarButtonsContainer) return; 
                this.taskbarButton = document.createElement('button'); 
                this.taskbarButton.className = 'taskbar-button'; 
                this.taskbarButton.textContent = this.title.substring(0, 15) + (this.title.length > 15 ? '...' : ''); // Truncate long titles
                this.taskbarButton.title = this.title; 
                this.taskbarButton.dataset.windowId = this.id; 
                taskbarButtonsContainer.appendChild(this.taskbarButton); 
                
                // Taskbar button click behavior: restore if minimized, focus or minimize if active
                this.taskbarButton.addEventListener('click', () => { 
                    if (this.isMinimized) { this.restore(); } 
                    else { 
                        // If window is already focused and not minimized, minimize it
                        if (parseInt(this.element.style.zIndex) === highestZIndex && !this.isMinimized) { 
                            this.minimize(); 
                        } else { 
                            this.focus(); // Otherwise, focus it
                        }
                    }
                });
                this.updateTaskbarButtonActiveState(); // Set initial active state
            }

            // Updates the visual state (active/minimized) of the taskbar button
            updateTaskbarButtonActiveState() { 
                if (this.taskbarButton) { 
                    const isActive = !this.isMinimized && parseInt(this.element.style.zIndex) === highestZIndex; 
                    this.taskbarButton.classList.toggle('active', isActive); 
                    this.taskbarButton.classList.toggle('minimized-on-taskbar', this.isMinimized && !isActive);
                }
            }

            // Minimizes the window
            minimize(skipUndo = false) { 
                if (!this.isMinimized) { 
                    this.isMinimized = true; 
                    this.element.classList.add('minimized'); // Hide window element
                    if(this.taskbarButton) { 
                        this.taskbarButton.classList.add('minimized-on-taskbar'); 
                        this.taskbarButton.classList.remove('active');
                    } 
                    if (!skipUndo) captureStateForUndo(`Minimize window "${this.title}"`);
                }
            }

            // Restores the window from minimized state or focuses it
            restore(skipUndo = false) { 
                if (this.isMinimized) { 
                    this.isMinimized = false; 
                    this.element.classList.remove('minimized'); // Show window element
                    this.focus(true); // Focus, skip undo for focus if part of restore
                     if (!skipUndo) captureStateForUndo(`Restore window "${this.title}"`);
                } else { 
                    this.focus(); // If not minimized, just focus
                }
            }

            // Closes the window
            close() { 
                if (this.onCloseCallback) this.onCloseCallback(); // Execute custom close callback if any
                if (this.taskbarButton) this.taskbarButton.remove(); // Remove taskbar button
                if (this.element) this.element.remove(); // Remove window element
                if (this.resizeObserver) this.resizeObserver.disconnect(); // Disconnect resize observer

                const oldWindowTitle = this.title; // Capture title for undo description
                delete openWindows[this.id]; // Unregister window
                
                // If window was associated with a track, clear that association
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

            // Brings the window to the front (highest z-index)
            focus(skipUndo = false) { 
                if (this.isMinimized) { this.restore(skipUndo); return; } // Restore if minimized
                if (!this.element) return; 
                const oldZIndex = parseInt(this.element.style.zIndex);
                this.element.style.zIndex = ++highestZIndex; // Increment global z-index and apply
                // Update active state for all taskbar buttons
                Object.values(openWindows).forEach(win => { if (win && win.taskbarButton) win.updateTaskbarButtonActiveState(); });
                // Note: Focusing by clicking doesn't usually create an undo state for the focus itself.
            }

            // Applies saved state to the window (used during project load)
            applyState(state) { 
                if (!this.element) return;
                this.element.style.left = state.left;
                this.element.style.top = state.top;
                this.element.style.width = state.width;
                this.element.style.height = state.height;
                this.element.style.zIndex = state.zIndex;
                this.titleBar.querySelector('span').textContent = state.title; // Restore title
                this.title = state.title;
                if (this.taskbarButton) { // Update taskbar button text
                    this.taskbarButton.textContent = state.title.substring(0, 15) + (state.title.length > 15 ? '...' : '');
                    this.taskbarButton.title = state.title;
                }

                // Apply minimized state
                if (state.isMinimized && !this.isMinimized) {
                    this.minimize(true); // true to skip undo capture during load
                } else if (!state.isMinimized && this.isMinimized) {
                    this.restore(true); // true to skip undo capture during load
                }
                this.updateTaskbarButtonActiveState();
            }

            onCloseCallback() {} // Placeholder for custom close behavior
        }

        // Track class: Manages individual audio/MIDI tracks
        class Track { 
            constructor(id, type, initialData = null) { 
                this.id = initialData?.id || id; // Use provided ID or new one
                this.type = type; 
                this.name = initialData?.name || `${type} Track ${this.id}`; // Default name
                this.isMuted = initialData?.isMuted || false;
                this.isSoloed = false; // Solo state is managed globally, not saved per track directly
                this.previousVolumeBeforeMute = initialData?.volume ?? 0.7; // Store volume before mute

                // Synth-specific parameters
                this.synthParams = { 
                    oscillator: initialData?.synthParams?.oscillator || { type: 'triangle8' }, 
                    envelope: initialData?.synthParams?.envelope || { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 }
                };
                
                // Sampler (Slicer) specific parameters
                this.originalFileName = initialData?.samplerAudioData?.fileName || null;
                this.audioBuffer = null; // Tone.Buffer instance
                this.audioBufferDataURL = initialData?.samplerAudioData?.audioBufferDataURL || null; // For saving/loading sample
                this.slices = initialData?.slices || Array(numSlices).fill(null).map(() => ({ 
                    offset: 0, duration: 0, userDefined: false, volume: 1.0, pitchShift: 0, 
                    loop: false, reverse: false, 
                    envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 } 
                })); 
                this.selectedSliceForEdit = 0; 
                this.waveformZoom = initialData?.waveformZoom || 1; 
                this.waveformScrollOffset = initialData?.waveformScrollOffset || 0; 
                this.slicerIsPolyphonic = initialData?.slicerIsPolyphonic !== undefined ? initialData.slicerIsPolyphonic : true; 
                this.slicerMonoPlayer = null; // For monophonic slicer mode
                this.slicerMonoEnvelope = null;
                this.slicerMonoGain = null;

                // Instrument Sampler specific parameters
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
                this.toneSampler = null; // Tone.Sampler instance for Instrument Sampler


                // Drum Sampler specific parameters
                this.drumSamplerPads = initialData?.drumSamplerPads || Array(numDrumSamplerPads).fill(null).map(() => ({
                    sampleUrl: null, 
                    audioBuffer: null, 
                    audioBufferDataURL: null, 
                    originalFileName: null,
                    volume: 0.7, pitchShift: 0, 
                    envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 } 
                }));
                // Restore drum pad audio data if provided
                if (initialData?.drumSamplerPads) {
                    initialData.drumSamplerPads.forEach((padData, index) => {
                        if (this.drumSamplerPads[index] && padData.audioBufferDataURL) {
                            this.drumSamplerPads[index].audioBufferDataURL = padData.audioBufferDataURL;
                            this.drumSamplerPads[index].originalFileName = padData.originalFileName; 
                        }
                    });
                }
                this.selectedDrumPadForEdit = 0;
                this.drumPadPlayers = Array(numDrumSamplerPads).fill(null); // Tone.Player instances for each pad

                // Effects chain parameters
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
                
                // Initialize Tone.js effect nodes
                this.distortionNode = new Tone.Distortion(this.effects.distortion.amount);
                this.filterNode = new Tone.Filter({
                    frequency: this.effects.filter.frequency,
                    type: this.effects.filter.type,
                    rolloff: this.effects.filter.rolloff, 
                    Q: this.effects.filter.Q
                });
                this.chorusNode = new Tone.Chorus(this.effects.chorus.frequency, this.effects.chorus.delayTime, this.effects.chorus.depth);
                this.chorusNode.wet.value = this.effects.chorus.wet;
                this.saturationNode = new Tone.Chebyshev(Math.floor(this.effects.saturation.amount) * 2 + 1); // Chebyshev order based on amount
                this.saturationNode.wet.value = this.effects.saturation.wet;
                this.eq3Node = new Tone.EQ3(this.effects.eq3);
                this.compressorNode = new Tone.Compressor(this.effects.compressor);
                this.delayNode = new Tone.FeedbackDelay(this.effects.delay.time, this.effects.delay.feedback);
                this.delayNode.wet.value = this.effects.delay.wet;
                this.reverbNode = new Tone.Reverb(this.effects.reverb); 
                this.gainNode = new Tone.Gain(this.isMuted ? 0 : (initialData?.volume ?? 0.7)); // Main track gain
                this.trackMeter = new Tone.Meter({ smoothing: 0.8 }); // For track level metering

                // Chain effects: Distortion -> Filter -> Chorus -> Saturation -> EQ3 -> Compressor -> Delay -> Reverb -> Gain -> Meter -> Master Output
                this.distortionNode.chain(this.filterNode, this.chorusNode, this.saturationNode, this.eq3Node, this.compressorNode, this.delayNode, this.reverbNode, this.gainNode, this.trackMeter, Tone.getDestination());         

                this.instrument = null; // Tone.js instrument (Synth, Sampler, etc.)
                
                // Sequencer data
                this.sequenceLength = initialData?.sequenceLength || defaultStepsPerBar; 
                
                // Determine number of rows for sequencer grid based on track type
                let numRowsForGrid;
                if (type === 'Synth' || type === 'InstrumentSampler') numRowsForGrid = synthPitches.length;
                else if (type === 'Sampler') numRowsForGrid = this.slices.length > 0 ? this.slices.length : numSlices;
                else if (type === 'DrumSampler') numRowsForGrid = numDrumSamplerPads;
                else numRowsForGrid = 0;
                this.sequenceData = initialData?.sequenceData || Array(numRowsForGrid).fill(null).map(() => Array(this.sequenceLength).fill(null)); 
                
                this.sequence = null; // Tone.Sequence instance
                
                // References to associated windows
                this.inspectorWindow = null; this.effectsRackWindow = null; 
                this.waveformCanvasCtx = null; this.instrumentWaveformCanvasCtx = null; 
                this.sequencerWindow = null; 
                this.automation = initialData?.automation || { volume: [] }; // Placeholder for future automation data
                this.inspectorControls = {}; // Store references to UI controls in inspector

                this.initializeInstrumentFromInitialData(initialData); // Load audio/set up instrument if data provided
                this.setSequenceLength(this.sequenceLength, true); // Initialize sequencer
            }

            // Initializes the Tone.js instrument based on track type and initial data (e.g., loading samples)
            async initializeInstrumentFromInitialData(initialData) {
                if (this.type === 'Synth') {
                    this.instrument = new Tone.PolySynth(Tone.Synth, {
                        oscillator: this.synthParams.oscillator, envelope: this.synthParams.envelope
                    }).connect(this.distortionNode); // Connect synth to effects chain
                } else if (this.type === 'Sampler') { 
                    if (this.audioBufferDataURL) { // If sample data URL exists (from loaded project)
                        try {
                            this.audioBuffer = await new Tone.Buffer().load(this.audioBufferDataURL);
                            if (!this.slicerIsPolyphonic && this.audioBuffer.loaded) {
                                this.setupSlicerMonoNodes(); // Set up for monophonic playback if needed
                            }
                        } catch (e) {
                            console.error(`Error loading Slicer audio buffer from DataURL for track ${this.id}:`, e);
                            showNotification(`Error loading sample for Slicer ${this.name} from project.`, 3000);
                            this.audioBufferDataURL = null; // Clear if loading failed
                        }
                    }
                } else if (this.type === 'InstrumentSampler') {
                    if (this.instrumentSamplerSettings.audioBufferDataURL) {
                        try {
                            this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(this.instrumentSamplerSettings.audioBufferDataURL);
                            this.setupToneSampler(); // Initialize Tone.Sampler with loaded buffer
                        } catch (e) {
                            console.error(`Error loading InstrumentSampler audio buffer from DataURL for track ${this.id}:`, e);
                            showNotification(`Error loading sample for Instrument Sampler ${this.name} from project.`, 3000);
                            this.instrumentSamplerSettings.audioBufferDataURL = null;
                        }
                    } else {
                        this.setupToneSampler(); // Setup sampler even if no initial buffer (e.g., for later loading)
                    }
                } else if (this.type === 'DrumSampler') {
                    // Load audio for each drum pad if data URLs are provided
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
            
            // Sets up Tone.js nodes for monophonic slicer playback
            setupSlicerMonoNodes() {
                if (!this.slicerMonoPlayer || this.slicerMonoPlayer.disposed) {
                    this.slicerMonoPlayer = new Tone.Player();
                    this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
                    this.slicerMonoGain = new Tone.Gain(1);
                    // Chain: Player -> Envelope -> Gain -> Track Effects Chain
                    this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain, this.distortionNode); 
                }
                // Assign loaded audio buffer to the player
                if (this.audioBuffer && this.audioBuffer.loaded && this.slicerMonoPlayer) {
                    this.slicerMonoPlayer.buffer = this.audioBuffer;
                }
            }

            // Disposes of Tone.js nodes used for monophonic slicer playback
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


            // Sets up or reconfigures the Tone.Sampler for Instrument Sampler tracks
            setupToneSampler() {
                if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.dispose(); // Dispose existing sampler
                const urls = {}; // Map MIDI notes to audio buffers (here, just the root note)
                if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
                    urls[this.instrumentSamplerSettings.rootNote] = this.instrumentSamplerSettings.audioBuffer; 
                }
                this.toneSampler = new Tone.Sampler({
                    urls: urls, 
                    attack: this.instrumentSamplerSettings.envelope.attack,
                    release: this.instrumentSamplerSettings.envelope.release, 
                    baseUrl: "", // Important if not using relative paths in urls object
                }).connect(this.distortionNode); // Connect to effects chain
                // Apply loop settings
                this.toneSampler.loop = this.instrumentSamplerSettings.loop;
                this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart;
                this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd;

                if (!(this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded)) {
                     console.warn(`InstrumentSampler: Audio buffer not ready for track ${this.id}. Sample may need to be reloaded or loaded from DataURL.`); 
                }
            }

            // Sets the track volume
            setVolume(volume, fromInteraction = false) { 
                const oldVolume = this.previousVolumeBeforeMute;
                this.previousVolumeBeforeMute = parseFloat(volume); 
                if (!this.isMuted) { this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05); } // Ramp for smooth transition
            }
            
            // Applies mute state to the track's gain
            applyMuteState() { 
                if (this.isMuted) {
                    this.gainNode.gain.rampTo(0, 0.01); // Mute quickly
                } else {
                    // If another track is soloed, keep this track muted unless it's the soloed one
                    if (soloedTrackId && soloedTrackId !== this.id) {
                        this.gainNode.gain.rampTo(0, 0.01); 
                    } else {
                        this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05); // Unmute to previous volume
                    }
                }
            }
            // Applies solo state to the track's gain
            applySoloState() { 
                if (this.isMuted) return; // Muted tracks remain muted even if soloed

                if (soloedTrackId) { // If any track is soloed
                    if (this.id === soloedTrackId) { // If this is the soloed track
                        this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05); // Play at its volume
                    } else { // If this is not the soloed track
                        this.gainNode.gain.rampTo(0, 0.01); // Mute it
                    }
                } else { // If no track is soloed
                    this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05); // Play all unmuted tracks at their volume
                }
            }

            // --- Effect Parameter Setters ---
            // Each setter updates the internal effect state and the corresponding Tone.js node parameter
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
                this.saturationNode.order = Math.max(1, Math.floor(this.effects.saturation.amount) * 2 + 1); // Chebyshev order
            }

            // --- Synth Parameter Setters ---
            setSynthOscillatorType(type) { if (this.type !== 'Synth' || !this.instrument) return; this.synthParams.oscillator.type = type; this.instrument.set({ oscillator: { type: type }}); }
            setSynthEnvelope(param, value) { if (this.type !== 'Synth' || !this.instrument) return; const val = parseFloat(value); if (isNaN(val)) return; this.synthParams.envelope[param] = val; this.instrument.set({ envelope: this.synthParams.envelope }); }
            
            // --- Slicer Sampler Parameter Setters ---
            setSliceVolume(sliceIndex, volume) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].volume = parseFloat(volume) || 0;}
            setSlicePitchShift(sliceIndex, semitones) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].pitchShift = parseFloat(semitones) || 0;}
            setSliceLoop(sliceIndex, loop) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].loop = Boolean(loop);}
            setSliceReverse(sliceIndex, reverse) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].reverse = Boolean(reverse);}
            setSliceEnvelopeParam(sliceIndex, param, value) { if (this.type !== 'Sampler' || !this.slices[sliceIndex] || !this.slices[sliceIndex].envelope) return; this.slices[sliceIndex].envelope[param] = parseFloat(value) || 0; }
            
            // --- Drum Sampler Parameter Setters ---
            setDrumSamplerPadVolume(padIndex, volume) { if(this.type !== 'DrumSampler' || !this.drumSamplerPads[padIndex]) return; this.drumSamplerPads[padIndex].volume = parseFloat(volume);}
            setDrumSamplerPadPitch(padIndex, pitch) { if(this.type !== 'DrumSampler' || !this.drumSamplerPads[padIndex]) return; this.drumSamplerPads[padIndex].pitchShift = parseFloat(pitch);}
            setDrumSamplerPadEnv(padIndex, param, value) { if(this.type !== 'DrumSampler' || !this.drumSamplerPads[padIndex]) return; this.drumSamplerPads[padIndex].envelope[param] = parseFloat(value);}

            // --- Instrument Sampler Parameter Setters ---
            setInstrumentSamplerRootNote(noteName) { if(this.type !== 'InstrumentSampler') return; this.instrumentSamplerSettings.rootNote = noteName; this.setupToneSampler(); } // Re-setup sampler if root note changes
            setInstrumentSamplerLoop(loop) { if(this.type !== 'InstrumentSampler') return; this.instrumentSamplerSettings.loop = Boolean(loop); if(this.toneSampler) this.toneSampler.loop = this.instrumentSamplerSettings.loop; }
            setInstrumentSamplerLoopStart(time) { if(this.type !== 'InstrumentSampler' || !this.instrumentSamplerSettings.audioBuffer) return; this.instrumentSamplerSettings.loopStart = Math.min(this.instrumentSamplerSettings.audioBuffer.duration, Math.max(0, parseFloat(time))); if(this.toneSampler) this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart; }
            setInstrumentSamplerLoopEnd(time) { if(this.type !== 'InstrumentSampler' || !this.instrumentSamplerSettings.audioBuffer) return; this.instrumentSamplerSettings.loopEnd = Math.min(this.instrumentSamplerSettings.audioBuffer.duration, Math.max(this.instrumentSamplerSettings.loopStart, parseFloat(time))); if(this.toneSampler) this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd; }
            setInstrumentSamplerEnv(param, value) { if(this.type !== 'InstrumentSampler') return; this.instrumentSamplerSettings.envelope[param] = parseFloat(value); if(this.toneSampler) this.toneSampler.set({ attack: this.instrumentSamplerSettings.envelope.attack, release: this.instrumentSamplerSettings.envelope.release }); }

            // Sets the sequence length (in steps) and reinitializes the sequencer
            setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
                const oldLength = this.sequenceLength;
                // Ensure length is a multiple of STEPS_PER_BAR and at least STEPS_PER_BAR
                newLengthInSteps = Math.max(STEPS_PER_BAR, parseInt(newLengthInSteps) || defaultStepsPerBar); 
                newLengthInSteps = Math.ceil(newLengthInSteps / STEPS_PER_BAR) * STEPS_PER_BAR;

                // Undo capture for sequence length change is handled by the input field's 'change' event listener
                
                this.sequenceLength = newLengthInSteps; 
                
                // Determine number of rows for the new grid
                let numRows;
                if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = synthPitches.length;
                else if (this.type === 'Sampler') numRows = this.slices.length > 0 ? this.slices.length : numSlices;
                else if (this.type === 'DrumSampler') numRows = numDrumSamplerPads;
                else numRows = 0;
                
                // Create new sequence data grid, preserving existing data where possible
                const newGridData = Array(numRows).fill(null).map(() => Array(this.sequenceLength).fill(null));
                if (Array.isArray(this.sequenceData) && Array.isArray(this.sequenceData[0])) { 
                    for (let r = 0; r < Math.min(this.sequenceData.length, numRows); r++) { 
                        for (let c = 0; c < Math.min(this.sequenceData[r]?.length || 0, this.sequenceLength); c++) { 
                            newGridData[r][c] = this.sequenceData[r][c]; 
                        }
                    }
                }
                this.sequenceData = newGridData;
                
                // Dispose existing Tone.Sequence and create a new one
                if (this.sequence) this.sequence.dispose();
                
                this.sequence = new Tone.Sequence((time, col) => { // Callback for each step in the sequence
                    if (this.isMuted || (soloedTrackId && soloedTrackId !== this.id)) return; // Skip if muted or another track is soloed

                    // --- Sequencer Playback Logic for Different Track Types ---
                    if (this.type === 'Synth') {
                        synthPitches.forEach((pitchName, rowIndex) => { 
                            const step = this.sequenceData[rowIndex]?.[col]; 
                            if (step && step.active && this.instrument) { // If step is active and instrument exists
                                this.instrument.triggerAttackRelease(pitchName, "8n", time, step.velocity); // Trigger synth note
                            }
                        });
                    } else if (this.type === 'Sampler') { 
                        this.slices.forEach((sliceData, sliceIndex) => { 
                            const step = this.sequenceData[sliceIndex]?.[col]; 
                            if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) { // If step active, slice valid, audio loaded
                                const totalPitchShift = sliceData.pitchShift; 
                                const playbackRate = Math.pow(2, totalPitchShift / 12); // Calculate playback rate from pitch shift
                                let playDuration = sliceData.duration / playbackRate; 
                                if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds(); // Limit loop duration for sequence step

                                if (this.slicerIsPolyphonic) { // Polyphonic playback: create new player for each note
                                    const tempPlayer = new Tone.Player(this.audioBuffer); 
                                    const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope); 
                                    const tempGain = new Tone.Gain(Tone.dbToGain(-6) * sliceData.volume * step.velocity); // Apply slice, step velocity, and base gain
                                    tempPlayer.chain(tempEnv, tempGain, this.distortionNode); // Connect to effects
                                    
                                    // Set player parameters
                                    tempPlayer.playbackRate = playbackRate; 
                                    tempPlayer.reverse = sliceData.reverse; 
                                    tempPlayer.loop = sliceData.loop; 
                                    tempPlayer.loopStart = sliceData.offset; 
                                    tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                                    
                                    tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration); // Start player
                                    tempEnv.triggerAttack(time); // Trigger envelope
                                    if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95); // Schedule release if not looping
                                    
                                    // Schedule disposal of temporary nodes to prevent memory leaks
                                    Tone.Transport.scheduleOnce(() => { 
                                        if (tempPlayer && !tempPlayer.disposed) { tempPlayer.stop(); tempPlayer.dispose(); }
                                        if (tempEnv && !tempEnv.disposed) tempEnv.dispose(); 
                                        if (tempGain && !tempGain.disposed) tempGain.dispose(); 
                                    }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.1);
                                } else { // Monophonic playback: reuse single player instance
                                    if (!this.slicerMonoPlayer || this.slicerMonoPlayer.disposed) return;
                                    const player = this.slicerMonoPlayer;
                                    const env = this.slicerMonoEnvelope;
                                    const gain = this.slicerMonoGain;

                                    if (player.state === 'started') { player.stop(time);  } // Stop previous note if playing
                                    if (env.getValueAtTime(time) > 0.001) { env.triggerRelease(time); } // Release previous envelope

                                    player.buffer = this.audioBuffer; // Ensure buffer is set
                                    env.set(sliceData.envelope); // Apply slice envelope
                                    gain.gain.value = Tone.dbToGain(-6) * sliceData.volume * step.velocity; // Set gain
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
                                        env.triggerRelease(Math.max(time, releaseTime)); // Schedule release
                                    }
                                }
                            }
                        });
                    } else if (this.type === 'DrumSampler') { 
                        this.drumSamplerPads.forEach((padData, padIndex) => {
                            const step = this.sequenceData[padIndex]?.[col];
                            if (step?.active && this.drumPadPlayers[padIndex] && this.drumPadPlayers[padIndex].loaded) { // If step active, player loaded
                                const player = this.drumPadPlayers[padIndex]; 
                                player.volume.value = Tone.gainToDb(padData.volume * step.velocity); // Apply pad volume and step velocity
                                player.playbackRate = Math.pow(2, (padData.pitchShift) / 12); // Apply pitch shift
                                player.start(time); // Trigger pad
                            }
                        });
                    } else if (this.type === 'InstrumentSampler') {
                        synthPitches.forEach((pitchName, rowIndex) => { 
                            const step = this.sequenceData[rowIndex]?.[col];
                            if (step?.active && this.toneSampler && this.toneSampler.loaded) { // If step active, sampler loaded
                                const midiNote = Tone.Frequency(pitchName).toMidi();
                                const shiftedNote = Tone.Frequency(midiNote, "midi").toNote(); // Convert MIDI note to note name
                                this.toneSampler.triggerAttackRelease(shiftedNote, "8n", time, step.velocity); // Trigger instrument sampler
                            }
                        });
                    }

                    // Highlight playing step in sequencer UI if window is open and active
                    if (this.sequencerWindow && !this.sequencerWindow.isMinimized && activeSequencerTrackId === this.id) {
                        const grid = this.sequencerWindow.element?.querySelector('.sequencer-grid');
                        if (grid) highlightPlayingStep(col, this.type, grid);
                    }
                }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0); // Sequence runs at 16th note intervals
                
                // If sequencer window is open, redraw it to reflect new length
                if (this.sequencerWindow && !this.sequencerWindow.isMinimized && openWindows[`sequencerWin-${this.id}`]) {
                    openTrackSequencerWindow(this.id, true); // Force redraw
                }
            }

            // Disposes of all Tone.js nodes and associated resources for the track
            dispose() { 
                // Dispose instruments
                if (this.instrument && !this.instrument.disposed) this.instrument.dispose(); 
                if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose(); 
                this.drumSamplerPads.forEach(pad => { if (pad.audioBuffer?.dispose && !pad.audioBuffer.disposed) pad.audioBuffer.dispose(); });
                this.drumPadPlayers.forEach(player => { if (player?.dispose && !player.disposed) player.dispose(); });
                if (this.instrumentSamplerSettings.audioBuffer?.dispose && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();
                if (this.toneSampler?.dispose && !this.toneSampler.disposed) this.toneSampler.dispose();
                
                this.disposeSlicerMonoNodes(); // Dispose slicer-specific mono nodes

                // Dispose effect nodes
                const nodesToDispose = [
                    this.gainNode, this.reverbNode, this.delayNode, 
                    this.compressorNode, this.eq3Node, this.filterNode, 
                    this.distortionNode, this.chorusNode, this.saturationNode, this.trackMeter
                ];
                nodesToDispose.forEach(node => { if (node && !node.disposed) node.dispose(); });
                
                // Dispose sequence
                if (this.sequence && !this.sequence.disposed) { 
                    this.sequence.stop(); 
                    this.sequence.clear(); 
                    this.sequence.dispose(); 
                }
                
                // Close associated windows
                if (this.inspectorWindow) this.inspectorWindow.close(); 
                if (this.effectsRackWindow) this.effectsRackWindow.close(); 
                if(this.sequencerWindow) this.sequencerWindow.close();  
                
                console.log(`Track ${this.id} (${this.name}) disposed.`);
            }
        }

        // --- UI Creation Functions ---

        // Opens or focuses the Global Controls window
        function openGlobalControlsWindow(savedState = null) {
            const windowId = 'globalControls';
            // If window exists and not restoring from save, just restore/focus it
            if (openWindows[windowId] && !savedState) { 
                 openWindows[windowId].restore(); return;
            }
            
            // Create content for Global Controls window
            const contentDiv = document.createElement('div');
            contentDiv.className = 'global-controls-window p-2 space-y-3'; 

            // Transport Controls: Play and Record buttons
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

            // Tempo Control
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
            
            // MIDI Input Select and Indicators
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
            
            // Master Output Meter
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

            // Window options, including saved state if provided
            const winOptions = {
                width: 280, height: 250, x: 20, y: 20,
                initialContentKey: 'globalControls' // For identifying window type on project load
            };
             if (savedState) { // Apply saved position, size, z-index, minimized state
                Object.assign(winOptions, {
                    x: parseFloat(savedState.left), y: parseFloat(savedState.top),
                    width: parseFloat(savedState.width), height: parseFloat(savedState.height),
                    zIndex: savedState.zIndex, isMinimized: savedState.isMinimized
                });
            }

            const globalControlsWin = createWindow(windowId, 'Global Controls', contentDiv.outerHTML, winOptions);
            if (!globalControlsWin || !globalControlsWin.element) { 
                showNotification("Failed to create Global Controls window.", 5000); 
                return null; 
            }
            
            // Get references to dynamically created elements within the window
            const winEl = globalControlsWin.element;
            playBtn = winEl.querySelector('#playBtnGlobal'); 
            recordBtn = winEl.querySelector('#recordBtnGlobal'); 
            tempoInput = winEl.querySelector('#tempoGlobalInput'); 
            masterMeterBar = winEl.querySelector('#masterMeterBarGlobal'); 
            midiInputSelectGlobal = winEl.querySelector('#midiInputSelectGlobal'); 
            midiIndicatorGlobalEl = winEl.querySelector('#midiIndicatorGlobal'); 
            keyboardIndicatorGlobalEl = winEl.querySelector('#keyboardIndicatorGlobal');

            // Event listener for Play/Pause button
            if (playBtn) {
                playBtn.addEventListener('click', async () => { 
                    try {
                        await initAudioContextAndMasterMeter(); // Ensure audio context is running
                        if (Tone.Transport.state !== 'started') {
                            Tone.Transport.position = 0; // Reset transport position
                            Tone.Transport.start(); 
                        } else {
                            Tone.Transport.pause();
                        }
                    } catch (error) {
                        console.error("Error in play/pause click:", error);
                        // Reset button text if error occurs before starting
                        const actualPlayBtn = document.getElementById('playBtnGlobal'); 
                        if (actualPlayBtn && Tone.Transport.state !== 'started') {
                            actualPlayBtn.textContent = 'Play';
                        }
                    }
                });
            }

            // Event listener for Record button
            if (recordBtn) { 
                recordBtn.addEventListener('click', async () => {
                    try {
                        await initAudioContextAndMasterMeter();
                        
                        if (!isRecording) { // Start recording
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
                            recordingStartTime = Tone.Transport.seconds; // Store start time
                            
                            recordBtn.textContent = 'Stop Rec';
                            recordBtn.classList.add('recording'); // Apply recording style
                            showNotification(`Recording started for ${trackToRecord.name}.`, 2000);
                            captureStateForUndo(`Start Recording on ${trackToRecord.name}`);
                            
                            // Start transport if not already started
                            if (Tone.Transport.state !== 'started') {
                                Tone.Transport.position = 0;
                                Tone.Transport.start();
                            }

                        } else { // Stop recording
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
                        // Reset recording state on error
                        if (recordBtn) {
                            recordBtn.textContent = 'Record';
                            recordBtn.classList.remove('recording');
                        }
                        isRecording = false;
                        recordingTrackId = null;
                    }
                });
            }
            
            // Event listener for Tempo input
            if (tempoInput) {
                tempoInput.addEventListener('change', (e) => { 
                    const newTempo = parseFloat(e.target.value);
                    if (!isNaN(newTempo) && newTempo >= 40 && newTempo <= 240) { // Validate tempo range
                        if (Tone.Transport.bpm.value !== newTempo) {
                            captureStateForUndo(`Set Tempo to ${newTempo.toFixed(1)} BPM`);
                        }
                        Tone.Transport.bpm.value = newTempo; 
                        updateTaskbarTempoDisplay(newTempo); // Update display on taskbar
                    } else { 
                        e.target.value = Tone.Transport.bpm.value.toFixed(1); // Reset to current if invalid
                    }
                });
            }
            
            // Event listener for MIDI Input select
            if(midiInputSelectGlobal) { 
                populateMIDIInputs(); // Populate dropdown with available MIDI inputs
                if (activeMIDIInput) midiInputSelectGlobal.value = activeMIDIInput.id; // Select current if exists
                midiInputSelectGlobal.onchange = () => { // Handle selection change
                    const oldMidiName = activeMIDIInput ? activeMIDIInput.name : "No MIDI Input";
                    const newMidiId = midiInputSelectGlobal.value;
                    const newMidiDevice = midiAccess && newMidiId ? midiAccess.inputs.get(newMidiId) : null;
                    const newMidiName = newMidiDevice ? newMidiDevice.name : "No MIDI Input";

                    if (oldMidiName !== newMidiName) { // Capture undo if input changed
                         captureStateForUndo(`Change MIDI Input to ${newMidiName}`);
                    }
                    selectMIDIInput(); // Apply selected MIDI input
                };
            }

            // Initialize Tone.Transport event listeners (once)
            if (!transportEventsInitialized && typeof Tone !== 'undefined' && Tone.Transport) {
                Tone.Transport.on('start', () => {
                    const btn = document.getElementById('playBtnGlobal');
                    if (btn) btn.textContent = 'Pause'; // Update play button text
                });

                Tone.Transport.on('pause', () => {
                    const btn = document.getElementById('playBtnGlobal');
                    if (btn) btn.textContent = 'Play';
                     // Stop recording if transport is paused
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
                    // Clear playing step highlights in sequencers
                    document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
                    // Stop recording if transport is stopped
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
        
        // Opens or focuses the Track Inspector window for a given track
        function openTrackInspectorWindow(trackId, savedState = null) { 
            const track = tracks.find(t => t.id === trackId);
            if (!track) {
                showNotification(`Track with ID ${trackId} not found.`, 3000);
                return null;
            }
            const inspectorId = `trackInspector-${track.id}`;
            // If window exists and not restoring from save, just restore/focus it
            if (openWindows[inspectorId] && !savedState) { 
                openWindows[inspectorId].restore(); 
                return openWindows[inspectorId]; 
            }

            track.inspectorControls = {}; // Reset inspector controls references

            let specificContentHTML = ''; // HTML specific to track type
            let windowHeight = 450; // Default window height, adjusted by content

            const currentBars = track.sequenceLength / STEPS_PER_BAR; // Calculate current sequence length in bars

            // Basic track controls (Volume, Sequence Length)
            let basicControlsHTML = `<div class="panel"><h4 class="text-sm font-semibold mb-1">Track Controls</h4><div class="control-group">`;
            basicControlsHTML += `<div id="volumeSliderContainer-${track.id}"></div>`; // Placeholder for volume knob
            basicControlsHTML += `<div class="flex flex-col items-center">
                                    <label for="sequenceLengthBars-${track.id}" class="knob-label">Seq Len (Bars)</label>
                                    <input type="number" id="sequenceLengthBars-${track.id}" value="${currentBars}" min="1" max="256" step="1" class="bg-white text-black w-16 p-1 rounded-sm text-center text-xs border border-gray-500">
                                    <span id="sequenceLengthDisplay-${track.id}" class="knob-value">${currentBars} bars (${track.sequenceLength} steps)</span>
                                  </div>`;
            basicControlsHTML += `</div></div>`;

            // Generate content based on track type
            if (track.type === 'Synth') {
                specificContentHTML = `<div class="panel synth-panel">
                    <h4 class="text-sm font-semibold">Oscillator</h4>
                    <select id="oscType-${track.id}" class="text-xs p-1 border w-full mb-2 bg-white text-black"></select>
                    <h4 class="text-sm font-semibold">Envelope (ADSR)</h4>
                    <div class="control-group">
                        <div id="envAttackSlider-${track.id}"></div> <div id="envDecaySlider-${track.id}"></div>
                        <div id="envSustainSlider-${track.id}"></div> <div id="envReleaseSlider-${track.id}"></div>
                    </div>
                </div>`;
                windowHeight = 520;
            } else if (track.type === 'Sampler') { 
                 specificContentHTML = `
                    ${createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler')}
                    <div class="panel sampler-editor-panel mt-1 flex flex-wrap md:flex-nowrap gap-3">
                        <div class="flex-grow w-full md:w-3/5">
                            <canvas id="waveformCanvas-${track.id}" class="waveform-canvas w-full" width="380" height="70"></canvas>
                            <div id="samplePadsContainer-${track.id}" class="pads-container mt-2"></div>
                        </div>
                        <div id="sliceControlsContainer-${track.id}" class="slice-edit-group w-full md:w-2/5 space-y-1">
                            <h4 class="text-sm font-semibold">Slice: <span id="selectedSliceLabel-${track.id}">${track.selectedSliceForEdit + 1}</span></h4>
                            <div class="flex gap-1 items-center text-xs"><label>Start:</label><input type="number" id="sliceStart-${track.id}" class="flex-grow p-0.5 text-xs bg-white text-black border"></div>
                            <div class="flex gap-1 items-center text-xs"><label>End:</label><input type="number" id="sliceEnd-${track.id}" class="flex-grow p-0.5 text-xs bg-white text-black border"></div>
                            <button id="applySliceEditsBtn-${track.id}" class="bg-blue-500 text-white text-xs py-0.5 px-1.5 rounded mt-1 hover:bg-blue-600">Apply S/E</button>
                            <div class="control-group mt-1">
                                <div id="sliceVolumeSlider-${track.id}"></div> <div id="slicePitchKnob-${track.id}"></div> 
                            </div>
                            <div class="flex gap-2 mt-1">
                                <button id="sliceLoopToggle-${track.id}" class="slice-toggle-button text-xs p-1">Loop</button> 
                                <button id="sliceReverseToggle-${track.id}" class="slice-toggle-button text-xs p-1">Reverse</button>
                            </div>
                            <button id="slicerPolyphonyToggle-${track.id}" class="slice-toggle-button text-xs p-1 mt-1 w-full">Mode: Poly</button> 
                            <details class="mt-1"><summary class="text-xs font-semibold">Slice Env</summary><div class="control-group">
                                <div id="sliceEnvAttackSlider-${track.id}"></div> <div id="sliceEnvDecaySlider-${track.id}"></div>
                                <div id="sliceEnvSustainSlider-${track.id}"></div> <div id="sliceEnvReleaseSlider-${track.id}"></div>
                            </div></details>
                        </div>
                    </div>`;
                windowHeight = 620; 
            } else if (track.type === 'DrumSampler') { 
                specificContentHTML = `<div class="panel drum-sampler-panel">
                    <h4 class="text-sm font-semibold mb-1">Drum Pads (Selected: <span id="selectedDrumPadLabel-${track.id}">${track.selectedDrumPadForEdit + 1}</span>)</h4>
                    <div id="drumSamplerPadsContainer-${track.id}" class="pads-container mb-2"></div>
                    <div id="drumPadControlsContainer-${track.id}" class="border-t pt-2">
                         <div id="drumPadLoadContainer-${track.id}" class="mb-2"></div>
                        <div class="control-group">
                            <div id="drumPadVolumeSlider-${track.id}"></div> <div id="drumPadPitchKnob-${track.id}"></div> 
                        </div>
                        <details class="mt-1"><summary class="text-xs font-semibold">Pad Envelope (AR)</summary><div class="control-group">
                            <div id="drumPadEnvAttackSlider-${track.id}"></div> <div id="drumPadEnvReleaseSlider-${track.id}"></div>
                        </div></details>
                        </div>
                </div>`;
                windowHeight = 580; 
            } else if (track.type === 'InstrumentSampler') {
                specificContentHTML = `<div class="panel instrument-sampler-panel">
                    ${createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler')}
                    <canvas id="instrumentWaveformCanvas-${track.id}" class="waveform-canvas w-full mb-1" width="380" height="70"></canvas>
                    <div class="control-group mb-2 items-center">
                        <div><label class="knob-label text-xs">Root Note</label><input type="text" id="instrumentRootNote-${track.id}" value="${track.instrumentSamplerSettings.rootNote}" class="bg-white text-black w-12 p-0.5 text-xs text-center border"></div>
                        <div><label class="knob-label text-xs">Loop</label><button id="instrumentLoopToggle-${track.id}" class="slice-toggle-button text-xs p-1">${track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF'}</button></div>
                        <div><label class="knob-label text-xs">Start</label><input type="number" id="instrumentLoopStart-${track.id}" value="${track.instrumentSamplerSettings.loopStart.toFixed(3)}" step="0.001" class="bg-white text-black w-16 p-0.5 text-xs text-center border"></div>
                        <div><label class="knob-label text-xs">End</label><input type="number" id="instrumentLoopEnd-${track.id}" value="${track.instrumentSamplerSettings.loopEnd.toFixed(3)}" step="0.001" class="bg-white text-black w-16 p-0.5 text-xs text-center border"></div>
                    </div>
                     <button id="instrumentSamplerPolyphonyToggle-${track.id}" class="slice-toggle-button text-xs p-1 mb-2 w-full">Mode: Poly</button> 
                    <h4 class="text-sm font-semibold">Envelope (ADSR)</h4>
                    <div class="control-group">
                        <div id="instrumentEnvAttackSlider-${track.id}"></div> <div id="instrumentEnvDecaySlider-${track.id}"></div>
                        <div id="instrumentEnvSustainSlider-${track.id}"></div> <div id="instrumentEnvReleaseSlider-${track.id}"></div>
                    </div>
                </div>`;
                windowHeight = 620; 
            }

            // Assemble full inspector content
            const inspectorContent = `
                <div class="track-inspector-content p-2 space-y-1">
                    <div class="flex items-center justify-between mb-1">
                        <input type="text" id="trackNameDisplay-${track.id}" value="${track.name}" class="text-md font-bold bg-transparent border-b w-full focus:ring-0 focus:border-blue-500">
                        <div id="trackMeterContainer-${track.id}" class="track-meter-container meter-bar-container w-1/3 ml-2 h-4"><div id="trackMeterBar-${track.id}" class="meter-bar"></div></div>
                    </div>
                    <div class="flex items-center gap-1 mb-1">
                        <button id="muteBtn-${track.id}" class="mute-button text-xs p-1 ${track.isMuted ? 'muted' : ''}">M</button>
                        <button id="soloBtn-${track.id}" class="solo-button text-xs p-1 ${track.isSoloed ? 'soloed' : ''}">S</button>
                        <button id="armInputBtn-${track.id}" class="arm-input-button text-xs p-1 ${armedTrackId === track.id ? 'armed' : ''}">Arm</button>
                        <button id="removeTrackBtn-${track.id}" class="bg-red-500 hover:bg-red-600 text-white text-xs py-0.5 px-1.5 rounded ml-auto">Del</button>
                    </div>
                    ${basicControlsHTML}
                    ${specificContentHTML}
                    <button onclick="openTrackEffectsRackWindow(${track.id})" class="effects-rack-button text-xs py-1 px-2 rounded mt-2 w-full hover:bg-gray-300">Effects Rack</button>
                    <button onclick="openTrackSequencerWindow(${track.id})" class="bg-indigo-500 hover:bg-indigo-600 text-white text-xs py-1 px-2 rounded mt-1 w-full">Sequencer</button>
                </div>`;
            
            // Window options, applying saved state if provided
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

            const inspectorWin = createWindow(inspectorId, `Track: ${track.name}`, inspectorContent, winOptions);
            if (!inspectorWin || !inspectorWin.element) { 
                showNotification(`Failed to create Inspector for track ${track.id}`, 5000); 
                return null; 
            }
            track.inspectorWindow = inspectorWin; // Store reference to window in track object
            const winEl = inspectorWin.element;

            // Setup drop zones and file inputs for sampler tracks
            if (track.type === 'Sampler') {
                const dropZoneEl = winEl.querySelector(`#dropZone-${track.id}-sampler`);
                const fileInputEl = winEl.querySelector(`#fileInput-${track.id}`);
                if (dropZoneEl && fileInputEl) {
                    setupDropZoneListeners(dropZoneEl, track.id, 'Sampler');
                    fileInputEl.onchange = (e) => {
                        captureStateForUndo(`Load sample to ${track.name}`);
                        loadSampleFile(e, track.id, 'Sampler');
                    };
                }
                renderSamplePads(track); // Render slicer pads
                winEl.querySelector(`#applySliceEditsBtn-${track.id}`)?.addEventListener('click', () => {
                    captureStateForUndo(`Apply Slice Edits for ${track.name}`);
                    applySliceEdits(track.id); // Apply changes to slice start/end times
                });
            } else if (track.type === 'InstrumentSampler') {
                const dropZoneEl = winEl.querySelector(`#dropZone-${track.id}-instrumentsampler`);
                const fileInputEl = winEl.querySelector(`#instrumentFileInput-${track.id}`);
                if (dropZoneEl && fileInputEl) {
                    setupDropZoneListeners(dropZoneEl, track.id, 'InstrumentSampler');
                     fileInputEl.onchange = (e) => {
                        captureStateForUndo(`Load sample to Instrument Sampler ${track.name}`);
                        loadSampleFile(e, track.id, 'InstrumentSampler');
                    };
                }
            } else if (track.type === 'DrumSampler') {
                const padLoadContainer = winEl.querySelector(`#drumPadLoadContainer-${track.id}`);
                if (padLoadContainer) {
                    updateDrumPadControlsUI(track); // Update UI for selected drum pad
                }
                renderDrumSamplerPads(track); // Render drum pads
            }

            // Create Volume knob
            const volSliderContainer = winEl.querySelector(`#volumeSliderContainer-${track.id}`);
            if (volSliderContainer) {
                const volKnob = createKnob({ 
                    label: 'Volume', min: 0, max: 1, step: 0.01, initialValue: track.previousVolumeBeforeMute, decimals: 2, sensitivity: 0.8,
                    trackRef: track, 
                    onValueChange: (val, oldVal, fromInteraction) => { 
                        track.setVolume(val, fromInteraction); 
                        updateMixerWindow(); // Update mixer if volume changes
                    }
                });
                volSliderContainer.appendChild(volKnob.element);
                track.inspectorControls.volume = volKnob; // Store reference to knob
            }
            
            // Event listeners for track name, mute, solo, arm, remove
            winEl.querySelector(`#trackNameDisplay-${track.id}`)?.addEventListener('change', (e) => { 
                const oldName = track.name;
                const newName = e.target.value;
                if (oldName !== newName) {
                    captureStateForUndo(`Rename Track "${oldName}" to "${newName}"`);
                }
                track.name = newName; 
                inspectorWin.titleBar.querySelector('span').textContent = `Track: ${track.name}`; // Update window title
                updateMixerWindow(); // Update mixer display
            });
            winEl.querySelector(`#muteBtn-${track.id}`)?.addEventListener('click', () => handleTrackMute(track.id));
            winEl.querySelector(`#soloBtn-${track.id}`)?.addEventListener('click', () => handleTrackSolo(track.id));
            winEl.querySelector(`#armInputBtn-${track.id}`)?.addEventListener('click', () => handleTrackArm(track.id));
            winEl.querySelector(`#removeTrackBtn-${track.id}`)?.addEventListener('click', () => removeTrack(track.id)); 
            
            // Event listener for Sequence Length input
            const seqLenBarsInput = winEl.querySelector(`#sequenceLengthBars-${track.id}`);
            const seqLenDisplaySpan = winEl.querySelector(`#sequenceLengthDisplay-${track.id}`);
            if(seqLenBarsInput && seqLenDisplaySpan) { 
                seqLenBarsInput.addEventListener('change', (e) => { 
                    let numBars = parseInt(e.target.value); 
                    if(isNaN(numBars) || numBars < 1) numBars = 1; // Validate input
                    if(numBars > 256) numBars = 256; 
                    e.target.value = numBars;

                    const numSteps = numBars * STEPS_PER_BAR;
                    if (track.sequenceLength !== numSteps) { // If length changed
                        captureStateForUndo(`Set Seq Length for ${track.name} to ${numBars} bars`);
                        track.setSequenceLength(numSteps); // Update track's sequence length
                        seqLenDisplaySpan.textContent = `${numBars} bars (${numSteps} steps)`;
                        // Redraw sequencer window if open
                        if (track.sequencerWindow && !track.sequencerWindow.isMinimized) {
                            openTrackSequencerWindow(track.id, true); 
                        }
                    }
                });
            }

            // Create and attach controls specific to track type (Synth, Sampler, etc.)
            if (track.type === 'Synth') {
                const oscTypeSelect = winEl.querySelector(`#oscType-${track.id}`);
                if (oscTypeSelect) { 
                    ['sine', 'square', 'sawtooth', 'triangle', 'pwm', 'pulse'].forEach(type => oscTypeSelect.add(new Option(type, type))); 
                    oscTypeSelect.value = track.synthParams.oscillator.type; 
                    oscTypeSelect.addEventListener('change', (e) => {
                        captureStateForUndo(`Set Osc Type for ${track.name} to ${e.target.value}`);
                        track.setSynthOscillatorType(e.target.value);
                    }); 
                }
                // Envelope knobs
                const envAKnob = createKnob({ label: 'Attack', min: 0.005, max: 2, step: 0.001, initialValue: track.synthParams.envelope.attack, decimals: 3, trackRef: track, onValueChange: (val) => track.setSynthEnvelope('attack', val) });
                winEl.querySelector(`#envAttackSlider-${track.id}`)?.appendChild(envAKnob.element); track.inspectorControls.envAttack = envAKnob;
                const envDKnob = createKnob({ label: 'Decay', min: 0.01, max: 2, step: 0.01, initialValue: track.synthParams.envelope.decay, decimals: 2, trackRef: track, onValueChange: (val) => track.setSynthEnvelope('decay', val) });
                winEl.querySelector(`#envDecaySlider-${track.id}`)?.appendChild(envDKnob.element); track.inspectorControls.envDecay = envDKnob;
                const envSKnob = createKnob({ label: 'Sustain', min: 0, max: 1, step: 0.01, initialValue: track.synthParams.envelope.sustain, decimals: 2, trackRef: track, onValueChange: (val) => track.setSynthEnvelope('sustain', val) });
                winEl.querySelector(`#envSustainSlider-${track.id}`)?.appendChild(envSKnob.element); track.inspectorControls.envSustain = envSKnob;
                const envRKnob = createKnob({ label: 'Release', min: 0.01, max: 5, step: 0.01, initialValue: track.synthParams.envelope.release, decimals: 2, trackRef: track, onValueChange: (val) => track.setSynthEnvelope('release', val) });
                winEl.querySelector(`#envReleaseSlider-${track.id}`)?.appendChild(envRKnob.element); track.inspectorControls.envRelease = envRKnob;

            } else if (track.type === 'Sampler') { 
                const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`); 
                if (canvas) { track.waveformCanvasCtx = canvas.getContext('2d'); drawWaveform(track); } // Draw initial waveform
                updateSliceEditorUI(track); // Update UI for selected slice
                
                // Event listeners for slice start/end inputs (values read by applySliceEdits)
                ['sliceStart', 'sliceEnd'].forEach(idSuffix => {
                    const inputEl = winEl.querySelector(`#${idSuffix}-${track.id}`);
                    if (inputEl) {
                        inputEl.addEventListener('change', () => { /* Value picked up by applySliceEdits */ }); 
                    }
                });
                
                // Slice parameter knobs
                const sVolK = createKnob({ label: 'Vol', min:0, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceVolume(track.selectedSliceForEdit, val)});
                winEl.querySelector(`#sliceVolumeSlider-${track.id}`)?.appendChild(sVolK.element); track.inspectorControls.sliceVolume = sVolK;
                const sPitK = createKnob({ label: 'Pitch', min:-24, max:24, step:1, initialValue: track.slices[track.selectedSliceForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setSlicePitchShift(track.selectedSliceForEdit, val)});
                winEl.querySelector(`#slicePitchKnob-${track.id}`)?.appendChild(sPitK.element); track.inspectorControls.slicePitch = sPitK;
                // Slice envelope knobs
                const sEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.attack || 0.01, decimals:3, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'attack', val)});
                winEl.querySelector(`#sliceEnvAttackSlider-${track.id}`)?.appendChild(sEAK.element); track.inspectorControls.sliceEnvAttack = sEAK;
                const sEDK = createKnob({ label: 'Decay', min:0.01, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.decay || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'decay', val)});
                winEl.querySelector(`#sliceEnvDecaySlider-${track.id}`)?.appendChild(sEDK.element); track.inspectorControls.sliceEnvDecay = sEDK;
                const sESK = createKnob({ label: 'Sustain', min:0, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.sustain || 1.0, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'sustain', val)});
                winEl.querySelector(`#sliceEnvSustainSlider-${track.id}`)?.appendChild(sESK.element); track.inspectorControls.sliceEnvSustain = sESK;
                const sERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'release', val)});
                winEl.querySelector(`#sliceEnvReleaseSlider-${track.id}`)?.appendChild(sERK.element); track.inspectorControls.sliceEnvRelease = sERK;
                
                // Slice loop and reverse toggle buttons
                winEl.querySelector(`#sliceLoopToggle-${track.id}`)?.addEventListener('click', (e) => { 
                    captureStateForUndo(`Toggle Loop for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
                    track.setSliceLoop(track.selectedSliceForEdit, !track.slices[track.selectedSliceForEdit].loop); e.target.textContent = track.slices[track.selectedSliceForEdit].loop ? 'Loop: ON' : 'Loop: OFF'; e.target.classList.toggle('active', track.slices[track.selectedSliceForEdit].loop); });
                winEl.querySelector(`#sliceReverseToggle-${track.id}`)?.addEventListener('click', (e) => { 
                    captureStateForUndo(`Toggle Reverse for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
                    track.setSliceReverse(track.selectedSliceForEdit, !track.slices[track.selectedSliceForEdit].reverse); e.target.textContent = track.slices[track.selectedSliceForEdit].reverse ? 'Rev: ON' : 'Rev: OFF'; e.target.classList.toggle('active', track.slices[track.selectedSliceForEdit].reverse);});
                
                // Slicer polyphony toggle button
                const polyphonyToggleBtn = winEl.querySelector(`#slicerPolyphonyToggle-${track.id}`);
                if (polyphonyToggleBtn) {
                    polyphonyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
                    polyphonyToggleBtn.classList.toggle('active', !track.slicerIsPolyphonic); // Active class for Mono
                    polyphonyToggleBtn.addEventListener('click', () => {
                        captureStateForUndo(`Toggle Slicer Polyphony for ${track.name} to ${!track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`);
                        track.slicerIsPolyphonic = !track.slicerIsPolyphonic;
                        polyphonyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
                        polyphonyToggleBtn.classList.toggle('active', !track.slicerIsPolyphonic);
                        if (!track.slicerIsPolyphonic) { // If switching to mono
                            track.setupSlicerMonoNodes(); // Setup mono playback nodes
                             if(track.slicerMonoPlayer && track.audioBuffer?.loaded) track.slicerMonoPlayer.buffer = track.audioBuffer; // Assign buffer
                            showNotification(`${track.name} slicer mode: Mono`, 2000);
                        } else { // If switching to poly
                            track.disposeSlicerMonoNodes(); // Dispose mono nodes
                            showNotification(`${track.name} slicer mode: Poly`, 2000);
                        }
                    });
                }


            } else if (track.type === 'DrumSampler') { 
                updateDrumPadControlsUI(track); // Update UI for selected drum pad
                // Drum pad parameter knobs
                const pVolK = createKnob({ label: 'Pad Vol', min:0, max:1, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(track.selectedDrumPadForEdit, val)});
                winEl.querySelector(`#drumPadVolumeSlider-${track.id}`)?.appendChild(pVolK.element); track.inspectorControls.drumPadVolume = pVolK;
                const pPitK = createKnob({ label: 'Pad Pitch', min:-24, max:24, step:1, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(track.selectedDrumPadForEdit, val)});
                winEl.querySelector(`#drumPadPitchKnob-${track.id}`)?.appendChild(pPitK.element); track.inspectorControls.drumPadPitch = pPitK;
                // Drum pad envelope knobs (Attack, Release)
                const pEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.attack || 0.005, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'attack', val)});
                winEl.querySelector(`#drumPadEnvAttackSlider-${track.id}`)?.appendChild(pEAK.element); track.inspectorControls.drumPadEnvAttack = pEAK;
                const pERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'release', val)});
                winEl.querySelector(`#drumPadEnvReleaseSlider-${track.id}`)?.appendChild(pERK.element); track.inspectorControls.drumPadEnvRelease = pERK;

            } else if (track.type === 'InstrumentSampler') {
                const iCanvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`); 
                if(iCanvas) { track.instrumentWaveformCanvasCtx = iCanvas.getContext('2d'); drawInstrumentWaveform(track); } // Draw initial waveform
                
                // Event listeners for Instrument Sampler controls
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
                
                // Instrument Sampler polyphony toggle
                const instPolyphonyToggleBtn = winEl.querySelector(`#instrumentSamplerPolyphonyToggle-${track.id}`);
                if (instPolyphonyToggleBtn) {
                    instPolyphonyToggleBtn.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
                    instPolyphonyToggleBtn.classList.toggle('active', !track.instrumentSamplerIsPolyphonic); // Active for Mono
                    instPolyphonyToggleBtn.addEventListener('click', () => {
                        captureStateForUndo(`Toggle Instrument Sampler Polyphony for ${track.name} to ${!track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`);
                        track.instrumentSamplerIsPolyphonic = !track.instrumentSamplerIsPolyphonic;
                        instPolyphonyToggleBtn.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
                        instPolyphonyToggleBtn.classList.toggle('active', !track.instrumentSamplerIsPolyphonic);
                        showNotification(`${track.name} Instrument Sampler mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'} (for live input)`, 2000);
                    });
                }

                // Instrument Sampler envelope knobs
                const iEAK = createKnob({ label: 'Attack', min:0.005, max:2, step:0.001, initialValue: track.instrumentSamplerSettings.envelope.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('attack',val) });
                winEl.querySelector(`#instrumentEnvAttackSlider-${track.id}`)?.appendChild(iEAK.element); track.inspectorControls.instEnvAttack = iEAK;
                const iEDK = createKnob({ label: 'Decay', min:0.01, max:2, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('decay',val) });
                winEl.querySelector(`#instrumentEnvDecaySlider-${track.id}`)?.appendChild(iEDK.element); track.inspectorControls.instEnvDecay = iEDK;
                const iESK = createKnob({ label: 'Sustain', min:0, max:1, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('sustain',val) });
                winEl.querySelector(`#instrumentEnvSustainSlider-${track.id}`)?.appendChild(iESK.element); track.inspectorControls.instEnvSustain = iESK;
                const iERK = createKnob({ label: 'Release', min:0.01, max:5, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.release, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('release',val) });
                winEl.querySelector(`#instrumentEnvReleaseSlider-${track.id}`)?.appendChild(iERK.element); track.inspectorControls.instEnvRelease = iERK;
            }
            // Refresh knob visuals after a short delay to ensure DOM is updated
            setTimeout(() => {
                Object.values(track.inspectorControls).forEach(control => {
                    if (control && control.type === 'knob' && typeof control.refreshVisuals === 'function') {
                        control.refreshVisuals();
                    }
                });
            }, 0);
            return inspectorWin;
        }
        
        // Opens or focuses the Effects Rack window for a given track
        function openTrackEffectsRackWindow(trackId, savedState = null) {
            const track = tracks.find(t => t.id === trackId);
            if (!track) return null;
            const windowId = `effectsRack-${track.id}`;
            // If window exists and not restoring from save, just restore/focus it
            if (openWindows[windowId] && !savedState) { openWindows[windowId].restore(); return openWindows[windowId]; }

            track.inspectorControls = track.inspectorControls || {}; // Ensure inspectorControls object exists

            // HTML for effects controls (knobs for each parameter)
            let contentHTML = `<div class="effects-rack-window p-2 space-y-3">`;
            contentHTML += `<div class="effect-group"><h4 class="text-sm font-semibold">Distortion</h4><div id="distAmountKnob-${track.id}"></div></div>`;
            contentHTML += `<div class="effect-group"><h4 class="text-sm font-semibold">Saturation</h4><div class="control-group"><div id="satWetKnob-${track.id}"></div><div id="satAmountKnob-${track.id}"></div></div></div>`;
            contentHTML += `<div class="effect-group"><h4 class="text-sm font-semibold">Filter</h4>
                <select id="filterType-${track.id}" class="text-xs p-1 border w-full mb-1 bg-white text-black"></select>
                <div class="control-group"><div id="filterFreqKnob-${track.id}"></div><div id="filterQKnob-${track.id}"></div></div>
            </div>`;
            contentHTML += `<div class="effect-group"><h4 class="text-sm font-semibold">Chorus</h4><div class="control-group">
                <div id="chorusWetKnob-${track.id}"></div><div id="chorusFreqKnob-${track.id}"></div>
                <div id="chorusDelayTimeKnob-${track.id}"></div><div id="chorusDepthKnob-${track.id}"></div>
            </div></div>`;
            contentHTML += `<div class="effect-group"><h4 class="text-sm font-semibold">EQ3</h4><div class="control-group">
                <div id="eqLowKnob-${track.id}"></div><div id="eqMidKnob-${track.id}"></div><div id="eqHighKnob-${track.id}"></div>
            </div></div>`;
            contentHTML += `<div class="effect-group"><h4 class="text-sm font-semibold">Compressor</h4><div class="control-group">
                <div id="compThreshKnob-${track.id}"></div><div id="compRatioKnob-${track.id}"></div>
                <div id="compAttackKnob-${track.id}"></div><div id="compReleaseKnob-${track.id}"></div>
                <div id="compKneeKnob-${track.id}"></div>
            </div></div>`;
            contentHTML += `<div class="effect-group"><h4 class="text-sm font-semibold">Delay</h4><div class="control-group">
                <div id="delayWetKnob-${track.id}"></div><div id="delayTimeKnob-${track.id}"></div><div id="delayFeedbackKnob-${track.id}"></div>
            </div></div>`;
            contentHTML += `<div class="effect-group"><h4 class="text-sm font-semibold">Reverb</h4><div class="control-group">
                <div id="reverbWetKnob-${track.id}"></div><div id="reverbDecayKnob-${track.id}"></div><div id="reverbPreDelayKnob-${track.id}"></div>
            </div></div>`;
            contentHTML += `</div>`;

            // Window options, applying saved state if provided
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

            const effectsWin = createWindow(windowId, `Effects: ${track.name}`, contentHTML, winOptions); 
            if (!effectsWin || !effectsWin.element) { 
                showNotification("Failed to create Effects Rack.", 5000); 
                return null; 
            }
            track.effectsRackWindow = effectsWin; // Store reference to window in track object
            const winEl = effectsWin.element;

            // Create and attach knobs for each effect parameter, linking them to track's effect setters
            const distAK = createKnob({label: 'Amount', min:0, max:1, step:0.01, initialValue: track.effects.distortion.amount, decimals:2, trackRef: track, onValueChange: track.setDistortionAmount.bind(track)});
            winEl.querySelector(`#distAmountKnob-${track.id}`)?.appendChild(distAK.element); track.inspectorControls.distAmount = distAK;
            
            const satWetK = createKnob({label: 'Sat Wet', min:0, max:1, step:0.01, initialValue: track.effects.saturation.wet, decimals:2, trackRef: track, onValueChange: track.setSaturationWet.bind(track)});
            winEl.querySelector(`#satWetKnob-${track.id}`)?.appendChild(satWetK.element); track.inspectorControls.satWet = satWetK;
            const satAmtK = createKnob({label: 'Sat Amt', min:0, max:20, step:1, initialValue: track.effects.saturation.amount, decimals:0, trackRef: track, onValueChange: track.setSaturationAmount.bind(track)});
            winEl.querySelector(`#satAmountKnob-${track.id}`)?.appendChild(satAmtK.element); track.inspectorControls.satAmount = satAmtK;

            const filterTypeSelect = winEl.querySelector(`#filterType-${track.id}`);
            if (filterTypeSelect) { 
                ['lowpass', 'highpass'].forEach(t => filterTypeSelect.add(new Option(t,t))); 
                filterTypeSelect.value = track.effects.filter.type; 
                filterTypeSelect.addEventListener('change', (e) => {
                    captureStateForUndo(`Set Filter Type for ${track.name} to ${e.target.value}`);
                    track.setFilterType(e.target.value);
                });
            }
            const fFreqK = createKnob({label: 'Freq', min:20, max:20000, step:1, initialValue: track.effects.filter.frequency, decimals:0, displaySuffix:'Hz', trackRef: track, onValueChange: track.setFilterFrequency.bind(track)});
            winEl.querySelector(`#filterFreqKnob-${track.id}`)?.appendChild(fFreqK.element); track.inspectorControls.filterFreq = fFreqK;
            const fQK = createKnob({label: 'Q', min:0.1, max:20, step:0.1, initialValue: track.effects.filter.Q || 1, decimals:1, trackRef: track, onValueChange: (val) => {track.effects.filter.Q = val; track.filterNode.Q.value = val;} });
            winEl.querySelector(`#filterQKnob-${track.id}`)?.appendChild(fQK.element); track.inspectorControls.filterQ = fQK;

            const chWetK = createKnob({label: 'Chorus Wet', min:0, max:1, step:0.01, initialValue: track.effects.chorus.wet, decimals:2, trackRef: track, onValueChange: track.setChorusWet.bind(track)});
            winEl.querySelector(`#chorusWetKnob-${track.id}`)?.appendChild(chWetK.element); track.inspectorControls.chorusWet = chWetK;
            const chFreqK = createKnob({label: 'Chorus Freq', min:0.1, max:20, step:0.1, initialValue: track.effects.chorus.frequency, decimals:1, displaySuffix:'Hz', trackRef: track, onValueChange: track.setChorusFrequency.bind(track)});
            winEl.querySelector(`#chorusFreqKnob-${track.id}`)?.appendChild(chFreqK.element); track.inspectorControls.chorusFreq = chFreqK;
            const chDelTimeK = createKnob({label: 'Chorus Delay', min:1, max:20, step:0.1, initialValue: track.effects.chorus.delayTime, decimals:1, displaySuffix:'ms', trackRef: track, onValueChange: track.setChorusDelayTime.bind(track)});
            winEl.querySelector(`#chorusDelayTimeKnob-${track.id}`)?.appendChild(chDelTimeK.element); track.inspectorControls.chorusDelayTime = chDelTimeK;
            const chDepthK = createKnob({label: 'Chorus Depth', min:0, max:1, step:0.01, initialValue: track.effects.chorus.depth, decimals:2, trackRef: track, onValueChange: track.setChorusDepth.bind(track)});
            winEl.querySelector(`#chorusDepthKnob-${track.id}`)?.appendChild(chDepthK.element); track.inspectorControls.chorusDepth = chDepthK;

            const eqLK = createKnob({label: 'Low', min:-24, max:24, step:1, initialValue: track.effects.eq3.low, decimals:0, displaySuffix:'dB', trackRef: track, onValueChange: track.setEQ3Low.bind(track)});
            winEl.querySelector(`#eqLowKnob-${track.id}`)?.appendChild(eqLK.element); track.inspectorControls.eqLow = eqLK;
            const eqMK = createKnob({label: 'Mid', min:-24, max:24, step:1, initialValue: track.effects.eq3.mid, decimals:0, displaySuffix:'dB', trackRef: track, onValueChange: track.setEQ3Mid.bind(track)});
            winEl.querySelector(`#eqMidKnob-${track.id}`)?.appendChild(eqMK.element); track.inspectorControls.eqMid = eqMK;
            const eqHK = createKnob({label: 'High', min:-24, max:24, step:1, initialValue: track.effects.eq3.high, decimals:0, displaySuffix:'dB', trackRef: track, onValueChange: track.setEQ3High.bind(track)});
            winEl.querySelector(`#eqHighKnob-${track.id}`)?.appendChild(eqHK.element); track.inspectorControls.eqHigh = eqHK;

            const cThreshK = createKnob({label: 'Thresh', min:-60, max:0, step:1, initialValue: track.effects.compressor.threshold, decimals:0, displaySuffix:'dB', trackRef: track, onValueChange: track.setCompressorThreshold.bind(track)});
            winEl.querySelector(`#compThreshKnob-${track.id}`)?.appendChild(cThreshK.element); track.inspectorControls.compThresh = cThreshK;
            const cRatioK = createKnob({label: 'Ratio', min:1, max:20, step:1, initialValue: track.effects.compressor.ratio, decimals:0, trackRef: track, onValueChange: track.setCompressorRatio.bind(track)});
            winEl.querySelector(`#compRatioKnob-${track.id}`)?.appendChild(cRatioK.element); track.inspectorControls.compRatio = cRatioK;
            const cAttackK = createKnob({label: 'Attack', min:0.001, max:0.1, step:0.001, initialValue: track.effects.compressor.attack, decimals:3, displaySuffix:'s', trackRef: track, onValueChange: track.setCompressorAttack.bind(track)});
            winEl.querySelector(`#compAttackKnob-${track.id}`)?.appendChild(cAttackK.element); track.inspectorControls.compAttack = cAttackK;
            const cReleaseK = createKnob({label: 'Release', min:0.01, max:1, step:0.01, initialValue: track.effects.compressor.release, decimals:2, displaySuffix:'s', trackRef: track, onValueChange: track.setCompressorRelease.bind(track)});
            winEl.querySelector(`#compReleaseKnob-${track.id}`)?.appendChild(cReleaseK.element); track.inspectorControls.compRelease = cReleaseK;
            const cKneeK = createKnob({label: 'Knee', min:0, max:40, step:1, initialValue: track.effects.compressor.knee, decimals:0, displaySuffix:'dB', trackRef: track, onValueChange: track.setCompressorKnee.bind(track)});
            winEl.querySelector(`#compKneeKnob-${track.id}`)?.appendChild(cKneeK.element); track.inspectorControls.compKnee = cKneeK;
            
            const dWetK = createKnob({label: 'Wet', min:0, max:1, step:0.01, initialValue: track.effects.delay.wet, decimals:2, trackRef: track, onValueChange: track.setDelayWet.bind(track)});
            winEl.querySelector(`#delayWetKnob-${track.id}`)?.appendChild(dWetK.element); track.inspectorControls.delayWet = dWetK;
            const dTimeK = createKnob({label: 'Time', min:0, max:1, step:0.01, initialValue: track.effects.delay.time, decimals:2, displaySuffix:'s', trackRef: track, onValueChange: track.setDelayTime.bind(track)});
            winEl.querySelector(`#delayTimeKnob-${track.id}`)?.appendChild(dTimeK.element); track.inspectorControls.delayTime = dTimeK;
            const dFbK = createKnob({label: 'Feedback', min:0, max:0.99, step:0.01, initialValue: track.effects.delay.feedback, decimals:2, trackRef: track, onValueChange: track.setDelayFeedback.bind(track)});
            winEl.querySelector(`#delayFeedbackKnob-${track.id}`)?.appendChild(dFbK.element); track.inspectorControls.delayFeedback = dFbK;

            const rWetK = createKnob({label: 'Wet', min:0, max:1, step:0.01, initialValue: track.effects.reverb.wet, decimals:2, trackRef: track, onValueChange: track.setReverbWet.bind(track)});
            winEl.querySelector(`#reverbWetKnob-${track.id}`)?.appendChild(rWetK.element); track.inspectorControls.reverbWet = rWetK;
            const rDecayK = createKnob({label: 'Decay', min:0.1, max:10, step:0.1, initialValue: track.effects.reverb.decay, decimals:1, displaySuffix:'s', trackRef: track, onValueChange: (val) => {track.effects.reverb.decay = val; track.reverbNode.decay = val;}});
            winEl.querySelector(`#reverbDecayKnob-${track.id}`)?.appendChild(rDecayK.element); track.inspectorControls.reverbDecay = rDecayK;
            const rPreDelK = createKnob({label: 'PreDelay', min:0, max:0.1, step:0.001, initialValue: track.effects.reverb.preDelay, decimals:3, displaySuffix:'s', trackRef: track, onValueChange: (val) => {track.effects.reverb.preDelay = val; track.reverbNode.preDelay = val;}});
            winEl.querySelector(`#reverbPreDelayKnob-${track.id}`)?.appendChild(rPreDelK.element); track.inspectorControls.reverbPreDelay = rPreDelK;
            return effectsWin;
        }

        // Opens or focuses the Mixer window
        function openMixerWindow(savedState = null) {
            const windowId = 'mixer';
            // If window exists and not restoring from save, just restore/focus it
            if (openWindows[windowId] && !savedState) { openWindows[windowId].restore(); return openWindows[windowId]; }
            const contentDiv = document.createElement('div'); 
            contentDiv.className = 'mixer-window-content'; 

            // Window options, applying saved state if provided
            const winOptions = { 
                width: Math.max(500, Math.min(800, window.innerWidth - 60)), height: 350,
                initialContentKey: 'mixer' 
            };
             if (savedState) {
                Object.assign(winOptions, {
                    x: parseFloat(savedState.left), y: parseFloat(savedState.top),
                    width: parseFloat(savedState.width), height: parseFloat(savedState.height),
                    zIndex: savedState.zIndex, isMinimized: savedState.isMinimized
                });
            }

            const mixerWin = createWindow(windowId, 'Mixer', contentDiv.outerHTML, winOptions);
            if (!mixerWin || !mixerWin.element) { 
                showNotification("Failed to create Mixer window.", 5000); 
                return null; 
            }
            const mixerContentArea = mixerWin.element.querySelector('.mixer-window-content');
            if (mixerContentArea) { renderMixer(mixerContentArea); } // Render mixer content
            return mixerWin;
        }

        // Renders the content of the Mixer window (channel strips for each track)
        function renderMixer(container) { 
            if (!container) { console.error("Mixer container not found for rendering."); return; }
            container.innerHTML = ''; // Clear existing content
            
            // Create a channel strip for each track
            tracks.forEach(track => {
                const strip = document.createElement('div'); 
                strip.className = 'channel-strip';
                // Track name (clickable to open inspector)
                const trackNameDiv = document.createElement('div');
                trackNameDiv.className = 'track-name';
                trackNameDiv.title = track.name;
                trackNameDiv.textContent = track.name.substring(0,8) + (track.name.length > 8 ? '...' : ''); // Truncate name
                trackNameDiv.onclick = () => openTrackInspectorWindow(track.id); 
                strip.appendChild(trackNameDiv);

                // Volume knob container
                const faderContainer = document.createElement('div');
                faderContainer.className = 'fader-container'; 
                faderContainer.id = `mixerVolumeSliderContainer-${track.id}`; 
                strip.appendChild(faderContainer);
                
                // Mute and Solo buttons
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'mixer-buttons flex gap-1 mb-1';
                buttonsDiv.innerHTML = ` 
                        <button id="mixerMuteBtn-${track.id}" class="mute-button text-xs p-0.5 ${track.isMuted ? 'muted' : ''}">M</button> 
                        <button id="mixerSoloBtn-${track.id}" class="solo-button text-xs p-0.5 ${track.isSoloed ? 'soloed' : ''}">S</button> 
                    `;
                strip.appendChild(buttonsDiv);

                // Track meter
                const meterDiv = document.createElement('div');
                meterDiv.id = `mixerTrackMeterContainer-${track.id}`;
                meterDiv.className = 'mixer-meter-container h-3';
                meterDiv.innerHTML = `<div id="mixerTrackMeterBar-${track.id}" class="meter-bar"></div>`;
                strip.appendChild(meterDiv);

                container.appendChild(strip);

                // Create and attach volume knob for the track
                const volKnobContainer = strip.querySelector(`#mixerVolumeSliderContainer-${track.id}`);
                if(volKnobContainer) {
                    const volKnob = createKnob({ 
                        label: '', // No label for mixer knobs
                        min:0, max:1, step:0.01, initialValue: track.previousVolumeBeforeMute, decimals:2, sensitivity: 0.8,
                        trackRef: track, 
                        onValueChange: (val, oldVal, fromInteraction) => { 
                            track.setVolume(val, fromInteraction); 
                            // Sync with inspector volume knob if it exists
                            if (track.inspectorControls?.volume?.type === 'knob') { 
                                track.inspectorControls.volume.setValue(val, false); 
                            }
                        }
                    });
                    volKnobContainer.innerHTML = ''; // Clear placeholder
                    volKnobContainer.appendChild(volKnob.element);
                    track.inspectorControls[`mixerVolume-${track.id}`] = volKnob; // Store reference
                }
                // Add event listeners for mute/solo buttons
                strip.querySelector(`#mixerMuteBtn-${track.id}`)?.addEventListener('click', () => handleTrackMute(track.id));
                strip.querySelector(`#mixerSoloBtn-${track.id}`)?.addEventListener('click', () => handleTrackSolo(track.id));
            });
            
            // Create Master channel strip
            const masterStrip = document.createElement('div'); 
            masterStrip.className = 'channel-strip bg-gray-400'; // Slightly different background for master
            masterStrip.innerHTML = `<div class="track-name">Master</div>
                                     <div class="fader-container" id="mixerMasterVolumeSliderContainer"></div> 
                                     <div id="mixerMasterMeterContainer" class="mixer-meter-container h-3 mt-auto">
                                        <div id="mixerMasterMeterBar" class="meter-bar"></div>
                                     </div>`;
            container.appendChild(masterStrip);
            
            // Create and attach Master volume knob
            const masterVolSliderCont = masterStrip.querySelector('#mixerMasterVolumeSliderContainer');
            if(masterVolSliderCont){
                const masterVolKnob = createKnob({ 
                    label: '', min:-60, max:6, step:1, initialValue: Tone.getDestination().volume.value, 
                    displaySuffix: 'dB', decimals:0, sensitivity: 0.3,
                    onValueChange: (val, oldVal, fromInteraction) => { 
                        Tone.getDestination().volume.value = val; // Control master output volume
                    }
                });
                masterVolSliderCont.innerHTML = ''; 
                masterVolSliderCont.appendChild(masterVolKnob.element);
            }
            // Refresh knob visuals after a short delay
            setTimeout(() => {
                tracks.forEach(track => {
                    track.inspectorControls[`mixerVolume-${track.id}`]?.refreshVisuals?.();
                });
            }, 0);
        }

        // Updates the Mixer window content (e.g., after adding/removing tracks)
        function updateMixerWindow() { 
            const mixerWin = openWindows['mixer'];
            if (mixerWin && mixerWin.element && !mixerWin.isMinimized) {
                const mixerContentArea = mixerWin.element.querySelector('.mixer-window-content');
                if (mixerContentArea) { renderMixer(mixerContentArea); }
            }
        }

        // Initializes Web MIDI API access
        async function setupMIDI() { 
            if (navigator.requestMIDIAccess) {
                try {
                    midiAccess = await navigator.requestMIDIAccess();
                    populateMIDIInputs(); // Populate dropdown with available inputs
                    midiAccess.onstatechange = populateMIDIInputs; // Repopulate if MIDI devices change
                    showNotification("MIDI ready.", 2000);
                } catch (e) { 
                    console.error("Could not access MIDI devices.", e); 
                    let errorMsg = "Could not access MIDI devices.";
                    if (e && e.message) errorMsg += ` Reason: ${e.message}`;
                    else if (e && e.name) errorMsg += ` Reason: ${e.name}`; 
                    errorMsg += " Please ensure your browser has permission to access MIDI devices and that MIDI devices are connected properly."
                    showNotification(errorMsg, 6000); 
                }
            } else { 
                showNotification("Web MIDI API not supported in this browser.", 3000); 
            }
        }

        // Populates the MIDI input select dropdown in Global Controls
        function populateMIDIInputs() {
            if (!midiAccess || !midiInputSelectGlobal) return; 
            
            const currentVal = midiInputSelectGlobal.value; // Store current selection
            midiInputSelectGlobal.innerHTML = '<option value="">No MIDI Input</option>'; // Clear existing options
            const inputs = midiAccess.inputs.values();
            for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
                const option = document.createElement('option'); 
                option.value = input.value.id; 
                option.textContent = input.value.name;
                midiInputSelectGlobal.appendChild(option);
            }
            // Restore previous selection if still available, or select first input
            if (currentVal && Array.from(midiInputSelectGlobal.options).some(opt => opt.value === currentVal)) { 
                midiInputSelectGlobal.value = currentVal; 
            } else if (midiAccess.inputs.size > 0) { 
                midiInputSelectGlobal.value = midiAccess.inputs.values().next().value.id; 
            }
            // Ensure onchange handler is set
            if (!midiInputSelectGlobal.onchange) { 
                 midiInputSelectGlobal.onchange = () => {
                    const oldMidiName = activeMIDIInput ? activeMIDIInput.name : "No MIDI Input";
                    const newMidiId = midiInputSelectGlobal.value;
                    const newMidiDevice = midiAccess && newMidiId ? midiAccess.inputs.get(newMidiId) : null;
                    const newMidiName = newMidiDevice ? newMidiDevice.name : "No MIDI Input";

                    if (oldMidiName !== newMidiName) { // Capture undo if input changed
                         captureStateForUndo(`Change MIDI Input to ${newMidiName}`);
                    }
                    selectMIDIInput(); // Apply selection
                };
            }
            selectMIDIInput(true); // Apply initial selection (skip undo during setup)
        }

        // Selects and configures the active MIDI input device
        function selectMIDIInput(skipUndoCapture = false) { 
            // Remove message handler from previously active input
            if (activeMIDIInput && activeMIDIInput.onmidimessage) { 
                activeMIDIInput.onmidimessage = null; 
            }
            const oldActiveInputName = activeMIDIInput ? activeMIDIInput.name : "No MIDI Input";
            activeMIDIInput = null; 
            
            const selectedId = midiInputSelectGlobal ? midiInputSelectGlobal.value : null;
            let newActiveInputName = "No MIDI Input";

            if (midiAccess && selectedId) {
                const inputDevice = midiAccess.inputs.get(selectedId);
                if (inputDevice) {
                    activeMIDIInput = inputDevice; 
                    activeMIDIInput.onmidimessage = handleMIDIMessage; // Set new message handler
                    newActiveInputName = activeMIDIInput.name;
                    if (!skipUndoCapture) { 
                        showNotification(`MIDI Input: ${activeMIDIInput.name} selected.`, 2000);
                    }
                }
            }
            // Update MIDI indicator light
            if(midiIndicatorGlobalEl) midiIndicatorGlobalEl.classList.toggle('active', !!activeMIDIInput);
        }

        // Handles incoming MIDI messages
        function handleMIDIMessage(message) {
            const [command, note, velocity] = message.data; // MIDI data bytes
            const time = Tone.now(); // Precise time for Tone.js events
            const normVel = velocity / 127; // Normalize velocity (0-1)
            
            // Flash MIDI indicator light
            if (midiIndicatorGlobalEl) { 
                midiIndicatorGlobalEl.classList.add('active'); 
                setTimeout(() => midiIndicatorGlobalEl.classList.remove('active'), 100); 
            }
            
            // --- MIDI Recording Logic ---
            if (isRecording && armedTrackId === recordingTrackId && command === 144 && velocity > 0) { // Note On event
                const track = tracks.find(t => t.id === recordingTrackId);
                if (track) {
                    // Calculate current step in sequencer based on transport time
                    const currentTimeInSeconds = Tone.Transport.seconds;
                    const sixteenthNoteDuration = Tone.Time("16n").toSeconds();
                    let currentStep = Math.round(currentTimeInSeconds / sixteenthNoteDuration);
                    currentStep = (currentStep % track.sequenceLength + track.sequenceLength) % track.sequenceLength; // Wrap around sequence length

                    // Determine row index in sequencer grid based on track type and note
                    let rowIndex = -1;
                    if (track.type === 'Synth' || track.type === 'InstrumentSampler') {
                        const pitchName = Tone.Frequency(note, "midi").toNote();
                        rowIndex = synthPitches.indexOf(pitchName);
                    } else if (track.type === 'Sampler') {
                        rowIndex = note - samplerMIDINoteStart; // Map MIDI note to slice index
                        if (rowIndex < 0 || rowIndex >= track.slices.length) rowIndex = -1; // Validate index
                    } else if (track.type === 'DrumSampler') {
                        rowIndex = note - samplerMIDINoteStart; // Map MIDI note to pad index
                        if (rowIndex < 0 || rowIndex >= numDrumSamplerPads) rowIndex = -1; // Validate index
                    }

                    // If valid row and step, record the note in sequence data
                    if (rowIndex !== -1 && currentStep >= 0 && currentStep < track.sequenceLength) {
                        if (!track.sequenceData[rowIndex]) track.sequenceData[rowIndex] = Array(track.sequenceLength).fill(null);
                        track.sequenceData[rowIndex][currentStep] = { active: true, velocity: normVel };
                        
                        // Update sequencer UI if open and active
                        if (track.sequencerWindow && !track.sequencerWindow.isMinimized && activeSequencerTrackId === track.id) {
                            const cell = track.sequencerWindow.element.querySelector(`.sequencer-step-cell[data-row="${rowIndex}"][data-col="${currentStep}"]`);
                            if (cell) {
                                let activeClass = '';
                                if (track.type === 'Synth') activeClass = 'active-synth';
                                else if (track.type === 'Sampler') activeClass = 'active-sampler';
                                else if (track.type === 'DrumSampler') activeClass = 'active-drum-sampler';
                                else if (track.type === 'InstrumentSampler') activeClass = 'active-instrument-sampler';
                                
                                cell.classList.remove('active-synth', 'active-sampler', 'active-drum-sampler', 'active-instrument-sampler');
                                if (activeClass) cell.classList.add(activeClass);
                            }
                        }
                    }
                }
            }

            // --- Live MIDI Input (Playback) Logic ---
            if (!armedTrackId) return; // Only process if a track is armed
            const currentArmedTrack = tracks.find(t => t.id === armedTrackId); 
            if (!currentArmedTrack) return;
            
            if (command === 144 && velocity > 0) { // Note On event
                if (currentArmedTrack.type === 'Synth' && currentArmedTrack.instrument) { 
                    currentArmedTrack.instrument.triggerAttack(Tone.Frequency(note, "midi").toNote(), time, normVel); 
                } else if (currentArmedTrack.type === 'Sampler') { 
                    const sliceIdx = note - samplerMIDINoteStart; // Map MIDI note to slice index
                    if (sliceIdx >= 0 && sliceIdx < currentArmedTrack.slices.length) {
                        playSlicePreview(currentArmedTrack.id, sliceIdx, normVel); // Play slice
                    }
                } else if (currentArmedTrack.type === 'DrumSampler') {  
                    const padIndex = note - samplerMIDINoteStart; // Map MIDI note to pad index
                    if (padIndex >= 0 && padIndex < numDrumSamplerPads) {
                        playDrumSamplerPadPreview(currentArmedTrack.id, padIndex, normVel); // Play drum pad
                    }
                } else if (currentArmedTrack.type === 'InstrumentSampler' && currentArmedTrack.toneSampler && currentArmedTrack.toneSampler.loaded) { 
                    // Handle polyphony for Instrument Sampler
                    if (!currentArmedTrack.instrumentSamplerIsPolyphonic) {
                        currentArmedTrack.toneSampler.releaseAll(time); // Release previous notes in mono mode
                    }
                    const shiftedNote = Tone.Frequency(note, "midi").toNote(); 
                    currentArmedTrack.toneSampler.triggerAttack(shiftedNote, time, normVel); 
                }
            } else if (command === 128 || (command === 144 && velocity === 0)) { // Note Off event
                if (currentArmedTrack.type === 'Synth' && currentArmedTrack.instrument) { 
                    currentArmedTrack.instrument.triggerRelease(Tone.Frequency(note, "midi").toNote(), time + 0.05); // Slight delay for release
                } else if (currentArmedTrack.type === 'InstrumentSampler' && currentArmedTrack.toneSampler && currentArmedTrack.toneSampler.loaded) { 
                     // Only release if polyphonic, mono mode handles release on next note on
                     if (currentArmedTrack.instrumentSamplerIsPolyphonic) {
                        const shiftedNote = Tone.Frequency(note, "midi").toNote(); 
                        currentArmedTrack.toneSampler.triggerRelease(shiftedNote, time + 0.05); 
                     }
                }
            }
        }

        // Handles computer keyboard input for playing notes
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
            if (e.repeat || currentlyPressedComputerKeys[e.code]) return; // Prevent key repeat
            
            currentlyPressedComputerKeys[e.code] = true; // Mark key as pressed
            if(keyboardIndicatorGlobalEl) keyboardIndicatorGlobalEl.classList.add('active'); // Flash indicator
            
            const time = Tone.now();
            const computerKeyNote = computerKeySynthMap[e.code] || computerKeySamplerMap[e.code]; // Get MIDI note from map
            const computerKeyVelocity = defaultVelocity;

            // --- Computer Keyboard Recording Logic (similar to MIDI recording) ---
            if (isRecording && armedTrackId === recordingTrackId && computerKeyNote !== undefined) {
                const track = tracks.find(t => t.id === recordingTrackId);
                if (track) {
                    const currentTimeInSeconds = Tone.Transport.seconds;
                    const sixteenthNoteDuration = Tone.Time("16n").toSeconds();
                    let currentStep = Math.round(currentTimeInSeconds / sixteenthNoteDuration);
                    currentStep = (currentStep % track.sequenceLength + track.sequenceLength) % track.sequenceLength;

                    let rowIndex = -1;
                    if ((track.type === 'Synth' || track.type === 'InstrumentSampler') && computerKeySynthMap[e.code]) {
                        const pitchName = Tone.Frequency(computerKeySynthMap[e.code], "midi").toNote();
                        rowIndex = synthPitches.indexOf(pitchName);
                    } else if ((track.type === 'Sampler' || track.type === 'DrumSampler') && computerKeySamplerMap[e.code]) {
                        const mappedNote = computerKeySamplerMap[e.code];
                        if (track.type === 'Sampler') {
                             rowIndex = mappedNote - samplerMIDINoteStart;
                             if (rowIndex < 0 || rowIndex >= track.slices.length) rowIndex = -1;
                        } else { 
                             rowIndex = mappedNote - samplerMIDINoteStart;
                             if (rowIndex < 0 || rowIndex >= numDrumSamplerPads) rowIndex = -1;
                        }
                    }

                    if (rowIndex !== -1 && currentStep >= 0 && currentStep < track.sequenceLength) {
                        if (!track.sequenceData[rowIndex]) track.sequenceData[rowIndex] = Array(track.sequenceLength).fill(null);
                        track.sequenceData[rowIndex][currentStep] = { active: true, velocity: computerKeyVelocity };
                        
                        if (track.sequencerWindow && !track.sequencerWindow.isMinimized && activeSequencerTrackId === track.id) {
                            const cell = track.sequencerWindow.element.querySelector(`.sequencer-step-cell[data-row="${rowIndex}"][data-col="${currentStep}"]`);
                            if (cell) {
                                let activeClass = '';
                                if (track.type === 'Synth') activeClass = 'active-synth';
                                else if (track.type === 'Sampler') activeClass = 'active-sampler';
                                else if (track.type === 'DrumSampler') activeClass = 'active-drum-sampler';
                                else if (track.type === 'InstrumentSampler') activeClass = 'active-instrument-sampler';
                                cell.classList.remove('active-synth', 'active-sampler', 'active-drum-sampler', 'active-instrument-sampler');
                                if (activeClass) cell.classList.add(activeClass);
                            }
                        }
                    }
                }
            }

            // --- Live Computer Keyboard Input (Playback) Logic ---
            if (!armedTrackId) return; 
            const currentArmedTrack = tracks.find(t => t.id === armedTrackId); 
            if (!currentArmedTrack) return;
            
            if (currentArmedTrack.type === 'Synth' && computerKeySynthMap[e.code] && currentArmedTrack.instrument) { 
                currentArmedTrack.instrument.triggerAttack(Tone.Frequency(computerKeySynthMap[e.code], "midi").toNote(), time, computerKeyVelocity); 
            } else if (currentArmedTrack.type === 'Sampler' && computerKeySamplerMap[e.code] !== undefined) { 
                const sliceIdx = computerKeySamplerMap[e.code] - samplerMIDINoteStart; 
                if (sliceIdx >=0 && sliceIdx < currentArmedTrack.slices.length) playSlicePreview(currentArmedTrack.id, sliceIdx, computerKeyVelocity); 
            } else if (currentArmedTrack.type === 'DrumSampler' && computerKeySamplerMap[e.code] !== undefined) { 
                const padIndex = computerKeySamplerMap[e.code] - samplerMIDINoteStart; 
                if (padIndex >=0 && padIndex < numDrumSamplerPads) playDrumSamplerPadPreview(currentArmedTrack.id, padIndex, computerKeyVelocity); 
            } else if (currentArmedTrack.type === 'InstrumentSampler' && computerKeySynthMap[e.code] && currentArmedTrack.toneSampler && currentArmedTrack.toneSampler.loaded) { 
                if (!currentArmedTrack.instrumentSamplerIsPolyphonic) {
                    currentArmedTrack.toneSampler.releaseAll(time); // Release previous in mono mode
                }
                const midiNote = computerKeySynthMap[e.code];
                const shiftedNote = Tone.Frequency(midiNote, "midi").toNote(); 
                currentArmedTrack.toneSampler.triggerAttack(shiftedNote, time, computerKeyVelocity); 
            }
        });

        // Handles computer keyboard key release
        document.addEventListener('keyup', (e) => { 
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
            const time = Tone.now();
            
            // Trigger note release for armed track if key was pressed
            if (armedTrackId && currentlyPressedComputerKeys[e.code]) {
                const track = tracks.find(t => t.id === armedTrackId);
                if (track) {
                    if (track.type === 'Synth' && computerKeySynthMap[e.code] && track.instrument) { 
                        track.instrument.triggerRelease(Tone.Frequency(computerKeySynthMap[e.code], "midi").toNote(), time + 0.05); 
                    } else if (track.type === 'InstrumentSampler' && computerKeySynthMap[e.code] && track.toneSampler && track.toneSampler.loaded) { 
                        if (track.instrumentSamplerIsPolyphonic) { // Only release if polyphonic
                            const midiNote = computerKeySynthMap[e.code];
                            const shiftedNote = Tone.Frequency(midiNote, "midi").toNote(); 
                            track.toneSampler.triggerRelease(shiftedNote, time + 0.05); 
                        }
                    }
                }
            }
            delete currentlyPressedComputerKeys[e.code]; // Mark key as released
            // Turn off keyboard indicator if no keys are pressed
            if(keyboardIndicatorGlobalEl && Object.keys(currentlyPressedComputerKeys).length === 0) {
                keyboardIndicatorGlobalEl.classList.remove('active');
            }
        });
        
        // Automatically slices a sample into a specified number of parts
        function autoSliceSample(trackId, numSlicesToCreate = numSlices) {
            const track = tracks.find(t => t.id === trackId);
            if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded) {
                showNotification("Cannot auto-slice: No audio loaded or track not a Sampler.", 3000);
                return;
            }
            const duration = track.audioBuffer.duration;
            track.slices = []; // Clear existing slices
            const sliceDuration = duration / numSlicesToCreate; // Calculate duration of each slice

            // Create new slice objects
            for (let i = 0; i < numSlicesToCreate; i++) {
                track.slices.push({
                    offset: i * sliceDuration,
                    duration: sliceDuration,
                    userDefined: false, // Mark as auto-generated
                    volume: 1.0, pitchShift: 0, loop: false, reverse: false, 
                    envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 } // Default envelope
                });
            }
            track.selectedSliceForEdit = 0; // Select first slice for editing
            track.setSequenceLength(track.sequenceLength, true); // Reinitialize sequencer (row count might change)
            renderSamplePads(track); // Update slicer pads UI
            updateSliceEditorUI(track); // Update slice editor UI
            drawWaveform(track); // Redraw waveform with new slice markers
            showNotification(`Sample auto-sliced into ${numSlicesToCreate} parts.`, 2000);
        }

        // Renders the slicer pads in the Sampler track inspector
        function renderSamplePads(track) { 
            if (!track || !track.inspectorWindow?.element) return;
            const padsContainer = track.inspectorWindow.element.querySelector(`#samplePadsContainer-${track.id}`);
            if (!padsContainer) return;
            padsContainer.innerHTML = ''; // Clear existing pads
            track.slices.forEach((slice, index) => {
                const pad = document.createElement('button');
                pad.className = `pad-button ${index === track.selectedSliceForEdit ? 'selected-for-edit' : ''}`; // Highlight selected pad
                pad.textContent = `Slice ${index + 1}`;
                pad.title = `Select Slice ${index + 1} for editing. Click to preview. Drag sound from browser to load.`;
                pad.dataset.trackId = track.id;
                pad.dataset.trackType = "Sampler";
                pad.dataset.padSliceIndex = index;

                // Click to select slice for editing and preview it
                pad.addEventListener('click', async () => { 
                    track.selectedSliceForEdit = index;
                    await playSlicePreview(track.id, index); 
                    renderSamplePads(track); // Re-render pads to update selection
                    updateSliceEditorUI(track); // Update editor controls
                });
                setupDropZoneListeners(pad, track.id, 'Sampler', index); // Allow dropping audio onto individual pads (currently reloads main sample)
                padsContainer.appendChild(pad);
            });
        }
        
        // Updates the UI controls in the slice editor (Sampler track inspector)
        function updateSliceEditorUI(track) { 
            if (!track || track.type !== 'Sampler' || !track.inspectorWindow?.element) return;
            const inspectorEl = track.inspectorWindow.element;
            const selectedSlice = track.slices[track.selectedSliceForEdit];
            if (!selectedSlice) return; 

            // Update slice label, start/end inputs
            inspectorEl.querySelector(`#selectedSliceLabel-${track.id}`).textContent = track.selectedSliceForEdit + 1;
            const startInput = inspectorEl.querySelector(`#sliceStart-${track.id}`);
            const endInput = inspectorEl.querySelector(`#sliceEnd-${track.id}`);
            if (startInput) startInput.value = selectedSlice.offset.toFixed(3);
            if (endInput) endInput.value = (selectedSlice.offset + selectedSlice.duration).toFixed(3);

            // Update knob values (volume, pitch, envelope)
            track.inspectorControls.sliceVolume?.setValue(selectedSlice.volume, false);
            track.inspectorControls.slicePitch?.setValue(selectedSlice.pitchShift, false);
            track.inspectorControls.sliceEnvAttack?.setValue(selectedSlice.envelope.attack, false);
            track.inspectorControls.sliceEnvDecay?.setValue(selectedSlice.envelope.decay, false);
            track.inspectorControls.sliceEnvSustain?.setValue(selectedSlice.envelope.sustain, false);
            track.inspectorControls.sliceEnvRelease?.setValue(selectedSlice.envelope.release, false);

            // Update loop and reverse toggle buttons
            const loopToggle = inspectorEl.querySelector(`#sliceLoopToggle-${track.id}`);
            if (loopToggle) { 
                loopToggle.textContent = selectedSlice.loop ? 'Loop: ON' : 'Loop: OFF'; 
                loopToggle.classList.toggle('active', selectedSlice.loop); 
            }
            const reverseToggle = inspectorEl.querySelector(`#sliceReverseToggle-${track.id}`);
            if (reverseToggle) { 
                reverseToggle.textContent = selectedSlice.reverse ? 'Rev: ON' : 'Rev: OFF'; 
                reverseToggle.classList.toggle('active', selectedSlice.reverse);
            }
        }

        // Applies edits made to slice start/end times in the Sampler inspector
        function applySliceEdits(trackId) { 
            const track = tracks.find(t => t.id === trackId);
            if (!track || track.type !== 'Sampler' || !track.inspectorWindow?.element) return;
            const inspectorEl = track.inspectorWindow.element;
            const slice = track.slices[track.selectedSliceForEdit];
            if (!slice) return;

            // Get new start/end values from input fields
            const newStart = parseFloat(inspectorEl.querySelector(`#sliceStart-${track.id}`)?.value);
            const newEnd = parseFloat(inspectorEl.querySelector(`#sliceEnd-${track.id}`)?.value);

            // Validate and apply changes
            if (!isNaN(newStart) && !isNaN(newEnd) && newEnd > newStart && track.audioBuffer) {
                slice.offset = Math.max(0, Math.min(newStart, track.audioBuffer.duration)); // Clamp within audio bounds
                slice.duration = Math.max(0.001, Math.min(newEnd - slice.offset, track.audioBuffer.duration - slice.offset)); // Ensure positive duration
                slice.userDefined = true; // Mark slice as manually edited
                drawWaveform(track); // Redraw waveform with updated slice markers
                showNotification(`Slice ${track.selectedSliceForEdit + 1} updated.`, 1500);
            } else {
                showNotification("Invalid slice start/end times.", 2000);
                updateSliceEditorUI(track); // Reset UI to current slice values if input was invalid
            }
        }

        // Draws the audio waveform on a canvas (used for Sampler and Instrument Sampler)
        function drawWaveform(track) {
            if (!track || (track.type !== 'Sampler' && track.type !== 'InstrumentSampler') || !track.audioBuffer || !track.audioBuffer.loaded) return;
            
            const ctx = track.type === 'Sampler' ? track.waveformCanvasCtx : track.instrumentWaveformCanvasCtx;
            if (!ctx) return;

            const canvas = ctx.canvas;
            const width = canvas.width;
            const height = canvas.height;
            const channelData = track.audioBuffer.getChannelData(0); // Use first channel for waveform

            // Clear and fill background
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#a0a0a0'; 
            ctx.fillRect(0, 0, width, height);

            // Draw waveform
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#333'; 
            ctx.beginPath();
            const sliceWidth = width / channelData.length; // Width of each sample point on canvas
            for (let i = 0; i < channelData.length; i++) {
                const x = i * sliceWidth;
                const y = (0.5 + channelData[i] * 0.5) * height; // Map sample value (-1 to 1) to canvas height
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();

            // Draw slice markers for Sampler tracks
            if (track.type === 'Sampler') {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; // Red for slice markers
                ctx.lineWidth = 1;
                track.slices.forEach((slice, index) => {
                    const startX = (slice.offset / track.audioBuffer.duration) * width; // Calculate X position of marker
                    ctx.beginPath();
                    ctx.moveTo(startX, 0);
                    ctx.lineTo(startX, height);
                    ctx.stroke();
                    // Highlight selected slice marker
                    if (index === track.selectedSliceForEdit) { 
                        ctx.strokeStyle = 'rgba(0, 0, 255, 0.9)'; // Blue for selected
                        ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.moveTo(startX,0); ctx.lineTo(startX,height); ctx.stroke();
                        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; ctx.lineWidth = 1; // Reset for next marker
                    }
                });
            }
            // Draw loop markers for Instrument Sampler tracks
            if (track.type === 'InstrumentSampler' && track.instrumentSamplerSettings.loop) {
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)'; // Green for loop markers
                ctx.lineWidth = 1;
                const loopStartX = (track.instrumentSamplerSettings.loopStart / track.audioBuffer.duration) * width;
                const loopEndX = (track.instrumentSamplerSettings.loopEnd / track.audioBuffer.duration) * width;
                ctx.beginPath(); ctx.moveTo(loopStartX, 0); ctx.lineTo(loopStartX, height); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(loopEndX, 0); ctx.lineTo(loopEndX, height); ctx.stroke();
            }
        }
        // Alias for Instrument Sampler waveform drawing
        function drawInstrumentWaveform(track) { drawWaveform(track); }


        // Plays a preview of a selected slice from a Sampler track
        async function playSlicePreview(trackId, sliceIndex, velocity = 0.7) { 
            await initAudioContextAndMasterMeter(); // Ensure audio context is running

            const track = tracks.find(t => t.id === trackId);
            if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded || !track.slices[sliceIndex]) return;
            const sliceData = track.slices[sliceIndex];
            if (sliceData.duration <= 0) return; // Don't play empty slices

            const time = Tone.now();
            const totalPitchShift = sliceData.pitchShift; 
            const playbackRate = Math.pow(2, totalPitchShift / 12); // Calculate playback rate
            let playDuration = sliceData.duration / playbackRate;
            if (sliceData.loop) playDuration = Math.min(playDuration, 2); // Limit loop preview duration

            if (!track.slicerIsPolyphonic) { // Monophonic playback
                if (!track.slicerMonoPlayer || track.slicerMonoPlayer.disposed) {
                    track.setupSlicerMonoNodes(); // Setup if needed
                    if(!track.slicerMonoPlayer) { 
                         console.warn("Mono player could not be set up for slicer preview"); return;
                    }
                }
                const player = track.slicerMonoPlayer;
                const env = track.slicerMonoEnvelope;
                const gain = track.slicerMonoGain;

                if (player.state === 'started') { player.stop(time);  } // Stop previous
                if (env.getValueAtTime(time) > 0.001) { env.triggerRelease(time); } // Release previous

                player.buffer = track.audioBuffer;
                env.set(sliceData.envelope);
                gain.gain.value = Tone.dbToGain(-6) * sliceData.volume * velocity; // Apply gains
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
                    env.triggerRelease(Math.max(time, releaseTime)); // Schedule release
                }

            } else { // Polyphonic playback (create temporary player)
                const tempPlayer = new Tone.Player(track.audioBuffer); 
                const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope); 
                const tempGain = new Tone.Gain(Tone.dbToGain(-6) * sliceData.volume * velocity);
                
                tempPlayer.chain(tempEnv, tempGain, track.distortionNode); // Connect to effects
                
                tempPlayer.playbackRate = playbackRate;
                tempPlayer.reverse = sliceData.reverse;
                tempPlayer.loop = sliceData.loop;
                tempPlayer.loopStart = sliceData.offset;
                tempPlayer.loopEnd = sliceData.offset + sliceData.duration;

                tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                tempEnv.triggerAttack(time);
                if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);

                // Schedule disposal of temporary nodes
                Tone.Transport.scheduleOnce(() => {
                    if (tempPlayer && !tempPlayer.disposed) { tempPlayer.stop(); tempPlayer.dispose(); }
                    if (tempEnv && !tempEnv.disposed) tempEnv.dispose();
                    if (tempGain && !tempGain.disposed) tempGain.dispose();
                }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.1); 
            }
        }

        // Renders the drum pads in the Drum Sampler track inspector
        function renderDrumSamplerPads(track) { 
            if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) return;
            const padsContainer = track.inspectorWindow.element.querySelector(`#drumSamplerPadsContainer-${track.id}`);
            if (!padsContainer) return;
            padsContainer.innerHTML = ''; // Clear existing pads
            track.drumSamplerPads.forEach((padData, index) => {
                const padEl = document.createElement('button');
                padEl.className = `pad-button ${index === track.selectedDrumPadForEdit ? 'selected-for-edit' : ''}`; // Highlight selected
                padEl.innerHTML = `Pad ${index + 1} <span class="pad-label block truncate" style="max-width: 50px;">${padData.originalFileName || 'Empty'}</span>`; // Display file name
                padEl.title = `Select Pad ${index + 1}. Click to preview. Drag sound from browser to load.`;
                padEl.dataset.trackId = track.id;
                padEl.dataset.trackType = "DrumSampler";
                padEl.dataset.padSliceIndex = index;

                // Click to select pad for editing and preview
                padEl.addEventListener('click', async () => { 
                    track.selectedDrumPadForEdit = index;
                    await playDrumSamplerPadPreview(track.id, index); 
                    renderDrumSamplerPads(track); // Re-render to update selection
                    updateDrumPadControlsUI(track); // Update editor controls
                });
                setupDropZoneListeners(padEl, track.id, 'DrumSampler', index); // Allow dropping audio onto pads
                padsContainer.appendChild(padEl);
            });
        }
        
        // Updates the UI controls for the selected drum pad in the Drum Sampler inspector
        function updateDrumPadControlsUI(track) {
            if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) return;
            const inspectorEl = track.inspectorWindow.element;
            const selectedPad = track.drumSamplerPads[track.selectedDrumPadForEdit];
            if (!selectedPad) return;

            // Update selected pad label and file load UI
            inspectorEl.querySelector(`#selectedDrumPadLabel-${track.id}`).textContent = track.selectedDrumPadForEdit + 1;
            const loadContainer = inspectorEl.querySelector(`#drumPadLoadContainer-${track.id}`);
            if (loadContainer) {
                const inputId = `drumPadFileInput-${track.id}-${track.selectedDrumPadForEdit}`;
                loadContainer.innerHTML = createDropZoneHTML(track.id, inputId, 'DrumSampler', track.selectedDrumPadForEdit) +
                                          `<span id="drumPadFileName-${track.id}" class="text-xs ml-2 block truncate" style="max-width: 150px;">${selectedPad.originalFileName || 'No file'}</span>`;
                
                const fileInputEl = loadContainer.querySelector(`#${inputId}`);
                if (fileInputEl) { // Add listener for file input
                    fileInputEl.addEventListener('change', (e) => {
                        captureStateForUndo(`Load sample to Drum Pad ${track.selectedDrumPadForEdit + 1} on ${track.name}`);
                        loadDrumSamplerPadFile(e, track.id, track.selectedDrumPadForEdit);
                    });
                }
                
                const dropZoneEl = loadContainer.querySelector(`#dropZone-${track.id}-drumsampler-${track.selectedDrumPadForEdit}`);
                if (dropZoneEl) setupDropZoneListeners(dropZoneEl, track.id, 'DrumSampler', track.selectedDrumPadForEdit); // Setup drop zone
            }
            // Update knob values for pad parameters
            track.inspectorControls.drumPadVolume?.setValue(selectedPad.volume, false);
            track.inspectorControls.drumPadPitch?.setValue(selectedPad.pitchShift, false);
            track.inspectorControls.drumPadEnvAttack?.setValue(selectedPad.envelope.attack, false);
            track.inspectorControls.drumPadEnvRelease?.setValue(selectedPad.envelope.release, false);
        }

        // Loads an audio file for a specific drum pad
        async function loadDrumSamplerPadFile(eventOrUrl, trackId, padIndex, fileNameForUrl = null) { 
            const track = tracks.find(t => t.id === trackId);
            if (!track || track.type !== 'DrumSampler') return;
        
            let file = null;
            let sourceName = '';
            let isUrlSource = typeof eventOrUrl === 'string'; // Check if source is URL or file event
        
            if (isUrlSource) {
                sourceName = fileNameForUrl || eventOrUrl.split('/').pop(); // Get file name from URL
            } else if (eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
                file = eventOrUrl.target.files[0]; // Get file from event
                sourceName = file.name;
            } else {
                showNotification("No file provided for drum pad.", 3000);
                return;
            }
        
            try {
                await initAudioContextAndMasterMeter(); // Ensure audio context is running
                const padData = track.drumSamplerPads[padIndex];
        
                // Helper to load buffer from URL or local file
                const loadBuffer = async (source) => {
                    if (isUrlSource) { // Load from URL
                        return await new Tone.Buffer().load(source);
                    } else { // Load from local file (via FileReader to get DataURL)
                        return new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = async (e) => {
                                try {
                                    const buffer = await new Tone.Buffer().load(e.target.result);
                                    padData.audioBufferDataURL = e.target.result; // Store DataURL for saving
                                    resolve(buffer);
                                } catch (err) {
                                    reject(err);
                                }
                            };
                            reader.onerror = (err) => reject(err);
                            reader.readAsDataURL(source);
                        });
                    }
                };
        
                const newAudioBuffer = await loadBuffer(isUrlSource ? eventOrUrl : file);
        
                // Dispose old buffer and player if they exist
                if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
                if (track.drumPadPlayers[padIndex] && !track.drumPadPlayers[padIndex].disposed) track.drumPadPlayers[padIndex].dispose();
        
                padData.audioBuffer = newAudioBuffer;
                // Store DataURL if loaded from a blob URL (e.g., from sound browser)
                if (isUrlSource && eventOrUrl.startsWith('blob:')) {
                    const response = await fetch(eventOrUrl);
                    const blob = await response.blob();
                    padData.audioBufferDataURL = await new Promise(resolve => {
                        const fr = new FileReader();
                        fr.onload = () => resolve(fr.result);
                        fr.readAsDataURL(blob);
                    });
                } else if (isUrlSource) { // For direct URLs (not blobs)
                    padData.audioBufferDataURL = eventOrUrl; 
                }
                padData.originalFileName = sourceName;
                // Create new Tone.Player for the pad
                track.drumPadPlayers[padIndex] = new Tone.Player(newAudioBuffer).connect(track.distortionNode);
        
                showNotification(`Sample "${sourceName}" loaded for Pad ${padIndex + 1} on track ${track.name}.`, 2000);
                updateDrumPadControlsUI(track); // Update UI
                renderDrumSamplerPads(track); // Re-render pads
        
            } catch (error) {
                console.error(`Error loading sample for drum pad ${padIndex}:`, error);
                showNotification(`Error loading sample "${sourceName}": ${error.message}`, 3000);
            }
        }


        // Plays a preview of a selected drum pad
        async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7) { 
            await initAudioContextAndMasterMeter(); // Ensure audio context is running
            
            const track = tracks.find(t => t.id === trackId);
            if (!track || track.type !== 'DrumSampler' || !track.drumPadPlayers[padIndex] || !track.drumPadPlayers[padIndex].loaded) return;
            
            const player = track.drumPadPlayers[padIndex];
            const padData = track.drumSamplerPads[padIndex];

            // Apply pad volume, velocity, and pitch shift
            player.volume.value = Tone.gainToDb(padData.volume * velocity);
            player.playbackRate = Math.pow(2, (padData.pitchShift) / 12); 
            player.start(Tone.now()); // Play immediately
        }


        // Loads a sample file for Sampler or Instrument Sampler tracks
        async function loadSampleFile(event, trackId, trackTypeHint) { 
            const track = tracks.find(t => t.id === trackId);
            if (!track || (trackTypeHint !== 'Sampler' && trackTypeHint !== 'InstrumentSampler')) {
                showNotification("Invalid track or track type for sample loading.", 3000);
                return;
            }
            
            let file;
            let sourceName;
            let isUrlSource = typeof event === 'string'; // Check if source is URL or file event

            if (isUrlSource) {
                sourceName = event.split('/').pop().split('?')[0]; // Get file name from URL
            } else if (event.target && event.target.files && event.target.files.length > 0) { 
                file = event.target.files[0]; // Get file from event
                sourceName = file.name;
            } else {
                showNotification("No file or URL provided for sample.", 3000);
                return;
            }


            try {
                await initAudioContextAndMasterMeter(); // Ensure audio context is running

                // Dispose existing audio resources for the track
                if (track.audioBuffer && !track.audioBuffer.disposed) track.audioBuffer.dispose(); 
                if (track.instrumentSamplerSettings?.audioBuffer && !track.instrumentSamplerSettings.audioBuffer.disposed) { 
                    track.instrumentSamplerSettings.audioBuffer.dispose();
                }
                if (track.toneSampler && !track.toneSampler.disposed) track.toneSampler.dispose(); 
                if (track.type === 'Sampler') track.disposeSlicerMonoNodes(); // Dispose slicer mono nodes if applicable

                // Helper to load buffer and get DataURL
                const loadAndProcessBuffer = async (source) => {
                    // Get DataURL from URL or local file
                    const base64DataURL = await new Promise((resolve, reject) => {
                        if (isUrlSource) { // Fetch blob from URL, then read as DataURL
                            fetch(source) 
                                .then(response => response.blob())
                                .then(blob => { 
                                    const reader = new FileReader();
                                    reader.onloadend = () => resolve(reader.result);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(blob);
                                })
                                .catch(reject);
                        } else { // Read local file as DataURL
                            const reader = new FileReader();
                            reader.onload = (e) => resolve(e.target.result); 
                            reader.onerror = reject;
                            reader.readAsDataURL(source);
                        }
                    });

                    const newBuffer = await new Tone.Buffer().load(base64DataURL); // Load buffer from DataURL
                    
                    // Process buffer based on track type
                    if (trackTypeHint === 'Sampler') { 
                        track.audioBufferDataURL = base64DataURL; // Store DataURL
                        track.audioBuffer = newBuffer;
                        track.originalFileName = sourceName;
                        if (!track.slicerIsPolyphonic && track.audioBuffer?.loaded) { 
                            track.setupSlicerMonoNodes(); // Setup mono nodes if needed
                        }
                        autoSliceSample(track.id, numSlices); // Auto-slice the new sample
                        // Update drop zone text in inspector
                        if (track.inspectorWindow?.element) { 
                            const dropZone = track.inspectorWindow.element.querySelector(`#dropZone-${track.id}-sampler`);
                            if (dropZone) dropZone.innerHTML = `Loaded: ${sourceName}.<br>Drag/Click to replace.`;
                        }
                    } else if (trackTypeHint === 'InstrumentSampler') {
                        track.instrumentSamplerSettings.audioBufferDataURL = base64DataURL; // Store DataURL
                        track.instrumentSamplerSettings.audioBuffer = newBuffer;
                        track.instrumentSamplerSettings.originalFileName = sourceName;
                        // Reset loop points to full sample duration
                        track.instrumentSamplerSettings.loopStart = 0; 
                        track.instrumentSamplerSettings.loopEnd = newBuffer.duration;
                        track.setupToneSampler(); // Re-setup Tone.Sampler with new buffer
                        drawInstrumentWaveform(track); // Redraw waveform
                         // Update drop zone and loop point inputs in inspector
                         if (track.inspectorWindow?.element) { 
                            const dropZone = track.inspectorWindow.element.querySelector(`#dropZone-${track.id}-instrumentsampler`);
                            if (dropZone) dropZone.innerHTML = `Loaded: ${sourceName}.<br>Drag/Click to replace.`;
                            const loopStartInput = track.inspectorWindow.element.querySelector(`#instrumentLoopStart-${track.id}`);
                            const loopEndInput = track.inspectorWindow.element.querySelector(`#instrumentLoopEnd-${track.id}`);
                            if(loopStartInput) loopStartInput.value = track.instrumentSamplerSettings.loopStart.toFixed(3);
                            if(loopEndInput) loopEndInput.value = track.instrumentSamplerSettings.loopEnd.toFixed(3);
                        }
                    }
                    showNotification(`Sample "${sourceName}" loaded for ${track.name}.`, 2000);
                };
                
                await loadAndProcessBuffer(isUrlSource ? event : file); // Call helper


            } catch (error) {
                console.error("Error loading sample:", error);
                showNotification(`Error loading sample: ${error.message}`, 3000);
            }
        }


        // --- Track Management ---
        // Adds a new track of a specified type
        function addTrack(type, initialData = null) {
            // Capture undo state for new track creation (unless loading from project)
            if (initialData === null) { 
                captureStateForUndo(`Add ${type} Track`);
            } else if (initialData && initialData._isUserActionPlaceholder) { // Special placeholder for user-initiated add
                 captureStateForUndo(`Add ${type} Track`);
                 initialData = null; // Don't pass placeholder to Track constructor
            }


            trackIdCounter++; // Increment global track ID counter
            const newTrack = new Track(trackIdCounter, type, initialData); // Create new Track instance
            tracks.push(newTrack);
            
            // If not loading from project, show notification and open inspector
            if (initialData === null) { 
                showNotification(`${type} Track "${newTrack.name}" added.`, 2000);
                openTrackInspectorWindow(newTrack.id); 
                updateMixerWindow(); // Update mixer to include new track
            }
            return newTrack;
        }

        // Toggles mute state for a track
        function handleTrackMute(trackId) {
            const track = tracks.find(t => t.id === trackId);
            if (!track) return;
            captureStateForUndo(`${track.isMuted ? "Unmute" : "Mute"} Track "${track.name}"`);
            track.isMuted = !track.isMuted;
            track.applyMuteState(); // Apply gain change in Tone.js

            // Update mute button visuals in inspector and mixer
            const inspectorMuteBtn = track.inspectorWindow?.element?.querySelector(`#muteBtn-${track.id}`);
            if (inspectorMuteBtn) inspectorMuteBtn.classList.toggle('muted', track.isMuted);
            const mixerMuteBtn = openWindows['mixer']?.element?.querySelector(`#mixerMuteBtn-${track.id}`);
            if (mixerMuteBtn) mixerMuteBtn.classList.toggle('muted', track.isMuted);
        }

        // Toggles solo state for a track
        function handleTrackSolo(trackId) {
            const track = tracks.find(t => t.id === trackId);
            if (!track) return;

            captureStateForUndo(`${soloedTrackId === track.id ? "Unsolo" : "Solo"} Track "${track.name}"`);

            if (soloedTrackId === track.id) { // If this track was already soloed, unsolo it
                soloedTrackId = null;
                track.isSoloed = false;
            } else { // Otherwise, solo this track
                if (soloedTrackId) { // If another track was soloed, unsolo it first
                    const prevSoloTrack = tracks.find(t => t.id === soloedTrackId);
                    if (prevSoloTrack) prevSoloTrack.isSoloed = false;
                }
                soloedTrackId = track.id;
                track.isSoloed = true;
            }

            // Apply solo state changes to all tracks and update UI buttons
            tracks.forEach(t => {
                t.applySoloState();
                const inspectorSoloBtn = t.inspectorWindow?.element?.querySelector(`#soloBtn-${t.id}`);
                if (inspectorSoloBtn) inspectorSoloBtn.classList.toggle('soloed', t.isSoloed);
                const mixerSoloBtn = openWindows['mixer']?.element?.querySelector(`#mixerSoloBtn-${t.id}`); 
                if (mixerSoloBtn) mixerSoloBtn.classList.toggle('soloed', t.isSoloed);
            });
        }
        
        // Toggles arm state for a track (for MIDI/keyboard input)
        function handleTrackArm(trackId) {
            const track = tracks.find(t => t.id === trackId);
            if (!track) return;

            captureStateForUndo(`${armedTrackId === track.id ? "Disarm" : "Arm"} Track "${track.name}" for Input`);

            if (armedTrackId === track.id) { // If this track was armed, disarm it
                armedTrackId = null;
            } else { // Otherwise, arm this track (disarming any other previously armed track)
                armedTrackId = track.id;
            }

            // Update arm button visuals in all track inspectors
            tracks.forEach(t => {
                const inspectorArmBtn = t.inspectorWindow?.element?.querySelector(`#armInputBtn-${t.id}`);
                if (inspectorArmBtn) inspectorArmBtn.classList.toggle('armed', armedTrackId === t.id);
            });
            showNotification(armedTrackId ? `${track.name} armed for input.` : "Input disarmed.", 1500);
        }

        // Removes a track from the project
        function removeTrack(trackId) {
            const trackIndex = tracks.findIndex(t => t.id === trackId);
            if (trackIndex === -1) return;
            const track = tracks[trackIndex];

            // Show confirmation dialog before deleting
            showConfirmationDialog(
                'Confirm Delete Track',
                `Are you sure you want to remove track "${track.name}"? This specific action cannot be undone by the application's undo/redo after this point, but the project state before deletion can be restored.`,
                () => { 
                    captureStateForUndo(`Remove Track "${track.name}"`); // Capture state before actual removal
                    
                    track.dispose(); // Dispose of track resources (Tone.js nodes, windows)
                    tracks.splice(trackIndex, 1); // Remove track from array
                    
                    // Update global states if removed track was armed or soloed
                    if (armedTrackId === trackId) armedTrackId = null;
                    if (soloedTrackId === trackId) { 
                        soloedTrackId = null;
                        tracks.forEach(t => { t.isSoloed = false; t.applySoloState(); }); // Unsolo all
                    }
                    if (activeSequencerTrackId === trackId) activeSequencerTrackId = null; // Clear active sequencer

                    showNotification(`Track "${track.name}" removed.`, 2000);
                    updateMixerWindow(); // Update mixer display
                }
            );
        }
        
        // Gathers all project data into a serializable object for saving or undo/redo
        function gatherProjectData() {
            const projectData = {
                version: "5.5.1", // Current application version
                globalSettings: {
                    tempo: Tone.Transport.bpm.value,
                    masterVolume: Tone.getDestination().volume.value,
                    activeMIDIInputId: activeMIDIInput ? activeMIDIInput.id : null, 
                    soloedTrackId: soloedTrackId, 
                    armedTrackId: armedTrackId,   
                    highestZIndex: highestZIndex,
                },
                tracks: tracks.map(track => { // Serialize each track
                    const trackData = {
                        id: track.id,
                        type: track.type,
                        name: track.name,
                        isMuted: track.isMuted,
                        volume: track.previousVolumeBeforeMute,
                        effects: track.effects, 
                        sequenceLength: track.sequenceLength, 
                        sequenceData: track.sequenceData, 
                        automation: track.automation, 
                    };
                    // Add type-specific data
                    if (track.type === 'Synth') {
                        trackData.synthParams = track.synthParams;
                    } else if (track.type === 'Sampler') { 
                        trackData.samplerAudioData = { 
                            fileName: track.originalFileName, 
                            audioBufferDataURL: track.audioBufferDataURL // Save sample as DataURL
                        };
                        trackData.slices = track.slices.map(s => ({...s, pan: undefined})); // Exclude 'pan' if it was ever there
                        trackData.waveformZoom = track.waveformZoom;
                        trackData.waveformScrollOffset = track.waveformScrollOffset;
                        trackData.slicerIsPolyphonic = track.slicerIsPolyphonic; 
                    } else if (track.type === 'DrumSampler') {
                        trackData.drumSamplerPads = track.drumSamplerPads.map(p => ({
                            originalFileName: p.originalFileName, 
                            audioBufferDataURL: p.audioBufferDataURL, // Save pad samples as DataURLs
                            volume: p.volume, pitchShift: p.pitchShift, envelope: p.envelope 
                        }));
                    } else if (track.type === 'InstrumentSampler') {
                        trackData.instrumentSamplerSettings = {
                            originalFileName: track.instrumentSamplerSettings.originalFileName, 
                            audioBufferDataURL: track.instrumentSamplerSettings.audioBufferDataURL, // Save sample as DataURL
                            rootNote: track.instrumentSamplerSettings.rootNote,
                            loop: track.instrumentSamplerSettings.loop,
                            loopStart: track.instrumentSamplerSettings.loopStart,
                            loopEnd: track.instrumentSamplerSettings.loopEnd,
                            envelope: track.instrumentSamplerSettings.envelope,
                        };
                        trackData.instrumentSamplerIsPolyphonic = track.instrumentSamplerIsPolyphonic; 
                    }
                    return trackData;
                }),
                windowStates: Object.values(openWindows).map(win => { // Serialize state of open windows
                    if (!win || !win.element) return null;
                    return {
                        id: win.id,
                        title: win.title,
                        left: win.element.style.left,
                        top: win.element.style.top,
                        width: win.element.style.width,
                        height: win.element.style.height,
                        zIndex: parseInt(win.element.style.zIndex),
                        isMinimized: win.isMinimized,
                        initialContentKey: win.initialContentKey // Important for knowing how to reopen window
                    };
                }).filter(ws => ws !== null) // Filter out any invalid window states
            };
            return projectData;
        }

        // Reconstructs the entire DAW state from saved project data (for loading or undo/redo)
        async function reconstructDAW(projectData, isUndoRedo = false) {
            // 1. Clear current state
            tracks.forEach(track => track.dispose()); // Dispose all existing tracks and their resources
            tracks = [];
            trackIdCounter = 0; // Reset track ID counter
            
            // Close all windows manually to ensure taskbar buttons etc., are cleared
            Object.values(openWindows).forEach(win => {
                if (win.taskbarButton) win.taskbarButton.remove();
                if (win.element) win.element.remove();
                if (win.resizeObserver) win.resizeObserver.disconnect();
            });
            openWindows = {}; 
            highestZIndex = 100; // Reset z-index, will be updated from projectData if available
            
            // Reset global states
            armedTrackId = null; 
            soloedTrackId = null; 
            activeSequencerTrackId = null;
            isRecording = false; 
            recordingTrackId = null;
            if (recordBtn) { recordBtn.classList.remove('recording'); recordBtn.textContent = 'Record';}

            // 2. Restore Global Settings
            const gs = projectData.globalSettings;
            if (gs) {
                Tone.Transport.bpm.value = gs.tempo || 120;
                Tone.getDestination().volume.value = gs.masterVolume !== undefined ? gs.masterVolume : 0; 
                updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
                highestZIndex = gs.highestZIndex || 100; // Restore highestZIndex
            }

            // 3. Reconstruct Tracks
            if (projectData.tracks) {
                for (const trackData of projectData.tracks) {
                    // addTrack now handles passing initialData to Track constructor for rehydration
                    const newTrack = addTrack(trackData.type, trackData); 
                    if (newTrack && newTrack.id > trackIdCounter) trackIdCounter = newTrack.id; // Update ID counter
                }
            }
            
            // 4. Restore Global Track States (Solo, Arm) & MIDI Input
            if (gs) {
                soloedTrackId = gs.soloedTrackId || null;
                armedTrackId = gs.armedTrackId || null;

                tracks.forEach(t => {
                    t.isSoloed = (t.id === soloedTrackId);
                    // applySoloState will be called effectively by updateMixerWindow and inspector updates later
                });

                // Restore MIDI input selection
                if (gs.activeMIDIInputId && midiAccess && midiInputSelectGlobal) {
                    const inputExists = Array.from(midiInputSelectGlobal.options).some(opt => opt.value === gs.activeMIDIInputId);
                    if (inputExists) {
                        midiInputSelectGlobal.value = gs.activeMIDIInputId;
                    } else {
                         console.warn(`MIDI input ID ${gs.activeMIDIInputId} from project not found.`);
                    }
                    selectMIDIInput(true); // true to skip undo capture during load
                } else if (midiInputSelectGlobal) { // If no saved MIDI, select default
                     selectMIDIInput(true); 
                }
            }

            // 5. Reconstruct Windows
            if (projectData.windowStates) {
                // Sort by zIndex to open them in a somewhat correct order (focus will adjust later)
                const sortedWindowStates = projectData.windowStates.sort((a, b) => a.zIndex - b.zIndex);

                for (const winState of sortedWindowStates) {
                    if (!winState) continue;
                    let newWin = null;
                    const key = winState.initialContentKey; // Key to determine window type

                    // Reopen windows based on their initialContentKey
                    if (key === 'globalControls') newWin = openGlobalControlsWindow(winState);
                    else if (key === 'mixer') newWin = openMixerWindow(winState);
                    else if (key === 'soundBrowser') newWin = openSoundBrowserWindow(winState);
                    // Tutorial window removed, so no need to handle its key
                    else if (key && key.startsWith('trackInspector-')) {
                        const tId = parseInt(key.split('-')[1]);
                        newWin = openTrackInspectorWindow(tId, winState);
                    } else if (key && key.startsWith('effectsRack-')) {
                        const tId = parseInt(key.split('-')[1]);
                        newWin = openTrackEffectsRackWindow(tId, winState);
                    } else if (key && key.startsWith('sequencerWin-')) {
                        const tId = parseInt(key.split('-')[1]);
                        newWin = openTrackSequencerWindow(tId, true, winState); // forceRedraw = true
                    }

                    // Apply saved state to the newly created window
                    if (newWin && newWin.element) { 
                        newWin.element.style.zIndex = winState.zIndex; // Ensure zIndex is set
                        if (winState.isMinimized && !newWin.isMinimized) {
                            newWin.minimize(true); // Minimize if saved as minimized (skip undo)
                        } else if (!winState.isMinimized && newWin.isMinimized) {
                            newWin.restore(true); // Restore if saved as not minimized but was created minimized (skip undo)
                        }
                        newWin.updateTaskbarButtonActiveState();
                    }
                }
            }
            
            // 6. Final UI Updates
            updateMixerWindow(); // Re-render mixer with new/restored tracks
            // Update inspector windows visuals (arm, solo, mute buttons)
            tracks.forEach(track => {
                if (track.inspectorWindow) {
                    const inspectorArmBtn = track.inspectorWindow.element?.querySelector(`#armInputBtn-${track.id}`);
                    if (inspectorArmBtn) inspectorArmBtn.classList.toggle('armed', armedTrackId === track.id);
                    const inspectorSoloBtn = track.inspectorWindow.element?.querySelector(`#soloBtn-${track.id}`);
                    if (inspectorSoloBtn) inspectorSoloBtn.classList.toggle('soloed', track.isSoloed);
                    const inspectorMuteBtn = track.inspectorWindow.element?.querySelector(`#muteBtn-${track.id}`);
                    if (inspectorMuteBtn) inspectorMuteBtn.classList.toggle('muted', track.isMuted);
                }
            });


            if (!isUndoRedo) { // Show notification only for full project load, not undo/redo
                showNotification(`Project loaded.`, 3500);
            }
        }


        // Saves the current project state to a .snug file
        function saveProject() {
            const projectData = gatherProjectData(); // Get all project data
            const jsonString = JSON.stringify(projectData, null, 2); // Pretty print JSON
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); // Create temporary link for download
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Create timestamp for filename
            a.download = `snugos-project-${timestamp}.snug`; 
            document.body.appendChild(a);
            a.click(); // Trigger download
            document.body.removeChild(a);
            URL.revokeObjectURL(url); // Clean up blob URL
            showNotification(`Project saved.`, 2000); 
        }

        // Triggers the file input dialog for loading a project
        function loadProject() {
            loadProjectInputEl.click(); 
        }
        // Handles project file selection
        loadProjectInputEl.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.name.endsWith('.snug')) { // Check for .snug extension
                const reader = new FileReader();
                reader.onload = async (e) => { // When file is read
                    try {
                        const projectData = JSON.parse(e.target.result); // Parse JSON data
                        undoStack = []; // Clear undo/redo stack for a fresh project load
                        redoStack = [];
                        updateUndoRedoButtons(); 
                        await reconstructDAW(projectData); // Reconstruct DAW state
                    } catch (error) {
                        console.error("Error loading project:", error);
                        showNotification(`Error loading project: ${error.message}`, 5000);
                    }
                };
                reader.readAsText(file); // Read file as text
            } else if (file) {
                showNotification("Invalid file type. Please select a .snug project file.", 3000);
            }
            event.target.value = null; // Reset file input for next load
        });

        // Exports the current project audio to a WAV file
        async function exportToWav() {
            showNotification("Preparing export... Please wait.", 3000);
            try {
                await initAudioContextAndMasterMeter(); // Ensure audio context is running
                // Stop transport if running
                if (Tone.Transport.state === 'started') {
                    Tone.Transport.stop(); 
                    await new Promise(resolve => setTimeout(resolve, 200)); // Short delay for stop to complete
                }
                Tone.Transport.position = 0; // Reset transport position
                
                // Determine maximum duration of all sequences
                let maxDuration = 0;
                tracks.forEach(track => {
                    if (track.sequence) { 
                        const trackDuration = Tone.Time(track.sequenceLength + " * 16n").toSeconds();
                        if (trackDuration > maxDuration) maxDuration = trackDuration;
                    }
                });

                if (maxDuration === 0) maxDuration = 5; // Default duration if no sequences
                maxDuration += 1; // Add a little buffer

                const recorder = new Tone.Recorder(); // Create Tone.Recorder
                Tone.getDestination().connect(recorder); // Connect master output to recorder

                recorder.start(); // Start recording
                showNotification(`Recording for export (${maxDuration.toFixed(1)}s)...`, maxDuration * 1000);

                // Start all track sequences
                tracks.forEach(track => {
                    if (track.sequence) { 
                        track.sequence.start(0); 
                        if (track.sequence instanceof Tone.Sequence) {
                             track.sequence.progress = 0; // Reset sequence progress
                        }
                    }
                });
                Tone.Transport.start("+0.1", 0); // Start transport slightly offset

                // Wait for recording duration
                await new Promise(resolve => setTimeout(resolve, maxDuration * 1000));

                Tone.Transport.stop(); // Stop transport
                // Stop all track sequences
                tracks.forEach(track => {
                    if (track.sequence) {
                        track.sequence.stop(0); 
                        if (track.sequence instanceof Tone.Sequence) {
                             track.sequence.progress = 0;
                        }
                    }
                });

                const recording = await recorder.stop(); // Stop recorder and get blob
                recorder.dispose(); // Dispose recorder

                // Trigger download of WAV file
                const url = URL.createObjectURL(recording);
                const a = document.createElement('a');
                a.href = url;
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                a.download = `snugos-export-${timestamp}.wav`; 
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showNotification("Export to WAV successful!", 3000);

            } catch (error) {
                console.error("Error exporting WAV:", error);
                showNotification(`Error exporting WAV: ${error.message}`, 5000);
            }
        }

        // Opens or focuses the Step Sequencer window for a given track
        function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) {
            const track = tracks.find(t => t.id === trackId);
            if (!track) return null;
            const windowId = `sequencerWin-${track.id}`;
            activeSequencerTrackId = track.id; // Set this as the active sequencer

            // If window exists and not forcing redraw or restoring from save, just restore/focus it
            if (openWindows[windowId] && !forceRedraw && !savedState) {
                openWindows[windowId].restore();
                return openWindows[windowId];
            }
            // If forcing redraw or restoring, close existing window first to ensure fresh render
            if (openWindows[windowId] && (forceRedraw || savedState)) { 
                openWindows[windowId].close(); 
            }
            
            let windowTitle = `Sequencer: ${track.name}`;
            let rows = 0, rowLabels = []; // Determine rows and labels based on track type

            if (track.type === 'Synth' || track.type === 'InstrumentSampler') {
                rows = synthPitches.length; rowLabels = synthPitches;
            } else if (track.type === 'Sampler') {
                rows = track.slices.length; rowLabels = track.slices.map((s, i) => `Slice ${i + 1}`);
            } else if (track.type === 'DrumSampler') { 
                rows = numDrumSamplerPads; rowLabels = Array.from({length: numDrumSamplerPads}, (_, i) => `Pad ${i+1}`);
            }

            const numBars = Math.ceil(track.sequenceLength / STEPS_PER_BAR); // Calculate number of bars
            
            // Generate HTML for the sequencer grid
            let gridHTML = `<div class="sequencer-grid-container">
                                <div class="sequencer-grid" 
                                     style="grid-template-columns: 50px repeat(${track.sequenceLength}, 1fr); 
                                            grid-template-rows: auto repeat(${rows}, auto);
                                            --steps-per-bar: ${STEPS_PER_BAR};">`; // CSS Grid for layout

            // Add bar headers
            gridHTML += `<div class="sequencer-bar-header-placeholder"></div>`; // Top-left empty cell
            for (let bar = 0; bar < numBars; bar++) {
                gridHTML += `<div class="sequencer-bar-header-cell">Bar ${bar + 1}</div>`;
            }
            
            // Add rows (labels and step cells)
            for (let r = 0; r < rows; r++) {
                gridHTML += `<div class="sequencer-label-cell" title="${rowLabels[r] || ''}">${rowLabels[r] || ''}</div>`; // Row label
                for (let c = 0; c < track.sequenceLength; c++) { // Step cells
                    const stepData = track.sequenceData[r]?.[c];
                    let cellClass = 'sequencer-step-cell';
                    // Apply beat highlighting classes for visual grouping
                    const beatInBar = (c % STEPS_PER_BAR); 
                    if (STEPS_PER_BAR === 16) { 
                        if (beatInBar >=0 && beatInBar <=3) cellClass += ' beat-1';      
                        else if (beatInBar >=4 && beatInBar <=7) cellClass += ' beat-2'; 
                        else if (beatInBar >=8 && beatInBar <=11) cellClass += ' beat-3';
                        else if (beatInBar >=12 && beatInBar <=15) cellClass += ' beat-4';
                    } else { // Fallback for other STEPS_PER_BAR values
                         if (Math.floor(beatInBar / 4) % 2 === 0) cellClass += ' beat-1'; 
                         else cellClass += ' beat-2';
                    }

                    // Add class if step is active, based on track type
                    if (stepData && stepData.active) {
                        if (track.type === 'Synth') cellClass += ' active-synth';
                        else if (track.type === 'Sampler') cellClass += ' active-sampler';
                        else if (track.type === 'DrumSampler') cellClass += ' active-drum-sampler';
                        else if (track.type === 'InstrumentSampler') cellClass += ' active-instrument-sampler';
                    }
                    gridHTML += `<div class="${cellClass}" data-row="${r}" data-col="${c}" title="${rowLabels[r] || ''} - Step ${c+1}"></div>`;
                }
            }
            gridHTML += `</div></div>`; 
            
            // Assemble full sequencer window content
            const contentHTML = `<div class="sequencer-window-content p-2">
                                    <p class="text-xs">${track.name} - ${track.type} Sequencer (${rows} rows x ${track.sequenceLength} steps, ${numBars} Bars)</p>
                                    ${gridHTML}
                                 </div>`;
            
            // Window options, applying saved state if provided
            const winOptions = { 
                width: Math.min(700, window.innerWidth - 50), 
                height: Math.min(420 + rows * 22, window.innerHeight - 100), // Adjust height based on number of rows
                initialContentKey: `sequencerWin-${track.id}` 
            };
             if (savedState) {
                Object.assign(winOptions, {
                    x: parseFloat(savedState.left), y: parseFloat(savedState.top),
                    width: parseFloat(savedState.width), height: parseFloat(savedState.height),
                    zIndex: savedState.zIndex, isMinimized: savedState.isMinimized
                });
            }

            const seqWin = createWindow(windowId, windowTitle, contentHTML, winOptions); 
            if (!seqWin || !seqWin.element) { showNotification("Failed to create Sequencer window.", 5000); return null; }
            track.sequencerWindow = seqWin; // Store reference to window

            // Add event listeners to step cells for toggling active state
            seqWin.element.querySelectorAll('.sequencer-step-cell').forEach(cell => {
                cell.addEventListener('click', () => {
                    const r = parseInt(cell.dataset.row);
                    const c = parseInt(cell.dataset.col);
                    
                    captureStateForUndo(`Toggle Sequencer Step (Track ${track.name}, ${rowLabels[r] || 'Row ' + (r+1)}, Step ${c+1})`);

                    if (!track.sequenceData[r]) track.sequenceData[r] = Array(track.sequenceLength).fill(null); // Ensure row exists
                    
                    // Toggle step active state and update cell class
                    if (!track.sequenceData[r][c] || !track.sequenceData[r][c].active) {
                        track.sequenceData[r][c] = { active: true, velocity: defaultVelocity };
                        let activeClass = '';
                        if (track.type === 'Synth') activeClass = 'active-synth';
                        else if (track.type === 'Sampler') activeClass = 'active-sampler';
                        else if (track.type === 'DrumSampler') activeClass = 'active-drum-sampler';
                        else if (track.type === 'InstrumentSampler') activeClass = 'active-instrument-sampler';
                        cell.classList.add(activeClass);
                    } else {
                        track.sequenceData[r][c].active = false;
                        // Reset cell class to default beat highlighting
                        cell.className = 'sequencer-step-cell';
                        const beatInBar = (c % STEPS_PER_BAR);
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
            // Clear active sequencer ID if window is closed
            seqWin.onCloseCallback = () => { if (activeSequencerTrackId === track.id) activeSequencerTrackId = null; };
            return seqWin;
        }
        
        // Highlights the currently playing step in the active sequencer
        function highlightPlayingStep(col, trackType, gridElement) { 
            if (!gridElement) return;
            // Remove 'playing' class from previously highlighted cells
            gridElement.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
            // Add 'playing' class to cells in the current column
            gridElement.querySelectorAll(`.sequencer-step-cell[data-col="${col}"]`).forEach(cell => cell.classList.add('playing'));
        }
        
        // Initializes the Tone.js audio context and master meter (if not already done)
        async function initAudioContextAndMasterMeter() {
            try {
                // Start audio context if not running (required by some browsers)
                if (Tone.context.state !== 'running') {
                    await Tone.start(); 
                    console.log("AudioContext started.");
                }
                // Initialize master meter if it doesn't exist
                if (!masterMeter && Tone.getDestination()) { 
                    masterMeter = new Tone.Meter({ smoothing: 0.8 });
                    Tone.getDestination().connect(masterMeter); // Connect meter to master output
                    console.log("Master meter initialized.");
                }
            } catch (error) {
                console.error("Error initializing audio context or master meter:", error);
                showNotification("Error initializing audio. Please ensure permissions and refresh.", 4000);
                throw error; // Rethrow to be caught by caller if needed
            }
        }

        // Animation loop to update level meters
        function updateMeters() {
            // Update master meter bar in Global Controls and Mixer
            if (masterMeter && masterMeterBar) {
                const level = Tone.dbToGain(masterMeter.getValue()); // Convert dB to gain (0-1)
                masterMeterBar.style.width = `${Math.min(100, level * 100)}%`; // Set width as percentage
                masterMeterBar.classList.toggle('clipping', masterMeter.getValue() > -0.1); // Indicate clipping
            }
            const mixerMasterMeter = document.getElementById('mixerMasterMeterBar');
             if (masterMeter && mixerMasterMeter) {
                const level = Tone.dbToGain(masterMeter.getValue());
                mixerMasterMeter.style.width = `${Math.min(100, level * 100)}%`;
                mixerMasterMeter.classList.toggle('clipping', masterMeter.getValue() > -0.1);
            }

            // Update individual track meters in Inspector and Mixer
            tracks.forEach(track => {
                if (track.trackMeter) {
                    const level = Tone.dbToGain(track.trackMeter.getValue());
                    const inspectorMeterBar = track.inspectorWindow?.element?.querySelector(`#trackMeterBar-${track.id}`);
                    if (inspectorMeterBar) {
                        inspectorMeterBar.style.width = `${Math.min(100, level * 100)}%`;
                        inspectorMeterBar.classList.toggle('clipping', track.trackMeter.getValue() > -0.1);
                    }
                    const mixerMeterBar = openWindows['mixer']?.element?.querySelector(`#mixerTrackMeterBar-${track.id}`);
                     if (mixerMeterBar) {
                        mixerMeterBar.style.width = `${Math.min(100, level * 100)}%`;
                        mixerMeterBar.classList.toggle('clipping', track.trackMeter.getValue() > -0.1);
                    }
                }
            });
            requestAnimationFrame(updateMeters); // Continue animation loop
        }
        
        // Updates the tempo display on the taskbar
        function updateTaskbarTempoDisplay(newTempo) {
            if (taskbarTempoDisplay) {
                taskbarTempoDisplay.textContent = `${parseFloat(newTempo).toFixed(1)} BPM`;
            }
        }
        
        // Fetches and processes a sound library (ZIP file) for the Sound Browser
        async function fetchSoundLibrary(libraryName, zipUrl) {
            const soundBrowserList = document.getElementById('soundBrowserList');
            const pathDisplay = document.getElementById('soundBrowserPathDisplay');
            if (!soundBrowserList || !pathDisplay) return;

            // Show loading state in Sound Browser
            soundBrowserList.innerHTML = `<div class="sound-browser-loading">Fetching ${libraryName} sounds...</div>`;
            pathDisplay.textContent = `Path: / (${libraryName} - Loading...)`;
            currentLibraryName = libraryName; 
            
            try {
                const response = await fetch(zipUrl); // Fetch ZIP file
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} fetching ${zipUrl}`);
                }
                const zipData = await response.arrayBuffer(); // Get as ArrayBuffer
                const jszip = new JSZip(); // Create JSZip instance
                loadedZipFiles[libraryName] = await jszip.loadAsync(zipData); // Load ZIP data
                
                // Parse ZIP file structure into a tree
                currentSoundFileTree = {}; 
                loadedZipFiles[libraryName].forEach((relativePath, zipEntry) => {
                    if (zipEntry.dir) return; // Skip directories

                    const pathParts = relativePath.split('/').filter(p => p); // Split path into parts
                    let currentLevel = currentSoundFileTree;

                    // Build tree structure
                    for (let i = 0; i < pathParts.length; i++) {
                        const part = pathParts[i];
                        if (i === pathParts.length - 1) { // If it's a file
                            if (part.endsWith('.wav') || part.endsWith('.mp3') || part.endsWith('.ogg')) { // Check for audio extensions
                                currentLevel[part] = { type: 'file', entry: zipEntry, fullPath: relativePath };
                            }
                        } else { // If it's a folder
                            if (!currentLevel[part] || currentLevel[part].type !== 'folder') { 
                                currentLevel[part] = { type: 'folder', children: {} };
                            }
                            currentLevel = currentLevel[part].children;
                        }
                    }
                });
                currentSoundBrowserPath = []; // Reset path to root
                renderSoundBrowserDirectory(currentSoundBrowserPath, currentSoundFileTree); // Render browser content

            } catch (error) {
                console.error(`Error fetching or processing ${libraryName} ZIP:`, error);
                showNotification(`Error with ${libraryName} library: ${error.message}`, 4000);
                if (soundBrowserList) soundBrowserList.innerHTML = `<div class="sound-browser-loading">Error fetching ${libraryName}. Check console.</div>`;
                if (pathDisplay) pathDisplay.textContent = `Path: / (Error - ${libraryName})`;
            }
        }
        
        // Renders the content of the Sound Browser for a given path and file tree
        function renderSoundBrowserDirectory(pathArray, treeNode) {
            const soundBrowserList = document.getElementById('soundBrowserList');
            const pathDisplay = document.getElementById('soundBrowserPathDisplay');
            if (!soundBrowserList || !pathDisplay || !treeNode) return;

            soundBrowserList.innerHTML = ''; // Clear existing content
            pathDisplay.textContent = `Path: /${pathArray.join('/')} (${currentLibraryName || 'No Library Selected'})`; // Update path display

            // Add "Up" button if not at root
            if (pathArray.length > 0) {
                const backButton = document.createElement('div');
                backButton.className = 'sound-browser-item font-semibold';
                backButton.textContent = '筮ｸ.. (Up)'; // Folder icon for "Up"
                backButton.onclick = () => {
                    currentSoundBrowserPath.pop(); // Go up one level
                    // Rebuild treeNode reference for the new path
                    let newTreeNode = currentSoundFileTree;
                    for (const segment of currentSoundBrowserPath) {
                        newTreeNode = newTreeNode[segment]?.children;
                        if (!newTreeNode) { // Safety check, reset to root if path invalid
                            currentSoundBrowserPath = []; 
                            newTreeNode = currentSoundFileTree;
                            break;
                        }
                    }
                    renderSoundBrowserDirectory(currentSoundBrowserPath, newTreeNode);
                };
                soundBrowserList.appendChild(backButton);
            }

            // Sort entries (folders first, then files, alphabetically)
            const sortedEntries = Object.entries(treeNode).sort(([nameA, itemA], [nameB, itemB]) => {
                if (itemA.type === 'folder' && itemB.type === 'file') return -1;
                if (itemA.type === 'file' && itemB.type === 'folder') return 1;
                return nameA.localeCompare(nameB);
            });

            // Create list items for folders and files
            sortedEntries.forEach(([name, item]) => {
                const div = document.createElement('div');
                div.className = 'sound-browser-item';
                if (item.type === 'folder') {
                    div.textContent = `刀 ${name}`; // Folder icon
                    div.onclick = () => { // Click to navigate into folder
                        currentSoundBrowserPath.push(name);
                        renderSoundBrowserDirectory(currentSoundBrowserPath, item.children);
                    };
                } else if (item.type === 'file') {
                    div.textContent = `七 ${name}`; // File icon
                    div.title = `Click to play. Drag to load: ${name}`;
                    div.draggable = true; // Make file item draggable

                    // Set data for drag operation
                    div.addEventListener('dragstart', (event) => {
                        const soundData = {
                            fullPath: item.fullPath,
                            libraryName: currentLibraryName,
                            fileName: name
                        };
                        event.dataTransfer.setData("application/json", JSON.stringify(soundData)); 
                        event.dataTransfer.effectAllowed = "copy";
                        div.style.opacity = '0.5'; // Visual cue for dragging
                    });
                     div.addEventListener('dragend', () => {
                        div.style.opacity = '1'; // Reset opacity
                    });


                    // Click to preview sound
                    div.addEventListener('click', async (event) => {
                        if (event.detail === 0) return; // Prevent accidental double-trigger on some systems

                        await initAudioContextAndMasterMeter(); // Ensure audio context
                        // Stop previous preview if playing
                        if (previewPlayer && !previewPlayer.disposed) {
                            previewPlayer.stop();
                            previewPlayer.dispose();
                        }
                        try {
                            if (!loadedZipFiles[currentLibraryName]) throw new Error("Current ZIP library not loaded.");
                            const zipEntry = loadedZipFiles[currentLibraryName].file(item.fullPath);
                            if (!zipEntry) throw new Error(`File ${item.fullPath} not found in ${currentLibraryName} ZIP.`);
                            
                            const fileBlob = await zipEntry.async("blob"); // Get file as blob from ZIP
                            const buffer = await new Tone.Buffer().load(URL.createObjectURL(fileBlob)); // Load blob into Tone.Buffer
                            
                            // Create and play preview player
                            previewPlayer = new Tone.Player(buffer).toDestination();
                            previewPlayer.autostart = true;
                            previewPlayer.onstop = () => { // Dispose player when finished
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

        // Loads a sound from the Sound Browser to a target track/pad/slice
        async function loadSoundFromBrowserToTarget(soundData, targetTrackId, targetTrackType, targetPadOrSliceIndex = null) { 
            const { fullPath, libraryName, fileName } = soundData;
            const track = tracks.find(t => t.id === parseInt(targetTrackId)); 

            if (!track) {
                showNotification(`Target track ID ${targetTrackId} not found.`, 3000);
                return;
            }
            // Basic type check (can be refined if needed)
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

                const fileBlob = await zipEntry.async("blob"); // Get file as blob
                const blobUrl = URL.createObjectURL(fileBlob); // Create blob URL for Tone.js

                // Route to appropriate loading function based on track type
                if (track.type === 'DrumSampler') {
                    let actualPadIndex = targetPadOrSliceIndex;
                    // If dropping onto the main drop zone of a drum sampler, find first empty pad or selected pad
                    if (actualPadIndex === null) {
                        actualPadIndex = track.drumSamplerPads.findIndex(p => !p.audioBufferDataURL); // Find first empty
                        if (actualPadIndex === -1) actualPadIndex = track.selectedDrumPadForEdit; // Or use selected
                    }
                    await loadDrumSamplerPadFile(blobUrl, track.id, actualPadIndex, fileName);
                } else if (track.type === 'Sampler') {
                    // If dropping onto a specific slice pad, it currently reloads the main sample.
                    // This could be enhanced to replace only that slice's audio source if desired.
                    if (targetPadOrSliceIndex !== null) { 
                        showNotification("Drag & drop to individual slices reloads the main sample for now.", 3000);
                        await loadSampleFile(blobUrl, track.id, 'Sampler'); 
                    } else { // Dropping onto main drop zone
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


        // Opens or focuses the Sound Browser window
        function openSoundBrowserWindow(savedState = null) {
            const windowId = 'soundBrowser';
            // If window exists and not restoring from save, just restore/focus it
            if (openWindows[windowId] && !savedState) { openWindows[windowId].restore(); return openWindows[windowId]; }

            // Create options for library select dropdown
            let selectOptionsHTML = '';
            for (const libName in soundLibraries) {
                selectOptionsHTML += `<option value="${libName}">${libName}</option>`;
            }

            // HTML content for the Sound Browser window
            const contentHTML = `
                <div class="sound-browser-content">
                    <select id="soundBrowserLibrarySelect" class="w-full mb-2 p-1 border border-gray-500 rounded-sm text-xs">
                        ${selectOptionsHTML}
                    </select>
                    <div id="soundBrowserPathDisplay" class="text-xs p-1 bg-gray-200 border-b border-gray-400">Path: /</div>
                    <div id="soundBrowserList" class="sound-browser-list">Select a library to load sounds.</div>
                </div>
            `;
            // Window options, applying saved state if provided
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

            // Event listener for library selection change
            const librarySelect = soundBrowserWin.element.querySelector('#soundBrowserLibrarySelect');
            librarySelect.onchange = () => {
                const selectedLibraryName = librarySelect.value;
                const zipUrl = soundLibraries[selectedLibraryName];
                if (zipUrl) {
                    // If library already loaded from cache, render it
                    if (loadedZipFiles[selectedLibraryName]) { 
                        currentLibraryName = selectedLibraryName;
                        currentSoundFileTree = {}; // Rebuild tree (could be optimized to use cached tree)
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
                    } else { // Otherwise, fetch and process the library
                        fetchSoundLibrary(selectedLibraryName, zipUrl);
                    }
                }
            };
            // Load the first library by default if any are defined
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
            
            // Start button click to toggle Start Menu
            startButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent click from closing menu immediately
                startMenu.classList.toggle('hidden');
            });
            // Click outside Start Menu to close it
            document.addEventListener('click', (e) => {
                if (!startMenu.classList.contains('hidden') && !startMenu.contains(e.target) && e.target !== startButton) {
                    startMenu.classList.add('hidden');
                }
            });

            // Start Menu item event listeners
            menuAddSynthTrack.addEventListener('click', () => { addTrack('Synth', {_isUserActionPlaceholder: true}); startMenu.classList.add('hidden'); });
            menuAddSamplerTrack.addEventListener('click', () => { addTrack('Sampler', {_isUserActionPlaceholder: true}); startMenu.classList.add('hidden'); });
            menuAddDrumSamplerTrack.addEventListener('click', () => { addTrack('DrumSampler', {_isUserActionPlaceholder: true}); startMenu.classList.add('hidden'); });
            menuAddInstrumentSamplerTrack.addEventListener('click', () => { addTrack('InstrumentSampler', {_isUserActionPlaceholder: true}); startMenu.classList.add('hidden'); });
            if(menuOpenSoundBrowser) menuOpenSoundBrowser.addEventListener('click', () => { openSoundBrowserWindow(); startMenu.classList.add('hidden'); });

            if(menuUndo) menuUndo.addEventListener('click', () => { 
                if (!menuUndo.classList.contains('disabled')) { // Only if undo is available
                    undoLastAction(); 
                    startMenu.classList.add('hidden'); 
                }
            });
            if(menuRedo) menuRedo.addEventListener('click', () => { 
                if (!menuRedo.classList.contains('disabled')) { // Only if redo is available
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
            
            // Taskbar tempo display click to open Global Controls
            taskbarTempoDisplay.addEventListener('click', () => {
                openGlobalControlsWindow(); 
            });

            // Initial setup
            openGlobalControlsWindow(); // Open Global Controls by default
            await setupMIDI(); // Initialize MIDI
            requestAnimationFrame(updateMeters); // Start meter animation loop
            updateUndoRedoButtons(); // Set initial state of undo/redo buttons

            showNotification("Welcome to SnugOS!", 2500); 
            console.log("SnugOS Initialized."); 
        });

        // Warn user before unloading if there are unsaved changes (basic check)
        window.addEventListener('beforeunload', (e) => {
            if (tracks.length > 0 && (undoStack.length > 0 || Object.keys(openWindows).length > 1 )) { // Check if project is non-empty or has undo history
                e.preventDefault(); // Standard way to trigger browser's unload confirmation
                e.returnValue = ''; // For older browsers
            }
        });

        console.log("SCRIPT EXECUTION FINISHED - SnugOS v5.5.1");