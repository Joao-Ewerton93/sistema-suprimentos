@echo off
echo ==========================================
echo Instalando dependencias do Backend...
echo ==========================================
cd backend
call npm install

echo.
echo ==========================================
echo Criando o Frontend (Next.js + Tailwind)...
echo ==========================================
cd ..
call npx -y create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias="@/*" --use-npm

echo.
echo ==========================================
echo Tudo pronto!
echo ==========================================
pause
