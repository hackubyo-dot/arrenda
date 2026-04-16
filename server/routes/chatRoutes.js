const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configuração rápida de upload para o Chat (Imagens e Documentos)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'server/uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadChat = multer({ storage: storage });

/**
 * @route   GET /api/chat/conversations
 * @desc    Obter lista de conversas ativas (Inbox)
 * @access  Private
 */
router.get('/conversations', protect, chatController.getConversations);

/**
 * @route   GET /api/chat/messages/:otherId
 * @desc    Obter histórico de mensagens com um usuário
 * @access  Private
 */
router.get('/messages/:otherId', protect, chatController.getMessages);

/**
 * @route   POST /api/chat/send
 * @desc    Enviar nova mensagem (Texto ou Ficheiro)
 * @access  Private
 */
router.post('/send', protect, uploadChat.single('chat_file'), chatController.sendMessage);

/**
 * @route   PUT /api/chat/read/:senderId
 * @desc    Marcar mensagens como lidas
 * @access  Private
 */
router.put('/read/:senderId', protect, chatController.markRead);

module.exports = router;