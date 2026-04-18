/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 💎 ARRENDA ANGOLA VIP - PROPERTY COMMAND CENTER (V5.0)
 * 🚀 High-Performance Asset Management & Analytics
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Este módulo gerencia:
 * - Orquestração de Dados do Proprietário (Real-time Sync)
 * - Gestão de Ativos (CRUD de Imóveis com Persistência Neon)
 * - Monitorização de Quotas e Pagamentos VIP
 * - Sistema de Moderação e Status (Ativo/Pendente)
 * - UI de Gerenciamento com Feedback Háptico-Visual
 */

"use strict";

const ArrendaDashboard = (() => {
    // ESTADO PRIVADO DO PAINEL
    const state = {
        user: null,
        myProperties: [],
        quota: {
            allowed: 0,
            used: 0,
            remaining: 0
        },
        stats: {
            active: 0,
            pending: 0,
            totalValue: 0
        }
    };

    /**
     * 🏁 INICIALIZADOR MESTRE (BOOTSTRAP)
     */
    const init = async () => {
        console.log("💎 ARRENDA DASHBOARD: Iniciando Motor de Gestão...");

        // 1. Verificação de Segurança
        state.user = apiService.auth.getCurrentUser();
        if (!state.user) {
            window.location.href = '/pages/login.html';
            return;
        }

        // 2. Carregamento de Dados (Paralelismo para Performance)
        try {
            _showMainLoading(true);
            
            await Promise.all([
                _refreshUserData(),
                _refreshPropertiesData(),
                _refreshQuotaData()
            ]);

            // 3. Renderização de UI
            _renderStats();
            _renderPropertiesTable();
            _setupThemeSync();

        } catch (error) {
            console.error("🔴 DASHBOARD_BOOT_ERROR:", error);
            apiService.notify("Erro ao sincronizar dados do painel.", "error");
        } finally {
            _showMainLoading(false);
        }
    };

    /**
     * 👤 SINCRONIZAÇÃO DE PERFIL
     */
    const _refreshUserData = async () => {
        const res = await apiService.auth.getMe();
        if (res.success) {
            state.user = res.user;
            const nameEl = document.getElementById('displayUserName');
            if (nameEl) nameEl.innerText = state.user.name.split(' ')[0];
            
            const emailEl = document.getElementById('displayUserEmail');
            if (emailEl) emailEl.innerText = state.user.email;
        }
    };

    /**
     * 🏠 GESTÃO DE ATIVOS (PROPERTIES)
     */
    const _refreshPropertiesData = async () => {
        const res = await apiService.properties.getMyProperties();
        if (res.success) {
            state.myProperties = res.data;
            
            // Calcular Estatísticas Locais
            state.stats.active = state.myProperties.filter(p => p.status === 'active').length;
            state.stats.pending = state.myProperties.filter(p => p.status === 'pending').length;
            state.stats.totalValue = state.myProperties.reduce((acc, p) => acc + parseFloat(p.price), 0);
        }
    };

    /**
     * 📊 GESTÃO DE QUOTAS (MONETIZAÇÃO)
     */
    const _refreshQuotaData = async () => {
        const res = await apiService.payments.getQuota();
        if (res.success) {
            state.quota.allowed = res.allowed_posts;
            state.quota.used = state.myProperties.length;
            state.quota.remaining = Math.max(0, state.quota.allowed - state.quota.used);

            const quotaEl = document.getElementById('stat-quota');
            if (quotaEl) quotaEl.innerText = state.quota.remaining;
        }
    };

    /**
     * 📐 RENDERIZAÇÃO: CARDS DE ESTATÍSTICA
     */
    const _renderStats = () => {
        const activeEl = document.getElementById('stat-active');
        if (activeEl) activeEl.innerText = state.stats.active;

        const valueEl = document.getElementById('stat-value');
        if (valueEl) {
            valueEl.innerText = apiService.utils.formatCurrency(state.stats.totalValue);
        }
    };

    /**
     * 📋 RENDERIZAÇÃO: TABELA DE GESTÃO VIP
     */
    const _renderPropertiesTable = () => {
        const container = document.getElementById('myPropsBody');
        const emptyState = document.getElementById('emptyState');
        if (!container) return;

        if (state.myProperties.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.classList.remove('d-none');
            return;
        }

        if (emptyState) emptyState.classList.add('d-none');

        container.innerHTML = state.myProperties.map(prop => `
            <tr class="vip-row animate-fade-in">
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <div class="prop-thumb-wrapper">
                            <img src="${apiService.properties.resolveImageUrl(prop.id, 0)}" 
                                 class="prop-preview-sm" 
                                 alt="Thumb"
                                 onerror="this.src='https://placehold.co/100x100/111/c6ff00?text=VIP'">
                        </div>
                        <div class="overflow-hidden">
                            <h6 class="fw-800 text-white mb-0 text-truncate" style="max-width: 250px;">${prop.title}</h6>
                            <span class="small text-muted">${prop.type}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="small text-muted">
                        <i class="bi bi-geo-alt me-1 text-neon"></i> ${prop.location}
                    </span>
                </td>
                <td>
                    <span class="fw-800 text-neon">${apiService.utils.formatCurrency(prop.price)}</span>
                </td>
                <td>
                    <span class="badge-status-vip status-${prop.status}">
                        ${prop.status === 'active' ? '● Ativo' : '○ Pendente'}
                    </span>
                </td>
                <td class="text-end">
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn-action-circle" onclick="ArrendaDashboard.edit(${prop.id})" title="Editar Ativo">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn-action-circle btn-delete" onclick="ArrendaDashboard.delete(${prop.id})" title="Remover Permanentemente">
                            <i class="bi bi-trash3-fill"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    };

    /**
     * 🗑️ ELIMINAÇÃO DE ATIVOS (DELETE ENGINE)
     */
    const _deleteProperty = async (id) => {
        const confirmed = await _customConfirm(
            "Eliminar Ativo?",
            "Esta ação é irreversível e removerá todos os dados binários e mensagens associadas."
        );

        if (confirmed) {
            try {
                const res = await apiService.properties.delete(id);
                if (res.success) {
                    apiService.notify("Ativo removido com sucesso.", "success");
                    await init(); // Recarrega o painel completo
                }
            } catch (error) {
                apiService.notify("Erro ao processar eliminação.", "error");
            }
        }
    };

    /**
     * ✏️ EDIÇÃO DE ATIVOS (REDIRECT PARA MODAL OU PÁGINA)
     */
    const _editProperty = (id) => {
        // Se houver lógica de modal na página, abre o modal. 
        // Caso contrário, redireciona para a página de publicação com modo edit.
        if (typeof openEditModal === 'function') {
            openEditModal(id);
        } else {
            window.location.href = `/pages/publish.html?edit=${id}`;
        }
    };

    /**
     * 🎨 UI HELPERS
     */
    const _showMainLoading = (show) => {
        const loader = document.getElementById('dashboardLoader');
        if (loader) loader.style.display = show ? 'flex' : 'none';
    };

    const _setupThemeSync = () => {
        const theme = document.documentElement.getAttribute('data-theme');
        // Ajustes finos de UI dependentes de tema se necessário
    };

    /**
     * 💎 DIÁLOGO DE CONFIRMAÇÃO PREMIUM
     * Substitui o confirm() nativo por uma experiência VIP.
     */
    const _customConfirm = (title, message) => {
        return new Promise((resolve) => {
            // Aqui poderíamos injetar um modal dinâmico. 
            // Por enquanto, usamos a lógica do sistema com aviso.
            if (confirm(`${title}\n\n${message}`)) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    };

    // EXPOSIÇÃO PÚBLICA
    return {
        init,
        refresh: init,
        delete: (id) => _deleteProperty(id),
        edit: (id) => _editProperty(id),
        logout: () => apiService.auth.logout()
    };
})();

// AUTO-BOOT
document.addEventListener('DOMContentLoaded', ArrendaDashboard.init);

/**
 * 🚀 FIM DO ARQUIVO: dashboard.js
 * Desenvolvido para oferecer controle total e elegância na gestão de ativos.
 */