//backend/services/userService.js

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
 * @brief Busca un alimento por nombre y usuario.
 * @returns {object | null} El alimento existente o null.
 */
async function findAlimentoByName(userId, article_name) {
    // Convierte el nombre a minúsculas y elimina espacios para una búsqueda más robusta
    const cleanName = article_name.toLowerCase().trim();
    
    // Busca en la DB donde coincidan el usuario y el nombre limpio
    return await Inventory.findOne({ 
        user: userId, 
        article_name: cleanName 
    });
}

/**
 * @brief Crea un nuevo registro o actualiza la cantidad de uno existente.
 */
async function createOrUpdateAlimento(userId, article_name, quantity, unit) {
    const cleanName = article_name.toLowerCase().trim();
    const parsedQuantity = parseInt(quantity);
    
    // 1. BUSCAR: Ver si el alimento ya existe para este usuario
    const existingAlimento = await findAlimentoByName(userId, cleanName);

    if (existingAlimento) {
        // 2. ACTUALIZAR SI EXISTE: Si se encuentra, sumamos la nueva cantidad.
        // Asumimos que quieres SUMAR la cantidad, ya que preguntar al Backend es complejo.
        const newQuantity = existingAlimento.quantity + parsedQuantity;
        
        // Ejecutamos la actualización directamente en la DB
        const result = await Inventory.updateOne(
            { _id: existingAlimento._id, user: userId },
            { $set: { quantity: newQuantity, unit: unit, article_name: cleanName } }
        );
        
        if (result.modifiedCount === 1) {
             // Retornamos el objeto con la nueva cantidad
             return { ...existingAlimento.toObject(), quantity: newQuantity }; 
        }
        return existingAlimento; // Si no hubo cambios, retornamos el original
    }

    // 3. CREAR SI NO EXISTE: Si no se encuentra, creamos el nuevo alimento.
    const nuevoAlimento = await Inventory.create({
        user: userId, 
        article_name: cleanName,
        quantity: parsedQuantity,
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
 * @brief Suma una cantidad a un alimento existente usando un operador de MongoDB.
 */
async function sumarCantidadAlimento(alimentoId, userId, cantidadASumar) {
    // Usamos $inc (increment) de MongoDB, que es el método más seguro para sumar valores.
    const result = await Inventory.updateOne(
        { _id: alimentoId, user: userId },
        { $inc: { quantity: cantidadASumar } }
    );
    
    // Retorna true si un documento fue modificado.
    return result.modifiedCount === 1;
}

/**
 * @brief Actualiza un alimento existente.
 * Construye dinámicamente el objeto de actualización solo con los campos proporcionados.
 */
async function updateAlimento(alimentoId, userId, nuevoNombre, nuevaCantidad, nuevaUnidad) {
    
    // 1. Construimos el objeto de actualización dinámicamente
    const updateFields = {};
    
    if (nuevoNombre) {
        updateFields.article_name = nuevoNombre;
    }
    if (nuevaCantidad) {
        updateFields.quantity = parseInt(nuevaCantidad);
    }
    if (nuevaUnidad) {
        updateFields.unit = nuevaUnidad;
    }

    // 2. Si no se proporcionó ningún campo para actualizar, no hacemos nada.
    if (Object.keys(updateFields).length === 0) {
        return false; //(ningún cambio = éxito)
    }

    // 3. Ejecutamos la actualización
    const result = await Inventory.updateOne(
        { _id: alimentoId, user: userId }, 
        { $set: updateFields }
    );
    
    // Retorna true si algo fue encontrado y modificado.
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
    findAlimentoByName,
    createOrUpdateAlimento, 
    getAlimentosByUsuario, 
    sumarCantidadAlimento,
    updateAlimento, 
    deleteAlimento, 
};