#!/bin/bash
echo "Iniciando Sistema de Gestión de Almacén..."
echo ""
echo "La aplicación estará disponible en: http://localhost:5001"
echo "Presione Ctrl+C para detener el servidor"
echo ""

source venv/bin/activate
python app.py
