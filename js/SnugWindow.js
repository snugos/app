// js/SnugWindow.js - SnugWindow Class Module

import { createContextMenu } from './utils.js';

export class SnugWindow {
    constructor(id, title, contentHTMLOrElement, options = {}, appServices = {}) {
        // ... (constructor remains the same as the version from response 13)
        this.id = id;
        this.title = title;
        this.isMinimized = false;
        this.initialContentKey = options.initialContentKey || id;
        this.taskbarButton = null;
        this.onCloseCallback = options.onCloseCallback || (() => {});
        this.isMaximized = false;
        this.restoreState = {};
        this.appServices = appServices || {};

        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop');
        if (!desktopEl) {
            console.error(`[SnugWindow CRITICAL ${this.id}] Desktop element not found. Cannot create window "${title}".`);
            this.element = null;
            return;
        }

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
        const maxY = Math.max(topTaskbarHeight + 5, topTaskbarHeight + usableDesktopHeight - h - 5);
        const openWindowCount = this.appServices.getOpenWindows ? this.appServices.getOpenWindows().size : 0;
        const cascadeOffsetBase = 20;
        const cascadeIncrement = 25;
        const cascadeOffset = cascadeOffsetBase + (openWindowCount % 10) * cascadeIncrement;

        if (Number.isFinite(optX)) { x = Math.max(5, Math.min(optX, maxX)); }
        else { x = Math.max(5, Math.min(cascadeOffset, maxX)); }

        const minY = topTaskbarHeight + 5;
        if (Number.isFinite(optY)) { y = Math.max(minY, Math.min(optY, maxY)); }
        else { y = Math.max(minY, Math.min(cascadeOffset + topTaskbarHeight, maxY)); }

        const finalX = Number.isFinite(x) ? x : 50;
        const finalY = Number.isFinite(y) ? y : (50 + topTaskbarHeight);
        const finalWidth = (Number.isFinite(w) && w > 0) ? w : minW;
        const finalHeight = (Number.isFinite(h) && h > 0) ? h : minH;

        this.options = {
            ...options, x: finalX, y: finalY, width: finalWidth, height: finalHeight,
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

        const initialZIndex = Number.isFinite(parseFloat(options.zIndex)) ? parseFloat(options.zIndex) :
            (this.appServices.incrementHighestZ ? this.appServices.incrementHighestZ() : 101);
        this.element.style.zIndex = initialZIndex.toString();
        if (this.appServices.setHighestZ && this.appServices.getHighestZ && initialZIndex > this.appServices.getHighestZ()) {
            this.appServices.setHighestZ(initialZIndex);
        }

        this.titleBar = document.createElement('div');
        this.titleBar.className = 'window-title-bar';
        let buttonsHTML = '';
        if (this.options.minimizable) { buttonsHTML += `<button class="window-minimize-btn" title="Minimize">_</button>`; }
        if (this.options.resizable) { buttonsHTML += `<button class="window-maximize-btn" title="Maximize">□</button>`; }
        if (this.options.closable) { buttonsHTML += `<button class="window-close-btn" title="Close">X</button>`; }
        const titleSpan = document.createElement('span');
        titleSpan.textContent = this.title;
        titleSpan.style.pointerEvents = 'none';
        this.titleBar.appendChild(titleSpan);
        const titleButtonsDiv = document.createElement('div');
        titleButtonsDiv.className = 'window-title-buttons';
        titleButtonsDiv.innerHTML = buttonsHTML;
        this.titleBar.appendChild(titleButtonsDiv);

        this.contentArea = document.createElement('div');
        this.contentArea.className = 'window-content';
        if (typeof contentHTMLOrElement === 'string') { this.contentArea.innerHTML = contentHTMLOrElement; }
        else if (contentHTMLOrElement instanceof HTMLElement) { this.contentArea.appendChild(contentHTMLOrElement); }
        else { console.warn(`[SnugWindow ${this.id}] Invalid content provided for window "${this.title}".`); }

        this.element.appendChild(this.titleBar);
        this.element.appendChild(this.contentArea);
        desktopEl.appendChild(this.element);

        if (this.appServices.addWindowToStore) { this.appServices.addWindowToStore(this.id, this); }
        this.initInteract();

        const closeBtn = this.element.querySelector('.window-close-btn');
        if (closeBtn && this.options.closable) {
            closeBtn.addEventListener('click', (e) => {
                console.log(`[SnugWindow ${this.id}] Close button clicked for window: "${this.title}"`);
                e.stopPropagation();
                this.close();
            });
        }
        const minimizeBtn = this.element.querySelector('.window-minimize-btn');
        if (minimizeBtn && this.options.minimizable) { minimizeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.minimize(); }); }
        const maximizeBtn = this.element.querySelector('.window-maximize-btn');
        if (maximizeBtn && this.options.resizable) { maximizeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMaximize(); }); }

        titleButtonsDiv.querySelectorAll('button').forEach(button => {
            button.addEventListener('mousedown', e => e.stopPropagation());
            button.addEventListener('touchstart', e => e.stopPropagation());
        });

        this.element.addEventListener('mousedown', () => this.focus(), true);
        this.element.addEventListener('pointerdown', () => this.focus(), true);
        this.createTaskbarButton(); // Call to create the button
        if (this.options.isMinimized) { this.minimize(true); }
        if (!this.options.isMinimized && !options.zIndex) { this.focus(); }
    }

    _captureUndo(description) {
        if (this.appServices.captureStateForUndo && typeof this.appServices.captureStateForUndo === 'function') {
            this.appServices.captureStateForUndo(description);
        } else if (this.appServices.captureStateForUndo) {
            // console.warn(`[SnugWindow ${this.id}] captureStateForUndo service is not a function.`);
        }
    }

    initInteract() {
        // console.log(`[SnugWindow ${this.id}] initInteract called.`);
        if (!window.interact || typeof window.interact !== 'function') {
            console.error("Interact.js not loaded or not a function! Window interactions will not work.");
            return;
        }
        // ... (rest of initInteract remains the same, using all edges for resizable)
        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop');
        if (!desktopEl) {
            console.error("[SnugWindow initInteract] Desktop element not found. Cannot initialize interactions.");
            return;
        }
        const bottomTaskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar');
        const topTaskbarEl = this.appServices.uiElementsCache?.topTaskbar || document.getElementById('topTaskbar');
        const bottomTaskbarHeight = bottomTaskbarEl ? bottomTaskbarEl.offsetHeight : 32;
        const topTaskbarHeight = topTaskbarEl ? topTaskbarEl.offsetHeight : 32;
        const snapThreshold = 15;
        let initialXForUndo, initialYForUndo;

        try {
            interact(this.element)
                .draggable({
                    allowFrom: this.titleBar,
                    inertia: false,
                    modifiers: [ interact.modifiers.restrictRect({ restriction: 'parent', endOnly: false }) ],
                    autoScroll: false,
                    listeners: { /* ... listeners ... */ }
                });
        } catch (e) { console.error(`[SnugWindow ${this.id}] Error setting up draggable:`, e); }

        if (this.options.resizable) {
            try {
                interact(this.element)
                    .resizable({
                        edges: { left: true, right: true, bottom: true, top: true }, // Reverted to all edges
                        listeners: { /* ... listeners ... */ },
                        modifiers: [ /* ... modifiers ... */ ],
                        inertia: false
                    });
            } catch (e) { console.error(`[SnugWindow ${this.id}] Error setting up resizable:`, e); }
        }
    }

    toggleMaximize() { /* ... same as previous robust version ... */ }

    // MODIFICATION: Enhanced logging in createTaskbarButton
    createTaskbarButton() {
        console.log(`[SnugWindow ${this.id}] createTaskbarButton called for window "${this.title}".`);
        let taskbarButtonsContainer;
        if (this.appServices.uiElementsCache && this.appServices.uiElementsCache.taskbarButtonsContainer) {
            taskbarButtonsContainer = this.appServices.uiElementsCache.taskbarButtonsContainer;
            console.log(`[SnugWindow ${this.id}] Found taskbarButtonsContainer via appServices.uiElementsCache.`);
        } else {
            taskbarButtonsContainer = document.getElementById('taskbarButtons');
            if (taskbarButtonsContainer) {
                console.log(`[SnugWindow ${this.id}] Found taskbarButtonsContainer via getElementById('taskbarButtons').`);
            } else {
                console.warn(`[SnugWindow ${this.id}] CRITICAL: Taskbar buttons container ('taskbarButtons') NOT FOUND. Cannot create taskbar button.`);
                return; // Exit if container not found
            }
        }

        if (!taskbarButtonsContainer) { // Double check after attempts
            console.warn(`[SnugWindow ${this.id}] Taskbar buttons container still not found after all checks.`);
            return;
        }

        this.taskbarButton = document.createElement('button');
        this.taskbarButton.className = 'taskbar-button'; // Ensure this class is styled in style.css
        this.taskbarButton.textContent = this.title.substring(0, 20) + (this.title.length > 20 ? '...' : '');
        this.taskbarButton.title = this.title;
        this.taskbarButton.dataset.windowId = this.id;

        try {
            taskbarButtonsContainer.appendChild(this.taskbarButton);
            console.log(`[SnugWindow ${this.id}] Taskbar button for "${this.title}" CREATED and APPENDED.`);
        } catch (e) {
            console.error(`[SnugWindow ${this.id}] Error appending taskbar button to container:`, e);
            this.taskbarButton = null; // Nullify if append failed
            return;
        }

        this.taskbarButton.addEventListener('click', () => {
            // ... (click listener remains the same) ...
            if (!this.element) return;
            if (this.isMinimized) {
                this.restore();
            } else {
                const currentHighestZ = this.appServices.getHighestZ ? this.appServices.getHighestZ() : 100;
                if (parseInt(this.element.style.zIndex) === currentHighestZ && !this.isMaximized) {
                    this.minimize();
                } else {
                    this.focus();
                }
            }
        });

        this.taskbarButton.addEventListener('contextmenu', (event) => {
            // ... (context menu listener remains the same) ...
            event.preventDefault(); event.stopPropagation();
            const menuItems = [];
            if (this.isMinimized) menuItems.push({ label: "Restore", action: () => this.restore() });
            else menuItems.push({ label: "Minimize", action: () => this.minimize() });

            if (this.options.resizable) {
                menuItems.push({ label: this.isMaximized ? "Restore Down" : "Maximize", action: () => this.toggleMaximize() });
            }
            if (this.options.closable) menuItems.push({ label: "Close", action: () => this.close() });

            if (this.appServices.getTrackById && this.appServices.handleOpenTrackInspector && this.appServices.handleOpenEffectsRack && this.appServices.handleOpenSequencer) {
                let trackId = null;
                const parts = this.id.split('-');
                if (parts.length > 1 && (this.id.startsWith('trackInspector-') || this.id.startsWith('effectsRack-') || this.id.startsWith('sequencerWin-'))) {
                    const idPart = parts[parts.length - 1];
                    if (!isNaN(parseInt(idPart))) trackId = parseInt(idPart);
                }
                const currentTrack = trackId !== null ? this.appServices.getTrackById(trackId) : null;
                if (currentTrack) {
                    menuItems.push({ separator: true });
                    if (!this.id.startsWith('trackInspector-')) {
                        menuItems.push({ label: `Open Inspector: ${currentTrack.name}`, action: () => this.appServices.handleOpenTrackInspector(trackId) });
                    }
                    if (!this.id.startsWith('effectsRack-')) {
                        menuItems.push({ label: `Open Effects: ${currentTrack.name}`, action: () => this.appServices.handleOpenEffectsRack(trackId) });
                    }
                    if (!this.id.startsWith('sequencerWin-') && currentTrack.type !== 'Audio') {
                        menuItems.push({ label: `Open Sequencer: ${currentTrack.name}`, action: () => this.appServices.handleOpenSequencer(trackId) });
                    }
                }
            }
            if (typeof createContextMenu === 'function') {
                createContextMenu(event, menuItems, this.appServices);
            } else {
                console.error("createContextMenu function is not available.");
            }
        });
        this.updateTaskbarButtonActiveState();
    }

    updateTaskbarButtonActiveState() { /* ... same ... */ }
    minimize(skipUndo = false) { /* ... same robust version ... */ }
    restore(skipUndo = false) { /* ... same ... */ }
    close(isReconstruction = false) { /* ... same as previous robust version with Interact.js unset commented for testing ... */ }
    focus(skipUndoForFocusItself = false) { /* ... same ... */ }
    applyState(state) { /* ... same ... */ }
}
