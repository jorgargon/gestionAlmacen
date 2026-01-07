@echo off
echo =========================================
echo   Demo Remota - Gestion de Almacen
echo =========================================
echo.

REM Verificar ngrok
where ngrok >nul 2>&1
if errorlevel 1 (
    echo ERROR: ngrok no esta instalado
    echo.
    echo Instalalo con:
    echo   choco install ngrok
    echo.
    echo O descargalo de: https://ngrok.com/download
    pause
    exit /b 1
)

echo Verificando que la aplicacion este corriendo en puerto 5001...
netstat -ano | findstr :5001 | findstr LISTENING >nul
if errorlevel 1 (
    echo.
    echo AVISO: La aplicacion NO esta corriendo en el puerto 5001
    echo.
    echo Por favor, en otra terminal ejecuta:
    echo   iniciar.bat
    echo.
    pause
)

echo.
echo Iniciando tunel ngrok...
echo.
echo INSTRUCCIONES:
echo   1. Copia la URL que aparece en 'Forwarding'
echo   2. Enviala a tu cliente
echo   3. El cliente accede desde su navegador
echo   4. Para terminar: Ctrl+C
echo.
echo =========================================
echo.

ngrok http 5001 --region eu
