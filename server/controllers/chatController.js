const Chat = require('../models/Chat');
const User = require('../models/User');

const chatController = {
    /**
     * @desc    Obter lista de todas as conversas ativas (Inbox)
     * @route   GET /api/chat/conversations
     */
    getConversations: async (req, res) => {
        try {
            const userId = req.user.id;
            const conversations = await Chat.getConversations(userId);
            
            res.status(200).json({
                success: true,
                count: conversations.length,
                data: conversations
            });
        } catch (error) {
            console.error('Erro ao buscar conversas:', error);
            res.status(500).json({ success: false, message: 'Erro ao carregar inbox.' });
        }
    },

    /**
     * @desc    Obter histórico de mensagens com um usuário específico
     * @route   GET /api/chat/messages/:otherId
     */
    getMessages: async (req, res) => {
        try {
            const userId = req.user.id;
            const otherId = req.params.otherId;

            const messages = await Chat.getChatHistory(userId, otherId);
            
            // Marcar mensagens recebidas como lidas ao abrir a conversa
            await Chat.markAsRead(otherId, userId);

            res.status(200).json({
                success: true,
                count: messages.length,
                data: messages
            });
        } catch (error) {
            console.error('Erro ao buscar mensagens:', error);
            res.status(500).json({ success: false, message: 'Erro ao carregar histórico.' });
        }
    },

    /**
     * @desc    Enviar nova mensagem (Texto ou Ficheiro/Foto)
     * @route   POST /api/chat/send
     */
    sendMessage: async (req, res) => {
        try {
            const senderId = req.user.id;
            const { receiver_id, property_id, message_text } = req.body;
            
            let fileUrl = null;
            let fileType = 'text';

            // Verificar se há upload de ficheiro/imagem via Multer
            if (req.file) {
                fileUrl = `/uploads/${req.file.filename}`;
                // Detectar se é imagem ou outro arquivo
                fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
            }

            if (!message_text && !fileUrl) {
                return res.status(400).json({ message: 'A mensagem não pode estar vazia.' });
            }

            const messageData = {
                sender_id: senderId,
                receiver_id: receiver_id,
                property_id: property_id || null,
                message_text: message_text,
                file_url: fileUrl,
                file_type: fileType
            };

            // 1. Gravar no Banco de Dados (Persistência no Neon)
            const savedMessage = await Chat.create(messageData);

            // 2. Notificação via Socket.io (Tempo Real)
            const io = req.app.get('socketio');
            if (io) {
                io.to(receiver_id.toString()).emit('message received', savedMessage);
            }

            res.status(201).json({
                success: true,
                data: savedMessage
            });
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            res.status(500).json({ success: false, message: 'Erro ao enviar mensagem.' });
        }
    },

    /**
     * @desc    Marcar conversa como lida
     * @route   PUT /api/chat/read/:senderId
     */
    markRead: async (req, res) => {
        try {
            const userId = req.user.id;
            const senderId = req.params.senderId;

            await Chat.markAsRead(senderId, userId);

            res.status(200).json({ success: true, message: 'Mensagens marcadas como lidas.' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao atualizar status.' });
        }
    }
};

module.exports = chatController;