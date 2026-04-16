const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/auth/register
 * @desc    Registar um novo utilizador em Angola Imóveis (Neon DB)
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Autenticar utilizador e gerar Token JWT
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Obter dados do perfil do utilizador logado (requer token)
 * @access  Private (Protegido por JWT)
 */
router.get('/me', protect, authController.getMe);

module.exports = router;