import subprocess
import time
import os
import sys
import signal
import threading
from pathlib import Path

# Global list to store all processes
processes = []
stop_event = threading.Event()

def signal_handler(signum, frame):
    """Handle Ctrl+C to gracefully stop all processes"""
    print("\n[LAUNCHER] Received interrupt signal. Stopping all services...")
    stop_event.set()
    for proc in processes:
        try:
            proc.terminate()
            print(f"[LAUNCHER] Terminated process {proc.pid}")
        except:
            pass
    sys.exit(0)

def start_process(cmd, name, cwd=None, env=None):
    """Start a process and return it"""
    print(f"[LAUNCHER] Starting {name}...")
    
    # Prepare environment
    process_env = os.environ.copy()
    if env:
        process_env.update(env)
    
    try:
        if cwd:
            proc = subprocess.Popen(cmd, shell=True, cwd=cwd, env=process_env)
        else:
            proc = subprocess.Popen(cmd, shell=True, env=process_env)
        
        print(f"[LAUNCHER] {name} started with PID {proc.pid}")
        processes.append(proc)
        return proc
    except Exception as e:
        print(f"[LAUNCHER] Failed to start {name}: {e}")
        return None

def check_port(port):
    """Check if a port is available"""
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('localhost', port))
    sock.close()
    return result == 0

def wait_for_port(port, service_name, timeout=30):
    """Wait for a service to be available on a port"""
    import socket
    import time
    
    print(f"[LAUNCHER] Waiting for {service_name} on port {port}...")
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('localhost', port))
            sock.close()
            if result == 0:
                print(f"[LAUNCHER] {service_name} is ready!")
                return True
        except:
            pass
        time.sleep(1)
    
    print(f"[LAUNCHER] Warning: {service_name} may not be ready on port {port}")
    return False

def main():
    # Set up signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("🎵 [LAUNCHER] Starting Music App & Bot Services...")
    print("=" * 60)
    
    # Check if we're in the right directory
    if not Path("music-app").exists():
        print("[LAUNCHER] Error: music-app directory not found!")
        print("Please run this script from the project root directory.")
        sys.exit(1)
    
    # Check for required tools
    required_tools = ["docker", "docker-compose", "python", "node", "npm"]
    missing_tools = []
    
    for tool in required_tools:
        try:
            subprocess.run([tool, "--version"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            missing_tools.append(tool)
    
    if missing_tools:
        print(f"[LAUNCHER] Warning: Missing tools: {', '.join(missing_tools)}")
        print("Some services may not start properly.")
    
    # Start services in order
    
    # 1. Start AI Service (Python FastAPI)
    print("\n🔧 [LAUNCHER] Starting AI Service...")
    ai_service = start_process(
        "uvicorn main:app --host 0.0.0.0 --port 8000 --reload",
        "AI Service",
        cwd="ai-service"
    )
    if ai_service:
        wait_for_port(8000, "AI Service")
    
    # 2. Start Music App Backend (Node.js)
    print("\n🎼 [LAUNCHER] Starting Music App Backend...")
    backend = start_process(
        "npm install && npm start",
        "Music App Backend",
        cwd="music-app/backend"
    )
    if backend:
        wait_for_port(5000, "Music App Backend")
    
    # 3. Start Music App Frontend (React)
    print("\n🎨 [LAUNCHER] Starting Music App Frontend...")
    frontend = start_process(
        "npm install && npm start",
        "Music App Frontend",
        cwd="music-app/frontend"
    )
    if frontend:
        wait_for_port(3000, "Music App Frontend")
    
    # 4. Start ngrok tunnel (if available)
    print("\n🌐 [LAUNCHER] Starting ngrok tunnel...")
    try:
        ngrok = start_process("ngrok http 8080", "ngrok Tunnel")
        if ngrok:
            time.sleep(3)  # Give ngrok time to start
    except:
        print("[LAUNCHER] ngrok not available, skipping tunnel")
    
    # 5. Start API Server (if exists)
    if Path("zira-music-bot/backend/api_server.py").exists():
        print("\n🔌 [LAUNCHER] Starting API Server...")
        api_server = start_process(
            "python api_server.py",
            "API Server",
            cwd="zira-music-bot/backend"
        )
        if api_server:
            wait_for_port(8080, "API Server")
    
    # 6. Start Telegram Bot (if exists)
    if Path("zira-music-bot/backend/bot.py").exists():
        print("\n🤖 [LAUNCHER] Starting Telegram Bot...")
        bot = start_process(
            "python bot.py",
            "Telegram Bot",
            cwd="zira-music-bot/backend"
        )
    
    # 7. Alternative: Start with Docker Compose
    print("\n🐳 [LAUNCHER] Starting Docker services...")
    docker_compose = start_process(
        "docker-compose up --build",
        "Docker Compose",
        cwd="music-app"
    )
    
    # Print service URLs
    print("\n" + "=" * 60)
    print("🎉 [LAUNCHER] All services started!")
    print("=" * 60)
    print("📱 Music App Frontend: http://localhost:3000")
    print("🔧 Music App Backend:  http://localhost:5000")
    print("🤖 AI Service:          http://localhost:8000")
    print("🌐 ngrok Tunnel:        http://localhost:4040 (if available)")
    print("=" * 60)
    print("💡 Press Ctrl+C to stop all services")
    print("=" * 60)
    
    # Monitor processes
    try:
        while not stop_event.is_set():
            # Check if any process has died
            for i, proc in enumerate(processes):
                if proc.poll() is not None:
                    print(f"[LAUNCHER] Process {proc.pid} has stopped")
                    processes.pop(i)
                    break
            
            if not processes:
                print("[LAUNCHER] All processes have stopped")
                break
                
            time.sleep(5)
            
    except KeyboardInterrupt:
        print("\n[LAUNCHER] Received interrupt, shutting down...")
    
    finally:
        # Cleanup
        print("[LAUNCHER] Stopping all services...")
        for proc in processes:
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except:
                proc.kill()
        print("[LAUNCHER] All services stopped.")

if __name__ == "__main__":
    main() 