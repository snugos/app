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
        this.appServices = appServices || {}; // Ensure appServices is at least an empty object
        // _isDragging and _isResizing might be less needed with interact.js state
        // but can be useful for internal logic if specific start/end actions are complex.
        // For now, their direct usage in drag/resize will be replaced by interact.js event cycle.

        console.log(`[SnugWindow ${this.id} Constructor] Initializing window "${title}". Options:`, JSON.parse(JSON.stringify(options))); //

        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop'); //
        if (!desktopEl) {
            console.error(`[SnugWindow CRITICAL ${this.id}] Desktop element not found. Cannot create window "${title}".`); //
            this.element = null; // Mark as invalid //
            return; // Halt construction if desktop isn't found //
        }

        const taskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar'); //
        const taskbarHeightVal = taskbarEl?.offsetHeight > 0 ? taskbarEl.offsetHeight : 30; //

        const safeDesktopWidth = (desktopEl.offsetWidth > 0) ? desktopEl.offsetWidth : 1024; //
        const safeDesktopHeight = (desktopEl.offsetHeight > 0) ? desktopEl.offsetHeight : 768; //
        console.log(`[SnugWindow ${this.id} Constructor] Desktop Dims: ${safeDesktopWidth}x${safeDesktopHeight}, Taskbar Height: ${taskbarHeightVal}`); //


        const optMinWidth = parseFloat(options.minWidth); //
        const optMinHeight = parseFloat(options.minHeight); //
        const minW = Number.isFinite(optMinWidth) && optMinWidth > 50 ? optMinWidth : 150; //
        const minH = Number.isFinite(optMinHeight) && optMinHeight > 50 ? optMinHeight : 100; //

        let optWidth = parseFloat(options.width); //
        let optHeight = parseFloat(options.height); //
        let optX = parseFloat(options.x); //
        let optY = parseFloat(options.y); //

        let w, h, x, y;

        if (Number.isFinite(optWidth) && optWidth >= minW) { //
            w = Math.min(optWidth, safeDesktopWidth - 10); //
        } else {
            w = Math.max(minW, Math.min(350, safeDesktopWidth - 20)); //
        }
        w = Math.max(minW, w); //

        if (Number.isFinite(optHeight) && optHeight >= minH) { //
            h = Math.min(optHeight, safeDesktopHeight - taskbarHeightVal - 10); //
        } else {
            h = Math.max(minH, Math.min(250, safeDesktopHeight - taskbarHeightVal - 20)); //
        }
        h = Math.max(minH, h); //

        const maxX = Math.max(5, safeDesktopWidth - w - 5); //
        const maxY = Math.max(5, safeDesktopHeight - h - taskbarHeightVal - 5); //

        const openWindowCount = this.appServices.getOpenWindows ? this.appServices.getOpenWindows().size : 0; //
        const cascadeOffsetBase = 20; //
        const cascadeIncrement = 25; //
        const cascadeOffset = cascadeOffsetBase + (openWindowCount % 10) * cascadeIncrement; //

        if (Number.isFinite(optX)) { //
            x = Math.max(5, Math.min(optX, maxX)); //
        } else {
            x = Math.max(5, Math.min(cascadeOffset, maxX)); //
        }

        if (Number.isFinite(optY)) { //
            y = Math.max(5, Math.min(optY, maxY)); //
        } else {
            y = Math.max(5, Math.min(cascadeOffset, maxY)); //
        }

        const finalX = Number.isFinite(x) ? x : 50; //
        const finalY = Number.isFinite(y) ? y : 50; //
        const finalWidth = (Number.isFinite(w) && w > 0) ? w : minW; //
        const finalHeight = (Number.isFinite(h) && h > 0) ? h : minH; //

        this.options = { //
            ...options, //
            x: finalX, y: finalY, width: finalWidth, height: finalHeight, //
            minWidth: minW, minHeight: minH, //
            closable: options.closable !== undefined ? options.closable : true, //
            minimizable: options.minimizable !== undefined ? options.minimizable : true, //
            resizable: options.resizable !== undefined ? options.resizable : true, //
        };

        console.log(`[SnugWindow ${this.id} Constructor] Calculated final this.options:`, JSON.parse(JSON.stringify(this.options))); //

        this.element = document.createElement('div'); //
        this.element.id = `window-${this.id}`; //
        this.element.className = 'window'; //
        this.element.style.touchAction = 'none'; // Recommended for interact.js

        if (Number.isFinite(this.options.x)) this.element.style.left = `${this.options.x}px`; //
        else { console.warn(`[SnugWindow ${this.id}] Invalid X position (${this.options.x}), defaulting to 50px.`); this.element.style.left = '50px'; } //

        if (Number.isFinite(this.options.y)) this.element.style.top = `${this.options.y}px`; //
        else { console.warn(`[SnugWindow ${this.id}] Invalid Y position (${this.options.y}), defaulting to 50px.`); this.element.style.top = '50px'; } //

        if (Number.isFinite(this.options.width) && this.options.width > 0) this.element.style.width = `${this.options.width}px`; //
        else { console.warn(`[SnugWindow ${this.id}] Invalid width (${this.options.width}), defaulting to minWidth ${this.options.minWidth}px.`); this.element.style.width = `${this.options.minWidth}px`; } //

        if (Number.isFinite(this.options.height) && this.options.height > 0) this.element.style.height = `${this.options.height}px`; //
        else { console.warn(`[SnugWindow ${this.id}] Invalid height (${this.options.height}), defaulting to minHeight ${this.options.minHeight}px.`); this.element.style.height = `${this.options.minHeight}px`; } //


        const initialZIndex = Number.isFinite(parseFloat(options.zIndex)) ? parseFloat(options.zIndex) : //
            (this.appServices.incrementHighestZ ? this.appServices.incrementHighestZ() : 101); //

        if (Number.isFinite(initialZIndex)) this.element.style.zIndex = initialZIndex; //
        else { console.warn(`[SnugWindow ${this.id}] Invalid zIndex (${options.zIndex}), defaulting to 101.`); this.element.style.zIndex = 101; } //

        if (this.appServices.setHighestZ && this.appServices.getHighestZ && initialZIndex > this.appServices.getHighestZ()) { //
            this.appServices.setHighestZ(initialZIndex); //
        }

        this.titleBar = document.createElement('div'); //
        this.titleBar.className = 'window-title-bar'; //
        let buttonsHTML = ''; //
        if (this.options.minimizable) { buttonsHTML += `<button class="window-minimize-btn" title="Minimize">_</button>`; } //
        if (this.options.resizable) { buttonsHTML += `<button class="window-maximize-btn" title="Maximize">□</button>`; } //
        if (this.options.closable) { buttonsHTML += `<button class="window-close-btn" title="Close">X</button>`; } //
        this.titleBar.innerHTML = `<span>${this.title}</span><div class="window-title-buttons">${buttonsHTML}</div>`; //

        this.contentArea = document.createElement('div'); //
        this.contentArea.className = 'window-content'; //

        if (typeof contentHTMLOrElement === 'string') { //
            this.contentArea.innerHTML = contentHTMLOrElement; //
        } else if (contentHTMLOrElement instanceof HTMLElement) { //
            this.contentArea.appendChild(contentHTMLOrElement); //
        } else {
            console.warn(`[SnugWindow ${this.id}] Invalid content provided for window "${this.title}". Expected string or HTMLElement.`); //
        }

        this.element.appendChild(this.titleBar); //
        this.element.appendChild(this.contentArea); //
        desktopEl.appendChild(this.element); //

        if (this.appServices.addWindowToStore) { //
            this.appServices.addWindowToStore(this.id, this); //
        } else {
            console.warn(`[SnugWindow ${this.id}] addWindowToStore service not available via appServices.`); //
        }

        // Initialize Interact.js draggable and resizable
        this.initInteract();

        const closeBtn = this.element.querySelector('.window-close-btn'); //
        if (closeBtn && this.options.closable) { //
            closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.close(); }); //
        }
        const minimizeBtn = this.element.querySelector('.window-minimize-btn'); //
        if (minimizeBtn && this.options.minimizable) { //
            minimizeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.minimize(); }); //
        }
        const maximizeBtn = this.element.querySelector('.window-maximize-btn'); //
        if (maximizeBtn && this.options.resizable) { //
            maximizeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMaximize(); }); //
        }

        this.element.addEventListener('mousedown', () => this.focus(), true); // Capture phase to focus before other actions //
        // For interact.js, pointerdown might be better to catch touch and mouse
        this.element.addEventListener('pointerdown', () => this.focus(), true);


        this.createTaskbarButton(); //

        if (this.options.isMinimized) { //
            this.minimize(true); // true to skip undo capture on initial load //
        }
        if (!this.options.isMinimized && !options.zIndex) { //
            this.focus(); //
        }
    }

    _captureUndo(description) { //
        if (this.appServices.captureStateForUndo) { //
            this.appServices.captureStateForUndo(description); //
        }
    }

    initInteract() {
        if (!window.interact) {
            console.error("Interact.js not loaded!");
            return;
        }

        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop'); //
        const taskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar'); //
        const taskbarHeight = taskbarEl ? taskbarEl.offsetHeight : 30;

        // --- Draggable with Interact.js ---
        let initialX, initialY;
        interact(this.element)
            .draggable({
                allowFrom: this.titleBar, // Only drag from title bar //
                inertia: false, // Optional: enable inertia for smoother feeling
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent', // Restrict to desktopEl
                        endOnly: false
                    })
                ],
                autoScroll: false, // Usually not needed for windows
                listeners: {
                    start: (event) => {
                        if (this.isMaximized) { //
                            event.interaction.stop(); // Prevent dragging when maximized
                            return;
                        }
                        this.focus(); //
                        const rect = this.element.getBoundingClientRect();
                        const parentRect = desktopEl.getBoundingClientRect();
                        initialX = rect.left - parentRect.left;
                        initialY = rect.top - parentRect.top;
                        if (this.titleBar) this.titleBar.style.cursor = 'grabbing'; //
                    },
                    move: (event) => {
                        if (this.isMaximized) return;
                        let x = (parseFloat(this.element.style.left) || 0) + event.dx;
                        let y = (parseFloat(this.element.style.top) || 0) + event.dy;

                        // Additional boundary check considering taskbar for the top of the window.
                        // Interact.js restrictRect helps, but this is a fine-tune.
                        const titleBarHeight = this.titleBar?.offsetHeight || 28; //
                        const maxTop = desktopEl.clientHeight - titleBarHeight - taskbarHeight;

                        y = Math.max(0, Math.min(y, maxTop));
                        x = Math.max(0, x); // Ensure it doesn't go off left

                        this.element.style.left = `${x}px`;
                        this.element.style.top = `${y}px`;
                    },
                    end: (event) => {
                        if (this.titleBar) this.titleBar.style.cursor = 'grab'; //
                        if (!this.isMaximized) {
                             const finalRect = this.element.getBoundingClientRect();
                             const parentRect = desktopEl.getBoundingClientRect();
                             const finalX = finalRect.left - parentRect.left;
                             const finalY = finalRect.top - parentRect.top;

                            if (Math.abs(finalX - initialX) > 1 || Math.abs(finalY - initialY) > 1) {
                                this._captureUndo(`Move window "${this.title}"`); //
                            }
                        }
                    }
                }
            });

        // --- Resizable with Interact.js ---
        if (this.options.resizable) { //
            // Remove the old custom resizer div if it exists
            const oldResizer = this.element.querySelector('.window-resizer'); //
            if (oldResizer) oldResizer.remove();

            let originalStyleWidth, originalStyleHeight;
            interact(this.element)
                .resizable({
                    edges: { left: false, right: true, bottom: true, top: false }, // Standard bottom-right //
                    listeners: {
                        start: (event) => {
                            if (this.isMaximized) {
                                event.interaction.stop();
                                return;
                            }
                            this.focus(); //
                            originalStyleWidth = this.element.style.width; //
                            originalStyleHeight = this.element.style.height; //
                        },
                        move: (event) => {
                            if (this.isMaximized) return;
                            let newWidth = event.rect.width;
                            let newHeight = event.rect.height;

                            this.element.style.width = `${newWidth}px`;
                            this.element.style.height = `${newHeight}px`;
                        },
                        end: (event) => {
                            if (!this.isMaximized) {
                                if (this.element.style.width !== originalStyleWidth || this.element.style.height !== originalStyleHeight) { //
                                   this._captureUndo(`Resize window "${this.title}"`); //
                                }
                            }
                        }
                    },
                    modifiers: [
                        interact.modifiers.restrictEdges({
                            outer: 'parent',
                        }),
                        interact.modifiers.restrictSize({
                            min: { width: this.options.minWidth, height: this.options.minHeight }, //
                        }),
                    ],
                    inertia: false
                });
        }
    }


    toggleMaximize() { //
        if (!this.element) return; //
        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop'); //
        const taskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar'); //
        if (!desktopEl || !taskbarEl) { //
            console.warn(`[SnugWindow ${this.id}] Cannot toggle maximize: desktop or taskbar element not found.`); //
            return; //
        }

        const maximizeButton = this.titleBar?.querySelector('.window-maximize-btn'); //
        const wasMaximized = this.isMaximized; //

        // Disable interactjs drag/resize when maximizing, enable when restoring
        const interactable = interact(this.element);

        if (this.isMaximized) { //
            // Restore
            this.element.style.left = this.restoreState.left || `${this.options.x}px`; //
            this.element.style.top = this.restoreState.top || `${this.options.y}px`; //
            this.element.style.width = this.restoreState.width || `${this.options.width}px`; //
            this.element.style.height = this.restoreState.height || `${this.options.height}px`; //
            this.isMaximized = false; //
            if (maximizeButton) maximizeButton.innerHTML = '□'; // Restore icon //
            if (interactable) {
                interactable.draggable(true);
                if (this.options.resizable) interactable.resizable(true);
            }
        } else {
            // Maximize
            this.restoreState = { //
                left: this.element.style.left, top: this.element.style.top, //
                width: this.element.style.width, height: this.element.style.height, //
            };
            const taskbarHeight = taskbarEl.offsetHeight > 0 ? taskbarEl.offsetHeight : 30; //
            this.element.style.left = '0px'; //
            this.element.style.top = '0px'; //
            this.element.style.width = `${desktopEl.clientWidth}px`; //
            this.element.style.height = `${desktopEl.clientHeight - taskbarHeight}px`; //
            this.isMaximized = true; //
            if (maximizeButton) maximizeButton.innerHTML = '❐'; // Maximize icon (restore down) //
            if (interactable) {
                interactable.draggable(false); // Disable dragging when maximized
                if (this.options.resizable) interactable.resizable(false); // Disable resizing when maximized
            }
        }
        this._captureUndo(`${wasMaximized ? "Restore" : "Maximize"} window "${this.title}"`); //
        this.focus(); // Bring to front //
    }

    createTaskbarButton() { //
        const taskbarButtonsContainer = this.appServices.uiElementsCache?.taskbarButtonsContainer || document.getElementById('taskbarButtons'); //
        if (!taskbarButtonsContainer) { //
            console.warn(`[SnugWindow ${this.id}] Taskbar buttons container not found.`); //
            return; //
        }
        this.taskbarButton = document.createElement('button'); //
        this.taskbarButton.className = 'taskbar-button'; //
        this.taskbarButton.textContent = this.title.substring(0, 20) + (this.title.length > 20 ? '...' : ''); //
        this.taskbarButton.title = this.title; //
        this.taskbarButton.dataset.windowId = this.id; //
        taskbarButtonsContainer.appendChild(this.taskbarButton); //

        this.taskbarButton.addEventListener('click', () => { //
            if (!this.element) return; // Window might have been closed //
            if (this.isMinimized) { //
                this.restore(); //
            } else {
                const currentHighestZ = this.appServices.getHighestZ ? this.appServices.getHighestZ() : 100; //
                if (parseInt(this.element.style.zIndex) === currentHighestZ && !this.isMaximized) { //
                    this.minimize(); //
                } else { 
                    this.focus(); //
                }
            }
        });

        this.taskbarButton.addEventListener('contextmenu', (event) => { //
            event.preventDefault(); event.stopPropagation(); //
            const menuItems = []; //
            if (this.isMinimized) menuItems.push({ label: "Restore", action: () => this.restore() }); //
            else menuItems.push({ label: "Minimize", action: () => this.minimize() }); //

            if (this.options.resizable) { //
                menuItems.push({ label: this.isMaximized ? "Restore Down" : "Maximize", action: () => this.toggleMaximize() }); //
            }
            if (this.options.closable) menuItems.push({ label: "Close", action: () => this.close() }); //

            if (this.appServices.getTrackById) { //
                let trackId = null; //
                const parts = this.id.split('-'); //
                if (parts.length > 1 && (this.id.startsWith('trackInspector-') || this.id.startsWith('effectsRack-') || this.id.startsWith('sequencerWin-'))) { //
                    const idPart = parts[parts.length - 1]; //
                    if (!isNaN(parseInt(idPart))) trackId = parseInt(idPart); //
                }
                const currentTrack = trackId !== null ? this.appServices.getTrackById(trackId) : null; //
                if (currentTrack) { //
                    menuItems.push({ separator: true }); //
                    if (!this.id.startsWith('trackInspector-') && this.appServices.handleOpenTrackInspector) { //
                        menuItems.push({ label: `Open Inspector: ${currentTrack.name}`, action: () => this.appServices.handleOpenTrackInspector(trackId) }); //
                    }
                    if (!this.id.startsWith('effectsRack-') && this.appServices.handleOpenEffectsRack) { //
                        menuItems.push({ label: `Open Effects: ${currentTrack.name}`, action: () => this.appServices.handleOpenEffectsRack(trackId) }); //
                    }
                    if (!this.id.startsWith('sequencerWin-') && currentTrack.type !== 'Audio' && this.appServices.handleOpenSequencer) { //
                        menuItems.push({ label: `Open Sequencer: ${currentTrack.name}`, action: () => this.appServices.handleOpenSequencer(trackId) }); //
                    }
                }
            }
            createContextMenu(event, menuItems, this.appServices); //
        });
        this.updateTaskbarButtonActiveState(); //
    }

    updateTaskbarButtonActiveState() { //
        if (!this.taskbarButton || !this.element) return; //
        const currentHighestZ = this.appServices.getHighestZ ? this.appServices.getHighestZ() : 100; //
        const isActive = !this.isMinimized && parseInt(this.element.style.zIndex) === currentHighestZ; //
        this.taskbarButton.classList.toggle('active', isActive); //
        this.taskbarButton.classList.toggle('minimized-on-taskbar', this.isMinimized); //
    }

    minimize(skipUndo = false) { //
        if (!this.element || this.isMinimized) return; //
        this.isMinimized = true; //
        this.element.classList.add('minimized'); //
        this.isMaximized = false; //
        const maximizeButton = this.titleBar?.querySelector('.window-maximize-btn'); //
        if (maximizeButton) maximizeButton.innerHTML = '□'; // Reset maximize icon //

        if (!skipUndo) this._captureUndo(`Minimize window "${this.title}"`); //

        if (this.appServices.getOpenWindows) { //
            let nextHighestZ = -1; let windowToFocus = null; //
            this.appServices.getOpenWindows().forEach(win => { //
                if (win && win.element && !win.isMinimized && win.id !== this.id) { //
                    const z = parseInt(win.element.style.zIndex); //
                    if (z > nextHighestZ) { nextHighestZ = z; windowToFocus = win; } //
                }
            });
            if (windowToFocus) windowToFocus.focus(true); //
            else if (this.appServices.getOpenWindows) { //
                 this.appServices.getOpenWindows().forEach(win => win?.updateTaskbarButtonActiveState?.()); //
            }
        }
        this.updateTaskbarButtonActiveState(); //
    }

    restore(skipUndo = false) { //
        if (!this.element) return; //
        const wasMinimized = this.isMinimized; //
        if (this.isMinimized) { //
            this.isMinimized = false; //
            this.element.classList.remove('minimized'); //
        }
        this.focus(true); // Focus it, true to skip undo for this focus action itself //
        if (wasMinimized && !skipUndo) this._captureUndo(`Restore window "${this.title}"`); //
        this.updateTaskbarButtonActiveState(); //
    }

    close(isReconstruction = false) { //
        console.log(`[SnugWindow ${this.id}] close() called for "${this.title}". IsReconstruction: ${isReconstruction}`); //

        // Stop interact.js listeners if the instance is active
        if (window.interact && interact.isSet(this.element)) {
            interact(this.element).unset();
        }


        if (this.onCloseCallback && typeof this.onCloseCallback === 'function') { //
            try { this.onCloseCallback(); } //
            catch (e) { console.error(`[SnugWindow ${this.id}] Error in onCloseCallback:`, e); } //
        }

        if (this.taskbarButton) { //
            try { this.taskbarButton.remove(); } //
            catch(e) { console.warn(`[SnugWindow ${this.id}] Error removing taskbar button:`, e.message); } //
            this.taskbarButton = null; //
        }
        if (this.element) { //
            try { this.element.remove(); } //
            catch(e) { console.warn(`[SnugWindow ${this.id}] Error removing window element:`, e.message); } //
            this.element = null; // CRITICAL: Set element to null after removing from DOM //
        }

        const oldWindowTitle = this.title; //
        if (this.appServices.removeWindowFromStore) { //
            this.appServices.removeWindowFromStore(this.id); //
        } else {
            console.warn(`[SnugWindow ${this.id}] appServices.removeWindowFromStore service NOT available.`); //
        }

        const isCurrentlyReconstructing = this.appServices.getIsReconstructingDAW ? this.appServices.getIsReconstructingDAW() : false; //
        if (!isCurrentlyReconstructing && !isReconstruction) { //
            this._captureUndo(`Close window "${oldWindowTitle}"`); //
        }
        console.log(`[SnugWindow ${this.id}] close() finished for "${oldWindowTitle}".`); //
    }

    focus(skipUndoForFocusItself = false) { //
        if (!this.element) return; // Do nothing if element is gone //
        if (this.isMinimized) { this.restore(skipUndoForFocusItself); return; } // Restore if minimized //

        const currentHighestZGlobal = this.appServices.getHighestZ ? this.appServices.getHighestZ() : 100; //
        const currentZ = parseInt(this.element.style.zIndex); //

        if (currentZ < currentHighestZGlobal || (this.appServices.getOpenWindows && this.appServices.getOpenWindows().size === 1)) { //
            if (this.appServices.incrementHighestZ) { //
                const newZ = this.appServices.incrementHighestZ(); //
                this.element.style.zIndex = newZ; //
                console.log(`[SnugWindow ${this.id}] Focused. New z-index: ${newZ}`); //
            }
        } else if (currentZ > currentHighestZGlobal) { //
             if (this.appServices.setHighestZ) { //
                this.appServices.setHighestZ(currentZ); //
                console.log(`[SnugWindow ${this.id}] Focused. Current z-index ${currentZ} is now highest.`); //
            }
        }

        if (this.appServices.getOpenWindows) { //
            this.appServices.getOpenWindows().forEach(win => { //
                if (win && win.updateTaskbarButtonActiveState && typeof win.updateTaskbarButtonActiveState === 'function') { //
                    win.updateTaskbarButtonActiveState(); //
                }
            });
        }
    }

    applyState(state) { //
        if (!this.element) { //
            console.error(`[SnugWindow ${this.id} applyState] Window element does not exist. Cannot apply state for "${state?.title}".`); //
            return; //
        }
        if (!state) { //
            console.error(`[SnugWindow ${this.id} applyState] Invalid or null state object provided.`); //
            return; //
        }

        console.log(`[SnugWindow ${this.id} applyState] Applying state:`, JSON.parse(JSON.stringify(state))); //

        if (state.left) this.element.style.left = state.left; //
        if (state.top) this.element.style.top = state.top; //
        if (state.width) this.element.style.width = state.width; //
        if (state.height) this.element.style.height = state.height; //
        if (Number.isFinite(state.zIndex)) this.element.style.zIndex = state.zIndex; //

        if (this.titleBar) { //
            const titleSpan = this.titleBar.querySelector('span'); //
            if (titleSpan && state.title) titleSpan.textContent = state.title; //
        }
        if (state.title) this.title = state.title; // Update internal title property //

        if (this.taskbarButton && state.title) { //
            this.taskbarButton.textContent = state.title.substring(0, 20) + (state.title.length > 20 ? '...' : ''); //
            this.taskbarButton.title = state.title; //
        }

        if (state.isMinimized && !this.isMinimized) { //
            this.minimize(true); // true for silent (no undo capture) //
        } else if (!state.isMinimized && this.isMinimized) { //
            this.restore(true); // true for silent //
        }
        this.updateTaskbarButtonActiveState(); //
    }
}
