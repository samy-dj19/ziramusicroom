
import subprocess
import sys
import os
import signal

# Paths to backend and bot
BACKEND_PATH = os.path.join('zira-music-bot', 'backend')
API_SERVER = os.path.join(BACKEND_PATH, 'api_server.py')
BOT = os.path.join(BACKEND_PATH, 'bot.py')

processes = []

def start_process(cmd, name):
    print(f"[LAUNCHER] Starting {name}...")
    proc = subprocess.Popen([sys.executable, cmd], cwd=BACKEND_PATH)
    processes.append((proc, name))
    print(f"[LAUNCHER] {name} started with PID {proc.pid}")
    return proc

def stop_all():
    print("\n[LAUNCHER] Stopping all processes...")
    for proc, name in processes:
        print(f"[LAUNCHER] Terminating {name} (PID {proc.pid})...")
        proc.terminate()
    for proc, name in processes:
        proc.wait()
    print("[LAUNCHER] All processes stopped.")

def main():
    try:
        backend_proc = start_process('api_server.py', 'Backend Server')
        bot_proc = start_process('bot.py', 'Telegram Bot')
        print("\n[LAUNCHER] Both backend and bot are running!")
        print("[LAUNCHER] Press Ctrl+C to stop everything.")
        # Wait for both processes
        while True:
            for proc, name in processes:
                ret = proc.poll()
                if ret is not None:
                    print(f"[LAUNCHER] {name} exited with code {ret}.")
                    stop_all()
                    sys.exit(1)
    except KeyboardInterrupt:
        stop_all()
        print("[LAUNCHER] Exiting.")

if __name__ == "__main__":
    main() 