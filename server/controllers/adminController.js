const db = require('../config/db');

/**
 * MOTOR ADMINISTRATIVO VIP
 * Controle Total: Estatísticas, Utilizadores, VIPs e Moderação
 */

const adminController = {
    /**
     * @desc    Obter Dashboard de Estatísticas (Real-time)
     * @route   GET /api/admin/stats
     */
    getStats: async (req, res) => {
        try {
            // Queries em paralelo para performance
            const [users, props, vips, revenue] = await Promise.all([
                db.query('SELECT COUNT(*) FROM users'),
                db.query('SELECT COUNT(*) FROM properties'),
                db.query('SELECT COUNT(*) FROM properties WHERE is_vip = true'),
                db.query("SELECT SUM(amount) FROM payments WHERE status = 'completed'")
            ]);

            res.json({
                success: true,
                data: {
                    totalUsers: parseInt(users.rows[0].count),
                    totalProperties: parseInt(props.rows[0].count),
                    totalVips: parseInt(vips.rows[0].count),
                    totalRevenue: parseFloat(revenue.rows[0].sum || 0)
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao extrair estatísticas do Neon.' });
        }
    },

    /**
     * @desc    Listar todos os utilizadores da plataforma
     */
    getAllUsers: async (req, res) => {
        try {
            const { rows } = await db.query(
                'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
            );
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao listar utilizadores.' });
        }
    },

    /**
     * @desc    Promover imóvel a VIP (Carrossel Home)
     * @route   PUT /api/admin/properties/:id/vip
     */
    toggleVipStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { is_vip } = req.body;

            const { rows } = await db.query(
                'UPDATE properties SET is_vip = $1 WHERE id = $2 RETURNING id, is_vip',
                [is_vip, id]
            );

            res.json({ 
                success: true, 
                message: is_vip ? 'Imóvel promovido a VIP!' : 'Status VIP removido.',
                data: rows[0] 
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao atualizar status VIP.' });
        }
    },

    /**
     * @desc    Banir Utilizador (Eliminação permanente e BYTEA cleanup)
     */
    deleteUser: async (req, res) => {
        try {
            const { id } = req.params;
            if (id == req.user.id) return res.status(400).json({ message: 'Não podes banir a ti próprio.' });

            await db.query('DELETE FROM users WHERE id = $1', [id]);
            res.json({ success: true, message: 'Utilizador e todos os seus dados binários foram removidos.' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao processar banimento.' });
        }
    }
};

module.exports = adminController;