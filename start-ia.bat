@echo off
chcp 65001 >nul
title Narjiss - Hotesse IA du bureau de vente
echo ============================================================
echo    NARJISS IMMOBILIERE - hotesse d'accueil IA
echo ============================================================
echo.

REM --- Le serveur LiveKit est mutualise avec le projet Domiciliation.
REM     Une seule instance suffit : on ne le relance que s'il est absent.
netstat -ano | findstr ":7880" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [1/2] Serveur LiveKit deja en marche sur le port 7880 - reutilise.
) else (
  echo [1/2] Demarrage du serveur LiveKit ^(port 7880^)...
  start "LiveKit" "C:\xampp\htdocs\coursy\livekit-bin\livekit-server.exe" --config "C:\xampp\htdocs\narjiss\livekit.yaml"
  echo       demarrage en cours...
  timeout /t 3 /nobreak >nul
)

echo [2/2] Agent IA ^(hotesse du bureau de vente^)...
start "Narjiss - Hotesse IA" cmd /k "cd /d C:\xampp\htdocs\narjiss\api && python agent.py dev"

echo.
echo ------------------------------------------------------------
echo  Pret. Ouvrir : http://localhost/narjiss/bureaudevente.html
echo.
echo  Rappel : api\.env doit contenir OPENAI_API_KEY.
echo ------------------------------------------------------------
echo.
pause
