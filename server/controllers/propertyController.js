const db = require('../config/db');
const User = require('../models/User');
const Payment = require('../models/Payment');

/**
 * MOTOR DE IMÓVEIS ELITE
 * Gere Criação, Busca, Edição e Visualização 100% Persistente via BYTEA
 */

const propertyController = {
    /**
     * @desc    Listar todos os imóveis (Público)
     * Retorna apenas metadados (sem binários pesados) para performance.
     */
    getProperties: async (req, res) => {
        try {
            const { type, location } = req.query;
            let query = `
                SELECT id, user_id, title, price, location, type, is_360, is_vip, status, created_at 
                FROM properties WHERE status = 'active'
            `;
            const params = [];

            if (type && type !== 'Todos') {
                query += ` AND type = $${params.length + 1}`;
                params.push(type);
            }
            if (location) {
                query += ` AND location ILIKE $${params.length + 1}`;
                params.push(`%${location}%`);
            }

            query += ' ORDER BY is_vip DESC, created_at DESC';

            const { rows } = await db.query(query, params);
            res.json({ success: true, count: rows.length, data: rows });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Erro ao buscar imóveis.' });
        }
    },

    /**
     * @desc    Obter detalhes completos
     */
    getPropertyById: async (req, res) => {
        try {
            const { id } = req.params;
            const query = `
                SELECT p.id, p.user_id, p.title, p.description, p.price, p.location, p.type, 
                       p.phone_primary, p.phone_secondary, p.is_360, p.is_vip, p.created_at,
                       u.name as owner_name
                FROM properties p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = $1
            `;
            const { rows } = await db.query(query, [id]);
            if (rows.length === 0) return res.status(404).json({ message: 'Não encontrado.' });
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro nos detalhes.' });
        }
    },

    /**
     * @desc    Publicar Imóvel (Com Persistência BYTEA)
     */
    createProperty: async (req, res) => {
        try {
            const userId = req.user.id;

            // 1. Validar Quota (1 Grátis / Pagos)
            const count = await User.countProperties(userId);
            const allowed = await Payment.getAllowedPostCount(userId);

            if (count >= allowed) {
                return res.status(403).json({ success: false, requirePayment: true, message: 'Quota excedida.' });
            }

            // 2. Extrair buffers do Multer
            const files = req.files;
            if (!files || !files['main_image']) {
                return res.status(400).json({ message: 'Imagem principal obrigatória.' });
            }

            const mainImg = files['main_image'][0];
            const img1 = files['image_1'] ? files['image_1'][0] : null;
            const img2 = files['image_2'] ? files['image_2'][0] : null;
            const img3 = files['image_3'] ? files['image_3'][0] : null;
            const img4 = files['image_4'] ? files['image_4'][0] : null;

            // 3. Inserção Suprema no Neon
            const query = `
                INSERT INTO properties (
                    user_id, title, description, price, location, type, phone_primary, phone_secondary,
                    main_image_data, main_image_mime,
                    image_1_data, image_1_mime,
                    image_2_data, image_2_mime,
                    image_3_data, image_3_mime,
                    image_4_data, image_4_mime,
                    is_360
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                RETURNING id
            `;

            const values = [
                userId, req.body.title, req.body.description, req.body.price, req.body.location, 
                req.body.type, req.body.phone_primary, req.body.phone_secondary,
                mainImg.buffer, mainImg.mimetype,
                img1 ? img1.buffer : null, img1 ? img1.mimetype : null,
                img2 ? img2.buffer : null, img2 ? img2.mimetype : null,
                img3 ? img3.buffer : null, img3 ? img3.mimetype : null,
                img4 ? img4.buffer : null, img4 ? img4.mimetype : null,
                req.body.is_360 === 'true'
            ];

            const { rows } = await db.query(query, values);
            res.status(201).json({ success: true, id: rows[0].id });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erro ao salvar no banco.' });
        }
    },

    /**
     * @desc    MOTOR DE ENTREGA DE IMAGENS (Crucial para BYTEA)
     * @route   GET /api/properties/image/:id/:index
     */
    serveImage: async (req, res) => {
        try {
            const { id, index } = req.params;
            const field = index === '0' ? 'main_image' : `image_${index}`;
            
            const query = `SELECT ${field}_data as data, ${field}_mime as mime FROM properties WHERE id = $1`;
            const { rows } = await db.query(query, [id]);

            if (rows[0] && rows[0].data) {
                res.set('Content-Type', rows[0].mime);
                res.set('Cache-Control', 'public, max-age=86400'); // Cache de 24h para performance
                return res.send(rows[0].data);
            }
            res.status(404).send('Not found');
        } catch (error) {
            res.status(500).send('Error serving image');
        }
    },

    /**
     * @desc    Meus Imóveis (Dashboard)
     */
    getMyProperties: async (req, res) => {
        try {
            const { rows } = await db.query(
                'SELECT id, title, price, status, created_at FROM properties WHERE user_id = $1 ORDER BY created_at DESC',
                [req.user.id]
            );
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ message: 'Erro no dashboard.' });
        }
    },

    /**
     * @desc    Remover Imóvel
     */
    deleteProperty: async (req, res) => {
        try {
            await db.query('DELETE FROM properties WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
            res.json({ success: true, message: 'Eliminado com sucesso.' });
        } catch (error) {
            res.status(500).json({ message: 'Erro ao eliminar.' });
        }
    }
};

module.exports = propertyController;