@echo off
title Eagle Eye(TM) Diagnostics & Tolerance Margin Analyzer
cd /d "%~dp0"

echo ==============================================================
echo   EAGLE EYE(TM) DIAGNOSTICS & TOLERANCE MARGIN ANALYZER
echo   CDU Factory Test Verification Platform
echo ==============================================================
echo.

:: Check for native Tauri 2.0 (Rust) standalone executable
if exist "%~dp0EagleEye-Standalone-App\EagleEye-Analyzer.exe" (
    echo Launching native Tauri 2.0 [Rust] Standalone Desktop Application...
    start "" "%~dp0EagleEye-Standalone-App\EagleEye-Analyzer.exe"
    exit /b
)

if exist "%~dp0src-tauri\target\release\eagle-eye-analyzer.exe" (
    echo Launching native Tauri 2.0 [Rust] Standalone Desktop Application...
    start "" "%~dp0src-tauri\target\release\eagle-eye-analyzer.exe"
    exit /b
)

:: Standalone Native Window via Microsoft Edge or Chrome (--app mode)
set "APP_URL=http://localhost:3000/"

set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE_PATH%" set "EDGE_PATH=C:\Program Files\Microsoft\Edge\Application\msedge.exe"

set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_PATH%" set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if exist "%EDGE_PATH%" (
    echo Launching standalone Windows Desktop App window via Microsoft Edge...
    start "" "%EDGE_PATH%" --app="%APP_URL%" --window-size=1680,980
    exit /b
)

if exist "%CHROME_PATH%" (
    echo Launching standalone Windows Desktop App window via Google Chrome...
    start "" "%CHROME_PATH%" --app="%APP_URL%" --window-size=1680,980
    exit /b
)

echo Opening in default browser...
start "" "%APP_URL%"
exit /b
