import React, { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./ZiraMusicRoom.css";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const socket = io(BACKEND_URL);

function getUsername() {
  let name = localStorage.getItem("zira_username");
  if (!name) {
    name = prompt("Enter your name:") || "User";
    localStorage.setItem("zira_username", name);
  }
  return name;
}

export default function ZiraMusicRoom({ username, token }) {
  const audioRef = useRef();
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null); // index in queue
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [roomId, setRoomId] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [host, setHost] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [chat, setChat] = useState([]);
  const [chatMsg, setChatMsg] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTitle, setAiTitle] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // --- Socket.io setup ---
  useEffect(() => {
    // Join or create a room on mount
    let rid = window.location.pathname.match(/room\/([a-zA-Z0-9]+)/)?.[1];
    if (!rid) {
      rid = Math.random().toString(36).slice(2, 10);
      window.history.replaceState({}, '', `/room/${rid}`);
    }
    setRoomId(rid);
    socket.emit("join_room", { token, roomId: rid, username });

    // Listen for room state updates
    socket.on("room_state", (state) => {
      setQueue(state.queue);
      setCurrent(state.current);
      setChat(state.chat);
      setHost(state.host);
      setIsHost(state.host === username);
    });
    socket.on("chat_message", (msg) => {
      setChat((prev) => [...prev, msg]);
    });

    // Clean up listeners on unmount
    return () => {
      socket.off("room_state");
      socket.off("chat_message");
    };
    // eslint-disable-next-line
  }, [username, token]);

  // --- Player logic ---
  const track = queue && current !== null && queue[current] ? queue[current] : null;

  const play = () => {
    if (!isHost) return;
    audioRef.current.play();
    setIsPlaying(true);
  };
  const pause = () => {
    if (!isHost) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };
  const next = () => {
    if (!isHost) return;
    socket.emit("next_song");
  };
  const prev = () => {
    if (!isHost) return;
    socket.emit("prev_song");
  };
  const onTimeUpdate = () => {
    setProgress(audioRef.current.currentTime);
  };
  const onLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };
  const onEnded = () => {
    next();
  };
  const onVolumeChange = (e) => {
    setVolume(e.target.value);
    audioRef.current.volume = e.target.value;
  };
  const onSeek = (e) => {
    audioRef.current.currentTime = e.target.value;
    setProgress(e.target.value);
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // --- YouTube Search ---
  const handleSearch = async () => {
    if (!search.trim()) return;
    // For demo, use a public YouTube search API
    const res = await fetch(`https://ytsearch.matsurihi.me/api/search?q=${encodeURIComponent(search)}`);
    const data = await res.json();
    setResults(data.items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      author: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.default.url
    })));
  };

  // --- Add song to queue ---
  const addToQueue = (song) => {
    socket.emit("add_to_queue", song);
    setResults([]);
    setSearch("");
  };

  // --- Get stream URL from backend ---
  const [streamUrl, setStreamUrl] = useState("");
  useEffect(() => {
    const fetchStream = async () => {
      if (track && track.videoId) {
        const res = await fetch(`${BACKEND_URL}/api/yt_stream?videoId=${track.videoId}`);
        const data = await res.json();
        setStreamUrl(data.streamUrl);
      } else {
        setStreamUrl("");
      }
    };
    fetchStream();
  }, [track]);

  // --- Auto play on track change ---
  useEffect(() => {
    if (isPlaying && audioRef.current && streamUrl) {
      audioRef.current.play();
    }
    // eslint-disable-next-line
  }, [track, streamUrl]);

  // --- Chat send ---
  const sendChat = () => {
    if (chatMsg.trim()) {
      socket.emit("chat_message", chatMsg);
      setChatMsg("");
    }
  };

  const handleLyrics = async () => {
    if (!queue[current]) return;
    setAiTitle("Lyrics");
    setAiOpen(true);
    setAiLoading(true);
    try {
      const { title, author } = queue[current];
      const res = await fetch(`${BACKEND_URL}/api/lyrics?artist=${encodeURIComponent(author)}&title=${encodeURIComponent(title)}`);
      const data = await res.json();
      setAiResult(data.lyrics || "No lyrics found.");
    } catch {
      setAiResult("Error fetching lyrics.");
    }
    setAiLoading(false);
  };
  const handleMood = async () => {
    if (!queue[current]) return;
    setAiTitle("Mood Detection");
    setAiOpen(true);
    setAiLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: queue[current].title, author: queue[current].author })
      });
      const data = await res.json();
      setAiResult(data.mood || "No mood detected.");
    } catch {
      setAiResult("Error detecting mood.");
    }
    setAiLoading(false);
  };
  const handleRecommend = async () => {
    setAiTitle("Recommendations");
    setAiOpen(true);
    setAiLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue })
      });
      const data = await res.json();
      setAiResult(data.recommendations?.join("\n") || "No recommendations.");
    } catch {
      setAiResult("Error fetching recommendations.");
    }
    setAiLoading(false);
  };

  return (
    <div className="zira-bg">
      {/* Invite Link Button */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
          }}
          style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#222', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
        >
          Copy Invite Link
        </button>
      </div>
      <AnimatedNotes />
      {/* AI Feature Buttons */}
      <div style={{ display: 'flex', gap: 8, margin: '16px 0', justifyContent: 'center' }}>
        <Button variant="outlined" onClick={handleLyrics} disabled={current === null}>Get Lyrics</Button>
        <Button variant="outlined" onClick={handleMood} disabled={current === null}>Detect Mood</Button>
        <Button variant="outlined" onClick={handleRecommend}>Recommend Song</Button>
      </div>
      <Dialog open={aiOpen} onClose={() => setAiOpen(false)}>
        <DialogTitle>{aiTitle}</DialogTitle>
        <DialogContent>
          {aiLoading ? <div>Loading...</div> : <pre style={{ whiteSpace: 'pre-wrap' }}>{aiResult}</pre>}
        </DialogContent>
      </Dialog>
      <div className="zira-center-card">
        <div style={{ color: '#fff', marginBottom: 8 }}>
          Room: <b>{roomId}</b> {isHost && <span style={{ color: '#ffaf7b' }}>(Host)</span>}
        </div>
        <div className="zira-title">Zira Music Room</div>
        <div className="zira-desc">
          A beautiful, immersive, and modern music experience.
        </div>
        <div className="zira-search-bar">
          <input
            type="text"
            placeholder="Search YouTube..."
            className="zira-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button className="zira-search-btn" onClick={handleSearch}>
            <span role="img" aria-label="search">
              🔍
            </span>
          </button>
        </div>
        {results.length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 8, marginBottom: 16 }}>
            {results.map((song, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: 8, cursor: 'pointer' }} onClick={() => addToQueue(song)}>
                <img src={song.thumbnail} alt="thumb" style={{ width: 40, height: 30, marginRight: 12, borderRadius: 4 }} />
                <div style={{ color: '#fff' }}>{song.title} <span style={{ color: '#aaa', fontSize: 12 }}>by {song.author}</span></div>
              </div>
            ))}
          </div>
        )}
        <div className="zira-player-card">
          {track ? (
            <>
              <img
                src={track.thumbnail || process.env.PUBLIC_URL + "/logo192.png"}
                alt="Album Art"
                className="zira-album-art"
              />
              <div className="zira-track-title">{track.title}</div>
              <div className="zira-track-artist">{track.author}</div>
              <input
                type="range"
                min="0"
                max={duration}
                value={progress}
                className="zira-progress-bar"
                onChange={onSeek}
              />
              <div style={{ color: '#fff', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="zira-player-controls">
                <button className="zira-player-btn" onClick={prev} disabled={!isHost}>⏮️</button>
                {isPlaying ? (
                  <button className="zira-player-btn" onClick={pause} disabled={!isHost}>⏸️</button>
                ) : (
                  <button className="zira-player-btn" onClick={play} disabled={!isHost}>▶️</button>
                )}
                <button className="zira-player-btn" onClick={next} disabled={!isHost}>⏭️</button>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={onVolumeChange}
                className="zira-progress-bar"
                style={{ marginTop: 8 }}
              />
              <audio
                ref={audioRef}
                src={streamUrl}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={onEnded}
                autoPlay={isPlaying}
              />
            </>
          ) : (
            <div style={{ color: '#fff', textAlign: 'center', padding: 32 }}>
              No song selected. Add a song to the queue!
            </div>
          )}
        </div>
        <div className="zira-queue-section">
          <div className="zira-queue-title">Queue</div>
          {queue.length === 0 && <div style={{ color: '#fff' }}>Queue is empty.</div>}
          {queue.map((song, idx) => (
            <div
              key={idx}
              className={
                "zira-queue-track" + (idx === current ? " active" : "")
              }
              style={{ cursor: "pointer", fontWeight: idx === current ? 600 : 400 }}
              onClick={() => setCurrent(idx)}
            >
              {song.title} {idx === current && <span style={{ color: '#ffaf7b' }}>●</span>}
            </div>
          ))}
        </div>
        <div className="zira-queue-section" style={{ marginTop: 24 }}>
          <div className="zira-queue-title">Chat</div>
          <div style={{ maxHeight: 120, overflowY: 'auto', background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: 8, marginBottom: 8 }}>
            {chat.map((msg, i) => (
              <div key={i} style={{ color: '#fff', marginBottom: 4 }}>
                <b style={{ color: msg.user === username ? '#ffaf7b' : '#fff' }}>{msg.user}:</b> {msg.message}
                <span style={{ fontSize: 10, color: '#aaa', marginLeft: 8 }}>{new Date(msg.time).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="text"
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder="Type a message..."
              style={{ flex: 1, borderRadius: 6, border: 'none', padding: 8 }}
            />
            <button onClick={sendChat} style={{ background: '#ffaf7b', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer' }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Simple animated notes using absolutely positioned divs
function AnimatedNotes() {
  return (
    <div>
      <div className="zira-note zira-note1">♪</div>
      <div className="zira-note zira-note2">★</div>
      <div className="zira-note zira-note3">▲</div>
      <div className="zira-note zira-note4">♫</div>
    </div>
  );
} 