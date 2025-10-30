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
        connectEventListeners(); 
        loadInventory();
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
        document.querySelector('.home-container').classList.remove('recipe-view-active');
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
 * @brief Funcion auxiliar encargada de la comunicacion directa con el endpoint POST de creacion.
 * Recibe los datos de un artículo, chequea si existe un duplicado en el Backend
 * y pregunta al usuario como proceder (Sumar o Reemplazar).
 * @param {string} article_name - Nombre del artículo a registrar.
 * @param {string} quantity - Cantidad del artículo.
 * @param {string} unit - Unidad de medida del artículo.
 * @returns {Promise<object>} Objeto con 'success' y 'message' indicando el resultado de la operacion.
 */
async function sendItemToBackend(article_name, quantity, unit) {
    
    // Limpieza y normalización de datos
    const cleanArticleName = article_name ? article_name.toLowerCase().trim() : '';
    const parsedQuantity = parseInt(quantity);

    if (!cleanArticleName || isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return { success: false, message: 'El nombre o la cantidad son inválidos.' };
    }

    try {
        let finalResponse;
        let finalAction;

        // CHEQUEO DE DUPLICADOS
        const checkUrl = `${BACKEND_URL}/inventario/check?name=${cleanArticleName}&userId=${currentUserId}`;
        const checkResponse = await fetch(checkUrl);
        const checkData = await checkResponse.json();

        if (checkResponse.ok && checkData.exists) {
            // DUPLICADO ENCONTRADO: Preguntar
            const action = confirm(`El alimento "${cleanArticleName}" ya existe (Cant: ${checkData.quantity} ${checkData.unit}). ¿Deseas SUMAR la nueva cantidad (${parsedQuantity} ${unit})? \n\n[Aceptar] para Sumar\n[Cancelar] para Reemplazar y cambiar la unidad`);
            
            const existingId = checkData.id; 

            if (action) {
                // SUMAR (Llamar al PATCH)
                finalAction = 'Sumar';
                const patchUrl = `${BACKEND_URL}/inventario/${existingId}/sumar?userId=${currentUserId}`;
                finalResponse = await fetch(patchUrl, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantity: parsedQuantity })
                });

            } else {
                // REEMPLAZAR (Llamar al PUT)
                finalAction = 'Reemplazar';
                const putUrl = `${BACKEND_URL}/inventario/${existingId}?userId=${currentUserId}`;
                 finalResponse = await fetch(putUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantity: parsedQuantity, unit: unit, article_name: cleanArticleName })
                });
            }
            
        } else {
            // NO EXISTE: Logica de Creación (POST original)
            finalAction = 'Crear';
            finalResponse = await fetch(`${BACKEND_URL}/inventario?userId=${currentUserId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ article_name: cleanArticleName, quantity: parsedQuantity, unit: unit })
            });
        }

        // --- MANEJO DE RESPUESTA FINAL ---
        const result = await finalResponse.json();

        if (!finalResponse.ok) {
            throw new Error(result.error || `Error al ejecutar la acción: ${finalAction}.`);
        }

        // Si fue exitoso, recarga la lista y limpia el formulario
        loadInventory();
        document.getElementById('add-item-form').reset();
        return { success: true, message: `Operación (${finalAction}) completada con éxito.` };

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
    // 1. Obtenemos la fila (row) completa del ingrediente
    const row = document.getElementById(`inventory-item-${alimentoId}`);
    if (!row) return; // Seguridad por si la fila no existe

    // 2. Extraemos los valores ACTUALES de la tabla
    const nombreActual = row.cells[0].textContent;
    const cantidadActual = row.cells[1].textContent;
    const unidadActual = row.cells[2].textContent;

    // 3. Pedimos los nuevos valores (usando los actuales como valor por defecto)
    const nuevoNombre = prompt("Nombre del artículo:", nombreActual);
    const nuevaCantidad = prompt("Nueva cantidad:", cantidadActual);
    const nuevaUnidad = prompt("Nueva unidad:", unidadActual);

    // 4. Si el usuario cancela CUALQUIERA de los prompts, salimos.
    if (nuevoNombre === null || nuevaCantidad === null || nuevaUnidad === null) {
        alert("Actualización cancelada.");
        return;
    }
    try {
        // 5. Llamamos a la ruta PUT con los 3 campos en el body
        const response = await fetch(`${BACKEND_URL}/inventario/${alimentoId}?userId=${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                article_name: nuevoNombre,
                quantity: nuevaCantidad,
                unit: nuevaUnidad
            })
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
 * que consulta la API externa (Spoonacular) usando el inventario actual del usuario,
 * aplicando filtros nutricionales y de dieta.
 */
async function handleSearchRecipes() {
    // 1. OBTENER VALORES DE FILTRO DEL FORMULARIO
    const diet = document.getElementById('diet_preference').value;
    const maxCalories = document.getElementById('maxCalories').value;
    const maxCarbs = document.getElementById('maxCarbs').value;
    const maxProtein = document.getElementById('maxProtein').value;
    const maxSugar = document.getElementById('maxSugar').value; 

    // 2. FETCH: OBTENER EL INVENTARIO COMPLETO (SIN FILTRAR)
    const inventoryResponse = await fetch(`${BACKEND_URL}/inventario?userId=${currentUserId}`);
    const rawInventory = await inventoryResponse.json();
    
    // Si la carga del inventario falló o está vacío
    if (!inventoryResponse.ok || !rawInventory || rawInventory.length === 0) {
        alert('Error al cargar inventario o está vacío. Asegúrate de tener artículos guardados.');
        renderRecipes([]);
        return;
    }

    // 4. CONSTRUIR LA LISTA FINAL (Anti-Sobrecarga y Anti-Duplicados)
    // Se usa Set para asegurar que 'papa' y 'Papa' no se cuenten doble si Mongoose los devolvió mal
    const uniqueIngredients = new Set(rawInventory.map(item => item.article_name));
    const sortedList = Array.from(uniqueIngredients).sort(); 
    // Usamos .slice(0, 5) para tomar solo los primeros 5 elementos de la lista ordenada
    const limitedList = sortedList.slice(0, 6);
    // Ahora, construimos la URL solo con los 5 mejores ingredientes:
    const rawList = limitedList.join(',');
    const ingredientsList = encodeURIComponent(rawList);


    // 5. CONSTRUIR PARÁMETROS NUTRICIONALES
    let filterParams = '';
    
    // Incluimos la dieta y filtros numéricos solo si tienen valor
    if (diet) filterParams += `&diet=${diet}`;
    if (maxCalories) filterParams += `&maxCalories=${maxCalories}`;
    if (maxCarbs) filterParams += `&maxCarbs=${maxCarbs}`;
    if (maxProtein) filterParams += `&maxProtein=${maxProtein}`;
    if (maxSugar) filterParams += `&maxSugar=${maxSugar}`; 
    
    try {
        // 6. FETCH FINAL: ENVIAR LA LISTA LIMPIA DE INGREDIENTES AL BACKEND
        const response = await fetch(`${BACKEND_URL}/recetas/inventario?userId=${currentUserId}&list=${ingredientsList}${filterParams}`);
        
        const data = await response.json();

        if (!response.ok) {
            // Manejo de error de API (401/402)
            throw new Error(data.error || 'Error al buscar recetas. (Verificar API Key)');
        }

        const recipesList = data.results || [];
        // 1. OBTENER el contenedor principal
        const homeContainer = document.querySelector('.home-container');
        // 2. AÑADIR la clase para activar el diseño de dos columnas
        if (homeContainer) {
            homeContainer.classList.add('recipe-view-active');
        }
    
        renderRecipes(recipesList);

    } catch (error) {
        console.error('Fallo al buscar recetas:', error.message);
        alert('Fallo al buscar recetas: ' + error.message);
        return;
    }
}

// ======================================================
// === GESTIÓN DE EVENTOS (CONEXIÓN DE BOTONES) ===
// ======================================================

/**
 * @brief Conecta todos los Event Listeners de la página a sus respectivas funciones.
 * Esta función asegura que el código JavaScript pueda encontrar y reaccionar a los botones en el HTML.
 */
function connectEventListeners() {
    // 1. Conexión de Agregar (Formulario)
    const addItemForm = document.getElementById('add-item-form');
    if (addItemForm) addItemForm.addEventListener('submit', handleAddItem);
    
    // Conectar el botón de búsqueda principal
    const searchBtn = document.getElementById('search-recipes-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearchRecipes);
    }

    // 3. Conexión de Voz
    const recordAudioBtn = document.getElementById('recordAudioBtn');
    if (recordAudioBtn) setupAudioInput(); // Llama a la función que inicializa el micrófono
    
    // 4. Conexión de Logout
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) logoutLink.addEventListener('click', handleLogout);

    // Lógica de filtros y búsqueda
    const menuBtn = document.getElementById('menu-toggle-btn');
    const sidebar = document.getElementById('filter-sidebar');
    const applyFiltersBtn = document.getElementById('apply-filters-btn'); // <-- ¡Única declaración permitida!


    if (menuBtn && sidebar && applyFiltersBtn) {
        
        // MANEJO DE ABRIR/CERRAR (El botón Hamburguesa)
        menuBtn.addEventListener('click', () => {
            // Alternar la clase 'active' para mostrar/ocultar el sidebar
            sidebar.classList.toggle('active');

            // Cambiar el texto y color del botón
            if (sidebar.classList.contains('active')) {
                menuBtn.textContent = '✕ Cerrar Filtros';
                menuBtn.style.backgroundColor = '#dc3545';
            } else {
                menuBtn.textContent = '☰ Filtros';
                menuBtn.style.backgroundColor = '#007bff';
            }
        });
        
        // MANEJO DE BÚSQUEDA Y CIERRE (El botón Buscar Recetas)
        applyFiltersBtn.addEventListener('click', () => {
            // 1. Ejecuta la búsqueda de recetas
            handleSearchRecipes();
            
            // 2. Cierra el sidebar automáticamente después de buscar
            if (sidebar.classList.contains('active')) {
                 sidebar.classList.remove('active');
                 menuBtn.textContent = '☰ Filtros';
                 menuBtn.style.backgroundColor = '#007bff';
            }
        });
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
 * @brief Muestra las recetas encontradas en el panel derecho, 
 * usando el nuevo formato de "Tarjetas" (imagen + título) y añade tooltip.
 */
function renderRecipes(recipes) {
    const cardContainer = document.getElementById('recipes-list-cards'); 
    
    if (!cardContainer) {
        console.error("Error: No se encontró el elemento #recipes-list-cards");
        return; 
    }

    cardContainer.innerHTML = ''; // 1. Limpia el contenido anterior.

    if (!recipes || recipes.length === 0) { 
        cardContainer.innerHTML = '<p>No se encontraron recetas.</p>';
        return;
    }
    
    recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        const missingList = (recipe.missedIngredients || [])
            .map(item => item.original) 
            .join('\n- '); 
        const tooltipText = `Faltan (${recipe.missedIngredientCount || 0}):\n- ${missingList}`;

        card.setAttribute('data-tooltip', tooltipText);
        
        card.addEventListener('click', () => {
            handleViewRecipeDetails(recipe.id);
        });

        card.innerHTML = `
            <img src="${recipe.image}" alt="${recipe.title}">
            <h3>${recipe.title}</h3>
            <p>Faltan: ${recipe.missedIngredientCount || 0}</p>
        `;
        
        cardContainer.appendChild(card);
    });
}

/**
 * @brief Obtiene los detalles de una receta (vía proxy backend) y los muestra en el modal.
 */
async function handleViewRecipeDetails(recipeId) {
    const modal = document.getElementById('recipe-modal');
    const modalBody = document.getElementById('modal-body');
    
    if (!modal || !modalBody) return; // Seguridad

    // Muestra un mensaje de carga mientras busca los datos
    modalBody.innerHTML = '<p>Cargando detalles de la receta...</p>';
    modal.classList.add('show'); // Muestra el overlay y el modal

    try {
        // Llama al backend (proxy)
        const response = await fetch(`${BACKEND_URL}/recetas/detalles/${recipeId}`); 
        const recipeDetails = await response.json();

        if (!response.ok) {
            throw new Error(recipeDetails.error || 'No se pudieron obtener los detalles.');
        }

        // Construye el HTML con los detalles de la receta
        modalBody.innerHTML = `
            <h2>${recipeDetails.title}</h2>
            <img src="${recipeDetails.image}" alt="${recipeDetails.title}">
            
            <h3>Ingredientes:</h3>
            <ul>
                ${(recipeDetails.extendedIngredients || [])
                    .map(ing => `<li>${ing.original}</li>`)
                    .join('')}
            </ul>
            
            <h3>Instrucciones:</h3>
            ${recipeDetails.instructions ? 
                // Si hay instrucciones como HTML, las muestra. Si no, muestra un mensaje.
                (recipeDetails.instructions) : 
                '<p>Instrucciones no disponibles.</p>'
            }
        `;

    } catch (error) {
        console.error('Error al obtener detalles de la receta:', error);
        modalBody.innerHTML = `<p style="color: red;">Error al cargar la receta: ${error.message}</p>`;
    }
}

/**
 * @brief Cierra el modal de recetas.
 */
function closeModal() {
    const modal = document.getElementById('recipe-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// -----------------------------------------------------
// INICIO DE LA APLICACIÓN
// -----------------------------------------------------
document.addEventListener('DOMContentLoaded', initHome);


// ======================================================
// IMPLEMENTACION DE INGRESO POR VOZ (SPEECH)
// ======================================================

// Conectar el botón de cierre del modal
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);

    // Opcional: Cerrar el modal si se hace clic fuera del contenido (en el overlay)
    document.getElementById('recipe-modal').addEventListener('click', (event) => {
        // Si el clic fue DIRECTAMENTE en el overlay (y no en sus hijos)
        if (event.target === event.currentTarget) { 
            closeModal();
        }
    });
});
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
    recognition.lang = 'en-US'; // Configurar idioma a inglés EE.UU.
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // 2. Evento al hacer clic en el botón
    recordBtn.addEventListener('click', () => {
        try {
            recognition.start();
            recordBtn.innerText = "🔴 LISTENING...";
            speechResultDisplay.innerText = "Speak now, say the ingredient (e.g., 'two kilos of potatoes')";
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
        const parts = transcript.toLowerCase().split(' of ');
        
        if (parts.length < 2) {
            speechResultDisplay.innerText = `Transcript: "${transcript}" (Error: Try: 'Quantity UNIT of Item')`;
            speechResultDisplay.style.color = 'orange';
            return;
        }

        const articleName = parts[1].trim();
        const quantityUnit = parts[0].trim().split(' ');
        
        let quantity = '1';
        let unit = 'units'; // 'unidad' en inglés

        if (quantityUnit.length >= 2) {
             quantity = quantityUnit[0].trim(); // 'two'
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
            speechResultDisplay.innerText = `✅ Saved: ${quantity} ${unit} of ${articleName}`;
        } else {
            speechResultDisplay.innerText = `❌ Error al guardar: ${result.message}`;
        }
    });

    // 5. Eventos de fin y error
    recognition.addEventListener('end', () => {
        // No restauramos el botón aquí, lo hacemos en 'result' o 'error'
    });
    
    recognition.addEventListener('error', (event) => {
        speechResultDisplay.innerText = `Speech error: ${event.error}. Please try again.`;
        speechResultDisplay.style.color = 'red';
        recordBtn.innerText = "🎙️ Ingreso por Voz";
    });
}
