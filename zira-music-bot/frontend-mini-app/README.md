# Zira Music Room Mini App

A beautiful, immersive, and modern music experience for Telegram, with real-time search, queue, and playback.

## Features
- **YouTube Streaming:** Stream audio from YouTube videos.
- **Flexible Song Search:** Search by song, artist, or album. Multiple results shown with album art and details.
- **Real-Time Queue:** Add, remove, and reorder songs in a shared queue.
- **Modern UI:** Responsive, beautiful interface with animated backgrounds.
- **Audio Player:** Play, pause, skip, and control volume for the current song.
- **Statistics:** View most played songs, total users, and total plays in a polished stats modal.
- **Error Handling:** User-friendly toast notifications for errors and important actions.
- **Mini App Integration:** Seamless experience when launched from Telegram, with a "Back to Telegram" button.
- **Production Readiness:** Health checks and environment variable support for deployment.
- **AI-Powered Music Playback:** Type a song name and let the AI play it for you instantly!

## Usage
- Open the app in Telegram or your browser.
- Use the search bar to find songs by title, artist, or album.
- Click "Add" to queue a song.
- Use the player controls to play, pause, skip, or loop.
- Click "Show Stats" to view app statistics.
- **NEW:** Type a song name in the "Ask AI to Play" box and click the button. The AI will find and play the song for you!

## Deployment
- Ensure backend endpoints `/api/search`, `/api/stats`, and `/ai_play` are available.
- Set environment variables as needed for production.
- For best experience, deploy with HTTPS and proper CORS settings.

## Development
- Edit `script.js` for logic and UI.
- Edit `style.css` for custom styles.
- Edit `index.html` for layout and structure.
- Edit `ai-service/main.py` to improve or expand AI features.

---
For more details, see the main project README. 