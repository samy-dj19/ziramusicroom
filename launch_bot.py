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
    start_process("python zira-music-bot/backend/api_server.py", "API Server")
    time.sleep(2)  # Give the API server a moment to start
    start_process("python zira-music-bot/backend/bot.py", "Telegram Bot")
    # Wait for both processes to finish
    for proc in processes:
        proc.wait() 