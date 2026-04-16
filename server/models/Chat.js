const db = require('../config/db');

const Chat = {
    /**
     * @desc    Gravar uma nova mensagem no banco de dados
     * @param   {Object} data - Dados da mensagem (sender, receiver, text, file_url, etc)
     */
    async create(data) {
        const query = `
            INSERT INTO messages (
                sender_id, 
                receiver_id, 
                property_id, 
                message_text, 
                file_url, 
                file_type, 
                is_read
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [
            data.sender_id,
            data.receiver_id,
            data.property_id || null,
            data.message_text || null,
            data.file_url || null,
            data.file_type || 'text',
            false
        ];
        const { rows } = await db.query(query, values);
        return rows[0];
    },

    /**
     * @desc    Obter histórico de mensagens entre dois usuários
     */
    async getChatHistory(user1, user2) {
        const query = `
            SELECT m.*, 
                   u_sender.name as sender_name, 
                   u_receiver.name as receiver_name
            FROM messages m
            JOIN users u_sender ON m.sender_id = u_sender.id
            JOIN users u_receiver ON m.receiver_id = u_receiver.id
            WHERE (m.sender_id = $1 AND m.receiver_id = $2)
               OR (m.sender_id = $2 AND m.receiver_id = $1)
            ORDER BY m.created_at ASC
        `;
        const { rows } = await db.query(query, [user1, user2]);
        return rows;
    },

    /**
     * @desc    Obter a lista de conversas ativas do usuário (Inbox)
     * Retorna o último contato e a última mensagem de cada chat
     */
    async getConversations(userId) {
        const query = `
            SELECT DISTINCT ON (other_id)
                CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as other_id,
                u.name as other_name,
                m.message_text,
                m.file_url,
                m.file_type,
                m.created_at,
                m.is_read,
                (SELECT COUNT(*) FROM messages 
                 WHERE receiver_id = $1 AND sender_id = u.id AND is_read = false) as unread_count
            FROM messages m
            JOIN users u ON u.id = (CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END)
            WHERE m.sender_id = $1 OR m.receiver_id = $1
            ORDER BY other_id, m.created_at DESC
        `;
        const { rows } = await db.query(query, [userId]);
        // Ordenar por data mais recente no topo
        return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    /**
     * @desc    Marcar mensagens como lidas
     */
    async markAsRead(senderId, receiverId) {
        const query = `
            UPDATE messages 
            SET is_read = true 
            WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false
            RETURNING id
        `;
        const { rows } = await db.query(query, [senderId, receiverId]);
        return rows.length;
    },

    /**
     * @desc    Apagar uma mensagem específica
     */
    async deleteMessage(messageId, userId) {
        const query = `
            DELETE FROM messages 
            WHERE id = $1 AND sender_id = $2 
            RETURNING id
        `;
        const { rows } = await db.query(query, [messageId, userId]);
        return rows.length > 0;
    }
};

module.exports = Chat;