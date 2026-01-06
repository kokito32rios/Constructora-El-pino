// ============================================
// CONTROLADOR DE CATÁLOGOS
// ============================================

const { pool } = require('../config/database');

// ============================================
// OBTENER TIPOS DE VIVIENDA
// ============================================
exports.getTiposVivienda = async (req, res) => {
    try {
        const [tipos] = await pool.query(
            'SELECT id, nombre, descripcion FROM tipos_vivienda WHERE activo = 1 ORDER BY nombre'
        );

        res.json({
            success: true,
            data: tipos
        });

    } catch (error) {
        console.error('Error en getTiposVivienda:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener tipos de vivienda',
            error: error.message
        });
    }
};

// ============================================
// OBTENER TIPOS DE TRANSACCIÓN
// ============================================
exports.getTiposTransaccion = async (req, res) => {
    try {
        const [tipos] = await pool.query(
            'SELECT id, nombre, descripcion FROM tipos_transaccion ORDER BY nombre'
        );

        res.json({
            success: true,
            data: tipos
        });

    } catch (error) {
        console.error('Error en getTiposTransaccion:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener tipos de transacción',
            error: error.message
        });
    }
};

// ============================================
// OBTENER ESTADOS DE INMUEBLE
// ============================================
exports.getEstadosInmueble = async (req, res) => {
    try {
        const [estados] = await pool.query(
            'SELECT id, nombre, descripcion FROM estados_inmueble ORDER BY id'
        );

        res.json({
            success: true,
            data: estados
        });

    } catch (error) {
        console.error('Error en getEstadosInmueble:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estados de inmueble',
            error: error.message
        });
    }
};

// ============================================
// OBTENER CONDICIONES
// ============================================
exports.getCondiciones = async (req, res) => {
    try {
        const [condiciones] = await pool.query(
            'SELECT id, nombre, descripcion FROM condiciones ORDER BY nombre'
        );

        res.json({
            success: true,
            data: condiciones
        });

    } catch (error) {
        console.error('Error en getCondiciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener condiciones',
            error: error.message
        });
    }
};

// ============================================
// OBTENER CIUDADES
// ============================================
exports.getCiudades = async (req, res) => {
    try {
        const [ciudades] = await pool.query(
            'SELECT id, nombre, departamento, pais FROM ciudades ORDER BY nombre'
        );

        res.json({
            success: true,
            data: ciudades
        });

    } catch (error) {
        console.error('Error en getCiudades:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener ciudades',
            error: error.message
        });
    }
};

// ============================================
// OBTENER ROLES
// ============================================
exports.getRoles = async (req, res) => {
    try {
        const [roles] = await pool.query(
            'SELECT id, nombre, descripcion FROM roles ORDER BY id'
        );

        res.json({
            success: true,
            data: roles
        });

    } catch (error) {
        console.error('Error en getRoles:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener roles',
            error: error.message
        });
    }
};

// ============================================
// OBTENER TODOS LOS CATÁLOGOS
// ============================================
exports.getAllCatalogos = async (req, res) => {
    try {
        const [tiposVivienda] = await pool.query(
            'SELECT id, nombre, descripcion FROM tipos_vivienda WHERE activo = 1 ORDER BY nombre'
        );

        const [tiposTransaccion] = await pool.query(
            'SELECT id, nombre, descripcion FROM tipos_transaccion ORDER BY nombre'
        );

        const [estados] = await pool.query(
            'SELECT id, nombre, descripcion FROM estados_inmueble ORDER BY id'
        );

        const [condiciones] = await pool.query(
            'SELECT id, nombre, descripcion FROM condiciones ORDER BY nombre'
        );

        const [ciudades] = await pool.query(
            'SELECT id, nombre, departamento, pais FROM ciudades ORDER BY nombre'
        );

        const [roles] = await pool.query(
            'SELECT id, nombre, descripcion FROM roles ORDER BY id'
        );

        res.json({
            success: true,
            data: {
                tiposVivienda,
                tiposTransaccion,
                estados,
                condiciones,
                ciudades,
                roles
            }
        });

    } catch (error) {
        console.error('Error en getAllCatalogos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener catálogos',
            error: error.message
        });
    }
};