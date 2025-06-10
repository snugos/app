// server.js - SnugOS Dedicated API Server

const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');

// Create the Express app
const app = express();
const PORT = process.env.PORT || 3000;

// === Middleware ===
// Enable JSON body parsing for our POST requests
app.use(express.json());
// Enable Cross-Origin Resource Sharing (CORS) so your Vercel app can call this server
app.use(cors());

// === API Endpoint for YouTube Downloads ===
app.post('/api/youtube', async (request, response) => {
    try {
        const { url } = request.body;
        if (!url || !ytdl.validateURL(url)) {
            // Use return to stop execution after sending a response
            return response.status(400).json({ success: false, message: 'A valid YouTube URL was not provided.' });
        }

        console.log(`[Server] Received request for URL: ${url}`);

        // Get video info and find the best audio-only format
        const info = await ytdl.getInfo(url);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });

        if (!format) {
            throw new Error('No suitable audio-only format could be found for this video.');
        }
        
        console.log(`[Server] Found format for "${info.videoDetails.title}". Piping audio stream to client...`);

        // Set headers to stream the audio directly to the client
        response.setHeader('Content-Type', 'audio/mpeg');
        response.setHeader('Content-Disposition', `attachment; filename="${info.videoDetails.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3"`);

        // Pipe the audio stream directly to the response.
        // This is highly efficient and avoids loading the whole file into memory.
        ytdl.downloadFromInfo(info, { format: format }).pipe(response);

    } catch (error) {
        console.error("[Server] Error processing YouTube request:", error);
        // Ensure a response is sent even on error
        if (!response.headersSent) {
            response.status(500).json({
                success: false,
                message: `Server function failed: ${error.message}`
            });
        }
    }
});

// === Start the Server ===
app.listen(PORT, () => {
    console.log(`SnugOS server is listening on port ${PORT}`);
});
