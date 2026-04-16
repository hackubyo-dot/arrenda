/**
 * AUTH LOGIC
 * Gere login, logout e proteção de rotas no frontend
 */

document.addEventListener('DOMContentLoaded', () => {
    // Se estivermos na página de login ou registro e já tivermos token, vai para a home
    const token = localStorage.getItem('token');
    const path = window.location.pathname;

    if (token && (path.includes('login.html') || path.includes('register.html'))) {
        window.location.href = '../index.html';
    }
});

// Função para verificar se o usuário está logado em rotas protegidas
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    }
}

// Função de Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../index.html';
}

// Função para obter dados do usuário logado do Storage
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Expõe para o escopo global
window.logout = logout;
window.checkAuth = checkAuth;
window.getCurrentUser = getCurrentUser;