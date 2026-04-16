const multer = require('multer');

/**
 * CONFIGURAÇÃO DE MEMÓRIA (Memory Storage)
 * Como a persistência é BYTEA no Neon, não usamos disco.
 * O arquivo fica no req.file.buffer ou req.files[...].buffer
 */
const storage = multer.memoryStorage();

/**
 * FILTRO DE SEGURANÇA
 * Apenas formatos de imagem e documentos específicos para o Chat.
 */
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg', 
        'image/jpg', 
        'image/png', 
        'image/webp', 
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato de ficheiro não suportado. Use imagens (JPG, PNG, WEBP) ou documentos (PDF, DOCX).'), false);
    }
};

/**
 * CONFIGURAÇÃO DO MULTER
 * Limite rigoroso de 5MB por ficheiro para não sobrecarregar a conexão com o banco.
 */
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 Megabytes
    },
    fileFilter: fileFilter
});

/**
 * DEFINIÇÃO DOS CAMPOS DE UPLOAD
 * main_image: Capa do imóvel
 * image_1 a 4: Galeria do imóvel
 * profile_image: Foto do utilizador
 * chat_file: Anexos do chat
 */
const uploadMiddleware = upload.fields([
    { name: 'main_image', maxCount: 1 },
    { name: 'image_1', maxCount: 1 },
    { name: 'image_2', maxCount: 1 },
    { name: 'image_3', maxCount: 1 },
    { name: 'image_4', maxCount: 1 },
    { name: 'profile_image', maxCount: 1 },
    { name: 'chat_file', maxCount: 1 }
]);

// Wrapper para tratamento de erros do Multer
const handleUpload = (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, message: 'O ficheiro é demasiado grande. O limite é 5MB.' });
            }
            return res.status(400).json({ success: false, message: `Erro no upload: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
};

module.exports = handleUpload;