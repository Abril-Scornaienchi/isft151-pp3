/**
 * @file userService.js
 * @brief Módulo de servicio para la gestión de usuarios (persistencia y lógica de negocio).
 * * Este módulo se encarga de simular las operaciones de base de datos para los usuarios,
 * manteniendo los datos en memoria (hardcodeados).
 */

// 💡 ALMACENAMIENTO TEMPORAL: Array que simula la tabla de usuarios en una base de datos (hardcodeada).
let usersDB = [
    { id: 1, nombre: 'Admin', email: 'admin@app.com', password: '123', grupo: 'Admin' }, 
    { id: 2, nombre: 'Aylen', email: 'aylen@app.com' , password: '123', grupo: 'User' },
];

// Variable para el próximo ID de usuario (simula un auto-incremento de la DB).
let nextId = usersDB.length + 1;

/**
 * @brief Busca un usuario por sus credenciales (email y contraseña).
 * * Esta función simula la consulta a la base de datos para autenticar un usuario.
 * Preserva el contrato de datos al devolver un objeto sin la contraseña.
 * * @param {string} email - Correo electrónico del usuario.
 * @param {string} password - Contraseña sin cifrar.
 * @returns {object | undefined} Objeto Usuario con { id, nombre, email, passwordHash } si es válido, o 'undefined'.
 */
function findUserByCredentials(email, password) {
    // Buscar la coincidencia de email y contraseña en el array
     // ⚠️ NOTA: En la práctica, se compararía 'password' con el hash real (ej: bcrypt.compare(password, user.password))
    const user = usersDB.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Retorna solo los datos esenciales (el contrato)
        return {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            passwordHash: user.password, //  RETORNO: Se crea el objeto con el campo passwordHash
            grupo: user.grupo,
        };
    }
    return undefined;
}

/**
 * @brief Registra un nuevo usuario en el sistema.
 * * Verifica si el email ya existe antes de añadir un nuevo usuario al 'almacén' en memoria.
 * * @param {string} nombre - Nombre del usuario.
 * @param {string} email - Correo electrónico único para el registro.
 * @param {string} password - Contraseña del usuario.
 * @returns {object | null} El nuevo objeto Usuario con { id, nombre, email, passwordHash } o 'null'.
 */
function registerUser(nombre, email, password) {
    // 1. Verificar si el usuario ya existe
    const usuarioExistente = usersDB.find(u => u.email === email);
    if (usuarioExistente) {
        return null; // Conflicto: Email ya en uso
    }

    const newUser = {
        id: nextId++,
        nombre,
        email,
        password: password,
        grupo: 'User' // Todos los nuevos usuarios son del grupo 'User'
    };
    usersDB.push(newUser);

    // 2. Retornar el contrato de datos del nuevo usuario
    return {
        id: newUser.id,
        nombre: newUser.nombre,
        email: newUser.email,
        passwordHash: newUser.password,
        grupo: newUser.grupo
    };
}

// 💡 EXPORTACIÓN: Hacemos que solo estas funciones sean accesibles desde fuera del módulo.
module.exports = {
    findUserByCredentials,
    registerUser,
};