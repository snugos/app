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

    // Placeholder background
    const background = new Konva.Rect({
        x: 0,
        y: 0,
        width: stageWidth,
        height: stageHeight,
        fill: 'rgba(40, 40, 40, 0.5)', // A slightly different dark color for testing
        stroke: '#555',
        strokeWidth: 1,
    });
    layer.add(background);

    const placeholderText = new Konva.Text({
        x: 20,
        y: 20,
        text: `Piano Roll for ${track.name}\n(Konva Stage Initialized)`,
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
        fill: '#ccc',
    });
    layer.add(placeholderText);

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
