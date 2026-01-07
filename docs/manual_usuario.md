# Manual de Usuario - Sistema de Gestión de Almacén

## Índice

1. [Introducción](#introducción)
2. [Dashboard](#dashboard)
3. [Productos](#productos)
4. [Recepciones](#recepciones)
5. [Inventario y Lotes](#inventario-y-lotes)
6. [Sistema de Ubicaciones](#sistema-de-ubicaciones)
7. [Órdenes de Producción](#órdenes-de-producción)
8. [Envíos (Expediciones)](#envíos-expediciones)
9. [Devoluciones](#devoluciones)
10. [Trazabilidad](#trazabilidad)
11. [Clientes](#clientes)
12. [Alertas](#alertas)

---

## Introducción

Este sistema permite gestionar el inventario de un almacén con trazabilidad completa desde la recepción de materias primas hasta la expedición de productos acabados.

### Tipos de Producto
- **Materia Prima**: Ingredientes usados en producción (ej: aceites, extractos)
- **Envases**: Materiales de empaquetado (ej: frascos, tapones)
- **Producto Acabado**: Productos terminados listos para venta

### Política FEFO
El sistema aplica **First Expired, First Out**: los lotes que caducan antes se proponen primero.

---

## Dashboard

El dashboard muestra indicadores clave del almacén:

| Indicador | Descripción |
|-----------|-------------|
| **Stock Bajo** | Productos por debajo del stock mínimo configurado |
| **Caducidad Próxima** | Lotes que caducan en los próximos 30 días |
| **Caducados** | Lotes con fecha de caducidad vencida |
| **Bloqueados** | Lotes marcados como bloqueados |

> **Tip**: Haz clic en cualquier indicador para ver los lotes afectados en Inventario.

---

## Productos

### Crear Producto

1. Ve a **Productos** en el menú lateral
2. Clic en **+ Nuevo Producto**
3. Completa los campos:
   - **Código**: Identificador único (ej: MP-001)
   - **Nombre**: Nombre descriptivo
   - **Tipo**: Materia Prima / Envase / Producto Acabado
   - **Unidad de almacenamiento**: kg, L, ud, g
   - **Densidad**: Para convertir entre L y kg (solo MMPP)
   - **Stock mínimo**: Para alertas de reposición

### Campos según tipo

| Campo | Materia Prima | Envase | Prod. Acabado |
|-------|:-------------:|:------:|:-------------:|
| Densidad | ✅ | ❌ | ❌ |
| Días hasta caducidad | ✅ | ❌ | ✅ |
| Unidad consumo (kg/ud) | ✅ | ✅ | ❌ |

---

## Recepciones

Registra la entrada de **Materias Primas** y **Envases** al almacén.

### Crear Recepción

1. Ve a **Recepciones** → **+ Nueva Recepción**
2. Indica el **proveedor** (opcional)
3. Añade líneas con:
   - Producto
   - Número de lote (del proveedor)
   - Cantidad y unidad
   - Fecha de fabricación y caducidad
4. Guardar

> **Importante**: El stock entra en ubicación **REC** (Recepción) y debe transferirse a **LIB** (Liberado) tras el control de calidad.

---

## Inventario y Lotes

### Vista de Inventario

Muestra todos los productos agrupados con su stock total. Cada fila representa un lote en una ubicación específica.

| Columna | Descripción |
|---------|-------------|
| Lote | Número de lote |
| Caducidad | Fecha de vencimiento |
| Ubicación | Código de ubicación (LIB, REC, DEV, NC, FAB) |
| Cantidad | Stock en esa ubicación |
| Estado | Normal / Próximo a caducar / Caducado |
| Disponible | Si el lote puede usarse |

### Acciones por Lote

- **📦 Transferir**: Mover stock entre ubicaciones
- **Ajustar**: Corregir cantidad (mermas, inventarios físicos)
- **Bloquear/Desbloquear**: Impedir uso del lote

---

## Sistema de Ubicaciones

El stock se distribuye en ubicaciones que determinan su disponibilidad:

| Código | Nombre | Disponible | Uso |
|--------|--------|:----------:|-----|
| **REC** | Recepción | ❌ | Entrada de compras (pendiente de control) |
| **LIB** | Liberado | ✅ | Stock disponible para producción/envío |
| **DEV** | Devoluciones | ❌ | Productos devueltos por clientes |
| **NC** | No Conforme | ❌ | Stock defectuoso o rechazado |
| **FAB** | Fabricación Pendiente | ❌ | Productos recién fabricados (pendiente control) |

### Transferir Stock

1. En Inventario, haz clic en **📦 Transferir** del lote
2. Selecciona la **ubicación origen** (donde hay stock)
3. Selecciona la **ubicación destino**
4. Indica la **cantidad** a mover
5. Confirma

### Flujos habituales

```
Compras:    REC → Control Calidad → LIB
Producción: FAB → Control Calidad → LIB
Devolución: DEV → Revisión → LIB (OK) o NC (defectuoso)
```

---

## Órdenes de Producción

Gestiona la fabricación de **Productos Acabados** consumiendo materias primas y envases.

### Estados de una Orden

| Estado | Descripción |
|--------|-------------|
| Borrador | En preparación, se pueden añadir productos |
| En Progreso | Orden en ejecución |
| Completada | Finalizada correctamente |
| Cancelada | Orden anulada |

### Crear Orden de Producción

1. Ve a **Producción** → **+ Nueva Orden**
2. Selecciona el **producto acabado** a fabricar
3. Indica la **cantidad** a producir
4. Guarda (estado: Borrador)

### Añadir Materiales

1. Abre la orden → **+ Añadir Material**
2. Selecciona producto (MMPP o Envase)
3. Selecciona lote (solo muestra stock en **LIB**)
4. Indica cantidad a consumir
5. Asigna a un producto acabado específico o "Común"

### Cerrar Orden

1. Abre la orden → **Cerrar Orden**
2. El sistema:
   - Crea los lotes de producto acabado en ubicación **FAB**
   - Consume los materiales de ubicación **LIB**
   - Registra todos los movimientos

> **Nota**: Los productos fabricados aparecen en FAB. Transfiérelos a LIB tras el control de calidad.

---

## Envíos (Expediciones)

Registra la salida de **Productos Acabados** hacia clientes.

### Crear Envío

1. Ve a **Envíos** → **+ Nuevo Envío**
2. Selecciona o crea un **cliente**
3. Indica **número de albarán** y **fecha**
4. Añade líneas:
   - Producto (solo acabados)
   - Lote (solo muestra stock en **LIB**)
   - Cantidad
5. Guardar

> **Importante**: Solo se puede expedir stock de ubicación **LIB** (Liberado).

---

## Devoluciones

Registra productos que vuelven al almacén desde clientes.

### Motivos de Devolución

| Motivo | Descripción |
|--------|-------------|
| **Devolución de Cliente** | Cliente rechaza o retorna producto |
| **Retirada del Mercado** | Recall por incidencia de calidad |
| **Problema de Calidad** | Producto defectuoso detectado |

### Crear Devolución

1. Ve a **Devoluciones** → **+ Nueva Devolución**
2. Selecciona **cliente** (opcional)
3. Indica **motivo**
4. Añade líneas con producto, lote y cantidad
5. Guardar

> **Resultado**: El stock entra en ubicación **DEV**. Revisa y transfiere a LIB (si está OK) o NC (si está defectuoso).

---

## Trazabilidad

Permite rastrear el origen y destino de cualquier lote.

### Consultar Trazabilidad

1. En cualquier tabla, haz clic en el **número de lote**
2. Se muestra:
   - **Datos del lote**: Producto, fechas, stock, ubicaciones
   - **Movimientos**: Historial de entradas y salidas
   - **Origen** (para acabados): Materiales consumidos
   - **Destino** (para MMPP/envases): En qué productos se usó

### Tipos de Movimiento

| Tipo | Descripción |
|------|-------------|
| Entrada | Recepción de compras |
| Expedición | Envío a cliente |
| Producción | Consumo o creación en fabricación |
| Devolución | Retorno de cliente |
| Transferencia | Movimiento entre ubicaciones |
| Ajuste | Corrección manual de stock |

---

## Clientes

Gestiona los destinatarios de los envíos.

### Crear Cliente

1. Ve a **Clientes** → **+ Nuevo Cliente**
2. Completa: Nombre, Email, Teléfono, Dirección
3. El código se genera automáticamente (CLI-0001, etc.)

> **Tip**: También puedes crear clientes al vuelo desde el formulario de envío.

---

## Alertas

El sistema genera alertas automáticas que se muestran en el Dashboard.

| Tipo | Severidad | Condición |
|------|-----------|-----------|
| **Stock Bajo** | ⚠️ Warning | Stock total < stock mínimo configurado |
| **Próximo a Caducar** | ⚠️ Warning | Caduca en menos de 30 días |
| **Caducado** | 🔴 Crítico | Fecha de caducidad pasada |
| **Bloqueado** | 🔴 Crítico | Lote marcado como bloqueado |

### Acciones recomendadas

- **Stock Bajo**: Realizar pedido de reposición
- **Próximo a Caducar**: Priorizar uso (FEFO)
- **Caducado**: Transferir a NC, evaluar destrucción
- **Bloqueado**: Revisar causa, desbloquear o transferir a NC

---

## Atajos y Tips

| Acción | Cómo |
|--------|------|
| Buscar en tablas | Usa el campo de búsqueda del navegador (Cmd+F) |
| Recargar datos | F5 o clic en el menú lateral |
| Ver detalles | Clic en el código o número de lote |

---

*Manual generado el 22/12/2024*
