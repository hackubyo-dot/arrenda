const db = require('../config/db');

/**
 * ================================================================
 * CHAT CONTROLLER MASTER - ARRENDA ANGOLA VIP
 * Suporte a Real-time, Persistência BYTEA e Gestão de Contactos
 * ================================================================
 */
const chatController = {

    /**
     * 🔍 PESQUISAR UTILIZADORES
     * Permite encontrar pessoas para iniciar uma nova conversa
     */
    searchUsers: async (req, res) => {
        try {
            const { query } = req.query;
            const userId = req.user.id;

            if (!query) return res.json({ success: true, data: [] });

            const { rows } = await db.query(`
                SELECT id, name, email, role 
                FROM users 
                WHERE (name ILIKE $1 OR email ILIKE $1) 
                AND id != $2 
                LIMIT 10
            `, [`%${query}%`, userId]);

            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('❌ Search Error:', error);
            res.status(500).json({ success: false, message: 'Erro na pesquisa.' });
        }
    },

    /**
     * ✨ SUGESTÕES DE CONTACTO
     * Mostra os utilizadores registados mais recentemente
     */
    getSuggestions: async (req, res) => {
        try {
            const userId = req.user.id;
            const { rows } = await db.query(`
                SELECT id, name, role 
                FROM users 
                WHERE id != $1 
                ORDER BY created_at DESC 
                LIMIT 5
            `, [userId]);

            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao buscar sugestões.' });
        }
    },

    /**
     * 📩 ENVIAR MENSAGEM (TEXTO + FICHEIROS BYTEA)
     * Processa a mensagem, guarda no banco e notifica via Socket.io
     */
    sendMessage: async (req, res) => {
        try {
            const senderId = req.user.id;
            const { receiver_id, message_text } = req.body;

            let fileData = null;
            let fileMime = null;
            let fileName = null;
            let fileType = 'text';

            // Processamento de Ficheiro (via Multer buffer)
            if (req.file) {
                fileData = req.file.buffer;
                fileMime = req.file.mimetype;
                fileName = req.file.originalname;
                fileType = fileMime.startsWith('image/') ? 'image' : 'file';
            }

            const { rows } = await db.query(
                `
                INSERT INTO messages 
                (sender_id, receiver_id, message_text, file_data, file_mime, file_name, file_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, sender_id, receiver_id, message_text, file_mime, file_name, file_type, created_at
                `,
                [senderId, receiver_id, message_text, fileData, fileMime, fileName, fileType]
            );

            const newMessage = rows[0];

            // Injetar URL temporária para o frontend exibir o ficheiro
            if (fileData) {
                newMessage.file_url = `/api/chat/file/${newMessage.id}`;
            }

            // NOTIFICAÇÃO REAL-TIME VIA SOCKET.IO
            const io = req.app.get('socketio');
            if (io) {
                io.to(receiver_id.toString()).emit('message received', newMessage);
            }

            res.json({ success: true, data: newMessage });

        } catch (error) {
            console.error('❌ Send Message Error:', error);
            res.status(500).json({ success: false, message: 'Erro ao enviar mensagem.' });
        }
    },

    /**
     * 📥 LISTAR CONVERSAS (INBOX)
     * Obtém a última mensagem de cada contacto
     */
    getConversations: async (req, res) => {
        try {
            const userId = req.user.id;
            const { rows } = await db.query(
                `
                SELECT DISTINCT ON (other_id)
                    CASE 
                        WHEN sender_id = $1 THEN receiver_id 
                        ELSE sender_id 
                    END as other_id,
                    u.name as other_name,
                    m.message_text,
                    m.file_type,
                    m.created_at,
                    (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = $1 AND is_read = FALSE) as unread_count
                FROM messages m
                JOIN users u ON u.id = (CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END)
                WHERE m.sender_id = $1 OR m.receiver_id = $1
                ORDER BY other_id, m.created_at DESC
                `,
                [userId]
            );

            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('❌ Inbox Error:', error);
            res.status(500).json({ message: 'Erro ao buscar conversas.' });
        }
    },

    /**
     * 💬 HISTÓRICO DE MENSAGENS
     * Obtém todas as mensagens entre dois utilizadores
     */
    getMessages: async (req, res) => {
        try {
            const userId = req.user.id;
            const { otherId } = req.params;

            const { rows } = await db.query(
                `
                SELECT 
                    id, sender_id, receiver_id, message_text, file_type, file_name,
                    CASE WHEN file_data IS NOT NULL THEN '/api/chat/file/' || id ELSE NULL END as file_url,
                    created_at, is_read
                FROM messages
                WHERE (sender_id = $1 AND receiver_id = $2)
                   OR (sender_id = $2 AND receiver_id = $1)
                ORDER BY created_at ASC
                `,
                [userId, otherId]
            );

            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar histórico.' });
        }
    },

    /**
     * 📂 SERVIR FICHEIRO BINÁRIO
     * Converte o BYTEA do banco de dados em resposta de ficheiro
     */
    serveChatFile: async (req, res) => {
        try {
            const { id } = req.params;
            const { rows } = await db.query(
                "SELECT file_data, file_mime, file_name FROM messages WHERE id = $1",
                [id]
            );

            if (rows.length && rows[0].file_data) {
                res.set('Content-Type', rows[0].file_mime);
                res.set('Content-Disposition', `inline; filename="${rows[0].file_name}"`);
                return res.send(rows[0].file_data);
            }
            res.status(404).send('Ficheiro não encontrado.');
        } catch (error) {
            res.status(500).send('Erro ao servir ficheiro.');
        }
    },

    /**
     * ✅ MARCAR COMO LIDO
     * Atualiza o status das mensagens recebidas
     */
    markRead: async (req, res) => {
        try {
            const { senderId } = req.params;
            const userId = req.user.id;

            await db.query(
                "UPDATE messages SET is_read = TRUE WHERE sender_id = $1 AND receiver_id = $2",
                [senderId, userId]
            );

            res.json({ success: true, message: 'Lido.' });
        } catch (error) {
            res.status(500).json({ success: false });
        }
    }
};

module.exports = chatController;