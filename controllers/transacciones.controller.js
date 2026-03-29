const { pool } = require('../config/database');

function buildBaseQuery() {
    return `
        FROM inmuebles i
        INNER JOIN tipos_vivienda tv ON i.tipo_vivienda_id = tv.id
        INNER JOIN tipos_transaccion tt ON i.tipo_transaccion_id = tt.id
        INNER JOIN estados_inmueble e ON i.estado_id = e.id
        INNER JOIN ciudades c ON i.ciudad_id = c.id
        INNER JOIN usuarios u ON i.cedula_usuario = u.cedula
        LEFT JOIN clientes cli ON i.cliente_id = cli.id
        WHERE i.cliente_id IS NOT NULL
          AND i.fecha_transaccion IS NOT NULL
    `;
}

exports.getTransacciones = async (req, res) => {
    try {
        const {
            search,
            tipo_transaccion,
            estado,
            fecha_desde,
            fecha_hasta,
            page = 1,
            limit = 10
        } = req.query;

        let whereQuery = '';
        const params = [];

        if (search) {
            whereQuery += `
                AND (
                    i.direccion LIKE ?
                    OR i.barrio LIKE ?
                    OR cli.nombre LIKE ?
                    OR cli.cedula LIKE ?
                    OR c.nombre LIKE ?
                )
            `;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (tipo_transaccion) {
            whereQuery += ' AND i.tipo_transaccion_id = ?';
            params.push(tipo_transaccion);
        }

        if (estado) {
            whereQuery += ' AND i.estado_id = ?';
            params.push(estado);
        }

        if (fecha_desde) {
            whereQuery += ' AND i.fecha_transaccion >= ?';
            params.push(fecha_desde);
        }

        if (fecha_hasta) {
            whereQuery += ' AND i.fecha_transaccion <= ?';
            params.push(fecha_hasta);
        }

        const baseQuery = buildBaseQuery();
        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total ${baseQuery} ${whereQuery}`,
            params
        );

        const offset = (Number(page) - 1) * Number(limit);
        const [rows] = await pool.query(
            `SELECT
                i.id,
                i.direccion,
                i.barrio,
                i.fecha_transaccion,
                i.valor_transaccion,
                i.notas_transaccion,
                i.precio,
                tv.nombre AS tipo_vivienda,
                tt.nombre AS tipo_transaccion,
                e.nombre AS estado,
                c.nombre AS ciudad,
                cli.id AS cliente_id,
                cli.nombre AS cliente_nombre,
                cli.cedula AS cliente_cedula,
                cli.telefono AS cliente_telefono,
                cli.email AS cliente_email,
                u.nombre AS asesor_nombre
             ${baseQuery}
             ${whereQuery}
             ORDER BY i.fecha_transaccion DESC, i.updated_at DESC
             LIMIT ? OFFSET ?`,
            [...params, Number(limit), Number(offset)]
        );

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: countRows[0]?.total || 0,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil((countRows[0]?.total || 0) / Number(limit))
            }
        });
    } catch (error) {
        console.error('Error en getTransacciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener transacciones'
        });
    }
};

exports.getTransaccionById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT
                i.id,
                i.direccion,
                i.barrio,
                i.descripcion,
                i.fecha_transaccion,
                i.valor_transaccion,
                i.notas_transaccion,
                i.precio,
                tv.nombre AS tipo_vivienda,
                tt.nombre AS tipo_transaccion,
                e.nombre AS estado,
                c.nombre AS ciudad,
                cli.id AS cliente_id,
                cli.nombre AS cliente_nombre,
                cli.cedula AS cliente_cedula,
                cli.telefono AS cliente_telefono,
                cli.email AS cliente_email,
                cli.direccion AS cliente_direccion,
                u.nombre AS asesor_nombre
             ${buildBaseQuery()}
             AND i.id = ?`,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Transacción no encontrada'
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Error en getTransaccionById:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la transacción'
        });
    }
};
