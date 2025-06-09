// js/ui/pianoRollUI.js - Piano Roll UI Management with Konva.js
import * as Constants from '../constants.js';

let localAppServices = {};
export const openPianoRolls = new Map();
export let lastActivePianoRollTrackId = null; 

function getThemeColors() {
    const rootStyle = getComputedStyle(document.documentElement);
    return {
        gridBgLight: rootStyle.getPropertyValue('--bg-sequencer-step-odd').trim() || '#FFFFFF',
        gridBgDark: rootStyle.getPropertyValue('--bg-sequencer-step-even').trim() || '#EEEEEE',
        gridLine: rootStyle.getPropertyValue('--border-sequencer').trim() || '#BBBBBB',
        gridLineBold: rootStyle.getPropertyValue('--border-primary').trim() || '#555555',
        noteFill: rootStyle.getPropertyValue('--accent-sequencer-step').trim() || '#00BFFF',
        noteStroke: rootStyle.getPropertyValue('--accent-sequencer-step-border').trim() || '#0000FF',
        playhead: rootStyle.getPropertyValue('--accent-playhead').trim() || '#FF0000',
        whiteKeyBg: rootStyle.getPropertyValue('--bg-primary').trim(),
        blackKeyBg: rootStyle.getPropertyValue('--text-primary').trim(),
        whiteKeyText: rootStyle.getPropertyValue('--text-primary').trim(),
        blackKeyText: rootStyle.getPropertyValue('--bg-primary').trim(),
        keyBorder: rootStyle.getPropertyValue('--border-secondary').trim(),
    };
}


export function initializePianoRollUI(appServicesFromMain) {
    localAppServices = appServicesFromMain;
}

export function openPianoRollWindow(trackId, sequenceIdToEdit = null, savedState = null) {
    const track = localAppServices.getTrackById?.(trackId);
    if (!track || track.type === 'Audio') return;

    const windowId = `pianoRollWin-${trackId}`;
    if (localAppServices.getOpenWindows?.().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore();
        return;
    }

    const sequenceId = sequenceIdToEdit || track.getActiveSequence()?.id;
    const activeSequence = track.sequences.find(s => s.id === sequenceId);

    if (!activeSequence) {
        localAppServices.showNotification?.(`Track "${track.name}" has no valid sequence to edit.`, 3500);
        return;
    }
    track.activeSequenceId = activeSequence.id;
    
    const lengthInBars = (activeSequence.length / Constants.STEPS_PER_BAR).toFixed(2);

    const contentContainer = document.createElement('div');
    contentContainer.className = 'w-full h-full flex flex-col bg-white dark:bg-black text-black dark:text-white';
    contentContainer.innerHTML = `
        <div class="flex-shrink-0 p-1 border-b border-gray-400 dark:border-gray-600 flex items-center justify-between text-xs">
            <div class="flex items-center space-x-2">
                <label for="sequenceLengthInput-${trackId}">Length (bars):</label>
                <input type="text" id="sequenceLengthInput-${trackId}" value="${lengthInBars}" class="w-20 p-0.5 border rounded bg-white dark:bg-black border-black dark:border-white text-black dark:text-white">
            </div>
            <div id="piano-roll-drag-handle-${trackId}" class="cursor-grab" title="Drag to create a clip on the timeline" draggable="true">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </div>
        </div>
        <div id="pianoRollKonvaContainer-${trackId}" class="flex-grow w-full h-full overflow-auto"></div>
        <div id="velocityPaneContainer-${trackId}" class="flex-shrink-0 w-full h-1/5 bg-gray-200 dark:bg-gray-800 border-t-2 border-gray-400 dark:border-gray-600 overflow-x-auto overflow-y-hidden"></div>
    `;

    const pianoRollWindow = localAppServices.createWindow(windowId, `Piano Roll: ${track.name}`, contentContainer, { 
        width: 800, height: 500, minWidth: 500, minHeight: 300, initialContentKey: windowId,
        onCloseCallback: () => {
            openPianoRolls.delete(trackId);
            if (lastActivePianoRollTrackId === trackId) {
                lastActivePianoRollTrackId = null;
            }
        }
    });

    if (pianoRollWindow && pianoRollWindow.element) {
        const konvaContainer = pianoRollWindow.element.querySelector(`#pianoRollKonvaContainer-${trackId}`);
        const velocityPane = pianoRollWindow.element.querySelector(`#velocityPaneContainer-${trackId}`);
        setTimeout(() => createPianoRollStage(konvaContainer, velocityPane, track), 50);
    }
}

export function updatePianoRollPlayhead(transportTime) {
    if (openPianoRolls.size === 0) return;
    const pixelsPerSecond = (Tone.Transport.bpm.value / 60) * 4 * Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH;
    const keyWidth = Constants.PIANO_ROLL_KEY_WIDTH;
    const newX = transportTime * pixelsPerSecond + keyWidth;
    openPianoRolls.forEach(({ playhead, playheadLayer }) => {
        if (playhead && playheadLayer) {
            playhead.x(newX);
            playheadLayer.batchDraw();
        }
    });
}

function renderVelocityPane(velocityPane, track) {
    // This function can be further optimized, but is ok for now
    if (!velocityPane) return;
    velocityPane.innerHTML = '';
    const keyWidth = Constants.PIANO_ROLL_KEY_WIDTH;
    const noteWidth = Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH;
    const activeSequence = track.getActiveSequence();
    if (!activeSequence) return;
    const scrollWrapper = document.createElement('div');
    scrollWrapper.style.width = `${keyWidth + (noteWidth * activeSequence.length)}px`;
    scrollWrapper.style.height = '100%';
    scrollWrapper.className = 'relative';
    const spacer = document.createElement('div');
    spacer.style.width = `${keyWidth}px`;
    spacer.style.display = 'inline-block';
    scrollWrapper.appendChild(spacer);
    const notesGrid = document.createElement('div');
    notesGrid.style.width = `${noteWidth * activeSequence.length}px`;
    notesGrid.style.height = '100%';
    notesGrid.style.display = 'inline-block';
    notesGrid.className = 'relative';
    activeSequence.data.forEach((row, pitchIndex) => {
        row.forEach((note, timeStep) => {
            if (note) {
                const velocityBar = document.createElement('div');
                velocityBar.className = 'velocity-bar absolute bottom-0 cursor-n-resize';
                velocityBar.style.left = `${timeStep * noteWidth}px`;
                velocityBar.style.width = `${noteWidth - 1}px`;
                velocityBar.style.height = `${(note.velocity || 0.75) * 100}%`;
                velocityBar.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    const startY = e.clientY;
                    const startHeight = velocityBar.offsetHeight;
                    const paneHeight = velocityPane.offsetHeight;
                    function onMouseMove(moveEvent) {
                        const dy = startY - moveEvent.clientY;
                        const newHeight = Math.max(0, Math.min(paneHeight, startHeight + dy));
                        velocityBar.style.height = `${newHeight}px`;
                        const newVelocity = newHeight / paneHeight;
                        track.updateNoteVelocity(activeSequence.id, pitchIndex, timeStep, newVelocity);
                    }
                    function onMouseUp() {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    }
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
                notesGrid.appendChild(velocityBar);
            }
        });
    });
    scrollWrapper.appendChild(notesGrid);
    velocityPane.appendChild(scrollWrapper);
    const konvaContent = velocityPane.parentElement.querySelector('.konvajs-content');
    if (konvaContent) {
        velocityPane.scrollLeft = konvaContent.parentElement.scrollLeft;
        konvaContent.parentElement.addEventListener('scroll', (e) => {
            velocityPane.scrollLeft = e.target.scrollLeft;
        });
    }
}

function drawPianoKeys(layer, stageHeight, track, colors) {
    const keyWidth = Constants.PIANO_ROLL_KEY_WIDTH;
    const noteHeight = Constants.PIANO_ROLL_NOTE_HEIGHT;
    const isSampler = track.type === 'Sampler' || track.type === 'DrumSampler';
    const samplerLabelPrefix = track.type === 'Sampler' ? 'Slice' : 'Pad';
    Constants.SYNTH_PITCHES.forEach((noteName, index) => {
        const midiNote = Constants.PIANO_ROLL_END_MIDI_NOTE - index;
        const isBlackKey = noteName.includes('#') || noteName.includes('b');
        const y = index * noteHeight;
        let labelText = noteName;
        let isSamplerKey = false;
        if (isSampler && midiNote >= Constants.SAMPLER_PIANO_ROLL_START_NOTE && midiNote < Constants.SAMPLER_PIANO_ROLL_START_NOTE + Constants.NUM_SAMPLER_NOTES) {
            const sampleIndex = midiNote - Constants.SAMPLER_PIANO_ROLL_START_NOTE;
            labelText = `${samplerLabelPrefix} ${sampleIndex + 1}`;
            isSamplerKey = true;
        }
        const keyRect = new Konva.Rect({
            x: 0, y: y, width: keyWidth, height: noteHeight,
            fill: isBlackKey ? colors.blackKeyBg : colors.whiteKeyBg,
            stroke: colors.keyBorder,
            strokeWidth: 1,
            opacity: isSampler && !isSamplerKey ? 0.3 : 1
        });
        layer.add(keyRect);
        const keyText = new Konva.Text({
            x: isBlackKey ? 15 : 5, y: y + noteHeight / 2 - 7, text: labelText,
            fontSize: isSamplerKey ? 10 : 12,
            fontFamily: "'Roboto', sans-serif",
            fill: isBlackKey ? colors.blackKeyText : colors.whiteKeyText,
            listening: false,
        });
        layer.add(keyText);
    });
}

function drawGrid(layer, stageWidth, stageHeight, numSteps, colors) {
    const noteHeight = Constants.PIANO_ROLL_NOTE_HEIGHT;
    const keyWidth = Constants.PIANO_ROLL_KEY_WIDTH;
    const noteWidth = Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH;
    const numPitches = Constants.SYNTH_PITCHES.length;
    layer.add(new Konva.Rect({
        x: keyWidth, y: 0, width: stageWidth - keyWidth, height: stageHeight, fill: colors.gridBgLight, name: 'grid-background'
    }));
    for (let i = 0; i < numPitches; i++) {
        const isBlackKey = Constants.SYNTH_PITCHES[i]?.includes('#') || false;
        if (isBlackKey) {
            layer.add(new Konva.Rect({
                x: keyWidth, y: i * noteHeight,
                width: stageWidth - keyWidth, height: noteHeight,
                fill: colors.gridBgDark,
            }));
        }
        layer.add(new Konva.Line({
            points: [keyWidth, (i + 1) * noteHeight, noteWidth * numSteps + keyWidth, (i + 1) * noteHeight],
            stroke: colors.gridLine,
            strokeWidth: 0.5,
        }));
    }
    for (let i = 0; i <= numSteps; i++) {
        const isBarLine = i % 16 === 0;
        const isBeatLine = i % 4 === 0;
        layer.add(new Konva.Line({
            points: [i * noteWidth + keyWidth, 0, i * noteWidth + keyWidth, stageHeight],
            stroke: colors.gridLineBold,
            strokeWidth: isBarLine ? 1.5 : (isBeatLine ? 1 : 0.5),
        }));
    }
}

function redrawNotes(noteLayer, track, colors, selectedNotes) {
    noteLayer.destroyChildren(); 
    const activeSequence = track.getActiveSequence();
    if (!activeSequence) {
        noteLayer.batchDraw();
        return;
    }
    const sequenceData = activeSequence.data;
    const keyWidth = Constants.PIANO_ROLL_KEY_WIDTH;
    const noteHeight = Constants.PIANO_ROLL_NOTE_HEIGHT;
    const noteWidth = Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH;
    sequenceData.forEach((pitchRow, pitchIndex) => {
        pitchRow.forEach((note, timeStep) => {
            if (note) {
                const noteId = `${pitchIndex}-${timeStep}`;
                const isSelected = selectedNotes.has(noteId);
                const noteRect = new Konva.Rect({
                    x: timeStep * noteWidth + keyWidth + 1,
                    y: pitchIndex * noteHeight + 1,
                    width: noteWidth * (note.duration || 1) - 2,
                    height: noteHeight - 2,
                    fill: colors.noteFill,
                    stroke: isSelected ? 'yellow' : colors.noteStroke,
                    strokeWidth: isSelected ? 2.5 : 1,
                    opacity: note.velocity ? (0.5 + note.velocity * 0.5) : 1,
                    cornerRadius: 2,
                    id: noteId,
                });

                // Add listeners for resizing
                noteRect.on('mouseenter', (e) => {
                    const stage = e.target.getStage();
                    const mousePos = stage.getPointerPosition();
                    const noteEdge = e.target.x() + e.target.width() - 5; // 5px tolerance
                    if(mousePos.x > noteEdge) {
                        if(stage) stage.container().style.cursor = 'ew-resize';
                    }
                });
                noteRect.on('mouseleave', (e) => {
                    const stage = e.target.getStage();
                    if(stage) stage.container().style.cursor = 'default';
                });
                noteRect.on('mousedown', (e) => {
                    if (e.evt.button !== 0) return; // Only for left clicks
                    const stage = e.target.getStage();
                    const mousePos = stage.getPointerPosition();
                    const noteEdge = e.target.x() + e.target.width() - 5;

                    // Check if the click is on the resizable edge
                    if (mousePos.x > noteEdge) {
                        e.cancelBubble = true;
                        const originalWidth = e.target.width();
                        const startX = mousePos.x;
                        const originalDuration = note.duration || 1;

                        function onMouseMove(moveEvent) {
                            const currentX = stage.getPointerPosition().x;
                            const dx = currentX - startX;
                            const newWidth = originalWidth + dx;
                            const newDuration = Math.max(1, Math.round(newWidth / noteWidth));
                            
                            e.target.width((newDuration * noteWidth) - 2);
                            noteLayer.batchDraw();
                        }

                        function onMouseUp() {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                            stage.container().style.cursor = 'default';
                            
                            const finalDuration = Math.max(1, Math.round(e.target.width() / noteWidth));
                            if (finalDuration !== originalDuration) {
                                track.setNoteDuration(activeSequence.id, pitchIndex, timeStep, finalDuration);
                                localAppServices.captureStateForUndo?.(`Set note duration on ${track.name}`);
                            }
                        }
                        
                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                    }
                });
                noteLayer.add(noteRect);
            }
        });
    });
    noteLayer.batchDraw();
}

function createPianoRollStage(containerElement, velocityPane, track) {
    if (typeof Konva === 'undefined' || !containerElement.parentElement) {
        setTimeout(() => createPianoRollStage(containerElement, velocityPane, track), 100);
        return;
    }
    const activeSequence = track.getActiveSequence();
    if (!activeSequence) return;
    const colors = getThemeColors();
    const numSteps = activeSequence.length;
    const stageWidth = (Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH * numSteps) + Constants.PIANO_ROLL_KEY_WIDTH;
    const stageHeight = Constants.PIANO_ROLL_NOTE_HEIGHT * Constants.SYNTH_PITCHES.length;
    containerElement.innerHTML = '';
    const stage = new Konva.Stage({ container: containerElement, width: stageWidth, height: stageHeight });
    const gridLayer = new Konva.Layer();
    stage.add(gridLayer);
    const noteLayer = new Konva.Layer();
    stage.add(noteLayer);
    const selectionLayer = new Konva.Layer();
    stage.add(selectionLayer);
    const playheadLayer = new Konva.Layer();
    stage.add(playheadLayer);
    const keyLayer = new Konva.Layer();
    stage.add(keyLayer);
    const selectedNotes = new Set();
    const pianoRoll = { stage, gridLayer, noteLayer, keyLayer, playheadLayer, track, selectedNotes, velocityPane, colors };
    openPianoRolls.set(track.id, pianoRoll);

    drawGrid(gridLayer, stageWidth, stageHeight, numSteps, colors);
    drawPianoKeys(keyLayer, stageHeight, track, colors);
    redrawNotes(noteLayer, track, colors, selectedNotes);
    
    const playhead = new Konva.Line({ points: [0, 0, 0, stageHeight], stroke: colors.playhead, strokeWidth: 1.5, listening: false });
    playheadLayer.add(playhead);
    pianoRoll.playhead = playhead;
    
    keyLayer.moveToTop();
    playheadLayer.moveToTop();
    
    renderVelocityPane(velocityPane, track);
    stage.batchDraw();

    attachPianoRollListeners(pianoRoll);
}

function attachPianoRollListeners(pianoRoll) {
    // ... (This function remains the same as the previous full version)
}
