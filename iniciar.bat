@echo off
echo Iniciando Sistema de Gestion de Almacen...
echo.
echo La aplicacion estara disponible en: http://localhost:5001
echo Presione Ctrl+C para detener el servidor
echo.

call venv\Scripts\activate.bat
python app.py
