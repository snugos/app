// js/ui/youtubeImporterUI.js - UI and logic for importing audio from YouTube via Cobalt API

let localAppServices = {};

/**
 * Initializes the YouTube Importer UI module with a reference to app services.
 * @param {object} appServicesFromMain - A reference to the main appServices object.
 */
export function initializeYouTubeImporterUI(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    console.log("[YouTubeImporterUI] Initialized.");
}

/**
 * Opens a window for importing audio from a YouTube URL.
 * @param {object} savedState - Optional saved state for restoring window position/size.
 * @returns {SnugWindow|null} The created window instance or null if it fails.
 */
export function openYouTubeImporterWindow(savedState = null) {
    const windowId = 'youtubeImporter';
    if (localAppServices.getWindowById && localAppServices.getWindowById(windowId)) {
        localAppServices.getWindowById(windowId).restore();
        return;
    }

    const contentHTML = `
        <div class="p-4 flex flex-col h-full bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200">
            <h3 class="text-lg font-bold mb-2">Import Audio from URL</h3>
            <p class="text-xs mb-2 text-gray-600 dark:text-slate-400">
                Enter a YouTube URL to download its audio as an MP3. This feature uses the public <a href="https://cobalt.tools/" target="_blank" class="text-blue-500 hover:underline">Cobalt</a> API.
            </p>

            <div class="p-2 mb-4 text-xs bg-yellow-100 border border-yellow-300 rounded-md text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700" role="alert">
                <b>Note:</b> This is an experimental feature. It may be slow, rate-limited, or fail due to browser security (CORS) policies. A server-side helper is required for this to work reliably.
            </div>
            
            <div class="flex items-center space-x-2">
                <input type="text" id="youtubeUrlInput" placeholder="https://www.youtube.com/watch?v=..." class="flex-grow p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <button id="youtubeImportBtn" class="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed">
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
        { width: 450, height: 250, minWidth: 400, minHeight: 250 }
    );

    if (importerWindow?.element) {
        attachImporterEventListeners(importerWindow.element);
    }
    return importerWindow;
}

/**
 * Attaches event listeners to the controls within the YouTube Importer window.
 * @param {HTMLElement} windowElement - The root element of the importer window.
 */
function attachImporterEventListeners(windowElement) {
    const urlInput = windowElement.querySelector('#youtubeUrlInput');
    const importBtn = windowElement.querySelector('#youtubeImportBtn');
    const statusDiv = windowElement.querySelector('#youtubeImportStatus');

    const setStatus = (message, isError = false) => {
        statusDiv.textContent = message;
        statusDiv.className = `mt-4 text-sm h-12 ${isError ? 'text-red-500' : 'text-gray-500 dark:text-slate-300'}`;
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
            const response = await fetch('https://co.wuk.sh/api/json', {
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
            console.log("[YouTubeImporter] Cobalt API Response:", result);

            if (result.status === 'stream' || result.status === 'redirect') {
                setStatus('Download link received. Fetching audio...');
                const audioUrl = result.url;
                
                const audioResponse = await fetch(audioUrl);
                if (!audioResponse.ok) {
                    throw new Error(`Failed to download audio file: ${audioResponse.status} ${audioResponse.statusText}`);
                }
                
                const audioBlob = await audioResponse.blob();
                console.log(`[YouTubeImporter] Downloaded audio blob. Size: ${audioBlob.size} bytes, Type: ${audioBlob.type}`);
                
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
            if (error instanceof TypeError) { // This is often a CORS error
                userMessage = "Error: Could not fetch audio due to browser security (CORS). This feature requires a server-side proxy to work reliably.";
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
