const axios = require('axios');

// Vercel expects a default export of a function with (request, response) parameters
export default async function handler(request, response) {
    // Check for the correct HTTP method
    if (request.method !== 'POST') {
        return response.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        // On Vercel, the request body is often already parsed if the content-type is correct
        const { url } = request.body;
        if (!url) {
            throw new Error('No URL provided.');
        }

        const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/);
        if (!videoIdMatch || !videoIdMatch[1]) {
            throw new Error('Could not extract a valid YouTube video ID from the URL.');
        }
        const videoId = videoIdMatch[1];
        
        // --- Step 1: Get the download link from RapidAPI (This part is the same) ---
        const getLinkOptions = {
            method: 'GET',
            url: 'https://youtube-mp36.p.rapidapi.com/dl',
            params: { id: videoId },
            headers: {
                'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com',
                'x-rapidapi-key': process.env.RAPIDAPI_KEY 
            }
        };

        const linkResponse = await axios.request(getLinkOptions);
        const data = linkResponse.data;

        if (linkResponse.status !== 200 || !data.link) {
            throw new Error(data.msg || 'The RapidAPI service did not return a valid download link.');
        }

        // --- Step 2: Download the audio on the server (This part is the same) ---
        const downloadResponse = await axios({
            method: 'GET',
            url: data.link,
            responseType: 'arraybuffer'
        });

        // --- Step 3: Convert to Base64 and send back (This part is the same) ---
        const audioBuffer = Buffer.from(downloadResponse.data, 'binary');

        // --- FINAL STEP: Return a successful response using Vercel's 'response' object ---
        return response.status(200).json({
            success: true,
            title: data.title,
            base64: audioBuffer.toString('base64')
        });

    } catch (error) {
        console.error("Vercel Function Error:", error);
        const errorMessage = error.response?.data?.msg || error.message || 'An unknown server error occurred.';
        
        // --- Return an error response using Vercel's 'response' object ---
        return response.status(500).json({ 
            success: false,
            message: `Server function failed: ${errorMessage}`
        });
    }
}
