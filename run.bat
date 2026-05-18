@echo off
echo ==========================================
echo   Gestao de Suprimentos - Iniciando Sistema
echo ==========================================
echo.

echo [1/2] Iniciando Backend (porta 3001)...
start cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 2 /nobreak >nul

echo [2/2] Iniciando Frontend (porta 3000)...
start cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ==========================================
echo   Sistema iniciado com sucesso!
echo ==========================================
echo.
echo   Portal do Engenheiro:  http://localhost:3000
echo   Painel Administrativo: http://localhost:3000/admin
echo   Backend API:           http://localhost:3001/api/health
echo.
echo   Senha do Admin: supply2026
echo ==========================================
pause
