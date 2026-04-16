const db = require('../config/db');

const Property = {
    /**
     * @desc    Criar novo imóvel com persistência total (Imagens e Dados)
     * @param   {Object} data - Objeto contendo todos os campos do formulário
     */
    async create(data) {
        const query = `
            INSERT INTO properties (
                user_id, title, description, price, location, 
                type, phone_primary, phone_secondary, 
                main_image, image_1, image_2, image_3, image_4, 
                is_360
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;
        const values = [
            data.user_id,
            data.title,
            data.description,
            data.price,
            data.location,
            data.type,
            data.phone_primary,
            data.phone_secondary,
            data.main_image,
            data.image_1,
            data.image_2,
            data.image_3,
            data.image_4,
            data.is_360 || false
        ];
        const { rows } = await db.query(query, values);
        return rows[0];
    },

    /**
     * @desc    Obter todos os imóveis com status 'active' para a Home
     */
    async findAllActive() {
        const query = `
            SELECT p.*, u.name as owner_name 
            FROM properties p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'active'
            ORDER BY p.created_at DESC
        `;
        const { rows } = await db.query(query);
        return rows;
    },

    /**
     * @desc    Obter detalhes de um imóvel específico por ID (inclui dados do dono)
     */
    async findById(id) {
        const query = `
            SELECT p.*, u.name as owner_name, u.email as owner_email
            FROM properties p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = $1
        `;
        const { rows } = await db.query(query, [id]);
        return rows[0];
    },

    /**
     * @desc    Obter lista de imóveis de um utilizador específico (para o Dashboard)
     */
    async findByUserId(userId) {
        const query = `
            SELECT * FROM properties 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `;
        const { rows } = await db.query(query, [userId]);
        return rows;
    },

    /**
     * @desc    Atualizar campos de texto do imóvel (Edição)
     */
    async update(id, userId, data) {
        const query = `
            UPDATE properties 
            SET title = $1, description = $2, price = $3, location = $4, 
                type = $5, phone_primary = $6, phone_secondary = $7,
                status = $8
            WHERE id = $9 AND user_id = $10
            RETURNING *
        `;
        const values = [
            data.title,
            data.description,
            data.price,
            data.location,
            data.type,
            data.phone_primary,
            data.phone_secondary,
            data.status || 'active',
            id,
            userId
        ];
        const { rows } = await db.query(query, values);
        return rows[0];
    },

    /**
     * @desc    Remover imóvel do Neon
     */
    async delete(id, userId) {
        const query = 'DELETE FROM properties WHERE id = $1 AND user_id = $2 RETURNING id';
        const { rows } = await db.query(query, [id, userId]);
        return rows.length > 0;
    },

    /**
     * @desc    Motor de Busca Filtrada (Localização, Preço, Tipo)
     */
    async search(filters) {
        let query = `
            SELECT p.*, u.name as owner_name 
            FROM properties p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'active'
        `;
        const values = [];
        let count = 1;

        if (filters.location) {
            query += ` AND (p.location ILIKE $${count} OR p.title ILIKE $${count})`;
            values.push(`%${filters.location}%`);
            count++;
        }

        if (filters.type && filters.type !== 'Todos') {
            query += ` AND p.type = $${count}`;
            values.push(filters.type);
            count++;
        }

        if (filters.minPrice) {
            query += ` AND p.price >= $${count}`;
            values.push(filters.minPrice);
            count++;
        }

        if (filters.maxPrice) {
            query += ` AND p.price <= $${count}`;
            values.push(filters.maxPrice);
            count++;
        }

        query += ' ORDER BY p.created_at DESC';
        
        const { rows } = await db.query(query, values);
        return rows;
    }
};

module.exports = Property;