exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { url } = JSON.parse(event.body);
    const cobaltApi = 'https://api.cobalt.tools/api/json';

    const response = await fetch(cobaltApi, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        aFormat: "mp3",
        isAudioOnly: true
      })
    });
    
    const data = await response.json();

    if (!response.ok || data.status === 'error') {
      throw new Error(data.text || `Cobalt API returned status: ${data.status}`);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error("Netlify Function Error:", error);
    // --- THIS IS THE CHANGE: Return a more detailed error object ---
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'The serverless function encountered an error.', 
        message: error.message,
        stack: error.stack,
      })
    };
  }
};
