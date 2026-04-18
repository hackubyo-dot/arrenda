const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { protect } = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

/**
 * ==============================================================================
 * ROTEADOR DE PROPRIEDADES VIP - ARRENDA ANGOLA
 * Organização de rotas por visibilidade e proteção de dados.
 * ==============================================================================
 */

// --- ROTAS PÚBLICAS (Acesso sem Token) ---

/**
 * @route   GET /api/properties
 * @desc    Listar todos os imóveis ativos (Suporta filtros via Query String)
 */
router.get('/', propertyController.getProperties);

/**
 * @route   GET /api/properties/:id
 * @desc    Obter detalhes textuais de um imóvel específico
 */
router.get('/:id', propertyController.getPropertyById);

/**
 * @route   GET /api/properties/image/:id/:index
 * @desc    Serviço vital para renderizar BYTEA (binário) como imagem no browser
 * @index   0 = Capa, 1-4 = Fotos da galeria
 */
router.get('/image/:id/:index', propertyController.serveImage);


// --- ROTAS PRIVADAS (Requer Autenticação) ---

/**
 * @route   GET /api/properties/user/me
 * @desc    Listar apenas os imóveis do utilizador logado (Painel de Gestão)
 */
router.get('/user/me', protect, propertyController.getMyProperties);

/**
 * @route   POST /api/properties
 * @desc    Publicar novo imóvel com processamento de upload de imagens
 */
router.post('/', protect, uploadMiddleware, propertyController.createProperty);

/**
 * @route   PUT /api/properties/:id
 * @desc    Motor de Atualização Suprema: Edita textos e substitui imagens binárias
 */
router.put('/:id', protect, uploadMiddleware, propertyController.updateProperty);

/**
 * @route   DELETE /api/properties/:id
 * @desc    Eliminar permanentemente um imóvel do servidor Neon
 */
router.delete('/:id', protect, propertyController.deleteProperty);

module.exports = router;