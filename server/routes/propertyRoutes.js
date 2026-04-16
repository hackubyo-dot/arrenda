const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { protect } = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

/**
 * @route   GET /api/properties
 * @desc    Listar todos os imóveis ativos (Público com Filtros)
 * @access  Public
 */
router.get('/', propertyController.getProperties);

/**
 * @route   GET /api/properties/user/me
 * @desc    Obter imóveis do usuário logado (Dashboard)
 * @access  Private
 */
router.get('/user/me', protect, propertyController.getUserProperties);

/**
 * @route   GET /api/properties/:id
 * @desc    Obter detalhes de um imóvel específico
 * @access  Public
 */
router.get('/:id', propertyController.getPropertyById);

/**
 * @route   POST /api/properties
 * @desc    Publicar novo imóvel com upload de imagens
 * @access  Private (Requer Validação de Quota no Controller)
 */
router.post('/', protect, uploadMiddleware, propertyController.createProperty);

/**
 * @route   PUT /api/properties/:id
 * @desc    Atualizar dados de um imóvel existente
 * @access  Private (Apenas Proprietário)
 */
router.put('/:id', protect, propertyController.updateProperty);

/**
 * @route   DELETE /api/properties/:id
 * @desc    Remover imóvel e apagar ficheiros do servidor
 * @access  Private (Apenas Proprietário)
 */
router.delete('/:id', protect, propertyController.deleteProperty);

module.exports = router;