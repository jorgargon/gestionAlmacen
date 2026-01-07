#!/bin/bash
echo "========================================"
echo "Instalador - Sistema de Gestión Almacén"
echo "========================================"
echo ""

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 no está instalado"
    echo "Por favor, instale Python 3 desde https://www.python.org/downloads/"
    exit 1
fi

echo "[1/3] Creando entorno virtual..."
python3 -m venv venv

echo "[2/3] Activando entorno e instalando dependencias..."
source venv/bin/activate
pip install -r requirements.txt

echo "[3/3] Inicializando base de datos con datos de ejemplo..."
python init_db.py --sample

echo ""
echo "========================================"
echo "¡Instalación completada correctamente!"
echo "========================================"
echo ""
echo "Para iniciar la aplicación, ejecute: ./iniciar.sh"
echo ""
