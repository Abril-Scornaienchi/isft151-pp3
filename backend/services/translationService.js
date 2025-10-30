// 1. Carga las variables de entorno
require('dotenv').config({ path: '../.env' });

// 2. Importa la librería de Google AI
const { GoogleGenerativeAI } = require("@google/generative-ai");
// 3. IMPORTA EL MODELO DE CACHÉ DE MONGO
const CacheEntry = require('../models/CacheEntryModel');

// 4. Lee la clave API de Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 5. Valida e inicializa
let genAI;
let model;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
} else {
  console.warn("⚠️ Advertencia: La API de Gemini no se inicializó por falta de clave API.");
}

/**
 * @brief Traduce texto usando el caché de MongoDB con expiración de 23 horas.
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
      // ¡Cache Hit! MongoDB maneja la expiración (23h)
      return cachedEntry.data; 
    }

    // --- Si no está en caché (o ya fue borrado por TTL) ---
    
    const prompt = `Translate ONLY the following text from ${sourceLang} to ${targetLang}. Do not add any extra characters or explanations. The text to translate is: "${textToTranslate}"`;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const translatedText = response.text().trim();
    
    // 3. GUARDAMOS la traducción en MongoDB
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

// Exporta la función
module.exports = {
  translateText,
};