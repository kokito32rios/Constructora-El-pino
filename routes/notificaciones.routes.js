const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const notificacionesController = require('../controllers/notificaciones.controller');

router.get('/', authMiddleware, notificacionesController.getNotificaciones);
router.put('/read-all', authMiddleware, notificacionesController.markAllAsRead);

module.exports = router;
