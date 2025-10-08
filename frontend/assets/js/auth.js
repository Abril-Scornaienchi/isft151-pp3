/**
 * @file auth.js
 * @brief Módulo de lógica del Frontend para la Autenticación (Registro e Inicio de Sesión).
 * * Este archivo contiene la funcionalidad principal para interactuar con la API del Backend,
 * utilizando la API 'fetch' y la sintaxis 'async/await' para manejar las operaciones asíncronas.
 */

// 1. CONFIGURACIÓN DE ENDPOINTS
// =================================================================

// Define la URL base de nuestro servidor backend, incluyendo el puerto, dirección de nuestra aplicación Express.js.
const BACKEND_URL = 'http://localhost:3000/api';


// 2. FUNCIÓN CENTRAL DE COMUNICACIÓN (ASYNC/AWAIT)
// =================================================================

/**
 * @brief Envía una petición de autenticación (POST) al servidor backend.
 * * Esta función es el corazón de la comunicación. Está marcada como 'async'
 * porque utilizará la palabra clave 'await' internamente para pausar la ejecución
 * hasta que se complete una Promesa (la respuesta del servidor).
 * * @param {string} endpoint - La ruta específica de la API ('/register' o '/login').
 * @param {object} data - El objeto JavaScript con los datos del formulario (ej: {email: "x", password: "y"}).
 * @returns {Promise<object>} Devuelve una Promesa que resuelve en los datos de respuesta del servidor (JSON).
 */
async function sendAuthRequest(endpoint, data) {
    try {
        // 💡 1. Petición 'fetch'
        // 'await' pausa hasta que se recibe una respuesta (Promesa Resuelta).
        // La Promesa solo falla por error de red; si recibe un 400 o 500, se considera éxito.
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'POST', // Usamos el método POST para enviar datos de forma segura.
            headers: {
                // Indica al servidor que el cuerpo de la petición es JSON.
                'Content-Type': 'application/json' 
            },
            // JSON.stringify() convierte el objeto JS 'data' en una cadena de texto JSON
            // para que pueda ser enviada correctamente en el cuerpo (body) de la petición HTTP.
            body: JSON.stringify(data)
        });

        // 💡 2. Parseo del Cuerpo de la Respuesta
        // 'await' pausa de nuevo para leer y convertir el cuerpo de la respuesta HTTP a un objeto JavaScript.
        const responseData = await response.json();

        // 💡 3. Chequeo de Éxito HTTP
        // está en el rango 200-299 (ej: 200 OK, 201 Created).
        if (!response.ok) {
            // Si el código es 4xx o 5xx, lanzamos un error manual para que sea capturado
            // por el bloque 'catch' de esta función. Esto simula el fallo de la Promesa.
            // Usamos 'responseData.error' porque así nombramos el campo de error en nuestro backend.
            throw new Error(responseData.error || 'Ocurrió un error desconocido.');
        }

        // Si todo va bien (código 200/201), retornamos los datos al código que llamó a la función.
        return responseData; 

    } catch (error) {
        // Captura y relanza el error. Puede ser un error de red (fetch) o un error
        // lanzado manualmente (throw new Error) por un código HTTP 400/409/401.
        throw new Error(error.message);
    }
}


// 3. FUNCIÓN DE UTILIDAD (UI)
// =================================================================

/**
 * @brief Muestra mensajes de error o éxito al usuario en la interfaz.
 * @param {string} messageId - ID del elemento HTML (<p>) donde se mostrará el mensaje.
 * @param {string} message - El texto del mensaje.
 * @param {boolean} isError - Si es true, aplica estilos de error (rojo).
 */
function displayMessage(messageId, message, isError = true) {
    const element = document.getElementById(messageId);
    if (element) {
        element.textContent = message;
        element.className = isError ? 'error-message' : 'success-message';
        element.style.display = 'block';
    }
}


// 4. LÓGICA DEL LOGIN
// =================================================================

// 1. Intentamos obtener el formulario de Login (solo existirá en index.html)
const loginForm = document.getElementById('login-form');

if (loginForm) {
    // 2. Si existe, adjuntamos un 'EventListener' para escuchar el evento de envío (submit).
    loginForm.addEventListener('submit', async (event) => {
        // Detiene el comportamiento por defecto del formulario (evita la recarga de página).
        event.preventDefault(); 

        // Capturamos los valores de los campos del formulario.
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const messageId = 'login-message';

        // Muestra un mensaje de 'cargando' antes de la petición.
        displayMessage(messageId, 'Iniciando sesión...', false); 

        // 💡 Manejo de la Asincronía
        try {
            const data = { email, password };
            // 'await' llama a la función de comunicación central y espera el resultado.
            const result = await sendAuthRequest('/login', data);

            // Éxito: La Promesa resolvió sin errores (código 200).
            // Usamos 'username' que es lo que el backend devuelve; si no existe, usamos 'nombre' como fallback.
            displayMessage(messageId, `Bienvenido, ${result.username || result.nombre || ''}. Redirigiendo...`, false);
            
            // Guarda el ID que el servidor te devuelve. Asumimos que el backend lo llama 'id'.
            localStorage.setItem('userId', result.id); 

            // Redirección con un pequeño retraso para que el usuario lea el mensaje de éxito.
            setTimeout(() => {
                 window.location.href = 'home.html';
            }, 1500);

        } catch (error) {
            // Fallo: El bloque 'catch' atrapa errores de red o errores HTTP (ej: 401 Credenciales Inválidas).
            displayMessage(messageId, error.message);
        }
    });
}


// 5. LÓGICA DEL REGISTRO
// =================================================================

// 1. Intentamos obtener el formulario de Registro (solo existirá en register.html)
const registerForm = document.getElementById('register-form');

if (registerForm) {
    // 2. Adjuntamos el 'EventListener'.
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const messageId = 'register-message';

        displayMessage(messageId, 'Procesando registro...', false);

        // 💡 Manejo de la Asincronía
        try {
            // El backend espera 'username' en lugar de 'nombre'. Mapeamos aquí para mantener la UI en español.
            const data = { username, email, password };
            // Llama a la API de registro y espera el resultado.
            await sendAuthRequest('/register', data);

            // Éxito: La Promesa resolvió (código 201 Created).
            displayMessage(messageId, '✅ Registro exitoso. Redirigiendo al Login...', false);
            
            // Redirección a la página de login
            setTimeout(() => {
                 window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            // Fallo: Atrapa errores de red o errores HTTP (ej: 409 Email ya registrado).
            displayMessage(messageId, error.message);
        }
    });
}