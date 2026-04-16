/**
 * CHAT LOGIC - REALTIME & PERSISTENCE
 * Integração com Socket.io e Neon DB
 */

let socket;
let activeReceiverId = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar Autenticação
    const token = apiService.getToken();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = JSON.parse(localStorage.getItem('user'));

    // 2. Inicializar Socket.io
    initSocket();

    // 3. Carregar Inbox (Lista de Conversas)
    loadInbox();

    // 4. Configurar Envio de Mensagens
    setupChatForm();
});

/**
 * Conecta ao servidor via Socket.io e configura ouvintes
 */
function initSocket() {
    socket = io(); // Conecta ao servidor Render

    // Identifica o usuário no servidor
    socket.emit('setup', currentUser);

    socket.on('connected', () => console.log('✅ Chat Realtime Conectado!'));

    // Ouvir mensagens recebidas em tempo real
    socket.on('message received', (newMessage) => {
        // Se a conversa aberta for a do remetente da mensagem
        if (activeReceiverId && activeReceiverId == newMessage.sender_id) {
            appendMessage(newMessage, 'received');
            scrollToBottom();
            // Marcar como lida no servidor
            apiService.chat.markRead(activeReceiverId);
        } else {
            // Se estiver em outra tela, atualiza a lista da Inbox
            loadInbox();
            // Notificação sonora opcional aqui
        }
    });
}

/**
 * Carrega a lista de conversas do Neon DB
 */
async function loadInbox() {
    const list = document.getElementById('inboxList');
    try {
        const res = await apiService.chat.getConversations();
        if (res.success) {
            list.innerHTML = '';
            if (res.data.length === 0) {
                list.innerHTML = '<p class="text-center text-secondary py-5">Ainda não tens conversas.</p>';
                return;
            }

            res.data.forEach(chat => {
                const item = document.createElement('div');
                item.className = 'conversa-item';
                item.onclick = () => openChat(chat.other_id, chat.other_name);
                
                item.innerHTML = `
                    <div class="user-avatar">${chat.other_name.charAt(0)}</div>
                    <div class="flex-grow-1 overflow-hidden">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <h6 class="fw-bold mb-0">${chat.other_name}</h6>
                            <span class="small text-secondary" style="font-size: 0.65rem;">${formatDate(chat.created_at)}</span>
                        </div>
                        <p class="small text-secondary text-truncate mb-0">
                            ${chat.file_type === 'image' ? '📷 Foto' : 
                              chat.file_type === 'file' ? '📁 Ficheiro' : chat.message_text}
                        </p>
                    </div>
                    ${chat.unread_count > 0 ? '<div class="unread-dot"></div>' : ''}
                `;
                list.appendChild(item);
            });
        }
    } catch (err) { console.error(err); }
}

/**
 * Abre a janela de chat com um utilizador específico
 */
async function openChat(otherId, otherName) {
    activeReceiverId = otherId;
    document.getElementById('activeChatName').innerText = otherName;
    document.getElementById('activeChatAvatar').innerText = otherName.charAt(0);
    document.getElementById('chatWindow').style.display = 'flex';

    const messagesArea = document.getElementById('messagesArea');
    messagesArea.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-neon"></div></div>';

    try {
        const res = await apiService.chat.getMessages(otherId);
        if (res.success) {
            messagesArea.innerHTML = '';
            res.data.forEach(msg => {
                const type = msg.sender_id == currentUser.id ? 'sent' : 'received';
                appendMessage(msg, type);
            });
            scrollToBottom();
        }
    } catch (err) { console.error(err); }
}

/**
 * Fecha a janela de chat
 */
function closeChat() {
    document.getElementById('chatWindow').style.display = 'none';
    activeReceiverId = null;
    loadInbox(); // Atualiza a lista para remover pontos de não lido
}

/**
 * Adiciona uma bolha de mensagem à área de chat
 */
function appendMessage(msg, type) {
    const area = document.getElementById('messagesArea');
    const div = document.createElement('div');
    div.className = `msg msg-${type}`;
    
    let content = '';
    if (msg.file_url) {
        if (msg.file_type === 'image') {
            content = `<img src="${msg.file_url}" onclick="window.open('${msg.file_url}')" style="cursor:pointer">`;
        } else {
            content = `<a href="${msg.file_url}" target="_blank" class="text-white small d-block mb-1">
                        <i class="bi bi-file-earmark-arrow-down"></i> Baixar Ficheiro
                       </a>`;
        }
    }
    
    if (msg.message_text) {
        content += `<span class="d-block">${msg.message_text}</span>`;
    }

    div.innerHTML = `
        ${content}
        <span class="msg-time">${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
    `;
    area.appendChild(div);
}

/**
 * Gere o envio de mensagens (Texto + Ficheiros)
 */
async function setupChatForm() {
    const form = document.getElementById('chatForm');
    const input = document.getElementById('chatInput');
    const fileInput = document.getElementById('chatFileInput');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        const file = fileInput.files[0];

        if (!text && !file) return;

        // Feedback Visual imediato (Opcional: bolha cinza de "enviando")
        
        const formData = new FormData();
        formData.append('receiver_id', activeReceiverId);
        formData.append('message_text', text);
        if (file) formData.append('chat_file', file);

        input.value = '';
        fileInput.value = '';

        try {
            const res = await apiService.chat.send(formData);
            if (res.success) {
                appendMessage(res.data, 'sent');
                scrollToBottom();
                
                // Enviar via Socket para tempo real
                socket.emit('new message', {
                    ...res.data,
                    receiverId: activeReceiverId
                });
            }
        } catch (err) { console.error(err); }
    });
}

function scrollToBottom() {
    const area = document.getElementById('messagesArea');
    area.scrollTop = area.scrollHeight;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    return date.toLocaleDateString('pt-AO');
}

// Estender apiService em api.js com estas funções de chat:
apiService.chat = {
    getConversations: () => fetch('/api/chat/conversations', { headers: apiService.getHeaders() }).then(r => r.json()),
    getMessages: (id) => fetch(`/api/chat/messages/${id}`, { headers: apiService.getHeaders() }).then(r => r.json()),
    markRead: (id) => fetch(`/api/chat/read/${id}`, { method: 'PUT', headers: apiService.getHeaders() }),
    send: (formData) => fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiService.getToken()}` },
        body: formData
    }).then(r => r.json())
};