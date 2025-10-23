/**
 * @file inventory.js
 * @brief Módulo de lógica del Frontend para la Gestión de Inventario y Recetas.
 * * Este archivo contiene la funcionalidad principal para la interfaz de usuario:
 * carga de datos, manejo de eventos CRUD (Crear, Leer, Actualizar, Eliminar),
 * integración con el reconocimiento de voz y consulta de recetas.
 * Utiliza la API 'fetch' para comunicarse con los endpoints protegidos del Backend.
 */

const BACKEND_URL = 'http://localhost:3000/api';
let currentUserId = null;

// =========================================================================
// 1. INICIALIZACIÓN Y CARGA
// =========================================================================
/**
 * @brief Inicializa la página 'home' (inventario) después de la carga del DOM.
 * * Realiza la verificación de autenticación de Frontend (control de sesión), 
 * carga el inventario y conecta todos los manejadores de eventos (botones y formularios) para iniciar la interactividad de la página.
 */
function initHome() {
    const storedId = localStorage.getItem('userId');

    if (storedId) {
        currentUserId = storedId;
        loadInventory();
        // Conecta el formulario de agregar al manejador
        document.getElementById('add-item-form').addEventListener('submit', handleAddItem);
        // Conecta el botón de buscar recetas
        document.getElementById('search-recipes-btn').addEventListener('click', handleSearchRecipes);
        // Conecta el enlace de cerrar sesión
        document.getElementById('logout-link').addEventListener('click', handleLogout);
    } else {
        window.location.href = 'index.html'; 
    }
}

// -----------------------------------------------------
// FUNCIÓN LISTAR (READ - Llama a GET /api/inventario)
// -----------------------------------------------------
/**
 * @brief Función para cargar y mostrar el inventario del usuario.
 * Llama al endpoint GET del Backend para obtener todos los artículos
 * asociados al usuario actual y actualiza el DOM de la página.
 */
async function loadInventory() {
    try {
        const response = await fetch(`${BACKEND_URL}/inventario?userId=${currentUserId}`); 
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al cargar el inventario.');
        }

        renderInventory(data); // Muestra los datos en la tabla
        renderRecipes([]); // Limpia las recetas
    } catch (error) {
        console.error('Error al cargar el inventario:', error.message);
        alert('No se pudo conectar con el inventario: ' + error.message);
    }
}

/**
 * @brief Maneja el cierre de sesión del usuario.
 * Limpia el almacenamiento local y redirige a la página de inicio de sesión.
 * @param {Event} event - El objeto de evento del clic (para prevenir el comportamiento por defecto del enlace).
 */
function handleLogout(event) {
    event.preventDefault(); // Evita que el enlace '#' navegue
    localStorage.removeItem('userId');
    window.location.href = 'index.html';
}

// =========================================================================
// 2. OPERACIONES CRUD (CREATE, UPDATE, DELETE)
// =========================================================================

/**
 * @brief Maneja la acción de envío del formulario de Agregar Ingrediente.
 * @param {Event} event - El objeto de evento del formulario (para prevenir el recarga de página).
 */
async function handleAddItem(event) {
    event.preventDefault();

    const article_name = document.getElementById('article_name').value;
    const quantity = document.getElementById('quantity').value;
    const unit = document.getElementById('unit').value;
        
    await sendItemToBackend(article_name, quantity, unit);

}

/**
 * @brief Función auxiliar encargada de la comunicación directa con el endpoint POST de creación.
 * Recibe los datos de un artículo de forma manual o por voz
 * y realiza la petición HTTP al Backend para el registro en la base de datos.
 * @param {string} article_name - Nombre del artículo a registrar.
 * @param {string} quantity - Cantidad del artículo.
 * @param {string} unit - Unidad de medida del artículo.
 * @returns {Promise<object>} Objeto con 'success' y 'message' indicando el resultado de la operación.
 */
async function sendItemToBackend(article_name, quantity, unit) {
    try {
        const response = await fetch(`${BACKEND_URL}/inventario?userId=${currentUserId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ article_name, quantity, unit }) 
        });
        
        const result = await response.json();

        if (!response.ok) {
             throw new Error(result.error || 'Error al guardar el alimento.');
        }

        loadInventory(); 
        // Si fue el formulario manual, queremos resetearlo. Si fue voz, no importa.
        const form = document.getElementById('add-item-form');
        if (form) form.reset(); 
        
        // Retornar éxito o un mensaje si es necesario
        return { success: true, message: 'Ingrediente guardado con éxito.' };

    } catch (error) {
        console.error('Fallo al agregar:', error.message);
        alert('Fallo al agregar: ' + error.message);
        return { success: false, message: error.message };
    }
}


/**
* @brief Maneja la solicitud de eliminación de un alimento.
* Llama al endpoint DELETE del Back, pasando el ID del alimento y el ID del usuario
* @param {string} alimentoId - El ID de MongoDB del alimento que se desea eliminar.
 */
async function handleDeleteItem(alimentoId) {
    console.log("currentUserId ANTES del fetch:", currentUserId); 
    console.log("ID del alimento a eliminar:", alimentoId); 
    console.log("ID del usuario (currentUserId):", currentUserId);
    if (!confirm('¿Estás seguro de que quieres eliminar este alimento?')) {
        return;
    }

    try {
        // Llama a la ruta DELETE, usando el ID del alimento en la dirección
        const response = await fetch(`${BACKEND_URL}/inventario/${alimentoId}?userId=${currentUserId}`, {
            method: 'DELETE',
        });
        
        // ⚠️ Si la URL estuviera rota, el error se dispararía AQUI antes de .json() ⚠️
        const result = await response.json(); 

        if (!response.ok) {
            throw new Error(result.error || 'Error al eliminar el alimento.');
        }

        alert('Alimento eliminado con éxito.');
        loadInventory(); // Recarga la lista
    } catch (error) {
        // La URL de falló (Failed to fetch) se atrapa aquí.
        console.error('Fallo al eliminar:', error.message);
        alert('Fallo al eliminar: ' + error.message);
    }
}


/**
 * @brief Maneja la solicitud de actualización de la cantidad de un alimento.
 * Pide al usuario la nueva cantidad mediante un prompt y llama al endpoint PUT del Backend.
 * @param {string} alimentoId - El ID de MongoDB del alimento que se desea actualizar.
 */
async function handleUpdateItem(alimentoId) {
    console.log("ID del alimento a eliminar:", alimentoId); 
    console.log("ID del usuario (currentUserId):", currentUserId);
    // 1. En un entorno simple, pedimos la nueva cantidad por un prompt
    const nuevaCantidadStr = prompt("Introduce la nueva cantidad:");
    
    if (nuevaCantidadStr === null || isNaN(parseInt(nuevaCantidadStr))) {
        alert("Actualización cancelada o cantidad inválida.");
        return;
    }
    
    // 2. Obtener la unidad del DOM
    const unidad = document.querySelector(`#inventory-item-${alimentoId} .unit-cell`).textContent;

    try {
        // Llama a la ruta PUT
        const response = await fetch(`${BACKEND_URL}/inventario/${alimentoId}?userId=${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: nuevaCantidadStr, unit: unidad }) // Datos a actualizar
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Error al actualizar el alimento.');
        }
        
        alert('Alimento actualizado con éxito.');
        loadInventory(); // Recarga la lista

    } catch (error) {
        console.error('Fallo al actualizar:', error.message);
        alert('Fallo al actualizar: ' + error.message);
    }
}


// =========================================================================
// 3. INTEGRACIÓN DE RECETAS
// =========================================================================
/**
 * @brief Maneja el evento de búsqueda de recetas.
 * Esta función es responsable de llamar al endpoint del Backend
 * que consulta la API externa (Spoonacular) usando el inventario actual del usuario.
 * Si la llamada es exitosa, delega el resultado a la función de renderizado.
 */
async function handleSearchRecipes() {
    // Verificación previa: ¿Hay ingredientes en el inventario?
    const inventoryBody = document.getElementById('inventory-body');
    if (!inventoryBody || inventoryBody.children.length === 0 || (inventoryBody.children.length === 1 && inventoryBody.children[0].children.length === 1)) {
        alert('Debes agregar al menos un ingrediente a tu inventario para poder buscar recetas.');
        renderRecipes([]); // Limpia la lista por si había algo antes
        return; // Detiene la ejecución de la función
    }

    try {
        // Llama a tu ruta GET para recetas
        const response = await fetch(`${BACKEND_URL}/recetas/inventario?userId=${currentUserId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al buscar recetas.');
        }

        renderRecipes(data); // Muestra las recetas
    } catch (error) {
        console.error('Fallo al buscar recetas:', error.message);
        alert('Fallo al buscar recetas: ' + error.message);
    }
}



// =========================================================================
// 4. FUNCIONES DE RENDERIZADO (DIBUJAR EL HTML)
// =========================================================================
/**
 * @brief Dibuja la tabla de inventario en la página web.
 * Toma un array de objetos (el inventario) y genera dinámicamente filas de HTML.
 * Es la función que convierte los datos crudos del Backend en una tabla visible para el usuario.
 */
function renderInventory(inventory) {
    const tableBody = document.getElementById('inventory-body');
    if (!tableBody) return;

    tableBody.innerHTML = ''; // Limpia la tabla

    if (inventory.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No hay ingredientes en tu inventario.</td></tr>';
        return;
    }

    inventory.forEach(item => {
        const row = tableBody.insertRow();
        row.id = `inventory-item-${item._id}`; // Asigna un ID basado en el ID de MongoDB
        
        row.insertCell().textContent = item.article_name;
        row.insertCell().textContent = item.quantity;
        // Agregamos una clase a la unidad para poder leerla en el update simplificado
        const unitCell = row.insertCell();
        unitCell.textContent = item.unit;
        unitCell.classList.add('unit-cell'); 
        
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button onclick="handleUpdateItem('${item._id}')">Actualizar</button>
            <button onclick="handleDeleteItem('${item._id}')">Eliminar</button>
        `;
    });
}

/**
 * @brief Muestra la lista de recetas sugeridas en la página web.
 * Convierte el array de recetas recibido de la API externa (vía Backend) en elementos <li>.
 * @param {Array<object>} recipes - Array de objetos de recetas encontradas (incluye título e ingredientes faltantes).
 * @returns {void}
 */
function renderRecipes(recipes) {
    const list = document.getElementById('recipes-list');
    if (!list) return;

    list.innerHTML = ''; // Limpia la lista

    if (recipes.length === 0) {
        list.innerHTML = '<p>No se encontraron recetas o la lista está vacía.</p>';
        return;
    }
    
    recipes.forEach(recipe => {
        const li = document.createElement('li');
        li.className = 'recipe-item'; 
        
        // Construir la lista de ingredientes faltantes
        // Mapea el array de objetos de ingredientes faltantes para crear un texto legible.
        const missingList = recipe.missedIngredients
            .map(item => item.original) // Obtiene solo el nombre original del ingrediente
            .join('\n- '); // Une los nombres con un salto de línea para el Tooltip

        const tooltipText = `Faltan (${recipe.missedIngredientCount}):\n- ${missingList}`;

        // Tooltip (cajita) Personalizado
        li.innerHTML = `
            <div class="recipe-title" 
                 onclick="handleViewRecipeDetails(${recipe.id})" 
                 data-tooltip="${tooltipText}"> 
                ${recipe.title}
            </div>
            <div class="recipe-missing">
                Ingredientes faltantes: ${recipe.missedIngredientCount}
            </div>
        `;
        list.appendChild(li);
    });
}

/**
 * @brief Obtiene los detalles de una receta específica usando el BACKEND como PROXY seguro
 * y abre su URL en una nueva pestaña.
 * @param {number} recipeId - El ID de la receta de Spoonacular.
 */
async function handleViewRecipeDetails(recipeId) {

    try {
        // LLAMA A BACKEND: Usa tu nueva ruta /api/recetas/detalles/ (el proxy)
        // El Backend ahora se encarga de añadir la clave API de forma secreta.
        const response = await fetch(`${BACKEND_URL}/recetas/detalles/${recipeId}`); 
        
        const recipeDetails = await response.json();

        if (!response.ok) {
            throw new Error(recipeDetails.error || 'No se pudieron obtener los detalles de la receta.');
        }

        // Abre la URL de la receta en una nueva pestaña
        window.open(recipeDetails.sourceUrl, '_blank');
    } catch (error) {
        console.error('Error al obtener detalles de la receta:', error);
        alert('Error: ' + error.message);
    }
}

// -----------------------------------------------------
// INICIO DE LA APLICACIÓN
// -----------------------------------------------------
document.addEventListener('DOMContentLoaded', initHome);


// ======================================================
// IMPLEMENTACION DE INGRESO POR VOZ (SPEECH)
// ======================================================
//
/**
 * @brief Normaliza el nombre de la unidad transcrita para que coincida con los valores ENUM de Mongoose.
 * @param {string} unit - La unidad obtenida de la transcripción de voz.
 * @returns {string} La unidad ('kilogramos', 'mililitros', etc.).
 */
function normalizeUnit(unit) {
    const u = unit.toLowerCase().trim();
    if (u.startsWith('kilo') || u.startsWith('kg')) return 'kilogramos';
    if (u.includes('gramo') || u.includes('gr')) return 'gramos';    
    if (u.startsWith('litro') || u.startsWith('lt')) return 'litros';
    if (u.startsWith('mililitro') || u.startsWith('ml')) return 'mililitros';
    if (u.startsWith('unida') || u.startsWith('unidad')) return 'unidades';
    
    // Si no se encuentra coincidencia, usamos un valor seguro que exista en el ENUM (evita el Error 500)
    return 'unidades'; 
}

/**
 * @brief Se encarga de inicializar el sistema de reconocimiento de voz y conectar el boton
 */
function setupAudioInput() {
    // 1. Verificar soporte del navegador
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recordBtn = document.getElementById('recordAudioBtn');
    const speechResultDisplay = document.getElementById('speechResult');
    
    if (!SpeechRecognition || !recordBtn) {
        if (recordBtn) recordBtn.disabled = true;
        return; 
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES'; // Configurar idioma español
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // 2. Evento al hacer clic en el botón
    recordBtn.addEventListener('click', () => {
        try {
            recognition.start();
            recordBtn.innerText = "🔴 ESCUCHANDO...";
            speechResultDisplay.innerText = "Habla ahora, di el ingrediente (Ej: 'dos kilos de papa')";
            speechResultDisplay.style.color = 'red';
        } catch (e) {
            console.error("Error al iniciar el reconocimiento de voz:", e);
        }
    });

    // 3. Evento cuando el reconocimiento captura el resultado
    recognition.addEventListener('result', async (event) => { // <-- Importante: 'async' aquí
        const transcript = event.results[0][0].transcript;
        
        recordBtn.innerText = "🎙️ Ingreso por Voz";
        
        // --- LÓGICA DE PARSEADO SIMPLE ---
        const parts = transcript.split(' de ');
        
        if (parts.length < 2) {
            speechResultDisplay.innerText = `Transcripción: "${transcript}" (Error: Intenta: 'Cantidad UNIDAD de Articulo')`;
            speechResultDisplay.style.color = 'orange';
            return;
        }

        const articleName = parts[1].trim(); 
        const quantityUnit = parts[0].trim().split(' ');
        
        let quantity = '1';
        let unit = 'unidades'; 

        if (quantityUnit.length >= 2) {
             quantity = quantityUnit[0].trim();
             unit = quantityUnit.slice(1).join(' ').trim(); 
        }

        const parsedNum = parseInt(quantity); 
        
        if (isNaN(parsedNum) || parsedNum <= 0) {
            // Si es texto (ej: dos) o inválido, lo forzamos a 1.
            quantity = '1'; 
        } else {
            // Si es un número válido (ej: 2, lo usamos.
            quantity = parsedNum.toString(); 
        }

        // Normalizar Unidad
        unit = normalizeUnit(unit); 

        speechResultDisplay.innerText = `✔️ Procesando: ${quantity} ${unit} de ${articleName}`;
        speechResultDisplay.style.color = 'green';
        
        // 4. LLAMADA A TU FUNCIÓN AUXILIAR (CONEXIÓN CRÍTICA)
        const result = await sendItemToBackend(articleName, quantity, unit);

        if (result.success) {
            speechResultDisplay.innerText = `✅ Guardado: ${quantity} ${unit} de ${articleName}`;
        } else {
            speechResultDisplay.innerText = `❌ Error al guardar: ${result.message}`;
        }
    });

    // 5. Eventos de fin y error
    recognition.addEventListener('end', () => {
        // No restauramos el botón aquí, lo hacemos en 'result' o 'error'
    });
    
    recognition.addEventListener('error', (event) => {
        speechResultDisplay.innerText = `Error de voz: ${event.error}. Vuelve a intentarlo.`;
        speechResultDisplay.style.color = 'red';
        recordBtn.innerText = "🎙️ Ingreso por Voz";
    });
}

// 6. Ejecuta la configuración de voz DESPUÉS de initHome
document.addEventListener('DOMContentLoaded', setupAudioInput);