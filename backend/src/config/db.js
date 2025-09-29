const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');
require('dotenv').config();
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '12345678',
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
    console.error('Error al conectar con la base de datos MySQL:', err.message);
  });

// --- Supabase Client Initialization ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client initialized successfully.');
} else {
  console.warn('Supabase credentials not found. Supabase client will not be available.');
  supabase = null;
}


pool.supabase = supabase;

module.exports = pool;