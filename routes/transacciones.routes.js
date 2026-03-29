const express = require('express');
const { param } = require('express-validator');
const authMiddleware = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/auth.middleware');
const transaccionesController = require('../controllers/transacciones.controller');

const router = express.Router();

router.get(
    '/',
    authMiddleware,
    requireAdmin,
    transaccionesController.getTransacciones
);

router.get(
    '/:id',
    authMiddleware,
    requireAdmin,
    [param('id').isInt().withMessage('ID inválido')],
    transaccionesController.getTransaccionById
);

module.exports = router;
