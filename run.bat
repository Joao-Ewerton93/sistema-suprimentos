@echo off
echo ==========================================
echo Iniciando o SupplyFlow (Backend + Frontend)
echo ==========================================

echo Iniciando Backend na porta 3001...
start cmd /k "cd backend && npm run dev"

echo Iniciando Frontend na porta 3000...
start cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo O servidor Backend abrira em uma janela separada.
echo O servidor Frontend abrira em outra janela separada.
echo Acesse o sistema no seu navegador: http://localhost:3000
echo ==========================================
pause
