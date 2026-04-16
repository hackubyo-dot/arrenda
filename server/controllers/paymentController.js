const db = require('../config/db');

/**
 * CONTROLLER DE PAGAMENTOS - ARRANDA ANGOLA VIP
 */
const paymentController = {

  /**
   * ============================================
   * 💰 PROCESSAR PAGAMENTO
   * ============================================
   * @route POST /api/payments/pay
   */
  processPayment: async (req, res) => {
    try {
      const userId = req.user.id;

      const reference =
        'VIP-' +
        Math.random().toString(36).substring(2, 10).toUpperCase() +
        Date.now();

      const query = `
        INSERT INTO payments (user_id, amount, reference, status)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const { rows } = await db.query(query, [
        userId,
        5000.0,
        reference,
        'completed'
      ]);

      return res.json({
        success: true,
        message: 'Pagamento de 5.000 Kz confirmado! Quota extra liberada.',
        data: rows[0]
      });

    } catch (error) {
      console.error('❌ ERRO PAYMENT:', error);

      return res.status(500).json({
        success: false,
        message: 'Erro ao processar pagamento.'
      });
    }
  },

  /**
   * ============================================
   * 📊 HISTÓRICO DE PAGAMENTOS
   * ============================================
   * @route GET /api/payments/history
   */
  getPaymentHistory: async (req, res) => {
    try {
      const userId = req.user.id;

      const query = `
        SELECT id, amount, reference, status, created_at
        FROM payments
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;

      const { rows } = await db.query(query, [userId]);

      return res.json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error('❌ ERRO HISTORY:', error);

      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar histórico de pagamentos.'
      });
    }
  },

  /**
   * ============================================
   * 📈 VERIFICAR QUOTA
   * ============================================
   * @route GET /api/payments/quota
   */
  getQuota: async (req, res) => {
    try {
      const userId = req.user.id;

      const { rows } = await db.query(
        `
        SELECT COUNT(*) 
        FROM payments 
        WHERE user_id = $1 AND status = 'completed'
        `,
        [userId]
      );

      const totalPayments = parseInt(rows[0].count, 10) || 0;

      // 1 grátis + pagamentos
      const totalAllowed = 1 + totalPayments;

      return res.json({
        success: true,
        allowed_posts: totalAllowed,
        payments: totalPayments
      });

    } catch (error) {
      console.error('❌ ERRO QUOTA:', error);

      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar quota.'
      });
    }
  }
};

module.exports = paymentController;