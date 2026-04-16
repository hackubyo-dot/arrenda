const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * FUNÇÃO AUXILIAR: Gerar Token JWT
 * Cria um token assinado com o ID do utilizador que expira em 30 dias.
 */
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const authController = {
    /**
     * @desc    Registar um novo utilizador em Angola Imóveis
     * @route   POST /api/auth/register
     */
    register: async (req, res) => {
        try {
            const { name, email, password } = req.body;

            // 1. Validação de campos obrigatórios
            if (!name || !email || !password) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Por favor, preencha o nome, e-mail e palavra-passe.' 
                });
            }

            // 2. Verificar se o e-mail já existe no Neon
            const userExists = await User.findByEmail(email);
            if (userExists) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Este e-mail já está registado na nossa plataforma.' 
                });
            }

            // 3. Criar utilizador (Password será encriptada no Model)
            const user = await User.create({ name, email, password });

            if (user) {
                res.status(201).json({
                    success: true,
                    message: 'Conta criada com sucesso!',
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        token: generateToken(user.id) // Envia token para login automático
                    }
                });
            } else {
                res.status(400).json({ success: false, message: 'Dados de utilizador inválidos.' });
            }
        } catch (error) {
            console.error('Erro no registo:', error);
            res.status(500).json({ success: false, message: 'Erro interno ao criar conta.' });
        }
    },

    /**
     * @desc    Autenticar utilizador existente
     * @route   POST /api/auth/login
     */
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            // 1. Buscar utilizador por e-mail no Neon
            const user = await User.findByEmail(email);

            // 2. Verificar se utilizador existe e se a password coincide
            if (user && (await User.comparePassword(password, user.password))) {
                res.json({
                    success: true,
                    message: `Bem-vindo de volta, ${user.name}!`,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        token: generateToken(user.id)
                    }
                });
            } else {
                res.status(401).json({ 
                    success: false, 
                    message: 'E-mail ou palavra-passe incorretos.' 
                });
            }
        } catch (error) {
            console.error('Erro no login:', error);
            res.status(500).json({ success: false, message: 'Erro ao processar o seu login.' });
        }
    },

    /**
     * @desc    Obter dados do perfil logado (Protegido)
     * @route   GET /api/auth/me
     */
    getMe: async (req, res) => {
        try {
            // O req.user é injetado pelo middleware 'protect'
            const user = await User.findById(req.user.id);
            if (user) {
                res.json({
                    success: true,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        created_at: user.created_at
                    }
                });
            } else {
                res.status(404).json({ success: false, message: 'Utilizador não encontrado.' });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao buscar dados do perfil.' });
        }
    }
};

module.exports = authController;