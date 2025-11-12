@echo off

REM Establece el directorio de trabajo en la raiz del proyecto.
cd /d "%~dp0" 

echo.
echo --- INICIANDO AUTOMATIZACION ---
echo.

REM 1. INSTALAR DEPENDENCIAS
echo Instalando dependencias (npm install)...
pushd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Fallo la instalacion de NPM. Verifique Node.js.
    pause 
    exit /b 1
)
popd

REM 2. INICIALIZAR USUARIO ADMIN
echo Creando usuario administrador (seedAdmin.js)...
pushd backend
node scripts/seedAdmin.js
popd

REM 3. ABRIR EL FRONTEND PRIMERO
echo Abriendo Frontend (index.html) en el navegador.
start "" "frontend\index.html"

REM 4. INICIAR BACKEND (Bloquea la terminal)
echo.
echo ========================================================
echo PASO FINAL: INICIANDO SERVIDOR BACKEND (API)
echo ========================================================
echo.
pushd backend
npm start 
popd

REM Esta linea nunca se alcanza mientras el servidor este activo
exit /b 0
```eof