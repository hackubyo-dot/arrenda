const db = require('../config/db');

const Payment = {
    /**
     * @desc    Registrar uma intenção ou confirmação de pagamento
     * @param   {Object} data - user_id, amount (5000), reference, status
     */
    async create({ user_id, amount, reference, status }) {
        const query = `
            INSERT INTO payments (user_id, amount, reference, status)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const values = [
            user_id,
            amount || 5000.00,
            reference,
            status || 'pending'
        ];
        
        const { rows } = await db.query(query, values);
        return rows[0];
    },

    /**
     * @desc    Obter histórico de transações de um utilizador específico
     */
    async findByUserId(userId) {
        const query = `
            SELECT * FROM payments 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `;
        const { rows } = await db.query(query, [userId]);
        return rows;
    },

    /**
     * @desc    Atualizar o status de um pagamento (ex: de 'pending' para 'completed')
     * Útil para integrações com APIs de bancos ou gateways em Angola.
     */
    async updateStatus(id, status) {
        const query = `
            UPDATE payments 
            SET status = $1 
            WHERE id = $2 
            RETURNING *
        `;
        const { rows } = await db.query(query, [status, id]);
        return rows[0];
    },

    /**
     * @desc    CALCULAR QUOTA PERMITIDA (Regra de Negócio Crítica)
     * Lógica: 1 Imóvel Grátis + 1 para cada pagamento de 5.000 Kz com status 'completed'.
     */
    async getAllowedPostCount(userId) {
        const query = `
            SELECT COUNT(*) FROM payments 
            WHERE user_id = $1 AND status = 'completed'
        `;
        const { rows } = await db.query(query, [userId]);
        const paidCount = parseInt(rows[0].count);
        
        // Retorna 1 (o grátis inicial) mais o total de pagamentos confirmados
        return 1 + paidCount;
    },

    /**
     * @desc    Buscar pagamento por referência (ex: KZ-12345)
     */
    async findByReference(reference) {
        const query = 'SELECT * FROM payments WHERE reference = $1';
        const { rows } = await db.query(query, [reference]);
        return rows[0];
    }
};

module.exports = Payment;