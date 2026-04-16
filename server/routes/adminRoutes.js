const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

/**
 * TODAS AS ROTAS AQUI REQUEREM:
 * 1. Token Válido (protect)
 * 2. Role === 'admin' (admin)
 */

router.get('/stats', protect, admin, adminController.getStats);
router.get('/users', protect, admin, adminController.getAllUsers);
router.put('/properties/:id/vip', protect, admin, adminController.toggleVipStatus);
router.delete('/users/:id', protect, admin, adminController.deleteUser);

module.exports = router;