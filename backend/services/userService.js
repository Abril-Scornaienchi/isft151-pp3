//userService.js

const User_data = require('../models/User_data'); // Importamos el Modelo
const Inventory = require('../models/inventoryModel');
const bcrypt = require('bcryptjs'); 

// =================================================================
// 💡 LÓGICA DE GESTIÓN DE USUARIOS (ahora ASÍNCRONA Y PERSISTENTE)
// =================================================================

/**
 * @brief Función auxiliar para crear un usuario inicial si la DB está vacía.
 * Esto asegura que siempre haya un usuario admin para pruebas.
 */
async function initializeAdminUser() {
    try {
        const adminExists = await User_data.findOne({ email: 'admin@app.com' });
        
        if (!adminExists) {
            // Cifra la contraseña '123'
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('123', salt);

            await User_data.create({
                username: 'Admin', 
                email: 'admin@app.com',
                passwordHash: hashedPassword,
                grupo: 'Admin'
            });
            console.log('✅ Usuario Admin inicial (admin@app.com/123) creado en la DB.');
        }
    } catch (error) {
        console.error('❌ Error al inicializar usuario admin:', error.message);
    }
}

/**
 * @brief Busca un usuario por sus credenciales (email y contraseña) y verifica el hash.
 */
async function findUserByCredentials(email, password) {
    // 1. Encontrar el usuario por email
    const user = await User_data.findOne({ email });
    
    if (!user) {
        return null; // Usuario no encontrado
    }

    // 2. Comparar la contraseña ingresada con el hash cifrado
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (isMatch) {
        // Retorna el contrato de datos (simulando la respuesta de autenticación)
        return {
            _id: user._id,
            username: user.username, 
            email: user.email,
            grupo: user.grupo,
            passwordHash: user.passwordHash,
        };
    }
    
    return null; // Contraseña incorrecta
}

/**
 * @brief Registra un nuevo usuario en la base de datos.
 */
async function registerUser(username, email, password) {

    // 1. Cifrar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
        // 2. Crear el nuevo usuario en la DB
        const newUser = await User_data.create({
            username: username,
            email: email,
            passwordHash: hashedPassword,
            grupo: 'User' // Asignar grupo por defecto
        });

        // 3. Retornar el contrato de datos del nuevo usuario
        return {
            _id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            grupo: newUser.grupo,
            passwordHash: newUser.passwordHash,
        };
    } catch (error) {
        // Manejo de error de unicidad (si el email o username ya existe)
        if (error.code === 11000) { // Código de error de duplicado de MongoDB
            return null; // El registro falló por duplicidad
        }
        console.error('Error al registrar usuario en la DB:', error);
        throw error;
    }
}

// -------------------------------------------------------------------
// FUNCIONES DEL CRUD DE INVENTARIO
// -------------------------------------------------------------------

/**
 * @brief Crea y guarda un nuevo registro de alimento en la base de datos.
 * Metodo CREATE del CRUD de Inventario.
 */
async function addAlimento(userId, article_name, quantity, unit) {
    const nuevoAlimento = await Inventory.create({
        user: userId, 
        article_name,
        quantity: parseInt(quantity),
        unit
    });
    return nuevoAlimento;
}

/**
 * @brief Recupera todos los alimentos que pertenecen a un usuario específico.
 * Metodo READ del CRUD de Inventario.
 */
async function getAlimentosByUsuario(userId) {
    return await Inventory.find({ user: userId });
}

/**
 * @brief Actualiza la cantidad y unidad de un alimento existente.
 * Aplica una doble verificación de seguridad: por ID del alimento y por ID del usuario.
 * Metodo UPDATE del CRUD de Inventario.
 */
async function updateAlimento(alimentoId, userId, nuevaCantidad, nuevaUnidad) {
    const result = await Inventory.updateOne(
        { _id: alimentoId, user: userId }, 
        { $set: { quantity: parseInt(nuevaCantidad), unit: nuevaUnidad } }
    );
    return result.modifiedCount === 1;
}

/**
 * @brief Elimina un alimento específico de la base de datos.
 * Metodo DELETE del CRUD de Inventario. 
 */
async function deleteAlimento(alimentoId, userId) {
    const result = await Inventory.deleteOne({ _id: alimentoId, user: userId });
    return result.deletedCount === 1;
}

module.exports = {
    findUserByCredentials,
    registerUser,
    initializeAdminUser,
    addAlimento, 
    getAlimentosByUsuario, 
    updateAlimento, 
    deleteAlimento, 
};