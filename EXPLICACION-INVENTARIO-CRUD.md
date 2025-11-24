# 📚 EXPLICACIÓN DETALLADA: CÓMO FUNCIONA EL CRUD DE INVENTARIO

## 🎯 OBJETIVO
Permitir que el usuario cree, edite o elimine productos del inventario, enviando los datos a un webhook de Railway/n8n que procesa la información.

---

## 🔄 FLUJO COMPLETO PASO A PASO

### **ESCENARIO: Usuario quiere CREAR un nuevo producto**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USUARIO HACE CLIC EN "NUEVO PRODUCTO"                      │
│    → Se abre un modal con un formulario vacío                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. USUARIO LLENA EL FORMULARIO                               │
│    - Nombre del Producto: "Collar Orion Talla M"            │
│    - Cantidad: 12                                            │
│    - Tienda: "ALL STARS"                                     │
│    - Stock Mínimo: 5                                         │
│    - Stock Máximo: 20                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. USUARIO HACE CLIC EN "GUARDAR CAMBIOS"                    │
│    → Se ejecuta el onClick del botón                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. FUNCIÓN: onClick del botón                                │
│    → Registra en consola que se hizo clic                    │
│    → Verifica que el botón NO esté deshabilitado             │
│    → Si está activo, llama a handleSave()                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. FUNCIÓN: handleSave()                                     │
│                                                               │
│    PASO 1: Verificar usuario autenticado                    │
│    ────────────────────────────────────────                   │
│    → Lee: user (del contexto de autenticación)               │
│    → Si NO hay usuario: muestra error y TERMINA               │
│    → Si HAY usuario: continúa                                 │
│                                                               │
│    PASO 2: Determinar tipo de operación                      │
│    ────────────────────────────────────────                   │
│    → Lee: isNewItem (true = nuevo, false = editar)           │
│    → Si isNewItem = true → tipoOperacion = "nuevo"           │
│    → Si isNewItem = false → tipoOperacion = "editar"         │
│                                                               │
│    PASO 3: Validar campos del formulario                      │
│    ────────────────────────────────────────                   │
│    → Lee: editFormData (todos los campos del formulario)     │
│    → Verifica que cada campo tenga un valor válido:          │
│      ✓ producto: debe tener texto                            │
│      ✓ cantidad: debe ser un número ≥ 0                       │
│      ✓ tienda: debe tener texto                               │
│      ✓ stock_minimo: debe ser un número ≥ 0                   │
│      ✓ stock_maximo: debe ser un número ≥ 0                   │
│      ✓ stock_minimo NO puede ser > stock_maximo               │
│    → Si algún campo es inválido: lanza error y TERMINA       │
│    → Si todos son válidos: continúa                           │
│                                                               │
│    PASO 4: Construir el PAYLOAD (datos a enviar)             │
│    ────────────────────────────────────────                   │
│    → Crea un objeto JavaScript con los datos:                │
│      {                                                        │
│        producto: "Collar Orion Talla M",                     │
│        cantidad: 12,                                         │
│        tienda: "ALL STARS",                                  │
│        stock_minimo: 5,                                       │
│        stock_maximo: 20,                                      │
│        tipo_operacion: "nuevo",                              │
│        usuario: "admin" (o el nombre del usuario)             │
│      }                                                        │
│    → Este objeto se llama "payload"                           │
│                                                               │
│    PASO 5: Llamar a callInventoryAPI()                        │
│    ────────────────────────────────────────                   │
│    → Pasa el payload como parámetro                          │
│    → Espera la respuesta (await)                              │
│    → Si hay error: lo captura y muestra al usuario            │
│    → Si es exitoso: continúa                                  │
│                                                               │
│    PASO 6: Recargar el inventario                            │
│    ────────────────────────────────────────                   │
│    → Llama a loadInventory()                                  │
│    → Esto trae los datos actualizados de Supabase            │
│                                                               │
│    PASO 7: Cerrar modal y limpiar                            │
│    ────────────────────────────────────────                   │
│    → Cierra el modal                                          │
│    → Limpia el estado del formulario                          │
│    → Muestra mensaje de éxito                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. FUNCIÓN: callInventoryAPI(payload)                        │
│                                                               │
│    Esta función es la que REALMENTE envía los datos          │
│    al servidor webhook de Railway/n8n                         │
│                                                               │
│    PASO 1: Inicio y validación                               │
│    ────────────────────────────────────────                   │
│    → Define la URL del endpoint:                             │
│      "https://primary-production-85ff.up.railway.app/        │
│       webhook/add-edit-delete-inventario"                     │
│    → Valida que el payload tenga los campos mínimos:         │
│      - producto (obligatorio siempre)                         │
│      - tipo_operacion (obligatorio siempre)                   │
│      - usuario (obligatorio siempre)                          │
│      - Si NO es "eliminar", también requiere:                 │
│        cantidad, tienda, stock_minimo, stock_maximo          │
│                                                               │
│    PASO 2: Preparar la petición HTTP                         │
│    ────────────────────────────────────────                   │
│    → Crea un objeto con la configuración del fetch:          │
│      {                                                        │
│        method: "POST",          // Método HTTP                │
│        headers: {                                             │
│          "Content-Type": "application/json"  // Tipo de dato  │
│        },                                                     │
│        body: JSON.stringify(payload)  // Datos convertidos   │
│      }                                                        │
│    → JSON.stringify() convierte el objeto JavaScript         │
│      a un string JSON que el servidor puede leer              │
│                                                               │
│    PASO 3: EJECUTAR fetch() - LA PARTE CRÍTICA               │
│    ────────────────────────────────────────                   │
│    → fetch() es una función NATIVA del navegador             │
│    → Hace una petición HTTP real a través de internet        │
│    → Envía los datos al servidor de Railway                  │
│    → ESPERA la respuesta del servidor (puede tardar)         │
│                                                               │
│    ¿QUÉ ES fetch()?                                          │
│    ────────────────                                          │
│    fetch() es como hacer una llamada telefónica:             │
│    1. Marcas el número (la URL)                              │
│    2. Esperas que alguien conteste (el servidor)             │
│    3. Le dices algo (envías el payload)                      │
│    4. Esperas su respuesta                                   │
│    5. Cuelgas cuando terminas                                │
│                                                               │
│    PASO 4: Recibir respuesta del servidor                    │
│    ────────────────────────────────────────                   │
│    → El servidor responde con un objeto "Response"            │
│    → Este objeto contiene:                                   │
│      - status: código HTTP (200 = éxito, 404 = no encontrado) │
│      - ok: true si status es 200-299                         │
│      - headers: información adicional                         │
│      - body: el contenido real de la respuesta                │
│                                                               │
│    PASO 5: Leer el contenido de la respuesta                │
│    ────────────────────────────────────────                   │
│    → response.text() lee el contenido como texto              │
│    → Intenta parsearlo como JSON                              │
│    → Si es JSON válido: lo convierte a objeto JavaScript     │
│    → Si NO es JSON: lo guarda como texto                     │
│                                                               │
│    PASO 6: Verificar si fue exitoso                          │
│    ────────────────────────────────────────                   │
│    → Si response.ok = false: lanza error                      │
│    → Si response.ok = true: retorna los datos                │
│                                                               │
│    PASO 7: Retornar o lanzar error                           │
│    ────────────────────────────────────────                   │
│    → Si todo salió bien: retorna responseData                 │
│    → Si hubo error: lanza una excepción (throw)               │
│      que será capturada por handleSave()                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. EL SERVIDOR (Railway/n8n) PROCESA LA PETICIÓN            │
│                                                               │
│    → Recibe el payload en el webhook                         │
│    → Lee el tipo_operacion ("nuevo", "editar", "eliminar")   │
│    → Ejecuta la acción correspondiente en la base de datos    │
│    → Responde con un JSON indicando éxito o error            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. VUELTA AL FRONTEND                                        │
│                                                               │
│    → callInventoryAPI() recibe la respuesta                  │
│    → La retorna a handleSave()                               │
│    → handleSave() recarga el inventario                      │
│    → El usuario ve el producto nuevo en la tabla             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 EXPLICACIÓN DETALLADA DE CADA FUNCIÓN

### **1. onClick del botón "Guardar Cambios"**

```javascript
onClick={(e) => {
  // 1. Registra en consola que se hizo clic
  console.log('BOTÓN CLICKEADO');
  
  // 2. Verifica si el botón está deshabilitado
  const isDisabled = saving || !editFormData.producto || ...
  
  // 3. Si está deshabilitado, NO hace nada
  if (isDisabled) {
    console.log('Botón deshabilitado, no se ejecutará');
    return; // TERMINA AQUÍ
  }
  
  // 4. Si está activo, ejecuta handleSave()
  handleSave();
}}
```

**¿Por qué verificar si está deshabilitado?**
- Para evitar enviar datos incompletos
- Para evitar múltiples envíos simultáneos
- Para dar feedback claro al usuario

---

### **2. handleSave() - La función principal**

```javascript
const handleSave = async () => {
  // async = esta función puede esperar (await) otras funciones
  
  // PASO 1: Verificar usuario
  if (!user) {
    // Si no hay usuario, muestra error y TERMINA
    setError('Usuario no autenticado');
    return; // SALE DE LA FUNCIÓN
  }
  
  // PASO 2: Determinar tipo de operación
  const tipoOperacion = isNewItem ? 'nuevo' : 'editar';
  // Si isNewItem es true → "nuevo"
  // Si isNewItem es false → "editar"
  
  // PASO 3: Validar campos
  if (!editFormData.producto.trim()) {
    throw new Error('El nombre del producto es obligatorio');
    // throw = lanza un error que será capturado por el catch
  }
  // ... más validaciones ...
  
  // PASO 4: Construir payload
  const payload = {
    producto: editFormData.producto.trim(),
    cantidad: parseInt(editFormData.cantidad),
    tienda: editFormData.tienda.trim(),
    stock_minimo: parseInt(editFormData.stock_minimo),
    stock_maximo: parseInt(editFormData.stock_maximo),
    tipo_operacion: tipoOperacion,
    usuario: user?.name || user?.email || 'admin',
  };
  
  // PASO 5: Llamar a callInventoryAPI
  // await = espera a que termine antes de continuar
  const result = await callInventoryAPI(payload);
  
  // PASO 6: Si llegamos aquí, fue exitoso
  await loadInventory(); // Recargar datos
  setIsModalOpen(false); // Cerrar modal
}
```

**¿Qué es `async/await`?**
- `async`: marca la función como asíncrona (puede esperar)
- `await`: espera a que otra función termine antes de continuar
- Es como decir "espera aquí hasta que termine, luego continúa"

---

### **3. callInventoryAPI() - La función que envía al servidor**

```javascript
const callInventoryAPI = async (payload) => {
  // payload = los datos que recibimos de handleSave()
  
  // PASO 1: Definir la URL del servidor
  const endpoint = "https://primary-production-85ff.up.railway.app/webhook/add-edit-delete-inventario";
  
  // PASO 2: Validar que el payload tenga todo lo necesario
  if (!payload.producto || !payload.tipo_operacion) {
    throw new Error('Faltan campos obligatorios');
  }
  
  // PASO 3: Preparar la petición HTTP
  const requestOptions = {
    method: "POST",  // Método HTTP (POST = enviar datos)
    headers: {
      "Content-Type": "application/json"  // Le decimos al servidor que enviamos JSON
    },
    body: JSON.stringify(payload)  // Convertimos el objeto a texto JSON
  };
  
  // PASO 4: EJECUTAR fetch() - ESTO ES LO MÁS IMPORTANTE
  // fetch() es una función NATIVA del navegador
  // Hace una petición HTTP real a través de internet
  const response = await fetch(endpoint, requestOptions);
  
  // PASO 5: Leer la respuesta
  const responseText = await response.text();
  const responseData = JSON.parse(responseText);
  
  // PASO 6: Verificar si fue exitoso
  if (!response.ok) {
    throw new Error('El servidor respondió con error');
  }
  
  // PASO 7: Retornar los datos
  return responseData;
}
```

**¿Qué es `fetch()`?**
- Es una función NATIVA del navegador (no necesitas importarla)
- Hace peticiones HTTP (como cuando visitas una página web)
- Puede enviar datos (POST) o solo leer (GET)
- Retorna una "Promise" que se resuelve cuando el servidor responde

**Ejemplo visual de fetch():**
```
TU NAVEGADOR                    SERVIDOR RAILWAY
     │                                │
     │  ──── POST /webhook ────────> │
     │  { producto: "...", ... }      │
     │                                │
     │  <──── 200 OK ──────────────── │
     │  { success: true }             │
     │                                │
```

---

## 📦 ¿QUÉ ES EL PAYLOAD?

El **payload** es simplemente un objeto JavaScript que contiene todos los datos que queremos enviar al servidor.

**Ejemplo para CREAR un producto:**
```javascript
{
  producto: "Collar Orion Talla M",
  cantidad: 12,
  tienda: "ALL STARS",
  stock_minimo: 5,
  stock_maximo: 20,
  tipo_operacion: "nuevo",
  usuario: "admin"
}
```

**Ejemplo para ELIMINAR un producto:**
```javascript
{
  producto: "Collar Orion Talla M",
  tipo_operacion: "eliminar",
  usuario: "admin"
}
// Nota: para eliminar solo necesitamos producto, tipo_operacion y usuario
```

**¿Por qué se llama "payload"?**
- Es un término técnico que significa "carga útil"
- Es como el contenido de un paquete que envías por correo
- El "sobre" es la petición HTTP, el "contenido" es el payload

---

## 🔄 ¿CÓMO SE CONVIERTE A JSON?

JavaScript trabaja con objetos, pero para enviarlos por internet necesitamos texto.

```javascript
// OBJETO JAVASCRIPT (en memoria)
const payload = {
  producto: "Collar Orion Talla M",
  cantidad: 12
};

// CONVERTIR A TEXTO JSON (para enviar)
const jsonString = JSON.stringify(payload);
// Resultado: '{"producto":"Collar Orion Talla M","cantidad":12}'

// El servidor recibe el texto JSON y lo convierte de vuelta a objeto
```

---

## ⚠️ ¿QUÉ PUEDE SALIR MAL?

### **1. Error de validación (antes de enviar)**
```
❌ El usuario no llenó todos los campos
→ handleSave() detecta el error
→ Muestra mensaje al usuario
→ NO se envía nada al servidor
```

### **2. Error de red (durante el fetch)**
```
❌ No hay conexión a internet
❌ El servidor está caído
❌ Error de CORS (permisos)
→ fetch() falla
→ callInventoryAPI() captura el error
→ handleSave() muestra el error al usuario
```

### **3. Error del servidor (después de enviar)**
```
❌ El servidor recibe los datos pero encuentra un error
→ Responde con status 400, 500, etc.
→ callInventoryAPI() detecta que response.ok = false
→ Lanza error
→ handleSave() muestra el error al usuario
```

---

## 🎯 RESUMEN EN 3 PASOS

1. **Usuario llena formulario y hace clic en "Guardar"**
   → Se ejecuta `handleSave()`

2. **handleSave() valida y prepara los datos**
   → Construye el payload
   → Llama a `callInventoryAPI(payload)`

3. **callInventoryAPI() envía los datos al servidor**
   → Usa `fetch()` para hacer la petición HTTP
   → Espera la respuesta
   → Retorna éxito o error

---

## 🔍 ¿CÓMO SABER DÓNDE FALLA?

Los logs en consola te muestran exactamente en qué paso estás:

1. **Si ves "BOTÓN CLICKEADO"** → El botón funciona
2. **Si ves "[handleSave] INICIANDO"** → handleSave() se ejecutó
3. **Si ves "PAYLOAD CONSTRUIDO"** → Los datos están listos
4. **Si ves "EJECUTANDO fetch()"** → Está intentando enviar
5. **Si ves "RESPUESTA DEL SERVIDOR"** → El servidor respondió
6. **Si NO ves el siguiente paso** → Ahí está el problema

---

## 💡 CONCEPTOS CLAVE

- **fetch()**: Función nativa del navegador para hacer peticiones HTTP
- **async/await**: Permite esperar operaciones asíncronas (como fetch)
- **payload**: Los datos que enviamos al servidor
- **JSON**: Formato de texto para intercambiar datos
- **endpoint**: La URL del servidor donde enviamos los datos
- **webhook**: Un punto de entrada en el servidor que recibe datos

---

¿Tienes alguna pregunta específica sobre alguna parte del código?

