// ============================================
// RUTAS DE CATÁLOGOS
// ============================================

const express = require('express');
const router = express.Router();
const catalogosController = require('../controllers/catalogos.controller');

// ============================================
// RUTAS PÚBLICAS (NO REQUIEREN AUTENTICACIÓN)
// ============================================

/**
 * GET /api/catalogos/tipos-vivienda
 * Obtener todos los tipos de vivienda
 */
router.get('/tipos-vivienda', catalogosController.getTiposVivienda);

/**
 * GET /api/catalogos/tipos-transaccion
 * Obtener todos los tipos de transacción
 */
router.get('/tipos-transaccion', catalogosController.getTiposTransaccion);

/**
 * GET /api/catalogos/estados-inmueble
 * Obtener todos los estados de inmuebles
 */
router.get('/estados-inmueble', catalogosController.getEstadosInmueble);

/**
 * GET /api/catalogos/condiciones
 * Obtener todas las condiciones
 */
router.get('/condiciones', catalogosController.getCondiciones);

/**
 * GET /api/catalogos/ciudades
 * Obtener todas las ciudades
 */
router.get('/ciudades', catalogosController.getCiudades);

/**
 * GET /api/catalogos/roles
 * Obtener todos los roles
 */
router.get('/roles', catalogosController.getRoles);

/**
 * GET /api/catalogos/all
 * Obtener todos los catálogos en una sola petición
 */
router.get('/all', catalogosController.getAllCatalogos);

module.exports = router;