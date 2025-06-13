// js/backgroundManager.js

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
}

/**
 * Applies a custom background (image or video) to the desktop element.
 * Handles both Blob/File objects and direct URLs.
 * @param {Blob|File|string} source - The background data (File/Blob object or URL string).
 */
export function applyCustomBackground(source) {
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
    }

    let url;
    let fileType;
    let revokeObjectURL = false;

    if (typeof source === 'string') {
        url = source;
        const extension = source.split('.').pop().toLowerCase().split('?')[0];
        fileType = ['mp4', 'webm', 'mov', 'ogg'].includes(extension) ? `video/${extension}` : 'image';
    } else if (source instanceof Blob || source instanceof File) {
        url = URL.createObjectURL(source);
        fileType = source.type;
        revokeObjectURL = true; // Need to revoke this URL later
    } else {
        console.warn("[BackgroundManager] Invalid source type for applyCustomBackground:", source);
        return;
    }

    if (fileType.startsWith('image/')) {
        desktopEl.style.backgroundImage = `url(${url})`;
        desktopEl.style.backgroundSize = 'cover';
        desktopEl.style.backgroundPosition = 'center';
        desktopEl.style.backgroundRepeat = 'no-repeat';
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

        // Optional: Remove background image if video is loaded and ready
        videoEl.addEventListener('loadeddata', () => {
            desktopEl.style.backgroundImage = 'none';
        });

        desktopEl.appendChild(videoEl);
    }

    // Revoke the temporary URL if it was created from a Blob/File
    if (revokeObjectURL) {
        // Delay revocation to allow rendering to complete
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
}

/**
 * Handles the process of uploading a background file, saving it to the server,
 * storing it locally, and broadcasting the change.
 * @param {File} file - The image or video file selected by the user.
 */
export async function handleBackgroundUpload(file) {
    const loggedInUser = localAppServices.getLoggedInUser?.(); // Assuming this is now available in appServices
    if (!loggedInUser) {
        localAppServices.showNotification?.('You must be logged in to save a custom background.', 3000);
        // Still apply temporarily for the current session even if not logged in
        applyCustomBackground(file);
        return;
    }

    localAppServices.showNotification?.('Saving background...', 2000);

    try {
        // 1. Upload to S3 via your server
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', '/backgrounds/'); // A dedicated folder for backgrounds
        formData.append('is_public', 'false'); // Backgrounds are typically not public files

        const token = localStorage.getItem('snugos_token');
        const uploadResponse = await fetch(`${SERVER_URL}/api/files/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const uploadResult = await uploadResponse.json();

        if (!uploadResult.success) {
            throw new Error(uploadResult.message || 'File upload failed.');
        }

        const newBgUrl = uploadResult.file.s3_url;

        // 2. Update user's profile with the new background URL
        const settingsResponse = await fetch(`${SERVER_URL}/api/profile/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ background_url: newBgUrl })
        });
        const settingsResult = await settingsResponse.json();

        if (!settingsResult.success) {
            throw new Error(settingsResult.message || 'Profile update failed.');
        }

        // 3. Store locally in IndexedDB for quicker loading next time
        // This assumes storeAsset is available via appServices (from db.js or welcomeDb.js/profileDb.js)
        await localAppServices.storeAsset?.(`background-for-user-${loggedInUser.id}`, file);

        // 4. Apply the background to the current page
        applyCustomBackground(newBgUrl);

        localAppServices.showNotification?.('Background updated and saved!', 2500);

        // 5. Broadcast the change to other open SnugOS pages
        broadcastBackgroundChange(newBgUrl);

    } catch (error) {
        console.error("[BackgroundManager] Background upload/update error:", error);
        localAppServices.showNotification?.(`Error setting background: ${error.message}`, 4000);
    }
}

/**
 * Loads the user's saved background from the server or local storage
 * and applies it when a page initializes.
 */
export async function loadAndApplyUserBackground() {
    const loggedInUser = localAppServices.getLoggedInUser?.();
    const desktopEl = document.getElementById('desktop');
    if (!desktopEl) return;

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
        try {
            const token = localStorage.getItem('snugos_token');
            const response = await fetch(`${SERVER_URL}/api/profile/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success && data.profile.background_url) {
                console.log("[BackgroundManager] Applying background from server.");
                applyCustomBackground(data.profile.background_url);
                // Optionally, store this URL's content locally for next time
                // This would involve fetching the URL content as a Blob and saving it.
            } else {
                // If logged in but no background_url on server, ensure default is applied
                applyCustomBackground('');
            }
        } catch (error) {
            console.error("[BackgroundManager] Could not apply global settings from server:", error);
            // Revert to default background if server fetch fails
            applyCustomBackground(''); // Clear any old background if loading fails
        }
    } else {
        // If no user is logged in, ensure default background
        applyCustomBackground(''); // Clear any old background
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
                console.log("[BackgroundManager] Received background update broadcast:", event.data.url);
                applyCustomBackground(event.data.url);
            }
        };
        console.log("[BackgroundManager] BroadcastChannel initialized for background updates.");
    }
}

// Initialize the BroadcastChannel as soon as this module loads
initializeBroadcastChannel();
