// ============================================
// CONTROLADOR DE USUARIOS
// ============================================

const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

// ============================================
// OBTENER TODOS LOS USUARIOS
// ============================================
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

        if (activo !== undefined) {
            query += ' AND u.activo = ?';
            params.push(activo);
        }

        if (rol_id) {
            query += ' AND u.rol_id = ?';
            params.push(rol_id);
        }

        // Contar total
        const countQuery = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await pool.query(countQuery, params);
        const total = countResult[0].total;

        // Paginación
        const offset = (page - 1) * limit;
        query += ' ORDER BY u.nombre ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [usuarios] = await pool.query(query, params);

        res.json({
            success: true,
            data: usuarios,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error en getUsuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios',
            error: error.message
        });
    }
};

// ============================================
// OBTENER USUARIO POR CÉDULA
// ============================================
exports.getUsuarioByCedula = async (req, res) => {
    try {
        const { cedula } = req.params;

        const [usuarios] = await pool.query(
            `SELECT u.cedula, u.nombre, u.email, u.rol_id, u.activo, u.created_at, u.updated_at,
                    r.nombre as rol_nombre, r.descripcion as rol_descripcion
             FROM usuarios u
             INNER JOIN roles r ON u.rol_id = r.id
             WHERE u.cedula = ?`,
            [cedula]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            data: usuarios[0]
        });

    } catch (error) {
        console.error('Error en getUsuarioByCedula:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuario',
            error: error.message
        });
    }
};

// ============================================
// ACTUALIZAR USUARIO
// ============================================
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
        const { nombre, email, rol_id, activo } = req.body;

        // Verificar que existe
        const [existe] = await pool.query('SELECT cedula FROM usuarios WHERE cedula = ?', [cedula]);
        if (existe.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Verificar si el email ya está en uso
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

        // Construir query dinámica
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
            params.push(rol_id);
        }
        if (activo !== undefined) {
            updates.push('activo = ?');
            params.push(activo);
        }

        if (updates.length === 0) {
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

        // Obtener usuario actualizado
        const [usuarioActualizado] = await pool.query(
            `SELECT u.cedula, u.nombre, u.email, u.rol_id, u.activo, r.nombre as rol_nombre
             FROM usuarios u
             INNER JOIN roles r ON u.rol_id = r.id
             WHERE u.cedula = ?`,
            [cedula]
        );

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            data: usuarioActualizado[0]
        });

    } catch (error) {
        console.error('Error en updateUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar usuario',
            error: error.message
        });
    }
};

// ============================================
// ELIMINAR (DESACTIVAR) USUARIO
// ============================================
exports.deleteUsuario = async (req, res) => {
    try {
        const { cedula } = req.params;

        // No permitir eliminar el propio usuario
        if (req.user && req.user.cedula === cedula) {
            return res.status(400).json({
                success: false,
                message: 'No puedes eliminar tu propio usuario'
            });
        }

        const [resultado] = await pool.query(
            'UPDATE usuarios SET activo = 0 WHERE cedula = ?',
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
            message: 'Usuario desactivado exitosamente'
        });

    } catch (error) {
        console.error('Error en deleteUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar usuario',
            error: error.message
        });
    }
};

// ============================================
// ACTIVAR/DESACTIVAR USUARIO
// ============================================
exports.toggleActivo = async (req, res) => {
    try {
        const { cedula } = req.params;

        // Obtener estado actual
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

    } catch (error) {
        console.error('Error en toggleActivo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado del usuario',
            error: error.message
        });
    }
};

// ============================================
// OBTENER INMUEBLES DE UN USUARIO
// ============================================
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
            message: 'Error al obtener inmuebles del usuario',
            error: error.message
        });
    }
};