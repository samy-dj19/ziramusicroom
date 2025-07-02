from flask import Flask, Response
import requests

app = Flask(__name__)

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