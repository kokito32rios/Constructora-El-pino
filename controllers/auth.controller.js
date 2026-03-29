// ============================================
// CONTROLADOR DE AUTENTICACION
// ============================================

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const jwtConfig = require('../config/jwt');

const captchaStore = new Map();
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const AUTH_COOKIE_NAME = 'auth_token';

function parseDurationToMs(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value * 1000;
    }

    if (typeof value !== 'string') {
        return 7 * 24 * 60 * 60 * 1000;
    }

    const match = value.trim().match(/^(\d+)([smhd])$/i);
    if (!match) {
        return 7 * 24 * 60 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    return amount * multipliers[unit];
}

function getAuthCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: parseDurationToMs(jwtConfig.expiresIn),
        path: '/'
    };
}

function parseCookieHeader(cookieHeader = '') {
    return cookieHeader
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean)
        .reduce((cookies, item) => {
            const separatorIndex = item.indexOf('=');
            if (separatorIndex === -1) {
                return cookies;
            }

            const key = item.slice(0, separatorIndex).trim();
            const value = item.slice(separatorIndex + 1).trim();
            cookies[key] = decodeURIComponent(value);
            return cookies;
        }, {});
}

function extractTokenFromRequest(req) {
    const cookies = parseCookieHeader(req.headers.cookie);
    if (cookies[AUTH_COOKIE_NAME]) {
        return cookies[AUTH_COOKIE_NAME];
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    return req.body?.token || null;
}

function setAuthCookie(res, token) {
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

function clearAuthCookie(res) {
    res.clearCookie(AUTH_COOKIE_NAME, {
        ...getAuthCookieOptions(),
        maxAge: undefined
    });
}

function cleanupExpiredCaptchas() {
    const now = Date.now();
    for (const [captchaId, captchaData] of captchaStore.entries()) {
        if (captchaData.expiresAt <= now) {
            captchaStore.delete(captchaId);
        }
    }
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createCaptchaText(length = 5) {
    let text = '';
    for (let i = 0; i < length; i += 1) {
        text += CAPTCHA_CHARS[randomBetween(0, CAPTCHA_CHARS.length - 1)];
    }
    return text;
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function createNoiseLines() {
    let lines = '';
    for (let i = 0; i < 6; i += 1) {
        const color = i % 2 === 0 ? '#7dd3fc' : '#fca5a5';
        lines += `<path d="M ${randomBetween(0, 40)} ${randomBetween(8, 48)} Q ${randomBetween(60, 130)} ${randomBetween(0, 60)} ${randomBetween(160, 220)} ${randomBetween(10, 50)}" stroke="${color}" stroke-width="${randomBetween(1, 2)}" fill="none" opacity="0.7" />`;
    }
    return lines;
}

function createNoiseDots() {
    let dots = '';
    for (let i = 0; i < 24; i += 1) {
        dots += `<circle cx="${randomBetween(8, 212)}" cy="${randomBetween(8, 52)}" r="${Math.random() > 0.5 ? 1 : 1.5}" fill="#94a3b8" opacity="0.35" />`;
    }
    return dots;
}

function createCaptchaSvg(text) {
    const chars = text.split('');
    const letters = chars.map((char, index) => {
        const x = 24 + index * 34;
        const y = randomBetween(34, 43);
        const rotate = randomBetween(-18, 18);
        const colorPalette = ['#f8fafc', '#fef08a', '#bfdbfe', '#f9a8d4', '#c4b5fd'];
        const color = colorPalette[index % colorPalette.length];
        return `<text x="${x}" y="${y}" font-family="monospace" font-size="30" font-weight="700" fill="${color}" transform="rotate(${rotate} ${x} ${y})">${escapeXml(char)}</text>`;
    }).join('');

    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60" role="img" aria-label="Captcha">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#111827" />
                    <stop offset="100%" stop-color="#1f2937" />
                </linearGradient>
            </defs>
            <rect x="0" y="0" width="220" height="60" rx="10" fill="url(#bg)" />
            ${createNoiseDots()}
            ${createNoiseLines()}
            ${letters}
        </svg>
    `.trim();
}

function createCaptchaChallenge() {
    cleanupExpiredCaptchas();

    const captchaId = crypto.randomUUID();
    const answer = createCaptchaText();
    const svg = createCaptchaSvg(answer);
    const imageData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

    captchaStore.set(captchaId, {
        answer,
        expiresAt: Date.now() + CAPTCHA_TTL_MS
    });

    return {
        captchaId,
        imageData,
        expiresInMs: CAPTCHA_TTL_MS
    };
}

function consumeCaptcha(captchaId, captchaAnswer) {
    cleanupExpiredCaptchas();

    const captchaData = captchaStore.get(captchaId);
    if (!captchaData) {
        return false;
    }

    captchaStore.delete(captchaId);
    return captchaData.answer.toUpperCase() === String(captchaAnswer || '').trim().toUpperCase();
}

exports.getCaptcha = async (req, res) => {
    try {
        res.json({
            success: true,
            data: createCaptchaChallenge()
        });
    } catch (error) {
        console.error('Error en getCaptcha:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// ============================================
// LOGIN - Iniciar sesion
// ============================================
exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validacion',
                errors: errors.array()
            });
        }

        const { cedula, password, captchaId, captchaAnswer } = req.body;

        if (!consumeCaptcha(captchaId, captchaAnswer)) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validacion',
                errors: [{ msg: 'El codigo de seguridad no es valido o ha expirado' }]
            });
        }

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
                errorCode: 'INVALID_CREDENTIALS',
                message: 'Credenciales invalidas'
            });
        }

        const usuario = usuarios[0];

        if (!usuario.activo) {
            return res.status(401).json({
                success: false,
                errorCode: 'INVALID_CREDENTIALS',
                message: 'Credenciales invalidas'
            });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            return res.status(401).json({
                success: false,
                errorCode: 'INVALID_CREDENTIALS',
                message: 'Credenciales invalidas'
            });
        }

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

        setAuthCookie(res, token);

        res.json({
            success: true,
            message: 'Inicio de sesion exitoso',
            data: {
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
            message: 'Error en el servidor'
        });
    }
};

// ============================================
// REGISTER - Registrar usuario
// ============================================
exports.register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validacion',
                errors: errors.array()
            });
        }

        const { cedula, nombre, email, password, rol_id } = req.body;

        const [existeCedula] = await pool.query(
            'SELECT cedula FROM usuarios WHERE cedula = ?',
            [cedula]
        );

        if (existeCedula.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'La cedula ya esta registrada'
            });
        }

        const [existeEmail] = await pool.query(
            'SELECT email FROM usuarios WHERE email = ?',
            [email]
        );

        if (existeEmail.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El email ya esta registrado'
            });
        }

        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);
        const rolFinal = rol_id || 2;

        await pool.query(
            `INSERT INTO usuarios (cedula, nombre, email, password, rol_id)
             VALUES (?, ?, ?, ?, ?)`,
            [cedula, nombre, email, passwordHash, rolFinal]
        );

        const [nuevoUsuario] = await pool.query(
            `SELECT u.cedula, u.nombre, u.email, u.rol_id, r.nombre as rol_nombre
             FROM usuarios u
             INNER JOIN roles r ON u.rol_id = r.id
             WHERE u.cedula = ?`,
            [cedula]
        );

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

        setAuthCookie(res, token);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                usuario: nuevoUsuario[0]
            }
        });
    } catch (error) {
        console.error('Error en register:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar usuario'
        });
    }
};

// ============================================
// VERIFY TOKEN - Verificar token JWT
// ============================================
exports.verifyToken = async (req, res) => {
    try {
        const token = extractTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Sesion no iniciada'
            });
        }

        const decoded = jwt.verify(token, jwtConfig.secret, jwtConfig.verifyOptions);

        const [usuarios] = await pool.query(
            `SELECT u.cedula, u.nombre, u.email, u.rol_id, u.activo, r.nombre as rol_nombre
             FROM usuarios u
             INNER JOIN roles r ON u.rol_id = r.id
             WHERE u.cedula = ?`,
            [decoded.cedula]
        );

        if (usuarios.length === 0 || !usuarios[0].activo) {
            return res.status(401).json({
                success: false,
                message: 'Sesion invalida'
            });
        }

        res.json({
            success: true,
            message: 'Token valido',
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
                message: 'Token invalido'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// ============================================
// LOGOUT - Cerrar sesion
// ============================================
exports.logout = async (req, res) => {
    clearAuthCookie(res);

    res.json({
        success: true,
        message: 'Sesion cerrada correctamente'
    });
};

// ============================================
// CHANGE PASSWORD - Cambiar contrasena
// ============================================
exports.changePassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validacion',
                errors: errors.array()
            });
        }

        const { passwordActual, passwordNueva } = req.body;
        const cedula = req.user?.cedula;

        if (!cedula) {
            return res.status(400).json({
                success: false,
                message: 'Sesion no valida'
            });
        }

        if (passwordActual === passwordNueva) {
            return res.status(400).json({
                success: false,
                message: 'La nueva contrasena debe ser diferente a la actual'
            });
        }

        const [usuarios] = await pool.query(
            'SELECT cedula, password FROM usuarios WHERE cedula = ?',
            [cedula]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const passwordValida = await bcrypt.compare(passwordActual, usuarios[0].password);
        if (!passwordValida) {
            return res.status(401).json({
                success: false,
                message: 'Contrasena incorrecta'
            });
        }

        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(passwordNueva, salt);

        await pool.query(
            'UPDATE usuarios SET password = ? WHERE cedula = ?',
            [passwordHash, cedula]
        );

        res.json({
            success: true,
            message: 'Contrasena actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error en changePassword:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

