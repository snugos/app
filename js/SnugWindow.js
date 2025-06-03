// js/SnugWindow.js - SnugWindow Class Module

import { createContextMenu } from './utils.js';

export class SnugWindow {
    constructor(id, title, contentHTMLOrElement, options = {}, appServices = {}) {
        // ... constructor code remains identical to response #24 ...
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
        console.log(`[SnugWindow ${this.id}] initInteract called for window: "${this.title}"`);
        if (!window.interact || typeof window.interact !== 'function') {
            console.error(`[SnugWindow ${this.id}] Interact.js not loaded or not a function!`);
            return;
        }
        if (!this.element) {
            console.error(`[SnugWindow ${this.id}] initInteract: this.element is null.`);
            return;
        }
        if (!this.titleBar) {
            console.error(`[SnugWindow ${this.id}] initInteract: this.titleBar is null. Dragging will be compromised.`);
            // If titleBar is null, dragging won't work as intended with the setup below.
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

        // --- Draggable Setup ---
        // MODIFICATION: Target this.titleBar directly for dragging
        if (this.titleBar) {
            console.log(`[SnugWindow ${this.id}] Setting up draggable ON this.titleBar. Target Element for movement:`, this.element);
            interact(this.titleBar)
                .draggable({
                    inertia: false,
                    autoScroll: false, // Usually not needed if desktop doesn't scroll
                    listeners: {
                        start: (event) => {
                            console.log(`[SnugWindow ${this.id}] DRAG START triggered ON titleBar for window "${this.title}"`);
                            if (this.isMaximized) {
                                event.interaction.stop();
                                return;
                            }
                            this.focus();
                            const windowRect = this.element.getBoundingClientRect();
                            const parentRect = desktopEl.getBoundingClientRect();
                            initialXForUndo = windowRect.left - parentRect.left;
                            initialYForUndo = windowRect.top - parentRect.top;
                            this.titleBar.style.cursor = 'grabbing';
                        },
                        move: (event) => {
                            if (this.isMaximized || !this.element) return;

                            let x = (parseFloat(this.element.style.left) || 0) + event.dx;
                            let y = (parseFloat(this.element.style.top) || 0) + event.dy;

                            // Snapping logic (uses this.element for dimensions and position)
                            const currentWindowRect = {
                                left: x, top: y,
                                right: x + this.element.offsetWidth, bottom: y + this.element.offsetHeight,
                                width: this.element.offsetWidth, height: this.element.offsetHeight
                            };
                            let snappedX = false; let snappedY = false;
                            const desktopWidth = desktopEl.clientWidth; const desktopHeight = desktopEl.clientHeight;

                            if (Math.abs(currentWindowRect.top - topTaskbarHeight) < snapThreshold) { y = topTaskbarHeight; snappedY = true; }
                            if (Math.abs(currentWindowRect.left) < snapThreshold) { x = 0; snappedX = true; }
                            if (Math.abs(currentWindowRect.right - desktopWidth) < snapThreshold) { x = desktopWidth - currentWindowRect.width; snappedX = true; }
                            if (Math.abs(currentWindowRect.bottom - (desktopHeight - bottomTaskbarHeight)) < snapThreshold) { y = desktopHeight - bottomTaskbarHeight - currentWindowRect.height; snappedY = true; }

                            if (this.appServices.getOpenWindows) {
                                this.appServices.getOpenWindows().forEach(otherWin => {
                                    if (otherWin.id === this.id || !otherWin.element || otherWin.isMinimized || otherWin.isMaximized) return;
                                    const otherRectStyle = otherWin.element.style;
                                    const otherRect = { left: parseFloat(otherRectStyle.left), top: parseFloat(otherRectStyle.top), right: parseFloat(otherRectStyle.left) + otherWin.element.offsetWidth, bottom: parseFloat(otherRectStyle.top) + otherWin.element.offsetHeight, width: otherWin.element.offsetWidth, height: otherWin.element.offsetHeight };
                                    if (isNaN(otherRect.left) || isNaN(otherRect.top)) return;
                                    if (!snappedX) { /* ... X snapping ... */ }
                                    if (!snappedY) { /* ... Y snapping ... */ }
                                });
                            }
                            const titleBarH = this.titleBar?.offsetHeight || 30;
                            const minAllowableY = topTaskbarHeight; const maxAllowableY = desktopHeight - bottomTaskbarHeight - currentWindowRect.height; const maxAllowableYForTitle = desktopHeight - bottomTaskbarHeight - titleBarH;
                            y = Math.max(minAllowableY, Math.min(y, maxAllowableY, maxAllowableYForTitle));
                            x = Math.max(0, Math.min(x, desktopWidth - currentWindowRect.width));

                            this.element.style.left = `${x}px`;
                            this.element.style.top = `${y}px`;
                        },
                        end: (event) => {
                            // console.log(`[SnugWindow ${this.id}] DRAG END ON titleBar for window "${this.title}"`);
                            if (this.titleBar) this.titleBar.style.cursor = 'grab';
                            if (!this.isMaximized && this.element) {
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
            console.log(`[SnugWindow ${this.id}] Draggable setup ON titleBar apparently complete.`);
        } else {
            console.error(`[SnugWindow ${this.id}] Draggable setup SKIPPED: this.titleBar is null.`);
        }

        // --- Resizable Setup ---
        if (this.options.resizable && this.element) {
            // console.log(`[SnugWindow ${this.id}] Setting up resizable for element:`, this.element);
            interact(this.element)
                .resizable({
                    // MODIFICATION: Disable resizing from the top edge. Allow from L, R, B.
                    edges: { left: true, right: true, bottom: true, top: false },
                    // MODIFICATION: Explicitly ignore pointer events starting on the titleBar for resizing.
                    ignoreFrom: this.titleBar,
                    listeners: {
                        start: (event) => {
                            if (this.isMaximized) { event.interaction.stop(); return; }
                            this.focus();
                        },
                        move: (event) => {
                            if (this.isMaximized) return;
                            let xPos = parseFloat(this.element.style.left) || 0;
                            let yPos = parseFloat(this.element.style.top) || 0;
                            this.element.style.width = `${event.rect.width}px`;
                            this.element.style.height = `${event.rect.height}px`;
                            xPos += event.deltaRect.left; // Apply translation for L,T resize
                            yPos += event.deltaRect.top;
                            this.element.style.left = `${xPos}px`;
                            this.element.style.top = `${yPos}px`;
                        },
                        end: (event) => {
                            if (!this.isMaximized) { this._captureUndo(`Resize window "${this.title}"`); }
                        }
                    },
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
            // console.log(`[SnugWindow ${this.id}] Resizable setup with edges (L:T, R:T, B:T, T:F) and ignoreFrom titleBar complete.`);
        }
    }

    toggleMaximize() { /* ... same as previous robust version ... */ }
    createTaskbarButton() { /* ... same as previous robust version ... */ }
    updateTaskbarButtonActiveState() { /* ... same ... */ }
    minimize(skipUndo = false) { /* ... same robust version ... */ }
    restore(skipUndo = false) { /* ... same ... */ }
    close(isReconstruction = false) { /* ... same as previous robust version (Interact.js unset commented for testing) ... */ }
    focus(skipUndoForFocusItself = false) { /* ... same ... */ }
    applyState(state) { /* ... same ... */ }
}
