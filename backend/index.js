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

app.use(cors({
  origin: [
    'http://localhost:5174', 'http://localhost:5173', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178', 'http://localhost:3000',
    'http://127.0.0.1:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5176', 'http://127.0.0.1:5177', 'http://127.0.0.1:5178', 'http://127.0.0.1:3000',
    'http://172.20.10.11:5174', 'http://172.20.10.11:5173', 'http://172.20.10.11:5176', 'http://172.20.10.11:5177', 'http://172.20.10.11:5178', 'http://172.20.10.11:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-Admin-Override']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Diagnóstico rápido de conexión a Supabase
try {
  const { testConnection } = require('./src/config/db');
  if (typeof testConnection === 'function') testConnection();
} catch (e) {
  console.warn('No se pudo ejecutar testConnection:', e.message);
}

// Endpoint de diagnóstico
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Endpoint de prueba de base de datos
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await require('./src/config/db').supabaseAdmin
      .from('usuarios')
      .select('count')
      .limit(1);

    if (error) {
      return res.status(500).json({ error: 'Database connection failed', details: error });
    }

    res.json({ status: 'Database OK', data });
  } catch (err) {
    res.status(500).json({ error: 'Database test failed', details: err.message });
  }
});

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

app.listen(PORT, '::', () => {
  console.log(`Servidor backend escuchando en puerto ${PORT} en todas las interfaces`);
});

