const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * PROTECT: Middleware para verificar autenticação JWT
 */
const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Extrair Token
            token = req.headers.authorization.split(' ')[1];

            // Descodificar Token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Buscar utilizador no Neon (Garantindo que a conta ainda existe)
            const { rows } = await db.query(
                'SELECT id, name, email, role FROM users WHERE id = $1', 
                [decoded.id]
            );

            if (rows.length === 0) {
                return res.status(401).json({ success: false, message: 'Utilizador não encontrado no sistema.' });
            }

            // Injetar dados do utilizador na requisição
            req.user = rows[0];
            next();

        } catch (error) {
            console.error('Erro de Autenticação:', error.message);
            const message = error.name === 'TokenExpiredError' ? 'Sessão expirada. Faça login novamente.' : 'Token inválido.';
            return res.status(401).json({ success: false, message });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Acesso negado. Token não fornecido.' });
    }
};

/**
 * ADMIN: Middleware para verificar privilégios de administrador
 */
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acesso restrito. Requer conta de Administrador VIP.' });
    }
};

module.exports = { protect, admin };