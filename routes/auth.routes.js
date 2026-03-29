// ============================================
// RUTAS DE AUTENTICACION
// ============================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { body } = require('express-validator');

// ============================================
// VALIDACIONES
// ============================================

const loginValidation = [
    body('cedula')
        .notEmpty().withMessage('Completa todos los campos')
        .trim()
        .isLength({ min: 6, max: 20 }).withMessage('La cedula no es valida'),
    body('password')
        .notEmpty().withMessage('Completa todos los campos')
        .isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
    body('captchaId')
        .notEmpty().withMessage('Completa el captcha'),
    body('captchaAnswer')
        .notEmpty().withMessage('Resuelve el captcha')
];

const registerValidation = [
    body('cedula')
        .notEmpty().withMessage('La cedula es requerida')
        .trim()
        .isLength({ min: 6, max: 20 }).withMessage('La cedula debe tener entre 6 y 20 caracteres'),
    body('nombre')
        .notEmpty().withMessage('El nombre es requerido')
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    body('email')
        .notEmpty().withMessage('El email es requerido')
        .trim()
        .isEmail().withMessage('Debe ser un email valido')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contrasena es requerida')
        .isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
    body('rol_id')
        .optional()
        .isInt({ min: 1 }).withMessage('El rol debe ser un numero valido')
];

const changePasswordValidation = [
    body('passwordActual')
        .notEmpty().withMessage('La contrasena actual es requerida'),
    body('passwordNueva')
        .notEmpty().withMessage('La nueva contrasena es requerida')
        .isLength({ min: 6 }).withMessage('La nueva contrasena debe tener al menos 6 caracteres')
];

// ============================================
// RUTAS
// ============================================

router.get('/captcha', authController.getCaptcha);
router.post('/login', loginValidation, authController.login);
router.post('/register', registerValidation, authController.register);
router.post('/verify', authController.verifyToken);
router.post('/logout', authController.logout);
router.post('/change-password', authMiddleware, changePasswordValidation, authController.changePassword);

module.exports = router;
