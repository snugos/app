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
        this._isDragging = false;
        this._isResizing = false;
        this._resizeDirection = null;
        this._initialMouseX = 0;
        this._initialMouseY = 0;
        this._initialWindowX = 0;
        this._initialWindowY = 0;
        this._initialWidth = 0;
        this._initialHeight = 0;

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
        const maxYWindowBottom = topTaskbarHeight + usableDesktopHeight - h - 5;
        const titleBarHeightForMaxY = this.titleBar?.offsetHeight || 30; // Estimate if not yet rendered
        const maxYTitleBar = topTaskbarHeight + usableDesktopHeight - titleBarHeightForMaxY - 5;
        const finalMaxY = Math.min(maxYWindowBottom, maxYTitleBar);

        const openWindowCount = this.appServices.getOpenWindowsState ? this.appServices.getOpenWindowsState().size : 0;
        const cascadeOffsetBase = 20;
        const cascadeIncrement = 25;
        const cascadeOffset = cascadeOffsetBase + (openWindowCount % 10) * cascadeIncrement;

        if (Number.isFinite(optX)) { x = Math.max(5, Math.min(optX, maxX)); }
        else { x = Math.max(5, Math.min(cascadeOffset, maxX)); }

        const minY = topTaskbarHeight + 5;
        if (Number.isFinite(optY)) { y = Math.max(minY, Math.min(optY, finalMaxY)); }
        else { y = Math.max(minY, Math.min(cascadeOffset, finalMaxY)); }


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

        const initialZIndex = Number.isFinite(parseFloat(options.zIndex)) ? parseFloat(options.zIndex) :
            (this.appServices.incrementHighestZState ? this.appServices.incrementHighestZState() : 101);
        this.element.style.zIndex = initialZIndex.toString();

        if (this.appServices.setHighestZState && this.appServices.getHighestZState && initialZIndex > this.appServices.getHighestZState()) {
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
        else { console.warn(`[SnugWindow ${this.id}] Invalid content provided for window "${this.title}".`); }

        this.element.appendChild(this.titleBar);
        this.element.appendChild(this.contentArea);
        desktopEl.appendChild(this.element);

        if (this.appServices.addWindowToStoreState) { this.appServices.addWindowToStoreState(this.id, this); }

        this._makeDraggable();
        if (this.options.resizable) {
            this._makeResizable();
        }

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
            button.addEventListener('pointerdown', e => e.stopPropagation());
        });

        this.element.addEventListener('pointerdown', () => this.focus(), true);
        this.createTaskbarButton();
        if (this.options.isMinimized) { this.minimize(true); }
        if (!this.options.isMinimized && !options.zIndex) { this.focus(); }
    }

    _captureUndo(description) {
        if (this.appServices.captureStateForUndoInternal) {
            this.appServices.captureStateForUndoInternal(description);
        }
    }

    _makeDraggable() {
        if (!this.titleBar || !this.element) return;

        const onPointerDown = (e) => {
            if (e.button !== 0 || this.isMaximized || e.target.tagName === 'BUTTON' || e.target.closest('button')) return; 
            e.preventDefault(); 
            
            this._isDragging = true;
            this.focus();
            
            this._initialWindowX = this.element.offsetLeft;
            this._initialWindowY = this.element.offsetTop;
            this._initialMouseX = e.clientX;
            this._initialMouseY = e.clientY;
            
            this.titleBar.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';

            document.addEventListener('pointermove', onPointerMoveDrag);
            document.addEventListener('pointerup', onPointerUpDrag);
        };

        const onPointerMoveDrag = (e) => {
            if (!this._isDragging || !this.element) return;
            e.preventDefault();

            const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop');
            if (!desktopEl) { this._isDragging = false; return; }

            let dx = e.clientX - this._initialMouseX;
            let dy = e.clientY - this._initialMouseY;
            
            let newX = this._initialWindowX + dx;
            let newY = this._initialWindowY + dy;

            const desktopRect = desktopEl.getBoundingClientRect();
            const topTaskbarEl = this.appServices.uiElementsCache?.topTaskbar || document.getElementById('topTaskbar');
            const bottomTaskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar');
            const topTaskbarHeight = topTaskbarEl ? topTaskbarEl.offsetHeight : 0;
            const bottomTaskbarHeight = bottomTaskbarEl ? bottomTaskbarEl.offsetHeight : 0;
            const snapThreshold = 15;
            
            if (Math.abs(newX) < snapThreshold) newX = 0;
            if (Math.abs(newX + this.element.offsetWidth - desktopRect.width) < snapThreshold) newX = desktopRect.width - this.element.offsetWidth;
            
            if (Math.abs(newY - topTaskbarHeight) < snapThreshold) newY = topTaskbarHeight;
            if (Math.abs(newY + this.element.offsetHeight - (desktopRect.height - bottomTaskbarHeight)) < snapThreshold) {
                newY = desktopRect.height - bottomTaskbarHeight - this.element.offsetHeight;
            }
            
            newX = Math.max(0, Math.min(newX, desktopRect.width - this.element.offsetWidth));
            const titleBarH = this.titleBar?.offsetHeight || 30;
            newY = Math.max(topTaskbarHeight, Math.min(newY, desktopRect.height - bottomTaskbarHeight - titleBarH));
            newY = Math.min(newY, desktopRect.height - bottomTaskbarHeight - this.element.offsetHeight);


            this.element.style.left = `${newX}px`;
            this.element.style.top = `${newY}px`;
        };

        const onPointerUpDrag = (e) => {
            if (!this._isDragging) return;
            this._isDragging = false;
            if (this.titleBar) this.titleBar.style.cursor = 'grab';
            document.body.style.userSelect = '';

            document.removeEventListener('pointermove', onPointerMoveDrag);
            document.removeEventListener('pointerup', onPointerUpDrag);

            if (this.element && (this.element.offsetLeft !== this._initialWindowX || this.element.offsetTop !== this._initialWindowY)) {
               this._captureUndo(`Move window "${this.title}"`);
            }
        };

        this.titleBar.addEventListener('pointerdown', onPointerDown);
    }

    _makeResizable() {
        if (!this.element) return;
        const resizerEl = document.createElement('div');
        resizerEl.className = 'window-resizer-handle'; // Style this in CSS
        this.element.appendChild(resizerEl);
        this.element.style.position = 'relative'; 

        const onPointerDownResize = (e) => {
            if (e.button !== 0 || this.isMaximized) return;
            e.preventDefault();
            e.stopPropagation(); 

            this._isResizing = true;
            this.focus();

            this._initialWidth = this.element.offsetWidth;
            this._initialHeight = this.element.offsetHeight;
            this._initialMouseX = e.clientX;
            this._initialMouseY = e.clientY;
            this._initialWindowX = this.element.offsetLeft; // For left/top edge resize if implemented
            this._initialWindowY = this.element.offsetTop; // For left/top edge resize if implemented
            
            document.body.style.cursor = 'nwse-resize'; // Default for bottom-right
            document.body.style.userSelect = 'none';

            document.addEventListener('pointermove', onPointerMoveResize);
            document.addEventListener('pointerup', onPointerUpResize);
        };

        const onPointerMoveResize = (e) => {
            if (!this._isResizing || !this.element) return;
            e.preventDefault();

            const dx = e.clientX - this._initialMouseX;
            const dy = e.clientY - this._initialMouseY;
            
            let newWidth = this._initialWidth + dx;
            let newHeight = this._initialHeight + dy;

            newWidth = Math.max(this.options.minWidth, newWidth);
            newHeight = Math.max(this.options.minHeight, newHeight);
            
            const desktopEl = this.appServices.uiElementsCache?.desktop || document.getElementById('desktop');
            if (desktopEl) {
                const topTaskbarEl = this.appServices.uiElementsCache?.topTaskbar || document.getElementById('topTaskbar');
                const bottomTaskbarEl = this.appServices.uiElementsCache?.taskbar || document.getElementById('taskbar');
                const topTaskbarHeight = topTaskbarEl ? topTaskbarEl.offsetHeight : 0;
                // const bottomTaskbarHeight = bottomTaskbarEl ? bottomTaskbarEl.offsetHeight : 0; // Not directly used for max height calculation from top-left origin

                const maxWidth = desktopEl.clientWidth - this.element.offsetLeft -5; // -5 for margin
                const maxHeight = desktopEl.clientHeight - this.element.offsetTop - topTaskbarHeight -5; // -5 for margin (assuming top taskbar is relevant for max height from current top)
                
                newWidth = Math.min(newWidth, maxWidth);
                newHeight = Math.min(newHeight, maxHeight);
            }

            this.element.style.width = `${newWidth}px`;
            this.element.style.height = `${newHeight}px`;
        };

        const onPointerUpResize = (e) => {
            if (!this._isResizing) return;
            this._isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            document.removeEventListener('pointermove', onPointerMoveResize);
            document.removeEventListener('pointerup', onPointerUpResize);

             if (this.element && (this.element.offsetWidth !== this._initialWidth || this.element.offsetHeight !== this._initialHeight)) {
               this._captureUndo(`Resize window "${this.title}"`);
            }
        };

        resizerEl.addEventListener('pointerdown', onPointerDownResize);
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

        const maximizeButton = this.titleBar?.querySelector('.window-maximize-btn i');
        const wasMaximized = this.isMaximized;

        if (this.isMaximized) {
            this.element.style.left = this.restoreState.left || `${this.options.x}px`;
            this.element.style.top = this.restoreState.top || `${this.options.y}px`;
            this.element.style.width = this.restoreState.width || `${this.options.width}px`;
            this.element.style.height = this.restoreState.height || `${this.options.height}px`;
            this.isMaximized = false;
            if (maximizeButton) { maximizeButton.classList.remove('fa-window-restore'); maximizeButton.classList.add('fa-square'); }
        } else {
            this.restoreState = {
                left: this.element.style.left, top: this.element.style.top,
                width: this.element.style.width, height: this.element.style.height,
            };
            const bottomTaskbarHeight = bottomTaskbarEl.offsetHeight > 0 ? bottomTaskbarEl.offsetHeight : 0; // Default 0 if no height
            const topTaskbarHeight = topTaskbarEl.offsetHeight > 0 ? topTaskbarEl.offsetHeight : 0;

            this.element.style.left = '0px';
            this.element.style.top = `${topTaskbarHeight}px`;
            this.element.style.width = `${desktopEl.clientWidth}px`;
            this.element.style.height = `${desktopEl.clientHeight - topTaskbarHeight - bottomTaskbarHeight}px`;
            this.isMaximized = true;
            if (maximizeButton) { maximizeButton.classList.remove('fa-square'); maximizeButton.classList.add('fa-window-restore'); }
        }
        this._captureUndo(`${wasMaximized ? "Restore" : "Maximize"} window "${this.title}"`);
        this.focus();
    }

    createTaskbarButton() {
        const taskbarContainer = document.getElementById('taskbar'); // Assuming this is where buttons go
        if (!taskbarContainer) {
             console.warn(`[SnugWindow ${this.id}] Taskbar container for buttons not found (expected #taskbar).`);
             return;
        }
         // Find or create a dedicated div for buttons if not using Tailwind for layout
        let taskbarButtonsContainer = taskbarContainer.querySelector('#taskbarButtons');
        if (!taskbarButtonsContainer) {
            taskbarButtonsContainer = document.createElement('div');
            taskbarButtonsContainer.id = 'taskbarButtons';
            taskbarButtonsContainer.style.display = 'flex'; // Basic flex layout
            // Insert after startButton if it exists, otherwise at the beginning
            const startButton = taskbarContainer.querySelector('#startButton'); // Assuming #startButton exists
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

        this.taskbarButton.addEventListener('click', () => {
            if (!this.element) return;
            if (this.isMinimized) {
                this.restore();
            } else {
                const currentHighestZ = this.appServices.getHighestZState ? this.appServices.getHighestZState() : 100;
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
             createContextMenu(event, menuItems, this.appServices);
        });
        this.updateTaskbarButtonActiveState();
    }

    updateTaskbarButtonActiveState() {
        if (!this.taskbarButton || !this.element) return;
        const currentHighestZ = this.appServices.getHighestZState ? this.appServices.getHighestZState() : 100;
        const isActive = !this.isMinimized && parseInt(this.element.style.zIndex) === currentHighestZ;
        this.taskbarButton.classList.toggle('active', isActive);
        this.taskbarButton.classList.toggle('minimized-on-taskbar', this.isMinimized);
    }

    minimize(skipUndo = false) {
        if (!this.element || this.isMinimized) return;
        this.isMinimized = true;
        this.element.classList.add('minimized');
        this.isMaximized = false;
        const maximizeButton = this.titleBar?.querySelector('.window-maximize-btn i');
        if (maximizeButton) { maximizeButton.classList.remove('fa-window-restore'); maximizeButton.classList.add('fa-square'); }

        if (!skipUndo) this._captureUndo(`Minimize window "${this.title}"`);

        if (this.appServices.getOpenWindowsState) {
            let nextHighestZ = -1; let windowToFocus = null;
            this.appServices.getOpenWindowsState().forEach(win => {
                if (win && win.element && !win.isMinimized && win.id !== this.id) {
                    const z = parseInt(win.element.style.zIndex);
                    if (z > nextHighestZ) { nextHighestZ = z; windowToFocus = win; }
                }
            });
            if (windowToFocus) windowToFocus.focus(true);
            else if (this.appServices.getOpenWindowsState) {
                 this.appServices.getOpenWindowsState().forEach(win => win?.updateTaskbarButtonActiveState?.());
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
        if (!this.element) {
            console.warn(`[SnugWindow ${this.id}] close(): Element is already null. Cleanup store entry.`);
            if (this.appServices && this.appServices.removeWindowFromStoreState) {
                 this.appServices.removeWindowFromStoreState(this.id);
            }
            this.taskbarButton = null; // Should already be removed if element is gone, but ensure.
            return;
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

        if (this.element && this.element.parentNode) {
            try { this.element.parentNode.removeChild(this.element); }
            catch (e) { console.warn(`[SnugWindow ${this.id}] Error removing window element from DOM:`, e.message); }
        }
        this.element = null; 

        const oldWindowTitle = this.title;
        if (this.appServices.removeWindowFromStoreState) {
            this.appServices.removeWindowFromStoreState(this.id);
        }

        const isCurrentlyReconstructing = this.appServices.getIsReconstructingDAW ? this.appServices.getIsReconstructingDAW() : false;
        if (!isCurrentlyReconstructing && !isReconstruction) {
            this._captureUndo(`Close window "${oldWindowTitle}"`);
        }
    }

    focus(skipUndoForFocusItself = false) { 
        if (!this.element) return; 
        if (this.isMinimized) { this.restore(skipUndoForFocusItself); return; } 

        const currentHighestZGlobal = this.appServices.getHighestZState ? this.appServices.getHighestZState() : 100;
        const currentZ = parseInt(this.element.style.zIndex);

        if (currentZ < currentHighestZGlobal || (this.appServices.getOpenWindowsState && this.appServices.getOpenWindowsState().size === 1)) {
            if (this.appServices.incrementHighestZState) {
                const newZ = this.appServices.incrementHighestZState();
                this.element.style.zIndex = newZ;
            }
        } else if (currentZ > currentHighestZGlobal) { 
             if (this.appServices.setHighestZState) {
                this.appServices.setHighestZState(currentZ);
            }
        }
        if (this.appServices.getOpenWindowsState) {
            this.appServices.getOpenWindowsState().forEach(win => {
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
            this.taskbarButton.textContent = state.title.substring(0, 15) + (state.title.length > 15 ? '...' : '');
            this.taskbarButton.title = state.title;
        }

        if (state.isMaximized && !this.isMaximized) {
            this.toggleMaximize(); // Will use saved restoreState if available within state, or maximize fresh
        } else if (!state.isMaximized && this.isMaximized) {
            this.toggleMaximize(); // Restore
        }

        if (state.isMinimized && !this.isMinimized) {
            this.minimize(true); 
        } else if (!state.isMinimized && this.isMinimized) {
            this.restore(true); 
        }
        this.updateTaskbarButtonActiveState();
    }
}
