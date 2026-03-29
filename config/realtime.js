const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const jwtConfig = require('./jwt');
const { pool } = require('./database');

const AUTH_COOKIE_NAME = 'auth_token';
let ioInstance = null;

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

function buildSocketUser(decoded) {
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

function initRealtime(httpServer) {
    ioInstance = new Server(httpServer, {
        cors: {
            origin: true,
            credentials: true
        }
    });

    ioInstance.use((socket, next) => {
        try {
            const cookies = parseCookieHeader(socket.handshake.headers.cookie || '');
            const token = cookies[AUTH_COOKIE_NAME];

            if (!token) {
                return next(new Error('Sesion no iniciada'));
            }

            const decoded = jwt.verify(token, jwtConfig.secret, jwtConfig.verifyOptions);
            socket.user = buildSocketUser(decoded);
            return next();
        } catch (error) {
            return next(new Error('Sesion invalida'));
        }
    });

    ioInstance.on('connection', (socket) => {
        socket.join('dashboard');
        if (isAdmin(socket.user)) {
            socket.join('admins');
            socket.join(`admin:${socket.user.cedula}`);
        }
        socket.on('disconnect', () => {});
    });

    return ioInstance;
}

function getIO() {
    return ioInstance;
}

function emitInmuebleChange(action, inmuebleId, extra = {}) {
    if (!ioInstance) {
        return;
    }

    ioInstance.to('dashboard').emit('inmueble:changed', {
        action,
        inmuebleId,
        timestamp: new Date().toISOString(),
        ...extra
    });
}

async function emitAdminNotification(notification) {
    try {
        const [admins] = await pool.query(
            `SELECT u.cedula
             FROM usuarios u
             INNER JOIN roles r ON u.rol_id = r.id
             WHERE u.activo = 1
               AND (u.rol_id = 1 OR LOWER(r.nombre) LIKE '%admin%')`
        );

        if (!admins.length) {
            return;
        }

        const timestamp = new Date().toISOString();

        for (const admin of admins) {
            const [result] = await pool.query(
                `INSERT INTO notificaciones
                    (usuario_cedula, tipo, accion, titulo, mensaje, resource_id)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    admin.cedula,
                    notification.type,
                    notification.action,
                    notification.title,
                    notification.message,
                    notification.resourceId ? String(notification.resourceId) : null
                ]
            );

            if (ioInstance) {
                ioInstance.to(`admin:${admin.cedula}`).emit('dashboard:notification', {
                    id: result.insertId,
                    timestamp,
                    read: false,
                    ...notification
                });
            }
        }
    } catch (error) {
        console.error('Error al emitir notificacion admin:', error);
    }
}

module.exports = {
    emitAdminNotification,
    emitInmuebleChange,
    getIO,
    initRealtime
};
