@echo off
title Docs Server - http://localhost:8080
pushd %~dp0

echo.
echo =============================================
echo   Starting dotnet-serve for the /docs folder
echo =============================================
echo.
echo URL  : http://localhost:8080
echo Path : %CD%\docs
echo.
echo Press Ctrl + C in this window to stop the server...
echo =============================================
echo.

dotnet-serve --directory ./docs --port 8080 --open-browser

echo.
echo Server has stopped.
pause