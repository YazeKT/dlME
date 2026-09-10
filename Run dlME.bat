@echo off
setlocal
set ELECTRON_RUN_AS_NODE=
cd /d "%~dp0"
if exist "%LOCALAPPDATA%\Programs\dlME\dlME.exe" (
  start "" "%LOCALAPPDATA%\Programs\dlME\dlME.exe"
  exit /b 0
)
if exist "release\0.9.0\win-unpacked\dlME.exe" (
  start "" "release\0.9.0\win-unpacked\dlME.exe"
  exit /b 0
)
echo The dlME beta build is missing. Run npm run package:dir, or use the installer.
pause
exit /b 1
