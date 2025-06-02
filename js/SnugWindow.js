// js/SnugWindow.js - SnugWindow Class Module

import { createContextMenu } from './utils.js';

export class SnugWindow {
    constructor(id, title, contentHTMLOrElement, options = {}, appServices = {}) {
        this.id = id;
        this.title = title;
        this.isMinimized = false;
        this.initialContentKey = options.initialContentKey || id;
        this.taskbarButton = null;
        this.onCloseCallback = options.onCloseCallback || (() => {});
        this.onFocusCallback = options.onFocusCallback || (() => {});
        this.isMaximized = false;
        this.restoreState = {}; // Stores { x, y, width, height } before maximizing
        this.appServices = appServices || {}; 
        this._isDragging = false; 
        this._isResizing = false; 

        // Store the initial options for reference, especially for recreating the window
        // We will update x, y, width, height in this.options upon successful drag/resize
        this.options = { ...options }; 

        console.log(`[SnugWindow ${this.id} Constructor] Initializing window "${title}". Options:`, JSON.parse(JSON.stringify(options)));

        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop');
        if (!desktopEl) {
            console.error(`[SnugWindow CRITICAL ${this.id}] Desktop element not found. Cannot create window "${title}".`);
            this.element = null; 
            return; 
        }

        const desktopRect = desktopEl.getBoundingClientRect();
        const taskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar');
        const taskbarHeight = taskbarEl?.offsetHeight || 32;

        this.width = parseInt(options.width, 10) || 400;
        this.height = parseInt(options.height, 10) || 300;
        this.minWidth = parseInt(options.minWidth, 10) || 150;
        this.minHeight = parseInt(options.minHeight, 10) || 100;

        const maxX = Math.max(0, desktopRect.width - this.width);
        const maxY = Math.max(0, desktopRect.height - this.height - taskbarHeight);

        this.x = options.x !== undefined ? Math.min(maxX, Math.max(0, parseInt(options.x, 10))) : Math.max(0, (desktopRect.width - this.width) / 2 + (Math.random() * 100 - 50));
        this.y = options.y !== undefined ? Math.min(maxY, Math.max(taskbarHeight, parseInt(options.y, 10))) : Math.max(taskbarHeight, (desktopRect.height - this.height) / 2 + (Math.random() * 100 - 50));
        
        // Update options with calculated initial positions if they weren't explicitly set
        if (options.x === undefined) this.options.x = this.x;
        if (options.y === undefined) this.options.y = this.y;
        this.options.width = this.width; // Ensure options reflects actual applied width/height
        this.options.height = this.height;


        this.element = document.createElement('div');
        this.element.className = 'window';
        this.element.id = this.id;
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
        this.element.style.width = `${this.width}px`;
        this.element.style.height = `${this.height}px`;
        this.element.style.minWidth = `${this.minWidth}px`;
        this.element.style.minHeight = `${this.minHeight}px`;


        this.titleBar = document.createElement('div');
        this.titleBar.className = 'window-title-bar';
        const titleSpan = document.createElement('span');
        titleSpan.textContent = title;
        this.titleBar.appendChild(titleSpan);

        const controls = document.createElement('div');
        controls.className = 'window-controls';

        if (options.minimizable !== false) {
            const minButton = document.createElement('button');
            minButton.innerHTML = '&#xE921;'; // Minimize symbol (Windows icon font)
            minButton.title = "Minimize";
            minButton.onclick = (e) => { e.stopPropagation(); this.minimize(); };
            controls.appendChild(minButton);
        }

        if (options.maximizable !== false) {
            const maxButton = document.createElement('button');
            maxButton.innerHTML = '&#xE922;'; // Maximize symbol
            maxButton.title = "Maximize";
            maxButton.onclick = (e) => { e.stopPropagation(); this.toggleMaximize(); };
            controls.appendChild(maxButton);
        }


        if (options.closable !== false) {
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '&#xE8BB;'; // Close symbol
            closeButton.className = 'close-btn';
            closeButton.title = "Close";
            closeButton.onclick = (e) => { e.stopPropagation(); this.close(); };
            controls.appendChild(closeButton);
        }

        this.titleBar.appendChild(controls);
        this.element.appendChild(this.titleBar);

        this.contentArea = document.createElement('div');
        this.contentArea.className = 'window-content';

        if (typeof contentHTMLOrElement === 'string') {
            this.contentArea.innerHTML = contentHTMLOrElement;
        } else if (contentHTMLOrElement instanceof HTMLElement) {
            this.contentArea.appendChild(contentHTMLOrElement);
        }
        this.element.appendChild(this.contentArea);

        if (options.resizable !== false) this.createResizeHandles();

        desktopEl.appendChild(this.element);
        this.makeDraggable();
        this.focus();

        this.element.addEventListener('mousedown', () => this.focus(), true); // Capture phase to focus before other actions

        if (this.appServices.addWindowToStore) {
            this.appServices.addWindowToStore(this.id, this);
        }
        this.createTaskbarButton();

        if (options.isMinimized) {
            this.minimize(true); // Apply initial minimized state silently
        }
        if (options.isMaximized) {
            // Apply initial maximized state silently after a brief delay to ensure element is in DOM
            setTimeout(() => this.maximize(true), 0);
        }
         if (Number.isFinite(options.zIndex)) {
            this.element.style.zIndex = options.zIndex;
        }


        console.log(`[SnugWindow ${this.id} Constructor] Calculated final this.options:`, JSON.parse(JSON.stringify(this.options)));

    }

    createResizeHandles() {
        const handles = {
            'se': { cursor: 'nwse-resize', bottom: '0px', right: '0px' },
            'sw': { cursor: 'nesw-resize', bottom: '0px', left: '0px' },
            'ne': { cursor: 'nesw-resize', top: '0px', right: '0px' },
            'nw': { cursor: 'nwse-resize', top: '0px', left: '0px' },
            'n': { cursor: 'ns-resize', top: '0px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 16px)', height: '8px', background: 'none' },
            's': { cursor: 'ns-resize', bottom: '0px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 16px)', height: '8px', background: 'none' },
            'e': { cursor: 'ew-resize', top: '50%', right: '0px', transform: 'translateY(-50%)', height: 'calc(100% - 16px)', width: '8px', background: 'none' },
            'w': { cursor: 'ew-resize', top: '50%', left: '0px', transform: 'translateY(-50%)', height: 'calc(100% - 16px)', width: '8px', background: 'none' },
        };

        for (const edge in handles) {
            const handle = document.createElement('div');
            handle.className = `window-resize-handle resize-handle-${edge}`;
            Object.assign(handle.style, handles[edge]);
            this.element.appendChild(handle);
            this.makeResizable(handle, edge);
        }
    }
    
    makeDraggable() {
        let offsetX, offsetY;
        const onMouseDown = (e) => {
            // Only drag if mousedown is directly on the title bar, not on its buttons
            if (e.target !== this.titleBar && e.target.parentElement !== this.titleBar && e.target.parentElement.parentElement !== this.titleBar) {
                 if (!e.target.classList.contains('window-title-bar') && !e.target.parentElement.classList.contains('window-title-bar')) {
                    return;
                }
            }
            if (this.isMaximized) return; // Don't drag if maximized

            this._isDragging = true;
            this.element.classList.add('dragging'); // Optional: for styling while dragging

            offsetX = e.clientX - this.element.offsetLeft;
            offsetY = e.clientY - this.element.offsetTop;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            this.focus(); // Bring to front on drag start
        };

        const onMouseMove = (e) => {
            if (!this._isDragging) return;
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            const desktopRect = this.element.parentElement.getBoundingClientRect();
            const taskbarHeight = document.getElementById('taskbar')?.offsetHeight || 32;

            newX = Math.max(0, Math.min(newX, desktopRect.width - this.element.offsetWidth));
            newY = Math.max(taskbarHeight, Math.min(newY, desktopRect.height - this.element.offsetHeight - taskbarHeight));

            this.x = newX;
            this.y = newY;
            this.element.style.left = `${this.x}px`;
            this.element.style.top = `${this.y}px`;
        };

        const onMouseUp = () => {
            if (!this._isDragging) return;
            this._isDragging = false;
            this.element.classList.remove('dragging');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            // MODIFICATION START: Update options with new position
            this.options.x = this.x;
            this.options.y = this.y;
            // MODIFICATION END
        };
        this.titleBar.addEventListener('mousedown', onMouseDown);
    }

    makeResizable(handle, edge) {
        let initialX, initialY, initialWidth, initialHeight;

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.isMaximized) return; // Don't resize if maximized

            this._isResizing = true;
            initialX = this.element.offsetLeft;
            initialY = this.element.offsetTop;
            initialWidth = this.element.offsetWidth;
            initialHeight = this.element.offsetHeight;
            const startMouseX = e.clientX;
            const startMouseY = e.clientY;
            this.focus();

            const onMouseMove = (moveEvent) => {
                if(!this._isResizing) return;
                const dx = moveEvent.clientX - startMouseX;
                const dy = moveEvent.clientY - startMouseY;
                let newWidth = initialWidth;
                let newHeight = initialHeight;
                let newX = initialX;
                let newY = initialY;

                if (edge.includes('e')) newWidth = Math.max(this.minWidth, initialWidth + dx);
                if (edge.includes('s')) newHeight = Math.max(this.minHeight, initialHeight + dy);
                if (edge.includes('w')) {
                    newWidth = Math.max(this.minWidth, initialWidth - dx);
                    if (newWidth > this.minWidth || dx < 0) { // Allow shrinking only if not at minWidth or if dx indicates growth
                         newX = initialX + dx;
                    } else { // Pin to initialX if shrinking past minWidth
                        newWidth = this.minWidth; // This ensures it doesn't go below minWidth due to X changing
                        newX = initialX + (initialWidth - this.minWidth);
                    }
                }
                if (edge.includes('n')) {
                    newHeight = Math.max(this.minHeight, initialHeight - dy);
                     if (newHeight > this.minHeight || dy < 0) {
                        newY = initialY + dy;
                    } else {
                        newHeight = this.minHeight;
                        newY = initialY + (initialHeight - this.minHeight);
                    }
                }
                // Boundary checks (ensure window does not go off-screen or behind taskbar)
                const desktopRect = this.element.parentElement.getBoundingClientRect();
                const taskbarHeight = document.getElementById('taskbar')?.offsetHeight || 32;

                if (newX < 0) { newWidth += newX; newX = 0; }
                if (newY < taskbarHeight) { newHeight -= (taskbarHeight - newY); newY = taskbarHeight; }
                if (newX + newWidth > desktopRect.width) newWidth = desktopRect.width - newX;
                if (newY + newHeight > desktopRect.height - taskbarHeight) newHeight = desktopRect.height - taskbarHeight - newY;


                this.element.style.width = `${Math.max(this.minWidth, newWidth)}px`;
                this.element.style.height = `${Math.max(this.minHeight, newHeight)}px`;
                this.element.style.left = `${newX}px`;
                this.element.style.top = `${newY}px`;
            };

            const onMouseUp = () => {
                this._isResizing = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                // MODIFICATION START: Update options with new geometry
                this.x = parseInt(this.element.style.left, 10);
                this.y = parseInt(this.element.style.top, 10);
                this.width = parseInt(this.element.style.width, 10);
                this.height = parseInt(this.element.style.height, 10);
                this.options.x = this.x;
                this.options.y = this.y;
                this.options.width = this.width;
                this.options.height = this.height;
                // MODIFICATION END
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    focus() {
        if (this.appServices.getHighestZ && this.appServices.incrementHighestZ) {
            const currentHighestZ = this.appServices.getHighestZ();
            if (parseInt(this.element.style.zIndex) < currentHighestZ || !this.element.style.zIndex) {
                this.element.style.zIndex = this.appServices.incrementHighestZ();
                console.log(`[SnugWindow ${this.id}] Focused. New z-index: ${this.element.style.zIndex}`);
            }
        }
        if (this.taskbarButton) {
            document.querySelectorAll('#taskbarButtons button.active').forEach(btn => btn.classList.remove('active'));
            this.taskbarButton.classList.add('active');
        }
        if (this.onFocusCallback) {
            this.onFocusCallback(this.id);
        }
    }

    close(isReconstruction = false) {
        console.log(`[SnugWindow ${this.id}] close() called for "${this.title}". IsReconstruction: ${isReconstruction}`);
        if (this.element && this.element.parentElement) {
            this.element.parentElement.removeChild(this.element);
        }
        if (this.taskbarButton && this.taskbarButton.parentElement) {
            this.taskbarButton.parentElement.removeChild(this.taskbarButton);
        }
        if (this.appServices.removeWindowFromStore) {
            this.appServices.removeWindowFromStore(this.id);
        }
        if (this.onCloseCallback && !isReconstruction) { // Only call callback if not part of reconstruction
            this.onCloseCallback(this.id);
        }
         // If not part of reconstruction (e.g. user closed it), and captureStateForUndo is available, call it.
        if (!isReconstruction && this.appServices.captureStateForUndo) {
            this.appServices.captureStateForUndo(`Close window "${this.title}"`);
        }
        console.log(`[SnugWindow ${this.id}] close() finished for "${this.title}".`);
    }

    minimize(silent = false) { // silent flag to prevent undo capture during reconstruction
        if (this.isMaximized) this.toggleMaximize(true); // Restore before minimizing if maximized
        this.element.style.display = 'none';
        this.isMinimized = true;
        if (this.taskbarButton) this.taskbarButton.classList.remove('active');
        if (!silent && this.appServices.captureStateForUndo) {
             this.appServices.captureStateForUndo(`Minimize window "${this.title}"`);
        }
    }

    restore() {
        this.element.style.display = 'flex';
        this.isMinimized = false;
        this.focus(); // This will also set taskbar button to active
    }

    toggleMaximize(silent = false) {
        const desktop = this.element.parentElement;
        const taskbar = document.getElementById('taskbar');
        const taskbarHeight = taskbar ? taskbar.offsetHeight : 0;

        if (this.isMaximized) {
            // Restore
            this.element.style.left = this.restoreState.x;
            this.element.style.top = this.restoreState.y;
            this.element.style.width = this.restoreState.width;
            this.element.style.height = this.restoreState.height;
            this.isMaximized = false;
            if (!silent && this.appServices.captureStateForUndo) this.appServices.captureStateForUndo(`Restore window "${this.title}"`);
        } else {
            // Maximize
            this.restoreState = {
                x: this.element.style.left,
                y: this.element.style.top,
                width: this.element.style.width,
                height: this.element.style.height,
            };
            this.element.style.left = '0px';
            this.element.style.top = `${taskbarHeight}px`;
            this.element.style.width = `${desktop.clientWidth}px`;
            this.element.style.height = `${desktop.clientHeight - taskbarHeight}px`;
            this.isMaximized = true;
            if (!silent && this.appServices.captureStateForUndo) this.appServices.captureStateForUndo(`Maximize window "${this.title}"`);
        }
        this.focus();
    }

    createTaskbarButton() {
        const taskbarButtonsDiv = this.appServices.uiElementsCache?.taskbarButtons || document.getElementById('taskbarButtons');
        if (!taskbarButtonsDiv) {
            console.warn(`[SnugWindow ${this.id}] Taskbar buttons container not found. Cannot create taskbar button for "${this.title}".`);
            return;
        }
        this.taskbarButton = document.createElement('button');
        this.taskbarButton.textContent = this.title.substring(0,20) + (this.title.length > 20 ? '...' : '');
        this.taskbarButton.title = this.title;
        this.taskbarButton.onclick = () => {
            if (this.isMinimized) {
                this.restore();
            } else {
                this.focus();
            }
        };
        this.taskbarButton.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            createContextMenu(e, [
                {label: this.isMinimized ? "Restore" : "Minimize", action: () => this.isMinimized ? this.restore() : this.minimize()},
                {label: this.isMaximized ? "Restore Down" : "Maximize", action: () => this.toggleMaximize()},
                {separator: true},
                {label: "Close", action: () => this.close()}
            ], this.appServices);
        };
        taskbarButtonsDiv.appendChild(this.taskbarButton);
    }
    
    // For reconstructing window state (e.g., from saved project or undo/redo)
    applyState(state) {
        if (!this.element) {
            console.error(`[SnugWindow ${this.id} applyState] Window element does not exist. Cannot apply state for "${state?.title}".`);
            return;
        }
        if (!state) {
            console.error(`[SnugWindow ${this.id} applyState] Invalid or null state object provided.`);
            return;
        }

        console.log(`[SnugWindow ${this.id} applyState] Applying state:`, JSON.parse(JSON.stringify(state)));

        if (state.left) this.element.style.left = state.left;
        if (state.top) this.element.style.top = state.top;
        if (state.width) this.element.style.width = state.width;
        if (state.height) this.element.style.height = state.height;
        if (Number.isFinite(state.zIndex)) this.element.style.zIndex = state.zIndex;

        if (this.titleBar) {
            const titleSpan = this.titleBar.querySelector('span');
            if (titleSpan && state.title) titleSpan.textContent = state.title;
        }
        if (state.title) this.title = state.title;

        if (this.taskbarButton && state.title) {
            this.taskbarButton.textContent = state.title.substring(0, 20) + (state.title.length > 20 ? '...' : '');
            this.taskbarButton.title = state.title;
        }

        // Handle minimized/maximized state carefully
        if (state.isMaximized && !this.isMaximized) {
             // If maximizing, store current (pre-maximized) state if not already stored by a manual maximize
            if (!this.restoreState.width) { // A simple check if restoreState is empty
                this.restoreState = {
                    x: this.element.style.left, y: this.element.style.top,
                    width: this.element.style.width, height: this.element.style.height,
                };
            }
            if (state.restoreState && Object.keys(state.restoreState).length > 0) { // If saved state has restoreState, use it
                this.restoreState = JSON.parse(JSON.stringify(state.restoreState));
            }
            this.maximize(true); // true for silent
        } else if (!state.isMaximized && this.isMaximized) { // If it was maximized but should now be restored
            this.toggleMaximize(true); // true for silent
        }


        if (state.isMinimized && !this.isMinimized) {
            this.minimize(true); // true for silent (no undo capture)
        } else if (!state.isMinimized && this.isMinimized) {
            this.restore(); 
        }
        // Ensure options are also updated to reflect the restored state
        this.options.x = parseInt(this.element.style.left, 10);
        this.options.y = parseInt(this.element.style.top, 10);
        this.options.width = parseInt(this.element.style.width, 10);
        this.options.height = parseInt(this.element.style.height, 10);
        this.options.zIndex = parseInt(this.element.style.zIndex, 10);
        this.options.isMinimized = this.isMinimized;
        this.options.isMaximized = this.isMaximized;
        if (this.isMaximized) this.options.restoreState = JSON.parse(JSON.stringify(this.restoreState));

    }
}
