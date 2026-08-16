@echo off
echo ====================================
echo  AI Career Copilot - Dev Start
echo ====================================

echo Starting backend server...
start cmd /k "cd server && npm run dev"

timeout /t 2 /nobreak > nul

echo Starting frontend...
start cmd /k "cd client && npm run dev"

echo.
echo Both services starting...
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Press any key to open in browser...
pause > nul
start http://localhost:5173
