// ============================================
// RUTAS DE AUTENTICACIÓN
// ============================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { body } = require('express-validator');

// ============================================
// VALIDACIONES
// ============================================

const loginValidation = [
    body('cedula')
        .notEmpty().withMessage('La cédula es requerida')
        .trim()
        .isLength({ min: 6, max: 20 }).withMessage('La cédula debe tener entre 6 y 20 caracteres'),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
];

const registerValidation = [
    body('cedula')
        .notEmpty().withMessage('La cédula es requerida')
        .trim()
        .isLength({ min: 6, max: 20 }).withMessage('La cédula debe tener entre 6 y 20 caracteres'),
    body('nombre')
        .notEmpty().withMessage('El nombre es requerido')
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    body('email')
        .notEmpty().withMessage('El email es requerido')
        .trim()
        .isEmail().withMessage('Debe ser un email válido')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('rol_id')
        .optional()
        .isInt({ min: 1 }).withMessage('El rol debe ser un número válido')
];

// ============================================
// RUTAS
// ============================================

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post('/login', loginValidation, authController.login);

/**
 * POST /api/auth/register
 * Registrar nuevo usuario
 */
router.post('/register', registerValidation, authController.register);

/**
 * POST /api/auth/verify
 * Verificar token JWT
 */
router.post('/verify', authController.verifyToken);

/**
 * POST /api/auth/change-password
 * Cambiar contraseña (requiere autenticación)
 */
router.post('/change-password', authController.changePassword);

module.exports = router;