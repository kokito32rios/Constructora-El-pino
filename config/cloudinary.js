const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function ensureCloudinaryConfig() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary no está configurado correctamente en las variables de entorno');
  }
}

function uploadBufferToCloudinary(file, inmuebleId) {
  ensureCloudinaryConfig();

  const resourceType = file.mimetype.startsWith('video') ? 'video' : 'image';

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `constructora_el_pino/inmuebles/${inmuebleId}`,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(file.buffer);
  });
}

async function deleteFromCloudinary(publicId, tipo = 'imagen') {
  if (!publicId) {
    return null;
  }

  ensureCloudinaryConfig();

  return cloudinary.uploader.destroy(publicId, {
    resource_type: tipo === 'video' ? 'video' : 'image',
  });
}

module.exports = {
  cloudinary,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
};
