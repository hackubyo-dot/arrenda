const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
    /**
     * @desc    Criar um novo utilizador com password encriptada
     * @param   {Object} data - Nome, E-mail e Password
     */
    async create({ name, email, password }) {
        // 1. Gerar o "salt" e encriptar a palavra-passe (Segurança Máxima)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = `
            INSERT INTO users (name, email, password)
            VALUES ($1, $2, $3)
            RETURNING id, name, email, created_at
        `;
        const values = [name, email, hashedPassword];
        
        // 2. Executar a inserção no Neon
        const { rows } = await db.query(query, values);
        return rows[0];
    },

    /**
     * @desc    Procurar utilizador por E-mail (usado no Login e Registo)
     */
    async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const { rows } = await db.query(query, [email]);
        return rows[0];
    },

    /**
     * @desc    Procurar utilizador por ID (usado em rotas protegidas)
     */
    async findById(id) {
        const query = 'SELECT id, name, email, created_at FROM users WHERE id = $1';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    },

    /**
     * @desc    Comparar a palavra-passe digitada com a encriptada no banco
     */
    async comparePassword(candidatePassword, hashedPassword) {
        return await bcrypt.compare(candidatePassword, hashedPassword);
    },

    /**
     * @desc    Contar quantos imóveis o utilizador já publicou (Regra de Negócio)
     * Usado para validar se o utilizador pode publicar grátis ou se deve pagar 5.000 Kz.
     */
    async countProperties(userId) {
        const query = 'SELECT COUNT(*) FROM properties WHERE user_id = $1';
        const { rows } = await db.query(query, [userId]);
        return parseInt(rows[0].count);
    },

    /**
     * @desc    Atualizar dados do utilizador (Perfil)
     */
    async updateProfile(id, { name, email }) {
        const query = `
            UPDATE users 
            SET name = $1, email = $2 
            WHERE id = $3 
            RETURNING id, name, email
        `;
        const { rows } = await db.query(query, [name, email, id]);
        return rows[0];
    }
};

module.exports = User;