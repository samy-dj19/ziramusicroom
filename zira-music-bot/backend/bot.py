import logging
import config  # Import the config file for BOT_TOKEN
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, CallbackContext, CallbackQueryHandler
import requests
import yt_dlp

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO
)

logger = logging.getLogger(__name__)

# In-memory data store (for simplicity). For a real bot, use a database.
music_queue = {}  # {chat_id: [song1, song2, ...]}
current_song = {} # {chat_id: "current_playing_song"}

API_URL = "https://zira-music-backend.onrender.com/api"

# --- Bot Command Handlers ---

async def start(update: Update, context: CallbackContext) -> None:
    """Sends a welcome message when the /start command is issued."""
    user = update.effective_user
    welcome_message = (
        f"Hello {user.first_name}!\n\n"
        "I am Zira, your friendly Music Bot for Telegram. "
        "I can play your favourite tunes quickly right inside a Mini App!\n\n"
        "Add me to your group and let's get the music going!"
    )
    await update.message.reply_html(welcome_message)

async def help_command(update: Update, context: CallbackContext) -> None:
    """Sends a help message with all available commands."""
    help_text = (
        "<b>Zira Music Bot Help</b>\n\n"
        "Here are the commands you can use:\n"
        "/start - Welcome message\n"
        "/play `<song name>` - Adds a song to the queue and opens the music player.\n"
        "/pause - Pauses the current song.\n"
        "/resume - Resumes the paused song.\n"
        "/skip - Skips the current song.\n"
        "/loop - Toggles looping for the current song.\n"
        "/playlist - Opens the player with your favorite playlist.\n"
        "/fav - Adds the current song to your favorites.\n"
        "/end - Stops playback and clears the queue."
    )
    await update.message.reply_html(help_text)

async def play(update: Update, context: CallbackContext) -> None:
    if not context.args:
        await update.message.reply_text("Usage: /play <song name>")
        return

    song_name = " ".join(context.args)
    searching_msg = await update.message.reply_text("Searching...")

    ydl_opts = {
        'format': 'bestaudio/best',
        'noplaylist': True,
        'quiet': True,
        'default_search': 'ytsearch1',
        'extract_flat': False,
        'forceurl': True,
        'forcejson': True,
        'skip_download': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(song_name, download=False)
            if 'entries' in info:
                info = info['entries'][0]
            audio_url = info.get('url', '')
            if not audio_url or not audio_url.startswith('http'):
                raise Exception('No valid audio URL found.')
            title = info.get('title', song_name)
            artist = info.get('uploader', 'Unknown Artist')
            thumbnail = info.get('thumbnail', '')
            duration = info.get('duration', 0)
            duration_str = f"{duration//60}:{duration%60:02d}"
    except Exception as e:
        # Fallback to demo song
        audio_url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        title = song_name + " (Demo)"
        artist = "Demo Artist"
        thumbnail = "https://i.imgur.com/8Km9tLL.jpg"
        duration_str = "3:54"
        await searching_msg.edit_text(f"❌ Could not find a playable song for '{song_name}'. Using demo song.\nError: {e}")

    song = {
        "title": title,
        "artist": artist,
        "src": audio_url,
        "albumArt": thumbnail,
        "duration": duration_str,
        "requested_by": update.effective_user.first_name
    }

    requests.post(f"{API_URL}/queue", json=song)
    await searching_msg.delete()

    keyboard = [
        [InlineKeyboardButton("▶️ JOIN ROOM", url="https://samy-dj19.github.io/ziramusicroom/")],
        [InlineKeyboardButton("❌ CLOSE ROOM", callback_data="close_room")],
        [
            InlineKeyboardButton("⏸️", callback_data="pause"),
            InlineKeyboardButton("▶️", callback_data="play"),
            InlineKeyboardButton("⏭️", callback_data="skip"),
            InlineKeyboardButton("🔁", callback_data="loop"),
            InlineKeyboardButton("👁️", callback_data="preview"),
        ]
    ]
    caption = (
        "- Added to Queue\n\n"
        f"‣ Title: {song['title']}\n"
        f"‣ Duration: {song['duration']}\n"
        f"‣ Requested By: {song['requested_by']}"
    )
    await update.message.reply_photo(
        photo=song["albumArt"],
        caption=caption,
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def unknown_command(update: Update, context: CallbackContext) -> None:
    """Handles any command that is not recognized."""
    await update.message.reply_text("Sorry, I didn't understand that command. Try /help to see the list of available commands.")

async def pause(update: Update, context: CallbackContext) -> None:
    try:
        response = requests.post(f"{API_URL}/pause")
        if response.status_code == 200:
            await update.message.reply_text("⏸️ Playback paused.")
        else:
            await update.message.reply_text("❌ Failed to pause playback.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {e}")

async def resume(update: Update, context: CallbackContext) -> None:
    try:
        response = requests.post(f"{API_URL}/resume")
        if response.status_code == 200:
            await update.message.reply_text("▶️ Playback resumed.")
        else:
            await update.message.reply_text("❌ Failed to resume playback.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {e}")

async def skip(update: Update, context: CallbackContext) -> None:
    try:
        response = requests.post(f"{API_URL}/skip")
        if response.status_code == 200:
            await update.message.reply_text("⏭️ Skipped to the next song.")
        else:
            await update.message.reply_text("❌ Failed to skip song.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {e}")

async def playlist(update: Update, context: CallbackContext) -> None:
    try:
        response = requests.get(f"{API_URL}/playlist")
        if response.status_code == 200:
            data = response.json()
            queue = data.get("queue", [])
            if not queue:
                await update.message.reply_text("The playlist is currently empty.")
            else:
                playlist_text = '\n'.join([f"{i+1}. {song['title']} - {song['artist']}" for i, song in enumerate(queue)])
                await update.message.reply_text(f"<b>Current Playlist:</b>\n{playlist_text}", parse_mode='HTML')
        else:
            await update.message.reply_text("❌ Failed to fetch playlist.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {e}")

async def fav(update: Update, context: CallbackContext) -> None:
    try:
        response = requests.get(f"{API_URL}/queue")
        data = response.json()
        queue = data.get("queue", [])
        current = data.get("current", 0)
        if queue:
            song = queue[current]
            fav_response = requests.post(f"{API_URL}/fav", json={"song": song})
            if fav_response.status_code == 200:
                await update.message.reply_text(f"❤️ Added to favorites: {song['title']} - {song['artist']}")
            else:
                await update.message.reply_text("❌ Failed to add to favorites.")
        else:
            await update.message.reply_text("No song is currently playing.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {e}")

async def end(update: Update, context: CallbackContext) -> None:
    try:
        response = requests.post(f"{API_URL}/end")
        if response.status_code == 200:
            await update.message.reply_text("🛑 Playback ended and queue cleared.")
        else:
            await update.message.reply_text("❌ Failed to end playback.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {e}")

async def button(update: Update, context: CallbackContext):
    query = update.callback_query
    await query.answer()
    if query.data == "close_room":
        await query.delete_message()
    elif query.data in ["pause", "play", "skip", "loop", "preview"]:
        # Call backend endpoints
        resp = requests.post(f"{API_URL}/{query.data}")
        await query.answer(f"{query.data.capitalize()} command sent!")

# --- Main Bot Execution ---

def main():
    """Start the bot."""
    if not config.BOT_TOKEN:
        raise ValueError("No BOT_TOKEN found in environment variables!")
    app = ApplicationBuilder().token(config.BOT_TOKEN).build()

    # on different commands - answer in Telegram
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("play", play))
    app.add_handler(CommandHandler("pause", pause))
    app.add_handler(CommandHandler("resume", resume))
    app.add_handler(CommandHandler("skip", skip))
    app.add_handler(CommandHandler("playlist", playlist))
    app.add_handler(CommandHandler("fav", fav))
    app.add_handler(CommandHandler("end", end))

    # Handler for unknown commands
    app.add_handler(MessageHandler(filters.COMMAND, unknown_command))

    # Handler for button queries
    app.add_handler(CallbackQueryHandler(button))

    # Run the bot until the user presses Ctrl-C
    app.run_polling()

if __name__ == '__main__':
    main()