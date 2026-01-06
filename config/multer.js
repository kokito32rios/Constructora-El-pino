// ============================================
// CONFIGURACIÓN DE MULTER PARA SUBIDA DE ARCHIVOS
// ============================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Tipos de archivos permitidos
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];

// Tamaño máximo de archivo (10MB por defecto)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10485760;

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Crear carpeta por inmueble: uploads/{inmueble_id}/
    const inmuebleId = req.params.id || 'temp';
    const uploadPath = path.join(__dirname, '..', 'uploads', inmuebleId.toString());
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  
  filename: (req, file, cb) => {
    // Generar nombre único: timestamp-random-original.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);
  
  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

// Configuración de Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Middleware para múltiples archivos
const uploadMultiple = upload.array('medios', 20); // Máximo 20 archivos

// Middleware con manejo de errores
const uploadMiddleware = (req, res, next) => {
  uploadMultiple(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `El archivo excede el tamaño máximo permitido (${MAX_FILE_SIZE / 1024 / 1024}MB)`
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Excediste el número máximo de archivos permitidos (20)'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Error al subir archivo: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

// Función para eliminar archivos
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Función para eliminar carpeta de inmueble
const deleteInmuebleFolder = (inmuebleId) => {
  return new Promise((resolve, reject) => {
    const folderPath = path.join(__dirname, '..', 'uploads', inmuebleId.toString());
    fs.rm(folderPath, { recursive: true, force: true }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

module.exports = {
  uploadMiddleware,
  deleteFile,
  deleteInmuebleFolder,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_FILE_SIZE
};