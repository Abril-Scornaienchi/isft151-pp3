// 1. Carga las variables de entorno (para la clave API de Gemini)
require('dotenv').config();

// 2. Importa la librería de Google AI
const { GoogleGenerativeAI } = require("@google/generative-ai");

const CacheEntry = require('../models/CacheEntryModel'); 

// 3. Lee la clave API de Gemini desde el archivo .env
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 4. Valida que la clave exista
if (!GEMINI_API_KEY) {
  console.error("❌ Error: Falta la variable de entorno GEMINI_API_KEY en el archivo .env");
}

// 5. Inicializa el cliente de Google AI (solo si la clave existe)
let genAI;
let model;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
} else {
  console.warn("⚠️ Advertencia: La API de Gemini no se inicializó por falta de clave API.");
}

/**
 * @brief Traduce un texto de un idioma de origen a un idioma de destino usando Gemini.
 * @param {string} textToTranslate El texto que se desea traducir.
 * @param {string} sourceLang El código del idioma de origen
 * @param {string} targetLang El código del idioma de destino *
 * @returns {Promise<string|null>} El texto traducido, o null si ocurre un error o la API no está inicializada.
 */
async function translateText(textToTranslate, sourceLang, targetLang) {
  if (!model) {
    console.error("Error: Intento de traducir sin API de Gemini inicializada.");
    return null; 
  }

  // 1. Crear una clave única para el caché
  const cacheKey = `translation:${sourceLang}:${targetLang}:${textToTranslate}`;

  try {
    // 2. Buscar en el caché de MongoDB
    const cachedEntry = await CacheEntry.findOne({ cacheKey: cacheKey });

    if (cachedEntry) {
      // Si encontramos algo, MongoDB ya maneja la expiración con TTL.
      // Solo devolvemos el dato guardado.
      console.log(`[DB CACHE HIT] Traducción para: "${textToTranslate}"`); // Log opcional
      return cachedEntry.data; 
    }

    // --- Si no está en caché (o ya fue borrado por TTL) ---
    
    console.log(`[DB CACHE MISS] Llamando a Gemini para: "${textToTranslate}"`);
    const prompt = `Translate ONLY the following text from ${sourceLang} to ${targetLang}. Do not add any extra characters or explanations. The text to translate is: "${textToTranslate}"`;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const translatedText = response.text().trim();
    
    // 3. GUARDAMOS la traducción en MongoDB ANTES de devolverla
    //    (No necesitamos guardar timestamp, createdAt lo hace Mongoose y expires lo usa TTL)
    await CacheEntry.create({
      cacheKey: cacheKey,
      data: translatedText
    });

    console.log(`Traducido (${sourceLang}->${targetLang}): "${textToTranslate}" -> "${translatedText}" [Guardado en DB]`);
    return translatedText;

  } catch (error) {
    // Captura errores tanto de la búsqueda en DB como de la llamada a Gemini
    console.error(`Error en translateText (${sourceLang}->${targetLang}) para "${textToTranslate}":`, error);
    return null; 
  }
}

// Exporta la función para que otros archivos (como server.js) puedan usarla
module.exports = {
  translateText,
};