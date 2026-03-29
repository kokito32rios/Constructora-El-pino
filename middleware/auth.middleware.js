const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

const AUTH_COOKIE_NAME = 'auth_token';

function parseCookieHeader(cookieHeader = '') {
    return cookieHeader
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean)
        .reduce((cookies, item) => {
            const separatorIndex = item.indexOf('=');
            if (separatorIndex === -1) {
                return cookies;
            }

            const key = item.slice(0, separatorIndex).trim();
            const value = item.slice(separatorIndex + 1).trim();
            cookies[key] = decodeURIComponent(value);
            return cookies;
        }, {});
}

function extractToken(req) {
    const cookies = parseCookieHeader(req.headers.cookie);
    if (cookies[AUTH_COOKIE_NAME]) {
        return cookies[AUTH_COOKIE_NAME];
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    return null;
}

function buildUserPayload(decoded) {
    return {
        cedula: decoded.cedula,
        nombre: decoded.nombre,
        email: decoded.email,
        rol_id: decoded.rol_id,
        rol_nombre: decoded.rol_nombre
    };
}

function isAdmin(user) {
    const rolNombre = String(user?.rol_nombre || '').toLowerCase();
    return user?.rol_id === 1 || rolNombre.includes('admin');
}

const authMiddleware = (req, res, next) => {
    try {
        const token = extractToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Sesion no iniciada. Acceso denegado.'
            });
        }

        const decoded = jwt.verify(token, jwtConfig.secret, jwtConfig.verifyOptions);
        req.user = buildUserPayload(decoded);
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Sesion expirada. Por favor, inicia sesion nuevamente.'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Sesion invalida'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error al verificar autenticacion'
        });
    }
};

const checkRole = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        if (!rolesPermitidos.includes(req.user.rol_nombre)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para realizar esta accion'
            });
        }

        next();
    };
};

const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'No autenticado'
        });
    }

    if (!isAdmin(req.user)) {
        return res.status(403).json({
            success: false,
            message: 'No tienes permisos para realizar esta accion'
        });
    }

    next();
};

const optionalAuth = (req, res, next) => {
    try {
        const token = extractToken(req);

        if (token) {
            const decoded = jwt.verify(token, jwtConfig.secret, jwtConfig.verifyOptions);
            req.user = buildUserPayload(decoded);
        }

        next();
    } catch (error) {
        next();
    }
};

module.exports = authMiddleware;
module.exports.checkRole = checkRole;
module.exports.optionalAuth = optionalAuth;
module.exports.requireAdmin = requireAdmin;
