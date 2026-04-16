/**
 * CHAT LOGIC MASTER - ARRENDA ANGOLA VIP
 * Real-time, Persistência, Pesquisa e Sugestões
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
    if (!currentUser) { window.location.href = 'login.html'; return; }

    // 2. Inicializar Socket.io
    initSocket();

    // 3. Carregar Componentes da UI
    await loadInbox();
    await loadSuggestions();
    setupSearch();

    // 4. LÓGICA DE ALVO (TARGET) - Abrir chat vindo de um imóvel
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('target');
    const targetName = params.get('name') || "Proprietário VIP";

    if (targetId) {
        // Abre o chat automaticamente se houver um alvo no URL
        await openChat(targetId, targetName);
    }

    // 5. Configurar Envio de Mensagens
    setupChatForm();
});

/**
 * Conecta ao servidor via Socket.io
 */
function initSocket() {
    socket = io(); 

    socket.emit('setup', currentUser);

    socket.on('connected', () => console.log('✅ Chat Realtime Conectado!'));

    socket.on('message received', (newMessage) => {
        if (activeReceiverId && activeReceiverId == newMessage.sender_id) {
            appendMessage(newMessage, 'received');
            scrollToBottom();
            apiService.chat.markRead(activeReceiverId);
        } else {
            loadInbox();
        }
    });
}

/**
 * Carrega Sugestões de Utilizadores (Barra Horizontal)
 */
async function loadSuggestions() {
    const inboxList = document.getElementById('inboxList');
    if (!inboxList) return;

    try {
        const res = await apiService.chat.getSuggestions();
        if (res.success && res.data.length > 0) {
            const html = res.data.map(u => `
                <div class="suggestion-pill" onclick="openChat(${u.id}, '${u.name}')" style="cursor:pointer; flex: 0 0 auto; text-align: center; width: 80px;">
                    <div class="user-avatar mx-auto mb-1" style="width: 45px; height: 45px; font-size: 1rem;">${u.name.charAt(0)}</div>
                    <div class="small text-truncate" style="font-size: 0.7rem; color: var(--text-main);">${u.name.split(' ')[0]}</div>
                </div>
            `).join('');

            const wrapper = `
                <div class="suggestions-wrapper border-bottom border-secondary border-opacity-10 p-3">
                    <h6 class="text-muted small fw-800 mb-3" style="font-size: 0.65rem; letter-spacing: 1px;">SUGESTÕES VIP</h6>
                    <div class="d-flex gap-3 overflow-auto pb-2" style="scrollbar-width: none;">
                        ${html}
                    </div>
                </div>
            `;
            inboxList.insertAdjacentHTML('afterbegin', wrapper);
        }
    } catch (err) { console.error('Erro sugestões:', err); }
}

/**
 * Configura a Pesquisa de Contactos
 */
function setupSearch() {
    const searchInput = document.querySelector('.search-chat-box input');
    if (!searchInput) return;

    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        const list = document.getElementById('inboxList');

        if (query.length < 2) {
            // Se limpar a pesquisa, recarrega a inbox normal
            if (query.length === 0) loadInbox();
            return;
        }

        try {
            const res = await apiService.chat.searchUsers(query);
            if (res.success) {
                // Manter as sugestões no topo se quiser, ou limpar tudo
                list.innerHTML = `<div class="p-3 small text-muted fw-bold">RESULTADOS PARA: "${query.toUpperCase()}"</div>`;
                
                if (res.data.length === 0) {
                    list.innerHTML += '<p class="text-center py-4 small text-secondary">Nenhum utilizador encontrado.</p>';
                }

                res.data.forEach(u => {
                    const item = document.createElement('div');
                    item.className = 'conversa-item animate-fade';
                    item.onclick = () => openChat(u.id, u.name);
                    item.innerHTML = `
                        <div class="user-avatar">${u.name.charAt(0)}</div>
                        <div class="flex-grow-1">
                            <h6 class="fw-bold mb-0">${u.name}</h6>
                            <small class="text-neon" style="font-size: 0.7rem;">Clique para iniciar conversa</small>
                        </div>
                    `;
                    list.appendChild(item);
                });
            }
        } catch (err) { console.error(err); }
    });
}

/**
 * Carrega a lista de conversas ativas
 */
async function loadInbox() {
    const list = document.getElementById('inboxList');
    if (!list) return;

    try {
        const res = await apiService.chat.getConversations();
        if (res.success) {
            list.innerHTML = ''; // Limpa para evitar duplicados
            
            // Re-adiciona as sugestões após limpar
            await loadSuggestions();

            if (res.data.length === 0) {
                list.innerHTML += '<p class="text-center text-secondary py-5 small">Ainda não tens conversas.</p>';
                return;
            }

            res.data.forEach(chat => {
                const item = document.createElement('div');
                item.className = `conversa-item ${activeReceiverId == chat.other_id ? 'active' : ''}`;
                item.onclick = () => openChat(chat.other_id, chat.other_name);
                
                item.innerHTML = `
                    <div class="user-avatar">${chat.other_name.charAt(0)}</div>
                    <div class="flex-grow-1 overflow-hidden">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <h6 class="fw-bold mb-0">${chat.other_name}</h6>
                            <span class="small text-secondary" style="font-size: 0.6rem;">${formatDate(chat.created_at)}</span>
                        </div>
                        <p class="small text-secondary text-truncate mb-0">
                            ${chat.file_type === 'image' ? '📷 Foto' : 
                              chat.file_type === 'file' ? '📁 Ficheiro' : chat.message_text}
                        </p>
                    </div>
                    ${chat.unread_count > 0 ? `<div class="unread-dot">${chat.unread_count}</div>` : ''}
                `;
                list.appendChild(item);
            });
        }
    } catch (err) { console.error('Erro inbox:', err); }
}

/**
 * Abre a interface de chat
 */
async function openChat(id, name) {
    activeReceiverId = id;
    
    const noChat = document.getElementById('noChatSelected');
    const activeChat = document.getElementById('activeChatUI');
    const messagesArea = document.getElementById('messagesArea');

    if (noChat) noChat.classList.add('d-none');
    if (activeChat) activeChat.classList.remove('d-none');
    
    document.getElementById('activeUserName').innerText = name;
    document.getElementById('activeUserAvatar').innerText = name.charAt(0);
    messagesArea.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-neon spinner-border-sm"></div></div>';

    try {
        const res = await apiService.chat.getMessages(id);
        if (res.success) {
            messagesArea.innerHTML = '';
            res.data.forEach(msg => {
                const type = msg.sender_id == currentUser.id ? 'sent' : 'received';
                appendMessage(msg, type);
            });
            scrollToBottom();
            apiService.chat.markRead(id);
            // Pequeno delay para atualizar a inbox e refletir o status de "lido"
            setTimeout(loadInbox, 500);
        }
    } catch (err) { console.error(err); }
}

/**
 * Fecha o Chat (Mobile)
 */
function closeChat() {
    activeReceiverId = null;
    document.getElementById('noChatSelected').classList.remove('d-none');
    document.getElementById('activeChatUI').classList.add('d-none');
}

/**
 * Renderiza mensagens
 */
function appendMessage(m, type) {
    const area = document.getElementById('messagesArea');
    const div = document.createElement('div');
    div.className = `msg-bubble msg-${type} animate-fade`;
    
    let content = '';
    if (m.file_url) {
        if (m.file_type === 'image') {
            content = `<img src="${m.file_url}" class="img-fluid rounded-3 mb-2" onclick="window.open('${m.file_url}')" style="cursor:pointer; max-width: 250px;">`;
        } else {
            content = `<a href="${m.file_url}" target="_blank" class="chat-file-link d-block mb-2 text-decoration-none">
                        <i class="bi bi-file-earmark-arrow-down"></i> ${m.file_name || 'Ficheiro'}
                       </a>`;
        }
    }
    
    if (m.message_text) content += `<span>${m.message_text}</span>`;
    const time = new Date(m.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    div.innerHTML = `${content} <div class="msg-time text-end" style="font-size: 0.55rem; opacity: 0.5; margin-top: 4px;">${time}</div>`;
    area.appendChild(div);
}

/**
 * Formulário de Envio
 */
function setupChatForm() {
    const form = document.getElementById('chatForm');
    const input = document.getElementById('chatInput');
    const fileInput = document.getElementById('chatFileInput');

    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        const file = fileInput.files[0];

        if (!text && !file) return;

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
                socket.emit('new message', { ...res.data, receiverId: activeReceiverId });
            }
        } catch (err) { console.error(err); }
    };
}

function scrollToBottom() {
    const area = document.getElementById('messagesArea');
    if (area) area.scrollTop = area.scrollHeight;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    return date.toLocaleDateString('pt-AO');
}

/**
 * Extensões da API Chat
 */
apiService.chat = {
    getConversations: () => fetch('/api/chat/conversations', { headers: apiService.getHeaders() }).then(r => r.json()),
    getMessages: (id) => fetch(`/api/chat/messages/${id}`, { headers: apiService.getHeaders() }).then(r => r.json()),
    getSuggestions: () => fetch('/api/chat/suggestions', { headers: apiService.getHeaders() }).then(r => r.json()),
    searchUsers: (query) => fetch(`/api/chat/search?query=${query}`, { headers: apiService.getHeaders() }).then(r => r.json()),
    markRead: (id) => fetch(`/api/chat/read/${id}`, { method: 'PUT', headers: apiService.getHeaders() }),
    send: (formData) => fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiService.getToken()}` },
        body: formData
    }).then(r => r.json())
};