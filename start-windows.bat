@echo off
rem Keeps the Repeater Nation Discord bot online while this window is open.
rem Put the bot token (only the token) in token.txt next to this file.
cd /d "%~dp0"
where node >nul 2>nul || (echo Install Node.js 22 or newer from https://nodejs.org first. & pause & exit /b 1)
if not exist token.txt (echo Put your Discord bot token in token.txt next to this file, then run this again. & pause & exit /b 1)
set /p DISCORD_BOT_TOKEN=<token.txt
:loop
node presence.mjs
rem Exit code 1 means the token was rejected: retrying won't help.
if %errorlevel%==1 (pause & exit /b 1)
echo Restarting in 10 seconds... (close this window to stop the bot)
timeout /t 10 >nul
goto loop
