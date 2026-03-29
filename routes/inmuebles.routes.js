// ============================================
// RUTAS DE INMUEBLES
// ============================================

const express = require('express');
const router = express.Router();
const inmueblesController = require('../controllers/inmuebles.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { uploadMiddleware } = require('../config/multer');
const { body, param } = require('express-validator');

// ============================================
// VALIDACIONES
// ============================================

const createInmuebleValidation = [
    body('tipo_vivienda_id').isInt().withMessage('Tipo de vivienda inválido'),
    body('medidas').isFloat({ gt: 0 }).withMessage('Las medidas deben ser mayores a 0'),
    body('tipo_transaccion_id').isInt().withMessage('Tipo de transacción inválido'),
    body('estado_id').isInt().withMessage('Estado inválido'),
    body('precio').isFloat({ gt: 0 }).withMessage('El precio debe ser mayor a 0'),
    body('condicion_id').isInt().withMessage('Condición inválida'),
    body('direccion').notEmpty().withMessage('Dirección requerida'),
    body('ciudad_id').isInt().withMessage('Ciudad inválida'),
    body('habitaciones').isInt({ min: 0 }).withMessage('Habitaciones inválidas'),
    body('banos').isInt({ min: 0 }).withMessage('Baños inválidos')
];

const updateInmuebleValidation = [
    param('id').isInt().withMessage('ID inválido'),
    ...createInmuebleValidation
];

const idValidation = [
    param('id').isInt().withMessage('ID inválido')
];

// ============================================
// RUTAS PÚBLICAS
// ============================================

/**
 * GET /api/inmuebles
 * Obtener todos los inmuebles con filtros y paginación
 * Query params: ciudad, tipo_vivienda, tipo_transaccion, estado, precio_min, precio_max, page, limit
 */
router.get('/', inmueblesController.getInmuebles);

/**
 * GET /api/inmuebles/:id
 * Obtener detalle de un inmueble específico
 */
router.get('/:id', idValidation, inmueblesController.getInmuebleById);

/**
 * GET /api/inmuebles/:id/medios
 * Obtener medios (imágenes/videos) de un inmueble
 */
router.get('/:id/medios', idValidation, inmueblesController.getInmuebleMedias);

// ============================================
// RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN)
// ============================================

/**
 * POST /api/inmuebles
 * Crear nuevo inmueble
 */
router.post(
    '/',
    authMiddleware,
    createInmuebleValidation,
    inmueblesController.createInmueble
);

/**
 * PUT /api/inmuebles/:id
 * Actualizar inmueble existente
 */
router.put(
    '/:id',
    authMiddleware,
    updateInmuebleValidation,
    inmueblesController.updateInmueble
);

/**
 * DELETE /api/inmuebles/:id
 * Eliminar inmueble
 */
router.delete(
    '/:id',
    authMiddleware,
    idValidation,
    inmueblesController.deleteInmueble
);

/**
 * POST /api/inmuebles/:id/upload-medios
 * Subir imágenes/videos a un inmueble
 */
router.post(
    '/:id/upload-medios',
    authMiddleware,
    uploadMiddleware,
    inmueblesController.uploadMedias
);

/**
 * PUT /api/inmuebles/:id/medios/:mediaId/principal
 * Establecer imagen principal
 */
router.put(
    '/:id/medios/:mediaId/principal',
    authMiddleware,
    inmueblesController.setImagenPrincipal
);

/**
 * PUT /api/inmuebles/:id/medios/ordenar
 * Reordenar imágenes
 */
router.put(
    '/:id/medios/ordenar',
    authMiddleware,
    inmueblesController.reordenarMedias
);

/**
 * DELETE /api/inmuebles/:id/medios/:mediaId
 * Eliminar imagen/video específico
 */
router.delete(
    '/:id/medios/:mediaId',
    authMiddleware,
    inmueblesController.deleteMedia
);

/**
 * POST /api/inmuebles/:id/transaccion
 * Registrar transacción (venta/arriendo) de un inmueble
 */
router.post(
    '/:id/transaccion',
    authMiddleware,
    [
        param('id').isInt().withMessage('ID inválido'),
        body('cliente_id').isInt().withMessage('Cliente inválido'),
        body('estado_id').isInt().withMessage('Estado inválido'),
        body('fecha_transaccion').isDate().withMessage('Fecha inválida'),
        body('valor_transaccion').isFloat({ gt: 0 }).withMessage('El valor de la transaccion debe ser mayor a 0')
    ],
    inmueblesController.registrarTransaccion
);

module.exports = router;
