@echo off

echo ====================================
echo Starting AI Role-Playing Chat Platform...
echo ====================================
echo.

echo [1/2] Starting Backend Service...
cd /d "%~dp0backend"
if not exist .env (
    echo [Warning] .env not found, copying from .env.example...
    copy .env.example .env >nul
    echo [IMPORTANT] Please configure OPENAI_API_KEY in backend\.env!
    echo.
)

start "AI-Role-Playing-Backend" cmd /c "npm run start:dev"

echo [Waiting] Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Service...
cd /d "%~dp0frontend"
start "AI-Role-Playing-Frontend" cmd /c "npm run dev"

echo.
echo ====================================
echo [Success] Services Started!
echo ====================================
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo.
echo [Tip] Close the command windows to stop services
echo ====================================
pause
