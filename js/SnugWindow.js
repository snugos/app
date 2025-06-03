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

        if (Number.isFinite(optWidth) && optWidth >= minW) {
            w = Math.min(optWidth, safeDesktopWidth - 10);
        } else {
            w = Math.max(minW, Math.min(350, safeDesktopWidth - 20));
        }
        w = Math.max(minW, w);

        if (Number.isFinite(optHeight) && optHeight >= minH) {
            h = Math.min(optHeight, usableDesktopHeight - 10);
        } else {
            h = Math.max(minH, Math.min(250, usableDesktopHeight - 20));
        }
        h = Math.max(minH, h);

        const maxX = Math.max(5, safeDesktopWidth - w - 5);
        const maxY = Math.max(topTaskbarHeight + 5, topTaskbarHeight + usableDesktopHeight - h - 5);

        const openWindowCount = this.appServices.getOpenWindows ? this.appServices.getOpenWindows().size : 0;
        const cascadeOffsetBase = 20;
        const cascadeIncrement = 25;
        const cascadeOffset = cascadeOffsetBase + (openWindowCount % 10) * cascadeIncrement;

        if (Number.isFinite(optX)) {
            x = Math.max(5, Math.min(optX, maxX));
        } else {
            x = Math.max(5, Math.min(cascadeOffset, maxX));
        }

        const minY = topTaskbarHeight + 5;
        if (Number.isFinite(optY)) {
            y = Math.max(minY, Math.min(optY, maxY));
        } else {
            y = Math.max(minY, Math.min(cascadeOffset + topTaskbarHeight, maxY));
        }

        const finalX = Number.isFinite(x) ? x : 50;
        const finalY = Number.isFinite(y) ? y : (50 + topTaskbarHeight);
        const finalWidth = (Number.isFinite(w) && w > 0) ? w : minW;
        const finalHeight = (Number.isFinite(h) && h > 0) ? h : minH;

        this.options = {
            ...options,
            x: finalX, y: finalY, width: finalWidth, height: finalHeight,
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

        if (typeof contentHTMLOrElement === 'string') {
            this.contentArea.innerHTML = contentHTMLOrElement;
        } else if (contentHTMLOrElement instanceof HTMLElement) {
            this.contentArea.appendChild(contentHTMLOrElement);
        } else {
            console.warn(`[SnugWindow ${this.id}] Invalid content provided for window "${this.title}".`);
        }

        this.element.appendChild(this.titleBar);
        this.element.appendChild(this.contentArea);
        desktopEl.appendChild(this.element);

        if (this.appServices.addWindowToStore) {
            this.appServices.addWindowToStore(this.id, this);
        }

        this.initInteract();

        const closeBtn = this.element.querySelector('.window-close-btn');
        if (closeBtn && this.options.closable) {
            closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
        }
        const minimizeBtn = this.element.querySelector('.window-minimize-btn');
        if (minimizeBtn && this.options.minimizable) {
            minimizeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.minimize(); });
        }
        const maximizeBtn = this.element.querySelector('.window-maximize-btn');
        if (maximizeBtn && this.options.resizable) {
            maximizeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMaximize(); });
        }

        titleButtonsDiv.querySelectorAll('button').forEach(button => {
            button.addEventListener('mousedown', e => e.stopPropagation());
            button.addEventListener('touchstart', e => e.stopPropagation());
        });

        this.element.addEventListener('mousedown', () => this.focus(), true);
        this.element.addEventListener('pointerdown', () => this.focus(), true);

        this.createTaskbarButton();

        if (this.options.isMinimized) {
            this.minimize(true);
        }
        if (!this.options.isMinimized && !options.zIndex) {
            this.focus();
        }
    }

    _captureUndo(description) {
        if (this.appServices.captureStateForUndo && typeof this.appServices.captureStateForUndo === 'function') {
            this.appServices.captureStateForUndo(description);
        } else if (this.appServices.captureStateForUndo) {
            console.warn(`[SnugWindow ${this.id}] captureStateForUndo service is not a function.`);
        }
    }

    initInteract() {
        // ... (initInteract method remains the same from your last version - with bottom-right resize)
        if (!window.interact) {
            console.error("Interact.js not loaded! Window interactions will not work.");
            return;
        }

        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop');
        const bottomTaskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar');
        const topTaskbarEl = this.appServices.uiElementsCache?.topTaskbar || document.getElementById('topTaskbar');

        if (!desktopEl) {
            console.error("[SnugWindow initInteract] Desktop element not found. Cannot initialize interactions.");
            return;
        }

        const bottomTaskbarHeight = bottomTaskbarEl ? bottomTaskbarEl.offsetHeight : 32;
        const topTaskbarHeight = topTaskbarEl ? topTaskbarEl.offsetHeight : 32;

        const snapThreshold = 15;
        let initialXForUndo, initialYForUndo;

        interact(this.element)
            .draggable({
                allowFrom: this.titleBar,
                inertia: false,
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: false
                    })
                ],
                autoScroll: false,
                listeners: { /* ... same listeners ... */ }
            });

        if (this.options.resizable) {
            interact(this.element)
                .resizable({
                    edges: { left: false, right: true, bottom: true, top: false },
                    listeners: { /* ... same listeners ... */ },
                    modifiers: [
                        interact.modifiers.restrictEdges({ outer: 'parent' }),
                        interact.modifiers.restrictSize({
                            min: { width: this.options.minWidth, height: this.options.minHeight },
                            max: {
                                width: desktopEl.clientWidth,
                                height: desktopEl.clientHeight - topTaskbarHeight - bottomTaskbarHeight
                            }
                        }),
                    ],
                    inertia: false
                });
        }
    }


    toggleMaximize() {
        // ... (toggleMaximize method remains the same as previous version with interactable checks)
        if (!this.element) return;
        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop');
        const bottomTaskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar');
        const topTaskbarEl = this.appServices.uiElementsCache?.topTaskbar || document.getElementById('topTaskbar');

        if (!desktopEl || !bottomTaskbarEl || !topTaskbarEl) {
            console.warn(`[SnugWindow ${this.id}] Cannot toggle maximize: desktop or taskbar element not found.`);
            return;
        }

        const maximizeButton = this.titleBar?.querySelector('.window-maximize-btn');
        const wasMaximized = this.isMaximized;

        const interactable = window.interact && this.element ? interact(this.element) : null; // MODIFICATION: Check if interactable exists

        const bottomTaskbarHeight = bottomTaskbarEl.offsetHeight > 0 ? bottomTaskbarEl.offsetHeight : 32;
        const topTaskbarHeight = topTaskbarEl.offsetHeight > 0 ? topTaskbarEl.offsetHeight : 32;


        if (this.isMaximized) {
            this.element.style.left = this.restoreState.left || `${this.options.x}px`;
            this.element.style.top = this.restoreState.top || `${this.options.y}px`;
            this.element.style.width = this.restoreState.width || `${this.options.width}px`;
            this.element.style.height = this.restoreState.height || `${this.options.height}px`;
            this.isMaximized = false;
            if (maximizeButton) maximizeButton.innerHTML = '□';
            if (interactable && typeof interactable.draggable === 'function') interactable.draggable(true);
            if (this.options.resizable && interactable && typeof interactable.resizable === 'function') interactable.resizable(true);

        } else {
            this.restoreState = {
                left: this.element.style.left, top: this.element.style.top,
                width: this.element.style.width, height: this.element.style.height,
            };
            this.element.style.left = '0px';
            this.element.style.top = `${topTaskbarHeight}px`;
            this.element.style.width = `${desktopEl.clientWidth}px`;
            this.element.style.height = `${desktopEl.clientHeight - topTaskbarHeight - bottomTaskbarHeight}px`;
            this.isMaximized = true;
            if (maximizeButton) maximizeButton.innerHTML = '❐';
            if (interactable && typeof interactable.draggable === 'function') interactable.draggable(false);
            if (this.options.resizable && interactable && typeof interactable.resizable === 'function') interactable.resizable(false);
        }
        this._captureUndo(`${wasMaximized ? "Restore" : "Maximize"} window "${this.title}"`);
        this.focus();
    }

    createTaskbarButton() {
        // ... (createTaskbarButton remains the same)
        const taskbarButtonsContainer = this.appServices.uiElementsCache?.taskbarButtonsContainer || document.getElementById('taskbarButtons');
        if (!taskbarButtonsContainer) {
            console.warn(`[SnugWindow ${this.id}] Taskbar buttons container not found.`);
            return;
        }
        this.taskbarButton = document.createElement('button');
        this.taskbarButton.className = 'taskbar-button';
        this.taskbarButton.textContent = this.title.substring(0, 20) + (this.title.length > 20 ? '...' : '');
        this.taskbarButton.title = this.title;
        this.taskbarButton.dataset.windowId = this.id;
        taskbarButtonsContainer.appendChild(this.taskbarButton);

        this.taskbarButton.addEventListener('click', () => {
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

    updateTaskbarButtonActiveState() {
        // ... (remains the same)
        if (!this.taskbarButton || !this.element) return;
        const currentHighestZ = this.appServices.getHighestZ ? this.appServices.getHighestZ() : 100;
        const isActive = !this.isMinimized && parseInt(this.element.style.zIndex) === currentHighestZ;
        this.taskbarButton.classList.toggle('active', isActive);
        this.taskbarButton.classList.toggle('minimized-on-taskbar', this.isMinimized);
    }

    minimize(skipUndo = false) {
        // ... (remains the same, with interactable checks)
        if (!this.element || this.isMinimized) return;
        this.isMinimized = true;
        this.element.classList.add('minimized');

        if (this.isMaximized) {
            this.isMaximized = false;
            const maximizeButton = this.titleBar?.querySelector('.window-maximize-btn');
            if (maximizeButton) maximizeButton.innerHTML = '□';
            const interactable = window.interact && this.element ? interact(this.element) : null;
            if (interactable && typeof interactable.draggable === 'function') interactable.draggable(true);
            if (this.options.resizable && interactable && typeof interactable.resizable === 'function') interactable.resizable(true);
        }

        if (!skipUndo) this._captureUndo(`Minimize window "${this.title}"`);

        if (this.appServices.getOpenWindows) {
            let nextHighestZ = -1; let windowToFocus = null;
            this.appServices.getOpenWindows().forEach(win => {
                if (win && win.element && !win.isMinimized && win.id !== this.id) {
                    const z = parseInt(win.element.style.zIndex);
                    if (z > nextHighestZ) { nextHighestZ = z; windowToFocus = win; }
                }
            });
            if (windowToFocus) windowToFocus.focus(true);
            else if (this.appServices.getOpenWindows) {
                 this.appServices.getOpenWindows().forEach(win => win?.updateTaskbarButtonActiveState?.());
            }
        }
        this.updateTaskbarButtonActiveState();
    }

    restore(skipUndo = false) {
        // ... (remains the same)
        if (!this.element) return;
        const wasMinimized = this.isMinimized;
        if (this.isMinimized) {
            this.isMinimized = false;
            this.element.classList.remove('minimized');
        }
        this.focus(true);
        if (wasMinimized && !skipUndo) this._captureUndo(`Restore window "${this.title}"`);
        this.updateTaskbarButtonActiveState();
    }

    close(isReconstruction = false) {
        console.log(`[SnugWindow ${this.id}] close() initiated. Window: "${this.title}", isReconstruction: ${isReconstruction}, Element exists: ${!!this.element}`);

        if (!this.element) {
            console.warn(`[SnugWindow ${this.id}] close(): Element is already null. Attempting cleanup for ID in store.`);
            if (this.appServices.removeWindowFromStore && typeof this.appServices.removeWindowFromStore === 'function') {
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

        // 1. Unset Interact.js
        // console.log(`[SnugWindow ${this.id}] Attempting to unset Interact.js...`);
        if (window.interact) {
            try {
                // MODIFICATION: Check if 'interact' is a function and this.element exists before calling interact(this.element)
                const interactableInstance = typeof interact === 'function' && this.element ? interact(this.element) : null;
                if (interactableInstance && typeof interactableInstance.unset === 'function') {
                    interactableInstance.unset();
                    // console.log(`[SnugWindow ${this.id}] Interact.js instance unset successfully.`);
                } else {
                    // console.log(`[SnugWindow ${this.id}] Element was not interactable, already unset, or interact(this.element) failed.`);
                }
            } catch (e) {
                console.warn(`[SnugWindow ${this.id}] Error during Interact.js unset attempt (possibly due to internal library state):`, e.message, e);
                // Continue with closing even if unsetting fails, as the internal Interact.js error was blocking.
            }
        } else {
            console.warn(`[SnugWindow ${this.id}] window.interact not found. Skipping unset.`);
        }

        // 2. Call onCloseCallback
        if (this.onCloseCallback && typeof this.onCloseCallback === 'function') {
            try {
                // console.log(`[SnugWindow ${this.id}] Calling onCloseCallback.`);
                this.onCloseCallback();
            } catch (e) {
                console.error(`[SnugWindow ${this.id}] Error in onCloseCallback:`, e);
            }
        }

        // 3. Remove taskbar button
        if (this.taskbarButton) {
            try {
                this.taskbarButton.remove();
                // console.log(`[SnugWindow ${this.id}] Taskbar button removed.`);
            } catch (e) {
                console.warn(`[SnugWindow ${this.id}] Error removing taskbar button:`, e.message);
            }
            this.taskbarButton = null;
        }

        // 4. Remove window element from DOM
        if (this.element && this.element.parentNode) { // Check parentNode before removing
            try {
                this.element.parentNode.removeChild(this.element);
                // console.log(`[SnugWindow ${this.id}] Window element removed from DOM.`);
            } catch (e) {
                console.warn(`[SnugWindow ${this.id}] Error removing window element from DOM:`, e.message);
            }
        } else if (this.element) {
            // console.log(`[SnugWindow ${this.id}] Window element has no parentNode, likely already removed or detached.`);
        }
        this.element = null; // Nullify element reference

        // 5. Remove from window store
        const oldWindowTitle = this.title;
        if (this.appServices.removeWindowFromStore && typeof this.appServices.removeWindowFromStore === 'function') {
            try {
                this.appServices.removeWindowFromStore(this.id);
                // console.log(`[SnugWindow ${this.id}] Removed from window store.`);
            } catch (storeError) {
                console.error(`[SnugWindow ${this.id}] Error removing from store:`, storeError);
            }
        } else {
            console.warn(`[SnugWindow ${this.id}] appServices.removeWindowFromStore service NOT available.`);
        }

        // 6. Capture undo state
        const isCurrentlyReconstructing = this.appServices.getIsReconstructingDAW ? this.appServices.getIsReconstructingDAW() : false;
        if (!isCurrentlyReconstructing && !isReconstruction) {
            this._captureUndo(`Close window "${oldWindowTitle}"`); // _captureUndo already checks for service existence
        }
        // console.log(`[SnugWindow ${this.id}] close() finished for "${oldWindowTitle}".`);
    }

    focus(skipUndoForFocusItself = false) {
        // ... (focus method remains the same) ...
        if (!this.element || !this.appServices.getHighestZ || !this.appServices.incrementHighestZ || !this.appServices.setHighestZ) {
            return;
        }
        if (this.isMinimized) { this.restore(skipUndoForFocusItself); return; }

        const currentHighestZGlobal = this.appServices.getHighestZ();
        const currentZ = parseInt(this.element.style.zIndex);

        if (isNaN(currentZ) || currentZ < currentHighestZGlobal || (this.appServices.getOpenWindows && this.appServices.getOpenWindows().size === 1)) {
            const newZ = this.appServices.incrementHighestZ();
            this.element.style.zIndex = newZ.toString();
        } else if (currentZ > currentHighestZGlobal) {
            this.appServices.setHighestZ(currentZ);
        }

        if (this.appServices.getOpenWindows) {
            this.appServices.getOpenWindows().forEach(win => {
                if (win && win.updateTaskbarButtonActiveState && typeof win.updateTaskbarButtonActiveState === 'function') {
                    win.updateTaskbarButtonActiveState();
                }
            });
        }
    }

    applyState(state) {
        // ... (applyState method remains the same) ...
        if (!this.element) {
            console.error(`[SnugWindow ${this.id} applyState] Window element does not exist. Cannot apply state for "${state?.title}".`);
            return;
        }
        if (!state) {
            console.error(`[SnugWindow ${this.id} applyState] Invalid or null state object provided.`);
            return;
        }

        if (state.left) this.element.style.left = state.left;
        if (state.top) this.element.style.top = state.top;
        if (state.width) this.element.style.width = state.width;
        if (state.height) this.element.style.height = state.height;
        if (Number.isFinite(state.zIndex)) this.element.style.zIndex = state.zIndex.toString();

        if (this.titleBar) {
            const titleSpan = this.titleBar.querySelector('span');
            if (titleSpan && state.title) titleSpan.textContent = state.title;
        }
        if (state.title) this.title = state.title;

        if (this.taskbarButton && state.title) {
            this.taskbarButton.textContent = state.title.substring(0, 20) + (state.title.length > 20 ? '...' : '');
            this.taskbarButton.title = state.title;
        }

        if (state.isMaximized && !this.isMaximized) {
            this.toggleMaximize();
        } else if (!state.isMaximized && this.isMaximized) {
            this.toggleMaximize();
        }

        if (state.isMinimized && !this.isMinimized) {
            this.minimize(true);
        } else if (!state.isMinimized && this.isMinimized) {
            this.restore(true);
        }
        this.updateTaskbarButtonActiveState();
    }
}
