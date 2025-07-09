const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const ytdl = require('ytdl-core');
const cors = require('cors');
const axios = require('axios');
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SECRET = process.env.JWT_SECRET || 'supersecret';
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// --- In-memory user storage (replace with database in production) ---
const users = {};

// --- Authentication endpoints ---
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    if (users[username]) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = { password: hashedPassword };
    const token = jwt.sign({ username }, SECRET, { expiresIn: '24h' });
    res.json({ token, username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const user = users[username];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ username }, SECRET, { expiresIn: '24h' });
    res.json({ token, username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- In-memory queue state ---
let queue = [];
let current = null;

function broadcastQueue() {
  io.emit('queue_update', { queue, current });
}

// --- Room state ---
const rooms = {};

// Create room endpoint
app.post('/api/room', (req, res) => {
  const roomId = uuidv4().slice(0, 8);
  rooms[roomId] = {
    host: null,
    users: [],
    queue: [],
    current: null,
    chat: []
  };
  res.json({ roomId });
});

// Join room endpoint
app.post('/api/room/join', (req, res) => {
  const { roomId } = req.body;
  if (!rooms[roomId]) return res.status(404).json({ error: 'Room not found' });
  res.json({ success: true });
});

// YouTube audio streaming endpoint
app.get('/api/yt_stream', async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'No videoId provided' });
  try {
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    res.json({ streamUrl: format.url, title: info.videoDetails.title, author: info.videoDetails.author.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy: Get lyrics from AI microservice
app.get('/api/lyrics', async (req, res) => {
  try {
    const { artist, title } = req.query;
    const response = await axios.get(`${AI_SERVICE_URL}/lyrics`, { params: { artist, title } });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy: Mood detection
app.post('/api/mood', async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/mood`, req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy: Recommendations
app.post('/api/recommend', async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/recommend`, req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health endpoint
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'backend' }));

// --- Socket.io room logic ---
io.on('connection', (socket) => {
  let username = null;
  let roomId = null;
  let isHost = false;

  socket.on('auth', (token) => {
    try {
      const payload = jwt.verify(token, SECRET);
      username = payload.username;
    } catch (err) {
      console.error('Auth error:', err.message);
    }
  });

  socket.on('join_room', ({ token, roomId: rid }) => {
    try {
      const payload = jwt.verify(token, SECRET);
      username = payload.username;
      roomId = rid;
      if (!rooms[roomId]) return;
      socket.join(roomId);
      // Assign host if first user
      if (!rooms[roomId].host) {
        rooms[roomId].host = username;
        isHost = true;
      } else {
        isHost = rooms[roomId].host === username;
      }
      if (!rooms[roomId].users.includes(username)) rooms[roomId].users.push(username);
      // Send initial state
      socket.emit('room_state', {
        queue: rooms[roomId].queue,
        current: rooms[roomId].current,
        chat: rooms[roomId].chat,
        host: rooms[roomId].host,
        isHost
      });
      // Notify others
      socket.to(roomId).emit('user_joined', { username });
    } catch (err) {
      console.error('Error joining room:', err.message);
    }
  });

  // Host-only music controls
  socket.on('add_to_queue', (song) => {
    if (!roomId || !username) return;
    rooms[roomId].queue.push(song);
    if (rooms[roomId].current === null) rooms[roomId].current = 0;
    io.in(roomId).emit('room_state', {
      queue: rooms[roomId].queue,
      current: rooms[roomId].current,
      chat: rooms[roomId].chat,
      host: rooms[roomId].host,
      isHost: rooms[roomId].host === username
    });
  });
  socket.on('remove_from_queue', (idx) => {
    if (!roomId || !username) return;
    rooms[roomId].queue.splice(idx, 1);
    if (rooms[roomId].queue.length === 0) {
      rooms[roomId].current = null;
    } else if (rooms[roomId].current >= rooms[roomId].queue.length) {
      rooms[roomId].current = rooms[roomId].queue.length - 1;
    }
    io.in(roomId).emit('room_state', {
      queue: rooms[roomId].queue,
      current: rooms[roomId].current,
      chat: rooms[roomId].chat,
      host: rooms[roomId].host,
      isHost: rooms[roomId].host === username
    });
  });
  socket.on('next_song', () => {
    if (!roomId || !username || rooms[roomId].host !== username) return;
    if (rooms[roomId].queue.length) {
      rooms[roomId].current = (rooms[roomId].current + 1) % rooms[roomId].queue.length;
      io.in(roomId).emit('room_state', {
        queue: rooms[roomId].queue,
        current: rooms[roomId].current,
        chat: rooms[roomId].chat,
        host: rooms[roomId].host,
        isHost: rooms[roomId].host === username
      });
    }
  });
  socket.on('prev_song', () => {
    if (!roomId || !username || rooms[roomId].host !== username) return;
    if (rooms[roomId].queue.length) {
      rooms[roomId].current = (rooms[roomId].current - 1 + rooms[roomId].queue.length) % rooms[roomId].queue.length;
      io.in(roomId).emit('room_state', {
        queue: rooms[roomId].queue,
        current: rooms[roomId].current,
        chat: rooms[roomId].chat,
        host: rooms[roomId].host,
        isHost: rooms[roomId].host === username
      });
    }
  });
  // Chat
  socket.on('chat_message', (msg) => {
    if (!roomId || !username) return;
    const chatMsg = { user: username, message: msg, time: new Date().toISOString() };
    rooms[roomId].chat.push(chatMsg);
    io.in(roomId).emit('chat_message', chatMsg);
  });

  // Logout
  socket.on('logout', () => {
    if (roomId && username) {
      // Remove user from room
      const userIndex = rooms[roomId].users.indexOf(username);
      if (userIndex > -1) {
        rooms[roomId].users.splice(userIndex, 1);
      }
      // If user was host, assign new host
      if (rooms[roomId].host === username && rooms[roomId].users.length > 0) {
        rooms[roomId].host = rooms[roomId].users[0];
      }
      // Clean up empty rooms
      if (rooms[roomId].users.length === 0) {
        delete rooms[roomId];
      } else {
        io.in(roomId).emit('room_state', {
          queue: rooms[roomId].queue,
          current: rooms[roomId].current,
          chat: rooms[roomId].chat,
          host: rooms[roomId].host,
          isHost: false
        });
      }
    }
    username = null;
    roomId = null;
    isHost = false;
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`)); 