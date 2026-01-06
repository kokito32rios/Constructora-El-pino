// ============================================
// CONFIGURACIÓN DE CONEXIÓN A BASE DE DATOS
// ============================================

const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool de conexiones (mejor rendimiento)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Verificar conexión al iniciar
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL exitosa');
    console.log(`📊 Base de datos: ${process.env.DB_NAME}`);
    connection.release();
  } catch (error) {
    console.error('❌ Error al conectar con MySQL:', error.message);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };