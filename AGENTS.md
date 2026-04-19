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
    - `renderDrumSamplerPads(track)` - Renders 8 pad buttons with visual feedback for loaded/selected states
    - `updateDrumPadControlsUI(track)` - Updates drop zone, volume/pitch knobs, and envelope controls
    - `renderSamplePads(track)` - Renders slice pads for Sampler track
    - `updateSliceEditorUI(track)` - Updates slice editor controls
    - `updateSequencerCellUI(sequencerElement, trackType, row, col, isActive)` - Updates sequencer cells
    - `initializeDrumSamplerSpecificControls(track, winEl)` - Creates knobs for volume, pitch, and envelope
- **Version**: Bumped to 0.2.0

### Incomplete Features (Priority Order)

1. **Recording**: End-to-end test with real microphone
   - Recording functions exist in `js/audio.js` (`startAudioRecording`, `stopAudioRecording`)
   - Need to verify microphone permissions and audio routing

2. **Undo/redo**: Verify all state mutations go through capture mechanism
   - `captureStateForUndoInternal` exists in `js/state.js`
   - Need to audit all state mutations to ensure they call this function

3. **Timeline View**: `renderTimeline` and `updatePlayheadPosition` are stubs
   - Basic window structure exists but timeline rendering is not implemented

4. **No Automated Tests**: Project lacks automated testing

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