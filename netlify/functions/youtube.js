// This function calls the RapidAPI service to get a YouTube download link.

exports.handler = async function(event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { url } = JSON.parse(event.body);
    if (!url) {
        throw new Error('No URL provided.');
    }

    // Extract the YouTube video ID from the URL
    const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
    if (!videoIdMatch || !videoIdMatch[1]) {
        throw new Error('Could not extract a valid YouTube video ID from the URL.');
    }
    const videoId = videoIdMatch[1];
    
    // Define the new RapidAPI endpoint and host you provided
    const rapidApiUrl = `https://super-fast-youtube-to-mp3-and-mp4-converter.p.rapidapi.com/dl?id=${videoId}`;
    const rapidApiHost = 'super-fast-youtube-to-mp3-and-mp4-converter.p.rapidapi.com';
    
    // Access the API key from the environment variables you set in Netlify
    const rapidApiKey = process.env.RAPIDAPI_KEY;

    if (!rapidApiKey) {
        throw new Error('RapidAPI key is not configured in environment variables.');
    }

    const response = await fetch(rapidApiUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': rapidApiHost
      }
    });

    const data = await response.json();

    // Check for a successful response, which may vary between APIs.
    // We'll assume a response with a "link" property is successful.
    if (!response.ok || !data.link) {
      throw new Error(data.msg || 'RapidAPI returned an error or an invalid response.');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true,
        url: data.link, // The direct download link for the MP3
        title: data.title 
      })
    };

  } catch (error) {
    console.error("Netlify Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        message: error.message 
      })
    };
  }
};
