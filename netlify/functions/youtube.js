const ytdl = require('ytdl-core');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { url } = JSON.parse(event.body);
    if (!url || !ytdl.validateURL(url)) {
        throw new Error('Invalid or missing YouTube URL.');
    }

    const info = await ytdl.getInfo(url);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    
    if (!audioFormats.length) {
        throw new Error('No audio-only formats found for this video. It may be protected.');
    }
    
    const format = audioFormats.find(f => f.mimeType.includes('mp4')) || audioFormats[0];

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
    // Provide a more user-friendly message for common ytdl-core errors
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
