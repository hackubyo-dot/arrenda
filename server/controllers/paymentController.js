const Payment = require('../models/Payment');

const paymentController = {
    /**
     * @desc    Processar Pagamento de 5.000 Kz para quota extra
     * @route   POST /api/payments/pay
     * @access  Private (Apenas Utilizadores Logados)
     */
    processPayment: async (req, res) => {
        try {
            const userId = req.user.id;
            const amount = 5000.00; // Valor fixo da regra de negócio em Angola (Kwanza)
            
            /**
             * SIMULAÇÃO DE GATEWAY (Unitel Money / Multicaixa Express / Referência)
             * Em um cenário real, aqui seria feita a chamada à API bancária.
             * Para produção Render/Neon, geramos uma referência única.
             */
            const reference = 'KZ-' + Math.random().toString(36).substr(2, 9).toUpperCase();

            // Criamos o registro como 'completed' para simular a aprovação imediata
            // permitindo que o utilizador publique o imóvel logo após o clique.
            const payment = await Payment.create({
                user_id: userId,
                amount: amount,
                reference: reference,
                status: 'completed' 
            });

            res.status(200).json({
                success: true,
                message: 'Pagamento de 5.000 Kz processado com sucesso! Quota de publicação aumentada.',
                data: {
                    reference: payment.reference,
                    amount: payment.amount,
                    status: payment.status,
                    date: payment.created_at
                }
            });
        } catch (error) {
            console.error('Erro ao processar pagamento no Neon:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro interno ao processar pagamento. Tente novamente.' 
            });
        }
    },

    /**
     * @desc    Obter histórico de transações do utilizador
     * @route   GET /api/payments/history
     */
    getPaymentHistory: async (req, res) => {
        try {
            const userId = req.user.id;
            const history = await Payment.findByUserId(userId);
            
            res.status(200).json({
                success: true,
                count: history.length,
                data: history
            });
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro ao buscar histórico de pagamentos.' 
            });
        }
    },

    /**
     * @desc    Verificar quota atual (Quantos imóveis pode postar)
     * @route   GET /api/payments/quota
     */
    getQuota: async (req, res) => {
        try {
            const userId = req.user.id;
            const allowed = await Payment.getAllowedPostCount(userId);
            
            // O modelo já traz o cálculo: 1 grátis + pagamentos concluídos no Neon
            res.status(200).json({
                success: true,
                allowed_posts: allowed
            });
        } catch (error) {
            console.error('Erro ao verificar quota:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro ao verificar quota de publicações.' 
            });
        }
    }
};

module.exports = paymentController;