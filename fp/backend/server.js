/* 1. fp/backend/server.js (El Controlador y Punto de Entrada)
Este archivo actúa como el Controlador o Capa de Routers. Sus responsabilidades son:

1. **Configuración de Express y MongoDB:** Inicia el servidor Express y establece la conexión principal a la base de datos **MongoDB** usando **Mongoose**.
2. **Definición de Middlewares:** Configura middlewares esenciales (CORS, body-parser JSON).
3. **Definición de Rutas (Endpoints):** Define las rutas públicas de la API (ej: /api/register, /api/login).
4. **Delegación Asíncrona:** Delega la lógica de negocio y persistencia de datos (ahora asíncrona) a la capa de servicios (userService).
5. **Manejo de Respuesta:** Maneja la respuesta HTTP (códigos de estado 200, 401, 409, etc.) y el formato JSON.

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

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://adminUserA:rzVBpgvkVWCmcMBQ@cluster0.ysdsjmm.mongodb.net/Project0?retryWrites=true&w=majority&appName=Cluster0'; 

mongoose.connect(DB_URI)
    .then(() => console.log('✅ Conexión exitosa a MongoDB.'))
    .catch(err => {
        console.error('❌ Error de conexión a MongoDB:', err.message);
    });

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
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
  console.log(`\n`);
});