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
    // --- Start of Corrected Code ---
    konvaContainer.className = 'w-full h-full overflow-hidden bg-white dark:bg-black';
    // --- End of Corrected Code ---

    const pianoRollWindow = localAppServices.createWindow(
        windowId,
        `Piano Roll: ${track.name}`,
        konvaContainer,
        { width: 800, height: 500, minWidth: 500, minHeight: 300, initialContentKey: windowId }
    );

    if (pianoRollWindow && pianoRollWindow.element) {
        setTimeout(() => createPianoRollStage(konvaContainer, track), 50);
    }
}

function createPianoRollStage(containerElement, track) {
    if (typeof Konva === 'undefined') {
        // --- Start of Corrected Code ---
        containerElement.innerHTML = '<p class="p-4 text-black dark:text-white">Error: Piano Roll library failed to load.</p>';
        // --- End of Corrected Code ---
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
    
    // These now correctly pull the black/white colors from the CSS variables
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-window-content').trim() || '#FFFFFF';
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#000000';

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
    });
    layer.add(placeholderText);

    stage.draw();

    return stage;
}
