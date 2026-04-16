const Property = require('../models/Property');
const User = require('../models/User');
const Payment = require('../models/Payment');
const fs = require('fs');
const path = require('path');

const propertyController = {
    /**
     * @desc    Listar todos os imóveis ativos (Público)
     * @route   GET /api/properties
     */
    getProperties: async (req, res) => {
        try {
            const { location, type, minPrice, maxPrice } = req.query;
            
            let properties;
            // Se houver filtros, usa a busca, caso contrário traz todos ativos
            if (location || type || minPrice || maxPrice) {
                properties = await Property.search({ location, type, minPrice, maxPrice });
            } else {
                properties = await Property.findAllActive();
            }

            res.json({
                success: true,
                count: properties.length,
                data: properties
            });
        } catch (error) {
            console.error('Erro ao buscar imóveis:', error);
            res.status(500).json({ success: false, message: 'Erro ao carregar lista de imóveis.' });
        }
    },

    /**
     * @desc    Obter detalhes completos de um imóvel (Público)
     * @route   GET /api/properties/:id
     */
    getPropertyById: async (req, res) => {
        try {
            const property = await Property.findById(req.params.id);
            if (!property) {
                return res.status(404).json({ success: false, message: 'Imóvel não encontrado.' });
            }
            res.json({ success: true, data: property });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao buscar detalhes.' });
        }
    },

    /**
     * @desc    Publicar novo imóvel (Privado - Com Regra de Quota)
     * @route   POST /api/properties
     */
    createProperty: async (req, res) => {
        try {
            const userId = req.user.id;

            // --- REGRA DE NEGÓCIO: VALIDAÇÃO DE QUOTA (1 Grátis / +1 Pago) ---
            const currentCount = await User.countProperties(userId);
            const allowedCount = await Payment.getAllowedPostCount(userId);

            if (currentCount >= allowedCount) {
                return res.status(403).json({
                    success: false,
                    message: 'Limite atingido. Pague 5.000 Kz para publicar mais um imóvel.',
                    requirePayment: true
                });
            }

            // Validar imagens do Multer
            const files = req.files;
            if (!files || !files['main_image']) {
                return res.status(400).json({ success: false, message: 'A imagem principal é obrigatória.' });
            }

            const propertyData = {
                user_id: userId,
                title: req.body.title,
                description: req.body.description,
                price: parseFloat(req.body.price),
                location: req.body.location,
                type: req.body.type,
                phone_primary: req.body.phone_primary,
                phone_secondary: req.body.phone_secondary || null,
                is_360: req.body.is_360 === 'true',
                main_image: `/uploads/${files['main_image'][0].filename}`,
                image_1: files['image_1'] ? `/uploads/${files['image_1'][0].filename}` : null,
                image_2: files['image_2'] ? `/uploads/${files['image_2'][0].filename}` : null,
                image_3: files['image_3'] ? `/uploads/${files['image_3'][0].filename}` : null,
                image_4: files['image_4'] ? `/uploads/${files['image_4'][0].filename}` : null
            };

            const property = await Property.create(propertyData);

            res.status(201).json({
                success: true,
                message: 'Imóvel publicado com sucesso no Neon!',
                data: property
            });
        } catch (error) {
            console.error('Erro ao criar imóvel:', error);
            res.status(500).json({ success: false, message: 'Erro ao processar publicação.' });
        }
    },

    /**
     * @desc    Editar imóvel existente (Privado - Apenas Proprietário)
     * @route   PUT /api/properties/:id
     */
    updateProperty: async (req, res) => {
        try {
            const propId = req.params.id;
            const userId = req.user.id;

            // Verificar se o imóvel pertence ao usuário antes de editar
            const existingProp = await Property.findById(propId);
            if (!existingProp || existingProp.user_id !== userId) {
                return res.status(403).json({ success: false, message: 'Acesso negado ou imóvel inexistente.' });
            }

            const updateData = {
                title: req.body.title || existingProp.title,
                description: req.body.description || existingProp.description,
                price: req.body.price ? parseFloat(req.body.price) : existingProp.price,
                location: req.body.location || existingProp.location,
                type: req.body.type || existingProp.type,
                phone_primary: req.body.phone_primary || existingProp.phone_primary,
                phone_secondary: req.body.phone_secondary || existingProp.phone_secondary,
                status: req.body.status || existingProp.status
            };

            const updated = await Property.update(propId, userId, updateData);

            res.json({
                success: true,
                message: 'Dados do imóvel atualizados com sucesso.',
                data: updated
            });
        } catch (error) {
            console.error('Erro ao editar:', error);
            res.status(500).json({ success: false, message: 'Erro ao atualizar dados.' });
        }
    },

    /**
     * @desc    Remover imóvel e suas imagens (Privado - Apenas Proprietário)
     * @route   DELETE /api/properties/:id
     */
    deleteProperty: async (req, res) => {
        try {
            const propId = req.params.id;
            const userId = req.user.id;

            // Buscar dados para remover ficheiros físicos do servidor Render
            const prop = await Property.findById(propId);
            if (!prop || prop.user_id !== userId) {
                return res.status(403).json({ success: false, message: 'Ação não permitida.' });
            }

            // Apagar imagens da pasta uploads para não encher o servidor
            const images = [prop.main_image, prop.image_1, prop.image_2, prop.image_3, prop.image_4];
            images.forEach(imgUrl => {
                if (imgUrl) {
                    const filePath = path.join(__dirname, '../../client', imgUrl);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
            });

            // Apagar do Banco de Dados Neon
            const success = await Property.delete(propId, userId);

            if (success) {
                res.json({ success: true, message: 'Imóvel removido permanentemente.' });
            } else {
                res.status(400).json({ success: false, message: 'Erro ao processar exclusão.' });
            }
        } catch (error) {
            console.error('Erro ao deletar:', error);
            res.status(500).json({ success: false, message: 'Erro interno ao remover imóvel.' });
        }
    },

    /**
     * @desc    Obter todos os imóveis do usuário logado (Painel)
     * @route   GET /api/properties/user/me
     */
    getUserProperties: async (req, res) => {
        try {
            const properties = await Property.findByUserId(req.user.id);
            res.json({ success: true, count: properties.length, data: properties });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao buscar seu portfólio.' });
        }
    }
};

module.exports = propertyController;