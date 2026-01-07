# Sistema de Gestión de Almacén

Sistema completo de gestión de stocks para fabricante de productos cosméticos con control de lotes, trazabilidad completa y alertas automáticas.

## Características

- ✅ Maestro de productos (materias primas, envases, productos acabados)
- ✅ Gestión de lotes con número de lote y fecha de caducidad
- ✅ Órdenes de producción con consumo automático de materiales
- ✅ Control de inventario en tiempo real
- ✅ Envíos a clientes con validación de stock
- ✅ Trazabilidad bidireccional completa
- ✅ Alertas automáticas de stock mínimo y caducidad
- ✅ Stock caducado excluido automáticamente

## Requisitos

- Python 3.8+
- pip

## Instalación

1. **Crear entorno virtual:**
```bash
cd /Users/jordigarcia/programas/gestionAlmacen
python3 -m venv venv
source venv/bin/activate
```

2. **Instalar dependencias:**
```bash
pip install -r requirements.txt
```

3. **Inicializar base de datos:**
```bash
# Crear base de datos
python init_db.py

# O crear con datos de ejemplo
python init_db.py --sample
```

## Ejecución

```bash
python app.py
```

La aplicación estará disponible en: **http://localhost:5000**

## Estructura del Proyecto

```
gestionAlmacen/
├── app.py                 # Aplicación principal Flask
├── models.py              # Modelos de base de datos
├── config.py              # Configuración
├── init_db.py             # Script de inicialización
├── requirements.txt       # Dependencias
├── routes/                # Endpoints API
│   ├── products.py        # Gestión de productos
│   ├── lots.py            # Gestión de lotes
│   ├── inventory.py       # Consultas de inventario
│   ├── production_orders.py  # Órdenes de producción
│   ├── customers.py       # Gestión de clientes
│   ├── shipments.py       # Envíos a clientes
│   ├── traceability.py    # Trazabilidad
│   └── alerts.py          # Sistema de alertas
├── templates/
│   └── index.html         # Interfaz web
└── static/
    ├── css/
    │   └── styles.css     # Estilos modernos
    └── js/
        └── main.js        # Lógica de aplicación

```

## API Endpoints

### Productos
- `GET /api/products` - Listar productos
- `POST /api/products` - Crear producto
- `PUT /api/products/<id>` - Actualizar producto

### Lotes
- `GET /api/lots` - Listar lotes
- `POST /api/lots` - Crear lote (genera movimiento de entrada)
- `GET /api/lots/<id>/movements` - Ver movimientos de un lote

### Inventario
- `GET /api/inventory?available_only=true` - Consultar inventario disponible

### Órdenes de Producción
- `GET /api/production-orders` - Listar órdenes
- `POST /api/production-orders` - Crear orden
- `POST /api/production-orders/<id>/materials` - Añadir material
- `POST /api/production-orders/<id>/close` - Cerrar orden (crea lote y consume materiales)

### Clientes
- `GET /api/customers` - Listar clientes
- `POST /api/customers` - Crear cliente

### Envíos
- `GET /api/shipments` - Listar envíos
- `POST /api/shipments` - Crear envío (valida stock y crea movimientos)

### Trazabilidad
- `GET /api/traceability/lot/<id>` - Clientes que recibieron un lote
- `GET /api/traceability/lot/<id>/reverse` - Productos acabados que usaron una materia prima
- `GET /api/traceability/customer/<id>` - Lotes recibidos por un cliente

### Alertas
- `GET /api/alerts` - Listar alertas
- `POST /api/alerts/generate` - Generar alertas automáticas
- `PUT /api/alerts/<id>/dismiss` - Descartar alerta

## Flujo de Trabajo Típico

### 1. Crear Productos
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "code": "MP-001",
    "name": "Agua destilada",
    "type": "raw_material",
    "min_stock": 100
  }'
```

### 2. Registrar Lotes
```bash
curl -X POST http://localhost:5000/api/lots \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "lot_number": "AGUA-001",
    "manufacturing_date": "2024-12-01",
    "expiration_date": "2025-12-01",
    "initial_quantity": 100,
    "unit": "L"
  }'
```

### 3. Crear Orden de Producción
```bash
curl -X POST http://localhost:5000/api/production-orders \
  -H "Content-Type: application/json" \
  -d '{
    "order_number": "OP-2024-001",
    "finished_product_id": 6,
    "finished_lot_number": "CREMA-001",
    "target_quantity": 100,
    "unit": "units",
    "production_date": "2024-12-03",
    "expiration_date": "2025-12-03"
  }'
```

### 4. Añadir Materiales a la Orden
```bash
curl -X POST http://localhost:5000/api/production-orders/1/materials \
  -H "Content-Type: application/json" \
  -d '{
    "lot_id": 1,
    "quantity_consumed": 10,
    "unit": "L"
  }'
```

### 5. Cerrar Orden (Produce Lote y Consume Materiales)
```bash
curl -X POST http://localhost:5000/api/production-orders/1/close \
  -H "Content-Type: application/json" \
  -d '{
    "produced_quantity": 100
  }'
```

### 6. Crear Envío a Cliente
```bash
curl -X POST http://localhost:5000/api/shipments \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "shipment_number": "ALB-001",
    "shipment_date": "2024-12-03",
    "details": [
      {
        "lot_id": 6,
        "quantity": 30,
        "unit": "units"
      }
    ]
  }'
```

### 7. Consultar Trazabilidad
```bash
# Trazabilidad directa: ¿Qué clientes recibieron este lote?
curl http://localhost:5000/api/traceability/lot/6

# Trazabilidad inversa: ¿En qué productos se usó esta materia prima?
curl http://localhost:5000/api/traceability/lot/1/reverse
```

### 8. Generar Alertas
```bash
curl -X POST http://localhost:5000/api/alerts/generate
```

## Características de Seguridad

- **Stock caducado**: Los lotes caducados se marcan automáticamente como no disponibles
- **Validaciones**: No se permite usar lotes caducados en producción ni envíos
- **Integridad**: Las transacciones de stock son atómicas (se revierten en caso de error)
- **Trazabilidad**: Registro completo de todos los movimientos de stock

## Soporte

Para consultas o problemas, revisar la documentación de la API o contactar al desarrollador.

---

**Versión**: 1.0.0  
**Autor**: Sistema de Gestión desarrollado con Flask + SQLAlchemy
