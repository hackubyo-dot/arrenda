const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');

/**
 * 🔥 IMPORTANTE:
 * usamos memoryStorage para salvar no banco (BYTEA)
 */
const upload = multer({
  storage: multer.memoryStorage()
});

/**
 * ============================================
 * 📥 CONVERSAS
 */
router.get('/conversations', protect, chatController.getConversations);

/**
 * 💬 MENSAGENS
 */
router.get('/messages/:otherId', protect, chatController.getMessages);

/**
 * 📩 ENVIAR
 */
router.post(
  '/send',
  protect,
  upload.single('chat_file'),
  chatController.sendMessage
);

/**
 * 📂 SERVIR FICHEIRO
 */
router.get('/file/:id', protect, chatController.serveChatFile);

/**
 * ✅ MARCAR COMO LIDO
 */
router.put('/read/:senderId', protect, chatController.markRead);

module.exports = router;