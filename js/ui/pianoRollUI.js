// js/ui/pianoRollUI.js - Piano Roll UI Management with Konva.js
import * as Constants from '../constants.js';

let localAppServices = {};

export function initializePianoRollUI(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    console.log("[PianoRollUI] Initialized.");
    if (typeof Konva === 'undefined') {
        console.error("[PianoRollUI] CRITICAL: Konva is not loaded. Piano Roll will not function.");
    }
}

export function openPianoRollWindow(trackId, forceRedraw = false, savedState = null) {
    const track = localAppServices.getTrackById?.(trackId);
    if (!track || track.type === 'Audio') {
        console.warn(`[PianoRollUI] Cannot open Piano Roll for track type: ${track?.type}`);
        return;
    }

    const windowId = `pianoRollWin-${trackId}`;
    if (localAppServices.getOpenWindows?.().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore();
        return;
    }

    const activeSequence = track.getActiveSequence();
    if (!activeSequence) {
        localAppServices.showNotification?.(`Track "${track.name}" has no active sequence.`, 3500);
        return;
    }

    const konvaContainer = document.createElement('div');
    konvaContainer.id = `pianoRollKonvaContainer-${trackId}`;
    konvaContainer.className = 'w-full h-full overflow-hidden bg-slate-800 dark:bg-slate-900';

    const pianoRollOptions = { 
        width: 800, height: 500, minWidth: 500, minHeight: 300, 
        initialContentKey: windowId, 
        onCloseCallback: () => {
             const win = localAppServices.getWindowById?.(windowId);
             if (win && win.konvaStage) {
                 win.konvaStage.destroy();
             }
        }
    };

    const pianoRollWindow = localAppServices.createWindow(windowId, `Piano Roll: ${track.name}`, konvaContainer, pianoRollOptions);

    if (pianoRollWindow?.element) {
        setTimeout(() => {
            if (konvaContainer.offsetWidth > 0 && konvaContainer.offsetHeight > 0) {
                 pianoRollWindow.konvaStage = createPianoRollStage(konvaContainer, track);
            }
        }, 150);
        localAppServices.setActiveSequencerTrackId?.(trackId);
    }
}

export function createPianoRollStage(containerElement, track) {
    if (typeof Konva === 'undefined') {
        containerElement.innerHTML = '<p class="p-4 text-red-500">Error: Piano Roll library failed to load.</p>';
        return null;
    }
    if (!containerElement || !containerElement.offsetWidth || !containerElement.offsetHeight) {
        return null;
    }

    const stageWidth = containerElement.offsetWidth;
    const stageHeight = containerElement.offsetHeight;

    const stage = new Konva.Stage({
        container: containerElement,
        width: stageWidth,
        height: stageHeight,
    });

    const layer = new Konva.Layer();
    stage.add(layer);
    
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-window-content').trim() || '#181818';
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#b0b0b0';

    const background = new Konva.Rect({
        x: 0, y: 0, width: stageWidth, height: stageHeight, fill: bgColor,
    });
    layer.add(background);

    const placeholderText = new Konva.Text({
        x: 0, y: 0, width: stageWidth, height: stageHeight,
        text: `Piano Roll for "${track.name}"\n\n(Feature Under Construction)`,
        fontSize: 16,
        fontFamily: "'VT323', monospace",
        fill: textColor,
        align: 'center',
        verticalAlign: 'middle',
        padding: 20,
        lineHeight: 1.5,
    });
    layer.add(placeholderText);

    layer.draw();
    return stage;
}
