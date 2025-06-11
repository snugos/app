// js/daw/ui/youtubeImporterUI.js - UI and logic for importing audio from YouTube
// Removed imports as functions will be global or accessed via localAppServices

let localAppServices = {};

export function initializeYouTubeImporterUI(appServicesFromMain) { // Export present
    localAppServices = appServicesFromMain || {};
}

export function openYouTubeImporterWindow(savedState = null) { // Export present
    const windowId = 'youtubeImporter';
    // getOpenWindowsState is global
    if (localAppServices.getOpenWindows?.().has(windowId)) {
        // getWindowByIdState is global
        localAppServices.getWindowById(windowId).restore();
        return;
    }

    const contentHTML = `
        <div class="p-4 space-y-3 text-sm text-black dark:text-white">
            <p>Paste a YouTube URL to import the audio into your sound library.</p>
            <div class="flex">
                <input type="text" id="youtubeUrlInput" class="w-full p-1.5 border rounded-l bg-white dark:bg-black border-black dark:border-white" placeholder="https://www.youtube.com/watch?v=...">
                <button id="youtubeImportBtn" class="px-4 py-1.5 border rounded-r bg-black text-white border-black hover:bg-white hover:text-black dark:bg-white dark:text-black dark:border-white dark:hover:bg-black dark:hover:text-white">Import</button>
            </div>
            <div id="youtubeImportStatus" class="mt-4 text-sm h-12"></div>
        </div>
    `;

    // SnugWindow is global
    const importerWindow = localAppServices.createWindow(windowId, 'Import from URL', contentHTML, {
        width: 450,
        height: 200,
    });
    
    attachImporterEventListeners(importerWindow.element);
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
            // showNotification is global
            setStatus('Please enter a valid URL.', true);
            return;
        }

        importBtn.disabled = true;
        urlInput.disabled = true;
        importBtn.textContent = 'Working...';
        setStatus('Requesting audio from server... (this can take a moment)');

        try {
            // Step 1: Call our Netlify function
            const response = await fetch('https://snugos-server-api.onrender.com/function/youtube', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: youtubeUrl })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'An unknown server error occurred.');
            }

            setStatus('Audio received. Processing...');
            
            // Step 2: Convert the Base64 string back to a Blob
            // base64ToBlob is global
            const audioBlob = base64ToBlob(result.base64);
            
            // Clean up the title to create a valid filename
            const fileName = (result.title || 'imported-youtube-audio').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.mp3';

            // addFileToSoundLibraryInternal is global
            if (localAppServices.addFileToSoundLibraryInternal) {
                await localAppServices.addFileToSoundLibraryInternal(fileName, audioBlob);
                setStatus(`Success! "${fileName}" added to your 'Imports' library.`, false);
                
                // Refresh the sound browser if it's open
                // getWindowByIdState and renderSoundBrowser are global
                const soundBrowser = localAppServices.getWindowById?.('soundBrowser');
                if (soundBrowser && !soundBrowser.isMinimized) {
                    localAppServices.renderSoundBrowser();
                }

                setTimeout(() => {
                    // getWindowByIdState is global
                    const win = localAppServices.getWindowById('youtubeImporter');
                    if (win) win.close();
                }, 2500);

            } else {
                throw new Error("Sound Library service is not available.");
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
