const express = require('express');
const cors = require('cors');
require('dotenv').config();


const contactosRoutes = require('./src/routes/contactoRoutes');
const entrevistaRoutes = require('./src/routes/entrevistaRoutes');


const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/contact', contactosRoutes);
app.use('/api/entrevista', entrevistaRoutes);

app.listen(PORT, () => {
	console.log(`Servidor backend escuchando en puerto ${PORT}`);
});

