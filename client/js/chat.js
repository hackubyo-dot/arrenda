/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 💎 ARRENDA ANGOLA VIP - REAL-TIME CHAT ENGINE (V5.0)
 * 🚀 Socket.io Intelligence & Binary Persistence
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Este módulo orquestra:
 * - Conexão Persistente via WebSockets (Socket.io)
 * - Persistência de Mensagens e Anexos (Bytea Neon DB)
 * - UI Reativa com Skeletons e Auto-Scroll
 * - Gestão de Inbox com Contagem de Não Lidas
 * - Preview de Imagens e Documentos em tempo real
 */

"use strict";

const ArrendaChat = (() => {
    // ESTADO DO MOTOR DE CHAT
    const state = {
        socket: null,
        currentUser: null,
        activeReceiverId: null,
        activeReceiverName: null,
        conversations: [],
        isTyping: false,
        typingTimeout: null
    };

    /**
     * 🏁 INICIALIZADOR MESTRE
     */
    const init = async () => {
        console.log("💎 ARRENDA CHAT: Iniciando Protocolo Real-time...");

        // 1. Verificação de Identidade
        state.currentUser = apiService.auth.getCurrentUser();
        if (!state.currentUser) {
            apiService.notify("Acesso negado. Autentique-se.", "error");
            setTimeout(() => window.location.href = '/pages/login.html', 1500);
            return;
        }

        // 2. Conectar ao Socket.io
        _initSocket();

        // 3. Boot da Interface
        await _loadInbox();
        await _loadSuggestions();
        _setupEventListeners();

        // 4. Lógica de Redirecionamento (Caso venha da página de detalhes)
        const params = new URLSearchParams(window.location.search);
        const targetId = params.get('target');
        const targetName = params.get('name');
        
        if (targetId && targetName) {
            _openChatWindow(targetId, targetName);
        }
    };

    /**
     * ⚡ CONEXÃO SOCKET.IO
     */
    const _initSocket = () => {
        try {
            state.socket = io(); // Conecta ao servidor (app.js do backend)

            state.socket.emit('setup', state.currentUser);

            state.socket.on('connected', () => {
                console.log("🟢 SOCKET: Conexão Segura Estabelecida.");
                apiService.notify("Chat Online", "success");
            });

            // Recebimento de Mensagem em Tempo Real
            state.socket.on('message received', (newMessage) => {
                if (state.activeReceiverId == newMessage.sender_id) {
                    _appendMessageToUI(newMessage, 'received');
                    _scrollToBottom();
                    apiService.chat.markAsRead(newMessage.sender_id);
                } else {
                    // Notificar na Inbox (atualizar unread count)
                    _loadInbox();
                    apiService.notify(`Nova mensagem de ${newMessage.sender_name || 'um proprietário'}`, "info");
                }
            });

            state.socket.on('typing', () => _setPartnerTyping(true));
            state.socket.on('stop typing', () => _setPartnerTyping(false));

        } catch (error) {
            console.error("🔴 SOCKET_INIT_ERROR:", error);
        }
    };

    /**
     * 📩 MOTOR DA INBOX (LISTA DE CONVERSAS)
     */
    const _loadInbox = async () => {
        const inboxList = document.getElementById('inboxList');
        if (!inboxList) return;

        try {
            const res = await apiService.chat.getConversations();
            if (res.success) {
                state.conversations = res.data;
                inboxList.innerHTML = '';

                if (state.conversations.length === 0) {
                    inboxList.innerHTML = `
                        <div class="p-5 text-center text-muted animate-fade-in">
                            <i class="bi bi-chat-dots fs-1 d-block mb-3 opacity-25"></i>
                            <p class="small fw-800">Sem conversas ativas</p>
                        </div>
                    `;
                    return;
                }

                state.conversations.forEach(chat => {
                    const item = document.createElement('div');
                    item.className = `conversation-card ${state.activeReceiverId == chat.other_id ? 'active' : ''} animate-fade-in`;
                    item.onclick = () => _openChatWindow(chat.other_id, chat.other_name);

                    const lastMsg = chat.message_text || (chat.file_type === 'image' ? '📷 Imagem' : '📁 Ficheiro');
                    const time = apiService.utils.timeAgo(chat.created_at);

                    item.innerHTML = `
                        <div class="avatar-elite-chat">${chat.other_name.charAt(0)}</div>
                        <div class="flex-grow-1 overflow-hidden">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <h6 class="fw-800 text-white mb-0 text-truncate">${chat.other_name}</h6>
                                <span class="chat-time">${time}</span>
                            </div>
                            <p class="mb-0 text-muted small text-truncate ${chat.unread_count > 0 ? 'fw-800 text-white' : ''}">
                                ${lastMsg}
                            </p>
                        </div>
                        ${chat.unread_count > 0 ? `<div class="unread-dot">${chat.unread_count}</div>` : ''}
                    `;
                    inboxList.appendChild(item);
                });
            }
        } catch (error) {
            console.error("🔴 INBOX_LOAD_ERROR:", error);
        }
    };

    /**
     * 💬 JANELA DE CHAT ATIVA
     */
    const _openChatWindow = async (id, name) => {
        state.activeReceiverId = id;
        state.activeReceiverName = name;

        // UI Updates
        const noChat = document.getElementById('noChatSelected');
        const activeUI = document.getElementById('activeChatUI');
        const messagesArea = document.getElementById('messagesArea');
        const headerName = document.getElementById('activeUserName');
        const headerAvatar = document.getElementById('activeUserAvatar');

        if (noChat) noChat.classList.add('d-none');
        if (activeUI) activeUI.classList.remove('d-none');
        if (headerName) headerName.innerText = name;
        if (headerAvatar) headerAvatar.innerText = name.charAt(0);

        // Mobile Fix: Slide-in
        const chatPane = document.getElementById('chatPane');
        if (chatPane) chatPane.classList.add('active');

        // Carregar Histórico
        messagesArea.innerHTML = _createChatSkeletons();

        try {
            const res = await apiService.chat.getMessages(id);
            if (res.success) {
                messagesArea.innerHTML = '';
                res.data.forEach(msg => {
                    const type = msg.sender_id == state.currentUser.id ? 'sent' : 'received';
                    _appendMessageToUI(msg, type);
                });
                _scrollToBottom();
                
                // Marcar como lido
                apiService.chat.markAsRead(id);
                _loadInbox(); // Atualiza a lista lateral
            }
        } catch (error) {
            console.error("🔴 MESSAGE_HISTORY_ERROR:", error);
        }
    };

    /**
     * 📤 ENVIO DE MENSAGENS (TEXTO + BINÁRIOS)
     */
    const _handleSendMessage = async (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const fileInput = document.getElementById('chatFile');
        const text = input.value.trim();
        const file = fileInput.files[0];

        if (!text && !file) return;

        const formData = new FormData();
        formData.append('receiver_id', state.activeReceiverId);
        formData.append('message_text', text);
        if (file) formData.append('chat_file', file);

        // Limpar inputs imediatamente (Optimistic UI)
        input.value = '';
        fileInput.value = '';
        document.querySelector('.btn-chat-attach').style.color = 'var(--text-muted)';

        try {
            const res = await apiService.chat.send(formData);
            if (res.success) {
                _appendMessageToUI(res.data, 'sent');
                _scrollToBottom();
                
                // Notificar Destinatário via Socket
                state.socket.emit('new message', {
                    ...res.data,
                    receiverId: state.activeReceiverId,
                    sender_name: state.currentUser.name
                });
                
                _loadInbox(); // Atualiza a última mensagem na lista
            }
        } catch (error) {
            apiService.notify("Falha ao enviar mensagem.", "error");
        }
    };

    /**
     * 🎨 COMPONENTES DE UI (BOLHAS DE MENSAGEM)
     */
    const _appendMessageToUI = (msg, type) => {
        const area = document.getElementById('messagesArea');
        if (!area) return;

        const div = document.createElement('div');
        div.className = `msg-bubble msg-${type} animate-msg-in`;

        let content = '';
        
        // Se houver anexo (Bytea Resolver)
        if (msg.file_url) {
            if (msg.file_type === 'image') {
                content += `
                    <div class="chat-media-wrapper">
                        <img src="${msg.file_url}" class="img-fluid rounded-4 mb-2" onclick="window.open('${msg.file_url}')">
                    </div>
                `;
            } else {
                content += `
                    <a href="${msg.file_url}" target="_blank" class="chat-file-attachment">
                        <i class="bi bi-file-earmark-arrow-down-fill"></i>
                        <span>${msg.file_name || 'Documento VIP'}</span>
                    </a>
                `;
            }
        }

        if (msg.message_text) {
            content += `<span class="message-text-content">${msg.message_text}</span>`;
        }

        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        div.innerHTML = `
            ${content}
            <span class="msg-time">${time} ${type === 'sent' ? '<i class="bi bi-check2-all ms-1 text-neon"></i>' : ''}</span>
        `;

        area.appendChild(div);
    };

    /**
     * 🔍 PESQUISA E SUGESTÕES
     */
    const _loadSuggestions = async () => {
        const list = document.getElementById('inboxList');
        // Implementação opcional de pílulas de contatos frequentes/recentes no topo da inbox
    };

    const _setupEventListeners = () => {
        const form = document.getElementById('chatMessageForm');
        if (form) form.addEventListener('submit', _handleSendMessage);

        // Detecção de Digitação (Socket)
        const input = document.getElementById('chatInput');
        if (input) {
            input.addEventListener('keydown', () => {
                state.socket.emit('typing', state.activeReceiverId);
                clearTimeout(state.typingTimeout);
                state.typingTimeout = setTimeout(() => {
                    state.socket.emit('stop typing', state.activeReceiverId);
                }, 2000);
            });
        }

        // Handler de Anexo Visual
        const fileBtn = document.getElementById('chatFile');
        if (fileBtn) {
            fileBtn.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    document.querySelector('.btn-chat-attach').style.color = 'var(--neon)';
                    apiService.notify("Ficheiro pronto para envio.", "info");
                }
            });
        }
    };

    /**
     * 🛠️ UTILITÁRIOS INTERNOS
     */
    const _scrollToBottom = () => {
        const area = document.getElementById('messagesArea');
        if (area) area.scrollTop = area.scrollHeight;
    };

    const _setPartnerTyping = (isTyping) => {
        const status = document.querySelector('.chat-status-indicator');
        if (status) {
            status.innerText = isTyping ? 'Está a escrever...' : 'Online Agora';
            status.classList.toggle('text-neon', !isTyping);
            status.classList.toggle('text-white-50', isTyping);
        }
    };

    const _createChatSkeletons = () => {
        return Array(4).fill(0).map((_, i) => `
            <div class="msg-bubble msg-${i % 2 === 0 ? 'received' : 'sent'} skeleton-shimmer" style="width: ${200 + (Math.random() * 100)}px; height: 50px; opacity: 0.1; margin-bottom: 20px;"></div>
        `).join('');
    };

    // EXPOSIÇÃO PÚBLICA (API DO MÓDULO)
    return {
        init,
        closeMobile: () => document.getElementById('chatPane').classList.remove('active'),
        open: (id, name) => _openChatWindow(id, name)
    };
})();

// BOOT AUTOMÁTICO
document.addEventListener('DOMContentLoaded', ArrendaChat.init);

/**
 * 🚀 FIM DO ARQUIVO: chat.js
 * Desenvolvido para estabilidade total e experiência premium.
 */