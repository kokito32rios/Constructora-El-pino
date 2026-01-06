// ============================================
// RUTAS DE USUARIOS
// ============================================

const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { body, param } = require('express-validator');

// ============================================
// VALIDACIONES
// ============================================

const updateUsuarioValidation = [
    param('cedula').notEmpty().withMessage('Cédula requerida'),
    body('nombre')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('Nombre debe tener entre 3 y 100 caracteres'),
    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Email inválido')
        .normalizeEmail(),
    body('rol_id')
        .optional()
        .isInt({ min: 1 }).withMessage('Rol inválido'),
    body('activo')
        .optional()
        .isBoolean().withMessage('Activo debe ser booleano')
];

const cedulaValidation = [
    param('cedula').notEmpty().withMessage('Cédula requerida')
];

// ============================================
// RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN)
// ============================================

/**
 * GET /api/usuarios
 * Obtener todos los usuarios
 * Query params: page, limit, activo, rol_id
 */
router.get('/', authMiddleware, usuariosController.getUsuarios);

/**
 * GET /api/usuarios/:cedula
 * Obtener detalle de un usuario específico
 */
router.get('/:cedula', authMiddleware, cedulaValidation, usuariosController.getUsuarioByCedula);

/**
 * PUT /api/usuarios/:cedula
 * Actualizar usuario existente
 */
router.put('/:cedula', authMiddleware, updateUsuarioValidation, usuariosController.updateUsuario);

/**
 * DELETE /api/usuarios/:cedula
 * Eliminar (desactivar) usuario
 */
router.delete('/:cedula', authMiddleware, cedulaValidation, usuariosController.deleteUsuario);

/**
 * PUT /api/usuarios/:cedula/toggle-activo
 * Activar/Desactivar usuario
 */
router.put('/:cedula/toggle-activo', authMiddleware, cedulaValidation, usuariosController.toggleActivo);

/**
 * GET /api/usuarios/:cedula/inmuebles
 * Obtener inmuebles registrados por un usuario
 */
router.get('/:cedula/inmuebles', authMiddleware, cedulaValidation, usuariosController.getInmueblesUsuario);

module.exports = router;