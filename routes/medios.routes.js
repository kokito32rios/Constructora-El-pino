// ============================================
// RUTAS DE MEDIOS (IMÁGENES/VIDEOS)
// ============================================

const express = require('express');
const router = express.Router();
const mediosController = require('../controllers/medios.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { param } = require('express-validator');

// ============================================
// VALIDACIONES
// ============================================

const idValidation = [
    param('id').isInt().withMessage('ID inválido')
];

// ============================================
// RUTAS PÚBLICAS
// ============================================

/**
 * GET /api/medios/:id
 * Obtener detalle de un medio específico
 */
router.get('/:id', idValidation, mediosController.getMedioById);

// ============================================
// RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN)
// ============================================

/**
 * PUT /api/medios/:id
 * Actualizar información de un medio
 */
router.put('/:id', authMiddleware, idValidation, mediosController.updateMedio);

/**
 * DELETE /api/medios/:id
 * Eliminar un medio
 */
router.delete('/:id', authMiddleware, idValidation, mediosController.deleteMedio);

module.exports = router;