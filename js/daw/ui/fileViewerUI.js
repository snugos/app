// js/daw/ui/fileViewerUI.js

let localAppServices = {};

export function initializeFileViewerUI(appServicesFromMain) {
    localAppServices = appServicesFromMain;
}

export function openFileViewerWindow(fileItem) {
    const windowId = `fileViewer-${fileItem.id}`;
    if (localAppServices.getWindowById?.(windowId)) {
        localAppServices.getWindowById(windowId).restore();
        return;
    }

    let contentElement;
    let windowOptions = {
        width: 400,
        height: 300,
        minWidth: 200,
        minHeight: 150,
        initialContentKey: windowId
    };

    if (fileItem.mime_type.startsWith('audio/')) {
        contentElement = document.createElement('audio');
        contentElement.controls = true;
        contentElement.src = fileItem.s3_url;
        contentElement.className = 'w-full h-full';
        contentElement.style.backgroundColor = 'black'; // Dark background for audio player
        windowOptions.width = 400;
        windowOptions.height = 100;
        windowOptions.minHeight = 100;
        windowOptions.resizeable = false; // Audio player doesn't need resizing much
    } else if (fileItem.mime_type.startsWith('image/')) {
        contentElement = document.createElement('img');
        contentElement.src = fileItem.s3_url;
        contentElement.className = 'w-full h-full object-contain p-2';
        windowOptions.width = 500;
        windowOptions.height = 400;
    } else if (fileItem.mime_type.startsWith('video/')) {
        contentElement = document.createElement('video');
        contentElement.controls = true;
        contentElement.src = fileItem.s3_url;
        contentElement.className = 'w-full h-full';
        contentElement.style.backgroundColor = 'black';
        windowOptions.width = 640;
        windowOptions.height = 400;
    } else {
        contentElement = document.createElement('div');
        contentElement.className = 'p-4 text-center';
        contentElement.innerHTML = `
            <p><strong>File:</strong> ${fileItem.file_name}</p>
            <p><strong>Type:</strong> ${fileItem.mime_type}</p>
            <p>This file type cannot be previewed directly.</p>
            <a href="${fileItem.s3_url}" target="_blank" class="text-blue-500 hover:underline mt-2 inline-block">Download/Open in New Tab</a>
        `;
        windowOptions.width = 450;
        windowOptions.height = 200;
    }

    const fileViewerWindow = localAppServices.createWindow(windowId, `Viewing: ${fileItem.file_name}`, contentElement, windowOptions);
}
