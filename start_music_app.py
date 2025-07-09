#!/usr/bin/env python3
"""
Simple launcher for the Music App services
Usage: python start_music_app.py
"""

import subprocess
import time
import os
import sys
import signal
from pathlib import Path

processes = []

def signal_handler(signum, frame):
    """Handle Ctrl+C to gracefully stop all processes"""
    print("\n[LAUNCHER] Stopping all services...")
    for proc in processes:
        try:
            proc.terminate()
        except:
            pass
    sys.exit(0)

def start_service(cmd, name, cwd=None):
    """Start a service and return the process"""
    print(f"[LAUNCHER] Starting {name}...")
    try:
        if cwd:
            proc = subprocess.Popen(cmd, shell=True, cwd=cwd)
        else:
            proc = subprocess.Popen(cmd, shell=True)
        print(f"[LAUNCHER] {name} started (PID: {proc.pid})")
        processes.append(proc)
        return proc
    except Exception as e:
        print(f"[LAUNCHER] Failed to start {name}: {e}")
        return None

def main():
    # Set up signal handler
    signal.signal(signal.SIGINT, signal_handler)
    
    print("🎵 [LAUNCHER] Starting Music App Services...")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not Path("music-app").exists():
        print("[LAUNCHER] Error: music-app directory not found!")
        print("Please run this script from the project root directory.")
        sys.exit(1)
    
    # Start AI Service
    print("\n🔧 Starting AI Service...")
    ai_service = start_service(
        "uvicorn main:app --host 0.0.0.0 --port 8000 --reload",
        "AI Service",
        cwd="ai-service"
    )
    time.sleep(3)  # Give AI service time to start
    
    # Start Backend
    print("\n🎼 Starting Music App Backend...")
    backend = start_service(
        "npm install && npm start",
        "Backend",
        cwd="music-app/backend"
    )
    time.sleep(5)  # Give backend time to start
    
    # Start Frontend
    print("\n🎨 Starting Music App Frontend...")
    frontend = start_service(
        "npm install && npm start",
        "Frontend",
        cwd="music-app/frontend"
    )
    
    print("\n" + "=" * 50)
    print("🎉 All services started!")
    print("=" * 50)
    print("📱 Frontend: http://localhost:3000")
    print("🔧 Backend:  http://localhost:5000")
    print("🤖 AI Service: http://localhost:8000")
    print("=" * 50)
    print("💡 Press Ctrl+C to stop all services")
    print("=" * 50)
    
    # Wait for processes
    try:
        for proc in processes:
            proc.wait()
    except KeyboardInterrupt:
        print("\n[LAUNCHER] Shutting down...")
    finally:
        for proc in processes:
            try:
                proc.terminate()
            except:
                pass
        print("[LAUNCHER] All services stopped.")

if __name__ == "__main__":
    main() 