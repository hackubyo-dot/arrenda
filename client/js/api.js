/**
 * API SERVICE
 * Gerenciador de requisições para o Backend
 */
const API_URL = 'http://localhost:5000/api';

const apiService = {
    // Helper para buscar o token do localStorage
    getToken: () => localStorage.getItem('token'),

    // Configuração de headers padrão
    getHeaders: (isMultipart = false) => {
        const headers = {};
        const token = apiService.getToken();

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (!isMultipart) {
            headers['Content-Type'] = 'application/json';
        }

        return headers;
    },

    // --- MÓDULO DE AUTENTICAÇÃO ---
    auth: {
        register: async (userData) => {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: apiService.getHeaders(),
                body: JSON.stringify(userData)
            });
            return response.json();
        },

        login: async (credentials) => {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: apiService.getHeaders(),
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

    // --- MÓDULO de IMÓVEIS ---
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
            // Note: FormData não precisa de Content-Type header manual (o browser define)
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
    }
};

// Tornar global para os outros scripts utilizarem
window.apiService = apiService;