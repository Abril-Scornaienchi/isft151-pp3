# 📖 PROYECTO RECETAS Y DESPENSA (FP)

Este documento contiene las instrucciones esenciales para configurar el entorno, instalar las dependencias e iniciar el servidor, permitiendo la ejecución del backend (API) y la aplicación web (frontend).

## 1. ⚙️ Requisitos Previos

Necesitas tener instalado:

- Node.js (versión 18.x o superior)
- npm (Node Package Manager)

> ⚠️ Nota de Base de Datos: Solo los administradores del proyecto (quienes gestionan la persistencia) necesitan tener una cuenta y un Cluster en MongoDB Atlas para la configuración inicial. Para la ejecución y compilación del proyecto, solo es necesario que el backend apunte a una URI de MongoDB funcional.

## 2. 🔌 Configuración de la Conexión a la Base de Datos

El servidor requiere la URI de conexión a MongoDB.

- **Obtener la URI:** La cadena de conexión (`mongodb+srv://...`) debe ser proporcionada por el administrador de la base de datos.

- **Configurar la URI:** Dado que el archivo `.env` ya está configurado en el proyecto, si por alguna razón no se estuviera usando o se quisiera una configuración local rápida, puedes pegar la URI directamente en la constante `DB_URI` dentro del archivo `fp/backend/server.js`.

## 3. 🚀 Instalación y Seed de Datos

### A. Instalación de Dependencias

Navega a la carpeta principal del backend para instalar todos los módulos de Node.js necesarios (Express, Mongoose, Bcrypt, etc.):

```bash
cd fp/backend
npm install
```

### B. Inicializar el Usuario Administrador (Seed)

Ejecuta el script de seed para crear el usuario administrador inicial en tu base de datos (admin@app.com / 123). Solo debes ejecutar esto la primera vez.

```bash
node seedAdmin.js
```

## 4. ▶️ Iniciar la Aplicación

El servidor backend puede iniciarse de dos formas:

### A. Opción 1: Usando `npm start` (Recomendado)

Si el archivo `package.json` está configurado con un script `start`:

```bash
cd fp/backend
npm start
```

### B. Opción 2: Ejecución Directa

```bash
cd fp/backend
node server.js
```

**Verificación:** La consola debe mostrar: ✅ Conexión exitosa a MongoDB. y SERVIDOR BACKEND INICIADO en el puerto 3000.

### C. Abrir el Frontend

Una vez que el backend esté ejecutándose, abre el archivo en tu navegador:

- Busca el archivo `index.html` en la carpeta principal de tu proyecto (`fp/`).
- Ábrelo con doble clic.

¡LISTO! La autenticación está configurada y lista para probar las rutas de Login (`/index.html`) y Registro (`/register.html`).

---

## 5. 📚 Documentación de la API

Esta documentación sigue el estilo **RPC (Remote Procedure Call)** donde los endpoints tienen nombres de acciones o funciones, no de recursos. Cada endpoint está documentado con la siguiente estructura de 8 puntos obligatorios:

### 5.1. Autenticación

#### Endpoint: `/api/register`

1. **Endpoint:** `/api/register`
2. **Método HTTP:** `POST`
3. **Formato de serialización:** `JSON`
4. **Cabecera de entrada:** `-`
5. **Cabecera de salida:** `-`
6. **Estructura de datos de entrada:**
```json
{
  "username": "juan_perez",
  "email": "juan@example.com",
  "password": "miPassword123"
}
```
7. **Estructura de datos de salida (Éxito):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "username": "juan_perez",
  "email": "juan@example.com",
  "message": "Usuario registrado exitosamente."
}
```
8. **Estructura de datos de salida (Error):**
```json
{
  "type": "error",
  "description": "Todos los campos son obligatorios."
}
```
o
```json
{
  "type": "error",
  "description": "Este email o nombre de usuario ya está registrado."
}
```

---

#### Endpoint: `/api/login`

1. **Endpoint:** `/api/login`
2. **Método HTTP:** `POST`
3. **Formato de serialización:** `JSON`
4. **Cabecera de entrada:** `-`
5. **Cabecera de salida:** `-`
6. **Estructura de datos de entrada:**
```json
{
  "email": "juan@example.com",
  "password": "miPassword123"
}
```
7. **Estructura de datos de salida (Éxito):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "username": "juan_perez",
  "email": "juan@example.com",
  "message": "Inicio de sesión exitoso."
}
```
8. **Estructura de datos de salida (Error):**
```json
{
  "type": "error",
  "description": "Email y contraseña son obligatorios."
}
```
o
```json
{
  "type": "error",
  "description": "Credenciales inválidas."
}
```

---

### 5.2. Perfil de Usuario

#### Endpoint: `/api/profile`

1. **Endpoint:** `/api/profile`
2. **Método HTTP:** `GET`
3. **Formato de serialización:** `JSON`
4. **Cabecera de entrada:** `-`
5. **Cabecera de salida:** `-`
6. **Estructura de datos de entrada:** `-` (Los datos se envían mediante query parameter `userId`)
   - Query Parameter requerido: `?userId=507f1f77bcf86cd799439011`
7. **Estructura de datos de salida (Éxito):**
```json
{
  "diet_preference": "vegetarian",
  "maxCalories": 2000,
  "maxCarbs": 250,
  "maxProtein": 120,
  "maxSugar": 40
}
```
8. **Estructura de datos de salida (Error):**
```json
{
  "type": "error",
  "description": "Falta el ID del usuario."
}
```
o
```json
{
  "type": "error",
  "description": "Perfil no encontrado."
}
```

---

#### Endpoint: `/api/profile` (Actualizar)

1. **Endpoint:** `/api/profile`
2. **Método HTTP:** `PUT`
3. **Formato de serialización:** `JSON`
4. **Cabecera de entrada:** `-`
5. **Cabecera de salida:** `-`
6. **Estructura de datos de entrada:**
   - Query Parameter requerido: `?userId=507f1f77bcf86cd799439011`
   - Body:
```json
{
  "diet_preference": "vegan",
  "maxCalories": 1800,
  "maxCarbs": 200,
  "maxProtein": 100,
  "maxSugar": 35
}
```
   > Nota: Todos los campos son opcionales. Se pueden actualizar uno o varios campos.
7. **Estructura de datos de salida (Éxito):**
```json
{
  "diet_preference": "vegan",
  "maxCalories": 1800,
  "maxCarbs": 200,
  "maxProtein": 100,
  "maxSugar": 35
}
```
8. **Estructura de datos de salida (Error):**
```json
{
  "type": "error",
  "description": "No se proporcionaron campos válidos para actualizar o el perfil no se pudo actualizar."
}
```

---

### 5.3. Inventario

#### Endpoint: `/api/inventario` (Listar)

1. **Endpoint:** `/api/inventario`
2. **Método HTTP:** `GET`
3. **Formato de serialización:** `JSON`
4. **Cabecera de entrada:** `-`
5. **Cabecera de salida:** `-`
6. **Estructura de datos de entrada:** `-` (Los datos se envían mediante query parameter `userId`)
   - Query Parameter requerido: `?userId=507f1f77bcf86cd799439011`
7. **Estructura de datos de salida (Éxito):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "user": "507f1f77bcf86cd799439011",
    "article_name": "pan",
    "quantity": 500,
    "unit": "gramos",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "user": "507f1f77bcf86cd799439011",
    "article_name": "leche",
    "quantity": 2,
    "unit": "litros",
    "createdAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
]
```
8. **Estructura de datos de salida (Error):**
```json
{
  "type": "error",
  "description": "Error interno al listar inventario."
}
```

---

#### Endpoint: `/api/inventario` (Crear)

1. **Endpoint:** `/api/inventario`
2. **Método HTTP:** `POST`
3. **Formato de serialización:** `JSON`
4. **Cabecera de entrada:** `-`
5. **Cabecera de salida:** `-`
6. **Estructura de datos de entrada:**
   - Query Parameter requerido: `?userId=507f1f77bcf86cd799439011`
   - Body:
```json
{
  "article_name": "huevos",
  "quantity": 12,
  "unit": "unidades"
}
```
   > Nota: El campo `unit` debe ser uno de: `"gramos"`, `"kilogramos"`, `"unidades"`, `"litros"`, `"mililitros"`. Si el alimento ya existe, se sumará la cantidad nueva a la existente.
7. **Estructura de datos de salida (Éxito):**
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "user": "507f1f77bcf86cd799439011",
  "article_name": "huevos",
  "quantity": 12,
  "unit": "unidades",
  "createdAt": "2024-01-15T12:00:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```
8. **Estructura de datos de salida (Error):**
```json
{
  "type": "error",
  "description": "Todos los campos son obligatorios."
}
```
o
```json
{
  "type": "error",
  "description": "Error interno al agregar alimento."
}
```

---

#### Endpoint: `/api/inventario/check`

1. **Endpoint:** `/api/inventario/check`
2. **Método HTTP:** `GET`
3. **Formato de serialización:** `JSON`
4. **Cabecera de entrada:** `-`
5. **Cabecera de salida:** `-`
6. **Estructura de datos de entrada:** `-` (Los datos se envían mediante query parameters)
   - Query Parameters requeridos:
     - `?userId=507f1f77bcf86cd799439011`
     - `&name=pan`
7. **Estructura de datos de salida (Éxito - Alimento existe):**
```json
{
  "exists": true,
  "id": "507f1f77bcf86cd799439012",
  "quantity": 500,
  "unit": "gramos"
}
```
   **Estructura de datos de salida (Éxito - Alimento no existe):**
```json
{
  "exists": false
}
```
8. **Estructura de datos de salida (Error):**
```json
{
  "type": "error",
  "description": "Falta el nombre del alimento para chequear."
}
```
o
```json
{
  "type": "error",
  "description": "Error interno al chequear duplicado."
}
```

---

#### Endpoint: `/api/inventario/:alimentoId/sumar`

1. **Endpoint:** `/api/inventario/:alimentoId/sumar`
2. **Método HTTP:** `PATCH`
3. **Formato de serialización:** `JSON`
4. **Cabecera de entrada:** `-`
5. **Cabecera de salida:** `-`
6. **Estructura de datos de entrada:**
   - URL Parameter: `:alimentoId` (ej: `507f1f77bcf86cd799439012`)
   - Query Parameter requerido: `?userId=507f1f77bcf86cd799439011`
   - Body:
```json
{
  "quantity": 100
}
```
7. **Estructura de datos de salida (Éxito):**
```json
{
  "message": "Cantidad sumada con éxito."
}
```
8. **Estructura de datos de salida (Error):**
```json
{
  "type": "error",
  "description": "Falta la cantidad a sumar."
}
```
o
```json
{
  "type": "error",
  "description": "Alimento no encontrado o no pertenece al usuario."
}
```

---

#### Endpoint: `/api/inventario/:alimentoId` (Actualizar)

1. **Endpoint:** `/api/inventario/:alimentoId`
2. **Método HTTP:** `PUT`
3. **Formato de serialización:** `JSON`
4. **Cabecera de entrada:** `-`
5. **Cabecera de salida:** `-`
6. **Estructura de datos de entrada:**
   - URL Parameter: `:alimentoId` (ej: `507f1f77bcf86cd799439012`)
   - Query Parameter requerido: `?userId=507f1f77bcf86cd799439011`
   - Body (todos los campos son opcionales):
```json
{
  "article_name": "pan integral",
  "quantity": 600,
  "unit": "gramos"
}
```
   > Nota: Se pueden actualizar uno, varios o todos los campos. Al menos un campo debe estar presente.
7. **Estructura de datos de salida (Éxito):**
```json
{
  "message": "Alimento actualizado con éxito."
}
```
8. **Estructura de datos de salida (Error):**
```json
{
  "type": "error",
  "description": "No se proporcionaron campos para actualizar."
}
```
o
```json
{
  "type": "error",
  "description": "Alimento no encontrado, no autorizado o sin cambios."
}
```

---

#### Endpoint: `/api/inventario/:alimentoId` (Eliminar)

1. **Endpoint:** `/api/inventario/:alimentoId`
2. **Método HTTP:** `DELETE`
3. **Formato de serialización:** `JSON`
4. **Cabecera de entrada:** `-`
5. **Cabecera de salida:** `-`
6. **Estructura de datos de entrada:** `-` (Los datos se envían mediante URL y query parameters)
   - URL Parameter: `:alimentoId` (ej: `507f1f77bcf86cd799439012`)
   - Query Parameter requerido: `?userId=507f1f77bcf86cd799439011`
7. **Estructura de datos de salida (Éxito):**
```json
{
  "message": "Alimento eliminado con éxito."
}
```
8. **Estructura de datos de salida (Error):**
```json
{
  "type": "error",
  "description": "Alimento no encontrado o no autorizado."
}
```
o
```json
{
  "type": "error",
  "description": "Error interno al eliminar alimento."
}
```

---

### 5.4. Recetas

#### Endpoint: `/api/recetas/inventario`

1. **Endpoint:** `/api/recetas/inventario`
2. **Método HTTP:** `GET`
3. **Formato de serialización:** `JSON`
4. **Cabecera de entrada:** `-`
5. **Cabecera de salida:** `-`
6. **Estructura de datos de entrada:** `-` (Los datos se envían mediante query parameters)
   - Query Parameter requerido: `?userId=507f1f77bcf86cd799439011`
   - Query Parameters opcionales:
     - `&diet=vegetarian` (opciones: `vegetarian`, `vegan`, `gluten free`, `none`)
     - `&maxCalories=2000`
     - `&maxCarbs=250`
     - `&maxProtein=120`
     - `&maxSugar=40`
7. **Estructura de datos de salida (Éxito):**
```json
[
  {
    "id": 654959,
    "title": "Tortilla de Patatas",
    "image": "https://spoonacular.com/recipeImages/654959-312x231.jpg",
    "missedIngredients": [
      {
        "id": 11215,
        "amount": 2.0,
        "unit": "cloves",
        "unitLong": "cloves",
        "unitShort": "cloves",
        "aisle": "Produce",
        "name": "garlic",
        "original": "2 dientes de ajo",
        "originalName": "garlic",
        "meta": [],
        "extendedName": null,
        "image": "https://spoonacular.com/cdn/ingredients_100x100/garlic.png"
      }
    ],
    "usedIngredients": [
      {
        "id": 11297,
        "amount": 4.0,
        "unit": "large",
        "unitLong": "larges",
        "unitShort": "large",
        "aisle": "Produce",
        "name": "eggs",
        "original": "4 huevos grandes",
        "originalName": "eggs",
        "meta": [],
        "extendedName": null,
        "image": "https://spoonacular.com/cdn/ingredients_100x100/egg.png"
      }
    ]
  }
]
```
   > Nota: Si no hay ingredientes en el inventario, se devuelve un array vacío `[]`.
8. **Estructura de datos de salida (Error):**
```json
{
  "type": "error",
  "description": "Error interno al buscar recetas."
}
```

---

#### Endpoint: `/api/recetas/detalles/:recipeId`

1. **Endpoint:** `/api/recetas/detalles/:recipeId`
2. **Método HTTP:** `GET`
3. **Formato de serialización:** `JSON`
4. **Cabecera de entrada:** `-`
5. **Cabecera de salida:** `-`
6. **Estructura de datos de entrada:** `-` (Los datos se envían mediante URL parameter)
   - URL Parameter: `:recipeId` (ej: `654959`)
7. **Estructura de datos de salida (Éxito):**
```json
{
  "id": 654959,
  "title": "Tortilla de Patatas",
  "summary": "Esta es una deliciosa receta de tortilla española...",
  "instructions": "1. Pelar y cortar las patatas...",
  "image": "https://spoonacular.com/recipeImages/654959-556x370.jpg",
  "extendedIngredients": [
    {
      "id": 11297,
      "amount": 4.0,
      "unit": "large",
      "unitLong": "larges",
      "unitShort": "large",
      "aisle": "Produce",
      "name": "eggs",
      "original": "4 huevos grandes",
      "originalName": "eggs",
      "meta": [],
      "extendedName": null,
      "image": "https://spoonacular.com/cdn/ingredients_100x100/egg.png"
    }
  ],
  "readyInMinutes": 45,
  "servings": 4,
  "sourceUrl": "https://..."
}
```
   > Nota: Todos los textos (título, resumen, instrucciones, ingredientes) están traducidos al español.
8. **Estructura de datos de salida (Error):**
```json
{
  "type": "error",
  "description": "Error interno del servidor al buscar detalles de receta."
}
```
o
```json
{
  "type": "error",
  "description": "Error de la API externa al obtener detalles."
}
```

---

### Notas Importantes sobre la Documentación

- **Filosofía RPC:** Todos los endpoints siguen el estilo RPC con nombres de acciones (ej: `/api/login`, `/api/register`, `/api/recetas/inventario`).
- **Autenticación:** Los endpoints protegidos requieren el query parameter `userId` que debe ser un ID válido de usuario en la base de datos.
- **Formato de Error:** Todos los errores deberían seguir la estructura: `{ "type": "error", "description": "..." }`. Actualmente algunos endpoints pueden devolver `{ "error": "..." }`, pero unificaremos al formato estándar.
- **Formato de Serialización:** Todos los endpoints utilizan JSON tanto para entrada como para salida.
- **Cabeceras:** Actualmente no se utilizan cabeceras especiales (ni de entrada ni de salida). La autenticación se maneja mediante query parameters.