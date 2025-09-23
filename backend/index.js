const express = require('express');
const cors = require('cors');
require('dotenv').config();


const contactRoutes = require('./src/routes/contactRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/contact', contactRoutes);

app.listen(PORT, () => {
	console.log(`Servidor backend escuchando en puerto ${PORT}`);
});

