import React, { useState, useEffect, useRef } from 'react';
import { Container, TextField, Button, List, ListItem, ListItemText, Typography, Box, Paper, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import LyricsIcon from '@mui/icons-material/Lyrics';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ChatIcon from '@mui/icons-material/Chat';
import LogoutIcon from '@mui/icons-material/Logout';
import { io } from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const socket = io(BACKEND_URL);

function App() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [lyrics, setLyrics] = useState('');
  const [mood, setMood] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const audioRef = useRef();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authMode, setAuthMode] = useState('login'); // or 'register'
  const [roomId, setRoomId] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [chat, setChat] = useState([]);
  const [chatMsg, setChatMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Play current song
  useEffect(() => {
    if (queue.length && current !== null && queue[current]) {
      playSong(queue[current]);
    }
    // eslint-disable-next-line
  }, [current]);

  // Auth logic
  const handleAuth = async () => {
    try {
      const url = `${BACKEND_URL}/api/${authMode}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        socket.emit('auth', data.token);
      } else if (data.success) {
        setAuthMode('login');
        alert('Registration successful! Please log in.');
      } else {
        alert(data.error || 'Auth failed');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  // Send token to socket on login
  useEffect(() => {
    if (token) socket.emit('auth', token);
  }, [token]);

  // Room creation
  const createRoom = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/room`, { method: 'POST' });
      const data = await res.json();
      setRoomId(data.roomId);
      setInRoom(true);
      window.history.replaceState({}, '', `/room/${data.roomId}`);
      socket.emit('join_room', { token, roomId: data.roomId });
    } catch (err) {
      alert('Failed to create room: ' + err.message);
    }
  };

  // Join room from link
  useEffect(() => {
    const match = window.location.pathname.match(/room\/([a-zA-Z0-9]+)/);
    if (match) {
      setRoomId(match[1]);
      setInRoom(true);
      if (token) socket.emit('join_room', { token, roomId: match[1] });
    }
  }, [token]);

  // Join room logic
  const joinRoom = () => {
    if (!roomId.trim()) {
      alert('Please enter a room ID');
      return;
    }
    if (!token) {
      alert('Please log in first');
      return;
    }
    setInRoom(true);
    socket.emit('join_room', { token, roomId });
  };

  // Room state updates
  useEffect(() => {
    socket.on('room_state', (state) => {
      setQueue(state.queue);
      setCurrent(state.current);
      setChat(state.chat);
      setIsHost(state.isHost);
    });
    socket.on('chat_message', (msg) => {
      setChat((prev) => [...prev, msg]);
    });
    socket.on('user_joined', (data) => {
      // Optionally show notification when user joins
      console.log(`${data.username} joined the room`);
    });
    return () => {
      socket.off('room_state');
      socket.off('chat_message');
      socket.off('user_joined');
    };
  }, []);

  // Chat send
  const sendChat = () => {
    if (chatMsg.trim()) {
      socket.emit('chat_message', chatMsg);
      setChatMsg('');
    }
  };

  // Copy room link
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.origin + `/room/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // YouTube search by keyword
  const handleSearch = async () => {
    if (!search.trim()) return;
    try {
      const res = await fetch(`https://ytsearch.matsurihi.me/api/search?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      setResults(data.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        author: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.default.url
      })));
    } catch (err) {
      alert('Search failed: ' + err.message);
    }
  };

  // Add song to queue
  const addToQueue = (song) => {
    socket.emit('add_to_queue', song);
  };

  // Remove song from queue
  const removeFromQueue = (idx) => {
    socket.emit('remove_from_queue', idx);
  };

  // Play song
  const playSong = async (song) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/yt_stream?videoId=${song.videoId}`);
      const data = await res.json();
      if (data.streamUrl) {
        audioRef.current.src = data.streamUrl;
        audioRef.current.play();
        // setPlaying(true); // Removed playing state
      }
    } catch (err) {
      console.error('Failed to play song:', err.message);
    }
  };

  // Next/Prev controls
  const nextSong = () => {
    if (queue.length) {
      socket.emit('next_song');
    }
  };
  const prevSong = () => {
    if (queue.length) {
      socket.emit('prev_song');
    }
  };

  // Fetch lyrics for current song
  const fetchLyrics = async () => {
    if (!queue[current]) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/lyrics?artist=${encodeURIComponent(queue[current].author)}&title=${encodeURIComponent(queue[current].title)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLyrics(data.lyrics || 'No lyrics found.');
    } catch (err) {
      setLyrics('Failed to fetch lyrics: ' + err.message);
    }
  };

  // Fetch mood for current song
  const fetchMood = async () => {
    if (!queue[current]) return;
    try {
      // For demo, just send the videoId as a dummy URL
      const res = await fetch(`${BACKEND_URL}/api/mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: queue[current].videoId })
      });
      const data = await res.json();
      setMood(data.mood || 'Unknown');
    } catch (err) {
      setMood('Failed to detect mood: ' + err.message);
    }
  };

  // Fetch recommendations based on queue history
  const fetchRecommendations = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ history: queue.map(song => song.title) })
      });
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setRecommendations(['Failed to fetch recommendations: ' + err.message]);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    socket.emit('logout');
    setInRoom(false);
    setRoomId('');
    setIsHost(false);
    setChat([]);
    setChatMsg('');
    setCopied(false);
  };

  // Room UI
  if (!inRoom) {
    return (
      <Container maxWidth="xs" sx={{ mt: 8 }}>
        <Paper sx={{ p: 3 }} elevation={3}>
          <Typography variant="h5" gutterBottom>Join or Create a Room</Typography>
          <Button variant="contained" onClick={createRoom} sx={{ mb: 2 }}>Create Room</Button>
          <TextField label="Room ID" value={roomId} onChange={e => setRoomId(e.target.value)} fullWidth sx={{ mb: 2 }} />
          <Button variant="outlined" onClick={joinRoom}>Join Room</Button>
        </Paper>
      </Container>
    );
  }

  if (!token) {
    return (
      <Container maxWidth="xs" sx={{ mt: 8 }}>
        <Paper sx={{ p: 3 }} elevation={3}>
          <Typography variant="h5" gutterBottom>{authMode === 'login' ? 'Login' : 'Register'}</Typography>
          <TextField label="Username" value={username} onChange={e => setUsername(e.target.value)} fullWidth sx={{ mb: 2 }} />
          <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth sx={{ mb: 2 }} />
          <Box display="flex" gap={2}>
            <Button variant="contained" startIcon={authMode === 'login' ? <LockOpenIcon /> : <PersonAddIcon />} onClick={handleAuth}>
              {authMode === 'login' ? 'Login' : 'Register'}
            </Button>
            <Button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? 'Need an account? Register' : 'Have an account? Login'}
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Room: {roomId}</Typography>
        <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={copyLink}>{copied ? 'Copied!' : 'Copy Link'}</Button>
        <Button variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>Logout</Button>
      </Box>
      <Box mb={2}>
        <Typography variant="subtitle1">{isHost ? 'You are the host. You control the music.' : 'Waiting for host to play music...'}</Typography>
      </Box>
      <Paper sx={{ p: 3, mb: 2 }} elevation={3}>
        <Typography variant="h4" gutterBottom>Smart Music App</Typography>
        <Box display="flex" gap={2} mb={2}>
          <TextField
            label="Search YouTube"
            value={search}
            onChange={e => setSearch(e.target.value)}
            fullWidth
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Button variant="contained" onClick={handleSearch}>Search</Button>
        </Box>
        <List>
          {results.map((song, idx) => (
            <ListItem key={song.videoId} secondaryAction={
              <Button variant="outlined" onClick={() => addToQueue(song)}>Add</Button>
            }>
              <img src={song.thumbnail} alt="thumb" style={{ width: 48, height: 36, marginRight: 12 }} />
              <ListItemText primary={song.title} secondary={song.author} />
            </ListItem>
          ))}
        </List>
      </Paper>
      <Paper sx={{ p: 3, mb: 2 }} elevation={3}>
        <Typography variant="h5" gutterBottom>Queue</Typography>
        <List>
          {queue.map((song, idx) => (
            <ListItem key={song.videoId + idx} selected={idx === current} secondaryAction={
              <IconButton edge="end" onClick={() => removeFromQueue(idx)}><DeleteIcon /></IconButton>
            }>
              <ListItemText primary={song.title} secondary={song.author} />
            </ListItem>
          ))}
        </List>
        <Box display="flex" alignItems="center" gap={2} mt={2}>
          <IconButton onClick={prevSong}><SkipPreviousIcon /></IconButton>
          <IconButton onClick={() => playSong(queue[current])}><PlayArrowIcon /></IconButton>
          <IconButton onClick={nextSong}><SkipNextIcon /></IconButton>
        </Box>
        <audio ref={audioRef} controls style={{ width: '100%', marginTop: 16 }} onEnded={nextSong} />
      </Paper>
      <Paper sx={{ p: 3, mb: 2 }} elevation={3}>
        <Typography variant="h5" gutterBottom>AI Features</Typography>
        <Box display="flex" gap={2} mb={2}>
          <Button variant="outlined" startIcon={<LyricsIcon />} onClick={fetchLyrics}>Lyrics</Button>
          <Button variant="outlined" startIcon={<PsychologyIcon />} onClick={fetchMood}>Mood</Button>
          <Button variant="outlined" startIcon={<TipsAndUpdatesIcon />} onClick={fetchRecommendations}>Recommend</Button>
        </Box>
        {lyrics && <Box mb={2}><Typography variant="subtitle1">Lyrics:</Typography><Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{lyrics}</Typography></Box>}
        {mood && <Box mb={2}><Typography variant="subtitle1">Mood:</Typography><Typography variant="body2">{mood}</Typography></Box>}
        {recommendations.length > 0 && <Box mb={2}><Typography variant="subtitle1">Recommendations:</Typography><ul>{recommendations.map((rec, i) => <li key={i}>{rec}</li>)}</ul></Box>}
      </Paper>
      <Paper sx={{ p: 3, mb: 2 }} elevation={3}>
        <Typography variant="h5" gutterBottom>Chat</Typography>
        <Box sx={{ maxHeight: 200, overflowY: 'auto', mb: 2, border: '1px solid #eee', borderRadius: 1, p: 1 }}>
          {chat.map((msg, i) => (
            <Box key={i} mb={1}><b>{msg.user}:</b> {msg.message} <span style={{ fontSize: 10, color: '#888' }}>{new Date(msg.time).toLocaleTimeString()}</span></Box>
          ))}
        </Box>
        <Box display="flex" gap={1}>
          <TextField value={chatMsg} onChange={e => setChatMsg(e.target.value)} fullWidth size="small" placeholder="Type a message..." />
          <Button variant="contained" startIcon={<ChatIcon />} onClick={sendChat}>Send</Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default App;
