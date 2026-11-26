@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js from https://nodejs.org/ first.
  pause
  exit /b 1
)
node tools/admin/server.cjs
pause
