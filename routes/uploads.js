const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const formidable = require("formidable");

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Ruta para subir imágenes
router.post("/upload", (req, res) => {
    const form = new formidable.IncomingForm();
    form.uploadDir = "./uploads"; // Carpeta temporal
    form.keepExtensions = true;  // Mantener la extensión del archivo
    form.allowEmptyFiles = false;
    form.maxFileSize = 10 * 1024 * 1024; // Límite de tamaño: 10 MB
    form.filename = (name, ext, part) => {
        return `${Date.now()}_${part.originalFilename}`; // Genera nombres únicos
    };

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error("Error al procesar el formulario:", err);
            return res.status(400).json({ message: "Error al procesar el formulario", error: err });
        }

        const imageFile = Array.isArray(files.imagen) ? files.imagen[0] : files.imagen;

        if (!imageFile || !imageFile.filepath) {
            console.error("Archivo 'imagen' no encontrado o ruta no válida:", files);
            return res.status(400).json({ message: "Faltan datos obligatorios (imagen)" });
        }

        console.log("Ruta del archivo para subir:", imageFile.filepath);

        try {
            const uploadResult = await cloudinary.uploader.upload(imageFile.filepath, {
                folder: "eventos", // Carpeta en Cloudinary
            });

            console.log("Resultado de Cloudinary:", uploadResult);

            res.status(200).json({ url: uploadResult.secure_url });
        } catch (error) {
            console.error("Error al subir a Cloudinary:", error);
            res.status(500).json({ message: "Error al subir la imagen", error: error.message });
        }
    });
});

module.exports = router;
