#!/bin/bash
# Script para iniciar el servidor de gestión de almacén

cd "$(dirname "$0")"
source venv/bin/activate
python app.py
