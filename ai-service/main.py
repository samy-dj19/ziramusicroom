from fastapi import FastAPI, Query
from pydantic import BaseModel
import requests
import difflib
from typing import List

app = FastAPI()

# --- Lyrics Endpoint ---
@app.get('/lyrics')
def get_lyrics(artist: str = Query(...), title: str = Query(...)):
    # Placeholder: Use lyrics.ovh API for demo
    try:
        resp = requests.get(f'https://api.lyrics.ovh/v1/{artist}/{title}', timeout=10)
        data = resp.json()
        return {'lyrics': data.get('lyrics', 'Not found')}
    except requests.exceptions.Timeout:
        return {'lyrics': 'Error: Request timeout'}
    except requests.exceptions.RequestException as e:
        return {'lyrics': f'Error: {str(e)}'}
    except Exception as e:
        return {'lyrics': f'Error: {str(e)}'}

# --- Mood Detection Endpoint ---
class MoodRequest(BaseModel):
    url: str  # URL to audio file

@app.post('/mood')
def detect_mood(req: MoodRequest):
    # Placeholder: Return random mood for demo
    import random
    moods = ['happy', 'sad', 'energetic', 'calm', 'angry', 'romantic']
    return {'mood': random.choice(moods)}

# --- Recommendation Endpoint ---
class RecommendRequest(BaseModel):
    history: list

@app.post('/recommend')
def recommend(req: RecommendRequest):
    # Placeholder: Recommend random genres
    import random
    genres = ['pop', 'rock', 'hip-hop', 'jazz', 'classical', 'edm']
    return {'recommendations': random.sample(genres, 3)}

SONGS = [
    {"title": "Happy Tune", "artist": "Artist 1", "genre": "pop", "mood": "happy", "src": "/static/mp3/1P3ZgLOy-w8.mp3"},
    {"title": "Sad Song", "artist": "Artist 2", "genre": "rock", "mood": "sad", "src": "/static/mp3/58xKTGxmeHI.mp3"},
    {"title": "Energetic Beat", "artist": "Artist 3", "genre": "edm", "mood": "energetic", "src": "/static/mp3/7JDX250dGNs.mp3"},
    {"title": "Calm Vibes", "artist": "Artist 4", "genre": "jazz", "mood": "calm", "src": "/static/mp3/HP2zqQsrsyg.mp3"},
    {"title": "Romantic Ballad", "artist": "Artist 5", "genre": "classical", "mood": "romantic", "src": "/static/mp3/a0goLSCAcBw.mp3"},
]

class PlayRequest(BaseModel):
    query: str

@app.post('/ai_play')
def ai_play(req: PlayRequest):
    q = req.query.lower()
    # Find all matches by title substring
    matches = [song for song in SONGS if q in song["title"].lower()]
    if len(matches) == 1:
        return {"song": matches[0]}
    elif len(matches) > 1:
        return {"multiple": matches}
    # Fuzzy match
    titles = [song["title"].lower() for song in SONGS]
    import difflib
    fuzzy_matches = difflib.get_close_matches(q, titles, n=3, cutoff=0.6)
    fuzzy_songs = [song for song in SONGS if song["title"].lower() in fuzzy_matches]
    if len(fuzzy_songs) == 1:
        return {"song": fuzzy_songs[0]}
    elif len(fuzzy_songs) > 1:
        return {"multiple": fuzzy_songs}
    # Mood/genre match
    mood_genre_matches = [song for song in SONGS if song["mood"] in q or song["genre"] in q]
    if len(mood_genre_matches) == 1:
        return {"song": mood_genre_matches[0]}
    elif len(mood_genre_matches) > 1:
        return {"multiple": mood_genre_matches}
    return {"error": "No matching song found."}

class HistoryRequest(BaseModel):
    history: List[str]

@app.post('/personal_recommend')
def personal_recommend(req: HistoryRequest):
    user_genres = set()
    user_moods = set()
    for song_title in req.history:
        for song in SONGS:
            if song["title"] == song_title:
                user_genres.add(song["genre"])
                user_moods.add(song["mood"])
    recommendations = [
        song for song in SONGS
        if (song["genre"] in user_genres or song["mood"] in user_moods)
        and song["title"] not in req.history
    ]
    return {"recommendations": recommendations[:5]}

@app.get('/health')
def health():
    return {"status": "ok", "service": "ai-service"} 