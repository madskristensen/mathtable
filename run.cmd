@echo off
title Docs Live Server - http://localhost:8080 (Live Reload ON)

:: Go to the folder where run.cmd lives
pushd %~dp0

echo.
echo =============================================
echo   LiveReloadServer for /docs folder
echo =============================================

:: Auto-install (safe to run every time - does nothing if already installed)
echo [INFO] Checking/installing LiveReloadServer...
dotnet tool install -g LiveReloadServer >nul 2>&1

echo.
echo URL        : http://localhost:8080
echo Folder     : %CD%\docs
echo Live Reload: ENABLED ^(any file change instantly refreshes the browser^)
echo.
echo Press Ctrl + C in this window to stop the server...
echo =============================================
echo.

:: Start the server
LiveReloadServer --WebRoot ./docs --port 8080 --openBrowser

echo.
echo Server has stopped.
pause