// js/ui/youtubeImporterUI.js - UI and logic for importing audio from YouTube
import { showNotification } from '../utils.js';

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
                Enter a YouTube URL to download its audio.
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
        { width: 450, height: 220, minWidth: 400, minHeight: 220 }
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
        setStatus('Requesting stream from server...');

        try {
            const response = await fetch('/.netlify/functions/youtube', {
                method: 'POST',
                body: JSON.stringify({ url: youtubeUrl })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'An unknown error occurred on the server.');
            }

            setStatus('Audio stream found. Downloading...');
            const audioUrl = result.url;
            
            const proxyUrl = 'https://corsproxy.io/?';
            const audioResponse = await fetch(proxyUrl + encodeURIComponent(audioUrl));
            
            if (!audioResponse.ok) {
                throw new Error(`Failed to download audio file: ${audioResponse.status} ${audioResponse.statusText}`);
            }
            
            const audioBlob = await audioResponse.blob();
            
            setStatus('Audio downloaded. Saving to Sound Browser...');

            const videoTitle = result.title || `YT Import`;
            const fileName = `${videoTitle.replace(/[/\\?%*:|"<>]/g, '-')}.mp3`;
            await localAppServices.addFileToSoundLibrary(fileName, audioBlob);
            
            setStatus('Success! Audio added to "Imports" folder.', false);
            showNotification(`Saved "${fileName}" to Sound Browser.`);
            
            setTimeout(() => {
                const win = localAppServices.getWindowById('youtubeImporter');
                if (win) win.close();
            }, 2000);

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
