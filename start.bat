@echo off
echo ===================================
echo Stopping previous instances...
echo ===================================
call "%~dp0stop.bat"

echo.
echo ===================================
echo Starting Attendance System...
echo ===================================
echo Keep this window open!
echo.
start "Backend" cmd /k "cd %~dp0backend && npm run dev"
timeout /t 3 /nobreak
start "Frontend" cmd /k "cd %~dp0frontend && npm run dev"
echo Servers started!
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
pause