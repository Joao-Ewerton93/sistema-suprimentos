@echo off
echo ==========================================
echo   SupplyFlow - Instalando Dependencias
echo ==========================================
echo.

echo [1/2] Instalando dependencias do Backend...
cd /d "%~dp0backend"
call npm install

echo.
echo [2/2] Instalando dependencias do Frontend...
cd /d "%~dp0frontend"
call npm install

echo.
echo ==========================================
echo   Tudo pronto! Execute o run.bat para
echo   iniciar o sistema.
echo ==========================================
pause
