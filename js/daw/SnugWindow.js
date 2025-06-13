// js/daw/SnugWindow.js - SnugWindow Class Module

// Removed import { createContextMenu } from './utils.js'; as createContextMenu is global

export class SnugWindow { // This class is exported
    constructor(id, title, contentHTMLOrElement, options = {}, appServices = {}) {
        // --- DEBUGGING LOG ---
        console.log(`%c[SnugWindow.js] Constructor for window "${id}" received options:`, 'color: #9b59b6; font-weight: bold;', JSON.parse(JSON.stringify(options)));

        this.id = id;
        this.title = title;
        this.isMinimized = false;
        this.initialContentKey = options.initialContentKey || id;
        this.taskbarButton = null;
        this.onCloseCallback = options.onCloseCallback || (() => {});
        this.onRefreshCallback = options.onRefresh || null;
        this.isMaximized = false;
        this.restoreState = {}; // To store position/size when maximized or minimized
        this.appServices = appServices; // Ensure appServices is assigned
        this._isDragging = false; 
        this._isResizing = false;

        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop');
        if (!desktopEl) {
            console.error(`[SnugWindow CRITICAL ${this.id}] Desktop element not found. Cannot create window \"${title}\".`);
            this.element = null; 
            return; 
        }

        const taskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar');
        const taskbarHeightVal = taskbarEl?.offsetHeight > 0 ? taskbarEl.offsetHeight : 32;

        this.options = {
            width: options.width || 400,
            height: options.height || 300,
            x: options.x === undefined ? (desktopEl.offsetWidth - (options.width || 400)) / 2 : options.x,
            y: options.y === undefined ? (desktopEl.offsetHeight - (options.height || 300)) / 2 : options.y,
            minWidth: options.minWidth || 150,
            minHeight: options.minHeight || 100,
        };

        this.element = document.createElement('div');
        this.element.className = 'window';
        this.element.id = this.id;

        this.titleBar = this.createTitleBar(title);
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'window-content';

        if (typeof contentHTMLOrElement === 'string') {
            this.contentContainer.innerHTML = contentHTMLOrElement;
        } else if (contentHTMLOrElement instanceof HTMLElement) {
            this.contentContainer.appendChild(contentHTMLOrElement);
        }

        this.element.appendChild(this.titleBar);
        this.element.appendChild(this.contentContainer);
        this.element.appendChild(this.createResizeHandle()); // Add resize handle here

        this.applyStyles(desktopEl, taskbarHeightVal);
        this.createTaskbarButton();

        desktopEl.appendChild(this.element);

        this.makeDraggable();
        this.makeResizable(); // Now this method will have functionality

        this.element.addEventListener('mousedown', () => this.focus());

        // addWindowToStore is global
        this.appServices.addWindowToStore(this.id, this);
        this.focus();
    }
    
    refresh() {
        if (typeof this.onRefreshCallback === 'function') {
            this.onRefreshCallback(this);
        }
    }

    createTitleBar(title) {
        const titleBar = document.createElement('div');
        titleBar.className = 'window-title-bar';
        titleBar.innerHTML = `<span>${title}</span>
            <div class="window-title-buttons">
                <button class="minimize-btn" title="Minimize">_</button>
                <button class="maximize-btn" title="Maximize">□</button>
                <button class="close-btn" title="Close">X</button>
            </div>`;
        
        titleBar.querySelector('.close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });
        titleBar.querySelector('.minimize-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.minimize();
        });
        titleBar.querySelector('.maximize-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMaximize();
        });
        return titleBar;
    }

    createResizeHandle() {
        const resizer = document.createElement('div');
        resizer.className = 'window-resizer'; // Your existing CSS class
        return resizer;
    }

    applyStyles(desktopEl, taskbarHeight) {
        // Ensure initial position is within bounds
        let initialX = this.options.x;
        let initialY = this.options.y;

        // Clamp to desktop bounds (considering taskbar height)
        const maxX = desktopEl.offsetWidth - this.options.width;
        const maxY = desktopEl.offsetHeight - taskbarHeight - this.options.height; // Account for bottom taskbar

        initialX = Math.max(0, Math.min(initialX, maxX));
        initialY = Math.max(0, Math.min(initialY, maxY));

        Object.assign(this.element.style, {
            width: `${this.options.width}px`,
            height: `${this.options.height}px`,
            left: `${initialX}px`,
            top: `${initialY}px`,
            minWidth: `${this.options.minWidth}px`,
            minHeight: `${this.options.minHeight}px`,
        });
    }

    createTaskbarButton() {
        const container = document.getElementById('taskbarButtons');
        if (!container) return;
        this.taskbarButton = document.createElement('button');
        this.taskbarButton.className = 'taskbar-button';
        this.taskbarButton.id = `taskbar-btn-${this.id}`;
        this.taskbarButton.textContent = this.title.substring(0, 20) + (this.title.length > 20 ? '...' : '');
        this.taskbarButton.title = this.title;
        this.taskbarButton.addEventListener('click', () => {
            if (this.isMinimized) {
                this.restore();
            } else if (this.element.style.zIndex === this.appServices.getHighestZ().toString()) {
                // If it's already focused, minimize it
                this.minimize();
            } else {
                // If it's not focused, bring it to front
                this.focus();
            }
        });
        this.taskbarButton.addEventListener('contextmenu', (e) => this.showTaskbarContextMenu(e));
        container.appendChild(this.taskbarButton);
    }

    makeDraggable() {
        let offsetX, offsetY;
        const onMouseMove = (e) => {
            if (!this._isDragging || this.isMaximized) return; // Prevent dragging when maximized
            this.element.style.left = `${e.clientX - offsetX}px`;
            this.element.style.top = `${e.clientY - offsetY}px`;
        };
        const onMouseUp = () => {
            this._isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            this.titleBar.style.cursor = 'grab'; // Restore cursor
        };
        this.titleBar.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || this.isMaximized) return; // Prevent dragging when maximized
            this._isDragging = true;
            offsetX = e.clientX - this.element.offsetLeft;
            offsetY = e.clientY - this.element.offsetTop;
            this.titleBar.style.cursor = 'grabbing'; // Change cursor during drag
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
    
    makeResizable() {
        const resizer = this.element.querySelector('.window-resizer');
        if (!resizer) return;

        let startX, startY, startWidth, startHeight, startLeft, startTop;

        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop');
        const taskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar');
        const taskbarHeight = taskbarEl?.offsetHeight > 0 ? taskbarEl.offsetHeight : 32;

        const onMouseMove = (e) => {
            if (!this._isResizing || this.isMaximized) return; // Prevent resizing when maximized

            let newWidth = startWidth + (e.clientX - startX);
            let newHeight = startHeight + (e.clientY - startY);

            // Clamp width/height to min/max
            newWidth = Math.max(newWidth, this.options.minWidth);
            newHeight = Math.max(newHeight, this.options.minHeight);

            // Prevent resizing outside desktop bounds
            newWidth = Math.min(newWidth, desktopEl.offsetWidth - startLeft);
            newHeight = Math.min(newHeight, desktopEl.offsetHeight - taskbarHeight - startTop);

            this.element.style.width = `${newWidth}px`;
            this.element.style.height = `${newHeight}px`;
        };

        const onMouseUp = () => {
            this._isResizing = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            resizer.style.cursor = 'nwse-resize'; // Restore cursor
        };

        resizer.addEventListener('mousedown', (e) => {
            if (this.isMaximized) return; // Prevent resizing when maximized
            e.preventDefault();
            this._isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = this.element.offsetWidth;
            startHeight = this.element.offsetHeight;
            startLeft = this.element.offsetLeft;
            startTop = this.element.offsetTop;

            resizer.style.cursor = 'grabbing'; // Change cursor during resize
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    focus() {
        // incrementHighestZ is global
        const newZ = this.appServices.incrementHighestZ();
        this.element.style.zIndex = newZ;
        document.querySelectorAll('.taskbar-button').forEach(btn => btn.classList.remove('active'));
        this.taskbarButton?.classList.add('active');
    }

    close(isSilent = false) {
        if (!isSilent && this.onCloseCallback) {
            this.onCloseCallback(this.id);
        }
        this.element?.remove();
        this.taskbarButton?.remove();
        // removeWindowFromStore is global
        this.appServices.removeWindowFromStore(this.id);
    }

    minimize(isSilent = false) {
        if (this.isMaximized) {
            // If maximized, first restore to original size before minimizing
            this.toggleMaximize();
        }
        this.isMinimized = true;
        this.element.style.display = 'none';
        this.taskbarButton?.classList.add('minimized-on-taskbar');
        this.taskbarButton?.classList.remove('active');
        // If this window was focused, find another window to focus (or none)
        const openWindows = Array.from(this.appServices.getOpenWindows().values());
        if (openWindows.length > 0) {
            // Find the highest z-index among visible windows and focus it
            let highestZWindow = null;
            let maxZ = 0;
            openWindows.forEach(win => {
                if (!win.isMinimized && win.element && win.element.style.zIndex > maxZ) {
                    maxZ = win.element.style.zIndex;
                    highestZWindow = win;
                }
            });
            if (highestZWindow) {
                highestZWindow.focus();
            } else {
                // No other windows to focus, remove active state from all taskbar buttons
                document.querySelectorAll('.taskbar-button').forEach(btn => btn.classList.remove('active'));
            }
        }
    }

    restore() {
        this.isMinimized = false;
        this.element.style.display = 'flex';
        this.taskbarButton?.classList.remove('minimized-on-taskbar');
        this.focus();
    }
    
    toggleMaximize() {
        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop');
        const taskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar');
        const topTaskbarEl = this.appServices.uiElementsCache?.topTaskbar || document.getElementById('topTaskbar');

        const topTaskbarHeight = topTaskbarEl?.offsetHeight > 0 ? topTaskbarEl.offsetHeight : 40;
        const taskbarHeight = taskbarEl?.offsetHeight > 0 ? taskbarEl.offsetHeight : 32;

        if (this.isMaximized) {
            // Restore from maximized state
            this.element.style.left = `${this.restoreState.x}px`;
            this.element.style.top = `${this.restoreState.y}px`;
            this.element.style.width = `${this.restoreState.width}px`;
            this.element.style.height = `${this.restoreState.height}px`;
            this.isMaximized = false;
        } else {
            // Maximize
            this.restoreState = {
                x: this.element.offsetLeft,
                y: this.element.offsetTop,
                width: this.element.offsetWidth,
                height: this.element.offsetHeight,
            };
            this.element.style.left = '0px';
            this.element.style.top = `${topTaskbarHeight}px`; // Below top taskbar
            this.element.style.width = `${desktopEl.offsetWidth}px`;
            this.element.style.height = `${desktopEl.offsetHeight - topTaskbarHeight - taskbarHeight}px`;
            this.isMaximized = true;
        }
        this.focus(); // Bring to front after state change
        this.refresh(); // Trigger refresh for content that might need to adapt to new size
    }
    
    showTaskbarContextMenu(e) {
        e.preventDefault(); // Prevent default browser context menu
        const menuItems = [
            { label: 'Minimize', action: () => this.minimize() },
            { label: 'Maximize', action: () => this.toggleMaximize() },
            { label: 'Close', action: () => this.close() }
        ];
        // createContextMenu is global
        this.appServices.createContextMenu(e, menuItems, this.appServices);
    }

    // NEW: Method to get the current state of the window for serialization/restoration
    getWindowState() { // Export removed
        return {
            x: this.element.offsetLeft,
            y: this.element.offsetTop,
            width: this.element.offsetWidth,
            height: this.element.offsetHeight,
            isMinimized: this.isMinimized,
            isMaximized: this.isMaximized,
            // Add other state properties you want to persist/restore here if necessary
            // For example, if you want to store the restoreState when minimized but not maximized:
            restoreState: this.isMaximized ? this.restoreState : undefined,
        };
    }
}
