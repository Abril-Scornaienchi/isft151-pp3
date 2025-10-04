//userService.js

const User_data = require('../models/User_data'); // Importamos el Modelo
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

module.exports = {
    findUserByCredentials,
    registerUser,
};