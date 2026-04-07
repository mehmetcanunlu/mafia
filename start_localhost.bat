@echo off
setlocal

set PORT=8000
cd /d "%~dp0"
set "PYTHON_EXE="
set "PYTHON_ARGS="

echo [INFO] Proje klasoru: %CD%
echo [INFO] Localhost baslatiliyor: http://localhost:%PORT%/public/index.html

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -V >nul 2>nul
  if %errorlevel%==0 (
    set "PYTHON_EXE=py"
    set "PYTHON_ARGS=-3"
  )
)

if not defined PYTHON_EXE (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python -V >nul 2>nul
    if %errorlevel%==0 (
      set "PYTHON_EXE=python"
    )
  )
)

if not defined PYTHON_EXE (
  if exist "%LocalAppData%\Programs\Python\Python313\python.exe" (
    "%LocalAppData%\Programs\Python\Python313\python.exe" -V >nul 2>nul
    if %errorlevel%==0 (
      set "PYTHON_EXE=%LocalAppData%\Programs\Python\Python313\python.exe"
    )
  )
)

if not defined PYTHON_EXE (
  if exist "%LocalAppData%\Programs\Python\Python312\python.exe" (
    "%LocalAppData%\Programs\Python\Python312\python.exe" -V >nul 2>nul
    if %errorlevel%==0 (
      set "PYTHON_EXE=%LocalAppData%\Programs\Python\Python312\python.exe"
    )
  )
)

if not defined PYTHON_EXE (
  if exist "%LocalAppData%\Programs\Python\Python311\python.exe" (
    "%LocalAppData%\Programs\Python\Python311\python.exe" -V >nul 2>nul
    if %errorlevel%==0 (
      set "PYTHON_EXE=%LocalAppData%\Programs\Python\Python311\python.exe"
    )
  )
)

if not defined PYTHON_EXE (
  if exist "%LocalAppData%\Programs\Python\Python310\python.exe" (
    "%LocalAppData%\Programs\Python\Python310\python.exe" -V >nul 2>nul
    if %errorlevel%==0 (
      set "PYTHON_EXE=%LocalAppData%\Programs\Python\Python310\python.exe"
    )
  )
)

if not defined PYTHON_EXE (
  echo [HATA] Python bulunamadi. Lutfen Python kurup PATH'e ekleyin.
  pause
  exit /b 1
)

echo [INFO] Python komutu: %PYTHON_EXE% %PYTHON_ARGS%
start "" "http://localhost:%PORT%/public/index.html"
"%PYTHON_EXE%" %PYTHON_ARGS% -m http.server %PORT%
exit /b %errorlevel%

