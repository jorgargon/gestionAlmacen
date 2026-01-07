# Acceso Remoto con Ngrok - Guía Rápida

## ¿Qué es Ngrok?

Ngrok crea un túnel seguro desde internet a tu localhost, permitiendo que el cliente acceda a la aplicación sin desplegar en servidor.

## Instalación de Ngrok

### Opción 1: Descarga directa (Recomendada)
1. Ve a https://ngrok.com/download
2. Descarga la versión para tu sistema (Mac/Windows/Linux)
3. Descomprime el archivo
4. (Opcional) Crea cuenta gratuita en https://dashboard.ngrok.com/signup

### Opción 2: Con Homebrew (Mac)
```bash
brew install ngrok/ngrok/ngrok
```

### Opción 3: Con Chocolatey (Windows)
```powershell
choco install ngrok
```

## Configuración Rápida

### 1. Autenticación (Opcional pero recomendada)
Si creaste cuenta, obtén tu token en: https://dashboard.ngrok.com/get-started/your-authtoken

```bash
ngrok config add-authtoken TU_TOKEN_AQUI
```

**Ventajas con cuenta gratuita:**
- URLs más estables
- Sin límite de tiempo por sesión
- Estadísticas de uso

### 2. Iniciar el túnel

**Método rápido (sin autenticación):**
```bash
ngrok http 5001
```

**Con autenticación:**
```bash
ngrok http 5001 --region eu
```

Regiones disponibles: `us`, `eu`, `ap`, `au`, `sa`, `jp`, `in`

## Uso para Demo

### Pasos:

1. **Inicia tu aplicación** (debe estar corriendo)
   ```bash
   python app.py
   # o
   ./iniciar.sh
   ```

2. **En otra terminal, inicia ngrok**
   ```bash
   ngrok http 5001
   ```

3. **Comparte la URL**
   
   Ngrok mostrará algo como:
   ```
   Forwarding    https://abc123.ngrok-free.app -> http://localhost:5001
   ```
   
   Envía esa URL `https://abc123.ngrok-free.app` a tu cliente.

4. **El cliente accede** a esa URL desde su navegador
   - ⚠️ En plan gratuito aparecerá un aviso de ngrok (click "Visit Site")

5. **Para terminar**: Ctrl+C en la terminal de ngrok

## Script Automatizado

### Mac/Linux:
```bash
./demo-remoto.sh
```

### Windows:
```cmd
demo-remoto.bat
```

## Seguridad y Mejores Prácticas

### ✅ Recomendaciones:

1. **Solo para demos**: No dejes ngrok corriendo permanentemente
2. **URLs únicas**: Cada sesión genera una URL diferente (gratis)
3. **Contraseña básica**: Ngrok soporta auth básica:
   ```bash
   ngrok http 5001 --basic-auth "usuario:password"
   ```
4. **Firewall de Flask**: La app solo acepta conexiones via ngrok
5. **Cierra después de la demo**: Ctrl+C detiene el acceso inmediatamente

### ⚠️ Limitaciones Plan Gratuito:

- URL cambia cada vez que reinicias ngrok
- Límite de 40 conexiones/minuto
- Banner de "ngrok" al acceder
- 1 túnel simultáneo

### 💰 Plan Pago (opcional):

- URLs fijas (subdomain personalizado)
- Sin banner
- Múltiples túneles
- Más regiones

## Alternativas a Ngrok

Si no quieres usar ngrok:

1. **Localtunnel** (gratis, open source)
   ```bash
   npm install -g localtunnel
   lt --port 5001
   ```

2. **Cloudflare Tunnel** (gratis)
   ```bash
   cloudflared tunnel --url http://localhost:5001
   ```

3. **Serveo** (gratis, sin instalación)
   ```bash
   ssh -R 80:localhost:5001 serveo.net
   ```

## Troubleshooting

**Problema**: "command not found: ngrok"
- Solución: Añade ngrok al PATH o usa ruta completa

**Problema**: Cliente ve error de conexión
- Verifica que la app esté corriendo en localhost:5001
- Comprueba que ngrok esté conectado (debe decir "online")

**Problema**: URL muy lenta
- Cambia región con `--region eu`
- Verifica tu conexión a internet

## Ejemplo Completo

```bash
# Terminal 1: Inicia la aplicación
cd /Users/jordigarcia/programas/gestionAlmacen
source venv/bin/activate
python app.py

# Terminal 2: Inicia ngrok
ngrok http 5001 --region eu

# Copiar la URL "Forwarding" y enviar al cliente
# Ejemplo: https://abc123.ngrok-free.app
```

## Para Producción

⚠️ **Ngrok NO es para producción**. Para uso real considera:
- Servidor dedicado (DigitalOcean, AWS, Azure)
- Plataforma PaaS (Heroku, Railway, Render)
- VPS con dominio propio
