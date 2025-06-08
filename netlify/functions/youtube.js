exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { url } = JSON.parse(event.body);
    if (!url) {
        throw new Error('No URL provided.');
    }

    const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
    if (!videoIdMatch || !videoIdMatch[1]) {
        throw new Error('Could not extract a valid YouTube video ID from the URL.');
    }
    const videoId = videoIdMatch[1];
    
    const rapidApiUrl = `https://super-fast-youtube-to-mp3-and-mp4-converter.p.rapidapi.com/dl?id=${videoId}`;
    const rapidApiHost = 'super-fast-youtube-to-mp3-and-mp4-converter.p.rapidapi.com';
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

    // --- Start of Corrected Code: More detailed logging ---
    // Log the entire response from RapidAPI to the Netlify function logs
    console.log('Full response from RapidAPI:', JSON.stringify(data, null, 2));

    if (response.status !== 200 || data.status !== 'ok' || !data.link) {
      // Throw a more descriptive error message back to the browser
      throw new Error(`RapidAPI returned an error: ${data.msg || 'No download link found.'}`);
    }
    // --- End of Corrected Code ---

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true,
        url: data.link,
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
