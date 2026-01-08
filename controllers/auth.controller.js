// ============================================
// CONTROLADOR DE AUTENTICACIÓN
// ============================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const jwtConfig = require('../config/jwt');

// ============================================
// LOGIN - Iniciar Sesión
// ============================================
exports.login = async (req, res) => {
    try {
        // Validar errores
        const errors = validationResult(req);
        console.log('BODY RECIBIDO:', req.body);
        console.log('VALIDATION ERRORS:', errors.array());
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación',
                errors: errors.array()
            });
        }

        const { cedula, password } = req.body;

        // Buscar usuario por cédula
        const [usuarios] = await pool.query(
            `SELECT u.*, r.nombre as rol_nombre 
             FROM usuarios u 
             INNER JOIN roles r ON u.rol_id = r.id 
             WHERE u.cedula = ?`,
            [cedula]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no existe'
            });
        }

        const usuario = usuarios[0];

        // Verificar si el usuario está activo
        if (!usuario.activo) {
            return res.status(403).json({
                success: false,
                message: 'Usuario desactivado. Contacta al administrador.'
            });
        }

        // Verificar contraseña
        const passwordValida = await bcrypt.compare(password, usuario.password);
        
        if (!passwordValida) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña incorrecta'
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            {
                cedula: usuario.cedula,
                nombre: usuario.nombre,
                email: usuario.email,
                rol_id: usuario.rol_id,
                rol_nombre: usuario.rol_nombre
            },
            jwtConfig.secret,
            {
                expiresIn: jwtConfig.expiresIn,
                ...jwtConfig.signOptions
            }
        );

        // Respuesta exitosa
        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            data: {
                token,
                usuario: {
                    cedula: usuario.cedula,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol_id: usuario.rol_id,
                    rol_nombre: usuario.rol_nombre
                }
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión',
            error: error.message
        });
    }
};

// ============================================
// REGISTER - Registrar Usuario
// ============================================
exports.register = async (req, res) => {
    try {
        // Validar errores
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación',
                errors: errors.array()
            });
        }

        const { cedula, nombre, email, password, rol_id } = req.body;

        // Verificar si la cédula ya existe
        const [existeCedula] = await pool.query(
            'SELECT cedula FROM usuarios WHERE cedula = ?',
            [cedula]
        );

        if (existeCedula.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'La cédula ya está registrada'
            });
        }

        // Verificar si el email ya existe
        const [existeEmail] = await pool.query(
            'SELECT email FROM usuarios WHERE email = ?',
            [email]
        );

        if (existeEmail.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        // Hashear contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Rol por defecto: Usuario (2)
        const rolFinal = rol_id || 2;

        // Insertar usuario
        const [resultado] = await pool.query(
            `INSERT INTO usuarios (cedula, nombre, email, password, rol_id) 
             VALUES (?, ?, ?, ?, ?)`,
            [cedula, nombre, email, passwordHash, rolFinal]
        );

        // Obtener información del usuario creado
        const [nuevoUsuario] = await pool.query(
            `SELECT u.cedula, u.nombre, u.email, u.rol_id, r.nombre as rol_nombre
             FROM usuarios u
             INNER JOIN roles r ON u.rol_id = r.id
             WHERE u.cedula = ?`,
            [cedula]
        );

        // Generar token
        const token = jwt.sign(
            {
                cedula: nuevoUsuario[0].cedula,
                nombre: nuevoUsuario[0].nombre,
                email: nuevoUsuario[0].email,
                rol_id: nuevoUsuario[0].rol_id,
                rol_nombre: nuevoUsuario[0].rol_nombre
            },
            jwtConfig.secret,
            {
                expiresIn: jwtConfig.expiresIn,
                ...jwtConfig.signOptions
            }
        );

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                token,
                usuario: nuevoUsuario[0]
            }
        });

    } catch (error) {
        console.error('Error en register:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar usuario',
            error: error.message
        });
    }
};

// ============================================
// VERIFY TOKEN - Verificar Token JWT
// ============================================
exports.verifyToken = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token no proporcionado'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, jwtConfig.secret, jwtConfig.verifyOptions);

        // Verificar que el usuario siga existiendo y esté activo
        const [usuarios] = await pool.query(
            `SELECT u.cedula, u.nombre, u.email, u.rol_id, u.activo, r.nombre as rol_nombre
             FROM usuarios u
             INNER JOIN roles r ON u.rol_id = r.id
             WHERE u.cedula = ?`,
            [decoded.cedula]
        );

        // 👉 CASO 1: CÉDULA NO EXISTE
        if (usuarios.length === 0) {
            return res.status(404).json({
                success: false,
                errorCode: 'USER_NOT_FOUND',
                message: 'Usuario no existe'
            });
        }
        const usuario = usuarios[0];

        // 👉 CASO 2: USUARIO DESACTIVADO
        if (!usuario.activo) {
            return res.status(403).json({
                success: false,
                errorCode: 'USER_INACTIVE',
                message: 'Usuario desactivado. Contacta al administrador.'
            });
        }
        // 👉 CASO 3: CONTRASEÑA INCORRECTA
        const passwordValida = await bcrypt.compare(password, usuario.password);

        if (!passwordValida) {
            return res.status(401).json({
                success: false,
                errorCode: 'INVALID_PASSWORD',
                message: 'Contraseña incorrecta'
            });
        }
        res.json({
            success: true,
            message: 'Token válido',
            data: {
                usuario: usuarios[0]
            }
        });

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al verificar token',
            error: error.message
        });
    }
};

// ============================================
// CHANGE PASSWORD - Cambiar Contraseña
// ============================================
exports.changePassword = async (req, res) => {
    try {
        const { cedula, passwordActual, passwordNueva } = req.body;

        if (!cedula || !passwordActual || !passwordNueva) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        // Buscar usuario
        const [usuarios] = await pool.query(
            'SELECT cedula, password FROM usuarios WHERE cedula = ?',
            [cedula]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                success: false,
                errorCode: 'USER_NOT_FOUND',
                message: 'Usuario no encontrado. Contacta al administrador.'
            });
        }

        // Verificar contraseña actual
        const passwordValida = await bcrypt.compare(passwordActual, usuarios[0].password);

        if (!passwordValida) {
            return res.status(401).json({
            success: false,
                errorCode: 'INVALID_PASSWORD',
                message: 'Contraseña incorrecta'
            });
        }
        // Hashear nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(passwordNueva, salt);

        // Actualizar contraseña
        await pool.query(
            'UPDATE usuarios SET password = ? WHERE cedula = ?',
            [passwordHash, cedula]
        );

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error en changePassword:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar contraseña',
            error: error.message
        });
    }
};