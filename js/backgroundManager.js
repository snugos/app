// js/backgroundManager.js - Corrected and Enhanced Logging

const SERVER_URL = 'https://snugos-server-api.onrender.com';
let localAppServices = {}; // To hold references to showNotification, getLoggedInUser, etc.

/**
 * Initializes the background manager with necessary app services.
 * @param {object} appServicesFromMain - The main app services object.
 * @param {function} loadAndApplyUserBackgroundFn - The actual function to load and apply background.
 */
export function initializeBackgroundManager(appServicesFromMain, loadAndApplyUserBackgroundFn) {
    localAppServices = appServicesFromMain;
    // Ensure the function is available via localAppServices if it wasn't already set
    if (!localAppServices.loadAndApplyUserBackground) {
        localAppServices.loadAndApplyUserBackground = loadAndApplyUserBackgroundFn;
    }
    console.log("[BackgroundManager] Initialized. loadAndApplyUserBackgroundFn attached:", loadAndApplyUserBackgroundFn !== undefined);
}

/**
 * Applies a custom background (image or video) to the desktop element.
 * Handles both Blob/File objects and direct URLs.
 * @param {Blob|File|string} source - The background data (File/Blob object or URL string).
 */
export function applyCustomBackground(source) {
    console.log("[BackgroundManager] applyCustomBackground called with source:", typeof source === 'string' ? source.substring(0, 50) + '...' : source);
    const desktopEl = document.getElementById('desktop');
    if (!desktopEl) {
        console.warn("[BackgroundManager] Desktop element not found to apply background.");
        return;
    }

    // Remove any existing background image or video
    desktopEl.style.backgroundImage = '';
    const existingVideo = desktopEl.querySelector('#desktop-video-bg');
    if (existingVideo) {
        existingVideo.remove();
        console.log("[BackgroundManager] Removed existing video background.");
    }

    let url;
    let fileType;
    let revokeObjectURL = false;

    if (typeof source === 'string') {
        url = source;
        const extension = source.split('.').pop().toLowerCase().split('?')[0];
        fileType = ['mp4', 'webm', 'mov', 'ogg'].includes(extension) ? `video/${extension}` : 'image';
        console.log(`[BackgroundManager] Source is URL. Type: ${fileType}. URL: ${url.substring(0, 50)}...`);
    } else if (source instanceof Blob || source instanceof File) {
        url = URL.createObjectURL(source);
        fileType = source.type;
        revokeObjectURL = true; // Need to revoke this URL later
        console.log(`[BackgroundManager] Source is Blob/File. Type: ${fileType}. Temp URL: ${url.substring(0, 50)}...`);
    } else {
        console.warn("[BackgroundManager] Invalid source type for applyCustomBackground:", source);
        return;
    }

    if (fileType.startsWith('image/')) {
        desktopEl.style.backgroundImage = `url(${url})`;
        desktopEl.style.backgroundSize = 'cover';
        desktopEl.style.backgroundPosition = 'center';
        desktopEl.style.backgroundRepeat = 'no-repeat';
        console.log("[BackgroundManager] Applied image background.");
    } else if (fileType.startsWith('video/')) {
        const videoEl = document.createElement('video');
        videoEl.id = 'desktop-video-bg';
        videoEl.style.position = 'absolute';
        videoEl.style.top = '0';
        videoEl.style.left = '0';
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'cover';
        videoEl.src = url;
        videoEl.autoplay = true;
        videoEl.loop = true;
        videoEl.muted = true;
        videoEl.playsInline = true; // Important for mobile autoplay

        videoEl.addEventListener('loadeddata', () => {
            desktopEl.style.backgroundImage = 'none';
            console.log("[BackgroundManager] Video loaded, hiding image background.");
        });
        videoEl.addEventListener('error', (e) => {
            console.error("[BackgroundManager] Video playback error:", e);
            desktopEl.style.backgroundImage = 'none'; // Fallback
            localAppServices.showNotification?.('Video background failed to load. Using default.', 3000);
        });

        desktopEl.appendChild(videoEl);
        console.log("[BackgroundManager] Applied video background.");
    }

    // Revoke the temporary URL if it was created from a Blob/File
    if (revokeObjectURL) {
        // Delay revocation to allow rendering to complete
        setTimeout(() => {
            URL.revokeObjectURL(url);
            console.log("[BackgroundManager] Revoked temporary object URL.");
        }, 5000);
    }
}

/**
 * Handles the process of uploading a background file, saving it to the server,
 * storing it locally, and broadcasting the change.
 * @param {File} file - The image or video file selected by the user.
 */
export async function handleBackgroundUpload(file) {
    console.log("[BackgroundManager] handleBackgroundUpload called with file:", file.name);

    const loggedInUser = localAppServices.getLoggedInUser?.(); 
    if (!loggedInUser) {
        localAppServices.showNotification?.('You must be logged in to save a custom background.', 3000);
        applyCustomBackground(file); // Still apply temporarily for the current session
        console.log("[BackgroundManager] User not logged in, applying temporarily.");
        return;
    }

    localAppServices.showNotification?.('Saving background...', 2000);
    console.log("[BackgroundManager] Starting background upload process for user:", loggedInUser.username);

    try {
        // 1. Prepare FormData and Authentication Token
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', '/backgrounds/'); 
        formData.append('is_public', 'false'); 

        const token = localStorage.getItem('snugos_token');
        if (!token) {
            console.error("[BackgroundManager] Authentication token not found. Cannot upload background.");
            throw new Error("Authentication token missing. Please log in again.");
        }

        // 2. Upload file to S3 via your server
        console.log("[BackgroundManager] Attempting file upload to server /api/files/upload...");
        const uploadResponse = await fetch(`${SERVER_URL}/api/files/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error("[BackgroundManager] File upload server error:", uploadResponse.status, uploadResponse.statusText, errorText);
            throw new Error(`File upload failed: ${uploadResponse.status} ${uploadResponse.statusText}. Server response: ${errorText.substring(0, 200)}...`);
        }

        const uploadResult = await uploadResponse.json();
        if (!uploadResult.success) {
            console.error("[BackgroundManager] File upload API returned success: false", uploadResult.message);
            throw new Error(uploadResult.message || 'File upload failed on server.');
        }
        const newBgUrl = uploadResult.file.s3_url;
        console.log("[BackgroundManager] File successfully uploaded to S3. URL:", newBgUrl.substring(0, 50) + '...');

        // 3. Update user's profile with the new background URL
        console.log("[BackgroundManager] Updating user profile /api/profile/settings with new background URL...");
        const settingsResponse = await fetch(`${SERVER_URL}/api/profile/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ background_url: newBgUrl })
        });
        
        if (!settingsResponse.ok) {
             const errorText = await settingsResponse.text();
             console.error("[BackgroundManager] Profile update server error:", settingsResponse.status, settingsResponse.statusText, errorText);
             throw new Error(`Profile update failed: ${settingsResponse.status} ${settingsResponse.statusText}. Server response: ${errorText.substring(0, 200)}...`);
        }

        const settingsResult = await settingsResponse.json();
        if (!settingsResult.success) {
            console.error("[BackgroundManager] Profile update API returned success: false", settingsResult.message);
            throw new Error(settingsResult.message || 'Profile update failed on server.');
        }
        console.log("[BackgroundManager] User profile successfully updated with new background URL.");

        // 4. Store locally in IndexedDB for quicker loading next time
        if (localAppServices.storeAsset) {
            try {
                await localAppServices.storeAsset(`background-for-user-${loggedInUser.id}`, file);
                console.log("[BackgroundManager] Background stored locally in IndexedDB.");
            } catch (indexedDBError) {
                console.warn("[BackgroundManager] IndexedDB storage failed:", indexedDBError);
                localAppServices.showNotification?.('Background saved to server, but not locally (IndexedDB error).', 3000);
            }
        } else {
            console.warn("[BackgroundManager] localAppServices.storeAsset is not available. Skipping local IndexedDB storage.");
        }

        // 5. Apply the background to the current page immediately
        applyCustomBackground(newBgUrl);
        localAppServices.showNotification?.('Background updated and saved!', 2500);

        // 6. Broadcast the change to other open SnugOS pages
        broadcastBackgroundChange(newBgUrl);
        console.log("[BackgroundManager] Background change broadcasted to other pages.");

    } catch (error) {
        console.error("[BackgroundManager] CRITICAL: Background upload/update process failed:", error);
        localAppServices.showNotification?.(`Error setting background: ${error.message}`, 8000);
        // Attempt to revert to a default/empty background on failure
        applyCustomBackground('');
    }
}

/**
 * Loads the user's saved background from the server or local storage
 * and applies it when a page initializes.
 */
export async function loadAndApplyUserBackground() {
    console.log("[BackgroundManager] loadAndApplyUserBackground called.");
    const loggedInUser = localAppServices.getLoggedInUser?.();
    const desktopEl = document.getElementById('desktop');
    if (!desktopEl) {
        console.warn("[BackgroundManager] Desktop element not found for loadAndApplyUserBackground.");
        return;
    }

    // Clear any existing background before loading a new one to prevent flicker/duplicates
    applyCustomBackground(''); 

    // First, try to load from local IndexedDB (fastest)
    if (loggedInUser && localAppServices.getAsset) {
        try {
            const localBgBlob = await localAppServices.getAsset(`background-for-user-${loggedInUser.id}`);
            if (localBgBlob) {
                console.log("[BackgroundManager] Applying background from IndexedDB.");
                applyCustomBackground(localBgBlob);
                return; // Applied from local DB, no need to fetch from server
            }
        } catch (e) {
            console.warn("[BackgroundManager] Could not load background from IndexedDB:", e);
        }
    }

    // Fallback: Fetch from server if not found locally or not logged in
    if (loggedInUser) {
        const token = localStorage.getItem('snugos_token');
        if (!token) { 
            console.warn("[BackgroundManager] No token found for loggedInUser, skipping server background fetch.");
            applyCustomBackground(''); // Ensure default if no token
            return;
        }

        try {
            console.log("[BackgroundManager] Fetching background URL from server for user:", loggedInUser.username);
            const response = await fetch(`${SERVER_URL}/api/profile/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success && data.profile.background_url) {
                console.log("[BackgroundManager] Applying background from server URL:", data.profile.background_url.substring(0, 50) + '...');
                applyCustomBackground(data.profile.background_url);
            } else {
                console.log("[BackgroundManager] No custom background URL found on server or fetch failed. Applying default.");
                applyCustomBackground(''); 
            }
        } catch (error) {
            console.error("[BackgroundManager] Could not fetch/apply background from server:", error);
            applyCustomBackground(''); 
        }
    } else {
        console.log("[BackgroundManager] No user logged in. Applying default background.");
        applyCustomBackground(''); 
    }
}

let backgroundChannel = null;

/**
 * Initializes the BroadcastChannel for background updates.
 */
function initializeBroadcastChannel() {
    if ('BroadcastChannel' in window && !backgroundChannel) {
        backgroundChannel = new BroadcastChannel('snugos-background-update');
        backgroundChannel.onmessage = (event) => {
            if (event.data && event.data.type === 'background_updated') {
                console.log("[BackgroundManager] Received background update broadcast:", event.data.url.substring(0, 50) + '...');
                applyCustomBackground(event.data.url);
            }
        };
        console.log("[BackgroundManager] BroadcastChannel initialized for background updates.");
    } else if ('BroadcastChannel' in window) {
        console.log("[BackgroundManager] BroadcastChannel already initialized.");
    } else {
        console.warn("[BackgroundManager] BroadcastChannel not supported in this browser.");
    }
}

// Initialize the BroadcastChannel as soon as this module loads
initializeBroadcastChannel();
