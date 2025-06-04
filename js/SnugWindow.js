// js/SnugWindow.js - SnugWindow Class Module

import { createContextMenu } from './utils.js'; // Assuming utils.js is in the same root js/ folder

export class SnugWindow {
    constructor(id, title, contentHTMLOrElement, options = {}, appServices = {}) {
        // console.log(`[SnugWindow ${id} CONSTRUCTOR START] Title: "${title}", Options:`, JSON.parse(JSON.stringify(options))); // Already good
        this.id = id;
        this.title = title;
        this.isMinimized = false;
        this.initialContentKey = options.initialContentKey || id;
        this.taskbarButton = null;
        this.onCloseCallback = options.onCloseCallback || (() => {});
        this.isMaximized = false;
        this.restoreState = {};
        this.appServices = appServices || {};
        // console.log(`[SnugWindow ${id}] appServices received. Keys: ${Object.keys(this.appServices).join(', ')}`); // Already good

        this._isDragging = false;
        this._isResizing = false;
        // ... (rest of constructor properties as in your file) ...
        this._initialMouseX = 0;
        this._initialMouseY = 0;
        this._initialWindowX = 0;
        this._initialWindowY = 0;
        this._initialWidth = 0;
        this._initialHeight = 0;


        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop');
        if (!desktopEl) {
            const errorMsg = `[SnugWindow CRITICAL ${id}] Desktop element (#desktop) not found. Cannot create window "${title}".`;
            console.error(errorMsg);
            this.element = null;
            if(this.appServices.showNotification) this.appServices.showNotification(errorMsg, "error", 0); else alert(errorMsg + " Window will not be created. Check console.");
            return;
        }
        // console.log(`[SnugWindow ${id}] Desktop element found:`, desktopEl); // Already good

        // ... (rest of constructor logic for dimensions, positioning, element creation from your SnugWindow.js) ...
        const bottomTaskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar');
        const bottomTaskbarHeight = bottomTaskbarEl?.offsetHeight > 0 ? bottomTaskbarEl.offsetHeight : 32;
        const topTaskbarEl = this.appServices.uiElementsCache?.topTaskbar || document.getElementById('topTaskbar');
        const topTaskbarHeight = topTaskbarEl?.offsetHeight > 0 ? topTaskbarEl.offsetHeight : 32;
        const safeDesktopWidth = (desktopEl.offsetWidth > 0) ? desktopEl.offsetWidth : 1024;
        const safeDesktopHeight = (desktopEl.offsetHeight > 0) ? desktopEl.offsetHeight : 768;
        const usableDesktopHeight = safeDesktopHeight - topTaskbarHeight - bottomTaskbarHeight;

        const optMinWidth = parseFloat(options.minWidth);
        const optMinHeight = parseFloat(options.minHeight);
        const minW = Number.isFinite(optMinWidth) && optMinWidth > 50 ? optMinWidth : 150;
        const minH = Number.isFinite(optMinHeight) && optMinHeight > 50 ? optMinHeight : 100;

        let optWidth = parseFloat(options.width);
        let optHeight = parseFloat(options.height);
        let optX = parseFloat(options.x);
        let optY = parseFloat(options.y);
        let w, h, x, y;

        if (Number.isFinite(optWidth) && optWidth >= minW) { w = Math.min(optWidth, safeDesktopWidth - 10); }
        else { w = Math.max(minW, Math.min(350, safeDesktopWidth - 20)); }
        w = Math.max(minW, w);

        if (Number.isFinite(optHeight) && optHeight >= minH) { h = Math.min(optHeight, usableDesktopHeight - 10); }
        else { h = Math.max(minH, Math.min(250, usableDesktopHeight - 20)); }
        h = Math.max(minH, h);

        const maxX = Math.max(5, safeDesktopWidth - w - 5);
        const titleBarHeightForMaxYEst = 30; 
        const maxYWindowBottom = topTaskbarHeight + usableDesktopHeight - h - 5;
        const maxYTitleBar = topTaskbarHeight + usableDesktopHeight - titleBarHeightForMaxYEst - 5;
        const finalMaxY = Math.min(maxYWindowBottom, maxYTitleBar);
        
        const openWindowCount = this.appServices.getOpenWindowsState ? this.appServices.getOpenWindowsState().size : 0;
        const cascadeOffsetBase = 20;
        const cascadeIncrement = 25;
        const cascadeOffset = cascadeOffsetBase + (openWindowCount % 10) * cascadeIncrement;

        if (Number.isFinite(optX)) { x = Math.max(5, Math.min(optX, maxX)); }
        else { x = Math.max(5, Math.min(cascadeOffset, maxX)); }

        const minY = topTaskbarHeight + 5;
        if (Number.isFinite(optY)) { y = Math.max(minY, Math.min(optY, finalMaxY)); }
        else { y = Math.max(minY, Math.min(cascadeOffset + topTaskbarHeight, finalMaxY)); }

        this.options = {
            ...options,
            x: Number.isFinite(x) ? x : 50,
            y: Number.isFinite(y) ? y : (50 + topTaskbarHeight),
            width: (Number.isFinite(w) && w > 0) ? w : minW,
            height: (Number.isFinite(h) && h > 0) ? h : minH,
            minWidth: minW, minHeight: minH,
            closable: options.closable !== undefined ? options.closable : true,
            minimizable: options.minimizable !== undefined ? options.minimizable : true,
            resizable: options.resizable !== undefined ? options.resizable : true,
        };

        this.element = document.createElement('div');
        this.element.id = `window-${this.id}`;
        this.element.className = 'window';
        this.element.style.touchAction = 'none'; 

        this.element.style.left = `${this.options.x}px`;
        this.element.style.top = `${this.options.y}px`;
        this.element.style.width = `${this.options.width}px`;
        this.element.style.height = `${this.options.height}px`;

        let initialZIndex = 101; 
        if (Number.isFinite(parseFloat(options.zIndex))) {
            initialZIndex = parseFloat(options.zIndex);
        } else if (this.appServices.incrementHighestZState && typeof this.appServices.incrementHighestZState === 'function') {
            initialZIndex = this.appServices.incrementHighestZState();
        }
        this.element.style.zIndex = initialZIndex.toString();

        if (this.appServices.setHighestZState && typeof this.appServices.setHighestZState === 'function' &&
            this.appServices.getHighestZState && typeof this.appServices.getHighestZState === 'function' &&
            initialZIndex > this.appServices.getHighestZState()) {
            this.appServices.setHighestZState(initialZIndex);
        }

        this.titleBar = document.createElement('div');
        this.titleBar.className = 'window-title-bar';
        let buttonsHTML = '';
        if (this.options.minimizable) { buttonsHTML += `<button class="window-minimize-btn" title="Minimize"><i class="fas fa-window-minimize"></i></button>`; }
        if (this.options.resizable) { buttonsHTML += `<button class="window-maximize-btn" title="Maximize"><i class="far fa-square"></i></button>`; }
        if (this.options.closable) { buttonsHTML += `<button class="window-close-btn" title="Close"><i class="fas fa-times"></i></button>`; }
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = this.title;
        this.titleBar.appendChild(titleSpan);

        const titleButtonsDiv = document.createElement('div');
        titleButtonsDiv.className = 'window-title-buttons';
        titleButtonsDiv.innerHTML = buttonsHTML;
        this.titleBar.appendChild(titleButtonsDiv);

        this.contentArea = document.createElement('div');
        this.contentArea.className = 'window-content';
        if (typeof contentHTMLOrElement === 'string') { this.contentArea.innerHTML = contentHTMLOrElement; }
        else if (contentHTMLOrElement instanceof HTMLElement) { this.contentArea.appendChild(contentHTMLOrElement); }
        
        this.element.appendChild(this.titleBar);
        this.element.appendChild(this.contentArea);
        
        try {
            desktopEl.appendChild(this.element);
        } catch (e) { /* ... */ }
        
        if (this.appServices.addWindowToStoreState && typeof this.appServices.addWindowToStoreState === 'function') {
            this.appServices.addWindowToStoreState(this.id, this);
        }

        try {
            this._makeDraggable();
            if (this.options.resizable) {
                this._makeResizable();
            }
        } catch (interactionError) { /* ... */ }

        const closeBtn = this.element.querySelector('.window-close-btn');
        if (closeBtn && this.options.closable) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
        const minimizeBtn = this.element.querySelector('.window-minimize-btn');
        if (minimizeBtn && this.options.minimizable) minimizeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.minimize(); });
        const maximizeBtn = this.element.querySelector('.window-maximize-btn');
        if (maximizeBtn && this.options.resizable) maximizeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMaximize(); });
        
        titleButtonsDiv.querySelectorAll('button').forEach(button => {
            button.addEventListener('pointerdown', e => e.stopPropagation());
        });

        this.element.addEventListener('pointerdown', () => this.focus(), true);
        
        try {
            this.createTaskbarButton();
        } catch (taskbarError) { /* ... */ }
        
        if (this.options.isMinimized) this.minimize(true); 
        if (!this.options.isMinimized && !options.zIndex) this.focus();
        // console.log(`[SnugWindow ${id} CONSTRUCTOR END] Window "${title}" initialization finished.`); // Already good
    }

    _captureUndo(description) {
        if (this.appServices.captureStateForUndoInternal && typeof this.appServices.captureStateForUndoInternal === 'function') {
            this.appServices.captureStateForUndoInternal(description);
        }
    }

    _makeDraggable() { /* ... same as your uploaded file ... */ }
    _makeResizable() { /* ... same as your uploaded file ... */ }
    toggleMaximize() { /* ... same as your uploaded file ... */ }

    createTaskbarButton() {
        // Using appServices for uiElementsCache
        const taskbarContainer = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar');
        if (!taskbarContainer) {
             console.warn(`[SnugWindow ${this.id}] Taskbar container for buttons not found.`);
             return;
        }
        let taskbarButtonsContainer = taskbarContainer.querySelector('#taskbarButtons');
        if (!taskbarButtonsContainer) { // Create if not exists (from your SnugWindow.js)
            taskbarButtonsContainer = document.createElement('div');
            taskbarButtonsContainer.id = 'taskbarButtons';
            taskbarButtonsContainer.className = 'flex items-center h-full overflow-x-auto'; // Added from your index.html style
            const startButton = taskbarContainer.querySelector('#startMenuButton'); // Corrected ID
            if (startButton && startButton.nextSibling) {
                taskbarContainer.insertBefore(taskbarButtonsContainer, startButton.nextSibling);
            } else {
                taskbarContainer.appendChild(taskbarButtonsContainer);
            }
        }

        this.taskbarButton = document.createElement('button');
        this.taskbarButton.className = 'taskbar-button';
        this.taskbarButton.textContent = this.title.substring(0, 15) + (this.title.length > 15 ? '...' : '');
        this.taskbarButton.title = this.title;
        this.taskbarButton.dataset.windowId = this.id;
        taskbarButtonsContainer.appendChild(this.taskbarButton);

        this.taskbarButton.addEventListener('click', () => { /* ... same as your file ... */ });

        this.taskbarButton.addEventListener('contextmenu', (event) => {
            event.preventDefault(); event.stopPropagation();
            // ADDED LOG
            console.log(`[SnugWindow createTaskbarButton] Context menu event triggered for window: "${this.title}" (ID: ${this.id})`);
            
            const menuItems = [];
            if (this.isMinimized) menuItems.push({ label: "Restore", action: () => this.restore() });
            else menuItems.push({ label: "Minimize", action: () => this.minimize() });
            if (this.options.resizable) menuItems.push({ label: this.isMaximized ? "Restore Down" : "Maximize", action: () => this.toggleMaximize() });
            if (this.options.closable) menuItems.push({ label: "Close", action: () => this.close() });

            // Track-specific items (from your SnugWindow.js)
            if (this.appServices.getTrackById) {
                let trackId = null;
                const parts = this.id.split('-');
                if (parts.length > 1 && (this.id.startsWith('trackInspector-') || this.id.startsWith('effectsRack-') || this.id.startsWith('sequencerWin-') /* Adjusted for your ID pattern */)) {
                    const idPart = parts[parts.length - 1];
                    if (!isNaN(parseInt(idPart))) trackId = idPart; // Keep as string if IDs are strings
                }
                const currentTrack = trackId !== null ? this.appServices.getTrackById(trackId) : null;
                if (currentTrack) {
                    menuItems.push({ separator: true });
                    if (!this.id.startsWith('trackInspector-') && this.appServices.handleOpenTrackInspector) {
                        menuItems.push({ label: `Open Inspector: ${currentTrack.name}`, action: () => this.appServices.handleOpenTrackInspector(trackId) });
                    }
                    if (!this.id.startsWith('effectsRack-') && this.appServices.handleOpenEffectsRack) {
                        menuItems.push({ label: `Open Effects: ${currentTrack.name}`, action: () => this.appServices.handleOpenEffectsRack(trackId) });
                    }
                    if (!this.id.startsWith('sequencerWin-') && currentTrack.type !== 'Audio' && this.appServices.handleOpenSequencer) {
                        menuItems.push({ label: `Open Sequencer: ${currentTrack.name}`, action: () => this.appServices.handleOpenSequencer(trackId) });
                    }
                }
            }

            // Call createContextMenu via appServices as it's defined in main.js from Utils
            if (this.appServices.createContextMenu && typeof this.appServices.createContextMenu === 'function') {
                this.appServices.createContextMenu(event, menuItems, this.appServices); // Pass appServices for z-index
            } else {
                console.error("[SnugWindow] appServices.createContextMenu is not available!");
            }
        });
        this.updateTaskbarButtonActiveState();
    }

    updateTaskbarButtonActiveState() { /* ... same as your file, ensure appServices.getHighestZState ... */ }
    minimize(skipUndo = false) { /* ... same as your file, ensure appServices usage ... */ }
    restore(skipUndo = false) { /* ... same as your file ... */ }
    close(isReconstruction = false) { /* ... same as your file, ensure appServices usage ... */ }
    focus(skipUndoForFocusItself = false) { /* ... same as your file, ensure appServices usage ... */ }
    applyState(state) { /* ... same as your file ... */ }
}
