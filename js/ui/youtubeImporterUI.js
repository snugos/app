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
                Enter a YouTube URL to download its audio as an MP3. This feature uses the public <a href="https://cobalt.tools/" target="_blank" class="text-black dark:text-white hover:underline">Cobalt</a> API.
            </p>

            <div class="p-2 mb-4 text-xs bg-white border border-black rounded-md text-black dark:bg-black dark:text-white dark:border-white" role="alert">
                <b>Note:</b> This is an experimental feature. Public APIs can be unreliable or change without notice.
            </div>
            
            <div class="flex items-center space-x-2">
                <input type="text" id="youtubeUrlInput" placeholder="https://www.youtube.com/watch?v=..." class="flex-grow p-2 border rounded bg-white dark:bg-black border-black dark:border-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none">
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
        { width: 450, height: 280, minWidth: 400, minHeight: 280 }
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
        setStatus('Requesting download link from Cobalt API...');

        try {
            // --- THIS IS THE FIX ---
            const response = await fetch('https://api.cobalt.tools/api/json', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: youtubeUrl,
                    aFormat: "mp3",
                    isAudioOnly: true
                })
            });

            if (!response.ok) {
                throw new Error(`Cobalt API returned an error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.status === 'stream' || result.status === 'redirect') {
                setStatus('Download link received. Fetching audio...');
                const audioUrl = result.url;
                
                // Using a proxy to bypass potential CORS issues
                const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
                const audioResponse = await fetch(proxyUrl + audioUrl);
                
                if (!audioResponse.ok) {
                    throw new Error(`Failed to download audio file: ${audioResponse.status} ${audioResponse.statusText}`);
                }
                
                const audioBlob = await audioResponse.blob();
                
                setStatus('Audio downloaded. Adding to a new track...');

                const newTrack = localAppServices.addTrack('Audio');
                if (newTrack && typeof newTrack.addExternalAudioFileAsClip === 'function') {
                    const videoTitle = result.text || `YT Import ${new URL(youtubeUrl).searchParams.get('v') || ''}`;
                    await newTrack.addExternalAudioFileAsClip(audioBlob, 0, videoTitle);
                    
                    setStatus('Success! Audio added to a new track.', false);
                    setTimeout(() => {
                        const win = localAppServices.getWindowById('youtubeImporter');
                        if (win) win.close();
                    }, 2000);

                } else {
                    throw new Error("Could not create a new audio track or add the clip.");
                }

            } else if (result.status === 'error') {
                throw new Error(result.text || 'Cobalt API returned an unknown error.');
            } else if (result.status === 'rate-limit') {
                throw new Error('You are being rate-limited by the API. Please try again later.');
            } else {
                 throw new Error(`Unsupported API status: ${result.status}`);
            }

        } catch (error) {
            console.error('[YouTubeImporter] Import failed:', error);
            let userMessage = `Error: ${error.message}`;
            if (error instanceof TypeError) { 
                userMessage = "A network error occurred. This may be due to browser security (CORS).";
            }
            setStatus(userMessage, true);
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
