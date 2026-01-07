# Sistema de Gestión de Almacén - Guía de Instalación para Cliente

## Requisitos Previos
- Python 3.8 o superior
- Conexión a internet (solo para la instalación inicial)

## Instalación en Windows

1. **Descargar el proyecto**
   - Descomprimir el archivo ZIP en una carpeta (ej: `C:\gestionAlmacen`)

2. **Abrir PowerShell o CMD en la carpeta del proyecto**
   - Click derecho en la carpeta → "Abrir en Terminal" o "Abrir ventana de PowerShell aquí"

3. **Ejecutar el instalador automático**
   ```
   instalar.bat
   ```

4. **Iniciar la aplicación**
   ```
   iniciar.bat
   ```

5. **Acceder a la aplicación**
   - Abrir navegador en: http://localhost:5001
   - Para detener: presionar Ctrl+C en la terminal

## Instalación en Mac/Linux

1. **Descomprimir el proyecto**
   ```bash
   unzip gestionAlmacen.zip
   cd gestionAlmacen
   ```

2. **Ejecutar el instalador**
   ```bash
   chmod +x instalar.sh
   ./instalar.sh
   ```

3. **Iniciar la aplicación**
   ```bash
   ./iniciar.sh
   ```

4. **Acceder**: http://localhost:5001

## Datos de Ejemplo

El sistema incluye datos de ejemplo:
- 6 productos (materias primas, envases, producto acabado)
- 3 clientes

Puedes eliminarlos y crear los tuyos desde la interfaz web.

## Resetear Base de Datos

Si quieres empezar desde cero:
```bash
python init_db.py --reset
```

## Soporte

Para cualquier problema, contactar con el desarrollador.
