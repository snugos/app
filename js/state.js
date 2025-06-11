// js/state.js - Application State Management (Central Re-exporter)

// Re-exporting all functions from the new, decomposed state modules
export * from './projectState.js';
export * from './trackState.js';
export * from './windowState.js';
export * from './appState.js';
export * from './masterState.js';
export * from './soundLibraryState.js';

// No internal state or logic remains in this file after decomposition
