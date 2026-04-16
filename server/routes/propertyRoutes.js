const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { protect } = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// ROTAS PÚBLICAS
router.get('/', propertyController.getProperties);
router.get('/:id', propertyController.getPropertyById);
router.get('/image/:id/:index', propertyController.serveImage); // Crucial para renderizar BYTEA

// ROTAS PRIVADAS
router.post('/', protect, uploadMiddleware, propertyController.createProperty);
router.get('/user/me', protect, propertyController.getMyProperties);
router.delete('/:id', protect, propertyController.deleteProperty);

module.exports = router;