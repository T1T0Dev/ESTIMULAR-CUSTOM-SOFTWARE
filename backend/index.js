const express = require('express');
const cors = require('cors');
const loginRoutes = require('./src/routes/LoginRoutes');
const contactosRoutes = require('./src/routes/contactoRoutes');
const entrevistaRoutes = require('./src/routes/entrevistaRoutes');
const obrasSocRoutes = require ('./src/routes/obrasSocRoutes');
const candidatosRoutes = require('./src/routes/candidatosRoutes');

const turnoRoutes = require('./src/routes/turnoRoutes');
const pagoRoutes = require('./src/routes/pagoRoutes');
const notificacionRoutes = require('./src/routes/notificacionRoutes');


const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api', loginRoutes); 
app.use('/api/contact', contactosRoutes);
app.use('/api/entrevista', entrevistaRoutes);
app.use('/api/obras-sociales', obrasSocRoutes);
app.use('/api/candidatos', candidatosRoutes);
app.use('/api', turnoRoutes);
app.use('/api', pagoRoutes);
app.use('/api', notificacionRoutes);

app.listen(PORT, () => {
	console.log(`Servidor backend escuchando en puerto ${PORT}`);
});

