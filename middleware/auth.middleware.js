// ============================================
// MIDDLEWARE DE AUTENTICACIÓN JWT
// ============================================

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * Middleware para verificar token JWT
 * Extrae el token del header Authorization
 * Verifica su validez y adjunta los datos del usuario al request
 */
const authMiddleware = (req, res, next) => {
    try {
        // Obtener token del header
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Token no proporcionado. Acceso denegado.'
            });
        }
        
        // El token viene en formato: "Bearer TOKEN"
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Formato de token inválido'
            });
        }
        
        // Verificar token
        const decoded = jwt.verify(token, jwtConfig.secret, jwtConfig.verifyOptions);
        
        // Adjuntar información del usuario al request
        req.user = {
            cedula: decoded.cedula,
            nombre: decoded.nombre,
            email: decoded.email,
            rol_id: decoded.rol_id,
            rol_nombre: decoded.rol_nombre
        };
        
        next();
        
    } catch (error) {
        // Token expirado
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado. Por favor, inicia sesión nuevamente.'
            });
        }
        
        // Token inválido
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
        
        // Otro error
        return res.status(500).json({
            success: false,
            message: 'Error al verificar autenticación',
            error: error.message
        });
    }
};

/**
 * Middleware para verificar roles específicos
 * Uso: checkRole(['Administrador', 'Usuario'])
 */
const checkRole = (rolesPermitidos) => {
    return (req, res, next) => {
        // Primero debe pasar por authMiddleware
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }
        
        // Verificar si el rol del usuario está permitido
        if (!rolesPermitidos.includes(req.user.rol_nombre)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para realizar esta acción'
            });
        }
        
        next();
    };
};

/**
 * Middleware opcional - No falla si no hay token
 * Útil para rutas que pueden funcionar con o sin autenticación
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            
            if (token) {
                const decoded = jwt.verify(token, jwtConfig.secret, jwtConfig.verifyOptions);
                req.user = {
                    cedula: decoded.cedula,
                    nombre: decoded.nombre,
                    email: decoded.email,
                    rol_id: decoded.rol_id,
                    rol_nombre: decoded.rol_nombre
                };
            }
        }
        
        next();
        
    } catch (error) {
        // Si hay error, continuar sin usuario autenticado
        next();
    }
};

module.exports = authMiddleware;
module.exports.checkRole = checkRole;
module.exports.optionalAuth = optionalAuth;