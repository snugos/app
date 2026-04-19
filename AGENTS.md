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
  - `js/state.js`: Added metronomeEnabled and metronomeVolume state variables with getters/setters
  - `js/audio.js`: Added metronome functions:
    - `initializeMetronome()` - Creates synthetic click sounds (1kHz/1.5kHz sine bursts)
    - `startMetronome()` - Schedules clicks on Tone.Transport (accent on beats 1,3)
    - `stopMetronome()` - Stops scheduled clicks
    - `setMetronomeVolume(volume)` - Adjusts click volume (0-1 range, converted to dB)
  - `js/eventHandlers.js`: Added metronome button handler in attachGlobalControlEvents
  - `js/main.js`: Wired metronome functions to appServices, added metronomeBtnGlobal to UI cache
  - `index.html`: Added Metro button to global controls bar
- **Version**: Bumped to 0.7.0

#### Day 5: Undo/Redo Coverage for InstrumentSampler and Synth (2026-04-19)
- **Feature**: Added undo state capture to InstrumentSampler and Synth modification methods
- **Files Modified**:
  - `js/Track.js`: Added `_captureUndoState` calls to:
    - `setSynthParam`
    - `setInstrumentSamplerRootNote`, `setInstrumentSamplerLoop`, `setInstrumentSamplerLoopStart`, `setInstrumentSamplerLoopEnd`, `setInstrumentSamplerEnv`
- **Version**: Bumped to 0.6.0

#### Day 6: Bug Fix - Reconstruction Flag Typo (2026-04-19)
- **Bug Fix**: Fixed typos in reconstruction flag function names causing undo state capture to fail during project load
- **Files Modified**:
  - `js/main.js`: Fixed `getIsReconstructconstructingDAW` → `getIsReconstructingDAW`, `isReconstructconstruct` → `isReconstructing`, `_isReconstructconstructingDAW_flag` → `_isReconstructingDAW_flag`
  - `js/audio.js`: Fixed `isReconstructinging` → `isReconstructing`
- **Impact**: These typos caused undo state to be incorrectly captured during project reconstruction, leading to bloated undo stacks

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