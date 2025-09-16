const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'estimular',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(connection => {
    console.log('Conexión a la base de datos MySQL establecida con éxito.');
    connection.release();
  })
  .catch(err => {
    console.error('Error al conectar con la base de datos MySQL:', err);
  });

module.exports = pool;
