const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

/**
 * ROTAS PÚBLICAS
 */
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/avatar/:id', authController.getAvatar); // Rota para exibir fotos no <img>

/**
 * ROTAS PRIVADAS (Requerem Token JWT)
 */
router.get('/me', protect, authController.getMe);

// Rota de atualização com suporte a upload de binário
router.put('/profile', protect, uploadMiddleware, authController.updateProfile);

module.exports = router;