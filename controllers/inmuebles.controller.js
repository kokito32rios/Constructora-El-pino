// ============================================
// CONTROLADOR DE INMUEBLES
// ============================================

const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { deleteInmuebleFolder, deleteFile } = require('../config/multer');
const { emitAdminNotification, emitInmuebleChange } = require('../config/realtime');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const path = require('path');
const MAX_TRANSACTION_VALUE = 9999999999999.99;

function esAdministrador(user) {
    if (!user) {
        return false;
    }

    const rolNombre = String(user.rol_nombre || '').toLowerCase();
    return user.rol_id === 1 || rolNombre.includes('admin');
}

async function obtenerInmuebleProtegido(id, user) {
    const query = esAdministrador(user)
        ? 'SELECT id, cedula_usuario FROM inmuebles WHERE id = ?'
        : 'SELECT id, cedula_usuario FROM inmuebles WHERE id = ? AND cedula_usuario = ?';
    const params = esAdministrador(user) ? [id] : [id, user.cedula];
    const [rows] = await pool.query(query, params);
    return rows[0] || null;
}

async function obtenerResumenInmueble(id) {
    const [rows] = await pool.query(
        `SELECT 
            i.id,
            i.direccion,
            ciudad.nombre AS ciudad,
            tv.nombre AS tipo_vivienda
        FROM inmuebles i
        INNER JOIN tipos_vivienda tv ON i.tipo_vivienda_id = tv.id
        INNER JOIN ciudades ciudad ON i.ciudad_id = ciudad.id
        WHERE i.id = ?`,
        [id]
    );

    return rows[0] || null;
}

function formatearTituloInmueble(resumen) {
    if (!resumen) {
        return 'un inmueble';
    }

    return `${resumen.tipo_vivienda} en ${resumen.direccion}, ${resumen.ciudad}`;
}

function parseOptionalDecimal(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

async function eliminarMedioPersistido(medio) {
    if (!medio) {
        return;
    }

    if (medio.public_id) {
        try {
            await deleteFromCloudinary(medio.public_id, medio.tipo);
        } catch (error) {
            console.error('Error al eliminar recurso de Cloudinary:', error);
        }
        return;
    }

    if (medio.url && medio.url.startsWith('/uploads/')) {
        try {
            const filePath = path.join(__dirname, '..', medio.url);
            await deleteFile(filePath);
        } catch (error) {
            console.error('Error al eliminar archivo local:', error);
        }
    }
}

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
    cli.id AS cliente_id,
    cli.nombre AS cliente_nombre,
    cli.telefono AS cliente_telefono,
    i.fecha_transaccion,
    i.valor_transaccion,
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
            message: 'Error al obtener inmuebles'
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
            message: 'Error al obtener inmueble'
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
        const latitudNormalizada = parseOptionalDecimal(latitud);
        const longitudNormalizada = parseOptionalDecimal(longitud);

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
                descripcion, JSON.stringify(caracteristicasJSON), latitudNormalizada, longitudNormalizada, cedula_usuario
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

        emitInmuebleChange('created', resultado.insertId, {
            actorCedula: req.user?.cedula
        });
        emitAdminNotification({
            type: 'inmueble',
            action: 'created',
            title: 'Nuevo inmueble',
            message: `${req.user?.nombre || 'Un usuario'} creó el inmueble ${formatearTituloInmueble(nuevoInmueble[0])}.`,
            resourceId: resultado.insertId
        });

        res.status(201).json({
            success: true,
            message: 'Inmueble creado exitosamente',
            data: nuevoInmueble[0]
        });

    } catch (error) {
        console.error('Error en createInmueble:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear inmueble'
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

        const inmuebleProtegido = await obtenerInmuebleProtegido(id, req.user);
        if (!inmuebleProtegido) {
            return res.status(404).json({
                success: false,
                message: 'Inmueble no encontrado o sin permisos'
            });
        }

        const latitudNormalizada = parseOptionalDecimal(latitud);
        const longitudNormalizada = parseOptionalDecimal(longitud);

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
                descripcion, JSON.stringify(caracteristicasJSON), latitudNormalizada, longitudNormalizada, id
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

        emitInmuebleChange('updated', Number(id), {
            actorCedula: req.user?.cedula
        });
        emitAdminNotification({
            type: 'inmueble',
            action: 'updated',
            title: 'Inmueble actualizado',
            message: `${req.user?.nombre || 'Un usuario'} actualizó el inmueble ${formatearTituloInmueble(inmuebleActualizado[0])}.`,
            resourceId: Number(id)
        });

        res.json({
            success: true,
            message: 'Inmueble actualizado exitosamente',
            data: inmuebleActualizado[0]
        });

    } catch (error) {
        console.error('Error en updateInmueble:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar inmueble'
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

        const inmuebleProtegido = await obtenerInmuebleProtegido(id, req.user);
        if (!inmuebleProtegido) {
            return res.status(404).json({
                success: false,
                message: 'Inmueble no encontrado o sin permisos'
            });
        }

        const resumenInmueble = await obtenerResumenInmueble(id);

        // Obtener medios para borrar archivos físicos
const [medios] = await pool.query(
    'SELECT url, public_id, tipo FROM medios WHERE inmueble_id = ?',
    [id]
);

// Eliminar recursos asociados uno a uno
for (const medio of medios) {
    await eliminarMedioPersistido(medio);
}


        // Eliminar inmueble (los medios se eliminan por CASCADE)
        await pool.query('DELETE FROM inmuebles WHERE id = ?', [id]);

        // Eliminar carpeta de archivos si quedaron medios locales heredados
        if (medios.some((medio) => medio.url && medio.url.startsWith('/uploads/'))) {
            try {
                await deleteInmuebleFolder(id);
            } catch (error) {
                console.error('Error al eliminar carpeta:', error);
            }
        }

        emitInmuebleChange('deleted', Number(id), {
            actorCedula: req.user?.cedula
        });
        emitAdminNotification({
            type: 'inmueble',
            action: 'deleted',
            title: 'Inmueble eliminado',
            message: `${req.user?.nombre || 'Un usuario'} eliminó el inmueble ${formatearTituloInmueble(resumenInmueble)}.`,
            resourceId: Number(id)
        });

        res.json({
            success: true,
            message: 'Inmueble eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error en deleteInmueble:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar inmueble'
        });
    }
};

// ============================================
// SUBIR MEDIOS (IMÁGENES/VIDEOS)
// ============================================
exports.uploadMedias = async (req, res) => {
    try {
        const { id } = req.params;
        const inmuebleProtegido = await obtenerInmuebleProtegido(id, req.user);

        if (!inmuebleProtegido) {
            return res.status(404).json({
                success: false,
                message: 'Inmueble no encontrado o sin permisos'
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se subieron archivos'
            });
        }

        const medios = [];
        const resumenInmueble = await obtenerResumenInmueble(id);

        for (const file of req.files) {
            const uploadResult = await uploadBufferToCloudinary(file, id);
            const url = uploadResult.secure_url;
            const tipo = file.mimetype.startsWith('image') ? 'imagen' : 'video';
            const publicId = uploadResult.public_id;

            const [result] = await pool.query(
                `INSERT INTO medios (inmueble_id, tipo, url, public_id)
                 VALUES (?, ?, ?, ?)`,
                [id, tipo, url, publicId]
            );

            medios.push({
                id: result.insertId,
                url,
                tipo,
                public_id: publicId
            });
        }

        emitInmuebleChange('media_uploaded', Number(id), {
            actorCedula: req.user?.cedula,
            totalMedios: medios.length
        });
        emitAdminNotification({
            type: 'inmueble',
            action: 'media_uploaded',
            title: 'Medios agregados',
            message: `${req.user?.nombre || 'Un usuario'} subió ${medios.length} archivo(s) al inmueble ${formatearTituloInmueble(resumenInmueble)}.`,
            resourceId: Number(id)
        });

        res.json({
            success: true,
            message: `Se subieron ${medios.length} medios correctamente`,
            data: medios
        });

    } catch (error) {
        console.error('[uploadMedias] ERROR GRAVE:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno al subir medios'
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
            message: 'Error al obtener medios'
        });
    }
};

// ============================================
// ESTABLECER IMAGEN PRINCIPAL
// ============================================
exports.setImagenPrincipal = async (req, res) => {
    try {
        const { id, mediaId } = req.params;
        const inmuebleProtegido = await obtenerInmuebleProtegido(id, req.user);

        if (!inmuebleProtegido) {
            return res.status(404).json({
                success: false,
                message: 'Inmueble no encontrado o sin permisos'
            });
        }
        const resumenInmueble = await obtenerResumenInmueble(id);

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

        emitInmuebleChange('media_primary_updated', Number(id), {
            actorCedula: req.user?.cedula,
            mediaId: Number(mediaId)
        });
        emitAdminNotification({
            type: 'inmueble',
            action: 'media_primary_updated',
            title: 'Imagen principal actualizada',
            message: `${req.user?.nombre || 'Un usuario'} cambió la imagen principal del inmueble ${formatearTituloInmueble(resumenInmueble)}.`,
            resourceId: Number(id)
        });

        res.json({
            success: true,
            message: 'Imagen principal actualizada'
        });

    } catch (error) {
        console.error('Error en setImagenPrincipal:', error);
        res.status(500).json({
            success: false,
            message: 'Error al establecer imagen principal'
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
        const inmuebleProtegido = await obtenerInmuebleProtegido(id, req.user);

        if (!inmuebleProtegido) {
            return res.status(404).json({
                success: false,
                message: 'Inmueble no encontrado o sin permisos'
            });
        }
        const resumenInmueble = await obtenerResumenInmueble(id);

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

        emitInmuebleChange('media_reordered', Number(id), {
            actorCedula: req.user?.cedula
        });
        emitAdminNotification({
            type: 'inmueble',
            action: 'media_reordered',
            title: 'Galería reordenada',
            message: `${req.user?.nombre || 'Un usuario'} reorganizó los medios del inmueble ${formatearTituloInmueble(resumenInmueble)}.`,
            resourceId: Number(id)
        });

        res.json({
            success: true,
            message: 'Medios reordenados exitosamente'
        });

    } catch (error) {
        console.error('Error en reordenarMedias:', error);
        res.status(500).json({
            success: false,
            message: 'Error al reordenar medios'
        });
    }
};

// ============================================
// ELIMINAR MEDIO
// ============================================
exports.deleteMedia = async (req, res) => {
    try {
        const { id, mediaId } = req.params;
        const inmuebleProtegido = await obtenerInmuebleProtegido(id, req.user);

        if (!inmuebleProtegido) {
            return res.status(404).json({
                success: false,
                message: 'Inmueble no encontrado o sin permisos'
            });
        }
        const resumenInmueble = await obtenerResumenInmueble(id);

        // Obtener información del medio
        const [medios] = await pool.query(
            'SELECT url, public_id, tipo FROM medios WHERE id = ? AND inmueble_id = ?',
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

        await eliminarMedioPersistido(medios[0]);

        emitInmuebleChange('media_deleted', Number(id), {
            actorCedula: req.user?.cedula,
            mediaId: Number(mediaId)
        });
        emitAdminNotification({
            type: 'inmueble',
            action: 'media_deleted',
            title: 'Medio eliminado',
            message: `${req.user?.nombre || 'Un usuario'} eliminó un medio del inmueble ${formatearTituloInmueble(resumenInmueble)}.`,
            resourceId: Number(id)
        });

        res.json({
            success: true,
            message: 'Medio eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error en deleteMedia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar medio'
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

        const inmuebleProtegido = await obtenerInmuebleProtegido(id, req.user);
        if (!inmuebleProtegido) {
            return res.status(404).json({
                success: false,
                message: 'Inmueble no encontrado o sin permisos'
            });
        }
        const resumenInmueble = await obtenerResumenInmueble(id);
        const valorTransaccionNormalizado = parseOptionalDecimal(valor_transaccion);

        if (valorTransaccionNormalizado === null || valorTransaccionNormalizado <= 0) {
            return res.status(400).json({
                success: false,
                message: 'El valor de la transacción debe ser mayor a 0'
            });
        }

        if (valorTransaccionNormalizado > MAX_TRANSACTION_VALUE) {
            return res.status(400).json({
                success: false,
                message: 'El valor de la transacción excede el máximo permitido'
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

        const [estado] = await pool.query('SELECT id, nombre FROM estados_inmueble WHERE id = ?', [estado_id]);
        if (estado.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Estado no encontrado'
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
            [cliente_id, estado_id, fecha_transaccion, valorTransaccionNormalizado, notas_transaccion || null, id]
        );

        emitInmuebleChange('transaction_registered', Number(id), {
            actorCedula: req.user?.cedula,
            clienteId: Number(cliente_id)
        });
        emitAdminNotification({
            type: 'inmueble',
            action: 'transaction_registered',
            title: 'Transacción registrada',
            message: `${req.user?.nombre || 'Un usuario'} registró una transacción para el inmueble ${formatearTituloInmueble(resumenInmueble)}.`,
            resourceId: Number(id)
        });

        res.json({
            success: true,
            message: 'Transacción registrada exitosamente'
        });

    } catch (error) {
        console.error('Error en registrarTransaccion:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar transacción',
            details: process.env.NODE_ENV !== 'production'
                ? (error.sqlMessage || error.message)
                : undefined
        });
    }
};
