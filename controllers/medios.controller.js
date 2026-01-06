// ============================================
// CONTROLADOR DE MEDIOS (IMÁGENES/VIDEOS)
// ============================================

const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { deleteFile } = require('../config/multer');
const path = require('path');

// ============================================
// OBTENER MEDIO POR ID
// ============================================
exports.getMedioById = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;

        const [medios] = await pool.query('SELECT * FROM medios WHERE id = ?', [id]);

        if (medios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Medio no encontrado'
            });
        }

        res.json({
            success: true,
            data: medios[0]
        });

    } catch (error) {
        console.error('Error en getMedioById:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener medio',
            error: error.message
        });
    }
};

// ============================================
// ACTUALIZAR MEDIO
// ============================================
exports.updateMedio = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { descripcion, orden } = req.body;

        // Verificar que existe
        const [existe] = await pool.query('SELECT id FROM medios WHERE id = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Medio no encontrado'
            });
        }

        // Construir query dinámica
        const updates = [];
        const params = [];

        if (descripcion !== undefined) {
            updates.push('descripcion = ?');
            params.push(descripcion);
        }

        if (orden !== undefined) {
            updates.push('orden = ?');
            params.push(orden);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No hay campos para actualizar'
            });
        }

        params.push(id);
        await pool.query(
            `UPDATE medios SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        // Obtener medio actualizado
        const [medioActualizado] = await pool.query('SELECT * FROM medios WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Medio actualizado exitosamente',
            data: medioActualizado[0]
        });

    } catch (error) {
        console.error('Error en updateMedio:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar medio',
            error: error.message
        });
    }
};

// ============================================
// ELIMINAR MEDIO
// ============================================
exports.deleteMedio = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;

        // Obtener información del medio
        const [medios] = await pool.query('SELECT url FROM medios WHERE id = ?', [id]);

        if (medios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Medio no encontrado'
            });
        }

        // Eliminar registro de BD
        await pool.query('DELETE FROM medios WHERE id = ?', [id]);

        // Eliminar archivo físico
        try {
            const filePath = path.join(__dirname, '..', medios[0].url);
            await deleteFile(filePath);
        } catch (error) {
            console.error('Error al eliminar archivo:', error);
            // Continuar aunque falle la eliminación del archivo
        }

        res.json({
            success: true,
            message: 'Medio eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error en deleteMedio:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar medio',
            error: error.message
        });
    }
};