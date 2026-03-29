const express = require('express');
const { body, param } = require('express-validator');
const usuariosController = require('../controllers/usuarios.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

const cedulaParamValidation = [
    param('cedula')
        .notEmpty().withMessage('La cédula es requerida')
        .trim()
        .isLength({ min: 6, max: 20 }).withMessage('La cédula debe tener entre 6 y 20 caracteres')
];

const createUsuarioValidation = [
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
        .isEmail().withMessage('El email no es válido')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('rol_id')
        .notEmpty().withMessage('El rol es requerido')
        .isInt({ min: 1 }).withMessage('El rol no es válido'),
    body('activo')
        .optional()
        .isBoolean().withMessage('El estado debe ser booleano')
];

const updateUsuarioValidation = [
    ...cedulaParamValidation,
    body('nombre')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('El email no es válido')
        .normalizeEmail(),
    body('password')
        .optional({ values: 'falsy' })
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('rol_id')
        .optional()
        .isInt({ min: 1 }).withMessage('El rol no es válido'),
    body('activo')
        .optional()
        .isBoolean().withMessage('El estado debe ser booleano')
];

router.get('/', authMiddleware, requireAdmin, usuariosController.getUsuarios);
router.post('/', authMiddleware, requireAdmin, createUsuarioValidation, usuariosController.createUsuario);
router.get('/:cedula', authMiddleware, requireAdmin, cedulaParamValidation, usuariosController.getUsuarioByCedula);
router.put('/:cedula', authMiddleware, requireAdmin, updateUsuarioValidation, usuariosController.updateUsuario);
router.delete('/:cedula', authMiddleware, requireAdmin, cedulaParamValidation, usuariosController.deleteUsuario);
router.put('/:cedula/toggle-activo', authMiddleware, requireAdmin, cedulaParamValidation, usuariosController.toggleActivo);
router.get('/:cedula/inmuebles', authMiddleware, requireAdmin, cedulaParamValidation, usuariosController.getInmueblesUsuario);

module.exports = router;
