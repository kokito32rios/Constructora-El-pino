// ============================================
// RUTAS DE CLIENTES
// ============================================

const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { body, param } = require('express-validator');

// ============================================
// VALIDACIONES
// ============================================

const createClienteValidation = [
    body('cedula')
        .notEmpty().withMessage('Cédula requerida')
        .trim()
        .isLength({ min: 6, max: 20 }).withMessage('Cédula debe tener entre 6 y 20 caracteres'),
    body('nombre')
        .notEmpty().withMessage('Nombre requerido')
        .trim()
        .isLength({ min: 3, max: 150 }).withMessage('Nombre debe tener entre 3 y 150 caracteres'),
    body('telefono')
        .optional()
        .trim()
        .isLength({ max: 20 }).withMessage('Teléfono no debe exceder 20 caracteres'),
    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Email inválido')
        .normalizeEmail()
];

const updateClienteValidation = [
    param('id').isInt().withMessage('ID inválido'),
    ...createClienteValidation
];

const idValidation = [
    param('id').isInt().withMessage('ID inválido')
];

// ============================================
// RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN)
// ============================================

/**
 * GET /api/clientes
 * Obtener todos los clientes con paginación y búsqueda
 * Query params: search, page, limit
 */
router.get('/', authMiddleware, clientesController.getClientes);

/**
 * GET /api/clientes/:id
 * Obtener detalle de un cliente específico
 */
router.get('/:id', authMiddleware, idValidation, clientesController.getClienteById);

/**
 * GET /api/clientes/cedula/:cedula
 * Buscar cliente por cédula
 */
router.get('/cedula/:cedula', authMiddleware, clientesController.getClienteByCedula);

/**
 * POST /api/clientes
 * Crear nuevo cliente
 */
router.post('/', authMiddleware, createClienteValidation, clientesController.createCliente);

/**
 * PUT /api/clientes/:id
 * Actualizar cliente existente
 */
router.put('/:id', authMiddleware, updateClienteValidation, clientesController.updateCliente);

/**
 * DELETE /api/clientes/:id
 * Eliminar cliente
 */
router.delete('/:id', authMiddleware, idValidation, clientesController.deleteCliente);

/**
 * GET /api/clientes/:id/transacciones
 * Obtener historial de transacciones de un cliente
 */
router.get('/:id/transacciones', authMiddleware, idValidation, clientesController.getTransaccionesCliente);

module.exports = router;