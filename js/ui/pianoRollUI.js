// js/ui/pianoRollUI.js - Piano Roll UI Management with Konva.js
import * as Constants from '../constants.js'; // Adjust path if needed

let localAppServices = {};

export function initializePianoRollUI(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    console.log("[PianoRollUI] Initialized.");
    if (typeof Konva === 'undefined') {
        console.error("[PianoRollUI] CRITICAL: Konva is not loaded. Piano Roll will not function.");
        if (localAppServices.showNotification) {
            localAppServices.showNotification("Error: Piano Roll library (Konva) not loaded!", 5000);
        }
    }
}

export function createPianoRollStage(containerElement, track) {
    if (typeof Konva === 'undefined') {
        console.error("[PianoRollUI createPianoRollStage] Konva is not defined.");
        containerElement.innerHTML = '<p class="p-4 text-red-500">Error: Piano Roll library failed to load.</p>';
        return null;
    }
    if (!containerElement || !containerElement.offsetWidth || !containerElement.offsetHeight) {
        console.error("[PianoRollUI createPianoRollStage] Container element is invalid or has no dimensions:", containerElement);
        return null;
    }

    const stageWidth = containerElement.offsetWidth;
    const stageHeight = containerElement.offsetHeight;

    console.log(`[PianoRollUI createPianoRollStage] Creating Konva Stage. Width: ${stageWidth}, Height: ${stageHeight}`);

    const stage = new Konva.Stage({
        container: containerElement,
        width: stageWidth,
        height: stageHeight,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    // --- Start of Corrected Code ---
    // Use the theme's background color for consistency
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-window-content').trim() || '#181818';
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#b0b0b0';
    const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-primary').trim() || '#383838';

    const background = new Konva.Rect({
        x: 0,
        y: 0,
        width: stageWidth,
        height: stageHeight,
        fill: bgColor,
    });
    layer.add(background);

    const placeholderText = new Konva.Text({
        x: 0,
        y: 0,
        width: stageWidth,
        height: stageHeight,
        text: `Piano Roll for "${track.name}"\n\n(Feature Under Construction)\n\nGrid and note rendering logic to be implemented here.`,
        fontSize: 16,
        fontFamily: "'VT323', monospace",
        fill: textColor,
        align: 'center',
        verticalAlign: 'middle',
        padding: 20,
        lineHeight: 1.5,
    });
    layer.add(placeholderText);
    // --- End of Corrected Code ---

    layer.draw();

    console.log(`[PianoRollUI createPianoRollStage] Konva Stage for track ${track.id} created.`);
    return stage; // Return the stage so it can be managed (e.g., destroyed on window close)
}

// Future functions:
// - drawPianoRollGrid(layer, track, viewPort)
// - drawNotes(layer, track, viewPort)
// - handlePianoRollClick(stage, track, event)
// - handleNoteDrag(noteShape, track, event)
// - updatePianoRollDisplay(stage, track)
