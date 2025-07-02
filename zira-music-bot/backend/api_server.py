from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
import io, csv
import yt_dlp
import requests
import json
import os

app = Flask(__name__)
CORS(app, origins="*")

# In-memory queue and state for demo
music_queue = [
    {"title": "Mann Mera", "artist": "Gajendra Verma", "src": ""},
    {"title": "Shape of You", "artist": "Ed Sheeran", "src": ""},
    {"title": "Blinding Lights", "artist": "The Weeknd", "src": ""}
]
current_song_index = 0
is_paused = False
favorites = []
history = []

user_histories = {}

QUEUE_FILE = 'queue.json'

def get_user_id():
    return str(request.args.get('user_id') or request.json.get('user_id') or 'global')

def save_queue():
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

@app.route('/api/queue', methods=['GET'])
def get_queue():
    return jsonify({"queue": music_queue, "current": current_song_index, "is_paused": is_paused, "favorites": favorites})

@app.route('/api/queue', methods=['POST'])
def add_song():
    global current_song_index
    data = request.json
    print(f"[API] Adding song: {data}")
    music_queue.append({
        "title": data.get("title", "Unknown"),
        "artist": data.get("artist", "Unknown"),
        "video_id": data.get("video_id", ""),
        "albumArt": data.get("albumArt", ""),
        "src": data.get("src", "")
    })
    current_song_index = len(music_queue) - 1  # Set to the newly added song
    save_queue()
    print(f"[API] Current song index set to {current_song_index}")
    return jsonify({"success": True, "queue": music_queue, "current": current_song_index})

@app.route('/api/next', methods=['POST'])
def next_song():
    global current_song_index
    if music_queue:
        current_song_index = (current_song_index + 1) % len(music_queue)
    return jsonify({"current": current_song_index})

@app.route('/api/prev', methods=['POST'])
def prev_song():
    global current_song_index
    if music_queue:
        current_song_index = (current_song_index - 1 + len(music_queue)) % len(music_queue)
    return jsonify({"current": current_song_index})

@app.route('/api/pause', methods=['POST'])
def pause():
    global is_paused
    is_paused = True
    return jsonify({"is_paused": is_paused})

@app.route('/api/resume', methods=['POST'])
def resume():
    global is_paused
    is_paused = False
    return jsonify({"is_paused": is_paused})

@app.route('/api/skip', methods=['POST'])
def skip():
    global current_song_index
    user_id = get_user_id()
    if music_queue:
        song = music_queue[current_song_index]
        history.append(song)
        user_histories.setdefault(user_id, []).append(song)
        current_song_index = (current_song_index + 1) % len(music_queue)
        save_queue()
    return jsonify({"current": current_song_index})

@app.route('/api/playlist', methods=['GET'])
def get_playlist():
    return jsonify({"queue": music_queue})

@app.route('/api/fav', methods=['POST'])
def add_fav():
    data = request.json
    song = data.get("song")
    if song and song not in favorites:
        favorites.append(song)
    return jsonify({"favorites": favorites})

@app.route('/api/end', methods=['POST'])
def end():
    global music_queue, current_song_index, is_paused
    user_id = get_user_id()
    while music_queue:
        song = music_queue.pop(0)
        history.append(song)
        user_histories.setdefault(user_id, []).append(song)
    current_song_index = 0
    is_paused = False
    save_queue()
    return jsonify({"queue": music_queue, "current": current_song_index, "is_paused": is_paused})

@app.route('/api/history', methods=['GET'])
def get_history():
    return jsonify({"history": history})

@app.route('/api/history/user', methods=['GET'])
def get_user_history():
    user_id = get_user_id()
    return jsonify({"history": user_histories.get(user_id, [])})

@app.route('/api/history/clear', methods=['POST'])
def clear_history():
    user_id = get_user_id()
    if user_id in user_histories:
        user_histories[user_id] = []
    if user_id == 'global':
        history.clear()
    return jsonify({"success": True})

@app.route('/api/playlist/export', methods=['GET'])
def export_playlist():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Title', 'Artist', 'Source'])
    for song in music_queue:
        writer.writerow([song['title'], song['artist'], song['src']])
    output.seek(0)
    return send_file(io.BytesIO(output.getvalue().encode()), mimetype='text/csv', as_attachment=True, download_name='playlist.csv')

@app.route('/api/play/<int:index>', methods=['POST'])
def play_song_by_index(index):
    global current_song_index
    if 0 <= index < len(music_queue):
        current_song_index = index
        return jsonify({"success": True, "current": current_song_index})
    return jsonify({"success": False, "error": "Invalid index"}), 400

@app.route('/api/stream/<video_id>')
def stream_audio(video_id):
    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio/best',
        'quiet': True,
        'noplaylist': True,
        'default_search': 'ytsearch1',
        'extract_flat': False,
        'forceurl': True,
        'forcejson': True,
        'skip_download': True,
        'nocheckcertificate': True,
        'source_address': '0.0.0.0',
    }
    url = f'https://www.youtube.com/watch?v={video_id}'
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            stream_url = info.get('url', None)
            if not stream_url:
                print(f"[ERROR] No stream URL found for video_id {video_id}")
                return jsonify({'error': 'No stream URL found'}), 404
            def generate():
                with requests.get(stream_url, stream=True) as r:
                    r.raise_for_status()
                    for chunk in r.iter_content(chunk_size=4096):
                        if chunk:
                            yield chunk
            mimetype = 'audio/mp4' if stream_url.endswith('.m4a') else 'audio/mpeg'
            print(f"[API] Streaming {stream_url} as {mimetype}")
            return Response(generate(), mimetype=mimetype)
    except Exception as e:
        print(f"[ERROR] Streaming failed for video_id {video_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stream/test')
def stream_test():
    def generate():
        with requests.get('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', stream=True) as r:
            r.raise_for_status()
            for chunk in r.iter_content(chunk_size=4096):
                if chunk:
                    yield chunk
    return Response(generate(), mimetype='audio/mpeg')

if __name__ == '__main__':
    app.run(port=5000, debug=True) 