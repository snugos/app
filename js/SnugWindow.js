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
        this.restoreState = {}; // To store position/size before maximizing
        this.appServices = appServices || {}; 

        console.log(`[SnugWindow ${this.id} Constructor] Initializing window "${title}".`);

        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop');
        if (!desktopEl) {
            console.error(`[SnugWindow CRITICAL ${this.id}] Desktop element not found. Cannot create window "${title}".`);
            this.element = null; 
            return; 
        }

        // Get heights of both taskbars
        const bottomTaskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar');
        const bottomTaskbarHeight = bottomTaskbarEl?.offsetHeight > 0 ? bottomTaskbarEl.offsetHeight : 32;
        
        const topTaskbarEl = this.appServices.uiElementsCache?.topTaskbar || document.getElementById('topTaskbar');
        const topTaskbarHeight = topTaskbarEl?.offsetHeight > 0 ? topTaskbarEl.offsetHeight : 32; // Assuming same default height if not found

        const safeDesktopWidth = (desktopEl.offsetWidth > 0) ? desktopEl.offsetWidth : 1024;
        const safeDesktopHeight = (desktopEl.offsetHeight > 0) ? desktopEl.offsetHeight : 768;
        // Usable height is desktop height minus both taskbars
        const usableDesktopHeight = safeDesktopHeight - topTaskbarHeight - bottomTaskbarHeight;

        console.log(`[SnugWindow ${this.id} Constructor] Desktop Dims: ${safeDesktopWidth}x${safeDesktopHeight}, TopTaskbar: ${topTaskbarHeight}, BottomTaskbar: ${bottomTaskbarHeight}, UsableHeight: ${usableDesktopHeight}`);

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
            h = Math.min(optHeight, usableDesktopHeight - 10); // Constrain to usable height
        } else {
            h = Math.max(minH, Math.min(250, usableDesktopHeight - 20)); 
        }
        h = Math.max(minH, h); 

        const maxX = Math.max(5, safeDesktopWidth - w - 5); 
        // maxY is the max top position, so it's usable height - window height, then add topTaskbarHeight
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

        // Adjust initial Y position to be below the top taskbar
        const minY = topTaskbarHeight + 5;
        if (Number.isFinite(optY)) {
            y = Math.max(minY, Math.min(optY, maxY));
        } else {
            y = Math.max(minY, Math.min(cascadeOffset + topTaskbarHeight, maxY));
        }

        const finalX = Number.isFinite(x) ? x : 50;
        const finalY = Number.isFinite(y) ? y : (50 + topTaskbarHeight); // Default Y considers top taskbar
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

        console.log(`[SnugWindow ${this.id} Constructor] Calculated final this.options:`, JSON.parse(JSON.stringify(this.options)));

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

        this.element.style.zIndex = initialZIndex;
        if (this.appServices.setHighestZ && this.appServices.getHighestZ && initialZIndex > this.appServices.getHighestZ()) {
            this.appServices.setHighestZ(initialZIndex);
        }

        this.titleBar = document.createElement('div');
        this.titleBar.className = 'window-title-bar';
        let buttonsHTML = '';
        if (this.options.minimizable) { buttonsHTML += `<button class="window-minimize-btn" title="Minimize">_</button>`; }
        if (this.options.resizable) { buttonsHTML += `<button class="window-maximize-btn" title="Maximize">□</button>`; } 
        if (this.options.closable) { buttonsHTML += `<button class="window-close-btn" title="Close">X</button>`; }
        this.titleBar.innerHTML = `<span>${this.title}</span><div class="window-title-buttons">${buttonsHTML}</div>`;

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
        if (this.appServices.captureStateForUndo) {
            this.appServices.captureStateForUndo(description);
        }
    }

    initInteract() {
        if (!window.interact) {
            console.error("Interact.js not loaded!");
            return;
        }

        const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop');
        const bottomTaskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar');
        const topTaskbarEl = this.appServices.uiElementsCache?.topTaskbar || document.getElementById('topTaskbar');
        
        const bottomTaskbarHeight = bottomTaskbarEl ? bottomTaskbarEl.offsetHeight : 32;
        const topTaskbarHeight = topTaskbarEl ? topTaskbarEl.offsetHeight : 32;

        const snapThreshold = 15; // Pixels for snapping
        let initialXForUndo, initialYForUndo; // To track if position actually changed for undo

        interact(this.element)
            .draggable({
                allowFrom: this.titleBar, 
                inertia: false, 
                modifiers: [ // Keep restriction to parent
                    interact.modifiers.restrictRect({
                        restriction: 'parent', 
                        endOnly: false
                    })
                ],
                autoScroll: false, 
                listeners: {
                    start: (event) => {
                        if (this.isMaximized) { 
                            event.interaction.stop(); 
                            return;
                        }
                        this.focus(); 
                        const rect = this.element.getBoundingClientRect();
                        const parentRect = desktopEl.getBoundingClientRect();
                        initialXForUndo = rect.left - parentRect.left; // Store initial position for undo check
                        initialYForUndo = rect.top - parentRect.top;
                        if (this.titleBar) this.titleBar.style.cursor = 'grabbing'; 
                    },
                    move: (event) => {
                        if (this.isMaximized) return;

                        let x = (parseFloat(this.element.style.left) || 0) + event.dx;
                        let y = (parseFloat(this.element.style.top) || 0) + event.dy;
                        
                        const currentWindowRect = {
                            left: x,
                            top: y,
                            right: x + this.element.offsetWidth,
                            bottom: y + this.element.offsetHeight,
                            width: this.element.offsetWidth,
                            height: this.element.offsetHeight
                        };

                        // --- Snapping Logic ---
                        let snappedX = false;
                        let snappedY = false;

                        // Desktop Edges Snapping
                        const desktopWidth = desktopEl.clientWidth;
                        const desktopHeight = desktopEl.clientHeight; // Full viewport height

                        // Snap to top edge (below top taskbar)
                        if (Math.abs(currentWindowRect.top - topTaskbarHeight) < snapThreshold) {
                            y = topTaskbarHeight;
                            snappedY = true;
                        }
                        // Snap to left edge
                        if (Math.abs(currentWindowRect.left) < snapThreshold) {
                            x = 0;
                            snappedX = true;
                        }
                        // Snap to right edge
                        if (Math.abs(currentWindowRect.right - desktopWidth) < snapThreshold) {
                            x = desktopWidth - currentWindowRect.width;
                            snappedX = true;
                        }
                        // Snap to bottom edge (above bottom taskbar)
                        if (Math.abs(currentWindowRect.bottom - (desktopHeight - bottomTaskbarHeight)) < snapThreshold) {
                            y = desktopHeight - bottomTaskbarHeight - currentWindowRect.height;
                            snappedY = true;
                        }

                        // Window-to-Window Snapping
                        if (this.appServices.getOpenWindows) {
                            this.appServices.getOpenWindows().forEach(otherWin => {
                                if (otherWin.id === this.id || !otherWin.element || otherWin.isMinimized || otherWin.isMaximized) {
                                    return;
                                }
                                const otherRect = {
                                    left: parseFloat(otherWin.element.style.left),
                                    top: parseFloat(otherWin.element.style.top),
                                    right: parseFloat(otherWin.element.style.left) + otherWin.element.offsetWidth,
                                    bottom: parseFloat(otherWin.element.style.top) + otherWin.element.offsetHeight,
                                    width: otherWin.element.offsetWidth,
                                    height: otherWin.element.offsetHeight
                                };

                                // Horizontal Snapping
                                if (!snappedX) {
                                    if (Math.abs(currentWindowRect.right - otherRect.left) < snapThreshold) { x = otherRect.left - currentWindowRect.width; snappedX = true; }
                                    else if (Math.abs(currentWindowRect.left - otherRect.right) < snapThreshold) { x = otherRect.right; snappedX = true; }
                                    else if (Math.abs(currentWindowRect.left - otherRect.left) < snapThreshold) { x = otherRect.left; snappedX = true; }
                                    else if (Math.abs(currentWindowRect.right - otherRect.right) < snapThreshold) { x = otherRect.right - currentWindowRect.width; snappedX = true; }
                                }

                                // Vertical Snapping
                                if (!snappedY) {
                                    if (Math.abs(currentWindowRect.bottom - otherRect.top) < snapThreshold) { y = otherRect.top - currentWindowRect.height; snappedY = true; }
                                    else if (Math.abs(currentWindowRect.top - otherRect.bottom) < snapThreshold) { y = otherRect.bottom; snappedY = true; }
                                    else if (Math.abs(currentWindowRect.top - otherRect.top) < snapThreshold) { y = otherRect.top; snappedY = true; }
                                    else if (Math.abs(currentWindowRect.bottom - otherRect.bottom) < snapThreshold) { y = otherRect.bottom - currentWindowRect.height; snappedY = true; }
                                }
                            });
                        }
                        // --- End Snapping Logic ---

                        // Ensure window stays within desktop bounds (respecting taskbars)
                        const titleBarHeight = this.titleBar?.offsetHeight || 30;
                        const minAllowableY = topTaskbarHeight;
                        const maxAllowableY = desktopHeight - bottomTaskbarHeight - currentWindowRect.height;
                        const maxAllowableYForTitle = desktopHeight - bottomTaskbarHeight - titleBarHeight;


                        y = Math.max(minAllowableY, Math.min(y, maxAllowableY, maxAllowableYForTitle));
                        x = Math.max(0, Math.min(x, desktopWidth - currentWindowRect.width));


                        this.element.style.left = `${x}px`;
                        this.element.style.top = `${y}px`;
                    },
                    end: (event) => {
                        if (this.titleBar) this.titleBar.style.cursor = 'grab'; 
                        if (!this.isMaximized) {
                             const finalRect = this.element.getBoundingClientRect();
                             const parentRect = desktopEl.getBoundingClientRect();
                             const finalX = finalRect.left - parentRect.left;
                             const finalY = finalRect.top - parentRect.top;

                            // Capture undo only if position actually changed significantly
                            if (Math.abs(finalX - initialXForUndo) > 1 || Math.abs(finalY - initialYForUndo) > 1) {
                                this._captureUndo(`Move window "${this.title}"`);
                            }
                        }
                    }
                }
            });

        if (this.options.resizable) { 
            interact(this.element)
                .resizable({
                    edges: { left: true, right: true, bottom: true, top: true }, 
                    listeners: {
                        start: (event) => {
                            if (this.isMaximized) {
                                event.interaction.stop();
                                return;
                            }
                            this.focus(); 
                        },
                        move: (event) => {
                            if (this.isMaximized) return;
                            let x = parseFloat(this.element.style.left) || 0;
                            let y = parseFloat(this.element.style.top) || 0;

                            // Update the element's style
                            this.element.style.width = `${event.rect.width}px`;
                            this.element.style.height = `${event.rect.height}px`;

                            // Translate when resizing from top or left edges
                            x += event.deltaRect.left;
                            y += event.deltaRect.top;
                            
                            this.element.style.left = `${x}px`;
                            this.element.style.top = `${y}px`;
                        },
                        end: (event) => {
                            if (!this.isMaximized) {
                               this._captureUndo(`Resize window "${this.title}"`);
                            }
                        }
                    },
                    modifiers: [
                        interact.modifiers.restrictEdges({
                            outer: 'parent', // Restrict to desktop
                        }),
                        interact.modifiers.restrictSize({
                            min: { width: this.options.minWidth, height: this.options.minHeight },
                            // Max size can be constrained by desktop dimensions minus taskbars
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

        const interactable = interact(this.element);
        const bottomTaskbarHeight = bottomTaskbarEl.offsetHeight > 0 ? bottomTaskbarEl.offsetHeight : 32;
        const topTaskbarHeight = topTaskbarEl.offsetHeight > 0 ? topTaskbarEl.offsetHeight : 32;


        if (this.isMaximized) { 
            this.element.style.left = this.restoreState.left || `${this.options.x}px`; 
            this.element.style.top = this.restoreState.top || `${this.options.y}px`; 
            this.element.style.width = this.restoreState.width || `${this.options.width}px`; 
            this.element.style.height = this.restoreState.height || `${this.options.height}px`; 
            this.isMaximized = false; 
            if (maximizeButton) maximizeButton.innerHTML = '□'; 
            if (interactable.draggable()) interactable.draggable(true); 
            if (this.options.resizable && interactable.resizable()) interactable.resizable(true); 
            
        } else {
            this.restoreState = { 
                left: this.element.style.left, top: this.element.style.top, 
                width: this.element.style.width, height: this.element.style.height, 
            };
            this.element.style.left = '0px'; 
            this.element.style.top = `${topTaskbarHeight}px`; // Position below top taskbar
            this.element.style.width = `${desktopEl.clientWidth}px`; 
            this.element.style.height = `${desktopEl.clientHeight - topTaskbarHeight - bottomTaskbarHeight}px`; // Fit between taskbars
            this.isMaximized = true; 
            if (maximizeButton) maximizeButton.innerHTML = '❐'; 
            if (interactable.draggable()) interactable.draggable(false); 
            if (this.options.resizable && interactable.resizable()) interactable.resizable(false); 
        }
        this._captureUndo(`${wasMaximized ? "Restore" : "Maximize"} window "${this.title}"`); 
        this.focus(); 
    }

    createTaskbarButton() { 
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

            if (this.appServices.getTrackById) { 
                let trackId = null; 
                const parts = this.id.split('-'); 
                if (parts.length > 1 && (this.id.startsWith('trackInspector-') || this.id.startsWith('effectsRack-') || this.id.startsWith('sequencerWin-'))) { 
                    const idPart = parts[parts.length - 1]; 
                    if (!isNaN(parseInt(idPart))) trackId = parseInt(idPart); 
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
            createContextMenu(event, menuItems, this.appServices); 
        });
        this.updateTaskbarButtonActiveState(); 
    }

    updateTaskbarButtonActiveState() { 
        if (!this.taskbarButton || !this.element) return; 
        const currentHighestZ = this.appServices.getHighestZ ? this.appServices.getHighestZ() : 100; 
        const isActive = !this.isMinimized && parseInt(this.element.style.zIndex) === currentHighestZ; 
        this.taskbarButton.classList.toggle('active', isActive); 
        this.taskbarButton.classList.toggle('minimized-on-taskbar', this.isMinimized); 
    }

    minimize(skipUndo = false) { 
        if (!this.element || this.isMinimized) return; 
        this.isMinimized = true; 
        this.element.classList.add('minimized'); 
        
        // If it was maximized, restore its pre-maximized state logically, but keep it hidden
        if (this.isMaximized) {
            this.isMaximized = false; 
            const maximizeButton = this.titleBar?.querySelector('.window-maximize-btn'); 
            if (maximizeButton) maximizeButton.innerHTML = '□'; 
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
        console.log(`[SnugWindow ${this.id}] close() called for "${this.title}". IsReconstruction: ${isReconstruction}`);

        if (window.interact && this.element && interact.isSet(this.element)) { 
            try {
                interact(this.element).unset(); 
                console.log(`[SnugWindow ${this.id}] Interact.js instance unset for element.`);
            } catch (e) {
                console.warn(`[SnugWindow ${this.id}] Error unsetting Interact.js instance:`, e.message);
            }
        }

        if (this.onCloseCallback && typeof this.onCloseCallback === 'function') {
            try { this.onCloseCallback(); }
            catch (e) { console.error(`[SnugWindow ${this.id}] Error in onCloseCallback:`, e); }
        }

        if (this.taskbarButton) {
            try { this.taskbarButton.remove(); }
            catch(e) { console.warn(`[SnugWindow ${this.id}] Error removing taskbar button:`, e.message); }
            this.taskbarButton = null;
        }
        if (this.element) {
            try { this.element.remove(); }
            catch(e) { console.warn(`[SnugWindow ${this.id}] Error removing window element:`, e.message); }
            this.element = null; 
        }

        const oldWindowTitle = this.title;
        if (this.appServices.removeWindowFromStore) {
            this.appServices.removeWindowFromStore(this.id);
        } else {
            console.warn(`[SnugWindow ${this.id}] appServices.removeWindowFromStore service NOT available.`);
        }

        const isCurrentlyReconstructing = this.appServices.getIsReconstructingDAW ? this.appServices.getIsReconstructingDAW() : false;
        if (!isCurrentlyReconstructing && !isReconstruction) {
            this._captureUndo(`Close window "${oldWindowTitle}"`);
        }
        console.log(`[SnugWindow ${this.id}] close() finished for "${oldWindowTitle}".`);
    }

    focus(skipUndoForFocusItself = false) { 
        if (!this.element) return; 
        if (this.isMinimized) { this.restore(skipUndoForFocusItself); return; } 

        const currentHighestZGlobal = this.appServices.getHighestZ ? this.appServices.getHighestZ() : 100; 
        const currentZ = parseInt(this.element.style.zIndex); 

        if (currentZ < currentHighestZGlobal || (this.appServices.getOpenWindows && this.appServices.getOpenWindows().size === 1)) { 
            if (this.appServices.incrementHighestZ) { 
                const newZ = this.appServices.incrementHighestZ(); 
                this.element.style.zIndex = newZ; 
                // console.log(`[SnugWindow ${this.id}] Focused. New z-index: ${newZ}`); 
            }
        } else if (currentZ > currentHighestZGlobal) { 
             if (this.appServices.setHighestZ) { 
                this.appServices.setHighestZ(currentZ); 
                // console.log(`[SnugWindow ${this.id}] Focused. Current z-index ${currentZ} is now highest.`); 
            }
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

        if (state.isMaximized && !this.isMaximized) {
            this.toggleMaximize(); // This will handle setting isMaximized and restoreState
        } else if (!state.isMaximized && this.isMaximized) {
            this.toggleMaximize(); // Restore if it was maximized but shouldn't be
        }
        
        if (state.isMinimized && !this.isMinimized) { 
            this.minimize(true); 
        } else if (!state.isMinimized && this.isMinimized) { 
            this.restore(true); 
        }
        this.updateTaskbarButtonActiveState(); 
    }
}
