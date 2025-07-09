# 🚀 Launcher Scripts

This project includes several launcher scripts to easily start all services.

## 📋 Available Launchers

### 1. **Python Launcher (Recommended)**
```bash
python launch_bot.py
```
**Features:**
- Starts all services (Music App + Bot + AI Service)
- Automatic dependency checking
- Graceful shutdown with Ctrl+C
- Port availability checking
- Process monitoring
- Comprehensive error handling

### 2. **Simple Music App Launcher**
```bash
python start_music_app.py
```
**Features:**
- Starts only Music App services (Frontend + Backend + AI)
- Lighter weight, faster startup
- Good for development

### 3. **Windows Batch File**
```cmd
start_all.bat
```
**Features:**
- Windows-specific launcher
- Checks for required tools
- Calls the Python launcher

### 4. **Docker Compose (Alternative)**
```bash
cd music-app
docker-compose up --build
```
**Features:**
- Containerized deployment
- Isolated environments
- Production-ready

## 🛠️ Prerequisites

### Required Tools
- **Python 3.8+** - For launcher scripts and AI service
- **Node.js 16+** - For Music App backend and frontend
- **npm** - Node.js package manager

### Optional Tools
- **Docker & Docker Compose** - For containerized deployment
- **ngrok** - For public tunneling (bot functionality)

## 🚀 Quick Start

### Option 1: Python Launcher (Recommended)
```bash
# From project root directory
python launch_bot.py
```

### Option 2: Simple Music App Only
```bash
# From project root directory
python start_music_app.py
```

### Option 3: Windows
```cmd
# Double-click or run from command prompt
start_all.bat
```

## 📊 What Gets Started

### Music App Services
- **Frontend** (React): http://localhost:3000
- **Backend** (Node.js): http://localhost:5000
- **AI Service** (FastAPI): http://localhost:8000

### Bot Services (if available)
- **API Server**: http://localhost:8080
- **Telegram Bot**: Background process
- **ngrok Tunnel**: http://localhost:4040

### Docker Services
- **All services** in containers

## 🎯 Service URLs

Once started, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| Music App Frontend | http://localhost:3000 | Main application interface |
| Music App Backend | http://localhost:5000 | API endpoints |
| AI Service | http://localhost:8000 | AI features (lyrics, mood, etc.) |
| ngrok Tunnel | http://localhost:4040 | Public tunnel (if available) |

## 🛑 Stopping Services

### Graceful Shutdown
Press `Ctrl+C` in the terminal where the launcher is running.

### Force Stop
If services don't stop gracefully:
```bash
# Kill all Node.js processes
pkill -f node

# Kill all Python processes
pkill -f python

# Kill Docker containers
docker-compose down
```

## 🔧 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```
   Error: Port 3000/5000/8000 is already in use
   ```
   **Solution:** Stop other services using these ports or change ports in configuration

2. **Node.js Not Found**
   ```
   Warning: Node.js is not installed
   ```
   **Solution:** Install Node.js from https://nodejs.org/

3. **Python Not Found**
   ```
   Error: Python is not installed
   ```
   **Solution:** Install Python from https://python.org/

4. **Dependencies Not Installed**
   ```
   Error: npm install failed
   ```
   **Solution:** Run `npm install` manually in the respective directories

### Manual Installation

If the launcher fails, you can start services manually:

```bash
# 1. Start AI Service
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 2. Start Backend (in new terminal)
cd music-app/backend
npm install
npm start

# 3. Start Frontend (in new terminal)
cd music-app/frontend
npm install
npm start
```

## 📝 Logs

The launcher provides real-time logs for each service:
- `[LAUNCHER]` - Launcher script messages
- `[AI Service]` - AI service logs
- `[Backend]` - Music app backend logs
- `[Frontend]` - Music app frontend logs

## 🔄 Development Mode

For development, the launcher starts services with:
- **Hot reload** enabled for all services
- **Debug mode** for better error messages
- **Auto-restart** on file changes

## 🐳 Docker Mode

The launcher also starts Docker services as an alternative:
- **Isolated environments** for each service
- **Consistent deployment** across platforms
- **Production-ready** configuration

## 📱 Mobile Access

Once started, you can access the app on mobile devices:
1. Find your computer's IP address
2. Access `http://YOUR_IP:3000` on mobile
3. Or use ngrok tunnel for public access

## 🎵 Features Available

Once all services are running, you can:
- ✅ Create/join music rooms
- ✅ Search and play YouTube music
- ✅ Real-time chat with room members
- ✅ AI-powered lyrics and mood detection
- ✅ Host-only music controls
- ✅ Share room links with friends

## 🚀 Production Deployment

For production deployment, use:
```bash
cd music-app
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

See `DEPLOYMENT.md` for detailed production setup instructions. 