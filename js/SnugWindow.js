// js/SnugWindow.js - SnugWindow Class Module

console.log('[SnugWindow.js EXECUTION START] This file is being parsed. (with debug logs)'); // DEBUG

import { captureStateForUndo, getTracks } from './state.js';
console.log('[SnugWindow.js] Imports (captureStateForUndo, getTracks) loaded.'); // DEBUG

// Default theme colors (can be overridden by user settings in future)
const defaultWindowBg = '#c0c0c0';
const defaultWindowContentBg = '#c0c0c0'; // Or a different default like '#ffffff' for content

export class SnugWindow {
    constructor(id, title, contentHTMLOrElement, options = {}) {
        // DEBUGGING MASTER EFFECTS RACK (and general window creation):
        console.log(`[SnugWindow CONSTRUCTOR START] ID: ${id}, Title: "${title}"`);
        console.log(`[SnugWindow ${id}] Initial options received:`, JSON.parse(JSON.stringify(options)));
        console.log(`[SnugWindow ${id}] Checking window.openWindows at constructor start:`, window.openWindows);
        console.log(`[SnugWindow ${id}] Checking window.highestZIndex at constructor start:`, window.highestZIndex);

        this.id = id;
        this.title = title;
        this.isMinimized = false;
        this.initialContentKey = options.initialContentKey || id; // Used for identifying window content during project save/load
        this.resizeObserver = null;
        this.taskbarButton = null;
        this.onCloseCallback = options.onCloseCallback || (() => {});

        const desktopEl = document.getElementById('desktop');
        if (!desktopEl) {
            console.error(`[SnugWindow CRITICAL ${id}] Desktop element with ID 'desktop' not found. Window will NOT be created.`);
            this.element = null; // Ensure element is null if desktop isn't found
            return; // Stop construction
        }
        console.log(`[SnugWindow ${id}] Desktop element (#desktop) found:`, desktopEl);

        // Calculate initial position and size
        const defaultWidth = options.width || Math.min(350, desktopEl.offsetWidth - 40);
        const defaultHeight = options.height || Math.min(250, desktopEl.offsetHeight - 80);
        const taskbarHeightVal = document.getElementById('taskbar')?.offsetHeight || 30;

        const maxX = Math.max(5, desktopEl.offsetWidth - defaultWidth - 10);
        const maxY = Math.max(5, desktopEl.offsetHeight - defaultHeight - 10 - taskbarHeightVal);

        let initialX = options.x;
        let initialY = options.y;

        if (initialX === undefined || initialY === undefined) {
            // Basic cascade if no position is given
            const openWindowCount = Object.keys(window.openWindows || {}).length;
            const cascadeOffset = 20 + (openWindowCount % 10) * 25; // Cascade a bit
            initialX = Math.max(5, Math.min(cascadeOffset, maxX));
            initialY = Math.max(5, Math.min(cascadeOffset, maxY));
        } else {
            // Ensure provided coordinates are within bounds
            initialX = Math.max(5, Math.min(initialX, maxX));
            initialY = Math.max(5, Math.min(initialY, maxY));
        }
        console.log(`[SnugWindow ${id}] Calculated initial position: X=${initialX}, Y=${initialY}`);


        this.options = {
            x: initialX,
            y: initialY,
            width: defaultWidth,
            height: defaultHeight,
            closable: true,
            minimizable: true,
            resizable: true,
            ...options // User options override defaults
        };
        console.log(`[SnugWindow ${id}] Final effective options:`, JSON.parse(JSON.stringify(this.options)));


        this.element = document.createElement('div');
        this.element.id = `window-${this.id}`;
        this.element.className = 'window';
        this.element.style.left = `${this.options.x}px`;
        this.element.style.top = `${this.options.y}px`;
        this.element.style.width = `${this.options.width}px`;
        this.element.style.height = `${this.options.height}px`;

        if (typeof window.highestZIndex === 'undefined' || window.highestZIndex === null || isNaN(parseInt(window.highestZIndex))) {
            console.warn(`[SnugWindow ${id}] window.highestZIndex is invalid! Defaulting to 100 before incrementing.`);
            window.highestZIndex = 100;
        }
        this.element.style.zIndex = options.zIndex !== undefined ? options.zIndex : ++window.highestZIndex;
        console.log(`[SnugWindow ${id}] Set zIndex to ${this.element.style.zIndex}. Current global highestZIndex after potential increment: ${window.highestZIndex}`);

        this.element.style.backgroundColor = `var(--window-bg, ${defaultWindowBg})`; // Use CSS var with fallback

        // Title Bar
        let buttonsHTML = '';
        if (this.options.minimizable) { buttonsHTML += `<button class="window-minimize-btn" title="Minimize">_</button>`; }
        if (this.options.resizable) { buttonsHTML += `<button class="window-maximize-btn" title="Maximize">□</button>`; } // Placeholder for maximize
        if (this.options.closable) { buttonsHTML += `<button class="window-close-btn" title="Close">X</button>`; }


        this.titleBar = document.createElement('div');
        this.titleBar.className = 'window-title-bar';
        this.titleBar.innerHTML = `<span>${this.title}</span><div class="window-title-buttons">${buttonsHTML}</div>`;

        // Content Area
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'window-content';
        this.contentArea.style.backgroundColor = `var(--window-content-bg, ${defaultWindowContentBg})`; // Use CSS var


        if (typeof contentHTMLOrElement === 'string') {
            this.contentArea.innerHTML = contentHTMLOrElement;
        } else if (contentHTMLOrElement instanceof HTMLElement) {
            this.contentArea.appendChild(contentHTMLOrElement);
        } else if (contentHTMLOrElement !== null && contentHTMLOrElement !== undefined) {
            // Handle cases where content might be, for example, a DocumentFragment or something unexpected
            console.warn(`[SnugWindow ${this.id}] Content is not a string or HTMLElement. Type: ${typeof contentHTMLOrElement}, Value:`, contentHTMLOrElement);
            this.contentArea.textContent = 'Invalid content provided.';
        }
        console.log(`[SnugWindow ${id}] Content area populated. Content type: ${typeof contentHTMLOrElement}`);


        this.element.appendChild(this.titleBar);
        this.element.appendChild(this.contentArea);

        console.log(`[SnugWindow ${id}] Element constructed. About to append to desktopEl:`, this.element);
        desktopEl.appendChild(this.element);
        console.log(`[SnugWindow ${id}] Element appended to desktop.`);


        // Register window
        if (typeof window.openWindows !== 'object' || window.openWindows === null) {
            console.warn(`[SnugWindow ${id}] window.openWindows is not an object or is null! Initializing as {}.`);
            window.openWindows = {};
        }
        window.openWindows[this.id] = this;
        console.log(`[SnugWindow ${id}] Window registered in window.openWindows. Current window.openWindows:`, window.openWindows);


        // Add behaviors
        this.makeDraggable();
        if (this.options.resizable) {
            this.makeResizable();
        }


        // Attach button event listeners
        if (this.options.closable) {
            const closeBtn = this.element.querySelector('.window-close-btn');
            if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
            else console.warn(`[SnugWindow ${this.id}] Close button not found.`);
        }
        if (this.options.minimizable) {
            const minBtn = this.element.querySelector('.window-minimize-btn');
            if (minBtn) minBtn.addEventListener('click', (e) => { e.stopPropagation(); this.minimize(); });
            else console.warn(`[SnugWindow ${this.id}] Minimize button not found.`);
        }
        if (this.options.resizable) { // Assuming maximize is tied to resizable for now
            const maxBtn = this.element.querySelector('.window-maximize-btn');
            if (maxBtn) maxBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMaximize(); });
            else console.warn(`[SnugWindow ${this.id}] Maximize button not found.`);
        }


        this.element.addEventListener('mousedown', () => this.focus(), true); // Focus on any mousedown within window
        this.createTaskbarButton();

        if (options.isMinimized) {
            console.log(`[SnugWindow ${id}] Initializing as minimized.`);
            this.minimize(true); // true to skip undo for initial state
        }
        console.log(`[SnugWindow CONSTRUCTOR END] ID: ${id} successfully initialized and configured.`);
    }

    makeDraggable() {
        if (!this.titleBar) { console.warn(`[SnugWindow ${this.id}] Title bar not found for dragging.`); return; }
        let offsetX, offsetY, isDragging = false;
        const desktopEl = document.getElementById('desktop');
        let initialX, initialY; // For undo comparison

        this.titleBar.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || !desktopEl) return; // Don't drag if clicking a button
            if (this.isMaximized) return; // Don't drag if maximized

            isDragging = true; this.focus();
            initialX = this.element.offsetLeft; // Store initial position for undo
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

            // Constrain to desktop bounds (minus taskbar)
            const desktopRect = desktopEl.getBoundingClientRect();
            const taskbarHeightVal = document.getElementById('taskbar')?.offsetHeight || 30;

            // Ensure window doesn't go off-screen (top/left)
            newX = Math.max(0, Math.min(newX, desktopRect.width - this.element.offsetWidth));
            // Ensure window doesn't go under taskbar or off-screen (bottom)
            newY = Math.max(0, Math.min(newY, desktopRect.height - this.element.offsetHeight - taskbarHeightVal));
            // Ensure title bar is always visible
            newY = Math.max(0, Math.min(newY, desktopRect.height - taskbarHeightVal - this.titleBar.offsetHeight));


            this.element.style.left = `${newX}px`;
            this.element.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                if (this.titleBar) this.titleBar.style.cursor = 'grab';
                document.body.style.userSelect = '';
                // Capture state for undo only if position actually changed
                if (this.element.offsetLeft !== initialX || this.element.offsetTop !== initialY) {
                    if (typeof captureStateForUndo === 'function') captureStateForUndo(`Move window "${this.title}"`);
                }
            }
        });
    }

    makeResizable() {
        const resizer = document.createElement('div');
        resizer.className = 'window-resizer'; // Style this with CSS for a resize handle
        this.element.appendChild(resizer);
        this.element.style.overflow = 'hidden'; // Important for resizer to be at the edge

        let initialWidth, initialHeight, initialMouseX, initialMouseY, isResizing = false;
        let originalStyleWidth, originalStyleHeight; // For undo comparison

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation(); // Prevent dragging window while resizing
            isResizing = true; this.focus();

            initialWidth = this.element.offsetWidth;
            initialHeight = this.element.offsetHeight;
            initialMouseX = e.clientX;
            initialMouseY = e.clientY;
            originalStyleWidth = this.element.style.width; // Store initial style for undo
            originalStyleHeight = this.element.style.height;

            document.body.style.cursor = 'nwse-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const dx = e.clientX - initialMouseX;
            const dy = e.clientY - initialMouseY;
            const newWidth = Math.max(this.options.minWidth || 150, initialWidth + dx);
            const newHeight = Math.max(this.options.minHeight || 100, initialHeight + dy);
            this.element.style.width = `${newWidth}px`;
            this.element.style.height = `${newHeight}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                // Capture state for undo only if size actually changed
                if (this.element.style.width !== originalStyleWidth || this.element.style.height !== originalStyleHeight) {
                    if (typeof captureStateForUndo === 'function') captureStateForUndo(`Resize window "${this.title}"`);
                }
            }
        });
    }

    toggleMaximize() {
        const desktopEl = document.getElementById('desktop');
        const taskbarEl = document.getElementById('taskbar');
        if (!desktopEl || !taskbarEl) return;

        if (this.isMaximized) {
            // Restore
            this.element.style.left = this.restoreState.left;
            this.element.style.top = this.restoreState.top;
            this.element.style.width = this.restoreState.width;
            this.element.style.height = this.restoreState.height;
            this.isMaximized = false;
            if (this.titleBar.querySelector('.window-maximize-btn')) this.titleBar.querySelector('.window-maximize-btn').innerHTML = '□';
            if (typeof captureStateForUndo === 'function') captureStateForUndo(`Restore window "${this.title}"`);
        } else {
            // Maximize
            this.restoreState = {
                left: this.element.style.left,
                top: this.element.style.top,
                width: this.element.style.width,
                height: this.element.style.height,
            };
            const taskbarHeight = taskbarEl.offsetHeight;
            this.element.style.left = '0px';
            this.element.style.top = '0px';
            this.element.style.width = `${desktopEl.clientWidth}px`;
            this.element.style.height = `${desktopEl.clientHeight - taskbarHeight}px`;
            this.isMaximized = true;
            if (this.titleBar.querySelector('.window-maximize-btn')) this.titleBar.querySelector('.window-maximize-btn').innerHTML = '❐'; // Restore down icon
            if (typeof captureStateForUndo === 'function') captureStateForUndo(`Maximize window "${this.title}"`);
        }
        this.focus();
    }


    createTaskbarButton() {
        const taskbarButtonsContainer = document.getElementById('taskbarButtons');
        if (!taskbarButtonsContainer) {
            console.warn(`[SnugWindow ${this.id}] Taskbar buttons container (#taskbarButtons) not found! Cannot create taskbar button.`);
            return;
        }
        this.taskbarButton = document.createElement('button');
        this.taskbarButton.className = 'taskbar-button';
        this.taskbarButton.textContent = this.title.substring(0, 15) + (this.title.length > 15 ? '...' : '');
        this.taskbarButton.title = this.title;
        this.taskbarButton.dataset.windowId = this.id;
        taskbarButtonsContainer.appendChild(this.taskbarButton);

        this.taskbarButton.addEventListener('click', () => {
            if (this.isMinimized) { this.restore(); }
            else {
                // If it's already the top window, minimize it. Otherwise, focus it.
                if (this.element && parseInt(this.element.style.zIndex) === window.highestZIndex) {
                    this.minimize();
                } else {
                    this.focus();
                }
            }
        });
        this.updateTaskbarButtonActiveState();
    }

    updateTaskbarButtonActiveState() {
        if (this.taskbarButton && this.element) {
            const isActive = !this.isMinimized && parseInt(this.element.style.zIndex) === window.highestZIndex;
            this.taskbarButton.classList.toggle('active', isActive);
            this.taskbarButton.classList.toggle('minimized-on-taskbar', this.isMinimized && !isActive);
        }
    }

    minimize(skipUndo = false) {
        if (!this.isMinimized && this.element) {
            this.isMinimized = true;
            this.element.classList.add('minimized'); // CSS handles display: none
            if (this.taskbarButton) {
                this.taskbarButton.classList.add('minimized-on-taskbar');
                this.taskbarButton.classList.remove('active');
            }
            if (!skipUndo && typeof captureStateForUndo === 'function') captureStateForUndo(`Minimize window "${this.title}"`);
            
            // Focus next available window
            let nextHighestZ = -1;
            let windowToFocus = null;
            Object.values(window.openWindows).forEach(win => {
                if (win && win.element && !win.isMinimized && win.id !== this.id) { // Check if win.element exists
                    const z = parseInt(win.element.style.zIndex);
                    if (z > nextHighestZ) {
                        nextHighestZ = z;
                        windowToFocus = win;
                    }
                }
            });
            if (windowToFocus) windowToFocus.focus(true); // true to skip undo for this auto-focus
            else { // If no other window to focus, just update taskbar states
                 Object.values(window.openWindows).forEach(win => win?.updateTaskbarButtonActiveState?.());
            }
        }
    }

    restore(skipUndo = false) {
        if (this.isMinimized && this.element) {
            this.isMinimized = false;
            this.element.classList.remove('minimized');
            this.focus(true); // Focus when restoring, skip undo for this action itself
            if (!skipUndo && typeof captureStateForUndo === 'function') captureStateForUndo(`Restore window "${this.title}"`);
        } else if (this.element) {
            // If not minimized but restore is called, it means bring to front/focus
            this.focus(skipUndo);
        }
    }

    close() {
        console.log(`[SnugWindow ${this.id}] Closing window: ${this.title}`); // DEBUG
        if (this.onCloseCallback && typeof this.onCloseCallback === 'function') {
            try { this.onCloseCallback(); }
            catch (e) { console.error(`[SnugWindow ${this.id}] Error in onCloseCallback:`, e); }
        }

        if (this.taskbarButton) {
             try { this.taskbarButton.remove(); } catch(e) { console.warn(`[SnugWindow ${this.id}] Error removing taskbar button`, e); }
        }
        if (this.element) {
            try { this.element.remove(); } catch(e) { console.warn(`[SnugWindow ${this.id}] Error removing window element`, e); }
        }


        const oldWindowTitle = this.title; // Capture before deleting from openWindows
        if (window.openWindows && typeof window.openWindows === 'object') {
            delete window.openWindows[this.id];
            console.log(`[SnugWindow ${this.id}] Removed from window.openWindows. Remaining:`, window.openWindows); // DEBUG
        } else {
            console.warn(`[SnugWindow ${this.id}] window.openWindows not available for cleanup during close.`);
        }

        // Clean up track references
        const trackIdStr = this.id.split('-')[1]; // e.g., "trackInspector-1" -> "1"
        if (trackIdStr && typeof getTracks === 'function') {
            const trackIdNum = parseInt(trackIdStr);
            if (!isNaN(trackIdNum)) {
                const tracksArray = getTracks();
                if (tracksArray && Array.isArray(tracksArray)) {
                    const track = tracksArray.find(t => t.id === trackIdNum);
                    if (track) {
                        if (this.id.startsWith('trackInspector-')) track.inspectorWindow = null;
                        if (this.id.startsWith('sequencerWin-')) track.sequencerWindow = null;
                        if (this.id.startsWith('effectsRack-')) track.effectsRackWindow = null;
                    }
                }
            }
        }
        // Only capture undo if not part of a project reconstruction
        if (typeof captureStateForUndo === 'function' && !window.isReconstructingDAW) {
            captureStateForUndo(`Close window "${oldWindowTitle}"`);
        }
        console.log(`[SnugWindow ${this.id}] Close process finished.`); // DEBUG
    }

    focus(skipUndo = false) { // Added skipUndo parameter
        if (this.isMinimized) { this.restore(skipUndo); return; }
        if (!this.element) {
            console.warn(`[SnugWindow ${this.id}] Focus called but element is null.`);
            return;
        }
        
        const currentZ = parseInt(this.element.style.zIndex);
        if (currentZ < window.highestZIndex || Object.keys(window.openWindows).length === 1) {
             if (typeof window.highestZIndex === 'undefined' || window.highestZIndex === null || isNaN(parseInt(window.highestZIndex))) {
                 console.warn(`[SnugWindow Focus ${this.id}] window.highestZIndex is invalid! Defaulting to 100 before increment.`);
                 window.highestZIndex = 100;
            }
            this.element.style.zIndex = ++window.highestZIndex;
            console.log(`[SnugWindow Focus ${this.id}] Focused. New zIndex: ${this.element.style.zIndex}. Global highestZIndex: ${window.highestZIndex}`);
        } else if (currentZ > window.highestZIndex) { // This case should ideally not happen if zIndex is managed correctly
            window.highestZIndex = currentZ;
            console.warn(`[SnugWindow Focus ${this.id}] Focused, but its zIndex ${currentZ} was already higher than global highestZIndex ${window.highestZIndex-1}. Adjusted global highestZIndex.`);
        }


        // Update active state for all taskbar buttons
        if (window.openWindows && typeof window.openWindows === 'object') {
            Object.values(window.openWindows).forEach(win => {
                if (win && win.taskbarButton && typeof win.updateTaskbarButtonActiveState === 'function') {
                    win.updateTaskbarButtonActiveState();
                }
            });
        }
    }

    // Method to apply saved state, useful for project loading
    applyState(state) { // Added for project loading
        if (!this.element) return;
        this.element.style.left = state.left;
        this.element.style.top = state.top;
        this.element.style.width = state.width;
        this.element.style.height = state.height;
        this.element.style.zIndex = state.zIndex;
        if (this.titleBar) this.titleBar.querySelector('span').textContent = state.title;
        this.title = state.title;
        if (this.taskbarButton) {
            this.taskbarButton.textContent = state.title.substring(0, 15) + (state.title.length > 15 ? '...' : '');
            this.taskbarButton.title = state.title;
        }

        if (state.isMinimized && !this.isMinimized) {
            this.minimize(true); // true to skip undo for initial state
        } else if (!state.isMinimized && this.isMinimized) {
            this.restore(true); // true to skip undo for initial state
        }
        this.updateTaskbarButtonActiveState();
    }
}

