@echo off
title Boostly local server
cd /d "%~dp0"
echo.
echo  Boostly - starting local server...
echo  Then open:  http://localhost:3000/signup.html
echo.
echo  Press Ctrl+C to stop.
echo.
where py >nul 2>&1
if %errorlevel%==0 (
  py -m http.server 3000
  goto :done
)
where python >nul 2>&1
if %errorlevel%==0 (
  python -m http.server 3000
  goto :done
)
where npx >nul 2>&1
if %errorlevel%==0 (
  npx --yes serve -l 3000 .
  goto :done
)
echo.
echo  Could not find Python or Node.
echo  Double-click signup.html instead - auth now works in the browser
echo  (data may reset when you close the tab if storage is limited).
echo.
pause
:done
