@echo off
chcp 65001 >nul
title AlexYang Blog - Local Preview
cd /d "%~dp0"

set "PY="
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PY=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not defined PY if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set "PY=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if not defined PY if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PY=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
if not defined PY (
    for /f "delims=" %%i in ('where python 2^>nul') do if not defined PY set "PY=%%i"
)
if not defined PY (
    for /f "delims=" %%i in ('where py 2^>nul') do if not defined PY set "PY=%%i"
)

if not defined PY (
    echo [ERROR] Python not found.
    echo.
    echo   Previewing needs a small local web server, because browsers
    echo   refuse to read files over file:// for security reasons.
    echo.
    echo   Two options:
    echo     1. Install Python from https://www.python.org/downloads/
    echo        then run this file again
    echo     2. Skip previewing locally - push to GitHub and look at the
    echo        live site instead
    echo.
    pause
    exit /b 1
)

echo ==================================================
echo    AlexYang Blog - local preview
echo --------------------------------------------------
echo    URL   : http://localhost:8080/
echo    Stop  : press Ctrl+C here, or close this window
echo --------------------------------------------------
echo    Keep this window OPEN while you browse.
echo ==================================================
echo.

start "" "http://localhost:8080/"
"%PY%" -m http.server 8080

echo.
echo Preview stopped.
pause
