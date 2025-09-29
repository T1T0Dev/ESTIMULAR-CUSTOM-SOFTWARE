// backend/controllers/contactController.js

const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuración de transporte Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports.enviarEmail = async (req, res) => {

  const { nombre, apellido, email, servicio, mensaje } = req.body;

  try{
    const mailOptions = {
      from: email,
      to: process.env.EMAIL_USER,
      subject: `Nueva consulta de ${nombre} ${apellido} - Servicio: ${servicio}`,
      text: mensaje,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Correo enviado correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al enviar el correo.' });
  }
};





