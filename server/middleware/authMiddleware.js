const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * MIDDLEWARE DE PROTEÇÃO DE ROTAS
 * Verifica o Token JWT e injeta o utilizador na requisição (req.user)
 */
const protect = async (req, res, next) => {
    let token;

    // 1. Verificar se o token existe nos headers (Padrão: Bearer <token>)
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Extrair apenas a hash do token
            token = req.headers.authorization.split(' ')[1];

            // 2. Descodificar e verificar o token com a chave secreta
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Buscar o utilizador no Neon para garantir que a conta ainda existe
            const query = 'SELECT id, name, email FROM users WHERE id = $1';
            const { rows } = await db.query(query, [decoded.id]);

            if (rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Acesso negado. Utilizador não encontrado no sistema.'
                });
            }

            // 4. Anexar dados do utilizador ao objeto da requisição
            req.user = rows[0];
            
            // Segue para o próximo passo (Controller)
            next();

        } catch (error) {
            console.error('Falha na validação do Token:', error.message);
            
            let message = 'Não autorizado. Token inválido.';
            if (error.name === 'TokenExpiredError') {
                message = 'A sua sessão expirou. Por favor, faça login novamente.';
            }

            return res.status(401).json({
                success: false,
                message: message
            });
        }
    }

    // Caso não exista token no cabeçalho
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Acesso negado. Nenhum token de autenticação foi fornecido.'
        });
    }
};

module.exports = { protect };