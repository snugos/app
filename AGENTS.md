# SnugOS AGENTS.md - Agent Memory and Improvement Log

## Project Overview
SnugOS is a browser-based Digital Audio Workstation (DAW) built with vanilla JavaScript modules. It uses Tone.js for audio processing and Tailwind CSS for styling. The app is deployed via GitHub Pages.

## Tech Stack
- Vanilla JS modules (no build step)
- Tone.js (audio engine) via CDN
- Tailwind CSS via CDN
- GitHub Pages deployment

## Known Issues and TODOs

### Completed Features

#### Day 1: DrumSampler UI Implementation (2026-04-19)
- **Feature**: Implemented complete DrumSampler UI controls
- **Files Modified**:
  - `js/ui.js`: Replaced stub implementations with fully functional:
    - `renderDrumSamplerPads(track)` - Renders 8 pad buttons with visual feedback
    - `updateDrumPadControlsUI(track)` - Updates drop zone, volume/pitch knobs, envelope
    - `renderSamplePads(track)` - Renders slice pads for Sampler track
    - `updateSliceEditorUI(track)` - Updates slice editor controls
    - `updateSequencerCellUI(...)` - Updates sequencer cell styling
    - `initializeDrumSamplerSpecificControls` - Creates knobs for volume/pitch/envelope
  - `js/constants.js`: Bumped APP_VERSION to 0.2.0

#### Day 1 cont: Tap Tempo Feature (2026-04-19)
- **Feature**: Added tap tempo functionality
- **Files Modified**:
  - `js/ui.js`: Added `handleTapTempo()` and `resetTapTempo()` functions
  - `js/eventHandlers.js`: Wired tap button to tempo update
  - `js/main.js`: Added tapBtnGlobal to UI cache
  - `index.html`: Added tap button to global controls bar
- **Version**: Bumped to 0.3.0

#### Day 2: Timeline View Implementation (2026-04-19)
- **Feature**: Implemented functional timeline view
- **Files Modified**:
  - `js/constants.js`: Added TIMELINE_BEAT_WIDTH, TIMELINE_TRACK_HEIGHT, TIMELINE_HEADER_HEIGHT
  - `js/ui.js`: Replaced stub implementations with functional:
    - `renderTimeline()` - Renders track lanes, time ruler, clips, and playhead
    - `updatePlayheadPosition()` - Updates playhead position during playback
    - `openTimelineWindow()` - Creates timeline window and triggers render
- **Version**: Bumped to 0.3.0

#### Day 3: Metronome Feature (2026-04-19)
- **Feature**: Added metronome with toggle button and adjustable volume
- **Files Modified**:
  - `js/constants.js`: Added METRONOME_VOLUME constant (0.5)
  - `js/audio.js`: Added metronome functions:
    - `initializeMetronome()` - Creates synthetic click sounds (1kHz/1.5kHz sine bursts)
    - `startMetronome()` - Schedules clicks on Tone.Transport (accent on beats 1,3)
    - `stopMetronome()` - Stops scheduled clicks
    - `setMetronomeVolume(volume)` - Adjusts click volume (0-1 range, converted to dB)
  - `js/eventHandlers.js`: Added metronome button handler in attachGlobalControlEvents
  - `js/main.js`: Wired metronome functions to appServices, added metronomeBtnGlobal to UI cache
  - `index.html`: Added Metro button to global controls bar
- **Note**: State management for metronome was missing and added in Day 9
- **Version**: Bumped to 0.7.0

#### Day 5: Undo/Redo Coverage for InstrumentSampler and Synth (2026-04-19)
- **Feature**: Added undo state capture to InstrumentSampler and Synth modification methods
- **Files Modified**:
  - `js/Track.js`: Added `_captureUndoState` calls to:
    - `setSynthParam`
    - `setInstrumentSamplerRootNote`, `setInstrumentSamplerLoop`, `setInstrumentSamplerLoopStart`, `setInstrumentSamplerLoopEnd`, `setInstrumentSamplerEnv`
- **Version**: Bumped to 0.6.0

#### Day 6: Undo/Redo Coverage for Effect Parameters and Audio Clips (2026-04-19)
- **Feature**: Fixed undo state capture for additional track operations
- **Files Modified**:
  - `js/Track.js`: Added `_captureUndoState` calls to:
    - `updateEffectParam` - Captures undo before effect parameter changes
    - `reorderEffect` - Captures undo before effect reordering (already had call, verified correct placement)
  - `js/constants.js`: Bumped APP_VERSION to 0.7.1
- **Bug Fixed**: Effect parameter changes were not being captured for undo, making it impossible to undo effect tweaks
- **Version**: Bumped to 0.7.1

#### Day 7: Bug Fixes - Missing clipId, Undo State Timing, Debug Code (2026-04-19)
- **Bug Fixes**: Fixed multiple issues found via ESLint static analysis
- **Files Modified**:
  - `js/Track.js`:
    - Fixed missing `clipId` variable in `addSequenceClipToTimeline()` - was using undefined `clipId`
    - Moved `_captureUndoState()` calls to happen BEFORE state changes in multiple methods (correct undo pattern)
    - Added missing `_captureUndoState` calls in `reorderEffect` and `quantizeSequence`
  - `js/audio.js`:
    - Removed debug code that checked for undefined `getLoadedZipFilesState` (function wasn't imported)
- **Impact**: The missing `clipId` bug would cause sequence clips to have undefined IDs, breaking clip management. The undo state timing fixes ensure undo works correctly by capturing state before modifications.

#### Day 7 cont: Additional Undo/Redo Coverage (2026-04-19)
- **Feature**: Added missing undo state capture to `loadSampleToPad` and `reorderMasterEffectInState`
- **Files Modified**:
  - `js/Track.js`: Added `_captureUndoState` at start of `loadSampleToPad()` method
  - `js/state.js`: Added `_captureUndoState` call to `reorderMasterEffectInState()` before array splice
- **Version**: Bumped to 0.7.2

#### Day 8: Extended Keyboard Shortcuts (2026-04-19)
- **Feature**: Added comprehensive global keyboard shortcuts for common DAW operations
- **Files Modified**:
  - `js/eventHandlers.js`: Added new keyboard shortcuts:
    - `Ctrl+S` - Save Project
    - `Ctrl+O` - Load Project
    - `Ctrl+Shift+Z` - Redo (alternative to Ctrl+Y)
    - `T` - Toggle Metronome
    - `` ` `` (backtick) - Tap Tempo
  - `js/constants.js`: Bumped APP_VERSION to 0.7.3
- **Existing Shortcuts** (already present):
  - `Ctrl+Z` - Undo
  - `Ctrl+Y` - Redo
  - `Space` - Play/Pause
  - `Enter` - Toggle Recording
  - `Escape` - Close all windows
  - `M` - Toggle Mute (armed track)
  - `S` - Toggle Solo (armed track)
  - `R` - Toggle Record Arm
  - `Z` (no modifier) - Octave down
  - `X` (no modifier) - Octave up
  - Computer keyboard notes (A-K for white keys, W-U for black keys)
- **Version**: Bumped to 0.7.3

#### Day 9: Missing Metronome State Bug Fix (2026-04-19)
- **Bug Fix**: Added missing metronome state variables and getters/setters to state.js
- **Files Modified**:
  - `js/state.js`: Added:
    - `metronomeEnabled` and `metronomeVolume` state variables
    - `getMetronomeEnabledState()`, `getMetronomeVolumeState()` getters
    - `setMetronomeEnabledState()`, `setMetronomeVolumeState()` setters
    - Metronome settings saved to `globalSettings` in `gatherProjectDataInternal()`
    - Metronome settings restored in `reconstructDAWInternal()`
- **Impact**: The metronome feature (added in Day 3) was missing its state management. This caused a runtime error because `main.js` was importing functions that didn't exist in `state.js`. The metronome settings now persist across project save/load.
- **Version**: 0.7.3 (no bump needed, this was a bug fix for existing feature)

#### Day 10: Pattern Operations (2026-04-19)
- **Feature**: Added pattern manipulation operations for the sequencer
- **Files Modified**:
  - `js/Track.js`: Added new methods:
    - `randomizePattern(density)` - Randomly activates notes with given density (0-1)
    - `shiftPatternLeft()` - Shifts all notes one step left
    - `shiftPatternRight()` - Shifts all notes one step right
    - `mirrorPatternHorizontal()` - Reverses the pattern horizontally (time)
    - `mirrorPatternVertical()` - Reverses the pattern vertically (pitch inversion, Synth/InstrumentSampler only)
  - `js/ui.js`: Added context menu items in sequencer window:
    - "Pattern Operations" header
    - "Randomize Pattern..." - Prompts for density value
    - "Shift Pattern Left" - Moves pattern one step earlier
    - "Shift Pattern Right" - Moves pattern one step later
    - "Mirror Horizontal" - Reverses pattern in time
    - "Mirror Vertical" - Inverts pitches (only enabled for Synth tracks)
  - `js/constants.js`: Bumped APP_VERSION to 0.8.0
- **Usage**: Right-click on sequencer grid to access pattern operations
- **Version**: Bumped to 0.8.0

## Code Style Guidelines

### Module Structure
- Each module exports functions and/or classes
- `initialize*Module(appServices)` pattern for dependency injection
- `localAppServices` holds references to shared services

### UI Components
- Use `createKnob()` for rotary controls
- Use `createDropZoneHTML()` and `setupGenericDropZoneListeners()` for file/audio drop zones
- Track-specific controls follow pattern: `initialize<TrackType>SpecificControls(track, winEl)`

### State Management
- Centralized state in `js/state.js`
- Getters: `get*State()` functions
- Setters: `set*State()` functions
- Undo/redo via `captureStateForUndoInternal(description)`

### Naming Conventions
- Track methods: `setDrumSamplerPadVolume`, `setDrumSamplerPadPitch`, `setDrumSamplerPadEnv`
- UI element IDs: `<type><controlName>-<trackId>-placeholder` for knob placeholders
- Container IDs: `<type>Container-<trackId>-<subtype>` for specific containers