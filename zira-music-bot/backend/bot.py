import logging
import config  # Import the config file for BOT_TOKEN, ADMIN_GROUP_ID, ADMINS
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, InputMediaPhoto
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, CallbackContext, CallbackQueryHandler, ChatMemberHandler
import requests
import yt_dlp
import os
import sqlite3
from datetime import datetime

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO
)

logger = logging.getLogger(__name__)

# In-memory data store (for simplicity). For a real bot, use a database.
music_queue = {}  # {chat_id: [song1, song2, ...]}
current_song = {} # {chat_id: "current_playing_song"}

# --- Database Setup ---
DB_PATH = os.path.join(os.path.dirname(__file__), 'botdata.sqlite3')
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    phone TEXT,
    song_count INTEGER DEFAULT 0
)''')
c.execute('''CREATE TABLE IF NOT EXISTS groups (
    group_id INTEGER PRIMARY KEY,
    title TEXT,
    member_count INTEGER,
    last_joined TIMESTAMP
)''')
conn.commit()

# --- Helper Functions ---
def is_admin(user_id):
    return user_id == config.OWNER_ID or user_id in getattr(config, 'ADMINS', [])

def log_user(user):
    c.execute('SELECT * FROM users WHERE user_id=?', (user.id,))
    if c.fetchone():
        c.execute('''UPDATE users SET first_name=?, last_name=?, username=? WHERE user_id=?''',
                  (user.first_name, user.last_name, user.username, user.id))
    else:
        c.execute('''INSERT INTO users (user_id, first_name, last_name, username, song_count) VALUES (?, ?, ?, ?, 0)''',
                  (user.id, user.first_name, user.last_name, user.username))
    conn.commit()

def increment_song_count(user):
    c.execute('UPDATE users SET song_count = song_count + 1 WHERE user_id=?', (user.id,))
    conn.commit()

def log_group(chat, member_count=None):
    c.execute('SELECT * FROM groups WHERE group_id=?', (chat.id,))
    if c.fetchone():
        c.execute('''UPDATE groups SET title=?, member_count=?, last_joined=? WHERE group_id=?''',
                  (chat.title, member_count or 0, datetime.utcnow(), chat.id))
    else:
        c.execute('''INSERT INTO groups (group_id, title, member_count, last_joined) VALUES (?, ?, ?, ?)''',
                  (chat.id, chat.title, member_count or 0, datetime.utcnow()))
    conn.commit()

def get_all_users():
    c.execute('SELECT user_id, first_name, last_name, username, song_count FROM users')
    return c.fetchall()

def get_all_groups():
    c.execute('SELECT group_id, title, member_count, last_joined FROM groups')
    return c.fetchall()

def send_admin_report(app):
    users = get_all_users()
    groups = get_all_groups()
    msg = f"<b>User & Group Report</b>\n\n<b>Users ({len(users)}):</b>\n"
    for u in users:
        name = f"{u[1] or ''} {u[2] or ''}".strip()
        uname = f"(@{u[3]})" if u[3] else ''
        msg += f"- {name} {uname} (ID: <code>{u[0]}</code>) | Songs: {u[4]}\n"
    msg += f"\n<b>Groups ({len(groups)}):</b>\n"
    for g in groups:
        msg += f"- {g[1]} (ID: <code>{g[0]}</code>) | Members: {g[2]} | Last joined: {g[3]}\n"
    if config.ADMIN_GROUP_ID:
        app.bot.send_message(chat_id=config.ADMIN_GROUP_ID, text=msg, parse_mode='HTML')

# --- Configuration ---
# Define the correct API URL and paths relative to the project root
API_URL = "http://localhost:8080/api"
# IMPORTANT: This should be your ngrok/production URL for the Mini App to work on mobile
# For local testing, you can use a file path, but it may not work on all Telegram clients.
# Replace this with your actual URL when deploying.
MINI_APP_URL = "https://samy-dj19.github.io/ziramusicroom/"
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MP3_FOLDER = os.path.join(PROJECT_ROOT, 'static', 'mp3')

# Ensure the MP3 folder exists
os.makedirs(MP3_FOLDER, exist_ok=True)

# --- Bot Command Handlers ---

async def start(update: Update, context: CallbackContext) -> None:
    """Sends a welcome message when the /start command is issued."""
    user = update.effective_user
    log_user(user)
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
        "/skip - Skips the current song.\n"
        "/playlist - Shows the current song queue.\n"
        "/end - Stops playback and clears the queue.\n"
        "/users - List users (admin only)"
    )
    await update.message.reply_html(help_text)

# --- Health Check Command ---
async def health(update: Update, context: CallbackContext) -> None:
    await update.message.reply_text("Bot is running and healthy!")

# --- Statistics Command ---
async def stats(update: Update, context: CallbackContext) -> None:
    users = get_all_users()
    c.execute('SELECT title, COUNT(*) as cnt FROM users, songs WHERE users.user_id = songs.user_id GROUP BY title ORDER BY cnt DESC LIMIT 5')
    top_songs = c.fetchall() if c.description else []
    msg = f"<b>Bot Stats</b>\n\n<b>Total Users:</b> {len(users)}\n"
    if top_songs:
        msg += "<b>Top Songs:</b>\n"
        for i, (title, cnt) in enumerate(top_songs):
            msg += f"{i+1}. {title} ({cnt} plays)\n"
    else:
        msg += "No song stats available.\n"
    await update.message.reply_html(msg)

# --- Enhanced /play Command ---
async def play(update: Update, context: CallbackContext) -> None:
    if not context.args:
        if hasattr(update, 'message') and update.message:
            await update.message.reply_text("Usage: /play <song name or artist - song>")
        return
    song_query = " ".join(context.args)
    if hasattr(update, 'message') and update.message:
        searching_msg = await update.message.reply_text("⏳ Searching and downloading...")
    elif hasattr(update, 'effective_chat') and update.effective_chat:
        searching_msg = await update.effective_chat.send_message("⏳ Searching and downloading...")
    else:
        searching_msg = None
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(MP3_FOLDER, '%(id)s.%(ext)s'),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True,
        'default_search': 'ytsearch',
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_list = ydl.extract_info(f"ytsearch5:{song_query}", download=False)['entries']
            if not info_list:
                if searching_msg:
                    await searching_msg.edit_text(f"❌ No results for '{song_query}'.")
                return
            # If multiple, show options as inline buttons
            if len(info_list) > 1:
                keyboard = [
                    [InlineKeyboardButton(f"{i+1}. {info['title']} - {info.get('uploader', 'Unknown')}", callback_data=f"play_{info['id']}")]
                    for i, info in enumerate(info_list)
                ]
                if searching_msg:
                    await searching_msg.edit_text(
                        "Multiple results found. Select one:",
                        reply_markup=InlineKeyboardMarkup(keyboard)
                    )
                context.user_data['multi_results'] = {info['id']: info for info in info_list}
                return
            info = info_list[0]
            # Download the selected song
            ydl.download([info['webpage_url']])
            video_id = info.get('id')
            filename = f"{video_id}.mp3"
            file_path = os.path.join(MP3_FOLDER, filename)
            if not os.path.exists(file_path):
                if searching_msg:
                    await searching_msg.edit_text(f"❌ Download failed. Check ffmpeg is installed.")
                return
            title = info.get('title', "Unknown Title")
            artist = info.get('uploader', 'Unknown Artist')
            thumbnail = info.get('thumbnail') or 'https://i.ibb.co/G5rGWWd/default-album-art.png'
            duration = info.get('duration', 0)
            duration_str = f"{int(duration // 60)}:{int(duration % 60):02d}" if duration else "N/A"
            src_filename = filename
    except Exception as e:
        if searching_msg:
            await searching_msg.edit_text(f"❌ Error: {e}")
        logger.error(f"Error in /play: {e}", exc_info=True)
        return
    song_data = {
        "title": title,
        "artist": artist,
        "video_id": video_id,
        "src": src_filename,
        "albumArt": thumbnail,
        "duration": duration_str,
        "requested_by": update.effective_user.first_name if hasattr(update, 'effective_user') and update.effective_user and hasattr(update.effective_user, 'first_name') else "User"
    }
    try:
        response = requests.post(f"{API_URL}/queue", json=song_data)
        response.raise_for_status()
        backend_response = response.json()
        keyboard = [
            [InlineKeyboardButton("▶️ LAUNCH ROOM", web_app=WebAppInfo(url=MINI_APP_URL))],
            [
                InlineKeyboardButton("⏮️", callback_data="prev"),
                InlineKeyboardButton("⏸️", callback_data="pause"),
                InlineKeyboardButton("▶️", callback_data="play"),
                InlineKeyboardButton("⏭️", callback_data="skip")
            ],
            [InlineKeyboardButton("❌ CLOSE ROOM", callback_data="close_room")]
        ]
        caption = (
            ("- Added to Queue\n\n" if backend_response.get("success") else "- Already in Queue\n\n") +
            f"‣ Title: {song_data['title']}\n"
            f"‣ Duration: {song_data['duration']}\n"
            f"‣ Requested By: {song_data['requested_by']}"
        )
        if hasattr(update, 'message') and update.message:
            await update.message.reply_photo(
                photo=song_data["albumArt"],
                caption=caption,
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
    except requests.exceptions.RequestException as e:
        if searching_msg:
            await searching_msg.edit_text(f"❌ Backend error: {e}")
        return
    send_admin_report(context.application)

async def unknown_command(update: Update, context: CallbackContext) -> None:
    """Handles any command that is not recognized."""
    await update.message.reply_text("Sorry, I didn't understand that command. Try /help to see the list of available commands.")

async def pause(update: Update, context: CallbackContext) -> None:
    # Note: These commands are now less useful as controls are in the UI
    try:
        requests.post(f"{API_URL}/pause")
        await update.message.reply_text("⏸️ Pause command sent to player.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error communicating with player: {e}")

async def resume(update: Update, context: CallbackContext) -> None:
    try:
        requests.post(f"{API_URL}/resume")
        await update.message.reply_text("▶️ Resume command sent to player.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error communicating with player: {e}")

async def skip(update: Update, context: CallbackContext) -> None:
    try:
        requests.post(f"{API_URL}/skip")
        await update.message.reply_text("⏭️ Skip command sent to player.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error communicating with player: {e}")

async def playlist(update: Update, context: CallbackContext) -> None:
    try:
        response = requests.get(f"{API_URL}/playlist")
        response.raise_for_status()
        data = response.json()
        queue = data.get("queue", [])
        if not queue:
            await update.message.reply_text("The playlist is currently empty.")
        else:
            playlist_text = '\n'.join([f"*{i+1}.* {song.get('title', 'N/A')} - _{song.get('artist', 'N/A')}_" for i, song in enumerate(queue)])
            await update.message.reply_text(f"*Current Playlist:*\n{playlist_text}", parse_mode='Markdown')
    except requests.exceptions.RequestException as e:
        await update.message.reply_text(f"❌ Failed to fetch playlist: {e}")

async def end(update: Update, context: CallbackContext) -> None:
    try:
        requests.post(f"{API_URL}/end")
        await update.message.reply_text("🛑 End command sent. Player queue cleared.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error communicating with player: {e}")

async def users_command(update: Update, context: CallbackContext) -> None:
    user = update.effective_user
    if not is_admin(user.id):
        await update.message.reply_text("You are not authorized to use this command.")
        return
    users = get_all_users()
    msg = f"<b>Total Users: {len(users)}</b>\n\n"
    for u in users:
        name = f"{u[1] or ''} {u[2] or ''}".strip()
        uname = f"(@{u[3]})" if u[3] else ''
        msg += f"- {name} {uname} (ID: <code>{u[0]}</code>) | Songs: {u[4]}\n"
    await update.message.reply_html(msg)

async def group_join(update: Update, context: CallbackContext) -> None:
    chat = update.effective_chat
    if chat.type in ['group', 'supergroup']:
        member_count = await context.bot.get_chat_members_count(chat.id)
        log_group(chat, member_count)
        # Optionally send report to admin group
        send_admin_report(context.application)

# Update button handler to handle play_<video_id> callback
async def button(update: Update, context: CallbackContext):
    query = update.callback_query
    await query.answer()
    if query.data == "close_room":
        await query.delete_message()
    elif query.data == "pause":
        requests.post(f"{API_URL}/pause")
        await query.answer("Paused!")
    elif query.data == "play":
        requests.post(f"{API_URL}/resume")
        await query.answer("Resumed!")
    elif query.data == "skip":
        requests.post(f"{API_URL}/next")
        await query.answer("Skipped!")
    elif query.data == "prev":
        requests.post(f"{API_URL}/prev")
        await query.answer("Previous!")
    elif query.data.startswith("play_"):
        video_id = query.data.split("_", 1)[1]
        info = context.user_data.get('multi_results', {}).get(video_id)
        if not info:
            await query.edit_message_text("Song info not found. Please try again.")
            return
        # Download and play/add the selected song
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(MP3_FOLDER, '%(id)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
        }
        try:
            import yt_dlp
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([info['webpage_url']])
            filename = f"{video_id}.mp3"
            file_path = os.path.join(MP3_FOLDER, filename)
            if not os.path.exists(file_path):
                await query.edit_message_text(f"❌ Download failed. Check ffmpeg is installed.")
                return
            title = info.get('title', "Unknown Title")
            artist = info.get('uploader', 'Unknown Artist')
            thumbnail = info.get('thumbnail') or 'https://i.ibb.co/G5rGWWd/default-album-art.png'
            duration = info.get('duration', 0)
            duration_str = f"{int(duration // 60)}:{int(duration % 60):02d}" if duration else "N/A"
            src_filename = filename
            song_data = {
                "title": title,
                "artist": artist,
                "video_id": video_id,
                "src": src_filename,
                "albumArt": thumbnail,
                "duration": duration_str,
                "requested_by": query.from_user.first_name if hasattr(query, 'from_user') and query.from_user and hasattr(query.from_user, 'first_name') else "User"
            }
            response = requests.post(f"{API_URL}/queue", json=song_data)
            response.raise_for_status()
            backend_response = response.json()
            keyboard = [
                [InlineKeyboardButton("▶️ LAUNCH ROOM", web_app=WebAppInfo(url=MINI_APP_URL))],
                [
                    InlineKeyboardButton("⏮️", callback_data="prev"),
                    InlineKeyboardButton("⏸️", callback_data="pause"),
                    InlineKeyboardButton("▶️", callback_data="play"),
                    InlineKeyboardButton("⏭️", callback_data="skip")
                ],
                [InlineKeyboardButton("❌ CLOSE ROOM", callback_data="close_room")]
            ]
            caption = (
                ("- Added to Queue\n\n" if backend_response.get("success") else "- Already in Queue\n\n") +
                f"‣ Title: {song_data['title']}\n"
                f"‣ Duration: {song_data['duration']}\n"
                f"‣ Requested By: {song_data['requested_by']}"
            )
            await query.edit_message_media(
                media=InputMediaPhoto(media=song_data["albumArt"], caption=caption),
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
        except Exception as e:
            await query.edit_message_text(f"❌ Error: {e}")
        return

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
    app.add_handler(CommandHandler("skip", skip))
    app.add_handler(CommandHandler("playlist", playlist))
    app.add_handler(CommandHandler("end", end))
    app.add_handler(CommandHandler("users", users_command))
    app.add_handler(CommandHandler("health", health))
    app.add_handler(CommandHandler("stats", stats))
    app.add_handler(ChatMemberHandler(group_join, ChatMemberHandler.CHAT_MEMBER))

    # Handler for unknown commands
    app.add_handler(MessageHandler(filters.COMMAND, unknown_command))

    # Handler for button queries
    app.add_handler(CallbackQueryHandler(button))

    # Run the bot until the user presses Ctrl-C
    app.run_polling()

if __name__ == '__main__':
    main()