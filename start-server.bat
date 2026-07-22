@echo off
cd /d "%~dp0"
echo ============================================
echo   SIGAP - Local Server
echo ============================================
echo.

REM coba Python dulu (umum sudah terinstall)
where py >nul 2>nul
if %errorlevel%==0 (
    echo [OK] Menjalankan via Python...
    start http://localhost:8080/login.html
    py -3 -m http.server 8080
    goto end
)

where python >nul 2>nul
if %errorlevel%==0 (
    echo [OK] Menjalankan via Python...
    start http://localhost:8080/login.html
    python -m http.server 8080
    goto end
)

REM fallback ke Node
where npx >nul 2>nul
if %errorlevel%==0 (
    echo [OK] Menjalankan via npx serve...
    npx serve -l 8080 .
    start http://localhost:8080/login.html
    goto end
)

echo [GAGAL] Tidak menemukan Python maupun Node.js.
echo Install salah satu:
echo   - Python: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
echo.
pause

:end