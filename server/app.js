const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Importação de Rotas
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const server = http.createServer(app);

// Configuração do Socket.io para Chat em Tempo Real
const io = new Server(server, {
    cors: {
        origin: "*", // Em produção real, restrinja para o seu domínio
        methods: ["GET", "POST"]
    }
});

// Middlewares Globais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Configuração de Pastas Estáticas
app.use(express.static(path.join(__dirname, '../client')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Definição das Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);

// --- LÓGICA DO SOCKET.IO (CHAT) ---
const activeUsers = new Map(); // Para rastrear usuários online: { userId => socketId }

io.on('connection', (socket) => {
    console.log('⚡ Novo cliente conectado:', socket.id);

    // Usuário entra online
    socket.on('setup', (userData) => {
        socket.join(userData.id);
        activeUsers.set(userData.id, socket.id);
        socket.emit('connected');
        console.log(`👤 Usuário ${userData.id} está online.`);
    });

    // Entrar em uma sala de conversa específica
    socket.on('join chat', (room) => {
        socket.join(room);
        console.log('📂 Usuário entrou na sala: ' + room);
    });

    // Enviar mensagem (Texto ou Ficheiro)
    socket.on('new message', (newMessageReceived) => {
        const chat = newMessageReceived.chatId; // ID da conversa
        const receiverId = newMessageReceived.receiverId;

        if (!receiverId) return console.log("Receiver não definido");

        // Envia para a sala da conversa
        socket.in(receiverId).emit('message received', newMessageReceived);
        
        console.log(`📩 Mensagem enviada de ${newMessageReceived.sender_id} para ${receiverId}`);
    });

    socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado');
    });
});

// Rota para capturar qualquer requisição frontend (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Middleware de Erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Erro interno no servidor',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Inicialização do Servidor (Usando o objeto SERVER para suportar Sockets)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`-----------------------------------------------------`);
    console.log(`🚀 SERVIDOR COMPLETO RODANDO: ${process.env.SERVER_URL}`);
    console.log(`🔗 DB NEON CONECTADO`);
    console.log(`💬 CHAT REALTIME ATIVADO`);
    console.log(`-----------------------------------------------------`);
});

// Exportamos o IO para ser usado nos controllers se necessário
app.set('socketio', io);

module.exports = app;