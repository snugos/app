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

#### Day 3: Bug Fixes - Typos and Missing Undo Capture (2026-04-19)
- **Feature**: Fixed critical typos and added missing undo/redo support
- **Bugs Fixed**:
  1. **main.js line 433**: Fixed typo `isReconstructconstruct` → `isReconstructing`
  2. **main.js line 470**: Fixed typo `isReconstructinging` → `isReconstructing`
  3. **main.js line 493**: Fixed typo `_isReconstructingingDAW_flag` → `_isReconstructingDAW_flag`
  4. **Track.js `setVolume()`**: Added missing `_captureUndoState()` call
  5. **Track.js `setSynthParam()`**: Added missing `_captureUndoState()` call
  6. **Track.js `setSliceVolume()`**: Added missing `_captureUndoState()` call
  7. **Track.js `setSlicePitchShift()`**: Added missing `_captureUndoState()` call
  8. **Track.js `setSliceLoop()`**: Added missing `_captureUndoState()` call
  9. **Track.js `setSliceReverse()`**: Added missing `_captureUndoState()` call
  10. **Track.js `setSliceEnvelopeParam()`**: Added missing `_captureUndoState()` call
  11. **Track.js `setInstrumentSamplerRootNote()`**: Added missing `_captureUndoState()` call
  12. **Track.js `setInstrumentSamplerLoop()`**: Added missing `_captureUndoState()` call
- **Files Modified**:
  - `js/main.js`: Fixed 3 typos in reconstruction flag handling
  - `js/Track.js`: Added 9 missing `_captureUndoState()` calls to setter methods
- **Impact**: These fixes ensure proper undo/redo functionality for all track parameter changes

#### Day 5: Undo/Redo Coverage for InstrumentSampler and Synth (2026-04-19)
- **Feature**: Added undo state capture to InstrumentSampler and Synth modification methods
- **Files Modified**:
  - `js/Track.js`: Added `_captureUndoState` calls to:
    - `setSynthParam`
    - `setInstrumentSamplerRootNote`, `setInstrumentSamplerLoop`, `setInstrumentSamplerLoopStart`, `setInstrumentSamplerLoopEnd`, `setInstrumentSamplerEnv`
- **Version**: Bumped to 0.6.0

### Incomplete Features (Priority Order)

1. **Recording**: End-to-end test with real microphone
   - Recording functions exist in `js/audio.js` (`startAudioRecording`, `stopAudioRecording`)
   - Need to verify microphone permissions and audio routing

2. **Undo/redo**: Verify all state mutations go through capture mechanism
   - `captureStateForUndoInternal` exists in `js/state.js`
   - Need to audit all state mutations to ensure they call this function

3. **No Automated Tests**: Project lacks automated testing

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