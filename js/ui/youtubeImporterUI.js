// js/ui/youtubeImporterUI.js - UI and logic for importing audio from YouTube via Cobalt API

let localAppServices = {};

export function initializeYouTubeImporterUI(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    console.log("[YouTubeImporterUI] Initialized.");
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
        setStatus('Requesting download link from server...');

        try {
            const response = await fetch('/.netlify/functions/cobalt', {
                method: 'POST',
                body: JSON.stringify({ url: youtubeUrl })
            });

            const result = await response.json();

            // --- THIS IS THE CHANGE: Check for detailed error from our function ---
            if (!response.ok) {
                // If the function returned a detailed error object, use its message
                if (result && result.message) {
                    throw new Error(`Server Function Error: ${result.message}`);
                }
                throw new Error(`Request failed: ${response.status} ${response.statusText}`);
            }

            if (result.status === 'stream' || result.status === 'redirect') {
                setStatus('Download link received. Fetching audio...');
                const audioUrl = result.url;
                
                const audioResponse = await fetch(audioUrl);
                
                if (!audioResponse.ok) {
                    throw new Error(`Failed to download audio file: ${audioResponse.status} ${audioResponse.statusText}`);
                }
                
                const audioBlob = await audioResponse.blob();
                
                setStatus('Audio downloaded. Adding to a new track...');

                const newTrack = localAppServices.addTrack('Audio');
                if (newTrack && typeof newTrack.addExternalAudioFileAsClip === 'function') {
                    const videoTitle = result.text || `YT Import`;
                    await newTrack.addExternalAudioFileAsClip(audioBlob, 0, videoTitle);
                    
                    setStatus('Success! Audio added to a new track.', false);
                    setTimeout(() => {
                        const win = localAppServices.getWindowById('youtubeImporter');
                        if (win) win.close();
                    }, 2000);

                } else {
                    throw new Error("Could not create a new audio track or add the clip.");
                }

            } else {
                 throw new Error(`API Error: ${result.text || 'Unknown issue.'}`);
            }

        } catch (error) {
            console.error('[YouTubeImporter] Import failed:', error);
            setStatus(`${error.message}`, true);
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
