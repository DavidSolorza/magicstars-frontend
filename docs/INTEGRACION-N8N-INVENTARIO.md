# 🔗 Integración de Inventario con n8n

Esta documentación explica cómo conectar el sistema de inventario de MagicStars Frontend con workflows de n8n.

## 📋 Índice

1. [Endpoints Disponibles](#endpoints-disponibles)
2. [Consultar Inventario (GET)](#consultar-inventario-get)
3. [Operaciones de Inventario (POST)](#operaciones-de-inventario-post)
4. [Ejemplos de Uso en n8n](#ejemplos-de-uso-en-n8n)
5. [Webhook de Railway](#webhook-de-railway)

---

## 🌐 Endpoints Disponibles

### Base URL
```
https://tu-dominio.com/api/inventory
```

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/inventory` | Consultar inventario con filtros |
| `POST` | `/api/inventory` | Crear, editar o eliminar productos |
| `POST` | `/api/inventory/dictionary` | Agregar productos existentes al diccionario |
| `POST` | `/api/inventory/dictionary/combos` | Agregar combos existentes al diccionario |

---

## 📥 Consultar Inventario (GET)

Permite que n8n consulte el inventario actual desde el frontend.

### URL
```
GET /api/inventory
```

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `tienda` | string | No | Filtrar por nombre de tienda (ej: "ALL STARS") |
| `search` | string | No | Buscar por nombre de producto |
| `limit` | number | No | Límite de resultados (por defecto: sin límite) |

### Ejemplo de Request

```http
GET /api/inventory?tienda=ALL STARS&limit=100
```

### Ejemplo de Response

```json
{
  "success": true,
  "data": [
    {
      "idx": 1,
      "producto": "Collar Orion Talla M",
      "cantidad": 12,
      "tienda": "ALL STARS"
    },
    {
      "idx": 2,
      "producto": "Anillo Luna Talla S",
      "cantidad": 8,
      "tienda": "ALL STARS"
    }
  ],
  "count": 2,
  "filters": {
    "tienda": "ALL STARS",
    "search": null,
    "limit": 100
  },
  "timestamp": "2024-12-01T10:30:00.000Z"
}
```

### Configuración en n8n

1. **Nodo HTTP Request**
   - Method: `GET`
   - URL: `https://tu-dominio.com/api/inventory?tienda=ALL STARS`
   - Response Format: `JSON`

---

## 📚 Agregar al Diccionario (POST)

Permite que n8n agregue productos existentes al diccionario de productos.

### URL
```
POST /api/inventory/dictionary
```

### Headers
```
Content-Type: application/json
```

### Body

```json
{
  "producto": "Collar Orion Talla M"
}
```

**Campos requeridos:**
- `producto` (string): Nombre del producto que **ya existe** en la base de datos

**Nota importante:** El producto debe existir previamente en la base de datos. Este endpoint solo agrega productos existentes al diccionario.

### Ejemplo de Request

```http
POST /api/inventory/dictionary
Content-Type: application/json

{
  "producto": "Collar Orion Talla M"
}
```

### Ejemplo de Response (Éxito)

```json
{
  "success": true,
  "message": "Producto agregado al diccionario exitosamente",
  "data": {
    // Respuesta del webhook de Railway
  },
  "producto": "Collar Orion Talla M",
  "timestamp": "2024-12-01T10:30:00.000Z"
}
```

### Ejemplo de Response (Error)

```json
{
  "success": false,
  "error": "Campo requerido faltante o inválido",
  "required": ["producto"],
  "received": [],
  "message": "El campo \"producto\" es obligatorio y debe ser un string no vacío"
}
```

### Configuración en n8n

1. **Nodo HTTP Request**
   - Method: `POST`
   - URL: `https://tu-dominio.com/api/inventory/dictionary`
   - Body (JSON):
     ```json
     {
       "producto": "{{ $json.producto }}"
     }
     ```

---

## 📦 Agregar Combos al Diccionario (POST)

Permite que n8n agregue combos existentes al diccionario con sus productos asociados.

### URL
```
POST /api/inventory/dictionary/combos
```

### Headers
```
Content-Type: application/json
```

### Body

```json
{
  "combo_existente": "Combo Estrella",
  "combo_nuevo": ["Collar Orion Talla M", "Anillo Luna Talla S"]
}
```

**Campos requeridos:**
- `combo_existente` (string): Nombre del combo sin cantidades (debe existir en la base de datos)
- `combo_nuevo` (array): Array de strings con los nombres de los productos que van en el combo

**Nota importante:** El combo debe existir previamente en la base de datos. Este endpoint agrega el combo al diccionario con sus productos asociados.

### Ejemplo de Request

```http
POST /api/inventory/dictionary/combos
Content-Type: application/json

{
  "combo_existente": "Combo Estrella",
  "combo_nuevo": [
    "Collar Orion Talla M",
    "Anillo Luna Talla S",
    "Pulsera Sol Talla L"
  ]
}
```

### Ejemplo de Response (Éxito)

```json
{
  "success": true,
  "message": "Combo agregado al diccionario exitosamente",
  "data": {
    // Respuesta del webhook de Railway
  },
  "combo_existente": "Combo Estrella",
  "productos_count": 3,
  "timestamp": "2024-12-01T10:30:00.000Z"
}
```

### Ejemplo de Response (Error)

```json
{
  "success": false,
  "error": "Campo requerido faltante o inválido",
  "required": ["combo_existente", "combo_nuevo"],
  "received": ["combo_existente"],
  "message": "El campo \"combo_nuevo\" es obligatorio y debe ser un array"
}
```

### Validaciones

- `combo_existente` debe ser un string no vacío
- `combo_nuevo` debe ser un array
- El array `combo_nuevo` no puede estar vacío
- Todos los elementos del array deben ser strings no vacíos

### Configuración en n8n

1. **Nodo HTTP Request**
   - Method: `POST`
   - URL: `https://tu-dominio.com/api/inventory/dictionary/combos`
   - Body (JSON):
     ```json
     {
       "combo_existente": "{{ $json.combo_existente }}",
       "combo_nuevo": {{ $json.combo_nuevo }}
     }
     ```

---

## 📤 Operaciones de Inventario (POST)

Permite que n8n cree, edite o elimine productos del inventario.

### URL
```
POST /api/inventory
```

### Headers
```
Content-Type: application/json
```

### Body para "nuevo" o "editar"

```json
{
  "producto": "Collar Orion Talla M",
  "cantidad": 12,
  "tienda": "ALL STARS",
  "stock_minimo": 5,
  "stock_maximo": 20,
  "tipo_operacion": "nuevo",
  "usuario": "admin"
}
```

**Campos requeridos:**
- `producto` (string): Nombre del producto
- `cantidad` (number): Cantidad en stock
- `tienda` (string): Nombre de la tienda
- `stock_minimo` (number): Stock mínimo permitido
- `stock_maximo` (number): Stock máximo permitido
- `tipo_operacion` (string): `"nuevo"` o `"editar"`
- `usuario` (string): Usuario que realiza la operación

### Body para "eliminar"

```json
{
  "producto": "Collar Orion Talla M",
  "tipo_operacion": "eliminar",
  "usuario": "admin"
}
```

**Campos requeridos:**
- `producto` (string): Nombre del producto a eliminar
- `tipo_operacion` (string): `"eliminar"`
- `usuario` (string): Usuario que realiza la operación

### Ejemplo de Response (Éxito)

```json
{
  "success": true,
  "message": "Inventario creado exitosamente",
  "data": {
    // Respuesta del webhook de Railway
  },
  "timestamp": "2024-12-01T10:30:00.000Z"
}
```

### Ejemplo de Response (Error)

```json
{
  "success": false,
  "error": "Campos requeridos faltantes",
  "required": ["producto", "cantidad", "tienda", "stock_minimo", "stock_maximo", "tipo_operacion", "usuario"],
  "received": ["producto", "tipo_operacion"]
}
```

---

## 🔄 Webhooks de Railway

Los endpoints POST actúan como proxies que envían las operaciones a los webhooks de Railway/n8n:

### Webhook de Operaciones de Inventario
```
https://primary-production-85ff.up.railway.app/webhook/add-edit-delete-inventario
```
Usado por: `POST /api/inventory`

### Webhook de Diccionario
```
https://primary-production-85ff.up.railway.app/webhook/add-diccionario
```
Usado por: `POST /api/inventory/dictionary`

### Webhook de Diccionario de Combos
```
https://primary-production-85ff.up.railway.app/webhook/add-diccionario-combos
```
Usado por: `POST /api/inventory/dictionary/combos`

### Flujo de Operación

```
n8n → POST /api/inventory → Webhook Railway → Base de Datos
```

1. n8n envía la petición a `/api/inventory`
2. El endpoint valida los datos
3. Se reenvía al webhook de Railway
4. Railway procesa y actualiza la base de datos
5. Se retorna la respuesta a n8n

---

## 📝 Ejemplos de Uso en n8n

### Ejemplo 1: Consultar Inventario de una Tienda

**Workflow:**
1. **Trigger** (Manual o Schedule)
2. **HTTP Request Node**
   - Method: `GET`
   - URL: `https://tu-dominio.com/api/inventory?tienda=ALL STARS`
   - Response Format: `JSON`

**Resultado:**
Obtiene todos los productos de la tienda "ALL STARS"

---

### Ejemplo 2: Crear Nuevo Producto

**Workflow:**
1. **Trigger** (Webhook, Schedule, o Manual)
2. **HTTP Request Node**
   - Method: `POST`
   - URL: `https://tu-dominio.com/api/inventory`
   - Body (JSON):
     ```json
     {
       "producto": "{{ $json.producto }}",
       "cantidad": {{ $json.cantidad }},
       "tienda": "{{ $json.tienda }}",
       "stock_minimo": {{ $json.stock_minimo }},
       "stock_maximo": {{ $json.stock_maximo }},
       "tipo_operacion": "nuevo",
       "usuario": "n8n-workflow"
     }
     ```

---

### Ejemplo 3: Actualizar Stock de un Producto

**Workflow:**
1. **Trigger** (Webhook o Schedule)
2. **HTTP Request Node**
   - Method: `POST`
   - URL: `https://tu-dominio.com/api/inventory`
   - Body (JSON):
     ```json
     {
       "producto": "Collar Orion Talla M",
       "cantidad": 15,
       "tienda": "ALL STARS",
       "stock_minimo": 5,
       "stock_maximo": 20,
       "tipo_operacion": "editar",
       "usuario": "n8n-workflow"
     }
     ```

---

### Ejemplo 4: Eliminar Producto

**Workflow:**
1. **Trigger** (Webhook o Manual)
2. **HTTP Request Node**
   - Method: `POST`
   - URL: `https://tu-dominio.com/api/inventory`
   - Body (JSON):
     ```json
     {
       "producto": "Collar Orion Talla M",
       "tipo_operacion": "eliminar",
       "usuario": "n8n-workflow"
     }
     ```

---

### Ejemplo 5: Agregar Producto al Diccionario

**Workflow:**
1. **Trigger** (Webhook, Schedule, o Manual)
2. **HTTP Request Node**
   - Method: `POST`
   - URL: `https://tu-dominio.com/api/inventory/dictionary`
   - Body (JSON):
     ```json
     {
       "producto": "Collar Orion Talla M"
     }
     ```

**Nota:** El producto debe existir previamente en la base de datos.

---

### Ejemplo 6: Agregar Combo al Diccionario

**Workflow:**
1. **Trigger** (Webhook, Schedule, o Manual)
2. **HTTP Request Node**
   - Method: `POST`
   - URL: `https://tu-dominio.com/api/inventory/dictionary/combos`
   - Body (JSON):
     ```json
     {
       "combo_existente": "Combo Estrella",
       "combo_nuevo": [
         "Collar Orion Talla M",
         "Anillo Luna Talla S",
         "Pulsera Sol Talla L"
       ]
     }
     ```

**Nota:** El combo debe existir previamente en la base de datos. El nombre del combo no debe incluir cantidades.

---

### Ejemplo 7: Sincronización Automática

**Workflow:**
1. **Schedule Trigger** (cada hora)
2. **HTTP Request Node** - Consultar inventario
   - Method: `GET`
   - URL: `https://tu-dominio.com/api/inventory?tienda=ALL STARS`
3. **Code Node** - Procesar datos y detectar cambios
4. **HTTP Request Node** - Actualizar productos modificados
   - Method: `POST`
   - URL: `https://tu-dominio.com/api/inventory`

---

## 🔐 Seguridad

### Autenticación

Actualmente los endpoints no requieren autenticación. Para producción, se recomienda:

1. **API Key**: Agregar header `X-API-Key` en las peticiones
2. **JWT Token**: Implementar autenticación basada en tokens
3. **IP Whitelist**: Restringir acceso por IP en el servidor

### Validación

- Todos los campos son validados antes de enviar al webhook
- Los tipos de operación son validados (`nuevo`, `editar`, `eliminar`)
- Los campos requeridos varían según el tipo de operación

---

## 🐛 Manejo de Errores

### Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| `200` | Operación exitosa |
| `400` | Error de validación (campos faltantes o inválidos) |
| `500` | Error del servidor o del webhook de Railway |

### Estructura de Error

```json
{
  "success": false,
  "error": "Descripción del error",
  "message": "Mensaje detallado",
  "timestamp": "2024-12-01T10:30:00.000Z"
}
```

---

## 📊 Monitoreo

### Logs

Todos los endpoints registran logs en la consola del servidor:

- `📦 [API] Consulta de inventario desde n8n`
- `📦 [API] Operación de inventario desde n8n`
- `✅ [API] Operación completada exitosamente`
- `❌ [API] Error al procesar`

### Métricas Recomendadas

- Número de consultas por hora
- Tiempo de respuesta promedio
- Tasa de errores
- Operaciones por tipo (nuevo/editar/eliminar)

---

## 🔄 Integración Bidireccional

### Flujo Completo

```
┌─────────┐         ┌──────────────┐         ┌──────────┐         ┌─────────────┐
│   n8n   │────────│  Frontend    │────────│ Railway  │────────│  Supabase   │
│         │        │  /api/...    │         │ Webhook  │         │  Database   │
└─────────┘        └──────────────┘         └──────────┘         └─────────────┘
     │                     │                       │                    │
     │ 1. GET/POST         │                       │                    │
     ├─────────────────────>                       │                    │
     │                     │ 2. Validar            │                    │
     │                     │                       │                    │
     │                     │ 3. POST               │                    │
     │                     ├───────────────────────>                    │
     │                     │                       │ 4. Procesar         │
     │                     │                       ├─────────────────────>
     │                     │                       │                    │
     │                     │                       │ 5. Actualizar DB    │
     │                     │                       │<─────────────────────┤
     │                     │ 6. Response           │                    │
     │                     │<───────────────────────┤                    │
     │ 7. Response          │                       │                    │
     │<─────────────────────┤                       │                    │
```

---

## 📞 Soporte

Para problemas o preguntas sobre la integración:

1. Revisar los logs del servidor
2. Verificar la respuesta del webhook de Railway
3. Validar el formato de los datos enviados
4. Consultar la documentación de n8n

---

## 🔄 Actualizaciones Futuras

- [ ] Autenticación con API Key
- [ ] Webhooks para notificaciones en tiempo real
- [ ] Endpoint para obtener estadísticas de inventario
- [ ] Sincronización automática bidireccional
- [ ] Historial de cambios de inventario

