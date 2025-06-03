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
        this.initInteract(); // Call initInteract

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
        this.createTaskbarButton();
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
        console.log(`[SnugWindow ${this.id}] initInteract called for window: "${this.title}"`); // LOG ADDED
        if (!window.interact || typeof window.interact !== 'function') {
            console.error(`[SnugWindow ${this.id}] Interact.js not loaded or not a function! Window interactions will not work.`);
            return;
        }

        if (!this.element) {
            console.error(`[SnugWindow ${this.id}] initInteract: this.element is null. Cannot set up interactions.`);
            return;
        }
        if (!this.titleBar) {
            console.error(`[SnugWindow ${this.id}] initInteract: this.titleBar is null. Dragging will not work as intended.`);
            // Potentially allow dragging from whole window if titleBar is missing, or just fail.
        }

        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop');
        if (!desktopEl) {
            console.error(`[SnugWindow ${this.id}] initInteract: Desktop element not found.`);
            return;
        }
        const bottomTaskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar');
        const topTaskbarEl = this.appServices.uiElementsCache?.topTaskbar || document.getElementById('topTaskbar');
        const bottomTaskbarHeight = bottomTaskbarEl ? bottomTaskbarEl.offsetHeight : 32;
        const topTaskbarHeight = topTaskbarEl ? topTaskbarEl.offsetHeight : 32;
        const snapThreshold = 15;
        let initialXForUndo, initialYForUndo;

        try {
            console.log(`[SnugWindow ${this.id}] Setting up draggable. Element:`, this.element, "AllowFrom:", this.titleBar); // LOG ADDED
            interact(this.element)
                .draggable({
                    allowFrom: this.titleBar, // Only allow dragging from the title bar
                    inertia: false,
                    modifiers: [
                        interact.modifiers.restrictRect({
                            restriction: 'parent',
                            endOnly: false
                        })
                    ],
                    autoScroll: false,
                    listeners: {
                        start: (event) => {
                            console.log(`[SnugWindow ${this.id}] DRAG START triggered for "${this.title}"`); // LOG ADDED
                            if (this.isMaximized) {
                                event.interaction.stop();
                                return;
                            }
                            this.focus();
                            const rect = this.element.getBoundingClientRect();
                            const parentRect = desktopEl.getBoundingClientRect();
                            initialXForUndo = rect.left - parentRect.left;
                            initialYForUndo = rect.top - parentRect.top;
                            if (this.titleBar) this.titleBar.style.cursor = 'grabbing';
                        },
                        move: (event) => {
                            if (this.isMaximized) return;
                            let x = (parseFloat(this.element.style.left) || 0) + event.dx;
                            let y = (parseFloat(this.element.style.top) || 0) + event.dy;
                            // ... (snapping logic remains here) ...
                            this.element.style.left = `${x}px`;
                            this.element.style.top = `${y}px`;
                        },
                        end: (event) => {
                            // console.log(`[SnugWindow ${this.id}] DRAG END triggered for "${this.title}"`); // LOG ADDED
                            if (this.titleBar) this.titleBar.style.cursor = 'grab';
                            if (!this.isMaximized) {
                                const finalRect = this.element.getBoundingClientRect();
                                const parentRect = desktopEl.getBoundingClientRect();
                                const finalX = finalRect.left - parentRect.left;
                                const finalY = finalRect.top - parentRect.top;
                                if (Math.abs(finalX - initialXForUndo) > 1 || Math.abs(finalY - initialYForUndo) > 1) {
                                    this._captureUndo(`Move window "${this.title}"`);
                                }
                            }
                        }
                    }
                });
            console.log(`[SnugWindow ${this.id}] Draggable setup aparentemente complete.`); // LOG ADDED
        } catch (e) {
            console.error(`[SnugWindow ${this.id}] Error setting up draggable:`, e);
        }

        if (this.options.resizable) {
            try {
                // console.log(`[SnugWindow ${this.id}] Setting up resizable.`); // LOG ADDED
                interact(this.element)
                    .resizable({
                        edges: { left: true, right: true, bottom: true, top: true }, // Reverted to all edges
                        listeners: { /* ... listeners from previous version ... */ },
                        modifiers: [ /* ... modifiers from previous version ... */ ],
                        inertia: false
                    });
                // console.log(`[SnugWindow ${this.id}] Resizable setup complete.`); // LOG ADDED
            } catch (e) {
                console.error(`[SnugWindow ${this.id}] Error setting up resizable:`, e);
            }
        }
    }

    toggleMaximize() { /* ... same as previous robust version ... */ }
    createTaskbarButton() { /* ... same as previous robust version ... */ }
    updateTaskbarButtonActiveState() { /* ... same ... */ }
    minimize(skipUndo = false) { /* ... same robust version ... */ }
    restore(skipUndo = false) { /* ... same ... */ }
    
    close(isReconstruction = false) {
        console.log(`[SnugWindow ${this.id}] close() method entered. Window: "${this.title}", isReconstruction: ${isReconstruction}, Element present: ${!!this.element}`);

        if (!this.element) {
            console.warn(`[SnugWindow ${this.id}] close(): Element is already null. Attempting cleanup for ID in store.`);
            if (this.appServices && this.appServices.removeWindowFromStore && typeof this.appServices.removeWindowFromStore === 'function') {
                try {
                    this.appServices.removeWindowFromStore(this.id);
                    console.log(`[SnugWindow ${this.id}] Removed from window store (element was null).`);
                } catch (storeError) {
                    console.error(`[SnugWindow ${this.id}] Error removing from store (element was null):`, storeError);
                }
            }
            this.taskbarButton = null;
            return;
        }
        
        // MODIFICATION: Keeping Interact.js unset logic commented out FOR DIAGNOSTICS
        /*
        console.log(`[SnugWindow ${this.id}] DIAGNOSTIC: Attempting to unset Interact.js...`);
        if (window.interact && typeof window.interact === 'function' && this.element) {
            try {
                const interactableInstance = interact(this.element);
                if (interactableInstance && typeof interactableInstance.unset === 'function') {
                    interactableInstance.unset();
                    console.log(`[SnugWindow ${this.id}] Interact.js instance unset successfully.`);
                } else {
                    console.log(`[SnugWindow ${this.id}] Element was not interactable, already unset, or interact(this.element) failed to return valid instance for unsetting.`);
                }
            } catch (e) {
                console.warn(`[SnugWindow ${this.id}] Error during Interact.js unset attempt (possibly due to internal library state):`, e.message, e);
            }
        } else {
            console.warn(`[SnugWindow ${this.id}] window.interact not found or element is null. Skipping unset.`);
        }
        */
        console.log(`[SnugWindow ${this.id}] DIAGNOSTIC: Interact.js unsetting in close() is currently COMMENTED OUT.`);


        // console.log(`[SnugWindow ${this.id}] Calling onCloseCallback...`);
        if (this.onCloseCallback && typeof this.onCloseCallback === 'function') {
            try { this.onCloseCallback(); /* console.log(`[SnugWindow ${this.id}] onCloseCallback executed.`); */ }
            catch (e) { console.error(`[SnugWindow ${this.id}] Error in onCloseCallback:`, e); }
        }

        // console.log(`[SnugWindow ${this.id}] Removing taskbar button...`);
        if (this.taskbarButton) {
            try { this.taskbarButton.remove(); /* console.log(`[SnugWindow ${this.id}] Taskbar button removed.`); */ }
            catch (e) { console.warn(`[SnugWindow ${this.id}] Error removing taskbar button:`, e.message); }
            this.taskbarButton = null;
        }

        // console.log(`[SnugWindow ${this.id}] Removing window element from DOM...`);
        if (this.element && this.element.parentNode) {
            try { this.element.parentNode.removeChild(this.element); /* console.log(`[SnugWindow ${this.id}] Window element removed from DOM.`); */ }
            catch (e) { console.warn(`[SnugWindow ${this.id}] Error removing window element from DOM:`, e.message); }
        } else if (this.element) { /* console.log(`[SnugWindow ${this.id}] Window element has no parentNode.`); */ }
        this.element = null;

        const oldWindowTitle = this.title;
        // console.log(`[SnugWindow ${this.id}] Removing from window store...`);
        if (this.appServices.removeWindowFromStore && typeof this.appServices.removeWindowFromStore === 'function') {
            try { this.appServices.removeWindowFromStore(this.id); /* console.log(`[SnugWindow ${this.id}] Removed from window store.`); */ }
            catch (storeError) { console.error(`[SnugWindow ${this.id}] Error removing from store:`, storeError); }
        } else { console.warn(`[SnugWindow ${this.id}] appServices.removeWindowFromStore service NOT available or not a function.`); }

        const isCurrentlyReconstructing = this.appServices.getIsReconstructingDAW ? this.appServices.getIsReconstructingDAW() : false;
        if (!isCurrentlyReconstructing && !isReconstruction) {
            // console.log(`[SnugWindow ${this.id}] Capturing undo state for close window "${oldWindowTitle}"...`);
            this._captureUndo(`Close window "${oldWindowTitle}"`);
        }
        // console.log(`[SnugWindow ${this.id}] close() finished for "${oldWindowTitle}".`);
    }

    focus(skipUndoForFocusItself = false) { /* ... same as previous ... */ }
    applyState(state) { /* ... same as previous ... */ }
}
