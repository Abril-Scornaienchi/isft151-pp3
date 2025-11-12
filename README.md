# 📖 PROYECTO RECETAS Y DESPENSA (FP)

Este documento contiene las instrucciones esenciales para configurar el entorno, instalar las dependencias e iniciar el servidor, permitiendo la ejecución del backend (API) y la aplicación web (frontend). De todas formas para iniciar la APP puede hacer doble click en cAe.bat (si es usuario de Windows).

## 1. ⚙️ Requisitos Previos

Necesitas tener instalado:

- Node.js (versión 18.x o superior)
- npm (Node Package Manager)

> ⚠️ Nota de Base de Datos: Solo los administradores del proyecto (quienes gestionan la persistencia) necesitan tener una cuenta y un Cluster en MongoDB Atlas para la configuración inicial. Para la ejecución y compilación del proyecto, solo es necesario que el backend apunte a una URI de MongoDB funcional.

## 2. 🌳 Estructura de Directorios

El proyecto está organizado en dos carpetas principales: `backend` y `frontend`

├── backend/                  
│   ├── models/
	│   └── InventoryModel.js
	│   └── User_data.js      
	│   └── CacheEntryModel.js            
│   ├── node_modules/            
│   ├── scripts/
	│   └── seedAdmin.js      
│   ├── services/
│	   └── userService.js
│	   └── translationService.js             
│   └── package.json
│   └── package-lock.json
│   └── server.js
│   
├── frontend/                 
│   ├── assets/
│	   ├── js/
│			│   ├── auth.js
│			│   ├── inventory.js	
│   	├── styles.css/                  
│   ├── home.html/   
│   ├── index.html/   
│   ├── register.html/   
│
├── README.md               
└── cAe.bat        # Levanta la app (scrpt de compilacion)

## 3. 🔌 Configuración de la Conexión a la Base de Datos

El servidor requiere la URI de conexión a MongoDB.

- **Obtener la URI:** La cadena de conexión (`mongodb+srv://...`) debe ser proporcionada por el administrador de la base de datos.

- **Configurar la URI:** Dado que el archivo `.env` ya está configurado en el proyecto, si por alguna razón no se estuviera usando o se quisiera una configuración local rápida, puedes pegar la URI directamente en la constante `DB_URI` dentro del archivo `fp/backend/server.js`.

## 4. 🚀 Instalación y Seed de Datos

### A. Instalación de Dependencias

Navega a la carpeta principal del backend para instalar todos los módulos de Node.js necesarios (Express, Mongoose, Bcrypt, etc.):

```bash
cd fp/backend
npm install
```

### B. Inicializar el Usuario Administrador (Seed)

Ejecuta el script de seed para crear el usuario administrador inicial en tu base de datos (admin@app.com / 123). Solo debes ejecutar esto la primera vez.

```bash
cd fp/backend
node scripts/seedAdmin.js
```

## 5. ▶️ Iniciar la Aplicación

El servidor backend puede iniciarse de dos formas:

### A. Opción 1: Usando `npm start` (Recomendado)

Si el archivo `package.json` está configurado con un script `start`:

```bash
cd fp/backend
npm start
```

### B. Opción 2: Ejecución Directa

```bash
cd fp/backend
node server.js
```

**Verificación:** La consola debe mostrar: ✅ Conexión exitosa a MongoDB. y SERVIDOR BACKEND INICIADO en el puerto 3000.

### C. Abrir el Frontend

Una vez que el backend esté ejecutándose, abre el archivo en tu navegador:

- Busca el archivo `index.html` en la carpeta principal de tu proyecto (`fp/`).
- Ábrelo con doble clic.

¡LISTO! La autenticación está configurada y lista para probar las rutas de Login (`/index.html`) y Registro (`/register.html`).

---
