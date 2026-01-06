// ============================================
// CONFIGURACIÓN DE JSON WEB TOKENS (JWT)
// ============================================

require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'clave_secreta_por_defecto_cambiar',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Opciones adicionales para firmar tokens
  signOptions: {
    algorithm: 'HS256'
  },
  
  // Opciones para verificar tokens
  verifyOptions: {
    algorithms: ['HS256']
  }
};