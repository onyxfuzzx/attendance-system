@echo off
setlocal

echo Stopping Attendance System...

rem Close the cmd windows started by start.bat (Backend/Frontend)
taskkill /FI "WINDOWTITLE eq Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend*" /T /F >nul 2>&1

rem Force kill processes running on port 3000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| find "3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

rem Force kill processes running on port 5173 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| find "5173" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo All instances have been successfully stopped.
endlocal
