@echo off
title Aegis Cybersecurity Suite
set ELECTRON_RUN_AS_NODE=
cd /d "%LOCALAPPDATA%\Programs\Aegis Antivirus"
if exist "Aegis Antivirus.exe" (
    start "" "Aegis Antivirus.exe"
) else (
    cd /d "D:\project\Antivirus"
    start "" npx electron .
)
exit
