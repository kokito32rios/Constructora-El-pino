// ============================================
// SERVER.JS - SERVIDOR PRINCIPAL
// Constructora El Pino - Sistema Inmobiliario
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection } = require('./config/database');

// ============================================
// INICIALIZACIÓN DE EXPRESS
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARES GLOBALES
// ============================================

// CORS - Permitir peticiones desde el frontend
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser - Para leer JSON y datos de formularios
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// Logger personalizado
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// ============================================
// RUTAS DE LA API
// ============================================

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const catalogosRoutes = require('./routes/catalogos.routes');
const inmueblesRoutes = require('./routes/inmuebles.routes');
const clientesRoutes = require('./routes/clientes.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const mediosRoutes = require('./routes/medios.routes');

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/inmuebles', inmueblesRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/medios', mediosRoutes);

// ============================================
// RUTA RAÍZ - PÁGINA PRINCIPAL
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// ============================================
// RUTA DE SALUD - HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// ============================================
// MANEJO DE ERRORES 404
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada',
        path: req.url
    });
});

// ============================================
// MANEJO GLOBAL DE ERRORES
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    
    // Error de validación de Multer
    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: 'Error al subir archivo',
            error: err.message
        });
    }
    
    // Error de sintaxis JSON
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            message: 'JSON inválido en la petición'
        });
    }
    
    // Error de JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expirado'
        });
    }
    
    // Error genérico del servidor
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const startServer = async () => {
    try {
        // Verificar conexión a la base de datos
        await testConnection();
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log('\n' + '='.repeat(50));
            console.log('🏗️  CONSTRUCTORA EL PINO - SISTEMA INMOBILIARIO');
            console.log('='.repeat(50));
            console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
            console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
            console.log(`🌐 Página Principal: http://localhost:${PORT}`);
            console.log(`💻 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log('='.repeat(50) + '\n');
            console.log('📋 Rutas disponibles:');
            console.log('   GET  / - Página principal');
            console.log('   GET  /api/health - Estado del servidor');
            console.log('   POST /api/auth/login - Iniciar sesión');
            console.log('   POST /api/auth/register - Registrar usuario');
            console.log('   GET  /api/catalogos/* - Catálogos del sistema');
            console.log('   GET  /api/inmuebles - Listar inmuebles');
            console.log('   POST /api/inmuebles - Crear inmueble');
            console.log('   GET  /api/clientes - Listar clientes');
            console.log('   POST /api/clientes - Crear cliente');
            console.log('   GET  /api/usuarios - Listar usuarios');
            console.log('='.repeat(50) + '\n');
            console.log('✅ Servidor listo para recibir peticiones\n');
        });
        
    } catch (error) {
        console.error('\n❌ Error al iniciar el servidor:');
        console.error(error);
        process.exit(1);
    }
};

// ============================================
// MANEJO DE SEÑALES DE TERMINACIÓN
// ============================================
process.on('SIGTERM', () => {
    console.log('\n⚠️  SIGTERM recibido. Cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n⚠️  SIGINT recibido. Cerrando servidor...');
    process.exit(0);
});

// Capturar errores no manejados
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Excepción no capturada:', error);
    process.exit(1);
});

// ============================================
// INICIAR APLICACIÓN
// ============================================
startServer();

// Exportar app para testing
module.exports = app;