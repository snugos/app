// js/SnugWindow.js - SnugWindow Class Module

import { captureStateForUndo, getTracks } from './state.js'; // Import getTracks

// Default theme colors (can be overridden by user settings in future)
const defaultWindowBg = '#c0c0c0';
const defaultWindowContentBg = '#c0c0c0';


export class SnugWindow {
    constructor(id, title, contentHTMLOrElement, options = {}) {
        this.id = id;
        this.title = title;
        this.isMinimized = false;
        this.initialContentKey = options.initialContentKey || id;
        this.resizeObserver = null;
        this.taskbarButton = null;

        const desktopEl = document.getElementById('desktop');
        if (!desktopEl) {
            console.error("SnugWindow: Desktop element not found for window ID:", this.id);
            this.element = null;
            return;
        }

        const defaultWidth = options.width || Math.min(350, desktopEl.offsetWidth - 40);
        const defaultHeight = options.height || Math.min(250, desktopEl.offsetHeight - 80);
        const taskbarHeightVal = document.getElementById('taskbar')?.offsetHeight || 28;

        const maxX = Math.max(5, desktopEl.offsetWidth - defaultWidth - 10);
        const maxY = Math.max(5, desktopEl.offsetHeight - defaultHeight - 10 - taskbarHeightVal);

        const randomX = Math.max(5, Math.min((Math.random() * maxX) || 5, maxX));
        const randomY = Math.max(5, Math.min((Math.random() * maxY) || 5, maxY));

        this.options = {
            x: randomX, y: randomY,
            width: defaultWidth, height: defaultHeight,
            closable: true, minimizable: true,
            ...options
        };
        
        this.element = document.createElement('div');
        this.element.id = `window-${this.id}`;
        this.element.className = 'window';
        this.element.style.left = `${this.options.x}px`;
        this.element.style.top = `${this.options.y}px`;
        this.element.style.width = `${this.options.width}px`;
        this.element.style.height = `${this.options.height}px`;
        this.element.style.zIndex = options.zIndex !== undefined ? options.zIndex : ++window.highestZIndex; // window.highestZIndex is still global for now
        this.element.style.backgroundColor = `var(--window-bg, ${defaultWindowBg})`;

        let buttonsHTML = '';
        if (this.options.minimizable) { buttonsHTML += `<button class="window-minimize-btn" title="Minimize">_</button>`; }
        if (this.options.closable) { buttonsHTML += `<button class="window-close-btn" title="Close">X</button>`; }

        this.titleBar = document.createElement('div');
        this.titleBar.className = 'window-title-bar';
        this.titleBar.innerHTML = `<span>${this.title}</span><div class="window-title-buttons">${buttonsHTML}</div>`;

        this.contentArea = document.createElement('div');
        this.contentArea.className = 'window-content';
        this.contentArea.style.backgroundColor = `var(--window-content-bg, ${defaultWindowContentBg})`;

        if (typeof contentHTMLOrElement === 'string') {
            this.contentArea.innerHTML = contentHTMLOrElement;
        } else if (contentHTMLOrElement instanceof HTMLElement) {
            this.contentArea.appendChild(contentHTMLOrElement);
        } else {
            console.warn(`SnugWindow ${this.id}: Content is not a string or HTMLElement.`);
        }


        this.element.appendChild(this.titleBar);
        this.element.appendChild(this.contentArea);

        desktopEl.appendChild(this.element);
        window.openWindows[this.id] = this; // window.openWindows is still global for now

        this.makeDraggable();
        this.makeResizable();

        if (this.options.closable) {
            const closeBtn = this.element.querySelector('.window-close-btn');
            if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
        }
        if (this.options.minimizable) {
            const minBtn = this.element.querySelector('.window-minimize-btn');
            if (minBtn) minBtn.addEventListener('click', (e) => { e.stopPropagation(); this.minimize(); });
        }

        this.element.addEventListener('mousedown', () => this.focus(), true);
        this.createTaskbarButton();

        if (options.isMinimized) {
            this.minimize(true);
        }
    }

    makeDraggable() {
        if (!this.titleBar) return;
        let offsetX, offsetY, isDragging = false;
        const desktopEl = document.getElementById('desktop');
        let initialX, initialY;

        this.titleBar.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || !desktopEl) return;
            isDragging = true; this.focus();
            initialX = this.element.offsetLeft;
            initialY = this.element.offsetTop;
            offsetX = e.clientX - initialX;
            offsetY = e.clientY - initialY;
            this.titleBar.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !desktopEl) return;
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            const desktopRect = desktopEl.getBoundingClientRect();
            const taskbarHeightVal = document.getElementById('taskbar')?.offsetHeight || 28;
            newX = Math.max(0, Math.min(newX, desktopRect.width - this.element.offsetWidth));
            newY = Math.max(0, Math.min(newY, desktopRect.height - this.element.offsetHeight - taskbarHeightVal));
            this.element.style.left = `${newX}px`;
            this.element.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                if (this.titleBar) this.titleBar.style.cursor = 'grab';
                document.body.style.userSelect = '';
                if (this.element.offsetLeft !== initialX || this.element.offsetTop !== initialY) {
                    captureStateForUndo(`Move window "${this.title}"`);
                }
            }
        });
    }

    makeResizable() {
        let initialWidth, initialHeight;
        this.element.addEventListener('mousedown', (e) => {
            const rect = this.element.getBoundingClientRect();
            const resizeHandleSize = 15;
            if (e.clientX > rect.right - resizeHandleSize && e.clientY > rect.bottom - resizeHandleSize) {
                initialWidth = this.element.offsetWidth;
                initialHeight = this.element.offsetHeight;
            } else {
                initialWidth = null;
                initialHeight = null;
            }
        });

        this.element.addEventListener('mouseup', () => {
            if (initialWidth !== null && initialHeight !== null) {
                if (this.element.offsetWidth !== initialWidth || this.element.offsetHeight !== initialHeight) {
                    captureStateForUndo(`Resize window "${this.title}"`);
                }
            }
            initialWidth = null;
            initialHeight = null;
        });
    }

    createTaskbarButton() {
        const taskbarButtonsContainer = document.getElementById('taskbarButtons');
        if (!taskbarButtonsContainer) return;
        this.taskbarButton = document.createElement('button');
        this.taskbarButton.className = 'taskbar-button';
        this.taskbarButton.textContent = this.title.substring(0, 15) + (this.title.length > 15 ? '...' : '');
        this.taskbarButton.title = this.title;
        this.taskbarButton.dataset.windowId = this.id;
        taskbarButtonsContainer.appendChild(this.taskbarButton);

        this.taskbarButton.addEventListener('click', () => {
            if (this.isMinimized) { this.restore(); }
            else {
                if (parseInt(this.element.style.zIndex) === window.highestZIndex && !this.isMinimized) {
                    this.minimize();
                } else {
                    this.focus();
                }
            }
        });
        this.updateTaskbarButtonActiveState();
    }

    updateTaskbarButtonActiveState() {
        if (this.taskbarButton) {
            const isActive = !this.isMinimized && parseInt(this.element.style.zIndex) === window.highestZIndex;
            this.taskbarButton.classList.toggle('active', isActive);
            this.taskbarButton.classList.toggle('minimized-on-taskbar', this.isMinimized && !isActive);
        }
    }

    minimize(skipUndo = false) {
        if (!this.isMinimized) {
            this.isMinimized = true;
            this.element.classList.add('minimized');
            if (this.taskbarButton) {
                this.taskbarButton.classList.add('minimized-on-taskbar');
                this.taskbarButton.classList.remove('active');
            }
            if (!skipUndo) captureStateForUndo(`Minimize window "${this.title}"`);
        }
    }

    restore(skipUndo = false) {
        if (this.isMinimized) {
            this.isMinimized = false;
            this.element.classList.remove('minimized');
            this.focus(true);
            if (!skipUndo) captureStateForUndo(`Restore window "${this.title}"`);
        } else {
            this.focus();
        }
    }

    close() {
        console.log(`[SnugWindow] Closing window: ${this.id} (${this.title})`);
        if (this.onCloseCallback) this.onCloseCallback();
        if (this.taskbarButton) this.taskbarButton.remove();
        if (this.element) this.element.remove();

        const oldWindowTitle = this.title;
        delete window.openWindows[this.id]; // Still using global window.openWindows

        const trackIdStr = this.id.split('-')[1];
        if (trackIdStr) {
            const trackIdNum = parseInt(trackIdStr);
            const tracksArray = getTracks(); // Use imported getTracks()
            const track = tracksArray.find(t => t.id === trackIdNum);
            if (track) {
                console.log(`[SnugWindow] Window ${this.id} belongs to track ${track.id}. Nullifying window reference on track.`);
                if (this.id.startsWith('trackInspector-')) track.inspectorWindow = null;
                if (this.id.startsWith('sequencerWin-')) track.sequencerWindow = null;
                if (this.id.startsWith('effectsRack-')) track.effectsRackWindow = null;
            } else {
                console.log(`[SnugWindow] Window ${this.id} track ID ${trackIdNum} not found in current tracks.`);
            }
        }
        captureStateForUndo(`Close window "${oldWindowTitle}"`);
    }

    focus(skipUndo = false) {
        if (this.isMinimized) { this.restore(skipUndo); return; }
        if (!this.element) return;
        this.element.style.zIndex = ++window.highestZIndex;
        Object.values(window.openWindows).forEach(win => { if (win && win.taskbarButton) win.updateTaskbarButtonActiveState(); });
    }

    applyState(state) {
        if (!this.element) return;
        this.element.style.left = state.left;
        this.element.style.top = state.top;
        this.element.style.width = state.width;
        this.element.style.height = state.height;
        this.element.style.zIndex = state.zIndex;
        if (this.titleBar) this.titleBar.querySelector('span').textContent = state.title;
        this.title = state.title;
        if (this.taskbarButton) {
            this.taskbarButton.textContent = state.title.substring(0, 15) + (state.title.length > 15 ? '...' : '');
            this.taskbarButton.title = state.title;
        }

        if (state.isMinimized && !this.isMinimized) {
            this.minimize(true);
        } else if (!state.isMinimized && this.isMinimized) {
            this.restore(true);
        }
        this.updateTaskbarButtonActiveState();
    }

    onCloseCallback() {}
}
