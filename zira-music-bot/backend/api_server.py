from flask import Flask, request, jsonify, send_file, Response, send_from_directory
from flask_cors import CORS
import io, csv
import yt_dlp
import requests
import json
import os
from flask_socketio import SocketIO, emit

# Define absolute paths for project root, queue file, and MP3 folder
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
QUEUE_FILE = os.path.join(PROJECT_ROOT, 'queue.json')
MP3_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'mp3')

app = Flask(__name__)
CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# In-memory queue and state
music_queue = []  # Initialize as empty, will be loaded from file
current_song_index = 0
is_paused = False

# --- Real-Time Chat & Reactions ---
chat_history = []  # Store recent chat messages (max 50)

def save_queue():
    # Ensure the directory exists
    os.makedirs(os.path.dirname(QUEUE_FILE), exist_ok=True)
    with open(QUEUE_FILE, 'w', encoding='utf-8') as f:
        json.dump(music_queue, f, ensure_ascii=False, indent=2)

def load_queue():
    global music_queue
    if os.path.exists(QUEUE_FILE):
        with open(QUEUE_FILE, 'r', encoding='utf-8') as f:
            music_queue.clear()
            music_queue.extend(json.load(f))

# Load queue on startup
load_queue()

def broadcast_queue_update():
    socketio.emit('queue_update', {
        "queue": music_queue,
        "current": current_song_index,
        "is_paused": is_paused
    })

@app.route('/api/queue', methods=['GET'])
def get_queue():
    return jsonify({"queue": music_queue, "current": current_song_index, "is_paused": is_paused})

@app.route('/api/queue', methods=['POST'])
def add_song():
    global current_song_index
    data = request.json
    print(f"[API] Adding song: {data}")
    # Prevent duplicates (fix KeyError)
    if not isinstance(data, dict):
        return jsonify({"success": False, "error": "Invalid data format"}), 400
    if any(isinstance(item, dict) and item.get('video_id') == data.get('video_id') for item in music_queue):
        print(f"[API] Song {data.get('video_id')} already in queue.")
        return jsonify({"success": False, "message": "Song already in queue", "queue": music_queue, "current": current_song_index})
    music_queue.append({
        "title": data.get("title", "Unknown"),
        "artist": data.get("artist", "Unknown"),
        "video_id": data.get("video_id", ""),
        "albumArt": data.get("albumArt", ""),
        "src": data.get("src", "")
    })
    current_song_index = len(music_queue) - 1  # Always set to the newly added song
    save_queue()
    broadcast_queue_update()  # Real-time update
    print(f"[API] Current song index set to {current_song_index}")
    return jsonify({"success": True, "queue": music_queue, "current": current_song_index})

@app.route('/api/next', methods=['POST'])
def next_song():
    global current_song_index
    if music_queue:
        current_song_index = (current_song_index + 1) % len(music_queue)
    broadcast_queue_update()  # Real-time update
    return jsonify({"current": current_song_index})

@app.route('/api/prev', methods=['POST'])
def prev_song():
    global current_song_index
    if music_queue:
        current_song_index = (current_song_index - 1 + len(music_queue)) % len(music_queue)
    broadcast_queue_update()  # Real-time update
    return jsonify({"current": current_song_index})

@app.route('/api/pause', methods=['POST'])
def pause():
    global is_paused
    is_paused = True
    broadcast_queue_update()  # Real-time update
    return jsonify({"is_paused": is_paused})

@app.route('/api/resume', methods=['POST'])
def resume():
    global is_paused
    is_paused = False
    broadcast_queue_update()  # Real-time update
    return jsonify({"is_paused": is_paused})

@app.route('/api/skip', methods=['POST'])
def skip():
    # This just advances to the next song. The frontend will handle playback.
    global current_song_index
    if music_queue:
        current_song_index = (current_song_index + 1) % len(music_queue)
    broadcast_queue_update()  # Real-time update
    return jsonify({"current": current_song_index})

@app.route('/api/playlist', methods=['GET'])
def get_playlist():
    return jsonify({"queue": music_queue})

@app.route('/api/end', methods=['POST'])
def end():
    # Clears the entire queue
    global music_queue, current_song_index, is_paused
    music_queue.clear()
    current_song_index = 0
    is_paused = False
    save_queue()
    broadcast_queue_update()  # Real-time update
    return jsonify({"queue": music_queue, "current": current_song_index, "is_paused": is_paused})

@app.route('/api/playlist/export', methods=['GET'])
def export_playlist():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Title', 'Artist', 'Source'])
    for song in music_queue:
        writer.writerow([song.get('title', ''), song.get('artist', ''), song.get('src', '')])
    output.seek(0)
    return send_file(io.BytesIO(output.getvalue().encode()), mimetype='text/csv', as_attachment=True, download_name='playlist.csv')

@app.route('/api/play/<int:index>', methods=['POST'])
def play_song_by_index(index):
    global current_song_index
    if 0 <= index < len(music_queue):
        current_song_index = index
        broadcast_queue_update()  # Real-time update
        return jsonify({"success": True, "current": current_song_index})
    return jsonify({"success": False, "error": "Invalid index"}), 400

@app.route('/static/mp3/<filename>')
def serve_mp3(filename):
    return send_from_directory(MP3_FOLDER, filename)

@app.route('/api/search')
def search_youtube():
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': 'No query provided'}), 400
    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'extract_flat': True,
        'default_search': 'ytsearch5',
        'forcejson': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(query, download=False) or {}
            entries = info.get('entries', []) if isinstance(info, dict) else []
            results = []
            for entry in entries:
                if not isinstance(entry, dict):
                    entry = dict()
                results.append({
                    'title': entry.get('title', ''),
                    'artist': entry.get('uploader', ''),
                    'video_id': entry.get('id', ''),
                    'thumbnail': entry.get('thumbnail', ''),
                })
            return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download_and_add', methods=['POST'])
def download_and_add():
    global current_song_index
    data = request.json
    if not isinstance(data, dict):
        return jsonify({'success': False, 'error': 'Invalid data format'}), 400
    video_id = data.get('video_id')
    title = data.get('title', 'Unknown')
    artist = data.get('artist', 'Unknown')
    albumArt = data.get('albumArt', '')
    requested_by = data.get('requested_by', 'WebApp')
    duration = data.get('duration', '')
    if not video_id:
        return jsonify({'success': False, 'error': 'No video_id provided'}), 400
    mp3_filename = f"{video_id}.mp3"
    mp3_path = os.path.join('static', 'mp3', mp3_filename)
    # Download if not already present
    if not os.path.exists(mp3_path):
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': mp3_path,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([f'https://www.youtube.com/watch?v={video_id}'])
        except Exception as e:
            return jsonify({'success': False, 'error': f'Failed to download: {e}'}), 500
    # Add to queue if not already present
    if any(isinstance(item, dict) and item.get('video_id') == video_id for item in music_queue):
        return jsonify({'success': False, 'message': 'Song already in queue', 'queue': music_queue, 'current': current_song_index})
    song = {
        'title': title,
        'artist': artist,
        'video_id': video_id,
        'albumArt': albumArt,
        'src': mp3_filename,
        'duration': duration,
        'requested_by': requested_by
    }
    music_queue.append(song)
    current_song_index = len(music_queue) - 1
    save_queue()
    broadcast_queue_update()  # Real-time update
    return jsonify({'success': True, 'queue': music_queue, 'current': current_song_index})

# --- SocketIO Events ---
@socketio.on('chat_message')
def handle_chat_message(data):
    # data: {"user": str, "message": str, "timestamp": str}
    chat_history.append(data)
    if len(chat_history) > 50:
        chat_history.pop(0)
    socketio.emit('chat_message', data)

@socketio.on('reaction')
def handle_reaction(data):
    # data: {"user": str, "reaction": str, "song_id": str, "timestamp": str}
    socketio.emit('reaction', data)

@socketio.on('connect')
def handle_connect():
    emit('queue_update', {
        "queue": music_queue,
        "current": current_song_index,
        "is_paused": is_paused
    })
    emit('chat_history', chat_history)

if __name__ == '__main__':
    # Use socketio.run to support Flask-SocketIO
    socketio.run(app, host='0.0.0.0', port=8080, debug=True) 