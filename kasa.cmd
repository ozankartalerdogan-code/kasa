@echo off
chcp 65001 >nul
setlocal
set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if exist "%NODE_EXE%" goto calistir
set "NODE_EXE="
rem $PATH: aramayi yalniz PATH klasorleriyle sinirlar; mevcut klasor onceligi yoktur.
for /f "delims=" %%N in ('%SystemRoot%\System32\where.exe $PATH:node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if defined NODE_EXE goto calistir
echo Node.js bulunamadı. https://nodejs.org adresinden Node.js 24 LTS kurun.
echo Node.js not found. Install Node.js 24 LTS from https://nodejs.org.
pause
exit /b 1
:calistir
if not "%~1"=="" (
  "%NODE_EXE%" "%~dp0src\kurulum.mjs" arguman
  exit /b 1
)
"%NODE_EXE%" "%~dp0src\baslat.mjs"
set "KASA_CIKIS=%ERRORLEVEL%"
if errorlevel 1 pause
exit /b %KASA_CIKIS%
