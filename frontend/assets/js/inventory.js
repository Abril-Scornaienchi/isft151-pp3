/**
 * @file inventory.js
 * @brief Módulo de lógica del Frontend para la Gestión de Inventario, Perfil y Recetas.
 */

const BACKEND_URL = 'http://localhost:3000/api';
let currentUserId = null;

// =========================================================================
// 1. INICIALIZACIÓN Y CARGA DE DATOS
// =========================================================================

/**
 * @brief Punto de entrada principal al cargar el DOM.
 */
document.addEventListener('DOMContentLoaded', () => {
    const storedId = localStorage.getItem('userId');

    if (storedId) {
        currentUserId = storedId;
        initHome();
    } else {
        window.location.href = 'index.html'; 
    }
});

/**
 * @brief Inicializa la página, carga datos y conecta todos los listeners.
 */
async function initHome() {
    await loadProfile(); // Carga las preferencias del usuario primero
    await loadInventory(); // Luego carga el inventario
    connectEventListeners(); // Finalmente, conecta todos los botones
    setupAudioInput(); // Inicializa el reconocimiento de voz
}

/**
 * @brief Carga las preferencias del perfil del usuario y las muestra en el formulario.
 */
async function loadProfile() {
    if (!currentUserId) return;

    try {
        const response = await fetch(`${BACKEND_URL}/profile?userId=${currentUserId}`);
        if (!response.ok) {
            // No es un error crítico si no tiene perfil, puede que sea un usuario nuevo.
            console.warn('No se pudo cargar el perfil de usuario o aún no existe.');
            return;
        }
        const profile = await response.json();
        
        // Rellenar el formulario con los datos guardados
        document.getElementById('diet_preference').value = profile.diet_preference || '';
        document.getElementById('maxCalories').value = profile.maxCalories || '';
        document.getElementById('maxCarbs').value = profile.maxCarbs || '';
        document.getElementById('maxProtein').value = profile.maxProtein || '';
        document.getElementById('maxSugar').value = profile.maxSugar || '';

    } catch (error) {
        console.error('Error cargando el perfil:', error);
    }
}

/**
 * @brief Carga y muestra el inventario del usuario desde el backend.
 */
async function loadInventory() {
    try {
        const response = await fetch(`${BACKEND_URL}/inventario?userId=${currentUserId}`); 
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al cargar el inventario.');
        }
        renderInventory(data);
    } catch (error) {
        console.error('Error al cargar el inventario:', error.message);
        alert('No se pudo conectar con el inventario: ' + error.message);
    }
}

// =========================================================================
// 2. MANEJO DE EVENTOS (Botones y Formularios)
// =========================================================================

/**
 * @brief Conecta todos los event listeners de la página a sus funciones.
 */
function connectEventListeners() {
    // Formulario para agregar items
    document.getElementById('add-item-form').addEventListener('submit', handleAddItem);
    
    // Botón principal de búsqueda de recetas
    document.getElementById('search-recipes-btn').addEventListener('click', handleSearchRecipes);

    // Botón para guardar preferencias de perfil
    document.getElementById('save-prefs-btn').addEventListener('click', handleSavePreferences);

    // Enlace para cerrar sesión
    document.getElementById('logout-link').addEventListener('click', handleLogout);

    // Botón para mostrar/ocultar el panel de filtros
    const menuBtn = document.getElementById('menu-toggle-btn');
    const sidebar = document.getElementById('filter-sidebar');
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        menuBtn.textContent = sidebar.classList.contains('active') ? '✕ Cerrar' : '☰ Mis Preferencias';
    });

    // Cierre del modal de detalles de receta
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('recipe-modal').addEventListener('click', (event) => {
        if (event.target === event.currentTarget) { 
            closeModal();
        }
    });
}

/**
 * @brief Maneja el guardado de las preferencias del usuario.
 */
async function handleSavePreferences() {
    const profileData = {
        diet_preference: document.getElementById('diet_preference').value,
        maxCalories: document.getElementById('maxCalories').value || null,
        maxCarbs: document.getElementById('maxCarbs').value || null,
        maxProtein: document.getElementById('maxProtein').value || null,
        maxSugar: document.getElementById('maxSugar').value || null,
    };

    try {
        const response = await fetch(`${BACKEND_URL}/profile?userId=${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Error al guardar las preferencias.');
        }

        alert('¡Preferencias guardadas con éxito!');
        // Opcional: cerrar el sidebar después de guardar
        document.getElementById('filter-sidebar').classList.remove('active');
        document.getElementById('menu-toggle-btn').textContent = '☰ Mis Preferencias';

    } catch (error) {
        console.error('Fallo al guardar preferencias:', error);
        alert('Fallo al guardar preferencias: ' + error.message);
    }
}

/**
 * @brief Maneja la búsqueda de recetas, aplicando los filtros actuales del formulario.
 */
async function handleSearchRecipes() {
    // 1. Leer los filtros actuales del formulario
    const diet = document.getElementById('diet_preference').value;
    const maxCalories = document.getElementById('maxCalories').value;
    const maxCarbs = document.getElementById('maxCarbs').value;
    const maxProtein = document.getElementById('maxProtein').value;
    const maxSugar = document.getElementById('maxSugar').value; 

    // 2. Construir el string de parámetros de consulta para los filtros
    let filterParams = '';
    if (diet && diet !== 'none') filterParams += `&diet=${diet}`;
    if (maxCalories) filterParams += `&maxCalories=${maxCalories}`;
    if (maxCarbs) filterParams += `&maxCarbs=${maxCarbs}`;
    if (maxProtein) filterParams += `&maxProtein=${maxProtein}`;
    if (maxSugar) filterParams += `&maxSugar=${maxSugar}`;

    try {
        // 3. Llamar al backend. El backend se encarga de la traducción y de pasar todo a Spoonacular.
        const response = await fetch(`${BACKEND_URL}/recetas/inventario?userId=${currentUserId}${filterParams}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al buscar recetas.');
        }

        // 4. Renderizar los resultados y mostrar el panel
        document.querySelector('.home-container').classList.add('recipe-view-active');
        renderRecipes(data);

    } catch (error) {
        console.error('Fallo al buscar recetas:', error.message);
        alert('Fallo al buscar recetas: ' + error.message);
        document.querySelector('.home-container').classList.remove('recipe-view-active');
        renderRecipes([]);
    }
}

/**
 * @brief Maneja el cierre de sesión.
 */
function handleLogout(event) {
    event.preventDefault();
    localStorage.removeItem('userId');
    window.location.href = 'index.html';
}

// =========================================================================
// 3. OPERACIONES CRUD DE INVENTARIO (CREATE, UPDATE, DELETE)
// =========================================================================

async function handleAddItem(event) {
    event.preventDefault();
    const article_name = document.getElementById('article_name').value;
    const quantity = document.getElementById('quantity').value;
    const unit = document.getElementById('unit').value;
    await sendItemToBackend(article_name, quantity, unit);
}

async function sendItemToBackend(article_name, quantity, unit) {
    const cleanArticleName = article_name ? article_name.toLowerCase().trim() : '';
    const parsedQuantity = parseInt(quantity);

    if (!cleanArticleName || isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return { success: false, message: 'El nombre o la cantidad son inválidos.' };
    }

    try {
        let finalResponse, finalAction;
        const checkResponse = await fetch(`${BACKEND_URL}/inventario/check?name=${cleanArticleName}&userId=${currentUserId}`);
        const checkData = await checkResponse.json();

        if (checkResponse.ok && checkData.exists) {
            const action = confirm(`El alimento "${cleanArticleName}" ya existe. ¿Deseas SUMAR la nueva cantidad?`);
            const existingId = checkData.id;
            if (action) {
                finalAction = 'Sumar';
                finalResponse = await fetch(`${BACKEND_URL}/inventario/${existingId}/sumar?userId=${currentUserId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantity: parsedQuantity })
                });
            } else {
                finalAction = 'Reemplazar';
                finalResponse = await fetch(`${BACKEND_URL}/inventario/${existingId}?userId=${currentUserId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantity: parsedQuantity, unit: unit, article_name: cleanArticleName })
                });
            }
        } else {
            finalAction = 'Crear';
            finalResponse = await fetch(`${BACKEND_URL}/inventario?userId=${currentUserId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ article_name: cleanArticleName, quantity: parsedQuantity, unit: unit })
            });
        }

        const result = await finalResponse.json();
        if (!finalResponse.ok) throw new Error(result.error || `Error en ${finalAction}.`);
        
        loadInventory();
        document.getElementById('add-item-form').reset();
        return { success: true, message: `Operación (${finalAction}) completada.` };

    } catch (error) {
        console.error('Fallo al agregar:', error.message);
        alert('Fallo al agregar: ' + error.message);
        return { success: false, message: error.message };
    }
}

async function handleDeleteItem(alimentoId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este alimento?')) return;

    try {
        const response = await fetch(`${BACKEND_URL}/inventario/${alimentoId}?userId=${currentUserId}`, {
            method: 'DELETE',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error al eliminar.');
        
        alert('Alimento eliminado.');
        loadInventory();
    } catch (error) {
        console.error('Fallo al eliminar:', error.message);
        alert('Fallo al eliminar: ' + error.message);
    }
}

async function handleUpdateItem(alimentoId) {
    const row = document.getElementById(`inventory-item-${alimentoId}`);
    if (!row) return;

    const nombreActual = row.cells[0].textContent;
    const cantidadActual = row.cells[1].textContent;
    const unidadActual = row.cells[2].textContent;

    const nuevoNombre = prompt("Nombre del artículo:", nombreActual);
    const nuevaCantidad = prompt("Nueva cantidad:", cantidadActual);
    const nuevaUnidad = prompt("Nueva unidad:", unidadActual);

    if (nuevoNombre === null || nuevaCantidad === null || nuevaUnidad === null) {
        alert("Actualización cancelada.");
        return;
    }
    try {
        const response = await fetch(`${BACKEND_URL}/inventario/${alimentoId}?userId=${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ article_name: nuevoNombre, quantity: nuevaCantidad, unit: nuevaUnidad })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error al actualizar.');
        
        alert('Alimento actualizado.');
        loadInventory();
    } catch (error) {
        console.error('Fallo al actualizar:', error.message);
        alert('Fallo al actualizar: ' + error.message);
    }
}

// =========================================================================
// 4. RENDERIZADO Y UI
// =========================================================================

function renderInventory(inventory) {
    const tableBody = document.getElementById('inventory-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (inventory.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">No hay ingredientes en tu inventario.</td></tr>';
        return;
    }

    inventory.forEach(item => {
        const row = tableBody.insertRow();
        row.id = `inventory-item-${item._id}`;
        row.insertCell().textContent = item.article_name;
        row.insertCell().textContent = item.quantity;
        row.insertCell().textContent = item.unit;
        row.insertCell().innerHTML = `
            <button onclick="handleUpdateItem('${item._id}')">Actualizar</button>
            <button onclick="handleDeleteItem('${item._id}')">Eliminar</button>
        `;
    });
}

function renderRecipes(recipes) {
    const cardContainer = document.getElementById('recipes-list-cards');
    if (!cardContainer) return;
    cardContainer.innerHTML = '';

    if (!recipes || recipes.length === 0) {
        cardContainer.innerHTML = '<p>No se encontraron recetas.</p>';
        return;
    }
    
    recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        const missingList = (recipe.missedIngredients || []).map(item => item.original).join('\n- ');
        const tooltipText = `Faltan (${recipe.missedIngredientCount || 0}):\n- ${missingList}`;
        card.setAttribute('data-tooltip', tooltipText);
        
        card.addEventListener('click', () => handleViewRecipeDetails(recipe.id));

        card.innerHTML = `
            <img src="${recipe.image}" alt="${recipe.title}">
            <h3>${recipe.title}</h3>
        `;
        cardContainer.appendChild(card);
    });
}

async function handleViewRecipeDetails(recipeId) {
    const modal = document.getElementById('recipe-modal');
    const modalBody = document.getElementById('modal-body');
    if (!modal || !modalBody) return;

    modalBody.innerHTML = '<p>Cargando detalles de la receta...</p>';
    modal.classList.add('show');

    try {
        const response = await fetch(`${BACKEND_URL}/recetas/detalles/${recipeId}?userId=${currentUserId}`);
        const recipeDetails = await response.json();
        if (!response.ok) throw new Error(recipeDetails.error || 'No se pudieron obtener los detalles.');

        modalBody.innerHTML = `
            <h2>${recipeDetails.title}</h2>
            <img src="${recipeDetails.image}" alt="${recipeDetails.title}">
            <h3>Ingredientes:</h3>
            <ul>${(recipeDetails.extendedIngredients || []).map(ing => `<li>${ing.original}</li>`).join('')}</ul>
            <h3>Instrucciones:</h3>
            ${recipeDetails.instructions ? recipeDetails.instructions : '<p>Instrucciones no disponibles.</p>'}
        `;
    } catch (error) {
        console.error('Error al obtener detalles de la receta:', error);
        modalBody.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function closeModal() {
    const modal = document.getElementById('recipe-modal');
    if (modal) modal.classList.remove('show');
}

// =========================================================================
// 5. RECONOCIMIENTO DE VOZ
// =========================================================================

function setupAudioInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recordBtn = document.getElementById('recordAudioBtn');
    const speechResultDisplay = document.getElementById('speechResult');
    
    if (!SpeechRecognition || !recordBtn) {
        if (recordBtn) recordBtn.disabled = true;
        return; 
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR'; // Idioma a Español (Argentina)
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recordBtn.addEventListener('click', () => {
        try {
            recognition.start();
            recordBtn.textContent = "🔴 Escuchando...";
            speechResultDisplay.textContent = "Habla ahora, di el ingrediente (ej: 'dos kilos de papas')";
            speechResultDisplay.style.color = 'red';
        } catch (e) {
            console.error("Error al iniciar reconocimiento de voz:", e);
        }
    });

    recognition.addEventListener('result', async (event) => {
        const transcript = event.results[0][0].transcript;
        recordBtn.textContent = "🎙️ Ingreso por Voz";
        
        const parts = transcript.toLowerCase().split(' de ');
        if (parts.length < 2) {
            speechResultDisplay.textContent = `Transcripción: "${transcript}" (Error: Intenta 'Cantidad UNIDAD de Artículo')`;
            speechResultDisplay.style.color = 'orange';
            return;
        }

        const articleName = parts.slice(1).join(' de ').trim();
        const quantityUnit = parts[0].trim().split(' ');
        let quantity = '1';
        let unit = 'unidades';

        if (quantityUnit.length >= 1) {
            quantity = quantityUnit[0].trim();
            if (quantityUnit.length > 1) {
                unit = quantityUnit.slice(1).join(' ').trim();
            }
        }

        const parsedNum = parseInt(quantity);
        quantity = (!isNaN(parsedNum) && parsedNum > 0) ? parsedNum.toString() : '1';
        unit = normalizeUnit(unit);

        speechResultDisplay.textContent = `✔️ Procesando: ${quantity} ${unit} de ${articleName}`;
        speechResultDisplay.style.color = 'green';
        
        const result = await sendItemToBackend(articleName, quantity, unit);
        speechResultDisplay.textContent = result.success ? `✅ Guardado: ${quantity} ${unit} de ${articleName}` : `❌ Error: ${result.message}`;
    });

    recognition.addEventListener('error', (event) => {
        speechResultDisplay.textContent = `Error de voz: ${event.error}. Intenta de nuevo.`;
        speechResultDisplay.style.color = 'red';
        recordBtn.textContent = "🎙️ Ingreso por Voz";
    });
}

/**
 * @brief Normaliza el nombre de la unidad transcrita para que coincida con los valores ENUM de Mongoose.
 * (VERSIÓN CORREGIDA Y LIMPIA - Fiel al original)
 * @param {string} unit - La unidad obtenida de la transcripción de voz.
 * @returns {string} La unidad ('kilogramos', 'mililitros', etc.).
 */
function normalizeUnit(unit) {
    const u = unit.toLowerCase().trim();
    if (u.startsWith('kilo') || u.startsWith('kg')) return 'kilogramos';
    // Se añade "u === 'g'" para capturar la abreviatura de "gramos" que transcribe el motor de voz.
    if (u.includes('gramo') || u.includes('gr') || u === 'g') return 'gramos';    
    if (u.startsWith('litro') || u.startsWith('lt')) return 'litros';
    if (u.startsWith('mililitro') || u.startsWith('ml')) return 'mililitros';
    if (u.startsWith('unida')) return 'unidades';
    
    return 'unidades'; 
}
