const express = require('express');
const cors = require('cors');
require('dotenv').config();


const contactosRoutes = require('./src/routes/contactoRoutes');
const obrasSocRoutes = require('./src/routes/obrasSocRoutes');
const ninosRoutes = require('./src/routes/ninosRoutes');
const responsablesRoutes = require('./src/routes/responsablesRoutes');


const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Diagnóstico rápido de conexión a Supabase
try {
	const { testConnection } = require('./src/config/db');
	if (typeof testConnection === 'function') testConnection();
} catch (e) {
	console.warn('No se pudo ejecutar testConnection:', e.message);
}

// Rutas
app.use('/api/contact', contactosRoutes);
app.use('/api/obras-sociales', obrasSocRoutes);
app.use('/api/ninos', ninosRoutes);
app.use('/api/responsables', responsablesRoutes);

app.listen(PORT, () => {
	console.log(`Servidor backend escuchando en puerto ${PORT}`);
});

