const axios = require('axios'); //

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') { //
        return { statusCode: 405, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) }; //
    }

    try {
        const { url } = JSON.parse(event.body); //
        if (!url) { //
            throw new Error('No URL provided.'); //
        }

        const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/); //
        if (!videoIdMatch || !videoIdMatch[1]) { //
            throw new Error('Could not extract a valid YouTube video ID from the URL.'); //
        }
        const videoId = videoIdMatch[1]; //
        
        // === STEP 1: Get the download link from RapidAPI (Your existing logic) ===
        const getLinkOptions = { //
            method: 'GET',
            url: 'https://super-fast-youtube-to-mp3-and-mp4-converter.p.rapidapi.com/dl', //
            params: { id: videoId }, //
            headers: {
                'x-rapidapi-host': 'super-fast-youtube-to-mp3-and-mp4-converter.p.rapidapi.com', //
                'x-rapidapi-key': process.env.RAPIDAPI_KEY //
            }
        };

        const linkResponse = await axios.request(getLinkOptions); //
        const data = linkResponse.data; //

        if (linkResponse.status !== 200 || !data.link) { //
            throw new Error(data.msg || 'RapidAPI did not return a valid download link.'); //
        }

        // === STEP 2: NEW - Download the audio file directly on the server ===
        const downloadResponse = await axios({
            method: 'GET',
            url: data.link, // Use the link from the previous step
            responseType: 'arraybuffer' // This is crucial for handling binary file data
        });

        // === STEP 3: NEW - Convert audio to Base64 and return it in the response ===
        const audioBuffer = Buffer.from(downloadResponse.data, 'binary');

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                title: data.title,
                base64: audioBuffer.toString('base64') // Send audio data instead of a link
            })
        };

    } catch (error) {
        console.error("Netlify Function Error:", error); //
        const errorMessage = error.response?.data?.msg || error.message || 'An unknown server error occurred.'; //
        return { //
            statusCode: 500,
            body: JSON.stringify({ 
                success: false,
                message: `Server function failed: ${errorMessage}`
            })
        };
    }
};
