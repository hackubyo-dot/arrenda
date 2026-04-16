/**
 * API SERVICE ELITE - BINARY ENGINE (PRODUÇÃO READY)
 */

const API_URL =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

const apiService = {
  /**
   * TOKEN
   */
  getToken: () => localStorage.getItem('token'),

  /**
   * HEADERS PADRÃO
   */
  getHeaders: () => {
    const token = localStorage.getItem('token');

    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  },

  /**
   * ============================================
   * 🔥 HELPERS PARA IMAGENS BYTEA (BACKEND)
   * ============================================
   */

  /**
   * Resolver imagem de imóvel
   * index:
   * 0 = principal
   * 1-4 = imagens adicionais
   */
  resolveImage: (propertyId, index = 0) => {
    return `${API_URL}/properties/image/${propertyId}/${index}`;
  },

  /**
   * Resolver avatar do usuário
   */
  resolveAvatar: (userId) => {
    return `${API_URL}/auth/avatar/${userId}`;
  },

  /**
   * ============================================
   * 🔐 AUTENTICAÇÃO
   * ============================================
   */
  auth: {
    register: async (userData) => {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      return response.json();
    },

    login: async (credentials) => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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

  /**
   * ============================================
   * 🏠 IMÓVEIS
   * ============================================
   */
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
      const token = apiService.getToken();

      const response = await fetch(`${API_URL}/properties`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
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

  /**
   * ============================================
   * 💰 PAGAMENTOS
   * ============================================
   */
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

  /**
   * ============================================
   * 💬 CHAT
   * ============================================
   */
  chat: {
    getConversations: async () => {
      const response = await fetch(`${API_URL}/chat/conversations`, {
        headers: apiService.getHeaders()
      });

      return response.json();
    },

    getMessages: async (otherUserId) => {
      const response = await fetch(`${API_URL}/chat/messages/${otherUserId}`, {
        headers: apiService.getHeaders()
      });

      return response.json();
    },

    send: async (formData) => {
      const token = apiService.getToken();

      const response = await fetch(`${API_URL}/chat/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      return response.json();
    }
  }
};

/**
 * EXPORT GLOBAL
 */
window.apiService = apiService;