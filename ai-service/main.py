from fastapi import FastAPI, Query
from pydantic import BaseModel
import requests

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

@app.get('/health')
def health():
    return {"status": "ok", "service": "ai-service"} 