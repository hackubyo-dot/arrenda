const { Pool } = require('pg');
require('dotenv').config();

// Configuração do Pool de Conexão com SSL obrigatório para o Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessário para conexões seguras no Neon/AWS
  }
});

/**
 * Script de Inicialização do Banco de Dados
 * Cria todas as tabelas necessárias se elas não existirem.
 */
const initDb = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ CONEXÃO ESTABELECIDA COM O NEON POSTGRESQL');

    // 1. Tabela de Usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        google_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Tabela de Imóveis (Persistência completa de dados e imagens)
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
        main_image TEXT NOT NULL,
        image_1 TEXT,
        image_2 TEXT,
        image_3 TEXT,
        image_4 TEXT,
        is_360 BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Tabela de Pagamentos (Controle de Quotas de 5.000 Kz)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(15, 2) DEFAULT 5000.00,
        status VARCHAR(50) DEFAULT 'pending',
        reference VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Tabela de Mensagens do Chat (Suporte a texto e ficheiros/imagens)
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
        message_text TEXT,
        file_url TEXT,
        file_type VARCHAR(50), -- 'text', 'image', 'file'
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ PERSISTÊNCIA DE DADOS GARANTIDA: TODAS AS TABELAS ESTÃO PRONTAS');
    client.release();
  } catch (err) {
    console.error('❌ ERRO CRÍTICO NA CONEXÃO COM O BANCO DE DADOS:', err.message);
    process.exit(1);
  }
};

// Executa a inicialização
initDb();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};