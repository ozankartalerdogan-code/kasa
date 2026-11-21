@echo off
chcp 65001 >nul
setlocal
set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if exist "%NODE_EXE%" goto nodebulundu
set "NODE_EXE="
for /f "delims=" %%N in ('%SystemRoot%\System32\where.exe $PATH:node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if not defined NODE_EXE goto nodeyok
:nodebulundu
for %%I in ("%NODE_EXE%") do set "NPM_CMD=%%~dpInpm.cmd"
if not exist "%NPM_CMD%" (
  "%NODE_EXE%" "%~dp0src\kurulum.mjs" npm-yok
  goto hata
)
"%NODE_EXE%" "%~dp0src\kurulum.mjs" hazirla
if errorlevel 1 goto hata
set "KASA_KURULUM=%LOCALAPPDATA%\Programs\kasa.yeni"
pushd "%KASA_KURULUM%"
if errorlevel 1 goto hata
call "%NPM_CMD%" ci --ignore-scripts --omit=dev
if errorlevel 1 goto npmhatasi
call "%NPM_CMD%" audit signatures
if errorlevel 1 goto npmhatasi
popd
"%NODE_EXE%" "%~dp0src\kurulum.mjs" etkinlestir
if errorlevel 1 goto hata
"%NODE_EXE%" "%LOCALAPPDATA%\Programs\kasa\src\kurulum.mjs" yol-ekle
if errorlevel 1 goto hata
echo Yeni bir PowerShell penceresi açıp kasa yazın.
echo Open a new PowerShell window and type kasa.
pause
exit /b 0
:npmhatasi
popd
goto hata
:nodeyok
echo Node.js bulunamadı. https://nodejs.org adresinden Node.js 24 LTS kurun.
echo Node.js not found. Install Node.js 24 LTS from https://nodejs.org.
:hata
echo Kurulum tamamlanamadı. Yukarıdaki sonucu kontrol edin.
echo Setup did not complete. Check the output above.
pause
exit /b 1
