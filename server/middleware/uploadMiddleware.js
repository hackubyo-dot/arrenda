const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * CONFIGURAÇÃO DO DIRETÓRIO DE UPLOADS
 * Garante que a pasta existe no servidor Render para evitar erros de escrita.
 */
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * CONFIGURAÇÃO DE ARMAZENAMENTO (Storage)
 * Define o destino e o nome único para cada imagem.
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Gera: timestamp-aleatorio.extensao (ex: 1715829302-48291.jpg)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

/**
 * FILTRO DE ARQUIVOS (File Filter)
 * Bloqueia qualquer arquivo que não seja uma imagem (Segurança).
 */
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Formato inválido! Apenas imagens (.jpg, .png, .webp) são permitidas.'));
    }
};

/**
 * INSTÂNCIA DO MULTER COM LIMITES
 * Define os campos aceitos (Main Image + 4 Extras) e limite de 5MB por foto.
 */
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB por imagem
    },
    fileFilter: fileFilter
}).fields([
    { name: 'main_image', maxCount: 1 },
    { name: 'image_1', maxCount: 1 },
    { name: 'image_2', maxCount: 1 },
    { name: 'image_3', maxCount: 1 },
    { name: 'image_4', maxCount: 1 }
]);

/**
 * MIDDLEWARE WRAPPER
 * Captura erros do Multer (como arquivo muito grande) e retorna resposta limpa.
 */
const uploadMiddleware = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // Erros específicos do Multer (ex: LIMIT_FILE_SIZE)
            return res.status(400).json({
                success: false,
                message: `Erro no upload: ${err.message === 'File too large' ? 'A imagem é muito pesada (máx 5MB)' : err.message}`
            });
        } else if (err) {
            // Outros erros (ex: Formato inválido)
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        // Se tudo estiver OK, segue para o Controller
        next();
    });
};

module.exports = uploadMiddleware;