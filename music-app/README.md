# Smart Music App

A modern, real-time, collaborative music streaming app with YouTube audio streaming, queue management, and a beautiful Material UI frontend.

---

## 🚀 Features
- **YouTube Streaming:** Stream audio from any YouTube video (no local storage needed).
- **YouTube Search:** Search for songs by keyword and add them to the queue.
- **Real-Time Queue:** Add, remove, and reorder songs in a shared queue. All users see updates instantly.
- **Modern UI:** Responsive, beautiful interface built with React and Material UI.
- **Audio Player:** Play, pause, skip, and control volume for the current song.
- **Multi-User:** Multiple users can join, search, and control the queue together.

---

## 📝 Command & Process Flow
- **Search:** Enter a song/artist/keyword in the search bar. Results are fetched from YouTube.
- **Add to Queue:** Click "Add" next to a search result to add it to the shared queue.
- **Queue Controls:**
  - **Play:** Click the play button to start the current song.
  - **Next/Previous:** Skip to the next or previous song in the queue.
  - **Remove:** Click the trash icon to remove a song from the queue.
- **Real-Time:** All actions update instantly for all connected users.

---

## 🛠️ How to Start the App

### 1. **Clone the Repository**
```
git clone <your-repo-url>
cd music-app
```

### 2. **Backend Setup**
```
cd backend
npm install
node index.js
```
- The backend will run at [http://localhost:5000](http://localhost:5000)

### 3. **Frontend Setup**
```
cd ../frontend
npm install
npm start
```
- The frontend will run at [http://localhost:3000](http://localhost:3000)

### 4. **Usage**
- Open the frontend in your browser.
- Search for any song, add to queue, and enjoy real-time music streaming!

---

## 📦 Project Structure
```
music-app/
  backend/    # Node.js backend (Express, Socket.io, ytdl-core)
  frontend/   # React frontend (Material UI, socket.io-client)
```

---

## 💡 Next Steps
- Phase 2: AI features (lyrics, mood detection, recommendations, voice commands)
- Phase 3: Cloud deployment, user accounts, PWA, and more

---

## 🤝 Contributing
Pull requests and feature suggestions are welcome!

---

## 📄 License
MIT 

---

## 🚀 Cloud Deployment (Docker Compose)

1. Build and start all services:
   ```sh
   cd music-app
   docker-compose up --build
   ```
   - Backend: [http://localhost:5000](http://localhost:5000)
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - AI Service: [http://localhost:8000](http://localhost:8000)

2. Health check endpoints:
   - Backend: `/api/health`
   - AI Service: `/health`

3. The app is now cloud-ready and can be deployed to any Docker-compatible host.

--- 