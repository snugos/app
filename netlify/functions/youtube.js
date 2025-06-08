const ytdl = require('ytdl-core');

exports.handler = async function(event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { url } = JSON.parse(event.body);
    if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL provided.');
    }

    const info = await ytdl.getInfo(url);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    
    // Prioritize audio with the mp4 container (m4a)
    const format = audioFormats.find(f => f.mimeType.includes('mp4')) || audioFormats[0];

    if (!format) {
      throw new Error('No suitable audio-only format found.');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true,
        url: format.url,
        title: info.videoDetails.title 
      })
    };

  } catch (error) {
    console.error("Netlify Function Error:", error);
    let message = error.message;
    if (error.statusCode === 410) {
        message = 'This video is unavailable for download (Status 410: Gone). This often happens with music videos.';
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        message: message 
      })
    };
  }
};
