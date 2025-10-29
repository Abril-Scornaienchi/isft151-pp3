// 1. Carga las variables de entorno (para la clave API de Gemini)
require('dotenv').config();

// 2. Importa la librería de Google AI
const { GoogleGenerativeAI } = require("@google/generative-ai");

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
  // Si la API no se inicializó, no podemos traducir
  if (!model) {
    console.error("Error: Intento de traducir sin API de Gemini inicializada.");
    return null; 
  }

  // Construye un prompt más robusto y específico para evitar que la IA añada caracteres extra (como '|||')
  const prompt = `Translate ONLY the following text from ${sourceLang} to ${targetLang}. Do not add any extra characters or explanations. The text to translate is: "${textToTranslate}"`;
  
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const translatedText = response.text().trim(); // Usamos trim() para quitar espacios extra
    
    
    console.log(`Traducido (${sourceLang}->${targetLang}): "${textToTranslate}" -> "${translatedText}"`);

    return translatedText;

  } catch (error) {
    console.error(`Error al traducir texto (${sourceLang}->${targetLang}): "${textToTranslate}"`, error);
    return null; // Devolver null indica que la traducción falló
  }
}

// Exporta la función para que otros archivos (como server.js) puedan usarla
module.exports = {
  translateText,
};