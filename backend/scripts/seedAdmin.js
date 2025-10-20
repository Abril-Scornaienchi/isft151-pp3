// seedAdmin.js

/**herramienta de utilidad para configurar la base de datos por primera vez 
  (por ejemplo, si se borra o se mueve a producción)*/

  
const mongoose = require('mongoose');
const { initializeAdminUser } = require('../services/userService');

const DB_URI = 'mongodb+srv://adminUserA:rzVBpgvkVWCmcMBQ@cluster0.ysdsjmm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; 

async function run() {
  try {
    await mongoose.connect(DB_URI);
    console.log('✅ Conectado a MongoDB para seed.');

    await initializeAdminUser();

    console.log('✅ Seed completado.');
  } catch (err) {
    console.error('❌ Error en seedAdmin:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB.');
  }
}

run();
