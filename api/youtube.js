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
        
        // === STEP 1: Get the download link from the NEW RapidAPI service ===
        const getLinkOptions = {
            method: 'GET',
            // NEW API URL
            url: 'https://youtube-mp36.p.rapidapi.com/dl',
            params: { id: videoId },
            headers: {
                // NEW HOST
                'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com',
                // This will use the new key you set in Vercel's environment variables
                'x-rapidapi-key': process.env.RAPIDAPI_KEY 
            }
        };

        const linkResponse = await axios.request(getLinkOptions);
        const data = linkResponse.data;

        // Check for a successful response from the new API
        if (linkResponse.status !== 200 || !data.link) { //
            throw new Error(data.msg || 'The new RapidAPI service did not return a valid download link.'); //
        }

        // === STEP 2: Download the audio file directly on the server (this logic stays the same) ===
        const downloadResponse = await axios({
            method: 'GET',
            url: data.link,
            responseType: 'arraybuffer'
        });

        // === STEP 3: Convert audio to Base64 and return it (this logic stays the same) ===
        const audioBuffer = Buffer.from(downloadResponse.data, 'binary');

        return {
            statusCode: 200, //
            headers: { 'Content-Type': 'application/json' }, //
            body: JSON.stringify({ //
                success: true, //
                title: data.title, //
                base64: audioBuffer.toString('base64')
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
