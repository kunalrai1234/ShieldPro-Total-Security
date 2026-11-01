@echo off
title ShieldPro Total Security
set ELECTRON_RUN_AS_NODE=
cd /d "%LOCALAPPDATA%\Programs\ShieldPro Total Security"
if exist "ShieldPro Total Security.exe" (
    start "" "ShieldPro Total Security.exe"
) else (
    cd /d "D:\project\Antivirus"
    start "" npx electron .
)
exit
