// js/SnugWindow.js - SnugWindow Class Module

console.log('[SnugWindow.js EXECUTION START] This file is being parsed.'); // This log is present in your console output

import { captureStateForUndo, getTracks } from './state.js'; // Assuming getTracks might be used for context later
console.log('[SnugWindow.js] Imports (captureStateForUndo, getTracks) loaded.'); // This log is present in your console output

// Default theme colors (can be overridden by user settings in future)
const defaultWindowBg = '#c0c0c0';
const defaultWindowContentBg = '#c0c0c0'; // Or a different default like '#ffffff' for content

export class SnugWindow {
    constructor(id, title, contentHTMLOrElement, options = {}) {
        console.log(`[SnugWindow CONSTRUCTOR START] ID: ${id}, Title: "${title}"`); // This log is present in your console output
        console.log('[SnugWindow] Initial options:', JSON.parse(JSON.stringify(options))); // This log is present in your console output
        console.log('[SnugWindow] Checking window.openWindows at constructor start:', window.openWindows); // This log is present in your console output
        console.log('[SnugWindow] Checking window.highestZIndex at constructor start:', window.highestZIndex); // This log is present in your console output

        this.id = id;
        this.title = title;
        this.isMinimized = false;
        this.initialContentKey = options.initialContentKey || id; // For reconstructing window content
        this.resizeObserver = null;
        this.taskbarButton = null;
        this.onCloseCallback = options.onCloseCallback || (() => {}); // Custom callback on close

        const desktopEl = document.getElementById('desktop');
        if (!desktopEl) {
            console.error(`[SnugWindow CRITICAL] Desktop element with ID 'desktop' not found for window ID: ${this.id}. Window will not be created.`);
            this.element = null;
            return;
        }
        console.log(`[SnugWindow] Desktop element (#desktop) found:`, desktopEl); // This log is present in your console output

        const defaultWidth = options.width || Math.min(350, desktopEl.offsetWidth - 40);
        const defaultHeight = options.height || Math.min(250, desktopEl.offsetHeight - 80);
        const taskbarHeightVal = document.getElementById('taskbar')?.offsetHeight || 30; // Use a sensible default

        // Ensure windows appear within a reasonable area
        const maxX = Math.max(5, desktopEl.offsetWidth - defaultWidth - 10);
        const maxY = Math.max(5, desktopEl.offsetHeight - defaultHeight - 10 - taskbarHeightVal);

        // Calculate initial position, allowing for cascading or specific placement
        let initialX = options.x;
        let initialY = options.y;

        if (initialX === undefined || initialY === undefined) {
            const openWindowCount = Object.keys(window.openWindows || {}).length;
            const cascadeOffset = 20 + (openWindowCount % 10) * 25; // Basic cascade
            initialX = Math.max(5, Math.min(cascadeOffset, maxX));
            initialY = Math.max(5, Math.min(cascadeOffset, maxY));
        } else {
            initialX = Math.max(5, Math.min(initialX, maxX));
            initialY = Math.max(5, Math.min(initialY, maxY));
        }


        this.options = {
            x: initialX,
            y: initialY,
            width: defaultWidth,
            height: defaultHeight,
            closable: true,
            minimizable: true,
            resizable: true, // Assuming windows are resizable by default
            ...options // User options override defaults
        };

        this.element = document.createElement('div');
        this.element.id = `window-${this.id}`;
        this.element.className = 'window'; // Ensure CSS for .window exists
        this.element.style.left = `${this.options.x}px`;
        this.element.style.top = `${this.options.y}px`;
        this.element.style.width = `${this.options.width}px`;
        this.element.style.height = `${this.options.height}px`;

        if (typeof window.highestZIndex === 'undefined' || window.highestZIndex === null || isNaN(parseInt(window.highestZIndex))) {
            console.warn('[SnugWindow] window.highestZIndex is invalid! Defaulting to 100 before incrementing.');
            window.highestZIndex = 100;
        }
        this.element.style.zIndex = options.zIndex !== undefined ? options.zIndex : ++window.highestZIndex;
        console.log(`[SnugWindow ${this.id}] Set zIndex to ${this.element.style.zIndex}. Current global highestZIndex: ${window.highestZIndex}`); // This log is present in your console output

        this.element.style.backgroundColor = `var(--window-bg, ${defaultWindowBg})`; // Uses CSS variable or default

        let buttonsHTML = '';
        if (this.options.minimizable) { buttonsHTML += `<button class="window-minimize-btn" title="Minimize">_</button>`; }
        // Add Maximize/Restore button if resizable
        if (this.options.resizable) { buttonsHTML += `<button class="window-maximize-btn" title="Maximize">□</button>`; }
        if (this.options.closable) { buttonsHTML += `<button class="window-close-btn" title="Close">X</button>`; }


        this.titleBar = document.createElement('div');
        this.titleBar.className = 'window-title-bar'; // Ensure CSS for .window-title-bar
        this.titleBar.innerHTML = `<span>${this.title}</span><div class="window-title-buttons">${buttonsHTML}</div>`;

        this.contentArea = document.createElement('div');
        this.contentArea.className = 'window-content'; // Ensure CSS for .window-content
        this.contentArea.style.backgroundColor = `var(--window-content-bg, ${defaultWindowContentBg})`;


        if (typeof contentHTMLOrElement === 'string') {
            this.contentArea.innerHTML = contentHTMLOrElement;
        } else if (contentHTMLOrElement instanceof HTMLElement) {
            this.contentArea.appendChild(contentHTMLOrElement);
        } else if (contentHTMLOrElement !== null && contentHTMLOrElement !== undefined) {
            console.warn(`[SnugWindow ${this.id}] Content is not a string or HTMLElement. Type: ${typeof contentHTMLOrElement}, Value:`, contentHTMLOrElement);
            this.contentArea.textContent = 'Invalid content provided.';
        }


        this.element.appendChild(this.titleBar);
        this.element.appendChild(this.contentArea);

        console.log(`[SnugWindow ${this.id}] Element constructed, about to append to desktopEl:`, this.element); // This log is present in your console output
        desktopEl.appendChild(this.element);

        if (typeof window.openWindows !== 'object' || window.openWindows === null) {
            console.warn('[SnugWindow] window.openWindows is not an object or is null! Initializing as {}.');
            window.openWindows = {};
        }
        window.openWindows[this.id] = this;
        console.log(`[SnugWindow ${this.id}] Window element appended and registered in window.openWindows.`); // This log is present in your console output


        this.makeDraggable();
        if (this.options.resizable) {
            this.makeResizable();
        }


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
        if (this.options.resizable) {
            const maxBtn = this.element.querySelector('.window-maximize-btn');
            if (maxBtn) maxBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMaximize(); });
            else console.warn(`[SnugWindow ${this.id}] Maximize button not found.`);
        }


        this.element.addEventListener('mousedown', () => this.focus(), true); // Capture phase to ensure focus happens first
        this.createTaskbarButton();

        if (options.isMinimized) {
            this.minimize(true); // true to skip undo capture for initial state
        }
        console.log(`[SnugWindow CONSTRUCTOR END] ID: ${id} successfully initialized.`); // This log is present in your console output
    }

    makeDraggable() {
        if (!this.titleBar) { console.warn(`[SnugWindow ${this.id}] Title bar not found for dragging.`); return; }
        let offsetX, offsetY, isDragging = false;
        const desktopEl = document.getElementById('desktop');
        let initialX, initialY;

        this.titleBar.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || !desktopEl) return;
            if (this.isMaximized) return; 

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
            const taskbarHeightVal = document.getElementById('taskbar')?.offsetHeight || 30;

            newX = Math.max(0, Math.min(newX, desktopRect.width - this.element.offsetWidth));
            newY = Math.max(0, Math.min(newY, desktopRect.height - this.element.offsetHeight - taskbarHeightVal));
            newY = Math.max(0, Math.min(newY, desktopRect.height - taskbarHeightVal - this.titleBar.offsetHeight));


            this.element.style.left = `${newX}px`;
            this.element.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                if (this.titleBar) this.titleBar.style.cursor = 'grab';
                document.body.style.userSelect = '';
                if (this.element.offsetLeft !== initialX || this.element.offsetTop !== initialY) {
                    if (typeof captureStateForUndo === 'function') captureStateForUndo(`Move window "${this.title}"`);
                }
            }
        });
    }

    makeResizable() {
        const resizer = document.createElement('div');
        resizer.className = 'window-resizer'; 
        this.element.appendChild(resizer);
        this.element.style.overflow = 'hidden'; 

        let initialWidth, initialHeight, initialMouseX, initialMouseY, isResizing = false;
        let originalStyleWidth, originalStyleHeight; // For undo

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            isResizing = true; this.focus();

            initialWidth = this.element.offsetWidth;
            initialHeight = this.element.offsetHeight;
            initialMouseX = e.clientX;
            initialMouseY = e.clientY;
            originalStyleWidth = this.element.style.width; 
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
            this.element.style.left = this.restoreState.left;
            this.element.style.top = this.restoreState.top;
            this.element.style.width = this.restoreState.width;
            this.element.style.height = this.restoreState.height;
            this.isMaximized = false;
            if (this.titleBar.querySelector('.window-maximize-btn')) this.titleBar.querySelector('.window-maximize-btn').innerHTML = '□';
            if (typeof captureStateForUndo === 'function') captureStateForUndo(`Restore window "${this.title}"`);
        } else {
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
            if (this.titleBar.querySelector('.window-maximize-btn')) this.titleBar.querySelector('.window-maximize-btn').innerHTML = '❐';
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
            this.element.classList.add('minimized');
            if (this.taskbarButton) {
                this.taskbarButton.classList.add('minimized-on-taskbar');
                this.taskbarButton.classList.remove('active');
            }
            if (!skipUndo && typeof captureStateForUndo === 'function') captureStateForUndo(`Minimize window "${this.title}"`);
            
            let nextHighestZ = -1;
            let windowToFocus = null;
            Object.values(window.openWindows).forEach(win => {
                if (win && win.element && !win.isMinimized && win.id !== this.id) { // Exclude the window being minimized
                    const z = parseInt(win.element.style.zIndex);
                    if (z > nextHighestZ) {
                        nextHighestZ = z;
                        windowToFocus = win;
                    }
                }
            });
            if (windowToFocus) windowToFocus.focus(true);
            else { // If no other window to focus, just update all taskbar buttons
                 Object.values(window.openWindows).forEach(win => win?.updateTaskbarButtonActiveState?.());
            }
        }
    }

    restore(skipUndo = false) {
        if (this.isMinimized && this.element) {
            this.isMinimized = false;
            this.element.classList.remove('minimized');
            this.focus(true); 
            if (!skipUndo && typeof captureStateForUndo === 'function') captureStateForUndo(`Restore window "${this.title}"`);
        } else if (this.element) {
            this.focus(skipUndo);
        }
    }

    close() {
        console.log(`[SnugWindow] Closing window: ${this.id} (${this.title})`);
        if (this.onCloseCallback && typeof this.onCloseCallback === 'function') {
            try { this.onCloseCallback(); }
            catch (e) { console.error(`[SnugWindow ${this.id}] Error in onCloseCallback:`, e); }
        }

        if (this.taskbarButton) {
             try { this.taskbarButton.remove(); } catch(e) { console.warn("Error removing taskbar button", e); }
        }
        if (this.element) {
            try { this.element.remove(); } catch(e) { console.warn("Error removing window element", e); }
        }


        const oldWindowTitle = this.title;
        if (window.openWindows && typeof window.openWindows === 'object') {
            delete window.openWindows[this.id];
        } else {
            console.warn(`[SnugWindow ${this.id}] window.openWindows not available for cleanup during close.`);
        }

        const trackIdStr = this.id.split('-')[1];
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
        // Only capture undo if the window wasn't closed as part of a larger reconstructDAW operation
        // This usually means it's a direct user action.
        // This is a heuristic; a more robust way would be to pass a flag.
        if (typeof captureStateForUndo === 'function' && !window.isReconstructingDAW) {
            captureStateForUndo(`Close window "${oldWindowTitle}"`);
        }
    }

    focus(skipUndo = false) { 
        if (this.isMinimized) { this.restore(skipUndo); return; }
        if (!this.element) {
            console.warn(`[SnugWindow ${this.id}] Focus called but element is null.`);
            return;
        }
        
        const currentZ = parseInt(this.element.style.zIndex);
        // Only increment if it's not already the top window
        if (currentZ < window.highestZIndex || Object.keys(window.openWindows).length === 1) {
             if (typeof window.highestZIndex === 'undefined' || window.highestZIndex === null || isNaN(parseInt(window.highestZIndex))) {
                 console.warn('[SnugWindow Focus] window.highestZIndex is invalid! Defaulting to 100 before increment.');
                 window.highestZIndex = 100;
            }
            this.element.style.zIndex = ++window.highestZIndex;
            console.log(`[SnugWindow ${this.id}] Focused. New zIndex: ${this.element.style.zIndex}. Global highestZIndex: ${window.highestZIndex}`);
        } else if (currentZ > window.highestZIndex) { // Should not happen, but reset if it does
            window.highestZIndex = currentZ;
            console.warn(`[SnugWindow ${this.id}] Focused, but its zIndex ${currentZ} was already higher than global highestZIndex ${window.highestZIndex-1}. Adjusted global highestZIndex.`);
        }


        if (window.openWindows && typeof window.openWindows === 'object') {
            Object.values(window.openWindows).forEach(win => {
                if (win && win.taskbarButton && typeof win.updateTaskbarButtonActiveState === 'function') {
                    win.updateTaskbarButtonActiveState();
                }
            });
        }
    }

    applyState(state) { // Used during project load/undo/redo
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
            this.minimize(true); // true for skipUndo
        } else if (!state.isMinimized && this.isMinimized) {
            this.restore(true); // true for skipUndo
        }
        this.updateTaskbarButtonActiveState();
    }
}