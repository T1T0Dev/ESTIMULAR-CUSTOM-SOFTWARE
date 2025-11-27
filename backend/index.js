const express = require('express');
const cors = require('cors');
require('dotenv').config();

const contactosRoutes = require('./src/routes/contactoRoutes');
const entrevistaRoutes = require('./src/routes/entrevistaRoutes');
const obrasSocRoutes = require('./src/routes/obrasSocRoutes');
const candidatosRoutes = require('./src/routes/candidatosRoutes');
const ninoRoutes = require('./src/routes/ninoRoutes');
const turnoRoutes = require('./src/routes/turnoRoutes');
const pagoRoutes = require('./src/routes/pagoRoutes');
const notificacionRoutes = require('./src/routes/notificacionRoutes');

const ninosRoutes = require('./src/routes/ninosRoutes');
const responsablesRoutes = require('./src/routes/responsablesRoutes');
const turnosRoutes = require('./src/routes/turnosRoutes');
const equipoRoutes = require('./src/routes/equipoRoutes');
const profesionesRoutes = require('./src/routes/profesionesRoutes');
const loginRoutes = require('./src/routes/loginRoutes');
const finanzasRoutes = require('./src/routes/finanzasRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Diagnóstico rápido de conexión a Supabase
try {
	const { testConnection } = require('./src/config/db');
	if (typeof testConnection === 'function') testConnection();
} catch (e) {
	console.warn('No se pudo ejecutar testConnection:', e.message);
}

// Rutas públicas y legacy
app.use('/api/contact', contactosRoutes);
app.use('/api/entrevista', entrevistaRoutes);
app.use('/api/obras-sociales', obrasSocRoutes);
app.use('/api/candidatos', candidatosRoutes);
app.use('/api', ninoRoutes);
app.use('/api', turnoRoutes);
app.use('/api', pagoRoutes);
app.use('/api', notificacionRoutes);

// Rutas del dashboard
app.use('/api/ninos', ninosRoutes);
app.use('/api/responsables', responsablesRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/equipo', equipoRoutes);
app.use('/api/profesiones', profesionesRoutes);
app.use('/api/login', loginRoutes);
app.use('/api', finanzasRoutes);

app.listen(PORT, () => {
	console.log(`Servidor backend escuchando en puerto ${PORT}`);
});

