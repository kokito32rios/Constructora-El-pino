require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { testConnection } = require('./config/database');
const { initRealtime } = require('./config/realtime');
const {
    buildContentSecurityPolicy,
    generalRateLimit,
    hppMiddleware,
    loginRateLimit,
    securityMiddleware
} = require('./middleware/security');
const { sanitizeRequest } = require('./middleware/input-security');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
        : false
}));
app.use(buildContentSecurityPolicy());
app.use(securityMiddleware);
app.use('/api', generalRateLimit);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(hppMiddleware);
app.use(sanitizeRequest);
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

const authRoutes = require('./routes/auth.routes');
const catalogosRoutes = require('./routes/catalogos.routes');
const inmueblesRoutes = require('./routes/inmuebles.routes');
const clientesRoutes = require('./routes/clientes.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const mediosRoutes = require('./routes/medios.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');
const transaccionesRoutes = require('./routes/transacciones.routes');

app.use('/api/auth/login', loginRateLimit);
app.use('/api/auth', authRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/inmuebles', inmueblesRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/medios', mediosRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/transacciones', transaccionesRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada',
        path: req.url
    });
});

app.use((err, req, res, next) => {
    console.error('Error del servidor:', err);

    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: 'Error al subir archivo'
        });
    }

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            message: 'JSON invalido en la peticion'
        });
    }

    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'La peticion excede el tamano permitido'
        });
    }

    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Sesion invalida'
        });
    }

    return res.status(err.status || 500).json({
        success: false,
        message: 'Error en el servidor'
    });
});

const startServer = async () => {
    try {
        await testConnection();
        initRealtime(server);

        server.listen(PORT, () => {
            console.log('\n' + '='.repeat(50));
            console.log('CONSTRUCTORA EL PINO - SISTEMA INMOBILIARIO');
            console.log('='.repeat(50));
            console.log(`Servidor corriendo en: http://localhost:${PORT}`);
            console.log(`API Base URL: http://localhost:${PORT}/api`);
            console.log(`Pagina Principal: http://localhost:${PORT}`);
            console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log('='.repeat(50) + '\n');
            console.log('Rutas disponibles:');
            console.log('   GET  / - Pagina principal');
            console.log('   GET  /api/health - Estado del servidor');
            console.log('   POST /api/auth/login - Iniciar sesion');
            console.log('   POST /api/auth/register - Registrar usuario');
            console.log('   GET  /api/catalogos/* - Catalogos del sistema');
            console.log('   GET  /api/inmuebles - Listar inmuebles');
            console.log('   POST /api/inmuebles - Crear inmueble');
            console.log('   GET  /api/clientes - Listar clientes');
            console.log('   POST /api/clientes - Crear cliente');
            console.log('   GET  /api/usuarios - Listar usuarios');
            console.log('   WS   /socket.io - Tiempo real');
            console.log('='.repeat(50) + '\n');
            console.log('Servidor listo para recibir peticiones\n');
        });
    } catch (error) {
        console.error('\nError al iniciar el servidor:');
        console.error(error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => {
    console.log('\nSIGTERM recibido. Cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nSIGINT recibido. Cerrando servidor...');
    process.exit(0);
});

process.on('unhandledRejection', (reason) => {
    console.error('Promesa rechazada no manejada:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Excepcion no capturada:', error);
    process.exit(1);
});

startServer();

module.exports = { app, server };
