/* 1. fp/backend/server.js (El Controlador y Punto de Entrada)
Este archivo actúa como el Controlador o Capa de Routers. Sus responsabilidades son:

1. **Configuración de Express y MongoDB:** Inicia el servidor Express y establece la conexión principal a la base de datos **MongoDB** usando **Mongoose**.
2. **Definición de Middlewares:** Configura middlewares esenciales (CORS, body-parser JSON).
3. **Definición de Rutas (Endpoints):** Define las rutas públicas de la API (ej: /api/register, /api/login).
4. **Delegación Asíncrona:** Delega la lógica de negocio y persistencia de datos (ahora asíncrona) a la capa de servicios (userService).
5. **Manejo de Respuesta:** Maneja la respuesta HTTP (códigos de estado 200, 401, 409, etc.) y el formato JSON.

GESTIÓN DEL INVENTARIO Y RECETAS:
* - Implementar el middleware de seguridad (checkAuth) para proteger rutas.
* - Definir TODAS las rutas del CRUD para el inventario (/api/inventario).
* - Definir la ruta de integración con la API de Recetas (/api/recetas/inventario).

Lo crucial: Este archivo **coordina** la aplicación, pero el módulo 'userService' es quien interactúa directamente con Mongoose para leer y escribir en la base de datos.
*/

/**
 * @file server.js
 * @brief Punto de entrada de la aplicación backend.
 * * Configura la conexion a MongoDB y el servidor Express. Define las rutas de la API, 
 * delegando la lógica de negocio y persistencia al módulo userService.
 */

// 1. IMPORTACIONES Y CONFIGURACIÓN INICIAL
const express = require('express');
// Importamos el módulo de servicio (nuestra lógica de negocio encapsulada)
const userService = require('./services/userService'); 
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

const DB_URI = 'mongodb+srv://adminUserA:rzVBpgvkVWCmcMBQ@cluster0.ysdsjmm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; 

mongoose.connect(DB_URI)
    .then(() => console.log('✅ Conexión exitosa a MongoDB.'))
    .catch(err => {
        console.error('❌ Error de conexión a MongoDB:', err.message);
    });


const SPOONACULAR_API_KEY = 'dfc3580b5d694a24afedb23ca1ca8478'; 

const User_data = require('./models/User_data'); 

// -----------------------------------------------------
// MIDDLEWARE DE SEGURIDAD. 
// -----------------------------------------------------
/**
 * @brief Middleware de seguridad para verificar la identidad del usuario.
 * * Esta función actúa como un portero de seguridad para todas las rutas protegidas.
 * Asegura que solo los usuarios registrados puedan acceder a los datos de inventario.
 */
async function checkAuth(req, res, next) { 
    const userId = req.query.userId; 
    
    if (!userId) {
        return res.status(401).json({ error: 'Falta el ID del usuario.' });
    }
    
    try {
        // BUSCA el usuario REAL en la DB con Mongoose.
        const user = await User_data.findById(userId);

        if (!user) {
            return res.status(401).json({ error: 'ID de usuario inválido.' });
        }
        
        // Guarda el ID REAL de Mongo para que lo usen las rutas (el CRUD).
        req.userId = userId; 
        next(); 

    } catch (error) {
        // Captura errores si el ID no tiene el formato correcto de Mongo ObjectId
        return res.status(400).json({ error: 'Formato de ID inválido.' });
    }
}


// 2. MIDDLEWARES (Configuraciones para Express)
/**
 * @brief Middleware para el análisis del cuerpo de peticiones entrantes.
 * * Habilita la lectura de datos JSON enviados en el cuerpo de las peticiones (e.g., POST, PUT).
 */
app.use(express.json()); 

/**
 * @brief Middleware de Control de Acceso (CORS) Temporal.
 * * Permite que el frontend (que probablemente se ejecute en un puerto diferente)
 * pueda hacer peticiones a este servidor backend sin ser bloqueado.
 * ⚠️ NOTA: El '*' en Access-Control-Allow-Origin permite cualquier origen y DEBERÍA
 * ser restringido en un entorno de producción por motivos de seguridad.
 */
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next(); // Permite que la petición continúe a la ruta definida
});

// 3. RUTAS (Endpoints de la API para la Gestión de Usuarios)

/**
 * @brief Endpoint para el registro de nuevos usuarios.
 * * @route POST /api/register
 */
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Validación de datos simple
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    // 💡 DELEGACIÓN: El controlador llama al servicio, sin saber dónde se almacenan los datos.
    const nuevoUsuario = await userService.registerUser(username, email, password);

    if (nuevoUsuario === null) {
        // 409: Conflicto - Email/username duplicado
        return res.status(409).json({ error: 'Este email o nombre de usuario ya está registrado.' });
    }

    // 201: Creado
    return res.status(201).json({ 
        id: nuevoUsuario._id,
        username: nuevoUsuario.username,
        email: nuevoUsuario.email,
        message: 'Usuario registrado exitosamente.' 
    });
});

/**
 * @brief Endpoint para el inicio de sesión (Login).
 * * @route POST /api/login
 */
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }

    // 💡 DELEGACIÓN: El controlador llama al servicio, que ahora es ASÍNCRONO.
    const usuario = await userService.findUserByCredentials(email, password);

    if (!usuario) {
        // 401: No autorizado - Credenciales inválidas
        return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // 200: OK - Login exitoso
    return res.status(200).json({ 
        id: usuario._id, 
        username: usuario.username, 
        email: usuario.email,
        message: 'Inicio de sesión exitoso.' 
    });
});


// -----------------------------------------------------
// RUTAS DE INVENTARIO (CRUD)
// -----------------------------------------------------

// LISTAR INVENTARIO (READ)
/**
 * @brief Endpoint para listar inventario.
 * * @route GET /api/inventario
 */
app.get('/api/inventario', checkAuth, async (req, res) => {
    try {

        const inventario = await userService.getAlimentosByUsuario(req.userId); 
        res.status(200).json(inventario); 
    } catch (error) {
        res.status(500).json({ error: 'Error interno al listar inventario.', details: error.message }); 
    }
});

// AGREGAR ALIMENTO (CREATE)
/**
 * @brief Endpoint para agregar alimento.
 * * @route POST /api/inventario
 */
app.post('/api/inventario', checkAuth, async (req, res) => {
    const { article_name, quantity, unit } = req.body; 

    if (!article_name || !quantity || !unit) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    try {
        const nuevoAlimento = await userService.addAlimento(req.userId, article_name, quantity, unit);
        res.status(201).json(nuevoAlimento); 
    } catch (error) {
        res.status(500).json({ error: 'Error interno al agregar alimento.' }); 
    }
});

// ACTUALIZAR ALIMENTO (UPDATE)
/**
 * @brief Endpoint para actualizar alimento.
 * * @route PUT /api/inventario/:alimentoId
 */
app.put('/api/inventario/:alimentoId', checkAuth, async (req, res) => {
    const { quantity, unit } = req.body; 
    const alimentoId = req.params.alimentoId;

    if (!quantity || !unit) {
        return res.status(400).json({ error: 'Faltan campos para actualizar.' });
    }

    try {
        const updated = await userService.updateAlimento(alimentoId, req.userId, quantity, unit);

        if (!updated) {
            // 404 si el alimento no existe O 401 si no pertenece al usuario logueado.
            return res.status(404).json({ error: 'Alimento no encontrado o no autorizado.' }); 
        }

        res.status(200).json({ message: 'Alimento actualizado con éxito.' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al actualizar alimento.' });
    }
});

// ELIMINAR ALIMENTO (DELETE)
/**
 * @brief Endpoint para eliminar alimento.
 * * @route DELETE /api/inventario
 */
app.delete('/api/inventario/:alimentoId', checkAuth, async (req, res) => {
    const alimentoId = req.params.alimentoId;
    
    try {
        const deleted = await userService.deleteAlimento(alimentoId, req.userId);

        if (!deleted) {
            return res.status(404).json({ error: 'Alimento no encontrado o no autorizado.' });
        }

        res.status(200).json({ message: 'Alimento eliminado con éxito.' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al eliminar alimento.' });
    }
});


// -----------------------------------------------------
// RUTA DE RECETAS
// -----------------------------------------------------

// BUSCAR RECETAS CON INVENTARIO
/**
 * @brief Endpoint para buscar receta con inventario.
 * * @route GET /api/recetas/inventario
 */
app.get('/api/recetas/inventario', checkAuth, async (req, res) => { 
    try {
        const inventario = await userService.getAlimentosByUsuario(req.userId); 
        const ingredientsList = inventario.map(item => item.article_name).join(',');

        const url = `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${SPOONACULAR_API_KEY}&ingredients=${ingredientsList}&number=5&ranking=1&maxMissingIngredients=2`;
        
        const respuesta = await fetch(url); 
        const data = await respuesta.json();
        res.status(200).json(data); 

    } catch (error) {
        res.status(500).json({ error: 'Error interno al buscar recetas.', details: error.message });
    }
});

/**
 * @brief Endpoint de Bienvenida.
 * * @route GET /
 */
app.get('/', (req, res) => {
    res.status(200).send('<h1>API de Recetas Activa</h1><p>Los endpoints de autenticación son POST /api/register y POST /api/login</p>');
});

// 4. INICIO DEL SERVIDOR
app.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(` SERVIDOR BACKEND INICIADO`);
  console.log(`Puerto: http://localhost:${PORT}`);
  console.log(`==============================================`);
  console.log(`Rutas disponibles:`);
  console.log(`  - POST /api/register (Registro)`);
  console.log(`  - POST /api/login    (Login)`);
  console.log(`  - POST /api/inventario       (Crear Alimento)`);
  console.log(`  - GET /api/inventario        (Listar Inventario)`);
  console.log(`  - PUT /api/inventario/:id    (Actualizar Alimento)`);
  console.log(`  - DELETE /api/inventario/:id (Eliminar Alimento)`);
  console.log(`  - GET /api/recetas/inventario (Buscar Recetas por Inventario)`);
  console.log(`\n`);
});