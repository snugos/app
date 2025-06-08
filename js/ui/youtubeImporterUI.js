// js/ui/youtubeImporterUI.js - UI and logic for importing audio from YouTube
import { showNotification } from '../utils.js';

let localAppServices = {};

export function initializeYouTubeImporterUI(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
}

export function openYouTubeImporterWindow(savedState = null) {
    // ... (this function is unchanged)
}

function attachImporterEventListeners(windowElement) {
    const urlInput = windowElement.querySelector('#youtubeUrlInput');
    const importBtn = windowElement.querySelector('#youtubeImportBtn');
    const statusDiv = windowElement.querySelector('#youtubeImportStatus');

    const setStatus = (message, isError = false) => {
        statusDiv.textContent = message;
        statusDiv.className = `mt-4 text-sm h-12 ${isError ? 'text-red-500 font-bold' : 'text-black dark:text-white'}`;
    };

    const handleImport = async () => {
        const youtubeUrl = urlInput.value.trim();
        if (!youtubeUrl) {
            setStatus('Please enter a valid URL.', true);
            return;
        }

        importBtn.disabled = true;
        urlInput.disabled = true;
        importBtn.textContent = 'Working...';
        setStatus('Requesting stream from server...');

        try {
            const response = await fetch('/.netlify/functions/youtube', {
                method: 'POST',
                body: JSON.stringify({ url: youtubeUrl })
            });

            const result = await response.json();

            if (!result.success) {
                // --- THIS IS THE CHANGE: Log the full error object ---
                console.error('Server function returned an error:', result);
                throw new Error(result.message || 'An unknown server error occurred.');
            }

            setStatus('Audio stream found. Downloading...');
            const audioUrl = result.url;
            
            const proxyUrl = 'https://corsproxy.io/?';
            const audioResponse = await fetch(proxyUrl + encodeURIComponent(audioUrl));
            
            if (!audioResponse.ok) {
                throw new Error(`Failed to download audio file: ${audioResponse.status} ${audioResponse.statusText}`);
            }
            
            const audioBlob = await audioResponse.blob();
            
            setStatus('Audio downloaded. Adding to a new track...');

            const newTrack = localAppServices.addTrack('Audio');
            if (newTrack && typeof newTrack.addExternalAudioFileAsClip === 'function') {
                const videoTitle = result.title || `YT Import`;
                await newTrack.addExternalAudioFileAsClip(audioBlob, 0, videoTitle);
                
                setStatus('Success! Audio added to a new track.', false);
                setTimeout(() => {
                    const win = localAppServices.getWindowById('youtubeImporter');
                    if (win) win.close();
                }, 2000);

            } else {
                throw new Error("Could not create a new audio track or add the clip.");
            }

        } catch (error) {
            console.error('[YouTubeImporter] Import failed:', error);
            setStatus(`Error: ${error.message}`, true);
        } finally {
            importBtn.disabled = false;
            urlInput.disabled = false;
            importBtn.textContent = 'Import';
        }
    };

    importBtn.addEventListener('click', handleImport);
    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleImport();
        }
    });
}
