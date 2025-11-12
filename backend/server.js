//fp/backend/server.js

/* (El Controlador y Punto de Entrada)
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

// Carga las variables de entorno del archivo .env
require('dotenv').config({ path: '../.env' });
// 1. IMPORTACIONES Y CONFIGURACIÓN INICIAL
const express = require('express');
// Importamos el módulo de servicio (nuestra lógica de negocio encapsulada)
const userService = require('./services/userService'); 
// Importamos el nuevo servicio de traducción
const translationService = require('./services/translationService');
const mongoose = require('mongoose');
const CacheEntry = require('./models/CacheEntryModel'); 

const DB_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;
const app = express();
// (DE TU BRANCH) Deshabilitamos etag para evitar caching 304 en desarrollo
app.disable('etag'); 
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS,PATCH');
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
// RUTAS DE PERFIL DE USUARIO
// -----------------------------------------------------

/**
 * @brief Endpoint para obtener el perfil de un usuario.
 * @route GET /api/profile
 */
app.get('/api/profile', checkAuth, async (req, res) => {
    try {
        const profile = await userService.getUserProfile(req.userId);
        if (!profile) {
            return res.status(404).json({ error: 'Perfil no encontrado.' });
        }
        res.status(200).json(profile);
    } catch (error) {
        res.status(500).json({ error: 'Error interno al obtener el perfil.', details: error.message });
    }
});

/**
 * @brief Endpoint para actualizar el perfil de un usuario.
 * @route PUT /api/profile
 */
app.put('/api/profile', checkAuth, async (req, res) => {
    try {
        const updatedProfile = await userService.updateUserProfile(req.userId, req.body);
        if (!updatedProfile) {
            return res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar o el perfil no se pudo actualizar.' });
        }
        res.status(200).json(updatedProfile);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Datos del perfil inválidos.', details: error.errors });
        }
        res.status(500).json({ error: 'Error interno al actualizar el perfil.', details: error.message });
    }
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
        // ¡SIN TRADUCCIÓN! Guardamos el nombre en español y minúsculas.
        const nuevoAlimento = await userService.createOrUpdateAlimento(
            req.userId, 
            article_name.toLowerCase(), 
            quantity, 
            unit
        );

        res.status(201).json(nuevoAlimento); 
    } catch (error) {
        console.error('Error interno al agregar alimento:', error.message);
        res.status(500).json({ error: 'Error interno al agregar alimento.' }); 
    }
});

/**
 * @brief Endpoint para chequear si un alimento ya existe en el inventario.
 * * @route GET /api/inventario/check?name=pan&userId=...
 */
app.get('/api/inventario/check', checkAuth, async (req, res) => {
    // Leemos el nombre del alimento desde el query parameter 'name'
    const article_name = req.query.name; 

    if (!article_name) {
        return res.status(400).json({ error: 'Falta el nombre del alimento para chequear.' });
    }

    try {
        // Llama al servicio para buscar el alimento por nombre
        const existingItem = await userService.findAlimentoByName(req.userId, article_name);

        if (existingItem) {
            // Si el alimento existe, devolvemos 'exists: true' junto con el ID y cantidad.
            return res.status(200).json({ 
                exists: true, 
                id: existingItem._id, // ID del alimento existente
                quantity: existingItem.quantity,
                unit: existingItem.unit
            });
        } else {
            // Si no existe, devolvemos 'exists: false'
            return res.status(200).json({ exists: false });
        }
    } catch (error) {
        console.error('ERROR al chequear duplicado:', error);
        res.status(500).json({ error: 'Error interno al chequear duplicado.' });
    }
});

/**
 * @brief Endpoint para sumar cantidad a un alimento existente.
 * @route PATCH /api/inventario/:alimentoId/sumar
 */
app.patch('/api/inventario/:alimentoId/sumar', checkAuth, async (req, res) => {
    const alimentoId = req.params.alimentoId;
    const { quantity } = req.body; 

    if (!quantity || isNaN(parseInt(quantity))) {
        return res.status(400).json({ error: 'Falta la cantidad a sumar.' });
    }

    try {
        const updated = await userService.sumarCantidadAlimento(alimentoId, req.userId, parseInt(quantity));

        if (updated) {
            return res.status(200).json({ message: 'Cantidad sumada con éxito.' });
        } else {
            return res.status(404).json({ error: 'Alimento no encontrado o no pertenece al usuario.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error interno al sumar cantidad.' });
    }
});

// ACTUALIZAR ALIMENTO (UPDATE)
/**
 * @brief Endpoint para actualizar alimento.
 * * @route PUT /api/inventario/:alimentoId
 */
app.put('/api/inventario/:alimentoId', checkAuth, async (req, res) => {
    // 1. Extraemos los tres campos del body
    const { article_name, quantity, unit } = req.body; 
    const alimentoId = req.params.alimentoId;

    // 2. Validación más flexible: al menos un campo debe estar presente
    if (!article_name && !quantity && !unit) {
        return res.status(400).json({ error: 'No se proporcionaron campos para actualizar.' });
    }

    try {
        // Al actualizar, también guardamos en minúsculas y español
        const clean_article_name = article_name ? article_name.toLowerCase() : undefined;
        const updated = await userService.updateAlimento(alimentoId, req.userId, clean_article_name, quantity, unit);

        if (!updated) {
            return res.status(404).json({ error: 'Alimento no encontrado, no autorizado o sin cambios.' }); 
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
// RUTA DE RECETAS (v3 - CON SORTING MEJORADO)
// -----------------------------------------------------

/**
 * @brief Endpoint para buscar receta con inventario.
 * * @route GET /api/recetas/inventario
 */
app.get('/api/recetas/inventario', checkAuth, async (req, res) => {
    try {
        const separador = "|||"; // Usaremos un separador único

        // --- 1. TRADUCCIÓN DE INVENTARIO (ES -> EN) ---

        // a. Obtener inventario (en español, desde la DB)
        const inventario = await userService.getAlimentosByUsuario(req.userId);
        const spanishIngredients = inventario.map(item => item.article_name);

        if (spanishIngredients.length === 0) {
            return res.status(200).json([]); // Devuelve array vacío si no hay ingredientes
        }

        // b. Agruparlos y traducirlos (si es necesario)
        const joinedSpanishIngredients = spanishIngredients.join(separador);
        const ingredientsPrompt = `Translate the following list of kitchen ingredients to English. Keep the exact same separator ("${separador}") between each item: "${joinedSpanishIngredients}"`;
        const translatedIngredientsString = await translationService.translateText(ingredientsPrompt, 'es', 'en');

        if (!translatedIngredientsString) {
            throw new Error("La traducción de ingredientes (ES->EN) falló.");
        }

        // c. Convertir de vuelta a un array y ordenar para consistencia del caché
        const englishIngredients = translatedIngredientsString.split(separador).map(s => s.trim());
        englishIngredients.sort();
        const ingredientsCommaSeparated = englishIngredients.join(',');

        // --- 2. OBTENER FILTROS ---
        const { diet, maxCalories, maxCarbs, maxProtein, maxSugar } = req.query;
        let filtersQueryString = '';
        if (diet && diet !== 'none' && diet !== '') filtersQueryString += `&diet=${diet}`;
        if (maxCalories) filtersQueryString += `&maxCalories=${maxCalories}`;
        if (maxCarbs) filtersQueryString += `&maxCarbs=${maxCarbs}`;
        if (maxProtein) filtersQueryString += `&maxProtein=${maxProtein}`;
        if (maxSugar) filtersQueryString += `&maxSugar=${maxSugar}`;

        // --- 3. BÚSQUEDA EN SPOONACULAR (con caché) ---
        // ¡CAMBIO AQUÍ! Añadimos 'sort=min-missing-ingredients' a la clave
        const spoonacularSearchCacheKey = `spoonacular:search:${ingredientsCommaSeparated}:sort=min-missing-ingredients:${filtersQueryString}`;
        let data;
        const cachedSearch = await CacheEntry.findOne({ cacheKey: spoonacularSearchCacheKey });

        if (cachedSearch) {
          data = cachedSearch.data;
          console.log(`[DB CACHE HIT] Búsqueda Spoonacular para: "${ingredientsCommaSeparated}${filtersQueryString}"`);
        } else {
          console.log(`[DB CACHE MISS] Llamando a Spoonacular Search para: "${ingredientsCommaSeparated}${filtersQueryString}"`);

            // ¡CAMBIO AQUÍ! Añadimos '&sort=min-missing-ingredients' a la URL
          const url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${SPOONACULAR_API_KEY}&includeIngredients=${encodeURIComponent(ingredientsCommaSeparated)}&number=5&fillIngredients=true&ignorePantry=true&sort=min-missing-ingredients${filtersQueryString}`;

          const respuesta = await fetch(url);
          data = await respuesta.json();

          if (!respuesta.ok) {
            console.error("❌ ERROR DE SPOONACULAR (Search):", { status: respuesta.status, statusText: respuesta.statusText, body: data });
            throw new Error("Error al llamar a Spoonacular API (Search).");
          }
          await CacheEntry.create({
            cacheKey: spoonacularSearchCacheKey,
            data: data.results
          });
          data = data.results;
        }

        if (!data || data.length === 0) {
            return res.status(200).json([]);
        }

        // --- 4. TRADUCCIÓN DE RECETAS (EN -> ES) ---
        // a. Agrupar Títulos
        const englishTitles = data.map(recipe => recipe.title);
        const joinedEnglishTitles = englishTitles.join(separador);
        const titlesPrompt = `Translate the following list of recipe titles to Spanish. Keep the exact same separator ("${separador}") between each item: "${joinedEnglishTitles}"`;

        // b. Agrupar TODOS los ingredientes faltantes
        const allMissingIngredients = [];
        data.forEach(recipe => { // eslint-disable-line no-undef
            if (recipe.missedIngredients) {
                recipe.missedIngredients.forEach(ing => {
                    allMissingIngredients.push(ing.original);
                });
            }
        });

        let joinedMissingIngredients = "";
        let missingIngredientsPrompt = "";
        if (allMissingIngredients.length > 0) { // eslint-disable-line no-undef
            joinedMissingIngredients = allMissingIngredients.join(separador);
            missingIngredientsPrompt = `Translate the following list of kitchen ingredients to Spanish. Keep the exact same separator ("${separador}") between each item: "${joinedMissingIngredients}"`;
        }

        // c. Ejecutar ambas traducciones en paralelo
        const [
            translatedTitlesString,
            translatedMissingString
        ] = await Promise.all([
            translationService.translateText(titlesPrompt, 'en', 'es'),
            missingIngredientsPrompt ? translationService.translateText(missingIngredientsPrompt, 'en', 'es') : Promise.resolve(null)
        ]);

        // d. Procesar resultados
        let translatedTitles = translatedTitlesString ? translatedTitlesString.split(separador).map(s => s.trim()) : [];
        let translatedMissing = translatedMissingString ? translatedMissingString.split(separador).map(s => s.trim()) : [];

        // e. Crear el array final
        let missingIngredientIndex = 0;
        const translatedData = data.map((recipe, recipeIndex) => {

            const translatedMissedIngredients = recipe.missedIngredients ? recipe.missedIngredients.map(ing => {
                const translatedOriginal = translatedMissing[missingIngredientIndex] || ing.original;
                missingIngredientIndex++;
                return {
                    ...ing,
                    original: translatedOriginal
                };
            }) : [];

            return {
                ...recipe,
                title: translatedTitles[recipeIndex] || recipe.title,
                missedIngredients: translatedMissedIngredients
            };
        });

        // 5. Enviar los datos TRADUCIDOS al frontend
        res.status(200).json(translatedData);

    } catch (error) {
        console.error("❌ ERROR DETALLADO EN GET /api/recetas/inventario:", error);
        res.status(500).json({ error: 'Error interno al buscar recetas.', details: error.message });
    }
});


// BUSCAR DETALLES DE RECETA (PROXY SEGURO)
/**
 * @brief Endpoint para obtener los detalles de una receta específica usando el Backend como proxy seguro.
 * @route GET /api/recetas/detalles/:recipeId
 */
app.get('/api/recetas/detalles/:recipeId', async (req, res) => {
    const recipeId = req.params.recipeId;
    
    try {
        // a. Crear clave de caché para los detalles de esta receta
        const spoonacularDetailsCacheKey = `spoonacular:details:${recipeId}`;
        let data; // Variable para los detalles

        // b. Buscar en el caché de MongoDB
        const cachedDetails = await CacheEntry.findOne({ cacheKey: spoonacularDetailsCacheKey });

        if (cachedDetails) {
          // ¡Cache Hit!
          data = cachedDetails.data;
          console.log(`[DB CACHE HIT] Detalles Spoonacular para ID: "${recipeId}"`);
        } else {
          // ¡Cache Miss!
          console.log(`[DB CACHE MISS] Llamando a Spoonacular Details para ID: "${recipeId}"`);

          const url = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}`;
          const respuesta = await fetch(url);
          data = await respuesta.json(); // Datos actualizados

          if (!respuesta.ok) {
            console.error("❌ ERROR DE SPOONACULAR (Details):", { 
                status: respuesta.status, 
                statusText: respuesta.statusText,
                body: data 
            });
            // Reenviar el error si Spoonacular falla
            return res.status(respuesta.status).json({ error: 'Error de la API externa al obtener detalles.', details: data.message });
          }

          // GUARDAMOS la respuesta nueva en MongoDB
          await CacheEntry.create({
            cacheKey: spoonacularDetailsCacheKey,
            data: data // Guardamos el objeto de detalles completo
          });
          console.log(`[DB CACHE SAVED] Detalles Spoonacular para ID: "${recipeId}"`);
        }
        
        
        // 1. (Igual que antes) Traducciones individuales para campos grandes
        const translatedTitlePromise = translationService.translateText(data.title, 'en', 'es');
        const translatedSummaryPromise = translationService.translateText(data.summary, 'en', 'es');
        const translatedInstructionsPromise = translationService.translateText(data.instructions, 'en', 'es');

        // 2. [NUEVA LÓGICA] Agrupación de ingredientes

        // Extraemos todos los strings de ingredientes
        const originalIngredientStrings = data.extendedIngredients.map(ing => ing.original);

        // Definimos un separador ÚNICO que no exista en el texto
        const separator = "|||"; 

        // Unimos todos los ingredientes en UN SOLO string
        const joinedIngredientString = originalIngredientStrings.join(separator);

        // 3. [NUEVA PROMESA] Creamos UN solo prompt para TODOS los ingredientes
        const ingredientsPrompt = `Translate the following list of ingredients to Spanish. Keep the exact same separator ("${separator}") between each item: "${joinedIngredientString}"`;

        const translatedIngredientsPromise = translationService.translateText(ingredientsPrompt, 'en', 'es');

        // 4. [NUEVO Promise.all] Esperamos a que las 4 llamadas terminen
        //    (Esto reduce de ~18 llamadas a solo 4)
        const [
            translatedTitle,
            translatedSummary,
            translatedInstructions,
            translatedJoinedString // Esto es un solo string con los ingredientes traducidos
        ] = await Promise.all([
            translatedTitlePromise,
            translatedSummaryPromise,
            translatedInstructionsPromise,
            translatedIngredientsPromise 
        ]);

        // 5. [NUEVA LÓGICA] Separamos el string traducido de vuelta a un array
        let translatedIngredients = [];
        if (translatedJoinedString) {
            // Usamos el mismo separador para volver a crear el array
            translatedIngredients = translatedJoinedString.split(separator);
        }

        // 6. Construimos el objeto de receta traducido final
        const translatedData = {
            ...data, // Copiamos datos originales (id, image, etc.)
            title: translatedTitle || data.title, // Usamos traducido o el original
            summary: translatedSummary || data.summary,
            instructions: translatedInstructions || data.instructions,
            // Re-mapeamos los ingredientes para asignar la traducción correcta
            extendedIngredients: data.extendedIngredients.map((ing, index) => {
                return {
                    ...ing, // Copiamos datos del ingrediente original (amount, unit, etc.)
                    // Asignamos la traducción del array o el original si algo falló
                    original: (translatedIngredients[index] ? translatedIngredients[index].trim() : ing.original),
                };
            })
        };

        // 7. Enviamos los datos TRADUCIDOS al frontend
        res.status(200).json(translatedData);

    } catch (error) {
        // Manejo de errores de red o internos del servidor
        res.status(500).json({ error: 'Error interno del servidor al buscar detalles de receta.', details: error.message });
    }
});

/**
 * @brief Endpoint de Bienvenida.
 * * @route GET /
 */
app.get('/', (req, res) => {
    res.status(200).send('<h1>API de Recetas Activa</h1><p>Los endpoints de autenticación son POST /api/register y POST /api/login</p>');
});

// 4. INICIO DEL SERVIDOR (Método robusto)
mongoose.connect(DB_URI)
    .then(() => {
        console.log('✅ Conexión exitosa a MongoDB.');
        
        // Inicia el servidor Express SOLO si la conexión a la DB es exitosa
        app.listen(PORT, () => {
            console.log(`\n==============================================`);
            console.log(` SERVIDOR BACKEND INICIADO`);
            console.log(`Puerto: http://localhost:${PORT}`);
            console.log(`==============================================`);
            console.log(`Rutas disponibles:`);
            console.log(`  - POST /api/register (Registro)`);
            console.log(`  - POST /api/login    (Login)`);
            console.log(`  - GET /api/profile         (Obtener Perfil)`);
            console.log(`  - PUT /api/profile         (Actualizar Perfil)`);
            console.log(`  - POST /api/inventario       (Crear Alimento)`);
            console.log(`  - GET /api/inventario/check (Chequear si Alimento existe)`);
            console.log(`  - GET /api/inventario        (Listar Inventario)`);
            console.log(`  - PATCH /api/inventario/:id/sumar (Sumar Cantidad)`);
            console.log(`  - PUT /api/inventario/:id    (Actualizar Alimento)`);
            console.log(`  - DELETE /api/inventario/:id (Eliminar Alimento)`);
            console.log(`  - GET /api/recetas/inventario (Buscar Recetas por Inventario)`);
            console.log(`  - GET /api/recetas/detalles/:id (PROXY: Detalles de Receta)`);
            console.log(`\n`);
        });
    })
    .catch(err => {
        console.error('❌ Error de conexión a MongoDB:', err.message);
        process.exit(1); // Detiene la aplicación si no se puede conectar a la DB
    });
