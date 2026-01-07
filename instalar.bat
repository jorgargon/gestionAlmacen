@echo off
echo ========================================
echo Instalador - Sistema de Gestion Almacen
echo ========================================
echo.

REM Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no esta instalado
    echo Por favor, instale Python desde https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] Creando entorno virtual...
python -m venv venv

echo [2/3] Activando entorno e instalando dependencias...
call venv\Scripts\activate.bat
pip install -r requirements.txt

echo [3/3] Inicializando base de datos con datos de ejemplo...
python init_db.py --sample

echo.
echo ========================================
echo Instalacion completada correctamente!
echo ========================================
echo.
echo Para iniciar la aplicacion, ejecute: iniciar.bat
echo.
pause
