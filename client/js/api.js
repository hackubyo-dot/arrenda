/**
 * API SERVICE - CONFIGURAÇÃO DINÂMICA
 * Resolve o erro de conexão recusada detetando o ambiente (Local vs Produção)
 */

// Se estiver no browser local, usa localhost. Se estiver na Render, usa o link da Render.
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api'; // Em produção, usa o caminho relativo (funciona sempre)

const apiService = {
    // Helper para buscar o token do localStorage
    getToken: () => localStorage.getItem('token'),

    // Configuração de headers padrão
    getHeaders: () => {
        const headers = {
            'Content-Type': 'application/json'
        };
        const token = apiService.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    // --- MÓDULO DE AUTENTICAÇÃO ---
    auth: {
        register: async (userData) => {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            return response.json();
        },

        login: async (credentials) => {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            return response.json();
        },

        getMe: async () => {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: apiService.getHeaders()
            });
            return response.json();
        }
    },

    // --- MÓDULO DE IMÓVEIS ---
    properties: {
        getAll: async (filters = {}) => {
            const query = new URLSearchParams(filters).toString();
            const response = await fetch(`${API_URL}/properties?${query}`);
            return response.json();
        },

        getById: async (id) => {
            const response = await fetch(`${API_URL}/properties/${id}`);
            return response.json();
        },

        getMyProperties: async () => {
            const response = await fetch(`${API_URL}/properties/user/me`, {
                headers: apiService.getHeaders()
            });
            return response.json();
        },

        create: async (formData) => {
            // FormData NÃO pode ter Content-Type manual, o browser faz sozinho
            const response = await fetch(`${API_URL}/properties`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiService.getToken()}`
                },
                body: formData
            });
            return response.json();
        },

        delete: async (id) => {
            const response = await fetch(`${API_URL}/properties/${id}`, {
                method: 'DELETE',
                headers: apiService.getHeaders()
            });
            return response.json();
        }
    },

    // --- MÓDULO DE PAGAMENTOS ---
    payments: {
        pay: async () => {
            const response = await fetch(`${API_URL}/payments/pay`, {
                method: 'POST',
                headers: apiService.getHeaders()
            });
            return response.json();
        },

        getQuota: async () => {
            const response = await fetch(`${API_URL}/payments/quota`, {
                headers: apiService.getHeaders()
            });
            return response.json();
        }
    },

    // --- MÓDULO DE CHAT ---
    chat: {
        getConversations: () => fetch(`${API_URL}/chat/conversations`, { 
            headers: apiService.getHeaders() 
        }).then(r => r.json()),
        
        getMessages: (id) => fetch(`${API_URL}/chat/messages/${id}`, { 
            headers: apiService.getHeaders() 
        }).then(r => r.json()),
        
        markRead: (id) => fetch(`${API_URL}/chat/read/${id}`, { 
            method: 'PUT', 
            headers: apiService.getHeaders() 
        }),
        
        send: (formData) => fetch(`${API_URL}/chat/send`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiService.getToken()}` },
            body: formData
        }).then(r => r.json())
    }
};

window.apiService = apiService;
