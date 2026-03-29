const { pool } = require('../config/database');

function esAdministrador(user) {
    const rolNombre = String(user?.rol_nombre || '').toLowerCase();
    return user?.rol_id === 1 || rolNombre.includes('admin');
}

exports.getNotificaciones = async (req, res) => {
    try {
        if (!esAdministrador(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver notificaciones'
            });
        }

        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
        const [rows] = await pool.query(
            `SELECT id, tipo, accion, titulo, mensaje, resource_id, leida, created_at
             FROM notificaciones
             WHERE usuario_cedula = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [req.user.cedula, limit]
        );

        res.json({
            success: true,
            data: rows.map((item) => ({
                id: item.id,
                type: item.tipo,
                action: item.accion,
                title: item.titulo,
                message: item.mensaje,
                resourceId: item.resource_id,
                read: Boolean(item.leida),
                timestamp: item.created_at
            }))
        });
    } catch (error) {
        console.error('Error en getNotificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener notificaciones'
        });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        if (!esAdministrador(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para actualizar notificaciones'
            });
        }

        await pool.query(
            'UPDATE notificaciones SET leida = 1 WHERE usuario_cedula = ? AND leida = 0',
            [req.user.cedula]
        );

        res.json({
            success: true,
            message: 'Notificaciones marcadas como leidas'
        });
    } catch (error) {
        console.error('Error en markAllAsRead:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar notificaciones'
        });
    }
};
