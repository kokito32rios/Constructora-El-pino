const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const { emitAdminNotification } = require('../config/realtime');

async function obtenerUsuarioConRol(cedula) {
    const [usuarios] = await pool.query(
        `SELECT u.cedula, u.nombre, u.email, u.rol_id, u.activo, u.created_at, u.updated_at,
                r.nombre as rol_nombre, r.descripcion as rol_descripcion
         FROM usuarios u
         INNER JOIN roles r ON u.rol_id = r.id
         WHERE u.cedula = ?`,
        [cedula]
    );

    return usuarios[0] || null;
}

exports.createUsuario = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { cedula, nombre, email, password, rol_id, activo = true } = req.body;

        const [existeCedula] = await pool.query(
            'SELECT cedula FROM usuarios WHERE cedula = ?',
            [cedula]
        );

        if (existeCedula.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'La cédula ya está registrada'
            });
        }

        const [existeEmail] = await pool.query(
            'SELECT email FROM usuarios WHERE email = ?',
            [email]
        );

        if (existeEmail.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está en uso'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await pool.query(
            `INSERT INTO usuarios (cedula, nombre, email, password, rol_id, activo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [cedula, nombre, email, passwordHash, rol_id, activo ? 1 : 0]
        );

        const nuevoUsuario = await obtenerUsuarioConRol(cedula);

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: nuevoUsuario
        });

        emitAdminNotification({
            type: 'usuario',
            action: 'created',
            title: 'Usuario creado',
            message: `${req.user?.nombre || 'Un administrador'} creó el usuario ${nuevoUsuario.nombre} (${nuevoUsuario.cedula}).`,
            resourceId: nuevoUsuario.cedula
        });
    } catch (error) {
        console.error('Error en createUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear usuario'
        });
    }
};

exports.getUsuarios = async (req, res) => {
    try {
        const { page = 1, limit = 20, activo, rol_id } = req.query;

        let query = `
            SELECT u.cedula, u.nombre, u.email, u.rol_id, u.activo, u.created_at,
                   r.nombre as rol_nombre
            FROM usuarios u
            INNER JOIN roles r ON u.rol_id = r.id
            WHERE 1=1
        `;
        const params = [];

        if (activo !== undefined && activo !== '') {
            query += ' AND u.activo = ?';
            params.push(Number(activo));
        }

        if (rol_id) {
            query += ' AND u.rol_id = ?';
            params.push(Number(rol_id));
        }

        const countQuery = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await pool.query(countQuery, params);
        const total = countResult[0].total;

        const offset = (Number(page) - 1) * Number(limit);
        query += ' ORDER BY u.nombre ASC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        const [usuarios] = await pool.query(query, params);

        res.json({
            success: true,
            data: usuarios,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Error en getUsuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios'
        });
    }
};

exports.getUsuarioByCedula = async (req, res) => {
    try {
        const { cedula } = req.params;
        const usuario = await obtenerUsuarioConRol(cedula);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            data: usuario
        });
    } catch (error) {
        console.error('Error en getUsuarioByCedula:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuario'
        });
    }
};

exports.updateUsuario = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { cedula } = req.params;
        const { nombre, email, rol_id, activo, password } = req.body;

        const usuarioActual = await obtenerUsuarioConRol(cedula);
        if (!usuarioActual) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        if (email) {
            const [emailExiste] = await pool.query(
                'SELECT cedula FROM usuarios WHERE email = ? AND cedula != ?',
                [email, cedula]
            );

            if (emailExiste.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El email ya está en uso'
                });
            }
        }

        if (req.user && req.user.cedula === cedula && activo === false) {
            return res.status(400).json({
                success: false,
                message: 'No puedes desactivar tu propio usuario'
            });
        }

        const updates = [];
        const params = [];

        if (nombre) {
            updates.push('nombre = ?');
            params.push(nombre);
        }
        if (email) {
            updates.push('email = ?');
            params.push(email);
        }
        if (rol_id) {
            updates.push('rol_id = ?');
            params.push(Number(rol_id));
        }
        if (activo !== undefined) {
            updates.push('activo = ?');
            params.push(activo ? 1 : 0);
        }
        if (password) {
            const passwordHash = await bcrypt.hash(password, 12);
            updates.push('password = ?');
            params.push(passwordHash);
        }

        if (!updates.length) {
            return res.status(400).json({
                success: false,
                message: 'No hay campos para actualizar'
            });
        }

        params.push(cedula);
        await pool.query(
            `UPDATE usuarios SET ${updates.join(', ')} WHERE cedula = ?`,
            params
        );

        const usuarioActualizado = await obtenerUsuarioConRol(cedula);

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            data: usuarioActualizado
        });

        emitAdminNotification({
            type: 'usuario',
            action: 'updated',
            title: 'Usuario actualizado',
            message: `${req.user?.nombre || 'Un administrador'} actualizó el usuario ${usuarioActualizado.nombre} (${usuarioActualizado.cedula}).`,
            resourceId: usuarioActualizado.cedula
        });
    } catch (error) {
        console.error('Error en updateUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar usuario'
        });
    }
};

exports.deleteUsuario = async (req, res) => {
    try {
        const { cedula } = req.params;

        if (req.user && req.user.cedula === cedula) {
            return res.status(400).json({
                success: false,
                message: 'No puedes eliminar tu propio usuario'
            });
        }

        const [inmueblesAsociados] = await pool.query(
            'SELECT COUNT(*) as total FROM inmuebles WHERE cedula_usuario = ?',
            [cedula]
        );

        if (inmueblesAsociados[0].total > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar el usuario porque tiene inmuebles asociados'
            });
        }

        const [resultado] = await pool.query(
            'DELETE FROM usuarios WHERE cedula = ?',
            [cedula]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });

        emitAdminNotification({
            type: 'usuario',
            action: 'deleted',
            title: 'Usuario eliminado',
            message: `${req.user?.nombre || 'Un administrador'} eliminó el usuario ${cedula}.`,
            resourceId: cedula
        });
    } catch (error) {
        console.error('Error en deleteUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar usuario'
        });
    }
};

exports.toggleActivo = async (req, res) => {
    try {
        const { cedula } = req.params;

        if (req.user && req.user.cedula === cedula) {
            return res.status(400).json({
                success: false,
                message: 'No puedes cambiar el estado de tu propio usuario'
            });
        }

        const [usuario] = await pool.query(
            'SELECT activo FROM usuarios WHERE cedula = ?',
            [cedula]
        );

        if (usuario.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const nuevoEstado = usuario[0].activo ? 0 : 1;

        await pool.query(
            'UPDATE usuarios SET activo = ? WHERE cedula = ?',
            [nuevoEstado, cedula]
        );

        res.json({
            success: true,
            message: `Usuario ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`,
            data: { activo: nuevoEstado }
        });

        emitAdminNotification({
            type: 'usuario',
            action: nuevoEstado ? 'activated' : 'deactivated',
            title: nuevoEstado ? 'Usuario activado' : 'Usuario desactivado',
            message: `${req.user?.nombre || 'Un administrador'} ${nuevoEstado ? 'activó' : 'desactivó'} el usuario ${cedula}.`,
            resourceId: cedula
        });
    } catch (error) {
        console.error('Error en toggleActivo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado del usuario'
        });
    }
};

exports.getInmueblesUsuario = async (req, res) => {
    try {
        const { cedula } = req.params;

        const [inmuebles] = await pool.query(
            `SELECT 
                i.id, i.direccion, i.barrio, i.precio, i.created_at,
                tv.nombre as tipo_vivienda,
                tt.nombre as tipo_transaccion,
                e.nombre as estado,
                c.nombre as ciudad
            FROM inmuebles i
            INNER JOIN tipos_vivienda tv ON i.tipo_vivienda_id = tv.id
            INNER JOIN tipos_transaccion tt ON i.tipo_transaccion_id = tt.id
            INNER JOIN estados_inmueble e ON i.estado_id = e.id
            INNER JOIN ciudades c ON i.ciudad_id = c.id
            WHERE i.cedula_usuario = ?
            ORDER BY i.created_at DESC`,
            [cedula]
        );

        res.json({
            success: true,
            data: inmuebles
        });
    } catch (error) {
        console.error('Error en getInmueblesUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener inmuebles del usuario'
        });
    }
};
