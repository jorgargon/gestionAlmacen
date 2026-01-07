#!/bin/bash

echo "========================================="
echo "  Demo Remota - Gestión de Almacén"
echo "========================================="
echo ""

# Verificar que la aplicación esté corriendo
if ! lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  AVISO: La aplicación NO está corriendo en el puerto 5001"
    echo ""
    echo "Por favor, en otra terminal ejecuta:"
    echo "  ./iniciar.sh"
    echo ""
    read -p "Presiona ENTER cuando la aplicación esté corriendo..."
fi

# Verificar ngrok
if ! command -v ngrok &> /dev/null; then
    echo "❌ ERROR: ngrok no está instalado"
    echo ""
    echo "Instálalo con:"
    echo "  brew install ngrok/ngrok/ngrok"
    echo ""
    echo "O descárgalo de: https://ngrok.com/download"
    exit 1
fi

echo "✅ Iniciando túnel ngrok..."
echo ""
echo "📋 INSTRUCCIONES:"
echo "   1. Copia la URL que aparece en 'Forwarding'"
echo "   2. Envíala a tu cliente"
echo "   3. El cliente accede desde su navegador"
echo "   4. Para terminar: Ctrl+C"
echo ""
echo "========================================="
echo ""

# Iniciar ngrok (región EU para mejor latencia en España)
ngrok http 5001 --region eu
