// js/state.js - Application State Management (Central Re-exporter, temporary .txt extensions)

// Re-exporting all functions from the new, decomposed state modules
// TEMPORARY: Using .txt extensions to force Cloudflare cache clear
export * from './projectState.txt';
export * from './trackState.txt';
export * from './windowState.txt';
export * from './appState.txt';
export * from './masterState.txt';
export * from './soundLibraryState.txt';

// No internal state or logic remains in this file after decomposition
