const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function buildContentSecurityPolicy() {
    return helmet.contentSecurityPolicy({
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            imgSrc: ["'self'", 'data:', 'https://ui-avatars.com', 'https://res.cloudinary.com'],
            mediaSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
            objectSrc: ["'none'"],
            frameAncestors: ["'self'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    });
}

const generalRateLimit = rateLimit({
    windowMs: FIFTEEN_MINUTES,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.'
    }
});

const loginRateLimit = rateLimit({
    windowMs: FIFTEEN_MINUTES,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
        success: false,
        message: 'Demasiados intentos de inicio de sesion. Espera 15 minutos e intenta de nuevo.'
    }
});

function securityMiddleware(req, res, next) {
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    next();
}

module.exports = {
    buildContentSecurityPolicy,
    generalRateLimit,
    hppMiddleware: hpp(),
    loginRateLimit,
    securityMiddleware
};
