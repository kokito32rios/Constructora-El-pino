// ============================================
// CONTROLADOR DE INMUEBLES
// ============================================

const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { deleteInmuebleFolder, deleteFile } = require('../config/multer');
const path = require('path');

// ============================================
// OBTENER TODOS LOS INMUEBLES CON FILTROS
// ============================================
exports.getInmuebles = async (req, res) => {
    try {
        const {
            ciudad,
            tipo_vivienda,
            tipo_transaccion,
            estado,
            precio_min,
            precio_max,
            habitaciones,
            banos,
            search,
            page = 1,
            limit = 12
        } = req.query;

        // Construir query dinámica
        let query = `
    SELECT 
    i.*,
    tv.nombre AS tipo_vivienda,
    tt.nombre AS tipo_transaccion,
    e.nombre AS estado_nombre,
    c.nombre AS condicion,
    ciudad.nombre AS ciudad,
    ciudad.departamento,
    u.nombre AS usuario_nombre,
    cli.nombre AS cliente_nombre,
    cli.telefono AS cliente_telefono,
    m.url AS imagen_principal
FROM inmuebles i
INNER JOIN tipos_vivienda tv ON i.tipo_vivienda_id = tv.id
INNER JOIN tipos_transaccion tt ON i.tipo_transaccion_id = tt.id
INNER JOIN estados_inmueble e ON i.estado_id = e.id
INNER JOIN condiciones c ON i.condicion_id = c.id
INNER JOIN ciudades ciudad ON i.ciudad_id = ciudad.id
INNER JOIN usuarios u ON i.cedula_usuario = u.cedula
LEFT JOIN clientes cli ON i.cliente_id = cli.id
LEFT JOIN medios m 
    ON m.id = (
        SELECT m2.id
        FROM medios m2
        WHERE m2.inmueble_id = i.id
        ORDER BY m2.es_principal DESC, m2.orden ASC, m2.id ASC
        LIMIT 1
    )
WHERE 1 = 1
        `;

        const params = [];

        // Aplicar filtros
        if (ciudad) {
            query += ' AND i.ciudad_id = ?';
            params.push(ciudad);
        }

        if (tipo_vivienda) {
            query += ' AND i.tipo_vivienda_id = ?';
            params.push(tipo_vivienda);
        }

        if (tipo_transaccion) {
            query += ' AND i.tipo_transaccion_id = ?';
            params.push(tipo_transaccion);
        }

        if (estado) {
            query += ' AND i.estado_id = ?';
            params.push(estado);
        }

        if (precio_min) {
            query += ' AND i.precio >= ?';
            params.push(precio_min);
        }

        if (precio_max) {
            query += ' AND i.precio <= ?';
            params.push(precio_max);
        }

        if (habitaciones) {
            query += ' AND i.habitaciones >= ?';
            params.push(habitaciones);
        }

        if (banos) {
            query += ' AND i.banos >= ?';
            params.push(banos);
        }

        if (search) {
            query += ' AND (i.direccion LIKE ? OR i.barrio LIKE ? OR i.descripcion LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Contar total de resultados
        let countQuery = query.replace(/SELECT[\s\S]+?FROM/, 'SELECT COUNT(i.id) as total FROM');
        // Remover la subconsulta de imagen_principal del count
        countQuery = countQuery.replace(/\(SELECT url FROM medios[^)]+\) as imagen_principal,?/g, '');
        
        const [countResult] = await pool.query(countQuery, params);
        const total = (countResult && countResult[0]) ? countResult[0].total : 0;

        // Paginación
        const offset = (page - 1) * limit;
        query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        // Ejecutar query
        const [inmuebles] = await pool.query(query, params);

        res.json({
            success: true,
            data: inmuebles,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error en getInmuebles:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener inmuebles',
            error: error.message
        });
    }
};

// ============================================
// OBTENER INMUEBLE POR ID
// ============================================
exports.getInmuebleById = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;

        const [inmuebles] = await pool.query(
            `SELECT 
                i.*,
                tv.nombre as tipo_vivienda,
                tt.nombre as tipo_transaccion,
                e.nombre as estado_nombre,
                c.nombre as condicion,
                ciudad.nombre as ciudad,
                ciudad.departamento,
                u.nombre as usuario_nombre,
                u.email as usuario_email,
                cli.id as cliente_id,
                cli.cedula as cliente_cedula,
                cli.nombre as cliente_nombre,
                cli.telefono as cliente_telefono,
                cli.email as cliente_email
            FROM inmuebles i
            INNER JOIN tipos_vivienda tv ON i.tipo_vivienda_id = tv.id
            INNER JOIN tipos_transaccion tt ON i.tipo_transaccion_id = tt.id
            INNER JOIN estados_inmueble e ON i.estado_id = e.id
            INNER JOIN condiciones c ON i.condicion_id = c.id
            INNER JOIN ciudades ciudad ON i.ciudad_id = ciudad.id
            INNER JOIN usuarios u ON i.cedula_usuario = u.cedula
            LEFT JOIN clientes cli ON i.cliente_id = cli.id
            WHERE i.id = ?`,
            [id]
        );

        if (inmuebles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Inmueble no encontrado'
            });
        }

        // Obtener medios del inmueble
        const [medios] = await pool.query(
            'SELECT * FROM medios WHERE inmueble_id = ? ORDER BY es_principal DESC, orden ASC',
            [id]
        );

        const inmueble = {
            ...inmuebles[0],
            medios
        };

        res.json({
            success: true,
            data: inmueble
        });

    } catch (error) {
        console.error('Error en getInmuebleById:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener inmueble',
            error: error.message
        });
    }
};

// ============================================
// CREAR INMUEBLE
// ============================================
exports.createInmueble = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            tipo_vivienda_id,
            medidas,
            tipo_transaccion_id,
            estado_id,
            precio,
            condicion_id,
            direccion,
            barrio,
            ciudad_id,
            habitaciones,
            banos,
            descripcion,
            caracteristicas,
            latitud,
            longitud
        } = req.body;

        const cedula_usuario = req.user.cedula;

        // Validar y parsear características JSON
        let caracteristicasJSON = null;
        if (caracteristicas) {
            try {
                caracteristicasJSON = typeof caracteristicas === 'string' 
                    ? JSON.parse(caracteristicas) 
                    : caracteristicas;
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: 'Características debe ser un JSON válido'
                });
            }
        }

        const [resultado] = await pool.query(
            `INSERT INTO inmuebles (
                tipo_vivienda_id, medidas, tipo_transaccion_id, estado_id, precio,
                condicion_id, direccion, barrio, ciudad_id, habitaciones, banos,
                descripcion, caracteristicas, latitud, longitud, cedula_usuario
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tipo_vivienda_id, medidas, tipo_transaccion_id, estado_id, precio,
                condicion_id, direccion, barrio, ciudad_id, habitaciones, banos,
                descripcion, JSON.stringify(caracteristicasJSON), latitud, longitud, cedula_usuario
            ]
        );

        // Obtener el inmueble creado
        const [nuevoInmueble] = await pool.query(
            `SELECT 
                i.*,
                tv.nombre as tipo_vivienda,
                tt.nombre as tipo_transaccion,
                e.nombre as estado_nombre,
                c.nombre as condicion,
                ciudad.nombre as ciudad
            FROM inmuebles i
            INNER JOIN tipos_vivienda tv ON i.tipo_vivienda_id = tv.id
            INNER JOIN tipos_transaccion tt ON i.tipo_transaccion_id = tt.id
            INNER JOIN estados_inmueble e ON i.estado_id = e.id
            INNER JOIN condiciones c ON i.condicion_id = c.id
            INNER JOIN ciudades ciudad ON i.ciudad_id = ciudad.id
            WHERE i.id = ?`,
            [resultado.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Inmueble creado exitosamente',
            data: nuevoInmueble[0]
        });

    } catch (error) {
        console.error('Error en createInmueble:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear inmueble',
            error: error.message
        });
    }
};

// ============================================
// ACTUALIZAR INMUEBLE
// ============================================
exports.updateInmueble = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const {
            tipo_vivienda_id,
            medidas,
            tipo_transaccion_id,
            estado_id,
            precio,
            condicion_id,
            direccion,
            barrio,
            ciudad_id,
            habitaciones,
            banos,
            descripcion,
            caracteristicas,
            latitud,
            longitud
        } = req.body;

        // Verificar que el inmueble existe
        const [existe] = await pool.query('SELECT id FROM inmuebles WHERE id = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Inmueble no encontrado'
            });
        }

        // Validar y parsear características JSON
        let caracteristicasJSON = null;
        if (caracteristicas) {
            try {
                caracteristicasJSON = typeof caracteristicas === 'string' 
                    ? JSON.parse(caracteristicas) 
                    : caracteristicas;
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: 'Características debe ser un JSON válido'
                });
            }
        }

        await pool.query(
            `UPDATE inmuebles SET
                tipo_vivienda_id = ?, medidas = ?, tipo_transaccion_id = ?, estado_id = ?,
                precio = ?, condicion_id = ?, direccion = ?, barrio = ?, ciudad_id = ?,
                habitaciones = ?, banos = ?, descripcion = ?, caracteristicas = ?,
                latitud = ?, longitud = ?
            WHERE id = ?`,
            [
                tipo_vivienda_id, medidas, tipo_transaccion_id, estado_id, precio,
                condicion_id, direccion, barrio, ciudad_id, habitaciones, banos,
                descripcion, JSON.stringify(caracteristicasJSON), latitud, longitud, id
            ]
        );

        // Obtener el inmueble actualizado
        const [inmuebleActualizado] = await pool.query(
            `SELECT 
                i.*,
                tv.nombre as tipo_vivienda,
                tt.nombre as tipo_transaccion,
                e.nombre as estado_nombre,
                c.nombre as condicion,
                ciudad.nombre as ciudad
            FROM inmuebles i
            INNER JOIN tipos_vivienda tv ON i.tipo_vivienda_id = tv.id
            INNER JOIN tipos_transaccion tt ON i.tipo_transaccion_id = tt.id
            INNER JOIN estados_inmueble e ON i.estado_id = e.id
            INNER JOIN condiciones c ON i.condicion_id = c.id
            INNER JOIN ciudades ciudad ON i.ciudad_id = ciudad.id
            WHERE i.id = ?`,
            [id]
        );

        res.json({
            success: true,
            message: 'Inmueble actualizado exitosamente',
            data: inmuebleActualizado[0]
        });

    } catch (error) {
        console.error('Error en updateInmueble:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar inmueble',
            error: error.message
        });
    }
};

// ============================================
// ELIMINAR INMUEBLE
// ============================================
exports.deleteInmueble = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;

        // Verificar que existe
        const [existe] = await pool.query('SELECT id FROM inmuebles WHERE id = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Inmueble no encontrado'
            });
        }

        // Obtener medios para borrar archivos físicos
const [medios] = await pool.query(
    'SELECT url FROM medios WHERE inmueble_id = ?',
    [id]
);

// Eliminar archivos físicos uno a uno
for (const medio of medios) {
    try {
        const filePath = path.join(__dirname, '..', medio.url);
        await deleteFile(filePath);
    } catch (error) {
        console.error('Error al eliminar archivo:', error);
    }
}


        // Eliminar inmueble (los medios se eliminan por CASCADE)
        await pool.query('DELETE FROM inmuebles WHERE id = ?', [id]);

        // Eliminar carpeta de archivos
        try {
            await deleteInmuebleFolder(id);
        } catch (error) {
            console.error('Error al eliminar carpeta:', error);
        }

        res.json({
            success: true,
            message: 'Inmueble eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error en deleteInmueble:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar inmueble',
            error: error.message
        });
    }
};

// ============================================
// SUBIR MEDIOS (IMÁGENES/VIDEOS)
// ============================================
exports.uploadMedias = async (req, res) => {
    console.log('[uploadMedias] Iniciando subida para inmueble ID:', req.params.id);
    console.log('[uploadMedias] Archivos recibidos:', req.files ? req.files.length : 'NINGUNO');
    console.log('[uploadMedias] Body recibido:', req.body);

    try {
        const { id } = req.params;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se subieron archivos'
            });
        }

        const medios = [];

        for (const file of req.files) {
            console.log('[uploadMedias] Procesando archivo:', {
                originalname: file.originalname,
                mimetype: file.mimetype,
                filename: file.filename,
                size: file.size
            });

            const url = `/uploads/${id}/${file.filename}`;
            const tipo = file.mimetype.startsWith('image') ? 'imagen' : 'video';

            const [result] = await pool.query(
                `INSERT INTO medios (inmueble_id, tipo, url)
                 VALUES (?, ?, ?)`,
                [id, tipo, url]
            );

            medios.push({
                id: result.insertId,
                url,
                tipo
            });
        }

        res.json({
            success: true,
            message: `Se subieron ${medios.length} medios correctamente`,
            data: medios
        });

    } catch (error) {
        console.error('[uploadMedias] ERROR GRAVE:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno al subir medios',
            error: error.message
        });
    }
};

// ============================================
// OBTENER MEDIOS DE UN INMUEBLE
// ============================================
exports.getInmuebleMedias = async (req, res) => {
    try {
        const { id } = req.params;

        const [medios] = await pool.query(
            'SELECT * FROM medios WHERE inmueble_id = ? ORDER BY es_principal DESC, orden ASC',
            [id]
        );

        res.json({
            success: true,
            data: medios
        });

    } catch (error) {
        console.error('Error en getInmuebleMedias:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener medios',
            error: error.message
        });
    }
};

// ============================================
// ESTABLECER IMAGEN PRINCIPAL
// ============================================
exports.setImagenPrincipal = async (req, res) => {
    try {
        const { id, mediaId } = req.params;

        // Verificar que el medio pertenece al inmueble
        const [medio] = await pool.query(
            'SELECT id FROM medios WHERE id = ? AND inmueble_id = ?',
            [mediaId, id]
        );

        if (medio.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Medio no encontrado'
            });
        }

        // Quitar es_principal de todos los medios del inmueble
        await pool.query(
            'UPDATE medios SET es_principal = 0 WHERE inmueble_id = ?',
            [id]
        );

        // Establecer el nuevo principal
        await pool.query(
            'UPDATE medios SET es_principal = 1 WHERE id = ?',
            [mediaId]
        );

        res.json({
            success: true,
            message: 'Imagen principal actualizada'
        });

    } catch (error) {
        console.error('Error en setImagenPrincipal:', error);
        res.status(500).json({
            success: false,
            message: 'Error al establecer imagen principal',
            error: error.message
        });
    }
};

// ============================================
// REORDENAR MEDIOS
// ============================================
exports.reordenarMedias = async (req, res) => {
    try {
        const { id } = req.params;
        const { orden } = req.body; // Array de IDs en el orden deseado

        if (!Array.isArray(orden)) {
            return res.status(400).json({
                success: false,
                message: 'El orden debe ser un array de IDs'
            });
        }

        // Actualizar orden de cada medio
        for (let i = 0; i < orden.length; i++) {
            await pool.query(
                'UPDATE medios SET orden = ? WHERE id = ? AND inmueble_id = ?',
                [i, orden[i], id]
            );
        }

        res.json({
            success: true,
            message: 'Medios reordenados exitosamente'
        });

    } catch (error) {
        console.error('Error en reordenarMedias:', error);
        res.status(500).json({
            success: false,
            message: 'Error al reordenar medios',
            error: error.message
        });
    }
};

// ============================================
// ELIMINAR MEDIO
// ============================================
exports.deleteMedia = async (req, res) => {
    try {
        const { id, mediaId } = req.params;

        // Obtener información del medio
        const [medios] = await pool.query(
            'SELECT url FROM medios WHERE id = ? AND inmueble_id = ?',
            [mediaId, id]
        );

        if (medios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Medio no encontrado'
            });
        }

        // Eliminar registro de BD
        await pool.query('DELETE FROM medios WHERE id = ?', [mediaId]);

        // Eliminar archivo físico
        try {
            const filePath = path.join(__dirname, '..', medios[0].url);
            await deleteFile(filePath);
        } catch (error) {
            console.error('Error al eliminar archivo:', error);
        }

        res.json({
            success: true,
            message: 'Medio eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error en deleteMedia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar medio',
            error: error.message
        });
    }
};

// ============================================
// REGISTRAR TRANSACCIÓN (VENTA/ARRIENDO)
// ============================================
exports.registrarTransaccion = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const {
            cliente_id,
            estado_id,
            fecha_transaccion,
            valor_transaccion,
            notas_transaccion
        } = req.body;

        // Verificar que el inmueble existe
        const [inmueble] = await pool.query('SELECT id FROM inmuebles WHERE id = ?', [id]);
        if (inmueble.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Inmueble no encontrado'
            });
        }

        // Verificar que el cliente existe
        const [cliente] = await pool.query('SELECT id FROM clientes WHERE id = ?', [cliente_id]);
        if (cliente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        // Actualizar inmueble con datos de transacción
        await pool.query(
            `UPDATE inmuebles SET 
                cliente_id = ?, 
                estado_id = ?,
                fecha_transaccion = ?,
                valor_transaccion = ?,
                notas_transaccion = ?
            WHERE id = ?`,
            [cliente_id, estado_id, fecha_transaccion, valor_transaccion, notas_transaccion, id]
        );

        res.json({
            success: true,
            message: 'Transacción registrada exitosamente'
        });

    } catch (error) {
        console.error('Error en registrarTransaccion:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar transacción',
            error: error.message
        });
    }
};