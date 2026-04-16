const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/payments/pay
 * @desc    Processar pagamento de 5.000 Kz para quota extra de publicação
 * @access  Private (Apenas Utilizadores Autenticados)
 */
router.post('/pay', protect, paymentController.processPayment);

/**
 * @route   GET /api/payments/history
 * @desc    Ver histórico de transações/pagamentos do utilizador
 * @access  Private
 */
router.get('/history', protect, paymentController.getPaymentHistory);

/**
 * @route   GET /api/payments/quota
 * @desc    Verificar quantos imóveis o utilizador ainda pode publicar no Neon
 * @access  Private
 */
router.get('/quota', protect, paymentController.getQuota);

module.exports = router;