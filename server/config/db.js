const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

/**
 * ============================================
 * 🔗 CONFIGURAÇÃO DATABASE (NEON / POSTGRES)
 * ============================================
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * ============================================
 * 🚀 INIT DATABASE: MOTOR DE PERSISTÊNCIA SUPREMA
 * ============================================
 */
const initDb = async () => {
  let client;

  try {
    client = await pool.connect();

    console.log('----------------------------------------------------');
    console.log('🚀 ARRENDA ANGOLA VIP: MOTOR DE PERSISTÊNCIA ATIVO');
    console.log('🚀 DB: INICIANDO SINCRONIZAÇÃO E MIGRAÇÕES SUPREMAS...');

    /**
     * ============================================
     * 👤 TABELA: USERS (Utilizadores)
     * ============================================
     */
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        google_id VARCHAR(255),
        role VARCHAR(20) DEFAULT 'user',
        phone VARCHAR(20),
        profile_image_data BYTEA,
        profile_image_mime VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Forçar colunas vitais em Users (Anti-Erro 500)
    const userCols = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_data BYTEA",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_mime VARCHAR(50)"
    ];
    for(let sql of userCols) { try { await client.query(sql); } catch(e){} }

    /**
     * ============================================
     * 🏠 TABELA: PROPERTIES (Imóveis)
     * ============================================
     */
    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(15, 2) NOT NULL,
        location VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        phone_primary VARCHAR(20) NOT NULL,
        phone_secondary VARCHAR(20),
        main_image_data BYTEA,
        main_image_mime VARCHAR(50),
        is_360 BOOLEAN DEFAULT FALSE,
        is_vip BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Forçar colunas vitais em Properties
    const propCols = [
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS phone_primary VARCHAR(20) DEFAULT '+244999999999'",
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(20)",
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE",
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_360 BOOLEAN DEFAULT FALSE",
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'"
    ];
    for(let sql of propCols) { try { await client.query(sql); } catch(e){} }

    // Galeria de Imagens Adicionais
    for (let i = 1; i <= 4; i++) {
      await client.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS image_${i}_data BYTEA;`);
      await client.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS image_${i}_mime VARCHAR(50);`);
    }

    /**
     * ============================================
     * ❤️ TABELA: FAVORITES (Favoritos)
     * ============================================
     */
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, property_id)
      );
    `);

    /**
     * ============================================
     * 💰 TABELA: PAYMENTS (Pagamentos)
     * ============================================
     */
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(15, 2) DEFAULT 5000.00,
        status VARCHAR(50) DEFAULT 'completed',
        reference VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /**
     * ============================================
     * 💬 TABELA: MESSAGES (Chat & Ficheiros)
     * ============================================
     */
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
        message_text TEXT,
        file_data BYTEA,
        file_mime VARCHAR(50),
        file_name VARCHAR(255),
        file_type VARCHAR(50) DEFAULT 'text',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /**
     * ============================================
     * ⚡ ÍNDICES DE PERFORMANCE
     * ============================================
     */
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prop_location ON properties(location);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prop_type ON properties(type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_msg_users ON messages(sender_id, receiver_id);`);

    console.log('✅ DATABASE: ESTRUTURA SINCRONIZADA A 100%');

    /**
     * ============================================
     * 👑 SEED: ADMIN MASTER AUTO-CONFIG
     * ============================================
     */
    const adminEmail = 'admin@arrendavip.com';
    const adminHash = await bcrypt.hash('AdminVIP@2024!', 10);

    const { rows: adminRows } = await client.query(`
        INSERT INTO users (name, email, password, role, phone) 
        VALUES ('Admin Master Arrenda', $1, $2, 'admin', '+244999999999')
        ON CONFLICT (email) 
        DO UPDATE SET role = 'admin', name = 'Admin Master Arrenda'
        RETURNING id;
    `, [adminEmail, adminHash]);

    const adminId = adminRows[0].id;
    console.log('👑 ADMIN CONFIGURADO: admin@arrendavip.com');

    /**
     * ============================================
     * 📦 SEED: IMÓVEIS PADRÃO (DEMO)
     * ============================================
     */
    const { rows: propCheck } = await client.query('SELECT id FROM properties LIMIT 1');
    if (propCheck.length === 0) {
        console.log('📦 SEED: CRIANDO IMÓVEIS DE DEMONSTRAÇÃO...');
        await client.query(`
            INSERT INTO properties (user_id, title, description, price, location, type, phone_primary, is_vip, status)
            VALUES 
            ($1, 'Vivenda T4 Luxo Talatona', 'Vivenda cinematográfica com piscina privativa, acabamentos em mármore e segurança 24h nas melhores zonas de Luanda.', 1500000, 'Talatona, Luanda', 'Vivenda', '+244900000000', true, 'active'),
            ($1, 'Apartamento T2 Centralidade do Kilamba', 'Apartamento moderno, totalmente mobiliado, pronto a habitar no quarteirão X.', 250000, 'Kilamba, Luanda', 'Apartamento', '+244911111111', false, 'active'),
            ($1, 'Penthouse VIP Ilha do Cabo', 'Vista deslumbrante para o mar, terraço privativo e acesso exclusivo à praia.', 2500000, 'Ilha do Cabo, Luanda', 'Apartamento', '+244922222222', true, 'active')
        `, [adminId]);
        console.log('✅ SEED: IMÓVEIS CRIADOS COM SUCESSO');
    }

    console.log('----------------------------------------------------');

  } catch (err) {
    console.error('❌ ERRO CRÍTICO NO MOTOR DB:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
  }
};

/**
 * ============================================
 * EXECUTAR INICIALIZAÇÃO
 * ============================================
 */
initDb();

/**
 * ============================================
 * EXPORTS DO MÓDULO
 * ============================================
 */
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};