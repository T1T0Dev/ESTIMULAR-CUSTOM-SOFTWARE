require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

// Instrucciones para Ethereal:
// 1. Ve a https://ethereal.email/create y crea una cuenta de prueba.
// 2. Copia usuario y contraseña en tu archivo .env:
//    SMTP_HOST=smtp.ethereal.email
//    SMTP_PORT=587
//    SMTP_USER=tu_usuario@ethereal.email
//    SMTP_PASS=tu_password
//    CONTACT_EMAIL=tu_correo_real_o_ethereal
//    PORT=3001
