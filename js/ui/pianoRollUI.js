// js/ui/pianoRollUI.js - Piano Roll UI Management with Konva.js
import * as Constants from '../constants.js';

let localAppServices = {};
const openPianoRolls = new Map();

// NEW: Helper function to get theme colors from CSS variables
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
    
    const contentContainer = document.createElement('div');
    contentContainer.className = 'w-full h-full flex flex-col bg-white dark:bg-black text-black dark:text-white';
    contentContainer.innerHTML = `
        <div class="flex-shrink-0 p-1 border-b border-gray-400 dark:border-gray-600 flex items-center space-x-2 text-xs">
            <label for="sequenceLengthInput-${trackId}">Length (steps):</label>
            <input type="number" id="sequenceLengthInput-${trackId}" value="${activeSequence.length}" min="1" max="${Constants.MAX_BARS * Constants.STEPS_PER_BAR}" class="w-20 p-0.5 border rounded bg-white dark:bg-black border-black dark:border-white text-black dark:text-white">
        </div>
        <div id="pianoRollKonvaContainer-${trackId}" class="flex-grow w-full h-full overflow-auto"></div>
        <div id="velocityPaneContainer-${trackId}" class="flex-shrink-0 w-full h-1/5 bg-gray-200 dark:bg-gray-800 border-t-2 border-gray-400 dark:border-gray-600 overflow-x-auto overflow-y-hidden"></div>
    `;

    const pianoRollWindow = localAppServices.createWindow(
        windowId,
        `Piano Roll: ${track.name}`,
        contentContainer,
        { 
            width: 800, height: 500, minWidth: 500, minHeight: 300, initialContentKey: windowId,
            onCloseCallback: () => {
                openPianoRolls.delete(trackId);
            }
        }
    );

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

    openPianoRolls.forEach(({ playhead, layer }) => {
        if (playhead && layer) {
            playhead.x(newX);
            layer.batchDraw();
        }
    });
}

function renderVelocityPane(velocityPane, track) {
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
    const keyLayer = new Konva.Layer();
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
        keyLayer.add(keyRect);

        const keyText = new Konva.Text({
            x: isBlackKey ? 15 : 5, y: y + noteHeight / 2 - 7, text: labelText,
            fontSize: isSamplerKey ? 10 : 12,
            fontFamily: "'Roboto', sans-serif",
            fill: isBlackKey ? colors.blackKeyText : colors.whiteKeyText,
            listening: false,
        });
        keyLayer.add(keyText);
    });
    return keyLayer;
}

function drawGrid(layer, stageWidth, stageHeight, numSteps, colors) {
    const gridLayer = new Konva.Layer();
    const noteHeight = Constants.PIANO_ROLL_NOTE_HEIGHT;
    const keyWidth = Constants.PIANO_ROLL_KEY_WIDTH;
    const noteWidth = Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH;
    const numPitches = Constants.SYNTH_PITCHES.length;
    
    gridLayer.add(new Konva.Rect({
        x: keyWidth, y: 0, width: stageWidth - keyWidth, height: stageHeight, fill: colors.gridBgLight,
    }));

    for (let i = 0; i < numPitches; i++) {
        const isBlackKey = Constants.SYNTH_PITCHES[i]?.includes('#') || false;
        if (isBlackKey) {
            gridLayer.add(new Konva.Rect({
                x: keyWidth, y: i * noteHeight,
                width: stageWidth - keyWidth, height: noteHeight,
                fill: colors.gridBgDark,
            }));
        }
        gridLayer.add(new Konva.Line({
            points: [keyWidth, (i + 1) * noteHeight, noteWidth * numSteps + keyWidth, (i + 1) * noteHeight],
            stroke: colors.gridLine,
            strokeWidth: 0.5,
        }));
    }

    for (let i = 0; i <= numSteps; i++) {
        const isBarLine = i % 16 === 0;
        const isBeatLine = i % 4 === 0;

        gridLayer.add(new Konva.Line({
            points: [i * noteWidth + keyWidth, 0, i * noteWidth + keyWidth, stageHeight],
            stroke: colors.gridLineBold,
            strokeWidth: isBarLine ? 1.5 : (isBeatLine ? 1 : 0.5),
        }));
    }
    
    return gridLayer;
}

function renderNotes(track, colors) {
    const noteLayer = new Konva.Layer();
    const activeSequence = track.getActiveSequence();
    if (!activeSequence) return noteLayer;

    const sequenceData = activeSequence.data;
    const keyWidth = Constants.PIANO_ROLL_KEY_WIDTH;
    const noteHeight = Constants.PIANO_ROLL_NOTE_HEIGHT;
    const noteWidth = Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH;
    
    sequenceData.forEach((pitchRow, pitchIndex) => {
        pitchRow.forEach((note, timeStep) => {
            if (note) {
                const noteRect = new Konva.Rect({
                    x: timeStep * noteWidth + keyWidth + 1,
                    y: pitchIndex * noteHeight + 1,
                    width: noteWidth * (note.duration || 1) - 2,
                    height: noteHeight - 2,
                    fill: colors.noteFill,
                    stroke: colors.noteStroke,
                    strokeWidth: 1,
                    opacity: note.velocity ? (0.5 + note.velocity * 0.5) : 1,
                    cornerRadius: 2
                });
                noteLayer.add(noteRect);
            }
        });
    });

    return noteLayer;
}

function createPianoRollStage(containerElement, velocityPane, track) {
    if (typeof Konva === 'undefined') {
        containerElement.innerHTML = '<p class="p-4 text-black dark:text-white">Error: Piano Roll library failed to load.</p>';
        return null;
    }
    if (!containerElement || !containerElement.parentElement || containerElement.parentElement.offsetWidth <= 0) {
        setTimeout(() => createPianoRollStage(containerElement, velocityPane, track), 100);
        return;
    }

    const activeSequence = track.getActiveSequence();
    if (!activeSequence) return;
    
    const colors = getThemeColors();

    const numSteps = activeSequence.length;
    const totalGridWidth = Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH * numSteps;
    const totalGridHeight = Constants.PIANO_ROLL_NOTE_HEIGHT * Constants.SYNTH_PITCHES.length;
    const stageWidth = totalGridWidth + Constants.PIANO_ROLL_KEY_WIDTH;
    const stageHeight = totalGridHeight;
    
    containerElement.innerHTML = '';
    const stage = new Konva.Stage({
        container: containerElement, width: stageWidth, height: stageHeight,
    });

    const gridLayer = drawGrid(null, stageWidth, stageHeight, numSteps, colors);
    stage.add(gridLayer);

    let noteLayer = renderNotes(track, colors);
    stage.add(noteLayer);
    
    const playheadLayer = new Konva.Layer();
    const playhead = new Konva.Line({
        points: [0, 0, 0, stageHeight],
        stroke: colors.playhead,
        strokeWidth: 1.5,
        listening: false,
    });
    playheadLayer.add(playhead);
    stage.add(playheadLayer);
    
    openPianoRolls.set(track.id, { stage, playhead, layer: playheadLayer, track: track });
    
    const keyLayer = drawPianoKeys(null, stageHeight, track, colors);
    stage.add(keyLayer);
    
    keyLayer.moveToTop();
    playheadLayer.moveToTop();

    stage.on('click tap', function (e) {
        if (e.target.getLayer() === keyLayer) return;
        
        const pos = stage.getPointerPosition();
        const keyWidth = Constants.PIANO_ROLL_KEY_WIDTH;
        if (pos.x < keyWidth) return;

        const timeStep = Math.floor((pos.x - keyWidth) / Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH);
        const pitchIndex = Math.floor(pos.y / Constants.PIANO_ROLL_NOTE_HEIGHT);

        const currentActiveSequence = track.getActiveSequence();
        if (!currentActiveSequence || !currentActiveSequence.data[pitchIndex] || timeStep >= currentActiveSequence.length) return;

        const noteExists = currentActiveSequence.data[pitchIndex][timeStep];

        if (noteExists) {
            track.removeNoteFromSequence(currentActiveSequence.id, pitchIndex, timeStep);
        } else {
            track.addNoteToSequence(currentActiveSequence.id, pitchIndex, timeStep, { velocity: 0.75, duration: 1 });
        }

        noteLayer.destroy();
        noteLayer = renderNotes(track, colors);
        stage.add(noteLayer);
        noteLayer.moveToBottom();
        gridLayer.moveToBottom();
        stage.draw();

        renderVelocityPane(velocityPane, track);
    });

    const lengthInput = document.getElementById(`sequenceLengthInput-${track.id}`);
    if (lengthInput) {
        lengthInput.addEventListener('change', (e) => {
            const newLength = parseInt(e.target.value, 10);
            const maxLen = Constants.MAX_BARS * Constants.STEPS_PER_BAR;
            if (!isNaN(newLength) && newLength > 0 && newLength <= maxLen) {
                track.setSequenceLength(activeSequence.id, newLength);
                createPianoRollStage(containerElement, velocityPane, track);
            } else {
                e.target.value = activeSequence.length;
                localAppServices.showNotification?.(`Length must be between 1 and ${maxLen}.`, 3000);
            }
        });
    }

    stage.draw();
    renderVelocityPane(velocityPane, track);
    return stage;
}
