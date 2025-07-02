@echo off
REM Start backend server in a new window
start cmd /k "cd /d %~dp0zira-music-bot\backend && python api_server.py"
REM Start Telegram bot in a new window
start cmd /k "cd /d %~dp0zira-music-bot\backend && python bot.py" 