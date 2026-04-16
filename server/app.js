const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

/**
 * ===============================
 * IMPORTAÇÃO DE ROTAS
 * ===============================
 */
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

/**
 * ===============================
 * SOCKET.IO (CHAT REALTIME)
 * ===============================
 */
const io = new Server(server, {
  cors: {
    origin: '*', // ⚠️ Em produção, limita ao teu domínio
    methods: ['GET', 'POST']
  }
});

/**
 * ===============================
 * MIDDLEWARES GLOBAIS
 * ===============================
 */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

/**
 * ===============================
 * SERVIR ARQUIVOS ESTÁTICOS
 * ===============================
 */
app.use(express.static(path.join(__dirname, '../client')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/**
 * ===============================
 * ROTAS DA API
 * ===============================
 */
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

/**
 * ===============================
 * SOCKET.IO - LÓGICA DO CHAT
 * ===============================
 */
const activeUsers = new Map(); // { userId => socketId }

io.on('connection', (socket) => {
  console.log('⚡ Novo cliente conectado:', socket.id);

  /**
   * Setup do usuário (login realtime)
   */
  socket.on('setup', (userData) => {
    if (!userData || !userData.id) return;

    socket.join(userData.id);
    activeUsers.set(userData.id, socket.id);

    socket.emit('connected');
    console.log(`👤 Usuário ${userData.id} está online.`);
  });

  /**
   * Entrar em sala de chat
   */
  socket.on('join chat', (room) => {
    socket.join(room);
    console.log('📂 Usuário entrou na sala:', room);
  });

  /**
   * Nova mensagem
   */
  socket.on('new message', (newMessage) => {
    if (!newMessage || !newMessage.receiverId) {
      return console.log('⚠️ Receiver não definido');
    }

    const receiverId = newMessage.receiverId;

    // Enviar mensagem ao destinatário
    socket.to(receiverId).emit('message received', newMessage);

    console.log(`📩 ${newMessage.sender_id} → ${receiverId}`);
  });

  /**
   * Desconexão
   */
  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);

    // Remove usuário da lista ativa
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        console.log(`👤 Usuário ${userId} saiu`);
        break;
      }
    }
  });
});

/**
 * ===============================
 * SPA FALLBACK (IMPORTANTE)
 * ===============================
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

/**
 * ===============================
 * MIDDLEWARE DE ERROS
 * ===============================
 */
app.use((err, req, res, next) => {
  console.error('❌ ERRO:', err.stack);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Erro interno no servidor',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

/**
 * ===============================
 * INICIALIZAÇÃO DO SERVIDOR
 * ===============================
 */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('-----------------------------------------------------');
  console.log(`🚀 SERVIDOR RODANDO NA PORTA: ${PORT}`);
  console.log(`🌐 URL: ${process.env.SERVER_URL || 'http://localhost:' + PORT}`);
  console.log('🔗 DATABASE: NEON CONNECTED');
  console.log('💬 CHAT REALTIME ATIVO');
  console.log('-----------------------------------------------------');
});

/**
 * ===============================
 * EXPORTS
 * ===============================
 */
app.set('socketio', io);

module.exports = app;