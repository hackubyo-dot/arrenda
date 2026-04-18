const db = require('../config/db');

/**
 * ==============================================================================
 * MOTOR DE GESTÃO DE IMÓVEIS VIP - PERSISTÊNCIA BINÁRIA SUPREMA
 * Este controlador gere todo o ciclo de vida dos imóveis com armazenamento BYTEA.
 * Suporta: Criação, Listagem, Detalhes, Edição Total (5 imagens) e Eliminação.
 * ==============================================================================
 */

const propertyController = {

    /**
     * @desc    LISTAR TODOS OS IMÓVEIS (PÚBLICO)
     * Optimização: Não carrega binários aqui para manter a fluidez da lista.
     * @route   GET /api/properties
     */
    getProperties: async (req, res) => {
        try {
            const { type, location, minPrice, maxPrice } = req.query;
            
            let query = `
                SELECT id, user_id, title, price, location, type, is_360, is_vip, status, created_at 
                FROM properties 
                WHERE status = 'active'
            `;
            const params = [];

            if (type && type !== 'Todos') {
                query += ` AND type = $${params.length + 1}`;
                params.push(type);
            }

            if (location) {
                query += ` AND (location ILIKE $${params.length + 1} OR title ILIKE $${params.length + 1})`;
                params.push(`%${location}%`);
            }

            if (minPrice) {
                query += ` AND price >= $${params.length + 1}`;
                params.push(minPrice);
            }

            if (maxPrice) {
                query += ` AND price <= $${params.length + 1}`;
                params.push(maxPrice);
            }

            // Ordenação: VIPs primeiro, depois os mais recentes
            query += ' ORDER BY is_vip DESC, created_at DESC';

            const { rows } = await db.query(query, params);

            return res.status(200).json({
                success: true,
                count: rows.length,
                data: rows
            });
        } catch (error) {
            console.error('❌ ERRO AO BUSCAR IMÓVEIS:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno ao processar a lista de imóveis.' 
            });
        }
    },

    /**
     * @desc    OBTER DETALHES COMPLETOS DE UM IMÓVEL
     * @route   GET /api/properties/:id
     */
    getPropertyById: async (req, res) => {
        try {
            const { id } = req.params;

            const query = `
                SELECT p.id, p.user_id, p.title, p.description, p.price, p.location, p.type, 
                       p.phone_primary, p.phone_secondary, p.is_360, p.is_vip, p.status, p.created_at,
                       u.name as owner_name, u.email as owner_email
                FROM properties p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = $1
            `;

            const { rows } = await db.query(query, [id]);

            if (rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Imóvel não encontrado ou removido.' 
                });
            }

            return res.status(200).json({
                success: true,
                data: rows[0]
            });
        } catch (error) {
            console.error('❌ ERRO NOS DETALHES:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao carregar detalhes do imóvel.' 
            });
        }
    },

    /**
     * @desc    CRIAR NOVO IMÓVEL (COM PERSISTÊNCIA BYTEA)
     * @route   POST /api/properties
     */
    createProperty: async (req, res) => {
        try {
            const userId = req.user.id;

            // 1. VALIDAÇÃO DE QUOTA (1 Grátis / Resto Pago 5.000 Kz)
            const countQuery = await db.query('SELECT COUNT(*) FROM properties WHERE user_id = $1', [userId]);
            const currentCount = parseInt(countQuery.rows[0].count);
            
            const allowedQuery = await db.query("SELECT COUNT(*) FROM payments WHERE user_id = $1 AND status = 'completed'", [userId]);
            const allowedCount = 1 + parseInt(allowedQuery.rows[0].count);

            if (currentCount >= allowedCount && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    requirePayment: true,
                    message: 'Limite de publicações atingido. É necessário o pagamento de 5.000 Kz.'
                });
            }

            // 2. PROCESSAMENTO DE IMAGENS (MULTER MEMORY BUFFER)
            const files = req.files;
            if (!files || !files['main_image']) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'A imagem de capa é obrigatória para publicar.' 
                });
            }

            const mainImg = files['main_image'][0];
            const img1 = files['image_1'] ? files['image_1'][0] : null;
            const img2 = files['image_2'] ? files['image_2'][0] : null;
            const img3 = files['image_3'] ? files['image_3'][0] : null;
            const img4 = files['image_4'] ? files['image_4'][0] : null;

            // 3. INSERÇÃO NO NEON DB
            const query = `
                INSERT INTO properties (
                    user_id, title, description, price, location, type, phone_primary, phone_secondary,
                    main_image_data, main_image_mime,
                    image_1_data, image_1_mime,
                    image_2_data, image_2_mime,
                    image_3_data, image_3_mime,
                    image_4_data, image_4_mime,
                    is_360, is_vip
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                RETURNING id
            `;

            const values = [
                userId, 
                req.body.title, 
                req.body.description, 
                req.body.price, 
                req.body.location, 
                req.body.type, 
                req.body.phone_primary || '+244900000000', 
                req.body.phone_secondary || null,
                mainImg.buffer, 
                mainImg.mimetype,
                img1 ? img1.buffer : null, img1 ? img1.mimetype : null,
                img2 ? img2.buffer : null, img2 ? img2.mimetype : null,
                img3 ? img3.buffer : null, img3 ? img3.mimetype : null,
                img4 ? img4.buffer : null, img4 ? img4.mimetype : null,
                req.body.is_360 === 'true',
                req.body.is_vip === 'true'
            ];

            const { rows } = await db.query(query, values);

            return res.status(201).json({
                success: true,
                message: 'Imóvel publicado com sucesso!',
                id: rows[0].id
            });

        } catch (error) {
            console.error('❌ ERRO AO CRIAR:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro crítico ao salvar no banco de dados.' 
            });
        }
    },

    /**
     * @desc    MOTOR DE ATUALIZAÇÃO SUPREMA (EDITAR TUDO + 5 IMAGENS)
     * @route   PUT /api/properties/:id
     */
    updateProperty: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // 1. Verificar se o imóvel existe
            const check = await db.query('SELECT user_id FROM properties WHERE id = $1', [id]);
            if (check.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Imóvel não encontrado.' });
            }
            
            // Segurança: Apenas dono ou admin
            if (check.rows[0].user_id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Sem permissão para editar este imóvel.' });
            }

            const { title, description, price, location, type, phone_primary, phone_secondary, status } = req.body;
            
            // 2. Query Base de texto
            let query = 'UPDATE properties SET title=$1, description=$2, price=$3, location=$4, type=$5, phone_primary=$6, phone_secondary=$7, status=$8';
            let params = [title, description, price, location, type, phone_primary, phone_secondary || null, status || 'active'];
            let paramIndex = 9;

            // 3. Processar Múltiplas Imagens Dinâmicas ( BYTEA )
            const files = req.files;
            if (files) {
                // Capa Principal
                if (files['main_image']) {
                    query += `, main_image_data=$${paramIndex}, main_image_mime=$${paramIndex+1}`;
                    params.push(files['main_image'][0].buffer, files['main_image'][0].mimetype);
                    paramIndex += 2;
                }
                // Fotos de Galeria 1 a 4
                for (let i = 1; i <= 4; i++) {
                    const field = `image_${i}`;
                    if (files[field]) {
                        query += `, ${field}_data=$${paramIndex}, ${field}_mime=$${paramIndex+1}`;
                        params.push(files[field][0].buffer, files[field][0].mimetype);
                        paramIndex += 2;
                    }
                }
            }

            query += ` WHERE id=$${paramIndex} RETURNING id`;
            params.push(id);

            await db.query(query, params);

            return res.json({ 
                success: true, 
                message: 'Propriedade VIP Atualizada com Sucesso!' 
            });

        } catch (error) {
            console.error('❌ ERRO NA ATUALIZAÇÃO:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno ao processar atualização.' 
            });
        }
    },

    /**
     * @desc    MOTOR DE ENTREGA DE IMAGENS BINÁRIAS (BYTEA) COM FALLBACK TRANSPARENTE
     * @route   GET /api/properties/image/:id/:index
     */
    serveImage: async (req, res) => {
        try {
            const { id, index } = req.params;
            const field = index === '0' ? 'main_image_data' : `image_${index}_data`;
            const mimeField = index === '0' ? 'main_image_mime' : `image_${index}_mime`;
            
            const query = `SELECT ${field} as data, ${mimeField} as mime FROM properties WHERE id = $1`;
            const { rows } = await db.query(query, [id]);

            if (rows[0] && rows[0].data) {
                res.set('Content-Type', rows[0].mime);
                res.set('Cache-Control', 'public, max-age=86400'); // Cache de 1 dia
                return res.send(rows[0].data);
            }
            
            // Fallback: Se não houver imagem, retorna um pequeno buffer transparente para não dar erro visual
            const emptyPixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
            res.set('Content-Type', 'image/gif');
            return res.send(emptyPixel);
        } catch (error) {
            console.error('❌ ERRO AO SERVIR IMAGEM:', error);
            return res.status(500).send('Error');
        }
    },

    /**
     * @desc    OBTER MEUS IMÓVEIS (DASHBOARD)
     * @route   GET /api/properties/user/me
     */
    getMyProperties: async (req, res) => {
        try {
            const userId = req.user.id;
            const { rows } = await db.query(
                `SELECT id, title, price, location, type, status, created_at, is_vip 
                 FROM properties 
                 WHERE user_id = $1 
                 ORDER BY created_at DESC`,
                [userId]
            );
            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Erro ao carregar o seu painel.' });
        }
    },

    /**
     * @desc    ELIMINAR IMÓVEL
     * @route   DELETE /api/properties/:id
     */
    deleteProperty: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // Segurança: Apenas o dono ou um admin pode apagar
            const { rows } = await db.query(
                `DELETE FROM properties 
                 WHERE id = $1 AND (user_id = $2 OR (SELECT role FROM users WHERE id = $2) = 'admin') 
                 RETURNING id`,
                [id, userId]
            );

            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Imóvel não encontrado ou sem permissão.' });
            }

            return res.status(200).json({ success: true, message: 'Propriedade removida permanentemente.' });
        } catch (error) {
            console.error('❌ ERRO AO ELIMINAR:', error);
            return res.status(500).json({ success: false, message: 'Erro ao eliminar registro.' });
        }
    }
};

module.exports = propertyController;