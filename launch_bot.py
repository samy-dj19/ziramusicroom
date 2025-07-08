import subprocess
import time

processes = []

def start_process(cmd, name):
    print(f"[LAUNCHER] Starting {name}...")
    proc = subprocess.Popen(cmd, shell=True)
    print(f"[LAUNCHER] {name} started with PID {proc.pid}")
    processes.append(proc)
    return proc

if __name__ == "__main__":
    # Start ngrok on port 8080
    start_process("ngrok http 8080", "ngrok Tunnel")
    time.sleep(2)  # Give ngrok a moment to start
    start_process("python zira-music-bot/backend/api_server.py", "API Server")
    time.sleep(2)  # Give the API server a moment to start
    start_process("python zira-music-bot/backend/bot.py", "Telegram Bot")
    # Wait for all processes to finish
    for proc in processes:
        proc.wait() 