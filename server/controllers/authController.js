const User = require('../models/User');
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * MOTOR DE AUTENTICAÇÃO E PERFIL VIP
 * Gere Login, Registo, Fotos de Perfil (BYTEA) e Identidade
 */

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const authController = {
    /**
     * @desc    Registar novo utilizador
     * @route   POST /api/auth/register
     */
    register: async (req, res) => {
        try {
            const { name, email, password } = req.body;

            const userExists = await User.findByEmail(email);
            if (userExists) {
                return res.status(400).json({ success: false, message: 'Este e-mail já está em uso.' });
            }

            const user = await User.create({ name, email, password });

            res.status(201).json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    token: generateToken(user.id)
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao criar conta.' });
        }
    },

    /**
     * @desc    Login de utilizador
     * @route   POST /api/auth/login
     */
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await User.findByEmail(email);

            if (user && (await User.comparePassword(password, user.password))) {
                res.json({
                    success: true,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        token: generateToken(user.id)
                    }
                });
            } else {
                res.status(401).json({ success: false, message: 'E-mail ou palavra-passe incorretos.' });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro no servidor.' });
        }
    },

    /**
     * @desc    Obter dados do perfil logado
     * @route   GET /api/auth/me
     */
    getMe: async (req, res) => {
        try {
            const { rows } = await db.query(
                'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
                [req.user.id]
            );
            res.json({ success: true, user: rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao buscar perfil.' });
        }
    },

    /**
     * @desc    Atualizar perfil e Foto (Persistência BYTEA no Neon)
     * @route   PUT /api/auth/profile
     */
    updateProfile: async (req, res) => {
        try {
            const userId = req.user.id;
            const { name, email } = req.body;
            let query = 'UPDATE users SET name = $1, email = $2';
            let params = [name, email, userId];

            // Se houver nova foto de perfil (Multer Memory Storage)
            if (req.files && req.files['profile_image']) {
                const file = req.files['profile_image'][0];
                query = 'UPDATE users SET name = $1, email = $2, profile_image_data = $3, profile_image_mime = $4';
                params = [name, email, file.buffer, file.mimetype, userId];
            }

            query += ' WHERE id = $' + params.length + ' RETURNING id, name, email';
            
            const { rows } = await db.query(query, params);

            res.json({
                success: true,
                message: 'Perfil VIP atualizado com sucesso no Neon!',
                user: rows[0]
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Erro ao atualizar perfil.' });
        }
    },

    /**
     * @desc    Servir imagem de perfil binária
     * @route   GET /api/auth/avatar/:id
     */
    getAvatar: async (req, res) => {
        try {
            const { id } = req.params;
            const { rows } = await db.query(
                'SELECT profile_image_data, profile_image_mime FROM users WHERE id = $1',
                [id]
            );

            if (rows[0] && rows[0].profile_image_data) {
                res.set('Content-Type', rows[0].profile_image_mime);
                res.send(rows[0].profile_image_data);
            } else {
                // Retorna um avatar padrão se não houver imagem
                res.redirect('https://ui-avatars.com/api/?name=User&background=c6ff00&color=000');
            }
        } catch (error) {
            res.status(404).send('Imagem não encontrada');
        }
    }
};

module.exports = authController;