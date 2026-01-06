// ============================================
// CONTROLADOR DE CLIENTES
// ============================================

const { validationResult } = require('express-validator');
const { pool } = require('../config/database');

// ============================================
// OBTENER TODOS LOS CLIENTES
// ============================================
exports.getClientes = async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;

        let query = 'SELECT * FROM clientes WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (nombre LIKE ? OR cedula LIKE ? OR telefono LIKE ? OR email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Contar total
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [countResult] = await pool.query(countQuery, params);
        const total = countResult[0].total;

        // Paginación
        const offset = (page - 1) * limit;
        query += ' ORDER BY nombre ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [clientes] = await pool.query(query, params);

        res.json({
            success: true,
            data: clientes,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error en getClientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener clientes',
            error: error.message
        });
    }
};

// ============================================
// OBTENER CLIENTE POR ID
// ============================================
exports.getClienteById = async (req, res) => {
    try {
        const { id } = req.params;

        const [clientes] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);

        if (clientes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        res.json({
            success: true,
            data: clientes[0]
        });

    } catch (error) {
        console.error('Error en getClienteById:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener cliente',
            error: error.message
        });
    }
};

// ============================================
// OBTENER CLIENTE POR CÉDULA
// ============================================
exports.getClienteByCedula = async (req, res) => {
    try {
        const { cedula } = req.params;

        const [clientes] = await pool.query('SELECT * FROM clientes WHERE cedula = ?', [cedula]);

        if (clientes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        res.json({
            success: true,
            data: clientes[0]
        });

    } catch (error) {
        console.error('Error en getClienteByCedula:', error);
        res.status(500).json({
            success: false,
            message: 'Error al buscar cliente',
            error: error.message
        });
    }
};

// ============================================
// CREAR CLIENTE
// ============================================
exports.createCliente = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { cedula, nombre, telefono, email, direccion, notas } = req.body;

        // Verificar si la cédula ya existe
        const [existe] = await pool.query('SELECT id FROM clientes WHERE cedula = ?', [cedula]);
        if (existe.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un cliente con esta cédula'
            });
        }

        const [resultado] = await pool.query(
            'INSERT INTO clientes (cedula, nombre, telefono, email, direccion, notas) VALUES (?, ?, ?, ?, ?, ?)',
            [cedula, nombre, telefono, email, direccion, notas]
        );

        const [nuevoCliente] = await pool.query('SELECT * FROM clientes WHERE id = ?', [resultado.insertId]);

        res.status(201).json({
            success: true,
            message: 'Cliente creado exitosamente',
            data: nuevoCliente[0]
        });

    } catch (error) {
        console.error('Error en createCliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear cliente',
            error: error.message
        });
    }
};

// ============================================
// ACTUALIZAR CLIENTE
// ============================================
exports.updateCliente = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { cedula, nombre, telefono, email, direccion, notas } = req.body;

        // Verificar que existe
        const [existe] = await pool.query('SELECT id FROM clientes WHERE id = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        // Verificar si la cédula ya está en uso por otro cliente
        const [cedulaExiste] = await pool.query(
            'SELECT id FROM clientes WHERE cedula = ? AND id != ?',
            [cedula, id]
        );
        if (cedulaExiste.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'La cédula ya está en uso por otro cliente'
            });
        }

        await pool.query(
            'UPDATE clientes SET cedula = ?, nombre = ?, telefono = ?, email = ?, direccion = ?, notas = ? WHERE id = ?',
            [cedula, nombre, telefono, email, direccion, notas, id]
        );

        const [clienteActualizado] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Cliente actualizado exitosamente',
            data: clienteActualizado[0]
        });

    } catch (error) {
        console.error('Error en updateCliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar cliente',
            error: error.message
        });
    }
};

// ============================================
// ELIMINAR CLIENTE
// ============================================
exports.deleteCliente = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si tiene inmuebles asociados
        const [inmuebles] = await pool.query(
            'SELECT COUNT(*) as count FROM inmuebles WHERE cliente_id = ?',
            [id]
        );

        if (inmuebles[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar el cliente porque tiene inmuebles asociados'
            });
        }

        const [resultado] = await pool.query('DELETE FROM clientes WHERE id = ?', [id]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Cliente eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error en deleteCliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar cliente',
            error: error.message
        });
    }
};

// ============================================
// OBTENER TRANSACCIONES DE UN CLIENTE
// ============================================
exports.getTransaccionesCliente = async (req, res) => {
    try {
        const { id } = req.params;

        const [transacciones] = await pool.query(
            `SELECT 
                i.id, i.direccion, i.barrio, i.precio, i.fecha_transaccion, i.valor_transaccion,
                tv.nombre as tipo_vivienda,
                tt.nombre as tipo_transaccion,
                e.nombre as estado,
                c.nombre as ciudad
            FROM inmuebles i
            INNER JOIN tipos_vivienda tv ON i.tipo_vivienda_id = tv.id
            INNER JOIN tipos_transaccion tt ON i.tipo_transaccion_id = tt.id
            INNER JOIN estados_inmueble e ON i.estado_id = e.id
            INNER JOIN ciudades c ON i.ciudad_id = c.id
            WHERE i.cliente_id = ?
            ORDER BY i.fecha_transaccion DESC`,
            [id]
        );

        res.json({
            success: true,
            data: transacciones
        });

    } catch (error) {
        console.error('Error en getTransaccionesCliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener transacciones',
            error: error.message
        });
    }
};