// backend/models/CacheEntryModel.js

const mongoose = require('mongoose');

const cacheEntrySchema = new mongoose.Schema({
  // La clave única (hash) que identifica la petición cacheada
  cacheKey: {
    type: String,
    required: true,
    unique: true, // Asegura que no haya duplicados para la misma petición
    index: true,   // Crea un índice para búsquedas rápidas por clave
  },
  // Los datos de la respuesta (puede ser cualquier JSON válido)
  data: {
    type: mongoose.Schema.Types.Mixed, // Permite guardar cualquier tipo de objeto
    required: true,
  },
  // Fecha de creación (Mongoose la gestionará automáticamente)
  createdAt: {
    type: Date,
    // ¡IMPORTANTE! TTL Index: MongoDB borrará automáticamente el documento
    // después de x desde su creación.
    expires: '23h',
    default: Date.now, // Establece la fecha actual al crear
  },
});

const CacheEntry = mongoose.model('CacheEntry', cacheEntrySchema);

module.exports = CacheEntry;