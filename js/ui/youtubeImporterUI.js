// js/ui/youtubeImporterUI.js - UI and logic for importing audio from YouTube via Cobalt API

let localAppServices = {};

export function initializeYouTubeImporterUI(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    console.log("[YouTubeImporterUI] Initialized.");
}

export function openYouTubeImporterWindow(savedState = null) {
    const windowId = 'youtubeImporter';
    if (localAppServices.getWindowById && localAppServices.getWindowById(windowId)) {
        localAppServices.getWindowById(windowId).restore();
        return;
    }

    const contentHTML = `
        <div class="p-4 flex flex-col h-full bg-white dark:bg-black text-black dark:text-white">
            <h3 class="text-lg font-bold mb-2">Import Audio from URL</h3>
            <p class="text-xs mb-2 text-black dark:text-white">
                Enter a YouTube URL to download its audio. This feature uses the public <a href="https://cobalt.tools/" target="_blank" class="text-black dark:text-white hover:underline">Cobalt</a> API.
            </p>
            
            <div class="flex items-center space-x-2">
                <input type="text" id="youtubeUrlInput" placeholder="Enter a YouTube video URL..." class="flex-grow p-2 border rounded bg-white dark:bg-black border-black dark:border-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none">
                <button id="youtubeImportBtn" class="px-4 py-2 bg-black text-white font-semibold rounded border border-black hover:bg-white hover:text-black dark:bg-white dark:text-black dark:border-white dark:hover:bg-black dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                    Import
                </button>
            </div>

            <div id="youtubeImportStatus" class="mt-4 text-sm h-12"></div>
        </div>
    `;

    const importerWindow = localAppServices.createWindow(
        windowId, 
        'URL Importer', 
        contentHTML, 
        { width: 450, height: 240, minWidth: 400, minHeight: 240 }
    );

    if (importerWindow?.element) {
        attachImporterEventListeners(importerWindow.element);
    }
    return importerWindow;
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
            // --- THIS IS THE FIX: Call our own Netlify Function ---
            const response = await fetch('/.netlify/functions/cobalt', {
                method: 'POST',
                body: JSON.stringify({ url: youtubeUrl })
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

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
