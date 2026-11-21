@echo off
chcp 65001 >nul
setlocal
set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if exist "%NODE_EXE%" goto nodebulundu
set "NODE_EXE="
for /f "delims=" %%N in ('%SystemRoot%\System32\where.exe $PATH:node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if not defined NODE_EXE goto nodeyok
:nodebulundu
if not defined LOCALAPPDATA goto hata
for %%D in ("%LOCALAPPDATA%\Programs\kasa") do set "KASA_KURULUM=%%~fD"
"%NODE_EXE%" "%~dp0src\kurulum.mjs" yol-cikar
if errorlevel 1 goto hata
"%NODE_EXE%" "%~dp0src\kurulum.mjs" kaldirma-dogrula
if errorlevel 1 goto hata
rem Doğrulanmış mutlak hedef silinir; çalışma dizini kurulum dışında tutulur.
cd /d "%SystemRoot%"
rem Betiğin kendi dosyası silinse de bu blok birlikte okunup tamamlanır.
(
  "%NODE_EXE%" "%~dp0src\kurulum.mjs" kaldir
  if errorlevel 1 exit /b 1
  echo Kasa programı kaldırıldı. Kasa verisi korundu: "%LOCALAPPDATA%\kasa\"
  echo Kasa has been uninstalled. Your vault data was kept at: "%LOCALAPPDATA%\kasa\"
  echo Kasanızı silmek istiyorsanız önce yedeğiniz olduğundan emin olun, sonra bu klasörü elle silin.
  echo If you want to delete your vault, make sure you have a backup first, then delete that folder manually.
  pause
  exit /b 0
)
:nodeyok
echo Node.js bulunamadı. https://nodejs.org adresinden Node.js 24 LTS kurun.
echo Node.js not found. Install Node.js 24 LTS from https://nodejs.org.
:hata
echo Kaldırma tamamlanamadı. Yukarıdaki sonucu kontrol edin.
echo Uninstall did not complete. Check the output above.
pause
exit /b 1
