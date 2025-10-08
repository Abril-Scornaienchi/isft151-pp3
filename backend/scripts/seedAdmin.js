// seedAdmin.js
// Script para crear (seed) el usuario admin inicial.

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
