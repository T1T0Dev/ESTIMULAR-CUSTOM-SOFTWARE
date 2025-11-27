const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuración de transporte Nodemailer (igual que en contactoController.js)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendCancellationEmail = async (mailOptions) => {  // Cambia para aceptar mailOptions completo
  try {
    await transporter.sendMail(mailOptions);
    console.log('Email de cancelación enviado a:', mailOptions.to);
  } catch (error) {
    console.error('Error enviando email de cancelación:', error);
  }
};

module.exports = { sendCancellationEmail };